import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking for LOT_PENDING_APPROVAL event type...');

    const existing = await prisma.notificationEventType.findUnique({
      where: { code: 'LOT_PENDING_APPROVAL' }
    });

    if (existing) {
      console.log('✅ LOT_PENDING_APPROVAL event type already exists');
      return;
    }

    console.log('Creating LOT_PENDING_APPROVAL event type...');

    await prisma.notificationEventType.create({
      data: {
        code: 'LOT_PENDING_APPROVAL',
        name: 'LOT Pending Approval',
        description: 'Notify when a LOT receipt is submitted and pending admin approval',
        category: 'Factory',
        isActive: true
      }
    });

    console.log('✅ Successfully created LOT_PENDING_APPROVAL event type');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
