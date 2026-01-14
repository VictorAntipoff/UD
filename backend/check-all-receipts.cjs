const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllReceipts() {
  console.log('\n🔍 CHECKING ALL RECEIPTS - Finding Missing Stock\n');
  console.log('='.repeat(100));

  const tegataId = '86c38abc-bb70-42c3-ae8b-181dc4623376';
  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // Get ALL lots (not just completed)
    const allLots = await prisma.lot.findMany({
      where: {
        warehouseId: tegataId,
        measurements: { some: { woodTypeId: mningaId } }
      },
      include: {
        measurements: { where: { woodTypeId: mningaId } },
        warehouse: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('\n📦 ALL LOTS (All Statuses):\n');
    console.log('┌────────────────┬────────────┬──────────┬──────────┬──────────────┐');
    console.log('│ LOT Number     │ Status     │ 1" Pcs   │ 2" Pcs   │ Completed    │');
    console.log('├────────────────┼────────────┼──────────┼──────────┼──────────────┤');

    let total1Completed = 0;
    let total2Completed = 0;
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

      if (lot.status === 'COMPLETED') {
        total1Completed += pcs1;
        total2Completed += pcs2;
      }

      const statusMark = lot.status === 'COMPLETED' ? '✅' : '⚠️ ';
      const dateStr = lot.completedAt ? lot.completedAt.toISOString().split('T')[0] : 'Not done';

      console.log('│ ' + lot.lotNumber.padEnd(14) + ' │ ' + statusMark + ' ' + lot.status.padEnd(8) + ' │ ' +
                  String(pcs1).padStart(8) + ' │ ' + String(pcs2).padStart(8) + ' │ ' + dateStr + ' │');
    }

    console.log('├────────────────┴────────────┼──────────┼──────────┼──────────────┤');
    console.log('│ COMPLETED ONLY (should sync) │ ' + String(total1Completed).padStart(8) + ' │ ' +
                String(total2Completed).padStart(8) + ' │              │');
    console.log('│ ALL LOTS (incl pending)      │ ' + String(total1All).padStart(8) + ' │ ' +
                String(total2All).padStart(8) + ' │              │');
    console.log('└──────────────────────────────┴──────────┴──────────┴──────────────┘');

    // Current stock
    const stock = await prisma.stock.findMany({
      where: { warehouseId: tegataId, woodTypeId: mningaId },
      orderBy: { thickness: 'asc' }
    });

    console.log('\n📊 CURRENT STOCK:\n');
    console.log('┌──────────┬────────────┬─────────┬───────────┐');
    console.log('│ Thickness│ NOT DRIED  │ DRIED   │ TOTAL     │');
    console.log('├──────────┼────────────┼─────────┼───────────┤');

    let stock1Total = 0;
    let stock2Total = 0;

    for (const s of stock) {
      const total = s.statusNotDried + s.statusDried;
      if (s.thickness === '1"') stock1Total = total;
      if (s.thickness === '2"') stock2Total = total;
      console.log('│ ' + s.thickness.padEnd(8) + ' │ ' + String(s.statusNotDried).padStart(10) + ' │ ' +
                  String(s.statusDried).padStart(7) + ' │ ' + String(total).padStart(9) + ' │');
    }
    console.log('└──────────┴────────────┴─────────┴───────────┘');

    // Transfers
    const transfers = await prisma.transfer.findMany({
      where: {
        fromWarehouseId: tegataId,
        status: 'COMPLETED',
        items: { some: { woodTypeId: mningaId } }
      },
      include: { items: { where: { woodTypeId: mningaId } } }
    });

    let trans1 = 0;
    let trans2 = 0;

    for (const t of transfers) {
      for (const item of t.items) {
        if (item.thickness === '1"') trans1 += item.quantity;
        if (item.thickness === '2"') trans2 += item.quantity;
      }
    }

    console.log('\n🧮 RECONCILIATION:\n');
    console.log('┌─────────────────────────────┬───────────┬───────────┐');
    console.log('│ Description                 │ 1" Pieces │ 2" Pieces │');
    console.log('├─────────────────────────────┼───────────┼───────────┤');
    console.log('│ Completed LOTs              │ ' + String(total1Completed).padStart(9) + ' │ ' + String(total2Completed).padStart(9) + ' │');
    console.log('│ Transfers OUT               │ ' + String(trans1).padStart(9) + ' │ ' + String(trans2).padStart(9) + ' │');
    console.log('├─────────────────────────────┼───────────┼───────────┤');
    console.log('│ EXPECTED (Receipts-Transfer)│ ' + String(total1Completed - trans1).padStart(9) + ' │ ' + String(total2Completed - trans2).padStart(9) + ' │');
    console.log('│ ACTUAL (Current Stock)      │ ' + String(stock1Total).padStart(9) + ' │ ' + String(stock2Total).padStart(9) + ' │');
    console.log('├─────────────────────────────┼───────────┼───────────┤');
    console.log('│ DISCREPANCY                 │ ' + String(stock1Total - (total1Completed - trans1)).padStart(9) + ' │ ' +
                String(stock2Total - (total2Completed - trans2)).padStart(9) + ' │');
    console.log('└─────────────────────────────┴───────────┴───────────┘');

    console.log('\n💡 ANALYSIS:\n');

    const disc1 = stock1Total - (total1Completed - trans1);
    const disc2 = stock2Total - (total2Completed - trans2);

    if (disc1 !== 0) {
      console.log('   1" Discrepancy: ' + disc1 + ' pieces');
      if (disc1 > 0) console.log('      → Stock has MORE than expected (maybe manual addition or receipt not counted)');
      else console.log('      → Stock has LESS than expected (maybe transfer double-counted)');
    }

    if (disc2 !== 0) {
      console.log('   2" Discrepancy: ' + disc2 + ' pieces');
      if (disc2 > 0) console.log('      → Stock has MORE than expected (maybe manual addition or receipt not counted)');
      else console.log('      → Stock has LESS than expected (maybe transfer double-counted)');
    }

    // Check if there are pending lots
    const pendingLots = allLots.filter(l => l.status !== 'COMPLETED');
    if (pendingLots.length > 0) {
      console.log('\n   ⚠️  Found ' + pendingLots.length + ' pending LOTs not yet completed:');
      for (const pl of pendingLots) {
        console.log('      - ' + pl.lotNumber + ' (Status: ' + pl.status + ')');
      }
    }

    console.log('\n' + '='.repeat(100));

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

checkAllReceipts().catch(console.error);
