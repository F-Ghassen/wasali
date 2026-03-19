# Test Plan — Search & Results Overhaul

_Feature branch: main | Date: 2026-03-19_

---

## Scope

This plan covers manual testing of all changes introduced in the Search & Results Overhaul (migration 016, `useCities`, new `searchStore`, `useRouteResults`, updated `index.tsx`, `results.tsx`, and `RouteCard`).

---

## Prerequisites

- App running via `npx expo start`
- Supabase remote DB has migration 016 applied (`SELECT count(*) FROM cities;` → 29)
- At least one active route exists in the DB (seed one if needed via Supabase dashboard)
- Logged in as a sender account

---

## TC-01 — Cities Table Seeded

**Goal:** Confirm 29 cities loaded into DB.

| Step | Expected |
|------|----------|
| Open Supabase dashboard → SQL editor | — |
| Run `SELECT count(*) FROM cities;` | Returns **29** |
| Run `SELECT * FROM cities WHERE is_active = false;` | Returns **0 rows** |
| Run `SELECT * FROM cities WHERE coming_soon = true;` | Returns **0 rows** |

---

## TC-02 — City Picker Loads from DB

**Goal:** `useCities()` fetches all 29 cities grouped by country.

| Step | Expected |
|------|----------|
| Open app → Search screen (home tab) | Hero + search card visible |
| Tap **FROM** field | City picker modal opens |
| Verify section headers present | Germany, France, Italy, Spain, Belgium, Netherlands, United Kingdom, Switzerland, Sweden, Tunisia |
| Verify cities under Germany | Berlin, Cologne, Frankfurt, Hamburg, Munich |
| Verify cities under Tunisia | Bizerte, Gafsa, Hammamet, Kairouan, Monastir, Nabeul, Sfax, Sousse, Tunis |
| Type "Par" in search box | Only Paris shown |
| Close modal; tap **TO** field | Same modal, same 29 cities |

---

## TC-03 — Search Store New Shape

**Goal:** Store correctly saves city ID, name, country.

| Step | Expected |
|------|----------|
| Select "Berlin" as origin | FROM field shows **Berlin** / **Germany** |
| Select "Tunis" as destination | TO field shows **Tunis** / **Tunisia** |
| Tap **DATE** field | Calendar modal opens, today highlighted with border |
| Tap a future date | DATE field shows formatted date (e.g. "Sat, Apr 5") |
| Verify Search button is **enabled** | Blue, not greyed |
| Clear one city (re-open picker, close without selecting) | Search button stays greyed if a city is missing |

---

## TC-04 — Search Navigates with Correct Params

**Goal:** `handleSearch` pushes `origin_city_id`, `destination_city_id`, `depart_from_date`.

| Step | Expected |
|------|----------|
| Select Berlin → Tunis, pick today's date | — |
| Tap **Search Drivers** | Navigates to results screen |
| Results header shows | **Berlin → Tunis** |
| Results screen loads (no crash) | Route cards or empty state |

---

## TC-05 — Two-Tier Results

**Goal:** Tier 1 (exact city) appears first; Tier 2 (country match) has section header.

Setup: Insert routes in DB:
- Route A: Berlin → Tunis (exact match)
- Route B: Munich → Tunis (Germany → Tunisia, different origin)
- Route C: Paris → Tunis (France → Tunisia, should NOT appear for Germany→Tunisia search)

| Step | Expected |
|------|----------|
| Search Berlin → Tunis | Route A shown first (no header) |
| Scroll down | "OTHER ROUTES IN REGION" header appears above Route B |
| Route C (France) | Not shown at all |

---

## TC-06 — Sort Tabs

**Goal:** All three sort modes work correctly.

| Step | Expected |
|------|----------|
| Default tab is "Earliest" | Routes ordered by `departure_date` ascending |
| Tap **Cheapest** | Routes re-ordered by effective price (promo-adjusted) ascending |
| Tap **Top rated** | Routes re-ordered by `driver.rating` descending |
| Route with no rating (`rating=0`) | Appears last in Top rated sort |

---

## TC-07 — Filter Panel

**Goal:** Capacity and price filters apply with badge count.

