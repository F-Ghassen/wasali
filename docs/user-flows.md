# Wasali — User Flows

_Last updated: 2026-03-22_

**Recent updates:**
- WhereAreYouFrom component redesigned with modern styling and improved UX (2026-03-22)

---

## Overview

Wasali has two user roles. Each role has its own tab bar and flow set.

| Role | Entry point | Core action |
|---|---|---|
| **Sender** | `/(tabs)/index` | Find a driver, book a shipment |
| **Driver** | `/(driver-tabs)/index` | Create a route, manage bookings |

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
  │     ├── __DEV__  →  auto signIn()  →  SIGNED_IN  →  /(tabs)/index
  │     └── prod     →  toast "account already exists"  →  (auth)/login
  └── new email  →  confirmation email sent (Resend SMTP)
        ▼
(auth)/verify-otp
  enter 6-digit code  OR  click email link
        ▼
SIGNED_IN event  →  loadProfile()  →  /(tabs)/index ✓
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
SIGNED_IN  →  loadProfile()  →  /(driver-tabs)/index ✓
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
updateUser()  →  /(tabs)/index ✓
```

---

## 2. Sender Flows

### Tab Bar

```
/(tabs)/
  ├── 🔍 Search     →  /(tabs)/index
  ├── 📦 Bookings   →  /(tabs)/bookings
  ├── 📋 Requests   →  /(tabs)/requests
  ├── ↔️  P2P        →  /(tabs)/p2p
  └── 👤 Profile    →  /(tabs)/profile
```

---

### 2.1 Search & Book a Route

**Home screen:**
```
/(tabs)/index  [Search Routes]
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
/(tabs)/routes/results  [Route List]
  useRouteResults() — two-tier Supabase query (exact city match + country match)
  Tier 1: exact city→city routes (shown first)
  Tier 2: "Other routes in region" (same country pair, different city)
  Sort: Earliest / Cheapest (effective price incl. promo) / Top rated
  Filter: min capacity (kg), max price (€/kg)  — badge shows active filter count
  RouteCard shows: cities, dates, price/kg (strikethrough if promo active), driver rating/trip count
  tap a card
    ▼
/(tabs)/booking/index  [Book Shipment — 6-step accordion]
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
[Confirm & Pay]
  booking insert → bookingStore.lastBooking set → navigate to /booking/confirmation
```

**Booking confirmation screen:**

```
/(tabs)/booking/confirmation
  ├── Animated check icon (spring)
  ├── Booking reference: WSL-XXXXXX
  ├── Summary card (route, dates, weight, recipient, payment, total, driver)
  ├── "What happens next" timeline
  │     Confirmed → In transit → Delivered → Rate & complete  (all pending)
  ├── [Message driver on WhatsApp]
  │     Pre-fills message: full booking summary + deep link
  │     wasali://driver/bookings/{id}  →  driver app booking detail
  ├── [Print shipping label]
  │     Opens ShipmentLabelModal (same as tracking page)
  │     Shows label preview with QR code; Print / Save PDF action
  └── [View my bookings]  /  [← Back to search]
```

---

### 2.2 Booking Lifecycle & Tracking

```
pending           ← driver receives push notification
    │  driver confirms
    ▼
confirmed
    │  driver collects package
    ▼
in_transit
    │  driver marks delivered
    ▼
delivered
    │  [Rate your driver] button shown
    ▼
rated  →  escrow released  →  Stripe Connect payout to driver
```

Tracking screen `/(tabs)/tracking/[bookingId]`:
- Vertical timeline (done ✓ / active ● / pending ○)
- Booking summary (route, dates, weight, total paid)
- Green escrow banner ("Funds held securely")
- Rating card appears at `delivered` status

Dispute path:
```
/(tabs)/tracking/[bookingId]  →  [Open dispute]
    ▼
/post-delivery/dispute/[bookingId]
  describe issue, attach evidence photos
    ▼
disputes row created  →  admin review
```

---

### 2.3 Shipping Requests (Sender Posts, Drivers Bid)

```
/(tabs)/requests  →  [New Request]
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
/(tabs)/p2p  [Hub]
  ├── [Send a document]  →  /(tabs)/p2p/send
  ├── [Carry a document] →  /(tabs)/p2p/carry
  └── 🏆 Leaderboard     →  /(tabs)/p2p/leaderboard
```

**Send a document:**
```
/(tabs)/p2p/send
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
/(tabs)/p2p/carry  [Open requests]
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
/(tabs)/p2p/leaderboard
  Gold / Silver / Bronze podium (top 3 avatars)
  Ranked list — own row highlighted
  Points redeemable: gifts, discounts, partner rewards
