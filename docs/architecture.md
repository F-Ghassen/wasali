# Wasali — Architecture

_Last updated: 2026-03-19_

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
          │  │  profiles · routes · route_stops · bookings        │ │
          │  │  shipping_requests · offers · ratings · disputes   │ │
          │  │  saved_addresses · route_templates · p2p_*         │ │
          │  └────────────────────────────────────────────────────┘ │
          │                                                          │
          │  ┌─────────────────────┐   ┌───────────────────────┐    │
          │  │  Storage Buckets    │   │    Edge Functions     │    │
          │  │  avatars            │   │  create-payment-intent│    │
          │  │  package-photos     │   │  stripe-webhook       │    │
          │  │  dispute-evidence   │   │  capture-payment      │    │
          │  └─────────────────────┘   │  accept-offer         │    │
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
| `driverBookingStore` | `stores/driverBookingStore.ts` | Driver booking views, status transitions, earnings stats |
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
