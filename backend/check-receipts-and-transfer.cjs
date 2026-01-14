const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReceiptsAndTransfer() {
  console.log('\n=== CHECKING OLD RECEIPTS (Before Oct 31, 2025) ===\n');
  
  // Find all receipts with receipt date before October 31, 2025
  const oldReceipts = await prisma.woodReceipt.findMany({
    where: {
      OR: [
        {
          receiptDate: {
            lt: new Date('2025-10-31')
          }
        },
        {
          receiptConfirmedAt: {
            lt: new Date('2025-10-31')
          }
        }
      ]
    },
    include: {
      woodType: true,
      warehouse: true,
      measurements: true
    },
    orderBy: {
      receiptDate: 'asc'
    }
  });

  console.log('Found ' + oldReceipts.length + ' receipts before Oct 31, 2025:\n');
  
  for (const receipt of oldReceipts) {
    console.log('LOT: ' + receipt.lotNumber);
    console.log('  Receipt Date: ' + receipt.receiptDate);
    console.log('  Confirmed At: ' + (receipt.receiptConfirmedAt || 'Not confirmed'));
    
    // Check if woodType exists
    if (receipt.woodType) {
      console.log('  Wood Type: ' + receipt.woodType.name);
    } else {
      console.log('  Wood Type: [NOT LOADED - woodTypeId: ' + receipt.woodTypeId + ']');
    }
    
    console.log('  Supplier: ' + receipt.supplier);
    console.log('  Status: ' + receipt.status);
    console.log('  Pieces: ' + (receipt.actualPieces || receipt.estimatedPieces || 'N/A'));
    console.log('  Volume: ' + (receipt.actualVolumeM3 || receipt.estimatedVolumeM3 || 'N/A') + ' m3');
    console.log('');
  }

  // Check specifically for Mninga receipts
  const mningaReceipts = oldReceipts.filter(receipt => {
    if (!receipt.woodType) return false;
    return receipt.woodType.name.toLowerCase().includes('mninga');
  });

  if (mningaReceipts.length > 0) {
    console.log('\n*** IMPORTANT: Found ' + mningaReceipts.length + ' Mninga receipt(s) before Oct 31, 2025:');
    for (const receipt of mningaReceipts) {
      console.log('  - LOT: ' + receipt.lotNumber);
      console.log('    Receipt Date: ' + receipt.receiptDate);
      console.log('    Confirmed: ' + (receipt.receiptConfirmedAt || 'Not confirmed'));
      console.log('    Pieces: ' + (receipt.actualPieces || receipt.estimatedPieces || 'N/A'));
      console.log('    Volume: ' + (receipt.actualVolumeM3 || receipt.estimatedVolumeM3 || 'N/A') + ' m3');
    }
  } else {
    console.log('\nNo Mninga receipts found before Oct 31, 2025');
  }

  // Now check when the first transfer went out
  console.log('\n\n=== CHECKING FIRST TRANSFER ===\n');
  
  const firstTransfer = await prisma.transfer.findFirst({
    orderBy: {
      transferDate: 'asc'
    },
    include: {
      items: {
        include: {
          woodType: true
        }
      }
    }
  });

  if (firstTransfer) {
    console.log('First Transfer: ' + firstTransfer.transferNumber);
    console.log('Transfer Date: ' + firstTransfer.transferDate);
    console.log('Status: ' + firstTransfer.status);
    console.log('Items:');
    for (const item of firstTransfer.items) {
      console.log('  - ' + item.woodType.name + ' (' + item.thickness + '): ' + item.quantity + ' pieces');
    }
    console.log('');
  }

  console.log('\n\n=== CHECKING TRANSFER UD-TRF-00016 ===\n');
  
  const transfer = await prisma.transfer.findUnique({
    where: {
      transferNumber: 'UD-TRF-00016'
    },
    include: {
      items: {
        include: {
          woodType: true
        }
      },
      fromWarehouse: true,
      toWarehouse: true
    }
  });

  if (!transfer) {
    console.log('Transfer UD-TRF-00016 not found!');
  } else {
    console.log('Transfer: ' + transfer.transferNumber);
    console.log('Date: ' + transfer.transferDate);
    console.log('From: ' + transfer.fromWarehouse.name + ' -> To: ' + transfer.toWarehouse.name);
    console.log('Status: ' + transfer.status);
    if (transfer.notes) console.log('Notes: ' + transfer.notes);
    console.log('\nTransfer Items (' + transfer.items.length + ' total):\n');

    // Group by wood type to see all types clearly
    const woodTypes = {};
    for (const item of transfer.items) {
      const woodName = item.woodType.name;
      if (!woodTypes[woodName]) {
        woodTypes[woodName] = {
          items: []
        };
      }
      woodTypes[woodName].items.push(item);
    }

    const numWoodTypes = Object.keys(woodTypes).length;
    console.log('Number of different wood TYPES: ' + numWoodTypes + '\n');

    for (const woodName of Object.keys(woodTypes)) {
      const data = woodTypes[woodName];
      console.log('\n' + woodName + ':');
      console.log('  Total line items: ' + data.items.length);
      let totalQty = 0;
      for (const item of data.items) {
        console.log('    - Thickness: ' + item.thickness);
        console.log('      Quantity: ' + item.quantity + ' pieces');
        console.log('      Wood Status: ' + item.woodStatus);
        if (item.remarks) console.log('      Remarks: ' + item.remarks);
        console.log('');
        totalQty += item.quantity;
      }
      console.log('  TOTAL for ' + woodName + ': ' + totalQty + ' pieces\n');
    }

    console.log('\n=== SUMMARY ===');
    console.log('Transfer UD-TRF-00016 contains ' + numWoodTypes + ' different wood type(s):');
    for (const woodName of Object.keys(woodTypes)) {
      const data = woodTypes[woodName];
      const totalQty = data.items.reduce((sum, item) => sum + item.quantity, 0);
      console.log('  - ' + woodName + ': ' + data.items.length + ' line items, ' + totalQty + ' total pieces');
    }
  }
  
  await prisma.$disconnect();
}

checkReceiptsAndTransfer()
  .catch(console.error);