| Step | Expected |
|------|----------|
| Tap filter icon (top right) | Filter panel expands |
| Enter **5** in MIN CAPACITY | Badge on filter button shows **1** |
| Routes with `available_weight_kg < 5` hidden | Filtered list is smaller |
| Enter **3** in MAX PRICE | Badge shows **2** |
| Routes with `price_per_kg_eur > 3` hidden | Further filtered |
| Tap **Reset filters** | Badge gone, all routes shown |

---

## TC-08 — Promotion Badge on RouteCard

**Goal:** Routes with `promotion_active=true` show strikethrough + badge.

Setup: Update a route in DB:
```sql
UPDATE routes SET promotion_percentage = 20, promotion_active = true WHERE id = '<id>';
```

| Step | Expected |
|------|----------|
| Find the promoted route in results | Red badge "−20%" in top-right of driver row |
| Price area | Strikethrough original price + effective price (e.g. €4.00 → €3.20) |
| Sort by Cheapest | Effective price (€3.20) used for ordering, not original |

---

## TC-09 — Driver Stats on RouteCard

**Goal:** Rating/trip count display correctly; "New driver" label for rating=0.

Setup:
```sql
-- New driver
UPDATE profiles SET rating = 0, completed_trips = 0 WHERE id = '<driver_id_1>';
-- Experienced driver
UPDATE profiles SET rating = 4.7, completed_trips = 23 WHERE id = '<driver_id_2>';
```

| Step | Expected |
|------|----------|
| New driver's RouteCard | Shows "New driver" in green below name |
| Experienced driver's RouteCard | Shows "⭐ 4.7 · 23 trips" |
| Driver with `phone_verified=true` | Shield check icon next to name |

---

## TC-10 — Save Feature Removed

**Goal:** No heart icon visible anywhere.

| Step | Expected |
|------|----------|
| Scroll through route cards | No heart icon on any card |
| Inspect RouteCard — no `isSaved` or `onToggleSave` props passed | — |

---

## TC-11 — Empty State

**Goal:** Empty state shows "Show all routes" and "Alert me" when no results.

| Step | Expected |
|------|----------|
| Search a city pair with no active routes | Empty state appears with 🔍 emoji |
| Tap **Show all routes →** | Filters cleared; results reload |
| Tap **🔔 Alert me when a route opens** | `route_alerts` row inserted in DB |
| Verify in DB: `SELECT * FROM route_alerts WHERE user_id = '<id>';` | Row present |

---

## TC-12 — No Driver Guard

**Goal:** Routes with deleted/null driver are skipped in FlatList.

```sql
-- Simulate a route with no driver (orphaned)
INSERT INTO routes (..., driver_id = NULL) -- not possible via FK, skip
-- or: check renderItem returns null when driver is null
```

| Step | Expected |
|------|----------|
| Route with `driver = null` | Card not rendered (no crash) |

---

## TC-13 — Pagination

**Goal:** PAGE_SIZE=100 loads; `loadMore` fetches next page.

| Step | Expected |
|------|----------|
| Search a route with > 100 results | First 100 loaded |
| Scroll to bottom | `isFetchingMore` skeleton shown, next page loads |
| `hasMore = false` after < 100 results returned | No further fetch |

---

## TC-14 — Offline / DB Unavailable Fallback

**Goal:** City picker falls back to `constants/cities.ts` when Supabase is unreachable.

| Step | Expected |
|------|----------|
| Toggle airplane mode or block Supabase URL | — |
| Open city picker | Still shows cities (from fallback) |
| Cities displayed match the 29 in `constants/cities.ts` | No crash, no empty list |

---

## TC-15 — Booking Flow Still Works

**Goal:** Selecting a route from results still navigates to booking wizard.

| Step | Expected |
|------|----------|
| Search Berlin → Tunis | Results screen |
| Tap a route card / "Book slot →" button | Navigates to `/booking` |
| Booking wizard step 1 loads | No crash |

---

## Pass Criteria

All TCs pass with no crashes, no TypeScript errors at build time, and correct data displayed. TC-01 must pass before TC-02 through TC-15.
