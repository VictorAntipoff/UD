import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking notifications...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    for (const user of users) {
      console.log(`\n=== User: ${user.email} (${user.firstName} ${user.lastName}) ===`);

      // Get all notifications for this user
      const allNotifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get unread count
      const unreadCount = await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false
        }
      });

      console.log(`Total notifications: ${allNotifications.length}`);
      console.log(`Unread count: ${unreadCount}`);

      if (allNotifications.length > 0) {
        console.log('\nNotifications:');
        allNotifications.forEach((notif, idx) => {
          console.log(`  ${idx + 1}. [${notif.isRead ? 'READ' : 'UNREAD'}] ${notif.title}`);
          console.log(`     Message: ${notif.message.substring(0, 60)}...`);
          console.log(`     Type: ${notif.type}`);
          console.log(`     Created: ${notif.createdAt}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
