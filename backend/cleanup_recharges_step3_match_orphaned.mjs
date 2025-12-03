import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== STEP 3: MATCH ORPHANED RECHARGES TO PROCESSES ===\n');

  const orphaned = await prisma.electricityRecharge.findMany({
    where: { dryingProcessId: null },
    orderBy: { rechargeDate: 'asc' }
  });

  console.log(`Found ${orphaned.length} orphaned recharge(s)\n`);

  const matches = [
    // Based on dates and kWh amounts from missing recharge analysis
    {
      token: '119379228154093120161403',
      process: 'UD-DRY-00001',
      readingNumber: 5,
      reason: 'Oct 11 date matches, 1403.5 kWh matches missing ~1242 kWh'
    },
    {
      token: '012392359650395364941403',
      process: 'UD-DRY-00002',
      readingNumber: 6,
      reason: 'Oct 17 date matches, 1403.5 kWh matches missing ~1238 kWh'
    },
    {
      token: '555001963824163013221403',
      process: 'UD-DRY-00003',
      readingNumber: 5,
      reason: 'Oct 22 date matches, 1403.5 kWh matches missing ~1372 kWh'
    },
    {
      token: '351342985786659908062807',
      process: 'UD-DRY-00003',
      readingNumber: 14,
      reason: 'Oct 26 date matches, 2807 kWh matches missing ~2786 kWh'
    },
    {
      token: '293730262453382311881122',
      process: 'UD-DRY-00007',
      readingNumber: 5,
      reason: 'Nov 6 date close to missing recharge, 1122.8 kWh matches missing ~1062 kWh'
    },
    {
      token: '398891332950271813572807',
      process: 'UD-DRY-00008',
      readingNumber: 5,
      reason: 'Nov 13 date matches, 2807 kWh matches missing ~2731 kWh'
    },
    {
      token: '641769362395659772212807',
      process: 'UD-DRY-00010',
      readingNumber: 7,
      reason: 'Nov 24 date matches, 2807 kWh matches DRY-00010 recharge'
    }
  ];

  for (const match of matches) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Processing: Token ${match.token.substring(0, 10)}...`);
    console.log(`Target: ${match.process}`);
    console.log(`Reason: ${match.reason}`);

    // Find the orphaned recharge
    const recharge = orphaned.find(r => r.token === match.token);
    if (!recharge) {
      console.log(`❌ Token not found in orphaned list`);
      continue;
    }

    // Find the process
    const process = await prisma.dryingProcess.findUnique({
      where: { batchNumber: match.process },
      include: { readings: { orderBy: { readingTime: 'asc' } } }
    });

    if (!process) {
      console.log(`❌ Process ${match.process} not found`);
      continue;
    }

    console.log(`\nProcess Details:`);
    console.log(`  Start: ${process.startTime}`);
    console.log(`  End: ${process.endTime || 'Not ended'}`);

    // Find the reading that corresponds to this recharge
    const targetReading = process.readings[match.readingNumber - 1];
    if (!targetReading) {
      console.log(`❌ Reading ${match.readingNumber} not found`);
      continue;
    }

    console.log(`\nTarget Reading ${match.readingNumber}:`);
    console.log(`  Time: ${targetReading.readingTime}`);
    console.log(`  Meter: ${targetReading.electricityMeter} kWh`);

    // Update recharge
    console.log(`\nAssigning recharge to ${match.process}...`);
    await prisma.electricityRecharge.update({
      where: { id: recharge.id },
      data: {
        dryingProcessId: process.id,
        meterReadingAfter: targetReading.electricityMeter,
        // Adjust recharge date to be just before the reading
        rechargeDate: new Date(new Date(targetReading.readingTime).getTime() - 60000) // 1 minute before
      }
    });

    console.log(`✅ Assigned successfully`);
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const remainingOrphaned = await prisma.electricityRecharge.findMany({
    where: { dryingProcessId: null }
  });

  console.log(`\nMatched: ${orphaned.length - remainingOrphaned.length}`);
  console.log(`Remaining orphaned: ${remainingOrphaned.length}`);

  if (remainingOrphaned.length > 0) {
    console.log(`\nStill orphaned:`);
    remainingOrphaned.forEach(r => {
      console.log(`  - Token ${r.token.substring(0, 15)}... (${r.kwhAmount} kWh on ${r.rechargeDate})`);
    });
  }

  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
