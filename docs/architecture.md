# Wasali — Architecture

_Last updated: 2026-07-26_

> **Core trips & bookings design is authoritative in** `docs/blueprint/trips-and-bookings.md`
> (+ ADRs in `docs/adr/`). The schema diagram below predates several migrations — notably,
> `routes` has **no** `origin_city`/`destination_city`/`origin_country`/`destination_country`
> columns (dropped in migrations 023–025; origin/destination derive from `route_stops → cities`),
> `promo_discount_pct` is deprecated in favor of `promotion_percentage`/`promotion_active`
> (ADR 0002), and the payment model is **cash-only at launch with no escrow** (ADR 0004), not the
> Stripe escrow flow described here. Trust `types/database.ts` and `supabase/schema-changelog.md`
> for the current schema.

**Recent updates:**
- `OriginCountryPicker`'s country-flag cards replaced the flagcdn.com PNG `<Image>` with a locally bundled SVG `FlagIcon` (`components/shared/ui/primitives/FlagIcon.tsx`, source flags in `assets/flags/*.svg` compiled to `lib/flags/flagSvgData.generated.ts` via `npm run flags:generate`) — removes the third-party network dependency and the raster distortion/pixelation that showed on web when a fixed-size PNG was stretched into a card. Also fixed cards rendering only a fraction of the flag (e.g. Germany showing solid red): `preserveAspectRatio` switched from "slice" (cover, crops to fill) to "meet" (contain, always shows the whole flag), and `countryCard` gained a `maxWidth` cap so a single card can no longer stretch to an extreme aspect ratio when few countries have routes. Card rendering extracted to `components/home/CountryCard.tsx` (SoC — animation state in `components/home/hooks/useCountryCardAnimation.ts`); added entrance stagger, sheen sweep, press scale, and web hover lift. The section also now guarantees at least 4 visible cards, backfilling with a static fallback list (Tunisia, Germany, France, Italy at 0 routes) when fewer countries have active routes (2026-07-26)
- Fixed "Unmatched Route" crash on the sender home page's country-flag cards: 4 `router.push` calls (`OriginCountryPicker`, `RouteAlertSubscription`, `FeaturedRoutes`, `NotificationList`) and the root `<Stack.Screen>` registrations still targeted the pre-rename `(tabs)`/`(driver-tabs)` route groups; the 2026-07-13 rename to `(sender)`/`(driver)` had missed them. All now point at the correct groups (2026-07-26)
- Driver route wizard, sender p2p send, and shipping-request creation no longer hardcode a binary EU-vs-Tunisia city split (`country === 'Tunisia'` string checks in `app/driver/routes/new.tsx`, `app/(sender)/p2p/send.tsx`, `app/shipping-requests/new.tsx`). Destination/dropoff pickers now dynamically exclude whatever country was already picked for origin/pickup, so any country/city added to the `cities` table (via a future migration) becomes selectable everywhere with no further code changes (2026-07-26)
- Added Playwright for web E2E (`playwright.config.ts`, `tests/e2e/`), complementing Maestro's native-only coverage (2026-07-14)
- Corrected stale route-group names; added pointers to the trips & bookings blueprint and ADRs;
  flagged the pre-migration schema diagram and cash-only payment model (2026-07-13)
- `FeaturedRoutes` refactored (SoC): types → `types/featured-route.ts`; API → `services/featuredRoutesService.ts`; state/animation → `hooks/useFeaturedRoutes.ts`; card UI → `components/featured/FeaturedRouteCard.tsx`; modal UI → `components/featured/RouteDetailsModal.tsx`; orchestrator `FeaturedRoutes.tsx` reduced to ~60 lines (2026-03-23)
- `DriverRouteCard` refactored: derived state extracted to `hooks/useDriverRouteCard.ts`; city names resolved via `citiesStore`; `as any` casts removed (2026-03-23)
- WhereAreYouFrom component redesigned with modern Uber-inspired styling (2026-03-22)

## Infrastructure

Cloud resources are managed as code in [`terraform/`](../terraform/). See [`docs/infrastructure.md`](./infrastructure.md) for the full infrastructure diagram, service details, and runbook.

**Stack:** Supabase (DB + Auth + Edge Functions) · Vercel (web SPA) · Stripe (escrow payments + Connect) · Resend (email)

## Test Architecture

```
tests/
  helpers.ts              # adminClient, createTestUser, cleanupUser, seedRoute, TEST_ROUTE
  seed-test-data.ts       # CLI script — seeds driver + sender + route, prints env vars
  README.md               # How to run each test layer
  unit/                   # Vitest unit tests (no network)
  integration/            # Vitest integration tests (requires local Supabase)
  e2e/                    # Playwright specs (web build, browser-driven)
    home.spec.ts          # Welcome screen smoke test

.maestro/
  config.yaml             # appId: host.exp.Exponent
  _login_driver.yaml      # Reusable driver sign-in sub-flow
  _login_sender.yaml      # Reusable sender sign-in sub-flow
  01_driver_create_route.yaml   # Driver wizard → publish route
  02_sender_search_and_book.yaml# Sender search → book → tracking screen
  03_driver_booking_lifecycle.yaml # Pending → Confirmed → In transit → Delivered
  04_sender_tracking.yaml       # Sender tracking timeline + Print Label
  05_driver_route_cancel.yaml   # Cancel active route
  06_driver_mark_full.yaml      # Mark route full → invisible in sender search

playwright.config.ts      # Web E2E config — boots `expo start --web`, drives Chromium
```

