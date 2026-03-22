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

**Edge Functions:**

| Function | Trigger | Purpose |
|---|---|---|
| `create-payment-intent` | HTTP POST (client) | Creates Stripe PaymentIntent (escrow) |
| `capture-payment` | HTTP POST (client) | Captures authorized payment on delivery |
| `stripe-webhook` | HTTP POST (Stripe) | Updates booking payment status |
| `notify-booking-event` | DB webhook on `bookings.UPDATE` | Push + email on status change |
| `accept-offer` | HTTP POST (client) | Accepts an offer, creates booking |

**Secrets (set via Supabase CLI, not stored in Terraform state):**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

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

Transactional email for OTP delivery and booking notifications. API key set as Supabase Edge Function secret.

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
