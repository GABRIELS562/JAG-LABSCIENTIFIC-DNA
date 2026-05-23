# Root Terragrunt configuration
# All environment-specific configs inherit from this

locals {
  # Parse the path to get environment info
  path_parts   = split("/", path_relative_to_include())
  environment  = try(local.path_parts[1], "default")

  # Common tags for all resources
  common_tags = {
    Project     = "LIMS"
    ManagedBy   = "Terragrunt"
    Repository  = "JAG-LABSCIENTIFIC-DNA"
  }
}

# Generate provider configurations
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Kubernetes provider - configured via KUBECONFIG env var
provider "kubernetes" {
  config_path = "~/.kube/config"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

# AWS provider - only used for AWS infrastructure
provider "aws" {
  region = "af-south-1"  # Cape Town region

  default_tags {
    tags = {
      Project   = "LIMS"
      ManagedBy = "Terraform"
    }
  }
}
EOF
}

# Remote state configuration
remote_state {
  backend = "local"
  config = {
    path = "${get_parent_terragrunt_dir()}/.terraform-state/${path_relative_to_include()}/terraform.tfstate"
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# Input variables available to all child modules
inputs = {
  environment = local.environment
  common_tags = local.common_tags
}
