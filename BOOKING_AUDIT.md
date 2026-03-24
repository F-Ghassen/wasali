# Booking Feature Audit & SoC Analysis

## Current Structure

```
app/(tabs)/booking/
├── index.tsx                          ← ISSUE: wizard orchestrator (should be router)
├── bookingCreation/                   ✓ GOOD: creation wizard
│   ├── components/                    ✓ 10 UI components
│   ├── hooks/                         ✓ useBookingSteps, useBookingSubmit
│   ├── services/                      ✓ profileService
│   ├── types/                         ✓ Type definitions
│   └── utils/                         ✓ bookingSummaries
├── bookingDetail/                     ✓ GOOD: view booking details
│   ├── [id].tsx                       ✓ Screen
│   ├── components/                    ✓ TimelineStep
│   ├── hooks/                         ✓ useBookingDetail, useBookingActions
│   ├── types/                         ✓ TIMELINE_STEPS
│   └── utils/                         ✓ Helpers
├── bookingList/                       ✓ GOOD: list all bookings
│   ├── index.tsx                      ✓ Screen
│   └── components/
│       └── BookingCard.tsx            ✓ Card component

app/(tabs)/bookings.tsx                ⚠️ RE-EXPORT: delegates to bookingList
```

## Issues & Observations

### 1. **Root `index.tsx` is Confusing** ⚠️
**Current behavior:** It's the wizard creation screen
**Problem:**
- Navigation to `/(tabs)/booking` shows the wizard, not a list or menu
- Naming is unclear—should either be a router/layout or named `bookingCreation/index.tsx`
- Breaks expected UX: users might expect a booking overview or navigation hub

**Impact:** Users who navigate to `/(tabs)/booking` directly see the wizard, but the tab bar points to `/(tabs)/bookings` (a different route)

### 2. **Route Fragmentation** 🔴
- **`/(tabs)/bookings`** → delegates to `booking/bookingList`
- **`/(tabs)/booking`** → wizard (not discoverable from tab)
- **`/(tabs)/booking/bookingDetail/[id]`** → detail view

This creates **two entry points** for the same feature family, confusing router behavior.

### 3. **Missing Layout/Router Structure** 🔴
Expo Router expects:
```
app/(tabs)/booking/
├── _layout.tsx           ← MISSING: should define stack/navigation for sub-routes
├── bookingCreation/
│   └── index.tsx
├── bookingDetail/
│   └── [id].tsx
└── bookingList/
    └── index.tsx
```

Currently, there's **no `_layout.tsx`**, so these routes aren't properly grouped.

### 4. **SoC Violations in `bookingCreation/index.tsx`** 🟡
**Current:** All logic in one 280-line screen
**Better would be:** Extract into a layout + router to separate concerns
- Screen composition (JSX)
- State management (useBookingSteps, useBookingSubmit)
- Route navigation logic

### 5. **No Error Boundary or Fallback Routes** 🟡
No route fallback if user tries to create a booking without a selected route.

---

## Proposed Improvements

### **Tier 1: Router Structure (Critical)**

Create `app/(tabs)/booking/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="bookingList" />
      <Stack.Screen name="bookingCreation" />
      <Stack.Screen name="bookingDetail" />
    </Stack>
  );
}
```

Then move current `index.tsx` → `bookingCreation/index.tsx`.

**Result:**
- Routes become: `/(tabs)/booking/bookingCreation`, `/(tabs)/booking/bookingList`, `/(tabs)/booking/bookingDetail/[id]`
- Clear hierarchical structure
- Proper nesting in Expo Router

### **Tier 2: Rename Tab Route (Optional but Cleaner)**

Update `app/(tabs)/_layout.tsx` tab from `bookings` to `booking`:
```typescript
<Tabs.Screen
  name="booking"  // instead of "bookings"
  options={{
    title: 'Bookings',
    // ...
  }}
/>
```

Then remove `app/(tabs)/bookings.tsx` and let it naturally route to `/(tabs)/booking/bookingList`.

**Result:** Single, consistent route family under `/booking`

### **Tier 3: Extract Router Logic (SoC)**

Separate `bookingCreation/index.tsx` into:
- **`bookingCreation/index.tsx`** — screen composition only
- **`bookingCreation/_layout.tsx`** (optional) — guard state (no route, loading, error)
- Keep hooks & utils as-is

### **Tier 4: Add Route Guards** 🟡

In `bookingCreation/index.tsx`, if user navigates without a route:
```typescript
if (!routeId) {
  return <Redirect href="/(tabs)/booking/bookingList" />;
}
```

Instead of showing an error message, redirect to list where they can select a route.

---

## SoC Assessment

| Layer | Current | Grade | Notes |
|-------|---------|-------|-------|
| **Components** | 13 UI components | ✅ A+ | Clean separation, single responsibility |
| **Hooks** | useBookingSteps, useBookingSubmit | ✅ A | Good state/effect encapsulation |
| **Services** | profileService | ✅ A | Proper API layer |
| **Utils** | bookingSummaries (5 functions) | ✅ A | Pure, reusable |
| **Types** | Dedicated types/index.ts | ✅ A | Good type organization |
| **Router** | Missing _layout.tsx | ❌ C- | Fragmented routes, no clear hierarchy |
| **Screens** | 3 screens (creation, detail, list) | ⚠️ B | Good separation but index.tsx is confusing |

**Overall:** SoC is **90% excellent**, but **Router structure needs work**.

---

## Recommendation Priority

### 🔴 Must Do
1. Create `_layout.tsx` to properly nest routes
2. Move `index.tsx` → `bookingCreation/index.tsx`

### 🟡 Should Do
1. Rename tab route from `bookings` to `booking` (consistency)
2. Remove `app/(tabs)/bookings.tsx` (unneeded re-export)
3. Add route guard: redirect if no route selected

### 🟢 Nice to Have
1. Extract wizard composition into separate `_layout.tsx`
2. Add TypeScript route types in `types/index.ts`

---

## Before/After Routes

### Current (Confusing)
```
/(tabs)/bookings                    → bookingList
/(tabs)/booking                     → bookingCreation (undiscoverable)
/(tabs)/booking/bookingDetail/[id]  → detail
```

### After Improvements
```
/(tabs)/booking                     → layout
/(tabs)/booking/bookingList         → list (default screen)
/(tabs)/booking/bookingCreation     → wizard (via params/state)
/(tabs)/booking/bookingDetail/[id]  → detail
```

---

## Implementation Steps

1. Create `app/(tabs)/booking/_layout.tsx` (20 lines)
2. Move `app/(tabs)/booking/index.tsx` → `app/(tabs)/booking/bookingCreation/index.tsx`
3. Update `app/(tabs)/_layout.tsx` tab: `bookings` → `booking`
4. Delete `app/(tabs)/bookings.tsx`
5. Test: verify all routes work + tab navigation

---

## Files to Create

- `app/(tabs)/booking/_layout.tsx` — Stack router for booking features

## Files to Modify

- `app/(tabs)/_layout.tsx` — change tab name
- `app/(tabs)/booking/bookingCreation/index.tsx` (renamed from index.tsx)

## Files to Delete

- `app/(tabs)/bookings.tsx` — unneeded re-export

---

## Testing Checklist

- [ ] Tab bar "Bookings" navigates to list view (not creation)
- [ ] From list, tap booking → detail view loads
- [ ] From home, navigate to route → creation wizard loads
- [ ] Error state (no route) → redirects to list (not showing error)
- [ ] Draft resume works in creation wizard
- [ ] Back button doesn't escape to unexpected routes
