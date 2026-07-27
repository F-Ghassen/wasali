# Wasali — User Flows

_Last updated: 2026-07-26_

> **Authoritative source for the core trips & bookings loop:**
> `docs/blueprint/trips-and-bookings.md`. Where this document and the blueprint
> disagree, the blueprint wins.

**Recent updates:**
- Fixed 4 leftover `(tabs)`/`(driver-tabs)` navigation calls (home-page country flags, route alerts, featured routes, notifications) that the 2026-07-13 route-group rename missed, causing "Unmatched Route" crashes (2026-07-26)
- Corrected stale route-group names (`(tabs)`/`(driver-tabs)` → `(sender)`/`(driver)`),
  removed the non-existent `/booking/confirmation` route, and reconciled the payment model
  to **cash-only at launch (no escrow)** per ADR 0004 (2026-07-13).
- WhereAreYouFrom component redesigned with modern styling and improved UX (2026-03-22)

---

## Overview

Wasali has two user roles. Each role has its own tab bar and flow set.

| Role | Entry point | Core action |
|---|---|---|
| **Sender** | `/(sender)/index` | Find a driver, book a shipment |
| **Driver** | `/(driver)/index` | Create a route, manage bookings |

Role is set at sign-up and stored in `profiles.role`. The root `index.tsx` reads the profile and redirects accordingly.

---

## 1. Auth Flows

### Sign Up (Sender)

```
(auth)/welcome  →  [Get Started]
    ▼
(auth)/sign-up
  full name, email, password
    ▼
Supabase signUp()
  ├── email already exists?
  │     ├── __DEV__  →  auto signIn()  →  SIGNED_IN  →  /(sender)/index
  │     └── prod     →  toast "account already exists"  →  (auth)/login
  └── new email  →  confirmation email sent (Resend SMTP)
        ▼
(auth)/verify-otp
  enter 6-digit code  OR  click email link
        ▼
SIGNED_IN event  →  loadProfile()  →  /(sender)/index ✓
```

### Sign Up (Driver)

```
(auth)/welcome  →  [Become a Driver]
    ▼
(auth)/sign-up-driver
  same fields + role: 'driver' passed in auth metadata
    ▼
handle_new_user trigger sets profiles.role = 'driver'
    ▼
SIGNED_IN  →  loadProfile()  →  /(driver)/index ✓
```

### Login

```
(auth)/login
  email + password
    ▼
signInWithPassword()
    ▼
SIGNED_IN  →  loadProfile()  →  role-based redirect ✓
```

### Forgot Password

```
(auth)/forgot-password
  email
    ▼
resetPasswordForEmail()  →  reset link in inbox
    ▼
User clicks link  →  (auth)/reset-password
  new password
    ▼
updateUser()  →  /(sender)/index ✓
```

---

## 2. Sender Flows

### Tab Bar

```
/(sender)/
  ├── 🔍 Search     →  /(sender)/index
  ├── 📦 Bookings   →  /(sender)/bookings
  ├── 📋 Requests   →  /(sender)/requests
  ├── ↔️  P2P        →  /(sender)/p2p
  └── 👤 Profile    →  /(sender)/profile
```

---

### 2.1 Search & Book a Route

**Home screen:**
```
/(sender)/index  [Search Routes]
  DESTINATIONS badge + section header (modern typography)

  ▼ WhereAreYouFrom Component ▼
  Display top destination countries:
    - Tunisia first (if available)
    - Top 3 EU countries by route count
    Desktop: horizontal row of cards with left blue accent border
    Mobile: 2×2 grid layout

    Each card:
    - Flag emoji in rounded container (background secondary)
    - Country name (FontSize.base, fontWeight 700)
    - Route count badge (small pill with primary light bg)
    - Tap → navigates to /routes/results with country params

    Loading: skeleton loaders matching card dimensions
    Empty: lock icon + "No routes yet" message

    "See All" CTA: full-width outline button with arrow
  ▼ End WhereAreYouFrom ▼

  useCities() loads 29 cities from DB (or falls back to constants/cities.ts)
  CityPicker (origin) — grouped by country, coming_soon cities greyed out
  CityPicker (destination) — same
  DatePicker — single departure date, defaults to today
  tap Search → router.push('/routes/results', { origin_city_id, destination_city_id, depart_from_date })
    ▼
/(sender)/routes/results  [Route List]
  useRouteResults() — two-tier Supabase query (exact city match + country match)
  Tier 1: exact city→city routes (shown first)
  Tier 2: "Other routes in region" (same country pair, different city)
  Sort: Earliest / Cheapest (effective price incl. promo) / Top rated
  Filter: min capacity (kg), max price (€/kg)  — badge shows active filter count
  RouteCard shows: cities, dates, price/kg (strikethrough if promo active), driver rating/trip count
  tap a card
    ▼
/(sender)/booking/index  [Book Shipment — 6-step accordion]
```

