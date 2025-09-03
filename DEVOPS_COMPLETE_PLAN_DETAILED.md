# 🧬 JAG DNA Scientific LIMS - Complete DevOps Implementation Plan (DETAILED VERSION)
## With In-Depth Explanations for Every Command

### 🎯 **Your Complete Certification Stack:**
- ✅ **AWS Solutions Architect Associate** (Cloud architecture expertise)
- ✅ **Terraform Associate** (Infrastructure as Code mastery)
- ✅ **PCAP - Python Certified Associate** (Automation & scripting)
- 📚 **CKA in Progress** (Kubernetes administration - exam end of month)
- 🔬 **16 Years Forensics Experience** (Systematic thinking & attention to detail)
- 🎓 **Masters Business Leadership** (Strategic planning & project management)

---

## 📊 **UNDERSTANDING THE BIG PICTURE**

### **What We're Building:**
Think of this like setting up a complete forensics laboratory:
- **Kubernetes** = The physical lab building (infrastructure)
- **Docker Containers** = Individual analysis instruments (isolated environments)
- **Terraform** = Laboratory setup procedures (automated infrastructure)
- **CI/CD Pipeline** = Automated sample processing workflow
- **Monitoring** = Quality control and compliance tracking

---

## 🗓️ **DAY 1: KUBERNETES & DOCKER FOUNDATION**
### Goal: Build your "laboratory" (K8s cluster) and prepare your "instruments" (containers)

### **Morning (4 hrs): Full Kubernetes Setup with Detailed Explanations**

#### **PART 1: Understanding What We're Installing**

```bash
# First, let's understand the architecture we're building:
# 
# KUBERNETES ARCHITECTURE (Like a Forensics Lab):
# 
#     Control Plane (Lab Management Office)
#     ├── API Server (Reception desk - all requests come here)
#     ├── etcd (Filing cabinet - stores all lab data)
#     ├── Scheduler (Work assignment - decides which bench runs which test)
#     ├── Controller Manager (Lab supervisor - ensures everything runs correctly)
#     └── Cloud Controller Manager (External services coordinator)
#
#     Worker Node (Lab Bench)
#     ├── kubelet (Lab technician - executes procedures)
#     ├── kube-proxy (Sample router - directs samples to correct location)
#     └── Container Runtime (Analysis equipment - runs actual tests)
```

#### **PART 2: System Preparation**

```bash
# Step 1: Disable swap memory
# WHY: Kubernetes requires swap to be disabled for performance and stability
# In forensics terms: Like ensuring no contamination between samples
sudo swapoff -a  

# Make the change permanent by commenting out swap line in /etc/fstab
# This file controls what filesystems are mounted at boot
# The sed command finds lines with 'swap' and adds # to comment them out
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Verify swap is disabled
free -h
# You should see Swap: 0B 0B 0B (all zeros)
```

#### **PART 3: Install Container Runtime (containerd)**

```bash
# Step 2: Install containerd (Container Runtime)
# Think of this as installing the actual analysis equipment in your lab

# Update package list to get latest versions
sudo apt-get update

# Install containerd - this is what actually runs containers
# Like installing PCR machines or genetic analyzers in the lab
sudo apt-get install -y containerd

# Create configuration directory
sudo mkdir -p /etc/containerd

# Generate default configuration
# This is like setting up standard operating procedures for equipment
containerd config default | sudo tee /etc/containerd/config.toml

# IMPORTANT: Enable SystemdCgroup (required for Kubernetes)
# Edit the config file and set SystemdCgroup = true
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

# Restart containerd with new configuration
sudo systemctl restart containerd

# Enable containerd to start on boot
sudo systemctl enable containerd

# Verify containerd is running
sudo systemctl status containerd
# Should show "active (running)"
```

#### **PART 4: Configure Kernel Modules and System Settings**

```bash
# Step 3: Load required kernel modules
# These are like enabling specific lab capabilities

# Enable overlay filesystem (for container storage)
# Like setting up proper sample storage system
sudo modprobe overlay

# Enable bridge networking (for container networking)
# Like setting up communication between different lab instruments
sudo modprobe br_netfilter

# Make these modules load on boot
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
# Overlay filesystem for container storage layers
overlay
# Bridge networking for pod communication
br_netfilter
EOF

# Set system parameters for Kubernetes networking
# These enable proper packet forwarding between containers
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
# Enable IPv4 forwarding (like sample routing in lab)
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF

# Apply the system parameters without reboot
sudo sysctl --system

# Verify the settings are applied
sysctl net.bridge.bridge-nf-call-iptables
# Should output: net.bridge.bridge-nf-call-iptables = 1
```

#### **PART 5: Install Kubernetes Components**

```bash
# Step 4: Install Kubernetes (kubeadm, kubelet, kubectl)
# This is like installing the lab management system

# Install prerequisites for adding Kubernetes repository
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl

# Download and add Google Cloud's public signing key
# This verifies packages are genuine (like verifying reagent authenticity)
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/kubernetes-archive-keyring.gpg

# Add Kubernetes repository
# This tells your system where to download Kubernetes from
echo "deb [signed-by=/usr/share/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Update package list with new repository
sudo apt-get update

# Install specific versions (1.28 for CKA exam compatibility)
# - kubelet: Node agent that runs on each node (lab technician)
# - kubeadm: Tool to bootstrap the cluster (lab setup tool)
# - kubectl: Command-line tool to control cluster (lab control panel)
sudo apt-get install -y kubelet=1.28.0-00 kubeadm=1.28.0-00 kubectl=1.28.0-00

# Prevent automatic updates (we want version consistency for CKA)
# Like using validated methods in forensics - no unexpected changes
sudo apt-mark hold kubelet kubeadm kubectl

# Verify installation
kubeadm version
kubectl version --client
kubelet --version
```

#### **PART 6: Initialize the Kubernetes Cluster**

```bash
# Step 5: Initialize the cluster with kubeadm
# This is THE MOST IMPORTANT STEP - creating your Kubernetes cluster

# Get your machine's IP address first
ip addr show
# Look for your main network interface (usually eth0 or ens33)
# Note the IP address (e.g., 192.168.1.100)

# Initialize the cluster
# Breaking down each parameter:
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \     # IP range for pods (like lab section addresses)
  --apiserver-advertise-address=<YOUR-IP> # API server IP (lab's main entrance)

# What happens during init:
# 1. Preflight checks (verify system requirements)
# 2. Generate certificates (security credentials)
# 3. Create kubeconfig files (access configurations)
# 4. Bootstrap control plane (start management components)
# 5. Generate token for joining nodes (if adding more machines)

# SAVE THE OUTPUT! You'll see something like:
# kubeadm join 192.168.1.100:6443 --token abcdef.0123456789abcdef \
#     --discovery-token-ca-cert-hash sha256:123...
# This is used to add more nodes later

# If initialization fails, you can reset with:
# sudo kubeadm reset
# Then try again after fixing issues
```

#### **PART 7: Configure kubectl Access**

```bash
# Step 6: Set up kubectl to communicate with cluster
# kubectl needs credentials to talk to the API server

# Create .kube directory in your home folder
mkdir -p $HOME/.kube

# Copy the admin configuration file
# This file contains certificates and connection info
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

# Change ownership so your user can read it
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Verify kubectl can connect to cluster
kubectl get nodes
# You should see your node in "NotReady" state (need network plugin)

# Check all system pods
kubectl get pods -n kube-system
# You'll see control plane components starting up
```

#### **PART 8: Install Network Plugin (CNI)**

```bash
# Step 7: Install Flannel network plugin
# This enables pod-to-pod communication (like connecting lab instruments)

# Apply Flannel manifest
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# What this does:
# - Creates network bridges between pods
# - Assigns IP addresses to pods
# - Enables cross-pod communication

# Wait for Flannel to be ready (about 1-2 minutes)
kubectl get pods -n kube-flannel
# All pods should show "Running"

# Verify node is now Ready
kubectl get nodes
# Should show "Ready" status
```

#### **PART 9: Enable Single-Node Cluster**

```bash
# Step 8: Remove taint for single-node cluster
# By default, control plane nodes don't run user workloads (security)
# Since we have one node, we need to allow workloads on it

# Remove the taint that prevents scheduling on control plane
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# This is like allowing analysis equipment in the management office
# Not ideal for production, but necessary for single-node setup
```

#### **PART 10: Verify Complete Installation**

```bash
# Step 9: Final verification

# Check node status
kubectl get nodes -o wide
# Should show Ready, with IP addresses and container runtime

# Check all system components
kubectl get pods -n kube-system
# All should be Running or Completed

# Check cluster info
kubectl cluster-info
# Shows API server and other component URLs

# Run a test pod
kubectl run test-pod --image=nginx --port=80
kubectl get pods
# Should show test-pod Running

# Clean up test
kubectl delete pod test-pod
```

### **TROUBLESHOOTING GUIDE**