```

---

### 2.5 Profile Management

```
/(tabs)/profile
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
/(driver-tabs)/
  ├── 🏠 Dashboard  →  /(driver-tabs)/index
  ├── 🗺  Routes     →  /(driver-tabs)/routes
  ├── 📦 Bookings   →  /(driver-tabs)/bookings
  └── 👤 Profile    →  /(driver-tabs)/profile
```

---

### 3.1 Create a Route (5-step wizard)

```
/(driver-tabs)/routes  →  [+ New Route]
    ▼
/driver/routes/new  [Route Wizard]
```

**Wizard steps:**

```
Step 1 — Collection Stops
  ┌─ Pre-filled with 2 empty stops ─┐
  │  Stop N:                        │
  │    city (EU cities picker)      │
  │    departure date (stop 1 only) │  ← stop 1 date = departure_date
  │    collection date (stop 2+)    │
  │    meeting point URL (optional) │
  └─────────────────────────────────┘
  [+ Add collection stop]  (dashed bordered button, max 8)
  Validation: at least 1 stop with city + country

Step 2 — Drop-off Stops
  ┌─ Pre-filled with 2 empty stops ─┐
  │  Stop N:                        │
  │    city (TN cities picker)      │
  │    estimated arrival (optional) │
  │    meeting point URL (optional) │
  └─────────────────────────────────┘
  [+ Add drop-off stop]  (max 8)
  Info banner: "Arrival dates are estimates"
  Validation: at least 1 stop with city + country

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
/(driver-tabs)/routes
  list of my routes (DriverRouteCard)
  each card: cities, date, capacity bar, bookings count, status badge
  ├── tap card  →  /driver/routes/[id]
  │     view route detail
  │     edit fields (weight, price, notes)
  │     actions: Mark Full | Cancel Route
  └── FAB [+]  →  /driver/routes/new
```

---

### 3.3 Manage Bookings

```
/(driver-tabs)/bookings
  list of bookings on my routes (DriverBookingCard)
  filter: Pending | Confirmed | In Transit | Delivered
    ▼
  tap card  →  /driver/bookings/[id]
    booking detail:
      sender info, package details, photos, logistics
      ├── status: pending   →  [Confirm] / [Reject]
      ├── status: confirmed →  [Mark Collected]
      ├── status: in_transit→  [Mark Delivered]
      └── status: delivered →  awaiting sender rating → escrow release
```

**Driver Dashboard** `/(driver-tabs)/index`:
- Stat cards: active routes, pending bookings, confirmed bookings
- Earnings summary (this month, total)
- Quick actions: New Route, View Bookings

---

### 3.4 Route Templates

```
/(driver-tabs)/routes  →  [Templates]
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
  │          │
  │          └──▶ cancelled
  │          └──▶ completed
  └──▶ cancelled
```

| Status | Trigger |
|---|---|
| `draft` | Route created by wizard (before publish) |
| `active` | Driver publishes route (visible to senders) |
| `full` | Driver marks capacity exhausted |
| `cancelled` | Driver cancels route |
| `completed` | Driver marks trip done |

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
| `cancelled` | Driver or Sender | Cancellation action |
| `disputed` | Sender | Opens dispute after delivery |

---

## 6. Notifications

Push notifications (via `lib/notifications.ts`) + email (Resend) + in-app (notifications table):

| Event | Recipient | Channel |
|---|---|---|
| New booking on route | Driver | push + in-app |
| Booking confirmed | Sender | push + email + in-app |
| Package collected / in transit | Sender | push + email + in-app |
| Package delivered | Sender | push + email + in-app |
| New offer on shipping request | Sender | push + in-app |
| Offer accepted | Driver | push + in-app |
| New P2P carry offer | Document sender | push + in-app |

**Notification delivery pipeline** (`notify-booking-event` Edge Function):
- Triggered by Supabase DB Webhook on `bookings` UPDATE
- Fetches route + recipient profile
- Sends Expo push (native), Resend email (web / notification_email set), inserts notifications row
- `notificationStore` subscribes via Supabase Realtime to receive live inserts

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
| `05_driver_route_cancel.yaml` | Driver: Cancel active route → gone from list |
| `06_driver_mark_full.yaml` | Driver: Mark full → route hidden in sender search |

See `tests/README.md` for setup and run instructions.

---

## 6. Sender — Booking Wizard (6-step)

_Updated: 2026-03-19 — covers the new 6-step wizard (migration 018)._

### Entry point

Sender taps **"Book slot →"** on a `RouteCard`. The app navigates to `/(tabs)/booking` with the route in `bookingStore.selectedRoute`.

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
7. Navigate to `/(tabs)/booking/confirmation?bookingId={id}`

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