**Booking wizard steps (6-step accordion):**

```
Step 0 — Itinerary
  Select collection stop (city + date)
  Select drop-off stop (city + date)
  Auto-selects when only one stop available
  ► Changing collection stop resets logistics selection

Step 1 — Logistics
  Collection method (driver-configured per route):
    ├── Drop-off at meeting point  (sender_dropoff)
    └── Driver home pickup         (driver_pickup)
  Delivery method:
    ├── Recipient self-collects    (recipient_collects)
    ├── Door delivery              (driver_delivery)
    └── Local post                 (local_post)
  Each option shows location name + "View on map" link if driver set a meeting point URL
  ► Completed step summary shows human-friendly labels (not raw service_type)

Step 2 — Your Details (sender)
  "My details" (pre-fill from profile)  OR  "On behalf of someone"
  Name, phone (+WhatsApp toggle)
  Collection address: street + postal code; city auto-filled from collection stop (read-only)
  Address only shown when collection method = driver_pickup

Step 3 — Recipient
  Name, phone (+WhatsApp toggle)
  Save to recipients toggle (saved_recipients table)
  Drop-off city: read-only, auto-filled from selected drop-off stop
  Delivery address: shown for all methods; required (street + city) only for driver_delivery

Step 4 — Package
  Weight (kg)
  Category (Electronics / Clothing / Food / Cosmetics / Documents / Household / Medical / Other)
  Photos (up to 5, Supabase Storage → package-photos/)

Step 5 — Payment
  Cash on collection  ← enabled by driver + platform
  Cash on delivery    ← enabled by driver + platform
  Credit/debit card   ← visible, disabled ("Coming soon")
  PayPal              ← visible, disabled ("Coming soon")
  ── Live OrderSummary sidebar (wide) / bottom sheet (mobile) ──
  base price = weight × route.price_per_kg_eur (with promo if active)
  + collection service price
  + delivery service price
  = total
    ▼
[Confirm booking]  (cash only at launch — no payment taken here)
  booking insert → navigate to /(sender)/booking/bookingDetail/[id]
```

**Booking confirmation:** there is no dedicated `/booking/confirmation` route. Submitting the
wizard navigates to the booking detail screen (`/(sender)/booking/bookingDetail/[id]`), which
shows a "Booking submitted!" celebration overlay for freshly-created bookings, the QR code (shown
while `pending`), Print Label, and Message Driver. See the blueprint for the canonical loop.

---

### 2.2 Booking Lifecycle & Tracking

```
pending           ← driver receives push notification
    │  driver confirms (route capacity decremented)
    ▼
confirmed
    │  driver collects package (QR-verified)
    │  [cash-on-collection] sender hands cash to driver → driver taps "Mark as Paid"
    ▼
in_transit
    │  driver marks delivered
    │  [cash-on-delivery] recipient hands cash to driver → driver taps "Mark as Paid"
    ▼
delivered
    │  both parties rate each other (ratings table; not a booking status)
```

> **Payment (launch):** cash only, handed **directly to the driver** — the platform never holds
> funds and there is no escrow. "Mark as Paid" is a bookkeeping flag. Card/PayPal is shown as
> "Coming soon" (disabled). See ADR 0004. `cancelled` and `disputed` are branches off the active
> states; `rated` is **not** a status. See the blueprint state machine (§2b).

Tracking screen `/(sender)/tracking/[bookingId]`:
- Vertical timeline (done ✓ / active ● / pending ○)
- Booking summary (route, dates, weight, total paid)
- Green escrow banner ("Funds held securely")
- Rating card appears at `delivered` status

Dispute path:
```
/(sender)/tracking/[bookingId]  →  [Open dispute]
    ▼
/post-delivery/dispute/[bookingId]
  describe issue, attach evidence photos
    ▼
disputes row created  →  admin review
```

