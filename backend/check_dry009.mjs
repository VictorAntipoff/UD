import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== INVESTIGATING UD-DRY-00009 ===\n');

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00009' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } },
      items: { include: { woodType: true } }
    }
  });

  if (!process) {
    console.log('❌ UD-DRY-00009 not found in database\n');
    return;
  }

  console.log('PROCESS INFO:');
  console.log('─'.repeat(80));
  console.log(`Batch Number: ${process.batchNumber}`);
  console.log(`Status: ${process.status}`);
  console.log(`Start: ${process.startTime}`);
  console.log(`End: ${process.endTime || 'Not ended'}`);
  console.log(`Starting Meter: ${process.startingElectricityUnits} kWh`);
  console.log(`Current Cost: ${process.totalCost?.toFixed(2) || 'N/A'} TSH`);
  console.log();

  if (process.items && process.items.length > 0) {
    console.log('Items:');
    process.items.forEach(item => {
      console.log(`  - ${item.description || `${item.quantity} pieces`}`);
    });
    console.log();
  }

  console.log('RECHARGES:');
  console.log('─'.repeat(80));
  if (process.recharges.length === 0) {
    console.log('❌ No recharges found\n');
  } else {
    process.recharges.forEach((r, i) => {
      console.log(`\nRecharge ${i + 1}:`);
      console.log(`  Date: ${r.rechargeDate}`);
      console.log(`  Token: ${r.token}`);
      console.log(`  kWh Amount: ${r.kwhAmount}`);
      console.log(`  Total Paid: ${r.totalPaid.toLocaleString()} TSH`);
      console.log(`  Meter After: ${r.meterReadingAfter} kWh`);
      console.log(`  Rate: ${r.totalPaid > 0 ? (r.totalPaid / r.kwhAmount).toFixed(2) : 'N/A'} TSH/kWh`);

      // Check for issues
      const issues = [];
      if (r.totalPaid === 0) issues.push('⚠️  Payment amount is 0');
      if (r.meterReadingAfter > 10000) issues.push('⚠️  Meter reading suspiciously high');
      if (!r.kwhAmount) issues.push('❌ Missing kWh amount');

      if (issues.length > 0) {
        console.log(`  Issues: ${issues.join(', ')}`);
      }
    });
  }

  console.log('\n\nREADINGS:');
  console.log('─'.repeat(80));
  if (process.readings.length === 0) {
    console.log('❌ No readings found\n');
  } else {
    let prevReading = process.startingElectricityUnits;
    let prevTime = new Date(process.startTime);

    console.log(`\nStart: ${process.startTime}`);
    console.log(`  Meter: ${prevReading} kWh\n`);

    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const currentTime = new Date(reading.readingTime);
      const currentReading = reading.electricityMeter;

      // Check for recharges between
      const rechargesBetween = process.recharges.filter(r => {
        const rDate = new Date(r.rechargeDate);
        return rDate > prevTime && rDate <= currentTime;
      });

      const meterChange = currentReading - prevReading;
      const timeDiff = (currentTime - prevTime) / (1000 * 60 * 60); // hours

      console.log(`Reading ${i + 1}: ${reading.readingTime}`);
      console.log(`  Meter: ${currentReading} kWh`);
      console.log(`  Change: ${prevReading?.toFixed(2)} → ${currentReading} = ${meterChange > 0 ? '+' : ''}${meterChange.toFixed(2)} kWh`);
      console.log(`  Time since prev: ${timeDiff.toFixed(1)} hours`);

      // Analyze issues
      if (rechargesBetween.length > 0) {
        console.log(`  ✓ Recharge found: +${rechargesBetween[0].kwhAmount} kWh`);
        const consumed = prevReading + rechargesBetween[0].kwhAmount - currentReading;
        console.log(`  Consumption: ${prevReading.toFixed(2)} + ${rechargesBetween[0].kwhAmount} - ${currentReading} = ${consumed.toFixed(2)} kWh`);
      } else if (meterChange > 100) {
        console.log(`  ❌ MISSING RECHARGE: Meter increased by ${meterChange.toFixed(2)} kWh without logged recharge`);
      } else if (meterChange > 0) {
        console.log(`  ⚠️  Meter increased slightly (+${meterChange.toFixed(2)} kWh) - possible error or small recharge`);
      } else {
        const consumed = prevReading - currentReading;
        console.log(`  Consumption: ${consumed.toFixed(2)} kWh`);
      }

      // Check timestamp issues
      if (i > 0) {
        const prevReadingTime = new Date(process.readings[i - 1].readingTime);
        if (currentTime < prevReadingTime) {
          console.log(`  ❌ TIMESTAMP ERROR: This reading is BEFORE the previous reading`);
        }
      }

      console.log();

      prevReading = currentReading;
      prevTime = currentTime;
    }
  }

  // Calculate total consumption
  console.log('\nCONSUMPTION CALCULATION:');
  console.log('─'.repeat(80));

  let totalConsumption = 0;
  let prevReading2 = process.startingElectricityUnits;
  let prevTime2 = new Date(process.startTime);

  for (const reading of process.readings) {
    const currentTime = new Date(reading.readingTime);
    const currentReading = reading.electricityMeter;

    const rechargesBetween = process.recharges.filter(r => {
      const rDate = new Date(r.rechargeDate);
      return rDate > prevTime2 && rDate <= currentTime;
    });

    if (rechargesBetween.length > 0) {
      const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
      const consumed = prevReading2 + totalRecharged - currentReading;
      totalConsumption += Math.max(0, consumed);
    } else {
      const consumed = prevReading2 - currentReading;
      if (consumed > 0) {
        totalConsumption += consumed;
      }
    }

    prevReading2 = currentReading;
    prevTime2 = currentTime;
  }

  console.log(`Total Electricity Consumed: ${totalConsumption.toFixed(2)} kWh\n`);

  // Calculate costs
  if (process.status === 'COMPLETED') {
    const startTime = new Date(process.startTime);
    const endTime = new Date(process.endTime || process.readings[process.readings.length - 1]?.readingTime);
    const runningHours = (endTime - startTime) / (1000 * 60 * 60);

    const electricityRate = 356.25; // TSH/kWh
    const electricityCost = totalConsumption * electricityRate;
    const depreciationCost = runningHours * 6000;
    const totalCost = electricityCost + depreciationCost;

    console.log('COST CALCULATION:');
    console.log('─'.repeat(80));
    console.log(`Running Time: ${runningHours.toFixed(2)} hours`);
    console.log(`Electricity: ${totalConsumption.toFixed(2)} kWh × 356.25 TSH/kWh = ${electricityCost.toFixed(2)} TSH`);
    console.log(`Depreciation: ${runningHours.toFixed(2)} hrs × 6,000 TSH/hr = ${depreciationCost.toFixed(2)} TSH`);
    console.log(`TOTAL COST: ${totalCost.toFixed(2)} TSH`);
    console.log();

    console.log(`Current stored cost: ${process.totalCost?.toFixed(2) || 'N/A'} TSH`);
    if (process.totalCost) {
      const difference = totalCost - process.totalCost;
      console.log(`Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(2)} TSH`);
    }
    console.log();
  }

  // Summary of issues
  console.log('ISSUES FOUND:');
  console.log('─'.repeat(80));

  const issues = [];

  if (!process.startingElectricityUnits) {
    issues.push('❌ Missing starting electricity value');
  }

  if (process.recharges.length === 0 && process.readings.length > 0) {
    // Check if there are meter increases
    let hasIncrease = false;
    let prev = process.startingElectricityUnits;
    for (const r of process.readings) {
      if (r.electricityMeter > prev && (r.electricityMeter - prev) > 100) {
        hasIncrease = true;
        break;
      }
      prev = r.electricityMeter;
    }
    if (hasIncrease) {
      issues.push('⚠️  Meter increases detected but no recharges logged');
    }
  }

  for (const recharge of process.recharges) {
    if (recharge.totalPaid === 0) {
      issues.push(`⚠️  Recharge ${recharge.token} has payment = 0`);
    }
    if (recharge.meterReadingAfter > 10000) {
      issues.push(`⚠️  Recharge ${recharge.token} meter reading suspiciously high: ${recharge.meterReadingAfter}`);
    }
  }

  // Check for timestamp issues
  let prev = process.startingElectricityUnits;
  let prevTime = new Date(process.startTime);
  for (let i = 0; i < process.readings.length; i++) {
    const reading = process.readings[i];
    const currTime = new Date(reading.readingTime);
    const meterChange = reading.electricityMeter - prev;

    if (currTime < prevTime) {
      issues.push(`❌ Reading ${i + 1} timestamp is before previous reading`);
    }

    const rechargesBetween = process.recharges.filter(r => {
      const rDate = new Date(r.rechargeDate);
      return rDate > prevTime && rDate <= currTime;
    });

    if (rechargesBetween.length === 0 && meterChange > 100) {
      issues.push(`❌ Reading ${i + 1} shows meter increase of ${meterChange.toFixed(2)} kWh without logged recharge`);
    }

    prev = reading.electricityMeter;
    prevTime = currTime;
  }

  if (issues.length === 0) {
    console.log('✅ No issues found - everything looks good!\n');
  } else {
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
