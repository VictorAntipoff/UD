const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lot = await prisma.lot.findFirst({
    where: { lotNumber: 'LOT-2026-001' },
    include: { measurements: true, warehouse: true }
  });
  
  console.log('\nLOT-2026-001:');
  console.log('Status:', lot.status);
  console.log('Completed:', lot.completedAt);
  console.log('Measurements:', lot.measurements.length);
  
  const by2inch = lot.measurements.filter(m => m.thickness === '2"' || m.thickness === '2');
  const total2 = by2inch.reduce((sum, m) => sum + (m.numberOfPieces || 0), 0);
  console.log('2" pieces measured:', total2);
  
  const stock = await prisma.stock.findUnique({
    where: {
      warehouseId_woodTypeId_thickness: {
        warehouseId: '86c38abc-bb70-42c3-ae8b-181dc4623376',
        woodTypeId: '4d79f4da-bbce-43e0-af68-c28c1cd67c5a',
        thickness: '2"'
      }
    }
  });
  
  console.log('\nCurrent 2" Stock:');
  console.log('NOT DRIED:', stock.statusNotDried);
  console.log('DRIED:', stock.statusDried);
  console.log('TOTAL:', stock.statusNotDried + stock.statusDried);
  
  await prisma.$disconnect();
}

main();
