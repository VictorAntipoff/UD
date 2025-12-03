import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== REMOVING DUPLICATE/WRONG RECHARGES ===\n');

  // These are the problematic recharges with wrong timestamps (all showing Nov 24 12:59)
  // that need to be removed because we've added the correct ones

  const wrongRecharges = [
    { token: '1193', process: 'UD-DRY-00001', reason: 'Old record with wrong timestamp (Nov 24)' },
    { token: '5065', process: 'UD-DRY-00005', reason: 'Old record with wrong timestamp (Nov 24)' },
    { token: '3988', process: 'UD-DRY-00008', reason: 'Old record with wrong timestamp (Nov 24)' }
  ];

  for (const wrong of wrongRecharges) {
    console.log(`Checking ${wrong.process} - Token ${wrong.token}...`);

    const process = await prisma.dryingProcess.findUnique({
      where: { batchNumber: wrong.process },
      include: { recharges: true }
    });

    // Find the recharge with Nov 24 timestamp (the wrong one)
    const wrongRecharge = process.recharges.find(r =>
      r.token.includes(wrong.token) &&
      new Date(r.rechargeDate).toDateString() === new Date('2025-11-24').toDateString()
    );

    if (wrongRecharge) {
      console.log(`  Found wrong recharge:`);
      console.log(`    ID: ${wrongRecharge.id}`);
      console.log(`    Date: ${wrongRecharge.rechargeDate}`);
      console.log(`    Reason: ${wrong.reason}`);

      await prisma.electricityRecharge.delete({
        where: { id: wrongRecharge.id }
      });

      console.log(`  ✅ Deleted\n`);
    } else {
      console.log(`  ❌ Not found\n`);
    }
  }

  // Check UD-DRY-00010 for duplicate Token 6417
  console.log('Checking UD-DRY-00010 for duplicate Token 6417...');

  const dry010 = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' },
    include: { recharges: { orderBy: { createdAt: 'asc' } } }
  });

  const token6417Recharges = dry010.recharges.filter(r => r.token.includes('6417'));

  if (token6417Recharges.length > 1) {
    console.log(`  Found ${token6417Recharges.length} recharges with Token 6417`);

    // Keep the first one (oldest), delete the rest
    const toKeep = token6417Recharges[0];
    const toDelete = token6417Recharges.slice(1);

    console.log(`  Keeping: ${toKeep.id} (created ${toKeep.createdAt})`);
    console.log(`  Deleting: ${toDelete.length} duplicate(s)`);

    for (const dup of toDelete) {
      await prisma.electricityRecharge.delete({
        where: { id: dup.id }
      });
      console.log(`    ✅ Deleted ${dup.id}`);
    }
    console.log();
  } else {
    console.log(`  ✅ No duplicates\n`);
  }

  console.log('='.repeat(80));
  console.log('✅ CLEANUP COMPLETE');
  console.log('='.repeat(80));
  console.log();

  // Show final count
  const finalCount = await prisma.electricityRecharge.count();
  console.log(`Final recharge count: ${finalCount}`);
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
