import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkHistory() {
  try {
    const history = await prisma.receiptHistory.findMany({
      where: { receiptId: 'LOT-2025-004' },
      orderBy: { timestamp: 'desc' }
    });
    
    console.log('\n=== RECEIPT HISTORY FOR LOT-2025-004 ===\n');
    console.log('Total entries:', history.length);
    console.log('');
    
    history.forEach((entry, idx) => {
      console.log((idx + 1) + '. ' + entry.timestamp);
      console.log('   User: ' + entry.userName + ' (' + entry.userId + ')');
      console.log('   Action: ' + entry.action);
      console.log('   Details: ' + entry.details);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistory();
