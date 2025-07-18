#!/bin/bash
# Terraform Deployment Script - Terraform Associate Skills Demonstration
# This script demonstrates Terraform workflow, state management, and best practices

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
ENVIRONMENTS_DIR="$TERRAFORM_DIR/environments"

# Default values
ENVIRONMENT="dev"
ACTION="plan"
AUTO_APPROVE=false
DESTROY=false
FORCE=false
WORKSPACE=""

# Function to show help
show_help() {
    cat << EOF
Terraform Deployment Script - Terraform Associate Skills Demonstration

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Environment to deploy (dev, staging, prod)
    -a, --action ACTION      Action to perform (plan, apply, destroy)
    -y, --auto-approve       Auto approve terraform apply
    -d, --destroy            Destroy infrastructure
    -f, --force              Force action without confirmation
    -w, --workspace NAME     Terraform workspace to use
    -h, --help               Show this help message

Examples:
    $0 -e dev -a plan                    # Plan development environment
    $0 -e prod -a apply                  # Apply production environment
    $0 -e dev -a destroy -y              # Destroy development environment with auto-approve
    $0 -e prod -a apply -w production    # Apply to production workspace

Environments:
    dev         Development environment (minimal resources)
    staging     Staging environment (production-like)
    prod        Production environment (full resources)

Actions:
    plan        Show what Terraform will do
    apply       Apply the Terraform configuration
    destroy     Destroy all resources
    validate    Validate the configuration
    format      Format Terraform files
    output      Show output values
    state       Show Terraform state
    import      Import existing resources
    refresh     Refresh state

EOF
}

# Function to validate prerequisites
validate_prerequisites() {
    log "Validating prerequisites..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    # Check Terraform version
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    log "Terraform version: $TERRAFORM_VERSION"
    
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
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        error "jq is not installed. Please install jq for JSON processing."
        exit 1
    fi
    
    # Check if environment directory exists
    if [[ ! -d "$ENVIRONMENTS_DIR/$ENVIRONMENT" ]]; then
        error "Environment directory not found: $ENVIRONMENTS_DIR/$ENVIRONMENT"
        exit 1
    fi
    
    # Check if tfvars file exists
    if [[ ! -f "$ENVIRONMENTS_DIR/$ENVIRONMENT/terraform.tfvars" ]]; then
        error "Terraform variables file not found: $ENVIRONMENTS_DIR/$ENVIRONMENT/terraform.tfvars"
        exit 1
    fi
    
    log "Prerequisites validation completed"
}

# Function to initialize Terraform
terraform_init() {
    log "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Copy environment-specific backend config if exists
    if [[ -f "$ENVIRONMENTS_DIR/$ENVIRONMENT/backend.tf" ]]; then
        cp "$ENVIRONMENTS_DIR/$ENVIRONMENT/backend.tf" .
    fi
    
    # Initialize with backend reconfiguration
    terraform init \
        -backend-config="bucket=lims-terraform-state-${ENVIRONMENT}-$(date +%Y%m%d)" \
        -backend-config="key=lims/${ENVIRONMENT}/terraform.tfstate" \
        -backend-config="region=us-east-1" \
        -backend-config="encrypt=true" \
        -backend-config="dynamodb_table=lims-terraform-state-lock-${ENVIRONMENT}" \
        -reconfigure
    
    log "Terraform initialization completed"
}

# Function to select or create workspace
terraform_workspace() {
    log "Managing Terraform workspace..."
    
    cd "$TERRAFORM_DIR"
    
    # If workspace is specified, use it
    if [[ -n "$WORKSPACE" ]]; then
        ENVIRONMENT="$WORKSPACE"
    fi
    
    # List existing workspaces
    EXISTING_WORKSPACES=$(terraform workspace list)
    
    # Create workspace if it doesn't exist
    if ! echo "$EXISTING_WORKSPACES" | grep -q "$ENVIRONMENT"; then
        log "Creating workspace: $ENVIRONMENT"
        terraform workspace new "$ENVIRONMENT"
    else
        log "Selecting workspace: $ENVIRONMENT"
        terraform workspace select "$ENVIRONMENT"
    fi
    
    # Show current workspace
    CURRENT_WORKSPACE=$(terraform workspace show)
    log "Current workspace: $CURRENT_WORKSPACE"
}

