#!/bin/bash

# JAG DNA Scientific LIMS - Production Deployment Validation Script
# This script validates the production deployment and performs comprehensive testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="production"
APP_NAME="lims"
TIMEOUT=300

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
}

# Test functions
test_namespace() {
    log_test "Namespace existence"
    if kubectl get namespace ${NAMESPACE} >/dev/null 2>&1; then
        log_success "Namespace '${NAMESPACE}' exists"
    else
        log_error "Namespace '${NAMESPACE}' does not exist"
        return 1
    fi
}

test_postgresql() {
    log_test "PostgreSQL deployment"

    # Check StatefulSet
    if kubectl get statefulset postgresql -n ${NAMESPACE} >/dev/null 2>&1; then
        log_success "PostgreSQL StatefulSet exists"
    else
        log_error "PostgreSQL StatefulSet not found"
        return 1
    fi

    # Check if PostgreSQL is ready
    if kubectl wait --for=condition=ready pod -l app=postgresql -n ${NAMESPACE} --timeout=30s >/dev/null 2>&1; then
        log_success "PostgreSQL pod is ready"
    else
        log_error "PostgreSQL pod is not ready"
        return 1
    fi

    # Test database connectivity
    log_test "PostgreSQL connectivity"
    DB_POD=$(kubectl get pod -l app=postgresql -n ${NAMESPACE} -o jsonpath="{.items[0].metadata.name}")

    if kubectl exec -n ${NAMESPACE} ${DB_POD} -- pg_isready -U lims_user >/dev/null 2>&1; then
        log_success "PostgreSQL is accepting connections"
    else
        log_error "PostgreSQL is not accepting connections"
        return 1
    fi

    # Test database query
    if kubectl exec -n ${NAMESPACE} ${DB_POD} -- psql -U lims_user -d limsdb -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Database query test passed"
    else
        log_error "Database query test failed"
        return 1
    fi
}

