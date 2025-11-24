import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeAllBatchesImpact() {
  try {
    console.log('🔍 ANALYZING ALL COMPLETED BATCHES - BEFORE vs AFTER FIX\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

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

    const annualDepreciation = settings.ovenPurchasePrice / settings.ovenLifespanYears;
    const depreciationPerHour = annualDepreciation / 8760;
    const maintenancePerHour = settings.maintenanceCostPerYear / 8760;

    console.log('⚙️  SETTINGS:\n');
    console.log(`   Electricity Rate: ${electricityRate.toFixed(2)} TZS/unit`);
    console.log(`   Depreciation: ${depreciationPerHour.toFixed(2)} TZS/hour`);
    console.log(`   Maintenance: ${maintenancePerHour.toFixed(2)} TZS/hour`);
    console.log(`   Labor: ${settings.laborCostPerHour.toFixed(2)} TZS/hour\n`);

    // Get all completed processes
    const processes = await prisma.dryingProcess.findMany({
      where: { status: 'COMPLETED' },
      include: {
        woodType: true,
        items: {
          include: { woodType: true }
        },
        readings: {
          orderBy: { readingTime: 'asc' }
        }
      },
      orderBy: { endTime: 'desc' }
    });

    console.log(`Found ${processes.length} completed batches\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    const results = [];

    for (const process of processes) {
      const totalPieces = process.items && process.items.length > 0
        ? process.items.reduce((sum, item) => sum + item.pieceCount, 0)
        : (process.pieceCount || 0);

      if (process.readings.length === 0 || totalPieces === 0) {
        continue; // Skip if no readings or no pieces
      }

      // Get wood info
      let woodInfo = 'Unknown';
      if (process.items && process.items.length > 0) {
        woodInfo = `Mixed (${process.items.length} types)`;
      } else if (process.woodType) {
        const thickness = process.thickness ? (process.thickness / 25.4).toFixed(1) + '"' : '?';
        woodInfo = `${process.woodType.name} ${thickness}`;
      }

      // OLD CALCULATION (Current wrong method)
      const firstReading = process.readings[0].electricityMeter;
      const lastReading = process.readings[process.readings.length - 1].electricityMeter;
      const oldElectricityUsed = Math.abs(lastReading - firstReading);

      // Running hours using endTime (wrong)
      const startTime = new Date(process.startTime).getTime();
      const endTimeWrong = process.endTime ? new Date(process.endTime).getTime() : startTime;
      const oldRunningHours = (endTimeWrong - startTime) / (1000 * 60 * 60);

      const oldElectricityCost = oldElectricityUsed * electricityRate;
      const oldDepreciationCost = oldRunningHours * depreciationPerHour;
      const oldMaintenanceCost = oldRunningHours * maintenancePerHour;
      const oldLaborCost = oldRunningHours * settings.laborCostPerHour;
      const oldTotalCost = oldElectricityCost + oldDepreciationCost + oldMaintenanceCost + oldLaborCost;
      const oldCostPerPiece = oldTotalCost / totalPieces;

      // CORRECT CALCULATION (New method with recharge handling)
      // Calculate electricity properly
      let correctElectricityUsed = 0;

      // Get recharges during this period
      const recharges = await prisma.electricityRecharge.findMany({
        where: {
          rechargeDate: {
            gte: new Date(process.startTime),
            lte: process.endTime ? new Date(process.endTime) : new Date()
          }
        },
        orderBy: { rechargeDate: 'asc' }
      });

      // Calculate with recharge awareness
      for (let i = 0; i < process.readings.length; i++) {
        const currentReading = process.readings[i];
        const currentTime = new Date(currentReading.readingTime);

        let prevReading, prevTime;
        if (i === 0) {
          prevReading = process.startingElectricityUnits || firstReading;
          prevTime = new Date(process.startTime);
        } else {
          prevReading = process.readings[i - 1].electricityMeter;
          prevTime = new Date(process.readings[i - 1].readingTime);
        }

        // Find recharges between prev and current
        const rechargesBetween = recharges.filter(r =>
          r.rechargeDate > prevTime && r.rechargeDate <= currentTime
        );

        if (rechargesBetween.length > 0) {
          // Complex case: recharge happened
          const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
          const consumed = prevReading + totalRecharged - currentReading.electricityMeter;
          correctElectricityUsed += Math.max(0, consumed);
        } else {
          // Simple case: normal consumption
          const consumed = prevReading - currentReading.electricityMeter;
          if (consumed > 0) {
            correctElectricityUsed += consumed;
          }
        }
      }

      // Running hours using last reading time (correct)
      const lastReadingTime = new Date(process.readings[process.readings.length - 1].readingTime).getTime();
      const correctRunningHours = (lastReadingTime - startTime) / (1000 * 60 * 60);

      const correctElectricityCost = correctElectricityUsed * electricityRate;
      const correctDepreciationCost = correctRunningHours * depreciationPerHour;
      const correctMaintenanceCost = correctRunningHours * maintenancePerHour;
      const correctLaborCost = correctRunningHours * settings.laborCostPerHour;
      const correctTotalCost = correctElectricityCost + correctDepreciationCost + correctMaintenanceCost + correctLaborCost;
      const correctCostPerPiece = correctTotalCost / totalPieces;

      results.push({
        batchNumber: process.batchNumber,
        woodInfo,
        pieces: totalPieces,
        rechargeCount: recharges.length,
        old: {
          electricity: oldElectricityUsed,
          hours: oldRunningHours,
          totalCost: oldTotalCost,
          costPerPiece: oldCostPerPiece
        },
        correct: {
          electricity: correctElectricityUsed,
          hours: correctRunningHours,
          totalCost: correctTotalCost,
          costPerPiece: correctCostPerPiece
        },
        difference: {
          electricity: correctElectricityUsed - oldElectricityUsed,
          hours: correctRunningHours - oldRunningHours,
          totalCost: correctTotalCost - oldTotalCost,
          costPerPiece: correctCostPerPiece - oldCostPerPiece
        }
      });
    }

    // Print results
    results.forEach((r, idx) => {
      console.log(`╔═══════════════════════════════════════════════════════════════════════════════╗`);
      console.log(`║ BATCH ${idx + 1}: ${r.batchNumber}`);
      console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\n`);

      console.log(`   Wood: ${r.woodInfo}`);
      console.log(`   Pieces: ${r.pieces}`);
      console.log(`   Recharges during process: ${r.rechargeCount}\n`);

      console.log(`   ❌ OLD (WRONG) CALCULATION:`);
      console.log(`   ├─ Electricity: ${r.old.electricity.toFixed(2)} units`);
      console.log(`   ├─ Running Hours: ${r.old.hours.toFixed(2)} hours`);
      console.log(`   ├─ Total Cost: TZS ${r.old.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      console.log(`   └─ Cost/Piece: TZS ${r.old.costPerPiece.toFixed(2)}\n`);

      console.log(`   ✅ CORRECT CALCULATION:`);
      console.log(`   ├─ Electricity: ${r.correct.electricity.toFixed(2)} units`);
      console.log(`   ├─ Running Hours: ${r.correct.hours.toFixed(2)} hours`);
      console.log(`   ├─ Total Cost: TZS ${r.correct.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      console.log(`   └─ Cost/Piece: TZS ${r.correct.costPerPiece.toFixed(2)}\n`);

      const diffSymbol = r.difference.costPerPiece > 0 ? '📈' : '📉';
      const diffColor = r.difference.costPerPiece > 0 ? 'INCREASED' : 'DECREASED';

      console.log(`   ${diffSymbol} DIFFERENCE (Correct - Old):`);
      console.log(`   ├─ Electricity: ${r.difference.electricity > 0 ? '+' : ''}${r.difference.electricity.toFixed(2)} units`);
      console.log(`   ├─ Hours: ${r.difference.hours > 0 ? '+' : ''}${r.difference.hours.toFixed(2)} hours`);
      console.log(`   ├─ Total Cost: ${r.difference.totalCost > 0 ? '+' : ''}TZS ${Math.abs(r.difference.totalCost).toLocaleString('en-US', { maximumFractionDigits: 0 })} (${diffColor})`);
      console.log(`   └─ Cost/Piece: ${r.difference.costPerPiece > 0 ? '+' : ''}TZS ${r.difference.costPerPiece.toFixed(2)} (${diffColor})\n`);

      console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    });

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║ SUMMARY - IMPACT OF FIX ON ALL BATCHES');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

    const totalOldCost = results.reduce((sum, r) => sum + r.old.totalCost, 0);
    const totalCorrectCost = results.reduce((sum, r) => sum + r.correct.totalCost, 0);
    const totalDifference = totalCorrectCost - totalOldCost;

    const totalPieces = results.reduce((sum, r) => sum + r.pieces, 0);
    const avgOldCostPerPiece = totalOldCost / totalPieces;
    const avgCorrectCostPerPiece = totalCorrectCost / totalPieces;

    console.log(`   Total Batches: ${results.length}`);
    console.log(`   Total Pieces: ${totalPieces}\n`);

    console.log(`   OLD Total Cost: TZS ${totalOldCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   CORRECT Total Cost: TZS ${totalCorrectCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log(`   Difference: ${totalDifference > 0 ? '+' : ''}TZS ${Math.abs(totalDifference).toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`);

    console.log(`   OLD Avg Cost/Piece: TZS ${avgOldCostPerPiece.toFixed(2)}`);
    console.log(`   CORRECT Avg Cost/Piece: TZS ${avgCorrectCostPerPiece.toFixed(2)}`);
    console.log(`   Difference: ${(avgCorrectCostPerPiece - avgOldCostPerPiece) > 0 ? '+' : ''}TZS ${Math.abs(avgCorrectCostPerPiece - avgOldCostPerPiece).toFixed(2)}\n`);

    const batchesWithRecharges = results.filter(r => r.rechargeCount > 0).length;
    console.log(`   Batches with recharges: ${batchesWithRecharges} (${((batchesWithRecharges/results.length)*100).toFixed(1)}%)`);

    const batchesWithIncrease = results.filter(r => r.difference.costPerPiece > 0).length;
    const batchesWithDecrease = results.filter(r => r.difference.costPerPiece < 0).length;

    console.log(`   Batches with cost INCREASE: ${batchesWithIncrease}`);
    console.log(`   Batches with cost DECREASE: ${batchesWithDecrease}`);

    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');

    console.log('💡 INTERPRETATION:\n');
    if (totalDifference > 0) {
      console.log('   The CORRECT calculation shows HIGHER costs than old calculation.');
      console.log('   This means you were UNDERCHARGING your products!');
      console.log('   The fix will show you the TRUE cost of drying.\n');
    } else {
      console.log('   The CORRECT calculation shows LOWER costs than old calculation.');
      console.log('   This means you were OVERCHARGING internally!');
      console.log('   The fix will show you the TRUE (lower) cost of drying.\n');
    }

    console.log('✅ All data above shows what will happen when we apply the fix!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAllBatchesImpact();
