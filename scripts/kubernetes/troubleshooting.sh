#!/bin/bash
# Kubernetes Troubleshooting Script - CKA Skills Demonstration
# This script demonstrates cluster troubleshooting and debugging skills

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
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check cluster health
check_cluster_health() {
    log "=== Cluster Health Check ==="
    
    # Check nodes
    log "Node Status:"
    kubectl get nodes -o wide
    
    # Check if nodes are ready
    NOT_READY_NODES=$(kubectl get nodes --no-headers | grep -c "NotReady" || echo "0")
    if [[ $NOT_READY_NODES -gt 0 ]]; then
        error "$NOT_READY_NODES nodes are not ready"
        
        # Get details for not ready nodes
        kubectl get nodes --no-headers | grep "NotReady" | while read -r line; do
            NODE_NAME=$(echo $line | awk '{print $1}')
            warning "Node $NODE_NAME is not ready. Checking details..."
            kubectl describe node $NODE_NAME
        done
    else
        log "✓ All nodes are ready"
    fi
    
    # Check system pods
    log "System Pods Status:"
    kubectl get pods -n kube-system -o wide
    
    # Check for failed pods
    FAILED_PODS=$(kubectl get pods --all-namespaces --no-headers | grep -E "(Error|CrashLoopBackOff|ImagePullBackOff)" | wc -l)
    if [[ $FAILED_PODS -gt 0 ]]; then
        error "$FAILED_PODS pods are in failed state"
        kubectl get pods --all-namespaces --no-headers | grep -E "(Error|CrashLoopBackOff|ImagePullBackOff)"
    else
        log "✓ No failed pods detected"
    fi
    
    # Check cluster info
    log "Cluster Info:"
    kubectl cluster-info
    
    # Check API server connectivity
    if kubectl get ns > /dev/null 2>&1; then
        log "✓ API server is accessible"
    else
        error "✗ API server is not accessible"
    fi
}

# Function to check LIMS application health
check_lims_health() {
    log "=== LIMS Application Health Check ==="
    
    # Check if LIMS namespace exists
    if kubectl get namespace labscientific-lims > /dev/null 2>&1; then
        log "✓ LIMS namespace exists"
        
        # Check LIMS pods
        log "LIMS Pods Status:"
        kubectl get pods -n labscientific-lims -o wide
        
        # Check LIMS services
        log "LIMS Services Status:"
        kubectl get svc -n labscientific-lims
        
        # Check LIMS ingress
        log "LIMS Ingress Status:"
        kubectl get ingress -n labscientific-lims
        
        # Check for pod issues
        LIMS_FAILED_PODS=$(kubectl get pods -n labscientific-lims --no-headers | grep -E "(Error|CrashLoopBackOff|ImagePullBackOff)" | wc -l)
        if [[ $LIMS_FAILED_PODS -gt 0 ]]; then
            error "$LIMS_FAILED_PODS LIMS pods are in failed state"
            kubectl get pods -n labscientific-lims --no-headers | grep -E "(Error|CrashLoopBackOff|ImagePullBackOff)" | while read -r line; do
                POD_NAME=$(echo $line | awk '{print $1}')
                warning "Troubleshooting pod $POD_NAME..."
                troubleshoot_pod "labscientific-lims" "$POD_NAME"
            done
        else
            log "✓ All LIMS pods are healthy"
        fi
    else
        error "✗ LIMS namespace does not exist"
    fi
}

# Function to troubleshoot a specific pod
troubleshoot_pod() {
    local namespace=$1
    local pod_name=$2
    
    log "=== Troubleshooting Pod: $pod_name ==="
    
    # Get pod details
    log "Pod Description:"
    kubectl describe pod $pod_name -n $namespace
    
    # Get pod logs
    log "Pod Logs (last 50 lines):"
    kubectl logs $pod_name -n $namespace --tail=50 || warning "Could not retrieve logs"
    
    # Get previous pod logs if available
    log "Previous Pod Logs (if available):"
    kubectl logs $pod_name -n $namespace --previous --tail=50 || info "No previous logs available"
    
    # Check pod events
    log "Pod Events:"
    kubectl get events -n $namespace --field-selector involvedObject.name=$pod_name --sort-by='.lastTimestamp'
    
    # Check resource usage
    log "Pod Resource Usage:"
    kubectl top pod $pod_name -n $namespace || warning "Metrics not available"
    
    # Check if pod is on a problematic node
    NODE_NAME=$(kubectl get pod $pod_name -n $namespace -o jsonpath='{.spec.nodeName}')
    if [[ -n $NODE_NAME ]]; then
        log "Pod is running on node: $NODE_NAME"
        check_node_health $NODE_NAME
    fi
}

