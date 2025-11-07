import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update all LOT_PENDING_APPROVAL notifications with wrong URL
  const result = await prisma.notification.updateMany({
    where: {
      type: 'LOT_PENDING_APPROVAL',
      linkUrl: '/dashboard/management/lot-management'
    },
    data: {
      linkUrl: '/dashboard/management/wood-receipt'
    }
  });
  
  console.log('Updated', result.count, 'notifications');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
