# Wasali Core Feature Blueprint — Trips & Bookings

## Context

Wasali's core is a two-sided logistics marketplace: **drivers plan and publish trips** (Europe → Tunisia routes with capacity), and **senders book those published trips** to ship packages. **At launch the only payment method is cash, handed directly to the driver** (by the sender at collection or the recipient at delivery). The platform never holds funds — there is no escrow. **Card/PayPal is shown as "Coming soon" (visible but disabled)** and is not wired at launch. This blueprint is the enterprise-grade reference for that core loop.

**Why now:** the feature is ~70% built. A prior survey found the data layer, stores, wizards, and screens largely exist — but the loop has **broken links and unreconciled state** that block a confident launch:
- Booking status has **conflicting migration history** (`rated` orphan vs `disputed`), so the canonical state machine is ambiguous.
- **Two overlapping promo systems** on `routes` (`promo_discount_pct` from m006 vs `promotion_percentage` from m016).
- **No money-split model** anywhere — price == driver earnings; no driver commission and no user service fee, a painful retrofit if deferred.
- **Cancellation doesn't restore route capacity** (decrement on confirm has no inverse).
- **`accept-offer` is non-atomic**; **`notify-booking-event` reads dropped columns** (`origin_city`/`destination_city`) → `undefined → undefined` in notifications.
- Driver route-detail header is **hardcoded "Route"** instead of computed origin→destination.

**Decisions taken (this plan reflects them):**
1. **Cash only at launch; card "Coming soon".** Cash is the sole functional payment method — **handed directly to the driver, no escrow, no platform custody of funds**. "Mark as Paid" is a driver-side bookkeeping flag recording receipt, not a fund movement. The card/PayPal option is rendered **visible but disabled with a "Coming soon" label**; the Stripe functions stay unwired.
2. **Direct booking is the core.** Request/offer marketplace stays a documented secondary flow.
3. **Model two money levers now, both 0% at launch:**
   - **Driver commission** — the platform's cut *taken from the driver* (reduces `driver_payout_eur`). Default `0%`.
   - **Service fee** — a fee *paid by the sender* on top of shipping + services (increases `total_price`). Default `0%`.
   Both are stored as configurable rates with the split columns present from day one, so either lever can be switched on later via config with **no migration**. At 0/0 the numbers are identical to today (`total_price == shipping+services`, `driver_payout == total_price`).
4. **Deliver as plan file + committed docs.** On execution, persist the blueprint as versioned docs + ADRs + a schema-reconciliation migration; each build phase gated by approval.

**Intended outcome:** a single unambiguous state machine for routes and bookings, a reconciled money model with driver-commission and user-service-fee levers wired but zeroed, closed feedback loops (capacity, notifications, cancellation), and documentation (blueprint + ADRs) that keeps the codebase consistent as it scales — without rewriting what already works.

---

## The Core Loop (happy path)

```
DRIVER                                          SENDER
──────                                          ──────
plan trip (wizard: stops → rules →
  services → pricing)
publish  ─────────────────────────────────────▶ trip appears in search (status=active)
                                                search origin→dest→date
                                                open trip detail
                                                book (wizard: itinerary → logistics →
                                                  sender → recipient → package → payment)
                          booking created ◀───── submit  (status=pending, payment=unpaid)
notified: "new booking"
review + Confirm ──▶ capacity decremented
  (status=confirmed)                            notified: "confirmed"; sees QR code
hand-off: scan sender QR ──▶ status=in_transit  notified: "in transit"
  [cash-on-collection] sender hands cash to driver
  → driver taps "Mark as Paid" (records receipt)
transport…
Mark Delivered ──▶ status=delivered             notified: "delivered"
  [cash-on-delivery] recipient hands cash to driver
  → driver taps "Mark as Paid" (records receipt)
rate sender ◀──────────────────────────────────▶ rate driver
                                                  (bidirectional, ratings.rater_type)
```
\* **Cash is never held by the platform** — it moves directly between sender/recipient and driver. "Mark as Paid" is a bookkeeping flag, not a fund movement. Card/PayPal is shown as **"Coming soon" (disabled)** at launch.

