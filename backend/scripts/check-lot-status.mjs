import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking LOT-2025-002 status...');

    const receipt = await prisma.woodReceipt.findFirst({
      where: {
        lotNumber: 'LOT-2025-002'
      },
      select: {
        id: true,
        lotNumber: true,
        status: true,
        receiptConfirmedAt: true
      }
    });

    if (receipt) {
      console.log('LOT-2025-002 found:');
      console.log('  ID:', receipt.id);
      console.log('  LOT Number:', receipt.lotNumber);
      console.log('  Status:', receipt.status);
      console.log('  Confirmed At:', receipt.receiptConfirmedAt);
    } else {
      console.log('LOT-2025-002 not found in database');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
