# 📚 Day 1 Learning Journey - Kubernetes & Docker Setup
## Your Complete DevOps Foundation Experience

---

## 🎯 What You Accomplished Today

You successfully built a complete Kubernetes cluster with Docker containerization from scratch! Here's your journey:

### The Big Picture Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Your Server (Server2)                    │
│                    IP: 192.168.50.100                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            Kubernetes Cluster (v1.31.12)             │  │
│  │                                                      │  │
│  │  ┌────────────────┐  ┌────────────────────────┐   │  │
│  │  │  Control Plane  │  │     Worker Node         │   │  │
│  │  │   (Master)      │  │   (Same machine)        │   │  │
│  │  │                 │  │                          │   │  │
│  │  │ • API Server    │  │  ┌──────────────────┐   │   │  │
│  │  │ • Scheduler     │  │  │   Namespaces      │   │   │  │
│  │  │ • Controller    │  │  ├──────────────────┤   │   │  │
│  │  │ • etcd          │  │  │ • default        │   │   │  │
│  │  └────────────────┘  │  │ • development    │   │   │  │
│  │                       │  │ • staging        │   │   │  │
│  │                       │  │ • production     │   │   │  │
│  │                       │  └──────────────────┘   │   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         Docker Registry (localhost:5000)             │  │
│  │         Container ID: 6e6750a3bae4                   │  │
│  │         Image: jagdna-lims:v1.0.1                    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📖 Part 1: Kubernetes Setup Journey

### 1.1 System Preparation

#### **What You Did:**
```bash
# Disabled swap memory
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

**Why:** Kubernetes requires swap to be disabled for performance and predictable memory management. Think of it like ensuring your forensics lab has dedicated equipment that won't share resources.

#### **Installed Container Runtime (containerd)**
```bash
sudo apt-get install -y containerd
sudo systemctl enable containerd
sudo systemctl start containerd
```

**What is containerd?**
- The actual engine that runs containers in Kubernetes
- Like the PCR machine that actually processes DNA samples
- Kubernetes tells it what to run, containerd does the running

#### **Loaded Kernel Modules**
```bash
sudo modprobe overlay
sudo modprobe br_netfilter
```

**What are these?**
- `overlay`: Filesystem driver for container layers (like transparent sheets stacked)
- `br_netfilter`: Network bridge for container communication
- `modprobe`: Command that loads drivers into the Linux kernel

### 1.2 Kubernetes Installation

#### **The Repository Issue You Hit:**
```bash
# OLD method (didn't work):
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/kubernetes-archive-keyring.gpg

# NEW method (worked):
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
```

**What went wrong:** Google changed their repository structure in 2024. The documentation you had was outdated.

**The Fix:** Used the new repository URL format that includes the version in the path.

#### **What You Installed:**
```bash
sudo apt-get install -y kubelet kubeadm kubectl
```

- **kubelet**: The agent on each node (like a lab technician)
- **kubeadm**: Tool to bootstrap the cluster (like lab setup wizard)
- **kubectl**: CLI to control the cluster (like the control panel)
- **Note:** You installed K8s (full Kubernetes), NOT K3s (lightweight version)

### 1.3 Cluster Initialization

```bash
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.50.100
```

**What this did:**
1. Created certificates for secure communication
2. Started all control plane components
3. Generated the kubeconfig file
4. Set up networking for pods (10.244.0.0/16 range)
5. Made API server accessible on your IP (192.168.50.100)

**Important output you saved:**
```bash
kubeadm join 192.168.50.100:6443 --token uwelo4.vqolvk4986sus3w4 \
    --discovery-token-ca-cert-hash sha256:c910439845d6e4933fb812c2a76029696c6cd095fe0885ab2908d8aa56d512b1
