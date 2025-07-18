#!/bin/bash
# Kubernetes Deployment Script for LIMS
# This script provides comprehensive Kubernetes deployment with advanced features

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

debug() {
    echo -e "${CYAN}[DEBUG]${NC} $1"
}

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
K8S_DIR="$PROJECT_ROOT/k8s"
HELM_DIR="$PROJECT_ROOT/helm/lims"

# Default values
NAMESPACE="labscientific-lims"
ENVIRONMENT="dev"
DEPLOYMENT_TYPE="helm"
HELM_RELEASE_NAME="lims"
DRY_RUN=false
FORCE=false
SKIP_DEPS=false
SKIP_TESTS=false
WAIT_TIMEOUT="600s"
VALUES_FILE=""
CUSTOM_VALUES=""
IMAGE_TAG="latest"
CHART_VERSION=""

# Function to show help
show_help() {
    cat << EOF
Kubernetes Deployment Script for LIMS

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV       Environment (dev, staging, prod) [default: dev]
    -n, --namespace NAMESPACE   Kubernetes namespace [default: labscientific-lims]
    -t, --type TYPE            Deployment type (helm, manifest, kustomize) [default: helm]
    -r, --release NAME         Helm release name [default: lims]
    -f, --values-file FILE     Values file path for Helm
    -v, --set KEY=VALUE        Set custom values (can be used multiple times)
    -i, --image-tag TAG        Container image tag [default: latest]
    -c, --chart-version VER    Helm chart version
    -w, --wait-timeout TIME    Wait timeout for deployment [default: 600s]
    -d, --dry-run             Perform a dry run without applying changes
    -F, --force               Force deployment even if validation fails
    -S, --skip-deps           Skip dependency installation
    -T, --skip-tests          Skip running tests
    -h, --help                Show this help message

Examples:
    $0 -e dev -t helm                        # Deploy to dev with Helm
    $0 -e prod -t helm -f values-prod.yaml   # Deploy to prod with custom values
    $0 -e staging -t manifest -d             # Dry run with Kubernetes manifests
    $0 -e prod -v image.tag=v1.2.3           # Deploy with custom image tag
    
Deployment Types:
    helm        Use Helm charts (recommended)
    manifest    Use raw Kubernetes manifests
    kustomize   Use Kustomize for customization

Environments:
    dev         Development environment
    staging     Staging environment
    prod        Production environment

EOF
}

# Function to validate prerequisites
validate_prerequisites() {
    log "Validating prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error "kubectl cannot connect to cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Check if Helm is installed (if using Helm deployment)
    if [[ "$DEPLOYMENT_TYPE" == "helm" ]]; then
        if ! command -v helm &> /dev/null; then
            error "Helm is not installed. Please install Helm first."
            exit 1
        fi
    fi
    
    # Check if Kustomize is installed (if using Kustomize deployment)
    if [[ "$DEPLOYMENT_TYPE" == "kustomize" ]]; then
        if ! command -v kustomize &> /dev/null; then
            error "Kustomize is not installed. Please install Kustomize first."
            exit 1
        fi
    fi
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
        exit 1
    fi
    
    log "Prerequisites validation completed"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    log "Ensuring namespace exists: $NAMESPACE"
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
        
        # Label namespace for network policies
        kubectl label namespace "$NAMESPACE" name="$NAMESPACE" --overwrite
        kubectl label namespace "$NAMESPACE" environment="$ENVIRONMENT" --overwrite
    else
        debug "Namespace $NAMESPACE already exists"
    fi
}

# Function to setup RBAC
setup_rbac() {
    log "Setting up RBAC..."
    
    # Apply service account and RBAC
    if [[ -f "$K8S_DIR/rbac.yaml" ]]; then
        kubectl apply -f "$K8S_DIR/rbac.yaml" -n "$NAMESPACE"
    else
        warning "RBAC configuration not found at $K8S_DIR/rbac.yaml"
    fi
}

# Function to handle secrets
manage_secrets() {
    log "Managing secrets..."
    
    # Check if secrets already exist
    if kubectl get secret lims-secrets -n "$NAMESPACE" &> /dev/null; then
        warning "Secrets already exist. Skipping secret creation."
        return
    fi
    
    # Create secrets based on environment
    case "$ENVIRONMENT" in
        "dev")
            kubectl create secret generic lims-secrets \
                --from-literal=postgres-password='dev-password' \
                --from-literal=redis-password='dev-redis-password' \
                --from-literal=jwt-secret='dev-jwt-secret' \
                --from-literal=encryption-key='dev-encryption-key-32-chars' \
                -n "$NAMESPACE"
            ;;
        "staging")
            kubectl create secret generic lims-secrets \
                --from-literal=postgres-password='staging-password' \
                --from-literal=redis-password='staging-redis-password' \
                --from-literal=jwt-secret='staging-jwt-secret' \
                --from-literal=encryption-key='staging-encryption-key-32-chars' \
                -n "$NAMESPACE"
            ;;
        "prod")
            # For production, secrets should be managed externally
            warning "Production secrets should be managed externally (e.g., using external-secrets operator)"
            warning "Please ensure secrets are created before deployment"
            ;;
    esac
    
    # Create TLS secrets if certificates exist
    if [[ -f "$PROJECT_ROOT/certs/tls.crt" && -f "$PROJECT_ROOT/certs/tls.key" ]]; then
        kubectl create secret tls lims-tls \
            --cert="$PROJECT_ROOT/certs/tls.crt" \
            --key="$PROJECT_ROOT/certs/tls.key" \
            -n "$NAMESPACE"
    fi
}

