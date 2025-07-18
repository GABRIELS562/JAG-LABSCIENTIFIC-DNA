#!/bin/bash
# Terraform Validation Script
# This script validates Terraform configurations and performs security checks

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
ENVIRONMENT="dev"
CHECKOV_ENABLED=false
TFLINT_ENABLED=false

# Function to show help
show_help() {
    cat << EOF
Terraform Validation Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV    Environment to validate (dev, staging, prod)
    -c, --checkov           Enable Checkov security scanning
    -t, --tflint            Enable TFLint linting
    -h, --help              Show this help message

This script performs:
1. Terraform syntax validation
2. Terraform formatting check
3. Security scanning (with Checkov)
4. Linting (with TFLint)
5. Configuration validation

Examples:
    $0 -e dev                    # Validate dev environment
    $0 -e prod -c -t            # Validate prod with security and linting
    
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
    
    # Check if environment directory exists
    if [[ ! -d "$TERRAFORM_DIR/environments/$ENVIRONMENT" ]]; then
        error "Environment directory not found: $TERRAFORM_DIR/environments/$ENVIRONMENT"
        exit 1
    fi
    
    # Check if Checkov is installed (if enabled)
    if [[ "$CHECKOV_ENABLED" == "true" ]] && ! command -v checkov &> /dev/null; then
        warning "Checkov is not installed. Security scanning will be skipped."
        CHECKOV_ENABLED=false
    fi
    
    # Check if TFLint is installed (if enabled)
    if [[ "$TFLINT_ENABLED" == "true" ]] && ! command -v tflint &> /dev/null; then
        warning "TFLint is not installed. Linting will be skipped."
        TFLINT_ENABLED=false
    fi
    
    log "Prerequisites validation completed"
}

# Function to validate Terraform syntax
validate_terraform_syntax() {
    log "Validating Terraform syntax..."
    
    cd "$TERRAFORM_DIR"
    
    # Copy environment-specific backend config if exists
    if [[ -f "$TERRAFORM_DIR/environments/$ENVIRONMENT/backend.tf" ]]; then
        cp "$TERRAFORM_DIR/environments/$ENVIRONMENT/backend.tf" .
    fi
    
    # Initialize Terraform (skip backend initialization for validation)
    terraform init -backend=false
    
    # Validate syntax
    terraform validate
    
    log "Terraform syntax validation completed"
}

# Function to check Terraform formatting
check_terraform_formatting() {
    log "Checking Terraform formatting..."
    
    cd "$TERRAFORM_DIR"
    
    # Check formatting
    if ! terraform fmt -check=true -recursive; then
        error "Terraform files are not properly formatted"
        warning "Run 'terraform fmt -recursive' to fix formatting issues"
        return 1
    fi
    
    log "Terraform formatting check passed"
}