---

## 1. Data Layer

Build on the existing schema. **`types/database.ts` (generated) is authoritative**, not the stale `supabase/schema.sql`. All changes ship as new numbered migrations following the Schema Changes Workflow in CLAUDE.md (migration → push → regenerate types → update stores → changelog → commit together).

### 1a. Reconciliation migrations (do first — these unblock everything)

| Migration | Change | Why |
|---|---|---|
| `042_reconcile_booking_status.sql` | Assert the canonical `bookings.status` CHECK = `pending, confirmed, in_transit, delivered, disputed, cancelled`. Migrate any stray `rated` → `delivered`. Drop the `rated` value permanently (rating is tracked via the `ratings` table, **not** a booking status). | m018 introduced `rated`; the later-sorting `20260317` migration reverted to `disputed`. `constants/bookingStatus.ts` already uses the 6-value set — make the DB match, unambiguously. |
| `043_unify_promotions.sql` | Pick **`promotion_percentage` + `promotion_active`** (m016) as canonical. Backfill from `promo_discount_pct`/`promo_label`/`promo_expires_at` where the new cols are null. Keep `promo_label`/`promo_expires_at` as display/expiry metadata; **deprecate `promo_discount_pct`** (stop writing it; drop in a later migration once no reads remain). | Two promo systems compute discounts differently; `utils/routeSearch.ts:effectivePrice` and `computeTotalPrice` already use `promotion_percentage`. Converge on that. |
| `044_money_model.sql` | Add to `bookings`: `shipping_eur numeric(10,2)` (weight × rate + services subtotal), `service_fee_eur numeric(10,2) NOT NULL DEFAULT 0` (paid by sender, on top), `driver_commission_eur numeric(10,2) NOT NULL DEFAULT 0` (taken from driver), `driver_payout_eur numeric(10,2) NOT NULL DEFAULT 0`, `service_fee_rate_pct numeric(5,2) NOT NULL DEFAULT 0`, `driver_commission_rate_pct numeric(5,2) NOT NULL DEFAULT 0`. Add a `platform_config` table (key/value or single-row) holding the active `service_fee_rate_pct` (default **0**) and `driver_commission_rate_pct` (default **0**). Backfill existing bookings: `shipping_eur = total_price`, `service_fee_eur = 0`, `driver_commission_eur = 0`, `driver_payout_eur = total_price`. | **Two independent money levers must exist before launch to avoid retrofit.** At launch both rates = 0% → `total_price == shipping_eur` and `driver_payout_eur == total_price`, identical to today. Either lever can be switched on later via `platform_config`, no migration. |
| `045_capacity_restore_fn.sql` | Add `increment_route_capacity(p_route_id uuid, p_weight_kg numeric)` SECURITY DEFINER (mirror of `decrement_route_capacity` from m013) that adds capacity back, capped at `total_weight_kg`. | Cancelling a *confirmed* booking must return its weight to the pool. No inverse exists today → capacity leaks. |

### 1b. Canonical status columns (post-reconciliation)

- **`routes.status`**: `draft → active → full → completed` with `cancelled` terminal. (Values already exist; this blueprint defines the *legal transitions* — see §2.)
- **`bookings.status`**: `pending → confirmed → in_transit → delivered`, with `cancelled` and `disputed` branches.
- **`bookings.payment_status`**: `unpaid → paid → captured → refunded → failed`. **At launch only `unpaid → paid` is used** (cash: driver taps "Mark as Paid" to record receipt). `captured`/`refunded` are reserved for the future card path and unused at launch.

### 1c. Key relationships (unchanged, documented for clarity)

