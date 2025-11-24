import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepRechargeAnalysis() {
  try {
    console.log('🔍 DEEP ANALYSIS: Understanding Electricity Recharges\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Get UD-DRY-00003
    const process = await prisma.dryingProcess.findUnique({
      where: { batchNumber: 'UD-DRY-00003' },
      include: {
        readings: {
          orderBy: { readingTime: 'asc' }
        }
      }
    });

    // Get all electricity recharges during this period
    const startTime = new Date(process.startTime);
    const endTime = process.endTime ? new Date(process.endTime) : new Date();

    const recharges = await prisma.electricityRecharge.findMany({
      where: {
        rechargeDate: {
          gte: startTime,
          lte: endTime
        }
      },
      orderBy: { rechargeDate: 'asc' }
    });

    console.log('📅 DRYING PROCESS TIMELINE:\n');
    console.log(`   Start: ${startTime.toISOString()}`);
    console.log(`   End: ${endTime.toISOString()}`);
    console.log(`   Duration: ${((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2)} hours\n`);

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('⚡ ELECTRICITY RECHARGES DURING THIS PERIOD:\n');

    if (recharges.length === 0) {
      console.log('   ℹ️  No recharges recorded in database during this period\n');
    } else {
      console.log(`   Found ${recharges.length} recharge(s):\n`);
      recharges.forEach((r, idx) => {
        console.log(`   ${idx + 1}. Date: ${r.rechargeDate.toISOString()}`);
        console.log(`      Token: ${r.token}`);
        console.log(`      kWh Added: ${r.kwhAmount.toFixed(2)} kWh`);
        console.log(`      Amount Paid: TZS ${r.totalPaid.toLocaleString()}`);
        console.log(`      Rate: ${(r.totalPaid / r.kwhAmount).toFixed(2)} TZS/kWh\n`);
      });
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 METER READINGS WITH RECHARGE CORRELATION:\n');
    console.log('   Let me analyze each reading to understand what happened...\n');

    console.log('   #  | Date & Time         | Meter  | Change    | Analysis');
    console.log('   ───┼─────────────────────┼────────┼───────────┼──────────────────────────────');

    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const readingDate = new Date(reading.readingTime);
      const meter = reading.electricityMeter;

      let change = '';
      let analysis = '';

      if (i === 0) {
        change = '-';
        analysis = 'First reading';
      } else {
        const prevMeter = process.readings[i - 1].electricityMeter;
        const diff = meter - prevMeter;
        change = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);

        if (diff < -10) {
          // Significant decrease - normal consumption
          const consumed = Math.abs(diff);
          analysis = `✅ Consumed ${consumed.toFixed(1)} units`;

          // Check if there was a recharge BETWEEN these readings
          const prevDate = new Date(process.readings[i - 1].readingTime);
          const rechargesBetween = recharges.filter(r =>
            r.rechargeDate >= prevDate && r.rechargeDate <= readingDate
          );

          if (rechargesBetween.length > 0) {
            const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
            analysis += ` (${rechargesBetween.length} recharge(s) of ${totalRecharged.toFixed(1)} kWh between readings)`;
          }

        } else if (diff > 100) {
          // Big jump up - recharge happened
          analysis = `⚡ RECHARGE: Meter jumped by ${diff.toFixed(1)} units`;

          // Find matching recharge
          const matchingRecharge = recharges.find(r => {
            const timeDiff = Math.abs(r.rechargeDate.getTime() - readingDate.getTime());
            return timeDiff < 24 * 60 * 60 * 1000; // Within 24 hours
          });

          if (matchingRecharge) {
            analysis += ` (Recharge record: ${matchingRecharge.kwhAmount.toFixed(1)} kWh)`;
          } else {
            analysis += ` (⚠️  No matching recharge record found!)`;
          }

        } else {
          // Small change
          analysis = diff < 0 ? `✅ Consumed ${Math.abs(diff).toFixed(1)} units` : `Small increase: +${diff.toFixed(1)}`;
        }
      }

      console.log(`   ${String(i + 1).padStart(2)} | ${readingDate.toISOString().substr(0, 19)} | ${meter.toFixed(1).padStart(6)} | ${change.padStart(9)} | ${analysis}`);
    }

    console.log('   ───┴─────────────────────┴────────┴───────────┴──────────────────────────────\n');

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('🤔 UNDERSTANDING THE PATTERN:\n');

    console.log('   In Tanzania with prepaid electricity (Luku/TANESCO):\n');
    console.log('   1. You BUY units (recharge) → meter number INCREASES');
    console.log('   2. You USE electricity → meter number DECREASES\n');

    console.log('   Example from UD-DRY-00003:\n');
    console.log('   Reading 13: 159.64 units remaining');
    console.log('   ↓ (continuing to use electricity...meter going down)');
    console.log('   ↓ SUDDENLY you recharge!');
    console.log('   ↓ (you buy more units)');
    console.log('   Reading 14: 2,945.68 units remaining');
    console.log('   ↑ Meter jumped up by 2,786.04 units\n');

    console.log('   🔍 QUESTION: Did you consume electricity between readings 13-14?\n');
    console.log('   ANSWER: YES! Even though meter jumped up, you were STILL using electricity');
    console.log('   The meter was counting down from 159.64 towards 0, then got recharged!\n');

    console.log('   The TRUE consumption between readings 13-14 is:\n');
    console.log('   Method 1: Reading 13 → 0 → Recharge → Reading 14');
    console.log('   = 159.64 + (Recharge amount - 2945.68)\n');

    // Try to figure out actual consumption
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('💡 PROPOSED SOLUTION:\n');

    console.log('   For each meter jump (recharge), we need to:\n');
    console.log('   1. Find the recharge record from ElectricityRecharge table');
    console.log('   2. Calculate: consumption = prev_reading + (recharge_amount - curr_reading)\n');
    console.log('   3. This accounts for electricity used BEFORE the recharge\n');

    console.log('   Example calculation:\n');
    console.log('   Reading 13: 159.64');
    console.log('   Recharge: ??? kWh (we need to find this!)');
    console.log('   Reading 14: 2,945.68');
    console.log('   Consumption = 159.64 + (??? - 2,945.68)\n');

    // Try to match recharges
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('🔎 ATTEMPTING TO MATCH RECHARGES TO READINGS:\n');

    for (let i = 1; i < process.readings.length; i++) {
      const prev = process.readings[i - 1];
      const curr = process.readings[i];
      const diff = curr.electricityMeter - prev.electricityMeter;

      if (diff > 100) {
        console.log(`\n   Between Reading ${i} and ${i + 1}:`);
        console.log(`   Meter: ${prev.electricityMeter.toFixed(2)} → ${curr.electricityMeter.toFixed(2)}`);
        console.log(`   Jump: +${diff.toFixed(2)} units\n`);

        // Find recharges in this time window
        const prevDate = new Date(prev.readingTime);
        const currDate = new Date(curr.readingTime);

        const windowRecharges = await prisma.electricityRecharge.findMany({
          where: {
            rechargeDate: {
              gte: prevDate,
              lte: currDate
            }
          }
        });

        if (windowRecharges.length > 0) {
          console.log(`   ✅ Found ${windowRecharges.length} recharge(s) in this window:`);
          windowRecharges.forEach(r => {
            console.log(`      - ${r.rechargeDate.toISOString()}: ${r.kwhAmount.toFixed(2)} kWh`);
          });

          const totalRecharged = windowRecharges.reduce((sum, r) => sum + r.kwhAmount, 0);
          const actualConsumption = prev.electricityMeter + (totalRecharged - curr.electricityMeter);

          console.log(`\n      📊 CALCULATION:`);
          console.log(`      Previous meter: ${prev.electricityMeter.toFixed(2)}`);
          console.log(`      Total recharged: ${totalRecharged.toFixed(2)}`);
          console.log(`      Current meter: ${curr.electricityMeter.toFixed(2)}`);
          console.log(`      Actual consumption: ${prev.electricityMeter.toFixed(2)} + (${totalRecharged.toFixed(2)} - ${curr.electricityMeter.toFixed(2)})`);
          console.log(`      = ${actualConsumption.toFixed(2)} units ✅`);
        } else {
          console.log(`   ⚠️  NO recharge records found in database!`);
          console.log(`      This means the recharge was not recorded in ElectricityRecharge table`);
          console.log(`      We CANNOT calculate true consumption without knowing recharge amount\n`);
          console.log(`      🔧 WORKAROUND: Estimate based on meter jump`);
          console.log(`      Assuming you recharged approximately ${diff.toFixed(2)} kWh`);
          console.log(`      Consumption before recharge: ~${prev.electricityMeter.toFixed(2)} units`);
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');
    console.log('✅ CONCLUSION:\n');
    console.log('   The issue is that when meter jumps up (recharge), we need to account for:');
    console.log('   1. Electricity used BEFORE the recharge (from prev reading down to ~0)');
    console.log('   2. The recharge amount added');
    console.log('   3. Electricity used AFTER the recharge (recharge amount - current reading)\n');
    console.log('   Without ElectricityRecharge records, we must ESTIMATE or ignore jumps.');
    console.log('   This is why the calculation is tricky!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deepRechargeAnalysis();