```bash
# Common Issues and Solutions:

# Issue 1: Node stays NotReady
# Solution: Check Flannel pods
kubectl describe node $(hostname)
kubectl logs -n kube-flannel -l app=flannel

# Issue 2: Kubeadm init fails
# Solution: Check prerequisites
sudo kubeadm reset
sudo rm -rf /etc/cni/net.d
sudo rm -rf $HOME/.kube
# Then retry initialization

# Issue 3: Cannot connect to API server
# Solution: Check firewall
sudo ufw status
sudo ufw allow 6443/tcp  # API server port
sudo ufw allow 10250/tcp # Kubelet port

# View detailed logs
sudo journalctl -xeu kubelet
sudo journalctl -xeu containerd
```

### **Afternoon (4 hrs): Docker Containerization with Deep Dive**

#### **PART 1: Understanding Docker Concepts**

```dockerfile
# Dockerfile Explained - Multi-stage Build Pattern
# This is like a two-step forensic process:
# 1. Sample preparation (build stage)
# 2. Analysis execution (runtime stage)

# ===== BUILD STAGE =====
# This stage prepares everything needed (like DNA extraction)
FROM node:18-alpine AS builder
# FROM: Specifies base image (starting point)
# node:18-alpine: Node.js v18 on Alpine Linux (small, secure)
# AS builder: Names this stage for reference later

# Set working directory inside container
# Like designating a specific lab bench for this work
WORKDIR /app

# Copy package files first (Docker layer caching optimization)
# If packages don't change, Docker reuses this layer
COPY package*.json ./
# Why package*.json? Matches package.json and package-lock.json

# Install production dependencies only
# --production flag excludes devDependencies (smaller image)
RUN npm ci --production
# ci = clean install (faster, more reliable than npm install)
# Uses package-lock.json for exact versions (reproducibility)

# ===== RUNTIME STAGE =====
# Fresh start with minimal image (like clean analysis environment)
FROM node:18-alpine
# Starting fresh prevents build tools from being in final image

# Create non-root user for security
# Like having designated personnel for specific procedures
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
# -g 1001: Group ID
# -S: System group/user (no password, no home)
# Why? Running as root in container is security risk

# Set working directory
WORKDIR /app

# Copy dependencies from builder stage
# Like transferring prepared samples to analysis instrument
COPY --from=builder /app/node_modules ./node_modules
# --from=builder: Reference the builder stage
# Only copies what we need (dependencies)

# Copy application code
# Using --chown to set ownership immediately
COPY --chown=nodejs:nodejs . .
# First dot: source (current directory on host)
# Second dot: destination (/app in container)

# Switch to non-root user
USER nodejs

# Document which port the app uses
# This is metadata only (doesn't actually open ports)
EXPOSE 3001

# Health check configuration
# Like quality control checks in forensics
HEALTHCHECK --interval=30s \      # Check every 30 seconds
  --timeout=3s \                   # Wait 3 seconds for response
  --start-period=5s \              # Grace period during startup
  --retries=3 \                    # Fail after 3 failed checks
  CMD node healthcheck.js || exit 1
# If healthcheck fails, container is marked unhealthy

# Default command to run when container starts
# Like pressing "start" on the analysis instrument
CMD ["node", "server.js"]
# Using array syntax (exec form) instead of shell form
# More secure and predictable
```

#### **PART 2: Building and Managing Docker Images**

```bash
# Understanding Docker Build Process

# 1. Build the Docker image
docker build -t jagdna-lims:v1.0.0 .
# Breakdown:
# docker build: Command to build image
# -t: Tag the image with a name
# jagdna-lims:v1.0.0: image_name:tag format
# . : Build context (current directory)

# What happens during build:
# 1. Docker reads Dockerfile
# 2. Executes each instruction creating layers
# 3. Caches layers for faster rebuilds
# 4. Tags final image

# 2. View build history (like audit trail)
docker history jagdna-lims:v1.0.0
# Shows each layer and its size
# Helps identify what makes image large

# 3. Inspect image details
docker image inspect jagdna-lims:v1.0.0
# Shows metadata, environment variables, exposed ports

# 4. Security scan the image
# Install Trivy first (security scanner)
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# Scan for vulnerabilities (like contamination check)
trivy image jagdna-lims:v1.0.0
# Shows CVEs (Common Vulnerabilities and Exposures)
# HIGH and CRITICAL should be addressed
```

#### **PART 3: Setting Up Local Docker Registry**

```bash
# Local Registry Setup (like sample storage system)

# 1. Run registry container
docker run -d \                    # -d: Run in background (daemon)
  -p 5000:5000 \                  # Map port 5000 host to 5000 container
  --restart=always \              # Restart if it crashes
  --name registry \               # Container name for easy reference
  -v /opt/registry:/var/lib/registry \  # Persist data on host
  registry:2                      # Official registry image v2

# 2. Verify registry is running
docker ps | grep registry
curl http://localhost:5000/v2/
# Should return {} (empty JSON)

# 3. Tag image for local registry
docker tag jagdna-lims:v1.0.0 localhost:5000/jagdna-lims:v1.0.0
# Creates new tag pointing to same image
# localhost:5000 tells Docker to use local registry

# 4. Push to local registry
docker push localhost:5000/jagdna-lims:v1.0.0
# Uploads image layers to registry
# Progress bar shows each layer upload

# 5. Verify image in registry
curl http://localhost:5000/v2/_catalog
# Shows: {"repositories":["jagdna-lims"]}

# 6. Test pulling from registry
docker rmi localhost:5000/jagdna-lims:v1.0.0  # Remove local copy
docker pull localhost:5000/jagdna-lims:v1.0.0  # Pull from registry
# Proves registry is working
```

#### **PART 4: Deploy to Kubernetes**

```bash
# Quick Deployment Test to Kubernetes

# 1. Create deployment using kubectl run
kubectl create deployment lims-backend \
  --image=localhost:5000/jagdna-lims:v1.0.0 \
  --port=3001 \
  --replicas=2

# What this creates:
# - Deployment (manages desired state)
# - ReplicaSet (ensures 2 pods running)
# - 2 Pods (actual running containers)

# 2. Watch pods being created
kubectl get pods -w
# -w: Watch for changes
# You'll see: Pending → ContainerCreating → Running

# 3. Check deployment details
kubectl describe deployment lims-backend
# Shows events, replicas, update strategy

# 4. Expose deployment as service
kubectl expose deployment lims-backend \
  --type=NodePort \              # Accessible from outside cluster
  --port=3001 \                  # Service port
  --target-port=3001 \           # Container port
  --node-port=30001              # External port (30000-32767 range)

# 5. Get service details
kubectl get svc lims-backend
# Shows ClusterIP and NodePort

# 6. Test the application
curl http://localhost:30001/health
# Should return health check JSON

# 7. View logs from pods
kubectl logs -l app=lims-backend
# -l: Select by label
# Shows logs from all pods with this label

# 8. Execute command in pod (debugging)
POD_NAME=$(kubectl get pods -l app=lims-backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD_NAME -- sh
# Now you're inside the container
# Run: ps aux, ls -la, env
# Exit with: exit
```

---

## 🗓️ **DAY 2: PYTHON AUTOMATION & HELM CHARTS**
### Goal: Leverage your PCAP certification for automation and package management

### **Morning (4 hrs): Python Automation Scripts with Detailed Explanations**

#### **PART 1: Understanding Python Automation Architecture**

