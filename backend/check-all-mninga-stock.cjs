const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllMningaStock() {
  console.log('🔍 Complete Mninga Stock Check - All Warehouses\n');

  const mningaWoodTypeId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // Get all warehouses
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('📦 Warehouses found:', warehouses.length, '\n');

    // Get all Mninga stock across all warehouses
    const allMningaStock = await prisma.stock.findMany({
      where: {
        woodTypeId: mningaWoodTypeId
      },
      include: {
        warehouse: {
          select: {
            name: true,
            stockControlEnabled: true
          }
        },
        woodType: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { warehouse: { name: 'asc' } },
        { thickness: 'asc' }
      ]
    });

    console.log('📊 COMPLETE MNINGA STOCK REPORT\n');
    console.log('='.repeat(80));

    let totalNotDried = 0;
    let totalUnderDrying = 0;
    let totalDried = 0;
    let totalDamaged = 0;
    let totalInTransitOut = 0;
    let totalInTransitIn = 0;

    for (const stock of allMningaStock) {
      const total = stock.statusNotDried + stock.statusUnderDrying +
                    stock.statusDried + stock.statusDamaged;

      console.log(`\n🏢 ${stock.warehouse.name} - ${stock.thickness} Mninga`);
      console.log(`   Stock Control: ${stock.warehouse.stockControlEnabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   ├─ NOT DRIED: ${stock.statusNotDried} pieces`);
      console.log(`   ├─ UNDER DRYING: ${stock.statusUnderDrying} pieces`);
      console.log(`   ├─ DRIED: ${stock.statusDried} pieces`);
      console.log(`   ├─ DAMAGED: ${stock.statusDamaged} pieces`);
      console.log(`   ├─ IN TRANSIT OUT: ${stock.statusInTransitOut} pieces`);
      console.log(`   ├─ IN TRANSIT IN: ${stock.statusInTransitIn} pieces`);
      console.log(`   └─ TOTAL: ${total} pieces`);

      totalNotDried += stock.statusNotDried;
      totalUnderDrying += stock.statusUnderDrying;
      totalDried += stock.statusDried;
      totalDamaged += stock.statusDamaged;
      totalInTransitOut += stock.statusInTransitOut;
      totalInTransitIn += stock.statusInTransitIn;
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📈 GRAND TOTAL - ALL WAREHOUSES:');
    console.log(`   ├─ NOT DRIED: ${totalNotDried} pieces`);
    console.log(`   ├─ UNDER DRYING: ${totalUnderDrying} pieces`);
    console.log(`   ├─ DRIED: ${totalDried} pieces`);
    console.log(`   ├─ DAMAGED: ${totalDamaged} pieces`);
    console.log(`   ├─ IN TRANSIT OUT: ${totalInTransitOut} pieces`);
    console.log(`   ├─ IN TRANSIT IN: ${totalInTransitIn} pieces`);
    console.log(`   └─ TOTAL: ${totalNotDried + totalUnderDrying + totalDried + totalDamaged} pieces\n`);

    // Now check drying processes
    console.log('='.repeat(80));
    console.log('\n🔥 DRYING PROCESSES FOR MNINGA\n');

    const dryingProcesses = await prisma.dryingProcess.findMany({
      where: {
        items: {
          some: {
            woodTypeId: mningaWoodTypeId
          }
        }
      },
      include: {
        items: {
          where: {
            woodTypeId: mningaWoodTypeId
          },
          include: {
            woodType: true
          }
        },
        sourceLot: {
          select: {
            lotNumber: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    console.log(`Found ${dryingProcesses.length} drying processes with Mninga\n`);

    for (const process of dryingProcesses) {
      console.log(`\n🔥 ${process.dryingNumber}`);
      console.log(`   Status: ${process.status}`);
      console.log(`   Start Date: ${process.startDate.toISOString().split('T')[0]}`);
      console.log(`   End Date: ${process.endDate ? process.endDate.toISOString().split('T')[0] : 'Not completed'}`);
      console.log(`   Source LOT: ${process.sourceLot?.lotNumber || 'N/A'}`);
      console.log(`   Items:`);

      for (const item of process.items) {
        console.log(`      - ${item.thickness} Mninga: ${item.initialQuantity} pieces → ${item.finalQuantity || 'N/A'} pieces`);
      }
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAllMningaStock()
  .catch(console.error);
