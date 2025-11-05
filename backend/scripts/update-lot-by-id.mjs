import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Updating LOT-2025-002 by ID...');

    const receipt = await prisma.woodReceipt.update({
      where: {
        id: '4485e75e-be36-4819-9c53-7e5e1329f229'
      },
      data: {
        status: 'COMPLETED'
      }
    });

    console.log('✅ Successfully updated:');
    console.log('  LOT Number:', receipt.lotNumber);
    console.log('  New Status:', receipt.status);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