# Function to check node health
check_node_health() {
    local node_name=$1
    
    log "=== Node Health Check: $node_name ==="
    
    # Get node details
    log "Node Description:"
    kubectl describe node $node_name
    
    # Check node conditions
    log "Node Conditions:"
    kubectl get node $node_name -o jsonpath='{.status.conditions[*].type}{"\n"}{.status.conditions[*].status}{"\n"}' | \
    awk '{for(i=1; i<=NF; i++) print $i}' | paste - - | while read -r condition status; do
        if [[ $status == "True" && $condition == "Ready" ]]; then
            log "✓ $condition: $status"
        elif [[ $status == "False" && $condition != "Ready" ]]; then
            log "✓ $condition: $status"
        else
            warning "⚠ $condition: $status"
        fi
    done
    
    # Check node resource usage
    log "Node Resource Usage:"
    kubectl top node $node_name || warning "Metrics not available"
    
    # Check node capacity
    log "Node Capacity and Allocatable:"
    kubectl describe node $node_name | grep -A 10 "Capacity:\|Allocatable:"
}

# Function to check network connectivity
check_network() {
    log "=== Network Connectivity Check ==="
    
    # Check cluster DNS
    log "Testing DNS resolution..."
    kubectl run dns-test --image=busybox:1.28 --rm -it --restart=Never -- nslookup kubernetes.default.svc.cluster.local || warning "DNS test failed"
    
    # Check pod-to-pod connectivity
    log "Testing pod-to-pod connectivity..."
    kubectl run network-test-1 --image=busybox:1.28 --rm -it --restart=Never -- ping -c 3 8.8.8.8 || warning "External connectivity test failed"
    
    # Check service connectivity
    log "Testing service connectivity..."
    kubectl get svc -A
    
    # Check network policies
    log "Network Policies:"
    kubectl get networkpolicies -A
    
    # Check CNI plugin
    log "CNI Plugin Status:"
    kubectl get pods -n kube-system -l app=flannel || kubectl get pods -n kube-system -l k8s-app=cilium || warning "CNI plugin not found"
}

# Function to check storage
check_storage() {
    log "=== Storage Check ==="
    
    # Check persistent volumes
    log "Persistent Volumes:"
    kubectl get pv
    
    # Check persistent volume claims
    log "Persistent Volume Claims:"
    kubectl get pvc -A
    
    # Check storage classes
    log "Storage Classes:"
    kubectl get storageclass
    
    # Check for pending PVCs
    PENDING_PVCS=$(kubectl get pvc -A --no-headers | grep -c "Pending" || echo "0")
    if [[ $PENDING_PVCS -gt 0 ]]; then
        error "$PENDING_PVCS PVCs are pending"
        kubectl get pvc -A --no-headers | grep "Pending" | while read -r line; do
            NAMESPACE=$(echo $line | awk '{print $1}')
            PVC_NAME=$(echo $line | awk '{print $2}')
            warning "PVC $PVC_NAME in namespace $NAMESPACE is pending"
            kubectl describe pvc $PVC_NAME -n $NAMESPACE
        done
    else
        log "✓ No pending PVCs"
    fi
}

# Function to check RBAC
check_rbac() {
    log "=== RBAC Check ==="
    
    # Check service accounts
    log "Service Accounts in LIMS namespace:"
    kubectl get sa -n labscientific-lims || warning "LIMS namespace not found"
    
    # Check roles and role bindings
    log "Roles and RoleBindings:"
    kubectl get roles,rolebindings -n labscientific-lims || warning "LIMS namespace not found"
    
    # Check cluster roles and cluster role bindings
    log "ClusterRoles and ClusterRoleBindings (LIMS related):"
    kubectl get clusterroles,clusterrolebindings | grep lims || warning "No LIMS-related cluster roles found"
    
    # Test permissions
    log "Testing LIMS service account permissions..."
    kubectl auth can-i get pods --as=system:serviceaccount:labscientific-lims:lims-service-account
    kubectl auth can-i create deployments --as=system:serviceaccount:labscientific-lims:lims-service-account
}

