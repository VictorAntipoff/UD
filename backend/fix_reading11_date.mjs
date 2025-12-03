import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING READING 11 DATE FOR UD-DRY-00010 ===\n');

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  // Find the reading with 2273.33
  const wrongReading = process.readings.find(r => r.electricityMeter === 2273.33);

  console.log('Current Reading 11:');
  console.log('  Meter:', wrongReading.electricityMeter, 'kWh');
  console.log('  Date:', wrongReading.readingTime);
  console.log('  WRONG DATE: Nov 26 should be Nov 25');

  // The date should be Nov 25, not Nov 26
  // Keep same time (21:39) but change date to Nov 25
  const correctDate = new Date('2025-11-25T18:39:00.000Z');

  console.log('\nCorrected Date:', correctDate);
  console.log('(Nov 25, 2025 at 21:39)');

  // Update the reading
  await prisma.dryingReading.update({
    where: { id: wrongReading.id },
    data: { readingTime: correctDate }
  });

  console.log('\n✓ Reading 11 date corrected successfully');

  // Now show the correct timeline
  console.log('\n=== CORRECTED TIMELINE ===');
  const updatedReadings = await prisma.dryingReading.findMany({
    where: { dryingProcessId: process.id },
    orderBy: { readingTime: 'asc' }
  });

  updatedReadings.slice(-3).forEach((r, i) => {
    console.log(`\nReading ${updatedReadings.length - 2 + i}:`);
    console.log(`  Time: ${r.readingTime}`);
    console.log(`  Meter: ${r.electricityMeter} kWh`);
  });

  // Now recalculate consumption with correct order
  console.log('\n=== RECALCULATING TOTAL CONSUMPTION ===');

  let totalConsumption = 0;
  let prevReading = process.startingElectricity;
  let prevTime = new Date(process.startTime);

  for (const reading of updatedReadings) {
    const currentTime = new Date(reading.readingTime);
    const currentReading = reading.electricityMeter;

    // Check for recharges between readings
    const rechargesBetween = process.recharges.filter(r => {
      const rDate = new Date(r.rechargeDate);
      return rDate > prevTime && rDate <= currentTime;
    });

    if (rechargesBetween.length > 0) {
      const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
      const consumed = prevReading + totalRecharged - currentReading;
      console.log(`Reading (after recharge): ${prevReading.toFixed(2)} + ${totalRecharged} - ${currentReading} = ${consumed.toFixed(2)} kWh`);
      totalConsumption += Math.max(0, consumed);
    } else {
      const consumed = prevReading - currentReading;
      if (consumed > 0) {
        console.log(`Reading: ${prevReading.toFixed(2)} - ${currentReading} = ${consumed.toFixed(2)} kWh`);
        totalConsumption += consumed;
      } else if (consumed < 0) {
        console.log(`⚠️  ERROR: Reading: ${prevReading.toFixed(2)} - ${currentReading} = ${consumed.toFixed(2)} kWh (NEGATIVE!)`);
      }
    }

    prevReading = currentReading;
    prevTime = currentTime;
  }

  console.log('\nTotal Electricity Consumed:', totalConsumption.toFixed(2), 'kWh');

  // Calculate costs
  const electricityRate = 356.25; // TSH/kWh
  const electricityCost = totalConsumption * electricityRate;

  const startTime = new Date(process.startTime);
  const endTime = new Date(updatedReadings[updatedReadings.length - 1].readingTime);
  const runningHours = (endTime - startTime) / (1000 * 60 * 60);

  // Get factory settings for other costs
  const settings = await prisma.factorySettings.findFirst();
  const depreciationCost = runningHours * settings.depreciationPerHour;
  const maintenanceCost = runningHours * settings.maintenancePerHour;
  const laborCost = runningHours * settings.laborCostPerHour;

  const totalCost = electricityCost + depreciationCost + maintenanceCost + laborCost;

  console.log('\n=== COST BREAKDOWN ===');
  console.log('Running Hours:', runningHours.toFixed(2), 'hours');
  console.log('Electricity Cost:', electricityCost.toFixed(2), 'TSH');
  console.log('Depreciation:', depreciationCost.toFixed(2), 'TSH');
  console.log('Maintenance:', maintenanceCost.toFixed(2), 'TSH');
  console.log('Labor:', laborCost.toFixed(2), 'TSH');
  console.log('TOTAL COST:', totalCost.toFixed(2), 'TSH');

  // Update drying process with correct cost
  await prisma.dryingProcess.update({
    where: { id: process.id },
    data: {
      totalCost: totalCost,
      endTime: endTime // Use last reading time as actual end time
    }
  });

  console.log('\n✓ Drying process cost and end time updated successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
