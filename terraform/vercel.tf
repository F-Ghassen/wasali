# ─── Vercel Project ───────────────────────────────────────────────────────────

resource "vercel_project" "wasali" {
  name      = "wasali"
  framework = "create-react-app" # Expo web SPA (no SSR)

  git_repository = {
    type = "github"
    repo = "ghfa/wasali" # Update to your actual GitHub repo path
  }

  build_command   = "npx expo export --platform web"
  output_directory = "dist"
  install_command = "npm install"

  # Automatic deployments on push to main
  ignore_command = "git diff HEAD^ HEAD --quiet ."
}

# ─── Production Environment Variables ────────────────────────────────────────

resource "vercel_project_environment_variable" "supabase_url" {
  project_id = vercel_project.wasali.id
  team_id    = var.vercel_team_id
  key        = "EXPO_PUBLIC_SUPABASE_URL"
  value      = "https://${supabase_project.wasali.id}.supabase.co"
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "supabase_anon_key" {
  project_id = vercel_project.wasali.id
  team_id    = var.vercel_team_id
  key        = "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  value      = supabase_project.wasali.anon_key
  sensitive  = true
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "stripe_publishable_key" {
  project_id = vercel_project.wasali.id
  team_id    = var.vercel_team_id
  key        = "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  value      = var.stripe_publishable_key
  sensitive  = true
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "app_url" {
  project_id = vercel_project.wasali.id
  team_id    = var.vercel_team_id
  key        = "EXPO_PUBLIC_APP_URL"
  value      = "https://wasali.vercel.app"
  target     = ["production"]
}

resource "vercel_project_environment_variable" "app_url_preview" {
  project_id = vercel_project.wasali.id
  team_id    = var.vercel_team_id
  key        = "EXPO_PUBLIC_APP_URL"
  value      = "https://wasali-preview.vercel.app"
  target     = ["preview"]
}