---

### 2.3 Shipping Requests (Sender Posts, Drivers Bid)

```
/(sender)/requests  →  [New Request]
    ▼
/shipping-requests/new
  origin city, destination city
  date range (earliest / latest)
  weight (kg)
  max budget (€)
    ▼
Request created  (status: open, expires 7 days)
    ▼
/shipping-requests/[id]  [Request Detail]
  incoming driver offers displayed
  each offer: driver name, proposed price, message
  tap [Accept]
    ▼
Offer accepted  →  booking created
    ▼
/booking/review-pay  →  payment step  →  confirmed ✓
```

---

### 2.4 P2P Document Network

```
/(sender)/p2p  [Hub]
  ├── [Send a document]  →  /(sender)/p2p/send
  ├── [Carry a document] →  /(sender)/p2p/carry
  └── 🏆 Leaderboard     →  /(sender)/p2p/leaderboard
```

**Send a document:**
```
/(sender)/p2p/send
  from city (EU)  +  to city (TN)
  earliest / latest date window
  document type: Passport/ID | Letter | Contract | Medical | Other
  description (optional)
  urgency:
    ├── Normal  →  +10 pts for carrier
    ├── Soon    →  +25 pts
    └── Urgent  →  +50 pts
  payment offer toggle + amount (optional)
  [Post request]
    ▼
p2p_requests row created  →  visible to all travellers on corridor
```

**Carry a document:**
```
/(sender)/p2p/carry  [Open requests]
  filter: All | 🇪🇺→🇹🇳 | 🔥 Urgent first
  tap [Offer to carry] on a card
    ▼
Offer modal
  Free carry  →  earn points
  For a fee   →  set amount (sender accepts)
  optional message
  [Send offer]
    ▼
p2p_carries record created
sender accepts  →  hand-off arranged
    ▼
Delivery confirmed  →  points credited to carrier
```

**Leaderboard:**
```
/(sender)/p2p/leaderboard
  Gold / Silver / Bronze podium (top 3 avatars)
  Ranked list — own row highlighted
  Points redeemable: gifts, discounts, partner rewards
```

---

### 2.5 Profile Management

```
/(sender)/profile
  ├── [Edit Profile]      →  /profile/edit
  │     name, avatar (image picker → Supabase Storage avatars/)
  │
  ├── [Saved Addresses]   →  /profile/addresses
  │     list of saved addresses
  │     ├── tap to select as default
  │     └── [Add address]  →  /profile/add-address
  │           label, street, city, postcode, country
  │
  ├── [Notifications]     →  /profile/notifications
  │     push toggle per category (bookings, requests, P2P, marketing)
  │
  └── [Sign Out]
        signOut()  →  SIGNED_OUT  →  /(auth)/welcome
```

---

## 3. Driver Flows

### Tab Bar

```
/(driver)/
  ├── 🏠 Dashboard  →  /(driver)/index
  ├── 🗺  Routes     →  /(driver)/routes
  ├── 📦 Bookings   →  /(driver)/bookings
  └── 👤 Profile    →  /(driver)/profile
```

---

### 3.1 Create a Route (5-step wizard)

```
/(driver)/routes  →  [+ New Route]
    ▼
/driver/routes/new  [Route Wizard]
```

**Wizard steps:**

