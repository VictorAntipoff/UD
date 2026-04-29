// Stock Ledger — single source of truth for every stock change.
//
// Contract (enforced by DB + this helper):
//   1. Every stock change goes through postStockEntry().
//   2. Every change writes both Stock (cache) AND stock_movements (journal)
//      in the same transaction.
//   3. Multi-leg entries share an entryGroupId. The DB trigger validates
//      they sum to zero at COMMIT (double-entry).
//   4. Row locks (SELECT ... FOR UPDATE) prevent races on concurrent writes.
//   5. CHECK constraints on Stock prevent negative buckets.
//
// Direct prisma.stock.update() on status fields outside this file is FORBIDDEN.
// (Enforced by code review + lint rule in Step 4 of Phase A.)
//
// See docs/stock-ledger-phase-a.md for full design.

import crypto from 'node:crypto';
import { prisma, runInsideStockLedger } from '../lib/prisma.js';
import type { MovementType, ReferenceType, WoodStatus } from '@prisma/client';

// ---------- Types ----------

export interface StockLeg {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;          // exact format as stored: '1"', '2"', 'Custom', etc.
  status: WoodStatus;          // NOT_DRIED | UNDER_DRYING | DRIED | DAMAGED | IN_TRANSIT_OUT | IN_TRANSIT_IN
  delta: number;               // signed: +pieces or -pieces. Must be non-zero.
}

export interface StockEntry {
  legs: StockLeg[];
  reference: {
    type: ReferenceType;       // RECEIPT | TRANSFER | DRYING_PROCESS | STOCK_ADJUSTMENT
    id: string;                // UUID of the source document
    number?: string;           // human-readable (e.g. UD-DRY-00039)
  };
  movementType: MovementType;  // RECEIPT_SYNC | TRANSFER_OUT | TRANSFER_IN | DRYING_START | DRYING_END | MANUAL_ADJUSTMENT
  user?: { id?: string; name?: string };
  details?: string;            // free-text "why" — shown in audit trail
}

// Maps a WoodStatus enum value to the corresponding Stock column name.
// This is the only place this mapping lives.
const STATUS_TO_COLUMN: Record<WoodStatus, keyof StockColumns> = {
  NOT_DRIED:      'statusNotDried',
  UNDER_DRYING:   'statusUnderDrying',
  DRIED:          'statusDried',
  DAMAGED:        'statusDamaged',
  IN_TRANSIT_OUT: 'statusInTransitOut',
  IN_TRANSIT_IN:  'statusInTransitIn',
};

interface StockColumns {
  statusNotDried: number;
  statusUnderDrying: number;
  statusDried: number;
  statusDamaged: number;
  statusInTransitOut: number;
  statusInTransitIn: number;
}

// ---------- Errors ----------

export class StockLedgerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'StockLedgerError';
  }
}

// ---------- Validation (pre-DB) ----------

function validateEntry(entry: StockEntry): void {
  if (!entry.legs || entry.legs.length === 0) {
    throw new StockLedgerError('Entry must have at least one leg', 'NO_LEGS');
  }

  for (const [i, leg] of entry.legs.entries()) {
    if (!leg.warehouseId)  throw new StockLedgerError(`Leg ${i}: warehouseId required`,  'MISSING_WAREHOUSE');
    if (!leg.woodTypeId)   throw new StockLedgerError(`Leg ${i}: woodTypeId required`,   'MISSING_WOOD_TYPE');
    if (!leg.thickness)    throw new StockLedgerError(`Leg ${i}: thickness required`,    'MISSING_THICKNESS');
    if (!leg.status)       throw new StockLedgerError(`Leg ${i}: status required`,       'MISSING_STATUS');
    if (!Number.isFinite(leg.delta) || !Number.isInteger(leg.delta)) {
      throw new StockLedgerError(`Leg ${i}: delta must be an integer`, 'INVALID_DELTA');
    }
    if (leg.delta === 0) {
      throw new StockLedgerError(`Leg ${i}: delta must be non-zero`, 'ZERO_DELTA');
    }
  }

  // Multi-leg entries must balance — single-leg entries (e.g. receipts) are exempt.
  if (entry.legs.length > 1) {
    const sum = entry.legs.reduce((s, l) => s + l.delta, 0);
    if (sum !== 0) {
      throw new StockLedgerError(
        `Multi-leg entry does not balance: legs sum to ${sum}, expected 0`,
        'UNBALANCED',
      );
    }
  }

  if (!entry.reference?.type || !entry.reference?.id) {
    throw new StockLedgerError('reference.type and reference.id are required', 'MISSING_REFERENCE');
  }
  if (!entry.movementType) {
    throw new StockLedgerError('movementType is required', 'MISSING_MOVEMENT_TYPE');
  }
}

