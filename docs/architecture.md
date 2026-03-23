# Wasali — Architecture

_Last updated: 2026-03-23_

**Recent updates:**
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
```

### Test layers

| Layer | Tool | Requires network |
|-------|------|-----------------|
| Unit | Vitest | No |
| Integration | Vitest + supabase-js admin | Local Supabase (`supabase start`) |
| E2E | Maestro | Local Supabase + Expo dev server + simulator |

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
│  │  (tabs)/   │   │  bookingStore │   │ stripe  │   │ formatters  │ │
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
├── (tabs)/                     ← sender tab bar (persistent nav)
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
├── (driver-tabs)/              ← driver tab bar (persistent nav)
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
                         ├── role === 'driver'  →  /(driver-tabs)/index
                         └── role === 'sender'  →  /(tabs)/index
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
app/(tabs)/booking/index.tsx          ← wizard shell
  ├─ hooks/useRouteData.ts            ← parallel fetch: route + stops + services + payment methods
  ├─ hooks/useBookingForm.ts          ← useReducer + AsyncStorage draft, stepValidity, totalPrice
  ├─ hooks/useSavedRecipients.ts      ← fetch/upsert recipients
  ├─ stores/bookingStore.ts           ← submitBooking, isLoading, lastBooking
  │
  ├─ components/booking/ItineraryStep.tsx    ← Step 0: pick collection + dropoff stop
  ├─ components/booking/LogisticsStep.tsx    ← Step 1: collection/delivery service + date
  ├─ components/booking/SenderStep.tsx       ← Step 2: sender details + conditional address
  ├─ components/booking/RecipientStep.tsx    ← Step 3: recipient + address + notes
  ├─ components/booking/PackageStep.tsx      ← Step 4: weight, types, photos (DO NOT MODIFY)
  ├─ components/booking/PaymentStep.tsx      ← Step 5: payment method selection
  ├─ components/booking/OrderSummary.tsx     ← sidebar (wide) / footer summary
  │
  ├─ components/ui/ServiceOption.tsx    ← reusable radio card for route service
  └─ components/ui/PaymentOption.tsx    ← reusable radio card for payment method

app/(tabs)/booking/confirmation.tsx
  └─ bookingStore.lastBooking           ← data source (no re-fetch)
```

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

```typescript
effectiveRate = promotion_active
  ? price_per_kg_eur * (1 - promotion_percentage / 100)
  : price_per_kg_eur

totalPrice = Math.round(
  (weightKg * effectiveRate + collectionServicePrice + deliveryServicePrice) * 100
) / 100
```

### AsyncStorage draft key

```
booking_draft_{routeId}   ← full BookingFormState, persisted on SET (debounced 500ms)
```

### Payment step gating

Two layers of enablement control which payment methods are shown:

| Layer | Owner | Mechanism |
|---|---|---|
| Platform | App code | `PLATFORM_COMING_SOON = Set(['credit_debit_card', 'paypal'])` — always shown but disabled with "Coming soon" badge |
| Driver | DB `route_payment_methods` table | `enabled` flag per route; falls back to `{ cash_on_collection: true, cash_on_delivery: true }` when no rows |

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

`app/(tabs)/booking/confirmation.tsx` — shown after successful booking submit.

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
| View my bookings | Navigates to `/(tabs)/bookings` |

### WhatsApp deep link format

```
wasali://driver/bookings/{bookingId}
```

Opens the Wasali driver app directly on the booking detail screen where the driver can confirm or decline.

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

