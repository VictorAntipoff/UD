// READ-ONLY: trace the stock history of P01 - Tegeta / Teak / 2"
// to figure out what NotDried should actually be.
import { prisma } from '../lib/prisma.js';

const STOCK_ID = '2f21fa14-018a-44dd-878b-eb7189a7858e';

async function main() {
  const stock = await prisma.stock.findUnique({
    where: { id: STOCK_ID },
    include: { Warehouse: true, WoodType: true },
  });
  console.log('=== Current stock ===');
  console.log({
    warehouse: (stock as any)?.Warehouse?.name,
    woodType: (stock as any)?.WoodType?.name,
    thickness: stock?.thickness,
    statusNotDried: (stock as any)?.statusNotDried,
    statusUnderDrying: (stock as any)?.statusUnderDrying,
    statusDried: (stock as any)?.statusDried,
    statusDamaged: (stock as any)?.statusDamaged,
    total:
      ((stock as any)?.statusNotDried ?? 0) +
      ((stock as any)?.statusUnderDrying ?? 0) +
      ((stock as any)?.statusDried ?? 0) +
      ((stock as any)?.statusDamaged ?? 0),
  });

  // Stock movement audit: pull every movement we have on this row
  // (table name might vary; check both common names)
  console.log('\n=== Recent stock movements (any table that exists) ===');
  try {
    const movements = await (prisma as any).stock_movements?.findMany?.({
      where: {
        warehouseId: stock?.warehouseId,
        woodTypeId: stock?.woodTypeId,
        thickness: stock?.thickness,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    if (movements && movements.length > 0) {
      for (const m of movements) {
        console.log(`  ${m.createdAt?.toISOString?.() ?? m.createdAt}  type=${m.type ?? m.movementType}  qty=${m.quantity}  ref=${m.referenceType ?? ''}  notes=${m.notes ?? ''}`);
      }
    } else {
      console.log('  No stock_movements rows found (or table not available).');
    }
  } catch (e) {
    console.log('  stock_movements query failed:', (e as Error).message);
  }

  // List every drying process on this stock row, to compute how many pieces
  // SHOULD legitimately be in UnderDrying right now (only IN_PROGRESS or PENDING_CLOSE)
  console.log('\n=== Drying processes touching this stock ===');
  const items = await prisma.dryingProcessItem.findMany({
    where: {
      sourceWarehouseId: stock?.warehouseId,
      woodTypeId: stock?.woodTypeId,
      thickness: stock?.thickness,
    },
    include: {
      DryingProcess: { select: { batchNumber: true, status: true, createdAt: true, updatedAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  for (const it of items) {
    console.log({
      batch: (it as any).DryingProcess?.batchNumber,
      status: (it as any).DryingProcess?.status,
      pieces: it.pieceCount,
      processUpdatedAt: (it as any).DryingProcess?.updatedAt?.toISOString?.(),
    });
  }
  const stillUnderDrying = items.filter((it: any) =>
    ['IN_PROGRESS', 'PENDING_CLOSE'].includes(it.DryingProcess?.status)
  );
  const expectedUnderDrying = stillUnderDrying.reduce((s, it) => s + it.pieceCount, 0);
  console.log(`\nExpected UnderDrying for this stock right now: ${expectedUnderDrying}`);

  // Receipts that landed in this warehouse for this wood/thickness
  console.log('\n=== Wood receipts (incoming NotDried supply) ===');
  try {
    const receipts = await prisma.woodReceipt.findMany({
      where: {
        warehouseId: stock?.warehouseId,
        woodTypeId: stock?.woodTypeId,
        thickness: parseFloat(stock?.thickness?.replace('"', '') || '0') * 25.4, // 2" → 50.8mm
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        lotNumber: true,
        status: true,
        receiptDate: true,
        thickness: true,
        thicknessUnit: true,
        actualPlankCount: true,
        actualSleeperCount: true,
      },
    } as any);
    for (const r of receipts) {
      console.log(r);
    }
  } catch (e) {
    console.log('  woodReceipt query failed:', (e as Error).message);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