### Test layers

| Layer | Tool | Requires network |
|-------|------|-----------------|
| Unit | Vitest | No |
| Integration | Vitest + supabase-js admin | Local Supabase (`supabase start`) |
| E2E (native) | Maestro | Local Supabase + Expo dev server + simulator |
| E2E (web) | Playwright | Expo web dev server (auto-started by config) |

### helpers.ts

- `adminClient` — service-role Supabase client; bypasses RLS
- `createTestUser(role)` — creates a confirmed user, returns `{ userId, email, password, client }` where `client` is pre-authenticated with a server-side session
- `cleanupUser(userId)` — deletes auth user (cascades to profile)
- `seedRoute(driverUserId, overrides?)` — inserts an active route, returns route id
- `cleanupRoute(routeId)` — deletes route (bookings cascade via FK)

---

## High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT  (Expo App)                           │
│                                                                       │
│  ┌────────────┐   ┌───────────────┐   ┌─────────┐   ┌─────────────┐ │
│  │  Screens   │◀─▶│ Zustand Stores│◀─▶│   lib/  │   │   utils/    │ │
│  │  app/      │   │  authStore    │   │supabase │   │ validators  │ │
│  │  (sender)/   │   │  bookingStore │   │ stripe  │   │ formatters  │ │
│  │  (driver-  │   │  driverRoute  │   │notifications│ │ imageUpload │ │
│  │   tabs)/   │   │  searchStore  │   └────┬────┘   └─────────────┘ │
│  │  driver/   │   │  requestStore │        │                         │
│  │  (auth)/   │   │  uiStore      │        │                         │
│  └────────────┘   └───────────────┘        │                         │
└────────────────────────────────────────────┼─────────────────────────┘
                                             │ HTTPS / Realtime WSS
          ┌──────────────────────────────────┼──────────────────────┐
          │                  SUPABASE (BaaS)  │                      │
          │                                  │                      │
          │  ┌─────────────┐   ┌─────────────▼──────┐               │
          │  │  Auth (JWT) │   │   PostgREST API     │               │
          │  │  email OTP  │   │   + Realtime subs   │               │
          │  └──────┬──────┘   └─────────┬──────────┘               │
          │         │                    │                           │
          │  ┌──────▼────────────────────▼────────────────────────┐ │
          │  │                  PostgreSQL                         │ │
          │  │  cities · profiles · routes · route_stops · bookings│ │
          │  │  shipping_requests · offers · ratings · disputes   │ │
          │  │  saved_addresses · route_templates · p2p_*         │ │
          │  └────────────────────────────────────────────────────┘ │
          │                                                          │
          │  ┌─────────────────────┐   ┌───────────────────────┐    │
          │  │  Storage Buckets    │   │    Edge Functions     │    │
          │  │  avatars            │   │  create-payment-intent│    │
          │  │  package-photos     │   │  stripe-webhook       │    │
          │  │  dispute-evidence   │   │  capture-payment      │    │
          │  │  flags              │   │  accept-offer         │    │
          │  └─────────────────────┘   │  notify-booking-event │    │
          │                            └───────────┬───────────┘    │
          └────────────────────────────────────────┼────────────────┘
                                                   │
                         ┌─────────────────────────▼──────────────┐
                         │                  STRIPE                  │
                         │  PaymentIntent (capture_method: manual)  │
                         │  Stripe Connect (driver payouts)         │
                         │  Webhooks                                │
                         └──────────────────────────────────────────┘
```

---

## Client Architecture

### Entry Point & Routing — Expo Router (file-based)

The app uses Expo Router v3 with filesystem-based routing. Entry point is `index.ts → expo-router/entry`.

```
app/
├── index.tsx                   ← root redirect gate (auth + role check)
├── _layout.tsx                 ← StripeProvider + auth listener bootstrap
├── dev.tsx                     ← dev navigator (all routes visible)
│
├── (auth)/                     ← unauthenticated group
│   ├── welcome.tsx             ← landing: Get Started / Sign In
│   ├── sign-up.tsx             ← sender registration
│   ├── sign-up-driver.tsx      ← driver registration (role: 'driver')
│   ├── login.tsx               ← email + password
│   ├── verify-otp.tsx          ← 6-digit OTP or magic link
│   ├── forgot-password.tsx     ← sends reset email
│   └── reset-password.tsx      ← new password after reset link
│
├── (sender)/                     ← sender tab bar (persistent nav)
│   ├── index.tsx               ← Search Routes home
│   ├── bookings.tsx            ← sender's bookings list
│   ├── requests.tsx            ← shipping requests I posted
│   ├── profile.tsx             ← profile hub
│   ├── routes/results.tsx      ← search results (hidden tab)
│   ├── booking/index.tsx       ← 5-step booking accordion (hidden tab)
│   ├── tracking/[bookingId].tsx← shipment tracking timeline (hidden tab)
│   └── p2p/                   ← P2P document network
│       ├── index.tsx           ← hub (visible tab)
│       ├── send.tsx            ← post a document request
│       ├── carry.tsx           ← browse & offer to carry
│       └── leaderboard.tsx     ← points leaderboard
│
├── (driver)/              ← driver tab bar (persistent nav)
│   ├── index.tsx               ← driver dashboard
│   ├── routes.tsx              ← my routes list
│   ├── bookings.tsx            ← bookings on my routes
│   └── profile.tsx             ← driver profile
│
├── driver/
│   ├── routes/new.tsx          ← 5-step route creation wizard
│   ├── routes/[id].tsx         ← route detail + management
│   └── bookings/[id].tsx       ← booking detail (confirm/reject/deliver)
│
├── bookings/[id].tsx           ← sender booking detail
├── shipping-requests/
│   ├── new.tsx                 ← create shipping request
│   └── [id].tsx                ← request detail + offers
├── post-delivery/
│   ├── rate/[bookingId].tsx    ← rate the driver (1–5 stars)
│   └── dispute/[bookingId].tsx ← open a dispute
└── profile/
    ├── edit.tsx
    ├── addresses.tsx
    ├── add-address.tsx
    └── notifications.tsx