// ---------- Deterministic leg ordering (avoids deadlocks) ----------

// Sort by (warehouseId, woodTypeId, thickness) so concurrent transactions
// always lock rows in the same order — eliminates deadlock potential.
function sortedLegs(legs: StockLeg[]): StockLeg[] {
  return [...legs].sort((a, b) => {
    const aKey = `${a.warehouseId}|${a.woodTypeId}|${a.thickness}|${a.status}`;
    const bKey = `${b.warehouseId}|${b.woodTypeId}|${b.thickness}|${b.status}`;
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
}

// Group legs by stock row (warehouse+wood+thickness) — one row may have
// multiple legs hitting different status columns (e.g. drying-end touches
// the same row's UnderDrying and Dried).
function groupLegsByStockRow(legs: StockLeg[]): Map<string, StockLeg[]> {
  const map = new Map<string, StockLeg[]>();
  for (const leg of legs) {
    const key = `${leg.warehouseId}|${leg.woodTypeId}|${leg.thickness}`;
    const existing = map.get(key) ?? [];
    existing.push(leg);
    map.set(key, existing);
  }
  return map;
}

// ---------- Main entrypoint ----------

/**
 * Post a stock entry: atomically updates Stock cache + writes movement journal.
 *
 * - Validates input (throws StockLedgerError on bad input).
 * - Locks affected stock rows for the duration of the transaction.
 * - Generates entryGroupId for multi-leg entries.
 * - Writes one stock_movements row per leg with prior/post balance snapshot.
 * - Updates the Stock denormalized cache.
 * - DB CHECK constraints reject if any bucket would go negative.
 * - DB deferred trigger validates entryGroup balance at COMMIT.
 *
 * @param entry The stock entry to post.
 * @param tx Optional outer transaction; if provided, runs within it.
 *           If omitted, creates its own transaction.
 */
export async function postStockEntry(
  entry: StockEntry,
  tx?: any
): Promise<void> {
  validateEntry(entry);

  const runner = tx
    ? (cb: (t: any) => Promise<void>) => cb(tx)
    : (cb: (t: any) => Promise<void>) =>
        prisma.$transaction(cb, { maxWait: 30_000, timeout: 60_000 });

  // Mark the AsyncLocalStorage context so the prisma middleware allows
  // direct Stock bucket writes from inside this helper.
  await runInsideStockLedger(async () => {
  await runner(async (t) => {
    const entryGroupId = entry.legs.length > 1 ? crypto.randomUUID() : null;
    const legs = sortedLegs(entry.legs);
    const groups = groupLegsByStockRow(legs);

    // Iterate each stock row in deterministic order, lock it, apply legs.
    for (const [rowKey, rowLegs] of groups) {
      const [warehouseId, woodTypeId, thickness] = rowKey.split('|');

      // Lock + read current state of this row. Create row if missing.
      // Using raw SELECT ... FOR UPDATE to get a real row lock; Prisma's
      // generated queries don't expose this directly.
      const lockedRows: any[] = await t.$queryRawUnsafe(
        `SELECT
           id,
           "statusNotDried", "statusUnderDrying", "statusDried",
           "statusDamaged", "statusInTransitOut", "statusInTransitIn"
         FROM "Stock"
         WHERE "warehouseId" = $1 AND "woodTypeId" = $2 AND thickness = $3
         FOR UPDATE`,
        warehouseId,
        woodTypeId,
        thickness,
      );

      let stockRow: any;
      if (lockedRows.length === 0) {
        // Create the row at zero — then re-lock it.
        // (We can't FOR UPDATE on a row we just created in the same statement,
        //  but createMany is atomic so concurrent creators will see one win
        //  via the unique index — and the loser falls through to find the row.)
        try {
          await t.stock.create({
            data: {
              id: crypto.randomUUID(),
              warehouseId,
              woodTypeId,
              thickness,
              statusNotDried: 0,
              statusUnderDrying: 0,
              statusDried: 0,
              statusDamaged: 0,
              statusInTransitOut: 0,
              statusInTransitIn: 0,
              updatedAt: new Date(),
            },
          });
        } catch (e: any) {
          // Unique violation = another tx created it first. We'll find it below.
          if (e?.code !== 'P2002' && e?.meta?.target?.length !== undefined) {
            // Some other error
            throw e;
          }
        }
        const reLocked: any[] = await t.$queryRawUnsafe(
          `SELECT
             id,
             "statusNotDried", "statusUnderDrying", "statusDried",
             "statusDamaged", "statusInTransitOut", "statusInTransitIn"
           FROM "Stock"
           WHERE "warehouseId" = $1 AND "woodTypeId" = $2 AND thickness = $3
           FOR UPDATE`,
          warehouseId,
          woodTypeId,
          thickness,
        );
        if (reLocked.length === 0) {
          throw new StockLedgerError(
            `Failed to acquire stock row for ${warehouseId}/${woodTypeId}/${thickness}`,
            'ROW_NOT_FOUND',
          );
        }
        stockRow = reLocked[0];
      } else {
        stockRow = lockedRows[0];
      }

      // Compute new column values for each leg, write movement, update.
      const updates: Partial<StockColumns> = {};
      for (const leg of rowLegs) {
        const col = STATUS_TO_COLUMN[leg.status];
        const prior: number = (updates[col] ?? stockRow[col]) as number;
        const post = prior + leg.delta;
        updates[col] = post;

        // Insert the journal row. The DB CHECK on Stock + the deferred trigger
        // on stock_movements will enforce invariants at COMMIT.
        await t.stock_movements.create({
          data: {
            id: crypto.randomUUID(),
            warehouseId: leg.warehouseId,
            woodTypeId: leg.woodTypeId,
            thickness: leg.thickness,
            movementType: entry.movementType,
            quantityChange: leg.delta,
            fromStatus: leg.delta < 0 ? leg.status : null,
            toStatus:   leg.delta > 0 ? leg.status : null,
            referenceType: entry.reference.type,
            referenceId: entry.reference.id,
            referenceNumber: entry.reference.number,
            userId: entry.user?.id,
            userName: entry.user?.name,
            details: entry.details,
            entryGroupId,
            priorBalance: prior,
            postBalance: post,
          },
        });
      }

      // Apply the cumulative status updates to the Stock row.
      await t.stock.update({
        where: { id: stockRow.id },
        data: { ...updates, updatedAt: new Date() },
      });
    }
  });
  });
}

// ---------- Convenience builders for common patterns ----------
// These reduce verbosity at call sites and document intent.
// All ultimately call postStockEntry().

/**
 * Drying START: pieces leave NotDried, enter UnderDrying (intra-warehouse).
 */
export async function postDryingStart(args: {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  pieceCount: number;
  processId: string;
  batchNumber?: string;
  user?: { id?: string; name?: string };
}, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'NOT_DRIED',    delta: -args.pieceCount },
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'UNDER_DRYING', delta: +args.pieceCount },
    ],
    reference: { type: 'DRYING_PROCESS', id: args.processId, number: args.batchNumber },
    movementType: 'DRYING_START',
    user: args.user,
    details: args.batchNumber ? `Drying ${args.batchNumber} started` : undefined,
  }, tx);
}

