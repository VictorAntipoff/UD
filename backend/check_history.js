import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check all receipt history
  const allHistory = await prisma.receiptHistory.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10
  });
  
  console.log('Total history entries:', allHistory.length);
  console.log('Recent entries:', JSON.stringify(allHistory, null, 2));
  
  // Check for specific LOT
  const lotHistory = await prisma.receiptHistory.findMany({
    where: { receiptId: 'LOT-2025-003' }
  });
  
  console.log('\nHistory for LOT-2025-003:', JSON.stringify(lotHistory, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
