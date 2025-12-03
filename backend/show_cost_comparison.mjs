import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== COST COMPARISON: BEFORE vs AFTER FIXING MISSING RECHARGES ===\n');

  const STANDARD_RATE = 356.25; // TSH per kWh

  const processesWithIssues = [
    'UD-DRY-00001',
    'UD-DRY-00002',
    'UD-DRY-00003',
    'UD-DRY-00005',
    'UD-DRY-00007',
    'UD-DRY-00008'
  ];

  const results = [];

  for (const batchNumber of processesWithIssues) {
    const process = await prisma.dryingProcess.findUnique({
      where: { batchNumber },
      include: {
        readings: { orderBy: { readingTime: 'asc' } },
        recharges: { orderBy: { rechargeDate: 'asc' } }
      }
    });

    // Calculate CURRENT consumption (WRONG - missing recharges)
    let currentConsumption = 0;
    let prevReading = process.startingElectricityUnits;
    let prevTime = new Date(process.startTime);

    for (const reading of process.readings) {
      const currentTime = new Date(reading.readingTime);
      const currentReading = reading.electricityMeter;

      const rechargesBetween = process.recharges.filter(r => {
        const rDate = new Date(r.rechargeDate);
        return rDate > prevTime && rDate <= currentTime;
      });

      if (rechargesBetween.length > 0) {
        const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
        const consumed = prevReading + totalRecharged - currentReading;
        currentConsumption += Math.max(0, consumed);
      } else {
        const consumed = prevReading - currentReading;
        if (consumed > 0) {
          currentConsumption += consumed;
        }
      }

      prevReading = currentReading;
      prevTime = currentTime;
    }

    // Calculate CORRECT consumption (with missing recharges added)
    let correctConsumption = 0;
    prevReading = process.startingElectricityUnits;
    prevTime = new Date(process.startTime);

    // Identify missing recharges
    const missingRecharges = [];
    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const currentTime = new Date(reading.readingTime);
      const currentReading = reading.electricityMeter;

      const rechargesBetween = process.recharges.filter(r => {
        const rDate = new Date(r.rechargeDate);
        return rDate > prevTime && rDate <= currentTime;
      });

      const meterChange = currentReading - prevReading;

      if (rechargesBetween.length === 0 && meterChange > 100) {
        missingRecharges.push({
          kwhAmount: Math.round(meterChange),
          betweenReadings: [i > 0 ? i : 'start', i + 1]
        });
      }

      prevReading = currentReading;
      prevTime = currentTime;
    }

    // Recalculate with missing recharges included
    prevReading = process.startingElectricityUnits;
    prevTime = new Date(process.startTime);

    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const currentTime = new Date(reading.readingTime);
      const currentReading = reading.electricityMeter;

      // Check existing recharges
      const existingRecharges = process.recharges.filter(r => {
        const rDate = new Date(r.rechargeDate);
        return rDate > prevTime && rDate <= currentTime;
      });

      // Check if this reading has a missing recharge
      const meterChange = currentReading - prevReading;
      const hasMissingRecharge = meterChange > 100 && existingRecharges.length === 0;

      if (existingRecharges.length > 0 || hasMissingRecharge) {
        const totalRecharged = hasMissingRecharge
          ? Math.round(meterChange)
          : existingRecharges.reduce((sum, r) => sum + r.kwhAmount, 0);

        const consumed = prevReading + totalRecharged - currentReading;
        correctConsumption += Math.max(0, consumed);
      } else {
        const consumed = prevReading - currentReading;
        if (consumed > 0) {
          correctConsumption += consumed;
        }
      }

      prevReading = currentReading;
      prevTime = currentTime;
    }

    // Calculate costs
    const startTime = new Date(process.startTime);
    const endTime = new Date(process.readings[process.readings.length - 1]?.readingTime || process.endTime);
    const runningHours = (endTime - startTime) / (1000 * 60 * 60);

    const depreciationCost = runningHours * 6000;

    const currentElectricityCost = currentConsumption * STANDARD_RATE;
    const currentTotalCost = currentElectricityCost + depreciationCost;

    const correctElectricityCost = correctConsumption * STANDARD_RATE;
    const correctTotalCost = correctElectricityCost + depreciationCost;

    results.push({
      batchNumber,
      currentConsumption,
      correctConsumption,
      missingKwh: correctConsumption - currentConsumption,
      missingRechargesCount: missingRecharges.length,
      currentCost: currentTotalCost,
      correctCost: correctTotalCost,
      costDifference: correctTotalCost - currentTotalCost,
      depreciationCost
    });
  }

  // Display table
  console.log('┌─────────────────┬──────────────┬──────────────┬──────────────┬─────────────┬──────────────────┬──────────────────┬──────────────────┐');
  console.log('│ Batch Number    │ Luku BEFORE  │ Luku AFTER   │ Missing kWh  │ Missing     │ Cost BEFORE      │ Cost AFTER       │ Cost DIFFERENCE  │');
  console.log('│                 │ (Wrong)      │ (Correct)    │              │ Recharges   │ (Wrong)          │ (Correct)        │                  │');
  console.log('├─────────────────┼──────────────┼──────────────┼──────────────┼─────────────┼──────────────────┼──────────────────┼──────────────────┤');

  results.forEach(r => {
    const batch = r.batchNumber.padEnd(15);
    const lukuBefore = `${r.currentConsumption.toFixed(1)} kWh`.padEnd(12);
    const lukuAfter = `${r.correctConsumption.toFixed(1)} kWh`.padEnd(12);
    const missingKwh = `${r.missingKwh.toFixed(1)} kWh`.padEnd(12);
    const missingCount = String(r.missingRechargesCount).padEnd(11);
    const costBefore = `${r.currentCost.toFixed(0)} TSH`.padStart(16);
    const costAfter = `${r.correctCost.toFixed(0)} TSH`.padStart(16);
    const costDiff = `+${r.costDifference.toFixed(0)} TSH`.padStart(16);

    console.log(`│ ${batch} │ ${lukuBefore} │ ${lukuAfter} │ ${missingKwh} │ ${missingCount} │ ${costBefore} │ ${costAfter} │ ${costDiff} │`);
  });

  console.log('└─────────────────┴──────────────┴──────────────┴──────────────┴─────────────┴──────────────────┴──────────────────┴──────────────────┘');

  // Summary
  const totalMissingKwh = results.reduce((sum, r) => sum + r.missingKwh, 0);
  const totalCostDifference = results.reduce((sum, r) => sum + r.costDifference, 0);
  const totalMissingRecharges = results.reduce((sum, r) => sum + r.missingRechargesCount, 0);

  console.log('\n' + '='.repeat(140));
  console.log('SUMMARY');
  console.log('='.repeat(140));
  console.log(`\nTotal processes affected: ${results.length}`);
  console.log(`Total missing recharges: ${totalMissingRecharges}`);
  console.log(`Total missing electricity: ${totalMissingKwh.toFixed(1)} kWh`);
  console.log(`Total cost underestimated by: ${totalCostDifference.toFixed(2)} TSH (${(totalCostDifference / 1000000).toFixed(2)} Million TSH)`);
  console.log();

  // Explanation
  console.log('='.repeat(140));
  console.log('WHY THE DIFFERENCE?');
  console.log('='.repeat(140));
  console.log();
  console.log('BEFORE (Wrong Calculation):');
  console.log('  - Missing recharge records in database');
  console.log('  - System thinks meter "jumped" magically without recharge');
  console.log('  - Consumption is counted INCORRECTLY (includes the recharge amount as consumption)');
  console.log('  - Example: Meter 100 → 2000 counted as "used 1900 kWh" (WRONG!)');
  console.log();
  console.log('AFTER (Correct Calculation):');
  console.log('  - All recharge records added to database');
  console.log('  - System knows: 100 kWh left, then recharged +1900 kWh = 2000 kWh total');
  console.log('  - If next reading is 1800, consumption = 100 + 1900 - 1800 = 200 kWh (CORRECT!)');
  console.log();
  console.log('IMPACT:');
  console.log('  - Costs were UNDER-CALCULATED by ' + (totalCostDifference / 1000000).toFixed(2) + ' Million TSH');
  console.log('  - This is the TRUE electricity cost that was paid but not recorded');
  console.log('  - After fixing, costs will reflect ACTUAL electricity consumption');
  console.log();
  console.log('='.repeat(140));
  console.log();

  // Detailed breakdown per process
  console.log('DETAILED BREAKDOWN PER PROCESS:');
  console.log('='.repeat(140));
  console.log();

  for (const r of results) {
    console.log(`${r.batchNumber}:`);
    console.log(`  Missing ${r.missingRechargesCount} recharge(s) totaling ${r.missingKwh.toFixed(1)} kWh`);
    console.log(`  Current (wrong) consumption: ${r.currentConsumption.toFixed(1)} kWh`);
    console.log(`  Correct consumption: ${r.correctConsumption.toFixed(1)} kWh`);
    console.log(`  `);
    console.log(`  Current (wrong) electricity cost: ${(r.currentCost - r.depreciationCost).toFixed(2)} TSH`);
    console.log(`  Correct electricity cost: ${(r.correctCost - r.depreciationCost).toFixed(2)} TSH`);
    console.log(`  Depreciation (unchanged): ${r.depreciationCost.toFixed(2)} TSH`);
    console.log(`  `);
    console.log(`  Cost increase: +${r.costDifference.toFixed(2)} TSH`);
    console.log();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
