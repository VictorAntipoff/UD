import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function checkDrying() {
  try {
    const drying = await prisma.dryingProcess.findFirst({
      where: { processNumber: 'UD-DRY-00010' },
      include: {
        chamberAssignments: {
          include: {
            chamber: true
          }
        },
        lukuReadings: {
          orderBy: { readingDate: 'asc' }
        }
      }
    });

    if (!drying) {
      console.log('Drying process UD-DRY-00010 not found');
      return;
    }

    console.log('=== UD-DRY-00010 Details ===');
    console.log('Status:', drying.status);
    console.log('Start Date:', drying.startDate);
    console.log('End Date:', drying.endDate);
    console.log('Total Pieces:', drying.totalPieces);
    console.log('Total Volume:', drying.totalVolumeM3);
    console.log('');

    console.log('Chamber Assignments:', drying.chamberAssignments.length);
    drying.chamberAssignments.forEach(ca => {
      console.log('  Chamber:', ca.chamber.name);
      console.log('  Pieces:', ca.piecesAssigned);
      console.log('');
    });

    console.log('Luku Readings:', drying.lukuReadings.length);
    let totalLuku = 0;
    drying.lukuReadings.forEach(lr => {
      console.log('  Date:', lr.readingDate);
      console.log('  Luku Amount:', lr.lukuAmount);
      console.log('  Rate:', lr.lukuRate);
      console.log('  Cost:', lr.cost);
      console.log('');
      totalLuku += lr.lukuAmount;
    });

    console.log('Total Luku Amount:', totalLuku);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDrying();
