# Stock Ledger — Phase A Design

**Status:** Draft for review (2026-04-28)
**Owner:** Victor (review) + Claude (implementation)
**Goal:** Make silent stock corruption *structurally impossible*. Bring the codebase to international inventory-accounting standard (double-entry, atomic, audited, race-safe).

---

## 1. Why this exists

In the last 48 hours we've had two stock corruption incidents:

1. **2026-04-27 reopen of UD-DRY-00039**: code operated on stock the wood was no longer physically present in.
2. **2026-04-28 approve-close**: a silent auto-fixer ran during PENDING_CLOSE and zeroed UnderDrying, then approve-close decremented again, producing UnderDrying = -96.

Root causes (shared by both):

- 51 separate code paths write directly to `Stock`. No central enforcement.
- The `stock_movements` audit table exists but is **optional** — many writes bypass it.
- No row-level locking → race conditions possible.
- No invariant: "the sum of state changes must equal what was recorded as the change."
- No invariant: "you cannot perform a stock change that contradicts the journal."
- Stock is treated as a *primary store*; should be a *derived cache* of the journal.

CHECK constraints (added today) prevent **negatives**. They do not prevent wrong-but-positive arithmetic, race conditions, or untraceable changes. Phase A closes those.

---

## 2. The contract — what's true after Phase A

After this ships, these statements are enforced **by the database**, not by code review:

1. **Single mutation entrypoint.** Every change to `Stock.statusXxx` goes through one helper: `postStockEntry()`. Direct `prisma.stock.update` on status fields is a code-review fail (and at the call-site boundary, blocked by lint/type rules where practical).

2. **Every change is journaled.** Posting a stock change writes (a) an updated `Stock` row AND (b) one or more `stock_movements` rows in the *same transaction*. You cannot have one without the other.

3. **Journal is double-entry.** A transfer-out from warehouse A → warehouse B writes two rows (one negative on A, one positive on B) in the same `entryGroupId`. The DB enforces that **every entry group nets to zero**.

4. **Race-safe.** Every stock change uses `SELECT ... FOR UPDATE` on the affected rows. Two concurrent transfers cannot interleave to corrupt state.

5. **Stock is a derived cache.** A daily reconciliation job recomputes every `Stock.statusXxx` from `stock_movements` (sum of `quantityChange` per status per row) and alerts on drift. With the helper-only contract, drift should be 0.

6. **Atomic.** Every change either fully commits (Stock + movements + balance verification) or fully rolls back. No half-states.

7. **Auditable.** Every change has `referenceType` + `referenceId` + `userName`. The full history of any stock row reconstructible from `stock_movements` alone.

---

## 3. Schema additions

### 3.1 `stock_movements` table

Add three columns (all backwards-compatible — existing rows get NULL):

| Column | Type | Purpose |
|---|---|---|
| `entryGroupId` | `String?` (UUID) | Ties paired/multi-leg entries together. Same UUID for transfer-out + transfer-in. NULL allowed for legacy rows. |
| `priorBalance` | `Int?` | Snapshot of the affected status bucket *before* this entry was applied. Lets you audit a single row without recomputing. |
| `postBalance` | `Int?` | Snapshot of the affected status bucket *after* this entry. `priorBalance + quantityChange = postBalance` is invariant. |

### 3.2 New constraints on `stock_movements`

```sql
-- A movement that doesn't move anything is meaningless.
ALTER TABLE stock_movements
  ADD CONSTRAINT movement_quantity_nonzero CHECK (quantity_change != 0);

-- A movement to a single status: either fromStatus or toStatus must be set.
-- (We're not enforcing this rigorously yet — pre-existing rows have varied
-- patterns. Will tighten in Phase B once all call sites are migrated.)

-- The journal balance invariant — see 3.3 below — is enforced by a deferred
-- constraint trigger, not a CHECK (CHECKs can't aggregate).
```

### 3.3 The "entry group must balance" trigger

Most rigorous part of the design. Postgres trigger on `stock_movements`:

```sql
CREATE OR REPLACE FUNCTION enforce_entry_group_balance()
RETURNS TRIGGER AS $$
DECLARE
  group_sum INTEGER;
BEGIN
  IF NEW."entryGroupId" IS NULL THEN
    RETURN NEW;  -- legacy rows / single-leg adjustments not in a group
  END IF;
  SELECT COALESCE(SUM("quantityChange"), 0) INTO group_sum
  FROM stock_movements
  WHERE "entryGroupId" = NEW."entryGroupId";
  -- For paired entries (transfers, drying status changes), sum must be 0.
  -- For single-leg entries (receipts inbound, write-offs), entryGroupId is NULL.
  IF group_sum != 0 THEN
    RAISE EXCEPTION 'Entry group % does not balance: sum = %', NEW."entryGroupId", group_sum;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_enforce_entry_group_balance
  AFTER INSERT ON stock_movements
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_entry_group_balance();
```

