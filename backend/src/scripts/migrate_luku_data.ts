import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  totalReadings: number;
  readingsWithLukuSms: number;
  rechargesCreated: number;
  errors: { readingId: string; error: string }[];
  details: Array<{
    dryingProcessId: string;
    batchNumber: string;
    readingId: string;
    rechargeDate: Date;
    kwhAmount: number;
    meterReadingAfter: number;
  }>;
}

/**
 * Parse Tanzania Luku SMS format:
 * "Malipo yamekamilika. Token:12847-19346-88436-81039-42759
 * 2807.0KWH...MALIPO-UMEME-2503140.00-VAT-450566.40(18%)-EWURA-25031.40(1%)-REA-75094.20(3%).....Jumla 3053832.00/=TShs...Tarehe 22/10/2025 06:12"
 */
function parseLukuSms(sms: string): {
  token: string;
  kwhAmount: number;
  baseCost: number;
  vat: number;
  ewuraFee: number;
  reaFee: number;
  totalPaid: number;
  date: Date;
} | null {
  try {
    // Extract token
    const tokenMatch = sms.match(/Token[:：\s]*([0-9\-]+)/i);
    const token = tokenMatch ? tokenMatch[1].trim() : '';

    // Extract kWh amount (before "KWH")
    const kwhMatch = sms.match(/([0-9]+(?:\.[0-9]+)?)\s*KWH/i);
    const kwhAmount = kwhMatch ? parseFloat(kwhMatch[1]) : 0;

    // Extract costs
    const baseCostMatch = sms.match(/MALIPO[_\-]UMEME[_\-]([0-9]+(?:\.[0-9]+)?)/i);
    const baseCost = baseCostMatch ? parseFloat(baseCostMatch[1]) : 0;

    const vatMatch = sms.match(/VAT[_\-]([0-9]+(?:\.[0-9]+)?)/i);
    const vat = vatMatch ? parseFloat(vatMatch[1]) : 0;

    const ewuraMatch = sms.match(/EWURA[_\-]([0-9]+(?:\.[0-9]+)?)/i);
    const ewuraFee = ewuraMatch ? parseFloat(ewuraMatch[1]) : 0;

    const reaMatch = sms.match(/REA[_\-]([0-9]+(?:\.[0-9]+)?)/i);
    const reaFee = reaMatch ? parseFloat(reaMatch[1]) : 0;

    const totalMatch = sms.match(/Jumla\s+([0-9]+(?:\.[0-9]+)?)/i);
    const totalPaid = totalMatch ? parseFloat(totalMatch[1]) : 0;

    // Extract date: "22/10/2025 06:12" or "22/10/2025"
    const dateMatch = sms.match(/Tarehe\s+(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i);
    let date = new Date();

    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; // JS months are 0-indexed
      const year = parseInt(dateMatch[3]);
      const hour = dateMatch[4] ? parseInt(dateMatch[4]) : 0;
      const minute = dateMatch[5] ? parseInt(dateMatch[5]) : 0;
      date = new Date(year, month, day, hour, minute);
    }

    return {
      token,
      kwhAmount,
      baseCost,
      vat,
      ewuraFee,
      reaFee,
      totalPaid,
      date
    };
  } catch (error) {
    console.error('Error parsing Luku SMS:', error);
    return null;
  }
}

