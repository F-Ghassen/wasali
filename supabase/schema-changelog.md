# Schema Changelog

Chronological log of schema-affecting migrations. Newest first. See
`docs/blueprint/trips-and-bookings.md` and `docs/adr/` for the rationale behind
the Phase 0 reconciliation set.

## Feature — Route expiration (2026-07-13)

- **048_route_expiry.sql** — Adds an `expired` route status (CHECK extended to
  `draft/active/full/expired/cancelled/completed`). Extends
  `enforce_route_transition()` (m046) to permit `active→expired` and `full→expired`
  (expired is terminal). Enables `pg_cron` and schedules `expire-routes` (nightly
  02:15 UTC) to flip past-departure `active`/`full` routes to `expired`; also
  backfills existing past routes. Expired routes drop out of sender search (which
  filters `status='active'`) and show as "Expired" in the driver's history.
  Existing bookings are unaffected. Trip ID (`WSL-XXXXXX` from the route UUID) is
  a display-only reference — no column.

## Phase 1 — Cash-loop hardening (2026-07-13)

- **046_rls_hardening.sql** — Adds `enforce_booking_transition()` and
  `enforce_route_transition()` BEFORE UPDATE triggers that reject illegal status
  jumps at the DB level (mirrors `LEGAL_*_TRANSITIONS` in constants/bookingStatus.ts).
  Also enforces cash-only manual mark-paid, and adds a sender `confirmed → cancelled`
  policy (pre-in_transit self-cancel). See ADR 0001/0004.
- **045_capacity_restore_fn.sql** — Adds `increment_route_capacity(uuid, numeric)`,
  the guarded inverse of m013's decrement, capped at `total_weight_kg`. Used when a
  confirmed booking is cancelled so capacity returns to the pool (previously leaked).
- **044_money_model.sql** — Adds booking money columns (`shipping_eur`,
  `service_fee_eur`, `driver_commission_eur`, `driver_payout_eur`, and the two
  snapshotted rate columns) plus a `platform_config` table. Both the sender
  service-fee and driver-commission rates default to 0% at launch, so numbers are
  unchanged; either lever can be enabled later via config, no migration. See ADR 0003.

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