**`DEFERRABLE INITIALLY DEFERRED` is critical**: it lets the helper write all legs of an entry, then validates at COMMIT. Without it, the first INSERT of a 2-leg entry would fail because the second hasn't been written yet.

### 3.4 New CHECK on Stock (already done today)

Already in production: 6 constraints, all `>= 0`. ✓

---

## 4. The `postStockEntry` helper

### 4.1 Signature

```ts
type StockLeg = {
  warehouseId: string;
  woodTypeId: string;
  thickness: string;          // exact format: '1"', '2"', 'Custom', etc.
  status: WoodStatus;         // NOT_DRIED | UNDER_DRYING | DRIED | DAMAGED
  delta: number;              // signed: +pieces or -pieces
};

type StockEntry = {
  legs: StockLeg[];           // 1+ legs. Multi-leg groups must net to 0.
  reference: {
    type: ReferenceType;       // RECEIPT | TRANSFER | DRYING_PROCESS | STOCK_ADJUSTMENT
    id: string;                // UUID of the source document
    number?: string;           // human-readable (UD-DRY-00039)
  };
  movementType: MovementType;  // RECEIPT_SYNC | TRANSFER_OUT | etc.
  user: { id?: string; name?: string };
  details?: string;            // free-text "why" — shown in audit trail
};

async function postStockEntry(entry: StockEntry, tx?: PrismaTx): Promise<void>;
```

### 4.2 Algorithm (inside one transaction)

1. **Validate input shape.** All legs have non-zero deltas. If multi-leg, deltas sum to 0.

2. **Generate `entryGroupId`** if entry has 2+ legs (single-leg entries skip).

3. **For each leg, in deterministic order** (sorted by `warehouseId, woodTypeId, thickness, status` to avoid deadlocks):
   - `SELECT ... FOR UPDATE` on the `Stock` row matching `(warehouseId, woodTypeId, thickness)`. Create the row with all-zeros if it doesn't exist (atomic upsert with row lock).
   - Read `priorBalance = stock.statusXxx` (the matching column).
   - Compute `postBalance = priorBalance + delta`.
   - DB CHECK constraints will reject if `postBalance < 0` — catch and rethrow as a clean validation error.
   - Update the `Stock` row: `statusXxx = postBalance, updatedAt = now()`.
   - Insert a `stock_movements` row with `entryGroupId`, `priorBalance`, `postBalance`, the reference fields, user fields.

4. **COMMIT.** The deferred trigger on `stock_movements` runs and validates the entry group balances.

5. **On any error**: full rollback. Stock is unchanged. No half-state.

### 4.3 Example: drying-approve-close

Today, this code lives inline in `factory.ts:approve-close`:

```ts
// BEFORE (current)
await tx.stock.updateMany({
  where: { warehouseId, woodTypeId, thickness },
  data: {
    statusUnderDrying: { decrement: pieceCount },
    statusDried: { increment: pieceCount },
  },
});
```

After Phase A:

```ts
await postStockEntry({
  legs: [
    { warehouseId, woodTypeId, thickness, status: 'UNDER_DRYING', delta: -pieceCount },
    { warehouseId, woodTypeId, thickness, status: 'DRIED',         delta: +pieceCount },
  ],
  reference: { type: 'DRYING_PROCESS', id: process.id, number: process.batchNumber },
  movementType: 'DRYING_END',
  user: { id: userId, name: userName },
  details: `Approved close of ${process.batchNumber} by ${userName}`,
}, tx);
```

