// @ts-nocheck

import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

declare global {
  var prisma: PrismaClient | undefined;
}

// ============================================================================
// Stock Ledger guard — enforces "all Stock bucket writes go through stockLedger"
// ============================================================================
//
// The helper sets a flag in this AsyncLocalStorage before issuing its Prisma
// calls. Any Stock UPDATE that hits a bucket field outside that context is
// blocked (in dev) or logged loudly (in prod). This is a runtime backstop to
// catch future code that bypasses the ledger.
//
// If you genuinely need to write to a Stock bucket field, add the call to
// `stockLedger.ts` and route through `postStockEntry()`.

const stockLedgerCtx = new AsyncLocalStorage<{ allowed: true }>();

export function runInsideStockLedger<T>(fn: () => Promise<T>): Promise<T> {
  return stockLedgerCtx.run({ allowed: true }, fn);
}

const STOCK_BUCKET_FIELDS = new Set([
  'statusNotDried',
  'statusUnderDrying',
  'statusDried',
  'statusDamaged',
  'statusInTransitOut',
  'statusInTransitIn',
]);

function dataTouchesBuckets(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  for (const key of Object.keys(data)) {
    if (STOCK_BUCKET_FIELDS.has(key)) return true;
  }
  return false;
}

const prisma = global.prisma || new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  errorFormat: 'pretty',
  __internal: {
    engine: {
      connectTimeout: 60000,
    }
  }
});

// Stock-ledger guard middleware (runs in BOTH dev and prod).
// Throws on direct Stock bucket writes outside the helper context.
prisma.$use(async (params, next) => {
  if (params.model === 'Stock') {
    const action = params.action;
    const isWriteToBuckets =
      (action === 'update' && dataTouchesBuckets(params.args?.data)) ||
      (action === 'updateMany' && dataTouchesBuckets(params.args?.data)) ||
      (action === 'upsert' && (dataTouchesBuckets(params.args?.update) || dataTouchesBuckets(params.args?.create)));
    if (isWriteToBuckets) {
      const inHelper = stockLedgerCtx.getStore()?.allowed === true;
      if (!inHelper) {
        const msg =
          `[STOCK_LEDGER_GUARD] Direct write to Stock.statusXxx fields outside ` +
          `stockLedger.postStockEntry() is forbidden. Action=${action}. ` +
          `Use the ledger helper instead. Stack:\n${new Error().stack}`;
        if (process.env.NODE_ENV === 'production') {
          // In prod, log loudly but don't crash a running request — the DB
          // CHECK constraints + balance trigger will still catch corruption.
          console.error(msg);
        } else {
          throw new Error(msg);
        }
      }
    }
  }
  return next(params);
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;

  // Debug logging
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();

    console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
    return result;
  });
}

// Add connection testing function
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to database');
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return false;
  }
}

export async function disconnect() {
  await prisma.$disconnect();
}

export { prisma };
