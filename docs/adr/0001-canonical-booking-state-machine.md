# ADR 0001 — Canonical Booking State Machine

- **Status:** Accepted
- **Date:** 2026-07-13
- **Context:** Phase 0 of the Trips & Bookings blueprint (`docs/blueprint/trips-and-bookings.md`).

## Context

`bookings.status` had a conflicting migration history. Migration `018_booking_wizard.sql`
set the CHECK to `(pending, confirmed, in_transit, delivered, rated, cancelled)` — introducing
a `rated` value and dropping `disputed`. A later migration, `20260317_booking_status_pending.sql`,
set it back to `(pending, confirmed, in_transit, delivered, disputed, cancelled)`.

Because Postgres migrations are applied in filename-sort order and `20260317…` sorts after
`018…`, the effective CHECK was already the 6-value set with `disputed`. But the history was
ambiguous, `constants/bookingStatus.ts` used the 6-value set, and stray `rated` rows could
exist depending on the apply path.

## Decision

The canonical `bookings.status` value set is:

```
pending → confirmed → in_transit → delivered
                    ↘ cancelled (from pending or confirmed)
   any active state ↘ disputed
```

`pending, confirmed, in_transit, delivered, disputed, cancelled` — matching
`constants/bookingStatus.ts`. **Rating is tracked in the `ratings` table, never as a booking
status.** The `rated` value is eliminated.

Migration `042_reconcile_booking_status.sql` migrates any `rated` rows to `delivered` and
re-asserts the canonical CHECK idempotently.

## Consequences

- One unambiguous source of truth for booking status, matching the TypeScript type.
- Legal transitions (the arrows above) will be enforced in Phase 1 via a `BEFORE UPDATE`
  trigger `enforce_booking_transition()` and a `LEGAL_TRANSITIONS` map in
  `constants/bookingStatus.ts`.
- Any code or query referencing `'rated'` must be removed (none found at time of writing).
