# Infrastructure

## Overview

Wasali is a serverless-first stack. There are no VMs or containers to manage. All infrastructure is provisioned via Terraform (see [terraform/](../terraform/TERRAFORM.md)).

```
┌─────────────────────────────────────────────────────────────────────┐
│                         End Users                                    │
│            Mobile (iOS/Android)        Web Browser                  │
└───────────────┬────────────────────────────┬────────────────────────┘
                │  Expo Go / EAS Build        │  HTTPS
                │                             ▼
                │                    ┌────────────────┐
                │                    │    Vercel CDN  │
                │                    │  wasali.vercel │
                │                    │  .app (SPA)    │
                │                    └───────┬────────┘
                │                            │
                └────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │         Supabase             │
              │  ┌────────────────────────┐  │
              │  │  PostgreSQL 17 (DB)    │  │
              │  ├────────────────────────┤  │
              │  │  Auth (JWT + OTP)      │  │
              │  ├────────────────────────┤  │
              │  │  Storage (S3-compat.)  │  │
              │  ├────────────────────────┤  │
              │  │  Realtime (WebSocket)  │  │
              │  ├────────────────────────┤  │
              │  │  Edge Functions (Deno) │  │
              │  └────────────────────────┘  │
              └──────────────┬───────────────┘
                             │
              ┌──────────────┴───────────────┐
              │           Stripe             │
              │  PaymentIntent (escrow)      │
              │  Stripe Connect (payouts)    │
              │  Webhook → stripe-webhook fn │
              └──────────────────────────────┘
```

---

## Services

### Supabase (primary backend)

| Feature | Detail |
|---|---|
| Region | `eu-central-1` (Frankfurt) — closest to Morocco/Tunisia |
| Database | PostgreSQL 17, managed by Supabase |
| Auth | Email + OTP, JWT (3600 s expiry) |
| Storage | S3-compatible, 50 MiB max file size |
| Realtime | WebSocket subscriptions for notifications |
| Edge Functions | 5 Deno functions (see below) |
| Scheduled jobs | `pg_cron` in-database — see [docs/cron-jobs.md](cron-jobs.md) |

**Edge Functions:**

| Function | Trigger | Purpose |
|---|---|---|
| `create-payment-intent` | HTTP POST (client) | Creates Stripe PaymentIntent (escrow) |
| `capture-payment` | HTTP POST (client) | Captures authorized payment on delivery |
| `stripe-webhook` | HTTP POST (Stripe) | Updates booking payment status |
| `notify-booking-event` | DB webhook on `bookings.UPDATE` | Push + email + in-app on status change |
| `notify-route-alert` | HTTP POST (client, on route publish) | Email + in-app for matching route alerts |
| `accept-offer` | HTTP POST (client) | Accepts an offer, declines siblings, notifies requester (push + email + in-app) |
| `auth-send-email-hook` | Supabase Auth `send_email` Hook | Routes signup/reset emails through React Email templates + `email_log` (local/staging only — see `docs/email-service.md`) |

**Secrets (set via Supabase CLI, not stored in Terraform state):**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `SEND_EMAIL_HOOK_SECRET` — Standard Webhooks signing secret for the Auth `send_email` hook (format `v1,whsec_<base64>`), independent of `RESEND_API_KEY`

---

### Vercel (web hosting)

| Setting | Value |
|---|---|
| Project | `wasali` |
| Team | `team_lw3SwDpATEL5wEVaDfF3wvcS` |
| Build command | `npx expo export --platform web` |
| Output | `dist/` |
| Routing | All paths → `index.html` (SPA rewrite) |
| Deployments | Auto on push to `main`; preview on PRs |

**Environment variables injected at build time:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_APP_URL`

---

### Stripe (payments)

| Setting | Value |
|---|---|
| Model | Manual capture (escrow) |
| Capture method | `capture_method: 'manual'` |
| Payout model | Stripe Connect (driver payouts) |
| Webhook endpoint | `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` |
| Webhook events | `payment_intent.succeeded`, `payment_intent.payment_failed` |

---

### Resend (email)

Transactional email for OTP delivery, booking/route-alert/offer notifications, and (local/staging only) signup/reset confirmation. API key set as Supabase Edge Function secret and, separately, as the Auth SMTP password (`terraform/supabase.tf`).

Consolidated into a shared `supabase/functions/_shared/email/` module (Resend `fetch()` wrapper + React Email templates) with a dedicated `email_log` observability table (migration `057_email_log.sql`) tracking every send attempt (`queued` → `sent`/`failed`, provider message id, error detail). Still on Resend's shared sandbox sending domain — a custom domain (SPF/DKIM/DMARC) is a near-term follow-up before production auth emails can be safely enabled. See `docs/email-service.md` for the full architecture.

---

## Environments

| Environment | Frontend | Backend | Notes |
|---|---|---|---|
| **Production** | `wasali.vercel.app` | Supabase cloud project | Managed by Terraform |
| **Preview** | Vercel preview URL (per PR) | Supabase cloud project | Same project, isolated by RLS |
| **Local** | `localhost:8081` | `localhost:54321` (Docker) | `supabase start` |

---

## IaC: Terraform

All cloud resources are defined in [`terraform/`](../terraform/). See [terraform/TERRAFORM.md](../terraform/TERRAFORM.md) for setup and runbook.

**Providers used:**
- `supabase/supabase` ~1.0
- `vercel/vercel` ~2.0

**Not managed by Terraform:**
- Stripe webhook endpoints (configure via Stripe Dashboard)
- Supabase Edge Function secrets (deploy via `supabase secrets set`)
- GitHub Actions secrets (set manually in GitHub repo settings)
- DNS records (if using a custom domain — add `vercel_dns_record` to `vercel.tf`)
- `SEND_EMAIL_HOOK_SECRET` — self-invented (not issued by Supabase), and needed in two places that can silently drift apart: GoTrue's copy (pushed via `supabase config push`, used to *sign* webhook calls) and `auth-send-email-hook`'s runtime copy (`supabase secrets set`, used to *verify* that signature). Always change it via `./scripts/sync-hook-secret.sh`, never by running either command alone — a mismatch surfaces only as a generic signature-verification failure with no indication two copies even exist.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. **Type check** — `npx tsc --noEmit`
2. **Tests** — `npm test` (Vitest)

Vercel auto-deploys on merge to `main`.

Supabase migrations are applied manually via:
```bash
supabase db push --project-ref <ref>
```

---

## Backup & Recovery

- **Database:** Supabase Pro plan includes daily automated backups with 7-day retention. Point-in-time recovery available on Enterprise.
- **Edge Functions:** Source-of-truth is the Git repository. Re-deploy from `supabase/functions/`.
- **Stripe data:** Managed by Stripe; not backed up separately.

---

## Cost estimate (production)

| Service | Tier | Est. cost/month |
|---|---|---|
| Supabase | Pro | $25 |
| Vercel | Hobby/Pro | $0–$20 |
| Stripe | Per-transaction | 1.5%+ per charge |
| Resend | Free tier | $0 (up to 3,000 emails) |
| **Total** | | **~$25–$45/month** |