```
This command would let you add more nodes to your cluster later.

### 1.4 kubectl Configuration

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

**What this did:** Gave your user account the credentials to talk to the Kubernetes API server.

### 1.5 Network Plugin (Flannel)

```bash
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```

**Why needed:** Kubernetes needs a network plugin (CNI) to allow pods to communicate. Flannel creates a virtual network overlay.

### 1.6 Single Node Configuration

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

**What this did:** Removed the "taint" that prevents regular workloads from running on the control plane node. Since you only have one node, this was necessary.

---

## 📖 Part 2: Multi-Environment Setup

### What You Created:
```
Single Physical Node (Server2)
├── Namespace: default
│   └── lims-backend (2 replicas)
├── Namespace: development
│   └── lims-app (1 replica)
├── Namespace: staging
│   └── lims-app (2 replicas)
└── Namespace: production
    └── lims-app (3 replicas)
```

### Commands Explained:

```bash
# Created namespaces (like separate lab rooms)
kubectl create namespace development
kubectl create namespace staging
kubectl create namespace production

# Added labels for identification
kubectl label namespace development environment=dev
```

### The Resource Quota Problem

**What went wrong:**
You created resource quotas that required pods to specify CPU/memory limits:
```yaml
# This quota required limits but your deployments didn't have them
hard:
  requests.cpu: "2"
  requests.memory: 2Gi
  limits.cpu: "4"
  limits.memory: 4Gi
```

**The error you saw:**
```
Error creating: pods "lims-app-849b97b45c-4pv7t" is forbidden: 
failed quota: dev-quota: must specify limits.cpu for: jagdna-lims
```

**How you fixed it:**
```bash
kubectl delete resourcequota dev-quota -n development
kubectl delete resourcequota prod-quota -n production
```

---

## 📖 Part 3: Docker Journey

### 3.1 Installation Confusion

**Issue:** Docker wasn't installed when you tried to build
```bash
jaime@Server2:~/jagdna-lims$ docker build -t jagdna-lims:v1.0.0 .
Command 'docker' not found, but can be installed with...
```

**Solution:**
```bash
sudo apt install -y docker.io
sudo usermod -aG docker jaime  # Added yourself to docker group
newgrp docker                   # Activated group without logout
```

### 3.2 The File Location Confusion

**Issue:** Your files were scattered
```
Initially:
/home/jaime/
├── server.js
├── package.json
├── Dockerfile
└── jagdna-lims/  (empty directory)
```

**Solution:** Organized everything
```bash
cd ~
mv Dockerfile server.js package.json package-lock.json ~/jagdna-lims/
cd ~/jagdna-lims
```

### 3.3 The Critical server.js Bug

**THE BIG PROBLEM:**
Your server.js file contained shell commands instead of JavaScript!

```javascript
// WRONG (what you had):
vi server.js
# Add content:
const http = require('http');
...

// CORRECT (what you needed):
const http = require('http');
const port = 3001;
...
```

**How this happened:** When copying from instructions, you included the command instructions as part of the file content.

**The error it caused:**
```
/app/server.js:1
vi server.js
   ^^^^^^
SyntaxError: Unexpected identifier
```

**How you debugged it:**
1. Checked pod logs: `kubectl logs lims-backend-589cb475f6-2hhzs`
2. Saw the syntax error
3. Checked the file: `cat server.js`
4. Fixed with vi editor
5. Rebuilt image with new version tag
6. Pushed to registry
7. Updated deployment

### 3.4 Docker Registry Setup

```bash
docker run -d \
  -p 5000:5000 \
  --restart=always \
  --name registry \
  -v /opt/registry:/var/lib/registry \
  registry:2
```

**What each flag means:**
- `-d`: Run in background (daemon mode)
- `-p 5000:5000`: Map port 5000 on host to port 5000 in container
- `--restart=always`: Restart if it crashes
- `--name registry`: Give it a friendly name
- `-v /opt/registry:/var/lib/registry`: Store registry data on host (persists if container dies)

### 3.5 The Build-Tag-Push Cycle

```bash
# 1. Build image from Dockerfile
docker build -t jagdna-lims:v1.0.0 .
#            └─ tag name    └─ version  └─ current directory

