# ─── Supabase ─────────────────────────────────────────────────────────────────

variable "supabase_access_token" {
  description = "Supabase management API access token (from app.supabase.com/account/tokens)"
  type        = string
  sensitive   = true
}

variable "supabase_organization_id" {
  description = "Supabase organization ID (from app.supabase.com/org settings)"
  type        = string
}

variable "supabase_db_password" {
  description = "Postgres database password for the Supabase project"
  type        = string
  sensitive   = true
}

variable "supabase_project_region" {
  description = "Supabase project region (e.g. eu-central-1 for Frankfurt)"
  type        = string
  default     = "eu-central-1"
}

# ─── Stripe ───────────────────────────────────────────────────────────────────

variable "stripe_secret_key" {
  description = "Stripe secret key (sk_live_... or sk_test_...)"
  type        = string
  sensitive   = true
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key (pk_live_... or pk_test_...)"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret for Edge Function verification"
  type        = string
  sensitive   = true
}

# ─── Vercel ───────────────────────────────────────────────────────────────────

variable "vercel_api_token" {
  description = "Vercel personal access token or team token"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID (e.g. team_lw3SwDpATEL5wEVaDfF3wvcS)"
  type        = string
  default     = "team_lw3SwDpATEL5wEVaDfF3wvcS"
}

# ─── Optional: Resend ─────────────────────────────────────────────────────────

variable "resend_api_key" {
  description = "Resend API key — used for Supabase auth SMTP (OTP, password reset)"
  type        = string
  sensitive   = true
}

# ─── Optional: Expo / EAS ────────────────────────────────────────────────────

variable "expo_access_token" {
  description = "Expo access token for EAS builds (optional)"
  type        = string
  sensitive   = true
  default     = ""
}
