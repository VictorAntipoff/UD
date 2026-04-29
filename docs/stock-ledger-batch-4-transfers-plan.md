# Batch 4 — Transfers Refactor Plan

**Status:** Draft for review (2026-04-28)
**Scope:** Refactor every stock-touching operation in [transfers.ts](backend/src/routes/transfers.ts) to use `postStockEntry` / convenience builders.
**Approval gate:** **No code changes until you approve this doc.**

---

## 1. Transfer state machine (today's behavior)

```
            ┌───────────┐
            │ create    │
            └─────┬─────┘
                  │  if fromWarehouse.requiresApproval ⇒ PENDING
                  │  else                                ⇒ APPROVED (auto)
                  ▼
   ┌────────────────────────────────┐
   │ PENDING                         │  no stock has moved yet
   │   approve  → IN_TRANSIT         │
   │   reject   → REJECTED            │
   └────────────────────────────────┘
                  │
                  ▼
   ┌────────────────────────────────┐
   │ IN_TRANSIT                      │  pieces sit in InTransitOut (src) + InTransitIn (dest)
   │   complete  → COMPLETED          │
   │   cancel    → REJECTED (reverse) │
   │   item edit  (mutates stock)     │
   │   item add   (mutates stock)     │
   │   item delete (mutates stock)    │
   └────────────────────────────────┘
                  │
                  ▼
   ┌────────────────────────────────┐
   │ COMPLETED                       │  pieces fully in destination at original woodStatus
   │   reverse (admin only) → REJECTED│
   └────────────────────────────────┘
```

**Critical rule** ([CLAUDE.md memory](memory/MEMORY.md)): **destination warehouse stock updates must be INDEPENDENT of source stock-control check** (separate if-blocks, not nested). I am preserving this.

**Critical rule** ([CLAUDE.md memory](memory/MEMORY.md)): **complete endpoint must re-fetch transfer items inside transaction** (items may have been edited since creation). I am preserving this.

---

## 2. Two-warehouse legs (the model)

Every transfer stock movement touches **at most two warehouses** at once. Each leg is one row in `stock_movements`. Here are the canonical leg patterns I'll use.

### 2.1 At create-time (auto-approved) OR at approve-time

Pieces leave their `woodStatus` at source and become `IN_TRANSIT_OUT` at source. Independently, pieces become `IN_TRANSIT_IN` at destination.

**If both warehouses have stockControlEnabled:**
```
LEG 1  src   woodStatus       Δ -qty
LEG 2  src   IN_TRANSIT_OUT   Δ +qty
LEG 3  dest  IN_TRANSIT_IN    Δ +qty
```
Three legs. Sum = +qty. **Not balanced** in the strict double-entry sense. Why?

Because **destination doesn't have a "phantom source" of those pieces yet** — they're in transit between warehouses, not yet physically arrived. In real ERP terms, this is a single asset moving through 3 inventory states (source-physical → in-transit → destination-physical) but our schema treats source-warehouse `IN_TRANSIT_OUT` and destination-warehouse `IN_TRANSIT_IN` as **separate buckets**.

**Fix:** I'll model this as **two separate entry groups** instead of one:

- **Entry group A (source-side, balanced):**
  - `src woodStatus  Δ -qty`
  - `src IN_TRANSIT_OUT  Δ +qty`
  - sum = 0 ✓ balanced

- **Entry group B (dest-side, single-leg, not in a group):**
  - `dest IN_TRANSIT_IN  Δ +qty`
  - single-leg, `entryGroupId = NULL`, exempt from balance check (like a receipt)

This matches existing code's "independent if-blocks for src vs dest stock control" rule perfectly.

**If source has stock control but dest doesn't:** only entry group A.
**If dest has stock control but src doesn't:** only the single-leg dest entry.
**If neither:** no entries.

### 2.2 At complete-time

