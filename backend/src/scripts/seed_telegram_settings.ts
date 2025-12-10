import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Telegram settings...');

  // ALLOWED USER IDS
  await prisma.telegramSetting.upsert({
    where: { key: 'allowed_user_ids' },
    update: {},
    create: {
      key: 'allowed_user_ids',
      name: 'Allowed Telegram User IDs',
      type: 'LIST',
      category: 'PERMISSIONS',
      description: 'Comma-separated list of Telegram user IDs who can access the bot. Leave empty to allow everyone.',
      value: process.env.ALLOWED_TELEGRAM_IDS || '',
      isEditable: true
    }
  });

  // BOT USERNAME (READ-ONLY)
  await prisma.telegramSetting.upsert({
    where: { key: 'bot_username' },
    update: {},
    create: {
      key: 'bot_username',
      name: 'Bot Username',
      type: 'STRING',
      category: 'GENERAL',
      description: 'The Telegram bot username (read-only)',
      value: process.env.TELEGRAM_BOT_USERNAME || 'Not set',
      isEditable: false
    }
  });

  // BOT TOKEN (READ-ONLY - Security)
  await prisma.telegramSetting.upsert({
    where: { key: 'bot_token' },
    update: {},
    create: {
      key: 'bot_token',
      name: 'Bot Token',
      type: 'STRING',
      category: 'GENERAL',
      description: 'The Telegram bot API token (read-only for security)',
      value: '••••••••' + (process.env.TELEGRAM_BOT_TOKEN?.slice(-8) || ''),
      isEditable: false
    }
  });

  // BACKEND API URL
  // Determine the correct API URL based on environment
  const backendApiUrl = process.env.BACKEND_API_URL
    || process.env.RAILWAY_STATIC_URL
      ? `https://${process.env.RAILWAY_STATIC_URL}/api`
      : process.env.NODE_ENV === 'production'
        ? 'https://ud-backend-production.up.railway.app/api'
        : 'http://localhost:3010/api';

  await prisma.telegramSetting.upsert({
    where: { key: 'backend_api_url' },
    update: {
      value: backendApiUrl
    },
    create: {
      key: 'backend_api_url',
      name: 'Backend API URL',
      type: 'STRING',
      category: 'API',
      description: 'The backend API base URL used by the Telegram bot',
      value: backendApiUrl,
      isEditable: true
    }
  });

  // ENABLE NOTIFICATIONS
  await prisma.telegramSetting.upsert({
    where: { key: 'enable_notifications' },
    update: {},
    create: {
      key: 'enable_notifications',
      name: 'Enable Notifications',
      type: 'BOOLEAN',
      category: 'NOTIFICATIONS',
      description: 'Enable or disable bot notifications',
      value: 'true',
      isEditable: true
    }
  });

  // NOTIFICATION ADMINS
  await prisma.telegramSetting.upsert({
    where: { key: 'notification_admin_ids' },
    update: {},
    create: {
      key: 'notification_admin_ids',
      name: 'Notification Admin IDs',
      type: 'LIST',
      category: 'NOTIFICATIONS',
      description: 'Comma-separated list of admin user IDs who receive system notifications',
      value: '',
      isEditable: true
    }
  });

  // ENABLE DEBUG LOGGING
  await prisma.telegramSetting.upsert({
    where: { key: 'enable_debug' },
    update: {},
    create: {
      key: 'enable_debug',
      name: 'Enable Debug Logging',
      type: 'BOOLEAN',
      category: 'GENERAL',
      description: 'Enable detailed debug logging for troubleshooting',
      value: 'false',
      isEditable: true
    }
  });

  // MAX READINGS PER DAY
  await prisma.telegramSetting.upsert({
    where: { key: 'max_readings_per_day' },
    update: {},
    create: {
      key: 'max_readings_per_day',
      name: 'Max Readings Per Day',
      type: 'NUMBER',
      category: 'LIMITS',
      description: 'Maximum number of readings a user can submit per day (0 = unlimited)',
      value: '0',
      isEditable: true
    }
  });

  console.log('✅ Telegram settings seeded successfully!');
  console.log('📝 Total settings: 8');
  console.log('\nCategories:');
  console.log('  - GENERAL: 3 settings');
  console.log('  - PERMISSIONS: 1 setting');
  console.log('  - API: 1 setting');
  console.log('  - NOTIFICATIONS: 2 settings');
  console.log('  - LIMITS: 1 setting');
}

main()
  .catch((e) => {
    console.error('Error seeding settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
