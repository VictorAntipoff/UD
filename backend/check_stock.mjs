import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStock() {
  try {
    // Get Teak wood type
    const teak = await prisma.woodType.findFirst({
      where: { name: 'Teak' }
    });
    
    if (!teak) {
      console.log('No Teak wood type found');
      return;
    }
    
    console.log('=== TEAK WOOD TYPE ===');
    console.log('ID:', teak.id);
    console.log('Name:', teak.name);
    console.log('');
    
    // Get all stock records for Teak
    const teakStock = await prisma.stock.findMany({
      where: { woodTypeId: teak.id },
      include: {
        warehouse: true
      }
    });
    
    console.log('=== CURRENT TEAK STOCK RECORDS ===');
    if (teakStock.length === 0) {
      console.log('No stock records found for Teak');
    } else {
      teakStock.forEach((stock, i) => {
        console.log(`\n${i+1}. Stock Record:`);
        console.log('   Warehouse:', stock.warehouse?.name || 'N/A');
        console.log('   Thickness:', stock.thickness);
        console.log('   Not Dried:', stock.statusNotDried);
        console.log('   Under Drying:', stock.statusUnderDrying);
        console.log('   Dried:', stock.statusDried);
        console.log('   Damaged:', stock.statusDamaged);
        console.log('   Total:', stock.statusNotDried + stock.statusUnderDrying + stock.statusDried);
      });
    }
    
    // Get all receipts for Teak
    console.log('\n\n=== ALL TEAK RECEIPTS ===');
    const teakReceipts = await prisma.woodReceipt.findMany({
      where: { woodTypeId: teak.id },
      orderBy: { createdAt: 'desc' }
    });
    
    teakReceipts.forEach((receipt, i) => {
      console.log(`\n${i+1}. ${receipt.lotNumber}`);
      console.log('   Status:', receipt.status);
      console.log('   Pieces:', receipt.actualPieces || 'N/A');
      console.log('   Volume:', receipt.actualVolumeM3 ? `${receipt.actualVolumeM3.toFixed(4)} m³` : 'N/A');
      console.log('   Warehouse:', receipt.warehouseId || 'Not assigned');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStock();
