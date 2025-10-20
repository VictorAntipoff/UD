import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Check DRY-001 process
  const dryProcess = await prisma.dryingProcess.findFirst({
    where: { batchNumber: 'UD-DRY-00001' },
    include: {
      woodType: true
    }
  });

  console.log('DRY-001 Process:');
  console.log(`Status: ${dryProcess?.status}`);
  console.log(`Wood: ${dryProcess?.woodType.name} ${dryProcess?.thickness}mm`);
  console.log(`Pieces: ${dryProcess?.pieceCount}`);
  console.log(`Use Stock: ${dryProcess?.useStock}`);
  console.log(`Source Warehouse: ${dryProcess?.sourceWarehouseId}`);
  console.log(`Stock Thickness: ${dryProcess?.stockThickness}`);
  console.log(`Completed At: ${dryProcess?.endTime}`);

  // Check Mninga 2" stock in P01T
  const stock = await prisma.stock.findFirst({
    where: {
      warehouse: { code: 'P01T' },
      woodType: { name: 'Mninga' },
      thickness: '2"'
    },
    include: {
      warehouse: true,
      woodType: true
    }
  });

  console.log(`\nP01T - Mninga 2" stock:`);
  console.log(`Not Dried: ${stock?.statusNotDried}`);
  console.log(`Under Drying: ${stock?.statusUnderDrying}`);
  console.log(`Dried: ${stock?.statusDried}`);
}

check().finally(() => prisma.$disconnect());
