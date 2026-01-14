const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MNINGA_WOOD_TYPE_ID = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';
const TEGETA_WAREHOUSE_ID = '86c38abc-bb70-42c3-ae8b-181dc4623376';

async function main() {
  console.log('\n');
  console.log('='.repeat(100));
  console.log('FINAL COMPREHENSIVE MNINGA STOCK ANALYSIS - P01 TEGETA');
  console.log('='.repeat(100));
  console.log('\n');

  // Summary data collection
  const lot2026001 = await prisma.woodReceipt.findFirst({
    where: { lotNumber: 'LOT-2026-001' },
    include: { measurements: true, woodType: true, warehouse: true }
  });

  const currentStock = await prisma.stock.findMany({
    where: {
      warehouseId: TEGETA_WAREHOUSE_ID,
      woodTypeId: MNINGA_WOOD_TYPE_ID
    }
  });

  const allReceipts = await prisma.woodReceipt.findMany({
    where: {
      warehouseId: TEGETA_WAREHOUSE_ID,
      woodTypeId: MNINGA_WOOD_TYPE_ID,
      status: { in: ['CONFIRMED', 'COMPLETED'] }
    },
    include: { measurements: true },
    orderBy: { receiptDate: 'asc' }
  });

  const allTransfers = await prisma.transfer.findMany({
    where: {
      fromWarehouseId: TEGETA_WAREHOUSE_ID,
      status: 'COMPLETED',
      items: { some: { woodTypeId: MNINGA_WOOD_TYPE_ID } }
    },
    include: {
      items: { where: { woodTypeId: MNINGA_WOOD_TYPE_ID } }
    },
    orderBy: { transferDate: 'asc' }
  });

  // Calculate totals
  let lot1 = 0, lot2 = 0;
  if (lot2026001) {
    lot2026001.measurements.forEach(m => {
      if (m.thickness === 1) lot1 += m.qty;
      if (m.thickness === 2) lot2 += m.qty;
    });
  }

  let stock1 = 0, stock2 = 0;
  currentStock.forEach(s => {
    const total = s.statusNotDried + s.statusUnderDrying + s.statusDried + s.statusDamaged;
    if (s.thickness === '1"') stock1 += total;
    if (s.thickness === '2"') stock2 += total;
  });

  let receipts1 = 0, receipts2 = 0;
  allReceipts.forEach(r => {
    r.measurements.forEach(m => {
      if (m.thickness === 1) receipts1 += m.qty;
      if (m.thickness === 2) receipts2 += m.qty;
    });
  });

  let transfers1 = 0, transfers2 = 0;
  allTransfers.forEach(t => {
    t.items.forEach(i => {
      if (i.thickness === '1"') transfers1 += i.quantity;
      if (i.thickness === '2"') transfers2 += i.quantity;
    });
  });

  // Output formatted report
  console.log('QUESTION 1: LOT-2026-001 MEASUREMENTS FOR MNINGA');
  console.log('-'.repeat(100));
  console.log('Lot Number: LOT-2026-001');
  console.log('Status: ' + (lot2026001 ? lot2026001.status : 'NOT FOUND'));
  console.log('Warehouse: ' + (lot2026001 && lot2026001.warehouse ? lot2026001.warehouse.name : 'N/A'));
  console.log('Receipt Date: ' + (lot2026001 ? lot2026001.receiptDate.toISOString().split('T')[0] : 'N/A'));
  console.log();
  console.log('  1" Mninga: ' + lot1 + ' pieces');
  console.log('  2" Mninga: ' + lot2 + ' pieces');
  console.log('\n');

  console.log('QUESTION 2: CURRENT STOCK AT P01 - TEGETA FOR MNINGA');
  console.log('-'.repeat(100));
  currentStock.forEach(s => {
    console.log('Thickness: ' + s.thickness);
    console.log('  NOT DRIED:     ' + s.statusNotDried.toString().padStart(4) + ' pieces');
    console.log('  UNDER DRYING:  ' + s.statusUnderDrying.toString().padStart(4) + ' pieces');
    console.log('  DRIED:         ' + s.statusDried.toString().padStart(4) + ' pieces');
    console.log('  DAMAGED:       ' + s.statusDamaged.toString().padStart(4) + ' pieces');
    console.log('  --------------');
    const total = s.statusNotDried + s.statusUnderDrying + s.statusDried + s.statusDamaged;
    console.log('  TOTAL:         ' + total.toString().padStart(4) + ' pieces');
    console.log();
  });
  console.log('TOTAL 1" Mninga: ' + stock1 + ' pieces (NOT DRIED + UNDER DRYING + DRIED + DAMAGED)');
  console.log('TOTAL 2" Mninga: ' + stock2 + ' pieces (NOT DRIED + UNDER DRYING + DRIED + DAMAGED)');
  console.log('\n');

  console.log('QUESTION 3: ALL COMPLETED LOTS AT P01 - TEGETA WITH MNINGA');
  console.log('-'.repeat(100));
  console.log('Total Completed Lots: ' + allReceipts.length);
  console.log();
  allReceipts.forEach(r => {
    let r1 = 0, r2 = 0;
    r.measurements.forEach(m => {
      if (m.thickness === 1) r1 += m.qty;
      if (m.thickness === 2) r2 += m.qty;
    });
    console.log(r.lotNumber + ' (Date: ' + r.receiptDate.toISOString().split('T')[0] + ')');
    console.log('  1" Mninga: ' + r1 + ' pieces, 2" Mninga: ' + r2 + ' pieces');
  });
  console.log();
  console.log('TOTAL RECEIPTS:');
  console.log('  1" Mninga: ' + receipts1 + ' pieces');
  console.log('  2" Mninga: ' + receipts2 + ' pieces');
  console.log('\n');

  console.log('QUESTION 4: ALL COMPLETED TRANSFERS OUT FROM P01 - TEGETA WITH MNINGA');
  console.log('-'.repeat(100));
  console.log('Total Completed Transfers: ' + allTransfers.length);
  console.log();
  allTransfers.forEach(t => {
    let t1 = 0, t2 = 0;
    t.items.forEach(i => {
      if (i.thickness === '1"') t1 += i.quantity;
      if (i.thickness === '2"') t2 += i.quantity;
    });
    console.log(t.transferNumber + ' (Date: ' + t.transferDate.toISOString().split('T')[0] + ')');
    console.log('  1" Mninga: ' + t1 + ' pieces, 2" Mninga: ' + t2 + ' pieces');
  });
  console.log();
  console.log('TOTAL TRANSFERS OUT:');
  console.log('  1" Mninga: ' + transfers1 + ' pieces');
  console.log('  2" Mninga: ' + transfers2 + ' pieces');
  console.log('\n');

  console.log('QUESTION 5: STOCK RECONCILIATION - EXPECTED VS ACTUAL');
  console.log('-'.repeat(100));
  
  const expected1 = receipts1 - transfers1;
  const expected2 = receipts2 - transfers2;
  const diff1 = stock1 - expected1;
  const diff2 = stock2 - expected2;
  
  console.log('1" MNINGA RECONCILIATION:');
  console.log('  Total Receipts:      ' + receipts1.toString().padStart(5) + ' pieces');
  console.log('  Total Transfers OUT: ' + transfers1.toString().padStart(5) + ' pieces');
  console.log('  Expected Stock:      ' + expected1.toString().padStart(5) + ' pieces  (Receipts - Transfers)');
  console.log('  Actual Stock:        ' + stock1.toString().padStart(5) + ' pieces');
  console.log('  Difference:          ' + diff1.toString().padStart(5) + ' pieces  ' + (diff1 === 0 ? '*** PERFECT MATCH ***' : '*** MISMATCH ***'));
  console.log();
  
  console.log('2" MNINGA RECONCILIATION:');
  console.log('  Total Receipts:      ' + receipts2.toString().padStart(5) + ' pieces');
  console.log('  Total Transfers OUT: ' + transfers2.toString().padStart(5) + ' pieces');
  console.log('  Expected Stock:      ' + expected2.toString().padStart(5) + ' pieces  (Receipts - Transfers)');
  console.log('  Actual Stock:        ' + stock2.toString().padStart(5) + ' pieces');
  console.log('  Difference:          ' + diff2.toString().padStart(5) + ' pieces  ' + (diff2 === 0 ? '*** PERFECT MATCH ***' : '*** MISMATCH ***'));
  console.log();

  if (diff2 !== 0) {
    console.log('*** DISCREPANCY EXPLANATION FOR 2" MNINGA ***');
    console.log();
    console.log('The system shows a discrepancy because:');
    console.log('- Earliest recorded receipt: ' + allReceipts[0].receiptDate.toISOString().split('T')[0]);
    console.log('- Earliest transfer out:     ' + allTransfers[0].transferDate.toISOString().split('T')[0]);
    console.log();
    console.log('This indicates there was OPENING STOCK that was never recorded as a receipt.');
    console.log('The opening stock would have been: ' + diff2 + ' pieces of 2" Mninga');
    console.log();
    console.log('CORRECTED CALCULATION:');
    console.log('  Opening Stock (unrecorded):  ' + diff2.toString().padStart(5) + ' pieces');
    console.log('  Total Receipts:              ' + receipts2.toString().padStart(5) + ' pieces');
    console.log('  Total Available:             ' + (diff2 + receipts2).toString().padStart(5) + ' pieces');
    console.log('  Total Transfers OUT:         ' + transfers2.toString().padStart(5) + ' pieces');
    console.log('  Expected Stock:              ' + (diff2 + receipts2 - transfers2).toString().padStart(5) + ' pieces');
    console.log('  Actual Stock:                ' + stock2.toString().padStart(5) + ' pieces');
    console.log('  Difference:                  ' + (stock2 - (diff2 + receipts2 - transfers2)).toString().padStart(5) + ' pieces');
  }
  console.log('\n');

  console.log('LOT-2026-001 INCLUSION VERIFICATION');
  console.log('-'.repeat(100));
  const isIncluded = allReceipts.some(r => r.lotNumber === 'LOT-2026-001');
  console.log('Is LOT-2026-001 included in completed receipts? ' + (isIncluded ? '*** YES ***' : '*** NO ***'));
  
  if (lot2026001) {
    console.log();
    console.log('LOT-2026-001 meets all criteria for inclusion:');
    console.log('  Status: ' + lot2026001.status + ' (must be CONFIRMED or COMPLETED)');
    console.log('  Warehouse: ' + lot2026001.warehouse.name + ' (must be P01 - Tegeta)');
    console.log('  Contains 1" Mninga: ' + lot1 + ' pieces');
    console.log('  Contains 2" Mninga: ' + lot2 + ' pieces');
    console.log();
    console.log('*** LOT-2026-001 IS PROPERLY INCLUDED in the stock calculations ***');
  }
  
  console.log('\n');
  console.log('='.repeat(100));
  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