test_lims_application() {
    log_test "LIMS application deployment"

    # Check deployment
    if kubectl get deployment lims-app -n ${NAMESPACE} >/dev/null 2>&1; then
        log_success "LIMS deployment exists"
    else
        log_error "LIMS deployment not found"
        return 1
    fi

    # Check if all replicas are ready
    DESIRED_REPLICAS=$(kubectl get deployment lims-app -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')
    READY_REPLICAS=$(kubectl get deployment lims-app -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}')

    if [ "$READY_REPLICAS" = "$DESIRED_REPLICAS" ]; then
        log_success "All LIMS replicas are ready ($READY_REPLICAS/$DESIRED_REPLICAS)"
    else
        log_error "Not all LIMS replicas are ready ($READY_REPLICAS/$DESIRED_REPLICAS)"
        return 1
    fi
}

test_services() {
    log_test "Services"

    # Check PostgreSQL service
    if kubectl get service postgresql -n ${NAMESPACE} >/dev/null 2>&1; then
        log_success "PostgreSQL service exists"
    else
        log_error "PostgreSQL service not found"
        return 1
    fi

    # Check LIMS service
    if kubectl get service lims-service -n ${NAMESPACE} >/dev/null 2>&1; then
        log_success "LIMS service exists"
    else
        log_error "LIMS service not found"
        return 1
    fi

    # Check service endpoints
    LIMS_ENDPOINTS=$(kubectl get endpoints lims-service -n ${NAMESPACE} -o jsonpath='{.subsets[0].addresses}' 2>/dev/null || echo "[]")
    if [ "$LIMS_ENDPOINTS" != "[]" ] && [ "$LIMS_ENDPOINTS" != "" ]; then
        log_success "LIMS service has endpoints"
    else
        log_error "LIMS service has no endpoints"
        return 1
    fi
}

test_configmaps_secrets() {
    log_test "ConfigMaps and Secrets"

    # Check ConfigMap
    if kubectl get configmap lims-config -n ${NAMESPACE} >/dev/null 2>&1; then
        log_success "LIMS ConfigMap exists"
    else
        log_error "LIMS ConfigMap not found"
        return 1
    fi

    # Check Secret
    if kubectl get secret lims-secrets -n ${NAMESPACE} >/dev/null 2>&1; then
        log_success "LIMS Secret exists"
    else
        log_error "LIMS Secret not found"
        return 1
    fi
}

test_health_endpoints() {
    log_test "Application health endpoints"

    # Get a LIMS pod
    LIMS_POD=$(kubectl get pod -l app=lims -n ${NAMESPACE} -o jsonpath="{.items[0].metadata.name}" 2>/dev/null || echo "")

    if [ -z "$LIMS_POD" ]; then
        log_error "No LIMS pods found"
        return 1
    fi

    # Test health endpoint
    if kubectl exec -n ${NAMESPACE} ${LIMS_POD} -- curl -f http://localhost:3001/health >/dev/null 2>&1; then
        log_success "Health endpoint (/health) is responding"
    else
        log_error "Health endpoint (/health) is not responding"
        return 1
    fi

    # Test ready endpoint
    if kubectl exec -n ${NAMESPACE} ${LIMS_POD} -- curl -f http://localhost:3001/ready >/dev/null 2>&1; then
        log_success "Ready endpoint (/ready) is responding"
    else
        log_warning "Ready endpoint (/ready) is not responding (database may not be ready)"
    fi

    # Test live endpoint
    if kubectl exec -n ${NAMESPACE} ${LIMS_POD} -- curl -f http://localhost:3001/health/live >/dev/null 2>&1; then
        log_success "Live endpoint (/health/live) is responding"
    else
        log_error "Live endpoint (/health/live) is not responding"
        return 1
    fi
}

test_api_endpoints() {
    log_test "API endpoints"

    LIMS_POD=$(kubectl get pod -l app=lims -n ${NAMESPACE} -o jsonpath="{.items[0].metadata.name}" 2>/dev/null || echo "")

    if [ -z "$LIMS_POD" ]; then
        log_error "No LIMS pods found"
        return 1
    fi

    # Test API test endpoint
    if kubectl exec -n ${NAMESPACE} ${LIMS_POD} -- curl -f http://localhost:3001/api/test >/dev/null 2>&1; then
        log_success "API test endpoint (/api/test) is responding"
    else
        log_error "API test endpoint (/api/test) is not responding"
        return 1
    fi

    # Test metrics endpoint
    if kubectl exec -n ${NAMESPACE} ${LIMS_POD} -- curl -f http://localhost:3001/metrics >/dev/null 2>&1; then
        log_success "Metrics endpoint (/metrics) is responding"
    else
        log_warning "Metrics endpoint (/metrics) is not responding"
    fi
}

test_database_connection() {
    log_test "Application database connection"

    LIMS_POD=$(kubectl get pod -l app=lims -n ${NAMESPACE} -o jsonpath="{.items[0].metadata.name}" 2>/dev/null || echo "")

    if [ -z "$LIMS_POD" ]; then
        log_error "No LIMS pods found"
        return 1
    fi

    # Test database connection through the application
    RESPONSE=$(kubectl exec -n ${NAMESPACE} ${LIMS_POD} -- curl -s http://localhost:3001/api/test 2>/dev/null || echo "")

    if echo "$RESPONSE" | grep -q "database.*connected\|Database.*connected" 2>/dev/null; then
        log_success "Application can connect to database"
    else
        log_warning "Application database connection status unclear"
        echo "Response: $RESPONSE"
    fi
}

test_external_access() {
    log_test "External access"

    # Get node IP and port
    NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "")
    NODE_PORT=30001

    if [ -n "$NODE_IP" ]; then
        log_info "Testing external access at http://${NODE_IP}:${NODE_PORT}"

        if curl -f http://${NODE_IP}:${NODE_PORT}/health --connect-timeout 10 >/dev/null 2>&1; then
            log_success "External access is working"
        else
            log_warning "External access test failed (this may be normal in some environments)"
        fi
    else
        log_warning "Could not determine node IP for external access test"
    fi
}

test_resource_usage() {
    log_test "Resource usage"

    # Check if metrics-server is available
    if kubectl top nodes >/dev/null 2>&1; then
        log_info "Current resource usage:"

        # Node resources
        echo ""
        echo "Node Resources:"
        kubectl top nodes

        # Pod resources
        echo ""
        echo "Pod Resources (${NAMESPACE} namespace):"
        kubectl top pods -n ${NAMESPACE} || log_warning "Could not get pod metrics"

        log_success "Resource usage information retrieved"
    else
        log_warning "Metrics server not available, skipping resource usage test"
    fi
}

test_storage() {
    log_test "Persistent storage"

    # Check PVCs
    PVCS=$(kubectl get pvc -n ${NAMESPACE} 2>/dev/null | wc -l)

    if [ "$PVCS" -gt 1 ]; then
        log_success "Persistent Volume Claims exist"
        kubectl get pvc -n ${NAMESPACE}

        # Check PV status
        if kubectl get pvc -n ${NAMESPACE} -o jsonpath='{.items[*].status.phase}' | grep -q "Bound"; then
            log_success "Persistent volumes are bound"
        else
            log_error "Some persistent volumes are not bound"
            return 1
        fi
    else
        log_warning "No persistent volume claims found"
    fi
}

test_logs() {
    log_test "Application logs"

    # Check for critical errors in recent logs
    LIMS_POD=$(kubectl get pod -l app=lims -n ${NAMESPACE} -o jsonpath="{.items[0].metadata.name}" 2>/dev/null || echo "")

    if [ -n "$LIMS_POD" ]; then
        ERROR_COUNT=$(kubectl logs ${LIMS_POD} -n ${NAMESPACE} --tail=100 2>/dev/null | grep -i "error\|fatal\|critical" | wc -l || echo "0")

        if [ "$ERROR_COUNT" -eq 0 ]; then
            log_success "No critical errors in recent logs"
        else
            log_warning "Found $ERROR_COUNT potential error(s) in recent logs"
            echo "Recent errors:"
            kubectl logs ${LIMS_POD} -n ${NAMESPACE} --tail=100 2>/dev/null | grep -i "error\|fatal\|critical" | tail -5
        fi
    else
        log_warning "Could not retrieve application logs"
    fi
}

run_performance_test() {
    log_test "Basic performance test"

    LIMS_POD=$(kubectl get pod -l app=lims -n ${NAMESPACE} -o jsonpath="{.items[0].metadata.name}" 2>/dev/null || echo "")

    if [ -n "$LIMS_POD" ]; then
        log_info "Running 10 sequential requests to test basic performance..."

        SUCCESS_COUNT=0
        TOTAL_REQUESTS=10

        for i in $(seq 1 $TOTAL_REQUESTS); do
            if kubectl exec -n ${NAMESPACE} ${LIMS_POD} -- curl -f http://localhost:3001/health --max-time 5 >/dev/null 2>&1; then
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            fi
        done

        SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL_REQUESTS))

        if [ "$SUCCESS_RATE" -ge 90 ]; then
            log_success "Performance test passed: ${SUCCESS_COUNT}/${TOTAL_REQUESTS} requests successful (${SUCCESS_RATE}%)"
        else
            log_warning "Performance test warning: ${SUCCESS_COUNT}/${TOTAL_REQUESTS} requests successful (${SUCCESS_RATE}%)"
        fi
    else
        log_warning "Could not run performance test - no pods available"
    fi
}

