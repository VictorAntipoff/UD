const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function queryLotMeasurements() {
  console.log('\n' + '='.repeat(80));
  console.log('QUERYING MNINGA MEASUREMENTS IN LOT-2026-001');
  console.log('='.repeat(80) + '\n');

  const mningaWoodTypeId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    const receipt = await prisma.woodReceipt.findFirst({
      where: { lotNumber: 'LOT-2026-001' },
      include: {
        measurements: {
          orderBy: [
            { thickness: 'asc' },
            { width: 'asc' },
            { length: 'asc' }
          ]
        },
        woodType: true,
        warehouse: true
      }
    });

    if (!receipt) {
      console.log('ERROR: LOT-2026-001 not found in database\n');
      return;
    }

    console.log('Lot Number:', receipt.lotNumber);
    console.log('Wood Type:', receipt.woodType.name);
    console.log('Status:', receipt.status);
    console.log('Receipt Date:', receipt.receiptDate);
    console.log('Warehouse:', receipt.warehouse ? receipt.warehouse.name : 'Not assigned');
    console.log('Total measurement rows:', receipt.measurements.length);
    console.log();

    // Verify it's Mninga
    if (receipt.woodTypeId !== mningaWoodTypeId) {
      console.log('WARNING: This lot is not Mninga wood!');
      console.log('Wood Type ID:', receipt.woodTypeId);
      console.log('Expected Mninga ID:', mningaWoodTypeId);
      console.log();
    }

    // Group by thickness (assuming thickness is in inches, 1 or 2)
    // SleeperMeasurement stores thickness as Float
    const measurements1Inch = receipt.measurements.filter(m => m.thickness === 1);
    const measurements2Inch = receipt.measurements.filter(m => m.thickness === 2);

    if (measurements1Inch.length > 0) {
      console.log('='.repeat(80));
      console.log('1" MNINGA MEASUREMENTS');
      console.log('='.repeat(80));
      console.log();
      
      let total1Inch = 0;
      measurements1Inch.forEach((m, idx) => {
        console.log('Row ' + (idx + 1) + ':');
        console.log('  ID: ' + m.id);
        console.log('  Dimensions: ' + m.thickness + '" x ' + m.width + '" x ' + m.length + '"');
        console.log('  Piece Count (qty): ' + m.qty);
        console.log('  Volume: ' + m.volumeM3.toFixed(4) + ' m³');
        console.log();
        total1Inch += m.qty;
      });
      
      console.log('>>> TOTAL 1" MNINGA: ' + total1Inch + ' pieces <<<');
      console.log();
    } else {
      console.log('No 1" Mninga measurements found\n');
    }

    if (measurements2Inch.length > 0) {
      console.log('='.repeat(80));
      console.log('2" MNINGA MEASUREMENTS');
      console.log('='.repeat(80));
      console.log();
      
      let total2Inch = 0;
      measurements2Inch.forEach((m, idx) => {
        console.log('Row ' + (idx + 1) + ':');
        console.log('  ID: ' + m.id);
        console.log('  Dimensions: ' + m.thickness + '" x ' + m.width + '" x ' + m.length + '"');
        console.log('  Piece Count (qty): ' + m.qty);
        console.log('  Volume: ' + m.volumeM3.toFixed(4) + ' m³');
        console.log();
        total2Inch += m.qty;
      });
      
      console.log('>>> TOTAL 2" MNINGA: ' + total2Inch + ' pieces <<<');
      console.log();
    } else {
      console.log('No 2" Mninga measurements found\n');
    }

    const total1 = measurements1Inch.reduce((sum, m) => sum + m.qty, 0);
    const total2 = measurements2Inch.reduce((sum, m) => sum + m.qty, 0);
    
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('1" Mninga: ' + measurements1Inch.length + ' measurement rows = ' + total1 + ' pieces');
    console.log('2" Mninga: ' + measurements2Inch.length + ' measurement rows = ' + total2 + ' pieces');
    console.log();
    console.log('GRAND TOTAL: ' + (total1 + total2) + ' pieces of Mninga wood');
    console.log();
    console.log('Estimated pieces (from receipt header): ' + (receipt.estimatedPieces || 'Not set'));
    console.log('Actual pieces (from receipt header): ' + (receipt.actualPieces || 'Not set'));
    console.log();
    console.log('='.repeat(80));
    console.log('VERIFICATION AGAINST USER CLAIM');
    console.log('='.repeat(80));
    console.log('User claimed: 130 pieces of 2" Mninga');
    console.log('Database has: ' + total2 + ' pieces of 2" Mninga');
    console.log();
    if (total2 === 130) {
      console.log('RESULT: ✓ MATCH - User number is CORRECT');
    } else {
      console.log('RESULT: ✗ MISMATCH - Difference of ' + (total2 - 130) + ' pieces');
      if (total2 > 130) {
        console.log('        Actual count is HIGHER than claimed by ' + (total2 - 130) + ' pieces');
      } else {
        console.log('        Actual count is LOWER than claimed by ' + (130 - total2) + ' pieces');
      }
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

queryLotMeasurements().catch(console.error);
