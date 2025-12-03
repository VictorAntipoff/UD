import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== STEP 2A: FIX TOKEN 5065 TIMESTAMP ===\n');

  // Token 5065 belongs to DRY-00005 and should be dated Nov 5, 17:23 (not Nov 24)
  const token5065 = await prisma.electricityRecharge.findFirst({
    where: { token: { contains: '5065' } },
    include: { dryingProcess: true }
  });

  if (!token5065) {
    console.log('❌ Token 5065 not found\n');
    return;
  }

  console.log('Current state:');
  console.log(`  Token: ${token5065.token}`);
  console.log(`  Assigned to: ${token5065.dryingProcess?.batchNumber || 'None (orphaned)'}`);
  console.log(`  Date: ${token5065.rechargeDate} ❌ WRONG`);
  console.log(`  kWh: ${token5065.kwhAmount}`);
  console.log(`  Paid: ${token5065.totalPaid.toLocaleString()} TSH`);
  console.log();

  // Get DRY-00005 details
  const dry005 = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00005' },
    include: { readings: { orderBy: { readingTime: 'asc' } } }
  });

  console.log('UD-DRY-00005 Details:');
  console.log(`  Start: ${dry005.startTime}`);
  console.log(`  End: ${dry005.endTime}`);
  console.log();

  console.log('SMS Receipt shows:');
  console.log(`  Date: 2025-11-05 17:23 ✅ CORRECT`);
  console.log();

  // Find the reading that should have this recharge
  const correctDate = new Date('2025-11-05T17:23:00');

  // Find reading after the recharge
  const readingAfter = dry005.readings.find(r => new Date(r.readingTime) > correctDate);

  if (readingAfter) {
    console.log(`Reading after recharge:`);
    console.log(`  Time: ${readingAfter.readingTime}`);
    console.log(`  Meter: ${readingAfter.electricityMeter} kWh`);
    console.log();
  }

  // Update the recharge
  console.log('Updating Token 5065...');
  await prisma.electricityRecharge.update({
    where: { id: token5065.id },
    data: {
      rechargeDate: correctDate,
      dryingProcessId: dry005.id, // Ensure it's assigned to DRY-00005
      meterReadingAfter: readingAfter?.electricityMeter || null
    }
  });

  console.log('✅ Token 5065 updated successfully\n');

  // Verify
  const updated = await prisma.electricityRecharge.findUnique({
    where: { id: token5065.id },
    include: { dryingProcess: true }
  });

  console.log('Updated state:');
  console.log(`  Token: ${updated.token}`);
  console.log(`  Assigned to: ${updated.dryingProcess.batchNumber}`);
  console.log(`  Date: ${updated.rechargeDate} ✅`);
  console.log(`  Meter After: ${updated.meterReadingAfter} kWh`);
  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
