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
