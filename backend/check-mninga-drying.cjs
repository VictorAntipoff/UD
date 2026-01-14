const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMningaDrying() {
  console.log('🔥 MNINGA DRYING PROCESSES CHECK\n');

  const mningaWoodTypeId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // Get all drying processes for Mninga
    const dryingProcesses = await prisma.dryingProcess.findMany({
      where: {
        woodTypeId: mningaWoodTypeId
      },
      include: {
        woodType: {
          select: {
            name: true
          }
        },
        sourceWarehouse: {
          select: {
            name: true
          }
        },
        items: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    console.log(`Found ${dryingProcesses.length} drying processes for Mninga\n`);
    console.log('='.repeat(80));

    let totalInitial = 0;
    let totalFinal = 0;

    for (const process of dryingProcesses) {
      console.log(`\n🔥 ${process.batchNumber}`);
      console.log(`   Status: ${process.status}`);
      console.log(`   Thickness: ${process.thickness}${process.thicknessUnit || ''}`);
      console.log(`   Start Time: ${process.startTime.toISOString().split('T')[0]}`);
      console.log(`   End Time: ${process.endTime ? process.endTime.toISOString().split('T')[0] : 'Not completed'}`);
      console.log(`   Source Warehouse: ${process.sourceWarehouse?.name || 'N/A'}`);
      console.log(`   Use Stock: ${process.useStock ? 'YES' : 'NO'}`);
      console.log(`   Piece Count: ${process.pieceCount || 'N/A'}`);
      console.log(`   Starting Humidity: ${process.startingHumidity || 'N/A'}%`);

      if (process.items && process.items.length > 0) {
        console.log(`   Items:`);
        for (const item of process.items) {
          console.log(`      - Initial: ${item.initialQuantity} pieces → Final: ${item.finalQuantity || 'N/A'} pieces`);
          totalInitial += item.initialQuantity || 0;
          totalFinal += item.finalQuantity || 0;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 DRYING SUMMARY:');
    console.log(`   Total pieces sent to drying: ${totalInitial}`);
    console.log(`   Total pieces completed drying: ${totalFinal}`);
    console.log(`   Loss during drying: ${totalInitial - totalFinal} pieces\n`);

    // Now show current stock summary
    console.log('='.repeat(80));
    console.log('\n📦 CURRENT MNINGA STOCK IN P01 - TEGETA:\n');

    const stock = await prisma.stock.findMany({
      where: {
        woodTypeId: mningaWoodTypeId,
        warehouse: {
          name: {
            contains: 'Tegeta'
          }
        }
      },
      include: {
        warehouse: {
          select: {
            name: true
          }
        }
      }
    });

    for (const s of stock) {
      console.log(`${s.thickness} Mninga:`);
      console.log(`   ├─ NOT DRIED: ${s.statusNotDried} pieces`);
      console.log(`   ├─ UNDER DRYING: ${s.statusUnderDrying} pieces`);
      console.log(`   ├─ DRIED: ${s.statusDried} pieces`);
      console.log(`   └─ TOTAL: ${s.statusNotDried + s.statusUnderDrying + s.statusDried} pieces\n`);
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkMningaDrying()
  .catch(console.error);
