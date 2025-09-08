# 🚀 LIMS K3s Deployment - Quick Reference (Single Node)

## 📋 Complete Installation Order

### 1️⃣ System Prep
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim htop
```

### 2️⃣ Install Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# LOG OUT AND BACK IN NOW!
```

### 3️⃣ Install K3s (Single Node)
```bash
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644 --disable traefik --node-name server1-lims
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
```

### 4️⃣ Build & Import LIMS Image
```bash
cd ~/JAG-LABSCIENTIFIC-DNA
docker build -t lims-backend:latest .
docker save lims-backend:latest -o lims.tar
sudo k3s ctr images import lims.tar
rm lims.tar
```

### 5️⃣ Create Namespaces (Only What's Needed)
```bash
kubectl create namespace production
kubectl create namespace forensics
kubectl config set-context --current --namespace=production
```

### 6️⃣ Deploy Everything
```bash
kubectl apply -f k3s/postgresql.yaml
kubectl apply -f k3s/lims-configmap.yaml
kubectl apply -f k3s/lims-deployment.yaml
kubectl apply -f k3s/lims-service.yaml
kubectl apply -f k3s/jenkins.yaml -n default
```

### 7️⃣ Verify Deployment
```bash
kubectl get all -n production
kubectl get pods -n forensics
kubectl logs -l app=lims-backend -n production
```

---

## 🔍 Most Used Commands

### Check Status
```bash
# View all pods in production
kubectl get pods -n production

# Watch pods live (see auto-recovery)
kubectl get pods -n production -w

# Check single node status
kubectl get nodes
kubectl top node
```

### View Logs
```bash
# LIMS logs
kubectl logs -f deployment/lims-backend -n production

# PostgreSQL logs
kubectl logs -l app=postgresql -n production

# Last 50 lines only
kubectl logs deployment/lims-backend -n production --tail=50
```

### Port Forwarding (Access Apps)
```bash
# LIMS Application
kubectl port-forward -n production service/lims-backend 3001:3001

# Prometheus Metrics
kubectl port-forward -n production service/lims-backend 9101:9101

# Forensic Evidence (Your differentiator!)
kubectl port-forward -n forensics service/forensic-api 8888:8888

# Jenkins
kubectl port-forward -n default service/jenkins 8080:8080
```

### Troubleshooting
```bash
# See what went wrong
kubectl describe pod <pod-name> -n production
kubectl get events -n production --sort-by='.lastTimestamp'

# Get into a pod
kubectl exec -it <pod-name> -n production -- /bin/sh

# Check resource usage
kubectl top pods -n production
```

---

## 🎯 Demo Commands (Interview Gold)

### Show Self-Healing
```bash
# Terminal 1: Watch pods
kubectl get pods -n production -w

# Terminal 2: Kill a pod
kubectl delete pod $(kubectl get pod -l app=lims-backend -n production -o jsonpath='{.items[0].metadata.name}') -n production

# Watch Terminal 1 - Pod auto-recovers in seconds!
```

### Show Your Forensic Differentiator
```bash
# Deploy forensic collector
kubectl apply -f k3s/forensic-collector.yaml -n forensics

# Access evidence viewer
kubectl port-forward -n forensics service/forensic-api 8888:8888
open http://localhost:8888

# Trigger incident capture
curl http://localhost:8888/trigger/lims
```

### Show Metrics
```bash
kubectl port-forward -n production service/lims-backend 9101:9101 &
curl -s http://localhost:9101/metrics | grep -E "lims_samples|http_request"
```

### Show Resilience
```bash
# Scale up
kubectl scale deployment lims-backend --replicas=3 -n production

# Scale down
kubectl scale deployment lims-backend --replicas=2 -n production
```

---

## 📁 Essential K3s Files Only

| File | Purpose | Namespace |
|------|---------|-----------|
| `k3s/postgresql.yaml` | Database with persistence | production |
| `k3s/lims-configmap.yaml` | LIMS configuration | production |
| `k3s/lims-deployment.yaml` | LIMS app (2 replicas) | production |
| `k3s/lims-service.yaml` | Service definitions | production |
| `k3s/jenkins.yaml` | CI/CD pipeline | default |
| `k3s/forensic-collector.yaml` | Your differentiator! | forensics |

