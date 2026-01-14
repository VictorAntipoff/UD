const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyMeasurements() {
  console.log('\n🔍 VERIFYING ACTUAL MEASUREMENTS IN LOT-2026-001\n');
  console.log('='.repeat(100));

  const mningaId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a';

  try {
    const lot = await prisma.lot.findFirst({
      where: { lotNumber: 'LOT-2026-001' },
      include: {
        measurements: {
          where: { woodTypeId: mningaId }
        }
      }
    });

    if (!lot) {
      console.log('❌ LOT-2026-001 not found');
      await prisma.$disconnect();
      return;
    }

    console.log('📦 LOT-2026-001 Status: ' + lot.status);
    console.log('Completed: ' + (lot.completedAt ? lot.completedAt.toISOString() : 'Not completed'));
    console.log('\n📏 DETAILED MEASUREMENTS:\n');

    let total1inch = 0;
    let total2inch = 0;
    let count1inch = 0;
    let count2inch = 0;

    console.log('┌────────────┬──────────┬──────────┬──────────┬──────────────────┐');
    console.log('│ Measurement│ Thickness│ Pieces   │ Volume   │ Dimensions       │');
    console.log('├────────────┼──────────┼──────────┼──────────┼──────────────────┤');

    for (const m of lot.measurements) {
      const id = m.id.substring(0, 8);
      const thickness = m.thickness;
      const pieces = m.numberOfPieces || 0;
      const volume = (m.volume || 0).toFixed(4);
      const dims = m.width + 'x' + m.length + (m.unit || '');

      console.log('│ ' + id.padEnd(10) + ' │ ' + thickness.padEnd(8) + ' │ ' + 
                  String(pieces).padStart(8) + ' │ ' + volume.padStart(8) + ' │ ' + 
                  dims.padEnd(16) + ' │');

      if (thickness === '1"') {
        total1inch += pieces;
        count1inch++;
      } else if (thickness === '2"' || thickness === '2') {
        total2inch += pieces;
        count2inch++;
      }
    }

    console.log('├────────────┴──────────┼──────────┼──────────┼──────────────────┤');
    console.log('│ 1" TOTAL (' + count1inch + ' measurements)│ ' + String(total1inch).padStart(8) + ' │          │                  │');
    console.log('│ 2" TOTAL (' + count2inch + ' measurements)│ ' + String(total2inch).padStart(8) + ' │          │                  │');
    console.log('└─────────────────────────┴──────────┴──────────┴──────────────────┘');

    console.log('\n✅ VERIFIED ACTUAL MEASUREMENTS:\n');
    console.log('   1" Mninga: ' + total1inch + ' pieces from ' + count1inch + ' measurements');
    console.log('   2" Mninga: ' + total2inch + ' pieces from ' + count2inch + ' measurements');
    console.log('\n   USER SAID: 2" = 130 pieces');
    console.log('   SYSTEM HAS: 2" = ' + total2inch + ' pieces');

    if (total2inch === 130) {
      console.log('\n   ✅ MATCH! User number is correct.');
    } else {
      console.log('\n   ❌ MISMATCH! Difference: ' + (total2inch - 130) + ' pieces');
      console.log('   The actual measurement is: ' + total2inch + ' pieces');
    }

    console.log('\n='.repeat(100));

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

verifyMeasurements().catch(console.error);