```python
#!/usr/bin/env python3
"""
deployment_automation.py
Complete Kubernetes Deployment Automation System

This script demonstrates:
1. Object-Oriented Programming (OOP) - PCAP certification skill
2. Error handling and logging
3. Subprocess management for system commands
4. JSON/YAML processing
5. REST API interactions

Think of this as automating your entire forensic workflow:
- Sample registration → Container deployment
- Quality control → Health checks
- Result reporting → Status monitoring
"""

import subprocess      # For running shell commands
import json           # For parsing Kubernetes JSON output
import yaml           # For reading/writing YAML configs
import logging        # For structured logging (audit trail)
import sys            # For system operations
from datetime import datetime  # For timestamps
from typing import Dict, List, Optional  # Type hints (Python 3.5+)
import requests       # For HTTP requests to services
import time          # For delays and retries
import argparse      # For command-line interface

# Configure logging (like setting up lab notebook)
# This creates detailed logs for debugging and audit
logging.basicConfig(
    level=logging.INFO,                          # Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format='%(asctime)s - %(levelname)s - %(message)s',  # Log format
    handlers=[
        logging.FileHandler('deployment.log'),   # Write to file
        logging.StreamHandler(sys.stdout)        # Also print to console
    ]
)
logger = logging.getLogger(__name__)  # Get logger for this module

class KubernetesDeployment:
    """
    Manages Kubernetes deployments programmatically
    Like a lab automation system for forensic workflows
    """
    
    def __init__(self, namespace: str = "production"):
        """
        Initialize deployment manager
        
        Args:
            namespace: Kubernetes namespace (like lab section)
        """
        self.namespace = namespace
        self.kubectl = self._verify_kubectl()  # Check kubectl is available
        
    def _verify_kubectl(self) -> bool:
        """
        Verify kubectl is installed and configured
        Like checking all lab equipment is operational
        
        Returns:
            bool: True if kubectl is working
        """
        try:
            # Run kubectl version command
            result = subprocess.run(
                ["kubectl", "version", "--short"],  # Command as list
                capture_output=True,  # Capture stdout and stderr
                text=True,           # Return as string (not bytes)
                check=True           # Raise exception if command fails
            )
            logger.info("✅ kubectl verified")
            return True
        except subprocess.CalledProcessError as e:
            # CalledProcessError raised when command returns non-zero exit code
            logger.error(f"❌ kubectl not found or not configured: {e}")
            sys.exit(1)  # Exit with error code
        except FileNotFoundError:
            # kubectl binary not found in PATH
            logger.error("❌ kubectl not installed")
            sys.exit(1)
    
    def deploy_application(self, image_tag: str) -> bool:
        """
        Deploy LIMS application with specified image tag
        Like running a specific version of analysis protocol
        
        Args:
            image_tag: Docker image tag (version)
            
        Returns:
            bool: True if deployment successful
        """
        # Define Kubernetes deployment manifest as Python string
        # Using f-strings for variable interpolation
        deployment_manifest = f"""
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-backend
  namespace: {self.namespace}
  labels:
    app: lims-backend
    version: {image_tag}
spec:
  replicas: 3  # Run 3 copies for high availability
  selector:
    matchLabels:
      app: lims-backend
  template:
    metadata:
      labels:
        app: lims-backend
        version: {image_tag}
    spec:
      containers:
      - name: lims
        image: localhost:5000/jagdna-lims:{image_tag}
        ports:
        - containerPort: 3001
          name: http
        env:
        - name: NODE_ENV
          value: production
        - name: LOG_LEVEL
          value: info
        resources:
          requests:  # Minimum resources needed
            memory: "256Mi"
            cpu: "250m"  # 0.25 CPU cores
          limits:    # Maximum resources allowed
            memory: "512Mi"
            cpu: "500m"  # 0.5 CPU cores
        livenessProbe:  # Restart if unhealthy
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:  # Remove from load balancer if not ready
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
"""
        
        # Save manifest to temporary file
        manifest_file = '/tmp/deployment.yaml'
        with open(manifest_file, 'w') as f:
            f.write(deployment_manifest)
        logger.info(f"📝 Created deployment manifest for version {image_tag}")
        
        # Apply deployment using kubectl
        try:
            result = subprocess.run(
                ["kubectl", "apply", "-f", manifest_file],
                check=True,
                capture_output=True,
                text=True
            )
            logger.info(f"✅ Deployed version {image_tag}")
            logger.debug(f"kubectl output: {result.stdout}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Deployment failed: {e.stderr}")
            return False
        
        finally:
            # Clean up temporary file
            import os
            if os.path.exists(manifest_file):
                os.remove(manifest_file)
    
    def check_deployment_health(self) -> Dict:
        """
        Check deployment health status
        Like running quality control checks on analysis
        
        Returns:
            dict: Health status information
        """
        cmd = [
            "kubectl", "get", "deployment", "lims-backend",
            "-n", self.namespace,  # Specify namespace
            "-o", "json"           # Output as JSON for parsing
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            deployment = json.loads(result.stdout)  # Parse JSON output
            
            # Extract status information
            status = {
                "name": deployment["metadata"]["name"],
                "namespace": deployment["metadata"]["namespace"],
                "replicas": deployment["spec"]["replicas"],
                "ready": deployment["status"].get("readyReplicas", 0),
                "available": deployment["status"].get("availableReplicas", 0),
                "updated": deployment["status"].get("updatedReplicas", 0),
                "conditions": deployment["status"].get("conditions", [])
            }
            
            # Determine overall health
            status["healthy"] = status["ready"] == status["replicas"]
            
            # Log status
            if status["healthy"]:
                logger.info(f"✅ Deployment healthy: {status['ready']}/{status['replicas']} replicas ready")
            else:
                logger.warning(f"⚠️ Deployment degraded: {status['ready']}/{status['replicas']} replicas ready")
            
            return status
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to check deployment: {e}")
            return {"healthy": False, "error": str(e)}
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse JSON: {e}")
            return {"healthy": False, "error": "Invalid JSON response"}
    
    def rollback_deployment(self) -> bool:
        """
        Rollback to previous deployment version
        Like reverting to previous validated protocol
        
        Returns:
            bool: True if rollback successful
        """
        try:
            # Kubernetes keeps history of deployments
            # This command reverts to previous version
            subprocess.run(
                ["kubectl", "rollout", "undo", 
                 f"deployment/lims-backend", "-n", self.namespace],
                check=True,
                capture_output=True
            )
            logger.info("✅ Rollback initiated")
            
            # Wait for rollback to complete
            subprocess.run(
                ["kubectl", "rollout", "status",
                 f"deployment/lims-backend", "-n", self.namespace],
                check=True,
                timeout=300  # 5 minute timeout
            )
            logger.info("✅ Rollback completed")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Rollback failed: {e}")
            return False
        except subprocess.TimeoutExpired:
            logger.error("❌ Rollback timeout")
            return False
    
    def scale_deployment(self, replicas: int) -> bool:
        """
        Scale deployment to specified replicas
        Like adjusting lab capacity for sample volume
        
        Args:
            replicas: Number of pod replicas
            
        Returns:
            bool: True if scaling successful
        """
        if replicas < 1 or replicas > 10:
            logger.error(f"❌ Invalid replica count: {replicas} (must be 1-10)")
            return False
        
        try:
            subprocess.run(
                ["kubectl", "scale", f"deployment/lims-backend",
                 f"--replicas={replicas}", "-n", self.namespace],
                check=True,
                capture_output=True
            )
            logger.info(f"✅ Scaled to {replicas} replicas")
            
            # Wait for scaling to complete
            time.sleep(5)  # Give it time to start
            
            # Verify scaling worked
            status = self.check_deployment_health()
            if status.get("replicas") == replicas:
                logger.info(f"✅ Scaling verified: {replicas} replicas")
                return True
            else:
                logger.warning(f"⚠️ Scaling not yet complete")
                return False
                
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Scaling failed: {e}")
            return False
    
    def get_pod_logs(self, tail: int = 50) -> List[Dict]:
        """
        Get logs from all pods in deployment
        Like reviewing analysis logs for troubleshooting
        
        Args:
            tail: Number of log lines to retrieve
            
        Returns:
            list: Logs from each pod
        """
        # First, get list of pods
        cmd = [
            "kubectl", "get", "pods", "-n", self.namespace,
            "-l", "app=lims-backend",  # Label selector
            "-o", "jsonpath={.items[*].metadata.name}"  # Just pod names
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            pods = result.stdout.split()  # Split space-separated pod names
            
            if not pods:
                logger.warning("⚠️ No pods found")
                return []
            
            # Collect logs from each pod
            all_logs = []
            for pod in pods:
                log_cmd = [
                    "kubectl", "logs", pod,
                    "-n", self.namespace,
                    f"--tail={tail}"  # Limit number of lines
                ]
                
                try:
                    result = subprocess.run(log_cmd, capture_output=True, text=True, check=True)
                    all_logs.append({
                        "pod": pod,
                        "logs": result.stdout.splitlines()  # Split into list of lines
                    })
                    logger.info(f"📋 Retrieved logs from {pod}")
                    
                except subprocess.CalledProcessError as e:
                    logger.error(f"❌ Failed to get logs from {pod}: {e}")
                    all_logs.append({
                        "pod": pod,
                        "error": str(e)
                    })
            
            return all_logs
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to list pods: {e}")
            return []

class HealthMonitor:
    """
    Monitor application health continuously
    Like continuous quality control in forensics lab
    """
    
    def __init__(self, endpoint: str):
        """
        Initialize health monitor
        
        Args:
            endpoint: Base URL of service to monitor
        """
        self.endpoint = endpoint
        self.metrics = {
            "total_checks": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "consecutive_failures": 0,
            "last_check_time": None,
            "uptime_percentage": 100.0
        }
        self.alert_threshold = 3  # Alert after 3 consecutive failures
    
    def check_health(self) -> bool:
        """
        Perform health check on endpoint
        Like running control samples in analysis
        
        Returns:
            bool: True if healthy
        """
        try:
            # Make HTTP request to health endpoint
            response = requests.get(
                f"{self.endpoint}/health",
                timeout=5  # 5 second timeout
            )
            
            self.metrics["total_checks"] += 1
            self.metrics["last_check_time"] = datetime.now()
            
            if response.status_code == 200:
                # Successful health check
                self.metrics["successful_checks"] += 1
                self.metrics["consecutive_failures"] = 0  # Reset failure counter
                
                # Parse JSON response
                health_data = response.json()
                logger.info(f"✅ Health check passed: {health_data}")
                return True
            else:
                # Health check failed
                self.metrics["failed_checks"] += 1
                self.metrics["consecutive_failures"] += 1
                logger.warning(f"⚠️ Health check failed: Status {response.status_code}")
                
                # Check if we need to alert
                if self.metrics["consecutive_failures"] >= self.alert_threshold:
                    self.send_alert(f"Service unhealthy: {self.metrics['consecutive_failures']} consecutive failures")
                
                return False
                
        except requests.RequestException as e:
            # Network or timeout error
            self.metrics["failed_checks"] += 1
            self.metrics["consecutive_failures"] += 1
            logger.error(f"❌ Health check error: {e}")
            
            if self.metrics["consecutive_failures"] >= self.alert_threshold:
                self.send_alert(f"Service unreachable: {e}")
            
            return False
    
    def calculate_uptime(self) -> float:
        """
        Calculate uptime percentage
        Like calculating analysis success rate
        
        Returns:
            float: Uptime percentage
        """
        if self.metrics["total_checks"] > 0:
            uptime = (self.metrics["successful_checks"] / self.metrics["total_checks"]) * 100
            self.metrics["uptime_percentage"] = round(uptime, 2)
        return self.metrics["uptime_percentage"]
    
    def continuous_monitoring(self, interval: int = 30, duration: int = None):
        """
        Run continuous health monitoring
        Like 24/7 lab monitoring system
        
        Args:
            interval: Seconds between checks
            duration: Total monitoring duration in seconds (None = infinite)
        """
        logger.info(f"🔍 Starting continuous monitoring (interval: {interval}s)")
        start_time = time.time()
        
        try:
            while True:
                # Perform health check
                self.check_health()
                
                # Calculate and log uptime
                uptime = self.calculate_uptime()
                logger.info(f"📊 Uptime: {uptime}% ({self.metrics['successful_checks']}/{self.metrics['total_checks']})")
                
                # Check if we should stop (if duration specified)
                if duration and (time.time() - start_time) > duration:
                    logger.info(f"⏱️ Monitoring duration ({duration}s) reached")
                    break
                
                # Wait for next check
                time.sleep(interval)
                
        except KeyboardInterrupt:
            logger.info("🛑 Monitoring stopped by user")
            self.print_summary()
    
    def print_summary(self):
        """Print monitoring summary statistics"""
        logger.info("=" * 50)
        logger.info("📊 MONITORING SUMMARY")
        logger.info(f"Total Checks: {self.metrics['total_checks']}")
        logger.info(f"Successful: {self.metrics['successful_checks']}")
        logger.info(f"Failed: {self.metrics['failed_checks']}")
        logger.info(f"Uptime: {self.metrics['uptime_percentage']}%")
        logger.info(f"Last Check: {self.metrics['last_check_time']}")
        logger.info("=" * 50)
    
    def send_alert(self, message: str):
        """
        Send alert notification
        In production, would integrate with PagerDuty, Slack, etc.
        
        Args:
            message: Alert message
        """
        logger.critical(f"🚨 ALERT: {message}")
        # In production, you would:
        # - Send to PagerDuty: requests.post(pagerduty_url, ...)
        # - Send to Slack: requests.post(slack_webhook, ...)
        # - Send email: smtplib.SMTP(...)
        # - Create incident ticket: jira_api.create_issue(...)

def main():
    """
    Main execution function with CLI interface
    Provides command-line interface for all operations
    """
    # Set up argument parser for command-line interface
    parser = argparse.ArgumentParser(
        description="LIMS Deployment Automation Tool",
        epilog="Example: python deployment_automation.py --deploy v1.0.0"
    )
    
    # Define command-line arguments
    parser.add_argument(
        "--deploy",
        help="Deploy application with specified image tag",
        type=str,
        metavar="TAG"
    )
    
    parser.add_argument(
        "--rollback",
        action="store_true",  # Flag (no value needed)
        help="Rollback to previous deployment"
    )
    
    parser.add_argument(
        "--scale",
        help="Scale deployment to N replicas",
        type=int,
        metavar="N"
    )
    
    parser.add_argument(
        "--health",
        action="store_true",
        help="Check deployment health"
    )
    
    parser.add_argument(
        "--logs",
        action="store_true",
        help="Get pod logs"
    )
    
    parser.add_argument(
        "--monitor",
        action="store_true",
        help="Start continuous monitoring"
    )
    
    parser.add_argument(
        "--namespace",
        default="production",
        help="Kubernetes namespace (default: production)"
    )
    
    parser.add_argument(
        "--endpoint",
        default="http://localhost:30001",
        help="Service endpoint for monitoring"
    )
    
    # Parse command-line arguments
    args = parser.parse_args()
    
    # Initialize deployment manager
    k8s = KubernetesDeployment(namespace=args.namespace)
    
    # Execute requested operation
    if args.deploy:
        logger.info(f"🚀 Deploying version {args.deploy}")
        if k8s.deploy_application(args.deploy):
            time.sleep(10)  # Wait for deployment to start
            k8s.check_deployment_health()
        
    elif args.rollback:
        logger.info("⏮️ Rolling back deployment")
        k8s.rollback_deployment()
        
    elif args.scale:
        logger.info(f"⚖️ Scaling to {args.scale} replicas")
        k8s.scale_deployment(args.scale)
        
    elif args.health:
        logger.info("🏥 Checking deployment health")
        status = k8s.check_deployment_health()
        print(json.dumps(status, indent=2))  # Pretty print JSON
        
    elif args.logs:
        logger.info("📋 Getting pod logs")
        logs = k8s.get_pod_logs(tail=20)
        for pod_logs in logs:
            print(f"\n=== Pod: {pod_logs['pod']} ===")
            if "error" in pod_logs:
                print(f"Error: {pod_logs['error']}")
            else:
                for line in pod_logs["logs"]:
                    print(line)
        
    elif args.monitor:
        logger.info(f"📡 Starting health monitoring on {args.endpoint}")
        monitor = HealthMonitor(args.endpoint)
        monitor.continuous_monitoring(interval=30)
        
    else:
        # No arguments provided, show help
        parser.print_help()

# Python idiom: Only run main() if script is executed directly
# Not if it's imported as a module
if __name__ == "__main__":
    main()
```

