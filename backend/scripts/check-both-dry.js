import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const processes = await prisma.dryingProcess.findMany({
    where: {
      OR: [
        { batchNumber: 'UD-DRY-00001' },
        { batchNumber: 'UD-DRY-00002' }
      ]
    },
    include: {
      woodType: true,
      readings: {
        orderBy: { readingTime: 'asc' }
      }
    },
    orderBy: { batchNumber: 'asc' }
  });

  processes.forEach(process => {
    console.log('='.repeat(60));
    console.log(`${process.batchNumber} - ${process.woodType.name} ${process.thickness}mm`);
    console.log('='.repeat(60));
    console.log(`Status: ${process.status}`);
    console.log(`Pieces: ${process.pieceCount}`);
    console.log(`Start Time: ${process.startTime}`);
    console.log(`Starting Humidity: ${process.startingHumidity}%`);
    console.log(`Starting Electricity: ${process.startingElectricityUnits}`);
    console.log(`\nReadings (${process.readings.length}):`);

    if (process.readings.length === 0) {
      console.log('  No readings yet');
    } else {
      process.readings.forEach((reading, idx) => {
        console.log(`  ${idx + 1}. ${reading.readingTime}`);
        console.log(`     Humidity: ${reading.humidity}%`);
        console.log(`     Electricity: ${reading.electricityMeter}`);
        console.log(`     Notes: ${reading.notes || '(none)'}`);
      });
    }

    // Calculate hours elapsed
    const startTime = new Date(process.startTime);
    const now = new Date();
    const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
    console.log(`\nHours elapsed since start: ${hoursElapsed.toFixed(1)} hours`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