# Function to validate Terraform configuration
terraform_validate() {
    log "Validating Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Format check
    if ! terraform fmt -check=true; then
        warning "Terraform files are not properly formatted"
        if [[ "$ACTION" == "format" ]]; then
            terraform fmt -recursive
            log "Terraform files formatted"
            return 0
        fi
    fi
    
    # Validate configuration
    terraform validate
    
    log "Terraform validation completed"
}

# Function to plan Terraform changes
terraform_plan() {
    log "Planning Terraform changes..."
    
    cd "$TERRAFORM_DIR"
    
    # Plan with environment-specific variables
    PLAN_FILE="$ENVIRONMENTS_DIR/$ENVIRONMENT/terraform.tfplan"
    
    terraform plan \
        -var-file="$ENVIRONMENTS_DIR/$ENVIRONMENT/terraform.tfvars" \
        -out="$PLAN_FILE" \
        -detailed-exitcode
    
    PLAN_EXIT_CODE=$?
    
    case $PLAN_EXIT_CODE in
        0)
            log "No changes required"
            ;;
        1)
            error "Terraform plan failed"
            exit 1
            ;;
        2)
            log "Changes detected in plan"
            ;;
    esac
    
    # Show plan summary
    terraform show -json "$PLAN_FILE" | jq -r '.planned_values.root_module.resources[] | select(.values.tags.Environment == "'$ENVIRONMENT'") | .address'
    
    log "Terraform plan completed"
}

# Function to apply Terraform changes
terraform_apply() {
    log "Applying Terraform changes..."
    
    cd "$TERRAFORM_DIR"
    
    # Check if plan file exists
    PLAN_FILE="$ENVIRONMENTS_DIR/$ENVIRONMENT/terraform.tfplan"
    
    if [[ ! -f "$PLAN_FILE" ]]; then
        warning "Plan file not found, running plan first..."
        terraform_plan
    fi
    
    # Apply with auto-approve if specified
    if [[ "$AUTO_APPROVE" == "true" ]]; then
        terraform apply -auto-approve "$PLAN_FILE"
    else
        terraform apply "$PLAN_FILE"
    fi
    
    # Save outputs
    terraform output -json > "$ENVIRONMENTS_DIR/$ENVIRONMENT/outputs.json"
    
    log "Terraform apply completed"
}

# Function to destroy Terraform infrastructure
terraform_destroy() {
    log "Destroying Terraform infrastructure..."
    
    cd "$TERRAFORM_DIR"
    
    # Confirmation prompt
    if [[ "$AUTO_APPROVE" != "true" && "$FORCE" != "true" ]]; then
        echo -e "${RED}WARNING: This will destroy all resources in the $ENVIRONMENT environment!${NC}"
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
        if [[ ! $REPLY =~ ^yes$ ]]; then
            log "Destroy cancelled by user"
            exit 0
        fi
    fi
    
    # Destroy with auto-approve if specified
    if [[ "$AUTO_APPROVE" == "true" || "$FORCE" == "true" ]]; then
        terraform destroy \
            -var-file="$ENVIRONMENTS_DIR/$ENVIRONMENT/terraform.tfvars" \
            -auto-approve
    else
        terraform destroy \
            -var-file="$ENVIRONMENTS_DIR/$ENVIRONMENT/terraform.tfvars"
    fi
    
    log "Terraform destroy completed"
}

# Function to show outputs
terraform_output() {
    log "Showing Terraform outputs..."
    
    cd "$TERRAFORM_DIR"
    
    # Show all outputs
    terraform output
    
    # Save outputs to file
    terraform output -json > "$ENVIRONMENTS_DIR/$ENVIRONMENT/outputs.json"
    
    log "Outputs saved to: $ENVIRONMENTS_DIR/$ENVIRONMENT/outputs.json"
}

