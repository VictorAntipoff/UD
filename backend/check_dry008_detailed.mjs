import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== DETAILED INVESTIGATION OF UD-DRY-00008 ===\n');

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00008' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } },
      items: { include: { woodType: true } }
    }
  });

  console.log('PROCESS INFO:');
  console.log('─'.repeat(100));
  console.log(`Batch Number: ${process.batchNumber}`);
  console.log(`Status: ${process.status}`);
  console.log(`Start: ${process.startTime}`);
  console.log(`End: ${process.endTime || 'Not ended'}`);
  console.log(`Starting Meter: ${process.startingElectricityUnits} kWh`);
  console.log(`Current Stored Cost: ${process.totalCost?.toFixed(2) || 'N/A'} TSH`);
  console.log();

  console.log('RECHARGES IN DATABASE:');
  console.log('─'.repeat(100));
  if (process.recharges.length === 0) {
    console.log('⚠️  No recharges found in database\n');
  } else {
    process.recharges.forEach((r, i) => {
      console.log(`\nRecharge ${i + 1}:`);
      console.log(`  Date: ${r.rechargeDate}`);
      console.log(`  Token: ${r.token}`);
      console.log(`  kWh Added: ${r.kwhAmount}`);
      console.log(`  Total Paid: ${r.totalPaid.toLocaleString()} TSH`);
      console.log(`  Rate: ${(r.totalPaid / r.kwhAmount).toFixed(2)} TSH/kWh`);
      console.log(`  Meter After Recharge: ${r.meterReadingAfter} kWh`);
    });
  }

  console.log('\n\nCOMPLETE TIMELINE WITH CONSUMPTION BREAKDOWN:');
  console.log('─'.repeat(100));

  let totalConsumption = 0;
  let prevReading = process.startingElectricityUnits;
  let prevTime = new Date(process.startTime);

  console.log(`\n╔═══════════════════════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║ START: ${process.startTime}`.padEnd(96) + '║');
  console.log(`║ Starting Meter: ${process.startingElectricityUnits} kWh`.padEnd(96) + '║');
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════════════════════╝`);

  for (let i = 0; i < process.readings.length; i++) {
    const reading = process.readings[i];
    const currentTime = new Date(reading.readingTime);
    const currentReading = reading.electricityMeter;
    const meterChange = currentReading - prevReading;
    const timeDiff = (currentTime - prevTime) / (1000 * 60 * 60);

    // Check for recharges between
    const rechargesBetween = process.recharges.filter(r => {
      const rDate = new Date(r.rechargeDate);
      return rDate > prevTime && rDate <= currentTime;
    });

    console.log(`\n┌─────────────────────────────────────────────────────────────────────────────────────────────┐`);
    console.log(`│ READING ${i + 1}: ${reading.readingTime}`.padEnd(94) + '│');
    console.log(`├─────────────────────────────────────────────────────────────────────────────────────────────┤`);
    console.log(`│ Time since previous: ${timeDiff.toFixed(1)} hours`.padEnd(94) + '│');
    console.log(`│ Previous meter: ${prevReading.toFixed(2)} kWh`.padEnd(94) + '│');
    console.log(`│ Current meter: ${currentReading} kWh`.padEnd(94) + '│');
    console.log(`│ Change: ${meterChange > 0 ? '+' : ''}${meterChange.toFixed(2)} kWh`.padEnd(94) + '│');

    let consumed = 0;

    if (rechargesBetween.length > 0) {
      console.log(`├─────────────────────────────────────────────────────────────────────────────────────────────┤`);
      console.log(`│ ⚡ RECHARGE DETECTED!`.padEnd(94) + '│');

      for (const recharge of rechargesBetween) {
        console.log(`│   Token: ${recharge.token}`.padEnd(94) + '│');
        console.log(`│   Added: ${recharge.kwhAmount} kWh`.padEnd(94) + '│');
        console.log(`│   Paid: ${recharge.totalPaid.toLocaleString()} TSH`.padEnd(94) + '│');
        console.log(`│   Meter after recharge: ${recharge.meterReadingAfter} kWh`.padEnd(94) + '│');
      }

      const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
      consumed = prevReading + totalRecharged - currentReading;

      console.log(`├─────────────────────────────────────────────────────────────────────────────────────────────┤`);
      console.log(`│ CONSUMPTION CALCULATION (with recharge):`.padEnd(94) + '│');
      console.log(`│   Previous: ${prevReading.toFixed(2)} kWh`.padEnd(94) + '│');
      console.log(`│   + Recharged: ${totalRecharged} kWh`.padEnd(94) + '│');
      console.log(`│   - Current: ${currentReading} kWh`.padEnd(94) + '│');
      console.log(`│   = Consumed: ${consumed.toFixed(2)} kWh`.padEnd(94) + '│');

      totalConsumption += Math.max(0, consumed);
    } else {
      if (meterChange > 100) {
        console.log(`├─────────────────────────────────────────────────────────────────────────────────────────────┤`);
        console.log(`│ ❌ ERROR: MISSING RECHARGE!`.padEnd(94) + '│');
        console.log(`│ Meter increased by ${meterChange.toFixed(2)} kWh but NO recharge logged in database`.padEnd(94) + '│');
        console.log(`│ This indicates a recharge happened but was not recorded.`.padEnd(94) + '│');
      } else {
        consumed = prevReading - currentReading;

        if (consumed > 0) {
          console.log(`├─────────────────────────────────────────────────────────────────────────────────────────────┤`);
          console.log(`│ CONSUMPTION CALCULATION (normal):`.padEnd(94) + '│');
          console.log(`│   Previous: ${prevReading.toFixed(2)} kWh`.padEnd(94) + '│');
          console.log(`│   - Current: ${currentReading} kWh`.padEnd(94) + '│');
          console.log(`│   = Consumed: ${consumed.toFixed(2)} kWh`.padEnd(94) + '│');

          totalConsumption += consumed;
        } else {
          console.log(`├─────────────────────────────────────────────────────────────────────────────────────────────┤`);
          console.log(`│ ⚠️  Meter increased slightly - possible error`.padEnd(94) + '│');
        }
      }
    }

    console.log(`├─────────────────────────────────────────────────────────────────────────────────────────────┤`);
    console.log(`│ Running Total Consumption: ${totalConsumption.toFixed(2)} kWh`.padEnd(94) + '│');
    console.log(`└─────────────────────────────────────────────────────────────────────────────────────────────┘`);

    prevReading = currentReading;
    prevTime = currentTime;
  }

  console.log(`\n╔═══════════════════════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║ FINAL TOTALS`.padEnd(96) + '║');
  console.log(`╠═══════════════════════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║ Total Electricity Consumed: ${totalConsumption.toFixed(2)} kWh`.padEnd(96) + '║');
  console.log(`╚═══════════════════════════════════════════════════════════════════════════════════════════════╝`);

  // Calculate costs
  const startTime = new Date(process.startTime);
  const endTime = new Date(process.endTime || process.readings[process.readings.length - 1]?.readingTime);
  const runningHours = (endTime - startTime) / (1000 * 60 * 60);

  const electricityRate = 356.25; // TSH/kWh
  const electricityCost = totalConsumption * electricityRate;
  const depreciationCost = runningHours * 6000;
  const totalCost = electricityCost + depreciationCost;

  console.log('\n\nCOST BREAKDOWN:');
  console.log('─'.repeat(100));
  console.log(`Running Time: ${runningHours.toFixed(2)} hours (${(runningHours / 24).toFixed(1)} days)`);
  console.log();
  console.log(`Electricity:`);
  console.log(`  ${totalConsumption.toFixed(2)} kWh × 356.25 TSH/kWh = ${electricityCost.toFixed(2)} TSH`);
  console.log();
  console.log(`Depreciation:`);
  console.log(`  ${runningHours.toFixed(2)} hrs × 6,000 TSH/hr = ${depreciationCost.toFixed(2)} TSH`);
  console.log();
  console.log(`${'─'.repeat(50)}`);
  console.log(`CALCULATED TOTAL COST: ${totalCost.toFixed(2)} TSH`);
  console.log(`STORED COST IN DATABASE: ${process.totalCost?.toFixed(2) || 'N/A'} TSH`);

  if (process.totalCost) {
    const diff = totalCost - process.totalCost;
    console.log(`DIFFERENCE: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} TSH`);

    if (Math.abs(diff) > 1000) {
      console.log();
      console.log('⚠️  Significant cost difference detected!');
      console.log(`   Reason: ${diff > 0 ? 'Calculated cost is HIGHER' : 'Stored cost is HIGHER'}`);
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('\nWHY 3117 kWh CONSUMPTION?');
  console.log('='.repeat(100));
  console.log('\nLet me analyze if this number is correct or if there are issues...\n');

  // Check for issues
  const issues = [];

  // Check for missing recharges
  let prev = process.startingElectricityUnits;
  let prevT = new Date(process.startTime);
  for (let i = 0; i < process.readings.length; i++) {
    const reading = process.readings[i];
    const currTime = new Date(reading.readingTime);
    const meterChange = reading.electricityMeter - prev;

    const rechargesBetween = process.recharges.filter(r => {
      const rDate = new Date(r.rechargeDate);
      return rDate > prevT && rDate <= currTime;
    });

    if (rechargesBetween.length === 0 && meterChange > 100) {
      issues.push(`Reading ${i + 1}: Missing recharge of ~${meterChange.toFixed(0)} kWh`);
    }

    prev = reading.electricityMeter;
    prevT = currTime;
  }

  if (issues.length > 0) {
    console.log('ISSUES FOUND:');
    issues.forEach(issue => console.log(`  ❌ ${issue}`));
    console.log();
    console.log('ACTION NEEDED: Add missing recharge records to get accurate consumption');
  } else {
    console.log('✅ No missing recharges detected');
    console.log('✅ All meter increases are accounted for by logged recharges');
    console.log('✅ The 3117 kWh consumption appears to be CORRECT');
  }

  console.log('\n' + '='.repeat(100));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