# Function to deploy with Helm
deploy_with_helm() {
    log "Deploying with Helm..."
    
    # Change to Helm directory
    cd "$HELM_DIR"
    
    # Install or upgrade Helm dependencies
    if [[ "$SKIP_DEPS" == "false" ]]; then
        log "Installing Helm dependencies..."
        helm dependency update
    fi
    
    # Prepare Helm command
    HELM_CMD="helm upgrade --install $HELM_RELEASE_NAME . --namespace $NAMESPACE --create-namespace"
    
    # Add values file if specified
    if [[ -n "$VALUES_FILE" ]]; then
        if [[ -f "$VALUES_FILE" ]]; then
            HELM_CMD="$HELM_CMD --values $VALUES_FILE"
        else
            error "Values file not found: $VALUES_FILE"
            exit 1
        fi
    fi
    
    # Add environment-specific values
    if [[ -f "values-$ENVIRONMENT.yaml" ]]; then
        HELM_CMD="$HELM_CMD --values values-$ENVIRONMENT.yaml"
    fi
    
    # Add custom values
    if [[ -n "$CUSTOM_VALUES" ]]; then
        HELM_CMD="$HELM_CMD --set $CUSTOM_VALUES"
    fi
    
    # Add image tag if specified
    if [[ -n "$IMAGE_TAG" ]]; then
        HELM_CMD="$HELM_CMD --set image.tag=$IMAGE_TAG"
    fi
    
    # Add chart version if specified
    if [[ -n "$CHART_VERSION" ]]; then
        HELM_CMD="$HELM_CMD --version $CHART_VERSION"
    fi
    
    # Add wait timeout
    HELM_CMD="$HELM_CMD --timeout $WAIT_TIMEOUT --wait"
    
    # Add dry run if specified
    if [[ "$DRY_RUN" == "true" ]]; then
        HELM_CMD="$HELM_CMD --dry-run"
    fi
    
    # Add force if specified
    if [[ "$FORCE" == "true" ]]; then
        HELM_CMD="$HELM_CMD --force"
    fi
    
    # Execute Helm command
    debug "Executing: $HELM_CMD"
    eval "$HELM_CMD"
    
    # Show deployment status
    if [[ "$DRY_RUN" == "false" ]]; then
        helm status "$HELM_RELEASE_NAME" -n "$NAMESPACE"
    fi
}

# Function to deploy with Kubernetes manifests
deploy_with_manifests() {
    log "Deploying with Kubernetes manifests..."
    
    # Apply manifests in order
    local manifests=(
        "namespace.yaml"
        "rbac.yaml"
        "configmap.yaml"
        "secrets.yaml"
        "pvc.yaml"
        "deployment.yaml"
        "service.yaml"
        "ingress.yaml"
        "hpa.yaml"
        "network-policies.yaml"
        "pod-security-policies.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        local manifest_path="$K8S_DIR/$manifest"
        
        if [[ -f "$manifest_path" ]]; then
            log "Applying $manifest..."
            if [[ "$DRY_RUN" == "true" ]]; then
                kubectl apply -f "$manifest_path" -n "$NAMESPACE" --dry-run=client -o yaml
            else
                kubectl apply -f "$manifest_path" -n "$NAMESPACE"
            fi
        else
            warning "Manifest not found: $manifest_path"
        fi
    done
    
    # Apply enhanced manifests if they exist
    if [[ -d "$K8S_DIR/enhanced" ]]; then
        log "Applying enhanced manifests..."
        if [[ "$DRY_RUN" == "true" ]]; then
            kubectl apply -f "$K8S_DIR/enhanced/" -n "$NAMESPACE" --dry-run=client -o yaml
        else
            kubectl apply -f "$K8S_DIR/enhanced/" -n "$NAMESPACE"
        fi
    fi
}

# Function to deploy with Kustomize
deploy_with_kustomize() {
    log "Deploying with Kustomize..."
    
    local kustomize_dir="$K8S_DIR/overlays/$ENVIRONMENT"
    
    if [[ ! -d "$kustomize_dir" ]]; then
        error "Kustomize overlay not found: $kustomize_dir"
        exit 1
    fi
    
    # Apply Kustomize configuration
    if [[ "$DRY_RUN" == "true" ]]; then
        kustomize build "$kustomize_dir" | kubectl apply --dry-run=client -o yaml -f -
    else
        kustomize build "$kustomize_dir" | kubectl apply -f -
    fi
}

# Function to wait for deployment
wait_for_deployment() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return
    fi
    
    log "Waiting for deployment to be ready..."
    
    # Wait for deployment to be ready
    kubectl wait --for=condition=available --timeout="$WAIT_TIMEOUT" deployment/lims-app -n "$NAMESPACE"
    
    # Check pod status
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=lims
    
    # Check service status
    kubectl get services -n "$NAMESPACE"
    
    # Check ingress status
    kubectl get ingress -n "$NAMESPACE"
}

