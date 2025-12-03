import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== MISSING RECHARGE DETAILS - DRY BY DRY ===\n');

  const processesWithIssues = [
    'UD-DRY-00001',
    'UD-DRY-00002',
    'UD-DRY-00003',
    'UD-DRY-00005',
    'UD-DRY-00007',
    'UD-DRY-00008'
  ];

  for (const batchNumber of processesWithIssues) {
    console.log('='.repeat(80));
    console.log(`\n📋 ${batchNumber}\n`);
    console.log('='.repeat(80));

    const process = await prisma.dryingProcess.findUnique({
      where: { batchNumber },
      include: {
        readings: { orderBy: { readingTime: 'asc' } },
        recharges: { orderBy: { rechargeDate: 'asc' } },
        items: { include: { woodType: true } }
      }
    });

    // Show process info
    console.log(`\nProcess Info:`);
    console.log(`  Start: ${process.startTime}`);
    console.log(`  End: ${process.endTime}`);
    console.log(`  Starting Meter: ${process.startingElectricityUnits} kWh`);
    console.log(`  Current Cost: ${process.totalCost?.toFixed(2) || 'N/A'} TSH`);

    if (process.items.length > 0) {
      console.log(`  Items: ${process.items.map(i => i.description || `${i.quantity} pcs`).join(', ')}`);
    }

    // Show existing recharges
    console.log(`\nExisting Recharges: ${process.recharges.length}`);
    if (process.recharges.length > 0) {
      process.recharges.forEach((r, i) => {
        console.log(`  ${i + 1}. Token ${r.token}: ${r.kwhAmount} kWh for ${r.totalPaid.toLocaleString()} TSH on ${r.rechargeDate}`);
      });
    }

    // Analyze readings for missing recharges
    console.log(`\nReadings Analysis:`);

    let prevReading = process.startingElectricityUnits;
    let prevTime = new Date(process.startTime);
    const missingRecharges = [];

    for (let i = 0; i < process.readings.length; i++) {
      const reading = process.readings[i];
      const currentTime = new Date(reading.readingTime);
      const currentReading = reading.electricityMeter;

      // Check for recharge between
      const rechargesBetween = process.recharges.filter(r => {
        const rDate = new Date(r.rechargeDate);
        return rDate > prevTime && rDate <= currentTime;
      });

      const hasRecharge = rechargesBetween.length > 0;
      const meterChange = currentReading - prevReading;

      console.log(`  Reading ${i + 1}: ${reading.readingTime}`);
      console.log(`    Meter: ${prevReading?.toFixed(2)} → ${currentReading} (${meterChange > 0 ? '+' : ''}${meterChange.toFixed(2)} kWh)`);

      if (hasRecharge) {
        console.log(`    ✓ Recharge found: +${rechargesBetween[0].kwhAmount} kWh`);
      } else if (meterChange > 100) {
        console.log(`    ❌ MISSING RECHARGE: Meter increased by ${meterChange.toFixed(2)} kWh without record`);
        missingRecharges.push({
          readingNumber: i + 1,
          prevReading,
          currentReading,
          increase: meterChange,
          timestamp: reading.readingTime
        });
      } else if (meterChange > 0) {
        console.log(`    ⚠️  Small increase (${meterChange.toFixed(2)} kWh) - may be error`);
      }

      prevReading = currentReading;
      prevTime = currentTime;
    }

    // Show what needs to be added
    if (missingRecharges.length > 0) {
      console.log(`\n⚠️  MISSING ${missingRecharges.length} RECHARGE(S) TO ADD:`);
      missingRecharges.forEach((mr, idx) => {
        const kwhToAdd = Math.round(mr.increase);
        const tshToAdd = Math.round(kwhToAdd * (1000000 / 2807));

        console.log(`\n  Recharge ${idx + 1} (before Reading ${mr.readingNumber}):`);
        console.log(`    kWh needed: ${kwhToAdd} kWh`);
        console.log(`    Estimated cost: ${tshToAdd.toLocaleString()} TSH`);
        console.log(`    Meter after: ${mr.currentReading} kWh`);
        console.log(`    Approximate time: ${mr.timestamp}`);
      });
    } else {
      console.log(`\n✅ No missing recharges detected`);
    }

    console.log();
  }

  console.log('='.repeat(80));
  console.log('\nSUMMARY:');
  console.log('- These recharges were done but NOT logged in the database');
  console.log('- The meter readings show the increases happened');
  console.log('- We need to add these recharge records for accurate cost calculation');
  console.log('='.repeat(80));
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
