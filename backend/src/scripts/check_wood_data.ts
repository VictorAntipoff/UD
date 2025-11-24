import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkWoodData() {
  console.log('🔍 CHECKING WOOD TYPE AND THICKNESS DATA\n');
  console.log('='.repeat(80));

  const processes = await prisma.dryingProcess.findMany({
    where: { status: 'COMPLETED' },
    include: {
      woodType: true,
      items: {
        include: {
          woodType: true
        }
      }
    },
    orderBy: { batchNumber: 'asc' }
  });

  console.log(`\n📊 COMPLETED BATCHES (${processes.length}):\n`);

  for (const batch of processes) {
    console.log(`📦 ${batch.batchNumber}`);
    console.log(`   Wood Type ID: ${batch.woodTypeId || 'NOT SET'}`);
    console.log(`   Wood Type: ${batch.woodType?.name || 'NOT SET'}`);
    console.log(`   Thickness: ${batch.thickness || 'NOT SET'}${batch.thickness ? (' ' + (batch.thicknessUnit || 'mm')) : ''}`);
    console.log(`   Piece Count: ${batch.pieceCount || 'NOT SET'}`);
    console.log(`   Items Count: ${batch.items?.length || 0}`);

    if (batch.items && batch.items.length > 0) {
      console.log(`   Items:`);
      batch.items.forEach((item: any) => {
        console.log(`      - ${item.woodType?.name || 'Unknown'}: ${item.pieceCount} pieces (${item.thickness})`);
      });
    }

    const hasWoodTypeViaItems = batch.items && batch.items.length > 0;
    const hasWoodTypeDirect = batch.woodTypeId !== null;

    if (hasWoodTypeViaItems && !hasWoodTypeDirect) {
      console.log(`   ⚠️  Wood type is linked via woodItems but not set directly on batch`);
    } else if (!hasWoodTypeDirect) {
      console.log(`   ❌ Missing wood type data!`);
    }

    if (!batch.thickness) {
      console.log(`   ❌ Missing thickness data!`);
    }

    console.log('');
  }

  // Check available wood types
  console.log('='.repeat(80));
  const woodTypes = await prisma.woodType.findMany({
    orderBy: { name: 'asc' }
  });

  console.log(`\n🌳 AVAILABLE WOOD TYPES (${woodTypes.length}):\n`);
  woodTypes.forEach(wt => {
    console.log(`   - ${wt.name} (ID: ${wt.id})`);
  });

  console.log('\n='.repeat(80));
  console.log('\n✅ Check complete!\n');
}

checkWoodData().catch(console.error).finally(() => prisma.$disconnect());
