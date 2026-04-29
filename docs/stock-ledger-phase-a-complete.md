# Stock Ledger — Phase A: Final Report

**Date completed:** 2026-04-28
**Status:** Complete and verified
**Backup:** [backups/ud_full_backup_phaseA_complete_20260428_153724.dump](../backups/ud_full_backup_phaseA_complete_20260428_153724.dump)

---

## What was built

Phase A took the codebase from "stock can silently corrupt" to "stock corruption is structurally impossible." It applies international inventory-accounting standards: every stock change is journaled, multi-leg entries balance, the database enforces non-negative buckets, row locks prevent races, and a runtime guard blocks future code from bypassing the system.

---

## Why we did it

In the 48 hours before this work shipped, we had two stock corruption incidents:

1. **2026-04-27 (UD-DRY-00039 reopen)** — Code operated on stock pieces that had already been physically transferred out. Reopening the drying process added phantom inventory.
2. **2026-04-28 (UD-DRY-00039 approve-close)** — A silent auto-fixer (running on every page load) zeroed out `statusUnderDrying` while the process was in PENDING_CLOSE. Approve-close then decremented again, producing `statusUnderDrying = -96`.

Root causes shared by both: 51 separate code paths wrote directly to `Stock` with no central enforcement, no row-level locking, no audit invariant ("the journal must agree with the cache"), and the audit table (`stock_movements`) was optional.

User direction: **"this is money, fix this with international standard."**

---

## What's in place now

### 1. Database-level invariants (enforced by Postgres)

**6 CHECK constraints on `Stock`** — every bucket field must be `>= 0`:
- `stock_not_dried_nonneg`
- `stock_under_drying_nonneg`
- `stock_dried_nonneg`
- `stock_damaged_nonneg`
- `stock_in_transit_out_nonneg`
- `stock_in_transit_in_nonneg`

**1 CHECK constraint on `stock_movements`** — `movement_quantity_nonzero`. A movement of zero is meaningless.

**1 deferred trigger on `stock_movements`** — `trg_enforce_entry_group_balance`. Any group of rows sharing the same `entryGroupId` must sum to zero (double-entry). `DEFERRABLE INITIALLY DEFERRED`, so the helper writes all legs before validation runs at COMMIT.

**3 new audit columns on `stock_movements`**:
- `entryGroupId` — UUID linking paired/multi-leg entries
- `priorBalance` — bucket value before this entry
- `postBalance` — bucket value after this entry

**2 new `WoodStatus` enum values**: `IN_TRANSIT_OUT`, `IN_TRANSIT_IN`. Aligns the enum with the existing `Stock.statusInTransit*` columns.

### 2. Single helper module (the only path to write Stock)

[`backend/src/services/stockLedger.ts`](../backend/src/services/stockLedger.ts) contains:

**Core function `postStockEntry(entry, tx?)`:**
1. Validates input (legs non-empty, deltas non-zero, multi-leg sums to zero)
2. Sorts legs deterministically (deadlock prevention)
3. Inside a transaction, for each affected `Stock` row:
   - `SELECT … FOR UPDATE` row lock
   - Creates the row if missing (atomic via unique index)
   - Reads prior balance, computes post balance
   - Writes a `stock_movements` row with `entryGroupId`, `priorBalance`, `postBalance`
   - Updates the `Stock` cache
4. DB CHECK constraints reject any negative result; deferred trigger validates entry-group balance at COMMIT

**Convenience builders** (one per pattern, all wrap `postStockEntry`):
- `postDryingStart` — NotDried → UnderDrying
- `postDryingEnd` — UnderDrying → Dried (drying complete)
- `postDryingReopen` — Dried → UnderDrying (reverse of complete)
- `postDryingCancel` — UnderDrying → NotDried (drying-process delete)
- `postReceiptSync` — single-leg + NotDried (wood receipt)
- `postTransferStartSourceSide` — woodStatus → IN_TRANSIT_OUT (balanced)
- `postTransferStartDestSide` — single-leg + IN_TRANSIT_IN
- `postTransferCompleteSourceSide` — single-leg drain IN_TRANSIT_OUT
- `postTransferCompleteDestSide` — IN_TRANSIT_IN → woodStatus (balanced)
- `postTransferCancelSourceSide` — IN_TRANSIT_OUT → woodStatus (balanced)
- `postTransferCancelDestSide` — single-leg drain IN_TRANSIT_IN
- `postTransferReverseDestSide` — single-leg `−qty` from dest woodStatus
- `postTransferReverseSourceSide` — single-leg `+qty` to src woodStatus

### 3. All call sites refactored (31 sites)

| File | Operations |
|---|---|
| `backend/src/routes/factory.ts` | drying-create (multi-wood + legacy), approve-close, reopen, delete-process restoration, receipt complete |
| `backend/src/routes/management.ts` | LOT approval receipt sync, force re-sync (audit-preserving reversal), receipt cancellation reversal, manual stock adjustment |
| `backend/src/routes/transfers.ts` | create, approve, complete, cancel, item add, item edit (full swap + qty delta), item delete, reverse completed |

