import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function checkApproval() {
  try {
    // Get the receipt with all related data
    const receipt = await prisma.woodReceipt.findFirst({
      where: { lotNumber: 'LOT-2025-005' }
    });

    if (!receipt) {
      console.log('Receipt not found');
      return;
    }

    console.log('\n=== LOT-2025-005 Receipt Details ===');
    console.log(`Status: ${receipt.status}`);
    console.log(`Created At: ${receipt.createdAt}`);
    console.log(`Updated At: ${receipt.updatedAt}`);
    console.log(`Confirmed At: ${receipt.receiptConfirmedAt}`);
    console.log(`Created By: ${receipt.createdBy || 'N/A'}`);

    // Get draft info
    const draft = await prisma.receiptDraft.findFirst({
      where: { receiptId: 'LOT-2025-005' },
      orderBy: { updatedAt: 'desc' }
    });

    if (draft) {
      const draftUser = await prisma.user.findUnique({
        where: { id: draft.updatedBy }
      });
      console.log(`\nDraft updated by: ${draftUser?.email || draft.updatedBy}`);
      console.log(`Draft updated at: ${draft.updatedAt}`);
    }

    // Get all users to identify who did what
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    });

    console.log('\n=== All Users ===');
    users.forEach(u => {
      console.log(`${u.email} (${u.role}) - ID: ${u.id}`);
    });

    // Check notifications related to this receipt
    const notifications = await prisma.notification.findMany({
      where: {
        linkUrl: { contains: 'LOT-2025-005' }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('\n=== Notifications for LOT-2025-005 ===');
    notifications.forEach(n => {
      console.log(`${n.createdAt} - To: ${n.userId}`);
      console.log(`  Type: ${n.type}`);
      console.log(`  Message: ${n.message}\n`);
    });

    // Get current history
    const history = await prisma.receiptHistory.findMany({
      where: { receiptId: 'LOT-2025-005' },
      orderBy: { timestamp: 'asc' }
    });

    console.log('\n=== Current History ===');
    history.forEach(h => {
      console.log(`${h.timestamp} - ${h.action}`);
      console.log(`  By: ${h.userName} (${h.userId})`);
      console.log(`  Details: ${h.details}\n`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApproval();