```

**Dual-role redirect logic** (`app/index.tsx` + `app/_layout.tsx`):
```
session?  →  NO   →  (auth)/welcome
           →  YES  →  loadProfile()
                         │
                         ├── role === 'driver'  →  /(driver)/index
                         └── role === 'sender'  →  /(sender)/index
```

---

## State Management — Zustand Stores

| Store | File | Responsibility |
|---|---|---|
| `authStore` | `stores/authStore.ts` | Session, profile, signUp/signIn/signOut/OTP |
| `searchStore` | `stores/searchStore.ts` | Route search params & results |
| `bookingStore` | `stores/bookingStore.ts` | Active booking wizard state + price calculation |
| `driverRouteStore` | `stores/driverRouteStore.ts` | Driver route CRUD, templates, filters |
| `driverBookingStore` | `stores/driverBookingStore.ts` | Driver booking views, status transitions, earnings stats, route analytics |
| `notificationStore` | `stores/notificationStore.ts` | In-app notifications, unread count, Realtime subscription |
| `requestStore` | `stores/requestStore.ts` | Shipping requests & offers lifecycle |
| `uiStore` | `stores/uiStore.ts` | Toast queue, global loading state |

Key patterns:
- **Computed price** in `bookingStore.computePrice()`: basePrice + logistics surcharges (pickup, delivery, postal)
- **Templates** in `driverRouteStore.applyTemplate()`: pre-fill wizard from saved route template
- **Draft persistence** in `driver/routes/new.tsx`: AsyncStorage save/restore with 48h TTL

---

## Route Search — Tiering Model

Implemented in `hooks/useRouteResults.ts`. Tested in `tests/unit/search-flow.test.ts` and `tests/integration/search-routes.test.ts`.

### Overview

Searching **Berlin → Tunis** shows two sections:

| Section | Label | Contents |
|---|---|---|
| **tier1** | *(unlabelled, shown first)* | Routes that have a **Berlin collection stop** AND a **Tunis dropoff stop** |
| **tier2** | "Other routes in region" | Germany → Tunisia routes with a different origin or destination city (Hamburg → Sfax, Munich → Sousse, Frankfurt → Tunis, etc.) |

### Pipeline

```
DB query
  └─ .eq('status', 'active')
  └─ .gt('available_weight_kg', 0)
  └─ .or('departure_date.gte.FLOOR, departure_date.is.null')
       ↓
In-memory filter  (country-level — keeps both tier1 and tier2 candidates)
  └─ origin:  any collection stop whose city.country === 'Germany'
  └─ dest:    any dropoff stop whose city.country === 'Tunisia'
       ↓
splitTiers()  (city-level split)
  └─ tier1:  route has collection stop city_id === BERLIN
             AND dropoff stop city_id === TUNIS
  └─ tier2:  everything else that passed the country filter
       ↓
applyFilters()  (capacity / price overrides)
sortRoutes()    (earliest / cheapest / top_rated)
```

### Key rules

- **Multi-stop routes** — `some()` is used, not `find()`, so a route that collects in Frankfurt *and* Berlin is correctly placed in tier1 when searching Berlin.
- **Date floor** — when no date is selected, the floor defaults to today. Routes with `departure_date IS NULL` are always included (treated as upcoming).
- **Country-only search** — when `originCityId` is absent (user tapped a country card instead of a city), the origin constraint is skipped and all routes going to the destination country land in tier1.
- **No destination** — when `destCityId` is absent, all results go to tier1 with no tier2.

### `searchStore` fields

| Field | Type | Default | Meaning |
|---|---|---|---|
| `fromCityId` | `string` | `''` | Selected origin city UUID |
| `fromCityName` | `string` | `''` | Display name |
| `fromCountry` | `string` | `''` | Country (for country-level searches) |
| `toCityId` | `string` | `''` | Selected destination city UUID |
| `toCityName` | `string` | `''` | Display name |
| `toCountry` | `string` | `''` | Country |
| `departFromDate` | `string \| null` | `null` | ISO date floor, or `null` = any date |

---

## Database Schema

### Entity Relationship

```
auth.users  (Supabase managed)
    │  handle_new_user trigger → INSERT profiles
    ▼
