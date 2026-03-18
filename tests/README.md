# Wasali Test Suite

This document explains how to run each test layer in the Wasali project.

---

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Node ≥ 20 | All JS tooling | `nvm install 20` |
| Supabase CLI | Local DB + Auth | `brew install supabase/tap/supabase` |
| tsx | Run TypeScript scripts directly | `npm i -g tsx` |
| Maestro | Mobile E2E testing | `curl -fsSL "https://get.maestro.mobile.dev" \| bash` |

---

## 1. Start local Supabase

All test layers require a running local Supabase instance.

```bash
# From the project root
supabase start
```

This starts PostgreSQL on port 5432 and the Supabase REST/Auth APIs on port 54321.
The local Studio is available at http://127.0.0.1:54323.

To stop it:

```bash
supabase stop
```

---

## 2. Seed test data (for E2E flows)

The Maestro flows need real users + a route to exist in the local database.
Run the seed script once before running E2E tests:

```bash
npx tsx tests/seed-test-data.ts
```

This creates a test driver, a test sender, and a published route, then prints
the credentials as shell exports.  Copy them into your terminal session:

```bash
export DRIVER_EMAIL="test-driver-<timestamp>@wasali-test.com"
export DRIVER_PASSWORD="Test1234!"
export SENDER_EMAIL="test-sender-<timestamp>@wasali-test.com"
export SENDER_PASSWORD="Test1234!"
export TEST_ROUTE_ID="<uuid>"
```

---

## 3. Unit tests

Unit tests use **Vitest** and live alongside source files.

```bash
# Run once
npx vitest run

# Watch mode
npx vitest
```

Key test files:
- `tests/unit/price.test.ts` — booking price computation
- `tests/unit/tracking.test.ts` — tracking timeline utilities

---

## 4. Integration tests

Integration tests require the local Supabase instance to be running.
They use `tests/helpers.ts` to create/clean up real database rows.

```bash
npx vitest run --project integration
```

Or simply:

```bash
SUPABASE_URL=http://127.0.0.1:54321 npx vitest run tests/integration/
```

The helper functions (`createTestUser`, `cleanupUser`, `seedRoute`) handle
all setup and teardown — each test creates its own users and deletes them
in an `afterEach` / `afterAll` hook.

---

## 5. Maestro E2E tests

Maestro drives the actual app running in a simulator or device.

### Setup

1. Start the Expo dev server:
   ```bash
   npx expo start
   ```
2. Launch the iOS simulator or connect an Android device.
3. Install the Expo Go app (or use a development build).
4. Make sure the app is loaded and showing the sign-in / home screen.

### Run all flows

```bash
maestro test .maestro/
```

### Run a single flow

```bash
maestro test .maestro/01_driver_create_route.yaml
```

### Pass credentials as env vars

```bash
maestro test \
  --env DRIVER_EMAIL="$DRIVER_EMAIL" \
  --env DRIVER_PASSWORD="$DRIVER_PASSWORD" \
  --env SENDER_EMAIL="$SENDER_EMAIL" \
  --env SENDER_PASSWORD="$SENDER_PASSWORD" \
  --env TEST_ROUTE_ID="$TEST_ROUTE_ID" \
  .maestro/
```

### Flow descriptions

| File | What it tests |
|------|--------------|
| `01_driver_create_route.yaml` | Driver creates a route through the 5-step wizard and publishes it |
| `02_sender_search_and_book.yaml` | Sender searches Berlin→Tunis, selects a result, fills booking form, confirms |
| `03_driver_booking_lifecycle.yaml` | Driver confirms a pending booking, marks it in-transit, then delivered |
| `04_sender_tracking.yaml` | Sender views a confirmed booking's tracking timeline and Print Label button |
| `05_driver_route_cancel.yaml` | Driver cancels an active route and verifies it is removed from the list |
| `06_driver_mark_full.yaml` | Driver marks a route full; sender's search no longer shows it |

### Reusable sub-flows

| File | Purpose |
|------|---------|
| `_login_driver.yaml` | Signs in with `DRIVER_EMAIL` / `DRIVER_PASSWORD` |
| `_login_sender.yaml` | Signs in with `SENDER_EMAIL` / `SENDER_PASSWORD` |

---

## 6. Cleanup

To remove all test data from the local database:

```bash
# Nuclear option — wipe and re-migrate
supabase db reset
```

Or delete specific test users from the Supabase Studio:
http://127.0.0.1:54323/project/default/auth/users

---

## Environment variables reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | `http://127.0.0.1:54321` | Local Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | local dev default JWT | Service-role key for admin operations in tests |
| `SUPABASE_ANON_KEY` | local dev default JWT | Anon key used for user-scoped test clients |
| `DRIVER_EMAIL` | — | Test driver email (output by seed script) |
| `DRIVER_PASSWORD` | `Test1234!` | Test driver password |
| `SENDER_EMAIL` | — | Test sender email (output by seed script) |
| `SENDER_PASSWORD` | `Test1234!` | Test sender password |
| `TEST_ROUTE_ID` | — | UUID of the seeded test route |
