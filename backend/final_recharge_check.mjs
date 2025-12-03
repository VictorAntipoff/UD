import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function finalCheck() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         FINAL PRE-PUSH VERIFICATION CHECK                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // 1. Check all recharges
  console.log('1️⃣  CHECKING ALL RECHARGES...\n');

  const recharges = await prisma.electricityRecharge.findMany({
    include: {
      dryingProcess: {
        select: {
          batchNumber: true,
          status: true
        }
      }
    },
    orderBy: {
      rechargeDate: 'desc'
    }
  });

  console.log(`   Total Recharges: ${recharges.length}`);
  console.log(`   Expected: 9 recharges\n`);

  if (recharges.length !== 9) {
    console.log('   ⚠️  WARNING: Expected 9 recharges, found', recharges.length);
  } else {
    console.log('   ✅ Recharge count correct\n');
  }

  // Check for issues
  let issues = [];
  let orphaned = 0;
  let totalKwh = 0;
  let totalPaid = 0;

  console.log('   Checking each recharge...\n');
  recharges.forEach((r, i) => {
    const num = i + 1;
    const date = new Date(r.rechargeDate).toISOString().split('T')[0];
    const process = r.dryingProcess?.batchNumber || 'Unassigned';

    console.log(`   ${num}. ${date} | ${r.kwhAmount.toFixed(1)} kWh | ${r.totalPaid.toLocaleString()} TSH | ${process}`);

    // Check for issues
    if (!r.dryingProcessId) {
      orphaned++;
      issues.push(`Recharge ${num} is orphaned (no process assigned)`);
    }
    if (r.totalPaid === 0) {
      issues.push(`Recharge ${num} has zero payment`);
    }
    if (r.kwhAmount === 0) {
      issues.push(`Recharge ${num} has zero kWh`);
    }

    totalKwh += r.kwhAmount;
    totalPaid += r.totalPaid;
  });

  console.log('\n   Summary:');
  console.log(`   - Total kWh: ${totalKwh.toFixed(1)} kWh`);
  console.log(`   - Total Paid: ${totalPaid.toLocaleString()} TSH`);
  console.log(`   - Average Rate: ${(totalPaid / totalKwh).toFixed(2)} TSH/kWh`);
  console.log(`   - Orphaned: ${orphaned}`);

  if (orphaned > 0) {
    console.log(`   ⚠️  WARNING: ${orphaned} recharge(s) not assigned to a process`);
  } else {
    console.log('   ✅ All recharges assigned to processes');
  }

  // 2. Check for duplicates
  console.log('\n2️⃣  CHECKING FOR DUPLICATES...\n');

  const tokenCounts = {};
  recharges.forEach(r => {
    tokenCounts[r.token] = (tokenCounts[r.token] || 0) + 1;
  });

  const duplicates = Object.entries(tokenCounts).filter(([token, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log('   ❌ DUPLICATES FOUND:');
    duplicates.forEach(([token, count]) => {
      console.log(`      Token ${token.substring(0, 15)}... appears ${count} times`);
      issues.push(`Duplicate token: ${token.substring(0, 15)}...`);
    });
  } else {
    console.log('   ✅ No duplicate tokens found');
  }

  // 3. Check December 3 recharge
  console.log('\n3️⃣  VERIFYING DECEMBER 3 RECHARGE FIX...\n');

  const dec3 = recharges.find(r => r.token === '147185518870274783922802');
  if (dec3) {
    console.log(`   Token: ${dec3.token}`);
    console.log(`   Total Paid: ${dec3.totalPaid.toLocaleString()} TSH`);
    console.log(`   Base Cost: ${dec3.baseCost || 'Not set'}`);
    console.log(`   VAT: ${dec3.vat || 'Not set'}`);
    console.log(`   EWURA: ${dec3.ewuraFee || 'Not set'}`);
    console.log(`   REA: ${dec3.reaFee || 'Not set'}`);
    console.log(`   Debt: ${dec3.debtCollected || 'Not set'}`);

    if (dec3.totalPaid === 1000000) {
      console.log('   ✅ Amount correct: 1,000,000 TSH');
    } else {
      console.log(`   ❌ Amount incorrect: ${dec3.totalPaid} (expected 1,000,000)`);
      issues.push('December 3 recharge amount is incorrect');
    }

    if (dec3.baseCost && dec3.vat && dec3.ewuraFee && dec3.reaFee) {
      console.log('   ✅ Fee breakdown present');
    } else {
      console.log('   ⚠️  WARNING: Fee breakdown missing');
      issues.push('December 3 recharge missing fee breakdown');
    }
  } else {
    console.log('   ❌ December 3 recharge not found!');
    issues.push('December 3 recharge missing from database');
  }

  // 4. Check drying processes
  console.log('\n4️⃣  CHECKING DRYING PROCESSES...\n');

  const processes = await prisma.dryingProcess.findMany({
    where: {
      status: {
        in: ['IN_PROGRESS', 'COMPLETED']
      }
    },
    include: {
      recharges: true
    }
  });

  console.log(`   Total Processes: ${processes.length}`);

  let processesWithRecharges = 0;
  processes.forEach(p => {
    if (p.recharges.length > 0) {
      processesWithRecharges++;
    }
  });

  console.log(`   Processes with recharges: ${processesWithRecharges}/${processes.length}`);
  console.log('   ✅ Processes checked');

  // 5. Data integrity check
  console.log('\n5️⃣  DATA INTEGRITY CHECK...\n');

  const zeroPayments = recharges.filter(r => r.totalPaid === 0);
  const zeroKwh = recharges.filter(r => r.kwhAmount === 0);
  const negativeAmounts = recharges.filter(r => r.totalPaid < 0 || r.kwhAmount < 0);

  console.log(`   Zero payments: ${zeroPayments.length}`);
  console.log(`   Zero kWh: ${zeroKwh.length}`);
  console.log(`   Negative amounts: ${negativeAmounts.length}`);

  if (zeroPayments.length === 0 && zeroKwh.length === 0 && negativeAmounts.length === 0) {
    console.log('   ✅ All amounts are valid');
  } else {
    console.log('   ⚠️  WARNING: Found invalid amounts');
    if (zeroPayments.length > 0) issues.push(`${zeroPayments.length} recharge(s) with zero payment`);
    if (zeroKwh.length > 0) issues.push(`${zeroKwh.length} recharge(s) with zero kWh`);
    if (negativeAmounts.length > 0) issues.push(`${negativeAmounts.length} recharge(s) with negative amounts`);
  }

  // Final Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL SUMMARY                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (issues.length === 0) {
    console.log('   ✅ ✅ ✅  ALL CHECKS PASSED  ✅ ✅ ✅\n');
    console.log('   🚀 Ready to push to production!\n');
    console.log('   Files to commit:');
    console.log('   - backend/src/routes/electricity.ts (enhanced API)');
    console.log('   - frontend/src/pages/management/LukuRechargePage.tsx (new page)');
    console.log('   - frontend/src/pages/settings/AdminSettings.tsx (added privilege)');
    console.log('   - frontend/src/components/Layout/Sidebar.tsx (added navigation)');
    console.log('   - frontend/src/routes/routes.tsx (added route)');
  } else {
    console.log('   ⚠️  ISSUES FOUND:\n');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    console.log('\n   ⚠️  Please review issues before pushing');
  }

  await prisma.$disconnect();
}

finalCheck().catch(console.error);
