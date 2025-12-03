import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkLatestRecharge() {
  const latest = await prisma.electricityRecharge.findFirst({
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

  if (!latest) {
    console.log('No recharges found');
    return;
  }

  console.log('=== LATEST RECHARGE (Most Recent) ===\n');
  console.log('ID:', latest.id);
  console.log('Date:', latest.rechargeDate.toISOString());
  console.log('Token:', latest.token);
  console.log('\n--- AMOUNTS ---');
  console.log('Base Cost:', latest.baseCost || 'Not set');
  console.log('VAT (18%):', latest.vat || 'Not set');
  console.log('EWURA Fee (1%):', latest.ewuraFee || 'Not set');
  console.log('REA Fee (3%):', latest.reaFee || 'Not set');
  console.log('Debt Collected:', latest.debtCollected || 'Not set');
  console.log('\nkWh Amount:', latest.kwhAmount);
  console.log('TOTAL PAID:', latest.totalPaid, 'TSH');
  console.log('\nRate per kWh:', (latest.totalPaid / latest.kwhAmount).toFixed(2), 'TSH/kWh');
  console.log('\nMeter Reading After:', latest.meterReadingAfter || 'Not set');
  console.log('Notes:', latest.notes || 'None');
  console.log('Process:', latest.dryingProcess ? latest.dryingProcess.batchNumber : 'Unassigned');
  console.log('\nCreated:', latest.createdAt.toISOString());
  console.log('Updated:', latest.updatedAt.toISOString());

  // Check if there's a today's recharge
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRecharges = await prisma.electricityRecharge.findMany({
    where: {
      rechargeDate: {
        gte: today
      }
    },
    orderBy: {
      rechargeDate: 'desc'
    }
  });

  console.log('\n=== TODAY\'S RECHARGES ===');
  console.log('Count:', todayRecharges.length);
  todayRecharges.forEach((r, i) => {
    console.log(`\n${i + 1}. Token: ${r.token.substring(0, 20)}...`);
    console.log(`   Time: ${r.rechargeDate.toLocaleTimeString()}`);
    console.log(`   kWh: ${r.kwhAmount}`);
    console.log(`   Total Paid: ${r.totalPaid} TSH`);
  });

  await prisma.$disconnect();
}

checkLatestRecharge().catch(console.error);