**Files to DELETE:**
- `k3s/namespaces-multi-env.yaml` ❌ (fake complexity)
- `k3s/resource-quotas.yaml` ❌ (not needed for single node)
- Any staging/dev variants ❌

---

## 💡 Single Node Best Practices

### DO ✅
```bash
# Use namespaces for organization
kubectl create namespace production
kubectl create namespace forensics

# Use multiple replicas for HA
kubectl scale deployment lims-backend --replicas=2

# Set resource limits in deployments
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "1Gi"
```

### DON'T ❌
```bash
# Don't create fake environments
kubectl create namespace staging  # WASTE!
kubectl create namespace dev      # WASTE!

# Don't deploy same app multiple times
kubectl apply -f lims.yaml -n staging  # NO!
```

---

## 🔧 Quick Fixes

### Out of Memory?
```bash
# Reduce replicas
kubectl scale deployment lims-backend --replicas=1 -n production

# Check what's using memory
kubectl top pods --all-namespaces
```

### Pod Won't Start?
```bash
# Check details
kubectl describe pod <pod-name> -n production

# Check image exists
sudo k3s ctr images list | grep lims

# Re-import if missing
docker save lims-backend:latest | sudo k3s ctr images import -
```

### Can't Access Service?
```bash
# Check service endpoints
kubectl get endpoints -n production

# Try port-forward instead
kubectl port-forward pod/<pod-name> 3001:3001 -n production
```

---

## 🎤 Interview One-Liners

**"What's your architecture?"**
> "Single K3s node with production and forensics namespaces, 2 replicas for HA, automatic recovery."

**"Why not dev/staging?"**
> "On a single node, that's fake complexity. I focus on production resilience and my forensic differentiator."

**"Show me it recovering from failure"**
> *Delete pod, watch it auto-recover in 15 seconds*

**"What makes this special?"**
> "My forensic evidence collector - it captures all incidents with cryptographic chain of custody."

---

## 📊 Resource Usage (16GB Server)

```
System:        ~2GB
K3s:           ~1GB  
PostgreSQL:    ~1GB
LIMS (2 pods): ~2GB
Jenkins:       ~2GB
Forensics:     ~1GB
-------------------
Total Used:    ~9GB
Available:     ~7GB (buffer for spikes)
```

---

## 🚨 Emergency Commands

```bash
# Restart everything
kubectl rollout restart deployment lims-backend -n production

# Delete and redeploy
kubectl delete -f k3s/lims-deployment.yaml
kubectl apply -f k3s/lims-deployment.yaml

# Check K3s status
sudo systemctl status k3s

# Restart K3s
sudo systemctl restart k3s

# View K3s logs
sudo journalctl -u k3s -f
```

---

## ✨ The Money Commands (Your Demo)

```bash
# 1. Show your single efficient node
kubectl get nodes && kubectl top node

# 2. Show self-healing
kubectl delete pod $(kubectl get pod -l app=lims-backend -n production -o jsonpath='{.items[0].metadata.name}') -n production

# 3. Show your forensic collector (UNIQUE!)
open http://localhost:8888

# 4. Explain: "Single node, production focus, forensic differentiator"
```

Remember: **Your forensic collector > fake environments**
---

## 🐳 Local Docker Registry (Optional but Smart)

### Setup Once:
```bash
docker run -d --restart=always -p 5000:5000 --name local-registry registry:2
```

### Use for Every Build:
```bash
# Build
docker build -t lims-backend:latest .

# Tag for registry
docker tag lims-backend:latest localhost:5000/lims-backend:latest

# Push to local registry
docker push localhost:5000/lims-backend:latest

# K3s pulls from local registry (FAST!)
kubectl set image deployment/lims-backend lims-backend=localhost:5000/lims-backend:latest -n production
```

### Why This Matters:
- No DockerHub rate limits
- Works offline (demo won't fail!)
- Faster pulls (local network)
- Shows production thinking
