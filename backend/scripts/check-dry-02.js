import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const process = await prisma.dryingProcess.findFirst({
    where: { batchNumber: 'UD-DRY-00002' },
    include: {
      woodType: true,
      readings: true
    }
  });

  console.log('DRY-02 Process:', JSON.stringify(process, null, 2));

  if (process && process.sourceWarehouseId && process.stockThickness) {
    const stock = await prisma.stock.findFirst({
      where: {
        warehouseId: process.sourceWarehouseId,
        woodTypeId: process.woodTypeId,
        thickness: process.stockThickness
      },
      include: {
        warehouse: true,
        woodType: true
      }
    });
    console.log('\nRelated Stock:', JSON.stringify(stock, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
