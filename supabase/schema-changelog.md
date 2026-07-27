# Schema Changelog

Chronological log of schema-affecting migrations. Newest first. See
`docs/blueprint/trips-and-bookings.md` and `docs/adr/` for the rationale behind
the Phase 0 reconciliation set.

## Bugfix — route alert submission always failed with PGRST204 (2026-07-27)

- **056_route_alerts_guest_email.sql** — `routeAlertService.ts` inserted
  `origin_city`/`destination_city`/`email` into `route_alerts`, but migration
  `023_remove_redundant_city_text_columns.sql` had already dropped the text
  city columns (keeping only `origin_city_id`/`destination_city_id`), and
  `email` never existed as a column at all — every alert submission 400'd,
  for every user, signed in or not. `route_alerts.user_id` was also
  `NOT NULL` since its original creation in `014_route_services_payment_methods.sql`,
  so the guest-email UI already present in `RouteAlertModal.tsx` had never
  actually been able to save a guest alert.
  This migration makes `user_id` nullable, adds `email text`, adds a
  `route_alerts_user_or_email_chk` CHECK requiring at least one of the two,
  replaces the owner-only RLS policy with an owner policy plus a
  guest-insert policy (`user_id IS NULL AND email IS NOT NULL`), and updates
  `notify_route_alert_users()` to skip the `notifications` insert for
  guest (`user_id IS NULL`) alerts, since `notifications.user_id` is itself
  `NOT NULL`. `routeAlertService.ts`, `RouteAlertModal.tsx`,
  `RouteAlertSheet.tsx`, and `useCreateRouteAlert.ts` updated to match —
  `RouteAlertSheet` (previously sign-in-only) now also supports the same
  guest email fallback as `RouteAlertModal`.

## Feature/Bugfix — driver booking detail: sender rating, multi-category, photo uploads, confirm/reject fix (2026-07-27)

- **055_package_photos_bucket.sql** — Creates the `package-photos` storage
  bucket (already existed since initial project setup per `storage.buckets`,
  but was never actually wired up to any upload code) plus RLS policies
  scoped to `{userId}/...` path prefixes. Kept **private** (matching its
  original `public: false` setting, same privacy level as
  `dispute-evidence`) rather than flipped to public — `bookings.package_photos`
  now stores storage **paths**, not URLs; the driver's `PackagePhotoGallery`
  resolves fresh signed URLs on each view via `createSignedUrls`. Sender-side
  upload wired into `PackageStep.tsx` (uploads immediately on picking, local
  URI kept only for instant preview, storage path persisted to
  `package_photos` at booking submit).
- **054_bookings_multi_category.sql** — Adds `package_categories text[]`.
  `hooks/useBookingForm.ts`'s `buildSubmitPayload` previously wrote
  `package_category: state.packageTypes[0] ?? 'general'` — if a sender
  selected multiple categories, every category after the first was silently
  dropped. `package_category` (singular) is kept for existing consumers
  (`BookingCard`, `DriverBookingCard`, shipping-requests); `package_categories`
  is the new full-selection column, backfilled from the singular value for
  pre-existing rows.

## Bugfix — sender/driver profile info not loading in booking joins (2026-07-27)

- **053_profiles_counterparty_select.sql** — `profiles` had exactly one SELECT
  policy, `"Users can view own profile"` (`auth.uid() = id`, migration 038).
  Every embedded join like `sender:profiles!sender_id(...)`
  (`stores/driverBookingStore.ts`) or `driver:profiles!driver_id(...)`
  (`app/(sender)/booking/bookingDetail/hooks/useBookingDetail.ts`) was
  silently filtered by RLS *on the joined table* — the booking row loaded
  fine, but the nested profile came back `null`, with no error surfaced to
  the client. Root cause of "sender info not shown in driver booking
  detail," and symmetrically affected the driver's name/phone on the
  sender's booking detail. Fix adds a second, additive SELECT policy (RLS
  policies OR together): a user can also view the profile of their booking
  counterparty — driver → sender via `bookings.sender_id` on routes they
  own, sender → driver via `routes.driver_id` on routes they've booked. No
  other profile rows become visible.

## Feature — Driver booking-detail parity: dynamic payment methods + mid-pickup weight adjustment (2026-07-27)

