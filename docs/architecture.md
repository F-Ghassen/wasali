# Wasali — Architecture

_Last updated: 2026-03-16_

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Expo App)                     │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐  │
│  │  Screens │   │  Stores  │   │   Lib    │   │  Utils  │  │
│  │ app/     │◀─▶│ (Zustand)│◀─▶│supabase  │   │validators│ │
│  │          │   │          │   │stripe    │   │formatters│ │
│  └──────────┘   └──────────┘   └────┬─────┘   └─────────┘  │
│                                     │                        │
└─────────────────────────────────────┼────────────────────────┘
                                      │ HTTPS / WSS
          ┌───────────────────────────┼───────────────────┐
          │              SUPABASE (BaaS)                   │
          │                           │                    │
          │  ┌─────────────┐  ┌───────┴──────┐            │
          │  │  Auth (JWT) │  │  PostgREST   │            │
          │  │  email OTP  │  │  (REST API)  │            │
          │  └──────┬──────┘  └───────┬──────┘            │
          │         │                 │                    │
          │  ┌──────▼─────────────────▼──────┐            │
          │  │         PostgreSQL DB          │            │
          │  │  profiles, routes, bookings,   │            │
          │  │  shipping_requests, disputes,  │            │
          │  │  ratings, saved_addresses      │            │
          │  └───────────────────────────────┘            │
          │                                                │
          │  ┌──────────────┐  ┌────────────────────────┐ │
          │  │   Storage    │  │    Edge Functions      │ │
          │  │  avatars     │  │  create-payment-intent │ │
          │  │  pkg-photos  │  │  stripe-webhook        │ │
          │  │  disputes    │  │  accept-offer          │ │
          │  └──────────────┘  └────────────────────────┘ │
          └────────────────────────────────────────────────┘
                                      │
                               ┌──────▼──────┐
                               │   STRIPE    │
                               │ PaymentIntent│
                               │ (manual     │
                               │  capture /  │
                               │  escrow)    │
                               └─────────────┘
```

---

## Client Architecture

### Routing — Expo Router (file-based)

```
app/
├── index.tsx                  ← root redirect (auth gate)
├── _layout.tsx                ← root layout: auth listener, StripeProvider
├── (auth)/                    ← unauthenticated screens
│   ├── welcome.tsx
│   ├── sign-up.tsx
│   ├── verify-otp.tsx
│   ├── login.tsx
│   └── forgot-password.tsx
├── (tabs)/                    ← main tab bar
│   ├── index.tsx              (Search routes)
│   ├── bookings.tsx
│   ├── requests.tsx
│   └── profile.tsx
├── booking/                   ← booking wizard stack
│   ├── package-details.tsx
│   ├── logistics.tsx
│   └── review-pay.tsx
├── bookings/[id].tsx          ← booking detail
├── routes/
│   ├── results.tsx
│   └── [id].tsx
├── shipping-requests/
│   ├── new.tsx
│   └── [id].tsx
├── post-delivery/
│   ├── rate/[bookingId].tsx
│   └── dispute/[bookingId].tsx
├── profile/
│   ├── edit.tsx
│   ├── addresses.tsx
│   ├── add-address.tsx
│   └── notifications.tsx
└── dev.tsx                    ← dev navigator (all routes)
```

### State Management — Zustand Stores

| Store | Responsibility |
|---|---|
| `authStore` | session, profile, signUp/signIn/signOut/verifyOtp |
| `searchStore` | route search params & results |
| `bookingStore` | active booking wizard state |
| `requestStore` | shipping requests & offers |
| `uiStore` | toast queue, global loading |

### Key Libraries

| Library | Use |
|---|---|
| `@supabase/supabase-js` v2 | DB queries, Auth, Storage |
| `expo-router` | File-based navigation |
| `zustand` | Client state |
| `react-hook-form` + `zod` | Form validation |
| `@stripe/stripe-react-native` | Payment UI (native only) |
| `expo-secure-store` | Token storage (native) |
| `@react-native-async-storage` | Token storage (web) |

---

## Database Schema

```
auth.users  (Supabase managed)
    │  handle_new_user trigger
    ▼
profiles ──────────────────────────────────────────────┐
    │                                                   │
    ├──▶ routes (driver_id → profiles.id)              │
    │       └──▶ route_stops                           │
    │       └──▶ bookings (route_id, sender_id)        │
    │               └──▶ ratings                       │
    │               └──▶ disputes                      │
    │                                                   │
    ├──▶ shipping_requests (sender_id)                 │
    │       └──▶ shipping_request_offers (driver_id) ──┘
    │
    └──▶ saved_addresses (user_id)
```

### RLS Policy Model
- `profiles`: users read/update own row only
- `routes`: public read; drivers insert/update own
- `bookings`: sender reads own; driver reads where route_id matches
- `shipping_requests`: public read (open); sender manages own
- All tables: `service_role` bypasses RLS (Edge Functions)

---

## Auth Flow

```
signUp()
  └─▶ Supabase creates auth.users row
  └─▶ handle_new_user trigger → INSERT profiles row
  └─▶ confirmation email sent (OTP code or magic link)

verifyOtp() / detectSessionInUrl (web)
  └─▶ session created → JWT stored in SecureStore / AsyncStorage
  └─▶ onAuthStateChange fires in _layout.tsx
  └─▶ setSession + loadProfile → redirect to (tabs)
```

---

## Payment Flow (Escrow)

```
Client                     Edge Function              Stripe
  │                             │                       │
  │── POST create-payment-intent ──▶                    │
  │                             │── createPaymentIntent ──▶
  │                             │   capture_method: manual
  │◀── { clientSecret } ────────│◀──────────────────────│
  │                             │                       │
  │── confirmPayment(clientSecret) ────────────────────▶│
  │◀── payment authorized (not captured) ───────────────│
  │                             │                       │
  │  [driver delivers]          │                       │
  │                             │                       │
  │── POST stripe-webhook ──────▶                       │
  │   (booking status update)   │── capturePaymentIntent ─▶
  │                             │◀── captured ──────────│
```

---

## Web-Specific Adaptations

| Issue | Solution |
|---|---|
| `@stripe/stripe-react-native` crashes on web | `metro.config.js` resolves it to `lib/stripe-native-stub.ts` |
| Session from email confirmation link | `detectSessionInUrl: true` on web |
| Token storage | `AsyncStorage` on web, `SecureStore` on native |
| `Alert.alert` | Replaced with `useUIStore().showToast` across auth screens |
| SSR mode errors | `app.json` web output set to `"single"` (SPA) |