- Route origin/destination are **derived from `route_stops`** (`collection` stop = origin, `dropoff` stop = destination), each `city_id → cities`. `routes` has **no** origin/dest columns. Any code needing route cities must join `route_stops`.
- Capacity: `total_weight_kg` (original), `available_weight_kg` (remaining; decrement on confirm, increment on cancel-of-confirmed), `min_weight_kg`, `max_single_package_kg`.
- Booking money (post-044): `total_price` (what the sender pays) = `shipping_eur` + `service_fee_eur`. `driver_payout_eur` = `shipping_eur` − `driver_commission_eur`. At launch both fee/commission = 0, so `total_price == shipping_eur == driver_payout_eur`.

### 1d. RLS hardening (new migration `046_rls_hardening.sql`)

- **Restrict the driver booking UPDATE policy** (m005 is column-blind — a driver can currently edit `price_eur`, addresses, etc. on bookings on their routes). Replace with column-scoped enforcement: drivers may only transition `status` and set `driver_notes`/`paid_at`/`payment_status`. Enforce legal transitions in a `BEFORE UPDATE` trigger (`enforce_booking_transition()`) that rejects illegal status jumps.
- Keep sender `pending → cancelled` (m039); **add** sender `confirmed → cancelled` gated by policy + trigger (see §2 cancellation rules).
- Confirm senders can only read `routes.status='active'` (already true) and their own bookings (m041 gives drivers SELECT on bookings for their routes — keep).

---

## 2. Workflows & State Machines

### 2a. Route lifecycle (driver)

```
        publishRoute            markRouteFull
draft ───────────────▶ active ───────────────▶ full
  │                      │  ▲                     │
  │                      │  └─────────────────────┘  (reopen if capacity frees on cancel)
  │            completeRoute│
  │                      ▼
  └── cancelRoute ──▶ cancelled        active ──────▶ completed
```

Legal transitions (enforce in store guards + a DB `BEFORE UPDATE` trigger `enforce_route_transition()`):
- `draft → active` (publish), `draft → cancelled`
- `active → full` (manual or auto when `available_weight_kg < min bookable`), `active → cancelled` (only if no active bookings — already checked in UI, move guard to DB), `active → completed`
- `full → active` (auto-reopen when a confirmed booking cancels and frees capacity), `full → completed`, `full → cancelled` (no active bookings)
- `cancelled`, `completed` = terminal