# Main validation function
run_validation() {
    echo "🔍 JAG DNA Scientific LIMS - Production Deployment Validation"
    echo "=============================================================="
    echo ""

    local failed_tests=0

    # Run all tests
    test_namespace || ((failed_tests++))
    echo ""

    test_configmaps_secrets || ((failed_tests++))
    echo ""

    test_postgresql || ((failed_tests++))
    echo ""

    test_lims_application || ((failed_tests++))
    echo ""

    test_services || ((failed_tests++))
    echo ""

    test_health_endpoints || ((failed_tests++))
    echo ""

    test_api_endpoints || ((failed_tests++))
    echo ""

    test_database_connection || ((failed_tests++))
    echo ""

    test_external_access
    echo ""

    test_storage
    echo ""

    test_resource_usage
    echo ""

    test_logs
    echo ""

    run_performance_test
    echo ""

    # Summary
    echo "=============================================================="
    if [ "$failed_tests" -eq 0 ]; then
        log_success "🎉 All critical tests passed! Deployment is healthy."

        # Show access information
        NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo "localhost")
        NODE_PORT=30001

        echo ""
        echo "🌐 Access Information:"
        echo "   Application: http://${NODE_IP}:${NODE_PORT}"
        echo "   Health Check: http://${NODE_IP}:${NODE_PORT}/health"
        echo "   API Test: http://${NODE_IP}:${NODE_PORT}/api/test"
        echo "   Metrics: http://${NODE_IP}:${NODE_PORT}/metrics"
        echo ""

        return 0
    else
        log_error "❌ $failed_tests critical test(s) failed. Please review the issues above."
        return 1
    fi
}