/**
 * Drying END: pieces leave UnderDrying, enter Dried (intra-warehouse).
 */
export async function postDryingEnd(args: {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  pieceCount: number;
  processId: string;
  batchNumber?: string;
  user?: { id?: string; name?: string };
}, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'UNDER_DRYING', delta: -args.pieceCount },
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'DRIED',        delta: +args.pieceCount },
    ],
    reference: { type: 'DRYING_PROCESS', id: args.processId, number: args.batchNumber },
    movementType: 'DRYING_END',
    user: args.user,
    details: args.batchNumber ? `Drying ${args.batchNumber} completed` : undefined,
  }, tx);
}

/**
 * Drying REOPEN: reverse a Drying END (Dried → UnderDrying).
 */
export async function postDryingReopen(args: {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  pieceCount: number;
  processId: string;
  batchNumber?: string;
  user?: { id?: string; name?: string };
  reason?: string;
}, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'DRIED',        delta: -args.pieceCount },
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'UNDER_DRYING', delta: +args.pieceCount },
    ],
    reference: { type: 'DRYING_PROCESS', id: args.processId, number: args.batchNumber },
    movementType: 'DRYING_END',  // Re-using DRYING_END enum until we add a REOPEN type
    user: args.user,
    details: args.batchNumber ? `Reopened ${args.batchNumber}${args.reason ? ': ' + args.reason : ''}` : undefined,
  }, tx);
}

