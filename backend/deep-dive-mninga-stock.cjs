const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MNINGA_WOOD_TYPE_ID = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';
const TEGETA_WAREHOUSE_ID = '86c38abc-bb70-42c3-ae8b-181dc4623376';

async function main() {
  console.log('='.repeat(80));
  console.log('DEEP DIVE: MNINGA STOCK INVESTIGATION');
  console.log('='.repeat(80));
  console.log();

  // Check ALL receipts (not just COMPLETED/CONFIRMED)
  console.log('1. ALL RECEIPTS AT P01 - TEGETA WITH MNINGA (ANY STATUS):');
  console.log('-'.repeat(80));
  
  const allReceipts = await prisma.woodReceipt.findMany({
    where: {
      warehouseId: TEGETA_WAREHOUSE_ID,
      woodTypeId: MNINGA_WOOD_TYPE_ID
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

  console.log('Found ' + allReceipts.length + ' total receipts (all statuses):');
  console.log();
  
  allReceipts.forEach(receipt => {
    const dateStr = receipt.receiptDate.toISOString().split('T')[0];
    console.log(receipt.lotNumber + ' - Status: ' + receipt.status + ' - Date: ' + dateStr);
    
    let receipt1inch = 0;
    let receipt2inch = 0;
    
    receipt.measurements.forEach(m => {
      if (m.thickness === 1) receipt1inch += m.qty;
      if (m.thickness === 2) receipt2inch += m.qty;
    });
    
    console.log('  1" Mninga: ' + receipt1inch + ' pieces');
    console.log('  2" Mninga: ' + receipt2inch + ' pieces');
    console.log();
  });
  
  console.log('='.repeat(80));
  console.log();

  // Check if there are transfers with different statuses
  console.log('2. ALL TRANSFERS FROM P01 - TEGETA WITH MNINGA (ANY STATUS):');
  console.log('-'.repeat(80));
  
  const allTransfers = await prisma.transfer.findMany({
    where: {
      fromWarehouseId: TEGETA_WAREHOUSE_ID,
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

  console.log('Found ' + allTransfers.length + ' total transfers (all statuses):');
  console.log();
  
  allTransfers.forEach(transfer => {
    const dateStr = transfer.transferDate.toISOString().split('T')[0];
    console.log(transfer.transferNumber + ' - Status: ' + transfer.status + ' - Date: ' + dateStr);
    console.log('  From: ' + transfer.fromWarehouse.name + ' -> To: ' + transfer.toWarehouse.name);
    
    let transfer1inch = 0;
    let transfer2inch = 0;
    
    transfer.items.forEach(item => {
      if (item.thickness === '1"') transfer1inch += item.quantity;
      if (item.thickness === '2"') transfer2inch += item.quantity;
    });
    
    console.log('  1" Mninga: ' + transfer1inch + ' pieces');
    console.log('  2" Mninga: ' + transfer2inch + ' pieces');
    console.log();
  });
  
  console.log('='.repeat(80));
  console.log();

  // Check stock adjustments
  console.log('3. STOCK ADJUSTMENTS FOR MNINGA AT P01 - TEGETA:');
  console.log('-'.repeat(80));
  
  const adjustments = await prisma.stockAdjustment.findMany({
    where: {
      warehouseId: TEGETA_WAREHOUSE_ID,
      woodTypeId: MNINGA_WOOD_TYPE_ID
    },
    include: {
      woodType: true,
      warehouse: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log('Found ' + adjustments.length + ' stock adjustments:');
  console.log();
  
  if (adjustments.length > 0) {
    adjustments.forEach(adj => {
      const dateStr = adj.createdAt.toISOString().split('T')[0];
      console.log('Date: ' + dateStr);
      console.log('  Thickness: ' + adj.thickness);
      console.log('  Wood Status: ' + adj.woodStatus);
      console.log('  Quantity Before: ' + adj.quantityBefore);
      console.log('  Quantity After: ' + adj.quantityAfter);
      console.log('  Quantity Change: ' + adj.quantityChange);
      console.log('  Reason: ' + adj.reason);
      if (adj.notes) console.log('  Notes: ' + adj.notes);
      console.log();
    });
  } else {
    console.log('No stock adjustments found.');
    console.log();
  }
  
  console.log('='.repeat(80));
  console.log();

  // Check if there are receipts at OTHER warehouses with Mninga
  console.log('4. MNINGA RECEIPTS AT OTHER WAREHOUSES:');
  console.log('-'.repeat(80));
  
  const otherReceipts = await prisma.woodReceipt.findMany({
    where: {
      warehouseId: {
        not: TEGETA_WAREHOUSE_ID
      },
      woodTypeId: MNINGA_WOOD_TYPE_ID
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

  console.log('Found ' + otherReceipts.length + ' receipts at other warehouses:');
  console.log();
  
  if (otherReceipts.length > 0) {
    otherReceipts.forEach(receipt => {
      const dateStr = receipt.receiptDate.toISOString().split('T')[0];
      console.log(receipt.lotNumber + ' - Warehouse: ' + receipt.warehouse.name + ' - Status: ' + receipt.status + ' - Date: ' + dateStr);
      
      let receipt1inch = 0;
      let receipt2inch = 0;
      
      receipt.measurements.forEach(m => {
        if (m.thickness === 1) receipt1inch += m.qty;
        if (m.thickness === 2) receipt2inch += m.qty;
      });
      
      console.log('  1" Mninga: ' + receipt1inch + ' pieces');
      console.log('  2" Mninga: ' + receipt2inch + ' pieces');
      console.log();
    });
  } else {
    console.log('No receipts at other warehouses.');
    console.log();
  }
  
  console.log('='.repeat(80));
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
