// READ-ONLY inspection of drying process UD-DRY-00039
// No writes. Safe to run on production.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const batchNumber = 'UD-DRY-00039';

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber },
    include: {
      WoodType: true,
      Warehouse: true,
      DryingProcessItem: {
        include: { WoodType: true, Warehouse: true },
      },
      DryingReading: {
        orderBy: { readingTime: 'asc' },
      },
      ElectricityRecharge: true,
    },
  });

  if (!process) {
    console.log(`No drying process found with batchNumber ${batchNumber}`);
    return;
  }

  console.log('=== DRYING PROCESS ===');
  console.log({
    id: process.id,
    batchNumber: process.batchNumber,
    status: process.status,
    startTime: process.startTime,
    endTime: process.endTime,
    totalCost: process.totalCost,
    useStock: process.useStock,
    sourceWarehouseId: process.sourceWarehouseId,
    sourceWarehouseName: (process as any).Warehouse?.name,
    woodTypeId: process.woodTypeId,
    woodTypeName: (process as any).WoodType?.name,
    pieceCount: process.pieceCount,
    thickness: process.thickness,
    thicknessUnit: process.thicknessUnit,
    stockThickness: process.stockThickness,
    createdById: process.createdById,
    createdByName: process.createdByName,
    createdAt: process.createdAt,
    updatedAt: process.updatedAt,
    notes: process.notes,
  });

  const items = (process as any).DryingProcessItem || [];
  console.log(`\n=== ITEMS (${items.length}) ===`);
  for (const item of items) {
    console.log({
      id: item.id,
      woodTypeId: item.woodTypeId,
      woodTypeName: item.WoodType?.name,
      thickness: item.thickness,
      pieceCount: item.pieceCount,
      sourceWarehouseId: item.sourceWarehouseId,
      sourceWarehouseName: item.Warehouse?.name,
    });
  }

  const readings = (process as any).DryingReading || [];
  console.log(`\n=== READINGS (${readings.length}) ===`);
  if (readings.length > 0) {
    const first = readings[0];
    const last = readings[readings.length - 1];
    console.log('First reading:', {
      id: first.id,
      readingTime: first.readingTime,
      humidity: first.humidity,
      electricityMeter: first.electricityMeter,
      createdByName: first.createdByName,
    });
    console.log('Last reading:', {
      id: last.id,
      readingTime: last.readingTime,
      humidity: last.humidity,
      electricityMeter: last.electricityMeter,
      createdByName: last.createdByName,
    });
  }

  // Inspect current stock for the items so we can see whether reversal is safe
  console.log(`\n=== CURRENT STOCK (relevant rows) ===`);
  const stockKeys: { warehouseId: string; woodTypeId: string; thickness: string; pieceCount: number }[] = [];
  if (items.length > 0) {
    for (const item of items) {
      stockKeys.push({
        warehouseId: item.sourceWarehouseId,
        woodTypeId: item.woodTypeId,
        thickness: item.thickness,
        pieceCount: item.pieceCount,
      });
    }
  } else if (process.sourceWarehouseId && process.woodTypeId && process.stockThickness && process.pieceCount) {
    stockKeys.push({
      warehouseId: process.sourceWarehouseId,
      woodTypeId: process.woodTypeId,
      thickness: process.stockThickness,
      pieceCount: process.pieceCount,
    });
  }

  for (const k of stockKeys) {
    const stockRows = await prisma.stock.findMany({
      where: {
        warehouseId: k.warehouseId,
        woodTypeId: k.woodTypeId,
        thickness: k.thickness,
      },
      include: { Warehouse: true, WoodType: true },
    });
    for (const s of stockRows) {
      console.log({
        stockId: s.id,
        warehouse: (s as any).Warehouse?.name,
        woodType: (s as any).WoodType?.name,
        thickness: s.thickness,
        statusNotDried: (s as any).statusNotDried,
        statusUnderDrying: (s as any).statusUnderDrying,
        statusDried: (s as any).statusDried,
        pieceCountInProcess: k.pieceCount,
        wouldReverseTo_underDrying_plus: k.pieceCount,
        wouldReverseTo_dried_minus: k.pieceCount,
        safeToReverse: ((s as any).statusDried ?? 0) >= k.pieceCount,
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
