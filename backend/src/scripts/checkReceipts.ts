import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReceipts() {
  try {
    const receipts = await prisma.woodReceipt.findMany({
      select: {
        lotNumber: true,
        status: true,
        createdAt: true,
        WoodType: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    console.log('Recent receipts:');
    console.table(receipts.map(r => ({
      LOT: r.lotNumber,
      Status: r.status,
      WoodType: r.WoodType.name,
      Created: r.createdAt.toLocaleDateString()
    })));

    const drafts = await prisma.receiptDraft.findMany({
      select: {
        receiptId: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 15
    });

    console.log('\nRecent drafts:');
    console.table(drafts.map(d => ({
      LOT: d.receiptId,
      Updated: d.updatedAt.toLocaleDateString()
    })));

    const statusCounts = await prisma.woodReceipt.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('\nStatus counts:');
    console.table(statusCounts);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReceipts();
