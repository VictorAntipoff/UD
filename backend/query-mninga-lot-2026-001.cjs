const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function queryMningaLot2026001() {
  try {
    console.log('='.repeat(80));
    console.log('QUERYING MNINGA MEASUREMENTS IN LOT-2026-001');
    console.log('='.repeat(80));
    console.log();

    // First, get the lot
    const lot = await prisma.lot.findFirst({
      where: { lotNumber: 'LOT-2026-001' }
    });

    if (!lot) {
      console.log('ERROR: LOT-2026-001 not found in database');
      return;
    }

    console.log('Found lot: ' + lot.lotNumber + ' (ID: ' + lot.id + ')');
    console.log();

    // Get all Mninga measurements for this lot
    const measurements = await prisma.measurement.findMany({
      where: {
        lotId: lot.id,
        species: 'Mninga'
      },
      orderBy: [
        { thickness: 'asc' },
        { width: 'asc' },
        { length: 'asc' }
      ]
    });

    if (measurements.length === 0) {
      console.log('ERROR: No Mninga measurements found for this lot');
      return;
    }

    console.log('Found ' + measurements.length + ' Mninga measurement rows\n');

    // Group by thickness
    const by1Inch = measurements.filter(m => m.thickness === 1);
    const by2Inch = measurements.filter(m => m.thickness === 2);

    // Display 1" Mninga
    if (by1Inch.length > 0) {
      console.log('='.repeat(80));
      console.log('1" MNINGA MEASUREMENTS');
      console.log('='.repeat(80));
      console.log();
      
      let total1Inch = 0;
      by1Inch.forEach((m, idx) => {
        console.log('Row ' + (idx + 1) + ':');
        console.log('  ID: ' + m.id);
        console.log('  Dimensions: ' + m.thickness + '" x ' + m.width + '" x ' + m.length + '"');
        console.log('  Piece Count: ' + m.pieceCount);
        console.log('  Created: ' + m.createdAt);
        console.log();
        total1Inch += m.pieceCount;
      });
      
      console.log('TOTAL 1" MNINGA PIECES: ' + total1Inch);
      console.log();
    }

    // Display 2" Mninga
    if (by2Inch.length > 0) {
      console.log('='.repeat(80));
      console.log('2" MNINGA MEASUREMENTS');
      console.log('='.repeat(80));
      console.log();
      
      let total2Inch = 0;
      by2Inch.forEach((m, idx) => {
        console.log('Row ' + (idx + 1) + ':');
        console.log('  ID: ' + m.id);
        console.log('  Dimensions: ' + m.thickness + '" x ' + m.width + '" x ' + m.length + '"');
        console.log('  Piece Count: ' + m.pieceCount);
        console.log('  Created: ' + m.createdAt);
        console.log();
        total2Inch += m.pieceCount;
      });
      
      console.log('TOTAL 2" MNINGA PIECES: ' + total2Inch);
      console.log();
    }

    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    const total1 = by1Inch.reduce((sum, m) => sum + m.pieceCount, 0);
    const total2 = by2Inch.reduce((sum, m) => sum + m.pieceCount, 0);
    const grandTotal = measurements.reduce((sum, m) => sum + m.pieceCount, 0);
    
    console.log('Total 1" Mninga rows: ' + by1Inch.length);
    console.log('Total 1" Mninga pieces: ' + total1);
    console.log('Total 2" Mninga rows: ' + by2Inch.length);
    console.log('Total 2" Mninga pieces: ' + total2);
    console.log();
    console.log('GRAND TOTAL Mninga pieces: ' + grandTotal);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

queryMningaLot2026001();
