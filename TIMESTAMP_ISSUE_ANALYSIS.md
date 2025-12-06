# DRY-00012 Luku Calculation Bug - Root Cause Analysis

## The Problem

**Incorrect Cost**: 2,041,980.18 TSH → Should be 1,046,293.88 TSH (995,686 TSH overcharged!)

## Root Cause

### Timeline Issue:
1. **Reading 5 taken at**: Dec 03 09:20:00 → Meter shows **2766.01 kWh** (already recharged)
2. **SMS timestamp says**: Dec 03 09:22:32 (2 minutes LATER)
3. **Calculation logic** checks: `rechargeDate > prevTime && rechargeDate <= currentTime`
4. Since 09:22:32 > 09:20:00, recharge is NOT counted between Reading 4 and Reading 5
5. Instead, it's counted between Reading 5 and Reading 6
6. This causes **massive overcalculation**: 2975.65 kWh instead of 81.91 kWh

### Why This Happens:
- **SMS timestamp** = When the LUKU/TANESCO system generated the token
- **Meter reading time** = When the user physically took the reading (after entering token)
- There's always a **delay** between receiving SMS and entering token

## The Fix Applied (Temporary)

Changed recharge timestamp from `09:22:32` to `09:19:00` (before Reading 5)

## The REAL Problem

**This WILL happen again!** Every time a recharge is added:

### Current Flow (BROKEN):
```
User → Enters SMS → Frontend parses date from SMS → Backend saves SMS timestamp
```

### What Actually Happens:
```
09:22 → LUKU sends SMS with token
09:25 → User receives SMS
09:27 → User enters token into meter
09:30 → User takes reading showing recharged amount
09:32 → User enters reading into system
```

The SMS timestamp (09:22) is **BEFORE** the actual reading time (09:30)!

## The Permanent Solution

We need to record recharges using the **ACTUAL time the meter was read**, not the SMS timestamp.

### Option 1: Manual Timestamp Entry (RECOMMENDED)
When adding a recharge during a drying process:
- **Don't use SMS timestamp** for `rechargeDate`
- Instead, use the **reading time** when the user took the meter reading
- Or ask user: "When did you take this meter reading after recharge?"

### Option 2: Automatic Detection
- When user adds a reading AND the meter jumped significantly (e.g., +2000 kWh)
- Automatically create a recharge record
- Use the **reading timestamp** as the recharge timestamp

### Option 3: Smart Adjustment
- Keep SMS timestamp for reference
- Add a separate field: `actualRechargeTime` or `meterReadingTime`
- Use `meterReadingTime` for calculations
- Keep SMS timestamp for audit trail

## Code Changes Needed

### 1. Frontend: DryingProcess.tsx (lines 503-578)

**CURRENT CODE (WRONG):**
```typescript
// Line 538-547: Uses SMS timestamp
const dateMatch = smsText.match(/Tarehe\s+(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i);
let rechargeDate = new Date().toISOString();
if (dateMatch) {
  const day = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]) - 1;
  const year = parseInt(dateMatch[3]);
  const hour = dateMatch[4] ? parseInt(dateMatch[4]) : 0;
  const minute = dateMatch[5] ? parseInt(dateMatch[5]) : 0;
  rechargeDate = new Date(year, month, day, hour, minute).toISOString();
}
```

**SHOULD BE:**
```typescript
// Get the NEXT reading time (which will show the recharged meter)
// Or ask user: "When was the meter reading taken after recharge?"
const rechargeDate = new Date().toISOString(); // Current time when entering
// OR better: Let user specify when they took the meter reading
```

### 2. Backend: factory.ts (lines 961-997)

The calculation logic is **CORRECT**, but it relies on accurate timestamps.

**No code change needed** - but we need accurate `rechargeDate` values!

### 3. Database Schema

Consider adding a new field to `ElectricityRecharge`:
```prisma
model ElectricityRecharge {
  // ... existing fields
  rechargeDate      DateTime  // Keep original SMS timestamp for audit
  meterReadingTime  DateTime? // NEW: When meter was actually read after recharge
  // ... rest
}
```

Then use `meterReadingTime` for calculations if available, otherwise fall back to `rechargeDate`.

## Immediate Action Items

1. ✅ **Fixed DRY-00012** by adjusting timestamp
2. ⚠️ **Check all other processes** for same issue
3. 🔧 **Update recharge entry UI** to capture actual reading time
4. 🔧 **Add validation** - warn if meter reading timestamp < recharge timestamp
5. 📊 **Create utility script** to detect and fix timestamp issues in existing data

## Long-term Prevention

### Add Validation in Frontend:
```typescript
if (meterReading.timestamp < recharge.timestamp) {
  alert('⚠️ WARNING: The meter reading time is BEFORE the recharge timestamp.
         This will cause incorrect calculations. Please verify timestamps.');
}
```

### Add Smart Detection:
```typescript
// When adding a reading
if (currentMeter - previousMeter > 1000) {
  // Large jump detected - likely a recharge
  suggestRechargeEntry();
}
```

## Summary

The bug is NOT in the calculation logic - it's in the **data entry workflow**.

**Key Insight**: We're using SMS timestamps (when token was generated) instead of meter reading timestamps (when user actually read the meter after entering token).

**Solution**: Update the UI to capture the ACTUAL time when the meter was read after recharge, not the SMS timestamp.