# 2. Tag for registry
docker tag jagdna-lims:v1.0.0 localhost:5000/jagdna-lims:v1.0.0
#          └─ source image     └─ registry URL/image:tag

# 3. Push to registry
docker push localhost:5000/jagdna-lims:v1.0.0
```

---

## 🔍 Debugging Journey

### The CrashLoopBackOff Saga

**Timeline of your debugging:**

1. **First attempt:** Pods kept crashing
   - Status: `CrashLoopBackOff`
   - Checked logs: `kubectl logs -l app=lims-backend`
   - Found: SyntaxError in server.js

2. **Second attempt:** Fixed file but changes didn't take effect
   - Issue: Docker was using cached layers
   - Solution: Used new version tag (v1.0.1)

3. **Third attempt:** Development and Production namespaces wouldn't start
   - Issue: Resource quotas blocking
   - Solution: Deleted quotas

### Key Debugging Commands You Learned:

```bash
# Check pod status
kubectl get pods
kubectl get pods --all-namespaces

# Check logs
kubectl logs <pod-name>
kubectl logs -l app=lims-backend  # By label

# Describe resources for events
kubectl describe deployment lims-app -n development
kubectl get events -n development

# Check resource quotas
kubectl describe resourcequota -n development

# Update image
kubectl set image deployment/lims-backend jagdna-lims=localhost:5000/jagdna-lims:v1.0.1

# Restart deployment
kubectl rollout restart deployment lims-backend
```

---

## 📊 Current Status

### What's Working:
✅ Kubernetes cluster v1.31.12 running
✅ Docker registry on port 5000
✅ All namespaces have running pods:
- Default: 2/2 lims-backend pods
- Development: 1/1 lims-app pod  
- Staging: 2/2 lims-app pods
- Production: 3/3 lims-app pods
✅ Service exposed on NodePort 31397

### What You Can Access:
```bash
curl http://localhost:31397         # Returns: JAGDNA LIMS Server Running
curl http://localhost:31397/health  # Returns: {"status":"healthy","timestamp":"..."}
```

---

## 🎓 Key Lessons Learned

1. **File Organization Matters**: Keep project files in dedicated directories
2. **Read Error Messages Carefully**: The "vi server.js" syntax error told us exactly what was wrong
3. **Version Tags Are Important**: Using v1.0.1 instead of v1.0.0 forced Docker to use the new code
4. **Resource Quotas Need Resource Specs**: If you set quotas, deployments must specify resources
5. **Kubernetes vs K3s**: You're using full K8s (with kubeadm), not the lightweight K3s
6. **Container Runtime**: containerd runs the containers, Kubernetes orchestrates them
7. **Debugging Flow**: Check pods → Check logs → Check events → Fix issue → Restart

---

## 🚀 Ready for Day 2

You now have:
- A working Kubernetes cluster
- Multi-environment setup (dev/staging/prod)
- Docker registry with working images
- Basic understanding of debugging Kubernetes issues

Next steps will be:
- Python automation scripts
- Helm charts for package management
- Terraform for Infrastructure as Code

---

## 📝 Command Cheat Sheet

```bash
# Kubernetes basics
alias k=kubectl                          # Shortcut
k get pods                              # List pods
k get pods --all-namespaces             # List all pods
k describe pod <name>                   # Detailed pod info
k logs <pod-name>                       # View logs
k exec -it <pod-name> -- sh            # Enter pod shell

# Docker basics  
docker build -t <name>:<tag> .          # Build image
docker images                            # List images
docker ps                               # List running containers
docker push <registry>/<image>:<tag>   # Push to registry

