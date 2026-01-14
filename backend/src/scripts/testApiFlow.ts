import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simulate the API flow
async function testApiFlow() {
  try {
    const woodTypeId = '4d79f4da-bbce-43e0-af68-c28c1cd67c5a'; // Mninga
    const thickness = '2"';
    const days = 90;

    console.log('Simulating API call:');
    console.log(`GET /api/management/stock/movements/${woodTypeId}?thickness=${thickness}&days=${days}`);
    console.log('');

    // Build filters (same logic as in management.ts)
    const filters: any = {
      woodTypeId,
      thickness,
    };

    if (days) {
      const daysNum = parseInt(days.toString());
      if (!isNaN(daysNum)) {
        filters.startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
        filters.endDate = new Date();
      }
    }

    console.log('Filters being used:');
    console.log(JSON.stringify(filters, null, 2));
    console.log('');

    // Call the service function (same as getStockMovements)
    const where: any = {};

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.woodTypeId) {
      where.woodTypeId = filters.woodTypeId;
    }

    if (filters.thickness) {
      where.thickness = filters.thickness;
    }

    if (filters.movementType) {
      where.movementType = filters.movementType;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    console.log('Prisma WHERE clause:');
    console.log(JSON.stringify(where, null, 2));
    console.log('');

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        woodType: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${movements.length} movements`);
    console.log('');

    if (movements.length > 0) {
      console.log('First 5 movements:');
      movements.slice(0, 5).forEach(m => {
        const date = new Date(m.createdAt).toLocaleDateString();
        const sign = m.quantityChange > 0 ? '+' : (m.quantityChange < 0 ? '' : ' ');
        console.log(`  ${date} | ${m.movementType.padEnd(20)} | ${m.woodType.name} | ${m.thickness} | ${sign}${m.quantityChange}`);
      });
    }

    // Verify thickness
    const wrongThickness = movements.filter(m => m.thickness !== thickness);
    if (wrongThickness.length > 0) {
      console.log('');
      console.log(`⚠️  WARNING: Found ${wrongThickness.length} movements with wrong thickness!`);
      wrongThickness.forEach(m => {
        console.log(`  Movement ID ${m.id} has thickness: ${m.thickness}`);
      });
    } else {
      console.log('');
      console.log('✅ All movements have correct thickness filter applied!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiFlow();