#### **PART 2: Using the Python Automation Scripts**

```bash
# How to use the deployment automation script

# 1. Deploy a new version
python3 deployment_automation.py --deploy v1.0.0
# This will:
# - Create deployment manifest
# - Apply to Kubernetes
# - Check health status

# 2. Check deployment health
python3 deployment_automation.py --health
# Returns JSON with replica status

# 3. Scale deployment
python3 deployment_automation.py --scale 5
# Increases replicas to 5

# 4. Get logs from all pods
python3 deployment_automation.py --logs
# Shows last 20 lines from each pod

# 5. Start continuous monitoring
python3 deployment_automation.py --monitor
# Checks health every 30 seconds
# Press Ctrl+C to stop

# 6. Rollback if something goes wrong
python3 deployment_automation.py --rollback
# Reverts to previous version

# 7. Use different namespace
python3 deployment_automation.py --deploy v1.0.0 --namespace staging
# Deploys to staging namespace
```

### **Afternoon (4 hrs): Helm Charts - Kubernetes Package Management**

#### **PART 1: Understanding Helm Concepts**

```bash
# What is Helm?
# Helm is the "package manager" for Kubernetes
# Think of it like:
# - apt/yum for Linux
# - npm for Node.js
# - pip for Python

# Helm Components:
# 1. Chart: Package containing Kubernetes resources
# 2. Values: Configuration for the chart
# 3. Release: Instance of a chart deployed to cluster
# 4. Repository: Where charts are stored

# Install Helm
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh

# Verify installation
helm version
```

#### **PART 2: Creating Your Helm Chart**

```bash
# Create new Helm chart
helm create jagdna-lims

# This creates the following structure:
# jagdna-lims/
# ├── Chart.yaml          # Chart metadata
# ├── values.yaml         # Default configuration values
# ├── charts/            # Chart dependencies
# ├── templates/         # Kubernetes manifest templates
# │   ├── deployment.yaml
# │   ├── service.yaml
# │   ├── hpa.yaml
# │   ├── ingress.yaml
# │   ├── serviceaccount.yaml
# │   ├── NOTES.txt      # Post-install notes
# │   └── _helpers.tpl   # Template helpers
# └── .helmignore        # Files to ignore

cd jagdna-lims
```

#### **PART 3: Detailed Chart Configuration**

