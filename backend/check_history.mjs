import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function checkHistory() {
  try {
    const history = await prisma.receiptHistory.findMany({
      where: { receiptId: 'LOT-2025-005' },
      orderBy: { timestamp: 'asc' }
    });
    
    console.log(`\nHistory entries for LOT-2025-005: ${history.length}`);
    history.forEach(h => {
      console.log(`  ${h.timestamp} - ${h.action} by ${h.userName}`);
      console.log(`    Details: ${h.details}\n`);
    });

    const receipt = await prisma.woodReceipt.findFirst({
      where: { lotNumber: 'LOT-2025-005' },
      select: { status: true, createdAt: true, receiptConfirmedAt: true }
    });
    
    console.log('Receipt status:', receipt?.status);
    console.log('Created at:', receipt?.createdAt);
    console.log('Confirmed at:', receipt?.receiptConfirmedAt);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistory();
