const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLot2026001Stock() {
  console.log('🔍 LOT-2026-001 Stock Integration Check - 2" Mninga Focus\n');

  const mningaWoodTypeId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';
  const tegataWarehouseId = '86c38abc-bb70-42c3-ae8b-181dc4623376';

  try {
    // Get LOT-2026-001 details
    const lot = await prisma.lot.findFirst({
      where: {
        lotNumber: 'LOT-2026-001'
      },
      include: {
        measurements: {
          where: {
            woodTypeId: mningaWoodTypeId
          }
        },
        warehouse: true
      }
    });

    if (!lot) {
      console.log('❌ LOT-2026-001 not found');
      return;
    }

    console.log('📦 LOT-2026-001 Details:');
    console.log(`   Lot Number: ${lot.lotNumber}`);
    console.log(`   Status: ${lot.status}`);
    console.log(`   Warehouse: ${lot.warehouse.name}`);
    console.log(`   Completed At: ${lot.completedAt ? lot.completedAt.toISOString() : 'Not completed'}`);
    console.log(`   Total Measurements: ${lot.measurements.length}`);

    // Group measurements by thickness
    const measurementsByThickness = {};
    let total2inchPieces = 0;
    let total2inchM3 = 0;

    for (const measurement of lot.measurements) {
      const thickness = measurement.thickness;
      if (!measurementsByThickness[thickness]) {
        measurementsByThickness[thickness] = {
          count: 0,
          totalPieces: 0,
          totalM3: 0,
          measurements: []
        };
      }

      const pieces = measurement.numberOfPieces || 0;
      const m3 = measurement.volume || 0;

      measurementsByThickness[thickness].count++;
      measurementsByThickness[thickness].totalPieces += pieces;
      measurementsByThickness[thickness].totalM3 += m3;
      measurementsByThickness[thickness].measurements.push({
        id: measurement.id.substring(0, 8),
        pieces,
        m3: m3.toFixed(4)
      });

      if (thickness === '2"' || thickness === '2') {
        total2inchPieces += pieces;
        total2inchM3 += m3;
      }
    }

    console.log('\n📏 Measurements Breakdown:\n');

    for (const [thickness, data] of Object.entries(measurementsByThickness)) {
      console.log(`${thickness} Mninga:`);
      console.log(`   ├─ Number of measurements: ${data.count}`);
      console.log(`   ├─ Total pieces: ${data.totalPieces}`);
      console.log(`   └─ Total volume: ${data.totalM3.toFixed(4)} m³`);
      console.log(`   Measurements:`);
      for (const m of data.measurements) {
        console.log(`      - ${m.id}: ${m.pieces} pieces (${m.m3} m³)`);
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('\n🎯 FOCUS: 2" Mninga from LOT-2026-001');
    console.log(`   Total 2" pieces measured: ${total2inchPieces}`);
    console.log(`   Total 2" volume: ${total2inchM3.toFixed(4)} m³\n`);

    // Check current stock for 2" Mninga
    const stock2inch = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataWarehouseId,
          woodTypeId: mningaWoodTypeId,
          thickness: '2"'
        }
      }
    });

    console.log('📊 Current 2" Mninga Stock in P01 - Tegeta:');
    if (stock2inch) {
      console.log(`   ├─ NOT DRIED: ${stock2inch.statusNotDried} pieces`);
      console.log(`   ├─ UNDER DRYING: ${stock2inch.statusUnderDrying} pieces`);
      console.log(`   ├─ DRIED: ${stock2inch.statusDried} pieces`);
      console.log(`   ├─ DAMAGED: ${stock2inch.statusDamaged} pieces`);
      console.log(`   └─ TOTAL: ${stock2inch.statusNotDried + stock2inch.statusUnderDrying + stock2inch.statusDried + stock2inch.statusDamaged} pieces`);
    } else {
      console.log('   ❌ NO STOCK RECORD FOUND');
    }

    console.log('\n' + '='.repeat(80));

    // Check all receipts for 2" Mninga
    console.log('\n📥 ALL RECEIPTS WITH 2" MNINGA:\n');

    const allLots = await prisma.lot.findMany({
      where: {
        status: 'COMPLETED',
        measurements: {
          some: {
            woodTypeId: mningaWoodTypeId,
            thickness: {
              in: ['2"', '2']
            }
          }
        },
        warehouseId: tegataWarehouseId
      },
      include: {
        measurements: {
          where: {
            woodTypeId: mningaWoodTypeId,
            thickness: {
              in: ['2"', '2']
            }
          }
        }
      },
      orderBy: {
        completedAt: 'asc'
      }
    });

    let totalReceived2inch = 0;

    for (const l of allLots) {
      let lotTotal = 0;
      for (const m of l.measurements) {
        lotTotal += m.numberOfPieces || 0;
      }
      totalReceived2inch += lotTotal;

      console.log(`${l.lotNumber}:`);
      console.log(`   Completed: ${l.completedAt ? l.completedAt.toISOString().split('T')[0] : 'N/A'}`);
      console.log(`   2" pieces: ${lotTotal}`);
      console.log(`   Measurements: ${l.measurements.length}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log(`\n📊 TOTAL 2" MNINGA RECEIVED: ${totalReceived2inch} pieces`);
    console.log(`📦 CURRENT 2" MNINGA STOCK: ${stock2inch ? stock2inch.statusNotDried + stock2inch.statusUnderDrying + stock2inch.statusDried + stock2inch.statusDamaged : 0} pieces\n`);

    // Check transfers out
    console.log('='.repeat(80));
    console.log('\n📤 TRANSFERS OUT OF 2" MNINGA:\n');

    const transfers = await prisma.transfer.findMany({
      where: {
        status: 'COMPLETED',
        fromWarehouseId: tegataWarehouseId,
        items: {
          some: {
            woodTypeId: mningaWoodTypeId,
            thickness: '2"'
          }
        }
      },
      include: {
        items: {
          where: {
            woodTypeId: mningaWoodTypeId,
            thickness: '2"'
          }
        },
        toWarehouse: true
      },
      orderBy: {
        completedAt: 'asc'
      }
    });

    let totalTransferred2inch = 0;

    for (const transfer of transfers) {
      let transferTotal = 0;
      for (const item of transfer.items) {
        transferTotal += item.quantity;
      }
      totalTransferred2inch += transferTotal;

      console.log(`${transfer.transferNumber}:`);
      console.log(`   Completed: ${transfer.completedAt ? transfer.completedAt.toISOString().split('T')[0] : 'N/A'}`);
      console.log(`   To: ${transfer.toWarehouse.name}`);
      console.log(`   2" pieces: ${transferTotal}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log(`\n📊 TOTAL 2" MNINGA TRANSFERRED OUT: ${totalTransferred2inch} pieces\n`);

    // Calculate expected stock
    const expectedStock = totalReceived2inch - totalTransferred2inch;
    const actualStock = stock2inch ? stock2inch.statusNotDried + stock2inch.statusUnderDrying + stock2inch.statusDried + stock2inch.statusDamaged : 0;
    const difference = actualStock - expectedStock;

    console.log('='.repeat(80));
    console.log('\n🧮 RECONCILIATION:\n');
    console.log(`   Total Received: ${totalReceived2inch} pieces`);
    console.log(`   Total Transferred: ${totalTransferred2inch} pieces`);
    console.log(`   Expected Stock: ${expectedStock} pieces`);
    console.log(`   Actual Stock: ${actualStock} pieces`);
    console.log(`   Difference: ${difference > 0 ? '+' : ''}${difference} pieces`);

    if (difference !== 0) {
      console.log(`\n   ⚠️  ${Math.abs(difference)} pieces ${difference > 0 ? 'MORE' : 'LESS'} than expected`);
    } else {
      console.log('\n   ✅ Stock matches expected value!');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkLot2026001Stock()
  .catch(console.error);
