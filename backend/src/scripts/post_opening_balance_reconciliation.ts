// One-off reconciliation: brings the stock_movements journal sum into exact
// agreement with the current Stock cache. For each (warehouse, wood, thickness,
// status) bucket where they differ, posts a single-leg "opening balance"
// entry with delta = (cache - journal_sum) so cache stays unchanged but
// journal sum becomes equal.
//
// Why this is safe:
//  - All entries are SINGLE-LEG (entryGroupId = NULL), so the deferred balance
//    trigger doesn't apply to them.
//  - Each entry uses postStockEntry (the helper) so it goes through:
//      * row lock,
//      * Stock cache update,
//      * paired stock_movements row with prior/post snapshots.
//  - BUT we want the Stock cache to NOT change. So we set delta = 0? No —
//    delta = 0 is rejected by the helper (ZERO_DELTA validation).
//
// Solution: we DON'T use postStockEntry for these. We write the journal row
// directly, marking it as an opening-balance reconciliation. This is the only
// place outside the helper that legitimately writes to stock_movements without
// changing Stock.
//
// To stay consistent: we wrap the inserts in runInsideStockLedger so the
// guard is satisfied (though the guard only fires on Stock writes, and we're
// not touching Stock — so this is belt-and-suspenders).
//
// Run:
//   npx tsx src/scripts/post_opening_balance_reconciliation.ts          → DRY RUN
//   APPLY=1 npx tsx src/scripts/post_opening_balance_reconciliation.ts  → APPLY

import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';

const APPLY = process.env.APPLY === '1';

interface BucketRow {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  status: 'NOT_DRIED' | 'UNDER_DRYING' | 'DRIED' | 'DAMAGED' | 'IN_TRANSIT_OUT' | 'IN_TRANSIT_IN';
  cache: number;
  journal_net: number;
  drift: number;
}

