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
      readings: {
        orderBy: { readingTime: 'asc' }
      }
    },
    orderBy: { batchNumber: 'asc' }
  });

  processes.forEach(process => {
    console.log('='.repeat(60));
    console.log(`${process.batchNumber}`);
    console.log('='.repeat(60));

    const readingsWithLuku = process.readings.filter(r => r.lukuSms);
    console.log(`Total readings: ${process.readings.length}`);
    console.log(`Readings with Luku SMS: ${readingsWithLuku.length}\n`);

    if (readingsWithLuku.length > 0) {
      console.log('Readings with recharge:');
      readingsWithLuku.forEach((reading, idx) => {
        console.log(`  ${idx + 1}. ${reading.readingTime}`);
        console.log(`     Electricity: ${reading.electricityMeter}`);
        console.log(`     Luku SMS: ${reading.lukuSms?.substring(0, 50)}...`);
      });
    } else {
      console.log('No readings with Luku SMS recorded');
    }
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
