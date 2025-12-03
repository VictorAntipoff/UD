import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixRecharge() {
  console.log('=== FIXING DECEMBER 3 RECHARGE ===\n');

  // Find the recharge
  const recharge = await prisma.electricityRecharge.findFirst({
    where: {
      token: '147185518870274783922802'
    },
    include: {
      dryingProcess: {
        select: {
          id: true,
          batchNumber: true
        }
      }
    }
  });

  if (!recharge) {
    console.log('❌ Recharge not found!');
    await prisma.$disconnect();
    return;
  }

  console.log('Found recharge:');
  console.log('  ID:', recharge.id);
  console.log('  Current Total Paid:', recharge.totalPaid, 'TSH');
  console.log('  Process:', recharge.dryingProcess?.batchNumber);
  console.log('\n--- BEFORE ---');
  console.log('  totalPaid:', recharge.totalPaid);
  console.log('  baseCost:', recharge.baseCost || 'Not set');
  console.log('  vat:', recharge.vat || 'Not set');
  console.log('  ewuraFee:', recharge.ewuraFee || 'Not set');
  console.log('  reaFee:', recharge.reaFee || 'Not set');
  console.log('  debtCollected:', recharge.debtCollected || 'Not set');

  // Update with correct values from SMS
  const updated = await prisma.electricityRecharge.update({
    where: {
      id: recharge.id
    },
    data: {
      totalPaid: 1000000,
      baseCost: 818442.63,
      vat: 147319.67,
      ewuraFee: 8184.43,
      reaFee: 24553.27,
      debtCollected: 1500,
      notes: 'Corrected from SMS: TOTAL TZS 1000000.00'
    }
  });

  console.log('\n--- AFTER ---');
  console.log('  totalPaid:', updated.totalPaid);
  console.log('  baseCost:', updated.baseCost);
  console.log('  vat:', updated.vat);
  console.log('  ewuraFee:', updated.ewuraFee);
  console.log('  reaFee:', updated.reaFee);
  console.log('  debtCollected:', updated.debtCollected);

  console.log('\n✅ Recharge fixed successfully!');
  console.log('   Changed from 998,498 TSH → 1,000,000 TSH');
  console.log('   Added fee breakdown from SMS');

  // Now recalculate the drying process cost
  if (recharge.dryingProcess) {
    console.log('\n=== RECALCULATING DRYING PROCESS COSTS ===\n');

    const process = await prisma.dryingProcess.findUnique({
      where: { id: recharge.dryingProcess.id },
      include: {
        readings: {
          orderBy: { readingTime: 'asc' }
        },
        recharges: {
          orderBy: { rechargeDate: 'asc' }
        }
      }
    });

    if (!process) {
      console.log('❌ Process not found');
      await prisma.$disconnect();
      return;
    }

    // Calculate electricity consumption
    let totalConsumption = 0;
    let prevReading = process.startingElectricityUnits || 0;
    let prevTime = new Date(process.startTime);

    for (const reading of process.readings) {
      const currentReading = reading.electricityMeter;
      const currentTime = new Date(reading.readingTime);

      // Find recharges between previous and current reading
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

    // Get electricity rate (average from recharges)
    const totalRechargeAmount = process.recharges.reduce((sum, r) => sum + r.totalPaid, 0);
    const totalRechargeKwh = process.recharges.reduce((sum, r) => sum + r.kwhAmount, 0);
    const electricityRate = totalRechargeKwh > 0 ? totalRechargeAmount / totalRechargeKwh : 356.25;

    const electricityCost = totalConsumption * electricityRate;

    // Calculate running hours for depreciation
    const startTime = new Date(process.startTime);
    const endTime = process.endTime ? new Date(process.endTime) : new Date();
    const runningHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const depreciationCost = runningHours * 6000;

    const totalCost = electricityCost + depreciationCost;

    console.log('Process:', process.batchNumber);
    console.log('Electricity consumed:', totalConsumption.toFixed(2), 'kWh');
    console.log('Electricity rate:', electricityRate.toFixed(2), 'TSH/kWh');
    console.log('Electricity cost:', electricityCost.toFixed(2), 'TSH');
    console.log('Running hours:', runningHours.toFixed(2), 'hours');
    console.log('Depreciation cost:', depreciationCost.toFixed(2), 'TSH');
    console.log('Old total cost:', process.totalCost || 0, 'TSH');
    console.log('New total cost:', totalCost.toFixed(2), 'TSH');
    console.log('Difference:', (totalCost - (process.totalCost || 0)).toFixed(2), 'TSH');

    // Update the process
    await prisma.dryingProcess.update({
      where: { id: process.id },
      data: {
        totalCost: totalCost
      }
    });

    console.log('\n✅ Drying process cost updated!');
  }

  await prisma.$disconnect();
  console.log('\n=== ALL DONE ===');
}

fixRecharge().catch(console.error);
