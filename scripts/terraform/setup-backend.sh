#!/bin/bash
# Terraform Backend Setup Script
# This script sets up the S3 buckets and DynamoDB tables for Terraform state management

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(cd "$SCRIPT_DIR/../../terraform" && pwd)"
BACKEND_DIR="$TERRAFORM_DIR/backend"

# Create backend directory if it doesn't exist
mkdir -p "$BACKEND_DIR"

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Please configure AWS CLI."
        exit 1
    fi
    
    log "Prerequisites check completed"
}

# Function to create backend configuration
create_backend_config() {
    log "Creating backend-only Terraform configuration..."
    
    # Create a minimal backend setup configuration
    cat > "$BACKEND_DIR/main.tf" << 'EOF'
# Backend Setup Configuration
# This configuration creates the S3 buckets and DynamoDB tables for state management

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Import the backend setup resources
EOF
    
    # Copy the backend setup resources
    cp "$TERRAFORM_DIR/backend-setup.tf" "$BACKEND_DIR/"
    
    # Create variables file for backend setup
    cat > "$BACKEND_DIR/variables.tf" << 'EOF'
variable "aws_region" {
  description = "AWS region for backend resources"
  type        = string
  default     = "us-east-1"
}
EOF
    
    # Create terraform.tfvars for backend setup
    cat > "$BACKEND_DIR/terraform.tfvars" << 'EOF'
aws_region = "us-east-1"
EOF
    
    log "Backend configuration created"
}

# Function to initialize and apply backend setup
setup_backend() {
    log "Setting up Terraform backend infrastructure..."
    
    cd "$BACKEND_DIR"
    
    # Initialize Terraform
    log "Initializing Terraform..."
    terraform init
    
    # Plan the backend setup
    log "Planning backend infrastructure..."
    terraform plan -out=backend-setup.tfplan
    
    # Apply the backend setup
    log "Creating backend infrastructure..."
    terraform apply backend-setup.tfplan
    
    # Get outputs
    log "Retrieving backend configuration..."
    terraform output -json > backend-outputs.json
    
    log "Backend setup completed successfully"
}

# Function to update backend configurations
update_backend_configs() {
    log "Updating backend configuration files..."
    
    cd "$BACKEND_DIR"
    
    # Get the bucket names from terraform output
    DEV_BUCKET=$(terraform output -raw terraform_state_bucket_dev)
    STAGING_BUCKET=$(terraform output -raw terraform_state_bucket_staging)
    PROD_BUCKET=$(terraform output -raw terraform_state_bucket_prod)
    
    DEV_DYNAMODB=$(terraform output -raw dynamodb_table_dev)
    STAGING_DYNAMODB=$(terraform output -raw dynamodb_table_staging)
    PROD_DYNAMODB=$(terraform output -raw dynamodb_table_prod)
    
    # Update dev backend configuration
    cat > "$TERRAFORM_DIR/environments/dev/backend.tf" << EOF
# Development Environment Backend Configuration
# This file contains environment-specific backend settings

terraform {
  backend "s3" {
    bucket         = "$DEV_BUCKET"
    key            = "lims/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "$DEV_DYNAMODB"
    
    # Development-specific settings
    workspace_key_prefix = "dev"
    
    # Optional: Reduced consistency for development
    skip_region_validation      = false
    skip_credentials_validation = false
    skip_metadata_api_check     = false
    force_path_style           = false
  }
}
EOF
    
    # Update staging backend configuration
    cat > "$TERRAFORM_DIR/environments/staging/backend.tf" << EOF
# Staging Environment Backend Configuration
# This file contains environment-specific backend settings

terraform {
  backend "s3" {
    bucket         = "$STAGING_BUCKET"
    key            = "lims/staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "$STAGING_DYNAMODB"
    
    # Staging-specific settings
    workspace_key_prefix = "staging"
    
    # Enhanced validation for staging
    skip_region_validation      = false
    skip_credentials_validation = false
    skip_metadata_api_check     = false
    force_path_style           = false
  }
}
EOF
    
    # Update prod backend configuration
    cat > "$TERRAFORM_DIR/environments/prod/backend.tf" << EOF
# Production Environment Backend Configuration
# This file contains environment-specific backend settings

terraform {
  backend "s3" {
    bucket         = "$PROD_BUCKET"
    key            = "lims/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "$PROD_DYNAMODB"
    
    # Production-specific settings
    workspace_key_prefix = "prod"
    
    # Enhanced security and validation for production
    skip_region_validation      = false
    skip_credentials_validation = false
    skip_metadata_api_check     = false
    force_path_style           = false
    
    # Additional production safeguards
    shared_credentials_file = "~/.aws/credentials"
    profile                = "default"
  }
}
EOF
    
    log "Backend configuration files updated"
}

# Function to show usage
show_usage() {
    cat << EOF
Terraform Backend Setup Script

Usage: $0 [OPTIONS]

Options:
    -r, --region REGION      AWS region (default: us-east-1)
    -h, --help               Show this help message

This script will:
1. Create S3 buckets for Terraform state storage
2. Create DynamoDB tables for state locking
3. Update backend configuration files
4. Set up proper encryption and versioning

Examples:
    $0                       # Setup with default region
    $0 -r us-west-2         # Setup with specific region
    
EOF
}

# Parse command line arguments
AWS_REGION="us-east-1"

while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log "Starting Terraform backend setup"
    log "AWS Region: $AWS_REGION"
    
    # Check prerequisites
    check_prerequisites
    
    # Create backend configuration
    create_backend_config
    
    # Setup backend infrastructure
    setup_backend
    
    # Update backend configurations
    update_backend_configs
    
    log "Backend setup completed successfully!"
    
    info "Next steps:"
    info "1. Navigate to the terraform directory"
    info "2. Copy the appropriate backend configuration:"
    info "   cp environments/dev/backend.tf . (for dev)"
    info "   cp environments/staging/backend.tf . (for staging)"
    info "   cp environments/prod/backend.tf . (for prod)"
    info "3. Run 'terraform init' to initialize with the new backend"
    info "4. Run 'terraform plan' to verify your configuration"
    info "5. Run 'terraform apply' to create your infrastructure"
}

# Run main function
main "$@"