# Staging Environment Backend Configuration
# This file contains environment-specific backend settings

terraform {
  backend "s3" {
    bucket         = "lims-terraform-state-staging"
    key            = "lims/staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "lims-terraform-state-lock-staging"
    
    # Staging-specific settings
    workspace_key_prefix = "staging"
    
    # Enhanced validation for staging
    skip_region_validation      = false
    skip_credentials_validation = false
    skip_metadata_api_check     = false
    force_path_style           = false
  }
}