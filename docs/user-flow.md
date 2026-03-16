# Wasali — User Flow

_Last updated: 2026-03-16_

---

## 1. Onboarding / Auth Flow

```
App Launch
    │
    ▼
[index.tsx] ──── session? ──── YES ──▶ (tabs)/index  (Home)
                    │
                   NO
                    │
                    ▼
          (auth)/welcome
          ┌─────────────┐
          │  Get Started │──▶ (auth)/sign-up
          │  Sign In     │──▶ (auth)/login
          └─────────────┘

Sign-Up Flow:
  (auth)/sign-up
      │  fill name / email / password
      ▼
  Supabase signUp()  →  confirmation email sent
      │
      ▼
  (auth)/verify-otp
      │  enter 6-digit code  OR  click email link
      ▼
  verifyOtp() / detectSessionInUrl
      │
      ▼
  (tabs)/index  ✓

Login Flow:
  (auth)/login
      │  email + password
      ▼
  signInWithPassword()
      │
      ▼
  (tabs)/index  ✓

Forgot Password:
  (auth)/forgot-password
      │  email
      ▼
  resetPasswordForEmail()  →  reset link sent to inbox
```

---

## 2. Main App — Tab Bar

```
Tab Bar
├── 🔍 Search      →  (tabs)/index
├── 📦 Bookings    →  (tabs)/bookings
├── 📋 Requests    →  (tabs)/requests
└── 👤 Profile     →  (tabs)/profile
```

---

## 3. Booking a Driver (core flow)

```
(tabs)/index  [Search Routes]
    │  select origin city (EU) + destination city (TN)
    │  tap Search
    ▼
routes/results  [Route List]
    │  tap a route card
    ▼
routes/[id]  [Route Detail]
    │  tap "Book this route"
    ▼
── Booking Flow (Stack) ──────────────────────────────
    │
    ▼
booking/package-details
    │  weight, category, photos, declared value
    ▼
booking/logistics
    │  pickup type (driver pickup / drop-off point)
    │  delivery type (home delivery / recipient pickup)
    │  address fields (if applicable)
    ▼
booking/review-pay
    │  summary + price
    │  [Pay Now]  →  Stripe PaymentIntent (manual capture / escrow)
    ▼
── Booking confirmed ─────────────────────────────────
    │
    ▼
(tabs)/bookings  [My Bookings]
```

---

## 4. Booking Lifecycle

```
pending_payment
    │  payment captured
    ▼
confirmed
    │  driver picks up
    ▼
in_transit
    │  delivered
    ▼
delivered
    │
    ├──▶ post-delivery/rate/[bookingId]    (rate driver 1–5 ⭐)
    └──▶ post-delivery/dispute/[bookingId] (open dispute)
```

Booking detail at any stage: `bookings/[id]`

---

## 5. Shipping Request Flow (sender posts, drivers bid)

```
(tabs)/requests
    │  tap "New Request"
    ▼
shipping-requests/new
    │  origin, destination, dates, weight, budget
    ▼
Request created  (status: open, expires in 7 days)
    │
    ▼
shipping-requests/[id]  [Request Detail]
    │  view incoming driver offers
    │  tap "Accept" on an offer
    ▼
Offer accepted  →  booking created  →  Booking Flow (review-pay)
```

---

## 6. Profile

```
(tabs)/profile
├── Edit Profile      →  profile/edit         (name, avatar)
├── Saved Addresses   →  profile/addresses    (list)
│       └── Add       →  profile/add-address
├── Notifications     →  profile/notifications
└── Sign Out          →  (auth)/welcome
```
