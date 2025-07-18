#!/bin/bash
# Kubernetes Cluster Setup Script - CKA Skills Demonstration
# This script demonstrates cluster initialization and management skills

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

# Configuration
CLUSTER_NAME="lims-cluster"
KUBERNETES_VERSION="1.28.0"
POD_NETWORK_CIDR="10.244.0.0/16"
SERVICE_NETWORK_CIDR="10.96.0.0/12"
CONTROL_PLANE_ENDPOINT="lims-control-plane.local"

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        warning "kubectl is not installed, installing..."
        install_kubectl
    fi
    
    # Check if kubeadm is installed
    if ! command -v kubeadm &> /dev/null; then
        warning "kubeadm is not installed, installing..."
        install_kubeadm
    fi
    
    # Check if kubelet is installed
    if ! command -v kubelet &> /dev/null; then
        warning "kubelet is not installed, installing..."
        install_kubelet
    fi
    
    log "Prerequisites check completed"
}

# Function to install kubectl
install_kubectl() {
    log "Installing kubectl..."
    
    curl -LO "https://dl.k8s.io/release/v${KUBERNETES_VERSION}/bin/linux/amd64/kubectl"
    chmod +x kubectl
    sudo mv kubectl /usr/local/bin/
    
    log "kubectl installed successfully"
}

# Function to install kubeadm and kubelet
install_kubeadm() {
    log "Installing kubeadm and kubelet..."
    
    # Add Kubernetes apt repository
    curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
    
    sudo apt-get update
    sudo apt-get install -y kubelet kubeadm
    sudo apt-mark hold kubelet kubeadm kubectl
    
    log "kubeadm and kubelet installed successfully"
}

# Function to install kubelet
install_kubelet() {
    log "kubelet is installed with kubeadm"
}

# Function to initialize the cluster
init_cluster() {
    log "Initializing Kubernetes cluster..."
    
    # Create kubeadm config file
    cat > /tmp/kubeadm-config.yaml <<EOF
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v${KUBERNETES_VERSION}
clusterName: ${CLUSTER_NAME}
controlPlaneEndpoint: ${CONTROL_PLANE_ENDPOINT}:6443
networking:
  podSubnet: ${POD_NETWORK_CIDR}
  serviceSubnet: ${SERVICE_NETWORK_CIDR}
apiServer:
  extraArgs:
    enable-admission-plugins: NodeRestriction,ResourceQuota,PodSecurityPolicy
    audit-log-maxage: "30"
    audit-log-maxbackup: "10"
    audit-log-maxsize: "100"
    audit-log-path: "/var/log/audit.log"
controllerManager:
  extraArgs:
    cluster-signing-cert-file: "/etc/kubernetes/pki/ca.crt"
    cluster-signing-key-file: "/etc/kubernetes/pki/ca.key"
etcd:
  local:
    dataDir: /var/lib/etcd
    extraArgs:
      listen-metrics-urls: "http://0.0.0.0:2381"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: $(hostname -I | awk '{print $1}')
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  kubeletExtraArgs:
    cgroup-driver: systemd
    fail-swap-on: "false"
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
serverTLSBootstrap: true
rotateCertificates: true
EOF

    # Initialize the cluster
    sudo kubeadm init --config=/tmp/kubeadm-config.yaml
    
    # Set up kubectl for the current user
    mkdir -p $HOME/.kube
    sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
    sudo chown $(id -u):$(id -g) $HOME/.kube/config
    
    log "Cluster initialized successfully"
}

# Function to install CNI plugin
install_cni() {
    log "Installing CNI plugin (Flannel)..."
    
    # Wait for kube-apiserver to be ready
    kubectl wait --for=condition=Ready node --all --timeout=300s
    
    # Install Flannel CNI
    kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
    
    # Wait for CNI pods to be ready
    kubectl wait --for=condition=Ready pod -l app=flannel -n kube-system --timeout=300s
    
    log "CNI plugin installed successfully"
}

# Function to install essential cluster components
install_components() {
    log "Installing essential cluster components..."
    
    # Install metrics-server
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    # Patch metrics-server for development environment
    kubectl patch deployment metrics-server -n kube-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
    
    # Install ingress-nginx
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/baremetal/deploy.yaml
    
    # Install cert-manager
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    
    log "Essential components installed successfully"
}

