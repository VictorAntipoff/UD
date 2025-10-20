import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('=== ALL DRYING PROCESSES FOR MNINGA ===\n');

  const processes = await prisma.dryingProcess.findMany({
    where: {
      woodType: { name: 'Mninga' },
      thickness: 50.8
    },
    include: {
      woodType: true
    },
    orderBy: { batchNumber: 'asc' }
  });

  processes.forEach(p => {
    console.log(`${p.batchNumber}:`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Pieces: ${p.pieceCount}`);
    console.log(`  Use Stock: ${p.useStock}`);
    console.log(`  Source Warehouse ID: ${p.sourceWarehouseId}`);
    console.log(`  Stock Thickness: ${p.stockThickness}`);
    console.log(`  Start: ${p.startTime}`);
    console.log(`  End: ${p.endTime}`);
    console.log('');
  });

  console.log('\n=== CURRENT STOCK P01T - MNINGA 2" ===\n');

  const stock = await prisma.stock.findFirst({
    where: {
      warehouse: { code: 'P01T' },
      woodType: { name: 'Mninga' },
      thickness: '2"'
    }
  });

  console.log(`Not Dried: ${stock.statusNotDried}`);
  console.log(`Under Drying: ${stock.statusUnderDrying}`);
  console.log(`Dried: ${stock.statusDried}`);
  console.log(`Damaged: ${stock.statusDamaged}`);
  console.log(`In Transit Out: ${stock.statusInTransitOut}`);
  console.log(`In Transit In: ${stock.statusInTransitIn}`);
  console.log(`TOTAL: ${stock.statusNotDried + stock.statusUnderDrying + stock.statusDried + stock.statusDamaged}`);

  console.log('\n=== EXPECTED vs ACTUAL ===\n');
  console.log('Expected (from Victor):');
  console.log('  Total: 345');
  console.log('  Dried: 95 (from DRY-001 COMPLETED)');
  console.log('  Under Drying: 101 (from DRY-002 IN_PROGRESS)');
  console.log('  Not Dried: 149');
  console.log('  Calculation: 95 + 101 + 149 = 345');
  console.log('');
  console.log('Actual from database:');
  console.log(`  Total: ${stock.statusNotDried + stock.statusUnderDrying + stock.statusDried}`);
  console.log(`  Dried: ${stock.statusDried}`);
  console.log(`  Under Drying: ${stock.statusUnderDrying}`);
  console.log(`  Not Dried: ${stock.statusNotDried}`);
  console.log('');
  console.log('DIFFERENCE:');
  console.log(`  Not Dried: ${stock.statusNotDried} - 149 = ${stock.statusNotDried - 149}`);
}

check().finally(() => prisma.$disconnect());
