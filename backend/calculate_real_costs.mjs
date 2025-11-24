import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function calculateRealCosts() {
  try {
    console.log('🔍 REAL COST CALCULATION - Using Actual Database Data\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // 1. Fetch settings
    console.log('📋 Step 1: Fetching Drying Settings...\n');

    const settingsKeys = [
      'ovenPurchasePrice',
      'ovenLifespanYears',
      'maintenanceCostPerYear',
      'laborCostPerHour'
    ];

    const settings = {};
    for (const key of settingsKeys) {
      const setting = await prisma.setting.findUnique({ where: { key } });
      settings[key] = setting ? parseFloat(setting.value) : 0;
    }

    console.log('   Oven Purchase Price:', settings.ovenPurchasePrice.toLocaleString(), 'TZS');
    console.log('   Oven Lifespan:', settings.ovenLifespanYears, 'years');
    console.log('   Annual Maintenance Cost:', settings.maintenanceCostPerYear.toLocaleString(), 'TZS');
    console.log('   Labor Cost Per Hour:', settings.laborCostPerHour.toLocaleString(), 'TZS/hour');

    // Calculate hourly rates
    const annualDepreciation = settings.ovenPurchasePrice / settings.ovenLifespanYears;
    const depreciationPerHour = annualDepreciation / 8760; // hours per year
    const maintenancePerHour = settings.maintenanceCostPerYear / 8760;

    console.log('\n   📊 Calculated Hourly Rates:');
    console.log('   ├─ Depreciation:', depreciationPerHour.toFixed(2), 'TZS/hour');
    console.log('   ├─ Maintenance:', maintenancePerHour.toFixed(2), 'TZS/hour');
    console.log('   └─ Labor:', settings.laborCostPerHour.toFixed(2), 'TZS/hour');

    // 2. Fetch latest electricity rate
    console.log('\n📋 Step 2: Fetching Electricity Rate...\n');

    const latestRecharge = await prisma.electricityRecharge.findFirst({
      orderBy: { rechargeDate: 'desc' }
    });

    let electricityRate = 292; // default
    if (latestRecharge) {
      electricityRate = latestRecharge.totalPaid / latestRecharge.kwhAmount;
      console.log('   Latest Recharge Date:', latestRecharge.rechargeDate.toISOString().split('T')[0]);
      console.log('   Total Paid:', latestRecharge.totalPaid.toLocaleString(), 'TZS');
      console.log('   kWh Amount:', latestRecharge.kwhAmount.toFixed(2), 'kWh');
      console.log('   Electricity Rate:', electricityRate.toFixed(2), 'TZS/kWh');
    } else {
      console.log('   ⚠️  No recharge data found, using default:', electricityRate, 'TZS/kWh');
    }

    // 3. Fetch completed drying processes
    console.log('\n📋 Step 3: Fetching Completed Drying Processes...\n');

    const completedProcesses = await prisma.dryingProcess.findMany({
      where: {
        status: 'COMPLETED'
      },
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
      },
      orderBy: {
        endTime: 'desc'
      },
      take: 5 // Get last 5 batches for example
    });

    console.log(`   Found ${completedProcesses.length} completed batches (showing last 5)\n`);

    // 4. Calculate costs for each batch
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 DETAILED COST CALCULATIONS\n');

    const costSummary = {};

    completedProcesses.forEach((process, idx) => {
      console.log(`\n╔═══════════════════════════════════════════════════════════════════════════════╗`);
      console.log(`║ BATCH ${idx + 1}: ${process.batchNumber}`);
      console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\n`);

      // Determine wood type and pieces
      let woodTypeName = 'Unknown';
      let thickness = 'Unknown';
      let totalPieces = 0;

      if (process.items && process.items.length > 0) {
        // Mixed wood batch
        console.log('   Type: MIXED WOOD BATCH\n');
        process.items.forEach((item, i) => {
          console.log(`   Item ${i + 1}:`);
          console.log(`   ├─ Wood Type: ${item.woodType.name}`);
          console.log(`   ├─ Thickness: ${item.thickness}`);
          console.log(`   └─ Pieces: ${item.pieceCount}\n`);
          totalPieces += item.pieceCount;
        });
        woodTypeName = `Mixed (${process.items.length} types)`;
        thickness = 'Various';
      } else if (process.woodType) {
        // Single wood batch
        woodTypeName = process.woodType.name;
        thickness = process.thickness ? `${(process.thickness / 25.4).toFixed(1)}"` : 'Unknown';
        totalPieces = process.pieceCount || 0;
        console.log('   Type: SINGLE WOOD BATCH');
        console.log(`   ├─ Wood Type: ${woodTypeName}`);
        console.log(`   ├─ Thickness: ${thickness}`);
        console.log(`   └─ Pieces: ${totalPieces}\n`);
      }

      // Calculate electricity used
      let electricityUsed = 0;
      if (process.readings.length > 0) {
        const firstReading = process.readings[0].electricityMeter;
        const lastReading = process.readings[process.readings.length - 1].electricityMeter;
        electricityUsed = lastReading - firstReading;
      }

      // Calculate running hours
      const startTime = new Date(process.startTime).getTime();
      const endTime = process.endTime ? new Date(process.endTime).getTime() : Date.now();
      const runningHours = (endTime - startTime) / (1000 * 60 * 60);

      console.log('   📅 Timeline:');
      console.log('   ├─ Start:', new Date(process.startTime).toISOString());
      console.log('   ├─ End:', process.endTime ? new Date(process.endTime).toISOString() : 'In Progress');
      console.log('   └─ Running Hours:', runningHours.toFixed(2), 'hours\n');

      // Calculate each cost component
      const electricityCost = electricityUsed * electricityRate;
      const depreciationCost = runningHours * depreciationPerHour;
      const maintenanceCost = runningHours * maintenancePerHour;
      const laborCost = runningHours * settings.laborCostPerHour;
      const totalCost = electricityCost + depreciationCost + maintenanceCost + laborCost;

      console.log('   💰 COST BREAKDOWN:\n');
      console.log('   1️⃣  ELECTRICITY:');
      console.log(`       ├─ kWh Used: ${electricityUsed.toFixed(2)} kWh`);
      console.log(`       ├─ Rate: ${electricityRate.toFixed(2)} TZS/kWh`);
      console.log(`       └─ Cost: TZS ${electricityCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`);

      console.log('   2️⃣  DEPRECIATION:');
      console.log(`       ├─ Hours: ${runningHours.toFixed(2)} hours`);
      console.log(`       ├─ Rate: ${depreciationPerHour.toFixed(2)} TZS/hour`);
      console.log(`       └─ Cost: TZS ${depreciationCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`);

      console.log('   3️⃣  MAINTENANCE:');
      console.log(`       ├─ Hours: ${runningHours.toFixed(2)} hours`);
      console.log(`       ├─ Rate: ${maintenancePerHour.toFixed(2)} TZS/hour`);
      console.log(`       └─ Cost: TZS ${maintenanceCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`);

      console.log('   4️⃣  LABOR:');
      console.log(`       ├─ Hours: ${runningHours.toFixed(2)} hours`);
      console.log(`       ├─ Rate: ${settings.laborCostPerHour.toFixed(2)} TZS/hour`);
      console.log(`       └─ Cost: TZS ${laborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`);

      console.log('   ═══════════════════════════════════════════════════════════════════════════════');
      console.log(`   💵 TOTAL BATCH COST: TZS ${totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
      console.log('   ═══════════════════════════════════════════════════════════════════════════════\n');

      if (totalPieces > 0) {
        const costPerPiece = totalCost / totalPieces;
        const electricityPerPiece = electricityCost / totalPieces;
        const depreciationPerPiece = depreciationCost / totalPieces;
        const maintenancePerPiece = maintenanceCost / totalPieces;
        const laborPerPiece = laborCost / totalPieces;

        console.log('   📊 COST PER PIECE:\n');
        console.log(`   Total Pieces: ${totalPieces}`);
        console.log(`   ├─ Electricity: TZS ${electricityPerPiece.toFixed(2)}/piece (${((electricityCost/totalCost)*100).toFixed(1)}%)`);
        console.log(`   ├─ Depreciation: TZS ${depreciationPerPiece.toFixed(2)}/piece (${((depreciationCost/totalCost)*100).toFixed(1)}%)`);
        console.log(`   ├─ Maintenance: TZS ${maintenancePerPiece.toFixed(2)}/piece (${((maintenanceCost/totalCost)*100).toFixed(1)}%)`);
        console.log(`   ├─ Labor: TZS ${laborPerPiece.toFixed(2)}/piece (${((laborCost/totalCost)*100).toFixed(1)}%)`);
        console.log(`   └─ TOTAL: TZS ${costPerPiece.toFixed(2)}/piece\n`);

        console.log('   ⚡ OTHER METRICS:');
        console.log(`   ├─ kWh per piece: ${(electricityUsed/totalPieces).toFixed(4)} kWh/piece`);
        console.log(`   ├─ Hours per piece: ${(runningHours/totalPieces).toFixed(4)} hours/piece`);
        console.log(`   └─ Humidity: ${process.startingHumidity || 'N/A'}% → ${process.readings.length > 0 ? process.readings[process.readings.length - 1].humidity.toFixed(1) : 'N/A'}%\n`);

        // Aggregate for summary
        const key = `${woodTypeName}_${thickness}`;
        if (!costSummary[key]) {
          costSummary[key] = {
            woodType: woodTypeName,
            thickness: thickness,
            batches: 0,
            totalPieces: 0,
            totalCost: 0,
            totalElectricity: 0,
            totalDepreciation: 0,
            totalMaintenance: 0,
            totalLabor: 0,
            totalKwh: 0,
            totalHours: 0
          };
        }
        costSummary[key].batches++;
        costSummary[key].totalPieces += totalPieces;
        costSummary[key].totalCost += totalCost;
        costSummary[key].totalElectricity += electricityCost;
        costSummary[key].totalDepreciation += depreciationCost;
        costSummary[key].totalMaintenance += maintenanceCost;
        costSummary[key].totalLabor += laborCost;
        costSummary[key].totalKwh += electricityUsed;
        costSummary[key].totalHours += runningHours;
      } else {
        console.log('   ⚠️  No pieces recorded for this batch\n');
      }
    });

    // 5. Print Summary Report
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║ SUMMARY REPORT - AVERAGE COST PER PIECE BY WOOD TYPE & THICKNESS');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

    Object.values(costSummary).forEach((summary, idx) => {
      const avgCostPerPiece = summary.totalCost / summary.totalPieces;
      const avgElectricityPerPiece = summary.totalElectricity / summary.totalPieces;
      const avgDepreciationPerPiece = summary.totalDepreciation / summary.totalPieces;
      const avgMaintenancePerPiece = summary.totalMaintenance / summary.totalPieces;
      const avgLaborPerPiece = summary.totalLabor / summary.totalPieces;
      const avgKwhPerPiece = summary.totalKwh / summary.totalPieces;
      const avgHoursPerPiece = summary.totalHours / summary.totalPieces;

      console.log(`${idx + 1}. ${summary.woodType} - ${summary.thickness}`);
      console.log('   ═══════════════════════════════════════════════════════════════════════════════');
      console.log(`   📦 ${summary.batches} batches analyzed`);
      console.log(`   🪵 ${summary.totalPieces} total pieces dried\n`);

      console.log('   💰 AVERAGE COST PER PIECE: TZS', avgCostPerPiece.toFixed(2));
      console.log('   ├─ Electricity:', 'TZS', avgElectricityPerPiece.toFixed(2), `(${((summary.totalElectricity/summary.totalCost)*100).toFixed(1)}%)`);
      console.log('   ├─ Depreciation:', 'TZS', avgDepreciationPerPiece.toFixed(2), `(${((summary.totalDepreciation/summary.totalCost)*100).toFixed(1)}%)`);
      console.log('   ├─ Maintenance:', 'TZS', avgMaintenancePerPiece.toFixed(2), `(${((summary.totalMaintenance/summary.totalCost)*100).toFixed(1)}%)`);
      console.log('   └─ Labor:', 'TZS', avgLaborPerPiece.toFixed(2), `(${((summary.totalLabor/summary.totalCost)*100).toFixed(1)}%)\n`);

      console.log('   📊 METRICS:');
      console.log('   ├─ Avg kWh/piece:', avgKwhPerPiece.toFixed(4), 'kWh');
      console.log('   ├─ Avg hours/piece:', avgHoursPerPiece.toFixed(4), 'hours');
      console.log('   ├─ Total cost:', 'TZS', summary.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 }));
      console.log('   └─ Total kWh:', summary.totalKwh.toFixed(2), 'kWh\n');
    });

    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    console.log('✅ Calculation complete! This is the exact cost you need to know per piece.\n');

  } catch (error) {
    console.error('❌ Error calculating costs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

calculateRealCosts();
