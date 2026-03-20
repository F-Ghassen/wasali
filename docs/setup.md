# Wasali — Manual Setup Guide

This guide covers the one-time steps required after cloning the repo and before running the app.

---

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- A Supabase project created at [supabase.com](https://supabase.com)
- `.env.local` populated (see `.env.example`)

---

## Step 1 — Run migrations

```bash
supabase db push
```

Or apply each file in `supabase/migrations/` in order via the Supabase SQL editor.

**Migration 016** (`016_cities_promotions.sql`) seeds 29 cities into the `cities` table, adds `promotion_percentage`/`promotion_active` columns to `routes`, and adds `rating`/`completed_trips` columns to `profiles`. Verify with:

```sql
SELECT count(*) FROM cities; -- expect 29
```

---

## Step 2 — Deploy the Edge Function

```bash
supabase functions deploy notify-booking-event
```

---

## Step 3 — Set environment secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxx
```

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase — do not set them manually.

---

## Step 4 — Create the Database Webhook

This step **cannot be automated via migrations** and must be done once in the Supabase Dashboard.

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Database → Webhooks** (left sidebar)
3. Click **Create a new hook**
4. Fill in the following fields:

| Field | Value |
|---|---|
| Name | `notify-booking-event` |
| Table | `bookings` |
| Events | ✅ Update |
| Type | **Supabase Edge Functions** |
| Edge Function | `notify-booking-event` |
| HTTP method | `POST` |

5. Click **Confirm**

Every time a booking's `status` column changes, the webhook will fire the `notify-booking-event` Edge Function, which writes a row to the `notifications` table and (optionally) sends an email via Resend.

---

## Optional — Smoke test

Run the following in the Supabase SQL editor to trigger the webhook manually:

```sql
UPDATE bookings
SET status = 'confirmed', updated_at = now()
WHERE id = '<a real booking uuid>';
```

Then verify:

- **Dashboard → Edge Functions → `notify-booking-event` → Logs** — the function should have been invoked
- **`notifications` table** — a new row should appear for the booking's sender and/or driver
- The recipient's device (push) or email should receive the notification

---

## Environment variables reference

| Variable | Where to get it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys (Edge Function secret only — not in `.env.local`) |

---

## Migration 018 — Booking Wizard Schema

_Added: 2026-03-19_

### What it does

`supabase/migrations/018_booking_wizard.sql` adds:

1. **`route_stops`** — new columns: `location_name`, `location_address`, `stop_date` (generated from `arrival_date`), `city_id` (FK to `cities`)
2. **`route_services`** — new column: `route_stop_id` (FK to `route_stops`, nullable; null = country-wide delivery service)
3. **`bookings`** — new columns: `collection_stop_id`, `dropoff_stop_id`, `sender_name`, `sender_phone`, `sender_whatsapp`, `recipient_whatsapp`, `total_price`; updated status/payment_status constraints
4. **`recipients`** — ensures table + RLS exist (idempotent `CREATE TABLE IF NOT EXISTS`)
5. Indexes on `route_services(route_stop_id)`, `bookings(collection_stop_id)`, `bookings(dropoff_stop_id)`

### Apply

```bash
supabase db push
```

Or paste `supabase/migrations/018_booking_wizard.sql` into the Supabase SQL editor.

### Verify

```sql
-- New columns on route_stops
SELECT column_name FROM information_schema.columns
WHERE table_name = 'route_stops'
  AND column_name IN ('location_name','location_address','stop_date','city_id');
-- expect 4 rows

-- New columns on route_services
SELECT column_name FROM information_schema.columns
WHERE table_name = 'route_services' AND column_name = 'route_stop_id';
-- expect 1 row

-- New columns on bookings
SELECT column_name FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('collection_stop_id','dropoff_stop_id','sender_name','total_price');
-- expect 4 rows
```

### Rollback

```sql
-- route_stops
ALTER TABLE route_stops
  DROP COLUMN IF EXISTS location_name,
  DROP COLUMN IF EXISTS location_address,
  DROP COLUMN IF EXISTS stop_date,
  DROP COLUMN IF EXISTS city_id;

-- route_services
DROP INDEX IF EXISTS route_services_stop_idx;
DROP INDEX IF EXISTS route_services_route_null_stop_idx;
ALTER TABLE route_services DROP COLUMN IF EXISTS route_stop_id;

-- bookings
DROP INDEX IF EXISTS bookings_collection_stop_idx;
DROP INDEX IF EXISTS bookings_dropoff_stop_idx;
ALTER TABLE bookings
  DROP COLUMN IF EXISTS collection_stop_id,
  DROP COLUMN IF EXISTS dropoff_stop_id,
  DROP COLUMN IF EXISTS sender_name,
  DROP COLUMN IF EXISTS sender_phone,
  DROP COLUMN IF EXISTS sender_whatsapp,
  DROP COLUMN IF EXISTS recipient_whatsapp,
  DROP COLUMN IF EXISTS total_price;
```

### No data migration required

- All new nullable columns default to `null` or `false` on existing rows
- `stop_date` is a generated column — backfills automatically from existing `arrival_date` values
- Existing bookings without stop IDs continue to work (app code guards with `?? null`)

