# SEARCH_PLAN.md — Search & Results Overhaul

> **Status:** ✅ Implemented (2026-03-19)

## Summary of Changes

| Step | File(s) | Change |
|------|---------|--------|
| 1 | `supabase/migrations/016_cities_promotions.sql` | Cities table + 29 seeds, promotion columns on routes, driver stats columns on profiles |
| 2 | `types/database.ts` | Added `cities` Row/Insert/Update; extended `routes` with `promotion_percentage`/`promotion_active`; extended `profiles` with `rating`/`completed_trips` |
| 3 | `hooks/useCities.ts` | New hook — fetches cities from Supabase, groups by country, falls back to `constants/cities.ts` |
| 4 | `stores/searchStore.ts` | Replaced string city fields with `fromCityId`/`fromCityName`/`fromCountry` etc.; replaced `date`/`dateTo`/`minWeight` with `departFromDate`; removed `search()`/`results`/`isSearching`/`hasSearched` |
| 4 | `hooks/useRouteSearch.ts` | Updated to new store shape; `handleSearch` pushes city IDs + date as params |
| 5 | `app/(tabs)/index.tsx` | Uses `useCities()` for city pickers; single date picker; removed DateRangePicker/min-weight row |
| 6 | `hooks/useRouteResults.ts` | Full rewrite: two-tier query, client-side sort/filter, pagination PAGE_SIZE=100 |
| 7 | `app/(tabs)/routes/results.tsx` | Two-tier FlatList with section header; sort tabs; filter panel with badge |
| 8 | `components/route/RouteCard.tsx` | Removed heart/save; added promo badge; "New driver" label when rating=0 |

## Data Flow

```
Search Screen
  └─ useCities() → SELECT * FROM cities WHERE is_active = true
       └─ CityPicker (origin) ──┐
       └─ CityPicker (dest)  ──┤→ searchStore { fromCityId, fromCityName, fromCountry,
       └─ DatePicker          ──┘                toCityId, toCityName, toCountry, departFromDate }
                                                        ↓
                                        router.push('/routes/results', params)

Results Screen
  └─ useRouteResults({ originCityName, originCountry, destCityName, destCountry, departFromDate })
       └─ Supabase: status=active AND departure_date>=date AND (exact city OR country match)
       └─ tier1 = exact city match
       └─ tier2 = country match only (excluding tier1)
       └─ FlatList: tier1 rows → "Other routes in region" header → tier2 rows
```

## Verification Checklist

1. `npx expo start` — 0 TypeScript errors
2. Search screen: tap origin → modal shows all 29 cities grouped by country
3. Single date picker defaults to today; search navigates with params
4. Results screen: Tier 1 at top; Tier 2 below "Other routes in region" header
5. Sort tabs: "Earliest" / "Cheapest" (effective price incl. promo) / "Top rated"
6. Filter: set min capacity → badge shows count; clear → badge gone
7. Route with `promotion_active=true` + `promotion_percentage=20` → strikethrough + "−20%" badge
8. Driver with `rating=0` → "New driver" label; `rating>0` → "⭐ 4.5 · 12 trips"
9. Empty state: "Show all routes" clears filters; "Alert me" inserts to `route_alerts`
10. `SELECT count(*) FROM cities;` → 29 rows

## Migration Plan

```bash
# Apply migration
supabase db push

# Verify
supabase db query "SELECT count(*) FROM cities;"  -- expect 29
```
