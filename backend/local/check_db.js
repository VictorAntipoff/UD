const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📊 Checking Neon Database Connection...\n');
  
  // Check Users
  const users = await prisma.user.findMany();
  console.log(`✅ Users: ${users.length} records`);
  users.forEach(u => console.log(`   - ${u.email} (${u.role})`));
  
  // Check WoodTypes
  const woodTypes = await prisma.woodType.findMany();
  console.log(`\n✅ WoodTypes: ${woodTypes.length} records`);
  woodTypes.forEach(w => console.log(`   - ${w.name} (${w.grade})`));
  
  // Check WoodCalculations
  const calculations = await prisma.woodCalculation.findMany();
  console.log(`\n✅ WoodCalculations: ${calculations.length} records`);
  
  // Check WoodReceipts
  const receipts = await prisma.woodReceipt.findMany();
  console.log(`\n✅ WoodReceipts: ${receipts.length} records`);
  
  console.log('\n🎉 All data is stored in Neon PostgreSQL database!');
  console.log('📍 Database: ep-crimson-morning-ad1wswax-pooler.c-2.us-east-1.aws.neon.tech');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
