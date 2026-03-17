# Wasali — User Flow

_Last updated: 2026-03-18 (Route wizard + promo + templates)_

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
  Supabase signUp()
      │
      ├── email already registered?
      │       ├── __DEV__  →  auto signIn()  →  SIGNED_IN  →  (tabs)/index
      │       └── prod     →  toast + redirect to (auth)/login
      │
      └── new email  →  confirmation email sent (via Resend SMTP)
              │
              ▼
          (auth)/verify-otp
              │  enter 6-digit code  OR  click email link
              ▼
          verifyOtp()  →  SIGNED_IN event  →  (tabs)/index  ✓

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
├── 👤 Profile     →  (tabs)/profile
└── ↔️  P2P         →  (tabs)/p2p
```

---

## 3. Booking a Driver (core flow)

```
(tabs)/index  [Search Routes]
    │  select origin city (EU) + destination city (TN)
    │  tap Search
    ▼
(tabs)/routes/results  [Route List]
    │  tap a route card
    ▼
(tabs)/booking/index  [Book Shipment — 5-step accordion]
    │
    │  Step 1 — Details
    │    sender: "My details" (name, phone, address) OR "On behalf"
    │    toggle: update my profile / save to recipients
    │
    │  Step 2 — Logistics
    │    collection method: driver pickup (+€8) | drop-off point
    │    delivery method:   home (+€10) | collect | post (+€6)
    │    city + date pickers for collection & drop-off
    │
    │  Step 3 — Package
    │    weight (kg), type (document/clothing/electronics/…), photos
    │
    │  Step 4 — Recipient
    │    name, phone (+WhatsApp toggle), toggle: save to recipients
    │    drop-off city shown read-only (from Step 2)
    │
    │  Step 5 — Payment
    │    options: Cash to driver | Bank transfer | Online (Stripe)
    │    live OrderSummary sidebar (wide) / bottom bar (mobile)
    │    [Confirm & pay →]
    ▼
── Booking submitted ─────────────────────────────────
    │  (backend: create booking, send push to driver, lock escrow)
    ▼
(tabs)/tracking/[bookingId]  [Shipment Tracking]
```

---

## 4. Booking Lifecycle / Tracking

```
awaiting_payment
    │  payment confirmed
    ▼
confirmed         ◀── current step highlighted in timeline
    │  driver collects package
    ▼
collected
    │  en route
    ▼
in_transit
    │  delivered
    ▼
delivered
    │  [Rate your driver] button shown on tracking screen
    ▼
rated  →  escrow released to driver
```

Tracking screen: `(tabs)/tracking/[bookingId]`
  - Vertical timeline with done / current / pending dot states
  - Booking summary card (route, dates, weight, total)
  - Green escrow banner
  - "Rate your driver" action card appears at `delivered` status

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

## 6. P2P Document Network

```
(tabs)/p2p  [Hub]
├── "Send a document"   →  (tabs)/p2p/send
└── "Carry a document"  →  (tabs)/p2p/carry
    Trophy button       →  (tabs)/p2p/leaderboard
```

### Send flow

```
(tabs)/p2p/send
    │  from city (EU) + to city (TN)
    │  earliest / latest date window
    │  document type: Passport/ID | Letter | Contract | Medical | Other
    │  description (optional)
    │  urgency: Normal (10 pts) | Soon (25 pts) | Urgent (50 pts)
    │  offer payment toggle + amount (optional)
    │  [Post request]
    ▼
p2p_requests row created  →  visible to all travellers on corridor
```

### Carry flow

```
(tabs)/p2p/carry  [Open requests]
    │  filter: All | 🇪🇺→🇹🇳 only | 🔥 Urgent first
    │  tap "Offer to carry" on a request card
    ▼
Offer modal
    │  Free carry  →  earn points (added to leaderboard)
    │  For a fee   →  set amount, sender accepts
    │  optional message to sender
    │  [Send offer]
    ▼
p2p_carries record created
    │  sender accepts offer
    ▼
Document hand-off  →  delivery confirmed
    │
    └── Free carry: points credited to carrier profile
```

### Points & Leaderboard

```
Points earned per delivery (free carry):
  Normal urgency  → +10 pts
  Soon            → +25 pts
  Urgent          → +50 pts

(tabs)/p2p/leaderboard
  ├── Gold / Silver / Bronze podium (top 3)
  ├── Ranked list — own row highlighted in blue
  └── Points redeemable for gifts, discounts, partner rewards
```

---

## 7. Profile

```
(tabs)/profile
├── Edit Profile      →  profile/edit         (name, avatar)
├── Saved Addresses   →  profile/addresses    (list)
│       └── Add       →  profile/add-address
├── Notifications     →  profile/notifications
└── Sign Out          →  signOut() → SIGNED_OUT event → (auth)/welcome
```
