const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reconcileStockToPhysical() {
  console.log('🔧 Reconciling Stock to Match Physical Count\n');

  const tegataWarehouseId = '86c38abc-bb70-42c3-ae8b-181dc4623376'; // P01 - Tegeta
  const mningaWoodTypeId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // Get current stock
    const stock2inch = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataWarehouseId,
          woodTypeId: mningaWoodTypeId,
          thickness: '2"'
        }
      }
    });

    const stock1inch = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataWarehouseId,
          woodTypeId: mningaWoodTypeId,
          thickness: '1"'
        }
      }
    });

    console.log('📊 Current System Stock:');
    console.log('1" Mninga:', stock1inch ? {
      NotDried: stock1inch.statusNotDried,
      Dried: stock1inch.statusDried,
      Total: stock1inch.statusNotDried + stock1inch.statusDried
    } : 'NO RECORD');

    console.log('2" Mninga:', stock2inch ? {
      NotDried: stock2inch.statusNotDried,
      Dried: stock2inch.statusDried,
      InTransitOut: stock2inch.statusInTransitOut,
      Total: stock2inch.statusNotDried + stock2inch.statusDried
    } : 'NO RECORD');

    console.log('\n📋 Physical Count (from documents):');
    console.log('1" Mninga: 0 pieces NOT DRIED (112 pieces were dried and transferred/sold)');
    console.log('2" Mninga: 130 pieces NOT DRIED');

    console.log('\n🔄 Proposed Changes:');
    console.log('1" Mninga: Keep 112 DRIED (user confirmed these are real and dried)');
    console.log('2" Mninga: Adjust to 130 NOT DRIED, 0 DRIED');

    // Calculate adjustments needed
    const current2inchTotal = stock2inch ? (stock2inch.statusNotDried + stock2inch.statusDried) : 0;
    const target2inch = 130;
    const adjustment2inch = target2inch - current2inchTotal;

    console.log('\n📐 Adjustment Calculation:');
    console.log(`Current 2" total: ${current2inchTotal} pieces`);
    console.log(`Target 2" total: ${target2inch} pieces`);
    console.log(`Adjustment needed: ${adjustment2inch} pieces`);

    console.log('\n⚠️  SIMULATION MODE - No changes will be made');
    console.log('To apply these changes, uncomment the update statements below\n');

    // Uncomment to apply changes:
    /*
    // Update 2" stock to match physical count
    await prisma.stock.update({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataWarehouseId,
          woodTypeId: mningaWoodTypeId,
          thickness: '2"'
        }
      },
      data: {
        statusNotDried: 130,
        statusDried: 0,
        statusInTransitOut: 0  // Already fixed this
      }
    });

    console.log('✅ Updated 2" Mninga stock to 130 NOT DRIED');

    // Verify 1" stock is correct (112 DRIED)
    if (!stock1inch) {
      // This was already created in previous fix
      console.log('⚠️  1" stock record missing - needs investigation');
    } else {
      console.log('✅ 1" Mninga stock confirmed: 112 DRIED');
    }
    */

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

reconcileStockToPhysical()
  .catch(console.error);
