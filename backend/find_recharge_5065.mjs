import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== SEARCHING FOR TOKEN 5065 RECHARGE ===\n');

  // Search for this recharge in database
  const recharge = await prisma.electricityRecharge.findFirst({
    where: { token: { contains: '5065' } },
    include: { dryingProcess: true }
  });

  if (recharge) {
    console.log('✅ Found recharge in database:\n');
    console.log(`Token: ${recharge.token}`);
    console.log(`kWh: ${recharge.kwhAmount}`);
    console.log(`Paid: ${recharge.totalPaid.toLocaleString()} TSH`);
    console.log(`Date: ${recharge.rechargeDate}`);
    console.log(`Belongs to: ${recharge.dryingProcess.batchNumber}`);
    console.log(`Process dates: ${recharge.dryingProcess.startTime} to ${recharge.dryingProcess.endTime}`);
  } else {
    console.log('❌ Token 5065 NOT found in database\n');
  }

  console.log('\n' + '='.repeat(80));
  console.log('CHECKING WHICH PROCESS WAS ACTIVE ON NOV 5, 2025');
  console.log('='.repeat(80));

  const rechargeDate = new Date('2025-11-05T17:23:00');

  // Find processes that were running on Nov 5, 2025
  const activeProcesses = await prisma.dryingProcess.findMany({
    where: {
      startTime: { lte: rechargeDate },
      OR: [
        { endTime: { gte: rechargeDate } },
        { endTime: null }
      ]
    },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: true
    }
  });

  console.log(`\nFound ${activeProcesses.length} process(es) active on Nov 5, 2025:\n`);

  for (const process of activeProcesses) {
    console.log(`\n${process.batchNumber}:`);
    console.log(`  Start: ${process.startTime}`);
    console.log(`  End: ${process.endTime || 'Not ended'}`);
    console.log(`  Starting Meter: ${process.startingElectricityUnits} kWh`);

    // Check if there's a reading around Nov 5 that shows a meter increase
    const readingsAroundNov5 = process.readings.filter(r => {
      const rDate = new Date(r.readingTime);
      const diff = Math.abs(rDate - rechargeDate) / (1000 * 60 * 60); // hours
      return diff < 24; // Within 24 hours of recharge
    });

    if (readingsAroundNov5.length > 0) {
      console.log(`  📍 Found ${readingsAroundNov5.length} reading(s) around Nov 5:`);
      readingsAroundNov5.forEach(r => {
        console.log(`     ${r.readingTime}: ${r.electricityMeter} kWh`);
      });
    }

    // Check for meter increases around 1680 kWh
    let prevReading = process.startingElectricityUnits;
    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const increase = reading.electricityMeter - prevReading;

      if (increase > 1500 && increase < 1800) {
        console.log(`  ⚡ MATCH FOUND: Reading ${i + 1} shows meter increase of ${increase.toFixed(2)} kWh`);
        console.log(`     Previous: ${prevReading} kWh`);
        console.log(`     Current: ${reading.electricityMeter} kWh`);
        console.log(`     Date: ${reading.readingTime}`);
        console.log(`     ✅ This matches the 1680 kWh recharge!`);
      }

      prevReading = reading.electricityMeter;
    }

    // Check existing recharges
    console.log(`  Existing recharges: ${process.recharges.length}`);
    if (process.recharges.length > 0) {
      process.recharges.forEach(r => {
        console.log(`     Token ${r.token}: ${r.kwhAmount} kWh on ${r.rechargeDate}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('\nRecharge Details from SMS:');
  console.log('  Date: Nov 5, 2025 at 17:23');
  console.log('  Token: 5065');
  console.log('  kWh: 1,680 kWh');
  console.log('  Paid: 600,000 TSH');
  console.log();
  console.log('This recharge needs to be matched to the correct drying process.');
  console.log('It should be the process that was running on Nov 5, 2025.');
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
