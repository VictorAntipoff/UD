# Investigation Report: LOT-2026-001 Stock Sync Issue

**Date:** 2026-01-14  
**Investigator:** Claude Code Analysis  
**LOT Number:** LOT-2026-001  
**Wood Type:** Mninga  
**Warehouse:** P01 - Tegeta  

---

## Executive Summary

**CONFIRMED BUG:** The 2" Mninga (130 pieces) from LOT-2026-001 was NOT automatically synced to stock when the receipt was completed on 2026-01-14 at 06:46:01 UTC.

**Stock Discrepancy:** 131 pieces missing from expected stock calculations.

**Status:** The 1" (112 pieces) and 2" (130 pieces) stock were manually updated later:
- 1" updated 47 minutes after completion
- 2" updated 227 minutes (3.8 hours) after completion

---

## Detailed Findings

### 1. Receipt Details
- **LOT Number:** LOT-2026-001
- **Wood Type:** Mninga (ID: 4d79f4da-bbce-43e0-af68-c28c1cd67c5a)
- **Warehouse:** P01 - Tegeta (ID: 86c38abc-bb70-42c3-ae8b-181dc4623376)
- **Status:** COMPLETED
- **Completion Time:** 2026-01-14T06:46:01.424Z
- **Total Pieces:** 242

### 2. Measurements Recorded
- **1":** 112 pieces (1.586 m³)
- **2":** 130 pieces (3.584 m³)

### 3. Stock Sync Timeline

| Event | Timestamp | Difference |
|-------|-----------|------------|
| Receipt Completed | 2026-01-14T06:46:01.424Z | - |
| 1" Stock Updated | 2026-01-14T07:32:45.146Z | +47 minutes |
| 2" Stock Updated | 2026-01-14T10:33:20.444Z | +227 minutes |

**Analysis:** Stock was NOT updated during the receipt completion process. The delays of 47 minutes and 3.8 hours indicate manual updates or a separate background process, NOT automatic sync.

### 4. Stock Calculation Verification

#### All Mninga Receipts at P01:
- LOT-2025-011: 435 pieces of 2"
- LOT-2026-001: 130 pieces of 2"
- **Total Received:** 565 pieces

#### Transfers:
- **Transfers IN:** 440 pieces
- **Transfers OUT:** 637 pieces

#### Expected vs Actual:
```
Total received:     565 pieces
+ Transfers IN:     440 pieces
- Transfers OUT:    637 pieces
─────────────────────────────────
EXPECTED STOCK:     368 pieces
ACTUAL STOCK:       237 pieces
DIFFERENCE:        -131 pieces ❌
```

The difference of 131 pieces matches almost exactly the 130 pieces of 2" from LOT-2026-001, confirming it was not synced.

---

## Root Cause Analysis

### Code Review: Receipt Completion Logic

**File:** `/Users/victor/Development/Clients/UDesign/UD/backend/src/routes/factory.ts`  
**Lines:** 2021-2250

#### Expected Behavior:
```typescript
// 4. Update warehouse stock if warehouse exists and stock control is enabled
if (receipt.warehouseId && receipt.warehouse?.stockControlEnabled) {
  // Update stock for each thickness
  for (const [thickness, quantity] of Object.entries(stockByThickness)) {
    const qty = quantity as number;
    await prisma.stock.upsert({
      where: {
        warehouseId_woodTypeId_thickness: {
          warehouseId: receipt.warehouseId,
          woodTypeId: receipt.woodTypeId,
          thickness: thickness
        }
      },
      update: {
        statusNotDried: { increment: qty }
      },
      create: {
        warehouseId: receipt.warehouseId,
        woodTypeId: receipt.woodTypeId,
        thickness: thickness,
        statusNotDried: qty,
        statusUnderDrying: 0,
        statusDried: 0,
        statusDamaged: 0
      }
    });
  }
}
```

#### What Should Have Happened:
1. Receipt fetched with warehouse (line 2032-2036)
2. Warehouse assignment validated (line 2044-2046) ✓
3. Measurements grouped by thickness (line 2074-2103) ✓
4. Stock upserted for each thickness (line 2105-2131) ❌

#### Hypothesis:
The stock upsert code exists and should have executed, but one of the following occurred:

1. **Silent Error:** An exception was thrown during stock upsert but wasn't properly caught/logged
2. **Transaction Rollback:** A database transaction might have rolled back
3. **Race Condition:** The `receipt.warehouse` relation might have been null despite `receipt.warehouseId` being set
4. **Async Timing Issue:** The warehouse relation wasn't properly loaded in the include

