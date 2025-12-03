import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING READING 7 TIMESTAMP ===\n');

  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' },
    include: {
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } }
    }
  });

  const reading7 = process.readings.find(r => r.electricityMeter === 2834.89);
  const recharge = process.recharges[0];

  console.log('Reading 7 (WRONG TIME):');
  console.log('  Time:', reading7.readingTime);
  console.log('  Meter:', reading7.electricityMeter, 'kWh');
  console.log();
  console.log('Recharge:');
  console.log('  Time:', recharge.rechargeDate);
  console.log('  Meter After:', recharge.meterReadingAfter, 'kWh');
  console.log();
  console.log('PROBLEM: Reading 7 shows meter AFTER recharge (2834.89)');
  console.log('but timestamp is BEFORE recharge (06:07 vs 09:59)');
  console.log();
  console.log('FIX: Set Reading 7 time to be right after recharge');

  // Set Reading 7 time to be right after the recharge (e.g., 10:00)
  const correctedTime = new Date('2025-11-24T10:00:00.000Z');

  await prisma.dryingReading.update({
    where: { id: reading7.id },
    data: { readingTime: correctedTime }
  });

  console.log();
  console.log('✓ Reading 7 timestamp updated to:', correctedTime);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
