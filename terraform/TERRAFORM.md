# Wasali — Terraform Infrastructure

Manages cloud resources for the Wasali app using [OpenTofu](https://opentofu.org/) / Terraform.

## Resources managed

| Resource | Provider | Description |
|---|---|---|
| `supabase_project.wasali` | supabase/supabase | PostgreSQL DB, Auth, Storage, Realtime |
| `supabase_settings.auth` | supabase/supabase | Auth config (OTP, JWT, redirects) |
| `vercel_project.wasali` | vercel/vercel | SPA hosting + build config |
| `vercel_project_environment_variable.*` | vercel/vercel | Public env vars injected at build time |

> **Not managed by Terraform:** Supabase Edge Function secrets (managed by CLI), Stripe webhook endpoints (managed by Stripe CLI/Dashboard), GitHub Actions secrets.

---

## Prerequisites

```bash
# Install Terraform or OpenTofu
brew install opentofu   # or: brew install terraform

# Install Supabase CLI
brew install supabase/tap/supabase

# Install Vercel CLI
npm i -g vercel
```

---

## First-time setup

### 1. Configure credentials

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual values
```

### 2. Initialise providers

```bash
terraform init
```

### 3. Preview changes

```bash
terraform plan
```

### 4. Apply

```bash
terraform apply
```

This creates the Supabase project and Vercel project. Note the outputs:

```
supabase_project_ref   = "abcdefghijkl"
supabase_api_url       = "https://abcdefghijkl.supabase.co"
vercel_deployment_url  = "https://wasali.vercel.app"
edge_functions_base_url = "https://abcdefghijkl.supabase.co/functions/v1"
```

### 5. Run database migrations

```bash
supabase db push --project-ref $(terraform output -raw supabase_project_ref)
```

### 6. Deploy Edge Functions

```bash
PROJECT_REF=$(terraform output -raw supabase_project_ref)

supabase functions deploy create-payment-intent   --project-ref $PROJECT_REF
supabase functions deploy capture-payment         --project-ref $PROJECT_REF
supabase functions deploy stripe-webhook          --project-ref $PROJECT_REF
supabase functions deploy notify-booking-event    --project-ref $PROJECT_REF
supabase functions deploy accept-offer            --project-ref $PROJECT_REF
```

### 7. Set Edge Function secrets

```bash
supabase secrets set --project-ref $PROJECT_REF \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  RESEND_API_KEY="re_..."
```

### 8. Configure Stripe webhook

In the Stripe Dashboard → Developers → Webhooks → Add endpoint:

- **URL:** `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- **Events:** `payment_intent.succeeded`, `payment_intent.payment_failed`

Copy the signing secret and re-run step 7 with the real `STRIPE_WEBHOOK_SECRET`.

### 9. Update local .env.local

```bash
echo "EXPO_PUBLIC_SUPABASE_URL=$(terraform output -raw supabase_api_url)" >> ../.env.local
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=$(terraform output -raw supabase_anon_key)" >> ../.env.local
```

---

## Day-to-day operations

### Apply changes

```bash
terraform plan   # preview
terraform apply  # apply
```

### Refresh state (after manual Dashboard changes)

```bash
terraform refresh
```

### Destroy (⚠️ drops the database — use with extreme caution)

```bash
# supabase_project has prevent_destroy = true
# You must remove that lifecycle block before this will work
terraform destroy
```

---

## Environment promotion

| Environment | Branch | Vercel | Supabase |
|---|---|---|---|
| Production | `main` | `wasali.vercel.app` | Project ref in `terraform.tfvars` |
| Preview | `feature/*` | auto Vercel preview URL | Use local Supabase (`supabase start`) |
| Local | any | `localhost:8081` | `localhost:54321` |

For a staging environment, duplicate `supabase.tf` / `vercel.tf` with a `_staging` suffix and a separate `terraform.tfvars`.

---

## File structure

```
terraform/
├── main.tf                    # Provider config, backend
├── variables.tf               # Input variable definitions
├── outputs.tf                 # Output values
├── supabase.tf                # Supabase project + auth settings
├── vercel.tf                  # Vercel project + env vars
├── terraform.tfvars.example   # Template — copy to terraform.tfvars
├── terraform.tfvars           # Your actual values (git-ignored)
└── TERRAFORM.md               # This file
```
