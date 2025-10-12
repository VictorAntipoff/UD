import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const operations = await prisma.operation.findMany({
    where: { lotNumber: 'LOT-2025-001' },
    select: {
      serialNumber: true,
      sleeperNumber: true,
      lotNumber: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('Total operations for LOT-2025-001:', operations.length);
  console.log('Operations with sleeper_number:', operations.filter(op => op.sleeperNumber !== null).length);
  console.log('Operations with NULL sleeper_number:', operations.filter(op => op.sleeperNumber === null).length);
  console.log('\nFirst 10 operations:');
  operations.slice(0, 10).forEach(op => {
    console.log('  -', op.serialNumber, '-> Sleeper #' + (op.sleeperNumber || 'NULL'));
  });

  await prisma.$disconnect();
}

check().catch(console.error);
