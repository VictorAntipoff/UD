import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Investigating LOT-2026-001 Stock Integration\n');
  console.log('='.repeat(80));

  const tegataId = '86c38abc-bb70-42c3-ae8b-181dc4623376';
  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  // Get LOT-2026-001
  const lot = await prisma.lot.findFirst({
    where: { lotNumber: 'LOT-2026-001' },
    include: {
      measurements: {
        where: { woodTypeId: mningaId }
      },
      warehouse: true
    }
  });

  if (!lot) {
    console.log('❌ LOT-2026-001 not found');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📦 LOT-2026-001 DETAILS:\n');
  console.log(`   Lot Number: ${lot.lotNumber}`);
  console.log(`   Status: ${lot.status}`);
  console.log(`   Warehouse: ${lot.warehouse.name} (ID: ${lot.warehouseId})`);
  console.log(`   Created: ${lot.createdAt.toISOString()}`);
  console.log(`   Completed: ${lot.completedAt ? lot.completedAt.toISOString() : 'NOT COMPLETED'}`);
  console.log(`   Total Measurements: ${lot.measurements.length}`);

  // Group measurements by thickness
  const byThickness = {};
  for (const m of lot.measurements) {
    const thickness = m.thickness;
    if (!byThickness[thickness]) {
      byThickness[thickness] = { count: 0, pieces: 0, volume: 0 };
    }
    byThickness[thickness].count++;
    byThickness[thickness].pieces += m.numberOfPieces || 0;
    byThickness[thickness].volume += m.volume || 0;
  }

  console.log('\n📏 MEASUREMENTS BY THICKNESS:\n');
  for (const [thickness, data] of Object.entries(byThickness)) {
    console.log(`   ${thickness}:`);
    console.log(`      - ${data.count} measurements`);
    console.log(`      - ${data.pieces} total pieces`);
    console.log(`      - ${data.volume.toFixed(4)} m³`);
  }

  const pieces2inch = byThickness['2"']?.pieces || 0;
  const pieces1inch = byThickness['1"']?.pieces || 0;

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 KEY QUESTION: Were these pieces added to stock?\n');
  console.log(`   LOT-2026-001 has ${pieces2inch} pieces of 2" Mninga`);
  console.log(`   LOT-2026-001 has ${pieces1inch} pieces of 1" Mninga`);

  // Get current stock
  const currentStock = await prisma.stock.findMany({
    where: {
      warehouseId: tegataId,
      woodTypeId: mningaId
    },
    orderBy: { thickness: 'asc' }
  });

  console.log('\n📊 CURRENT STOCK IN P01 - TEGETA:\n');
  for (const s of currentStock) {
    const total = s.statusNotDried + s.statusUnderDrying + s.statusDried + s.statusDamaged;
    console.log(`   ${s.thickness} Mninga: ${total} pieces`);
    console.log(`      (${s.statusNotDried} NOT DRIED + ${s.statusDried} DRIED)`);
  }

  // Get stock BEFORE LOT-2026-001 was completed
  console.log('\n' + '='.repeat(80));
  console.log('\n📅 TIMELINE ANALYSIS:\n');

  // Get all completed LOTs
  const allLots = await prisma.lot.findMany({
    where: {
      warehouseId: tegataId,
      status: 'COMPLETED',
      measurements: {
        some: {
          woodTypeId: mningaId,
          thickness: { in: ['2"', '2'] }
        }
      }
    },
    include: {
      measurements: {
        where: {
          woodTypeId: mningaId,
          thickness: { in: ['2"', '2'] }
        }
      }
    },
    orderBy: { completedAt: 'asc' }
  });

  console.log('All Completed LOTs with 2" Mninga:');
  let runningTotal = 0;
  for (const l of allLots) {
    const lotPieces = l.measurements.reduce((sum, m) => sum + (m.numberOfPieces || 0), 0);
    runningTotal += lotPieces;
    const isTarget = l.lotNumber === 'LOT-2026-001';
    console.log(`   ${isTarget ? '👉 ' : '   '}${l.lotNumber}: ${lotPieces} pieces (completed ${l.completedAt.toISOString().split('T')[0]}) - Running total: ${runningTotal}`);
  }

  // Get stock history - check if there are any stock change logs
  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 CHECKING STOCK UPDATE MECHANISM:\n');

  // Check if stock was updated when LOT was completed
  const stock2Before = await prisma.stock.findUnique({
    where: {
      warehouseId_woodTypeId_thickness: {
        warehouseId: tegataId,
        woodTypeId: mningaId,
        thickness: '2"'
      }
    }
  });

  const stock2Total = stock2Before ? (stock2Before.statusNotDried + stock2Before.statusDried) : 0;

  console.log('Current 2" stock total: ' + stock2Total + ' pieces');
  console.log('Expected from all LOTs: ' + runningTotal + ' pieces (before transfers)');

  // Get all transfers
  const transfers = await prisma.transfer.findMany({
    where: {
      fromWarehouseId: tegataId,
      status: 'COMPLETED',
      items: {
        some: {
          woodTypeId: mningaId,
          thickness: '2"'
        }
      }
    },
    include: {
      items: {
        where: {
          woodTypeId: mningaId,
          thickness: '2"'
        }
      }
    },
    orderBy: { completedAt: 'asc' }
  });

  const totalTransferred = transfers.reduce((sum, t) =>
    sum + t.items.reduce((s, i) => s + i.quantity, 0), 0
  );

  console.log('Total transferred out: ' + totalTransferred + ' pieces');
  console.log('\nExpected current stock: ' + (runningTotal - totalTransferred) + ' pieces');
  console.log('Actual current stock: ' + stock2Total + ' pieces');
  console.log('Discrepancy: ' + (stock2Total - (runningTotal - totalTransferred)) + ' pieces');

  // Check the specific LOT-2026-001 impact
  console.log('\n' + '='.repeat(80));
  console.log('\n🧮 LOT-2026-001 SPECIFIC ANALYSIS:\n');

  // Find stock level at the time LOT-2026-001 was completed
  const lotsBeforeLot2026 = allLots.filter(l =>
    l.completedAt < lot.completedAt && l.lotNumber !== 'LOT-2026-001'
  );
  const piecesBeforeLot2026 = lotsBeforeLot2026.reduce((sum, l) =>
    sum + l.measurements.reduce((s, m) => s + (m.numberOfPieces || 0), 0), 0
  );

  console.log(`Stock from LOTs BEFORE LOT-2026-001: ${piecesBeforeLot2026} pieces`);
  console.log(`LOT-2026-001 should ADD: ${pieces2inch} pieces`);
  console.log(`Expected after LOT-2026-001: ${piecesBeforeLot2026 + pieces2inch} pieces`);
  console.log(`\nBut current stock (after transfers): ${stock2Total} pieces`);

  // Check if the receipt completion actually updated stock
  console.log('\n' + '='.repeat(80));
  console.log('\n❓ DID LOT-2026-001 UPDATE STOCK?\n');

  // The only way to know is to check if stock increased by the right amount
  // We need to see if (current stock + transfers out) >= expected receipts

  const stockAfterAddingBackTransfers = stock2Total + totalTransferred;
  console.log('Current stock + transfers out = ' + stockAfterAddingBackTransfers + ' pieces');
  console.log('Total from all receipts = ' + runningTotal + ' pieces');
  console.log('Difference = ' + (stockAfterAddingBackTransfers - runningTotal) + ' pieces');

  if (Math.abs(stockAfterAddingBackTransfers - runningTotal) < 5) {
    console.log('\n✅ STOCK APPEARS TO INCLUDE LOT-2026-001');
  } else {
    console.log('\n❌ STOCK MISMATCH - LOT-2026-001 MAY NOT BE PROPERLY RECORDED');
    console.log('\nPossible reasons:');
    console.log('   1. LOT-2026-001 was not synced to stock when completed');
    console.log('   2. Some transfers were not properly deducted from stock');
    console.log('   3. Manual stock adjustments were made');
  }

  // Check 1" stock too
  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 CHECKING 1" MNINGA FROM LOT-2026-001:\n');

  const stock1 = await prisma.stock.findUnique({
    where: {
      warehouseId_woodTypeId_thickness: {
        warehouseId: tegataId,
        woodTypeId: mningaId,
        thickness: '1"'
      }
    }
  });

  console.log(`LOT-2026-001 measured: ${pieces1inch} pieces of 1"`);
  console.log(`Current 1" stock: ${stock1 ? (stock1.statusNotDried + stock1.statusDried) : 0} pieces`);

  if (stock1) {
    console.log(`   (${stock1.statusNotDried} NOT DRIED + ${stock1.statusDried} DRIED)`);
  }

  console.log('\n' + '='.repeat(80));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
