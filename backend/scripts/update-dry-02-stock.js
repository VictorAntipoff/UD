import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating DRY-02 to enable stock tracking...\n');

  // Get the DRY-02 process
  const process = await prisma.dryingProcess.findFirst({
    where: { batchNumber: 'UD-DRY-00002' },
    include: { woodType: true }
  });

  if (!process) {
    console.log('❌ DRY-02 process not found');
    return;
  }

  console.log('Current state:');
  console.log(`- Batch: ${process.batchNumber}`);
  console.log(`- Wood: ${process.woodType.name}`);
  console.log(`- Thickness: ${process.thickness}mm`);
  console.log(`- Pieces: ${process.pieceCount}`);
  console.log(`- Status: ${process.status}`);
  console.log(`- useStock: ${process.useStock}`);
  console.log(`- sourceWarehouseId: ${process.sourceWarehouseId}`);
  console.log(`- stockThickness: ${process.stockThickness}\n`);

  // Find the P01T warehouse stock for Mninga 2"
  const stock = await prisma.stock.findFirst({
    where: {
      warehouse: {
        code: 'P01T'
      },
      woodType: {
        name: 'Mninga'
      },
      thickness: '2"'
    },
    include: {
      warehouse: true,
      woodType: true
    }
  });

  if (!stock) {
    console.log('❌ Stock not found for Mninga 2" in Main Warehouse');
    return;
  }

  console.log('Target stock:');
  console.log(`- Warehouse: ${stock.warehouse.name} (${stock.warehouse.code})`);
  console.log(`- Wood: ${stock.woodType.name}`);
  console.log(`- Thickness: ${stock.thickness}`);
  console.log(`- Not Dried: ${stock.statusNotDried}`);
  console.log(`- Under Drying: ${stock.statusUnderDrying}`);
  console.log(`- Dried: ${stock.statusDried}\n`);

  // Update the process and stock in a transaction
  await prisma.$transaction(async (tx) => {
    // Update the drying process
    await tx.dryingProcess.update({
      where: { id: process.id },
      data: {
        useStock: true,
        sourceWarehouseId: stock.warehouseId,
        stockThickness: stock.thickness
      }
    });

    // Update the stock - move pieces from Not Dried to Under Drying
    await tx.stock.update({
      where: { id: stock.id },
      data: {
        statusNotDried: { decrement: process.pieceCount },
        statusUnderDrying: { increment: process.pieceCount }
      }
    });
  });

  // Fetch updated data
  const updatedStock = await prisma.stock.findUnique({
    where: { id: stock.id }
  });

  console.log('✅ Update completed!\n');
  console.log('Updated stock levels:');
  console.log(`- Not Dried: ${stock.statusNotDried} → ${updatedStock.statusNotDried}`);
  console.log(`- Under Drying: ${stock.statusUnderDrying} → ${updatedStock.statusUnderDrying}`);
  console.log(`- Dried: ${stock.statusDried} → ${updatedStock.statusDried}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
