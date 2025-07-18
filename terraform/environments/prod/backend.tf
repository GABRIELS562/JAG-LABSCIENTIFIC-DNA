# Production Environment Backend Configuration
# This file contains environment-specific backend settings

terraform {
  backend "s3" {
    bucket         = "lims-terraform-state-prod"
    key            = "lims/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "lims-terraform-state-lock-prod"
    
    # Production-specific settings
    workspace_key_prefix = "prod"
    
    # Enhanced security and validation for production
    skip_region_validation      = false
    skip_credentials_validation = false
    skip_metadata_api_check     = false
    force_path_style           = false
    
    # Additional production safeguards
    shared_credentials_file = "~/.aws/credentials"
    profile                = "production"
  }
}