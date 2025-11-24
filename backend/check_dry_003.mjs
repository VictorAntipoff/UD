import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDry003() {
  try {
    console.log('🔍 DETAILED ANALYSIS - BATCH UD-DRY-00003\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Get batch UD-DRY-00003
    const process = await prisma.dryingProcess.findUnique({
      where: { batchNumber: 'UD-DRY-00003' },
      include: {
        woodType: true,
        items: {
          include: {
            woodType: true
          }
        },
        readings: {
          orderBy: { readingTime: 'asc' }
        }
      }
    });

    if (!process) {
      console.log('❌ Batch UD-DRY-00003 not found\n');
      return;
    }

    console.log('📋 BATCH INFORMATION:\n');
    console.log(`   Batch Number: ${process.batchNumber}`);
    console.log(`   Status: ${process.status}`);
    console.log(`   Start Time: ${process.startTime.toISOString()}`);
    console.log(`   End Time: ${process.endTime ? process.endTime.toISOString() : 'In Progress'}`);
    console.log(`   Starting Humidity: ${process.startingHumidity}%`);
    console.log(`   Starting Electricity Units: ${process.startingElectricityUnits} units\n`);

    // Wood info
    if (process.items && process.items.length > 0) {
      console.log('🪵 WOOD DETAILS (Mixed Wood Batch):\n');
      let totalPieces = 0;
      process.items.forEach((item, idx) => {
        console.log(`   Item ${idx + 1}:`);
        console.log(`   ├─ Wood Type: ${item.woodType.name}`);
        console.log(`   ├─ Thickness: ${item.thickness}`);
        console.log(`   └─ Pieces: ${item.pieceCount}`);
        totalPieces += item.pieceCount;
      });
      console.log(`\n   TOTAL PIECES: ${totalPieces}\n`);
    } else if (process.woodType) {
      console.log('🪵 WOOD DETAILS (Single Wood Batch):\n');
      console.log(`   Wood Type: ${process.woodType.name}`);
      console.log(`   Thickness: ${process.thickness ? (process.thickness / 25.4).toFixed(1) + '"' : 'Unknown'}`);
      console.log(`   Pieces: ${process.pieceCount}\n`);
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 ELECTRICITY METER READINGS:\n');

    if (process.readings.length === 0) {
      console.log('⚠️  No readings recorded for this batch!\n');
      return;
    }

    console.log('   #  | Date & Time              | Electricity Meter | Humidity | Units Consumed');
    console.log('   ───┼──────────────────────────┼──────────────────┼──────────┼────────────────');

    let previousReading = null;
    let totalConsumed = 0;

    process.readings.forEach((reading, idx) => {
      const date = new Date(reading.readingTime).toISOString().replace('T', ' ').substring(0, 19);
      const meter = reading.electricityMeter;
      const humidity = reading.humidity;

      let consumed = '';
      if (previousReading !== null) {
        // CORRECT CALCULATION: previous - current (for prepaid meters that count down)
        const diff = previousReading - meter;
        consumed = diff.toFixed(2) + ' units';
        totalConsumed += diff;
      } else {
        consumed = '(First reading)';
      }

      console.log(`   ${String(idx + 1).padStart(2)} | ${date} | ${meter.toFixed(2).padStart(16)} | ${humidity.toFixed(1).padStart(8)} | ${consumed.padStart(14)}`);

      previousReading = meter;
    });

    console.log('   ───┴──────────────────────────┴──────────────────┴──────────┴────────────────');

    const firstReading = process.readings[0].electricityMeter;
    const lastReading = process.readings[process.readings.length - 1].electricityMeter;
    const finalHumidity = process.readings[process.readings.length - 1].humidity;

    console.log(`\n   TOTAL UNITS CONSUMED: ${totalConsumed.toFixed(2)} units\n`);

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('💡 CALCULATION VERIFICATION:\n');

    console.log('   METHOD 1: Sum of consecutive differences');
    console.log(`   └─ Total: ${totalConsumed.toFixed(2)} units\n`);

    console.log('   METHOD 2: First reading - Last reading');
    console.log(`   ├─ First reading: ${firstReading.toFixed(2)} units`);
    console.log(`   ├─ Last reading: ${lastReading.toFixed(2)} units`);
    console.log(`   └─ Consumed: ${firstReading.toFixed(2)} - ${lastReading.toFixed(2)} = ${(firstReading - lastReading).toFixed(2)} units\n`);

    const correctConsumption = firstReading - lastReading;

    if (Math.abs(totalConsumed - correctConsumption) < 0.01) {
      console.log('   ✅ Both methods match! Calculation is correct.\n');
    } else {
      console.log('   ⚠️  Methods differ - may indicate meter recharge during process\n');
    }

    // Get settings for cost calculation
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('💰 COST CALCULATION:\n');

    const settings = {};
    const settingsKeys = ['ovenPurchasePrice', 'ovenLifespanYears', 'maintenanceCostPerYear', 'laborCostPerHour'];

    for (const key of settingsKeys) {
      const setting = await prisma.setting.findUnique({ where: { key } });
      settings[key] = setting ? parseFloat(setting.value) : 0;
    }

    const latestRecharge = await prisma.electricityRecharge.findFirst({
      orderBy: { rechargeDate: 'desc' }
    });

    const electricityRate = latestRecharge ? (latestRecharge.totalPaid / latestRecharge.kwhAmount) : 292;

    console.log('   📋 Settings:\n');
    console.log(`   ├─ Electricity Rate: ${electricityRate.toFixed(2)} TZS/unit`);
    console.log(`   ├─ Oven Purchase Price: ${settings.ovenPurchasePrice.toLocaleString()} TZS`);
    console.log(`   ├─ Oven Lifespan: ${settings.ovenLifespanYears} years`);
    console.log(`   ├─ Maintenance Cost/Year: ${settings.maintenanceCostPerYear.toLocaleString()} TZS`);
    console.log(`   └─ Labor Cost/Hour: ${settings.laborCostPerHour.toLocaleString()} TZS\n`);

    // Calculate running hours
    const startTime = new Date(process.startTime).getTime();
    const endTime = process.endTime ? new Date(process.endTime).getTime() : Date.now();
    const runningHours = (endTime - startTime) / (1000 * 60 * 60);

    // Calculate costs
    const annualDepreciation = settings.ovenPurchasePrice / settings.ovenLifespanYears;
    const depreciationPerHour = annualDepreciation / 8760;
    const maintenancePerHour = settings.maintenanceCostPerYear / 8760;

    const electricityCost = correctConsumption * electricityRate;
    const depreciationCost = runningHours * depreciationPerHour;
    const maintenanceCost = runningHours * maintenancePerHour;
    const laborCost = runningHours * settings.laborCostPerHour;
    const totalCost = electricityCost + depreciationCost + maintenanceCost + laborCost;

    console.log('   ⚙️  Running Time:\n');
    console.log(`   └─ ${runningHours.toFixed(2)} hours\n`);

    console.log('   💵 COST BREAKDOWN:\n');
    console.log(`   1️⃣  ELECTRICITY:`);
    console.log(`       ├─ Units Consumed: ${correctConsumption.toFixed(2)} units`);
    console.log(`       ├─ Rate: ${electricityRate.toFixed(2)} TZS/unit`);
    console.log(`       └─ Cost: TZS ${electricityCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${((electricityCost/totalCost)*100).toFixed(1)}%)\n`);

    console.log(`   2️⃣  DEPRECIATION:`);
    console.log(`       ├─ Hours: ${runningHours.toFixed(2)} hours`);
    console.log(`       ├─ Rate: ${depreciationPerHour.toFixed(2)} TZS/hour`);
    console.log(`       └─ Cost: TZS ${depreciationCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${((depreciationCost/totalCost)*100).toFixed(1)}%)\n`);

    console.log(`   3️⃣  MAINTENANCE:`);
    console.log(`       ├─ Hours: ${runningHours.toFixed(2)} hours`);
    console.log(`       ├─ Rate: ${maintenancePerHour.toFixed(2)} TZS/hour`);
    console.log(`       └─ Cost: TZS ${maintenanceCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${((maintenanceCost/totalCost)*100).toFixed(1)}%)\n`);

    console.log(`   4️⃣  LABOR:`);
    console.log(`       ├─ Hours: ${runningHours.toFixed(2)} hours`);
    console.log(`       ├─ Rate: ${settings.laborCostPerHour.toFixed(2)} TZS/hour`);
    console.log(`       └─ Cost: TZS ${laborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${((laborCost/totalCost)*100).toFixed(1)}%)\n`);

    console.log('   ═══════════════════════════════════════════════════════════════════════════');
    console.log(`   💵 TOTAL BATCH COST: TZS ${totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    console.log('   ═══════════════════════════════════════════════════════════════════════════\n');

    // Calculate per piece
    const totalPieces = process.items
      ? process.items.reduce((sum, item) => sum + item.pieceCount, 0)
      : (process.pieceCount || 0);

    if (totalPieces > 0) {
      const costPerPiece = totalCost / totalPieces;
      const electricityPerPiece = electricityCost / totalPieces;
      const depreciationPerPiece = depreciationCost / totalPieces;
      const maintenancePerPiece = maintenanceCost / totalPieces;
      const laborPerPiece = laborCost / totalPieces;
      const unitsPerPiece = correctConsumption / totalPieces;
      const hoursPerPiece = runningHours / totalPieces;

      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log('📊 COST PER PIECE:\n');
      console.log(`   Total Pieces: ${totalPieces} pieces\n`);

      console.log('   💰 BREAKDOWN PER PIECE:\n');
      console.log(`   ├─ Electricity: TZS ${electricityPerPiece.toFixed(2)}/piece`);
      console.log(`   ├─ Depreciation: TZS ${depreciationPerPiece.toFixed(2)}/piece`);
      console.log(`   ├─ Maintenance: TZS ${maintenancePerPiece.toFixed(2)}/piece`);
      console.log(`   └─ Labor: TZS ${laborPerPiece.toFixed(2)}/piece\n`);

      console.log('   ═══════════════════════════════════════════════════════════════════════════');
      console.log(`   💵 TOTAL COST PER PIECE: TZS ${costPerPiece.toFixed(2)}`);
      console.log('   ═══════════════════════════════════════════════════════════════════════════\n');

      console.log('   📊 OTHER METRICS:\n');
      console.log(`   ├─ Electricity per piece: ${unitsPerPiece.toFixed(4)} units/piece`);
      console.log(`   ├─ Hours per piece: ${hoursPerPiece.toFixed(4)} hours/piece`);
      console.log(`   ├─ Starting humidity: ${process.startingHumidity}%`);
      console.log(`   └─ Final humidity: ${finalHumidity.toFixed(1)}%\n`);

      console.log('═══════════════════════════════════════════════════════════════════════════════\n');
      console.log(`✅ EXACT COST FOR BATCH UD-DRY-00003: TZS ${costPerPiece.toFixed(2)} per piece\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDry003();
