const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeline() {
  console.log('\n⏰ DETAILED TIMELINE ANALYSIS\n');
  console.log('='.repeat(100));

  const tegataId = '86c38abc-bb70-42c3-ae8b-181dc4623376';
  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    // Get LOTs
    const allLots = await prisma.lot.findMany({
      where: {
        warehouseId: tegataId,
        status: 'COMPLETED',
        measurements: { some: { woodTypeId: mningaId, thickness: { in: ['2"', '2'] } } }
      },
      include: { measurements: { where: { woodTypeId: mningaId, thickness: { in: ['2"', '2'] } } } },
      orderBy: { completedAt: 'asc' }
    });

    // Get Transfers
    const transfers = await prisma.transfer.findMany({
      where: {
        fromWarehouseId: tegataId,
        status: 'COMPLETED',
        items: { some: { woodTypeId: mningaId, thickness: '2"' } }
      },
      include: { items: { where: { woodTypeId: mningaId, thickness: '2"' } }, toWarehouse: true },
      orderBy: { completedAt: 'asc' }
    });

    // Combine and sort by date
    const events = [];

    for (const lot of allLots) {
      const pieces = lot.measurements.reduce((s, m) => s + (m.numberOfPieces || 0), 0);
      events.push({
        date: lot.completedAt,
        type: 'RECEIPT',
        ref: lot.lotNumber,
        pieces: pieces,
        running: 0
      });
    }

    for (const transfer of transfers) {
      const pieces = transfer.items.reduce((s, i) => s + i.quantity, 0);
      events.push({
        date: transfer.completedAt,
        type: 'TRANSFER',
        ref: transfer.transferNumber,
        pieces: pieces,
        dest: transfer.toWarehouse.name,
        running: 0
      });
    }

    events.sort((a, b) => a.date - b.date);

    // Calculate running balance
    let runningStock = 0;
    console.log('\n📅 CHRONOLOGICAL ORDER:\n');
    console.log('┌────────────┬──────────┬────────────────┬──────────┬──────────────────┬──────────────┐');
    console.log('│ Date       │ Type     │ Reference      │ Pieces   │ Destination      │ Stock Balance│');
    console.log('├────────────┼──────────┼────────────────┼──────────┼──────────────────┼──────────────┤');

    for (const event of events) {
      const dateStr = event.date.toISOString().split('T')[0];
      const typeStr = event.type.padEnd(8);
      const refStr = event.ref.padEnd(14);
      const piecesStr = event.type === 'RECEIPT' ? '+' + event.pieces : '-' + event.pieces;
      const destStr = event.dest ? event.dest.substring(0, 16).padEnd(16) : ''.padEnd(16);

      if (event.type === 'RECEIPT') {
        runningStock += event.pieces;
      } else {
        runningStock -= event.pieces;
      }

      const balanceStr = String(runningStock).padStart(12);
      const balanceDisplay = runningStock < 0 ? balanceStr + ' ⚠️' : balanceStr;

      console.log('│ ' + dateStr + ' │ ' + typeStr + ' │ ' + refStr + ' │ ' + piecesStr.padStart(8) + ' │ ' + destStr + ' │ ' + balanceDisplay + ' │');
    }

    console.log('└────────────┴──────────┴────────────────┴──────────┴──────────────────┴──────────────┘');

    // Current stock
    const stock2 = await prisma.stock.findUnique({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: tegataId,
          woodTypeId: mningaId,
          thickness: '2"'
        }
      }
    });

    const currentStock = stock2 ? (stock2.statusNotDried + stock2.statusDried) : 0;

    console.log('\n📊 SUMMARY:\n');
    console.log('┌────────────────────────────────┬──────────┐');
    console.log('│ Description                    │ Pieces   │');
    console.log('├────────────────────────────────┼──────────┤');
    console.log('│ Expected Balance (calculated)  │ ' + String(runningStock).padStart(8) + ' │');
    console.log('│ Actual Stock (in database)     │ ' + String(currentStock).padStart(8) + ' │');
    console.log('├────────────────────────────────┼──────────┤');
    console.log('│ Discrepancy                    │ ' + String(currentStock - runningStock).padStart(8) + ' │');
    console.log('└────────────────────────────────┴──────────┘');

    console.log('\n🔍 ANALYSIS:\n');

    if (runningStock < 0) {
      console.log('   ⚠️  Expected balance is NEGATIVE (' + runningStock + ')');
      console.log('   This means transfers happened BEFORE enough receipts came in.');
    }

    if (currentStock !== runningStock) {
      console.log('\n   ❌ Stock mismatch: ' + (currentStock - runningStock) + ' pieces difference');
      console.log('   Possible causes:');
      console.log('   1. Double-completion of transfer (UD-TRF-00016 completed twice)');
      console.log('   2. Stock sync issues when completing receipts');
      console.log('   3. Manual stock adjustments');
      console.log('   4. Transfer deductions not properly recorded');
    } else {
      console.log('   ✅ Stock matches expected balance');
    }

    console.log('\n' + '='.repeat(100));

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

checkTimeline().catch(console.error);
