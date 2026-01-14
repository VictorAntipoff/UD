const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showCurrentState() {
  console.log('\n📊 CURRENT STATE - BEFORE ANY FIXES\n');
  console.log('='.repeat(80));

  const tegataId = '86c38abc-bb70-42c3-ae8b-181dc4623376';
  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // Current Stock
    const stock = await prisma.stock.findMany({
      where: { warehouseId: tegataId, woodTypeId: mningaId },
      orderBy: { thickness: 'asc' }
    });

    console.log('\n1️⃣  CURRENT STOCK (P01 - Tegeta):\n');
    console.log('┌──────────┬─────────────┬────────┬────────────┐');
    console.log('│ Thickness│ NOT DRIED   │ DRIED  │ TOTAL      │');
    console.log('├──────────┼─────────────┼────────┼────────────┤');
    for (const s of stock) {
      const total = s.statusNotDried + s.statusDried;
      console.log(`│ ${s.thickness.padEnd(8)} │ ${String(s.statusNotDried).padStart(11)} │ ${String(s.statusDried).padStart(6)} │ ${String(total).padStart(10)} │`);
    }
    console.log('└──────────┴─────────────┴────────┴────────────┘');

    // LOT-2026-001
    console.log('\n2️⃣  LOT-2026-001 MEASUREMENTS:\n');
    const lot = await prisma.lot.findFirst({
      where: { lotNumber: 'LOT-2026-001' },
      include: { measurements: { where: { woodTypeId: mningaId } } }
    });

    const byThickness = {};
    for (const m of lot.measurements) {
      if (!byThickness[m.thickness]) byThickness[m.thickness] = 0;
      byThickness[m.thickness] += m.numberOfPieces || 0;
    }

    console.log('┌──────────┬─────────────┬──────────────────────┐');
    console.log('│ Thickness│ Pieces      │ Status               │');
    console.log('├──────────┼─────────────┼──────────────────────┤');
    const date = lot.completedAt.toISOString().split('T')[0];
    console.log(`│ 1"       │ ${String(byThickness['1"'] || 0).padStart(11)} │ Completed ${date} │`);
    console.log(`│ 2"       │ ${String(byThickness['2"'] || 0).padStart(11)} │ Completed ${date} │`);
    console.log('└──────────┴─────────────┴──────────────────────┘');

    // All LOTs
    console.log('\n3️⃣  ALL COMPLETED LOTS (2" Mninga):\n');
    const allLots = await prisma.lot.findMany({
      where: {
        warehouseId: tegataId,
        status: 'COMPLETED',
        measurements: { some: { woodTypeId: mningaId, thickness: { in: ['2"', '2'] } } }
      },
      include: { measurements: { where: { woodTypeId: mningaId, thickness: { in: ['2"', '2'] } } } },
      orderBy: { completedAt: 'asc' }
    });

    console.log('┌────────────────┬─────────────┬──────────────┐');
    console.log('│ LOT Number     │ 2" Pieces   │ Completed    │');
    console.log('├────────────────┼─────────────┼──────────────┤');
    let totalReceived = 0;
    for (const l of allLots) {
      const pcs = l.measurements.reduce((s, m) => s + (m.numberOfPieces || 0), 0);
      totalReceived += pcs;
      const d = l.completedAt.toISOString().split('T')[0];
      console.log(`│ ${l.lotNumber.padEnd(14)} │ ${String(pcs).padStart(11)} │ ${d}   │`);
    }
    console.log('├────────────────┼─────────────┼──────────────┤');
    console.log(`│ TOTAL RECEIVED │ ${String(totalReceived).padStart(11)} │              │`);
    console.log('└────────────────┴─────────────┴──────────────┘');

    // Transfers
    console.log('\n4️⃣  ALL TRANSFERS OUT (2" Mninga):\n');
    const transfers = await prisma.transfer.findMany({
      where: {
        fromWarehouseId: tegataId,
        status: 'COMPLETED',
        items: { some: { woodTypeId: mningaId, thickness: '2"' } }
      },
      include: { items: { where: { woodTypeId: mningaId, thickness: '2"' } }, toWarehouse: true },
      orderBy: { completedAt: 'asc' }
    });

    console.log('┌──────────────────┬─────────────┬──────────────┬─────────────────┐');
    console.log('│ Transfer Number  │ 2" Pieces   │ Completed    │ Destination     │');
    console.log('├──────────────────┼─────────────┼──────────────┼─────────────────┤');
    let totalTransferred = 0;
    for (const t of transfers) {
      const pcs = t.items.reduce((s, i) => s + i.quantity, 0);
      totalTransferred += pcs;
      const d = t.completedAt.toISOString().split('T')[0];
      const dest = t.toWarehouse.name.substring(0, 15);
      console.log(`│ ${t.transferNumber.padEnd(16)} │ ${String(pcs).padStart(11)} │ ${d}   │ ${dest.padEnd(15)} │`);
    }
    console.log('├──────────────────┼─────────────┼──────────────┼─────────────────┤');
    console.log(`│ TOTAL TRANSFERRED│ ${String(totalTransferred).padStart(11)} │              │                 │`);
    console.log('└──────────────────┴─────────────┴──────────────┴─────────────────┘');

    // Math
    const stock2 = stock.find(s => s.thickness === '2"');
    const currentStock2 = stock2 ? (stock2.statusNotDried + stock2.statusDried) : 0;
    const expected = totalReceived - totalTransferred;
    const discrepancy = currentStock2 - expected;

    console.log('\n5️⃣  RECONCILIATION:\n');
    console.log('┌──────────────────────────────┬─────────────┐');
    console.log('│ Description                  │ 2" Pieces   │');
    console.log('├──────────────────────────────┼─────────────┤');
    console.log(`│ Total Received (LOTs)        │ ${String(totalReceived).padStart(11)} │`);
    console.log(`│ Total Transferred (OUT)      │ ${String(totalTransferred).padStart(11)} │`);
    console.log('├──────────────────────────────┼─────────────┤');
    console.log(`│ EXPECTED Stock (A - B)       │ ${String(expected).padStart(11)} │`);
    console.log(`│ ACTUAL Stock (Current)       │ ${String(currentStock2).padStart(11)} │`);
    console.log('├──────────────────────────────┼─────────────┤');
    console.log(`│ DISCREPANCY (Actual-Expected)│ ${String(discrepancy).padStart(11)} │`);
    console.log('└──────────────────────────────┴─────────────┘');

    // Double transfer check
    console.log('\n6️⃣  TRANSFER COMPLETION CHECK:\n');
    const transferWithHistory = await prisma.transfer.findFirst({
      where: { transferNumber: 'UD-TRF-00016' },
      include: { items: true }
    });

    if (transferWithHistory) {
      console.log('┌──────────────────┬────────────────────────────┐');
      console.log('│ UD-TRF-00016     │ Details                    │');
      console.log('├──────────────────┼────────────────────────────┤');
      console.log(`│ Status           │ ${transferWithHistory.status.padEnd(26)} │`);
      console.log(`│ Pieces           │ ${String(transferWithHistory.items[0]?.quantity || 0).padEnd(26)} │`);
      const completedStr = transferWithHistory.completedAt.toISOString().substring(0, 26);
      console.log(`│ Completed At     │ ${completedStr} │`);
      console.log('└──────────────────┴────────────────────────────┘');
      console.log('\n⚠️  This transfer was completed TWICE (2 seconds apart)');
      console.log('   First: ' + transferWithHistory.completedAt.toISOString());
      console.log('   Impact: Deducted 99 pieces twice from stock');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 ANALYSIS:\n');
    console.log(`   If transfer UD-TRF-00016 was NOT double-counted:`);
    console.log(`   Expected = ${totalReceived} - (${totalTransferred} - 99) = ${totalReceived - (totalTransferred - 99)} pieces`);
    console.log(`   Actual = ${currentStock2} pieces`);
    console.log(`   Adjusted discrepancy = ${currentStock2 - (totalReceived - (totalTransferred - 99))} pieces`);

    console.log('\n' + '='.repeat(80));

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

showCurrentState().catch(console.error);
