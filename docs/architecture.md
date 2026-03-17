# Wasali — Architecture

_Last updated: 2026-03-17_

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
├── (tabs)/                    ← main tab bar (persistent nav)
│   ├── index.tsx              (Search routes)
│   ├── bookings.tsx
│   ├── requests.tsx
│   ├── profile.tsx
│   ├── routes/
│   │   └── results.tsx        (hidden tab — href:null)
│   ├── booking/
│   │   └── index.tsx          (hidden tab — 5-step accordion)
│   ├── tracking/
│   │   └── [bookingId].tsx    (hidden tab — shipment timeline)
│   └── p2p/
│       ├── index.tsx          (P2P hub — visible tab)
│       ├── send.tsx           (hidden — send a document form)
│       ├── carry.tsx          (hidden — browse & offer to carry)
│       └── leaderboard.tsx    (hidden — carrier points board)
├── bookings/[id].tsx          ← booking detail
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
    ├──▶ p2p_requests (sender_id)
    │       └──▶ p2p_carries (carrier_id → profiles.id)
    │               └── on delivery: points credited to carrier
    │
    └──▶ saved_addresses (user_id)
```

### RLS Policy Model
- `profiles`: users read/update own row only
- `routes`: public read; drivers insert/update own
- `bookings`: sender reads own; driver reads where route_id matches
- `shipping_requests`: public read (open); sender manages own
- `p2p_requests`: public read (open); sender manages own
- `p2p_carries`: carrier inserts own; sender reads offers on their requests
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
  └─▶ onAuthStateChange fires SIGNED_IN in _layout.tsx
  └─▶ setSession + loadProfile → router.replace('/(tabs)')

signOut()
  └─▶ Supabase clears session
  └─▶ onAuthStateChange fires SIGNED_OUT in _layout.tsx
  └─▶ router.replace('/(auth)/welcome')

Duplicate email on sign-up
  └─▶ __DEV__: auto-calls signIn() → SIGNED_IN → tabs (unblocks testing)
  └─▶ prod:    toast "account already exists" + redirect to login
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

## Email (Transactional)

Supabase's built-in mailer is limited to 2 emails/hour. Production and development use **Resend** as the custom SMTP provider.

| Setting | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API key (`re_...`) — found in Resend dashboard → API Keys |
| Sender | `onboarding@resend.dev` (dev) / verified domain (prod) |

Configure in: **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**

---

## Web-Specific Adaptations

| Issue | Solution |
|---|---|
| `@stripe/stripe-react-native` crashes on web | `metro.config.js` resolves it to `lib/stripe-native-stub.ts` |
| Session from email confirmation link | `detectSessionInUrl: true` on web |
| Token storage | `AsyncStorage` on web, `SecureStore` on native |
| `Alert.alert` | Replaced with `useUIStore().showToast` across auth screens and profile |
| SSR mode errors | `app.json` web output set to `"single"` (SPA) |
