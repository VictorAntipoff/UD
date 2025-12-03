import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FINAL VERIFICATION OF ALL RECHARGE DATA ===\n');

  // Get all recharges
  const allRecharges = await prisma.electricityRecharge.findMany({
    include: { dryingProcess: true },
    orderBy: { rechargeDate: 'asc' }
  });

  console.log(`Total recharges in database: ${allRecharges.length}\n`);

  console.log('='.repeat(100));
  console.log('ALL RECHARGES BY PROCESS');
  console.log('='.repeat(100));

  const byProcess = {};
  allRecharges.forEach(r => {
    const batchNumber = r.dryingProcess?.batchNumber || 'ORPHANED';
    if (!byProcess[batchNumber]) {
      byProcess[batchNumber] = [];
    }
    byProcess[batchNumber].push(r);
  });

  for (const [batchNumber, recharges] of Object.entries(byProcess).sort()) {
    console.log(`\n${batchNumber}:`);
    console.log(`  Process: ${recharges[0].dryingProcess?.startTime || 'N/A'} to ${recharges[0].dryingProcess?.endTime || 'N/A'}`);
    console.log(`  Recharges: ${recharges.length}`);

    recharges.forEach((r, i) => {
      const isAfterEnd = r.dryingProcess?.endTime && new Date(r.rechargeDate) > new Date(r.dryingProcess.endTime);
      const isBeforeStart = r.dryingProcess?.startTime && new Date(r.rechargeDate) < new Date(r.dryingProcess.startTime);

      console.log(`\n    ${i + 1}. Token: ${r.token.substring(0, 15)}...`);
      console.log(`       Date: ${r.rechargeDate} ${isAfterEnd ? '⚠️  AFTER END' : isBeforeStart ? '⚠️  BEFORE START' : '✅'}`);
      console.log(`       kWh: ${r.kwhAmount.toLocaleString()}`);
      console.log(`       Paid: ${r.totalPaid.toLocaleString()} TSH`);
      console.log(`       Meter After: ${r.meterReadingAfter || 'N/A'}`);
    });
  }

  console.log('\n\n' + '='.repeat(100));
  console.log('SUMMARY');
  console.log('='.repeat(100));

  const orphaned = allRecharges.filter(r => !r.dryingProcessId);
  const duplicates = {};
  allRecharges.forEach(r => {
    if (!duplicates[r.token]) duplicates[r.token] = [];
    duplicates[r.token].push(r);
  });
  const dupCount = Object.values(duplicates).filter(arr => arr.length > 1).length;
  const zeroPayment = allRecharges.filter(r => r.totalPaid === 0);

  console.log(`\n✅ Total recharges: ${allRecharges.length}`);
  console.log(`✅ Orphaned: ${orphaned.length}`);
  console.log(`✅ Duplicates: ${dupCount}`);
  console.log(`✅ Zero payment: ${zeroPayment.length}`);
  console.log();

  // Check UD-DRY-00010 specifically since it had issues
  console.log('='.repeat(100));
  console.log('UD-DRY-00010 SPECIFIC CHECK');
  console.log('='.repeat(100));

  const dry010 = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  if (dry010) {
    console.log(`\nStart: ${dry010.startTime}`);
    console.log(`End: ${dry010.endTime}`);
    console.log(`Starting Meter: ${dry010.startingElectricityUnits} kWh`);
    console.log(`\nRecharges: ${dry010.recharges.length}`);

    dry010.recharges.forEach((r, i) => {
      console.log(`\n  ${i + 1}. Token ${r.token.substring(0, 10)}...`);
      console.log(`     Date: ${r.rechargeDate}`);
      console.log(`     kWh: ${r.kwhAmount}`);
      console.log(`     Meter After: ${r.meterReadingAfter}`);
    });

    console.log(`\nLast Reading: ${dry010.readings[dry010.readings.length - 1]?.readingTime}`);
    console.log(`Last Meter: ${dry010.readings[dry010.readings.length - 1]?.electricityMeter} kWh`);
    console.log(`\nTotal Cost: ${dry010.totalCost?.toLocaleString()} TSH`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('✅ VERIFICATION COMPLETE');
  console.log('='.repeat(100));
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
