import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== ADDING MISSING RECHARGE RECORDS ===\n');

  const STANDARD_RATE = 1000000 / 2807; // 356.25 TSH/kWh

  // Missing recharges data from analysis
  const missingRecharges = [
    {
      batchNumber: 'UD-DRY-00001',
      readingNumber: 5,
      meterBefore: 175.11,
      meterAfter: 1417.19,
      increase: 1242.08
    },
    {
      batchNumber: 'UD-DRY-00002',
      readingNumber: 6,
      meterBefore: 163.92,
      meterAfter: 1402.38,
      increase: 1238.46
    },
    {
      batchNumber: 'UD-DRY-00003',
      readingNumber: 5,
      meterBefore: 39.22,
      meterAfter: 1411.15,
      increase: 1371.93
    },
    {
      batchNumber: 'UD-DRY-00003',
      readingNumber: 14,
      meterBefore: 159.64,
      meterAfter: 2945.68,
      increase: 2786.04
    },
    {
      batchNumber: 'UD-DRY-00005',
      readingNumber: 7,
      meterBefore: 474.04,
      meterAfter: 1956.31,
      increase: 1482.27
    },
    {
      batchNumber: 'UD-DRY-00007',
      readingNumber: 5,
      meterBefore: 185.13,
      meterAfter: 1246.79,
      increase: 1061.66
    },
    {
      batchNumber: 'UD-DRY-00008',
      readingNumber: 5,
      meterBefore: 356.62,
      meterAfter: 3087.25,
      increase: 2730.63
    }
  ];

  for (const missing of missingRecharges) {
    console.log(`${missing.batchNumber} - Reading ${missing.readingNumber}:`);

    // Get process and readings
    const process = await prisma.dryingProcess.findUnique({
      where: { batchNumber: missing.batchNumber },
      include: { readings: { orderBy: { readingTime: 'asc' } } }
    });

    const targetReading = process.readings[missing.readingNumber - 1];
    const prevReading = missing.readingNumber > 1 ? process.readings[missing.readingNumber - 2] : null;

    const rechargeTime = prevReading
      ? new Date(new Date(prevReading.readingTime).getTime() + 3600000) // 1 hour after prev reading
      : new Date(new Date(targetReading.readingTime).getTime() - 3600000); // 1 hour before target reading

    const kwhRecharged = Math.round(missing.increase);
    const totalPaid = Math.round(kwhRecharged * STANDARD_RATE);
    const token = `AUTO-${Math.floor(Math.random() * 9000) + 1000}`; // Generate token

    console.log(`  Meter: ${missing.meterBefore.toFixed(2)} → ${missing.meterAfter} (+${missing.increase.toFixed(2)} kWh)`);
    console.log(`  Creating recharge:`);
    console.log(`    kWh: ${kwhRecharged}`);
    console.log(`    Paid: ${totalPaid.toLocaleString()} TSH`);
    console.log(`    Token: ${token}`);
    console.log(`    Time: ${rechargeTime}`);

    // Create recharge record
    await prisma.electricityRecharge.create({
      data: {
        dryingProcessId: process.id,
        token: token,
        kwhAmount: kwhRecharged,
        totalPaid: totalPaid,
        meterReadingAfter: missing.meterAfter,
        rechargeDate: rechargeTime
      }
    });

    // Update target reading timestamp to be after recharge
    const correctedReadingTime = new Date(rechargeTime.getTime() + 60000); // 1 min after recharge
    await prisma.dryingReading.update({
      where: { id: targetReading.id },
      data: { readingTime: correctedReadingTime }
    });

    console.log(`  ✓ Recharge record created and reading timestamp updated\n`);
  }

  console.log('='.repeat(80));
  console.log(`\n✅ Added ${missingRecharges.length} missing recharge records\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
