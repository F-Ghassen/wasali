# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npx expo start          # Start dev server (iOS/Android/Web)
npx expo start --ios    # iOS simulator
npx expo start --web    # Web browser

# Testing
npm test                # Run all tests (vitest)
npm run test:watch      # Watch mode

# Run a single test file
npx vitest run tests/unit/bookingStore.test.ts

# Web deployment
npx expo export --platform web   # Build for Vercel

# Supabase (local dev)
supabase start          # Start local Supabase stack
supabase db push        # Apply migrations
supabase functions deploy create-payment-intent
```

## Architecture

### Routing

`app/` uses Expo Router (file-based). The entry `index.ts` imports `expo-router/entry` — there is no manual `App.tsx`.

`app/index.tsx` is the auth + role gate: it waits for `authStore.loadProfile()` then redirects to `/(tabs)` (sender) or `/(driver-tabs)` (driver) based on `profiles.role`.

`app/_layout.tsx` bootstraps `StripeProvider` and the Supabase auth listener.

### Dual-Role Layout

- Senders → `app/(tabs)/` tab bar
- Drivers → `app/(driver-tabs)/` tab bar
- Role is stored in `profiles.role` (`'sender'` | `'driver'`), set at signup

New typed routes require `as any` casts until `expo start` regenerates `.expo/types/router.d.ts`.

### State (Zustand stores in `stores/`)

| Store                | Responsibility                              |
| -------------------- | ------------------------------------------- |
| `authStore`          | Session, profile, signUp/signIn/OTP         |
| `searchStore`        | Route search params & results               |
| `bookingStore`       | 6-step booking wizard state + price calc    |
| `driverRouteStore`   | Driver route CRUD, templates, filters       |
| `driverBookingStore` | Booking status transitions, earnings        |
| `notificationStore`  | In-app notifications, Realtime subscription |
| `requestStore`       | Shipping requests + offers lifecycle        |
| `uiStore`            | Toast queue, global loading                 |
| `routeAlertStore`    | Route alert management                      |

### Supabase

- Client in `lib/supabase.ts` — uses `SecureStore` on native, `AsyncStorage` on web
- Types in `types/database.ts` — regenerate with `npx supabase gen types typescript --project-id YOUR_ID > types/database.ts`
- `supabase/functions/` is excluded from the root `tsconfig.json` (Deno types conflict)
- Migrations in `supabase/migrations/` — 20 files; apply in order
- Edge Functions: `create-payment-intent`, `capture-payment`, `stripe-webhook`, `notify-booking-event`, `accept-offer`

### Payments

Stripe uses `capture_method: 'manual'` for escrow — funds are authorized at booking and captured on delivery confirmation.

On web, `@stripe/stripe-react-native` is stubbed out via `metro.config.js` resolver to prevent crashes.

### i18n

4 locales in `locales/`: `en`, `fr`, `ar`, `darija`. Use the `useTranslation` hook from the i18n lib.

### Testing

- Unit + integration tests: `tests/` with Vitest, config in `vitest.config.ts`
- Integration tests require a running local Supabase stack
- E2E flows: `.maestro/` (6 YAML flows for Maestro mobile runner)
- Test helpers: `tests/helpers.ts` (`createTestUser`, `seedRoute`, `cleanupUser`, etc.)
- Ensure more 80% in test code coverage

### Web Deployment

Vercel SPA: `npx expo export --platform web` → `dist/`. `vercel.json` rewrites all paths to `index.html`.

## Key Conventions

- `@/*` path alias maps to the repo root (configured in `tsconfig.json`)
- After every change: update `docs/user-flow.md` and `docs/architecture.md`, then commit them alongside the code change
- Zod v4 is installed — use `.number().min()` not `.number({ invalid_type_error: ... })`
- Claude Plans are store in `docs/plans`
- Changes is Schema should are saved in respective files in `stores/`

### Infrastructure

- Maintain Infrastructure in `terraform/TERRAFORM.md` and
- Documented Infrastructure in `docs/infrastructure.md`