---

## Evidence from Database

### Receipt History:
```
2026-01-14T05:25:46.117Z: DRAFT_CREATED - Draft created with 7 measurements
2026-01-14T06:46:02.085Z: APPROVED - Receipt approved by admin and marked as COMPLETED
```

**Note:** No warehouse assignment history logged, suggesting warehouse was assigned before completion or the assignment wasn't tracked.

### Receipt Timeline:
- **Created:** 2026-01-14T05:15:46.097Z
- **Completed:** 2026-01-14T06:46:01.424Z
- **Updated:** 2026-01-14T06:46:01.426Z (0.002s after completion)

The `updatedAt` being identical to `receiptConfirmedAt` suggests they were part of the same database transaction.

---

## Possible Root Causes

### 1. Warehouse Relation Not Loaded Properly
**Probability: HIGH**

The code checks:
```typescript
if (receipt.warehouseId && receipt.warehouse?.stockControlEnabled)
```

If `receipt.warehouse` was `null` (despite `warehouseId` being set), the stock sync would be skipped.

**Fix Required:**
```typescript
// Reload receipt with warehouse to ensure relation is loaded
const receiptWithWarehouse = await prisma.woodReceipt.findUnique({
  where: { lotNumber },
  include: { woodType: true, warehouse: true }
});

if (receiptWithWarehouse.warehouseId && receiptWithWarehouse.warehouse?.stockControlEnabled) {
  // Stock sync code...
}
```

### 2. Silent Error in Stock Upsert
**Probability: MEDIUM**

If an error occurred during `prisma.stock.upsert()`, it might not have been logged.

**Fix Required:**
- Add try-catch around stock sync
- Log errors explicitly
- Add validation after sync

### 3. Transaction Rollback
**Probability: LOW**

If the completion logic is wrapped in a transaction that rolled back after updating the receipt but before committing stock.

---

## Recommendations

### Immediate Actions:
1. ✅ **Add Logging:** Insert detailed logging around stock sync operations
2. ✅ **Add Validation:** After stock sync, verify the stock was actually updated
3. ✅ **Error Handling:** Wrap stock sync in explicit try-catch with error reporting
4. ✅ **Test:** Create test cases for receipt completion with various warehouse states

### Code Improvements:

```typescript
// After stock sync section (around line 2131)
console.log('✅ Stock sync completed. Verifying...', {
  lotNumber,
  stockByThickness
});

// Verify stock was actually updated
for (const [thickness, quantity] of Object.entries(stockByThickness)) {
  const verifyStock = await prisma.stock.findUnique({
    where: {
      warehouseId_woodTypeId_thickness: {
        warehouseId: receipt.warehouseId,
        woodTypeId: receipt.woodTypeId,
        thickness: thickness
      }
    }
  });
  
  if (!verifyStock) {
    console.error('❌ Stock verification FAILED - stock record not found', {
      lotNumber,
      thickness,
      expectedQty: quantity
    });
    throw new Error(`Stock sync verification failed for ${thickness}`);
  }
  
  console.log('✓ Stock verified', {
    thickness,
    total: verifyStock.statusNotDried + verifyStock.statusUnderDrying + 
           verifyStock.statusDried + verifyStock.statusDamaged
  });
}
```

### Long-term Solutions:
1. **Add Transaction:** Wrap entire completion in a Prisma transaction
2. **Add Stock Sync Audit:** Create `StockSyncHistory` table to track all stock changes
3. **Add Webhooks:** Send notification if stock sync fails
4. **Add Background Job:** Implement a reconciliation job to detect and fix stock discrepancies

---

## Conclusion

The investigation confirms that LOT-2026-001's measurements (112 pieces of 1" and 130 pieces of 2") were **NOT synced to stock during receipt completion**. 

The code to sync stock exists and appears correct, but failed to execute properly. The most likely cause is that the `receipt.warehouse` relation was null or the stock upsert failed silently.

**Current Stock State:** Stock was manually updated later, but the 131-piece discrepancy indicates the sync process is unreliable.

**Priority:** HIGH - This affects inventory accuracy and could lead to overselling or stock shortages.

---

## Files for Reference

- Backend Receipt Completion: `/Users/victor/Development/Clients/UDesign/UD/backend/src/routes/factory.ts` (lines 2021-2250)
- Investigation Scripts: `/Users/victor/Development/Clients/UDesign/UD/backend/investigate_*.js`

---

**Report Generated:** 2026-01-14  
**Investigation Complete**
