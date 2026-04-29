// READ-ONLY: dump every input that goes into the cost formula for UD-DRY-00039.
import { prisma } from '../lib/prisma.js';

async function main() {
  const proc = await prisma.dryingProcess.findUnique({
    where: { batchNumber: 'UD-DRY-00039' },
    include: {
      DryingReading: { orderBy: { readingTime: 'asc' } },
      ElectricityRecharge: {
        orderBy: { rechargeDate: 'asc' },
        include: { LinkedReading: { select: { id: true, readingTime: true } } },
      },
      DryingProcessItem: true,
    },
  });
  if (!proc) { console.log('Not found'); return; }

  console.log('=== Process header ===');
  console.log({
    id: proc.id,
    status: proc.status,
    startTime: proc.startTime.toISOString(),
    endTime: proc.endTime?.toISOString() ?? null,
    totalCostStored: proc.totalCost,
    startingElectricityUnits: proc.startingElectricityUnits,
    startingHumidity: proc.startingHumidity,
  });

  const readings = (proc as any).DryingReading || [];
  const recharges = (proc as any).ElectricityRecharge || [];
  console.log(`\n=== Readings (${readings.length}) ===`);
  for (const r of readings) {
    console.log(`  ${r.readingTime.toISOString()}  meter=${r.electricityMeter}  humidity=${r.humidity}`);
  }
  console.log(`\n=== Recharges (${recharges.length}) ===`);
  for (const r of recharges) {
    const eff = (r as any).LinkedReading?.readingTime ?? r.rechargeDate;
    console.log(`  rechargeDate=${r.rechargeDate.toISOString()}  kWh=${r.kwhAmount}  totalPaid=${r.totalPaid}  linkedReadingId=${(r as any).linkedReadingId ?? 'null'}  effectiveTime=${new Date(eff).toISOString()}`);
  }

  const rechargeEffectiveTime = (r: any): Date =>
    r.LinkedReading?.readingTime ? new Date(r.LinkedReading.readingTime) : new Date(r.rechargeDate);

  // Settings
  const keys = ['ovenPurchasePrice', 'ovenLifespanYears', 'maintenanceCostPerYear', 'laborCostPerHour'];
  const settings: Record<string, number> = {};
  for (const k of keys) {
    const s = await prisma.setting.findUnique({ where: { key: k } });
    settings[k] = s ? parseFloat(s.value) : 0;
    console.log(`  setting ${k} = ${settings[k]} (raw=${s?.value ?? 'MISSING'})`);
  }

  const latestRecharge = await prisma.electricityRecharge.findFirst({
    orderBy: { rechargeDate: 'desc' },
  });
  const electricityRate = latestRecharge ? (latestRecharge.totalPaid / latestRecharge.kwhAmount) : 292;
  console.log(`  electricityRate = ${electricityRate.toFixed(4)} TZS/kWh (latestRecharge: ${latestRecharge?.rechargeDate.toISOString()})`);

  if (readings.length === 0) { console.log('No readings, cost=null'); return; }

  const lastReading = readings[readings.length - 1];
  const annualDepreciation = settings.ovenPurchasePrice / settings.ovenLifespanYears;
  const depreciationPerHour = annualDepreciation / 8760;
  const maintenancePerHour = settings.maintenanceCostPerYear / 8760;

  let totalElectricityUsed = 0;
  const firstReading = readings[0].electricityMeter;
  console.log(`\n=== Electricity step-by-step ===`);
  for (let i = 0; i < readings.length; i++) {
    const cur = readings[i];
    const curTime = new Date(cur.readingTime);
    let prev: number, prevTime: Date;
    if (i === 0) { prev = proc.startingElectricityUnits || firstReading; prevTime = new Date(proc.startTime); }
    else { prev = readings[i - 1].electricityMeter; prevTime = new Date(readings[i - 1].readingTime); }

    const between = recharges.filter((r: any) => {
      const t = rechargeEffectiveTime(r);
      return t > prevTime && t <= curTime;
    });
    let consumed: number;
    if (between.length > 0) {
      const totalRecharged = between.reduce((s: number, r: any) => s + r.kwhAmount, 0);
      consumed = Math.max(0, prev + totalRecharged - cur.electricityMeter);
      console.log(`  step ${i}: prev=${prev} +recharge=${totalRecharged} -cur=${cur.electricityMeter} → consumed=${consumed.toFixed(2)}`);
    } else {
      consumed = Math.max(0, prev - cur.electricityMeter);
      console.log(`  step ${i}: prev=${prev} -cur=${cur.electricityMeter} → consumed=${consumed.toFixed(2)}`);
    }
    totalElectricityUsed += consumed;
  }
  console.log(`  TOTAL electricity used = ${totalElectricityUsed.toFixed(2)} kWh`);

  const startTime = new Date(proc.startTime).getTime();
  const lastReadingTime = new Date(lastReading.readingTime).getTime();
  const runningHours = (lastReadingTime - startTime) / (1000 * 60 * 60);
  console.log(`  runningHours = ${runningHours.toFixed(2)}`);

  const electricityCost = totalElectricityUsed * electricityRate;
  const depreciationCost = runningHours * depreciationPerHour;
  const maintenanceCost = runningHours * maintenancePerHour;
  const laborCost = runningHours * settings.laborCostPerHour;
  const total = electricityCost + depreciationCost + maintenanceCost + laborCost;

  console.log(`\n=== Cost components ===`);
  console.log(`  electricityCost = ${electricityCost.toFixed(2)}  (= ${totalElectricityUsed.toFixed(2)} × ${electricityRate.toFixed(4)})`);
  console.log(`  depreciationCost = ${depreciationCost.toFixed(2)}  (= ${runningHours.toFixed(2)} × ${depreciationPerHour.toFixed(4)})`);
  console.log(`  maintenanceCost = ${maintenanceCost.toFixed(2)}  (= ${runningHours.toFixed(2)} × ${maintenancePerHour.toFixed(4)})`);
  console.log(`  laborCost = ${laborCost.toFixed(2)}  (= ${runningHours.toFixed(2)} × ${settings.laborCostPerHour})`);
  console.log(`  TOTAL = ${total.toFixed(2)}`);
  console.log(`  STORED in DB = ${proc.totalCost}`);
  console.log(`  diff = ${(total - (proc.totalCost ?? 0)).toFixed(2)}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
