import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== INVESTIGATING READING 11 - UD-DRY-00010 ===\n');

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  const reading10 = process.readings[process.readings.length - 2];
  const reading11 = process.readings[process.readings.length - 1];

  console.log('Reading 10:', reading10.electricityMeter, 'kWh at', reading10.readingTime);
  console.log('Reading 11:', reading11.electricityMeter, 'kWh at', reading11.readingTime);
  console.log('\nChange:', (reading11.electricityMeter - reading10.electricityMeter).toFixed(2), 'kWh');

  console.log('\n=== RECHARGES IN DATABASE ===');
  process.recharges.forEach((r, i) => {
    console.log(`\nRecharge ${i + 1}:`);
    console.log(`  Date: ${r.rechargeDate}`);
    console.log(`  Token: ${r.token}`);
    console.log(`  kWh: ${r.kwhAmount}`);
    console.log(`  Meter After: ${r.meterReadingAfter}`);
    console.log(`  Paid: ${r.totalPaid} TSH`);
  });

  console.log('\n=== ANALYSIS ===');
  console.log('Since meter went UP from 2236.94 to 2273.33 (+36.39 kWh),');
  console.log('there MUST have been a recharge between Reading 10 and 11.');
  console.log('\nPossible scenarios:');
  console.log('1. Missing recharge record in database');
  console.log('2. Recharge was done but not logged');
  console.log('3. Reading 11 is typo and should be lower');

  console.log('\n=== RECOMMENDATION ===');
  console.log('Since you want Reading 11 to be the FINAL reading,');
  console.log('we need to determine:');
  console.log('1. Was there a 2nd recharge? If yes, what were the details?');
  console.log('2. Or is Reading 11 a typo?');

  // Calculate what the recharge would be
  const meterIncrease = reading11.electricityMeter - reading10.electricityMeter;
  console.log(`\nIf there WAS a recharge:`);
  console.log(`  Meter increase: ${meterIncrease.toFixed(2)} kWh`);
  console.log(`  This means minimal consumption and mostly recharge`);
  console.log(`  Expected: Meter went from 2236.94 → recharged to ~2273.33`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