profiles ─────────────────────────────────────────────────────────┐
  id, full_name, phone, avatar_url, role,                         │
  stripe_customer_id, stripe_connect_account_id                   │
    │                                                             │
    ├──▶ routes  (driver_id → profiles.id)                        │
    │     id, origin_city, origin_country,                        │
    │     destination_city, destination_country,                  │
    │     departure_date, estimated_arrival_date,                 │
    │     available_weight_kg, min_weight_kg (nullable),          │
    │     price_per_kg_eur,                                       │
    │     status (draft|active|full|cancelled|completed),         │
    │     notes, payment_methods[],                               │
    │     promo_discount_pct, promo_expires_at, promo_label,       │
    │     logistics_options jsonb, prohibited_items text[],        │
    │     └──▶ route_stops                                        │
    │           city, country, stop_order, stop_type,             │
    │           arrival_date, meeting_point_url,                  │
    │           is_pickup_available, is_dropoff_available         │
    │     └──▶ bookings (route_id, sender_id → profiles.id)       │
    │           package_weight_kg, category, photos[],            │
    │           pickup_type, pickup_address,                      │
    │           dropoff_type, dropoff_address,                    │
    │           price_eur, status, payment_status,                │
    │           stripe_payment_intent_id                          │
    │               └──▶ ratings (booking_id)                     │
    │               └──▶ disputes (booking_id)                    │
    │                                                             │
    ├──▶ route_templates  (driver_id)                             │
    │     name, origin_city, destination_city,                    │
    │     available_weight_kg, price_per_kg_eur,                  │
    │     payment_methods[], logistics_options jsonb               │
    │                                                             │
    ├──▶ shipping_requests  (sender_id)                           │
    │     origin_city, destination_city, dates,                   │
    │     weight_kg, max_budget_eur, status                       │
    │     └──▶ shipping_request_offers  (driver_id) ──────────────┘
    │
    ├──▶ p2p_requests  (sender_id)
    │     document_type, urgency, points_offered
    │     └──▶ p2p_carries  (carrier_id)
    │               delivery confirmed → points credited
    │
    └──▶ saved_addresses  (user_id)
```

### Migration History

| File | Change |
|---|---|
| `005_driver_role.sql` | `profiles.role` column + 9 driver RLS policies |
| `006_route_wizard.sql` | `payment_methods[]`, promo fields, `route_templates` table |
| `007_logistics_options.sql` | `logistics_options jsonb` on routes |
| `008_prohibited_items.sql` | `prohibited_items text[]` on routes |
| `009_min_weight.sql` | `min_weight_kg` (nullable) on routes |
| `010_driver_route_publish.sql` | `draft` status; driver INSERT/UPDATE/SELECT RLS on routes & stops |
| `20260317_booking_status_pending.sql` | Booking status pending transitions |

### RLS Policy Model

| Table | Rule |
|---|---|
| `profiles` | User reads/updates own row only |
| `routes` | Authenticated users read `active` routes; driver reads/inserts/updates own routes (all statuses) |
| `route_stops` | Authenticated users read all stops; driver inserts/updates/deletes stops on own routes |
| `bookings` | Sender reads own; driver reads where `route_id` matches |
| `shipping_requests` | Public read (open); sender manages own |
| `p2p_requests` | Public read (open); sender manages own |
| `p2p_carries` | Carrier inserts own; sender reads offers |
| All tables | `service_role` bypasses RLS (used by Edge Functions) |

---

## Auth Flow

```
signUp(email, password, { full_name, role })
  └─▶ Supabase creates auth.users row
  └─▶ handle_new_user trigger → INSERT profiles (role from metadata)
  └─▶ confirmation email sent via Resend SMTP

verifyOtp(email, token)  OR  detectSessionInUrl (web)
  └─▶ JWT created → stored in SecureStore (native) / AsyncStorage (web)
  └─▶ onAuthStateChange fires SIGNED_IN → _layout.tsx
  └─▶ loadProfile() → router.replace based on role

signOut()
  └─▶ Supabase clears session
  └─▶ SIGNED_OUT → router.replace('/(auth)/welcome')
  └─▶ all stores reset

Dev shortcut (duplicate email in __DEV__)
  └─▶ auto-calls signIn() → SIGNED_IN → role-based tab