# Troubleshooting
k get events -n <namespace>             # See what happened
k describe deployment <name>            # Deployment details
k rollout restart deployment <name>     # Restart deployment
```

---

*Great job on Day 1! You overcame multiple challenges and built a solid foundation!* 🎉

---

## 📚 Day 2 Learning Journey - Python Automation & Helm Charts
## Building Automation Tools and Package Management

---

## 🎯 What You Accomplished on Day 2

You successfully created Python automation scripts and deployed applications using Helm charts!

### Python Scripts Created and Tested:
✅ **simple_deploy.py** - Manage Kubernetes deployments
✅ **health_check.py** - Monitor service health  
✅ **pod_logs.py** - View pod logs easily

### Helm Achievements:
✅ Installed Helm v3
✅ Created custom lims-chart
✅ Deployed Bitnami nginx and redis charts
✅ Packaged chart as lims-chart-1.0.0.tgz

---

## 📖 Part 1: Python Automation Journey

### The Initial File Structure Issues

**Problem 1:** Your first simple_deploy.py had major indentation errors:
```python
# WRONG - What you initially had:
def run_kubectl(command):
    # ... code ...
    def list_deployments(namespace="default"):  # Wrong indentation!
```

**Problem 2:** Mixed up terminal commands with Python code:
```python
# You had backticks at line 81 in health_check.py:
```
^
SyntaxError: invalid syntax
```

**Solution:** Used cat with heredoc to create clean files:
```bash
cat > ~/devops-scripts/simple_deploy.py << 'EOF'
#!/usr/bin/env python3
# ... proper Python code ...
EOF
```

### The pip Install Challenge

**Issue:** Modern Ubuntu restricts pip to prevent system breakage:
```
error: externally-managed-environment
× This environment is externally managed
```

**Your attempts:**
```bash
pip3 install requests  # Failed
apt pip3 install requests  # Wrong syntax
```

**Solution:**
```bash
sudo apt install python3-requests  # Worked!
```

### Scripts Successfully Created:

1. **simple_deploy.py** - Deployment management
   - Lists deployments across all namespaces
   - Scales deployments easily
   - Successfully scaled lims-backend from 2 to 3 replicas

2. **health_check.py** - Service monitoring
   - Single health checks
   - Continuous monitoring with uptime stats

3. **pod_logs.py** - Log viewing
   - Lists all pods
   - Retrieves logs from specific pods

---

## 📖 Part 2: Helm Charts Journey

### Initial Helm Setup