```yaml
# Chart.yaml - Chart metadata
# This file describes your chart
apiVersion: v2  # Helm chart API version (v2 for Helm 3)
name: jagdna-lims  # Chart name
description: Forensic LIMS for DNA Paternity Testing  # What it does

# Chart versioning follows semantic versioning
type: application  # 'application' or 'library'
version: 1.0.0    # Chart version (how to package)
appVersion: "1.0.0"  # Application version (what to package)

# Keywords help others find your chart
keywords:
  - forensics
  - lims
  - dna
  - paternity
  
# Maintainer information
maintainers:
  - name: Your Name
    email: your.email@example.com
    url: https://github.com/yourusername

# Dependencies (other charts this chart needs)
dependencies: []
  # Example dependency:
  # - name: postgresql
  #   version: 12.1.2
  #   repository: https://charts.bitnami.com/bitnami
```

```yaml
# values.yaml - Configuration values
# These are the default values for your chart
# Users can override these with their own values

# Number of replicas (pod copies)
# Like running multiple analysis instruments in parallel
replicaCount: 2

# Docker image configuration
image:
  repository: localhost:5000/jagdna-lims  # Image location
  pullPolicy: Always  # Always/IfNotPresent/Never
  tag: "latest"  # Overrides chart appVersion

# Image pull secrets (if using private registry)
imagePullSecrets: []

# Override the default name
nameOverride: ""
fullnameOverride: ""

# Service account configuration
serviceAccount:
  create: true  # Create service account
  annotations: {}
  name: ""  # Use default if empty

# Pod security context
# Like access control in the lab
podSecurityContext:
  fsGroup: 1001  # File system group
  runAsNonRoot: true  # Don't run as root
  runAsUser: 1001  # User ID

# Container security context
securityContext:
  capabilities:
    drop:
    - ALL  # Drop all capabilities
  readOnlyRootFilesystem: false
  runAsNonRoot: true
  runAsUser: 1001

# Service configuration
# How the application is exposed
service:
  type: NodePort  # ClusterIP/NodePort/LoadBalancer
  port: 3001  # Service port
  targetPort: 3001  # Container port
  nodePort: 30001  # External port (NodePort only)

# Ingress configuration (external access)
ingress:
  enabled: false  # Enable/disable ingress
  className: "nginx"  # Ingress controller class
  annotations: {}
    # kubernetes.io/ingress.class: nginx
    # kubernetes.io/tls-acme: "true"
  hosts:
    - host: lims.local
      paths:
        - path: /
          pathType: Prefix
  tls: []
  #  - secretName: lims-tls
  #    hosts:
  #      - lims.local

# Resource limits and requests
# Like allocating lab resources
resources:
  limits:  # Maximum resources
    cpu: 500m  # 0.5 CPU cores
    memory: 512Mi
  requests:  # Guaranteed resources
    cpu: 250m  # 0.25 CPU cores
    memory: 256Mi

# Autoscaling configuration
# Like adding more lab capacity during peak times
autoscaling:
  enabled: true
  minReplicas: 2  # Minimum pods
  maxReplicas: 10  # Maximum pods
  targetCPUUtilizationPercentage: 70  # Scale at 70% CPU
  targetMemoryUtilizationPercentage: 80  # Scale at 80% memory

# Node selector (run on specific nodes)
nodeSelector: {}
  # disktype: ssd

# Tolerations (allow scheduling on tainted nodes)
tolerations: []

# Affinity rules (pod placement preferences)
affinity: {}

# Application-specific configuration
# Forensic lab-specific settings
forensics:
  labName: "JAGDNA Scientific"
  isoCompliance: "17025:2017"
  workflowStages:
    - sample_collected
    - extraction_ready
    - extraction_in_progress
    - pcr_ready
    - pcr_completed
    - electro_ready
    - analysis_ready
    - report_ready
  
  # Database configuration
  database:
    type: "postgresql"
    host: "postgres-service"
    port: 5432
    name: "lims_db"
    username: "lims_user"
    # Password should be in secret
  
  # Quality control settings
  qualityControl:
    enabled: true
    positiveControl: true
    negativeControl: true
    blankControl: true
    
  # Analysis parameters
  analysis:
    method: "STR"  # Short Tandem Repeat
    kit: "PowerPlex ESX 17"
    loci: 16
    amelogenin: true
```

#### **PART 4: Template Files Explained**

```yaml
# templates/deployment.yaml
# This is a template file using Go template syntax
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "jagdna-lims.fullname" . }}  # Helper function for name
  labels:
    {{- include "jagdna-lims.labels" . | nindent 4 }}  # Include common labels
spec:
  {{- if not .Values.autoscaling.enabled }}  # Only set replicas if not autoscaling
  replicas: {{ .Values.replicaCount }}  # From values.yaml
  {{- end }}
  selector:
    matchLabels:
      {{- include "jagdna-lims.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      {{- with .Values.podAnnotations }}  # If podAnnotations exist
      annotations:
        {{- toYaml . | nindent 8 }}  # Convert to YAML and indent
      {{- end }}
      labels:
        {{- include "jagdna-lims.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "jagdna-lims.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
      - name: {{ .Chart.Name }}
        securityContext:
          {{- toYaml .Values.securityContext | nindent 12 }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.service.targetPort }}
          protocol: TCP
        
        # Environment variables from forensics configuration
        env:
        - name: LAB_NAME
          value: {{ .Values.forensics.labName | quote }}  # quote ensures string
        - name: ISO_COMPLIANCE
          value: {{ .Values.forensics.isoCompliance | quote }}
        - name: DB_HOST
          value: {{ .Values.forensics.database.host | quote }}
        - name: DB_PORT
          value: {{ .Values.forensics.database.port | quote }}
        - name: DB_NAME
          value: {{ .Values.forensics.database.name | quote }}
        
        # Liveness probe (restart if fails)
        livenessProbe:
          httpGet:
            path: /health/live
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness probe (remove from service if fails)
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        
        resources:
          {{- toYaml .Values.resources | nindent 12 }}
      
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "jagdna-lims.fullname" . }}
  labels:
    {{- include "jagdna-lims.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.targetPort }}
      {{- if and (eq .Values.service.type "NodePort") .Values.service.nodePort }}
      nodePort: {{ .Values.service.nodePort }}
      {{- end }}
      protocol: TCP
      name: http
  selector:
    {{- include "jagdna-lims.selectorLabels" . | nindent 4 }}
```

#### **PART 5: Using Helm Commands**

```bash
# 1. Validate chart (check for errors)
helm lint .
# Shows any issues with chart structure or templates

# 2. Dry run (see what would be installed)
helm install jagdna-lims . --dry-run --debug
# Shows all Kubernetes manifests that would be created

# 3. Install the chart
helm install jagdna-lims . \
  --namespace production \
  --create-namespace \
  --wait  # Wait for deployment to be ready

# 4. List installed releases
helm list -n production
# Shows: NAME, NAMESPACE, REVISION, STATUS

# 5. Get release values
helm get values jagdna-lims -n production
# Shows the values used for this release

# 6. Upgrade release with new values
helm upgrade jagdna-lims . \
  --namespace production \
  --set image.tag=v1.0.1 \
  --set replicaCount=3

# 7. View release history
helm history jagdna-lims -n production
# Shows all revisions

# 8. Rollback to previous version
helm rollback jagdna-lims 1 -n production
# Rolls back to revision 1

# 9. Uninstall release
helm uninstall jagdna-lims -n production
# Removes all resources

# 10. Package chart for distribution
helm package .
# Creates jagdna-lims-1.0.0.tgz
```

#### **PART 6: Advanced Helm Features**

```bash
# Using multiple values files
# values-dev.yaml for development
# values-prod.yaml for production

# Install with specific values file
helm install jagdna-lims . \
  -f values-prod.yaml \
  --namespace production

# Override specific values
helm install jagdna-lims . \
  --set forensics.labName="JAGDNA Scientific Production" \
  --set replicaCount=5 \
  --set image.tag=v2.0.0

# Using secrets in Helm
# Create secret first
kubectl create secret generic lims-secret \
  --from-literal=db-password=SecurePass123 \
  --namespace production

# Reference in template
# env:
# - name: DB_PASSWORD
#   valueFrom:
#     secretKeyRef:
#       name: lims-secret
#       key: db-password

# Helm hooks (run jobs at specific points)
# pre-install, post-install, pre-upgrade, etc.
# templates/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "jagdna-lims.fullname" . }}-migrate
  annotations:
    "helm.sh/hook": pre-upgrade  # Run before upgrade
    "helm.sh/hook-weight": "-5"  # Order of execution
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        command: ["npm", "run", "migrate"]
      restartPolicy: Never
```

---

## 🗓️ **DAY 3: TERRAFORM IaC & GIT STRATEGIES**
### Goal: Master Infrastructure as Code and Professional Version Control

### **Morning (4 hrs): Complete Terraform Implementation with Deep Explanations**

#### **PART 1: Understanding Terraform Concepts**

```hcl
# Terraform Fundamentals Explained
#
# Terraform is Infrastructure as Code (IaC)
# Like writing SOPs for lab setup - reproducible and version controlled
#
# Key Concepts:
# 1. Providers - Connect to platforms (AWS, Kubernetes, etc.)
# 2. Resources - Things you create (deployments, services, etc.)
# 3. Variables - Configurable inputs
# 4. Outputs - Information to display
# 5. State - Current infrastructure status
# 6. Modules - Reusable components
```

