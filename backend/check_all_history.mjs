import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAllHistory() {
  try {
    console.log('\n=== ALL RECEIPT HISTORY ===\n');
    
    const allHistory = await prisma.receiptHistory.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    
    console.log('Total history entries in DB:', allHistory.length);
    console.log('');
    
    const lot004 = allHistory.filter(h => h.receiptId === 'LOT-2025-004');
    console.log('LOT-2025-004 entries:', lot004.length);
    lot004.forEach((entry, idx) => {
      console.log((idx + 1) + '. ' + entry.timestamp);
      console.log('   User: ' + entry.userName);
      console.log('   Action: ' + entry.action);
      console.log('');
    });
    
    // Check for m.nahas user
    const mnahas = allHistory.filter(h => h.userName && h.userName.includes('nahas'));
    console.log('\nEntries by m.nahas:', mnahas.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllHistory();