# Function to configure cluster security
configure_security() {
    log "Configuring cluster security..."
    
    # Enable Pod Security Standards
    kubectl label namespace kube-system pod-security.kubernetes.io/enforce=privileged
    kubectl label namespace kube-system pod-security.kubernetes.io/audit=privileged
    kubectl label namespace kube-system pod-security.kubernetes.io/warn=privileged
    
    # Create RBAC policies
    cat > /tmp/cluster-rbac.yaml <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-reader
rules:
- apiGroups: [""]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-reader-binding
subjects:
- kind: User
  name: cluster-reader
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-reader
  apiGroup: rbac.authorization.k8s.io
EOF
    
    kubectl apply -f /tmp/cluster-rbac.yaml
    
    log "Cluster security configured successfully"
}

# Function to create monitoring namespace
create_monitoring() {
    log "Creating monitoring namespace..."
    
    kubectl create namespace monitoring || true
    kubectl label namespace monitoring name=monitoring
    
    # Create basic monitoring RBAC
    cat > /tmp/monitoring-rbac.yaml <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitoring-service-account
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-cluster-role
rules:
- apiGroups: [""]
  resources: ["nodes", "nodes/proxy", "services", "endpoints", "pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["extensions"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-cluster-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: monitoring-cluster-role
subjects:
- kind: ServiceAccount
  name: monitoring-service-account
  namespace: monitoring
EOF
    
    kubectl apply -f /tmp/monitoring-rbac.yaml
    
    log "Monitoring namespace created successfully"
}

# Function to perform cluster health check
cluster_health_check() {
    log "Performing cluster health check..."
    
    # Check node status
    log "Node status:"
    kubectl get nodes -o wide
    
    # Check system pods
    log "System pods status:"
    kubectl get pods -n kube-system
    
    # Check cluster info
    log "Cluster info:"
    kubectl cluster-info
    
    # Check component status
    log "Component status:"
    kubectl get componentstatuses
    
    # Check cluster version
    log "Cluster version:"
    kubectl version --short
    
    log "Cluster health check completed"
}

# Function to generate join token
generate_join_token() {
    log "Generating join token for worker nodes..."
    
    JOIN_TOKEN=$(sudo kubeadm token create --print-join-command)
    
    echo "To join worker nodes to this cluster, run the following command on each worker node:"
    echo "sudo $JOIN_TOKEN"
    
    # Save to file for reference
    echo "sudo $JOIN_TOKEN" > /tmp/join-command.sh
    chmod +x /tmp/join-command.sh
    
    log "Join token generated and saved to /tmp/join-command.sh"
}

# Function to setup kubectl autocompletion
setup_kubectl_completion() {
    log "Setting up kubectl autocompletion..."
    
    # Add to bashrc
    echo 'source <(kubectl completion bash)' >> ~/.bashrc
    echo 'alias k=kubectl' >> ~/.bashrc
    echo 'complete -F __start_kubectl k' >> ~/.bashrc
    
    log "kubectl autocompletion setup completed"
}

# Function to create cluster backup
create_cluster_backup() {
    log "Creating cluster backup..."
    
    # Create backup directory
    BACKUP_DIR="/opt/k8s-backup-$(date +%Y%m%d-%H%M%S)"
    sudo mkdir -p $BACKUP_DIR
    
    # Backup etcd
    sudo ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
        --cacert=/etc/kubernetes/pki/etcd/ca.crt \
        --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
        --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
        snapshot save $BACKUP_DIR/etcd-snapshot.db
    
    # Backup certificates
    sudo cp -r /etc/kubernetes/pki $BACKUP_DIR/
    
    # Backup cluster configuration
    kubectl get all --all-namespaces -o yaml > $BACKUP_DIR/cluster-resources.yaml
    
    log "Cluster backup created at $BACKUP_DIR"
}

# Main execution
main() {
    log "Starting Kubernetes cluster setup - CKA Skills Demonstration"
    
    case "${1:-setup}" in
        "setup")
            check_prerequisites
            init_cluster
            install_cni
            install_components
            configure_security
            create_monitoring
            cluster_health_check
            generate_join_token
            setup_kubectl_completion
            log "Cluster setup completed successfully!"
            ;;
        "health")
            cluster_health_check
            ;;
        "backup")
            create_cluster_backup
            ;;
        "join-token")
            generate_join_token
            ;;
        *)
            echo "Usage: $0 {setup|health|backup|join-token}"
            echo "  setup     - Initialize and configure the cluster"
            echo "  health    - Perform cluster health check"
            echo "  backup    - Create cluster backup"
            echo "  join-token - Generate join token for worker nodes"
            exit 1
            ;;
    esac
}

# Check if script is sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi