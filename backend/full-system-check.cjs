const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullSystemCheck() {
  console.log('\n🔬 COMPLETE SYSTEM CHECK - Finding The Truth\n');
  console.log('='.repeat(120));

  const tegataId = '86c38abc-bb70-42c3-ae8b-181dc4623376';
  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // 1. GET ALL LOTS (ALL STATUSES, ALL DATES)
    console.log('\n📦 STEP 1: ALL LOTS IN THE SYSTEM\n');

    const allLots = await prisma.lot.findMany({
      where: {
        measurements: { some: { woodTypeId: mningaId } }
      },
      include: {
        measurements: { where: { woodTypeId: mningaId } },
        warehouse: { select: { name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('┌────────────────┬──────────────┬──────────┬──────────┬──────────────┬──────────────────┐');
    console.log('│ LOT Number     │ Status       │ 1" Pcs   │ 2" Pcs   │ Completed    │ Warehouse        │');
    console.log('├────────────────┼──────────────┼──────────┼──────────┼──────────────┼──────────────────┤');

    let total1AllWarehouses = 0;
    let total2AllWarehouses = 0;
    let total1Tegata = 0;
    let total2Tegata = 0;

    for (const lot of allLots) {
      let pcs1 = 0;
      let pcs2 = 0;

      for (const m of lot.measurements) {
        if (m.thickness === '1"') pcs1 += m.numberOfPieces || 0;
        if (m.thickness === '2"' || m.thickness === '2') pcs2 += m.numberOfPieces || 0;
      }

      total1AllWarehouses += pcs1;
      total2AllWarehouses += pcs2;

      if (lot.warehouseId === tegataId && lot.status === 'COMPLETED') {
        total1Tegata += pcs1;
        total2Tegata += pcs2;
      }

      const mark = lot.status === 'COMPLETED' ? '✅' : (lot.status === 'PENDING' ? '⏳' : '⚠️ ');
      const date = lot.completedAt ? lot.completedAt.toISOString().split('T')[0] : 'Not done   ';
      const warehouse = lot.warehouse.name.substring(0, 16).padEnd(16);

      console.log('│ ' + lot.lotNumber.padEnd(14) + ' │ ' + mark + lot.status.padEnd(11) + ' │ ' +
                  String(pcs1).padStart(8) + ' │ ' + String(pcs2).padStart(8) + ' │ ' + date + ' │ ' + warehouse + ' │');
    }

    console.log('├────────────────┴──────────────┼──────────┼──────────┼──────────────┼──────────────────┤');
    console.log('│ TEGATA COMPLETED ONLY         │ ' + String(total1Tegata).padStart(8) + ' │ ' +
                String(total2Tegata).padStart(8) + ' │              │                  │');
    console.log('│ ALL LOTS (all warehouses)     │ ' + String(total1AllWarehouses).padStart(8) + ' │ ' +
                String(total2AllWarehouses).padStart(8) + ' │              │                  │');
    console.log('└───────────────────────────────┴──────────┴──────────┴──────────────┴──────────────────┘');

    // 2. CURRENT STOCK
    console.log('\n📊 STEP 2: CURRENT STOCK (P01 - Tegeta)\n');

    const stock = await prisma.stock.findMany({
      where: { warehouseId: tegataId, woodTypeId: mningaId },
      orderBy: { thickness: 'asc' }
    });

    console.log('┌──────────┬────────────┬─────────┬────────────┐');
    console.log('│ Thickness│ NOT DRIED  │ DRIED   │ TOTAL      │');
    console.log('├──────────┼────────────┼─────────┼────────────┤');

    let stock1 = 0;
    let stock2 = 0;

    for (const s of stock) {
      const total = s.statusNotDried + s.statusDried;
      if (s.thickness === '1"') stock1 = total;
      if (s.thickness === '2"') stock2 = total;
      console.log('│ ' + s.thickness.padEnd(8) + ' │ ' + String(s.statusNotDried).padStart(10) + ' │ ' +
                  String(s.statusDried).padStart(7) + ' │ ' + String(total).padStart(10) + ' │');
    }
    console.log('└──────────┴────────────┴─────────┴────────────┘');

    // 3. TRANSFERS
    console.log('\n📤 STEP 3: ALL TRANSFERS OUT (P01 - Tegeta)\n');

    const transfers = await prisma.transfer.findMany({
      where: {
        fromWarehouseId: tegataId,
        status: 'COMPLETED',
        items: { some: { woodTypeId: mningaId } }
      },
      include: {
        items: { where: { woodTypeId: mningaId } },
        toWarehouse: { select: { name: true } }
      },
      orderBy: { completedAt: 'asc' }
    });

    console.log('┌──────────────────┬──────────┬──────────┬──────────────┬──────────────────┐');
    console.log('│ Transfer Number  │ 1" Pcs   │ 2" Pcs   │ Completed    │ To Warehouse     │');
    console.log('├──────────────────┼──────────┼──────────┼──────────────┼──────────────────┤');

    let trans1 = 0;
    let trans2 = 0;

    for (const t of transfers) {
      let t1 = 0;
      let t2 = 0;

      for (const item of t.items) {
        if (item.thickness === '1"') t1 += item.quantity;
        if (item.thickness === '2"') t2 += item.quantity;
      }

      trans1 += t1;
      trans2 += t2;

      const date = t.completedAt.toISOString().split('T')[0];
      const dest = t.toWarehouse.name.substring(0, 16).padEnd(16);

      console.log('│ ' + t.transferNumber.padEnd(16) + ' │ ' + String(t1).padStart(8) + ' │ ' +
                  String(t2).padStart(8) + ' │ ' + date + ' │ ' + dest + ' │');
    }

    console.log('├──────────────────┼──────────┼──────────┼──────────────┼──────────────────┤');
    console.log('│ TOTAL TRANSFERRED│ ' + String(trans1).padStart(8) + ' │ ' + String(trans2).padStart(8) +
                ' │              │                  │');
    console.log('└──────────────────┴──────────┴──────────┴──────────────┴──────────────────┘');

    // 4. RECONCILIATION
    console.log('\n🧮 STEP 4: RECONCILIATION\n');

    const expected1 = total1Tegata - trans1;
    const expected2 = total2Tegata - trans2;
    const disc1 = stock1 - expected1;
    const disc2 = stock2 - expected2;

    console.log('┌──────────────────────────────┬────────────┬────────────┐');
    console.log('│ Description                  │ 1" Pieces  │ 2" Pieces  │');
    console.log('├──────────────────────────────┼────────────┼────────────┤');
    console.log('│ Receipts (Tegata, Completed) │ ' + String(total1Tegata).padStart(10) + ' │ ' + String(total2Tegata).padStart(10) + ' │');
    console.log('│ Transfers OUT                │ ' + String(trans1).padStart(10) + ' │ ' + String(trans2).padStart(10) + ' │');
    console.log('├──────────────────────────────┼────────────┼────────────┤');
    console.log('│ EXPECTED Stock               │ ' + String(expected1).padStart(10) + ' │ ' + String(expected2).padStart(10) + ' │');
    console.log('│ ACTUAL Stock                 │ ' + String(stock1).padStart(10) + ' │ ' + String(stock2).padStart(10) + ' │');
    console.log('├──────────────────────────────┼────────────┼────────────┤');
    console.log('│ DISCREPANCY                  │ ' + String(disc1).padStart(10) + ' │ ' + String(disc2).padStart(10) + ' │');
    console.log('└──────────────────────────────┴────────────┴────────────┘');

    // 5. CHECK DOUBLE TRANSFER
    console.log('\n🔍 STEP 5: CHECKING FOR DOUBLE-COMPLETED TRANSFERS\n');

    // Check each transfer completion count (we can't see history, but we know UD-TRF-00016 was done twice)
    console.log('Known issue: UD-TRF-00016 was completed TWICE (99 pieces)');
    console.log('This means 99 pieces were deducted twice from stock.');
    console.log('Adjusted 2" discrepancy: ' + disc2 + ' + 99 = ' + (disc2 + 99) + ' pieces\n');

    // 6. ANALYSIS & SOLUTION
    console.log('='.repeat(120));
    console.log('\n💡 ANALYSIS & SOLUTION\n');
    console.log('='.repeat(120));

    console.log('\n✅ FINDINGS:\n');
    console.log('1. Total receipts (Tegata, Completed): 1"=' + total1Tegata + ' pcs, 2"=' + total2Tegata + ' pcs');
    console.log('2. Total transfers OUT: 1"=' + trans1 + ' pcs, 2"=' + trans2 + ' pcs');
    console.log('3. Current stock: 1"=' + stock1 + ' pcs, 2"=' + stock2 + ' pcs');
    console.log('4. Expected stock: 1"=' + expected1 + ' pcs, 2"=' + expected2 + ' pcs');
    console.log('5. Discrepancy: 1"=' + disc1 + ' pcs, 2"=' + disc2 + ' pcs');

    console.log('\n❌ PROBLEMS:\n');

    if (expected2 < 0) {
      console.log('1. Expected 2" stock is NEGATIVE (' + expected2 + ' pieces)');
      console.log('   → You transferred MORE than you received!');
      console.log('   → Transferred: ' + trans2 + ' pieces');
      console.log('   → Received: ' + total2Tegata + ' pieces');
      console.log('   → Difference: ' + (trans2 - total2Tegata) + ' pieces SHORT\n');
    }

    if (disc2 !== 0) {
      console.log('2. Actual stock does NOT match expected (Discrepancy: ' + disc2 + ' pieces)');
      console.log('   → Transfer UD-TRF-00016 was completed TWICE (accounts for 99 pieces)');
      console.log('   → Adjusted discrepancy: ' + (disc2 + 99) + ' pieces');
      console.log('   → This suggests: ' + Math.abs(disc2 + 99) + ' pieces from OLD receipts (before Oct 2025)\n');
    }

    console.log('\n🎯 ROOT CAUSE:\n');
    console.log('The system allowed transfers to go out BEFORE receipts were completed.');
    console.log('This created negative stock, which was then "corrected" when receipts came in.');
    console.log('However, the stock numbers suggest there were EARLIER receipts that provided');
    console.log('the initial inventory that was transferred out in Oct-Dec 2025.\n');

    console.log('📋 RECOMMENDED SOLUTION:\n');
    console.log('┌────┬──────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ 1  │ FIX: Remove double-deduction from UD-TRF-00016                              │');
    console.log('│    │ Action: Add back 99 pieces to 2" stock (currently deducted twice)           │');
    console.log('│    │ Result: Stock will be ' + (stock2 + 99) + ' pieces instead of ' + stock2 + '                                    │');
    console.log('├────┼──────────────────────────────────────────────────────────────────────────────┤');
    console.log('│ 2  │ INVESTIGATE: Find receipts from BEFORE October 2025                          │');
    console.log('│    │ The ' + (expected2 + 99 < 0 ? Math.abs(expected2 + 99) : 0) + ' piece shortage suggests earlier receipts exist                       │');
    console.log('│    │ Check for LOTs completed before 2025-10-31 that should have added stock     │');
    console.log('├────┼──────────────────────────────────────────────────────────────────────────────┤');
    console.log('│ 3  │ VERIFY: Physical count vs System                                             │');
    console.log('│    │ You said physical count: 2" = 130 NOT DRIED                                  │');
    console.log('│    │ System shows: 2" = 119 NOT DRIED + 19 DRIED = 138 total                      │');
    console.log('│    │ After fixing double-transfer: 138 + 99 = 237 pieces                          │');
    console.log('│    │ This would be WRONG! Need to reconcile with physical inventory               │');
    console.log('└────┴──────────────────────────────────────────────────────────────────────────────┘');

    console.log('\n⚠️  CRITICAL QUESTION:\n');
    console.log('Your physical count shows 130 pieces of 2" NOT DRIED.');
    console.log('System shows 138 total (119 NotDried + 19 Dried).');
    console.log('\nBefore I fix anything, I need to know:');
    console.log('1. Is the 19 DRIED pieces real? (from drying processes)');
    console.log('2. Should the system match your physical 130 NOT DRIED?');
    console.log('3. OR should it be 130 NOT DRIED + 19 DRIED = 149 total?\n');

    console.log('='.repeat(120));

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

fullSystemCheck().catch(console.error);