The helper:
- Locks both rows (same `Stock` id since same warehouse+wood+thickness — it's actually one row, two legs hitting different status columns).
- Reads `statusUnderDrying` and `statusDried` priors.
- Updates both columns atomically.
- Writes 2 `stock_movements` rows with the same `entryGroupId`.
- DB confirms `legs sum to 0` at commit.

If the wood was already moved (today's bug), the `statusUnderDrying - pieceCount` would push it negative, the DB CHECK rejects, the transaction rolls back, the user gets a clear error.

### 4.4 Example: transfer-complete (cross-warehouse)

```ts
await postStockEntry({
  legs: [
    // Source: pieces leave InTransitOut
    { warehouseId: src,  woodTypeId, thickness, status: 'IN_TRANSIT_OUT', delta: -qty },
    // Destination: pieces arrive in NotDried (or whatever woodStatus the transfer carries)
    { warehouseId: dest, woodTypeId, thickness, status: 'NOT_DRIED',      delta: +qty },
  ],
  reference: { type: 'TRANSFER', id: transfer.id, number: transfer.transferNumber },
  movementType: 'TRANSFER_IN',
  user: { id: userId, name: userName },
});
```

> Note: Today the schema has `statusInTransitOut` and `statusInTransitIn` but the `WoodStatus` enum has only NOT_DRIED / UNDER_DRYING / DRIED / DAMAGED. Phase A adds two enum values: `IN_TRANSIT_OUT`, `IN_TRANSIT_IN`. This is a schema change that needs to be planned (Postgres enum additions are simple, no data migration).

---

## 5. Call-site inventory

51 call sites identified across the backend. Grouped by source document and what change they represent.

### 5.1 Drying processes (11 sites in [factory.ts](backend/src/routes/factory.ts))

| Line | Operation | New leg structure |
|---|---|---|
| ~989, 1018, 1031 | Drying create — multi-wood items | NotDried -qty / UnderDrying +qty per item |
| ~1270, 1284 | Old PUT /drying-processes/:id COMPLETE path (legacy, still alive) | UnderDrying -qty / Dried +qty |
| ~1478, 1491 | NEW approve-close | UnderDrying -qty / Dried +qty |
| ~1673, 1688 | reject-close | (no stock change — workflow only) |
| ~1701, 1714 | reopen | Dried -qty / UnderDrying +qty |
| ~1813, 1828 | delete drying process — restore stock | UnderDrying -qty / NotDried +qty |
| ~2997 | upsert during initial drying-process creation | seed row, +0 (placeholder) |

### 5.2 Transfers (16 sites in [transfers.ts](backend/src/routes/transfers.ts))

| Line | Operation | New leg structure |
|---|---|---|
| ~290, 349, 364 | Create transfer with stock control | NotDried/Dried -qty (source) / InTransitOut +qty (source) |
| ~523, 562, 577 | Edit transfer item | Reverse old + apply new |
| ~771, 801 | Approve transfer | (depends on flow — typically no stock change yet) |
| ~1275, 1290 | Reject transfer (rollback) | InTransitOut -qty / NotDried +qty (restore) |
| ~1449, 1462, 1482, 1498, 1510 | Complete transfer | InTransitOut -qty (source) / NotDried +qty (dest) |
| ~1546 | Cancel in-transit transfer | InTransitOut -qty / NotDried +qty |

### 5.3 Wood receipts (3 sites in [management.ts](backend/src/routes/management.ts))

| Line | Operation | New leg structure |
|---|---|---|
| ~1157 | Receipt sync upsert | (single-leg) NotDried +qty |
| ~1397, 1438 | Receipt approval / re-sync | Same |

### 5.4 Stock adjustments (5 sites in [management.ts](backend/src/routes/management.ts))

| Line | Operation | New leg structure |
|---|---|---|
| ~528, 562 | Adjust stock — set to specific values | One leg per status that changes |
| ~2082, 2094, 2147 | Direct stock create/update | Helper-wrap |
| ~2183 | Concurrent batch update | Loop with helper |

### 5.5 Scripts (1 site)

| File | Notes |
|---|---|
| `scripts/fix_stock_after_pending_close_orphan.ts` | Already complete; one-off, won't run again. Leave as-is. |

### 5.6 Out of scope for Phase A

- The orphan report (read-only, doesn't write).
- Reading endpoints.
- Frontend.

---

## 6. Migration plan

Order matters. **Each step is fully reversible until COMMIT, validated by tests, then deployed.**

### Step 1 — Schema additions (1-2 hours)

1. Add `entryGroupId`, `priorBalance`, `postBalance` to `stock_movements`. Nullable so existing rows are valid.
2. Add `quantity_change != 0` CHECK constraint.
3. Add the deferred balance-validation trigger.
4. Add `IN_TRANSIT_OUT`, `IN_TRANSIT_IN` to `WoodStatus` enum.
5. Update `schema.prisma` to match.
6. Run `prisma generate` (no `db push` — SQL applied via Neon SQL editor like before).

**Verification:** existing app continues working. Tests pass. No call sites broken.

### Step 2 — Build the helper (2-3 hours)

1. Write `postStockEntry()` in `src/services/stockLedger.ts`.
2. Unit-style test scaffolding (we don't have a test framework today — I'll use a small `npx tsx` script with hand-built fixtures).
3. Tests cover:
   - Single-leg entry (receipt) — applies cleanly.
   - 2-leg entry (drying END) — applies cleanly, group sums to 0.
   - 2-leg entry that doesn't balance — rejected at commit.
   - Negative result — rejected by Stock CHECK.
   - Concurrent calls hitting same row — properly serialized by FOR UPDATE.
4. **You review the helper line-by-line** before any call site is migrated. Single point of trust.

### Step 3 — Migrate call sites in safe-to-test groups (1-2 days)

Per group: refactor → verify → commit → deploy → smoke test → next group.

| Order | Group | Why first |
|---|---|---|
| 1 | Drying workflow (11 sites) | Highest risk surface today, currently has the workflow we just built |
| 2 | Wood receipts (3 sites) | Simple single-leg writes, easy to validate |
| 3 | Manual stock adjustments (5 sites) | Used by admins, low frequency, easy to revert |
| 4 | Transfers (16 sites) | Most complex; do last when helper is well-proven |

After each group: verify with the orphan-report endpoint that no drift exists. Run a Phase B reconciliation pre-flight (recompute every Stock from movements; should match).

### Step 4 — Lock the door (30 min)

1. Add an ESLint rule: `prisma.stock.update` and `tx.stock.update` against `statusXxx` fields are forbidden outside `stockLedger.ts`.
2. Add a runtime check in dev: a Prisma middleware that warns/throws when `Stock` is updated outside the helper.
3. Document in CLAUDE.md: "All stock changes go through `postStockEntry()`."

### Step 5 — Phase B preview (separate session)

Once Phase A is stable for a week:
- Daily reconciliation cron
- Period-locking
- Frontend "Stock movement history" view per stock row

---

## 7. Test plan

Before any call site is migrated, the helper passes these tests on a Neon **branch** (not production):

1. **Receipt:** post `+100 NotDried` → Stock has 100, movement has prior=0 post=100.
2. **Drying start:** post `[-50 NotDried, +50 UnderDrying]` → Stock has NotDried 50, UnderDrying 50, two movements with same entryGroupId, sums to 0.
3. **Drying end:** post `[-50 UnderDrying, +50 Dried]` → balanced.
4. **Unbalanced entry:** post `[-50 NotDried, +40 Dried]` → DB raises exception, no Stock change.
5. **Negative target:** post `-100 NotDried` when current=50 → CHECK rejects, no change.
6. **Concurrent:** spawn 10 simultaneous `+1 NotDried` → all 10 commit, final = +10, no row corruption.
7. **Bad input:** delta=0 → helper validation rejects before DB call.

Each call-site refactor includes a smoke test of one realistic flow.

---

## 8. What can't go wrong after Phase A

| Failure mode | Status |
|---|---|
| Negative bucket | **Impossible** — DB CHECK rejects at write |
| Stock change without audit row | **Impossible** — helper is the only path |
| Audit row with wrong delta | **Impossible** — helper writes both atomically |
| Race condition on concurrent writes | **Impossible** — FOR UPDATE row lock |
| Stock not matching movements log | **Impossible** — helper updates both in same tx |
| Unbalanced transfer (lost pieces) | **Impossible** — deferred trigger validates at commit |
| Direct DB tampering | Possible by superuser only — CHECK + trigger still enforce safety |
| Wrong physical-to-system count | Operational, not technical — handled by stocktake adjustments using the helper |

---

## 9. What I need from you to proceed

**Read sections 2 (contract), 4 (helper signature), and 6 (migration plan).**

Then tell me one of:

1. **"Approved, proceed."** I start Step 1 (schema migration in Neon SQL editor, you paste).
2. **"Modify X."** Tell me what to change.
3. **"Stop, I want to think."** I wait.

**No code changes happen until you approve this design.**

---

## 10. Risk and mitigation

- **Migration runs on production.** Neon backup taken just now. PITR active for 6 hours. Each schema step is reversible.
- **Refactor batch deploys.** Each batch is a separate commit + deploy. If any batch causes issues we revert that batch only.
- **Helper bug.** Mitigated by line-by-line review by you before any call site uses it. Plus 7 explicit tests on a Neon branch.
- **Behavioral change to existing flows.** The helper is designed to be a pure refactor — same observable behavior, just centralized. The only behavior *change* is that previously-silent failures become loud (we want this).

---

## Appendix — files this Phase A touches

- `backend/prisma/schema.prisma` — 3 columns + 1 trigger + 1 enum addition
- `backend/src/services/stockLedger.ts` — NEW. The helper.
- `backend/src/services/stockMovementService.ts` — extended (or replaced) by the new helper.
- `backend/src/routes/factory.ts` — ~11 call sites refactored
- `backend/src/routes/transfers.ts` — ~16 call sites refactored
- `backend/src/routes/management.ts` — ~8 call sites refactored
- ESLint config — 1 new rule
- `CLAUDE.md` — 1 new note about the contract
