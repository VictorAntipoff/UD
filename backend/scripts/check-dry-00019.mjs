import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const process = await prisma.dryingProcess.findFirst({
    where: { 
      batchNumber: { contains: '00019' }
    },
    include: {
      sourceWarehouse: true,
      woodType: true,
      readings: { orderBy: { readingTime: 'asc' } },
      recharges: { orderBy: { rechargeDate: 'asc' } },
      items: { include: { woodType: true, sourceWarehouse: true } }
    }
  });
  
  if (!process) {
    console.log('DRY-00019 not found, listing recent processes:');
    const recent = await prisma.dryingProcess.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { batchNumber: true, status: true, createdAt: true }
    });
    recent.forEach(p => console.log(p.batchNumber, '-', p.status));
    await prisma.$disconnect();
    return;
  }
  
  console.log('=== DRYING PROCESS ===');
  console.log('Batch Number:', process.batchNumber);
  console.log('Warehouse:', process.sourceWarehouse?.name);
  console.log('Wood Type:', process.woodType?.name);
  console.log('Status:', process.status);
  console.log('Piece Count:', process.pieceCount);
  console.log('Start Time:', process.startTime);
  console.log('');
  console.log('=== ITEMS (Multi-wood) ===');
  process.items.forEach((item, i) => {
    console.log('Item ' + (i+1) + ':', item.woodType?.name, '| Thickness:', item.thickness, '| Pieces:', item.pieceCount);
  });
  console.log('');
  console.log('=== ELECTRICITY / LUKU ===');
  console.log('Starting Electricity Units:', process.startingElectricityUnits);
  console.log('');
  console.log('=== READINGS ===');
  process.readings.forEach((r, i) => {
    console.log('Reading ' + (i+1) + ':', 'Luku:', r.electricityMeter, '| Humidity:', r.humidity + '%', '| Time:', r.readingTime);
  });
  console.log('');
  console.log('=== RECHARGES ===');
  process.recharges.forEach((r, i) => {
    console.log('Recharge ' + (i+1) + ':', 'Amount:', r.amount, '| Units:', r.units, '| Date:', r.rechargeDate);
  });
  
  const totalRechargeUnits = process.recharges.reduce((sum, r) => sum + (r.units || 0), 0);
  const lastReading = process.readings[process.readings.length - 1];
  const startUnits = process.startingElectricityUnits || 0;
  
  console.log('');
  console.log('=== CALCULATION ===');
  console.log('Starting Units:', startUnits);
  console.log('Total Recharge Units:', totalRechargeUnits);
  console.log('Last Reading (current meter):', lastReading?.electricityMeter);
  console.log('');
  console.log('Formula: Total Used = (Starting + Recharges) - Current Meter');
  console.log('Total Used =', '(' + startUnits, '+', totalRechargeUnits + ')', '-', (lastReading?.electricityMeter || 0));
  const totalUsed = (startUnits + totalRechargeUnits) - (lastReading?.electricityMeter || 0);
  console.log('Total Used =', totalUsed);
  
  await prisma.$disconnect();
}
check();
