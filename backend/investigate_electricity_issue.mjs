import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateElectricityIssue() {
  try {
    console.log('🔍 INVESTIGATING NEGATIVE ELECTRICITY ISSUE\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Get the problematic batches
    const problematicBatches = ['UD-DRY-00009', 'UD-DRY-00006'];

    for (const batchNumber of problematicBatches) {
      const process = await prisma.dryingProcess.findUnique({
        where: { batchNumber },
        include: {
          readings: {
            orderBy: { readingTime: 'asc' }
          }
        }
      });

      if (!process) {
        console.log(`❌ Batch ${batchNumber} not found\n`);
        continue;
      }

      console.log(`╔═══════════════════════════════════════════════════════════════════════════════╗`);
      console.log(`║ BATCH: ${batchNumber}`);
      console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\n`);

      console.log(`Start Time: ${process.startTime.toISOString()}`);
      console.log(`End Time: ${process.endTime ? process.endTime.toISOString() : 'In Progress'}`);
      console.log(`Starting Electricity Units: ${process.startingElectricityUnits || 'Not recorded'}`);
      console.log(`\nTotal Readings: ${process.readings.length}\n`);

      if (process.readings.length === 0) {
        console.log('⚠️  No readings found for this batch!\n');
        continue;
      }

      console.log('📊 ALL ELECTRICITY METER READINGS:\n');
      console.log('   #  | Date & Time              | Electricity Meter | Humidity | Difference');
      console.log('   ───┼──────────────────────────┼──────────────────┼──────────┼────────────');

      let previousReading = null;
      process.readings.forEach((reading, idx) => {
        const date = new Date(reading.readingTime).toISOString().replace('T', ' ').substring(0, 19);
        const meter = reading.electricityMeter;
        const humidity = reading.humidity;

        let difference = '';
        if (previousReading !== null) {
          const diff = meter - previousReading;
          difference = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
        } else {
          difference = '(First)';
        }

        console.log(`   ${String(idx + 1).padStart(2)} | ${date} | ${meter.toFixed(2).padStart(16)} | ${humidity.toFixed(1).padStart(8)} | ${difference}`);

        previousReading = meter;
      });

      console.log('\n   📈 ANALYSIS:\n');

      const firstReading = process.readings[0].electricityMeter;
      const lastReading = process.readings[process.readings.length - 1].electricityMeter;
      const calculatedDifference = lastReading - firstReading;

      console.log(`   First Reading: ${firstReading.toFixed(2)} kWh`);
      console.log(`   Last Reading: ${lastReading.toFixed(2)} kWh`);
      console.log(`   Calculated Difference: ${calculatedDifference.toFixed(2)} kWh`);

      if (calculatedDifference < 0) {
        console.log(`\n   ❌ PROBLEM IDENTIFIED: Last reading is LESS than first reading!`);
        console.log(`   \n   🔍 POSSIBLE CAUSES:`);
        console.log(`      1. Electricity meter was recharged/reset between readings`);
        console.log(`      2. Readings were entered in wrong order`);
        console.log(`      3. Manual entry error\n`);

        // Check if startingElectricityUnits was set
        if (process.startingElectricityUnits !== null) {
          console.log(`   💡 SOLUTION: Use startingElectricityUnits instead of first reading`);
          console.log(`      Starting Units (from process): ${process.startingElectricityUnits}`);
          console.log(`      Last Reading: ${lastReading.toFixed(2)}`);

          // Check if we should use absolute difference method
          console.log(`\n   🔧 RECOMMENDED CALCULATION METHOD:`);
          console.log(`      Since the meter decreased, we should calculate electricity used by:`);
          console.log(`      1. Sum up all POSITIVE differences between consecutive readings`);
          console.log(`      2. This gives us actual kWh consumed during the process\n`);

          let totalPositiveDifferences = 0;
          for (let i = 1; i < process.readings.length; i++) {
            const diff = process.readings[i].electricityMeter - process.readings[i - 1].electricityMeter;
            if (diff > 0) {
              totalPositiveDifferences += diff;
              console.log(`      Reading ${i} to ${i+1}: +${diff.toFixed(2)} kWh`);
            } else if (diff < 0) {
              console.log(`      Reading ${i} to ${i+1}: ${diff.toFixed(2)} kWh (METER RESET - skip)`);
            }
          }

          console.log(`\n      ✅ CORRECT ELECTRICITY USED: ${totalPositiveDifferences.toFixed(2)} kWh`);
        }
      } else {
        console.log(`\n   ✅ No issues: Normal electricity consumption of ${calculatedDifference.toFixed(2)} kWh`);
      }

      console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');
    }

    // Now check all batches for this pattern
    console.log('🔍 CHECKING ALL COMPLETED BATCHES FOR NEGATIVE ELECTRICITY...\n');

    const allProcesses = await prisma.dryingProcess.findMany({
      where: { status: 'COMPLETED' },
      include: {
        readings: {
          orderBy: { readingTime: 'asc' }
        }
      }
    });

    let negativeCount = 0;
    const negativeProcesses = [];

    allProcesses.forEach(process => {
      if (process.readings.length > 0) {
        const first = process.readings[0].electricityMeter;
        const last = process.readings[process.readings.length - 1].electricityMeter;
        const diff = last - first;

        if (diff < 0) {
          negativeCount++;
          negativeProcesses.push({
            batchNumber: process.batchNumber,
            first,
            last,
            diff
          });
        }
      }
    });

    console.log(`📊 SUMMARY:`);
    console.log(`   Total completed batches: ${allProcesses.length}`);
    console.log(`   Batches with negative electricity: ${negativeCount} (${((negativeCount/allProcesses.length)*100).toFixed(1)}%)\n`);

    if (negativeCount > 0) {
      console.log('   ⚠️  Batches with negative electricity:\n');
      negativeProcesses.forEach(p => {
        console.log(`   - ${p.batchNumber}: ${p.first.toFixed(2)} → ${p.last.toFixed(2)} = ${p.diff.toFixed(2)} kWh`);
      });

      console.log('\n   🔧 SOLUTION NEEDED:');
      console.log('   The cost calculation must:');
      console.log('   1. Detect when meter reading decreases (meter reset/recharge)');
      console.log('   2. Sum only POSITIVE differences between consecutive readings');
      console.log('   3. This gives accurate electricity consumption\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateElectricityIssue();
