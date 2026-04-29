// READ-ONLY: confirm Phase A schema + helper artifacts are present in the live DB.
import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('=== Phase A health check ===\n');

  // 1. Stock CHECK constraints
  const stockChecks: any[] = await prisma.$queryRawUnsafe(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = '"Stock"'::regclass AND conname LIKE 'stock_%_nonneg'
    ORDER BY conname
  `);
  console.log(`Stock CHECK constraints (expect 6): ${stockChecks.length}`);
  for (const c of stockChecks) console.log(`  - ${c.conname}`);

  // 2. stock_movements columns + CHECK
  const cols: any[] = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'stock_movements'
      AND column_name IN ('entryGroupId', 'priorBalance', 'postBalance')
    ORDER BY column_name
  `);
  console.log(`\nstock_movements new columns (expect 3): ${cols.length}`);
  for (const c of cols) console.log(`  - ${c.column_name} ${c.data_type}`);

  const movChecks: any[] = await prisma.$queryRawUnsafe(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'stock_movements'::regclass AND conname LIKE 'movement_%'
    ORDER BY conname
  `);
  console.log(`\nstock_movements CHECK constraints (expect 1): ${movChecks.length}`);
  for (const c of movChecks) console.log(`  - ${c.conname}`);

  // 3. Deferred trigger
  const triggers: any[] = await prisma.$queryRawUnsafe(`
    SELECT tgname, tgdeferrable, tginitdeferred FROM pg_trigger
    WHERE tgname = 'trg_enforce_entry_group_balance'
  `);
  console.log(`\nDeferred balance trigger (expect 1, deferrable + initdeferred): ${triggers.length}`);
  for (const t of triggers) console.log(`  - ${t.tgname} deferrable=${t.tgdeferrable} initDeferred=${t.tginitdeferred}`);

  // 4. WoodStatus enum values
  const enumValues: any[] = await prisma.$queryRawUnsafe(`
    SELECT enumlabel FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'WoodStatus'
    ORDER BY e.enumsortorder
  `);
  console.log(`\nWoodStatus enum values (expect 6): ${enumValues.length}`);
  for (const v of enumValues) console.log(`  - ${v.enumlabel}`);

  // 5. Sanity: confirm zero-quantity rows are gone
  const zeroQty = await prisma.stock_movements.count({ where: { quantityChange: 0 } });
  console.log(`\nstock_movements with quantityChange=0 (expect 0): ${zeroQty}`);

  // 6. Sanity: confirm no Stock row has negative anywhere
  const negStock: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, "warehouseId", "woodTypeId", thickness,
           "statusNotDried", "statusUnderDrying", "statusDried"
    FROM "Stock"
    WHERE "statusNotDried" < 0 OR "statusUnderDrying" < 0 OR "statusDried" < 0
       OR "statusDamaged" < 0 OR "statusInTransitOut" < 0 OR "statusInTransitIn" < 0
  `);
  console.log(`\nStock rows with negative buckets (expect 0): ${negStock.length}`);
  for (const r of negStock) console.log(`  - ${r.id}: ${JSON.stringify(r)}`);

  // 7. P01-Tegeta Teak 2" — last known correct state
  const target = await prisma.stock.findUnique({
    where: { id: '2f21fa14-018a-44dd-878b-eb7189a7858e' },
    include: { Warehouse: true, WoodType: true },
  });
  console.log(`\nP01-Tegeta Teak 2" (should be 441/0/96):`);
  console.log({
    NotDried: (target as any)?.statusNotDried,
    UnderDrying: (target as any)?.statusUnderDrying,
    Dried: (target as any)?.statusDried,
    total: ((target as any)?.statusNotDried ?? 0) + ((target as any)?.statusUnderDrying ?? 0) + ((target as any)?.statusDried ?? 0),
  });

  // 8. Total stock_movements count
  const totalMovements = await prisma.stock_movements.count();
  console.log(`\nTotal stock_movements rows: ${totalMovements}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