/**
 * Drying CANCEL (delete): reverse a Drying START (UnderDrying → NotDried).
 */
export async function postDryingCancel(args: {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  pieceCount: number;
  processId: string;
  batchNumber?: string;
  user?: { id?: string; name?: string };
}, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'UNDER_DRYING', delta: -args.pieceCount },
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'NOT_DRIED',    delta: +args.pieceCount },
    ],
    reference: { type: 'DRYING_PROCESS', id: args.processId, number: args.batchNumber },
    movementType: 'DRYING_START',  // reversal
    user: args.user,
    details: args.batchNumber ? `Cancelled ${args.batchNumber} — pieces returned to NotDried` : undefined,
  }, tx);
}

/**
 * Wood receipt sync: pieces arrive, single-leg +NotDried.
 */
export async function postReceiptSync(args: {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  pieceCount: number;
  receiptId: string;
  lotNumber?: string;
  user?: { id?: string; name?: string };
}, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'NOT_DRIED', delta: +args.pieceCount },
    ],
    reference: { type: 'RECEIPT', id: args.receiptId, number: args.lotNumber },
    movementType: 'RECEIPT_SYNC',
    user: args.user,
    details: args.lotNumber ? `Receipt ${args.lotNumber} synced` : undefined,
  }, tx);
}

// ============================================================================
// Transfer helpers
// ============================================================================
//
// Transfers cross warehouses, so the journal model treats source-side and
// destination-side as INDEPENDENT entry groups. This matches the existing rule
// "destination warehouse stock updates must be INDEPENDENT of source stock
// control check" (separate if-blocks, not nested).
//
// At create/approve time:
//   src side  (balanced group): woodStatus -qty, IN_TRANSIT_OUT +qty
//   dest side (single-leg):     IN_TRANSIT_IN +qty
//
// At complete time:
//   src side  (single-leg):     IN_TRANSIT_OUT -qty
//   dest side (balanced group): IN_TRANSIT_IN -qty, woodStatus +qty
//
// At cancel time (IN_TRANSIT → REJECTED):  reverse of create.
// At reverse time (COMPLETED → REJECTED):  two single-leg entries, no in-transit
//                                           dance (pieces just teleport back).
//
// Each helper takes only the side relevant to its name; the caller decides
// whether to invoke the src side, dest side, or both based on
// stockControlEnabled per warehouse. This keeps src/dest blocks independent.

type TransferSideArgs = {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;
  pieceCount: number;
  woodStatus: WoodStatus;          // the woodStatus the item is being transferred AS
  transferId: string;
  transferNumber?: string;
  user?: { id?: string; name?: string };
  details?: string;
};

/** Source side of a transfer START (create or approve): woodStatus → IN_TRANSIT_OUT. */
export async function postTransferStartSourceSide(args: TransferSideArgs, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: args.woodStatus,    delta: -args.pieceCount },
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'IN_TRANSIT_OUT',   delta: +args.pieceCount },
    ],
    reference: { type: 'TRANSFER', id: args.transferId, number: args.transferNumber },
    movementType: 'TRANSFER_OUT',
    user: args.user,
    details: args.details ?? (args.transferNumber ? `Transfer ${args.transferNumber} started (source)` : undefined),
  }, tx);
}

