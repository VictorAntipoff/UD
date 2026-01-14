const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissing2Inch() {
  console.log('\n🔧 ADDING MISSING 130 PIECES OF 2" MNINGA FROM LOT-2026-001\n');
  console.log('='.repeat(100));

  const tegataId = '86c38abc-bb70-42c3-ae8b-181dc4623376';
  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // Get current stock
    const stockBefore = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataId,
          woodTypeId: mningaId,
          thickness: '2"'
        }
      }
    });

    console.log('📊 CURRENT STOCK (BEFORE FIX):\n');
    console.log('2" Mninga at P01 - Tegeta:');
    console.log('  NOT DRIED: ' + stockBefore.statusNotDried);
    console.log('  DRIED: ' + stockBefore.statusDried);
    console.log('  TOTAL: ' + (stockBefore.statusNotDried + stockBefore.statusDried));

    console.log('\n✅ ADDING 130 PIECES (NOT DRIED) FROM LOT-2026-001...\n');

    // Add the missing 130 pieces
    await prisma.stock.update({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataId,
          woodTypeId: mningaId,
          thickness: '2"'
        }
      },
      data: {
        statusNotDried: { increment: 130 }
      }
    });

    // Get updated stock
    const stockAfter = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataId,
          woodTypeId: mningaId,
          thickness: '2"'
        }
      }
    });

    console.log('📊 UPDATED STOCK (AFTER FIX):\n');
    console.log('2" Mninga at P01 - Tegeta:');
    console.log('  NOT DRIED: ' + stockAfter.statusNotDried + ' (+130)');
    console.log('  DRIED: ' + stockAfter.statusDried);
    console.log('  TOTAL: ' + (stockAfter.statusNotDried + stockAfter.statusDried));

    console.log('\n✅ SUCCESS! Added 130 pieces from LOT-2026-001 to stock.\n');
    console.log('='.repeat(100));

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

addMissing2Inch().catch(console.error);
