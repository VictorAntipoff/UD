// READ-ONLY: check every Stock row in the live DB for any anomaly.
// No assumptions, no "should be" — just dump what's there.
import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('=== ALL STOCK ROWS — health check ===\n');

  const rows = await prisma.stock.findMany({
    include: { Warehouse: true, WoodType: true },
    orderBy: [{ warehouseId: 'asc' }, { woodTypeId: 'asc' }, { thickness: 'asc' }],
  });

  console.log(`Total rows: ${rows.length}\n`);

  let anomalies = 0;
  const negative: any[] = [];
  const allEmpty: any[] = [];
  const inTransitWithoutOpenTransfer: any[] = [];
  const underDryingWithoutOpenProcess: any[] = [];

  // Pull all open transfers + open drying processes once
  const openTransfers = await prisma.transfer.findMany({
    where: { status: { in: ['PENDING', 'APPROVED', 'IN_TRANSIT'] } },
    include: { TransferItem: true },
  });
  const openProcesses = await prisma.dryingProcess.findMany({
    where: { status: { in: ['IN_PROGRESS', 'PENDING_CLOSE'] } },
    include: { DryingProcessItem: true },
  });

  // Build expected aggregations
  // Expected statusInTransitOut at warehouseId for (woodTypeId, thickness)
  const expectInTransitOut = new Map<string, number>();
  // Expected statusInTransitIn at warehouseId for (woodTypeId, thickness)
  const expectInTransitIn = new Map<string, number>();
  for (const t of openTransfers) {
    for (const item of t.TransferItem) {
      const outKey = `${t.fromWarehouseId}|${item.woodTypeId}|${item.thickness}`;
      const inKey  = `${t.toWarehouseId}|${item.woodTypeId}|${item.thickness}`;
      expectInTransitOut.set(outKey, (expectInTransitOut.get(outKey) || 0) + item.quantity);
      expectInTransitIn.set(inKey,   (expectInTransitIn.get(inKey)  || 0) + item.quantity);
    }
  }

  // Expected statusUnderDrying at sourceWarehouseId for (woodTypeId, thickness)
  const expectUnderDrying = new Map<string, number>();
  for (const p of openProcesses) {
    if (p.DryingProcessItem.length > 0) {
      for (const item of p.DryingProcessItem) {
        const key = `${item.sourceWarehouseId}|${item.woodTypeId}|${item.thickness}`;
        expectUnderDrying.set(key, (expectUnderDrying.get(key) || 0) + item.pieceCount);
      }
    } else if (p.useStock && p.sourceWarehouseId && p.woodTypeId && p.stockThickness && p.pieceCount) {
      const key = `${p.sourceWarehouseId}|${p.woodTypeId}|${p.stockThickness}`;
      expectUnderDrying.set(key, (expectUnderDrying.get(key) || 0) + p.pieceCount);
    }
  }

  // Now scan
  console.log('=== Per-row check ===');
  for (const row of rows) {
    const r = row as any;
    const anyNeg =
      r.statusNotDried < 0 || r.statusUnderDrying < 0 || r.statusDried < 0 ||
      r.statusDamaged < 0 || r.statusInTransitOut < 0 || r.statusInTransitIn < 0;
    const total =
      r.statusNotDried + r.statusUnderDrying + r.statusDried +
      r.statusDamaged + r.statusInTransitOut + r.statusInTransitIn;
    const allZero = total === 0;

    const key = `${r.warehouseId}|${r.woodTypeId}|${r.thickness}`;
    const expectedOut = expectInTransitOut.get(key) || 0;
    const expectedIn  = expectInTransitIn.get(key) || 0;
    const expectedUD  = expectUnderDrying.get(key) || 0;

    const driftOut = r.statusInTransitOut - expectedOut;
    const driftIn  = r.statusInTransitIn  - expectedIn;
    const driftUD  = r.statusUnderDrying  - expectedUD;

    const hasDrift = driftOut !== 0 || driftIn !== 0 || driftUD !== 0;

    if (anyNeg) {
      negative.push({ id: r.id, wh: r.Warehouse?.name, wt: r.WoodType?.name, th: r.thickness, ...r });
      anomalies++;
    } else if (hasDrift) {
      anomalies++;
      console.log(`  ⚠ DRIFT  ${r.Warehouse?.name?.padEnd(18)} ${r.WoodType?.name?.padEnd(8)} ${r.thickness?.padEnd(8)} ` +
        `ND=${r.statusNotDried} UD=${r.statusUnderDrying}(exp ${expectedUD}, drift ${driftUD>=0?'+':''}${driftUD}) ` +
        `D=${r.statusDried} Dmg=${r.statusDamaged} ` +
        `ITO=${r.statusInTransitOut}(exp ${expectedOut}, drift ${driftOut>=0?'+':''}${driftOut}) ` +
        `ITI=${r.statusInTransitIn}(exp ${expectedIn}, drift ${driftIn>=0?'+':''}${driftIn})`);
    } else if (!allZero) {
      console.log(`  ✓        ${r.Warehouse?.name?.padEnd(18)} ${r.WoodType?.name?.padEnd(8)} ${r.thickness?.padEnd(8)} ` +
        `ND=${r.statusNotDried} UD=${r.statusUnderDrying} D=${r.statusDried} Dmg=${r.statusDamaged} ` +
        `ITO=${r.statusInTransitOut} ITI=${r.statusInTransitIn}  (total ${total})`);
    }

    if (allZero) allEmpty.push(r);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Stock rows:                 ${rows.length}`);
  console.log(`All-zero rows (placeholders): ${allEmpty.length}`);
  console.log(`Rows with negative bucket:   ${negative.length}`);
  console.log(`Rows with drift vs open ops: ${anomalies - negative.length}`);
  console.log(`Open transfers:              ${openTransfers.length}`);
  console.log(`Open drying processes:       ${openProcesses.length}`);

  if (negative.length > 0) {
    console.log(`\n!! NEGATIVE rows (DB CHECK should make this impossible — but check anyway):`);
    for (const n of negative) {
      console.log(`   ${n.wh} ${n.wt} ${n.th}: ${JSON.stringify({
        ND: n.statusNotDried, UD: n.statusUnderDrying, D: n.statusDried, Dmg: n.statusDamaged,
        ITO: n.statusInTransitOut, ITI: n.statusInTransitIn,
      })}`);
    }
  }

  console.log(`\nVERDICT: ${anomalies === 0 ? '✓ ALL STOCK ROWS CLEAN' : '⚠ ' + anomalies + ' anomalies — investigate'}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