**Removed dead code:** the legacy `if (data.status === 'COMPLETED')` branch in `PUT /drying-processes/:id` (lines 1263-1299 originally) — unreachable since the workflow refactor added a guard at line 1110, but kept lying around. Removed.

### 4. Runtime guard (Step 4)

[`backend/src/lib/prisma.ts`](../backend/src/lib/prisma.ts) installs a Prisma `$use` middleware that intercepts every `Stock.update`/`updateMany`/`upsert` call. If the operation touches any of the 6 bucket fields AND the call did NOT originate from inside `runInsideStockLedger()` (the helper's context), the middleware:
- **In dev:** throws an error with a `STOCK_LEDGER_GUARD` prefix and the stack trace
- **In prod:** logs the violation loudly but does not crash the request (the DB constraints + trigger still catch corruption)

This is a defense-in-depth backstop against future code that forgets to use the helper.

`AsyncLocalStorage` is used to track whether the call originated from the helper. The helper wraps its work in `runInsideStockLedger(...)` which sets the flag in the local context. Any other caller doesn't have the flag set.

### 5. Test suites

**Helper unit tests** ([`backend/src/scripts/test_stockLedger.ts`](../backend/src/scripts/test_stockLedger.ts)):
- 14 tests, all passing
- Use a dedicated test warehouse + wood type that's created and deleted in a finally block
- Production data is never touched
- Covers: receipts, drying start/end, unbalanced rejection, negative rejection, zero-delta validation, concurrency, cross-warehouse transfer start/complete/cancel/reverse

**Guard smoke tests** ([`backend/src/scripts/test_stock_guard.ts`](../backend/src/scripts/test_stock_guard.ts)):
- 4 tests, all passing
- Confirms `update`, `updateMany`, `upsert` with bucket fields are blocked outside the helper
- Confirms `update` of `minimumStockLevel` (non-bucket metadata) is allowed

**Health check** ([`backend/src/scripts/check_phase_a_health.ts`](../backend/src/scripts/check_phase_a_health.ts)):
- Read-only verification of every Phase A artifact in the live DB

**Comprehensive verification** ([`backend/src/scripts/verify_phase_a_complete.ts`](../backend/src/scripts/verify_phase_a_complete.ts)):
- 11 checks covering CHECK constraints, audit columns, trigger, enum, live data sanity, entry-group balance audit, reference stock state

### 6. Data corrections applied during this work

- **2026-04-27**: UD-DRY-00039 stock corruption corrected (NotDried 537→441, UnderDrying −96→0, Dried unchanged at 96).
- **2026-04-27**: UD-DRY-00039's stale recharge linked to the right reading (recharge dated 2026-04-27 anchored to the 2026-04-26 09:14 reading instead of `rechargeDate`).
- **2026-04-28**: 52 historical `DRYING_START`/`DRYING_END` movement rows backfilled with their actual piece counts (they had been written with `quantityChange = 0` by old buggy code).

---

## Where things live

```
backend/
├── prisma/
│   └── schema.prisma                      # WoodStatus enum + stock_movements columns
├── src/
│   ├── lib/
│   │   └── prisma.ts                      # Prisma client + ledger guard middleware
│   ├── services/
│   │   ├── stockLedger.ts                 # The single helper (NEW)
│   │   └── stockMovementService.ts        # Legacy — still used as a low-level
│   │                                       # writer; replaced for stock-changing
│   │                                       # operations by the ledger helper
│   ├── routes/
│   │   ├── factory.ts                     # 11 sites refactored
│   │   ├── management.ts                  # 6 sites refactored
│   │   └── transfers.ts                   # 14 sites refactored
│   └── scripts/
│       ├── test_stockLedger.ts            # Helper unit tests (14)
│       ├── test_stock_guard.ts            # Guard smoke tests (4)
│       ├── check_phase_a_health.ts        # Quick health check
│       └── verify_phase_a_complete.ts     # Comprehensive verification (11)
backups/
└── ud_full_backup_phaseA_complete_20260428_153724.dump   # Final restore point
docs/
├── stock-ledger-phase-a.md                # Original design doc
├── stock-ledger-batch-4-transfers-plan.md # Transfer-specific design doc
└── stock-ledger-phase-a-complete.md       # This file
```

---

## How to invoke a stock change (recipes)

### Drying start (NotDried → UnderDrying)

```ts
await postDryingStart({
  warehouseId, woodTypeId, thickness,
  pieceCount: 96,
  processId: process.id,
  batchNumber: process.batchNumber,
  user: { id: userId, name: userName },
}, tx);
```

### Drying complete (UnderDrying → Dried)

```ts
await postDryingEnd({ ... same args ... }, tx);
```

### Wood receipt (single-leg + NotDried)

```ts
await postReceiptSync({
  warehouseId, woodTypeId, thickness,
  pieceCount: qty,
  receiptId: receipt.id,
  lotNumber: receipt.lotNumber,
  user: { id: userId },
}, tx);
```

### Transfer create/approve

```ts
// Source side (only if source has stockControlEnabled):
await postTransferStartSourceSide({
  warehouseId: srcId, woodTypeId, thickness,
  pieceCount, woodStatus,
  transferId, transferNumber,
  user: { id: userId },
}, tx);

// Destination side (only if dest has stockControlEnabled):
await postTransferStartDestSide({ ... mirror ... }, tx);
```

### Custom multi-leg entry (use the raw helper)

```ts
await postStockEntry({
  legs: [
    { warehouseId, woodTypeId, thickness, status: 'NOT_DRIED',    delta: -50 },
    { warehouseId, woodTypeId, thickness, status: 'UNDER_DRYING', delta: +50 },
  ],
  reference: { type: 'DRYING_PROCESS', id: process.id, number: process.batchNumber },
  movementType: 'DRYING_START',
  user: { id: userId, name: userName },
  details: 'optional human-readable note',
}, tx);
```

---

## Tests to run on demand

From the `backend/` directory:

```bash
# Full helper test suite (14 tests, takes ~30s, creates+destroys test data)
npx tsx src/scripts/test_stockLedger.ts

# Guard smoke test (4 tests, ~5s, attempts forbidden writes)
npx tsx src/scripts/test_stock_guard.ts

# Quick health check (read-only, ~10s)
npx tsx src/scripts/check_phase_a_health.ts

# Comprehensive verification (read-only, ~15s)
npx tsx src/scripts/verify_phase_a_complete.ts
```

A full pass = 14 + 4 + 11 = 29 green checks.

---

## What can no longer happen silently

| Failure mode | Defense | Layer |
|---|---|---|
| Negative bucket value | DB CHECK constraint rejects | Database |
| Multi-leg entry doesn't balance | Deferred trigger raises at COMMIT | Database |
| `quantityChange = 0` row | DB CHECK constraint rejects | Database |
| Stock changed without audit | Helper writes both in one transaction | Application |
| Audit row's math wrong | Prior/post snapshots; entry group sum enforced | Database + helper |
| Concurrent writes race | `SELECT ... FOR UPDATE` row lock | Database (via helper) |
| Future code bypasses helper | Prisma middleware throws (dev) / logs (prod) | Application |
| Audit history deleted (e.g., re-sync) | Helper posts reversing entries instead | Application |

---

## What's NOT covered (deliberately)

- **Wrong physical-to-system count.** This is operational, not technical. Real ERPs handle the gap with periodic stocktakes and adjustment journal entries (using the helper). Already supported via `POST /stock/adjust`.
- **Direct DB tampering by superuser.** A DBA running raw SQL bypasses everything. The CHECK constraints and trigger still apply, but a determined human can disable them. Out of scope.
- **Frontend showing wrong data while backend is correct.** A frontend bug could render right data wrongly. Less urgent — that hasn't been the failure mode.
- **Period locks (Phase B).** International standard ERPs lock past months once accounting closes them. We don't do this yet. Phase B (separate session) will add an `accounting_periods` table + lock logic.
- **Daily reconciliation cron (Phase B).** Recompute every Stock from the journal sum and email admins on drift. Not done yet.

---

## How to verify everything is still good (any time)

1. Run the 4 test scripts above. All 29 checks should pass.
2. Pick any drying process or transfer and grep `stock_movements` by its `referenceId`:
   ```sql
   SELECT "movementType", "quantityChange", "fromStatus", "toStatus", "priorBalance", "postBalance", "entryGroupId"
   FROM "stock_movements"
   WHERE "referenceId" = '<your-id>'
   ORDER BY "createdAt";
   ```
   - Every row should have non-null `priorBalance`/`postBalance` (for new entries; legacy rows are NULL).
   - Each `entryGroupId` group should sum to 0.
   - No row should have `quantityChange = 0`.
3. Pick any `Stock` row:
   ```sql
   SELECT * FROM "Stock" WHERE id = '<id>';
   ```
   - All status fields should be `>= 0`.

---

## Known follow-ups (for future work, not Phase A)

- **Phase B**: period locking + daily reconciliation cron + UI for "stock movement history per row"
- **Telegram notifications** (paused mid-conversation; design discussion exists in chat history)
- **Schema migration framework**: project uses ad-hoc `prisma db push`; would be cleaner to introduce `prisma migrate` for repeatable deploys
- **Eliminate `stockMovementService.ts`**: the legacy `createStockMovement` helper still exists; nothing in the routes calls it anymore (verified). Could be deleted entirely. Left in place for safety in case any code path I missed still references it.

---

## Authoring credit & dates

- Design and implementation: Claude (this session) + Victor (review at every checkpoint)
- Phase A start: 2026-04-28 morning
- Phase A complete: 2026-04-28 ~15:37 EAT
- Backups taken at 4 checkpoints: 04-27 10:45, 04-28 12:18, 04-28 15:37 (final)
