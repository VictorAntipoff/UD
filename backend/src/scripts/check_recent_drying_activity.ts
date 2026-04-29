import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('=== All drying processes (most recent first) ===');
  const all = await prisma.dryingProcess.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      id: true, batchNumber: true, status: true, totalCost: true,
      startTime: true, endTime: true, updatedAt: true,
      createdById: true, createdByName: true,
      notes: true,
    },
  });
  for (const p of all) {
    console.log(`\n--- ${p.batchNumber} (${p.status}) ---`);
    console.log(`  updated: ${p.updatedAt.toISOString()}`);
    console.log(`  endTime: ${p.endTime?.toISOString() || 'null'}`);
    console.log(`  totalCost: ${p.totalCost}`);
    console.log(`  createdBy: ${p.createdByName}`);
    console.log(`  notes:\n${p.notes || '(empty)'}`);
  }

  console.log('\n\n=== Recent notifications (any type, last 24h) ===');
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.notification.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, userId: true, type: true, title: true, message: true,
      createdAt: true, isRead: true,
    },
  });
  console.log(JSON.stringify(recent, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
