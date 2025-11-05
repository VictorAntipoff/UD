import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Updating reading usernames...');

    // Get all readings that don't have createdByName set
    const readings = await prisma.dryingReading.findMany({
      where: {
        OR: [
          { createdByName: null },
          { createdByName: '' }
        ]
      }
    });

    console.log(`Found ${readings.length} readings without usernames`);

    let updated = 0;
    for (const reading of readings) {
      if (reading.createdById) {
        // Fetch the user separately
        const user = await prisma.user.findUnique({
          where: { id: reading.createdById }
        });

        if (user) {
          const userName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email;

          await prisma.dryingReading.update({
            where: { id: reading.id },
            data: {
              createdByName: userName
            }
          });
          updated++;
          console.log(`Updated reading ${reading.id} with username: ${userName}`);
        } else {
          console.log(`⚠️  User not found for reading ${reading.id} (userId: ${reading.createdById})`);
        }
      }
    }

    console.log(`✅ Successfully updated ${updated} readings`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
