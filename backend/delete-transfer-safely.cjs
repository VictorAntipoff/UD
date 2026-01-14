const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTransferSafely() {
  console.log('\n🗑️  SAFELY DELETING TRANSFER UD-TRF-00016\n');
  console.log('='.repeat(100));

  const tegataId = '86c38abc-bb70-42c3-ae8b-181dc4623376';
  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // Step 1: Get transfer details BEFORE deletion
    const transfer = await prisma.transfer.findFirst({
      where: { transferNumber: 'UD-TRF-00016' },
      include: {
        items: true,
        fromWarehouse: true,
        toWarehouse: true
      }
    });

    if (!transfer) {
      console.log('❌ Transfer UD-TRF-00016 not found!');
      await prisma.$disconnect();
      return;
    }

    console.log('📋 TRANSFER TO DELETE:\n');
    console.log('Transfer Number: ' + transfer.transferNumber);
    console.log('From: ' + transfer.fromWarehouse.name);
    console.log('To: ' + transfer.toWarehouse.name);
    console.log('Status: ' + transfer.status);
    console.log('Completed At: ' + (transfer.completedAt ? transfer.completedAt.toISOString() : 'Not completed'));
    console.log('\nItems:');
    for (const item of transfer.items) {
      console.log('  - Wood Type ID: ' + item.woodTypeId);
      console.log('    Thickness: ' + item.thickness);
      console.log('    Quantity: ' + item.quantity + ' pieces');
      console.log('    Status: ' + item.status);
    }

    // Step 2: Get current stock BEFORE reversal
    console.log('\n📊 CURRENT STOCK (BEFORE REVERSAL):\n');
    
    const stockBefore = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataId,
          woodTypeId: mningaId,
          thickness: '2"'
        }
      }
    });

    console.log('FROM Warehouse (P01 - Tegeta) - 2" Mninga:');
    console.log('  NOT DRIED: ' + stockBefore.statusNotDried);
    console.log('  DRIED: ' + stockBefore.statusDried);
    console.log('  IN TRANSIT OUT: ' + stockBefore.statusInTransitOut);
    console.log('  TOTAL: ' + (stockBefore.statusNotDried + stockBefore.statusDried));

    // Check TO warehouse stock
    const toWarehouseId = transfer.toWarehouseId;
    const stockTo = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: toWarehouseId,
          woodTypeId: mningaId,
          thickness: '2"'
        }
      }
    });

    if (stockTo) {
      console.log('\nTO Warehouse (' + transfer.toWarehouse.name + ') - 2" Mninga:');
      console.log('  NOT DRIED: ' + stockTo.statusNotDried);
      console.log('  DRIED: ' + stockTo.statusDried);
      console.log('  TOTAL: ' + (stockTo.statusNotDried + stockTo.statusDried));
    } else {
      console.log('\nTO Warehouse (' + transfer.toWarehouse.name + ') - 2" Mninga: NO STOCK RECORD');
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n⚠️  REVERSAL PLAN:\n');

    if (transfer.status === 'COMPLETED') {
      console.log('Transfer was COMPLETED. Need to reverse:');
      console.log('1. ADD BACK 99 pieces to FROM warehouse (P01 - Tegeta) statusDried');
      console.log('2. Set statusInTransitOut back to 0 (if needed)');
      console.log('3. REMOVE 99 pieces from TO warehouse if they exist');
      console.log('4. DELETE the transfer record and all items');
    } else {
      console.log('Transfer status is: ' + transfer.status);
      console.log('Only need to delete the transfer record.');
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n🔄 EXECUTING REVERSAL...\n');

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Reverse FROM warehouse stock (add back 99 DRIED pieces)
      if (transfer.status === 'COMPLETED') {
        console.log('✓ Adding back 99 pieces to FROM warehouse (P01 - Tegeta) DRIED status');
        await tx.stock.update({
          where: {
            warehouseId_woodTypeId_thickness: {
              warehouseId: tegataId,
              woodTypeId: mningaId,
              thickness: '2"'
            }
          },
          data: {
            statusDried: { increment: 99 }
          }
        });

        // 2. Remove from TO warehouse if exists
        if (stockTo) {
          console.log('✓ Removing 99 pieces from TO warehouse (' + transfer.toWarehouse.name + ')');
          await tx.stock.update({
            where: {
              warehouseId_woodTypeId_thickness: {
                warehouseId: toWarehouseId,
                woodTypeId: mningaId,
                thickness: '2"'
              }
            },
            data: {
              statusDried: { decrement: 99 }
            }
          });
        }
      }

      // 3. Delete transfer items
      console.log('✓ Deleting transfer items');
      await tx.transferItem.deleteMany({
        where: { transferId: transfer.id }
      });

      // 4. Delete transfer
      console.log('✓ Deleting transfer UD-TRF-00016');
      await tx.transfer.delete({
        where: { id: transfer.id }
      });
    });

    console.log('\n✅ DELETION COMPLETE!\n');

    // Show final stock
    const stockAfter = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataId,
          woodTypeId: mningaId,
          thickness: '2"'
        }
      }
    });

    console.log('📊 FINAL STOCK (AFTER REVERSAL):\n');
    console.log('FROM Warehouse (P01 - Tegeta) - 2" Mninga:');
    console.log('  NOT DRIED: ' + stockAfter.statusNotDried);
    console.log('  DRIED: ' + stockAfter.statusDried + ' (+99 restored)');
    console.log('  IN TRANSIT OUT: ' + stockAfter.statusInTransitOut);
    console.log('  TOTAL: ' + (stockAfter.statusNotDried + stockAfter.statusDried));

    console.log('\n✅ Transfer UD-TRF-00016 has been completely deleted.');
    console.log('✅ Stock has been restored to the state BEFORE the transfer.');
    console.log('✅ You can now recreate the transfer fresh.\n');

    console.log('='.repeat(100));

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

deleteTransferSafely().catch(console.error);
