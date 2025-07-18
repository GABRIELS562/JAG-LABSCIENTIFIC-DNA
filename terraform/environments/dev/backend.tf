# Development Environment Backend Configuration
# This file contains environment-specific backend settings

terraform {
  backend "s3" {
    bucket         = "lims-terraform-state-dev"
    key            = "lims/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "lims-terraform-state-lock-dev"
    
    # Development-specific settings
    workspace_key_prefix = "dev"
    
    # Optional: Reduced consistency for development
    skip_region_validation      = false
    skip_credentials_validation = false
    skip_metadata_api_check     = false
    force_path_style           = false
  }
}