# Function to show state
terraform_state() {
    log "Showing Terraform state..."
    
    cd "$TERRAFORM_DIR"
    
    # Show state list
    terraform state list
    
    # Show state statistics
    echo ""
    echo "State Statistics:"
    echo "Resources: $(terraform state list | wc -l)"
    echo "Workspace: $(terraform workspace show)"
    echo "Backend: $(terraform version -json | jq -r '.terraform_version')"
    
    log "Terraform state information displayed"
}

# Function to refresh state
terraform_refresh() {
    log "Refreshing Terraform state..."
    
    cd "$TERRAFORM_DIR"
    
    terraform refresh \
        -var-file="$ENVIRONMENTS_DIR/$ENVIRONMENT/terraform.tfvars"
    
    log "Terraform state refreshed"
}

# Function to import resources
terraform_import() {
    log "Importing existing resources..."
    
    cd "$TERRAFORM_DIR"
    
    # Example imports (customize based on your needs)
    info "Import examples:"
    info "terraform import aws_vpc.main vpc-12345678"
    info "terraform import aws_subnet.public subnet-12345678"
    info "terraform import aws_security_group.app sg-12345678"
    
    log "Terraform import completed"
}

# Function to create backup
create_backup() {
    log "Creating backup of Terraform state..."
    
    BACKUP_DIR="$ENVIRONMENTS_DIR/$ENVIRONMENT/backups"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/terraform-state-backup-$(date +%Y%m%d-%H%M%S).tfstate"
    
    cd "$TERRAFORM_DIR"
    terraform state pull > "$BACKUP_FILE"
    
    log "State backup created: $BACKUP_FILE"
}

# Function to perform post-deployment tasks
post_deployment() {
    log "Performing post-deployment tasks..."
    
    # Update kubectl config if EKS is enabled
    if terraform output -json | jq -e '.cluster_info.value' > /dev/null 2>&1; then
        CLUSTER_NAME=$(terraform output -json | jq -r '.cluster_info.value.cluster_name')
        REGION=$(terraform output -json | jq -r '.cluster_info.value.region')
        
        if [[ "$CLUSTER_NAME" != "null" && "$REGION" != "null" ]]; then
            log "Updating kubectl configuration for EKS cluster: $CLUSTER_NAME"
            aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"
        fi
    fi
    
    # Show important outputs
    if terraform output -json | jq -e '.application_urls.value' > /dev/null 2>&1; then
        log "Application URLs:"
        terraform output -json | jq -r '.application_urls.value | to_entries[] | select(.value != null) | "\(.key): \(.value)"'
    fi
    
    log "Post-deployment tasks completed"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -y|--auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        -d|--destroy)
            DESTROY=true
            ACTION="destroy"
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -w|--workspace)
            WORKSPACE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log "Starting Terraform deployment script"
    log "Environment: $ENVIRONMENT"
    log "Action: $ACTION"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Create backup before making changes
    if [[ "$ACTION" == "apply" || "$ACTION" == "destroy" ]]; then
        create_backup
    fi
    
    # Initialize Terraform
    terraform_init
    
    # Manage workspace
    terraform_workspace
    
    # Validate configuration
    terraform_validate
    
    # Execute action
    case $ACTION in
        "plan")
            terraform_plan
            ;;
        "apply")
            terraform_plan
            terraform_apply
            post_deployment
            ;;
        "destroy")
            terraform_destroy
            ;;
        "validate")
            terraform_validate
            ;;
        "format")
            terraform_validate
            ;;
        "output")
            terraform_output
            ;;
        "state")
            terraform_state
            ;;
        "import")
            terraform_import
            ;;
        "refresh")
            terraform_refresh
            ;;
        *)
            error "Unknown action: $ACTION"
            show_help
            exit 1
            ;;
    esac
    
    log "Terraform deployment script completed successfully"
}

# Run main function
main "$@"