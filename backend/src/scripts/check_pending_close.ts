import { prisma } from '../lib/prisma.js';

async function main() {
  const procs = await prisma.dryingProcess.findMany({
    where: { status: 'PENDING_CLOSE' },
    select: {
      id: true, batchNumber: true, status: true, totalCost: true,
      createdById: true, createdByName: true, updatedAt: true, notes: true,
    },
  });
  console.log('=== PENDING_CLOSE processes ===');
  console.log(JSON.stringify(procs, null, 2));

  console.log('\n=== Role distribution (User) ===');
  const allRoles = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
  console.log(JSON.stringify(allRoles, null, 2));

  console.log('\n=== Admins matching role=ADMIN AND isActive=true ===');
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });
  console.log(JSON.stringify(admins, null, 2));

  console.log('\n=== Recent DRYING_CLOSE_REQUESTED notifications ===');
  const recent = await prisma.notification.findMany({
    where: { type: 'DRYING_CLOSE_REQUESTED' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, userId: true, type: true, title: true, createdAt: true, isRead: true },
  });
  console.log(JSON.stringify(recent, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
