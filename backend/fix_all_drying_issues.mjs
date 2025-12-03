import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING ALL DRYING PROCESS ISSUES ===\n');

  // Standard Luku rate: 1,000,000 TSH for 2807 kWh
  const STANDARD_RATE = 1000000 / 2807; // 356.25 TSH/kWh

  let fixedCount = 0;

  // Fix 1: Update missing payment amounts for recharges
  console.log('STEP 1: Fixing missing payment amounts\n');

  const rechargesWithZeroPaid = await prisma.electricityRecharge.findMany({
    where: { totalPaid: 0 },
    include: { dryingProcess: true }
  });

  for (const recharge of rechargesWithZeroPaid) {
    const calculatedPaid = Math.round(recharge.kwhAmount * STANDARD_RATE);

    console.log(`  ${recharge.dryingProcess.batchNumber}:`);
    console.log(`    Token: ${recharge.token}`);
    console.log(`    kWh: ${recharge.kwhAmount}`);
    console.log(`    Calculated payment: ${calculatedPaid.toLocaleString()} TSH`);

    await prisma.electricityRecharge.update({
      where: { id: recharge.id },
      data: { totalPaid: calculatedPaid }
    });

    console.log(`    ✓ Updated\n`);
    fixedCount++;
  }

  // Fix 2: Fix timestamp issues for readings that show meter after recharge
  console.log('\nSTEP 2: Fixing timestamp issues for post-recharge readings\n');

  const processesWithRecharges = await prisma.dryingProcess.findMany({
    where: {
      status: 'COMPLETED',
      recharges: { some: {} }
    },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  for (const process of processesWithRecharges) {
    for (const recharge of process.recharges) {
      const meterAfter = recharge.meterReadingAfter;
      const rechargeTime = new Date(recharge.rechargeDate);

      // Find reading with exact meter value after recharge
      const matchingReading = process.readings.find(r => r.electricityMeter === meterAfter);

      if (matchingReading) {
        const readingTime = new Date(matchingReading.readingTime);

        if (readingTime < rechargeTime) {
          console.log(`  ${process.batchNumber}:`);
          console.log(`    Recharge at: ${rechargeTime}`);
          console.log(`    Reading timestamp WRONG: ${readingTime}`);
          console.log(`    Meter value: ${meterAfter} kWh`);

          // Set reading time to be right after recharge (add 1 minute)
          const correctedTime = new Date(rechargeTime.getTime() + 60000);

          await prisma.dryingReading.update({
            where: { id: matchingReading.id },
            data: { readingTime: correctedTime }
          });

          console.log(`    ✓ Fixed to: ${correctedTime}\n`);
          fixedCount++;
        }
      }
    }
  }

  // Fix 3: Handle processes with missing recharge records (meter increased without recharge)
  console.log('\nSTEP 3: Checking for missing recharge records\n');

  const allProcesses = await prisma.dryingProcess.findMany({
    where: { status: 'COMPLETED' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  const missingRecharges = [];

  for (const process of allProcesses) {
    if (process.readings.length === 0) continue;

    let prevReading = process.startingElectricityUnits || process.readings[0]?.electricityMeter;
    let prevTime = new Date(process.startTime);

    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const currentTime = new Date(reading.readingTime);
      const currentReading = reading.electricityMeter;

      // Check for recharge between readings
      const rechargesBetween = process.recharges.filter(r => {
        const rDate = new Date(r.rechargeDate);
        return rDate > prevTime && rDate <= currentTime;
      });

      // If meter went up but no recharge found, it's likely missing from DB
      if (rechargesBetween.length === 0 && currentReading > prevReading) {
        const increase = currentReading - prevReading;

        // Only flag significant increases (> 100 kWh) as potential recharges
        if (increase > 100) {
          missingRecharges.push({
            batchNumber: process.batchNumber,
            readingNumber: i + 1,
            prevReading: prevReading,
            currentReading: currentReading,
            increase: increase,
            timestamp: reading.readingTime
          });
        }
      }

      prevReading = currentReading;
      prevTime = currentTime;
    }
  }

  if (missingRecharges.length > 0) {
    console.log(`  ⚠️  Found ${missingRecharges.length} potential missing recharge(s):\n`);
    missingRecharges.forEach(item => {
      console.log(`    ${item.batchNumber} - Reading ${item.readingNumber}:`);
      console.log(`      Meter jumped: ${item.prevReading?.toFixed(2)} → ${item.currentReading} (+${item.increase.toFixed(2)} kWh)`);
      console.log(`      Time: ${item.timestamp}`);
      console.log(`      ACTION NEEDED: Add missing recharge record manually\n`);
    });
  } else {
    console.log(`  ✓ No missing recharge records detected\n`);
  }

  console.log('='.repeat(80));
  console.log(`\n✅ Fixed ${fixedCount} issues automatically\n`);

  if (missingRecharges.length > 0) {
    console.log(`⚠️  ${missingRecharges.length} processes need manual review (missing recharge records)\n`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
