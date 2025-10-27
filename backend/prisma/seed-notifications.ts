import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const notificationEventTypes = [
  // Factory Operations
  {
    code: 'RECEIPT_CREATED',
    name: 'Receipt Created',
    description: 'Notify when a new wood receipt is created',
    category: 'Factory',
  },
  {
    code: 'RECEIPT_SUBMITTED',
    name: 'Receipt Submitted for Approval',
    description: 'Notify when a wood receipt is submitted for approval',
    category: 'Factory',
  },
  {
    code: 'RECEIPT_COMPLETED',
    name: 'Receipt Completed',
    description: 'Notify when a wood receipt is completed/confirmed',
    category: 'Factory',
  },
  {
    code: 'RECEIPT_REJECTED',
    name: 'Receipt Rejected',
    description: 'Notify when a wood receipt is rejected',
    category: 'Factory',
  },
  {
    code: 'DRYING_STARTED',
    name: 'Drying Process Started',
    description: 'Notify when a new drying process is started',
    category: 'Factory',
  },
  {
    code: 'DRYING_COMPLETED',
    name: 'Drying Process Completed',
    description: 'Notify when a drying process is completed',
    category: 'Factory',
  },
  {
    code: 'DRYING_READING_ADDED',
    name: 'Drying Reading Added',
    description: 'Notify when a new drying reading is recorded',
    category: 'Factory',
  },
  {
    code: 'OPERATION_SUBMITTED',
    name: 'Operation Submitted for Approval',
    description: 'Notify when a slicing operation is submitted for approval',
    category: 'Factory',
  },
  {
    code: 'OPERATION_APPROVED',
    name: 'Operation Approved',
    description: 'Notify when a slicing operation is approved',
    category: 'Factory',
  },
  {
    code: 'OPERATION_REJECTED',
    name: 'Operation Rejected',
    description: 'Notify when a slicing operation is rejected',
    category: 'Factory',
  },

  // Inventory & Transfers
  {
    code: 'TRANSFER_CREATED',
    name: 'Transfer Created',
    description: 'Notify when a new stock transfer is created',
    category: 'Inventory',
  },
  {
    code: 'TRANSFER_PENDING',
    name: 'Transfer Pending Approval',
    description: 'Notify when a transfer requires approval',
    category: 'Inventory',
  },
  {
    code: 'TRANSFER_APPROVED',
    name: 'Transfer Approved',
    description: 'Notify when a transfer is approved',
    category: 'Inventory',
  },
  {
    code: 'TRANSFER_REJECTED',
    name: 'Transfer Rejected',
    description: 'Notify when a transfer is rejected',
    category: 'Inventory',
  },
  {
    code: 'TRANSFER_IN_TRANSIT',
    name: 'Transfer In Transit',
    description: 'Notify when a transfer is marked as in transit',
    category: 'Inventory',
  },
  {
    code: 'TRANSFER_COMPLETED',
    name: 'Transfer Completed',
    description: 'Notify when a transfer is completed',
    category: 'Inventory',
  },
  {
    code: 'STOCK_LOW',
    name: 'Low Stock Alert',
    description: 'Notify when stock falls below minimum level',
    category: 'Inventory',
  },
  {
    code: 'STOCK_ADJUSTED',
    name: 'Stock Adjusted',
    description: 'Notify when stock is manually adjusted',
    category: 'Inventory',
  },

  // Assets
  {
    code: 'ASSET_CREATED',
    name: 'Asset Created',
    description: 'Notify when a new asset is added',
    category: 'Assets',
  },
  {
    code: 'ASSET_ASSIGNED',
    name: 'Asset Assigned',
    description: 'Notify when an asset is assigned to you',
    category: 'Assets',
  },
  {
    code: 'ASSET_MAINTENANCE_DUE',
    name: 'Maintenance Due',
    description: 'Notify when asset maintenance is due',
    category: 'Assets',
  },
  {
    code: 'ASSET_WARRANTY_EXPIRING',
    name: 'Warranty Expiring',
    description: 'Notify when asset warranty is about to expire',
    category: 'Assets',
  },

  // System
  {
    code: 'USER_ASSIGNED_WAREHOUSE',
    name: 'Warehouse Assigned',
    description: 'Notify when you are assigned to a warehouse',
    category: 'System',
  },
  {
    code: 'USER_REMOVED_WAREHOUSE',
    name: 'Warehouse Removed',
    description: 'Notify when you are removed from a warehouse',
    category: 'System',
  },
  {
    code: 'ROLE_CHANGED',
    name: 'Role Changed',
    description: 'Notify when your role is changed',
    category: 'System',
  },
];

async function seedNotificationEventTypes() {
  console.log('🌱 Seeding notification event types...');

  for (const eventType of notificationEventTypes) {
    await prisma.notificationEventType.upsert({
      where: { code: eventType.code },
      update: {
        name: eventType.name,
        description: eventType.description,
        category: eventType.category,
        isActive: true,
      },
      create: eventType,
    });
    console.log(`✅ ${eventType.code}`);
  }

  console.log('✨ Notification event types seeded successfully!');
}

seedNotificationEventTypes()
  .catch((error) => {
    console.error('❌ Error seeding notification event types:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
