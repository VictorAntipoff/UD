import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== RECALCULATING UD-DRY-00010 WITH CORRECT TIMELINE ===\n');

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  console.log('=== TIMELINE ===');
  console.log('Start:', process.startTime, '- Meter:', process.startingElectricityUnits, 'kWh');

  process.readings.forEach((r, i) => {
    console.log(`Reading ${i + 1}:`, r.readingTime, '- Meter:', r.electricityMeter, 'kWh');
  });

  process.recharges.forEach((r, i) => {
    console.log(`Recharge ${i + 1}:`, r.rechargeDate, '- Added:', r.kwhAmount, 'kWh, Meter After:', r.meterReadingAfter, 'kWh');
  });

  // Calculate consumption correctly
  console.log('\n=== CONSUMPTION CALCULATION ===');

  let totalConsumption = 0;
  let prevReading = process.startingElectricityUnits;
  let prevTime = new Date(process.startTime);

  for (let i = 0; i < process.readings.length; i++) {
    const reading = process.readings[i];
    const currentTime = new Date(reading.readingTime);
    const currentReading = reading.electricityMeter;

    // Find recharges between previous reading and current reading
    const rechargesBetween = process.recharges.filter(r => {
      const rDate = new Date(r.rechargeDate);
      return rDate > prevTime && rDate <= currentTime;
    });

    if (rechargesBetween.length > 0) {
      // There was a recharge between readings
      const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
      const meterAfterRecharge = rechargesBetween[0].meterReadingAfter;

      // Consumption = prevReading + recharged - currentReading
      const consumed = prevReading + totalRecharged - currentReading;

      console.log(`\nReading ${i + 1} (with recharge):`);
      console.log(`  Meter before: ${prevReading.toFixed(2)} kWh`);
      console.log(`  Recharge: +${totalRecharged} kWh → ${meterAfterRecharge} kWh`);
      console.log(`  Meter after: ${currentReading} kWh`);
      console.log(`  Consumed: ${prevReading.toFixed(2)} + ${totalRecharged} - ${currentReading} = ${consumed.toFixed(2)} kWh`);

      totalConsumption += Math.max(0, consumed);
    } else {
      // Normal consumption (meter counting down)
      const consumed = prevReading - currentReading;

      if (consumed > 0) {
        console.log(`\nReading ${i + 1}: ${prevReading.toFixed(2)} - ${currentReading} = ${consumed.toFixed(2)} kWh`);
        totalConsumption += consumed;
      } else {
        console.log(`\nReading ${i + 1}: ⚠️  Meter went UP without recharge: ${prevReading.toFixed(2)} → ${currentReading}`);
      }
    }

    prevReading = currentReading;
    prevTime = currentTime;
  }

  console.log('\n=== TOTAL CONSUMPTION ===');
  console.log('Total Electricity Used:', totalConsumption.toFixed(2), 'kWh');

  // Calculate costs
  const electricityRate = 356.25; // TSH/kWh (1,000,000 TSH / 2807 kWh)
  const electricityCost = totalConsumption * electricityRate;

  const startTime = new Date(process.startTime);
  const endTime = new Date(process.readings[process.readings.length - 1].readingTime);
  const runningHours = (endTime - startTime) / (1000 * 60 * 60);

  // Get factory settings (hardcoded as per system design)
  const depreciationPerHour = 6000; // TSH/hour
  const maintenancePerHour = 0; // TSH/hour
  const laborPerHour = 0; // TSH/hour

  const depreciationCost = runningHours * depreciationPerHour;
  const maintenanceCost = runningHours * maintenancePerHour;
  const laborCost = runningHours * laborPerHour;

  const totalCost = electricityCost + depreciationCost + maintenanceCost + laborCost;

  console.log('\n=== COST BREAKDOWN ===');
  console.log('Running Time:', runningHours.toFixed(2), 'hours');
  console.log('');
  console.log('Electricity:', totalConsumption.toFixed(2), 'kWh × 356.25 TSH/kWh =', electricityCost.toFixed(2), 'TSH');
  console.log('Depreciation:', runningHours.toFixed(2), 'hrs × 6,000 TSH/hr =', depreciationCost.toFixed(2), 'TSH');
  console.log('Maintenance:', runningHours.toFixed(2), 'hrs × 0 TSH/hr =', maintenanceCost.toFixed(2), 'TSH');
  console.log('Labor:', runningHours.toFixed(2), 'hrs × 0 TSH/hr =', laborCost.toFixed(2), 'TSH');
  console.log('');
  console.log('TOTAL COST:', totalCost.toFixed(2), 'TSH');

  // Update database
  await prisma.dryingProcess.update({
    where: { id: process.id },
    data: {
      totalCost: totalCost,
      endTime: endTime
    }
  });

  console.log('\n✓ Database updated successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
