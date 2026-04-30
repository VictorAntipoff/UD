const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const dp = await prisma.dryingProcess.findMany({
    where: { OR: [{ updatedAt: { gte: cutoff } }, { createdAt: { gte: cutoff } }] },
    orderBy: { updatedAt: 'desc' },
    select: { batchNumber: true, status: true, createdAt: true, updatedAt: true },
  });
  console.log(`=== Drying processes touched in last 30min: ${dp.length} ===`);
  dp.forEach(d => console.log(`  ${d.batchNumber} status=${d.status} updated=${d.updatedAt.toISOString()}`));

  const victor = await prisma.user.findFirst({ where: { email: 'victor@udesign.co.tz' }, select: { id: true } });
  const notifs = await prisma.notification.findMany({
    where: { userId: victor.id, createdAt: { gte: cutoff } },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n=== Victor's in-app notifs in last 30min: ${notifs.length} ===`);
  notifs.forEach(n => console.log(`  ${n.createdAt.toISOString()} ${n.type}\n    title: ${n.title}\n    msg: ${n.message.slice(0, 200)}`));
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
