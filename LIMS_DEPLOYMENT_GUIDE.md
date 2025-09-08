# 📘 LIMS K3s Deployment - Complete Step-by-Step Guide (Single Node)

## Overview
Deploy the LIMS system with production-grade infrastructure on a single K3s node (Server 1) as part of your unified portfolio plan. This focuses on resilience and your unique forensic differentiator rather than fake complexity.

---

## 📋 Pre-requisites
- Ubuntu Server (16GB RAM minimum) 
- Root or sudo access
- Internet connection
- Basic terminal knowledge

---

## 🏗️ Architecture Overview

```
    🖥️ SERVER 1 (16GB RAM) - Single K3s Node
    ┌────────────────────────────────────┐
    │                                    │
    │  namespace: production             │
    │  ├── LIMS Backend (2 replicas)     │
    │  ├── PostgreSQL (persistent)       │
    │  └── ConfigMaps & Secrets          │
    │                                    │
    │  namespace: forensics              │
    │  ├── Forensic Collector            │
    │  └── Evidence Database             │
    │                                    │
    │  namespace: default                │
    │  └── Jenkins CI/CD                 │
    └────────────────────────────────────┘
```

---

## 🚀 PART 1: SYSTEM PREPARATION

### Step 1: Update Your System
```bash
# Update package lists to get latest versions
sudo apt update

# Upgrade all installed packages to latest versions
sudo apt upgrade -y

# Install essential tools we'll need
sudo apt install -y curl wget git vim htop
```

**What this does:**
- `apt update` - Downloads package information from all configured sources
- `apt upgrade -y` - Upgrades all packages (-y means "yes" to all prompts)
- Essential tools for system management and monitoring

### Step 2: Check System Resources
```bash
# Check available memory (should show ~16GB)
free -h

# Check disk space (need at least 50GB free)
df -h

# Check CPU information
lscpu
```

**What to look for:**
- Memory: At least 14GB available
- Disk: At least 50GB free on /
- CPU: 4+ cores recommended

---

## 🐳 PART 2: INSTALL DOCKER

### Step 3: Install Docker (Quick Method)
```bash
# Quick Docker installation
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group (run without sudo)
sudo usermod -aG docker $USER

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# IMPORTANT: Log out and back in for group changes
exit
# Then SSH back in
```

### Step 4: Verify Docker
```bash
# Test Docker is working
docker run hello-world

# Check Docker version
docker --version
```

---

## ☸️ PART 3: INSTALL K3S (SINGLE NODE)

### Step 5: Install K3s
```bash
# Install K3s optimized for single node
curl -sfL https://get.k3s.io | sh -s - \
    --write-kubeconfig-mode 644 \
    --disable traefik \
    --node-name server1-lims
```

**What these flags mean:**
- `--write-kubeconfig-mode 644` - Makes config readable by your user
- `--disable traefik` - We don't need the default ingress
- `--node-name server1-lims` - Names our single node

### Step 6: Configure kubectl
```bash
# Create .kube directory
mkdir -p ~/.kube

# Copy K3s config to kubectl location
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config

# Add to bashrc for persistence
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
source ~/.bashrc

# Verify single node cluster
kubectl get nodes
```

**Expected output:**
```
NAME           STATUS   ROLES                  AGE   VERSION
server1-lims   Ready    control-plane,master   1m    v1.28.x+k3s1
```

---

## 🏗️ PART 4: BUILD LIMS DOCKER IMAGE

### Step 7: Navigate to LIMS Project
```bash
# Go to your LIMS project directory
cd ~/JAG-LABSCIENTIFIC-DNA

# Verify Dockerfile exists
ls -la Dockerfile
```

### Step 8: Build the Docker Image
```bash
# Build LIMS image with production labels
docker build \
    --tag lims-backend:latest \
    --label "tier=production" \
    --label "project=lims-dna-scientific" \
    .

# Verify image was created
docker images | grep lims
```