#### **PART 2: Complete Terraform Configuration**

```hcl
# versions.tf - Define Terraform and provider versions
# Like specifying exact reagent versions in forensics
terraform {
  # Minimum Terraform version required
  required_version = ">= 1.0"
  
  # Define required providers and versions
  required_providers {
    # Kubernetes provider for K8s resources
    kubernetes = {
      source  = "hashicorp/kubernetes"  # Provider source
      version = "~> 2.23"  # Version constraint (~> allows patch updates)
    }
    
    # Helm provider for Helm charts
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    
    # Random provider for generating passwords
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    
    # Local provider for local files
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
  
  # Backend configuration (where state is stored)
  # For now, using local backend (state on disk)
  # In production, use remote backend (S3, Azure Blob, etc.)
  backend "local" {
    path = "terraform.tfstate"
  }
  
  # Example remote backend for AWS
  # backend "s3" {
  #   bucket         = "jagdna-terraform-state"
  #   key            = "lims/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"  # For state locking
  # }
}

# providers.tf - Configure providers
# Like setting up lab equipment connections

# Configure Kubernetes provider
provider "kubernetes" {
  # Path to kubeconfig file
  config_path = "~/.kube/config"
  
  # Or use in-cluster config for pods
  # load_config_file = false
  
  # Can also specify context
  # config_context = "production"
}

# Configure Helm provider
provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
  
  # Can add Helm repositories here
  # repository_config_path = "${path.module}/.helm/repositories.yaml"
  # repository_cache       = "${path.module}/.helm"
}

# variables.tf - Input variables
# Like configurable parameters in lab protocols

# Environment variable
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string  # Variable type
  default     = "production"  # Default value
  
  # Validation rule
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

# Application name
variable "app_name" {
  description = "Application name"
  type        = string
  default     = "jagdna-lims"
}

# Number of replicas
variable "replicas" {
  description = "Number of pod replicas"
  type        = number
  default     = 3
  
  validation {
    condition     = var.replicas >= 1 && var.replicas <= 10
    error_message = "Replicas must be between 1 and 10."
  }
}

# Docker image tag
variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# Database configuration
variable "database_config" {
  description = "Database configuration"
  type = object({
    host     = string
    port     = number
    name     = string
    username = string
  })
  default = {
    host     = "postgres-service"
    port     = 5432
    name     = "lims_db"
    username = "lims_user"
  }
  sensitive = false  # Mark as sensitive to hide in logs
}

# Resource limits
variable "resources" {
  description = "Container resource limits and requests"
  type = object({
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
    requests = {
      cpu    = "250m"
      memory = "256Mi"
    }
  }
}

# locals.tf - Local values
# Computed values used throughout configuration
locals {
  # Common labels applied to all resources
  common_labels = {
    app         = var.app_name
    environment = var.environment
    managed-by  = "terraform"
    version     = var.image_tag
  }
  
  # Forensics-specific labels
  forensics_labels = {
    compliance  = "ISO-17025"
    lab         = "JAGDNA-Scientific"
    workflow    = "paternity-testing"
  }
  
  # Merge all labels
  all_labels = merge(local.common_labels, local.forensics_labels)
  
  # Construct image URL
  image_url = "localhost:5000/${var.app_name}:${var.image_tag}"
}

# namespace.tf - Create Kubernetes namespace
# Like designating a specific lab area
resource "kubernetes_namespace" "lims" {
  metadata {
    name = var.environment
    
    labels = local.all_labels
    
    annotations = {
      "created-by"    = "Terraform"
      "created-date"  = timestamp()
      "description"   = "Namespace for JAGDNA LIMS ${var.environment} environment"
    }
  }
  
  # Lifecycle rules
  lifecycle {
    # Prevent accidental deletion
    prevent_destroy = false  # Set to true in production
  }
}

# configmap.tf - Application configuration
# Like lab protocols and settings
resource "kubernetes_config_map" "lims_config" {
  metadata {
    name      = "${var.app_name}-config"
    namespace = kubernetes_namespace.lims.metadata[0].name
    labels    = local.all_labels
  }
  
  # Configuration data
  data = {
    # Environment settings
    NODE_ENV    = var.environment
    LOG_LEVEL   = var.environment == "production" ? "info" : "debug"
    
    # Lab settings
    LAB_NAME        = "JAGDNA Scientific"
    ISO_COMPLIANCE  = "17025:2017"
    
    # Workflow configuration (as JSON string)
    WORKFLOW_STAGES = jsonencode([
      "sample_collected",
      "extraction_ready",
      "extraction_in_progress",
      "extraction_completed",
      "pcr_ready",
      "pcr_completed",
      "electro_ready",
      "electro_completed",
      "analysis_ready",
      "analysis_completed",
      "report_ready",
      "report_sent"
    ])
    
    # Database configuration (non-sensitive)
    DB_HOST = var.database_config.host
    DB_PORT = tostring(var.database_config.port)
    DB_NAME = var.database_config.name
    DB_USER = var.database_config.username
  }
  
  # Binary data (for files)
  binary_data = {}
}

# secrets.tf - Sensitive data management
# Like securing controlled substances in lab

# Generate random passwords
resource "random_password" "jwt_secret" {
  length  = 32
  special = true
  upper   = true
  lower   = true
  numeric = true
  
  # Recreate if variable changes
  keepers = {
    environment = var.environment
  }
}

resource "random_password" "db_password" {
  length  = 16
  special = true
  
  # Exclude problematic characters
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Create Kubernetes secret
resource "kubernetes_secret" "lims_secret" {
  metadata {
    name      = "${var.app_name}-secret"
    namespace = kubernetes_namespace.lims.metadata[0].name
    labels    = local.all_labels
  }
  
  type = "Opaque"  # Generic secret type
  
  # Secret data (automatically base64 encoded)
  data = {
    jwt-secret  = random_password.jwt_secret.result
    db-password = random_password.db_password.result
  }
  
  # Lifecycle to handle updates
  lifecycle {
    # Create new secret before destroying old
    create_before_destroy = true
  }
}

# deployment.tf - Main application deployment
# Like setting up analysis equipment
resource "kubernetes_deployment" "lims_backend" {
  metadata {
    name      = "${var.app_name}-backend"
    namespace = kubernetes_namespace.lims.metadata[0].name
    labels    = local.all_labels
    
    annotations = {
      "deployment.kubernetes.io/revision" = "1"
    }
  }
  
  spec {
    replicas = var.replicas
    
    # Deployment strategy
    strategy {
      type = "RollingUpdate"  # Or "Recreate"
      
      rolling_update {
        max_unavailable = "25%"  # Maximum pods unavailable during update
        max_surge       = "25%"  # Maximum pods above desired count
      }
    }
    
    # Pod selector
    selector {
      match_labels = {
        app       = var.app_name
        component = "backend"
      }
    }
    
    # Pod template
    template {
      metadata {
        labels = merge(local.all_labels, {
          component = "backend"
        })
        
        annotations = {
          # Force pod restart when config changes
          "checksum/config" = sha256(jsonencode(kubernetes_config_map.lims_config.data))
          "checksum/secret" = sha256(jsonencode(kubernetes_secret.lims_secret.data))
          
          # Prometheus scraping
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "3001"
          "prometheus.io/path"   = "/metrics"
        }
      }
      
      spec {
        # Service account
        service_account_name = kubernetes_service_account.lims_sa.metadata[0].name
        
        # Security context for pod
        security_context {
          run_as_non_root = true
          run_as_user     = 1001
          fs_group        = 1001
        }
        
        # Init container (runs before main container)
        init_container {
          name  = "wait-for-db"
          image = "busybox:1.35"
          
          command = ["sh", "-c"]
          args = [
            "until nc -z ${var.database_config.host} ${var.database_config.port}; do echo 'Waiting for database...'; sleep 2; done"
          ]
        }
        
        # Main container
        container {
          name  = "lims-backend"
          image = local.image_url
          image_pull_policy = "Always"
          
          # Ports
          port {
            container_port = 3001
            name          = "http"
            protocol      = "TCP"
          }
          
          # Environment variables from ConfigMap
          env_from {
            config_map_ref {
              name = kubernetes_config_map.lims_config.metadata[0].name
            }
          }
          
          # Individual environment variables from Secret
          env {
            name = "JWT_SECRET"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.lims_secret.metadata[0].name
                key  = "jwt-secret"
              }
            }
          }
          
          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.lims_secret.metadata[0].name
                key  = "db-password"
              }
            }
          }
          
          # Resource limits
          resources {
            limits = {
              cpu    = var.resources.limits.cpu
              memory = var.resources.limits.memory
            }
            requests = {
              cpu    = var.resources.requests.cpu
              memory = var.resources.requests.memory
            }
          }
          
          # Health checks
          liveness_probe {
            http_get {
              path = "/health/live"
              port = "http"
            }
            initial_delay_seconds = 30
            period_seconds       = 10
            timeout_seconds      = 5
            failure_threshold    = 3
            success_threshold    = 1
          }
          
          readiness_probe {
            http_get {
              path = "/health/ready"
              port = "http"
            }
            initial_delay_seconds = 10
            period_seconds       = 5
            timeout_seconds      = 3
            failure_threshold    = 3
            success_threshold    = 1
          }
          
          # Volume mounts
          volume_mount {
            name       = "data"
            mount_path = "/app/data"
          }
        }
        
        # Volumes
        volume {
          name = "data"
          empty_dir {
            size_limit = "1Gi"
          }
        }
      }
    }
  }
  
  # Wait for deployment to be ready
  wait_for_rollout = true
  
  # Dependencies
  depends_on = [
    kubernetes_config_map.lims_config,
    kubernetes_secret.lims_secret
  ]
}

# service.tf - Service to expose deployment
# Like reception desk directing samples
resource "kubernetes_service" "lims_backend" {
  metadata {
    name      = "${var.app_name}-backend"
    namespace = kubernetes_namespace.lims.metadata[0].name
    labels    = local.all_labels
    
    annotations = {
      "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"  # For AWS
    }
  }
  
  spec {
    type = "NodePort"  # ClusterIP, NodePort, LoadBalancer
    
    # Service selector (which pods to route to)
    selector = {
      app       = var.app_name
      component = "backend"
    }
    
    # Port configuration
    port {
      name        = "http"
      port        = 3001       # Service port
      target_port = "http"     # Container port name or number
      node_port   = 30001      # External port (NodePort only)
      protocol    = "TCP"
    }
    
    # Session affinity (sticky sessions)
    session_affinity = "None"  # Or "ClientIP"
    
    # Only route to ready pods
    publish_not_ready_addresses = false
  }
}

# hpa.tf - Horizontal Pod Autoscaler
# Like automatically adding lab capacity during peak
resource "kubernetes_horizontal_pod_autoscaler_v2" "lims_hpa" {
  metadata {
    name      = "${var.app_name}-hpa"
    namespace = kubernetes_namespace.lims.metadata[0].name
    labels    = local.all_labels
  }
  
  spec {
    # Target deployment
    scale_target_ref {
      api_version = "apps/v1"
      kind       = "Deployment"
      name       = kubernetes_deployment.lims_backend.metadata[0].name
    }
    
    # Scaling limits
    min_replicas = 2
    max_replicas = 10
    
    # CPU metric
    metric {
      type = "Resource"
      
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70  # Scale at 70% CPU
        }
      }
    }
    
    # Memory metric
    metric {
      type = "Resource"
      
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80  # Scale at 80% memory
        }
      }
    }
    
    # Custom metric example
    # metric {
    #   type = "Pods"
    #   
    #   pods {
    #     metric {
    #       name = "pending_samples"  # Custom metric
    #     }
    #     target {
    #       type         = "AverageValue"
    #       average_value = "30"  # Scale if > 30 pending samples/pod
    #     }
    #   }
    # }
    
    # Scaling behavior (v2 feature)
    behavior {
      scale_up {
        stabilization_window_seconds = 60  # Wait before scaling up again
        select_policy                = "Max"  # Max, Min, Disabled
        
        policy {
          type          = "Percent"
          value         = 100  # Double pods
          period_seconds = 60
        }
        
        policy {
          type          = "Pods"
          value         = 4  # Add 4 pods max
          period_seconds = 60
        }
      }
      
      scale_down {
        stabilization_window_seconds = 300  # Wait 5 min before scaling down
        select_policy                = "Min"
        
        policy {
          type          = "Percent"
          value         = 50  # Remove 50% of pods
          period_seconds = 60
        }
      }
    }
  }
}

# serviceaccount.tf - Service account for pod permissions
resource "kubernetes_service_account" "lims_sa" {
  metadata {
    name      = "${var.app_name}-sa"
    namespace = kubernetes_namespace.lims.metadata[0].name
    labels    = local.all_labels
  }
  
  # Auto-mount service account token
  automount_service_account_token = true
}

# rbac.tf - Role-based access control
# Like lab access permissions
resource "kubernetes_role" "lims_role" {
  metadata {
    name      = "${var.app_name}-role"
    namespace = kubernetes_namespace.lims.metadata[0].name
    labels    = local.all_labels
  }
  
  # Permissions
  rule {
    api_groups = [""]
    resources  = ["pods", "services"]
    verbs      = ["get", "list", "watch"]
  }
  
  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["get", "list"]
  }
}

# Bind role to service account
resource "kubernetes_role_binding" "lims_binding" {
  metadata {
    name      = "${var.app_name}-binding"
    namespace = kubernetes_namespace.lims.metadata[0].name
    labels    = local.all_labels
  }
  
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.lims_role.metadata[0].name
  }
  
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.lims_sa.metadata[0].name
    namespace = kubernetes_namespace.lims.metadata[0].name
  }
}

# monitoring.tf - Deploy monitoring stack with Helm
resource "helm_release" "prometheus" {
  name             = "prometheus"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = "51.3.0"  # Specify version for consistency
  namespace        = "monitoring"
  create_namespace = true
  
  # Configuration values
  set {
    name  = "grafana.adminPassword"
    value = "admin123"  # Should use random_password in production
  }
  
  set {
    name  = "prometheus.prometheusSpec.retention"
    value = "30d"
  }
  
  set {
    name  = "prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues"
    value = "false"  # Monitor all ServiceMonitors
  }
  
  # Use values file
  # values = [
  #   file("${path.module}/prometheus-values.yaml")
  # ]
  
  # Wait for deployment
  wait = true
  timeout = 600  # 10 minutes
  
  # Dependencies
  depends_on = [
    kubernetes_namespace.lims
  ]
}

# outputs.tf - Output values
# Information to display after apply
output "namespace" {
  description = "Kubernetes namespace created"
  value       = kubernetes_namespace.lims.metadata[0].name
}

output "deployment_name" {
  description = "Name of the deployment"
  value       = kubernetes_deployment.lims_backend.metadata[0].name
}

output "service_url" {
  description = "URL to access the service"
  value       = "http://localhost:${kubernetes_service.lims_backend.spec[0].port[0].node_port}"
}

output "database_host" {
  description = "Database host"
  value       = var.database_config.host
}

output "jwt_secret_name" {
  description = "Name of the secret containing JWT token"
  value       = kubernetes_secret.lims_secret.metadata[0].name
}

output "monitoring_urls" {
  description = "Monitoring stack URLs"
  value = {
    prometheus = "http://localhost:9090"
    grafana    = "http://localhost:3000"
    alertmanager = "http://localhost:9093"
  }
}

# Show connection instructions
output "connection_instructions" {
  description = "How to connect to the application"
  value = <<-EOT
    Application deployed successfully!
    
    To access the application:
    1. Application: ${self.service_url}
    2. Prometheus: kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
    3. Grafana: kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
    
    Grafana login: admin / admin123
  EOT
}
```

