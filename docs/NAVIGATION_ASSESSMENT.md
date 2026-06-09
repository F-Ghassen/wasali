# Navigation Flow Assessment - Booking User Journey

**Status:** 🔴 **BUGGY** — Multiple critical issues found  
**Date:** 2026-05-19

---

## Executive Summary

The booking flow has **5 critical navigation bugs** that break the user experience:

1. ❌ Back button from booking detail jumps to home (fixed in this session)
2. ❌ Missing back button from booking creation to search results
3. ❌ Booking creation uses relative path instead of absolute
4. ❌ No navigation guard when routes are loading/missing
5. ❌ Inconsistent route parameter handling (string vs array)

---

## User Journey Map

### Happy Path (Should Be)
```
Home
  ↓ [Select Country]
Search Results /(tabs)/routes/results
  ↓ [Select Route]
Booking Creation /(tabs)/booking/bookingCreation?routeId=XXX
  ↓ [Complete 6 steps + Pay]
Booking Detail /(tabs)/booking/bookingDetail/[id]
  ↓ [View Status / Rate]
Post-Delivery (rate/dispute)
```

### What Actually Happens
```
Home
  ✅ [Select Country] → Search Results
Search Results
  ✅ [Select Route] → Booking Creation (push)
Booking Creation
  ✅ [Complete booking] → Booking Detail (push)
Booking Detail
  ❌ [Back button] → HOME (should go to Booking List!)
  
---

Booking List (Tab)
  ✅ [Select booking] → Booking Detail
Booking Detail
  ❌ [Back button] → HOME (should go to Booking List!)
```

---

## Critical Issues Found

### Issue #1: Back Button from Booking Detail Returns to Home ✅ FIXED
**Severity:** CRITICAL  
**Location:** `app/(tabs)/booking/bookingDetail/[id].tsx:142`

```typescript
// ❌ BEFORE
<TouchableOpacity onPress={() => router.back()} />

// History stack after fix:
// [Home] → [Search Results] → [Booking Creation] → [Booking Detail] ← HERE
// router.back() now goes to → Booking Creation ✅

// But if user entered from Booking List:
// [Booking List] → [Booking Detail] ← HERE
// router.back() goes to → Booking List ✅
```

**Fix Applied:** Changed booking creation from `router.replace()` to `router.push()`

---

### Issue #2: Missing Back Navigation on Booking Creation
**Severity:** HIGH  
**Location:** `app/(tabs)/booking/bookingCreation/index.tsx:186, 414`

```typescript
// Current: Back button goes to previous page (search results if coming from there)
<TouchableOpacity onPress={() => router.back()}>
  {/* Good, but... */}
</TouchableOpacity>

// BUT: If user navigated directly via deeplink or came from Booking List tab,
// there might be no previous screen. Need guard:
```

**Issue:** No safeguard for unexpected navigation states. Need to:
1. Check if there's a previous screen to go back to
2. Default to Booking List if not
3. Or prevent direct access to bookingCreation without a valid routeId

---

### Issue #3: Booking Creation Uses Incorrect Pathname
**Severity:** MEDIUM  
**Location:** `app/(tabs)/booking/bookingCreation/hooks/useBookingSubmit.ts:93`

```typescript
// ❌ RELATIVE PATH (works by accident, but wrong)
router.push({
  pathname: '/booking/bookingDetail/[id]', // Missing /(tabs)
  params: { id: bookingId },
});

// ✅ ABSOLUTE PATH (correct)
router.push({
  pathname: '/(tabs)/booking/bookingDetail/[id]',
  params: { id: bookingId },
});
```

**Status:** Already fixed in this session

---

### Issue #4: Route Parameters Handling is Inconsistent
**Severity:** MEDIUM  
**Location:** `app/(tabs)/booking/bookingCreation/index.tsx:54-60`

```typescript
const params = useLocalSearchParams<{ routeId?: string }>();

const routeId =
  route?.id ||
  (params.routeId
    ? Array.isArray(params.routeId)  // ← params can be string OR array!
      ? params.routeId[0]
      : params.routeId
    : null);
```

**Problem:** Expo Router sometimes returns route params as `string` or `string[]`. Should normalize in one place.

**Fix Needed:**
```typescript
// Create a utility function
function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const routeId = route?.id || getSingleParam(params.routeId) || null;
```

---

### Issue #5: No Loading/Error Guard Before Booking Creation
**Severity:** HIGH  
**Location:** `app/(tabs)/booking/bookingCreation/index.tsx:62-72`

```typescript
// Route data is loading...
const {
  route: routeData,
  isLoading: isRouteLoading,
  error: routeError,
  // ... 
} = useRouteData(routeId);

// But we render the form anyway without checking isLoading or error!
if (!routeId) {
  // Only check if routeId exists, not if data is loaded
}
```

**Problem:** User can start filling the form while data is still loading. If data fails to load, form state is invalid.

