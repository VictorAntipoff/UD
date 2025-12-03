import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== COMPREHENSIVE RECHARGE AUDIT ===\n');

  // 1. Find orphaned recharges (not assigned to any process)
  console.log('1. ORPHANED RECHARGES (No Process Assignment):');
  console.log('─'.repeat(100));

  const orphanedRecharges = await prisma.electricityRecharge.findMany({
    where: { dryingProcessId: null }
  });

  if (orphanedRecharges.length === 0) {
    console.log('✅ No orphaned recharges found\n');
  } else {
    console.log(`❌ Found ${orphanedRecharges.length} orphaned recharge(s):\n`);
    orphanedRecharges.forEach((r, i) => {
      console.log(`${i + 1}. Token: ${r.token}`);
      console.log(`   Date: ${r.rechargeDate}`);
      console.log(`   kWh: ${r.kwhAmount}`);
      console.log(`   Paid: ${r.totalPaid.toLocaleString()} TSH`);
      console.log(`   Meter After: ${r.meterReadingAfter} kWh`);
      console.log();
    });
  }

  // 2. Find recharges with wrong timestamps (after process ended)
  console.log('\n2. RECHARGES WITH TIMESTAMP ISSUES (After Process End):');
  console.log('─'.repeat(100));

  const allRecharges = await prisma.electricityRecharge.findMany({
    include: { dryingProcess: true }
  });

  const wrongTimestamps = [];

  for (const recharge of allRecharges) {
    if (!recharge.dryingProcess) continue;

    const rechargeDate = new Date(recharge.rechargeDate);
    const processStart = new Date(recharge.dryingProcess.startTime);
    const processEnd = recharge.dryingProcess.endTime ? new Date(recharge.dryingProcess.endTime) : null;

    // Check if recharge is before process started
    if (rechargeDate < processStart) {
      wrongTimestamps.push({
        token: recharge.token,
        process: recharge.dryingProcess.batchNumber,
        issue: 'BEFORE_START',
        rechargeDate: recharge.rechargeDate,
        processStart: recharge.dryingProcess.startTime,
        processEnd: recharge.dryingProcess.endTime
      });
    }

    // Check if recharge is after process ended
    if (processEnd && rechargeDate > processEnd) {
      wrongTimestamps.push({
        token: recharge.token,
        process: recharge.dryingProcess.batchNumber,
        issue: 'AFTER_END',
        rechargeDate: recharge.rechargeDate,
        processStart: recharge.dryingProcess.startTime,
        processEnd: recharge.dryingProcess.endTime
      });
    }
  }

  if (wrongTimestamps.length === 0) {
    console.log('✅ No timestamp issues found\n');
  } else {
    console.log(`❌ Found ${wrongTimestamps.length} recharge(s) with timestamp issues:\n`);
    wrongTimestamps.forEach((r, i) => {
      console.log(`${i + 1}. ${r.process} - Token ${r.token}`);
      console.log(`   Issue: ${r.issue === 'BEFORE_START' ? 'Recharge BEFORE process started' : 'Recharge AFTER process ended'}`);
      console.log(`   Recharge date: ${r.rechargeDate}`);
      console.log(`   Process: ${r.processStart} to ${r.processEnd}`);
      console.log();
    });
  }

  // 3. Find missing recharges (meter increases without logged recharge)
  console.log('\n3. MISSING RECHARGES (Meter Increases Without Records):');
  console.log('─'.repeat(100));

  const processes = await prisma.dryingProcess.findMany({
    where: { status: 'COMPLETED' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    },
    orderBy: { batchNumber: 'asc' }
  });

  const missingRecharges = [];

  for (const process of processes) {
    if (process.readings.length === 0) continue;

    let prevReading = process.startingElectricityUnits;
    let prevTime = new Date(process.startTime);

    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const currentTime = new Date(reading.readingTime);
      const currentReading = reading.electricityMeter;
      const meterChange = currentReading - prevReading;

      // Check for recharges between
      const rechargesBetween = process.recharges.filter(r => {
        const rDate = new Date(r.rechargeDate);
        return rDate > prevTime && rDate <= currentTime;
      });

      // If meter increased significantly without a logged recharge
      if (rechargesBetween.length === 0 && meterChange > 100) {
        missingRecharges.push({
          process: process.batchNumber,
          processId: process.id,
          readingNumber: i + 1,
          readingDate: reading.readingTime,
          prevMeter: prevReading,
          currentMeter: currentReading,
          increase: meterChange
        });
      }

      prevReading = currentReading;
      prevTime = currentTime;
    }
  }

  if (missingRecharges.length === 0) {
    console.log('✅ No missing recharges detected\n');
  } else {
    console.log(`❌ Found ${missingRecharges.length} missing recharge(s):\n`);
    missingRecharges.forEach((r, i) => {
      console.log(`${i + 1}. ${r.process} - Reading ${r.readingNumber}`);
      console.log(`   Date: ${r.readingDate}`);
      console.log(`   Meter: ${r.prevMeter?.toFixed(2)} → ${r.currentMeter} kWh`);
      console.log(`   Missing ~${Math.round(r.increase)} kWh recharge`);
      console.log(`   Estimated cost: ~${Math.round(r.increase * 356.25).toLocaleString()} TSH`);
      console.log();
    });
  }

  // 4. Recharges with payment = 0
  console.log('\n4. RECHARGES WITH ZERO PAYMENT:');
  console.log('─'.repeat(100));

  const zeroPayment = await prisma.electricityRecharge.findMany({
    where: { totalPaid: 0 },
    include: { dryingProcess: true }
  });

  if (zeroPayment.length === 0) {
    console.log('✅ No recharges with zero payment\n');
  } else {
    console.log(`❌ Found ${zeroPayment.length} recharge(s) with zero payment:\n`);
    zeroPayment.forEach((r, i) => {
      console.log(`${i + 1}. ${r.dryingProcess?.batchNumber || 'Orphaned'} - Token ${r.token}`);
      console.log(`   kWh: ${r.kwhAmount}`);
      console.log(`   Paid: 0 TSH ❌`);
      console.log(`   Should be: ~${Math.round(r.kwhAmount * 356.25).toLocaleString()} TSH`);
      console.log();
    });
  }

  // 5. Duplicate tokens
  console.log('\n5. DUPLICATE TOKEN NUMBERS:');
  console.log('─'.repeat(100));

  const tokenCounts = {};
  allRecharges.forEach(r => {
    if (!tokenCounts[r.token]) {
      tokenCounts[r.token] = [];
    }
    tokenCounts[r.token].push(r);
  });

  const duplicates = Object.entries(tokenCounts).filter(([token, recharges]) => recharges.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate tokens found\n');
  } else {
    console.log(`❌ Found ${duplicates.length} duplicate token(s):\n`);
    duplicates.forEach(([token, recharges], i) => {
      console.log(`${i + 1}. Token ${token} - Used ${recharges.length} times:`);
      recharges.forEach(r => {
        console.log(`   - ${r.dryingProcess?.batchNumber || 'Orphaned'}: ${r.rechargeDate}`);
      });
      console.log();
    });
  }

  // SUMMARY
  console.log('\n' + '='.repeat(100));
  console.log('SUMMARY');
  console.log('='.repeat(100));
  console.log();
  console.log(`Total recharges in database: ${allRecharges.length}`);
  console.log(`Orphaned recharges: ${orphanedRecharges.length}`);
  console.log(`Recharges with timestamp issues: ${wrongTimestamps.length}`);
  console.log(`Missing recharges: ${missingRecharges.length}`);
  console.log(`Recharges with zero payment: ${zeroPayment.length}`);
  console.log(`Duplicate tokens: ${duplicates.length}`);
  console.log();

  const totalIssues = orphanedRecharges.length + wrongTimestamps.length + missingRecharges.length + zeroPayment.length + duplicates.length;

  if (totalIssues === 0) {
    console.log('✅ All recharges are correctly recorded and assigned!');
  } else {
    console.log(`⚠️  Total issues found: ${totalIssues}`);
    console.log();
    console.log('ACTIONS NEEDED:');
    if (orphanedRecharges.length > 0) {
      console.log(`  • Assign ${orphanedRecharges.length} orphaned recharge(s) to correct processes`);
    }
    if (wrongTimestamps.length > 0) {
      console.log(`  • Fix ${wrongTimestamps.length} recharge timestamp(s)`);
    }
    if (missingRecharges.length > 0) {
      console.log(`  • Add ${missingRecharges.length} missing recharge record(s)`);
    }
    if (zeroPayment.length > 0) {
      console.log(`  • Update ${zeroPayment.length} recharge payment amount(s)`);
    }
    if (duplicates.length > 0) {
      console.log(`  • Review ${duplicates.length} duplicate token(s)`);
    }
  }

  console.log('\n' + '='.repeat(100));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
