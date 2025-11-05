import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding timezone setting...');

    // Check if timezone setting already exists
    const existing = await prisma.setting.findUnique({
      where: { key: 'timezone' }
    });

    if (existing) {
      console.log('⚠️  Timezone setting already exists');
      console.log('Current value:', existing.value);
      return;
    }

    // Create timezone setting with default value for East Africa (Tanzania)
    await prisma.setting.create({
      data: {
        key: 'timezone',
        value: 'Africa/Dar_es_Salaam'
      }
    });

    console.log('✅ Successfully created timezone setting: Africa/Dar_es_Salaam');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