**Fix Needed:**
```typescript
// Prevent form interactions until data loads
if (isRouteLoading) {
  return <LoadingSpinner />;
}

if (routeError) {
  return <ErrorState error={routeError} onRetry={retry} />;
}

if (!routeData) {
  return <ErrorState error="Route not found" onPress={() => router.back()} />;
}

// NOW render form
```

---

## Navigation Issues by Screen

### Home (`app/(tabs)/index.tsx`)
✅ Correctly uses `router.push()` for all destinations
- Pushes to `/p2p` for P2P shipping

### Country Picker (`components/home/OriginCountryPicker.tsx`)
✅ Correctly uses `router.push()` to search results
- Sets search params in store + router params (redundant but safe)

### Search Results (`app/(tabs)/routes/results.tsx`)
✅ Uses `router.push()` to booking creation
- Passes `routeId` as query param
- Sets route in bookingStore

### Booking Creation (`app/(tabs)/booking/bookingCreation/index.tsx`)
⚠️ **MIXED:**
- ✅ Back button uses `router.back()` 
- ❌ No guard for invalid route data (loading/error)
- ❌ No guard for deeplink without routeId
- ✅ Form submission now uses `router.push()` (fixed)

### Booking Detail (`app/(tabs)/booking/bookingDetail/[id].tsx`)
⚠️ **MOSTLY FIXED:**
- ✅ Back button now works correctly (via the fix)
- ❌ No guard for invalid booking ID
- ✅ Post-delivery navigation uses `router.push()`

### Booking List (`app/(tabs)/booking/index.tsx`)
✅ Correctly pushes to booking detail
✅ Empty state has CTA to home with `router.push('/(tabs)')`

---

## Recommended Fixes (Priority Order)

### P0 - Critical (Do First)
- [ ] **Add loading/error guards to Booking Creation** — prevent form interactions while route data loads
- [ ] **Validate booking ID on Booking Detail entry** — show error if booking doesn't exist
- [ ] **Create param normalization utility** — handle string vs array route params in one place

### P1 - High (Do Soon)
- [ ] **Add back button safeguard on Booking Creation** — check navigation stack before allowing back
- [ ] **Update all path aliases to absolute routes** — audit entire codebase for relative paths
- [ ] **Add navigation tests** — ensure flow works from all entry points

### P2 - Medium (Nice to Have)
- [ ] **Add breadcrumb navigation** — show "Home > Search > Booking Creation > Detail"
- [ ] **Prevent direct deeplinks to creation** — require routeId or redirect
- [ ] **Add loading skeleton to Booking Detail** — while data loads

---

## Testing Checklist

Run these scenarios to verify the fix:

### Scenario 1: Normal Flow
- [ ] Home → Select Country → Search Results
- [ ] Search Results → Select Route → Booking Creation
- [ ] Booking Creation → [Back button] → Search Results
- [ ] Booking Creation → [Complete booking] → Booking Detail
- [ ] Booking Detail → [Back button] → Booking Creation
- [ ] Booking Creation → [Back button] → Search Results
- [ ] Search Results → [Back button] → Home

### Scenario 2: From Booking List Tab
- [ ] Home → [Bookings tab] → Booking List
- [ ] Booking List → Select booking → Booking Detail
- [ ] Booking Detail → [Back button] → Booking List ✅ (or Booking Creation if coming from creation)

### Scenario 3: Invalid States
- [ ] Go directly to `/booking/bookingDetail/invalid-id` → Should error, not crash
- [ ] Go to `/booking/bookingCreation` without routeId → Should show error or redirect
- [ ] Visit search results, route gets deleted → Back should still work

### Scenario 4: Device Back Button (Android)
- [ ] Hardware back button should behave same as soft back button
- [ ] Test on Android specifically

---

## Code Quality Issues

1. **No TypeScript errors on routes** — good!
2. **Router paths use mix of relative/absolute** — inconsistent
3. **No custom navigation guards** — could prevent invalid states
4. **Loading states not handled consistently** — some screens check `isLoading`, others don't
5. **No deep linking strategy** — unclear which routes are deeplinkable

---

## Files to Review/Fix

Priority order:

1. `app/(tabs)/booking/bookingCreation/index.tsx` — Add guards
2. `app/(tabs)/booking/bookingCreation/hooks/useBookingSubmit.ts` — Already fixed pathname
3. `app/(tabs)/booking/bookingDetail/[id].tsx` — Check for null/invalid ID
4. `lib/navigation.ts` (NEW) — Create path constants + param helpers
5. E2E tests for full booking flow

---

## Summary

The booking flow is **functional but fragile**. The main issues are:

- ❌ No validation of route/booking data before rendering
- ❌ Inconsistent navigation patterns (push vs replace)
- ❌ Missing guards for invalid states
- ❌ Relative paths instead of absolute paths

With the **back button fix** applied in this session, the main happy path should work. But the edge cases (invalid IDs, missing data, deeplinks) will crash or behave unexpectedly.

**Recommendation:** Fix P0 items before marking booking flow as complete.