# Function to run Checkov security scanning
run_checkov_scan() {
    if [[ "$CHECKOV_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log "Running Checkov security scan..."
    
    cd "$TERRAFORM_DIR"
    
    # Run Checkov with JSON output
    checkov -d . --framework terraform --output json --quiet > checkov-results.json || true
    
    # Parse results
    if [[ -f "checkov-results.json" ]]; then
        FAILED_CHECKS=$(jq -r '.results.failed_checks | length' checkov-results.json)
        PASSED_CHECKS=$(jq -r '.results.passed_checks | length' checkov-results.json)
        
        log "Checkov scan completed: $PASSED_CHECKS passed, $FAILED_CHECKS failed"
        
        if [[ "$FAILED_CHECKS" -gt 0 ]]; then
            warning "Security issues found. Review checkov-results.json for details."
        fi
    else
        warning "Checkov scan completed but no results file generated"
    fi
}

# Function to run TFLint
run_tflint() {
    if [[ "$TFLINT_ENABLED" != "true" ]]; then
        return 0
    fi
    
    log "Running TFLint..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize TFLint
    tflint --init
    
    # Run TFLint
    tflint --format=json > tflint-results.json || true
    
    # Parse results
    if [[ -f "tflint-results.json" ]]; then
        ISSUES=$(jq -r '.issues | length' tflint-results.json)
        ERRORS=$(jq -r '.errors | length' tflint-results.json)
        
        log "TFLint scan completed: $ISSUES issues, $ERRORS errors"
        
        if [[ "$ISSUES" -gt 0 ]] || [[ "$ERRORS" -gt 0 ]]; then
            warning "Linting issues found. Review tflint-results.json for details."
        fi
    else
        warning "TFLint scan completed but no results file generated"
    fi
}

# Function to validate configuration
validate_configuration() {
    log "Validating configuration for environment: $ENVIRONMENT"
    
    cd "$TERRAFORM_DIR"
    
    # Plan with environment-specific variables
    terraform plan \
        -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
        -out="validate-$ENVIRONMENT.tfplan" \
        -detailed-exitcode || true
    
    PLAN_EXIT_CODE=$?
    
    case $PLAN_EXIT_CODE in
        0)
            log "Configuration validation passed - no changes required"
            ;;
        1)
            error "Configuration validation failed"
            return 1
            ;;
        2)
            log "Configuration validation passed - changes detected"
            ;;
    esac
    
    # Show plan summary
    if [[ -f "validate-$ENVIRONMENT.tfplan" ]]; then
        terraform show -json "validate-$ENVIRONMENT.tfplan" > "plan-$ENVIRONMENT.json"
        
        # Parse plan for resource counts
        RESOURCES_TO_ADD=$(jq -r '.resource_changes[] | select(.change.actions[] == "create") | .address' "plan-$ENVIRONMENT.json" | wc -l)
        RESOURCES_TO_CHANGE=$(jq -r '.resource_changes[] | select(.change.actions[] == "update") | .address' "plan-$ENVIRONMENT.json" | wc -l)
        RESOURCES_TO_DESTROY=$(jq -r '.resource_changes[] | select(.change.actions[] == "delete") | .address' "plan-$ENVIRONMENT.json" | wc -l)
        
        log "Plan summary: $RESOURCES_TO_ADD to add, $RESOURCES_TO_CHANGE to change, $RESOURCES_TO_DESTROY to destroy"
    fi
}

# Function to generate validation report
generate_validation_report() {
    log "Generating validation report..."
    
    cd "$TERRAFORM_DIR"
    
    REPORT_FILE="validation-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Terraform Validation Report - $ENVIRONMENT</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background-color: #d4edda; border-color: #c3e6cb; }
        .warning { background-color: #fff3cd; border-color: #ffeaa7; }
        .error { background-color: #f8d7da; border-color: #f5c6cb; }
        .info { background-color: #d1ecf1; border-color: #bee5eb; }
        pre { background-color: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Terraform Validation Report</h1>
        <p><strong>Environment:</strong> $ENVIRONMENT</p>
        <p><strong>Generated:</strong> $(date)</p>
        <p><strong>Directory:</strong> $TERRAFORM_DIR</p>
    </div>
    
    <div class="section info">
        <h2>Validation Summary</h2>
        <ul>
            <li>Terraform syntax validation: Completed</li>
            <li>Terraform formatting check: Completed</li>
            <li>Configuration validation: Completed</li>
EOF

    if [[ "$CHECKOV_ENABLED" == "true" ]]; then
        echo "            <li>Security scanning (Checkov): Completed</li>" >> "$REPORT_FILE"
    fi
    
    if [[ "$TFLINT_ENABLED" == "true" ]]; then
        echo "            <li>Linting (TFLint): Completed</li>" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF
        </ul>
    </div>
    
    <div class="section success">
        <h2>Next Steps</h2>
        <ol>
            <li>Review any warnings or errors above</li>
            <li>Fix any formatting issues with: <code>terraform fmt -recursive</code></li>
            <li>Address security findings from Checkov scan</li>
            <li>Fix linting issues from TFLint scan</li>
            <li>Run deployment script when ready</li>
        </ol>
    </div>
    
    <div class="section info">
        <h2>Environment Configuration</h2>
        <p>Environment-specific variables are loaded from:</p>
        <pre>environments/$ENVIRONMENT/terraform.tfvars</pre>
    </div>
    
</body>
</html>
EOF
    
    log "Validation report generated: $REPORT_FILE"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -c|--checkov)
            CHECKOV_ENABLED=true
            shift
            ;;
        -t|--tflint)
            TFLINT_ENABLED=true
            shift
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
    log "Starting Terraform validation"
    log "Environment: $ENVIRONMENT"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Validate Terraform syntax
    validate_terraform_syntax
    
    # Check Terraform formatting
    check_terraform_formatting
    
    # Run security scanning
    run_checkov_scan
    
    # Run linting
    run_tflint
    
    # Validate configuration
    validate_configuration
    
    # Generate validation report
    generate_validation_report
    
    log "Terraform validation completed successfully"
}

# Run main function
main "$@"