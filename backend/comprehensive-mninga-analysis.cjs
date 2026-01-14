const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MNINGA_WOOD_TYPE_ID = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';
const TEGETA_WAREHOUSE_ID = '86c38abc-bb70-42c3-ae8b-181dc4623376'; // P01 - Tegeta (CORRECTED)

async function main() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE MNINGA ANALYSIS AT P01 - TEGETA');
  console.log('='.repeat(80));
  console.log();

  // 1. Query LOT-2026-001 measurements for Mninga
  console.log('1. LOT-2026-001 MEASUREMENTS FOR MNINGA:');
  console.log('-'.repeat(80));
  
  const lot = await prisma.woodReceipt.findFirst({
    where: { lotNumber: 'LOT-2026-001' },
    include: {
      measurements: true,
      woodType: true,
      warehouse: true
    }
  });

  let lot1inch = 0;
  let lot2inch = 0;

  if (lot) {
    console.log('Lot Number: ' + lot.lotNumber);
    console.log('Status: ' + lot.status);
    console.log('Wood Type: ' + lot.woodType.name);
    console.log('Warehouse: ' + (lot.warehouse ? lot.warehouse.name : 'Not assigned'));
    console.log('Receipt Date: ' + lot.receiptDate.toISOString().split('T')[0]);
    console.log();
    
    const measurements1Inch = lot.measurements.filter(m => m.thickness === 1);
    const measurements2Inch = lot.measurements.filter(m => m.thickness === 2);
    
    if (measurements1Inch.length > 0) {
      console.log('1" Mninga measurements:');
      measurements1Inch.forEach(m => {
        console.log('  - ' + m.thickness + '" x ' + m.width + '" x ' + m.length + '": ' + m.qty + ' pieces');
        lot1inch += m.qty;
      });
    }
    
    if (measurements2Inch.length > 0) {
      console.log('2" Mninga measurements:');
      measurements2Inch.forEach(m => {
        console.log('  - ' + m.thickness + '" x ' + m.width + '" x ' + m.length + '": ' + m.qty + ' pieces');
        lot2inch += m.qty;
      });
    }
    
    console.log();
    console.log('>>> TOTAL 1" Mninga: ' + lot1inch + ' pieces <<<');
    console.log('>>> TOTAL 2" Mninga: ' + lot2inch + ' pieces <<<');
  } else {
    console.log('LOT-2026-001 not found!');
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log();

  // 2. Query current stock at P01 - Tegeta for Mninga
  console.log('2. CURRENT STOCK AT P01 - TEGETA FOR MNINGA:');
  console.log('-'.repeat(80));
  
  const stock = await prisma.stock.findMany({
    where: {
      warehouseId: TEGETA_WAREHOUSE_ID,
      woodTypeId: MNINGA_WOOD_TYPE_ID
    },
    include: {
      woodType: true,
      warehouse: true
    }
  });

  let stock1inch = 0;
  let stock2inch = 0;
  
  console.log('Found ' + stock.length + ' stock records for Mninga at P01 - Tegeta:');
  console.log();
  
  stock.forEach(s => {
    const totalPieces = s.statusNotDried + s.statusUnderDrying + s.statusDried + s.statusDamaged;
    const thicknessLabel = s.thickness;
    
    console.log('Thickness: ' + thicknessLabel);
    console.log('  NOT DRIED: ' + s.statusNotDried + ' pieces');
    console.log('  UNDER DRYING: ' + s.statusUnderDrying + ' pieces');
    console.log('  DRIED: ' + s.statusDried + ' pieces');
    console.log('  DAMAGED: ' + s.statusDamaged + ' pieces');
    console.log('  TOTAL: ' + totalPieces + ' pieces');
    console.log();
    
    if (thicknessLabel === '1"') {
      stock1inch += totalPieces;
    } else if (thicknessLabel === '2"') {
      stock2inch += totalPieces;
    }
  });
  
  console.log('>>> TOTAL 1" Mninga Stock: ' + stock1inch + ' pieces <<<');
  console.log('>>> TOTAL 2" Mninga Stock: ' + stock2inch + ' pieces <<<');
  
  console.log();
  console.log('='.repeat(80));
  console.log();

  // 3. Query ALL completed receipts at P01 - Tegeta with Mninga
  console.log('3. ALL COMPLETED RECEIPTS (LOTS) AT P01 - TEGETA WITH MNINGA:');
  console.log('-'.repeat(80));
  
  const completedReceipts = await prisma.woodReceipt.findMany({
    where: {
      warehouseId: TEGETA_WAREHOUSE_ID,
      woodTypeId: MNINGA_WOOD_TYPE_ID,
      status: {
        in: ['CONFIRMED', 'COMPLETED']
      }
    },
    include: {
      measurements: true,
      woodType: true,
      warehouse: true
    },
    orderBy: {
      receiptDate: 'asc'
    }
  });

  let totalReceipts1inch = 0;
  let totalReceipts2inch = 0;
  
  console.log('Found ' + completedReceipts.length + ' completed receipts:');
  console.log();
  
  completedReceipts.forEach(receipt => {
    const dateStr = receipt.receiptDate.toISOString().split('T')[0];
    console.log(receipt.lotNumber + ' (' + receipt.status + ') - Receipt Date: ' + dateStr);
    
    let receipt1inch = 0;
    let receipt2inch = 0;
    
    receipt.measurements.forEach(m => {
      if (m.thickness === 1) {
        receipt1inch += m.qty;
        totalReceipts1inch += m.qty;
      } else if (m.thickness === 2) {
        receipt2inch += m.qty;
        totalReceipts2inch += m.qty;
      }
    });
    
    console.log('  1" Mninga: ' + receipt1inch + ' pieces');
    console.log('  2" Mninga: ' + receipt2inch + ' pieces');
    console.log();
  });
  
  console.log('>>> TOTAL RECEIPTS 1" Mninga: ' + totalReceipts1inch + ' pieces (from ' + completedReceipts.length + ' receipts) <<<');
  console.log('>>> TOTAL RECEIPTS 2" Mninga: ' + totalReceipts2inch + ' pieces (from ' + completedReceipts.length + ' receipts) <<<');
  
  console.log();
  console.log('='.repeat(80));
  console.log();

  // 4. Query ALL completed transfers OUT from P01 - Tegeta with Mninga
  console.log('4. ALL COMPLETED TRANSFERS OUT FROM P01 - TEGETA WITH MNINGA:');
  console.log('-'.repeat(80));
  
  const transfers = await prisma.transfer.findMany({
    where: {
      fromWarehouseId: TEGETA_WAREHOUSE_ID,
      status: 'COMPLETED',
      items: {
        some: {
          woodTypeId: MNINGA_WOOD_TYPE_ID
        }
      }
    },
    include: {
      items: {
        where: {
          woodTypeId: MNINGA_WOOD_TYPE_ID
        },
        include: {
          woodType: true
        }
      },
      fromWarehouse: true,
      toWarehouse: true
    },
    orderBy: {
      transferDate: 'asc'
    }
  });

  let totalTransfers1inch = 0;
  let totalTransfers2inch = 0;
  
  console.log('Found ' + transfers.length + ' completed transfers:');
  console.log();
  
  transfers.forEach(transfer => {
    const dateStr = transfer.transferDate.toISOString().split('T')[0];
    console.log(transfer.transferNumber + ' (' + transfer.status + ') - Transfer Date: ' + dateStr);
    console.log('  From: ' + transfer.fromWarehouse.name + ' -> To: ' + transfer.toWarehouse.name);
    
    let transfer1inch = 0;
    let transfer2inch = 0;
    
    transfer.items.forEach(item => {
      if (item.thickness === '1"') {
        transfer1inch += item.quantity;
        totalTransfers1inch += item.quantity;
      } else if (item.thickness === '2"') {
        transfer2inch += item.quantity;
        totalTransfers2inch += item.quantity;
      }
    });
    
    console.log('  1" Mninga: ' + transfer1inch + ' pieces');
    console.log('  2" Mninga: ' + transfer2inch + ' pieces');
    console.log();
  });
  
  console.log('>>> TOTAL TRANSFERS OUT 1" Mninga: ' + totalTransfers1inch + ' pieces (from ' + transfers.length + ' transfers) <<<');
  console.log('>>> TOTAL TRANSFERS OUT 2" Mninga: ' + totalTransfers2inch + ' pieces (from ' + transfers.length + ' transfers) <<<');
  
  console.log();
  console.log('='.repeat(80));
  console.log();

  // 5. Calculate Expected vs Actual Stock
  console.log('5. STOCK RECONCILIATION:');
  console.log('-'.repeat(80));
  
  const expected1inch = totalReceipts1inch - totalTransfers1inch;
  const expected2inch = totalReceipts2inch - totalTransfers2inch;
  
  console.log();
  console.log('1" MNINGA:');
  console.log('  Total Receipts:        ' + totalReceipts1inch + ' pieces');
  console.log('  Total Transfers OUT:   ' + totalTransfers1inch + ' pieces');
  console.log('  Expected Stock:        ' + expected1inch + ' pieces');
  console.log('  Actual Stock:          ' + stock1inch + ' pieces');
  const diff1 = stock1inch - expected1inch;
  console.log('  Difference:            ' + diff1 + ' pieces ' + (diff1 === 0 ? '*** MATCH ***' : '*** MISMATCH ***'));
  
  console.log();
  console.log('2" MNINGA:');
  console.log('  Total Receipts:        ' + totalReceipts2inch + ' pieces');
  console.log('  Total Transfers OUT:   ' + totalTransfers2inch + ' pieces');
  console.log('  Expected Stock:        ' + expected2inch + ' pieces');
  console.log('  Actual Stock:          ' + stock2inch + ' pieces');
  const diff2 = stock2inch - expected2inch;
  console.log('  Difference:            ' + diff2 + ' pieces ' + (diff2 === 0 ? '*** MATCH ***' : '*** MISMATCH ***'));
  
  console.log();
  console.log('='.repeat(80));
  console.log();

  // 6. Check if LOT-2026-001 is included
  console.log('6. LOT-2026-001 INCLUSION CHECK:');
  console.log('-'.repeat(80));
  
  const isIncluded = completedReceipts.some(r => r.lotNumber === 'LOT-2026-001');
  console.log();
  console.log('Is LOT-2026-001 in completed receipts? ' + (isIncluded ? '*** YES ***' : '*** NO ***'));
  
  if (lot) {
    console.log();
    console.log('LOT-2026-001 Details:');
    console.log('  Status: ' + lot.status);
    console.log('  Warehouse: ' + (lot.warehouse ? lot.warehouse.name : 'Not assigned'));
    console.log('  Warehouse ID: ' + lot.warehouseId);
    console.log('  Expected Warehouse ID (P01 - Tegeta): ' + TEGETA_WAREHOUSE_ID);
    console.log('  Warehouse IDs Match? ' + (lot.warehouseId === TEGETA_WAREHOUSE_ID ? 'YES' : 'NO'));
    console.log();
    
    if (lot.warehouseId === TEGETA_WAREHOUSE_ID && (lot.status === 'CONFIRMED' || lot.status === 'COMPLETED')) {
      console.log('*** LOT-2026-001 SHOULD BE included in stock calculations ***');
      console.log('It has:');
      console.log('  - 1" Mninga: ' + lot1inch + ' pieces');
      console.log('  - 2" Mninga: ' + lot2inch + ' pieces');
    } else {
      console.log('*** LOT-2026-001 is NOT included because: ***');
      if (lot.warehouseId !== TEGETA_WAREHOUSE_ID) {
        console.log('  - Warehouse ID mismatch: ' + lot.warehouseId + ' vs ' + TEGETA_WAREHOUSE_ID);
      }
      if (lot.status !== 'CONFIRMED' && lot.status !== 'COMPLETED') {
        console.log('  - Status is "' + lot.status + '", not CONFIRMED or COMPLETED');
      }
    }
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