Pieces leave `IN_TRANSIT_OUT` at source (drained) and arrive at `woodStatus` at destination (taking them out of `IN_TRANSIT_IN`).

**Source-side entry group (balanced):**
- `src IN_TRANSIT_OUT  Δ -qty`  (single-leg, balance not strictly enforced because it's a write-off, but I'll keep it single-leg for simplicity)

Actually, on reflection — at complete time the src loses InTransitOut pieces (they leave the source forever) and dest gains physical pieces (and loses InTransitIn). So:

- **Source-side** (single-leg, drains InTransitOut):
  - `src IN_TRANSIT_OUT  Δ -qty`

- **Destination-side entry group (balanced):**
  - `dest IN_TRANSIT_IN  Δ -qty`
  - `dest woodStatus     Δ +qty`
  - sum = 0 ✓ balanced

Each side is independent (matches existing "src and dest are checked independently" rule).

### 2.3 At reject-time (PENDING → REJECTED)

**No stock movement.** Stock didn't move at PENDING.

### 2.4 At cancel-time (IN_TRANSIT → REJECTED)

Reverse 2.1. Same legs but with opposite signs.

- **Source-side entry group (balanced):**
  - `src IN_TRANSIT_OUT  Δ -qty`
  - `src woodStatus      Δ +qty`
  - sum = 0 ✓

- **Destination-side single-leg:**
  - `dest IN_TRANSIT_IN  Δ -qty`

### 2.5 At reverse-time (COMPLETED → REJECTED)

Same as completing-then-uncompleting. Reverses 2.2.

- **Destination-side entry group (balanced):**
  - `dest woodStatus      Δ -qty`
  - `dest IN_TRANSIT_IN   Δ +qty` ... wait, no. After reverse, pieces leave dest physically and return to src. Skipping the in-transit state on reversal makes more sense — straight from "dest woodStatus" to "src woodStatus".

Two options for reverse:
- (A) Mirror complete: dest→InTransitIn, then InTransitOut at src → src woodStatus. 4 legs, two balanced groups.
- (B) Pretend the transfer never happened: pieces just teleport from dest woodStatus → src woodStatus. 2 single-leg entries.

(B) is what the current code does. Audit-wise it's slightly less faithful (no in-transit state recorded) but operationally simpler and easier to audit ("transfer X was reversed; -qty at dest, +qty at src"). I'll go with **(B)**.

- **Single-leg entries (each reference the transfer being reversed):**
  - `dest woodStatus  Δ -qty`
  - `src  woodStatus  Δ +qty`

These are **two separate single-leg entries** (no `entryGroupId`, like receipts). The "balance" between them is implicit through the shared `referenceId`.

### 2.6 At item-edit-time (IN_TRANSIT only)

Two cases:

**Case A — Full swap** (woodType, thickness, OR woodStatus changed): reverse the old item, apply the new.

- **Source side (2 entry groups, both balanced):**
  - Group A1 (return old): `src oldWoodStatus +qty_old`, `src IN_TRANSIT_OUT -qty_old`
  - Group A2 (deduct new): `src newWoodStatus -qty_new`, `src IN_TRANSIT_OUT +qty_new`
- **Destination side (2 single-leg entries):**
  - `dest IN_TRANSIT_IN -qty_old` (old key: oldWoodTypeId/oldThickness)
  - `dest IN_TRANSIT_IN +qty_new` (new key: newWoodTypeId/newThickness)

**Case B — Quantity-only delta:**
- `delta = newQty - oldQty`
- **Source side (one entry group, balanced):**
  - `src woodStatus -delta`, `src IN_TRANSIT_OUT +delta`  (when delta > 0)
  - or `src woodStatus +|delta|`, `src IN_TRANSIT_OUT -|delta|`  (when delta < 0)
- **Destination side (single-leg):**
  - `dest IN_TRANSIT_IN +delta` (signed; can be negative)

### 2.7 At item-add-time (IN_TRANSIT only)

