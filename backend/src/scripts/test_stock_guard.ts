// Verifies that direct Stock bucket writes outside the helper are BLOCKED
// by the Prisma middleware guard. We do NOT actually want this code to write
// to production stock — the test passes when the guard rejects the operation.

import { prisma } from '../lib/prisma.js';

const REAL_STOCK_ID = '2f21fa14-018a-44dd-878b-eb7189a7858e';  // P01-Tegeta Teak 2"

async function attemptDirectWrite(label: string, fn: () => Promise<any>): Promise<boolean> {
  try {
    await fn();
    console.log(`  ✗ ${label}: WRITE WAS ALLOWED — guard is broken!`);
    return false;
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes('STOCK_LEDGER_GUARD')) {
      console.log(`  ✓ ${label}: blocked by guard`);
      return true;
    } else {
      console.log(`  ? ${label}: rejected, but for a different reason: ${msg.slice(0, 200)}`);
      return false;
    }
  }
}

async function main() {
  console.log('=== Stock-ledger guard smoke test ===');
  console.log('NODE_ENV =', process.env.NODE_ENV ?? '(unset, treated as dev)');
  console.log('In dev: guard should THROW. In prod: guard logs but does not throw.\n');

  let passed = 0;
  let total = 0;

  // 1. update on a real bucket field
  total++;
  if (await attemptDirectWrite('prisma.stock.update with statusNotDried (should be blocked)', () =>
    prisma.stock.update({
      where: { id: REAL_STOCK_ID },
      data: { statusNotDried: { increment: 1 } },
    })
  )) passed++;

  // 2. updateMany on a bucket field
  total++;
  if (await attemptDirectWrite('prisma.stock.updateMany with statusUnderDrying (should be blocked)', () =>
    prisma.stock.updateMany({
      where: { id: REAL_STOCK_ID },
      data: { statusUnderDrying: { increment: 1 } },
    })
  )) passed++;

  // 3. upsert touching buckets in update branch
  total++;
  if (await attemptDirectWrite('prisma.stock.upsert with statusDried in update (should be blocked)', () =>
    prisma.stock.upsert({
      where: { id: REAL_STOCK_ID },
      update: { statusDried: { increment: 1 } },
      create: {
        id: 'will-not-be-used',
        warehouseId: 'x', woodTypeId: 'x', thickness: 'x',
        statusNotDried: 0, statusUnderDrying: 0, statusDried: 0,
        statusDamaged: 0, statusInTransitOut: 0, statusInTransitIn: 0,
        updatedAt: new Date(),
      },
    } as any)
  )) passed++;

  // 4. update of NON-bucket field (minimumStockLevel) — must be ALLOWED
  total++;
  console.log('  → testing that non-bucket field updates still work...');
  try {
    const before = await prisma.stock.findUnique({ where: { id: REAL_STOCK_ID } });
    await prisma.stock.update({
      where: { id: REAL_STOCK_ID },
      data: { minimumStockLevel: (before as any)?.minimumStockLevel },  // no-op
    });
    console.log('  ✓ prisma.stock.update on minimumStockLevel: ALLOWED (correct)');
    passed++;
  } catch (err: any) {
    console.log(`  ✗ minimumStockLevel update was blocked! err=${err?.message?.slice(0, 200)}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PASSED: ${passed}/${total}`);
  if (passed !== total) process.exit(1);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
