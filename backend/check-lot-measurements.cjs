const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMeasurements() {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { lotNumber: 'LOT-2026-001' },
      include: {
        measurements: {
          orderBy: { thickness: 'asc' }
        }
      }
    });

    if (!receipt) {
      console.log('Receipt not found');
      return;
    }

    console.log('\n📋 LOT-2026-001 Measurements:\n');
    console.log('┌──────────┬────────────┬──────────┬──────────────┐');
    console.log('│ Thickness│ isCustom   │ Qty      │ Wood Type    │');
    console.log('├──────────┼────────────┼──────────┼──────────────┤');

    for (const m of receipt.measurements) {
      const thicknessStr = String(m.thickness).padEnd(8);
      const isCustomStr = String(m.isCustom).padEnd(10);
      const qtyStr = String(m.qty).padStart(8);
      const woodTypeStr = m.woodTypeId === '4d79f4da-bbce-43e0-af68-c28c1cd67c5a' ? 'Mninga' : 'Other';

      console.log('│ ' + thicknessStr + ' │ ' + isCustomStr + ' │ ' + qtyStr + ' │ ' + woodTypeStr.padEnd(12) + ' │');
    }
    console.log('└──────────┴────────────┴──────────┴──────────────┘');

    console.log('\n🔬 Testing parseFloat() behavior:\n');
    const mningaMeasurements = receipt.measurements.filter(m => m.woodTypeId === '4d79f4da-bbce-43e0-af68-c28c1cd67c5a');

    for (const m of mningaMeasurements) {
      const parsed = parseFloat(m.thickness);
      const asString = `${parsed}"`;
      console.log(`thickness: "${m.thickness}" -> parseFloat: ${parsed} -> key: "${asString}"`);
    }

    console.log('\n🔍 Simulating factory.ts stock grouping logic:\n');

    const stockByThickness = mningaMeasurements.reduce((acc, m) => {
      let thickness;

      if (m.isCustom === true) {
        thickness = 'Custom';
      } else if (m.isCustom === false) {
        const thicknessValue = parseFloat(m.thickness);
        thickness = `${thicknessValue}"`;  // THE PROBLEMATIC LINE
      } else {
        // Legacy fallback
        const thicknessValue = parseFloat(m.thickness);
        const STANDARD_SIZES = [1, 2, 3];
        thickness = STANDARD_SIZES.includes(thicknessValue)
          ? `${thicknessValue}"`
          : 'Custom';
      }

      if (!acc[thickness]) {
        acc[thickness] = 0;
      }
      acc[thickness] += parseInt(m.qty) || 1;
      return acc;
    }, {});

    console.log('stockByThickness object:', JSON.stringify(stockByThickness, null, 2));

    console.log('\n📊 Checking actual stock records:\n');

    const stock = await prisma.stock.findMany({
      where: {
        warehouseId: '86c38abc-bb70-42c3-ae8b-181dc4623376',
        woodTypeId: '4d79f4da-bbce-43e0-af68-c28c1cd67c5a'
      }
    });

    console.log('Stock records found:');
    for (const s of stock) {
      console.log(`  - thickness: "${s.thickness}" (NOT DRIED: ${s.statusNotDried}, DRIED: ${s.statusDried})`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

checkMeasurements();
