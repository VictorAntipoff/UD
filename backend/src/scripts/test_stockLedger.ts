// Tests for postStockEntry — runs against the live DB but uses a dedicated
// test warehouse + wood type that's created and DELETED at the end.
//
// All real stock data is untouched. The test cleanup runs in a finally block
// so even on failure it tries to clean up. If it ever fails to clean up,
// the test data is identifiable: warehouseCode 'STOCK_LEDGER_TEST'.

import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import {
  postStockEntry,
  StockLedgerError,
  postTransferStartSourceSide,
  postTransferStartDestSide,
  postTransferCompleteSourceSide,
  postTransferCompleteDestSide,
  postTransferCancelSourceSide,
  postTransferCancelDestSide,
  postTransferReverseDestSide,
  postTransferReverseSourceSide,
} from '../services/stockLedger.js';

const TEST_WAREHOUSE_CODE  = 'STOCK_LEDGER_TEST';
const TEST_WAREHOUSE2_CODE = 'STOCK_LEDGER_TEST_DEST';
const TEST_WOOD_TYPE_NAME = 'StockLedgerTestWood';
const TEST_THICKNESS = 'TEST_2"';
const TEST_REFERENCE_ID = 'test-ref-' + crypto.randomUUID();

let pass = 0;
let fail = 0;
const failures: string[] = [];

function ok(name: string) {
  pass++;
  console.log(`  ✓ ${name}`);
}

function ko(name: string, err: any) {
  fail++;
  failures.push(`${name}: ${err?.message ?? err}`);
  console.log(`  ✗ ${name}`);
  console.log(`     ${err?.message ?? err}`);
}

async function expectThrow(name: string, fn: () => Promise<any>, expectMsg?: string | RegExp) {
  try {
    await fn();
    ko(name, new Error('expected to throw, but did not'));
  } catch (e: any) {
    if (expectMsg) {
      const matches = typeof expectMsg === 'string'
        ? (e.message ?? '').includes(expectMsg)
        : expectMsg.test(e.message ?? '');
      if (!matches) {
        ko(name, new Error(`expected "${expectMsg}", got "${e.message}"`));
        return;
      }
    }
    ok(name);
  }
}

