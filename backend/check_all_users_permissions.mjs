import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllUsersPermissions() {
  try {
    console.log('🔍 SECURITY AUDIT: Checking ALL users permissions...\n');

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { email: 'asc' }
    });

    console.log(`Found ${allUsers.length} total users in database\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    allUsers.forEach((user, idx) => {
      console.log(`\n╔═══════════════════════════════════════════════════════════════════════════════╗`);
      console.log(`║ USER ${idx + 1} OF ${allUsers.length}`);
      console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝`);
      console.log(`Email:     ${user.email}`);
      console.log(`Name:      ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`Role:      ${user.role}`);
      console.log(`Status:    ${user.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`Created:   ${user.createdAt.toISOString().split('T')[0]}`);
      console.log('───────────────────────────────────────────────────────────────────────────────');

      console.log('\n📋 PERMISSIONS ANALYSIS:\n');

      if (!user.permissions || typeof user.permissions !== 'object') {
        console.log('⚠️  NO PERMISSIONS SET - User cannot access any modules');
      } else {
        const permissions = user.permissions;
        const modules = Object.keys(permissions);

        if (modules.length === 0) {
          console.log('⚠️  EMPTY PERMISSIONS - User cannot access any modules');
        } else {
          console.log(`   Configured for ${modules.length} module(s):\n`);

          modules.forEach(module => {
            const perms = permissions[module];
            const hasAccess = perms.access || false;
            const canSeeAmount = perms.amount || false;

            console.log(`   📦 ${module}:`);
            console.log(`      ├─ access:  ${hasAccess ? '✅' : '❌'}  ${perms.access || false}`);
            console.log(`      ├─ read:    ${perms.read ? '✅' : '❌'}  ${perms.read || false}`);
            console.log(`      ├─ create:  ${perms.create ? '✅' : '❌'}  ${perms.create || false}`);
            console.log(`      ├─ edit:    ${perms.edit ? '✅' : '❌'}  ${perms.edit || false}`);
            console.log(`      ├─ delete:  ${perms.delete ? '✅' : '❌'}  ${perms.delete || false}`);
            console.log(`      └─ amount:  ${canSeeAmount ? '✅ CAN SEE COSTS/PRICES' : '❌ HIDDEN'} ${perms.amount || false}`);

            // Highlight critical security issue
            if (hasAccess && !canSeeAmount) {
              console.log(`         ⚠️  CRITICAL: User has access but amount is set to FALSE`);
              console.log(`         🔒 Costs/prices/electricity MUST be hidden for this user`);
            }
            console.log('');
          });

          // Special check for drying-process
          if (permissions['drying-process']) {
            const dryingPerms = permissions['drying-process'];
            console.log(`   🚨 DRYING PROCESS SECURITY CHECK:`);
            console.log(`      Can access page: ${dryingPerms.access ? '✅ YES' : '❌ NO'}`);
            console.log(`      Can see electricity/costs: ${dryingPerms.amount ? '✅ YES' : '❌ NO - MUST BE HIDDEN'}`);
          }
        }
      }

      console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');
    });

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║ SECURITY SUMMARY');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

    const usersWithDryingAccess = allUsers.filter(u =>
      u.permissions &&
      u.permissions['drying-process'] &&
      u.permissions['drying-process'].access === true
    );

    const usersWithDryingAmountHidden = usersWithDryingAccess.filter(u =>
      u.permissions['drying-process'].amount === false
    );

    console.log(`Total users:                              ${allUsers.length}`);
    console.log(`Users with drying-process access:         ${usersWithDryingAccess.length}`);
    console.log(`Users who CANNOT see amounts/costs:       ${usersWithDryingAmountHidden.length}`);
    console.log('');

    if (usersWithDryingAmountHidden.length > 0) {
      console.log('🔒 Users who should NOT see electricity/costs:');
      usersWithDryingAmountHidden.forEach(u => {
        console.log(`   - ${u.email} (${u.firstName} ${u.lastName})`);
      });
      console.log('');
      console.log('⚠️  CRITICAL: These users MUST NOT see:');
      console.log('   - Electricity Used column');
      console.log('   - Electricity costs');
      console.log('   - Total costs');
      console.log('   - Any price/amount information');
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsersPermissions();
