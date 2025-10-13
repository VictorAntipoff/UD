import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSerialNumbers() {
  try {
    console.log('Starting serial number update...');

    // Get all operations that have lotNumber and sleeperNumber
    const operations = await prisma.operation.findMany({
      where: {
        AND: [
          { lotNumber: { not: '' } },
          { sleeperNumber: { not: null } }
        ]
      }
    });

    console.log(`Found ${operations.length} operations to update`);

    let updated = 0;
    let skipped = 0;

    for (const operation of operations) {
      const newSerialNumber = `${operation.lotNumber}-SL${String(operation.sleeperNumber).padStart(3, '0')}`;

      // Only update if the serial number is different
      if (operation.serialNumber !== newSerialNumber) {
        await prisma.operation.update({
          where: { id: operation.id },
          data: { serialNumber: newSerialNumber }
        });

        console.log(`Updated: ${operation.serialNumber} → ${newSerialNumber}`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\nUpdate complete!`);
    console.log(`- Updated: ${updated}`);
    console.log(`- Skipped (already correct): ${skipped}`);
    console.log(`- Total: ${operations.length}`);

  } catch (error) {
    console.error('Error updating serial numbers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateSerialNumbers()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