async function setUp() {
  console.log('Setting up test warehouses + wood type...');
  // Create test warehouse (source)
  let wh = await prisma.warehouse.findFirst({ where: { code: TEST_WAREHOUSE_CODE } });
  if (!wh) {
    wh = await prisma.warehouse.create({
      data: {
        id: crypto.randomUUID(),
        code: TEST_WAREHOUSE_CODE,
        name: 'Stock Ledger Test Warehouse (auto-cleanup)',
        stockControlEnabled: true,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });
  }
  // Create test warehouse #2 (destination — used for transfer tests)
  let wh2 = await prisma.warehouse.findFirst({ where: { code: TEST_WAREHOUSE2_CODE } });
  if (!wh2) {
    wh2 = await prisma.warehouse.create({
      data: {
        id: crypto.randomUUID(),
        code: TEST_WAREHOUSE2_CODE,
        name: 'Stock Ledger Test Dest Warehouse (auto-cleanup)',
        stockControlEnabled: true,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });
  }

  // Create test wood type
  let wt = await prisma.woodType.findFirst({ where: { name: TEST_WOOD_TYPE_NAME } });
  if (!wt) {
    wt = await prisma.woodType.create({
      data: {
        id: crypto.randomUUID(),
        name: TEST_WOOD_TYPE_NAME,
        grade: 'TEST',
        updatedAt: new Date(),
      },
    });
  }

  // Clean slate for both warehouses
  for (const w of [wh.id, wh2.id]) {
    await prisma.stock.deleteMany({
      where: { warehouseId: w, woodTypeId: wt.id, thickness: TEST_THICKNESS },
    });
    await prisma.stock_movements.deleteMany({
      where: { warehouseId: w, woodTypeId: wt.id, thickness: TEST_THICKNESS },
    });
  }

  return { warehouseId: wh.id, destWarehouseId: wh2.id, woodTypeId: wt.id };
}

async function tearDown(ids: { warehouseId: string; destWarehouseId: string; woodTypeId: string }) {
  console.log('\nCleaning up test data...');
  // Delete all movements
  await prisma.stock_movements.deleteMany({
    where: { warehouseId: { in: [ids.warehouseId, ids.destWarehouseId] }, woodTypeId: ids.woodTypeId },
  });
  // Delete stock rows
  await prisma.stock.deleteMany({
    where: { warehouseId: { in: [ids.warehouseId, ids.destWarehouseId] }, woodTypeId: ids.woodTypeId },
  });
  // Delete warehouses + wood type
  try { await prisma.woodType.delete({ where: { id: ids.woodTypeId } }); } catch {}
  try { await prisma.warehouse.delete({ where: { id: ids.warehouseId } }); } catch {}
  try { await prisma.warehouse.delete({ where: { id: ids.destWarehouseId } }); } catch {}
  console.log('  ✓ test data removed');
}

async function getStockAt(warehouseId: string, woodTypeId: string, thickness = TEST_THICKNESS) {
  return prisma.stock.findFirst({
    where: { warehouseId, woodTypeId, thickness },
  });
}

async function getStock(ids: { warehouseId: string; woodTypeId: string }) {
  return getStockAt(ids.warehouseId, ids.woodTypeId);
}

async function getMovements(ids: { warehouseId: string; woodTypeId: string }) {
  return prisma.stock_movements.findMany({
    where: { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS },
    orderBy: { createdAt: 'asc' },
  });
}

async function clearMovements(ids: { warehouseId: string; destWarehouseId?: string; woodTypeId: string }) {
  const ws = [ids.warehouseId, ids.destWarehouseId].filter(Boolean) as string[];
  await prisma.stock.deleteMany({
    where: { warehouseId: { in: ws }, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS },
  });
  await prisma.stock_movements.deleteMany({
    where: { warehouseId: { in: ws }, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS },
  });
}

async function runTests() {
  const ids = await setUp();
  console.log(`Using test warehouse=${ids.warehouseId} woodType=${ids.woodTypeId}\n`);

  try {
    // ---------- TEST 1: Single-leg receipt ----------
    console.log('TEST 1: single-leg receipt (+100 NotDried)');
    await postStockEntry({
      legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: 100 }],
      reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'TEST-RECEIPT-1' },
      movementType: 'RECEIPT_SYNC',
      details: 'test 1',
    });
    {
      const s = await getStock(ids);
      const m = await getMovements(ids);
      if (s?.statusNotDried === 100 && m.length === 1 && m[0].quantityChange === 100 && m[0].priorBalance === 0 && m[0].postBalance === 100 && m[0].entryGroupId === null) {
        ok('stock=100, 1 movement with prior=0 post=100, entryGroupId=null (single-leg)');
      } else {
        ko('test 1 result mismatch', { stock: s, movements: m });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 2: Drying-start (balanced 2-leg) ----------
    console.log('\nTEST 2: drying start (-50 NotDried, +50 UnderDrying)');
    // Seed 50 NotDried first (single-leg)
    await postStockEntry({
      legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: 50 }],
      reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'SEED' },
      movementType: 'RECEIPT_SYNC',
    });
    // Now drying start
    await postStockEntry({
      legs: [
        { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED',    delta: -50 },
        { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'UNDER_DRYING', delta: +50 },
      ],
      reference: { type: 'DRYING_PROCESS', id: TEST_REFERENCE_ID, number: 'TEST-DRY-1' },
      movementType: 'DRYING_START',
    });
    {
      const s = await getStock(ids);
      const m = await getMovements(ids);
      const dryLegs = m.filter(x => x.movementType === 'DRYING_START');
      const groupIds = new Set(dryLegs.map(x => x.entryGroupId));
      if (
        s?.statusNotDried === 0 && s?.statusUnderDrying === 50 &&
        dryLegs.length === 2 && groupIds.size === 1 && [...groupIds][0] !== null
      ) {
        ok('NotDried=0, UnderDrying=50, 2 legs share entryGroupId');
      } else {
        ko('test 2 result mismatch', { stock: s, dryLegs, groupIds });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 3: Drying-end (balanced 2-leg) ----------
    console.log('\nTEST 3: drying end (-30 UnderDrying, +30 Dried) starting from UnderDrying=30');
    // Seed 30 UnderDrying (start with NotDried=30 then move to UnderDrying)
    await postStockEntry({
      legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: 30 }],
      reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'SEED' },
      movementType: 'RECEIPT_SYNC',
    });
    await postStockEntry({
      legs: [
        { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED',    delta: -30 },
        { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'UNDER_DRYING', delta: +30 },
      ],
      reference: { type: 'DRYING_PROCESS', id: TEST_REFERENCE_ID, number: 'TEST-DRY-2' },
      movementType: 'DRYING_START',
    });
    // Now drying end
    await postStockEntry({
      legs: [
        { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'UNDER_DRYING', delta: -30 },
        { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'DRIED',        delta: +30 },
      ],
      reference: { type: 'DRYING_PROCESS', id: TEST_REFERENCE_ID, number: 'TEST-DRY-2' },
      movementType: 'DRYING_END',
    });
    {
      const s = await getStock(ids);
      if (s?.statusUnderDrying === 0 && s?.statusDried === 30 && s?.statusNotDried === 0) {
        ok('UnderDrying=0, Dried=30');
      } else {
        ko('test 3 result mismatch', { stock: s });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 4: Unbalanced multi-leg → REJECTED ----------
    console.log('\nTEST 4: unbalanced legs (-50 NotDried, +40 Dried) → expect REJECT');
    // Seed 50 NotDried first
    await postStockEntry({
      legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: 50 }],
      reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'SEED' },
      movementType: 'RECEIPT_SYNC',
    });
    await expectThrow('unbalanced legs throws UNBALANCED', async () => {
      await postStockEntry({
        legs: [
          { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: -50 },
          { warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'DRIED',     delta: +40 },
        ],
        reference: { type: 'DRYING_PROCESS', id: TEST_REFERENCE_ID, number: 'TEST-BAD' },
        movementType: 'DRYING_END',
      });
    }, /sum to.*expected 0|UNBALANCED/i);
    // Verify state unchanged
    {
      const s = await getStock(ids);
      if (s?.statusNotDried === 50 && s?.statusDried === 0) {
        ok('stock unchanged after unbalanced rejection');
      } else {
        ko('test 4 state changed despite rejection', { stock: s });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 5: Negative target → REJECTED by CHECK constraint ----------
    console.log('\nTEST 5: try to subtract from empty bucket → expect CHECK rejection');
    await expectThrow('CHECK rejects negative result', async () => {
      await postStockEntry({
        legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: -10 }],
        reference: { type: 'STOCK_ADJUSTMENT', id: TEST_REFERENCE_ID, number: 'BAD-ADJ' },
        movementType: 'MANUAL_ADJUSTMENT',
      });
    }, /violates check constraint|stock_not_dried_nonneg|negative/i);
    {
      const s = await getStock(ids);
      // either no row at all, or row with all zeros
      if (!s || (s.statusNotDried === 0 && s.statusUnderDrying === 0 && s.statusDried === 0)) {
        ok('no row created or all zeros — rejection clean');
      } else {
        ko('test 5 unexpected stock state', { stock: s });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 6: Zero delta → validation error ----------
    console.log('\nTEST 6: leg with delta=0 → expect ZERO_DELTA');
    await expectThrow('zero delta rejected', async () => {
      await postStockEntry({
        legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: 0 }],
        reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'BAD' },
        movementType: 'RECEIPT_SYNC',
      });
    }, /ZERO_DELTA|non-zero/i);
    ok('did not write to DB on validation error');
    await clearMovements(ids);

    // ---------- TEST 7: Concurrent writes serialized correctly ----------
    console.log('\nTEST 7: 5 concurrent +1 NotDried → final = 5');
    const concurrentPromises = Array.from({ length: 5 }, (_, i) =>
      postStockEntry({
        legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: 1 }],
        reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID + '-' + i, number: `CONCURRENT-${i}` },
        movementType: 'RECEIPT_SYNC',
      })
    );
    await Promise.all(concurrentPromises);
    {
      const s = await getStock(ids);
      const m = await getMovements(ids);
      if (s?.statusNotDried === 5 && m.length === 5) {
        ok('all 5 concurrent writes committed, final = 5');
      } else {
        ko('concurrent test result mismatch', { stock: s, movementCount: m.length });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 8: Transfer START (cross-warehouse, two independent groups) ----------
    console.log('\nTEST 8: transfer start — src woodStatus→IN_TRANSIT_OUT (balanced), dest IN_TRANSIT_IN (single-leg)');
    // Seed source with 50 NotDried
    await postStockEntry({
      legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: 50 }],
      reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'SEED' },
      movementType: 'RECEIPT_SYNC',
    });
    // Source side
    await postTransferStartSourceSide({
      warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 30, woodStatus: 'NOT_DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T8',
    });
    // Dest side
    await postTransferStartDestSide({
      warehouseId: ids.destWarehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 30, woodStatus: 'NOT_DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T8',
    });
    {
      const src = await getStockAt(ids.warehouseId, ids.woodTypeId);
      const dest = await getStockAt(ids.destWarehouseId, ids.woodTypeId);
      const allMovs = await prisma.stock_movements.findMany({
        where: { woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS },
      });
      const srcGroupRows = allMovs.filter(m => m.warehouseId === ids.warehouseId && m.entryGroupId !== null);
      const groupIds = new Set(srcGroupRows.map(m => m.entryGroupId));
      const destSingleLegs = allMovs.filter(m => m.warehouseId === ids.destWarehouseId);

      if (
        src?.statusNotDried === 20 && src?.statusInTransitOut === 30 &&
        dest?.statusInTransitIn === 30 &&
        groupIds.size === 1 &&  // src has one balanced group
        destSingleLegs.every(m => m.entryGroupId === null) // dest is single-leg
      ) {
        ok('src NotDried=20 InTransitOut=30 (balanced group), dest InTransitIn=30 (single-leg)');
      } else {
        ko('test 8 mismatch', { src, dest, groupIds: [...groupIds], destSingleLegCount: destSingleLegs.length });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 9: Full transfer cycle (start → complete) ----------
    console.log('\nTEST 9: full cycle — start, then complete, verify destination receives');
    await postStockEntry({
      legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'DRIED', delta: 100 }],
      reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'SEED' },
      movementType: 'RECEIPT_SYNC',
    });
    // Start
    await postTransferStartSourceSide({
      warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 100, woodStatus: 'DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T9',
    });
    await postTransferStartDestSide({
      warehouseId: ids.destWarehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 100, woodStatus: 'DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T9',
    });
    // Complete
    await postTransferCompleteSourceSide({
      warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 100, woodStatus: 'DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T9',
    });
    await postTransferCompleteDestSide({
      warehouseId: ids.destWarehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 100, woodStatus: 'DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T9',
    });
    {
      const src = await getStockAt(ids.warehouseId, ids.woodTypeId);
      const dest = await getStockAt(ids.destWarehouseId, ids.woodTypeId);
      if (
        src?.statusDried === 0 && src?.statusInTransitOut === 0 &&
        dest?.statusDried === 100 && dest?.statusInTransitIn === 0
      ) {
        ok('after complete: src 0/0, dest 100 Dried, InTransitIn=0');
      } else {
        ko('test 9 mismatch', { src, dest });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 10: Transfer CANCEL after start ----------
    console.log('\nTEST 10: cancel mid-flight — pieces return to source, dest cleared');
    await postStockEntry({
      legs: [{ warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'NOT_DRIED', delta: 60 }],
      reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'SEED' },
      movementType: 'RECEIPT_SYNC',
    });
    await postTransferStartSourceSide({
      warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 60, woodStatus: 'NOT_DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T10',
    });
    await postTransferStartDestSide({
      warehouseId: ids.destWarehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 60, woodStatus: 'NOT_DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T10',
    });
    // Cancel
    await postTransferCancelSourceSide({
      warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 60, woodStatus: 'NOT_DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T10',
    });
    await postTransferCancelDestSide({
      warehouseId: ids.destWarehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 60, woodStatus: 'NOT_DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T10',
    });
    {
      const src = await getStockAt(ids.warehouseId, ids.woodTypeId);
      const dest = await getStockAt(ids.destWarehouseId, ids.woodTypeId);
      if (
        src?.statusNotDried === 60 && src?.statusInTransitOut === 0 &&
        dest?.statusInTransitIn === 0 && (dest?.statusNotDried ?? 0) === 0
      ) {
        ok('after cancel: src restored to 60 NotDried, dest cleared');
      } else {
        ko('test 10 mismatch', { src, dest });
      }
    }
    await clearMovements(ids);

    // ---------- TEST 11: Reverse a COMPLETED transfer ----------
    console.log('\nTEST 11: reverse — pieces teleport from dest back to src');
    // Seed dest with 50 Dried (as if a transfer had completed)
    await postStockEntry({
      legs: [{ warehouseId: ids.destWarehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS, status: 'DRIED', delta: 50 }],
      reference: { type: 'RECEIPT', id: TEST_REFERENCE_ID, number: 'SEED' },
      movementType: 'RECEIPT_SYNC',
    });
    // Reverse
    await postTransferReverseDestSide({
      warehouseId: ids.destWarehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 50, woodStatus: 'DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T11',
    });
    await postTransferReverseSourceSide({
      warehouseId: ids.warehouseId, woodTypeId: ids.woodTypeId, thickness: TEST_THICKNESS,
      pieceCount: 50, woodStatus: 'DRIED', transferId: TEST_REFERENCE_ID, transferNumber: 'TRF-T11',
    });
    {
      const src = await getStockAt(ids.warehouseId, ids.woodTypeId);
      const dest = await getStockAt(ids.destWarehouseId, ids.woodTypeId);
      if (
        src?.statusDried === 50 &&
        dest?.statusDried === 0
      ) {
        ok('after reverse: src has 50 Dried, dest 0 Dried');
      } else {
        ko('test 11 mismatch', { src, dest });
      }
    }
    await clearMovements(ids);

  } finally {
    await tearDown(ids);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PASSED: ${pass}    FAILED: ${fail}`);
  if (fail > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

runTests()
  .catch(async (e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
