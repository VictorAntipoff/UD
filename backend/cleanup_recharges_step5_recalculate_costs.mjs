import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== STEP 5: RECALCULATE ALL DRYING PROCESS COSTS ===\n');

  const processes = await prisma.dryingProcess.findMany({
    where: { status: 'COMPLETED' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    },
    orderBy: { batchNumber: 'asc' }
  });

  console.log(`Found ${processes.length} completed processes\n`);

  const settings = {
    depreciationPerHour: 6000,
    maintenancePerHour: 0,
    laborCostPerHour: 0
  };

  for (const process of processes) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`${process.batchNumber}`);
    console.log('─'.repeat(80));

    // Calculate electricity consumption
    let totalConsumption = 0;
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
        totalConsumption += Math.max(0, consumed);
      } else {
        const consumed = prevReading - currentReading;
        if (consumed > 0) {
          totalConsumption += consumed;
        }
      }

      prevReading = currentReading;
      prevTime = currentTime;
    }

    // Calculate costs
    const startTime = new Date(process.startTime);
    const endTime = process.endTime ? new Date(process.endTime) : new Date(process.readings[process.readings.length - 1]?.readingTime);
    const runningHours = (endTime - startTime) / (1000 * 60 * 60);

    const electricityRate = 356.25;
    const electricityCost = totalConsumption * electricityRate;
    const depreciationCost = runningHours * settings.depreciationPerHour;
    const maintenanceCost = runningHours * settings.maintenancePerHour;
    const laborCost = runningHours * settings.laborCostPerHour;
    const totalCost = electricityCost + depreciationCost + maintenanceCost + laborCost;

    console.log(`Consumption: ${totalConsumption.toFixed(2)} kWh`);
    console.log(`Running time: ${runningHours.toFixed(2)} hours`);
    console.log(`Recharges: ${process.recharges.length}`);
    console.log();
    console.log(`Electricity: ${electricityCost.toFixed(2)} TSH`);
    console.log(`Depreciation: ${depreciationCost.toFixed(2)} TSH`);
    console.log(`Total: ${totalCost.toFixed(2)} TSH`);
    console.log();
    console.log(`Previous cost: ${process.totalCost?.toFixed(2) || 'N/A'} TSH`);

    const diff = totalCost - (process.totalCost || 0);
    console.log(`Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} TSH`);

    // Update database
    await prisma.dryingProcess.update({
      where: { id: process.id },
      data: { totalCost: totalCost }
    });

    console.log(`✅ Updated`);
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('✅ ALL COSTS RECALCULATED');
  console.log('='.repeat(80));
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
