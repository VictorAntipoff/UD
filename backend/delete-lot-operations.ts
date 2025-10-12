import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deleteLotOperations() {
  const lotNumber = 'LOT-2025-001';

  // First, show what we're about to delete
  const operations = await prisma.operation.findMany({
    where: { lotNumber },
    select: { serialNumber: true, sleeperNumber: true }
  });

  console.log(`Found ${operations.length} operations for ${lotNumber}:`);
  operations.forEach(op => {
    console.log(`  - ${op.serialNumber} (Sleeper #${op.sleeperNumber})`);
  });

  // Delete them
  const result = await prisma.operation.deleteMany({
    where: { lotNumber }
  });

  console.log(`\n✅ Deleted ${result.count} operations for ${lotNumber}`);

  await prisma.$disconnect();
}

deleteLotOperations().catch(console.error);
