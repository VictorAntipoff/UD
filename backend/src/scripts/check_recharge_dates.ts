// READ-ONLY: see when recharges were created vs the rechargeDate they have
import { prisma } from '../lib/prisma.js';

async function main() {
  const proc = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00039' },
    select: { id: true },
  });
  if (!proc) return;

  console.log('=== Recharges linked to UD-DRY-00039 ===');
  const linked = await prisma.electricityRecharge.findMany({
    where: { dryingProcessId: proc.id },
    orderBy: { rechargeDate: 'asc' },
  });
  for (const r of linked) {
    console.log({
      id: r.id,
      rechargeDate: r.rechargeDate.toISOString(),
      createdAt: (r as any).createdAt?.toISOString?.() ?? 'n/a',
      kwhAmount: r.kwhAmount,
      totalPaid: r.totalPaid,
      meterReadingBefore: (r as any).meterReadingBefore,
      meterReadingAfter: (r as any).meterReadingAfter,
    });
  }

  console.log('\n=== ALL recharges in last 7 days (any process) ===');
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const all = await prisma.electricityRecharge.findMany({
    where: { rechargeDate: { gte: since } },
    orderBy: { rechargeDate: 'asc' },
  });
  for (const r of all) {
    console.log({
      id: r.id,
      dryingProcessId: r.dryingProcessId,
      rechargeDate: r.rechargeDate.toISOString(),
      createdAt: (r as any).createdAt?.toISOString?.() ?? 'n/a',
      kwhAmount: r.kwhAmount,
      meterReadingBefore: (r as any).meterReadingBefore,
      meterReadingAfter: (r as any).meterReadingAfter,
    });
  }

  console.log('\n=== Reading history for UD-DRY-00039 (with createdAt) ===');
  const readings = await prisma.dryingReading.findMany({
    where: { dryingProcessId: proc.id },
    orderBy: { readingTime: 'asc' },
    select: {
      id: true,
      readingTime: true,
      createdAt: true,
      electricityMeter: true,
      humidity: true,
      createdByName: true,
      updatedByName: true,
    },
  });
  for (const r of readings) {
    console.log(`  readingTime=${r.readingTime.toISOString()}  createdAt=${r.createdAt.toISOString()}  meter=${r.electricityMeter}  humidity=${r.humidity}  by=${r.createdByName}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