/** Destination side of a transfer START: pieces enter IN_TRANSIT_IN. */
export async function postTransferStartDestSide(args: TransferSideArgs, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'IN_TRANSIT_IN', delta: +args.pieceCount },
    ],
    reference: { type: 'TRANSFER', id: args.transferId, number: args.transferNumber },
    movementType: 'TRANSFER_IN',
    user: args.user,
    details: args.details ?? (args.transferNumber ? `Transfer ${args.transferNumber} started (destination, in transit)` : undefined),
  }, tx);
}

/** Source side of a transfer COMPLETE: pieces drain from IN_TRANSIT_OUT (gone forever). */
export async function postTransferCompleteSourceSide(args: TransferSideArgs, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'IN_TRANSIT_OUT', delta: -args.pieceCount },
    ],
    reference: { type: 'TRANSFER', id: args.transferId, number: args.transferNumber },
    movementType: 'TRANSFER_OUT',
    user: args.user,
    details: args.details ?? (args.transferNumber ? `Transfer ${args.transferNumber} completed (source drained)` : undefined),
  }, tx);
}

/** Destination side of a transfer COMPLETE: IN_TRANSIT_IN → woodStatus. */
export async function postTransferCompleteDestSide(args: TransferSideArgs, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'IN_TRANSIT_IN', delta: -args.pieceCount },
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: args.woodStatus,  delta: +args.pieceCount },
    ],
    reference: { type: 'TRANSFER', id: args.transferId, number: args.transferNumber },
    movementType: 'TRANSFER_IN',
    user: args.user,
    details: args.details ?? (args.transferNumber ? `Transfer ${args.transferNumber} completed (destination received)` : undefined),
  }, tx);
}

/** Source side of a CANCEL (IN_TRANSIT → REJECTED): IN_TRANSIT_OUT → woodStatus (return). */
export async function postTransferCancelSourceSide(args: TransferSideArgs, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'IN_TRANSIT_OUT', delta: -args.pieceCount },
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: args.woodStatus,  delta: +args.pieceCount },
    ],
    reference: { type: 'TRANSFER', id: args.transferId, number: args.transferNumber },
    movementType: 'MANUAL_ADJUSTMENT',
    user: args.user,
    details: args.details ?? (args.transferNumber ? `Transfer ${args.transferNumber} cancelled (source returned)` : undefined),
  }, tx);
}

/** Destination side of a CANCEL: IN_TRANSIT_IN drained (pieces never arrived). */
export async function postTransferCancelDestSide(args: TransferSideArgs, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: 'IN_TRANSIT_IN', delta: -args.pieceCount },
    ],
    reference: { type: 'TRANSFER', id: args.transferId, number: args.transferNumber },
    movementType: 'MANUAL_ADJUSTMENT',
    user: args.user,
    details: args.details ?? (args.transferNumber ? `Transfer ${args.transferNumber} cancelled (destination cleared)` : undefined),
  }, tx);
}

/**
 * REVERSE a COMPLETED transfer: pieces teleport back from dest → src.
 * Two single-leg entries, sharing the same transfer reference.
 * No IN_TRANSIT step on reversal (matches existing behavior).
 */
export async function postTransferReverseDestSide(args: TransferSideArgs, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: args.woodStatus, delta: -args.pieceCount },
    ],
    reference: { type: 'TRANSFER', id: args.transferId, number: args.transferNumber },
    movementType: 'MANUAL_ADJUSTMENT',
    user: args.user,
    details: args.details ?? (args.transferNumber ? `Transfer ${args.transferNumber} reversed (removed from destination)` : undefined),
  }, tx);
}

export async function postTransferReverseSourceSide(args: TransferSideArgs, tx?: any): Promise<void> {
  return postStockEntry({
    legs: [
      { warehouseId: args.warehouseId, woodTypeId: args.woodTypeId, thickness: args.thickness, status: args.woodStatus, delta: +args.pieceCount },
    ],
    reference: { type: 'TRANSFER', id: args.transferId, number: args.transferNumber },
    movementType: 'MANUAL_ADJUSTMENT',
    user: args.user,
    details: args.details ?? (args.transferNumber ? `Transfer ${args.transferNumber} reversed (returned to source)` : undefined),
  }, tx);
}