```
Step 1 — Collection Stops
  ┌─ Pre-filled with 2 empty stops ─┐
  │  Stop N:                        │
  │    city (any city in `cities`)  │
  │    departure date (stop 1 only) │  ← stop 1 date = departure_date
  │    collection date (stop 2+)    │
  │    meeting point URL (optional) │
  └─────────────────────────────────┘
  [+ Add collection stop]  (dashed bordered button, max 8)
  Validation: at least 1 stop with city + country

Step 2 — Drop-off Stops
  ┌─ Pre-filled with 2 empty stops ─┐
  │  Stop N:                        │
  │    city (any country other than │
  │    the ones picked in Step 1)   │
  │    estimated arrival (optional) │
  │    meeting point URL (optional) │
  └─────────────────────────────────┘
  [+ Add drop-off stop]  (max 8)
  Info banner: "Arrival dates are estimates"
  Validation: at least 1 stop with city + country
  Dropoff picker excludes any country already selected for collection —
  driven dynamically by the `cities` table (any number of countries), not
  a hardcoded EU/Tunisia split.

Step 3 — Notes & Rules
  Notes for senders (free text, optional)
  Prohibited items:
    ├── Preset chips: Weapons, Drugs, Explosives, Live animals,
    │   Perishable food, Flammable liquids, Cash & banknotes,
    │   Counterfeit goods, Tobacco, Alcohol, Medication, Electronics > €500
    └── Custom item input + [+] button

Step 4 — Services
  Collection options:
    ├── Drop-off at collection point (free, always shown)
    └── Home pick-up by driver (set your fee €)
  Delivery options:
    ├── Recipient collects (free, always shown)
    └── Home delivery by driver (set your fee €)

Step 5 — Pricing & Settings
  Max weight capacity (kg)
  Min weight per sender (kg, optional)
  Price per kg (€)
  Promo toggle:
    ├── Discount %  →  live "senders pay €X/kg" calc
    ├── Offer expires (date)
    └── Promo label (e.g. "Early bird")
  Payment methods (multi-select):
    cash_sender | cash_recipient | paypal | bank_transfer
  Save as template toggle + template name
    (auto-filled: "Paris, Lyon → Tunis, Sfax")
  ── Route Summary sidebar (wide) / inline card (mobile) ──
  [Publish Route]
    ▼
  Route saved as draft  →  published immediately as 'active'
```

**Route Summary Card** (live, updates as wizard fills):
```
Origin → Destination
Departure date
Est. arrival date

COLLECTION STOPS
  📍 City                    Mon, Mar 18

DROP-OFF STOPS
  📍 City                    Thu, Mar 21
  📍 City 2                  Fri, Mar 22

Capacity (kg)
Base price / Promo price
Payment methods
EST. EARNINGS (FULLY BOOKED)
  Transport     €___
  Services +30% €___
  ─────────────
  Total         €___
Prohibited items (red chips)
```

**Draft recovery:**
- Wizard state auto-saved to AsyncStorage every 500 ms
- On next open: banner "You have an unsaved draft" → Continue / Discard
- Draft expires after 48 hours

---

### 3.2 Manage Routes

```
/(driver)/routes
  list of my routes (DriverRouteCard)
  each card: cities, date, capacity bar, bookings count, status badge
  ├── tap card  →  /driver/routes/[id]
  │     view route detail
  │     edit fields (weight, price, notes)
  │     actions: Mark Full | Cancel Route
  │       Cancel Route now cascades (m049): if the route has pending/confirmed
  │       bookings, the confirmation dialog shows the impact count ("This route
  │       has N active booking(s)...") — cancelling auto-rejects all of them
  │       (cancellation_reason='route_cancelled') and notifies each sender.
  │       No longer blocked outright.
  └── FAB [+]  →  /driver/routes/new
```

---

### 3.3 Manage Bookings

```
/(driver)/bookings
  list of bookings on my routes (DriverBookingCard)
  filter: Pending | Confirmed | In Transit | Delivered
    ▼
  tap card  →  /driver/bookings/[id]
    booking detail (SoC-split — app/driver/bookings/{hooks,utils,types}/,
    components/driver/bookings/*.tsx):
      sender info (rating + trip count, or a "No rating yet" badge for a
      first-time sender), trip (route cities + dates), package details (all
      selected categories as chips — not just the first, see §6c below —
      plus requested-on date), package photos (resolved to signed URLs from
      the private `package-photos` bucket), logistics + note from sender,
      recipient contact (call/WhatsApp), your payout (vs. what the sender
      paid), accepted payment methods (dynamic, per-route — see §6a)
      ├── status: pending    →  [Confirm] / [Reject]
      │     → both now go through a real confirm dialog (`ConfirmActionModal`);
      │       previously `Alert.alert(...)`, a no-op on web, so tapping either
      │       button silently did nothing on a web build
      ├── status: confirmed  →  [Scan QR] / [Mark In Transit]
      │     → tapping either opens a weight-confirmation modal: driver
      │       re-weighs the package and can correct package_weight_kg
      │       before the transition proceeds (see §6b)
      ├── status: in_transit →  [Mark Delivered]
      ├── status: delivered  →  awaiting sender rating → escrow release
      ├── status: disputed   →  dispute-in-progress banner, no action needed
      └── status: cancelled  →  cancellation-reason banner
```

