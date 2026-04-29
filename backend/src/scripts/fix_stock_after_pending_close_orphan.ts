// One-off correction for Stock id=2f21fa14-018a-44dd-878b-eb7189a7858e
// (P01 - Tegeta / Teak / 2").
//
// Reality (confirmed by user, all transfers closed):
//   Total at P01-Tegeta = 537 pieces
//     441 NotDried (raw)
//      96 Dried    (physically out of UD-DRY-00039 oven, still in warehouse)
//
// Live state currently:
//   NotDried=537  UnderDrying=0  Dried=96   →  total 633   (96 phantom)
//
// Correction:
//   NotDried:    537  →  441   ( - 96   remove phantom that was never decremented when drying started)
//   UnderDrying:   0  →    0   (unchanged)
//   Dried:        96  →   96   (unchanged)
//   Total:       633  →  537   ✓
//
// Run modes:
//   npx tsx src/scripts/fix_stock_after_pending_close_orphan.ts        → DRY RUN
//   APPLY=1 npx tsx src/scripts/fix_stock_after_pending_close_orphan.ts → APPLIES

import { prisma } from '../lib/prisma.js';

const APPLY = process.env.APPLY === '1';
const STOCK_ID = '2f21fa14-018a-44dd-878b-eb7189a7858e';
const DELTA = 96;

async function main() {
  const stock = await prisma.stock.findUnique({
    where: { id: STOCK_ID },
    include: { Warehouse: true, WoodType: true },
  });
  if (!stock) throw new Error(`Stock ${STOCK_ID} not found`);

  const before = {
    statusNotDried: (stock as any).statusNotDried,
    statusUnderDrying: (stock as any).statusUnderDrying,
    statusDried: (stock as any).statusDried,
  };
  const expectedTotal = before.statusNotDried + before.statusUnderDrying + before.statusDried;
  const after = {
    statusNotDried: before.statusNotDried - DELTA,   // 537 → 441
    statusUnderDrying: before.statusUnderDrying,     // unchanged
    statusDried: before.statusDried,                 // unchanged
  };
  const targetTotal = after.statusNotDried + after.statusUnderDrying + after.statusDried;

  console.log('Stock row:', {
    warehouse: (stock as any).Warehouse?.name,
    woodType: (stock as any).WoodType?.name,
    thickness: stock.thickness,
  });
  console.log('Before:', before, `(total ${expectedTotal})`);
  console.log('After (proposed):', after, `(total ${targetTotal})`);

  // Sanity guards
  if (before.statusNotDried < DELTA) {
    throw new Error(
      `Refusing to apply: NotDried (${before.statusNotDried}) < ${DELTA}. ` +
      `Decrementing would push it negative.`
    );
  }
  if (before.statusUnderDrying !== 0) {
    throw new Error(
      `Refusing to apply: UnderDrying must be 0 before this correction. ` +
      `Got ${before.statusUnderDrying}. Run audit first.`
    );
  }
  if (targetTotal !== 537) {
    throw new Error(
      `Refusing to apply: target total (${targetTotal}) != expected 537. ` +
      `Aborting to prevent further damage.`
    );
  }

  if (!APPLY) {
    console.log('\n[DRY RUN] No changes. Re-run with APPLY=1 to apply.');
    return;
  }

  console.log('\n[APPLY] Updating stock (NotDried only) …');
  const updated = await prisma.stock.update({
    where: { id: STOCK_ID },
    data: {
      statusNotDried: { decrement: DELTA },
      updatedAt: new Date(),
    },
    select: {
      statusNotDried: true,
      statusUnderDrying: true,
      statusDried: true,
    },
  });
  console.log('Result:', updated, `(total ${updated.statusNotDried + updated.statusUnderDrying + updated.statusDried})`);
  if (
    updated.statusNotDried !== after.statusNotDried ||
    updated.statusUnderDrying !== after.statusUnderDrying ||
    updated.statusDried !== after.statusDried
  ) {
    throw new Error('Post-update verification mismatch — investigate immediately.');
  }
  console.log('\n✓ NotDried corrected from 537 to 441. UnderDrying and Dried unchanged. Total now 537.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