### Step 9: Import Image to K3s
```bash
# Save Docker image
docker save lims-backend:latest -o lims-backend.tar

# Import to K3s containerd
sudo k3s ctr images import lims-backend.tar

# Verify import
sudo k3s ctr images list | grep lims

# Clean up tar file
rm lims-backend.tar
```

---

## 📦 PART 5: DEPLOY TO K3S

### Step 10: Create Production Namespace
```bash
# Create production namespace only (no fake environments)
kubectl create namespace production

# Create forensics namespace for your differentiator
kubectl create namespace forensics

# Set production as default to avoid mistakes
kubectl config set-context --current --namespace=production
```

**Why only these namespaces:**
- `production` - Your main LIMS deployment
- `forensics` - Your unique differentiator (forensic collector)
- No fake dev/staging on single node (wastes resources)

### Step 11: Deploy PostgreSQL Database
```bash
# Deploy PostgreSQL with persistent storage
kubectl apply -f k3s/postgresql.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgresql --timeout=300s

# Verify persistent volume
kubectl get pvc
```

### Step 12: Configure LIMS Application
```bash
# Apply LIMS configuration
kubectl apply -f k3s/lims-configmap.yaml

# Verify configuration
kubectl get configmap lims-config
```

### Step 13: Deploy LIMS Application
```bash
# Deploy LIMS with 2 replicas for high availability
kubectl apply -f k3s/lims-deployment.yaml

# Watch rollout
kubectl rollout status deployment lims-backend

# Verify 2 replicas running
kubectl get pods -l app=lims-backend
```

**What happens if a pod crashes:**
- Kubernetes automatically restarts it
- Second replica keeps serving (zero downtime)
- Self-healing without intervention

### Step 14: Create Services
```bash
# Create services for access
kubectl apply -f k3s/lims-service.yaml

# Get service details
kubectl get services
```

### Step 15: Deploy Jenkins CI/CD
```bash
# Deploy Jenkins to default namespace
kubectl apply -f k3s/jenkins.yaml

# Wait for Jenkins (takes 2-3 minutes)
kubectl wait --for=condition=ready pod -l app=jenkins -n default --timeout=300s

# Get Jenkins NodePort for access
kubectl get service jenkins -n default
```

---

## 🔍 PART 6: VERIFY DEPLOYMENT

### Step 16: Test LIMS Health
```bash
# Port forward to test
kubectl port-forward service/lims-backend 3001:3001 &

# Test health endpoint
curl http://localhost:3001/health

# Stop port forward
kill %1
```

### Step 17: Test Prometheus Metrics
```bash
# Port forward metrics
kubectl port-forward service/lims-backend 9101:9101 &

# Check metrics
curl http://localhost:9101/metrics | grep lims

# Stop port forward
kill %1
```

### Step 18: Verify High Availability
```bash
# Watch pods
kubectl get pods -w &

# In another terminal, kill a pod
kubectl delete pod $(kubectl get pod -l app=lims-backend -o jsonpath='{.items[0].metadata.name}')

# Watch it auto-recover in first terminal
# Press Ctrl+C to stop watching
```

---

## 🎯 PART 7: DEPLOY FORENSIC COLLECTOR (Your Differentiator!)

### Step 19: Deploy Forensic Collector
```bash
# This is what makes you unique!
kubectl apply -f k3s/forensic-collector.yaml -n forensics

# Verify deployment
kubectl get pods -n forensics

# Port forward to access
kubectl port-forward -n forensics service/forensic-api 8888:8888 &
```

### Step 20: Test Forensic Evidence Collection
```bash
# Trigger test incident
curl http://localhost:8888/trigger/lims

# View evidence chain
open http://localhost:8888

# This is your interview winner!
```

---

## 🛠️ TROUBLESHOOTING

### If pods won't start:
```bash
# Check pod details
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name>
```

### Resource issues:
```bash
# Check node resources
kubectl top node

# Check pod usage
kubectl top pods

# Reduce replicas if needed
kubectl scale deployment lims-backend --replicas=1
```

---

## ✅ SUCCESS CHECKLIST

