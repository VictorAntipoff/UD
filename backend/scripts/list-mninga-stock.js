import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding all Mninga stock entries...\n');

  const stocks = await prisma.stock.findMany({
    where: {
      woodType: {
        name: 'Mninga'
      }
    },
    include: {
      warehouse: true,
      woodType: true
    }
  });

  console.log(`Found ${stocks.length} Mninga stock entries:\n`);

  stocks.forEach(stock => {
    console.log('---');
    console.log(`Stock ID: ${stock.id}`);
    console.log(`Warehouse: ${stock.warehouse.name} (${stock.warehouse.code})`);
    console.log(`Wood: ${stock.woodType.name}`);
    console.log(`Thickness: ${stock.thickness}`);
    console.log(`Not Dried: ${stock.statusNotDried}`);
    console.log(`Under Drying: ${stock.statusUnderDrying}`);
    console.log(`Dried: ${stock.statusDried}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
