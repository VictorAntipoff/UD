import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkNotifications() {
  try {
    const victor = await prisma.user.findUnique({
      where: { email: 'victor@udesign.co.tz' }
    });

    if (!victor) {
      console.log('Victor not found');
      return;
    }

    console.log('Victor ID:', victor.id);
    console.log('');

    const notifications = await prisma.notification.findMany({
      where: { userId: victor.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log('Total notifications:', notifications.length);
    console.log('');

    const unread = notifications.filter(n => n.isRead === false);
    console.log('Unread count:', unread.length);
    console.log('');

    console.log('All notifications:');
    notifications.forEach((n, i) => {
      const status = n.isRead ? 'READ' : 'UNREAD';
      console.log(`${i + 1}. [${status}] ${n.title}`);
      console.log(`   Message: ${n.message}`);
      console.log(`   Type: ${n.type}`);
      console.log(`   Created: ${n.createdAt}`);
      console.log(`   Link: ${n.linkUrl || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