After completing all steps:
- [ ] Single K3s node running (server1-lims)
- [ ] Docker installed and working
- [ ] LIMS image built and imported to K3s
- [ ] PostgreSQL running with persistent storage
- [ ] LIMS running with 2 replicas (high availability)
- [ ] Metrics available on port 9101
- [ ] Jenkins deployed for CI/CD
- [ ] Forensic collector deployed (YOUR DIFFERENTIATOR!)
- [ ] Self-healing demonstrated

---

## 🔗 ACCESSING YOUR LIMS

```bash
# LIMS Application
kubectl port-forward service/lims-backend 3001:3001

# Prometheus Metrics
kubectl port-forward service/lims-backend 9101:9101

# Forensic Evidence Viewer (Your unique feature!)
kubectl port-forward -n forensics service/forensic-api 8888:8888

# Jenkins CI/CD
kubectl port-forward -n default service/jenkins 8080:8080
```

---

## 📝 INTERVIEW DEMONSTRATION

### The 5-Minute Demo:

1. **Show Single Node Efficiency** (30 seconds)
```bash
kubectl get nodes
kubectl top node
```
"Single node optimized for 16GB RAM, no wasted resources on fake environments"

2. **Demonstrate Self-Healing** (1 minute)
```bash
# Kill a pod
kubectl delete pod lims-backend-xxx
# Watch it auto-recover
kubectl get pods -w
```
"Zero downtime with automatic recovery"

3. **Show Your Forensic Collector** (2 minutes)
```bash
# Open evidence viewer
open http://localhost:8888
```
"This is my unique differentiator - forensic evidence collection for all incidents"

4. **Show Metrics** (30 seconds)
```bash
curl http://localhost:9101/metrics | grep lims_samples
```
"Production metrics for monitoring"

5. **Explain Architecture** (1 minute)
- Single node, efficient resource use
- Production namespace with high availability
- Forensic namespace for compliance
- Focus on reliability over fake complexity

---

## 🎯 Why This Approach Wins

**What you're NOT doing:**
- ❌ Fake multi-environment on single node
- ❌ Wasting RAM on duplicate deployments
- ❌ Pretending to have staging/dev

**What you ARE doing:**
- ✅ Production-grade single environment
- ✅ High availability with multiple replicas
- ✅ Self-healing and resilience
- ✅ Unique forensic evidence collection
- ✅ Efficient resource utilization

---

## 💡 Key Talking Points

"I deployed a production-grade LIMS on a single K3s node with:
- Automatic failover and self-healing
- Persistent data storage
- Forensic evidence collection for compliance
- Efficient resource utilization
- Focus on reliability over unnecessary complexity"

This shows **production thinking** and **practical engineering**, not academic exercises.

---

## 🎉 CONGRATULATIONS!

You have a production-ready LIMS with your unique forensic differentiator!

Remember: Your forensic collector is worth more than 10 fake environments. Focus on what makes you unique, not what everyone else does.
---

## 🔧 OPTIONAL: Local Docker Registry (Recommended)

### Why Add a Local Registry?
- **No external dependencies** - Everything stays local
- **Faster deployments** - No internet pulls
- **Works offline** - Critical for demos
- **Professional approach** - Shows production thinking

### Quick Setup:
```bash
# Run the setup script
chmod +x scripts/setup-local-registry.sh
./scripts/setup-local-registry.sh

# Or manually:
docker run -d --restart=always -p 5000:5000 --name local-registry registry:2
```

### Using the Registry:
```bash
# Tag your image
docker tag lims-backend:latest localhost:5000/lims-backend:latest

# Push to local registry
docker push localhost:5000/lims-backend:latest

# Update K3s deployment to use local registry
kubectl set image deployment/lims-backend lims-backend=localhost:5000/lims-backend:latest -n production
```

### Benefits for Interviews:
- Shows you understand **air-gapped deployments**
- Demonstrates **production thinking**
- Faster demo (no internet delays)
- Professional infrastructure approach
