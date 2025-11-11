import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const receipts = await prisma.woodReceipt.findMany({
    select: {
      lotNumber: true,
      status: true,
      estimatedPieces: true,
      actualPieces: true,
      estimatedVolumeM3: true,
      actualVolumeM3: true
    }
  });

  console.log('All receipts:');
  receipts.forEach(r => {
    console.log(`${r.lotNumber} - ${r.status} - Est: ${r.estimatedPieces} pcs, Actual: ${r.actualPieces} pcs`);
  });

  const activeReceipts = receipts.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
  console.log('\nActive receipts:', activeReceipts.length);

  const totalPieces = activeReceipts.reduce((sum, r) => sum + (r.estimatedPieces || r.actualPieces || 0), 0);
  console.log('Total active pieces:', totalPieces);

  // Check stock table
  const stock = await prisma.stock.findMany({
    select: {
      id: true,
      woodType: { select: { name: true } },
      thickness: true,
      pieceCount: true,
      volumeM3: true
    }
  });

  console.log('\nStock data:');
  stock.forEach(s => {
    console.log(`${s.woodType.name} ${s.thickness} - ${s.pieceCount} pcs, ${s.volumeM3} m3`);
  });

  const totalStockPieces = stock.reduce((sum, s) => sum + s.pieceCount, 0);
  console.log('\nTotal stock pieces:', totalStockPieces);

  await prisma.$disconnect();
}

check();
