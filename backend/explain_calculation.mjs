import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== UD-DRY-00010 ELECTRICITY CONSUMPTION CALCULATION BREAKDOWN ===\n');

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  console.log('HOW PREPAID METERS WORK:');
  console.log('- When you USE electricity, the meter COUNTS DOWN (decreases)');
  console.log('- When you RECHARGE (add Luku), the meter COUNTS UP (increases)');
  console.log('- Consumption = How much the meter counted DOWN\n');

  console.log('FORMULA FOR CONSUMPTION:');
  console.log('- WITHOUT recharge: Consumption = Previous Reading - Current Reading');
  console.log('- WITH recharge:    Consumption = Previous Reading + Recharged Amount - Current Reading\n');

  console.log('='.repeat(80));
  console.log('\nPHASE 1: BEFORE RECHARGE (Nov 22 - Nov 24)\n');
  console.log('='.repeat(80));

  let totalConsumption = 0;
  let prevReading = process.startingElectricityUnits;
  let phase1Total = 0;

  console.log(`\nSTART: ${process.startTime}`);
  console.log(`Meter: ${prevReading} kWh\n`);

  // Phase 1: Readings 1-6 (before recharge)
  for (let i = 0; i < 6; i++) {
    const reading = process.readings[i];
    const consumed = prevReading - reading.electricityMeter;
    phase1Total += consumed;

    console.log(`Reading ${i + 1}: ${reading.readingTime}`);
    console.log(`  Meter: ${reading.electricityMeter} kWh`);
    console.log(`  Calculation: ${prevReading.toFixed(2)} - ${reading.electricityMeter} = ${consumed.toFixed(2)} kWh`);
    console.log(`  Meaning: The oven used ${consumed.toFixed(2)} kWh of electricity`);
    console.log();

    prevReading = reading.electricityMeter;
  }

  console.log(`PHASE 1 TOTAL: ${phase1Total.toFixed(2)} kWh\n`);

  console.log('='.repeat(80));
  console.log('\nRECHARGE EVENT (Nov 24)\n');
  console.log('='.repeat(80));

  const recharge = process.recharges[0];
  console.log(`\nRecharge Time: ${recharge.rechargeDate}`);
  console.log(`Token: ${recharge.token}`);
  console.log(`Amount Added: ${recharge.kwhAmount} kWh`);
  console.log(`Amount Paid: ${recharge.totalPaid.toLocaleString()} TSH`);
  console.log(`Meter After Recharge: ${recharge.meterReadingAfter} kWh\n`);

  console.log('WHAT HAPPENED:');
  console.log(`  Before recharge: Meter was at ${prevReading} kWh (almost empty)`);
  console.log(`  Recharge added: ${recharge.kwhAmount} kWh`);
  console.log(`  After recharge: Meter jumped to ${recharge.meterReadingAfter} kWh\n`);

  console.log('='.repeat(80));
  console.log('\nPHASE 2: AFTER RECHARGE (Nov 24 - Nov 25)\n');
  console.log('='.repeat(80));

  // Reading 7 - first reading after recharge
  const reading7 = process.readings[6];
  const reading8 = process.readings[7];

  console.log(`\nReading 7: ${reading7.readingTime} (RIGHT AFTER RECHARGE)`);
  console.log(`  Meter: ${reading7.electricityMeter} kWh`);
  console.log(`  Calculation: ${prevReading.toFixed(2)} + ${recharge.kwhAmount} - ${reading7.electricityMeter} = ${(prevReading + recharge.kwhAmount - reading7.electricityMeter).toFixed(2)} kWh`);
  console.log(`  Breakdown:`);
  console.log(`    - Had ${prevReading} kWh left from before`);
  console.log(`    - Added ${recharge.kwhAmount} kWh from recharge`);
  console.log(`    - Total available: ${(prevReading + recharge.kwhAmount).toFixed(2)} kWh`);
  console.log(`    - Now have ${reading7.electricityMeter} kWh left`);
  console.log(`    - So consumed: ${(prevReading + recharge.kwhAmount - reading7.electricityMeter).toFixed(2)} kWh`);

  let consumed7 = prevReading + recharge.kwhAmount - reading7.electricityMeter;
  let phase2Total = consumed7;
  prevReading = reading7.electricityMeter;
  console.log();

  // Readings 8-11 (normal countdown after recharge)
  for (let i = 7; i < process.readings.length; i++) {
    const reading = process.readings[i];
    const consumed = prevReading - reading.electricityMeter;
    phase2Total += consumed;

    console.log(`Reading ${i + 1}: ${reading.readingTime}`);
    console.log(`  Meter: ${reading.electricityMeter} kWh`);
    console.log(`  Calculation: ${prevReading.toFixed(2)} - ${reading.electricityMeter} = ${consumed.toFixed(2)} kWh`);
    console.log(`  Meaning: The oven used ${consumed.toFixed(2)} kWh of electricity`);
    console.log();

    prevReading = reading.electricityMeter;
  }

  console.log(`PHASE 2 TOTAL: ${phase2Total.toFixed(2)} kWh\n`);

  totalConsumption = phase1Total + phase2Total;

  console.log('='.repeat(80));
  console.log('\nFINAL SUMMARY\n');
  console.log('='.repeat(80));
  console.log(`\nPhase 1 (Before Recharge): ${phase1Total.toFixed(2)} kWh`);
  console.log(`Phase 2 (After Recharge):  ${phase2Total.toFixed(2)} kWh`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`TOTAL ELECTRICITY CONSUMED: ${totalConsumption.toFixed(2)} kWh\n`);

  // Cost breakdown
  const electricityRate = 356.25; // TSH per kWh
  const electricityCost = totalConsumption * electricityRate;

  const startTime = new Date(process.startTime);
  const endTime = new Date(process.readings[process.readings.length - 1].readingTime);
  const runningHours = (endTime - startTime) / (1000 * 60 * 60);

  const depreciationPerHour = 6000;
  const depreciationCost = runningHours * depreciationPerHour;

  const totalCost = electricityCost + depreciationCost;

  console.log('='.repeat(80));
  console.log('\nCOST CALCULATION\n');
  console.log('='.repeat(80));
  console.log(`\n1. ELECTRICITY COST:`);
  console.log(`   ${totalConsumption.toFixed(2)} kWh × 356.25 TSH/kWh = ${electricityCost.toFixed(2)} TSH`);
  console.log(`   \n   Where 356.25 TSH/kWh comes from:`);
  console.log(`   Recharge: 1,000,000 TSH ÷ 2,807 kWh = 356.25 TSH per kWh\n`);

  console.log(`2. DEPRECIATION COST:`);
  console.log(`   Running time: ${runningHours.toFixed(2)} hours`);
  console.log(`   ${runningHours.toFixed(2)} hrs × 6,000 TSH/hr = ${depreciationCost.toFixed(2)} TSH\n`);

  console.log(`3. OTHER COSTS:`);
  console.log(`   Maintenance: 0 TSH`);
  console.log(`   Labor: 0 TSH\n`);

  console.log(`${'─'.repeat(40)}`);
  console.log(`TOTAL DRYING COST: ${totalCost.toFixed(2)} TSH`);
  console.log(`${'='.repeat(80)}\n`);

  console.log('KEY POINTS:');
  console.log('✓ Meter counts DOWN when using electricity (consumption)');
  console.log('✓ Meter counts UP when recharging (adding credit)');
  console.log('✓ When there is a recharge, we use: Previous + Recharged - Current');
  console.log('✓ This ensures we count ALL electricity used, before and after recharge');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
