# RouteCard Redesign Summary

## What Changed

### 1. **Layout Structure**

**OLD:**
```
[Avatar] [Driver Name] ⭐ ... [Promo Badge]
─────────────────────────────────────────
[Pickup Pills →] [Arrow] [Dropoff Pills]
─────────────────────────────────────────
[Capacity Bar]
[Min Booking Badge]
[Forbidden Items]
[Service Tags]
─────────────────────────────────────────
€ Price / kg [Book Button]
```

**NEW:**
```
[Avatar] [Driver Name] €20.00
         ⭐ 4.5 · 12 trips        /kg [Promo]
─────────────────────────────────────────
● Lyon                    departure_date
  ┃ ← [3 days]
● Tunis                   arrival_date
─────────────────────────────────────────
📦 Capacity
12 / 50 kg | [████░░░░░░] 25% filled
─────────────────────────────────────────
[View route details →]
```

### 2. **Removed Elements**

❌ Horizontal pill list (pickup/dropoff stops)
❌ Service tags row (Drop-off, Driver pickup, etc.)
❌ Forbidden items section
❌ Min booking badge
❌ Vehicle type pill
❌ "ShieldCheck" icon (replaced with BadgeCheck)
❌ ScrollView for horizontal content

### 3. **Added Elements**

✅ Travel time badge (Same day / 1 day / 3 days)
✅ Clock icons for dates
✅ Vertical route visualization with colored dots
✅ Enhanced capacity section with background
✅ Package icon next to "Capacity"
✅ "New driver" label for unrated drivers
✅ Percentage filled status
✅ ChevronRight icon in CTA button

### 4. **Visual Improvements**

| Aspect | Old | New |
|--------|-----|-----|
| **Avatar** | Plain circle | Bordered circle with secondary color |
| **Driver Icon** | ShieldCheck (small) | BadgeCheck (inline) |
| **Stats Display** | On one line | Cleaner row with dots |
| **Price Position** | Bottom right | Top right, larger, emphasized |
| **Price Font** | Regular | 20px, weight 800, primary color |
| **Route Display** | Horizontal pills | Vertical flow with timeline |
| **Capacity Bar** | Minimal | Section with background, label, % |
| **CTA Button** | Text only "Book slot →" | Icon + text "View route details →" |
| **Card Shadow** | Light | Medium with subtle border |
| **Icons** | Clock unavailable | Clock icons on dates |

### 5. **Code Changes**

**Removed Functions:**
- `serviceTypeLabel()` — no longer shows service tags

**Removed Logic:**
- Pickup/dropoff stop filtering
- Service tags rendering
- Forbidden items rendering
- Min booking badge
- Vehicle type display
- Horizontal scrolling

**Added Logic:**
- Travel time calculation (days between departure → arrival)
- Days label formatting
- Enhanced date formatting display
- Capacity percentage calculation + display

**Icons Added:**
- `Clock` — for dates
- `Package` — for capacity
- `BadgeCheck` — for verified driver
- `ChevronRight` — for CTA button

**Icons Removed:**
- `ShieldCheck`
- `Ban`

### 6. **Styling Changes**

**Colors:**
- Same color palette (Colors constants)
- Added subtle background for capacity section: `rgba(99,102,241,0.04)`
- Avatar border uses `Colors.secondary`

**Typography:**
- Price: `fontSize: 20, fontWeight: '800'`
- CTA text: same weight
- Cleaner, more readable spacing

**Spacing:**
- Consistent `Spacing.lg`, `Spacing.md`, `Spacing.sm` usage
- Better vertical rhythm
- No horizontal scrolling = cleaner layout

**Shadows:**
- Enhanced: `height: 4, opacity: 0.08, radius: 12`
- Added subtle border: `borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)'`

### 7. **Component Size**

- **Old:** 512 lines
- **New:** 521 lines (similar, but cleaner logic)
- Removed ~100 lines of unnecessary UI elements
- Added ~100 lines of styling improvements

## Why These Changes?

1. **Simpler Information Architecture** — Users care about driver, price, route, and capacity. Not service tags or forbidden items.
2. **Better Visual Hierarchy** — Price is now prominent; driver info secondary.
3. **Vertical Scanning** — Easier to scan on mobile (vertical route flow vs horizontal pills).
4. **Modern Design** — Timeline visualization, badges, and refined spacing match current design trends.
5. **Reduced Cognitive Load** — Fewer decision points for the user to parse.

## Backward Compatibility

⚠️ **Breaking Change:**
- Export changed from `RouteCardV2` → `RouteCard`
- Must update imports in `app/(tabs)/routes/results.tsx` and anywhere else using `RouteCard`

## Old Version Backup

The original design is saved at: `components/search/RouteCard.old.tsx`

To revert:
```bash
cp components/search/RouteCard.old.tsx components/search/RouteCard.tsx
```

## Testing Checklist

- [ ] Route cards display correctly in search results
- [ ] Driver info (name, rating, trips) displays correctly
- [ ] Price is prominent and formatted correctly
- [ ] Promo badge shows when applicable
- [ ] Travel time badge displays (Same day / 1 day / 3 days)
- [ ] Capacity bar shows filled percentage
- [ ] CTA button is clickable and navigates to booking creation
- [ ] No horizontal scrolling needed
- [ ] Works on mobile (375px width)
- [ ] Works on tablet (768px+ width)
