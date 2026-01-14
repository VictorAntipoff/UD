import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testThicknessFilter() {
  try {
    // Get Mninga wood type ID
    const mninga = await prisma.woodType.findFirst({
      where: { name: { contains: 'Mninga', mode: 'insensitive' } }
    });

    if (!mninga) {
      console.log('Mninga not found');
      return;
    }

    console.log('Testing filter: Mninga + thickness');
    console.log('Wood Type ID:', mninga.id);
    console.log('');

    // Count movements for Mninga with 2" thickness
    const movements2Inch = await prisma.stockMovement.count({
      where: {
        woodTypeId: mninga.id,
        thickness: '2"'
      }
    });

    console.log('Movements for Mninga 2":', movements2Inch);

    // Count movements for Mninga with 1" thickness
    const movements1Inch = await prisma.stockMovement.count({
      where: {
        woodTypeId: mninga.id,
        thickness: '1"'
      }
    });

    console.log('Movements for Mninga 1":', movements1Inch);

    // Count all movements for Mninga (no thickness filter)
    const movementsAll = await prisma.stockMovement.count({
      where: {
        woodTypeId: mninga.id
      }
    });

    console.log('Total movements for Mninga (all):', movementsAll);
    console.log('');

    // Show sample movements for 2"
    console.log('Sample 2" movements:');
    const sample2 = await prisma.stockMovement.findMany({
      where: {
        woodTypeId: mninga.id,
        thickness: '2"'
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        warehouse: { select: { name: true, code: true } }
      }
    });

    sample2.forEach(m => {
      const date = new Date(m.createdAt).toLocaleDateString();
      const sign = m.quantityChange > 0 ? '+' : (m.quantityChange < 0 ? '' : ' ');
      console.log(`  ${date} | ${m.movementType.padEnd(20)} | ${m.warehouse.name.padEnd(20)} | ${m.thickness} | ${sign}${m.quantityChange}`);
    });

    console.log('');
    console.log('Sample 1" movements:');
    const sample1 = await prisma.stockMovement.findMany({
      where: {
        woodTypeId: mninga.id,
        thickness: '1"'
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        warehouse: { select: { name: true, code: true } }
      }
    });

    sample1.forEach(m => {
      const date = new Date(m.createdAt).toLocaleDateString();
      const sign = m.quantityChange > 0 ? '+' : (m.quantityChange < 0 ? '' : ' ');
      console.log(`  ${date} | ${m.movementType.padEnd(20)} | ${m.warehouse.name.padEnd(20)} | ${m.thickness} | ${sign}${m.quantityChange}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testThicknessFilter();