```

Session bootstrap in `_layout.tsx`:
- Awaits `loadProfile()` with 5 s timeout before routing
- `detectSessionInUrl: true` on web handles email magic links
- Spinner shown while session/profile are loading

---

## Payment Flow (Escrow)

```
Client                          Edge Function              Stripe
  │                                  │                       │
  │── POST /create-payment-intent ──▶│                       │
  │   { bookingId, amountEur }       │── createPaymentIntent ─▶
  │                                  │   capture_method: manual
  │◀── { clientSecret } ────────────│◀──────────────────────│
  │                                  │                       │
  │── stripe.confirmPayment() ──────────────────────────────▶│
  │◀── authorized (not yet captured)────────────────────────│
  │   booking.payment_status = 'paid'                        │
  │   booking.status = 'confirmed'                           │
  │                                  │                       │
  │   [driver marks delivered]       │                       │
  │                                  │                       │
  │── POST stripe-webhook ──────────▶│                       │
  │   event: booking status update   │── capturePaymentIntent─▶
  │                                  │◀── funds captured ────│
  │   [Stripe Connect payout to driver's account]            │
```

Supported payment methods (driver-configurable per route):
- `cash_sender` — sender pays cash at collection
- `cash_recipient` — recipient pays cash on delivery
- `paypal` — PayPal transfer
- `bank_transfer` — Bank transfer
- Stripe card (online escrow)

> **Current reality vs. this diagram (2026-07-27):** the diagram above
> describes the intended full flow once card payments ship. Today,
> `bookingSubmitSchema` (`utils/validators.ts`) only accepts
> `cash_on_collection`/`cash_on_delivery` at submit time, `create-payment-intent`
> is never called from the client, `STRIPE_SECRET_KEY` isn't even configured
> as a project secret, and no booking ever gets a `stripe_payment_intent_id`.
> `capture-payment` (invoked by the driver's "Mark as Delivered") previously
> assumed every booking had one and required it unconditionally — so that
> button 422'd for **every** booking in the system (100% of current traffic
> is cash). Fixed: the function now checks `payment_type` and, for cash
> bookings, skips the Stripe capture step entirely and just flips the
> booking to `delivered` directly (cash already changed hands physically —
> there's no escrow to release). The `Stripe` client itself was also moved
> from module-scope (constructed unconditionally on every invocation,
> crashing immediately given the missing secret) to lazily constructed only
> inside the non-cash branch, so a card-payment booking failing for a real
> Stripe reason doesn't take cash bookings down with it.

---

## Component Architecture

```
components/
├── ui/               ← Atomic, stateless, design-system primitives
│   ├── Button        ← variant: primary | secondary | outline | ghost
│   ├── Input         ← label + error state
│   ├── DateInput     ← calendar picker (react-native-datetimepicker)
│   ├── CityPickerInput← searchable list with country flags
│   ├── URLInput      ← URL validation + paste
│   ├── Toast         ← queued notifications (success/error/info)
│   ├── StatusBadge   ← booking/route status chip
│   ├── EmptyState    ← blank state with icon + message
│   └── Skeleton      ← loading placeholder
│
├── booking/          ← Booking wizard sub-components
│   ├── BookingCard   ← summary card in list views
│   ├── OrderSummary  ← live price breakdown (base + logistics surcharges)
│   └── StepIndicator ← wizard step dots
│
├── route/
│   └── RouteCard     ← search result card (date, cities, price, weight)
│
├── driver/           ← Driver-specific
│   ├── DriverRouteCard   ← route management (status, capacity bar)
│   ├── DriverBookingCard ← booking action card (confirm/reject/deliver)
│   ├── RouteSummaryCard  ← live route summary with earnings estimate
│   ├── EarningsSummary   ← earnings dashboard widget
│   └── StatCard          ← KPI card (bookings, routes, earnings)
│
├── WhereAreYouFrom   ← Home screen: Top destination countries carousel
│   - Badge: "DESTINATIONS" pill above title
│   - Title & subtitle with improved hierarchy (FontSize.2xl, fontWeight: 800)
│   - **Card Design**: Full background images (country flags) with overlaid text
│   - **Flag Images**: Sourced from Supabase storage (`/flags` bucket)
│   - **Image Service**: `lib/flagImages.ts` generates URLs from country names
│   - **Fallback**: Defaults to flagcdn.com CDN if storage unavailable
│   - Desktop: 140px height cards, text overlay bottom-right with white text
│   - Mobile: 140px height 2-column grid, same overlay pattern
│   - Semi-transparent dark overlay (rgba 0,0,0,0.35-0.4) for text contrast
│   - Route count badge: white bg with opacity, pill-shaped
│   - Mobile: ArrowRight hint icon white (bottom-right corner)
│   - Loading: Skeleton loaders matching 140px card dimensions
│   - Empty: Lock icon + "No routes yet" message
│   - "See All" CTA: full-width outline button with border + arrow icon
│   - **Setup**: See [FLAG_IMAGES_SETUP.md](./FLAG_IMAGES_SETUP.md) for uploading flag images to Supabase
│
└── tracking/
    └── ShipmentLabelModal← printable shipping label with QR code
```

---

## Design System

Colors follow an Uber-style black + blue palette:

| Token | Value | Use |
|---|---|---|
| `Colors.primary` | `#000000` | Buttons, active states |
| `Colors.secondary` | `#276EF1` | Links, info states |
| `Colors.success` | `#05944F` | Confirmed, delivered |
| `Colors.warning` | `#FFC043` | Pending, in-transit |
| `Colors.error` | `#E11900` | Errors, cancelled |
| `Colors.gold` | `#C9A227` | P2P points, premium |

Spacing scale: `xs(4) sm(8) md(12) base(16) lg(20) xl(24) 2xl(32)`
Font sizes: `xs(11) sm(13) base(15) md(16) lg(18) xl(20) 2xl(24)`

---

## Key Libraries

| Library | Version | Use |
|---|---|---|
| `expo` | ~55.0.6 | Native runtime + toolchain |
| `expo-router` | ~55.0.5 | File-based navigation |
| `react-native` | 0.83.2 | Native UI layer |
| `@supabase/supabase-js` | ^2.99.2 | DB, Auth, Storage, Realtime |
| `zustand` | ^5.0.12 | Client state management |
| `zod` | ^4.3.6 | Schema validation (use `.number().min()` not v3 syntax) |
| `react-hook-form` | ^7.71.2 | Form state + validation integration |
| `@stripe/stripe-react-native` | 0.58.0 | Payment UI (native only; stubbed on web) |
| `date-fns` | ^4.1.0 | Date formatting/arithmetic |
| `lucide-react-native` | ^0.577.0 | Icon system |
| `@gorhom/bottom-sheet` | ^5.2.8 | Bottom sheets |
| `expo-secure-store` | ~55.0.8 | JWT storage (native) |
| `@react-native-async-storage` | ^2.2.0 | JWT storage (web) + draft persistence |
| `react-native-qrcode-svg` | ^6.3.21 | Shipping label QR codes |

---

## Web-Specific Adaptations

| Issue | Solution |
|---|---|
| `@stripe/stripe-react-native` crashes on web | `metro.config.js` resolves it to `lib/stripe-native-stub.ts` |
| Email confirmation magic link | `detectSessionInUrl: true` on Supabase client (web only) |
| Token storage | `SecureStore` on native, `AsyncStorage` on web |
| `Alert.alert` not available on web | Replaced throughout with `useUIStore().showToast` |
| SSR hydration errors | `app.json` web output `"single"` (SPA mode) |
| Deno types conflict | `supabase/functions/` excluded from root `tsconfig.json` |

---

## Booking Wizard Architecture (Migration 018)

_Added: 2026-03-19_

### Component tree

```
app/(sender)/booking/bookingCreation/index.tsx  ← wizard shell
  ├─ hooks/useRouteData.ts            ← parallel fetch: route + stops + services + payment methods
  ├─ hooks/useBookingForm.ts          ← useReducer + AsyncStorage draft, stepValidity, totalPrice
  ├─ hooks/useSavedRecipients.ts      ← fetch/upsert recipients
  ├─ stores/bookingStore.ts           ← submitBooking, isLoading, lastBooking
  │
  ├─ components/booking/creation/ItineraryStep.tsx    ← Step 0: pick collection + dropoff stop
  ├─ components/booking/creation/LogisticsStep.tsx    ← Step 1: collection/delivery service + date
  ├─ components/booking/creation/SenderStep.tsx       ← Step 2: sender details + conditional address
  ├─ components/booking/creation/RecipientStep.tsx    ← Step 3: recipient + address + notes
  ├─ components/booking/creation/PackageStep.tsx      ← Step 4: weight, types, photos (uploads to
  │                                                      `package-photos` on pick — see Driver
  │                                                      Booking Detail § Package photos)
  ├─ components/booking/creation/PaymentStep.tsx      ← Step 5: payment method selection
  ├─ components/booking/creation/OrderSummary.tsx     ← sidebar (wide) / footer summary
  │
  ├─ components/booking/PaymentOption.tsx    ← reusable radio card for payment method

app/(sender)/booking/confirmation.tsx
  └─ bookingStore.lastBooking           ← data source (no re-fetch)
```

> Note (2026-07-27): this diagram previously listed stale paths (pre-dating
> the `components/booking/creation/` reorg) and flagged `PackageStep.tsx` as
> "DO NOT MODIFY" with no rationale on record (checked git history — no
> commit or doc explains it). It was modified to wire up real photo uploads,
> which the multi-category/photo-gallery driver-detail work required —
> flagging here in case there was undocumented context behind that note.

### State management

| Concern | Owner |
|---------|-------|
| Route data (stops, services, payment methods) | `useRouteData` hook (local state) |
| Form fields across all 6 steps | `useBookingForm` hook (useReducer + AsyncStorage) |
| Saved recipients list | `useSavedRecipients` hook (local state) |
| Submit loading / error / lastBooking | `bookingStore` (Zustand) |
| Selected route (passed from search) | `bookingStore.selectedRoute` (Zustand) |

### Cascade reset logic

| Trigger | Action |
|---------|--------|
| User changes collection stop (Step 0) | `RESET_LOGISTICS` — clears `collectionServiceId`, `deliveryServiceId`, `estimatedCollectionDate` |
| User changes collection method from `driver_pickup` to other | `RESET_SENDER_ADDRESS` — clears `senderAddressStreet/City/PostalCode` |

### Step validity rules

```
Step 0: collectionStopId && dropoffStopId
Step 1: collectionServiceId && deliveryServiceId
Step 2: (name + phone ≥5 chars) && IF driver_pickup: (street + city + postal code)
Step 3: recipientName + recipientPhone ≥5 chars
         AND IF driver_delivery: (street + city)   ← address only needed for door delivery
         (recipient_collects / local_post → no address required)
Step 4: weight > 0 && packageTypes.length > 0
Step 5: always true (payment type defaults to cash_on_collection)
```

### City sync effects

`senderAddressCity` and `recipientAddressCity` are **read-only** — locked to the city of the selected stop. Two `useEffect`s in `booking/index.tsx` enforce this:

```typescript
// Guard against draft-load race: include both values in deps so the effect
// re-runs if LOAD_DRAFT resets the city while the stop city is unchanged.
useEffect(() => {
  if (fs.collectionStopCity && fs.senderAddressCity !== fs.collectionStopCity)
    setField({ senderAddressCity: fs.collectionStopCity });
}, [fs.collectionStopCity, fs.senderAddressCity]);

useEffect(() => {
  if (fs.dropoffStopCity && fs.recipientAddressCity !== fs.dropoffStopCity)
    setField({ recipientAddressCity: fs.dropoffStopCity });
}, [fs.dropoffStopCity, fs.recipientAddressCity]);
```

### DB constraint mapping

`bookings` has legacy two-value CHECK constraints. The new service types map as follows before insert:

| `collectionServiceType` | `pickup_type` (DB) |
|---|---|
| `driver_pickup` | `driver_pickup` |
| anything else | `sender_dropoff` |

| `deliveryServiceType` | `dropoff_type` (DB) |
|---|---|
| `recipient_collects` | `recipient_pickup` |
| anything else | `home_delivery` |

### Price computation

Shipping-price formula lives in `utils/pricing.ts` (`computeShippingPrice`) —
extracted from what was previously an inline function in
`hooks/useBookingForm.ts`, so both the sender's booking-creation wizard and
the driver's mid-pickup weight adjustment (`driverBookingStore.adjustPackageWeight`,
see Driver Booking Detail below) share one source of truth.
`useBookingForm.ts` re-exports it as `computeTotalPrice` for existing callers.

