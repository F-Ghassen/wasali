# Wasali

Wasali is a cargo delivery platform that connects **senders** (people shipping packages from Europe to Tunisia) with **drivers** (people making the trip who can carry packages). Built with Expo React Native, Supabase, and Stripe.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Database](#database)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Overview

The app has two user roles:

| Role | What they do |
|------|-------------|
| **Sender** | Search for shipping routes, book a driver, track their package |
| **Driver** | Create routes with stops, accept bookings, manage deliveries |

Both roles share the same app. After login, users are redirected to role-specific tab layouts (`/(tabs)/` for senders, `/(driver-tabs)/` for drivers).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 + Expo Router (file-based) |
| Language | TypeScript (strict mode) |
| State | Zustand v5 |
| Backend | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) |
| Payments | Stripe (manual capture / escrow model) |
| Forms | react-hook-form + Zod v4 |
| i18n | i18next — 4 locales: English, French, Arabic, Darija |
| Testing | Vitest (unit/integration) + Maestro (E2E mobile) |
| Web deploy | Vercel (SPA) |

---

## Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- [Supabase CLI](https://supabase.com/docs/guides/cli): `npm install -g supabase`
- iOS Simulator (Mac) or Android Studio for native dev
- A Supabase project — [supabase.com](https://supabase.com)
- A Stripe account — [stripe.com](https://stripe.com)

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/F-Ghassen/wasali.git
cd wasali
npm install
```

### 2. Configure environment variables

Copy the example and fill in your keys:

```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) for what each key is and where to get it.

### 3. Apply database migrations

```bash
supabase db push
```

This runs all migrations in `supabase/migrations/` in order. Migration `016` seeds 29 cities automatically. Verify:

```sql
SELECT count(*) FROM cities; -- expect 29
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy notify-booking-event
supabase functions deploy create-payment-intent
supabase functions deploy capture-payment
supabase functions deploy stripe-webhook
supabase functions deploy accept-offer
```

### 5. Set Edge Function secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxx
```

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do not set them manually.

### 6. Create the booking webhook (manual step)

This must be done once in the Supabase Dashboard (cannot be scripted):

1. Go to **Database → Webhooks**
2. Click **Create a new hook**
3. Fill in:

| Field | Value |
|-------|-------|
| Name | `notify-booking-event` |
| Table | `bookings` |
| Events | ✅ Update |
| Type | Supabase Edge Functions |
| Edge Function | `notify-booking-event` |

This fires every time a booking status changes, sending push notifications to the sender and driver.

### 7. Start the dev server

```bash
npx expo start          # interactive — choose iOS/Android/Web
npx expo start --ios    # iOS simulator directly
npx expo start --web    # browser
```

---

## Environment Variables

Create `.env.local` at the repo root:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

| Variable | Where to get it |
|----------|----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys (set as Supabase secret, not in `.env.local`) |

> Variables prefixed with `EXPO_PUBLIC_` are bundled into the client. Never put secret keys there.

---

## Project Structure

```
wasali/
├── app/                    # Expo Router — all screens (file-based routing)
│   ├── index.tsx           # Auth gate + role redirect
│   ├── _layout.tsx         # Root layout (StripeProvider + auth listener)
│   ├── (auth)/             # Login, signup, OTP screens
│   ├── (tabs)/             # Sender tab bar + screens
│   ├── (driver-tabs)/      # Driver tab bar + screens
│   ├── driver/             # Driver route & booking management
│   ├── profile/            # Profile management
│   └── post-delivery/      # Tracking, disputes, ratings
│
├── components/             # UI components organized by domain
│   ├── shared/ui/          # Reusable primitives (Button, Input, Badge, Toast…)
│   ├── booking/            # Booking wizard steps
│   ├── driver/             # Driver features (routes, bookings, earnings)
│   ├── search/             # Route search results
│   └── notifications/      # Notification UI
│
├── stores/                 # Zustand state stores
│   ├── authStore.ts        # Session, profile, sign-in/sign-up
│   ├── bookingStore.ts     # 6-step booking wizard state
│   ├── searchStore.ts      # Route search params & results
│   ├── driverRouteStore.ts # Driver route CRUD
│   ├── driverBookingStore.ts  # Driver bookings & status transitions
│   └── notificationStore.ts   # Push notifications + Realtime
│
├── hooks/                  # Custom React hooks (data fetching, effects)
├── services/               # API service layer (Supabase calls)
├── lib/                    # Core library setup (supabase.ts, stripe.ts, i18n.ts)
├── utils/                  # Pure utility functions (formatters, validators)
├── types/                  # TypeScript types
│   ├── database.ts         # Auto-generated Supabase types
│   └── models.ts           # App-level domain types
├── constants/              # Cities, colors, spacing, booking statuses
├── locales/                # i18n translation files (en, fr, ar, darija)
├── supabase/
│   ├── migrations/         # SQL migration files (apply in order)
│   └── functions/          # Supabase Edge Functions (Deno)
├── tests/
│   ├── unit/               # Vitest unit tests (no network)
│   └── integration/        # Vitest integration tests (needs local Supabase)
├── .maestro/               # E2E test flows (Maestro mobile runner)
└── docs/                   # Full documentation (architecture, user flows, etc.)
```

---

## Architecture

### Routing & Auth

`app/index.tsx` is the entry point. It calls `authStore.loadProfile()` then redirects:
- Authenticated **sender** → `/(tabs)/`
- Authenticated **driver** → `/(driver-tabs)/`
- Unauthenticated → `/(auth)/sign-in`

Role is stored in `profiles.role` (`'sender'` | `'driver'`), set at signup and never changed by the user.

### Separation of Concerns (enforced)

Every feature follows this layer split:

| Layer | Responsibility | Rule |
|-------|---------------|------|
| Component | Rendering only | No API calls, no business logic |
| Hook | Data fetching, `useEffect`, derived state | Lives in `hooks/` or `feature/hooks/` |
| Service | All Supabase / external API calls | Reusable, no UI logic |
| Utils | Pure deterministic functions | No side effects |

Files over 150–200 lines must be split. Never mix layers.

### State Management

Zustand stores are the single source of truth. Components read from stores via hooks — they never call Supabase directly.

### Payments (Escrow)

Stripe uses `capture_method: 'manual'`:
1. Booking created → payment **authorized** (funds held)
2. Delivery confirmed → payment **captured** (released to driver)
3. Cancellation → payment **released** to sender

On web, `@stripe/stripe-react-native` is stubbed via `metro.config.js` to prevent crashes.

### i18n

Use the `useTranslation` hook everywhere. Translation keys live in `locales/en.ts` (source of truth), mirrored in `fr.ts`, `ar.ts`, `darija.ts`.

---

## Key Features

### Sender Flow
1. Search routes by origin → destination + date
2. View route details and driver profile
3. 6-step booking wizard (package info, stops, services, recipient, payment)
4. Track shipment status in real-time
5. Confirm delivery and rate the driver

### Driver Flow
1. Create route with stops (5-step wizard)
2. Set services, pricing, logistics options, and payment methods
3. Accept or reject booking requests
4. Mark bookings as picked up, in transit, delivered
5. View earnings dashboard

### Notifications
Real-time push notifications (Expo) + in-app notifications (Supabase Realtime) on every booking status change.

---

## Database

### Schema Changes Workflow

Always follow this sequence for any DB change:

```bash
# 1. Create the migration file
# supabase/migrations/NNN_description.sql

# 2. Apply locally
supabase db push

# 3. Regenerate TypeScript types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

# 4. Update affected stores and services
# 5. Update supabase/schema-changelog.md
# 6. Commit migration + types + changelog + store changes together
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with `role` (sender/driver), rating, completed trips |
| `routes` | Driver routes with capacity, pricing, status |
| `route_stops` | Individual stops on a route with dates and locations |
| `route_services` | Services offered per stop (door pickup, packaging, etc.) |
| `bookings` | Booking records linking senders to routes |
| `cities` | 29 seeded cities (Europe + Tunisia) |
| `notifications` | In-app notification log |
| `ratings` | Bidirectional sender ↔ driver ratings |

All tables have Row-Level Security (RLS) enabled. Migrations are in `supabase/migrations/` and must be applied in order.

---

## Testing

```bash
npm test                  # Run all unit tests
npm run test:watch        # Watch mode

# Run a single file
npx vitest run tests/unit/bookingStore.test.ts
```

- **Unit tests** in `tests/unit/` — no network required
- **Integration tests** in `tests/integration/` — require `supabase start` running locally
- **E2E tests** in `.maestro/` — require Maestro CLI and a running simulator

Target coverage: **80%+**.

Test helpers in `tests/helpers.ts` provide `createTestUser`, `seedRoute`, `cleanupUser`, and more.

---

## Deployment

### Web (Vercel)

```bash
npx expo export --platform web   # builds to dist/
```

`vercel.json` rewrites all paths to `index.html` for SPA routing. Auto-deploys on push to `main`.

### Native (iOS / Android)

Use EAS Build:

```bash
npx eas build --platform ios
npx eas build --platform android
```

---

## Documentation

Full docs are in `docs/`:

| File | Content |
|------|---------|
| [docs/architecture.md](docs/architecture.md) | System design, database schema, patterns |
| [docs/user-flows.md](docs/user-flows.md) | Complete user journey maps for sender + driver |
| [docs/setup.md](docs/setup.md) | Detailed setup guide and migration notes |
| [docs/product.md](docs/product.md) | Feature overview |
| [docs/integrations.md](docs/integrations.md) | Stripe, Supabase, Resend, Expo integrations |
| [docs/infrastructure.md](docs/infrastructure.md) | Deployment and server setup |
| [docs/E2E_TESTING.md](docs/E2E_TESTING.md) | Maestro E2E test setup |

Start with [docs/architecture.md](docs/architecture.md) for a complete picture of the system.
