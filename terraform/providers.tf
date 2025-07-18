# Terraform Provider Configuration - Terraform Associate Skills Demonstration
# This file demonstrates provider management, version constraints, and multi-provider setup

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
  
  # Backend configuration for state management
  backend "s3" {
    bucket                  = "lims-terraform-state-bucket"
    key                     = "lims/terraform.tfstate"
    region                  = "us-east-1"
    encrypt                 = true
    dynamodb_table          = "lims-terraform-state-lock"
    shared_credentials_file = "~/.aws/credentials"
    profile                 = "default"
    
    # Enable versioning and lifecycle management
    versioning = true
    
    # Server-side encryption
    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm = "AES256"
        }
      }
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region
  
  # Default tags applied to all resources
  default_tags {
    tags = {
      Project     = "LabScientific-LIMS"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.project_owner
      CostCenter  = var.cost_center
      CreatedBy   = "DevOps-Showcase"
    }
  }
  
  # Assume role configuration for cross-account access
  assume_role {
    role_arn     = var.assume_role_arn
    session_name = "terraform-lims-session"
  }
}

# AWS Provider for different region (multi-region setup)
provider "aws" {
  alias  = "backup_region"
  region = var.backup_region
  
  default_tags {
    tags = {
      Project     = "LabScientific-LIMS"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.project_owner
      CostCenter  = var.cost_center
      CreatedBy   = "DevOps-Showcase"
      Purpose     = "Backup-Region"
    }
  }
}

# Kubernetes Provider Configuration
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
  
  # Alternative: Use local kubectl config
  # config_path = "~/.kube/config"
  # config_context = "lims-cluster"
}

# Helm Provider Configuration
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
  
  # Helm settings
  registry_config_path = pathexpand("~/.config/helm/registry.json")
  repository_config_path = pathexpand("~/.config/helm/repositories.yaml")
  repository_cache = pathexpand("~/.cache/helm/repository")
}