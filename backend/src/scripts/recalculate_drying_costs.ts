import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RecalculationStats {
  totalProcesses: number;
  processesUpdated: number;
  errors: { batchNumber: string; error: string }[];
  details: Array<{
    batchNumber: string;
    oldCost: number;
    newCost: number;
    difference: number;
    percentChange: number;
    oldElectricity: number;
    newElectricity: number;
    oldHours: number;
    newHours: number;
  }>;
}

async function recalculateDryingCosts(): Promise<RecalculationStats> {
  const stats: RecalculationStats = {
    totalProcesses: 0,
    processesUpdated: 0,
    errors: [],
    details: []
  };

  try {
    console.log('🔍 Fetching settings and electricity rate...\n');

    // Get settings
    const settings: Record<string, number> = {};
    const settingsKeys = ['ovenPurchasePrice', 'ovenLifespanYears', 'maintenanceCostPerYear', 'laborCostPerHour'];

    for (const key of settingsKeys) {
      const setting = await prisma.setting.findUnique({ where: { key } });
      settings[key] = setting ? parseFloat(setting.value) : 0;
    }

    // Get electricity rate from most recent recharge with cost data
    const latestRecharge = await prisma.electricityRecharge.findFirst({
      where: { totalPaid: { gt: 0 } }, // Only recharges with actual cost data
      orderBy: { rechargeDate: 'desc' }
    });
    const electricityRate = latestRecharge ? (latestRecharge.totalPaid / latestRecharge.kwhAmount) : 292;

    // Calculate cost per hour rates
    const annualDepreciation = settings.ovenPurchasePrice / settings.ovenLifespanYears;
    const depreciationPerHour = annualDepreciation / 8760;
    const maintenancePerHour = settings.maintenanceCostPerYear / 8760;

    console.log('⚙️  SETTINGS:');
    console.log(`   Electricity Rate: ${electricityRate.toFixed(2)} TZS/unit`);
    console.log(`   Depreciation: ${depreciationPerHour.toFixed(2)} TZS/hour`);
    console.log(`   Maintenance: ${maintenancePerHour.toFixed(2)} TZS/hour`);
    console.log(`   Labor: ${settings.laborCostPerHour.toFixed(2)} TZS/hour\n`);

    console.log('🔍 Fetching completed drying processes...\n');

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
        },
        recharges: {
          orderBy: { rechargeDate: 'asc' }
        }
      },
      orderBy: { endTime: 'desc' }
    });

    stats.totalProcesses = processes.length;

    console.log(`Found ${processes.length} completed batches to recalculate\n`);
    console.log('='.repeat(80) + '\n');

    for (const process of processes) {
      try {
        console.log(`\n🔄 Processing batch ${process.batchNumber}...`);

        const totalPieces = process.items && process.items.length > 0
          ? process.items.reduce((sum, item) => sum + item.pieceCount, 0)
          : (process.pieceCount || 0);

        if (process.readings.length === 0 || totalPieces === 0) {
          console.log(`   ⚠️  Skipping - no readings or no pieces`);
          continue;
        }

        // Calculate OLD cost (for comparison)
        const firstReading = process.readings[0].electricityMeter;
        const lastReading = process.readings[process.readings.length - 1].electricityMeter;
        const oldElectricityUsed = Math.abs(lastReading - firstReading);

        const startTime = new Date(process.startTime).getTime();
        const endTimeWrong = process.endTime ? new Date(process.endTime).getTime() : startTime;
        const oldRunningHours = (endTimeWrong - startTime) / (1000 * 60 * 60);

        const oldElectricityCost = oldElectricityUsed * electricityRate;
        const oldDepreciationCost = oldRunningHours * depreciationPerHour;
        const oldMaintenanceCost = oldRunningHours * maintenancePerHour;
        const oldLaborCost = oldRunningHours * settings.laborCostPerHour;
        const oldTotalCost = oldElectricityCost + oldDepreciationCost + oldMaintenanceCost + oldLaborCost;

        console.log(`   OLD: ${oldElectricityUsed.toFixed(2)} kWh, ${oldRunningHours.toFixed(2)} hrs → TZS ${oldTotalCost.toLocaleString()}`);

        // Calculate CORRECT cost with recharge handling
        let correctElectricityUsed = 0;

        // Calculate electricity consumption with recharge awareness
        for (let i = 0; i < process.readings.length; i++) {
          const currentReading = process.readings[i];
          const currentTime = new Date(currentReading.readingTime);

          let prevReading: number;
          let prevTime: Date;

          if (i === 0) {
            prevReading = process.startingElectricityUnits || firstReading;
            prevTime = new Date(process.startTime);
          } else {
            prevReading = process.readings[i - 1].electricityMeter;
            prevTime = new Date(process.readings[i - 1].readingTime);
          }

          // Find recharges between prev and current reading
          const rechargesBetween = process.recharges.filter(r =>
            new Date(r.rechargeDate) > prevTime && new Date(r.rechargeDate) <= currentTime
          );

          if (rechargesBetween.length > 0) {
            // Recharge occurred - use formula: prevReading + recharged - currentReading
            const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
            const consumed = prevReading + totalRecharged - currentReading.electricityMeter;
            correctElectricityUsed += Math.max(0, consumed);
          } else {
            // Normal consumption (prepaid meter counting down)
            const consumed = prevReading - currentReading.electricityMeter;
            if (consumed > 0) {
              correctElectricityUsed += consumed;
            }
          }
        }

        // Running hours using LAST READING TIME (not endTime button click)
        const lastReadingTime = new Date(process.readings[process.readings.length - 1].readingTime).getTime();
        const correctRunningHours = (lastReadingTime - startTime) / (1000 * 60 * 60);

        // Calculate correct costs
        const correctElectricityCost = correctElectricityUsed * electricityRate;
        const correctDepreciationCost = correctRunningHours * depreciationPerHour;
        const correctMaintenanceCost = correctRunningHours * maintenancePerHour;
        const correctLaborCost = correctRunningHours * settings.laborCostPerHour;
        const correctTotalCost = correctElectricityCost + correctDepreciationCost + correctMaintenanceCost + correctLaborCost;

        console.log(`   NEW: ${correctElectricityUsed.toFixed(2)} kWh, ${correctRunningHours.toFixed(2)} hrs → TZS ${correctTotalCost.toLocaleString()}`);

        const difference = correctTotalCost - oldTotalCost;
        const percentChange = oldTotalCost > 0 ? (difference / oldTotalCost) * 100 : 0;

        console.log(`   CHANGE: ${difference >= 0 ? '+' : ''}TZS ${difference.toLocaleString()} (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`);

        // Update database with correct total cost
        await prisma.dryingProcess.update({
          where: { id: process.id },
          data: { totalCost: correctTotalCost }
        });

        stats.processesUpdated++;
        stats.details.push({
          batchNumber: process.batchNumber,
          oldCost: oldTotalCost,
          newCost: correctTotalCost,
          difference: difference,
          percentChange: percentChange,
          oldElectricity: oldElectricityUsed,
          newElectricity: correctElectricityUsed,
          oldHours: oldRunningHours,
          newHours: correctRunningHours
        });

        console.log(`   ✅ Updated database with correct cost`);

      } catch (error: any) {
        stats.errors.push({
          batchNumber: process.batchNumber,
          error: error.message
        });
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 RECALCULATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total processes: ${stats.totalProcesses}`);
    console.log(`Processes updated: ${stats.processesUpdated}`);
    console.log(`Errors encountered: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`   ${err.batchNumber}: ${err.error}`);
      });
    }

    if (stats.details.length > 0) {
      console.log('\n📈 COST CHANGES:');

      const totalOldCost = stats.details.reduce((sum, d) => sum + d.oldCost, 0);
      const totalNewCost = stats.details.reduce((sum, d) => sum + d.newCost, 0);
      const totalDifference = totalNewCost - totalOldCost;
      const totalPercentChange = totalOldCost > 0 ? (totalDifference / totalOldCost) * 100 : 0;

      console.log(`\n   TOTALS ACROSS ALL BATCHES:`);
      console.log(`   Old Total Cost: TZS ${totalOldCost.toLocaleString()}`);
      console.log(`   New Total Cost: TZS ${totalNewCost.toLocaleString()}`);
      console.log(`   Difference: ${totalDifference >= 0 ? '+' : ''}TZS ${totalDifference.toLocaleString()} (${totalPercentChange >= 0 ? '+' : ''}${totalPercentChange.toFixed(1)}%)`);

      console.log('\n   BY BATCH:');
      stats.details
        .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
        .forEach(detail => {
          console.log(`\n   ${detail.batchNumber}:`);
          console.log(`      Old: TZS ${detail.oldCost.toLocaleString()} (${detail.oldElectricity.toFixed(2)} kWh, ${detail.oldHours.toFixed(2)} hrs)`);
          console.log(`      New: TZS ${detail.newCost.toLocaleString()} (${detail.newElectricity.toFixed(2)} kWh, ${detail.newHours.toFixed(2)} hrs)`);
          console.log(`      Change: ${detail.difference >= 0 ? '+' : ''}TZS ${detail.difference.toLocaleString()} (${detail.percentChange >= 0 ? '+' : ''}${detail.percentChange.toFixed(1)}%)`);
        });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Cost recalculation completed!');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('❌ Fatal error during recalculation:', error);
    throw error;
  }

  return stats;
}

// Run recalculation
async function main() {
  console.log('🚀 Starting cost recalculation for all drying processes...\n');

  try {
    const stats = await recalculateDryingCosts();

    // Exit with appropriate code
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Recalculation completed with errors. Please review.');
      process.exit(1);
    } else {
      console.log('\n✅ Recalculation completed successfully with no errors!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Recalculation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
