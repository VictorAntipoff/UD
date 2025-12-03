import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' },
    include: {
      readings: {
        orderBy: { readingTime: 'desc' },
        take: 2
      }
    }
  });

  console.log('\nLast 2 Readings:');
  process.readings.forEach((r, i) => {
    console.log(`\nReading ${i === 0 ? '11 (LAST)' : '10'}:`);
    console.log(`  Time: ${r.readingTime}`);
    console.log(`  Meter: ${r.electricityMeter} kWh`);
    console.log(`  Notes: ${r.notes || 'N/A'}`);
  });

  console.log(`\n=== ANALYSIS ===`);
  if (process.readings.length >= 2) {
    const reading11 = process.readings[0].electricityMeter;
    const reading10 = process.readings[1].electricityMeter;
    console.log(`Reading 10: ${reading10} kWh`);
    console.log(`Reading 11: ${reading11} kWh`);
    console.log(`Change: ${(reading11 - reading10).toFixed(2)} kWh`);

    if (reading11 > reading10) {
      console.log(`\n⚠️  ERROR: Meter INCREASED without recharge!`);
      console.log(`\nLikely typo in Reading 11: ${reading11}`);
      console.log(`Possible corrections:`);
      [1273.33, 1973.33, 2073.33, 2173.33, 2193.33, 2213.33].forEach(corrected => {
        if (corrected < reading10) {
          const consumption = reading10 - corrected;
          console.log(`  - ${corrected} kWh (consumes ${consumption.toFixed(2)} kWh)`);
        }
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