**Driver Dashboard** `/(driver)/index`:
- Stat cards: active routes, pending bookings, confirmed bookings
- Earnings summary (this month, total)
- Quick actions: New Route, View Bookings

---

### 3.4 Route Templates

```
/(driver)/routes  →  [Templates]
  list of saved templates
  tap to apply  →  /driver/routes/new
    wizard pre-filled with template values
    driver can adjust before publishing
```

Templates store: origin/destination, capacity, price, payment methods, logistics options.

---

## 4. Route Status State Machine

```
draft ──▶ active ──▶ full
  │          │  ▲       │
  │          │  └───────┘  (reopen when a confirmed booking cancels)
  │          ├──▶ cancelled
  │          ├──▶ completed
  │          └──▶ expired    (auto, departure date passed)
  └──▶ cancelled
   full ──▶ completed / cancelled / expired
```

| Status | Trigger |
|---|---|
| `draft` | Route created by wizard (before publish) |
| `active` | Driver publishes route (visible to senders) |
| `full` | Capacity exhausted (auto on confirm, or driver-marked) |
| `expired` | **Auto** — departure date passed; nightly `pg_cron` job `expire-routes` (m048). Hidden from sender search, shown as "Expired" in driver history. |
| `cancelled` | Driver cancels route |
| `completed` | Driver marks trip done |

**Cascading booking cancellation (m049):** transitioning a route into `cancelled` or `expired` fires `trg_cascade_cancel_bookings`, which auto-cancels every `pending`/`confirmed` booking on that route — `in_transit`/`delivered`/`disputed`/already-`cancelled` bookings are untouched. Capacity is restored for any booking that was `confirmed`. The reason is tagged so senders and support can tell driver-initiated cancellation from route expiry apart from a driver's manual per-booking reject (see §5 below).

**Trip ID:** every route shows a human-readable `WSL-XXXXXX` reference (derived from the route UUID, `utils/reference.ts`) to both the driver and the sender — same scheme as booking references.

---

## 5. Booking Status State Machine

```
          ┌──────────────────────────────────────────────────────┐
pending ──▶  confirmed ──▶ in_transit ──▶ delivered ──▶ [rated]  │
   │            │                                     │          │
   │            └──▶ cancelled                        └──▶ disputed
   └──▶ cancelled
```

| Status | Who transitions | Trigger |
|---|---|---|
| `pending` | System | Booking created |
| `confirmed` | Driver | Taps "Confirm" |
| `in_transit` | Driver | Taps "Mark Collected" |
| `delivered` | Driver | Taps "Mark Delivered" |
| `cancelled` | Driver, Sender, or System (cascade) | Cancellation action, or the route it's on transitions to `cancelled`/`expired` |
| `disputed` | Sender | Opens dispute after delivery |

**Cancellation reasons (`bookings.cancellation_reason`, migration 049)** — every path into `cancelled` now records why, distinguishing a driver's manual per-booking reject from a route-level cascade:

| Reason | Set by | Notifies |
|---|---|---|
| `sender_cancelled` | Sender self-cancels (`pending`/`confirmed`, pre-`in_transit`) | Driver |
| `rejected_by_driver` | Driver rejects a single `pending` booking | Sender |
| `route_cancelled` | Cascade — driver cancels the whole route | Sender |
| `route_expired` | Cascade — nightly `expire-routes` cron finds `departure_date` passed | Sender |

---

## 6. Notifications

Push notifications (via `lib/notifications.ts`) + email (Resend) + in-app (notifications table):

| Event | Recipient | Channel |
|---|---|---|
| New booking on route | Driver | push + in-app |
| Booking confirmed | Sender | push + email + in-app |
| Package collected / in transit | Sender | push + email + in-app |
| Package delivered | Sender | push + email + in-app |
| Booking cancelled (any reason, m049) | Driver (if sender cancelled) or Sender (if driver rejected / route cancelled / route expired) | push + email + in-app |
| New offer on shipping request | Sender | push + in-app |
| Offer accepted | Driver | push + in-app |
| New P2P carry offer | Document sender | push + in-app |

