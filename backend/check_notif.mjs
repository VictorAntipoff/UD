import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function check() {
  const victor = await prisma.user.findUnique({
    where: { email: 'victor@udesign.co.tz' }
  });
  
  console.log('Victor ID:', victor.id);
  
  const all = await prisma.notification.findMany({
    where: { userId: victor.id },
    orderBy: { createdAt: 'desc' }
  });
  
  const unread = all.filter(n => !n.isRead);
  
  console.log('Total:', all.length);
  console.log('Unread:', unread.length);
  console.log('');
  
  all.forEach(n => {
    console.log((n.isRead ? 'READ' : 'UNREAD') + ' - ' + n.title);
    console.log('  ' + n.message);
    console.log('');
  });
  
  await prisma.$disconnect();
}

check();
