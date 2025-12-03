import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const process = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00010' }
  });

  console.log('UD-DRY-00010 Starting Values:');
  console.log(JSON.stringify(process, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