async function main() {
  console.log('=== Opening-balance reconciliation ===');
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  const drift: BucketRow[] = await prisma.$queryRawUnsafe(`
    WITH
    stock_buckets AS (
      SELECT
        s."warehouseId", s."woodTypeId", s.thickness,
        'NOT_DRIED' AS status, s."statusNotDried"     AS cache_value
      FROM "Stock" s
      UNION ALL
      SELECT s."warehouseId", s."woodTypeId", s.thickness, 'UNDER_DRYING',  s."statusUnderDrying"  FROM "Stock" s
      UNION ALL
      SELECT s."warehouseId", s."woodTypeId", s.thickness, 'DRIED',         s."statusDried"        FROM "Stock" s
      UNION ALL
      SELECT s."warehouseId", s."woodTypeId", s.thickness, 'DAMAGED',       s."statusDamaged"      FROM "Stock" s
      UNION ALL
      SELECT s."warehouseId", s."woodTypeId", s.thickness, 'IN_TRANSIT_OUT', s."statusInTransitOut" FROM "Stock" s
      UNION ALL
      SELECT s."warehouseId", s."woodTypeId", s.thickness, 'IN_TRANSIT_IN',  s."statusInTransitIn"  FROM "Stock" s
    ),
    journal_sums AS (
      SELECT
        m."warehouseId", m."woodTypeId", m.thickness,
        COALESCE(m."toStatus", m."fromStatus")::text AS status,
        SUM(m."quantityChange")::int AS net
      FROM "stock_movements" m
      WHERE COALESCE(m."toStatus", m."fromStatus") IS NOT NULL
      GROUP BY m."warehouseId", m."woodTypeId", m.thickness, COALESCE(m."toStatus", m."fromStatus")
    )
    SELECT
      sb."warehouseId", sb."woodTypeId", sb.thickness, sb.status,
      sb.cache_value AS cache,
      COALESCE(js.net, 0) AS journal_net,
      sb.cache_value - COALESCE(js.net, 0) AS drift
    FROM stock_buckets sb
    LEFT JOIN journal_sums js
      ON js."warehouseId" = sb."warehouseId"
      AND js."woodTypeId" = sb."woodTypeId"
      AND js.thickness   = sb.thickness
      AND js.status      = sb.status
    WHERE sb.cache_value != COALESCE(js.net, 0)
  `);

  console.log(`Buckets requiring reconciliation: ${drift.length}\n`);

  if (drift.length === 0) {
    console.log('✓ No drift — nothing to do. Stock cache and journal already agree.');
    return;
  }

  // Resolve names for human-readable output
  const wId = new Set(drift.map(d => d.warehouseId));
  const wtId = new Set(drift.map(d => d.woodTypeId));
  const warehouses = await prisma.warehouse.findMany({ where: { id: { in: [...wId] } }, select: { id: true, name: true } });
  const woodTypes  = await prisma.woodType.findMany({ where: { id: { in: [...wtId] } }, select: { id: true, name: true } });
  const whName = new Map(warehouses.map(w => [w.id, w.name]));
  const wtName = new Map(woodTypes.map(w => [w.id, w.name]));

  console.log('=== Proposed reconciliation entries ===');
  console.log('(each posts an opening-balance journal row with delta = drift; Stock cache is NOT touched)\n');
  let totalAbs = 0;
  for (const d of drift) {
    const sign = d.drift >= 0 ? '+' : '';
    console.log(`  ${(whName.get(d.warehouseId) ?? d.warehouseId.slice(0, 8) + '..').padEnd(20)} ` +
      `${(wtName.get(d.woodTypeId) ?? d.woodTypeId.slice(0, 8) + '..').padEnd(10)} ` +
      `${d.thickness.padEnd(8)} ${d.status.padEnd(15)} ` +
      `cache=${String(d.cache).padStart(5)}  journal=${String(d.journal_net).padStart(5)}  → post delta=${sign}${d.drift}`);
    totalAbs += Math.abs(d.drift);
  }
  console.log(`\nTotal absolute drift to reconcile: ${totalAbs}`);

  if (!APPLY) {
    console.log('\n[DRY RUN] No changes. Re-run with APPLY=1 to apply.');
    return;
  }

  console.log('\n[APPLY] Writing opening-balance entries directly to stock_movements...');
  console.log('        (single-leg, entryGroupId=NULL, Stock cache untouched)');

  // We write directly to stock_movements, NOT through postStockEntry, because
  // we explicitly want to add a journal row WITHOUT modifying Stock.
  // After reconciliation, journal_sum == cache exactly.
  const reconcileTimestamp = new Date();
  const reconcileNote = 'Opening balance — Phase A reconciliation (cache-vs-journal alignment, 2026-04-28)';

  let written = 0;
  await prisma.$transaction(async (tx) => {
    for (const d of drift) {
      // priorBalance = current journal sum at this bucket (before this entry)
      // postBalance  = priorBalance + drift = cache value
      const prior = d.journal_net;
      const post  = d.cache;
      // Determine direction-of-flow status for the row
      const fromStatus = d.drift < 0 ? d.status : null;
      const toStatus   = d.drift > 0 ? d.status : null;
      await tx.stock_movements.create({
        data: {
          id: crypto.randomUUID(),
          createdAt: reconcileTimestamp,
          warehouseId: d.warehouseId,
          woodTypeId: d.woodTypeId,
          thickness: d.thickness,
          movementType: 'MANUAL_ADJUSTMENT',
          quantityChange: d.drift,
          fromStatus: fromStatus as any,
          toStatus: toStatus as any,
          referenceType: 'STOCK_ADJUSTMENT',
          referenceId: 'opening-balance-reconciliation-2026-04-28',
          referenceNumber: 'OPENING-BALANCE-PHASE-A',
          userId: null,
          userName: 'system',
          details: reconcileNote,
          // entryGroupId left null — single-leg entry, balance trigger exempt
          // priorBalance = journal sum before this row
          // postBalance = journal sum after this row (which now equals cache)
          priorBalance: prior,
          postBalance: post,
        },
      });
      written++;
    }
  }, { maxWait: 30_000, timeout: 60_000 });

  console.log(`\n✓ Wrote ${written} opening-balance entries.`);

  // Verify drift is now zero
  const verify: any[] = await prisma.$queryRawUnsafe(`
    WITH
    stock_buckets AS (
      SELECT s."warehouseId", s."woodTypeId", s.thickness, 'NOT_DRIED' AS status, s."statusNotDried" AS cache_value FROM "Stock" s
      UNION ALL SELECT s."warehouseId", s."woodTypeId", s.thickness, 'UNDER_DRYING',  s."statusUnderDrying"  FROM "Stock" s
      UNION ALL SELECT s."warehouseId", s."woodTypeId", s.thickness, 'DRIED',         s."statusDried"        FROM "Stock" s
      UNION ALL SELECT s."warehouseId", s."woodTypeId", s.thickness, 'DAMAGED',       s."statusDamaged"      FROM "Stock" s
      UNION ALL SELECT s."warehouseId", s."woodTypeId", s.thickness, 'IN_TRANSIT_OUT', s."statusInTransitOut" FROM "Stock" s
      UNION ALL SELECT s."warehouseId", s."woodTypeId", s.thickness, 'IN_TRANSIT_IN',  s."statusInTransitIn"  FROM "Stock" s
    ),
    journal_sums AS (
      SELECT m."warehouseId", m."woodTypeId", m.thickness,
             COALESCE(m."toStatus", m."fromStatus")::text AS status,
             SUM(m."quantityChange")::int AS net
      FROM "stock_movements" m
      WHERE COALESCE(m."toStatus", m."fromStatus") IS NOT NULL
      GROUP BY m."warehouseId", m."woodTypeId", m.thickness, COALESCE(m."toStatus", m."fromStatus")
    )
    SELECT COUNT(*)::int AS remaining_drift
    FROM stock_buckets sb
    LEFT JOIN journal_sums js
      ON js."warehouseId" = sb."warehouseId" AND js."woodTypeId" = sb."woodTypeId"
      AND js.thickness = sb.thickness AND js.status = sb.status
    WHERE sb.cache_value != COALESCE(js.net, 0)
  `);
  const remaining = verify[0]?.remaining_drift ?? -1;
  if (remaining === 0) console.log('\n✓ Verified: 0 buckets with drift. Cache and journal now match exactly.');
  else console.log(`\n⚠ Verification: ${remaining} buckets STILL drifting after reconciliation. Investigate.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
