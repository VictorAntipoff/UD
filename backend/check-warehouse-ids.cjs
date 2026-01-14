const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('CHECKING WAREHOUSE IDS');
  console.log('='.repeat(80));
  console.log();
  
  // Get all warehouses
  const warehouses = await prisma.warehouse.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  console.log('All warehouses in database:');
  console.log();
  warehouses.forEach(w => {
    console.log('ID: ' + w.id);
    console.log('Name: ' + w.name);
    console.log('Location: ' + (w.location || 'N/A'));
    console.log();
  });
  
  console.log('='.repeat(80));
  console.log();
  
  // Get LOT-2026-001 warehouse
  const lot = await prisma.woodReceipt.findFirst({
    where: { lotNumber: 'LOT-2026-001' },
    include: {
      warehouse: true
    }
  });
  
  if (lot) {
    console.log('LOT-2026-001 is assigned to:');
    console.log('Warehouse ID: ' + lot.warehouseId);
    console.log('Warehouse Name: ' + (lot.warehouse ? lot.warehouse.name : 'Not found'));
    console.log('Warehouse Location: ' + (lot.warehouse && lot.warehouse.location ? lot.warehouse.location : 'N/A'));
  }
  
  console.log();
  console.log('='.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
