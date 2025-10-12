import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const ops = await prisma.operation.findMany({
    where: { lotNumber: 'LOT-2025-001' },
    select: { serialNumber: true, sleeperNumber: true, lotNumber: true },
    orderBy: { sleeperNumber: 'asc' }
  });
  console.log('Operations for LOT-2025-001:');
  console.log(`Total: ${ops.length}`);
  ops.forEach(op => {
    console.log(`  ${op.serialNumber}: Sleeper #${op.sleeperNumber}`);
  });
  const withSleeper = ops.filter(o => o.sleeperNumber !== null);
  console.log(`\nOperations with sleeper_number: ${withSleeper.length}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