```typescript
effectiveRate = promotion_active
  ? price_per_kg_eur * (1 - promotion_percentage / 100)
  : price_per_kg_eur

shippingPrice = Math.round(
  (weightKg * effectiveRate + collectionServicePrice + deliveryServicePrice) * 100
) / 100
```

### AsyncStorage draft key

```
booking_draft_{routeId}   ← full BookingFormState, persisted on SET (debounced 500ms)
```

### Payment step gating

`constants/paymentMethods.ts` is the single catalogue for every payment
type (`cash_on_collection`, `cash_on_delivery`, `credit_debit_card`,
`paypal`, `bank_transfer`) — replaces the previously duplicated
`ALL_PAYMENT_TYPES`/`PLATFORM_COMING_SOON` (sender's `PaymentStep.tsx`) and
`MANUAL_PAYMENT_TYPES` (driver's booking detail screen) local constants.
`resolvePaymentMethods(routePaymentMethods)` crosses it against a route's
config to compute what's actually selectable. Two layers of enablement:

| Layer | Owner | Mechanism |
|---|---|---|
| Platform | `constants/paymentMethods.ts` `platformComingSoon` flag | `credit_debit_card`/`paypal`/`bank_transfer` always shown but disabled with "Coming soon" badge, regardless of driver config |
| Driver | DB `route_payment_methods` table | `enabled` flag per route; falls back to `{ cash_on_collection: true, cash_on_delivery: true }` when no rows |

The same catalogue backs the driver's booking-detail "Accepted payment
methods" reference row (`components/driver/bookings/PaymentTrackingCard.tsx`)
— informational only, since the booking's `payment_type` is locked in at
booking time and isn't editable from that screen.

### Logistics step service labels

Raw `service_type` values are mapped to human-readable labels before display:

```
sender_dropoff     → "Drop-off at meeting point"
driver_pickup      → "Driver pickup"
recipient_collects → "Recipient self-collects"
driver_delivery    → "Door delivery"
local_post         → "Local post"
```

This mapping lives in both `ServiceOption.tsx` (`SERVICE_LABEL`) and `booking/index.tsx` (`SERVICE_TYPE_LABEL`) for the completed-step summary chip.

### Stop location fields

`route_stops` rows have `location_name` and `location_address` (used as meeting point URL). These are set in the driver route wizard (Steps 1 & 2) and surfaced in the sender booking wizard:

- **Sender drop-off** (`sender_dropoff`) → collection stop's `location_name` + `location_address`
- **Recipient self-collect** (`recipient_collects`) → dropoff stop's `location_name` + `location_address`
- `location_address` starting with `http` renders as a tappable "View on map" link in `ServiceOption.tsx`

---

## Confirmation Screen

`app/(sender)/booking/confirmation.tsx` — shown after successful booking submit.

### Data source

`bookingStore.lastBooking` (set by `booking/index.tsx` after submit succeeds). No re-fetch.

### Features

| Feature | Implementation |
|---|---|
| Booking reference | `WSL-{bookingId.slice(0,6).toUpperCase()}` |
| Summary card | Route, dates, weight, recipient, payment, total, driver name |
| Tracking timeline | Static 4-step preview (Confirmed → In transit → Delivered → Rate & complete) — all pending style |
| Print shipping label | Opens `ShipmentLabelModal` (same component as tracking page) with QR code + Print/PDF action |
| Message driver on WhatsApp | Pre-filled message with full booking summary + `wasali://driver/bookings/{id}` deep link; opens WhatsApp |
| View my bookings | Navigates to `/(sender)/bookings` |

### WhatsApp deep link format

```
wasali://driver/bookings/{bookingId}
```

Opens the Wasali driver app directly on the booking detail screen where the driver can confirm or decline.

---

## Driver Booking Detail

`app/driver/bookings/[id].tsx` — split into the project's standard SoC layout, mirroring `app/(sender)/booking/bookingDetail/`.

### File structure

```
app/driver/bookings/
├── [id].tsx                       # screen shell — layout + composition only
├── hooks/
│   ├── useDriverBookingActions.ts # confirm/reject/deliver/mark-paid (ConfirmActionModal state, not Alert)
│   └── useWeightAdjustment.ts     # weight-confirm modal state + adjustPackageWeight → markInTransit
├── utils/routeCities.ts           # origin/destination city + flag derivation from route_stops
└── types/index.ts                 # DriverBookingDetail view-model type

components/driver/bookings/
├── BookingNavBar.tsx, SenderInfoCard.tsx, RecipientInfoCard.tsx, TripInfoCard.tsx,
├── PackageInfoCard.tsx, PackagePhotoGallery.tsx, LogisticsInfoCard.tsx, PayoutCard.tsx,
├── PaymentTrackingCard.tsx, WeightConfirmModal.tsx, DisputedBanner.tsx,
├── CancellationBanner.tsx, BookingActionsCard.tsx
```

### Data source

`driverBookingStore.fetchBookings` — the `bookings` select was extended (additive,
no breaking effect on existing callers) to also pull `route_stops` (+ `cities`),
`route_payment_methods`, and the sender's `rating`/`completed_trips`, so the
detail screen no longer needs a second fetch for trip cities or payment config.

### Info parity with the sender's booking detail screen

Previously the driver screen only showed sender name/phone, package
category/weight/declared-value, and pickup/delivery type — recipient contact,
trip dates/cities, the driver's actual payout, and cancellation reasons were
all either missing or silently swallowed. Now surfaced:

| Card | Data |
|---|---|
| `SenderInfoCard` | name, phone, rating + completed trips (or a "No rating yet" badge when `rating` is still its `0` default) |
| `TripInfoCard` | origin/destination city + flag, departure/estimated-arrival dates |
| `PackageInfoCard` | **all** selected categories as chips (`package_categories`, not just the first — see Booking Wizard Architecture below), weight, declared value, estimated collection date, requested-on date (`created_at`) |
| `PackagePhotoGallery` | package photos, resolved to signed URLs on view (see below) |
| `LogisticsInfoCard` | pickup/delivery type, addresses, note from sender (`driver_notes` — previously mislabeled "Sender notes") |
| `RecipientInfoCard` | name, phone (call + WhatsApp), address |
| `PayoutCard` | `driver_payout_eur` ("You'll receive") vs. `price_eur` ("Sender paid") — the two diverge once `driver_commission_rate_pct` > 0 |
| `PaymentTrackingCard` | manual cash tracking + accepted-payment-methods reference row (see Payment step gating above) |
| `DisputedBanner` / `CancellationBanner` | shown for `disputed`/`cancelled` statuses — previously an empty action area with no explanation |

### Package photos — private bucket, signed URLs on view

`package-photos` already existed as a storage bucket (created at initial
project setup) but was never wired to any upload code — `PackageStep.tsx`
stored raw local `file://` device URIs directly into `package_photos`,
meaningless off the sender's own device. Now:

- `PackageStep.tsx` uploads each photo immediately on picking (`uploadImage`,
  `utils/imageUpload.ts`) while keeping the local URI for instant preview —
  `photos` (preview) and `photoPaths` (uploaded storage paths, aligned by
  index) are tracked separately in `BookingFormState` so the sender's own
  preview never depends on upload completion.
- The bucket is **private** (`public: false`, same privacy level as
  `dispute-evidence` — deliberately not public like `avatars`), so
  `bookings.package_photos` stores object **paths**, not URLs.
  `PackagePhotoGallery` (driver detail) resolves fresh signed URLs via
  `supabase.storage.from('package-photos').createSignedUrls(...)` each time
  the screen is opened, rather than persisting a URL that would go stale.
- RLS on `storage.objects` scopes uploads to a `{userId}/...` path prefix —
  a user can only write into their own folder.

### Confirm/Reject — Alert.alert is a no-op on web

`useDriverBookingActions.ts` previously gated Confirm/Reject/Deliver/Mark-Paid
behind `Alert.alert(...)`. `react-native-web`'s implementation is a literal
`static alert() {}` — on a web build (this app ships one, per Web Deployment
below), tapping any of those buttons showed no dialog and the action never
ran. Same bug existed in `QrScannerModal`'s post-scan confirm step and
`RecipientInfoCard`'s WhatsApp-unavailable fallback. Fixed by:
- `ConfirmActionModal` (`components/shared/ui/modals/`) — a real `Modal`
  (which react-native-web does implement), used by
  `useDriverBookingActions` for all four actions, replacing the broken
  Alert-based flow and fixing the previous toast text bug in the same pass
  (`label.toLowerCase() + 'd'` produced "Booking confirmd"/"Booking
  rejectd" — replaced with explicit, correctly-worded i18n toast strings).
- `QrScannerModal`'s confirm-then-`onSuccess` step removed rather than
  replaced — `WeightConfirmModal` (opened by `onSuccess`) already serves as
  the real confirmation gate before `markInTransit` runs, making the
  intermediate Alert redundant as well as broken.
- `RecipientInfoCard`'s WhatsApp failure now uses `showToast` instead of
  `Alert.alert`.

### Mid-pickup weight adjustment

While a booking is `confirmed`, tapping "Mark as In Transit" or completing a
successful QR scan opens `WeightConfirmModal` (pre-filled with the booked
weight, editable) before the transition proceeds:

1. If unchanged, proceeds straight to `markInTransit`.
2. If changed, `driverBookingStore.adjustPackageWeight(id, newWeightKg)` runs first:
   - Validates against the route's `min_weight_kg`/`max_single_package_kg`.
   - Recomputes shipping via `computeShippingPrice` (see Price computation
     above) and the full money split via `splitBookingMoney`, using the rate
     columns snapshotted on the booking row at creation time (not
     re-fetched from `platform_config`).
   - Adjusts the route's `available_weight_kg` by the signed delta via the
     new `adjust_route_capacity(p_route_id, p_delta_kg)` DB function — a
     weight increase that exceeds remaining capacity is rejected (surfaces
     `decrement_route_capacity`'s existing exception) **before** the booking
     row is touched, so there's no partial write.
   - Only then updates `package_weight_kg`, `shipping_eur`, `service_fee_eur`,
     `driver_commission_eur`, `driver_payout_eur`, `total_price`, `price_eur`.
3. `notify-booking-event` detects the weight change (via `old_record`, ahead
   of its status-based branching — the two are always separate UPDATEs) and
   notifies the sender in-app, by push, and by email.

---

## Web Deployment (Vercel)

The app is deployed as a **static SPA** via Vercel.

- **URL:** https://wasali.vercel.app
- **Build command:** `npx expo export --platform web`
- **Output directory:** `dist/`
- **SPA routing:** `vercel.json` rewrites all paths to `index.html`

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Vercel auto-builds on every push to the linked GitHub repo (`F-Ghassen/wasali`).

