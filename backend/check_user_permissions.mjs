import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserPermissions() {
  try {
    console.log('🔍 Checking m.nahas user permissions...\n');

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: 'm.nahas' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        isActive: true
      }
    });

    if (!user) {
      console.log('❌ User "m.nahas" not found in database');
      return;
    }

    console.log('✅ User found:');
    console.log('───────────────────────────────────────────────────────');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Role: ${user.role}`);
    console.log(`Active: ${user.isActive}`);
    console.log('───────────────────────────────────────────────────────\n');

    console.log('📋 Permissions:');
    console.log('───────────────────────────────────────────────────────');

    if (!user.permissions || typeof user.permissions !== 'object') {
      console.log('❌ No permissions set (or invalid format)');
    } else {
      const permissions = user.permissions;

      // Check for drying-process permissions specifically
      if (permissions['drying-process']) {
        console.log('\n🔥 DRYING PROCESS PERMISSIONS:');
        console.log('   access:', permissions['drying-process'].access || false);
        console.log('   read:', permissions['drying-process'].read || false);
        console.log('   create:', permissions['drying-process'].create || false);
        console.log('   edit:', permissions['drying-process'].edit || false);
        console.log('   delete:', permissions['drying-process'].delete || false);
        console.log('   amount:', permissions['drying-process'].amount || false, '⚠️  COST/AMOUNT VISIBILITY');
      } else {
        console.log('\n❌ No "drying-process" permissions found');
      }

      // Show all modules
      console.log('\n📦 All module permissions:');
      const modules = Object.keys(permissions);
      if (modules.length === 0) {
        console.log('   (empty)');
      } else {
        modules.forEach(module => {
          const perms = permissions[module];
          const amountStatus = perms.amount ? '✅' : '❌';
          console.log(`\n   ${module}:`);
          console.log(`      access: ${perms.access || false}`);
          console.log(`      read: ${perms.read || false}`);
          console.log(`      create: ${perms.create || false}`);
          console.log(`      edit: ${perms.edit || false}`);
          console.log(`      delete: ${perms.delete || false}`);
          console.log(`      amount: ${perms.amount || false} ${amountStatus}`);
        });
      }
    }

    console.log('\n───────────────────────────────────────────────────────');

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPermissions();
