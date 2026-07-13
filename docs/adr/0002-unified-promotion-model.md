# ADR 0002 — Unified Route Promotion Model

- **Status:** Accepted
- **Date:** 2026-07-13
- **Context:** Phase 0 of the Trips & Bookings blueprint (`docs/blueprint/trips-and-bookings.md`).

## Context

Two overlapping promotion mechanisms existed on `routes`:

- **m006** (`006_route_wizard.sql`): `promo_discount_pct` (1–99) + `promo_expires_at` + `promo_label`.
- **m016** (`016_cities_promotions.sql`): `promotion_percentage` (0–100) + `promotion_active`.

The **driver wizard wrote the m006 columns** (`app/driver/routes/new.tsx`,
`stores/driverRouteStore.ts`), while **search and booking pricing read the m016 columns**
(`utils/routeSearch.ts:effectivePrice`, `hooks/useBookingForm.ts:computeTotalPrice`, and the
route-discovery/search components). A promo set in the wizard therefore never affected the price
a sender actually saw — a latent correctness bug, not merely redundant columns.

## Decision

`promotion_percentage` + `promotion_active` are the **single source of truth** for the discount.
`promo_label` and `promo_expires_at` are retained as **display/expiry metadata**. `promo_discount_pct`
is **deprecated** — code no longer writes it, and it will be dropped in a later migration once no
reads remain.

- Migration `043_unify_promotions.sql` backfills `promotion_percentage`/`promotion_active` from the
  legacy columns for existing routes.
- `stores/driverRouteStore.ts:createRoute` now writes `promotion_percentage`/`promotion_active`
  (derived from the wizard's promo input + expiry) instead of `promo_discount_pct`.
- Read sites that still used the legacy column were converged: `app/driver/routes/[id].tsx`,
  `hooks/useDriverRouteCard.ts`.

## Consequences

- Promos set by drivers now correctly flow through to search/booking pricing.
- The wizard's UI field can keep its `promo_discount_pct` input name; the store maps it to the
  canonical column. `CreateRouteInput` is unchanged.
- A future migration will drop `promo_discount_pct` after confirming zero reads.
