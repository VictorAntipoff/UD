import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function backfillHistory() {
  try {
    console.log('Starting history backfill for LOT-2025-005...\n');

    // Get the receipt
    const receipt = await prisma.woodReceipt.findFirst({
      where: { lotNumber: 'LOT-2025-005' },
      include: {
        woodType: true
      }
    });

    if (!receipt) {
      console.log('Receipt not found');
      return;
    }

    console.log(`Found receipt: ${receipt.lotNumber}`);
    console.log(`Status: ${receipt.status}`);
    console.log(`Created: ${receipt.createdAt}`);
    console.log(`Confirmed: ${receipt.receiptConfirmedAt}\n`);

    // Check existing history
    const existingHistory = await prisma.receiptHistory.findMany({
      where: { receiptId: 'LOT-2025-005' },
      orderBy: { timestamp: 'asc' }
    });

    console.log(`Existing history entries: ${existingHistory.length}`);
    existingHistory.forEach(h => {
      console.log(`  - ${h.action} at ${h.timestamp}`);
    });
    console.log('');

    // Get draft info
    const draft = await prisma.receiptDraft.findFirst({
      where: { receiptId: 'LOT-2025-005' },
      orderBy: { updatedAt: 'desc' }
    });

    if (draft) {
      console.log(`Found draft updated by: ${draft.updatedBy}`);
      console.log(`Draft updated at: ${draft.updatedAt}\n`);

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: draft.updatedBy }
      });

      if (user) {
        console.log(`User: ${user.email || user.id}\n`);

        // Add APPROVED history entry if receipt is COMPLETED and no APPROVED entry exists
        const hasApproved = existingHistory.some(h => h.action === 'APPROVED');
        if (receipt.status === 'COMPLETED' && !hasApproved && receipt.receiptConfirmedAt) {
          console.log('Adding APPROVED history entry...');
          await prisma.receiptHistory.create({
            data: {
              receiptId: 'LOT-2025-005',
              userId: user.id,
              userName: user.email || user.id,
              action: 'APPROVED',
              details: `Receipt approved and marked as COMPLETED`,
              timestamp: receipt.receiptConfirmedAt
            }
          });
          console.log('✓ Added APPROVED entry\n');
        }

        // Add COMPLETED history entry if no COMPLETED entry exists
        const hasCompleted = existingHistory.some(h => h.action === 'COMPLETED');
        if (receipt.status === 'COMPLETED' && !hasCompleted && receipt.actualPieces && receipt.actualVolumeM3) {
          console.log('Adding COMPLETED history entry...');
          await prisma.receiptHistory.create({
            data: {
              receiptId: 'LOT-2025-005',
              userId: user.id,
              userName: user.email || user.id,
              action: 'COMPLETED',
              details: `Receipt completed with ${receipt.actualPieces} pieces (${receipt.actualVolumeM3.toFixed(2)} m³)`,
              timestamp: receipt.receiptConfirmedAt || receipt.updatedAt
            }
          });
          console.log('✓ Added COMPLETED entry\n');
        }

        // Add DRAFT_UPDATED history entry if measurements exist
        const measurements = await prisma.sleeperMeasurement.count({
          where: { receiptId: receipt.id }
        });

        const hasDraftUpdated = existingHistory.some(h => h.action === 'DRAFT_UPDATED');
        if (measurements > 0 && !hasDraftUpdated) {
          console.log('Adding DRAFT_UPDATED history entry...');
          await prisma.receiptHistory.create({
            data: {
              receiptId: 'LOT-2025-005',
              userId: user.id,
              userName: user.email || user.id,
              action: 'DRAFT_UPDATED',
              details: `Draft updated with ${measurements} measurements`,
              timestamp: draft.updatedAt
            }
          });
          console.log('✓ Added DRAFT_UPDATED entry\n');
        }
      }
    }

    // Show final history
    const finalHistory = await prisma.receiptHistory.findMany({
      where: { receiptId: 'LOT-2025-005' },
      orderBy: { timestamp: 'asc' }
    });

    console.log(`\nFinal history entries: ${finalHistory.length}`);
    finalHistory.forEach(h => {
      console.log(`  ${h.timestamp.toISOString()} - ${h.action} by ${h.userName}`);
      console.log(`    ${h.details}\n`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillHistory();
