// READ-ONLY: enumerate every stock_movement on P01-Tegeta Teak 2"
// in the live DB (in chronological order). Compare with backup snapshot.
import { prisma } from '../lib/prisma.js';

const STOCK_ID = '2f21fa14-018a-44dd-878b-eb7189a7858e';
const WAREHOUSE_ID = '86c38abc-bb70-42c3-ae8b-181dc4623376';
const WOOD_TYPE_ID = '7b384cde-22d1-481f-a87f-cb92ddb4a178';
const THICKNESS = '2"';

async function main() {
  const stock = await prisma.stock.findUnique({ where: { id: STOCK_ID } });
  console.log('Live stock now:', {
    NotDried: (stock as any)?.statusNotDried,
    UnderDrying: (stock as any)?.statusUnderDrying,
    Dried: (stock as any)?.statusDried,
    updatedAt: stock?.updatedAt.toISOString(),
  });

  const movements = await (prisma as any).stock_movements.findMany({
    where: { warehouseId: WAREHOUSE_ID, woodTypeId: WOOD_TYPE_ID, thickness: THICKNESS },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\nTotal movements found: ${movements.length}`);
  console.log('\nMovements after 2026-04-27 10:45 (when the backup was taken):\n');
  const since = new Date('2026-04-27T07:45:00.000Z'); // 10:45 EAT = 07:45 UTC
  const recent = movements.filter((m: any) => new Date(m.createdAt) >= since);
  for (const m of recent) {
    console.log(`  ${m.createdAt.toISOString()}  ${m.movementType.padEnd(15)} qty=${m.quantityChange}  ${m.fromStatus ?? '∅'} → ${m.toStatus ?? '∅'}  ref=${m.referenceNumber ?? ''}  by=${m.userName ?? ''}`);
  }

  // Reconstruct expected stock from backup state + applied movements
  // Backup at 2026-04-27 10:45:  NotDried=537  UnderDrying=0  Dried=0
  let nd = 537, ud = 0, dr = 0;
  console.log(`\n=== Reconstruction from backup (537/0/0) + post-backup movements ===`);
  for (const m of recent) {
    const before = { nd, ud, dr };
    const q = m.quantityChange ?? 0;
    // movementType + (from→to) tells us how to apply the delta to status counts
    if (m.movementType === 'DRYING_START') {
      // pieces leave NotDried, enter UnderDrying. quantityChange usually 0 (movements log uses status fields not delta)
      // We have to infer from the drying process item count
      // For now annotate; computation handled below
    }
    if (m.movementType === 'DRYING_END') {
      // UnderDrying → Dried
    }
    // simpler: if quantityChange is signed and toStatus is set, apply directly
    if (q !== 0) {
      const target = m.toStatus || m.fromStatus;
      if (target === 'NOT_DRIED') nd += q;
      else if (target === 'UNDER_DRYING') ud += q;
      else if (target === 'DRIED') dr += q;
    }
    console.log(`  After ${m.movementType} ${m.referenceNumber || ''}: NotDried=${nd}  UnderDrying=${ud}  Dried=${dr}    (was ${before.nd}/${before.ud}/${before.dr})`);
  }
  console.log(`\nExpected from reconstruction: NotDried=${nd}  UnderDrying=${ud}  Dried=${dr}`);
  console.log(`Live actual:                  NotDried=${(stock as any)?.statusNotDried}  UnderDrying=${(stock as any)?.statusUnderDrying}  Dried=${(stock as any)?.statusDried}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