show_deployment_info() {
    echo "📊 Deployment Information"
    echo "========================"
    echo ""

    log_info "Namespace: ${NAMESPACE}"
    echo ""

    log_info "Pods:"
    kubectl get pods -n ${NAMESPACE} -o wide
    echo ""

    log_info "Services:"
    kubectl get services -n ${NAMESPACE}
    echo ""

    log_info "Deployments:"
    kubectl get deployments -n ${NAMESPACE}
    echo ""

    log_info "StatefulSets:"
    kubectl get statefulsets -n ${NAMESPACE}
    echo ""

    if kubectl get pvc -n ${NAMESPACE} >/dev/null 2>&1; then
        log_info "Persistent Volume Claims:"
        kubectl get pvc -n ${NAMESPACE}
        echo ""
    fi
}

show_troubleshooting_commands() {
    echo "🛠️  Troubleshooting Commands"
    echo "============================="
    echo ""
    echo "# View application logs:"
    echo "kubectl logs -f deployment/lims-app -n ${NAMESPACE}"
    echo ""
    echo "# View database logs:"
    echo "kubectl logs -f statefulset/postgresql -n ${NAMESPACE}"
    echo ""
    echo "# Connect to application pod:"
    echo "kubectl exec -it deployment/lims-app -n ${NAMESPACE} -- bash"
    echo ""
    echo "# Connect to database:"
    echo "kubectl exec -it statefulset/postgresql -n ${NAMESPACE} -- psql -U lims_user -d limsdb"
    echo ""
    echo "# Port forward for local access:"
    echo "kubectl port-forward svc/lims-service 3001:3001 -n ${NAMESPACE}"
    echo ""
    echo "# Check events:"
    echo "kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp'"
    echo ""
    echo "# Scale deployment:"
    echo "kubectl scale deployment lims-app --replicas=3 -n ${NAMESPACE}"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "quick")
        log_info "Running quick validation..."
        test_namespace && test_lims_application && test_postgresql && test_health_endpoints
        ;;
    "info")
        show_deployment_info
        ;;
    "troubleshoot")
        show_troubleshooting_commands
        ;;
    "performance")
        run_performance_test
        ;;
    *)
        run_validation
        if [ $? -eq 0 ]; then
            echo ""
            echo "💡 Pro Tips:"
            echo "   - Run './validate-production-deployment.sh quick' for faster validation"
            echo "   - Run './validate-production-deployment.sh info' for deployment overview"
            echo "   - Run './validate-production-deployment.sh troubleshoot' for troubleshooting commands"
            echo "   - Monitor your deployment with: kubectl get pods -n ${NAMESPACE} -w"
        fi
        ;;
esac