import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== STEP 4: FIX ZERO PAYMENT RECHARGE ===\n');

  const zeroPaymentRecharges = await prisma.electricityRecharge.findMany({
    where: { totalPaid: 0 },
    include: { dryingProcess: true }
  });

  if (zeroPaymentRecharges.length === 0) {
    console.log('✅ No zero payment recharges found\n');
    return;
  }

  console.log(`Found ${zeroPaymentRecharges.length} recharge(s) with zero payment\n`);

  for (const recharge of zeroPaymentRecharges) {
    console.log(`Process: ${recharge.dryingProcess.batchNumber}`);
    console.log(`Token: ${recharge.token}`);
    console.log(`kWh: ${recharge.kwhAmount}`);
    console.log(`Current payment: 0 TSH ❌`);

    const correctPayment = Math.round(recharge.kwhAmount * 356.25);
    console.log(`Should be: ${correctPayment.toLocaleString()} TSH`);

    await prisma.electricityRecharge.update({
      where: { id: recharge.id },
      data: { totalPaid: correctPayment }
    });

    console.log(`✅ Updated successfully\n`);
  }

  console.log('=== COMPLETE ===\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