**What worked immediately:**
```bash
# Installed Helm successfully
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
./get_helm.sh

# Added repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### Creating Custom Chart

**Created chart structure:**
```bash
helm create lims-chart
```

**Customized Chart.yaml:**
```yaml
apiVersion: v2
name: lims-chart
description: JAGDNA LIMS Helm Chart
type: application
version: 1.0.0
appVersion: "v1.0.1"
```

### The values.yaml YAML Error

**Problem:** Line 3 mapping error
```
INSTALLATION FAILED: cannot load values.yaml: 
error converting YAML to JSON: yaml: line 3: mapping values are not allowed in this context
```

**Solution:** Recreated with proper formatting using cat heredoc

### Path Confusion

**Your mistake:**
```bash
# You were already IN the lims-chart directory
jaime@Server2:~/lims-chart$ helm install lims-test ./lims-chart
Error: INSTALLATION FAILED: path "./lims-chart" not found
```

**Solution:**
```bash
# Use . for current directory
helm install lims-test .
```

### Successful Deployments:

1. **lims-test** - Your custom chart deployed
2. **my-nginx** - Bitnami nginx chart (with warning about free tier limitations)
3. **my-redis** - Bitnami redis chart with master-replica setup
4. **test-package** - Installed from packaged lims-chart-1.0.0.tgz

---

## 🔍 Day 2 Debugging Timeline

1. **09:00** - Started creating Python scripts
2. **09:30** - Hit indentation errors in simple_deploy.py
3. **09:45** - Fixed using cat heredoc method
4. **10:00** - Successfully tested deployment scaling (2→3 replicas)
5. **10:15** - Encountered pip install restrictions
6. **10:20** - Solved with apt install python3-requests
7. **11:00** - Started Helm implementation
8. **11:53** - Hit "path not found" error
9. **11:56** - YAML syntax error in values.yaml
10. **12:01** - Successfully deployed nginx and redis charts
11. **12:02** - Packaged custom chart as .tgz file

---

## 📊 Current Status After Day 2

### Python Automation:
✅ Three working Python scripts in ~/devops-scripts/
✅ Successfully scaling deployments programmatically
✅ Can monitor service health
✅ Can view pod logs easily

### Helm Deployments Running (Actual Status):
```bash
NAME                                        READY   STATUS
lims-backend-558bbd55f-6d96k               1/1     Running  # Scaled to 3
lims-backend-558bbd55f-w9tgr               1/1     Running
lims-backend-558bbd55f-wxgdb               1/1     Running
my-nginx-6568555b89-wcl2d                  1/1     Running  # Bitnami nginx
my-redis-master-0                          0/1     Pending  # Redis master (needs PV)
my-redis-replicas-0                        0/1     Pending  # Redis replica (needs PV)
test-package-lims-chart-58cff458b7-k6hcl   1/1     Running  # From .tgz
test-package-lims-chart-58cff458b7-wh7nx   1/1     Running  # 2 replicas deployed
```

### Helm Releases (Actual from helm list):
```
NAME         NAMESPACE    REVISION    STATUS      CHART               APP VERSION
my-nginx     default      1           deployed    nginx-21.1.23       1.29.1
my-redis     default      1           deployed    redis-22.0.7        8.2.1
test-package default      1           deployed    lims-chart-1.0.0    v1.0.1
```

### Services Exposed:
```
NAME                      TYPE           PORT(S)
lims-backend              NodePort       3001:31397/TCP    # Original deployment
my-nginx                  LoadBalancer   80:30921/TCP      # Nginx (pending external IP)
test-package-lims-chart   NodePort       3001:30527/TCP    # From Helm chart
```

### Redis Issue:
The Redis pods are stuck in Pending because they need PersistentVolumes which aren't configured on your single-node cluster.

---

## 🎓 Key Lessons Learned Day 2

1. **Python Indentation is Critical**: One wrong indent breaks everything
2. **Use Heredocs for Multi-line Files**: `cat > file << 'EOF'` prevents syntax issues
3. **System Python is Protected**: Use apt install python3-* instead of pip
4. **Helm Paths Matter**: Use `.` when already in chart directory
5. **YAML is Sensitive**: Even invisible characters can break it
6. **Bitnami Has Limitations**: Free tier warning after August 28, 2025
7. **Package Charts for Distribution**: .tgz files are portable

---

## 💡 Commands That Saved the Day

```bash
# Fix Python files with heredoc
cat > script.py << 'EOF'
#!/usr/bin/env python3
# code here
EOF

# Install Python packages on Ubuntu 24
sudo apt install python3-requests

# Helm from current directory
helm install name .  # NOT ./name

# Package Helm chart
helm package .
```

---

## 🚀 Ready for Day 3

You now have:
- ✅ Working Kubernetes cluster (Day 1)
- ✅ Docker registry with images (Day 1)
- ✅ Python automation scripts (Day 2)
- ✅ Helm package management (Day 2)
- ✅ Multi-environment deployments
- ✅ Automated scaling capabilities

Next: Terraform Infrastructure as Code and Git workflows!

---

*Excellent progress on Day 2! You tackled Python and Helm successfully!* 🎉

---

## 📚 Day 2 Part 2: Helm Deep Dive - The Complete Saga
## Fighting Through NodePort Conflicts and Image Issues

---

## 🎯 What You Attempted (Part 5: Using Helm Commands)

Following DEVOPS_COMPLETE_PLAN_DETAILED.md Part 5, you tried to deploy to production namespace with Helm.

---

## 🔥 The Triple Problem Attack

### Problem 1: NodePort Already Allocated
```bash
jaime@Server2:~/jagdna-lims$ helm install jagdna-lims . \
  --namespace production \
  --create-namespace \
  --wait
