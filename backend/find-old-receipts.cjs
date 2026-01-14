const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOldReceipts() {
  console.log('\n🔍 SEARCHING FOR OLD RECEIPTS (Before October 2025)\n');
  console.log('='.repeat(100));

  const tegataId = '86c38abc-bb70-42c3-ae8b-181dc4623376';
  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';
  const cutoffDate = new Date('2025-10-31');

  try {
    // Find ALL LOTs for Mninga (all statuses, all dates, all warehouses)
    console.log('\n📦 STEP 1: ALL LOTS WITH MNINGA\n');

    const allLots = await prisma.lot.findMany({
      where: {
        measurements: {
          some: { woodTypeId: mningaId }
        }
      },
      include: {
        measurements: {
          where: { woodTypeId: mningaId }
        },
        warehouse: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('┌────────────────┬──────────────┬──────────┬──────────┬──────────────┬──────────────────┐');
    console.log('│ LOT Number     │ Status       │ 1" Pcs   │ 2" Pcs   │ Completed    │ Warehouse        │');
    console.log('├────────────────┼──────────────┼──────────┼──────────┼──────────────┼──────────────────┤');

    let oldLots = [];
    let total1Old = 0;
    let total2Old = 0;
    let total1All = 0;
    let total2All = 0;

    for (const lot of allLots) {
      let pcs1 = 0;
      let pcs2 = 0;

      for (const m of lot.measurements) {
        if (m.thickness === '1"') pcs1 += m.numberOfPieces || 0;
        if (m.thickness === '2"' || m.thickness === '2') pcs2 += m.numberOfPieces || 0;
      }

      total1All += pcs1;
      total2All += pcs2;

      const isOld = lot.completedAt && lot.completedAt < cutoffDate;
      const mark = lot.status === 'COMPLETED' ? (isOld ? '🔴' : '✅') : '⏳';

      if (isOld && lot.status === 'COMPLETED' && lot.warehouseId === tegataId) {
        total1Old += pcs1;
        total2Old += pcs2;
        oldLots.push(lot);
      }

      const date = lot.completedAt ? lot.completedAt.toISOString().split('T')[0] : 'Not done   ';
      const warehouse = lot.warehouse.name.substring(0, 16).padEnd(16);

      console.log('│ ' + lot.lotNumber.padEnd(14) + ' │ ' + mark + ' ' + lot.status.padEnd(10) + ' │ ' +
                  String(pcs1).padStart(8) + ' │ ' + String(pcs2).padStart(8) + ' │ ' + date + ' │ ' + warehouse + ' │');
    }

    console.log('├────────────────┴──────────────┼──────────┼──────────┼──────────────┼──────────────────┤');
    console.log('│ OLD (Tegata, before Oct 2025) │ ' + String(total1Old).padStart(8) + ' │ ' +
                String(total2Old).padStart(8) + ' │              │                  │');
    console.log('│ ALL LOTS (all time)           │ ' + String(total1All).padStart(8) + ' │ ' +
                String(total2All).padStart(8) + ' │              │                  │');
    console.log('└───────────────────────────────┴──────────┴──────────┴──────────────┴──────────────────┘');

    console.log('\n🔍 ANALYSIS:\n');

    if (oldLots.length === 0) {
      console.log('❌ NO OLD RECEIPTS FOUND before October 31, 2025');
      console.log('\n   This is the problem! The first transfer (UD-TRF-00011) went out on 2025-10-31');
      console.log('   but there are NO receipts before that date to provide the initial stock.\n');
      console.log('   The 210-piece discrepancy suggests there SHOULD be old receipts that were:');
      console.log('   1. Never completed in the system');
      console.log('   2. Manually added to stock outside the LOT system');
      console.log('   3. Lost/deleted from the database\n');
    } else {
      console.log('✅ FOUND ' + oldLots.length + ' OLD RECEIPTS before October 2025\n');
      console.log('   Old receipts provided:');
      console.log('   - 1" Mninga: ' + total1Old + ' pieces');
      console.log('   - 2" Mninga: ' + total2Old + ' pieces\n');

      console.log('   Details:');
      for (const lot of oldLots) {
        let pcs1 = 0;
        let pcs2 = 0;
        for (const m of lot.measurements) {
          if (m.thickness === '1"') pcs1 += m.numberOfPieces || 0;
          if (m.thickness === '2"' || m.thickness === '2') pcs2 += m.numberOfPieces || 0;
        }
        console.log('   - ' + lot.lotNumber + ': 1"=' + pcs1 + ', 2"=' + pcs2 + ' (' +
                    lot.completedAt.toISOString().split('T')[0] + ')');
      }
    }

    // Now recalculate with old receipts included
    console.log('\n='.repeat(100));
    console.log('\n🧮 COMPLETE RECONCILIATION (Including Old Receipts)\n');

    // Get recent receipts
    const recentLots = await prisma.lot.findMany({
      where: {
        warehouseId: tegataId,
        status: 'COMPLETED',
        completedAt: { gte: cutoffDate },
        measurements: { some: { woodTypeId: mningaId } }
      },
      include: {
        measurements: { where: { woodTypeId: mningaId } }
      }
    });

    let recent1 = 0;
    let recent2 = 0;

    for (const lot of recentLots) {
      for (const m of lot.measurements) {
        if (m.thickness === '1"') recent1 += m.numberOfPieces || 0;
        if (m.thickness === '2"' || m.thickness === '2') recent2 += m.numberOfPieces || 0;
      }
    }

    // Get transfers
    const transfers = await prisma.transfer.findMany({
      where: {
        fromWarehouseId: tegataId,
        status: 'COMPLETED',
        items: { some: { woodTypeId: mningaId } }
      },
      include: {
        items: { where: { woodTypeId: mningaId } }
      }
    });

    let trans1 = 0;
    let trans2 = 0;

    for (const t of transfers) {
      for (const item of t.items) {
        if (item.thickness === '1"') trans1 += item.quantity;
        if (item.thickness === '2"') trans2 += item.quantity;
      }
    }

    // Get current stock
    const stock = await prisma.stock.findMany({
      where: { warehouseId: tegataId, woodTypeId: mningaId },
      orderBy: { thickness: 'asc' }
    });

    let stock1 = 0;
    let stock2 = 0;

    for (const s of stock) {
      const total = s.statusNotDried + s.statusDried;
      if (s.thickness === '1"') stock1 = total;
      if (s.thickness === '2"') stock2 = total;
    }

    console.log('┌──────────────────────────────┬────────────┬────────────┐');
    console.log('│ Description                  │ 1" Pieces  │ 2" Pieces  │');
    console.log('├──────────────────────────────┼────────────┼────────────┤');
    console.log('│ OLD Receipts (< Oct 2025)    │ ' + String(total1Old).padStart(10) + ' │ ' + String(total2Old).padStart(10) + ' │');
    console.log('│ RECENT Receipts (>= Oct 2025)│ ' + String(recent1).padStart(10) + ' │ ' + String(recent2).padStart(10) + ' │');
    console.log('├──────────────────────────────┼────────────┼────────────┤');
    console.log('│ TOTAL Receipts               │ ' + String(total1Old + recent1).padStart(10) + ' │ ' + String(total2Old + recent2).padStart(10) + ' │');
    console.log('│ Transfers OUT                │ ' + String(trans1).padStart(10) + ' │ ' + String(trans2).padStart(10) + ' │');
    console.log('├──────────────────────────────┼────────────┼────────────┤');
    console.log('│ EXPECTED Stock               │ ' + String((total1Old + recent1) - trans1).padStart(10) + ' │ ' +
                String((total2Old + recent2) - trans2).padStart(10) + ' │');
    console.log('│ ACTUAL Stock                 │ ' + String(stock1).padStart(10) + ' │ ' + String(stock2).padStart(10) + ' │');
    console.log('├──────────────────────────────┼────────────┼────────────┤');
    console.log('│ DISCREPANCY                  │ ' + String(stock1 - ((total1Old + recent1) - trans1)).padStart(10) + ' │ ' +
                String(stock2 - ((total2Old + recent2) - trans2)).padStart(10) + ' │');
    console.log('└──────────────────────────────┴────────────┴────────────┘');

    const disc2 = stock2 - ((total2Old + recent2) - trans2);

    console.log('\n💡 ANALYSIS:\n');
    console.log('After including old receipts:');
    console.log('- 2" discrepancy is now: ' + disc2 + ' pieces');
    console.log('- Known issue: UD-TRF-00016 deducted twice (99 pieces)');
    console.log('- Adjusted discrepancy: ' + disc2 + ' + 99 = ' + (disc2 + 99) + ' pieces');

    if (Math.abs(disc2 + 99) < 10) {
      console.log('\n✅ DISCREPANCY EXPLAINED! The double-transfer accounts for it.');
    } else {
      console.log('\n❌ Still ' + Math.abs(disc2 + 99) + ' pieces unexplained after fixing double-transfer.');
    }

    console.log('\n='.repeat(100));

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

findOldReceipts().catch(console.error);
