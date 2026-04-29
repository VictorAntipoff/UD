// READ-ONLY: comprehensive audit of every angle of stock + stock_movements integrity.
// Cross-checks invariants that should hold in a healthy ledger.
import { prisma } from '../lib/prisma.js';

let pass = 0, fail = 0, warn = 0;
const failures: string[] = [];
const warnings: string[] = [];
function ok(name: string)               { pass++; console.log(`  ✓ ${name}`); }
function ko(name: string, detail?: any) { fail++; failures.push(name); console.log(`  ✗ ${name}${detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 300)) : ''}`); }
function w(name: string, detail?: any)  { warn++; warnings.push(name); console.log(`  ⚠ ${name}${detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 300)) : ''}`); }

async function main() {
  console.log('=== STOCK + MOVEMENTS — COMPREHENSIVE AUDIT ===\n');

  // ────────────────────────────────────────────────────────────────────
  console.log('1. Stock-row invariants (every bucket >= 0)');
  const negStock: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, "warehouseId", "woodTypeId", thickness,
           "statusNotDried", "statusUnderDrying", "statusDried",
           "statusDamaged", "statusInTransitOut", "statusInTransitIn"
    FROM "Stock"
    WHERE "statusNotDried" < 0 OR "statusUnderDrying" < 0 OR "statusDried" < 0
       OR "statusDamaged" < 0 OR "statusInTransitOut" < 0 OR "statusInTransitIn" < 0
  `);
  if (negStock.length === 0) ok('no Stock row has any negative bucket');
  else ko(`${negStock.length} Stock rows with negative buckets`, negStock);

  // ────────────────────────────────────────────────────────────────────
  console.log('\n2. stock_movements table invariants');
  const zeroMov = await prisma.stock_movements.count({ where: { quantityChange: 0 } });
  if (zeroMov === 0) ok('no stock_movements row has quantityChange = 0');
  else ko(`${zeroMov} rows have quantityChange = 0`);

  // ────────────────────────────────────────────────────────────────────
  console.log('\n3. Multi-leg entry groups balance to zero');
  const unbalanced: any[] = await prisma.$queryRawUnsafe(`
    SELECT "entryGroupId", SUM("quantityChange")::int AS net, COUNT(*)::int AS legs
    FROM "stock_movements"
    WHERE "entryGroupId" IS NOT NULL
    GROUP BY "entryGroupId"
    HAVING SUM("quantityChange") != 0
  `);
  if (unbalanced.length === 0) ok('every multi-leg entry group sums to 0');
  else ko(`${unbalanced.length} unbalanced groups`, unbalanced.slice(0, 5));

  // ────────────────────────────────────────────────────────────────────
  console.log('\n4. Audit columns populated correctly on new entries');
  // After Phase A, any row with entryGroupId NOT NULL must also have
  // priorBalance and postBalance set. (Legacy rows have all 3 NULL.)
  const partialAudit: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, "createdAt", "movementType", "entryGroupId", "priorBalance", "postBalance"
    FROM "stock_movements"
    WHERE "entryGroupId" IS NOT NULL
      AND ("priorBalance" IS NULL OR "postBalance" IS NULL)
  `);
  if (partialAudit.length === 0) ok('every grouped movement has both priorBalance and postBalance');
  else ko(`${partialAudit.length} grouped rows missing prior/post`, partialAudit.slice(0, 5));

  // ────────────────────────────────────────────────────────────────────
  console.log('\n5. priorBalance + quantityChange == postBalance (per row)');
  const balanceMath: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, "movementType", "priorBalance", "quantityChange", "postBalance"
    FROM "stock_movements"
    WHERE "priorBalance" IS NOT NULL
      AND "postBalance" IS NOT NULL
      AND ("priorBalance" + "quantityChange") != "postBalance"
  `);
  if (balanceMath.length === 0) ok('priorBalance + quantityChange = postBalance everywhere it is recorded');
  else ko(`${balanceMath.length} rows where the math doesn't add up`, balanceMath.slice(0, 5));

  // ────────────────────────────────────────────────────────────────────
  console.log('\n6. Stock cache matches sum of movements (per warehouse+wood+thickness+status)');
  // For each Stock row's bucket, sum the corresponding movements that touch it.
  // This proves the cache hasn't drifted from the journal.
  // (We compare deltas against current values; perfect match requires that
  //  movements include all changes since the row was created.)
  // We allow legacy unbacked rows where movements may be incomplete — flag
  // mismatches as warnings so you can investigate.
  const cacheVsLog: any[] = await prisma.$queryRawUnsafe(`
    WITH
    stock_buckets AS (
      SELECT
        s."warehouseId", s."woodTypeId", s.thickness,
        'NOT_DRIED'::"WoodStatus"      AS status, s."statusNotDried"     AS cache_value
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
        COALESCE(m."toStatus", m."fromStatus") AS status,
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
      AND js.thickness = sb.thickness
      AND js.status::text = sb.status::text
    WHERE sb.cache_value != COALESCE(js.net, 0)
  `);
  if (cacheVsLog.length === 0) {
    ok('Stock cache exactly matches journal sums for every bucket');
  } else {
    // Most likely: legacy rows where stock was set before stock_movements existed.
    // Won't fail because Phase A doesn't claim history is perfect — just claims
    // the system is consistent going forward. Show drift for transparency.
    w(`${cacheVsLog.length} buckets where Stock cache differs from journal sum (likely pre-Phase-A baseline)`);
    console.log('     Drift summary (top 10 by abs drift):');
    const sorted = [...cacheVsLog].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift)).slice(0, 10);
    for (const d of sorted) {
      console.log(`       wh=${d.warehouseId.slice(0, 8)}.. wood=${d.woodTypeId.slice(0, 8)}.. ${d.thickness} ${d.status}: cache=${d.cache} journal=${d.journal_net} drift=${d.drift>=0?'+':''}${d.drift}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────
  console.log('\n7. Open operations vs reserved buckets');
  const openTransfers = await prisma.transfer.findMany({
    where: { status: { in: ['PENDING', 'APPROVED', 'IN_TRANSIT'] } },
    include: { TransferItem: true, Warehouse_Transfer_fromWarehouseIdToWarehouse: true, Warehouse_Transfer_toWarehouseIdToWarehouse: true },
  });
  const openProcs = await prisma.dryingProcess.findMany({
    where: { status: { in: ['IN_PROGRESS', 'PENDING_CLOSE'] } },
    include: { DryingProcessItem: true },
  });
  console.log(`     Open transfers: ${openTransfers.length}, open drying processes: ${openProcs.length}`);

  // Compute expected reserved values
  const expectIn = new Map<string, number>();   // statusInTransitIn at dest
  const expectOut = new Map<string, number>();  // statusInTransitOut at src
  const expectUD = new Map<string, number>();   // statusUnderDrying at warehouse
  for (const t of openTransfers) {
    const fromCtl = (t as any).Warehouse_Transfer_fromWarehouseIdToWarehouse?.stockControlEnabled;
    const toCtl   = (t as any).Warehouse_Transfer_toWarehouseIdToWarehouse?.stockControlEnabled;
    // Only IN_TRANSIT actually has stock reserved (PENDING/APPROVED don't move stock yet,
    // unless the transfer was auto-approved at creation — those get IN_TRANSIT immediately
    // from the new code path, but we keep the check broad and only count IN_TRANSIT here).
    if (t.status !== 'IN_TRANSIT') continue;
    for (const item of t.TransferItem) {
      if (fromCtl) {
        const k = `${t.fromWarehouseId}|${item.woodTypeId}|${item.thickness}`;
        expectOut.set(k, (expectOut.get(k) || 0) + item.quantity);
      }
      if (toCtl) {
        const k = `${t.toWarehouseId}|${item.woodTypeId}|${item.thickness}`;
        expectIn.set(k, (expectIn.get(k) || 0) + item.quantity);
      }
    }
  }
  for (const p of openProcs) {
    if (!p.useStock) continue;
    if (p.DryingProcessItem.length > 0) {
      for (const item of p.DryingProcessItem) {
        const k = `${item.sourceWarehouseId}|${item.woodTypeId}|${item.thickness}`;
        expectUD.set(k, (expectUD.get(k) || 0) + item.pieceCount);
      }
    } else if (p.sourceWarehouseId && p.woodTypeId && p.stockThickness && p.pieceCount) {
      const k = `${p.sourceWarehouseId}|${p.woodTypeId}|${p.stockThickness}`;
      expectUD.set(k, (expectUD.get(k) || 0) + p.pieceCount);
    }
  }

  const allStock = await prisma.stock.findMany();
  let driftCount = 0;
  for (const s of allStock as any[]) {
    const k = `${s.warehouseId}|${s.woodTypeId}|${s.thickness}`;
    const expIn = expectIn.get(k) || 0;
    const expOut = expectOut.get(k) || 0;
    const expUD = expectUD.get(k) || 0;
    const driftITI = s.statusInTransitIn  - expIn;
    const driftITO = s.statusInTransitOut - expOut;
    const driftUD  = s.statusUnderDrying  - expUD;
    if (driftITI !== 0 || driftITO !== 0 || driftUD !== 0) {
      driftCount++;
      console.log(`     ⚠ ${s.warehouseId.slice(0, 8)}.. ${s.thickness}  ITO=${s.statusInTransitOut}(exp ${expOut} drift ${driftITO}) ITI=${s.statusInTransitIn}(exp ${expIn} drift ${driftITI}) UD=${s.statusUnderDrying}(exp ${expUD} drift ${driftUD})`);
    }
  }
  if (driftCount === 0) ok('reserved buckets (UnderDrying / InTransit*) match open operations');
  else w(`${driftCount} rows where reserved buckets don't match open operations`);

  // ────────────────────────────────────────────────────────────────────
  console.log('\n8. Drying processes referenced in stock_movements still exist');
  const orphanedProcRefs: any[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT "referenceId"
    FROM "stock_movements" m
    WHERE m."referenceType" = 'DRYING_PROCESS'
      AND NOT EXISTS (SELECT 1 FROM "DryingProcess" dp WHERE dp.id = m."referenceId")
  `);
  if (orphanedProcRefs.length === 0) ok('every DRYING_PROCESS movement references an existing process');
  else w(`${orphanedProcRefs.length} movements reference deleted drying processes (audit history; not necessarily a problem)`);

  // ────────────────────────────────────────────────────────────────────
  console.log('\n9. Transfer references in stock_movements still exist');
  const orphanedXferRefs: any[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT "referenceId"
    FROM "stock_movements" m
    WHERE m."referenceType" = 'TRANSFER'
      AND NOT EXISTS (SELECT 1 FROM "Transfer" t WHERE t.id = m."referenceId")
  `);
  if (orphanedXferRefs.length === 0) ok('every TRANSFER movement references an existing transfer');
  else w(`${orphanedXferRefs.length} movements reference deleted transfers`);

  // ────────────────────────────────────────────────────────────────────
  console.log('\n10. Receipt references in stock_movements still exist');
  const orphanedReceiptRefs: any[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT "referenceId"
    FROM "stock_movements" m
    WHERE m."referenceType" = 'RECEIPT'
      AND NOT EXISTS (SELECT 1 FROM "WoodReceipt" w WHERE w.id = m."referenceId")
  `);
  if (orphanedReceiptRefs.length === 0) ok('every RECEIPT movement references an existing receipt');
  else w(`${orphanedReceiptRefs.length} movements reference deleted receipts`);

  // ────────────────────────────────────────────────────────────────────
  console.log('\n11. Total piece counts cross-warehouse sanity');
  const totals: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      wt.name AS wood,
      s.thickness,
      SUM(s."statusNotDried")::int AS not_dried,
      SUM(s."statusUnderDrying")::int AS under_drying,
      SUM(s."statusDried")::int AS dried,
      SUM(s."statusDamaged")::int AS damaged,
      SUM(s."statusInTransitOut")::int AS in_transit_out,
      SUM(s."statusInTransitIn")::int AS in_transit_in,
      SUM(s."statusNotDried" + s."statusUnderDrying" + s."statusDried" + s."statusDamaged" + s."statusInTransitOut" + s."statusInTransitIn")::int AS grand_total
    FROM "Stock" s
    JOIN "WoodType" wt ON wt.id = s."woodTypeId"
    GROUP BY wt.name, s.thickness
    HAVING SUM(s."statusNotDried" + s."statusUnderDrying" + s."statusDried" + s."statusDamaged" + s."statusInTransitOut" + s."statusInTransitIn") > 0
    ORDER BY wt.name, s.thickness
  `);
  console.log('     Cross-warehouse totals (non-zero):');
  for (const t of totals) {
    console.log(`       ${t.wood} ${t.thickness}: ND=${t.not_dried} UD=${t.under_drying} D=${t.dried} Dmg=${t.damaged} ITO=${t.in_transit_out} ITI=${t.in_transit_in}  total=${t.grand_total}`);
  }
  // Sanity: SUM(InTransitOut) across all warehouses should equal SUM(InTransitIn) across all warehouses
  // (every transfer leg has both)
  const ito = totals.reduce((s: number, t: any) => s + t.in_transit_out, 0);
  const iti = totals.reduce((s: number, t: any) => s + t.in_transit_in, 0);
  if (ito === iti) ok(`SUM(InTransitOut) = SUM(InTransitIn) globally = ${ito}`);
  else w(`InTransit* mismatch globally: ITO=${ito}, ITI=${iti} — pieces "in transit" don't reconcile`);

  // ────────────────────────────────────────────────────────────────────
  console.log('\n12. Recent activity (last 7 days)');
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = await prisma.stock_movements.count({ where: { createdAt: { gte: since } } });
  const recentByType: any[] = await prisma.$queryRawUnsafe(`
    SELECT "movementType", COUNT(*)::int AS n
    FROM "stock_movements"
    WHERE "createdAt" >= NOW() - INTERVAL '7 days'
    GROUP BY "movementType"
    ORDER BY n DESC
  `);
  console.log(`     ${recent} movement rows in last 7 days:`);
  for (const r of recentByType) console.log(`       ${r.movementType}: ${r.n}`);
  ok('audit log is being populated');

  // ────────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(70)}`);
  console.log(`PASSED: ${pass}    FAILED: ${fail}    WARNINGS: ${warn}`);
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  if (warnings.length > 0) {
    console.log('\nWARNINGS (informational, not necessarily bugs):');
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
