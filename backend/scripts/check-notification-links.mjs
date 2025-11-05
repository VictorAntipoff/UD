import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking notification linkUrls...\n');

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        linkUrl: true,
        isRead: true,
        createdAt: true
      }
    });

    console.log(`Found ${notifications.length} notifications:\n`);

    notifications.forEach((notif, idx) => {
      console.log(`${idx + 1}. ${notif.title}`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   LinkUrl: ${notif.linkUrl || '(null)'}`);
      console.log(`   Read: ${notif.isRead}`);
      console.log(`   Created: ${notif.createdAt}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