**Notification delivery pipeline** (`notify-booking-event` Edge Function):
- Triggered by Supabase DB Webhook on `bookings` UPDATE
- Fetches route + recipient profile
- Sends Expo push (native), Resend email (web / notification_email set), inserts notifications row
- `notificationStore` subscribes via Supabase Realtime to receive live inserts
- Cancellation is reason-routed, not status-routed: `status='cancelled'` alone doesn't
  pick a recipient/message — the function reads `cancellation_reason` and branches
  (`sender_cancelled` → notify driver; `rejected_by_driver`/`route_cancelled`/
  `route_expired` → notify sender). Before migration 049, no notification fired on
  cancellation at all — this closes that gap for all four cancellation paths.
- Weight adjustment (`package_weight_kg` change, see §6b) is checked ahead of the
  status branch using `old_record` — the two paths are mutually exclusive since a
  weight adjustment is always a separate UPDATE from a status transition.

### 6a. Dynamic payment methods

`constants/paymentMethods.ts` is the single catalogue for every payment type
(`cash_on_collection`, `cash_on_delivery`, `credit_debit_card`, `paypal`,
`bank_transfer`) — labels, descriptions, and the platform-level "coming soon"
gate. Per-route enablement still lives in `route_payment_methods`
(driver-managed); `resolvePaymentMethods()` crosses the two to decide what's
actually selectable right now. Both the sender's booking-creation payment
picker (`PaymentStep.tsx`) and the driver's booking-detail "Accepted payment
methods" reference row read from this one source — no more duplicated
type lists. Cash is enabled by default on every route; card/PayPal/bank
transfer are flagged "coming soon" platform-wide until an admin layer to
manage per-driver integrations exists.

### 6b. Mid-pickup weight adjustment