async function migrateLukuData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalReadings: 0,
    readingsWithLukuSms: 0,
    rechargesCreated: 0,
    errors: [],
    details: []
  };

  try {
    console.log('🔍 Fetching all drying readings...');

    // Use raw SQL to access the lukuSms field (since Prisma client doesn't have it anymore)
    const readings: any[] = await prisma.$queryRaw`
      SELECT
        dr.id,
        dr."dryingProcessId",
        dr."readingTime",
        dr."electricityMeter",
        dr."lukuSms",
        dp."batchNumber"
      FROM "DryingReading" dr
      JOIN "DryingProcess" dp ON dr."dryingProcessId" = dp.id
      WHERE dr."lukuSms" IS NOT NULL
      ORDER BY dr."readingTime" ASC
    `;

    stats.totalReadings = await prisma.dryingReading.count();
    stats.readingsWithLukuSms = readings.length;

    console.log(`\n📊 Found ${stats.totalReadings} total readings`);
    console.log(`📋 Found ${stats.readingsWithLukuSms} readings with Luku SMS data\n`);

    // Process each reading
    for (const reading of readings) {
      try {
        console.log(`\n🔄 Processing reading ${reading.id} from batch ${reading.batchNumber}...`);
        console.log(`   SMS: ${reading.lukuSms?.substring(0, 100)}...`);

        // Parse the SMS
        const parsed = parseLukuSms(reading.lukuSms!);

        if (!parsed || parsed.kwhAmount === 0) {
          stats.errors.push({
            readingId: reading.id,
            error: 'Failed to parse SMS or zero kWh amount'
          });
          console.log(`   ❌ Failed to parse SMS`);
          continue;
        }

        console.log(`   ✅ Parsed: ${parsed.kwhAmount} kWh, Token: ${parsed.token}`);
        console.log(`   💰 Total paid: TZS ${parsed.totalPaid.toLocaleString()}`);

        // Create ElectricityRecharge record
        const recharge = await prisma.electricityRecharge.create({
          data: {
            dryingProcessId: reading.dryingProcessId,
            rechargeDate: parsed.date,
            token: parsed.token,
            kwhAmount: parsed.kwhAmount,
            totalPaid: parsed.totalPaid,
            baseCost: parsed.baseCost || null,
            vat: parsed.vat || null,
            ewuraFee: parsed.ewuraFee || null,
            reaFee: parsed.reaFee || null,
            meterReadingAfter: Number(reading.electricityMeter), // The reading AFTER recharge
            notes: `Migrated from DryingReading ${reading.id} on ${new Date().toISOString()}`
          }
        });

        stats.rechargesCreated++;
        stats.details.push({
          dryingProcessId: reading.dryingProcessId,
          batchNumber: reading.batchNumber,
          readingId: reading.id,
          rechargeDate: parsed.date,
          kwhAmount: parsed.kwhAmount,
          meterReadingAfter: Number(reading.electricityMeter)
        });

        console.log(`   ✅ Created recharge record ${recharge.id}`);
        console.log(`   📍 Meter reading after recharge: ${reading.electricityMeter} kWh`);

      } catch (error: any) {
        stats.errors.push({
          readingId: reading.id,
          error: error.message
        });
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total readings in database: ${stats.totalReadings}`);
    console.log(`Readings with Luku SMS: ${stats.readingsWithLukuSms}`);
    console.log(`Recharge records created: ${stats.rechargesCreated}`);
    console.log(`Errors encountered: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`   Reading ${err.readingId}: ${err.error}`);
      });
    }

    if (stats.details.length > 0) {
      console.log('\n✅ MIGRATED RECHARGES BY BATCH:');

      // Group by batch
      const byBatch = stats.details.reduce((acc, item) => {
        if (!acc[item.batchNumber]) {
          acc[item.batchNumber] = [];
        }
        acc[item.batchNumber].push(item);
        return acc;
      }, {} as Record<string, typeof stats.details>);

      Object.keys(byBatch).sort().forEach(batchNumber => {
        const items = byBatch[batchNumber];
        console.log(`\n   ${batchNumber}:`);
        items.forEach(item => {
          console.log(`      • ${item.rechargeDate.toLocaleString()}: ${item.kwhAmount} kWh → Meter: ${item.meterReadingAfter} kWh`);
        });
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('❌ Fatal error during migration:', error);
    throw error;
  }

  return stats;
}

// Run migration
async function main() {
  console.log('🚀 Starting Luku data migration...\n');

  try {
    const stats = await migrateLukuData();

    // Exit with appropriate code
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Migration completed with errors. Please review.');
      process.exit(1);
    } else {
      console.log('\n✅ Migration completed successfully with no errors!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
