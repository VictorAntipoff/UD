import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Updating LOT-2025-002 status from APPROVED to COMPLETED...');

    const receipt = await prisma.woodReceipt.updateMany({
      where: {
        lotNumber: 'LOT-2025-002',
        status: 'APPROVED'
      },
      data: {
        status: 'COMPLETED',
        receiptConfirmedAt: new Date()
      }
    });

    if (receipt.count > 0) {
      console.log('✅ Successfully updated LOT-2025-002 to COMPLETED status');
    } else {
      console.log('⚠️  LOT-2025-002 not found or already COMPLETED');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
