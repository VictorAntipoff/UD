import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareCalculations() {
  try {
    console.log('🔍 COMPARING OLD vs CORRECT CALCULATION - UD-DRY-00003\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    const process = await prisma.dryingProcess.findUnique({
      where: { batchNumber: 'UD-DRY-00003' },
      include: {
        woodType: true,
        items: {
          include: {
            woodType: true
          }
        },
        readings: {
          orderBy: { readingTime: 'asc' }
        }
      }
    });

    if (!process) {
      console.log('❌ Batch not found\n');
      return;
    }

    const totalPieces = process.pieceCount || 109;

    console.log('📋 BATCH INFO:\n');
    console.log(`   Batch: ${process.batchNumber}`);
    console.log(`   Wood: ${process.woodType?.name} ${process.thickness ? (process.thickness / 25.4).toFixed(1) + '"' : ''}`);
    console.log(`   Pieces: ${totalPieces}`);
    console.log(`   Start Time: ${process.startTime.toISOString()}`);
    console.log(`   End Time: ${process.endTime ? process.endTime.toISOString() : 'Not set'}`);
    console.log(`   Readings: ${process.readings.length}\n`);

    // Get settings
    const settings = {};
    const settingsKeys = ['ovenPurchasePrice', 'ovenLifespanYears', 'maintenanceCostPerYear', 'laborCostPerHour'];

    for (const key of settingsKeys) {
      const setting = await prisma.setting.findUnique({ where: { key } });
      settings[key] = setting ? parseFloat(setting.value) : 0;
    }

    const latestRecharge = await prisma.electricityRecharge.findFirst({
      orderBy: { rechargeDate: 'desc' }
    });
    const electricityRate = latestRecharge ? (latestRecharge.totalPaid / latestRecharge.kwhAmount) : 292;

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('⚡ ELECTRICITY CALCULATION COMPARISON:\n');

    // OLD CALCULATION (WRONG - What the current code does)
    console.log('❌ OLD CALCULATION (Current Code - WRONG):\n');
    const firstReading = process.readings[0].electricityMeter;
    const lastReading = process.readings[process.readings.length - 1].electricityMeter;
    const oldElectricityUsed = lastReading - firstReading;
    const oldElectricityCost = oldElectricityUsed * electricityRate;

    console.log(`   Method: lastReading - firstReading`);
    console.log(`   └─ ${lastReading.toFixed(2)} - ${firstReading.toFixed(2)} = ${oldElectricityUsed.toFixed(2)} units`);
    console.log(`   └─ Cost: ${oldElectricityUsed.toFixed(2)} × ${electricityRate.toFixed(2)} = TZS ${oldElectricityCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`);

    // CORRECT CALCULATION (Sum only positive consumption, ignore recharges)
    console.log('✅ CORRECT CALCULATION (Ignoring Recharges):\n');
    console.log('   Reading-by-reading analysis:\n');

    let correctElectricityUsed = 0;
    console.log('   #   | Previous → Current | Difference | Action');
    console.log('   ────┼────────────────────┼────────────┼────────────────');

    for (let i = 1; i < process.readings.length; i++) {
      const prev = process.readings[i - 1].electricityMeter;
      const curr = process.readings[i].electricityMeter;
      const diff = prev - curr;

      let action = '';
      if (diff > 0) {
        correctElectricityUsed += diff;
        action = `✅ CONSUMED: +${diff.toFixed(2)}`;
      } else {
        action = `⚡ RECHARGED: ${diff.toFixed(2)} (SKIP)`;
      }

      console.log(`   ${String(i).padStart(2)}  | ${prev.toFixed(2).padStart(8)} → ${curr.toFixed(2).padStart(8)} | ${diff.toFixed(2).padStart(10)} | ${action}`);
    }

    const correctElectricityCost = correctElectricityUsed * electricityRate;

    console.log('   ────┴────────────────────┴────────────┴────────────────');
    console.log(`\n   TOTAL CONSUMED: ${correctElectricityUsed.toFixed(2)} units`);
    console.log(`   Cost: ${correctElectricityUsed.toFixed(2)} × ${electricityRate.toFixed(2)} = TZS ${correctElectricityCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`);

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('⏱️  RUNNING HOURS CALCULATION:\n');

    // Check end time
    const startTime = new Date(process.startTime).getTime();
    let endTime;
    let endTimeSource = '';

    if (process.endTime) {
      endTime = new Date(process.endTime).getTime();
      endTimeSource = 'Database endTime field';
    } else {
      endTime = process.readings.length > 0
        ? new Date(process.readings[process.readings.length - 1].readingTime).getTime()
        : Date.now();
      endTimeSource = 'Last reading time (fallback)';
    }

    const runningHours = (endTime - startTime) / (1000 * 60 * 60);
    const lastReadingTime = process.readings[process.readings.length - 1].readingTime;
    const lastReadingHours = (new Date(lastReadingTime).getTime() - startTime) / (1000 * 60 * 60);

    console.log(`   Start Time: ${new Date(startTime).toISOString()}`);
    console.log(`   End Time (database): ${process.endTime ? new Date(process.endTime).toISOString() : 'NOT SET'}`);
    console.log(`   Last Reading Time: ${new Date(lastReadingTime).toISOString()}\n`);

    console.log(`   Running Hours (using endTime): ${runningHours.toFixed(2)} hours`);
    console.log(`   Running Hours (using last reading): ${lastReadingHours.toFixed(2)} hours`);
    console.log(`   Difference: ${Math.abs(runningHours - lastReadingHours).toFixed(2)} hours\n`);

    if (Math.abs(runningHours - lastReadingHours) > 1) {
      console.log(`   ⚠️  WARNING: End time is ${(runningHours - lastReadingHours).toFixed(2)} hours AFTER last reading!`);
      console.log(`   This means when you clicked "Complete Drying", the time was recorded as:`);
      console.log(`   ${new Date(endTime).toISOString()}`);
      console.log(`   But the last electricity reading was taken at:`);
      console.log(`   ${new Date(lastReadingTime).toISOString()}\n`);
    }

    // Calculate costs with both methods
    const annualDepreciation = settings.ovenPurchasePrice / settings.ovenLifespanYears;
    const depreciationPerHour = annualDepreciation / 8760;
    const maintenancePerHour = settings.maintenanceCostPerYear / 8760;

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('💰 FULL COST COMPARISON:\n');

    // OLD METHOD COSTS
    const oldDepreciationCost = runningHours * depreciationPerHour;
    const oldMaintenanceCost = runningHours * maintenancePerHour;
    const oldLaborCost = runningHours * settings.laborCostPerHour;
    const oldTotalCost = oldElectricityCost + oldDepreciationCost + oldMaintenanceCost + oldLaborCost;
    const oldCostPerPiece = oldTotalCost / totalPieces;

    console.log('❌ OLD CALCULATION (WRONG):\n');
    console.log(`   1. Electricity: TZS ${oldElectricityCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${oldElectricityUsed.toFixed(2)} units)`);
    console.log(`   2. Depreciation: TZS ${oldDepreciationCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${runningHours.toFixed(2)} hours)`);
    console.log(`   3. Maintenance: TZS ${oldMaintenanceCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   4. Labor: TZS ${oldLaborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   ───────────────────────────────────────`);
    console.log(`   TOTAL: TZS ${oldTotalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   Cost/Piece: TZS ${oldCostPerPiece.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`);

    // CORRECT METHOD COSTS (using last reading time for hours)
    const correctRunningHours = lastReadingHours;
    const correctDepreciationCost = correctRunningHours * depreciationPerHour;
    const correctMaintenanceCost = correctRunningHours * maintenancePerHour;
    const correctLaborCost = correctRunningHours * settings.laborCostPerHour;
    const correctTotalCost = correctElectricityCost + correctDepreciationCost + correctMaintenanceCost + correctLaborCost;
    const correctCostPerPiece = correctTotalCost / totalPieces;

    console.log('✅ CORRECT CALCULATION (Using Last Reading Time):\n');
    console.log(`   1. Electricity: TZS ${correctElectricityCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${correctElectricityUsed.toFixed(2)} units)`);
    console.log(`   2. Depreciation: TZS ${correctDepreciationCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${correctRunningHours.toFixed(2)} hours)`);
    console.log(`   3. Maintenance: TZS ${correctMaintenanceCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   4. Labor: TZS ${correctLaborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   ───────────────────────────────────────`);
    console.log(`   TOTAL: TZS ${correctTotalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   Cost/Piece: TZS ${correctCostPerPiece.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`);

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 WHAT YOU SEE IN THE UI (TZS 1,711,072):\n');

    // Try to figure out what the UI is showing
    console.log(`   The UI currently shows: TZS 1,711,072`);
    console.log(`   Let me analyze possible sources...\n`);

    // Check if it matches any combination
    const uiShownCost = 1711072;

    console.log(`   Checking against our calculations:`);
    console.log(`   ├─ OLD Total Cost: TZS ${oldTotalCost.toLocaleString()} ${Math.abs(oldTotalCost - uiShownCost) < 1 ? '✅ MATCH!' : ''}`);
    console.log(`   ├─ CORRECT Total Cost: TZS ${correctTotalCost.toLocaleString()} ${Math.abs(correctTotalCost - uiShownCost) < 1 ? '✅ MATCH!' : ''}`);

    // Check with absolute value
    const absElectricityUsed = Math.abs(oldElectricityUsed);
    const absElectricityCost = absElectricityUsed * electricityRate;
    const absTotalCost = absElectricityCost + oldDepreciationCost + oldMaintenanceCost + oldLaborCost;

    console.log(`   ├─ Using Math.abs(electricity): TZS ${absTotalCost.toLocaleString()} ${Math.abs(absTotalCost - uiShownCost) < 1 ? '✅ MATCH!' : ''}`);

    // Check what UI components show
    console.log(`\n   📌 BREAKDOWN TO MATCH UI:`);
    const uiElectricity = absElectricityCost;
    const uiDepreciation = oldDepreciationCost;
    const uiTotal = uiElectricity + uiDepreciation;

    console.log(`   Electricity (abs): ${absElectricityUsed.toFixed(2)} × ${electricityRate.toFixed(2)} = TZS ${uiElectricity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   Depreciation: ${runningHours.toFixed(2)} × ${depreciationPerHour.toFixed(2)} = TZS ${uiDepreciation.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   Total: TZS ${uiTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${Math.abs(uiTotal - uiShownCost) < 100 ? '✅ MATCH!' : ''}\n`);

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('🔍 SUMMARY OF DIFFERENCES:\n');

    console.log(`   1️⃣  ELECTRICITY CALCULATION:`);
    console.log(`       OLD (wrong): ${oldElectricityUsed.toFixed(2)} units → TZS ${oldElectricityCost.toLocaleString()}`);
    console.log(`       UI (Math.abs): ${absElectricityUsed.toFixed(2)} units → TZS ${uiElectricity.toLocaleString()}`);
    console.log(`       CORRECT: ${correctElectricityUsed.toFixed(2)} units → TZS ${correctElectricityCost.toLocaleString()}`);
    console.log(`       Difference: TZS ${Math.abs(correctElectricityCost - uiElectricity).toLocaleString()}\n`);

    console.log(`   2️⃣  RUNNING HOURS:`);
    console.log(`       Using endTime: ${runningHours.toFixed(2)} hours`);
    console.log(`       Should use last reading: ${correctRunningHours.toFixed(2)} hours`);
    console.log(`       Difference: ${Math.abs(runningHours - correctRunningHours).toFixed(2)} hours`);
    console.log(`       Cost impact: TZS ${Math.abs((runningHours - correctRunningHours) * depreciationPerHour).toLocaleString()}\n`);

    console.log(`   3️⃣  TOTAL COST PER PIECE:`);
    console.log(`       UI shows: TZS ${(uiShownCost / totalPieces).toFixed(2)}/piece`);
    console.log(`       CORRECT should be: TZS ${correctCostPerPiece.toFixed(2)}/piece`);
    console.log(`       Difference: TZS ${Math.abs((uiShownCost / totalPieces) - correctCostPerPiece).toFixed(2)}/piece\n`);

    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareCalculations();