- **052_adjust_route_capacity_fn.sql** — Adds `adjust_route_capacity(uuid, numeric)`,
  a signed-delta dispatcher over the existing `decrement_route_capacity` (m013) /
  `increment_route_capacity` (m045) functions. Used by the driver's mid-pickup
  weight-correction flow (`driverBookingStore.adjustPackageWeight`) to move route
  capacity by `(old_weight - new_weight)` without duplicating either guarded
  function's logic. A weight increase that exceeds remaining capacity still
  surfaces `decrement_route_capacity`'s `'Insufficient capacity on route %'`
  exception unchanged.
- **051_route_payment_methods_bank_transfer.sql** — Extends the
  `route_payment_methods_payment_type_check` CHECK constraint (m014) to allow
  `'bank_transfer'`, matching the payment catalogue now defined once in
  `constants/paymentMethods.ts` (previously duplicated across
  `PaymentOption.tsx`/`PaymentStep.tsx`/the driver detail screen). Still gated
  "coming soon" at the platform level in the client — this only makes the
  column able to store the value for when that gate lifts.

## Bugfix — handle_new_user() role cast (2026-07-26)

- **050_fix_handle_new_user_role_cast.sql** — `038_convert_role_to_enum.sql`
  converted `profiles.role` from `text` to the `public.user_role` ENUM but
  never updated `handle_new_user()` (last touched in `005_driver_role.sql`),
  which still inserted a plain text value. Postgres rejected the untyped
  literal on insert into the enum column, so the `AFTER INSERT ON auth.users`
  trigger failed for **every signup** since migration 038 landed — surfaced to
  clients as `"Database error creating new user"` (500) from
  `auth.admin.createUser` / the signup API. Fix casts the `COALESCE(...,
  'sender')` result to `public.user_role`. Found and fixed while creating a
  driver test account; verified via `auth.admin.createUser` +
  `signInWithPassword` against the linked project post-fix.

## Feature — Cascading booking cancellation (2026-07-26)

- **049_booking_cancellation_reason.sql** — Adds a CHECK constraint on the
  existing `bookings.cancellation_reason` column (`sender_cancelled`,
  `rejected_by_driver`, `route_cancelled`, `route_expired`) and a new
  `cascade_cancel_bookings_on_route_terminal()` trigger
  (`trg_cascade_cancel_bookings`, `AFTER UPDATE ON routes`). When a route
  transitions into `cancelled` or `expired`, every `pending`/`confirmed`
  booking on it is auto-cancelled with the matching reason, and capacity is
  restored for any that were `confirmed` (via `increment_route_capacity`,
  m045). `in_transit`/`delivered`/`disputed`/already-`cancelled` bookings are
  left untouched. `SECURITY DEFINER` so it fires uniformly whether triggered
  by a driver's session or the `expire-routes` cron (m048), which never goes
  through app code. Backfills routes already in a terminal state with
  orphaned bookings. Previously, `rejectBooking` (driver) and `cancelBooking`
  (sender self-cancel) wrote `status='cancelled'` with no reason and no
  notification — both app-side paths now set `cancellation_reason` too
  (`rejected_by_driver` / `sender_cancelled`), and `notify-booking-event`
  gained a `cancelled` branch keyed off the reason. See
  [docs/cron-jobs.md](../docs/cron-jobs.md) (`expire-routes` row) for the
  cron-side note.

## Feature — Route expiration (2026-07-13)

- **048_route_expiry.sql** — Adds an `expired` route status (CHECK extended to
  `draft/active/full/expired/cancelled/completed`). Extends
  `enforce_route_transition()` (m046) to permit `active→expired` and `full→expired`
  (expired is terminal). Enables `pg_cron` and schedules `expire-routes` (nightly
  02:15 UTC) to flip past-departure `active`/`full` routes to `expired`; also
  backfills existing past routes. Expired routes drop out of sender search (which
  filters `status='active'`) and show as "Expired" in the driver's history.
  Existing bookings are unaffected. Trip ID (`WSL-XXXXXX` from the route UUID) is
  a display-only reference — no column. **The `expire-routes` cron job is
  registered in `docs/cron-jobs.md`** (the scheduled-jobs source of truth).

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
