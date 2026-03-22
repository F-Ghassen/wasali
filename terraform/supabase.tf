# ─── Supabase Project ─────────────────────────────────────────────────────────

resource "supabase_project" "wasali" {
  name            = "wasali"
  organization_id = var.supabase_organization_id
  database_password = var.supabase_db_password
  region          = var.supabase_project_region

  lifecycle {
    # Prevent accidental destruction of the production database
    prevent_destroy = true
    # Ignore password changes after initial creation (managed via Supabase Dashboard)
    ignore_changes = [database_password]
  }
}

# ─── Auth Settings ────────────────────────────────────────────────────────────

resource "supabase_settings" "auth" {
  project_ref = supabase_project.wasali.id

  auth = jsonencode({
    # Email + OTP login
    site_url                    = "https://wasali.vercel.app"
    additional_redirect_urls    = ["exp://localhost:8081", "wasali://"]
    jwt_expiry                  = 3600
    enable_signup               = true
    mailer_autoconfirm          = false
    sms_autoconfirm             = false
    mailer_otp_exp              = 600
    mailer_otp_length           = 6

    # Disable anonymous sign-ins (production)
    enable_anonymous_sign_ins   = false

    # Password requirements
    password_min_length         = 8
  })
}

# ─── Edge Function Secrets ───────────────────────────────────────────────────
# Supabase secrets are set via the CLI (not directly in Terraform) to avoid
# storing sensitive values in tfstate. The commands below are in TERRAFORM.md.
#
# Run once after `terraform apply`:
#   supabase secrets set --project-ref <ref> \
#     STRIPE_SECRET_KEY=<value> \
#     STRIPE_WEBHOOK_SECRET=<value> \
#     RESEND_API_KEY=<value>