Same as 2.1 (create-time auto-approved) but for one item. Existing item-add code only runs when transfer is `IN_TRANSIT`.

### 2.8 At item-delete-time (IN_TRANSIT only)

Same as 2.4 (cancel) but for one item. Reverses what was committed when the item was added.

---

## 3. Stock-control combinations

For each of 2.1-2.8, three sub-cases:
- (a) `src.stockControlEnabled = true`, `dest.stockControlEnabled = true`
- (b) `src = true`, `dest = false`
- (c) `src = false`, `dest = true`
- (d) `src = false`, `dest = false` → no stock movements at all

In every case I follow the rule: **src and dest stock-write blocks are INDEPENDENT** (separate `if (src.stockControlEnabled)` and `if (dest.stockControlEnabled)` blocks, not nested).

---

## 4. New convenience builder

I'll add **one** convenience builder to `stockLedger.ts`:

```ts
postTransferLeg({
  warehouseId, woodTypeId, thickness, status,
  delta,
  pairWith?: { status: WoodStatus; delta: number },  // optional second leg in same group
  reference: { id, number },
  movementType: 'TRANSFER_OUT' | 'TRANSFER_IN',
  user, details,
});
```

Then specific helpers:
- `postTransferStartSourceSide(warehouseId, item, transferRef, user)` — group A from §2.1
- `postTransferStartDestSide(warehouseId, item, transferRef, user)` — single-leg from §2.1
- `postTransferCompleteSourceSide(...)` — single-leg drain InTransitOut from §2.2
- `postTransferCompleteDestSide(...)` — group from §2.2
- `postTransferCancelSourceSide(...)` — group from §2.4
- `postTransferCancelDestSide(...)` — single-leg from §2.4
- `postTransferReverse(...)` — single-leg pair from §2.5

Each takes the `tx` parameter so they run inside the caller's transaction.

---

## 5. Endpoint-by-endpoint refactor map

| Endpoint | Lines | Stock writes today | New helpers |
|---|---|---|---|
| `POST /` create transfer | 232-471 | 4 sites (validate + create + src deduct + dest in-transit) | `postTransferStartSourceSide`, `postTransferStartDestSide` |
| `POST /:id/approve` | 484-634 | 3 sites (validate + src deduct + dest in-transit) | same as create |
| `POST /:id/reject` | 637-696 | 0 stock writes | (no change) |
| `POST /:id/complete` | 699-885 | 4 sites (re-fetch, src drain, dest add) | `postTransferCompleteSourceSide`, `postTransferCompleteDestSide` |
| `POST /:id/items` (add item) | 1163-1326 | 4 sites | same as create |
| `PUT /:id/items/:itemId` (edit) | 1328-1630 | 8 sites (full swap or delta) | combinations of source-side + dest-side |
| `DELETE /:id/items/:itemId` | 1632-1764 | 4 sites | `postTransferCancelSourceSide`, `postTransferCancelDestSide` |
| `POST /:id/cancel` | 1766-1908 | 4 sites | same as item delete, looped |
| `GET /:id/reverse-preview` | 1911-2022 | 0 (read-only) | (no change) |
| `POST /:id/reverse` | 2024-2222 | 4 sites (drain dest, return to src) + 2 manual movement logs | `postTransferReverse` |

**Total: ~31 stock-write sites → ~14 helper calls** after refactor.

---

## 6. What I'm NOT changing

- **Behavior:** the visible state changes are the same as today. This is a structural refactor.
- **Stock-control independence:** `if (src.stockControlEnabled)` and `if (dest.stockControlEnabled)` stay as separate blocks.
- **Re-fetch inside complete tx:** still does it.
- **Permission checks:** unchanged.
- **REJECTED status semantics:** existing code uses `REJECTED` for both reject (PENDING) and cancel (IN_TRANSIT). Keeping it. (Per memory: "No CANCELLED enum — use REJECTED with action='CANCELLED' in history.")