Error: INSTALLATION FAILED: 1 error occurred:
    * Service "jagdna-lims" is invalid: spec.ports[0].nodePort: Invalid value: 30001: provided port is already allocated
```

**Discovery:** Port 30001 was already used by development namespace
```bash
kubectl get svc --all-namespaces | grep 30001
development   lims-app       NodePort    10.109.152.105   <none>        3001:30001/TCP
```

**Solution:** Changed nodePort in values.yaml to 30002

### Problem 2: "Cannot Re-use Name" Hell
```bash
Error: INSTALLATION FAILED: cannot re-use a name that is still in use
```

**What was happening:** 
- Failed releases were getting stuck
- Helm was keeping track of failed attempts
- Each Ctrl+C created another failed release

**Your debugging journey:**
```bash
# You checked for stuck releases
helm list --all-namespaces --all
NAME           NAMESPACE     REVISION    UPDATED                                     STATUS    CHART                APP VERSION
jagdna-lims    production    1           2025-09-06 15:55:43.012864141 +0200 SAST    failed    jagdna-lims-0.1.0    1.16.0

# Uninstalled the failed release
helm uninstall jagdna-lims -n production

# But then it would fail again and create another stuck release!
```

### Problem 3: The Return of the server.js Bug!
```bash
kubectl logs jagdna-lims-6dc57854d4-mlgkr -n production
/app/server.js:1
vi server.js
   ^^^^^^
SyntaxError: Unexpected identifier
```

**THE SAME BUG FROM DAY 1 WAS BACK!** Your server.js somehow had "vi server.js" as the first line again!

---

## 🛠️ The Complete Fix Process

### Step 1: Fixed server.js (Again!)
You improved it this time to handle all health endpoints:
```javascript
const http = require('http');
const port = 3001;
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/live' || req.url === '/health/ready' || req.url === '/') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('JAGDNA LIMS Server Running\n');
  }
});
server.listen(port, '0.0.0.0', () => {  // Bind to all interfaces
  console.log(`Server running at port ${port}`);
});
```

### Step 2: Built New Docker Image
```bash
docker build -t localhost:5000/jagdna-lims:v1.0.3 .
docker push localhost:5000/jagdna-lims:v1.0.3
```

### Step 3: Updated values.yaml
```yaml
image:
  repository: localhost:5000/jagdna-lims
  tag: "v1.0.3"  # New fixed version
  pullPolicy: Always

service:
  type: NodePort
  port: 3001
  nodePort: 30002  # Changed from 30001
```

### Step 4: Clean Install That Finally Worked!
```bash
# Clean up any mess
helm uninstall jagdna-lims -n production 2>/dev/null || true
sleep 5

# Fresh install
helm install jagdna-lims . \
  --namespace production \
  --create-namespace \
  --wait

# SUCCESS!
NAME: jagdna-lims
LAST DEPLOYED: Sat Sep  6 16:12:31 2025
NAMESPACE: production
STATUS: deployed
```

---

## ✅ Successful Helm Operations Completed

### 1. Basic Install
```bash
kubectl get pods -n production
NAME                           READY   STATUS    RESTARTS   AGE
jagdna-lims-6d5d697bdf-qxlj9   1/1     Running   0          23s
jagdna-lims-6d5d697bdf-s5qgq   0/1     Running   0          8s
```

### 2. Upgrade
```bash
helm upgrade jagdna-lims . \
  --namespace production \
  --set image.tag=v1.0.1 \
  --set replicaCount=3

