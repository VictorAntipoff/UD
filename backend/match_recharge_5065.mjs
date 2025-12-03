import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== MATCHING TOKEN 5065 (Nov 5, 2025) TO CORRECT PROCESS ===\n');

  const rechargeDate = new Date('2025-11-05T17:23:00');

  // Check the orphaned recharge
  const recharge = await prisma.electricityRecharge.findFirst({
    where: { token: { contains: '5065' } }
  });

  console.log('ORPHANED RECHARGE:');
  console.log('─'.repeat(80));
  console.log(`Token: ${recharge.token}`);
  console.log(`Date: ${recharge.rechargeDate}`);
  console.log(`kWh: ${recharge.kwhAmount}`);
  console.log(`Paid: ${recharge.totalPaid.toLocaleString()} TSH`);
  console.log(`Assigned to process: ${recharge.dryingProcessId || 'NONE (orphaned)'}`);

  // Find processes active on Nov 5, 2025
  console.log('\n\nPROCESSES ACTIVE ON NOV 5, 2025:');
  console.log('─'.repeat(80));

  const processes = await prisma.dryingProcess.findMany({
    where: {
      startTime: { lte: rechargeDate }
    },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: true
    },
    orderBy: { startTime: 'desc' }
  });

  const candidates = [];

  for (const process of processes) {
    const endTime = process.endTime ? new Date(process.endTime) : new Date();

    // Skip if process ended before the recharge
    if (process.endTime && endTime < rechargeDate) {
      continue;
    }

    console.log(`\n${process.batchNumber}:`);
    console.log(`  Start: ${process.startTime}`);
    console.log(`  End: ${process.endTime || 'Not ended'}`);
    console.log(`  Starting Meter: ${process.startingElectricityUnits} kWh`);
    console.log(`  Status: ${process.status}`);

    // Look for meter increase around 1680 kWh
    let prevReading = process.startingElectricityUnits;
    let prevTime = new Date(process.startTime);
    let foundMatch = false;

    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const readingTime = new Date(reading.readingTime);
      const increase = reading.electricityMeter - prevReading;

      // Check if meter increased by approximately 1680 kWh
      if (increase > 1500 && increase < 1800) {
        // Check if timing makes sense (reading should be after or around recharge time)
        const timeDiff = Math.abs(readingTime - rechargeDate) / (1000 * 60 * 60); // hours

        console.log(`  ⚡ POTENTIAL MATCH at Reading ${i + 1}:`);
        console.log(`     Meter: ${prevReading} → ${reading.electricityMeter} (+${increase.toFixed(2)} kWh)`);
        console.log(`     Reading time: ${reading.readingTime}`);
        console.log(`     Time diff from recharge: ${timeDiff.toFixed(1)} hours`);

        if (timeDiff < 48) { // Within 2 days
          console.log(`     ✅ STRONG MATCH - timing and kWh align!`);
          candidates.push({
            process: process.batchNumber,
            processId: process.id,
            readingIndex: i + 1,
            increase: increase,
            timeDiff: timeDiff,
            confidence: 'HIGH'
          });
          foundMatch = true;
        } else {
          console.log(`     ⚠️  Timing is off (${timeDiff.toFixed(1)} hours difference)`);
          candidates.push({
            process: process.batchNumber,
            processId: process.id,
            readingIndex: i + 1,
            increase: increase,
            timeDiff: timeDiff,
            confidence: 'MEDIUM'
          });
        }
      }

      prevReading = reading.electricityMeter;
      prevTime = readingTime;
    }

    if (!foundMatch) {
      console.log(`  ❌ No meter increase matching 1680 kWh found`);
    }

    // Show existing recharges
    if (process.recharges.length > 0) {
      console.log(`  Existing recharges:`);
      process.recharges.forEach(r => {
        console.log(`     Token ${r.token}: ${r.kwhAmount} kWh on ${r.rechargeDate}`);
      });
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('RECOMMENDATION');
  console.log('='.repeat(80));

  if (candidates.length === 0) {
    console.log('\n❌ No matching process found for Token 5065');
    console.log('   This recharge might have been manually entered or belongs to unknown process');
  } else {
    console.log(`\n✅ Found ${candidates.length} candidate(s):\n`);

    candidates.forEach((c, i) => {
      console.log(`${i + 1}. ${c.process}`);
      console.log(`   Reading ${c.readingIndex}: +${c.increase.toFixed(2)} kWh`);
      console.log(`   Time difference: ${c.timeDiff.toFixed(1)} hours`);
      console.log(`   Confidence: ${c.confidence}`);
      console.log();
    });

    const bestMatch = candidates.sort((a, b) => {
      if (a.confidence === 'HIGH' && b.confidence !== 'HIGH') return -1;
      if (b.confidence === 'HIGH' && a.confidence !== 'HIGH') return 1;
      return a.timeDiff - b.timeDiff;
    })[0];

    console.log('─'.repeat(80));
    console.log(`BEST MATCH: ${bestMatch.process}`);
    console.log('─'.repeat(80));
    console.log(`\nToken 5065 (1680 kWh, 600,000 TSH) should be assigned to ${bestMatch.process}`);
    console.log(`This will fix the consumption calculation for that process.`);
  }

  console.log('\n' + '='.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
