import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function queryLot() {
  try {
    // Get the receipt
    const receipt = await prisma.woodReceipt.findFirst({
      where: { lotNumber: 'LOT-2025-004' },
      include: {
        woodType: true,
        warehouse: true
      }
    });
    
    console.log('\n=== RECEIPT INFO ===');
    console.log(JSON.stringify(receipt, null, 2));
    
    // Get the draft
    const draft = await prisma.receiptDraft.findFirst({
      where: { receiptId: 'LOT-2025-004' },
      orderBy: { updatedAt: 'desc' }
    });
    
    console.log('\n=== DRAFT INFO (measurements) ===');
    if (draft) {
      console.log('measurementUnit:', draft.measurementUnit);
      console.log('measurements:', JSON.stringify(draft.measurements, null, 2));
    }
    
    // Get current stock for this warehouse and wood type (if any)
    if (receipt && receipt.warehouseId && receipt.woodTypeId) {
      const stock = await prisma.stock.findMany({
        where: {
          warehouseId: receipt.warehouseId,
          woodTypeId: receipt.woodTypeId
        }
      });
      
      console.log('\n=== CURRENT STOCK (before confirmation) ===');
      console.log(JSON.stringify(stock, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryLot();