# Function to run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" || "$DRY_RUN" == "true" ]]; then
        return
    fi
    
    log "Running deployment tests..."
    
    # Run Helm tests if using Helm
    if [[ "$DEPLOYMENT_TYPE" == "helm" ]]; then
        helm test "$HELM_RELEASE_NAME" -n "$NAMESPACE"
    fi
    
    # Run basic connectivity tests
    log "Running connectivity tests..."
    
    # Test internal connectivity
    kubectl run test-pod --rm -i --tty --image=busybox --restart=Never -n "$NAMESPACE" -- /bin/sh -c "
        echo 'Testing internal connectivity...'
        nslookup lims-app-service.$NAMESPACE.svc.cluster.local
        echo 'Internal connectivity test completed'
    "
}

# Function to show deployment information
show_deployment_info() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return
    fi
    
    log "Deployment Information:"
    echo "========================"
    echo "Namespace: $NAMESPACE"
    echo "Environment: $ENVIRONMENT"
    echo "Deployment Type: $DEPLOYMENT_TYPE"
    echo "Image Tag: $IMAGE_TAG"
    echo ""
    
    # Show resource status
    echo "Resource Status:"
    echo "=================="
    kubectl get all -n "$NAMESPACE" -l app.kubernetes.io/name=lims
    echo ""
    
    # Show ingress information
    if kubectl get ingress -n "$NAMESPACE" &> /dev/null; then
        echo "Ingress Information:"
        echo "===================="
        kubectl get ingress -n "$NAMESPACE" -o wide
        echo ""
    fi
    
    # Show service endpoints
    echo "Service Endpoints:"
    echo "=================="
    kubectl get endpoints -n "$NAMESPACE"
    echo ""
    
    # Show events
    echo "Recent Events:"
    echo "=============="
    kubectl get events -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp | tail -10
}

# Function to cleanup on failure
cleanup_on_failure() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return
    fi
    
    error "Deployment failed. Cleaning up..."
    
    case "$DEPLOYMENT_TYPE" in
        "helm")
            helm rollback "$HELM_RELEASE_NAME" -n "$NAMESPACE" || true
            ;;
        *)
            warning "Manual cleanup may be required"
            ;;
    esac
}

# Parse command line arguments
CUSTOM_VALUES_ARRAY=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -t|--type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        -r|--release)
            HELM_RELEASE_NAME="$2"
            shift 2
            ;;
        -f|--values-file)
            VALUES_FILE="$2"
            shift 2
            ;;
        -v|--set)
            CUSTOM_VALUES_ARRAY+=("$2")
            shift 2
            ;;
        -i|--image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -c|--chart-version)
            CHART_VERSION="$2"
            shift 2
            ;;
        -w|--wait-timeout)
            WAIT_TIMEOUT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -F|--force)
            FORCE=true
            shift
            ;;
        -S|--skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        -T|--skip-tests)
            SKIP_TESTS=true
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

# Join custom values array
if [[ ${#CUSTOM_VALUES_ARRAY[@]} -gt 0 ]]; then
    CUSTOM_VALUES=$(IFS=','; echo "${CUSTOM_VALUES_ARRAY[*]}")
fi

# Trap for cleanup on failure
trap cleanup_on_failure ERR

# Main execution
main() {
    log "Starting Kubernetes deployment"
    log "Environment: $ENVIRONMENT"
    log "Namespace: $NAMESPACE"
    log "Deployment Type: $DEPLOYMENT_TYPE"
    log "Image Tag: $IMAGE_TAG"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Create namespace
    create_namespace
    
    # Setup RBAC
    setup_rbac
    
    # Manage secrets
    manage_secrets
    
    # Deploy based on type
    case "$DEPLOYMENT_TYPE" in
        "helm")
            deploy_with_helm
            ;;
        "manifest")
            deploy_with_manifests
            ;;
        "kustomize")
            deploy_with_kustomize
            ;;
        *)
            error "Unknown deployment type: $DEPLOYMENT_TYPE"
            exit 1
            ;;
    esac
    
    # Wait for deployment
    wait_for_deployment
    
    # Run tests
    run_tests
    
    # Show deployment information
    show_deployment_info
    
    log "Kubernetes deployment completed successfully!"
}

# Run main function
main "$@"