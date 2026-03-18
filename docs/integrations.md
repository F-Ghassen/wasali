# Wasali — Integrations

_Last updated: 2026-03-18_

---

## 1. Supabase

Supabase provides the full backend: database, auth, storage, realtime, and Edge Functions.

### Client Setup

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const storage = Platform.OS === 'web'
  ? AsyncStorage          // web: no SecureStore
  : SecureStoreAdapter;   // native: encrypted keychain

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',  // handles magic links on web
  },
});
```

Environment variables (`.env.local`):
```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Auth

| Feature | Implementation |
|---|---|
| Sign up | `supabase.auth.signUp({ email, password, options: { data: { full_name, role } } })` |
| OTP verify | `supabase.auth.verifyOtp({ email, token, type: 'email' })` |
| Sign in | `supabase.auth.signInWithPassword({ email, password })` |
| Sign out | `supabase.auth.signOut()` |
| Password reset | `supabase.auth.resetPasswordForEmail(email)` |
| Session listener | `supabase.auth.onAuthStateChange((event, session) => ...)` in `_layout.tsx` |

The `handle_new_user` database trigger fires on `auth.users` insert and creates a matching `profiles` row, copying `full_name` and `role` from auth metadata.

### Database Queries

All queries use the typed Supabase client via `types/database.ts` (auto-generated, regenerate after schema changes):

```bash
npx supabase gen types typescript --project-id YOUR_ID > types/database.ts
```

Common patterns:
```ts
// Fetch routes with stops
supabase.from('routes').select('*, route_stops(*)').eq('status', 'active')

// Upsert
supabase.from('profiles').upsert({ id, full_name })

// RPC (stored procedure)
supabase.rpc('accept_offer', { offer_id })
```

### Storage Buckets

| Bucket | Content | Access |
|---|---|---|
| `avatars` | Profile photos | Public read, auth write |
| `package-photos` | Booking package images | Auth read (own), auth write |
| `dispute-evidence` | Dispute attachment photos | Auth read (own), service_role admin |

Upload pattern (`utils/imageUpload.ts`):
```ts
const { data } = await supabase.storage
  .from('package-photos')
  .upload(`${userId}/${bookingId}/${filename}`, base64Data, {
    contentType: 'image/jpeg',
    upsert: true,
  });
```

### Edge Functions

All Edge Functions use Deno (TypeScript) and run at the Supabase edge. They use the `service_role` key to bypass RLS.

```
supabase/functions/
├── create-payment-intent/    ← called by client before payment
├── stripe-webhook/           ← called by Stripe on payment events
├── capture-payment/          ← called after delivery confirmation
└── accept-offer/             ← called when sender accepts a shipping request offer
```

**`create-payment-intent`**
- Input: `{ bookingId, amountEur, senderId, driverId }`
- Creates Stripe PaymentIntent with `capture_method: 'manual'`
- Returns `{ clientSecret }`

**`stripe-webhook`**
- Verifies Stripe signature
- On `payment_intent.succeeded`: updates `booking.payment_status = 'paid'`
- On `payment_intent.payment_failed`: updates `booking.payment_status = 'failed'`

**`capture-payment`**
- Input: `{ bookingId }`
- Fetches `stripe_payment_intent_id` from booking
- Calls `stripe.paymentIntents.capture(id)`
- Updates `booking.payment_status = 'captured'`

**`accept-offer`**
- Input: `{ offerId }`
- Creates a booking from the accepted shipping request offer
- Updates offer status → `accepted`, others → `declined`

Deploy:
```bash
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
supabase functions deploy capture-payment
supabase functions deploy accept-offer
```

### Realtime

Not yet used actively, but the Supabase client is configured for realtime. Future use: live booking status updates without polling.

---

## 2. Stripe

Stripe handles payment authorization (escrow) and driver payouts via Stripe Connect.

### Client Setup

```ts
// lib/stripe.ts
import { initStripe } from '@stripe/stripe-react-native';

initStripe({ publishableKey: STRIPE_PUBLISHABLE_KEY });

// On web: stripe-native-stub.ts (no-op) is resolved by metro.config.js
```

Environment variables:
```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# Server-side (Edge Functions only):
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Payment Flow

1. Client calls `create-payment-intent` Edge Function
2. Edge Function creates `PaymentIntent` with `capture_method: 'manual'` (funds authorized but not captured)
3. Client calls `stripe.confirmPayment(clientSecret, { ... })`
4. Funds are **authorized** — held on card but not transferred
5. When driver delivers, `capture-payment` Edge Function captures the authorized amount
6. Stripe Connect routes funds to driver's connected account

### Stripe Connect (Driver Payouts)

Drivers onboard via Stripe Connect to receive payouts. Profile stores `stripe_connect_account_id`.

Setup flow (not yet fully implemented in UI):
```
driver taps "Set up payouts"
  →  supabase.functions.invoke('create-connect-account', { driverId })
  →  redirect to Stripe hosted onboarding URL
  →  Stripe webhook: account.updated → store account_id in profiles
  →  driver can now receive captures
