terraform {
  required_version = ">= 1.6.0"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }

  # Remote state — uncomment and configure for team use
  # backend "s3" {
  #   bucket         = "wasali-terraform-state"
  #   key            = "wasali/terraform.tfstate"
  #   region         = "eu-west-1"
  #   encrypt        = true
  #   dynamodb_table = "wasali-terraform-locks"
  # }
}

provider "supabase" {
  access_token = var.supabase_access_token
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}
