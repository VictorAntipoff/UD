import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING DRY-00012 LUKU CALCULATION BUG ===\n');

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00012' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  console.log('PROBLEM IDENTIFIED:');
  console.log('─'.repeat(80));
  console.log('Reading 5 timestamp: 2025-12-03T09:20:00 (meter shows 2766.01 kWh)');
  console.log('Recharge timestamp:  2025-12-03T09:22:32 (2 minutes LATER)');
  console.log('');
  console.log('But the meter reading of 2766.01 kWh clearly shows the recharge');
  console.log('has ALREADY happened (jumped from 45.12 to 2766.01).');
  console.log('');
  console.log('The recharge SMS timestamp is AFTER the reading, but the meter value');
  console.log('shows the recharge happened BEFORE the reading was taken.\n');

  console.log('SOLUTION:');
  console.log('─'.repeat(80));
  console.log('Adjust the recharge timestamp to be BEFORE Reading 5.');
  console.log('Set it to 09:19:00 (1 minute before the reading).\n');

  // Update recharge timestamp
  const recharge = process.recharges[0];
  const newRechargeTime = new Date('2025-12-03T09:19:00.000Z');

  console.log('Updating recharge timestamp...');
  await prisma.electricityRecharge.update({
    where: { id: recharge.id },
    data: { rechargeDate: newRechargeTime }
  });
  console.log('✓ Recharge timestamp updated\n');

  // Now recalculate the cost using correct logic
  console.log('RECALCULATING ELECTRICITY CONSUMPTION:');
  console.log('─'.repeat(80));

  let totalElectricityUsed = 0;
  let prevReading = process.startingElectricityUnits;
  let prevTime = new Date(process.startTime);

  for (let i = 0; i < process.readings.length; i++) {
    const currentReading = process.readings[i];
    const currentTime = new Date(currentReading.readingTime);

    if (i > 0) {
      prevReading = process.readings[i - 1].electricityMeter;
      prevTime = new Date(process.readings[i - 1].readingTime);
    }

    // Find recharges between prev and current reading (with updated timestamp)
    const rechargesBetween = process.recharges.filter(r => {
      const rTime = (r.id === recharge.id) ? newRechargeTime : new Date(r.rechargeDate);
      return rTime > prevTime && rTime <= currentTime;
    });

    let consumed;
    if (rechargesBetween.length > 0) {
      const totalRecharged = rechargesBetween.reduce((sum, r) => sum + r.kwhAmount, 0);
      consumed = prevReading + totalRecharged - currentReading.electricityMeter;
      totalElectricityUsed += Math.max(0, consumed);
      console.log(`Reading ${i + 1}: ${currentTime.toISOString().substring(0, 16)}`);
      console.log(`  WITH RECHARGE: ${prevReading.toFixed(2)} + ${totalRecharged} - ${currentReading.electricityMeter} = ${consumed.toFixed(2)} kWh`);
    } else {
      consumed = prevReading - currentReading.electricityMeter;
      if (consumed > 0) {
        totalElectricityUsed += consumed;
      }
      console.log(`Reading ${i + 1}: ${currentTime.toISOString().substring(0, 16)}`);
      console.log(`  ${prevReading.toFixed(2)} - ${currentReading.electricityMeter} = ${consumed.toFixed(2)} kWh`);
    }
  }

  console.log(`\nTotal Electricity Used: ${totalElectricityUsed.toFixed(2)} kWh\n`);

  // Calculate costs
  const electricityRate = recharge.totalPaid / recharge.kwhAmount;
  const startTime = new Date(process.startTime).getTime();
  const lastReading = process.readings[process.readings.length - 1];
  const lastReadingTime = new Date(lastReading.readingTime).getTime();
  const runningHours = (lastReadingTime - startTime) / (1000 * 60 * 60);

  const electricityCost = totalElectricityUsed * electricityRate;
  const depreciationCost = runningHours * 6000; // Depreciation per hour
  const totalCost = electricityCost + depreciationCost;

  console.log('COST CALCULATION:');
  console.log('─'.repeat(80));
  console.log(`Electricity: ${totalElectricityUsed.toFixed(2)} kWh × ${electricityRate.toFixed(2)} TSH/kWh = ${electricityCost.toFixed(2)} TSH`);
  console.log(`Depreciation: ${runningHours.toFixed(2)} hours × 6000 TSH/hr = ${depreciationCost.toFixed(2)} TSH`);
  console.log('─'.repeat(80));
  console.log(`TOTAL: ${totalCost.toFixed(2)} TSH\n`);

  console.log('UPDATING DATABASE:');
  console.log('─'.repeat(80));
  console.log(`Old cost: ${process.totalCost.toFixed(2)} TSH`);
  console.log(`New cost: ${totalCost.toFixed(2)} TSH`);
  console.log(`Difference: ${(totalCost - process.totalCost).toFixed(2)} TSH\n`);

  await prisma.dryingProcess.update({
    where: { id: process.id },
    data: { totalCost }
  });

  console.log('✅ DRY-00012 FIXED!\n');
  console.log('='.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
