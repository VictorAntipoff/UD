import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function backfillStockMovements() {
  console.log('🔄 Starting stock movement backfill...\n');

  try {
    // 1. Backfill from WoodReceipts (completed LOTs)
    console.log('📦 Processing receipts...');
    const receipts = await prisma.woodReceipt.findMany({
      where: {
        status: 'COMPLETED'
      },
      include: {
        measurements: true,
        woodType: true,
        warehouse: true
      },
      orderBy: { receiptConfirmedAt: 'asc' }
    });

    let receiptCount = 0;
    for (const receipt of receipts) {
      if (!receipt.warehouseId) continue; // Skip if no warehouse

      // Group measurements by thickness for stock tracking
      const thicknessCounts: { [key: string]: number } = {};

      for (const measurement of receipt.measurements) {
        // Convert thickness to stock format (1", 2", or Custom)
        let stockThickness: string;
        if (measurement.thickness >= 1 && measurement.thickness < 1.5) {
          stockThickness = '1"';
        } else if (measurement.thickness >= 1.5 && measurement.thickness < 2.5) {
          stockThickness = '2"';
        } else {
          stockThickness = 'Custom';
        }

        if (!thicknessCounts[stockThickness]) {
          thicknessCounts[stockThickness] = 0;
        }
        thicknessCounts[stockThickness] += measurement.qty;
      }

      // Create movement for each thickness
      for (const [thickness, qty] of Object.entries(thicknessCounts)) {
        if (qty > 0) {
          await prisma.stockMovement.create({
            data: {
              warehouseId: receipt.warehouseId,
              woodTypeId: receipt.woodTypeId,
              thickness: thickness,
              movementType: 'RECEIPT_SYNC',
              quantityChange: qty,
              toStatus: 'NOT_DRIED',
              referenceType: 'RECEIPT',
              referenceId: receipt.id,
              referenceNumber: receipt.lotNumber,
              details: `Receipt ${receipt.lotNumber} synced to stock`,
              createdAt: receipt.receiptConfirmedAt || receipt.createdAt
            }
          });
          receiptCount++;
        }
      }
    }
    console.log(`✅ Created ${receiptCount} receipt movements\n`);

    // 2. Backfill from Transfers (completed)
    console.log('🚚 Processing transfers...');
    const transfers = await prisma.transfer.findMany({
      where: {
        status: 'COMPLETED'
      },
      include: {
        items: {
          include: {
            woodType: true
          }
        },
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: true
      },
      orderBy: { completedAt: 'asc' }
    });

    let transferCount = 0;
    for (const transfer of transfers) {
      for (const item of transfer.items) {
        // Transfer OUT from source warehouse
        await prisma.stockMovement.create({
          data: {
            warehouseId: transfer.fromWarehouseId,
            woodTypeId: item.woodTypeId,
            thickness: item.thickness,
            movementType: 'TRANSFER_OUT',
            quantityChange: -item.quantity,
            fromStatus: item.woodStatus,
            referenceType: 'TRANSFER',
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            userId: transfer.createdById,
            userName: transfer.createdBy ? `${transfer.createdBy.firstName || ''} ${transfer.createdBy.lastName || ''}`.trim() || transfer.createdBy.email : undefined,
            details: `Transfer to ${transfer.toWarehouse.name}`,
            createdAt: transfer.completedAt || transfer.createdAt
          }
        });

        // Transfer IN to destination warehouse
        await prisma.stockMovement.create({
          data: {
            warehouseId: transfer.toWarehouseId,
            woodTypeId: item.woodTypeId,
            thickness: item.thickness,
            movementType: 'TRANSFER_IN',
            quantityChange: item.quantity,
            toStatus: item.woodStatus,
            referenceType: 'TRANSFER',
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            userId: transfer.createdById,
            userName: transfer.createdBy ? `${transfer.createdBy.firstName || ''} ${transfer.createdBy.lastName || ''}`.trim() || transfer.createdBy.email : undefined,
            details: `Transfer from ${transfer.fromWarehouse.name}`,
            createdAt: transfer.completedAt || transfer.createdAt
          }
        });

        transferCount += 2;
      }
    }
    console.log(`✅ Created ${transferCount} transfer movements\n`);

    // 3. Backfill from Drying Processes
    console.log('🔥 Processing drying processes...');
    const dryingProcesses = await prisma.dryingProcess.findMany({
      include: {
        items: {
          include: {
            woodType: true,
            sourceWarehouse: true
          }
        },
        woodType: true,
        sourceWarehouse: true
      },
      orderBy: { createdAt: 'asc' }
    });

    let dryingCount = 0;
    for (const process of dryingProcesses) {
      // Handle both old single-wood and new multi-wood processes
      const processItems = process.items.length > 0
        ? process.items
        : (process.woodTypeId && process.sourceWarehouseId && process.stockThickness ? [{
            id: `legacy-${process.id}`,
            dryingProcessId: process.id,
            woodTypeId: process.woodTypeId,
            thickness: process.stockThickness,
            pieceCount: process.pieceCount || 0,
            sourceWarehouseId: process.sourceWarehouseId,
            woodType: process.woodType!,
            sourceWarehouse: process.sourceWarehouse!,
            createdAt: process.createdAt,
            updatedAt: process.updatedAt
          }] : []);

      for (const item of processItems) {
        // DRYING_START - when process is created
        await prisma.stockMovement.create({
          data: {
            warehouseId: item.sourceWarehouseId,
            woodTypeId: item.woodTypeId,
            thickness: item.thickness,
            movementType: 'DRYING_START',
            quantityChange: 0,
            fromStatus: 'NOT_DRIED',
            toStatus: 'UNDER_DRYING',
            referenceType: 'DRYING_PROCESS',
            referenceId: process.id,
            referenceNumber: process.batchNumber,
            userId: process.createdById || undefined,
            userName: process.createdByName || undefined,
            details: `Drying ${process.batchNumber} started`,
            createdAt: process.createdAt
          }
        });
        dryingCount++;

        // DRYING_END - if completed
        if (process.status === 'COMPLETED' && process.endTime) {
          await prisma.stockMovement.create({
            data: {
              warehouseId: item.sourceWarehouseId,
              woodTypeId: item.woodTypeId,
              thickness: item.thickness,
              movementType: 'DRYING_END',
              quantityChange: 0,
              fromStatus: 'UNDER_DRYING',
              toStatus: 'DRIED',
              referenceType: 'DRYING_PROCESS',
              referenceId: process.id,
              referenceNumber: process.batchNumber,
              userId: process.createdById || undefined,
              userName: process.createdByName || undefined,
              details: `Drying ${process.batchNumber} completed`,
              createdAt: process.endTime
            }
          });
          dryingCount++;
        }
      }
    }
    console.log(`✅ Created ${dryingCount} drying movements\n`);

    // 4. Backfill from Stock Adjustments
    console.log('📝 Processing stock adjustments...');
    const adjustments = await prisma.stockAdjustment.findMany({
      include: {
        warehouse: true,
        woodType: true,
        adjustedBy: true
      },
      orderBy: { adjustedAt: 'asc' }
    });

    let adjustmentCount = 0;
    for (const adjustment of adjustments) {
      await prisma.stockMovement.create({
        data: {
          warehouseId: adjustment.warehouseId,
          woodTypeId: adjustment.woodTypeId,
          thickness: adjustment.thickness,
          movementType: 'MANUAL_ADJUSTMENT',
          quantityChange: adjustment.quantityChange,
          toStatus: adjustment.woodStatus,
          referenceType: 'STOCK_ADJUSTMENT',
          referenceId: adjustment.id,
          userId: adjustment.adjustedById,
          userName: adjustment.adjustedBy ? `${adjustment.adjustedBy.firstName || ''} ${adjustment.adjustedBy.lastName || ''}`.trim() || adjustment.adjustedBy.email : undefined,
          details: `${adjustment.reason}${adjustment.notes ? ': ' + adjustment.notes : ''}`,
          createdAt: adjustment.adjustedAt
        }
      });
      adjustmentCount++;
    }
    console.log(`✅ Created ${adjustmentCount} adjustment movements\n`);

    // Summary
    const totalMovements = receiptCount + transferCount + dryingCount + adjustmentCount;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ BACKFILL COMPLETE!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 Receipts:     ${receiptCount} movements`);
    console.log(`🚚 Transfers:    ${transferCount} movements`);
    console.log(`🔥 Drying:       ${dryingCount} movements`);
    console.log(`📝 Adjustments:  ${adjustmentCount} movements`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 TOTAL:        ${totalMovements} movements`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillStockMovements()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
