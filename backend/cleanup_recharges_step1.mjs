import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== STEP 1: REMOVE DUPLICATE RECHARGE ENTRIES ===\n');

  // Find duplicates
  const allRecharges = await prisma.electricityRecharge.findMany({
    orderBy: { createdAt: 'asc' } // Keep the oldest one
  });

  const tokenGroups = {};
  allRecharges.forEach(r => {
    if (!tokenGroups[r.token]) {
      tokenGroups[r.token] = [];
    }
    tokenGroups[r.token].push(r);
  });

  const duplicateGroups = Object.entries(tokenGroups).filter(([token, recharges]) => recharges.length > 1);

  console.log(`Found ${duplicateGroups.length} duplicate token group(s)\n`);

  for (const [token, recharges] of duplicateGroups) {
    console.log(`Token: ${token}`);
    console.log(`  Occurrences: ${recharges.length}`);

    // Keep the first one (oldest), delete the rest
    const toKeep = recharges[0];
    const toDelete = recharges.slice(1);

    console.log(`  Keeping: ID ${toKeep.id} (created ${toKeep.createdAt})`);
    console.log(`  Deleting: ${toDelete.length} duplicate(s)`);

    for (const dup of toDelete) {
      await prisma.electricityRecharge.delete({
        where: { id: dup.id }
      });
      console.log(`    ✓ Deleted ID ${dup.id}`);
    }

    console.log();
  }

  console.log('✅ Duplicate removal complete\n');

  // Show remaining orphaned recharges
  const orphaned = await prisma.electricityRecharge.findMany({
    where: { dryingProcessId: null }
  });

  console.log(`Remaining orphaned recharges: ${orphaned.length}\n`);
  orphaned.forEach(r => {
    console.log(`  Token: ${r.token}`);
    console.log(`  Date: ${r.rechargeDate}`);
    console.log(`  kWh: ${r.kwhAmount}`);
    console.log();
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
