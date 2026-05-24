# Root Terragrunt Configuration
# This file contains configuration that is common to all environments

# Configure Terragrunt to automatically store tfstate files in a remote location
remote_state {
  backend = "local"
  config = {
    path = "${path_relative_to_include()}/terraform.tfstate"
  }

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# Generate provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}
EOF
}

# Configure root level variables that all resources can inherit
inputs = {
  project_name = "jag-lims"
  owner        = "devops"

  # Server IPs (Tailscale)
  server1_ip = "100.89.26.128"
  server2_ip = "100.103.13.92"

  # Common tags
  common_tags = {
    Project   = "JAG-LabScientific-LIMS"
    ManagedBy = "Terragrunt"
    Owner     = "DevOps"
  }
}
