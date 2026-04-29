// One-off fix for UD-DRY-00039: link its existing recharge to the reading
// taken just after the physical recharge happened.
//
// Run mode is controlled by APPLY env var:
//   npx tsx src/scripts/fix_UD-DRY-00039_recharge_link.ts        → DRY RUN (read-only)
//   APPLY=1 npx tsx src/scripts/fix_UD-DRY-00039_recharge_link.ts → applies the change

import { prisma } from '../lib/prisma.js';

const APPLY = process.env.APPLY === '1';

async function main() {
  const proc = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00039' },
    select: { id: true, status: true, batchNumber: true },
  });
  if (!proc) throw new Error('UD-DRY-00039 not found');

  // Find the recharge linked to this process
  const recharges = await prisma.electricityRecharge.findMany({
    where: { dryingProcessId: proc.id },
    orderBy: { rechargeDate: 'asc' },
    select: { id: true, rechargeDate: true, kwhAmount: true, linkedReadingId: true },
  });
  console.log('Recharges currently linked to', proc.batchNumber, ':');
  for (const r of recharges) {
    console.log('  ', r);
  }
  if (recharges.length !== 1) {
    throw new Error(`Expected exactly 1 recharge on UD-DRY-00039, found ${recharges.length}. Aborting.`);
  }
  const recharge = recharges[0];
  if (recharge.linkedReadingId) {
    console.log('\nAlready linked to reading', recharge.linkedReadingId, '— no change needed.');
    return;
  }

  // Find the reading at 2026-04-26 09:14 UTC — the one taken after the physical recharge.
  // We identify it by meter value 839.19 to be unambiguous.
  const candidate = await prisma.dryingReading.findFirst({
    where: {
      dryingProcessId: proc.id,
      electricityMeter: 839.19,
    },
    select: { id: true, readingTime: true, electricityMeter: true, humidity: true },
  });
  if (!candidate) {
    throw new Error('Could not find the reading with meter=839.19 on UD-DRY-00039.');
  }
  console.log('\nProposed anchor reading:');
  console.log('  id:', candidate.id);
  console.log('  readingTime:', candidate.readingTime.toISOString());
  console.log('  meter:', candidate.electricityMeter);
  console.log('  humidity:', candidate.humidity);

  if (!APPLY) {
    console.log('\n[DRY RUN] No changes made. Re-run with APPLY=1 to apply.');
    return;
  }

  console.log('\n[APPLY] Updating recharge.linkedReadingId …');
  const updated = await prisma.electricityRecharge.update({
    where: { id: recharge.id },
    data: { linkedReadingId: candidate.id, updatedAt: new Date() },
  });
  console.log('Done. Recharge', updated.id, 'is now linked to reading', updated.linkedReadingId);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
