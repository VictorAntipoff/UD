import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const operations = await prisma.operation.findMany({
    where: { sleeperNumber: null },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`Found ${operations.length} operations to fix`);
  const byLot = new Map();
  operations.forEach(op => {
    if (op.lotNumber) {
      if (!byLot.has(op.lotNumber)) byLot.set(op.lotNumber, []);
      byLot.get(op.lotNumber).push(op);
    }
  });
  for (const [lotNumber, ops] of byLot.entries()) {
    console.log(`LOT ${lotNumber}: ${ops.length} ops`);
    for (let i = 0; i < ops.length; i++) {
      await prisma.operation.update({
        where: { id: ops[i].id },
        data: { sleeperNumber: i + 1 }
      });
      console.log(`  ✓ ${ops[i].serialNumber} -> Sleeper #${i + 1}`);
    }
  }
  console.log('✅ Done!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
