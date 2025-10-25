import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixReadingTimes() {
  try {
    console.log('Fetching all drying readings...');
    const readings = await prisma.dryingReading.findMany({
      orderBy: { readingTime: 'asc' }
    });

    console.log(`Found ${readings.length} readings to fix`);

    let fixedCount = 0;
    for (const reading of readings) {
      // Subtract 3 hours from the readingTime
      const currentTime = new Date(reading.readingTime);
      const correctedTime = new Date(currentTime.getTime() - (3 * 60 * 60 * 1000));

      console.log(`Fixing reading ${reading.id}:`);
      console.log(`  Old time: ${currentTime.toISOString()}`);
      console.log(`  New time: ${correctedTime.toISOString()}`);

      await prisma.dryingReading.update({
        where: { id: reading.id },
        data: { readingTime: correctedTime }
      });

      fixedCount++;
    }

    console.log(`\nSuccessfully fixed ${fixedCount} readings`);
  } catch (error) {
    console.error('Error fixing reading times:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixReadingTimes();