#### **PART 3: Using Terraform Commands**

```bash
# Terraform Workflow Explained

# 1. Initialize Terraform (download providers)
terraform init
# What happens:
# - Downloads provider plugins
# - Initializes backend
# - Creates .terraform directory
# - Generates .terraform.lock.hcl (version lock file)

# 2. Format code (enforce consistent style)
terraform fmt -recursive
# What it does:
# - Formats .tf files
# - Makes code consistent
# - Use before committing

# 3. Validate configuration
terraform validate
# Checks:
# - Syntax errors
# - Attribute names
# - Value types

# 4. Plan changes (dry run)
terraform plan
# Shows:
# - Resources to create (green +)
# - Resources to modify (yellow ~)
# - Resources to destroy (red -)

# Save plan to file
terraform plan -out=tfplan
# Why: Ensures apply does exactly what was planned

# 5. Apply changes
terraform apply tfplan
# Or interactive:
terraform apply
# Type 'yes' to confirm

# 6. View current state
terraform show
# Shows all resources and attributes

# View specific resource
terraform state show kubernetes_deployment.lims_backend

# 7. List resources
terraform state list
# Shows all managed resources

# 8. Import existing resources
# If resource exists, import to Terraform management
terraform import kubernetes_deployment.lims_backend production/lims-backend

# 9. Destroy resources (careful!)
terraform destroy
# Or target specific resource:
terraform destroy -target=kubernetes_deployment.lims_backend

# 10. Workspace management (multiple environments)
terraform workspace new staging
terraform workspace new production
terraform workspace list
terraform workspace select production

# 11. Output values
terraform output
terraform output -json  # JSON format
terraform output service_url  # Specific output
```

### **Afternoon (4 hrs): Professional Git Workflow & Strategies**

#### **PART 1: Git Branching Strategy - Git Flow**

