# Schema Changelog

Chronological log of schema-affecting migrations. Newest first. See
`docs/blueprint/trips-and-bookings.md` and `docs/adr/` for the rationale behind
the Phase 0 reconciliation set.

## Phase 0 — Reconciliation (2026-07-13)

- **047_verify_ratings_unique.sql** — Corrects the ratings uniqueness constraint. Drops the
  incorrect `ratings_unique_rater UNIQUE(booking_id, sender_id, driver_id)` from m031 (which made
  bidirectional ratings impossible, since both rows share sender_id/driver_id) and asserts the
  canonical `ratings_booking_rater_type_key UNIQUE(booking_id, rater_type)`. See ADR — ratings.
- **043_unify_promotions.sql** — Converges the two route-promo systems onto
  `promotion_percentage`/`promotion_active` (canonical, read by pricing). Backfills them from the
  legacy `promo_discount_pct`/`promo_expires_at`. `promo_discount_pct` deprecated (no longer
  written; dropped later). See ADR 0002.
- **042_reconcile_booking_status.sql** — Asserts canonical `bookings.status` CHECK
  `(pending, confirmed, in_transit, delivered, disputed, cancelled)`; migrates any stray `rated`
  rows to `delivered`. See ADR 0001.

> Migrations 044 (money model), 045 (capacity restore fn), 046 (RLS + transition triggers) are
> planned for Phase 1 — see the blueprint. They are listed here when they land.
