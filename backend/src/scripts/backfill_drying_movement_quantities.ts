// Backfill quantityChange for legacy DRYING_START / DRYING_END rows
// that were written with quantityChange = 0 by old buggy code.
//
// Strategy: for each zero-quantity row, look up the referenced DryingProcess.
// Match the row's (warehouseId, woodTypeId, thickness) against:
//   - Multi-wood: a matching DryingProcessItem (use that item's pieceCount)
//   - Single-wood (legacy useStock format): the process's own pieceCount
// Sign convention: keep it positive (matches existing valid rows for
// DRYING_START/END which represent intra-warehouse status flow).
//
// Run modes:
//   npx tsx src/scripts/backfill_drying_movement_quantities.ts        → DRY RUN
//   APPLY=1 npx tsx src/scripts/backfill_drying_movement_quantities.ts → APPLIES

import { prisma } from '../lib/prisma.js';

const APPLY = process.env.APPLY === '1';

async function main() {
  // Find every movement row with quantityChange = 0
  const broken = await prisma.stock_movements.findMany({
    where: { quantityChange: 0 },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Found ${broken.length} rows with quantityChange = 0`);

  // Group sanity check: should all be drying-related
  const types = new Set(broken.map(r => r.movementType));
  console.log(`Movement types in broken set:`, [...types]);

  let resolved = 0;
  let unresolved = 0;
  const updates: Array<{ id: string; oldQty: number; newQty: number; reason: string }> = [];
  const failures: Array<{ id: string; reason: string }> = [];

  for (const row of broken) {
    if (row.referenceType !== 'DRYING_PROCESS') {
      failures.push({ id: row.id, reason: `not a DRYING_PROCESS row (refType=${row.referenceType})` });
      unresolved++;
      continue;
    }

    const proc = await prisma.dryingProcess.findUnique({
      where: { id: row.referenceId },
      include: { DryingProcessItem: true },
    });

    if (!proc) {
      failures.push({ id: row.id, reason: `referenced DryingProcess ${row.referenceId} no longer exists` });
      unresolved++;
      continue;
    }

    // Multi-wood: find an item that matches warehouse+wood+thickness
    const items = (proc as any).DryingProcessItem || [];
    let matchedQty: number | null = null;
    let matchedSource = '';

    if (items.length > 0) {
      const matching = items.filter((it: any) =>
        it.sourceWarehouseId === row.warehouseId &&
        it.woodTypeId === row.woodTypeId &&
        it.thickness === row.thickness
      );
      if (matching.length === 1) {
        matchedQty = matching[0].pieceCount;
        matchedSource = `multi-wood item ${matching[0].id}`;
      } else if (matching.length > 1) {
        // sum them — same warehouse+wood+thickness can have multiple items, accumulate
        matchedQty = matching.reduce((s: number, it: any) => s + it.pieceCount, 0);
        matchedSource = `${matching.length} multi-wood items summed`;
      }
    }

    // Single-wood fallback (legacy useStock with stockThickness etc.)
    if (matchedQty === null) {
      if (
        proc.useStock &&
        proc.sourceWarehouseId === row.warehouseId &&
        proc.woodTypeId === row.woodTypeId &&
        proc.stockThickness === row.thickness &&
        proc.pieceCount
      ) {
        matchedQty = proc.pieceCount;
        matchedSource = `single-wood process.pieceCount (legacy)`;
      }
    }

    if (matchedQty === null) {
      failures.push({
        id: row.id,
        reason: `no matching item/process data for ${row.warehouseId}/${row.woodTypeId}/${row.thickness} on ${proc.batchNumber}`,
      });
      unresolved++;
      continue;
    }

    updates.push({
      id: row.id,
      oldQty: row.quantityChange,
      newQty: matchedQty,
      reason: `${proc.batchNumber} ${row.movementType} → ${matchedSource} = ${matchedQty} pcs`,
    });
    resolved++;
  }

  console.log(`\nResolved: ${resolved} rows`);
  console.log(`Unresolved: ${unresolved} rows`);

  if (updates.length > 0) {
    console.log(`\n=== Proposed updates ===`);
    for (const u of updates) {
      console.log(`  ${u.id}: ${u.oldQty} → ${u.newQty}   (${u.reason})`);
    }
  }
  if (failures.length > 0) {
    console.log(`\n=== Could not resolve ===`);
    for (const f of failures) {
      console.log(`  ${f.id}: ${f.reason}`);
    }
  }

  if (!APPLY) {
    console.log(`\n[DRY RUN] No changes. Re-run with APPLY=1 to apply ${updates.length} updates.`);
    if (failures.length > 0) {
      console.log(`           ${failures.length} rows could NOT be resolved automatically. Decide what to do with them before applying.`);
    }
    return;
  }

  if (failures.length > 0) {
    console.log(`\n[APPLY] Refusing to apply: ${failures.length} unresolved rows. Investigate first or pass FORCE=1 to ignore (not recommended).`);
    if (process.env.FORCE !== '1') return;
  }

  console.log(`\n[APPLY] Updating ${updates.length} rows in a transaction...`);
  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.stock_movements.update({
        where: { id: u.id },
        data: { quantityChange: u.newQty },
      });
    }
  }, { maxWait: 30000, timeout: 60000 });

  // Verify
  const remaining = await prisma.stock_movements.count({ where: { quantityChange: 0 } });
  console.log(`\n✓ Backfill complete. Rows still with quantityChange = 0: ${remaining}`);
  if (remaining > 0) {
    console.log(`  (Those are the unresolved ones — see "Could not resolve" above.)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
