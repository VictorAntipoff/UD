import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING ALL DRYING PROCESSES FOR DISCREPANCIES ===\n');

  const processes = await prisma.dryingProcess.findMany({
    where: { status: 'COMPLETED' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    },
    orderBy: { batchNumber: 'asc' }
  });

  console.log(`Found ${processes.length} completed drying processes\n`);

  const issues = [];

  for (const process of processes) {
    const processIssues = [];

    // Check 1: Missing starting electricity
    if (!process.startingElectricityUnits) {
      processIssues.push('❌ Missing starting electricity value');
    }

    // Check 2: Readings without meter values
    const readingsWithoutMeter = process.readings.filter(r => !r.electricityMeter);
    if (readingsWithoutMeter.length > 0) {
      processIssues.push(`❌ ${readingsWithoutMeter.length} readings missing meter values`);
    }

    // Check 3: Recharges with missing data
    for (const recharge of process.recharges) {
      if (!recharge.kwhAmount) {
        processIssues.push(`❌ Recharge ${recharge.token} missing kWh amount`);
      }
      if (!recharge.totalPaid || recharge.totalPaid === 0) {
        processIssues.push(`⚠️  Recharge ${recharge.token} missing payment amount (totalPaid = 0)`);
      }
      if (!recharge.meterReadingAfter) {
        processIssues.push(`❌ Recharge ${recharge.token} missing meter reading after`);
      }
    }

    // Check 4: Meter readings going UP without recharge (timestamp/order issues)
    if (process.readings.length > 0) {
      let prevReading = process.startingElectricityUnits || process.readings[0]?.electricityMeter;
      let prevTime = new Date(process.startTime);

      for (let i = 0; i < process.readings.length; i++) {
        const reading = process.readings[i];
        const currentTime = new Date(reading.readingTime);
        const currentReading = reading.electricityMeter;

        // Check if there's a recharge between
        const rechargesBetween = process.recharges.filter(r => {
          const rDate = new Date(r.rechargeDate);
          return rDate > prevTime && rDate <= currentTime;
        });

        if (rechargesBetween.length === 0 && currentReading > prevReading) {
          // Meter went UP without a recharge - likely timestamp issue
          processIssues.push(`⚠️  Reading ${i + 1} meter INCREASED without recharge: ${prevReading?.toFixed(2)} → ${currentReading} (timestamp issue?)`);
        }

        prevReading = currentReading;
        prevTime = currentTime;
      }
    }

    // Check 5: Readings out of chronological order
    for (let i = 1; i < process.readings.length; i++) {
      const prevTime = new Date(process.readings[i - 1].readingTime);
      const currTime = new Date(process.readings[i].readingTime);
      if (currTime < prevTime) {
        processIssues.push(`❌ Reading ${i + 1} timestamp is BEFORE Reading ${i} (out of order)`);
      }
    }

    // Check 6: Recharge timestamp before/after reading showing post-recharge meter
    for (const recharge of process.recharges) {
      const rechargeTime = new Date(recharge.rechargeDate);
      const meterAfter = recharge.meterReadingAfter;

      // Find reading with this exact meter value
      const matchingReading = process.readings.find(r => r.electricityMeter === meterAfter);
      if (matchingReading) {
        const readingTime = new Date(matchingReading.readingTime);
        if (readingTime < rechargeTime) {
          processIssues.push(`⚠️  Reading shows meter after recharge (${meterAfter}) but timestamp is BEFORE recharge time`);
        }
      }
    }

    // Check 7: Unrealistic meter reading values
    for (const recharge of process.recharges) {
      if (recharge.meterReadingAfter > 10000) {
        processIssues.push(`⚠️  Recharge meter reading suspiciously high: ${recharge.meterReadingAfter} kWh (typo?)`);
      }
    }

    // Store results
    if (processIssues.length > 0) {
      issues.push({
        batchNumber: process.batchNumber,
        issues: processIssues,
        readingsCount: process.readings.length,
        rechargesCount: process.recharges.length,
        currentCost: process.totalCost
      });
    }
  }

  // Display results
  console.log('='.repeat(80));
  console.log('ANALYSIS RESULTS');
  console.log('='.repeat(80));
  console.log();

  if (issues.length === 0) {
    console.log('✅ All drying processes look good - no discrepancies found!\n');
  } else {
    console.log(`Found issues in ${issues.length} drying process(es):\n`);

    for (const item of issues) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📋 ${item.batchNumber}`);
      console.log(`   Readings: ${item.readingsCount} | Recharges: ${item.rechargesCount} | Current Cost: ${item.currentCost?.toFixed(2) || 'N/A'} TSH`);
      console.log(`${'─'.repeat(80)}`);

      item.issues.forEach(issue => {
        console.log(`   ${issue}`);
      });
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nTotal processes checked: ${processes.length}`);
    console.log(`Processes with issues: ${issues.length}`);
    console.log(`Processes OK: ${processes.length - issues.length}\n`);

    // Group by issue type
    const issueTypes = {
      missingData: 0,
      timestampIssues: 0,
      calculationIssues: 0,
      suspiciousValues: 0
    };

    issues.forEach(item => {
      item.issues.forEach(issue => {
        if (issue.includes('missing') || issue.includes('Missing')) issueTypes.missingData++;
        if (issue.includes('timestamp') || issue.includes('BEFORE') || issue.includes('order')) issueTypes.timestampIssues++;
        if (issue.includes('INCREASED') || issue.includes('without recharge')) issueTypes.calculationIssues++;
        if (issue.includes('suspiciously') || issue.includes('typo')) issueTypes.suspiciousValues++;
      });
    });

    console.log('Issues by type:');
    console.log(`  Missing data: ${issueTypes.missingData}`);
    console.log(`  Timestamp issues: ${issueTypes.timestampIssues}`);
    console.log(`  Calculation issues: ${issueTypes.calculationIssues}`);
    console.log(`  Suspicious values: ${issueTypes.suspiciousValues}`);
    console.log();
  }

  // Export detailed list for fixing
  if (issues.length > 0) {
    console.log('='.repeat(80));
    console.log('PROCESSES REQUIRING ATTENTION:');
    console.log('='.repeat(80));
    console.log();
    issues.forEach(item => {
      console.log(`  • ${item.batchNumber} (${item.issues.length} issue${item.issues.length > 1 ? 's' : ''})`);
    });
    console.log();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