Reuses: `useDriverRouteStore.publishRoute/cancelRoute/markRouteFull/completeRoute` (add guards; they're currently unguarded UPDATEs).

### 2b. Booking lifecycle (the heart of the feature)

```
              submit                confirmBooking            markInTransit         markDelivered
   (none) ──────────▶ pending ──────────────────▶ confirmed ──────────────▶ in_transit ──────────▶ delivered
                        │  capacity decremented      │ (QR-verified)                                    │
                        │                            │                                                  ▼
              reject ───┤                     cancel ┤                                          rate (both sides)
              cancel ───┤                            │
                        ▼                            ▼
                    cancelled ◀──────────────────────┘  (capacity restored)
                        
   any active state ──▶ disputed  (sender "Report an Issue"; frozen pending resolution)
```

Transition table (single source of truth — encode in `constants/bookingStatus.ts` as `LEGAL_TRANSITIONS` and enforce in `enforce_booking_transition()` trigger):

| From | To | Actor | Guard / side-effect |
|---|---|---|---|
| — | pending | sender | insert; `payment_status=unpaid`; compute `shipping_eur`, `service_fee_eur`, `total_price`, `driver_commission_eur`, `driver_payout_eur` (launch: fee/commission = 0) |
| pending | confirmed | driver | **`decrement_route_capacity` RPC (guarded)**; rollback to pending on insufficient capacity |
| pending | cancelled | sender or driver | reject (driver) / cancel (sender); no capacity change (never decremented) |
| confirmed | in_transit | driver | **QR match required** (`data === booking.id`) OR manual override |
| confirmed | cancelled | sender or driver | **`increment_route_capacity` RPC**; if route was `full`, auto-reopen to `active` (cash: no funds to reverse) |
| in_transit | delivered | driver | **cash:** recipient hands cash if cash-on-delivery; driver taps `markPaid`; then Mark Delivered. No capture step (no escrow) |
| in_transit | disputed | sender | freeze; opens `disputes` row |
| confirmed/delivered | disputed | sender | freeze; opens `disputes` row |
| delivered | — | both | terminal for status; ratings tracked separately |

**Guards that must move from app-only to DB-enforced:**
- Capacity decrement/restore (RPCs already exist / to add in 045).
- Legal-transition enforcement (`enforce_booking_transition()` trigger — new).
- `markPaid` cash-only guard: currently *no* enforcement (comment only, `driverBookingStore.ts:220`). Add guard: `payment_type IN ('cash_on_collection','cash_on_delivery')` in both store and trigger.

Reuses: `useDriverBookingStore.confirmBooking` (already does capacity RPC + rollback — the model to follow), `rejectBooking`, `markInTransit`, `markDelivered`, `markPaid`; `useBookingStore.submitBooking/submitDispute`; RPC `decrement_route_capacity`.

### 2c. Payment sub-flows

**Cash (the launch payment method) — no escrow, direct hand-off:** submit → `unpaid`. Cash moves **directly from sender (at collection) or recipient (at delivery) to the driver** — the platform never holds or routes these funds. Driver taps `markPaid` to **record** receipt → `payment_status='paid'`, `paid_at`. This is a bookkeeping flag with no financial custody or enforcement; the platform cannot refund or capture it. Delivery = `markDelivered` (no capture step). UI copy must state plainly that Wasali does not hold cash and payment is arranged directly with the driver.

**Card / PayPal — "Coming soon" at launch (not wired):** the payment step renders the card/PayPal option **visible but disabled**, with a "Coming soon" label; selecting it is blocked and the booking cannot be submitted with a card method. The existing Stripe functions (`create-payment-intent`, `stripe-webhook`, `capture-payment`) remain in the repo but are **not invoked**. Wiring them (manual-capture escrow: authorize on submit → confirm on webhook → capture on delivery → refund on cancel) is a **future phase**, explicitly out of launch scope. Documented here only so the disabled affordance and the eventual `payment_status` values (`captured`/`refunded`) have a clear home.

*Future card wiring (out of launch scope, recorded for the eventual phase):* submit → `create-payment-intent` (manual capture) stores `stripe_payment_intent_id` and sender authorizes; `stripe-webhook` `payment_intent.succeeded` → `payment_status='paid'`, `status='confirmed'`; `markDelivered` → `capture-payment` (guards `status==='in_transit'`) → `payment_status='captured'`; cancel of a paid-but-uncaptured intent → refund/void → `payment_status='refunded'`. The specific broken link to fix then is the missing `create-payment-intent` call in `useBookingSubmit`. **None of this ships at launch.**

### 2d. Bug-fix workflows (close the broken loops)

- **`notify-booking-event`**: stop selecting dropped `origin_city`/`destination_city`; derive route summary by joining `route_stops`→`cities` (collection/dropoff). Fixes `undefined → undefined` in every notification/email.
- **`accept-offer`** (secondary flow, but fix for correctness): wrap the 3 sequential updates in a single Postgres function / transaction (RPC) to make offer-accept atomic.
- **Driver route-detail header**: compute origin→destination from `route_stops` instead of the hardcoded "Route" title (`app/driver/routes/[id].tsx:151-157`).

---

## 3. Validation Rules

**Principle:** one zod schema per boundary, reused across UI step-validity AND submit. Today the driver wizard uses `wizardStep1/4Schema` but the **sender booking wizard uses ad-hoc booleans** (`useBookingForm.stepValidity`) and never parses through zod at submit — close that gap.

### 3a. Route publish (driver) — reuse/extend `utils/validators.ts`
- `wizardStep1Schema`: departure ≥ today; arrival ≥ departure (already enforced ✓).
- Stops: ≥1 collection + ≥1 drop-off; collection region ≠ drop-off region (EU vs TN) — add refine.
- `wizardStep4Schema`: `available_weight_kg` 1–200; `price_per_kg_eur` 0.5–100; `payment_methods` ≥1 (✓); promo % 1–99 when enabled (✓). Add: `min_weight_kg ≤ available_weight_kg`; `max_single_package_kg ≤ available_weight_kg` when set.
- **Publish precondition:** route must have ≥1 collection stop, ≥1 drop-off stop, ≥1 enabled payment method, capacity > 0. Enforce in `publishRoute` guard.

### 3b. Booking submit (sender) — **new** `bookingSubmitSchema` in `utils/validators.ts`
Consolidate the 6 step checks into one schema parsed at submit:
- weight: 0.1–200, **≤ route.max_single_package_kg** (if set), **≥ route.min_weight_kg** (if set), **≤ route.available_weight_kg**.
- ≥1 package category; not in `route.prohibited_items`.
- sender name + phone (≥5); if `collectionServiceType==='driver_pickup'` → sender street+city+postal required.
- recipient name + phone (≥5); if `deliveryServiceType==='driver_delivery'` → recipient street+city required.
- `paymentType ∈ route.payment_methods` **AND** `paymentType` is a cash method at launch (`cash_on_collection`/`cash_on_delivery`) — card/PayPal is rejected until the future card phase.
- collection_stop_id + dropoff_stop_id belong to this route; collection_service_id/delivery_service_id belong to this route.
- Server-authoritative price: recompute `total_price` server-side (or in an RPC) at insert and reject if client `total_price` disagrees beyond a cent — prevents client price tampering.

### 3c. Money validation — two levers, both 0% at launch
One util `splitBookingMoney({ shipping, serviceFeeRatePct, driverCommissionRatePct })` is the single source for all money math, reused in submit + display:
- `shipping_eur = round(weight × effectiveRate + collectionFee + deliveryFee, cents)` (existing `computeTotalPrice`, `useBookingForm.ts:343`).
- **Service fee (paid by sender, on top):** `service_fee_eur = round(shipping_eur × service_fee_rate_pct/100, cents)`; `total_price = shipping_eur + service_fee_eur`.
- **Driver commission (taken from driver):** `driver_commission_eur = round(shipping_eur × driver_commission_rate_pct/100, cents)`; `driver_payout_eur = shipping_eur − driver_commission_eur`.
- **At launch both rates = 0** → `service_fee_eur = 0`, `total_price = shipping_eur`; `driver_commission_eur = 0`, `driver_payout_eur = shipping_eur`. Numbers identical to today.
- Rates come from `platform_config` (server-side), never from the client. Server recomputes at insert and rejects a tampered client `total_price` (see §3b).

---

## 4. Edge Cases (explicit handling)

**Capacity & concurrency**
- Two senders book the last slot simultaneously → both `pending` is fine; **`confirmBooking` capacity is the atomic gate** (RPC `WHERE available >= weight`); second confirm rolls back to pending with "Not enough capacity." (Already implemented — document as the canonical pattern.)
- Booking weight > remaining capacity at submit → block in `bookingSubmitSchema` (soft gate); confirm is the hard gate.
- Route hits zero capacity on confirm → auto-transition `active → full`.
- Confirmed booking cancelled → `increment_route_capacity`; if route was `full` → auto-reopen `active`.

**Cancellation**
- Sender cancels `pending` → allowed, no capacity change (never decremented).
- Sender cancels `confirmed` → allowed pre-`in_transit`; restore capacity. No funds to reverse (cash never collected before hand-off). After `in_transit` → **not** self-serve; must go through dispute.
- Driver cancels a route with active (`pending`/`confirmed`) bookings → **blocked** (move UI guard to DB); must resolve bookings first.

**Payment (cash-only at launch)**
- Booking submit with a card/PayPal method → **blocked** at launch; the option is disabled ("Coming soon") and `bookingSubmitSchema` rejects any `paymentType` other than the cash methods.
- `markPaid` allowed only for cash payment types (`cash_on_collection`/`cash_on_delivery`) — guard in store + trigger. (Card values can't occur at launch, but the guard is correct for the future.)
- Delivery attempted while `payment_status='unpaid'` on a cash-on-delivery booking → warn driver (they're releasing goods before recording payment) but allow (their choice/risk); log it.
- No capture/refund paths at launch (no escrow). `capture-payment`'s `in_transit` 422 guard stays in the repo for the future card phase.

**Data integrity**
- Route deletion with bookings → FK is `ON DELETE RESTRICT` ✓ (can't orphan bookings). Cancel, don't delete.
- Route stop deleted after booking → `bookings.collection_stop_id/dropoff_stop_id` are `ON DELETE SET NULL` ✓; UI must handle null stop gracefully.
- Deep-link to sender `routes/[id]` on cold start → currently renders "Route not found" (relies on in-memory `bookingStore.selectedRoute`). Add a fetch-by-id fallback.
- Prohibited item selected in booking → block at submit (cross-check `route.prohibited_items`).

**Notifications**
- Missing `push_token`/`notification_email` → in-app row still inserted; push/email skipped gracefully (already handled).
- Route-alert trigger fires only on transition **into** `active` (m020) — document so publishing a draft is the trigger point.

**Ratings**
- One rating per (booking, rater_type) — verify live UNIQUE constraint (schema.sql says `(booking_id, rater_type)`, m031 says `(booking_id, sender_id, driver_id)`). **Add `047_verify_ratings_unique.sql`** to assert the canonical one: `UNIQUE(booking_id, rater_type)` (one driver-rating + one sender-rating per booking).
- Rating allowed only when `status='delivered'` — enforce in RLS/trigger.

---

## 5. Files to Create / Modify

**Migrations (new, in order):**
- `supabase/migrations/042_reconcile_booking_status.sql`
- `043_unify_promotions.sql`
- `044_money_model.sql` (service-fee + driver-commission columns + `platform_config`, both rates default 0)
- `045_capacity_restore_fn.sql`
- `046_rls_hardening.sql` (+ `enforce_booking_transition()`, `enforce_route_transition()` triggers)
- `047_verify_ratings_unique.sql`

**Stores (add guards + new actions, don't rewrite):**
- `stores/driverRouteStore.ts` — transition guards on publish/cancel/full/complete; publish preconditions.
- `stores/driverBookingStore.ts` — cash-only guard in `markPaid`; capacity restore on cancel; auto full/reopen.
- `stores/bookingStore.ts` — parse `bookingSubmitSchema`; compute money split; reject non-cash payment methods.

**Validation & utils:**
- `utils/validators.ts` — new `bookingSubmitSchema` (incl. cash-only `paymentType` at launch); extend `wizardStep4Schema` (min/max weight refines); stop-region refine.
- `utils/money.ts` (new) — `splitBookingMoney({ shipping, serviceFeeRatePct, driverCommissionRatePct })`, single source for all fee/commission math.
- `constants/bookingStatus.ts` — add `LEGAL_TRANSITIONS` map (mirrors DB trigger).
- `constants/paymentMethods.ts` (new or existing) — mark card/PayPal as `comingSoon: true` so the UI renders them disabled from one source of truth.

**Edge functions:**
- `supabase/functions/notify-booking-event` — fix route-summary city join.
- `supabase/functions/accept-offer` — wrap in atomic RPC (secondary).
- *(future card phase, not launch)* wire `create-payment-intent` into sender submit path.

**Screens (targeted fixes):**
- `app/(sender)/booking/bookingCreation/` payment step — render card/PayPal as disabled "Coming soon"; only cash selectable.
- `app/driver/routes/[id].tsx` — computed origin→destination header.
- `app/(sender)/routes/[id].tsx` — fetch-by-id fallback.

**Docs (committed on execution):**
- `docs/blueprint/trips-and-bookings.md` — this blueprint, versioned in-repo.
- `docs/adr/0001-canonical-booking-state-machine.md`
- `docs/adr/0002-unified-promotion-model.md`
- `docs/adr/0003-money-model-service-fee-and-driver-commission.md`
- `docs/adr/0004-cash-only-at-launch-card-coming-soon.md`
- Update `docs/user-flows.md` (fix stale `(tabs)`/`(driver-tabs)` names → `(sender)`/`(driver)`; correct 6-step wizard; remove non-existent confirmation route; state cash-only) and `docs/architecture.md`.
- `supabase/schema-changelog.md` — create + log migrations 042–047.

---

## 6. Phasing

**Phase 0 — Reconcile & document (no behavior change, highest value): ✅ SHIPPED (2026-07-13).** migrations 042/043/047, docs + ADRs, `notify-booking-event` city-join fix, driver route-detail header fix. Makes the state machine and money model unambiguous.

**Phase 1 — Harden the cash loop (launch-critical): ✅ SHIPPED (2026-07-13).** 044 (money model, both rates = 0), 045 (capacity restore), 046 (RLS + transition triggers), store guards, `bookingSubmitSchema` (cash-only payment), `utils/money.ts`, card/PayPal disabled "Coming soon" (gate pre-existed; escrow copy corrected), cancellation-restores-capacity + auto-reopen full routes, cash-only `markPaid` guard, sender route deep-link fallback. **This is the complete shippable launch — cash only.**

**Phase 2 (post-launch) — Card escrow:** wire `create-payment-intent` into submit, refund-on-cancel, capture-on-delivery, flip card/PayPal from "Coming soon" to enabled. Optionally switch on the service-fee and/or driver-commission rates in `platform_config` (no migration needed).

**Phase 3 — Secondary flows:** atomic `accept-offer`, driver "make an offer" writer, un-hide requests tab (only if request/offer marketplace is prioritized later).

---

## 7. Verification

**Per migration:** `supabase db push` locally → `npx supabase gen types typescript --project-id cxlxlisfvbfqtysgnklu > types/database.ts` → confirm no type drift in stores.

**State machine (unit, `tests/unit/`):** table-driven test over `LEGAL_TRANSITIONS` — every illegal transition rejected by `enforce_booking_transition()`; every legal one allowed. Mirror for routes. Assert `bookingSubmitSchema` rejects card/PayPal payment methods at launch, and `markPaid` accepts only cash types.

**Capacity (integration, `tests/integration/` — needs local Supabase):** seed a route with capacity N; concurrent confirm of two bookings summing > N → exactly one confirms, one rolls back to pending. Cancel a confirmed booking → `available_weight_kg` restored; `full` route reopens to `active`.

**Money:** unit-test `splitBookingMoney` at the launch default (both rates 0 → `total_price == shipping == driver_payout`), and at non-zero rates (e.g. service fee 5% → `total_price = shipping × 1.05`; driver commission 10% → `driver_payout = shipping × 0.90`), asserting the two levers are independent and every result rounds to cents. Assert server-recompute rejects a tampered client `total_price`.

**End-to-end (happy path, Maestro `.maestro/`):** driver publishes a route → it appears in sender search → sender books → driver confirms (capacity drops) → QR scan → in_transit → mark paid (cash) → delivered → both rate. Extend the existing `.maestro/` flows.

**Notifications:** after `notify-booking-event` fix, assert a confirmed booking's notification/email renders real `origin → destination` city names (not `undefined`).

**Regression:** full `npm test` green; typecheck clean (`npx tsc --noEmit`); the now-fixed CI runs both on PR.