# Function to check resource usage
check_resources() {
    log "=== Resource Usage Check ==="
    
    # Check node resource usage
    log "Node Resource Usage:"
    kubectl top nodes || warning "Metrics server not available"
    
    # Check pod resource usage
    log "Pod Resource Usage (top 10):"
    kubectl top pods -A --sort-by=memory | head -10 || warning "Metrics server not available"
    
    # Check resource quotas
    log "Resource Quotas:"
    kubectl get resourcequotas -A
    
    # Check limit ranges
    log "Limit Ranges:"
    kubectl get limitranges -A
    
    # Check for resource pressure
    log "Checking for resource pressure..."
    kubectl describe nodes | grep -E "(MemoryPressure|DiskPressure|PIDPressure)" | grep -v "False" || log "✓ No resource pressure detected"
}

# Function to collect logs
collect_logs() {
    log "=== Collecting Logs ==="
    
    local log_dir="/tmp/k8s-logs-$(date +%Y%m%d-%H%M%S)"
    mkdir -p $log_dir
    
    # Collect cluster info
    kubectl cluster-info dump > $log_dir/cluster-info.txt
    
    # Collect node info
    kubectl get nodes -o wide > $log_dir/nodes.txt
    kubectl describe nodes > $log_dir/nodes-describe.txt
    
    # Collect pod info
    kubectl get pods -A -o wide > $log_dir/pods.txt
    kubectl describe pods -A > $log_dir/pods-describe.txt
    
    # Collect service info
    kubectl get svc -A > $log_dir/services.txt
    
    # Collect events
    kubectl get events -A --sort-by='.lastTimestamp' > $log_dir/events.txt
    
    # Collect logs from failed pods
    kubectl get pods -A --no-headers | grep -E "(Error|CrashLoopBackOff|ImagePullBackOff)" | while read -r line; do
        NAMESPACE=$(echo $line | awk '{print $1}')
        POD_NAME=$(echo $line | awk '{print $2}')
        kubectl logs $POD_NAME -n $NAMESPACE > $log_dir/${NAMESPACE}-${POD_NAME}.log 2>&1 || true
    done
    
    log "Logs collected in $log_dir"
}

# Function to run comprehensive diagnostics
run_diagnostics() {
    log "=== Running Comprehensive Kubernetes Diagnostics ==="
    
    check_cluster_health
    echo ""
    check_lims_health
    echo ""
    check_network
    echo ""
    check_storage
    echo ""
    check_rbac
    echo ""
    check_resources
    echo ""
    collect_logs
    
    log "Diagnostics completed"
}

# Function to show help
show_help() {
    echo "Kubernetes Troubleshooting Script - CKA Skills Demonstration"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  health          - Check cluster health"
    echo "  lims            - Check LIMS application health"
    echo "  pod <ns> <name> - Troubleshoot specific pod"
    echo "  node <name>     - Check specific node health"
    echo "  network         - Check network connectivity"
    echo "  storage         - Check storage resources"
    echo "  rbac            - Check RBAC configuration"
    echo "  resources       - Check resource usage"
    echo "  logs            - Collect troubleshooting logs"
    echo "  diagnostics     - Run comprehensive diagnostics"
    echo "  help            - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 health"
    echo "  $0 pod labscientific-lims lims-app-xxx"
    echo "  $0 node worker-1"
    echo "  $0 diagnostics"
}

# Main execution
main() {
    case "${1:-help}" in
        "health")
            check_cluster_health
            ;;
        "lims")
            check_lims_health
            ;;
        "pod")
            if [[ $# -ne 3 ]]; then
                error "Usage: $0 pod <namespace> <pod-name>"
                exit 1
            fi
            troubleshoot_pod "$2" "$3"
            ;;
        "node")
            if [[ $# -ne 2 ]]; then
                error "Usage: $0 node <node-name>"
                exit 1
            fi
            check_node_health "$2"
            ;;
        "network")
            check_network
            ;;
        "storage")
            check_storage
            ;;
        "rbac")
            check_rbac
            ;;
        "resources")
            check_resources
            ;;
        "logs")
            collect_logs
            ;;
        "diagnostics")
            run_diagnostics
            ;;
        "help")
            show_help
            ;;
        *)
            error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Check if script is sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi