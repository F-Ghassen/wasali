# E2E Testing Guide

This project uses **Maestro** for end-to-end testing of mobile flows on Expo.

## Maestro Flows

Located in `.maestro/` directory:

| Flow | Purpose |
|------|---------|
| `01_driver_create_route.yaml` | Driver creates a new shipping route |
| `02_sender_search_and_book.yaml` | Sender searches for routes and completes booking |
| `03_driver_booking_lifecycle.yaml` | Driver confirms/completes booking |
| `04_sender_tracking.yaml` | Sender tracks shipment status |
| `05_driver_route_cancel.yaml` | Driver cancels a route |
| `06_driver_mark_full.yaml` | Driver marks route as full |
| **`07_booking_navigation_flow.yaml`** | **Booking navigation stack (search → creation → detail → back)** |

## Running Tests

### Prerequisites

1. **Install Maestro CLI:**
   ```bash
   brew tap mobile-dev-inc/tap
   brew install maestro
   ```

2. **Start the Expo dev server:**
   ```bash
   npx expo start
   ```

3. **Start an emulator/simulator** (iOS or Android)

### Run All Tests

```bash
maestro test .maestro/
```

### Run a Specific Test

```bash
maestro test .maestro/07_booking_navigation_flow.yaml
```

### Run with Credentials

Tests need email/password for authentication:

```bash
SENDER_EMAIL=test.sender@wasali.test \
SENDER_PASSWORD=Wasali123! \
maestro test .maestro/07_booking_navigation_flow.yaml
```

### Interactive Test Runner

```bash
maestro studio
```

Opens browser-based test recorder. Useful for debugging or creating new flows.

## Navigation Flow Test (07_booking_navigation_flow.yaml)

This critical test ensures the booking flow navigation doesn't break:

**What it tests:**

1. ✅ **Search Results → Booking Creation** — Route card "Book slot" button navigates to creation form
2. ✅ **Bookings Navbar During Creation** — Clicking Bookings icon cancels/exits creation
3. ✅ **Complete Booking → Detail Page** — Successful booking shows detail screen
4. ✅ **Back Button from Detail** — Goes to Bookings list (NOT back to creation)
5. ✅ **Bookings Navbar from Detail** — Clicking Bookings icon navigates to list

**Why this matters:**

These navigation flows are easy to break during refactoring. The test prevents:
- Back button getting stuck in creation
- Navbar icon not working from detail page
- Navigation stack accumulating screens

## Writing New Tests

1. **Record a new flow:**
   ```bash
   maestro studio
   ```

2. **Save the YAML** to `.maestro/` directory

3. **Name it** `NN_feature_name.yaml` (where NN is the next number)

4. **Add auth helper** if testing authenticated flows:
   ```yaml
   - runFlow:
       file: .maestro/_login_sender.yaml
   ```

5. **Use assertions** to verify expected states:
   ```yaml
   - assertVisible:
       text: "Expected screen title"
   ```

6. **Test on both platforms** (iOS and Android) for platform-specific issues

## Debugging Failed Tests

1. **Run with verbose output:**
   ```bash
   maestro test .maestro/07_booking_navigation_flow.yaml --verbose
   ```

2. **Use maestro studio** to record what SHOULD happen, then compare

3. **Check element IDs** match current UI (IDs are more reliable than text)

4. **Add waits** if tests are timing out:
   ```yaml
   - wait:
       duration: 1000
   ```

## CI Integration

Tests run in GitHub Actions before merge. See `.github/workflows/` for configuration.

Local pass doesn't guarantee CI pass — Expo behavior can differ between environments.

## Test Data

Tests use these hardcoded credentials (created via `scripts/seed-test-users.mjs`):

- **Sender:** `test.sender@wasali.test` / `Wasali123!`
- **Driver:** `test.driver@wasali.test` / `Wasali123!`

Both roles have pre-seeded routes in the database for testing.
