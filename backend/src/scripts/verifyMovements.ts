import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMovements() {
  try {
    const mninga = await prisma.woodType.findFirst({
      where: { name: { contains: 'Mninga', mode: 'insensitive' } }
    });

    if (!mninga) {
      console.log('Mninga wood type not found');
      return;
    }

    console.log('Wood Type:', mninga.name);
    console.log('ID:', mninga.id);
    console.log('');

    const count = await prisma.stockMovement.count({
      where: { woodTypeId: mninga.id }
    });

    console.log(`Total movements for ${mninga.name}: ${count}`);

    const movements = await prisma.stockMovement.findMany({
      where: { woodTypeId: mninga.id },
      include: {
        warehouse: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('\nRecent movements:');
    console.log('━'.repeat(80));
    movements.forEach(m => {
      const date = new Date(m.createdAt).toLocaleDateString();
      const sign = m.quantityChange > 0 ? '+' : '';
      console.log(`${date} | ${m.movementType.padEnd(20)} | ${m.warehouse.name.padEnd(20)} | ${sign}${m.quantityChange}`);
    });
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMovements();