While a booking is `confirmed` (before the driver marks it `in_transit`), the
driver can correct `package_weight_kg` against the real weighed value at the
weight-confirmation step. `driverBookingStore.adjustPackageWeight`:
1. Recomputes the shipping price (`utils/pricing.ts`, shared with the
   sender's booking-creation formula) and the full money split
   (`utils/money.ts` `splitBookingMoney`) — preserving the platform rates
   snapshotted on the booking row at creation time.
2. Adjusts the route's `available_weight_kg` by the signed delta via the new
   `adjust_route_capacity` DB function — a weight increase that exceeds
   remaining capacity is rejected before any row is written.
3. The sender is notified in-app, by push, and by email (via the existing
   `notify-booking-event` pipeline — see above) with the old→new weight.

### 6c. Multi-category packages + photo uploads

- **Categories**: the sender's package step lets them multi-select
  categories (Clothing, Electronics, etc.), but `bookings.package_category`
  (singular) only ever stored the first selection — the rest were silently
  dropped before ever reaching the driver. `package_categories text[]` (new
  column) now carries the full selection; the driver's package card shows
  every one as a chip.
- **Photos**: the sender's photo picker uploads each photo to the
  `package-photos` storage bucket immediately on picking (kept private, same
  as `dispute-evidence` — not public like `avatars`), while still showing an
  instant local preview independent of upload progress. The driver's detail
  screen resolves fresh signed URLs to display them, and to open a
  full-screen preview on tap.

**In-app notification inbox:**
- Profile tab gets a red dot badge when `unreadCount > 0`
- Tapping "Notifications" row opens `NotificationList` bottom sheet
- Tap a notification → navigate to booking + mark read

**QR-assisted collection (driver):**
- When booking is `confirmed`, driver can scan sender's QR code OR tap "Mark as In Transit"
- QR value must equal the booking UUID; mismatch shows error toast
- On successful scan, confirmation alert → `markInTransit()`

**Route performance analytics:**
- Route detail shows: expected gross, actual gross, fill rate bar, delivered count
- Driver dashboard shows 6-month revenue bar chart (`RevenueChart` component)


---

## E2E Test Flows (Maestro)

The `.maestro/` directory contains automated E2E flows that mirror the user journeys above.

| Flow file | Mirrors user journey |
|-----------|---------------------|
| `01_driver_create_route.yaml` | Driver route creation (step 1–5 wizard + publish) |
| `02_sender_search_and_book.yaml` | Sender search → select route → 4-step booking → tracking screen |
| `03_driver_booking_lifecycle.yaml` | Driver: Pending → Confirmed → In transit → Delivered |
| `04_sender_tracking.yaml` | Sender: Bookings tab → tracking timeline → Print Label |
| `05_driver_route_cancel.yaml` | Driver: Cancel active route with a pending booking → cascade-impact copy shown → gone from list |
| `06_driver_mark_full.yaml` | Driver: Mark full → route hidden in sender search |

See `tests/README.md` for setup and run instructions.

## E2E Test Flows (Playwright — web)

The `tests/e2e/` directory contains browser-driven E2E specs for the Expo web build, complementing Maestro's native-only coverage.

| Spec file | Mirrors user journey |
|-----------|---------------------|
| `home.spec.ts` | Welcome screen renders core CTAs (title, "Get Started") |

Run with `npm run test:e2e` (auto-starts `expo start --web` if not already running) or `npm run test:e2e:ui` for the interactive runner. Config: `playwright.config.ts`.

---

## 6. Sender — Booking Wizard (6-step)

_Updated: 2026-03-19 — covers the new 6-step wizard (migration 018)._

### Entry point

Sender taps **"Book slot →"** on a `RouteCard`. The app navigates to `/(sender)/booking` with the route in `bookingStore.selectedRoute`.

### Step 0 — Itinerary

- Two sections: **Collection stop** + **Drop-off stop**
- Each stop shown as a radio card: city, date, `location_name`, `location_address`
- If only one stop available: auto-selected, shown as read-only
- **Valid when:** `collectionStopId` and `dropoffStopId` are both set
- Changing stop → dispatches `RESET_LOGISTICS` (clears Step 1 selections)

### Step 1 — Logistics

- **Collection method:** radio cards filtered to services linked to the chosen collection stop (`route_stop_id = collectionStop.id`)
- **Delivery method:** radio cards for country-wide delivery services (`route_stop_id IS NULL`)
- **Estimated collection date:** date picker, capped at `collectionStop.stop_date`
- **Valid when:** both service IDs selected + collection date set

### Step 2 — Sender Details

- Toggle: "This is for me" / "On behalf of someone"
- **Own mode:** pre-fills `profile.full_name` + `profile.phone`
- **Address fields:** only shown when collection method = `driver_pickup`; when `sender_dropoff`, shows read-only "Drop off at: [collection stop location_name]"
- **Valid when (own):** name + phone filled; if `driver_pickup`, also address street + city + postal code required
- **Valid when (behalf):** behalf name + phone filled; same address requirement
- Optionally saves back to profile (`updateMyProfile`)

### Step 3 — Recipient

- Saved recipients shown as chips — tapping one auto-fills all fields
- Address fields always shown; label adapts: "Delivery address" vs "Recipient's collection address"
- When delivery method = `recipient_collects`: shows read-only drop-off stop location above address
- **Valid when:** recipient name + phone + full address (street + city + postal code)
- Optionally saves to `recipients` table (`saveRecipient`)
- Driver notes free-text field

### Step 4 — Package

_Unchanged — see `components/booking/PackageStep.tsx`._

- Weight (kg), package types (multi-select), optional photo upload
- **Valid when:** weight > 0, at least one package type selected

### Step 5 — Payment

- Radio cards for payment methods; only methods with `enabled = true` in `route_payment_methods` are active; others shown greyed with "Coming soon" badge
- Launch default: cash on collection only
- **Confirm button:** active when all steps 0–4 are valid

### Submission

1. Validate all steps → highlight first invalid step
2. `INSERT bookings` (all new columns including stop IDs, sender fields, total_price)
3. If `saveRecipient` → `UPSERT recipients`
4. If `updateMyProfile` → `UPDATE profiles`
5. `decrement_route_capacity(routeId, weightKg)` RPC
6. Clear AsyncStorage draft key `booking_draft_{routeId}`
7. Navigate to `/(sender)/booking/confirmation?bookingId={id}`

### Draft persistence

- `useBookingForm` persists form state to AsyncStorage key `booking_draft_{routeId}` on every change (debounced 500ms)
- On next open, if draft exists: prompt "Continue where you left off?" or "Start fresh"
- Draft discarded silently if `routeId` doesn't match

### Confirmation screen

- Animated check mark + `#BOOK-{id}` reference
- Summary card: stops, dates, package, services, recipient, payment method, driver name
- **"Contact Driver on WhatsApp"** deep link using `driver.phone`
- **"View My Bookings"** → bookings list; **"Back to Search"** → home
- Data sourced from `bookingStore.lastBooking` (set at submit) — no re-fetch