# Result: Revision 2 deployed
```

### 3. History Check
```bash
helm history jagdna-lims -n production
REVISION    UPDATED                     STATUS        CHART                APP VERSION    DESCRIPTION     
1           Sat Sep  6 16:12:31 2025    superseded    jagdna-lims-0.1.0    1.16.0         Install complete
2           Sat Sep  6 16:13:18 2025    deployed      jagdna-lims-0.1.0    1.16.0         Upgrade complete
```

### 4. Rollback
```bash
helm rollback jagdna-lims 1 -n production
# Result: Rolled back to revision 1, created revision 3
```

### 5. Package Chart
```bash
helm package .
# Created: jagdna-lims-0.1.0.tgz
```

### 6. Clean Uninstall
```bash
helm uninstall jagdna-lims -n production
# release "jagdna-lims" uninstalled
```

---

## 🔍 Debugging Timeline

1. **15:55** - First attempt, hit NodePort 30001 conflict
2. **15:56** - Changed values.yaml but hit "name in use" error
3. **15:59** - Found failed release stuck in Helm
4. **16:01** - Multiple attempts with Ctrl+C creating more failed releases
5. **16:03** - Discovered server.js had "vi server.js" bug AGAIN
6. **16:05** - Fixed server.js with improved health checks
7. **16:08** - Built new Docker image v1.0.3
8. **16:12** - FINALLY successful deployment!
9. **16:13** - Tested upgrade and rollback successfully

**Total debugging time: 18 minutes of intense troubleshooting!**

---

## 🎓 Key Lessons Learned

1. **NodePort Conflicts Are Namespace-Wide**
   - Each NodePort can only be used once across entire cluster
   - Development had 30001, staging had 30002, production needed 30003

2. **Failed Helm Releases Can Get Stuck**
   - Ctrl+C during install creates failed releases
   - Must uninstall failed releases before retrying
   - `helm list --all-namespaces --all` shows failed ones

3. **The server.js Bug Pattern**
   - This happened TWICE - be careful with vi!
   - Always `cat` your files before building Docker images
   - Version your images properly (v1.0.1, v1.0.2, v1.0.3)

4. **Health Endpoints Matter**
   - Helm templates expect /health/live and /health/ready
   - Your improved server.js handles all variants
   - Binding to 0.0.0.0 is important for container networking

5. **Helm Workflow Works When Everything Aligns**
   - Install → Upgrade → History → Rollback → Uninstall
   - Each creates a new revision
   - Rollback creates a new revision (not reuses old one)

---

## 📊 Final Helm Status

### What's Working:
✅ Helm chart successfully created and packaged
✅ Multi-namespace deployments possible
✅ Upgrade and rollback tested
✅ History tracking functional
✅ Clean uninstall works

### Image Versions Created:
- v1.0.1 - Original (had server.js bug)
- v1.0.2 - First fix attempt
- v1.0.3 - Final working version with all health endpoints

### NodePort Allocations:
```
development:  30001
staging:      30002 (from earlier)
production:   30002 (reused after staging deleted)
```

---

## 💡 Commands That Saved the Day

```bash
# Find stuck Helm releases
helm list --all-namespaces --all

# Clean up failed release
helm uninstall <name> -n <namespace>

# Check what's using a port
kubectl get svc --all-namespaces | grep <port>

# Build and push in one line
docker build -t localhost:5000/jagdna-lims:v1.0.3 . && \
docker push localhost:5000/jagdna-lims:v1.0.3

# Install with error suppression
helm uninstall jagdna-lims -n production 2>/dev/null || true
```

---

## 🏆 Helm Journey Complete!

You've now successfully:
- Created a Helm chart from scratch
- Debugged complex deployment issues
- Fixed the recurring server.js problem (twice!)
- Managed NodePort conflicts across namespaces
- Performed upgrades and rollbacks
- Packaged chart for distribution

**Time spent on Helm Part 5: ~30 minutes** (including 18 minutes of debugging)

Ready for Day 3: Terraform! But first, you've earned a break after this battle! 🎉