```

### Webhook Configuration

In Stripe Dashboard → Webhooks:
```
Endpoint URL: https://<project>.supabase.co/functions/v1/stripe-webhook
Events:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - account.updated  (Connect)
```

### Web Adaptation

`@stripe/stripe-react-native` cannot run in a browser. `metro.config.js` resolves the package to `lib/stripe-native-stub.ts` on web:

```js
// metro.config.js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return { filePath: './lib/stripe-native-stub.ts', type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

---

## 3. Resend (Transactional Email)

Supabase's built-in mailer is limited to 2 emails/hour. Production uses **Resend** as a custom SMTP provider for auth emails (OTP codes, password reset links).

### Configuration

In **Supabase Dashboard → Authentication → SMTP Settings**:

| Setting | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API key (`re_...`) |
| Sender name | `Wasali` |
| Sender email | `noreply@wasali.com` (must be verified in Resend) |

### Email Templates

Customised in **Supabase Dashboard → Authentication → Email Templates**:
- **Confirm signup** — OTP code or magic link
- **Reset password** — password reset link
- **Magic link** — one-click sign-in

---

## 4. Expo

### SDK & Modules

| Module | Use |
|---|---|
| `expo-router` | File-based navigation (Stack + Tabs) |
| `expo-secure-store` | Encrypted JWT token storage on native |
| `expo-image-picker` | Package + avatar photo selection |
| `expo-notifications` | Push notification registration + handling |
| `expo-font` | Custom font loading |
| `expo-constants` | App version, device info |
| `expo-linking` | Deep link handling (email confirmation on web) |

### App Configuration (`app.json`)

```json
{
  "expo": {
    "scheme": "wasali",
    "web": { "output": "single" },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-notifications", { "icon": "./assets/notification-icon.png" }]
    ]
  }
}
```

`scheme: "wasali"` enables deep links (`wasali://`) for email magic links on native.

### Build & Run

```bash
# Development
npx expo start

# iOS
npx expo run:ios

# Android
npx expo run:android

# Web
npx expo start --web
```

---

## 5. Push Notifications

Configured in `lib/notifications.ts` using Expo Push Notifications.

### Setup

```ts
// Register device token on sign-in
const { status } = await Notifications.requestPermissionsAsync();
const token = await Notifications.getExpoPushTokenAsync();
// Store token in profiles.push_token
supabase.from('profiles').update({ push_token: token }).eq('id', userId);
```

### Send Notifications

Notifications are sent from Edge Functions via the Expo Push API:

```ts
// Inside an Edge Function
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  body: JSON.stringify({
    to: recipientPushToken,
    title: 'New booking',
    body: 'You have a new booking on your Paris → Tunis route',
    data: { bookingId },
  }),
});
```

### Notification Events

| Trigger | Recipient | Message |
|---|---|---|
| Booking created | Driver | "New booking request" |
| Booking confirmed | Sender | "Your shipment is confirmed" |
| Package in transit | Sender | "Your package is on the way" |
| Package delivered | Sender | "Your package was delivered" |
| Offer received | Sender | "A driver made an offer on your request" |
| Offer accepted | Driver | "Your offer was accepted" |
| P2P carry offer | Document sender | "Someone wants to carry your document" |

---

## 6. Environment Variables Reference

```bash
# .env.local — required before running

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (publishable key is safe to expose)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe secret — only used in Edge Functions (never in client)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 7. Setup Checklist (New Environment)

```
□ 1. Create Supabase project
□ 2. Run supabase/schema.sql in SQL editor
□ 3. Run migrations/ in order (005 → 008)
□ 4. Configure Resend SMTP in Supabase Auth settings
□ 5. Run seed.sql + seed_drivers.sql (optional dev data)
□ 6. Regenerate types:
       npx supabase gen types typescript --project-id YOUR_ID > types/database.ts
□ 7. Create Stripe account + enable Stripe Connect
□ 8. Configure Stripe webhook endpoint pointing to stripe-webhook function
□ 9. Fill .env.local with all keys above
□ 10. Deploy Edge Functions:
       supabase functions deploy create-payment-intent
       supabase functions deploy stripe-webhook
       supabase functions deploy capture-payment
       supabase functions deploy accept-offer
□ 11. npx expo start
```