```bash
# Understanding Git Flow
# A branching model for managing releases

# Main branches:
# - main (or master): Production code
# - develop: Integration branch for features

# Supporting branches:
# - feature/*: New features
# - release/*: Prepare releases
# - hotfix/*: Emergency production fixes

# Initialize Git Flow (optional tool)
# Install git-flow first:
# apt-get install git-flow
git flow init

# Or manually create branches:
git branch develop
git push -u origin develop
```

#### **PART 2: Feature Development Workflow**

```bash
# Complete Feature Development Process

# 1. Start new feature
git checkout develop
git pull origin develop  # Get latest changes
git checkout -b feature/add-prometheus-monitoring
# Branch naming: feature/ticket-number-description
# Example: feature/LIMS-123-add-authentication

# 2. Make changes
vim kubernetes/monitoring.yaml
vim terraform/monitoring.tf

# 3. Stage changes incrementally
git add kubernetes/monitoring.yaml
git status  # Verify what's staged

# 4. Commit with meaningful message
git commit -m "feat(monitoring): Add Prometheus and Grafana stack

- Added ServiceMonitor for LIMS backend
- Configured Grafana dashboards for forensic workflow
- Set up alerting rules for critical metrics
- Integrated with existing Terraform configuration

Implements: #123
Related to: ISO-17025 compliance requirements"

# Commit message structure:
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# 5. Push feature branch
git push -u origin feature/add-prometheus-monitoring
# -u sets upstream, so next time just: git push

# 6. Create Pull Request (GitHub)
# Use GitHub CLI:
gh pr create \
  --title "feat: Add Prometheus monitoring stack" \
  --body "## Description
  Adds comprehensive monitoring with Prometheus and Grafana
  
  ## Changes
  - Prometheus ServiceMonitor for metrics collection
  - Grafana dashboards for forensic workflow
  - Alert rules for SLA compliance
  
  ## Testing
  - [ ] Metrics endpoint accessible
  - [ ] Grafana dashboards loading
  - [ ] Alerts triggering correctly
  
  ## Screenshots
  [Add dashboard screenshots]
  
  Closes #123" \
  --base develop

# 7. Code review process
# Reviewers check:
# - Code quality
# - Security concerns
# - Performance impact
# - Test coverage

# 8. Address review feedback
git checkout feature/add-prometheus-monitoring
# Make requested changes
git add .
git commit -m "fix: Address PR review feedback

- Reduced memory limits for Prometheus
- Added missing labels
- Fixed typo in alert rules"
git push

# 9. Merge feature (after approval)
git checkout develop
git merge --no-ff feature/add-prometheus-monitoring
# --no-ff creates merge commit (preserves history)
git push origin develop

# 10. Clean up
git branch -d feature/add-prometheus-monitoring  # Delete local
git push origin --delete feature/add-prometheus-monitoring  # Delete remote
```

#### **PART 3: Release Process**

```bash
# Creating a Release

# 1. Start release from develop
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# 2. Update version numbers
# Update in:
# - package.json
# - Chart.yaml
# - terraform/variables.tf

# 3. Update changelog
cat >> CHANGELOG.md << EOF
## [1.2.0] - $(date +%Y-%m-%d)
### Added
- Prometheus monitoring stack
- Grafana dashboards
- Alert rules

### Changed
- Increased replica count to 3
- Updated health check intervals

### Fixed
- Memory leak in sample processing
- Database connection pooling
EOF

# 4. Commit version changes
git add .
git commit -m "chore: Prepare release 1.2.0"
git push -u origin release/1.2.0

# 5. Test release branch thoroughly
# Run all tests, deploy to staging

# 6. Merge to main (production)
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0

Features:
- Monitoring stack
- Performance improvements

Bug fixes:
- Memory leak resolution"
git push origin main
git push origin v1.2.0  # Push tag

# 7. Merge back to develop
git checkout develop
git merge --no-ff release/1.2.0
git push origin develop

# 8. Delete release branch
git branch -d release/1.2.0
git push origin --delete release/1.2.0
```

#### **PART 4: Hotfix Process**

```bash
# Emergency Production Fix

# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-patch

# 2. Fix the issue
vim src/auth/jwt.js
# Fix security vulnerability

# 3. Commit fix
git add src/auth/jwt.js
git commit -m "fix(security): Patch JWT token vulnerability

- Fixed token expiration bypass
- Added additional validation
- Increased key length

Security: CVE-2024-12345"

# 4. Test fix thoroughly
npm test
npm run test:security

# 5. Merge to main
git checkout main
git merge --no-ff hotfix/critical-security-patch
git tag -a v1.2.1 -m "Hotfix: Security patch"
git push origin main
git push origin v1.2.1

# 6. Merge to develop
git checkout develop
git merge --no-ff hotfix/critical-security-patch
git push origin develop

# 7. Clean up
git branch -d hotfix/critical-security-patch
```

#### **PART 5: Git Configuration & Best Practices**

```bash
# Git Configuration

# Set user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default editor
git config --global core.editor vim

# Enable color output
git config --global color.ui auto

# Set default branch name
git config --global init.defaultBranch main

# Configure merge strategy
git config --global pull.rebase false  # Use merge (not rebase)

# Set up aliases for common commands
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.lg "log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"

# View configuration
git config --list
```

#### **PART 6: .gitignore for DevOps Project**

```gitignore
# .gitignore - Files to exclude from version control

# === Dependencies ===
node_modules/
vendor/
.venv/
__pycache__/
*.pyc

# === Environment Files ===
# Never commit secrets!
.env
.env.local
.env.*.local
*.env
!.env.example  # Exception: example file

# === Terraform ===
# State files contain sensitive data
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
terraform.tfvars  # May contain secrets
!terraform.tfvars.example
*.tfplan
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# === Kubernetes ===
kubeconfig
*.key
*.crt
*.pem
*-secret.yaml
!*-secret.yaml.example

# === Docker ===
.dockerignore
docker-compose.override.yml

# === IDE ===
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
Thumbs.db

# === Logs ===
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# === Testing ===
coverage/
.nyc_output/
junit.xml
test-results/

# === Build outputs ===
dist/
build/
out/
target/
*.egg-info/

# === Temporary files ===
tmp/
temp/
.tmp/
.cache/

# === Backup files ===
*.bak
*.backup
*.old

# === OS files ===
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Icon?
```

#### **PART 7: Commit Message Standards**

```bash
# Conventional Commits Specification
# Format: <type>(<scope>): <subject>

# Types:
# - feat: New feature
# - fix: Bug fix
# - docs: Documentation only
# - style: Code style (formatting, semicolons, etc)
# - refactor: Code restructuring without changing behavior
# - perf: Performance improvements
# - test: Adding or modifying tests
# - build: Build system or dependencies
# - ci: CI/CD configuration
# - chore: Maintenance tasks
# - revert: Reverting previous commit

# Examples of good commit messages:

git commit -m "feat(auth): Add JWT token refresh endpoint

Implements automatic token refresh to improve user experience.
Tokens are refreshed 5 minutes before expiration.

Closes #234"

git commit -m "fix(database): Resolve connection pool exhaustion

- Increased pool size from 10 to 20
- Added connection timeout of 30 seconds
- Implemented connection retry logic

Fixes #456"

git commit -m "docs(api): Update API documentation for v2 endpoints

- Added new endpoints documentation
- Updated authentication examples
- Fixed typos in response schemas"

git commit -m "refactor(forensics): Simplify sample workflow logic

Extracted workflow stages into separate module for better
maintainability. No functional changes.

Related to #789"

git commit -m "perf(query): Optimize database queries for reports

- Added indexes on frequently queried columns
- Implemented query result caching
- Reduced N+1 queries in sample listing

Improves report generation by 60%"

# Bad commit messages (avoid these):
# "fixed stuff"
# "wip"
# "update"
# "asdfasdf"
# "please work"

# Using commitizen for interactive commits (optional)
npm install -g commitizen
npm install -g cz-conventional-changelog
echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc
# Then use: git cz instead of git commit
```

#### **PART 8: Git Workflows for Teams**

```bash
# Pull Request Workflow

# 1. Fork and clone (for external contributors)
# Or just clone (for team members)
git clone https://github.com/team/jagdna-lims.git

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make atomic commits
# Each commit should be one logical change
git add -p  # Interactive staging
git commit -m "feat: Add specific feature"

# 4. Keep branch up to date
git fetch origin
git rebase origin/develop  # Or merge

# 5. Push to remote
git push origin feature/my-feature

# 6. Create PR with template
# .github/pull_request_template.md:
## Description
Brief description of changes

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No sensitive data exposed
```

---

## 🎯 **READY TO IMPLEMENT!**

This detailed plan now includes:
- **In-depth explanations** for every command
- **Why we're doing each step**
- **What each configuration means**
- **Troubleshooting guides**
- **Forensics parallels** throughout

Each command is explained with:
1. What it does
2. Why we use it
3. What to expect
4. How to verify it worked
5. Common issues and fixes

Perfect for learning while implementing! Continue with Days 4-5 when ready.