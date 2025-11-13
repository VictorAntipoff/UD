import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const counts = {
      users: await prisma.user.count(),
      assets: await prisma.asset.count(),
      assetCategories: await prisma.assetCategory.count(),
      woodTypes: await prisma.woodType.count(),
      warehouses: await prisma.warehouse.count(),
      projects: await prisma.project.count(),
      operations: await prisma.operation.count(),
      dryingProcesses: await prisma.dryingProcess.count()
    };

    console.log('\n📊 Database Record Counts:\n');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`${table.padEnd(20)}: ${count}`);
    });
    console.log('');
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
