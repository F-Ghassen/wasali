output "supabase_project_ref" {
  description = "Supabase project reference ID"
  value       = supabase_project.wasali.id
}

output "supabase_api_url" {
  description = "Supabase REST API URL"
  value       = "https://${supabase_project.wasali.id}.supabase.co"
}

output "supabase_db_host" {
  description = "Postgres direct connection host"
  value       = "db.${supabase_project.wasali.id}.supabase.co"
}

output "supabase_anon_key" {
  description = "Supabase anon/public JWT key"
  value       = supabase_project.wasali.anon_key
  sensitive   = true
}

output "vercel_project_id" {
  description = "Vercel project ID"
  value       = vercel_project.wasali.id
}

output "vercel_deployment_url" {
  description = "Primary Vercel deployment URL"
  value       = "https://wasali.vercel.app"
}

output "edge_functions_base_url" {
  description = "Supabase Edge Functions base URL"
  value       = "https://${supabase_project.wasali.id}.supabase.co/functions/v1"
}
