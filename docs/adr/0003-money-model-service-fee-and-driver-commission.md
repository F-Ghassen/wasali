# ADR 0003 — Money Model: Service Fee & Driver Commission

- **Status:** Accepted (columns land in Phase 1)
- **Date:** 2026-07-13
- **Context:** Trips & Bookings blueprint (`docs/blueprint/trips-and-bookings.md`).

## Context

Today `bookings.price_eur`/`total_price` is the full amount, which is also the driver's earnings —
there is no platform revenue model anywhere. Adding one later would be a painful retrofit touching
pricing math, the bookings schema, driver-earnings computation, and every display surface.

The platform has two conceptually distinct money levers:

- **Service fee** — paid *by the sender*, on top of shipping + services. Increases `total_price`.
- **Driver commission** — the platform's cut taken *from the driver*. Reduces the driver's payout.

## Decision

Model **both levers now**, with **both rates defaulting to 0%** at launch. Numbers at 0/0 are
identical to today.

`044_money_model.sql` adds to `bookings`:

| Column | Meaning |
|---|---|
| `shipping_eur` | weight × effective rate + collection + delivery service fees |
| `service_fee_eur` | sender-paid fee, on top (default 0) |
| `driver_commission_eur` | platform cut from driver (default 0) |
| `driver_payout_eur` | `shipping_eur − driver_commission_eur` |
| `service_fee_rate_pct` | rate applied, snapshotted on the booking (default 0) |
| `driver_commission_rate_pct` | rate applied, snapshotted on the booking (default 0) |

and a `platform_config` table holding the active `service_fee_rate_pct` and
`driver_commission_rate_pct` (both default 0).

Money math lives in one util, `utils/money.ts:splitBookingMoney({ shipping, serviceFeeRatePct, driverCommissionRatePct })`,
reused by submit and by display. Rates come from `platform_config` (server-side), never the client;
the server recomputes `total_price` at insert and rejects a tampered client value.

- `total_price = shipping_eur + service_fee_eur`
- `driver_payout_eur = shipping_eur − driver_commission_eur`

## Consequences

- Either lever can be switched on later via `platform_config` with **no migration**.
- Because cash is handed directly to the driver (see ADR 0004), any real commission is only
  collectable on the card path (funds the platform holds). Cash-commission-as-driver-debt is out of scope.
- Rates are snapshotted per booking so historical bookings stay correct if the config changes.