---

## 7. What changes in observable behavior

**Better errors:**
- "Insufficient stock" was a manual check before the update. Now the DB CHECK constraint *also* catches it (defense in depth).
- Wrong-direction arithmetic is impossible — every leg has explicit `delta`, the helper's validation confirms balance, and the DB rejects negatives.

**Audit trail:**
- Every stock change writes a `stock_movements` row (today, some paths skip this — e.g., item-edit doesn't write movements at all).
- Reversal of completed transfers writes proper reversal rows (today it writes manual MANUAL_ADJUSTMENT rows; mostly fine but inconsistent).

**Race safety:**
- `SELECT ... FOR UPDATE` row locks in the helper prevent concurrent corruption.
- Today's code relies on `$transaction` isolation alone, which doesn't prevent two concurrent `updateMany` from racing on the same row.

---

## 8. Risk assessment

**Highest risk:** the item-edit refactor. It has 4 sub-cases (full swap with src control, full swap with dest control, qty delta with src control, qty delta with dest control), and each can have either positive or negative deltas. **One mistake here and edits silently swap stock incorrectly.**

**Mitigation:**
- I'll write item-edit refactor LAST in the batch, after the simpler endpoints have been validated.
- I'll add 3 new tests to the existing test suite specifically for item-edit cases:
  - Full swap (woodType change)
  - Qty increase
  - Qty decrease
- The existing memory rules (full swap vs delta logic) are explicit — I follow them line for line.

**Lower risk:** the create/approve/complete refactors are 1:1 mappings to existing helpers.

**Lowest risk:** reject (no stock change) and reverse-preview (read-only).

---

## 9. Order of operations

I'll do the refactor in 5 sub-batches, each verifiable independently:

1. **4a — Add transfer convenience builders** to `stockLedger.ts` + add 3 new transfer-specific tests. **Verify all helper tests pass.**
2. **4b — Refactor create + approve** (similar logic). Build, type-check, run all tests.
3. **4c — Refactor complete + reject + cancel + item-add + item-delete** (medium complexity). Build, type-check, run all tests.
4. **4d — Refactor item-edit** (highest complexity). Build, type-check, run all tests + the 3 new edit-specific tests.
5. **4e — Refactor reverse**. Build, type-check, run all tests.

After each sub-batch: I'll show you the diff before deploying. You smoke-test only before sub-batches 4d and 4e if you want.

---

## 10. Tests I'll add to the helper test suite

| # | Test | What it validates |
|---|---|---|
| 8 | Multi-warehouse legs (src + dest in-transit) | Two separate entry groups in one transaction |
| 9 | Item-edit full swap (woodType change) | Both old-return + new-deduct legs at source, both old/new in-transit at dest |
| 10 | Item-edit qty increase | Single delta entry group |
| 11 | Item-edit qty decrease (returning to source) | Reverse delta works correctly |

---

## 11. What I need from you

**Read sections 2 and 7 closely.** Those describe what gets written to `stock_movements` and how the audit trail will look after this refactor.

Then tell me:

1. **"Approved, proceed."** I start with sub-batch 4a (helpers + tests).
2. **"Modify X."** Tell me what to adjust.
3. **"Stop."** I wait.

No code changes until you say go.

---

## 12. What can't go wrong after Batch 4

| Failure mode | Status |
|---|---|
| Transfer creates without recording stock_movements | impossible — helper writes both atomically |
| Transfer item-edit doesn't update stock | impossible — refactored sites are required to use helper |
| Stock changes with wrong sign | DB CHECK constraint catches negative result |
| Race condition on concurrent transfer creates | row lock in helper prevents |
| Source updated but dest skipped (or vice-versa) | each side is independent — but each side itself is atomic via `$transaction` |
| Reversal deletes audit history | already not done; we always write new reversing entries |
| Cancel of IN_TRANSIT misses one leg | helper enforces balance for grouped legs at COMMIT |
