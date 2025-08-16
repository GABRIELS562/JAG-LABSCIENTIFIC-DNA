# 🏗️ Dual Deployment Architecture
## Client Production (Docker) + Developer Showcase (K3s)

## Overview
This setup runs TWO separate environments on the same mini PC:
1. **Client's Production LIMS** - Simple, stable Docker Compose
2. **Developer's Showcase** - K3s with full DevOps stack

```
┌─────────────────────────────────────────────────────┐
│                   Mini PC Server                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │   CLIENT PRODUCTION (Docker Compose)         │   │
│  │   Port: 3001 → lims.clientdomain.com        │   │
│  │   - LIMS Application                        │   │
│  │   - SQLite Database                         │   │
│  │   - Nginx Reverse Proxy                     │   │
│  │   - Automated Backups                       │   │
│  │   Network: 172.20.0.0/16                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │   DEVELOPER SHOWCASE (K3s Cluster)           │   │
│  │   Ports: 6443, 30000-32767                   │   │
│  │   → *.showcase.yourdomain.com                │   │
│  │   - Multiple LIMS versions                   │   │
│  │   - CI/CD Pipeline (Jenkins/GitLab)         │   │
│  │   - ArgoCD (GitOps)                         │   │
│  │   - Prometheus + Grafana                    │   │
│  │   - ELK Stack                               │   │
│  │   Network: 172.21.0.0/16                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │   SHARED RESOURCES                           │   │
│  │   - Cloudflare Tunnels (Multiple)            │   │
│  │   - System Monitoring                        │   │
│  │   - Log Aggregation                          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Part 1: Client's Production LIMS (Simple Docker)

### Why Docker for Production?
- ✅ **Stability**: Proven, simple technology
- ✅ **Easy Maintenance**: Client's IT can manage
- ✅ **Quick Recovery**: Simple backup/restore
- ✅ **Low Overhead**: Minimal resource usage
- ✅ **Fast Troubleshooting**: Fewer moving parts

### Setup Client Production
```bash
# Directory structure
sudo mkdir -p /opt/production/lims
cd /opt/production/lims

# Simple docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  lims-app:
    image: labscientific-lims:stable
    container_name: prod-lims
    restart: always
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
      - ./backups:/app/backups
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/lims.db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  lims-backup:
    image: alpine:latest
    container_name: prod-backup
    restart: always
    volumes:
      - ./data:/data
      - ./backups:/backups
    command: |
      sh -c "while true; do
        sqlite3 /data/lims.db '.backup /backups/lims_$$(date +%Y%m%d_%H%M%S).db'
        find /backups -name 'lims_*.db' -mtime +30 -delete
        sleep 86400
      done"

  cloudflare-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: prod-tunnel
    restart: always
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${PRODUCTION_TUNNEL_TOKEN}

networks:
  default:
    name: production-network
    ipam:
      config:
        - subnet: 172.20.0.0/16
EOF

# Production environment
cat > .env << 'EOF'
PRODUCTION_TUNNEL_TOKEN=your_production_tunnel_token
JWT_SECRET=your_secure_jwt_secret
DATABASE_BACKUP_DAYS=30
EOF

# Start production
docker-compose up -d
```

### Production Monitoring Script
```bash
cat > /opt/production/monitor.sh << 'EOF'
#!/bin/bash
# Simple monitoring for production

check_service() {
    if docker ps | grep -q $1; then
        echo "✅ $1: Running"
    else
        echo "❌ $1: Down - Restarting..."
        docker-compose restart $1
        # Send alert to admin
        curl -X POST https://api.telegram.org/bot${BOT_TOKEN}/sendMessage \
          -d "chat_id=${CHAT_ID}&text=Alert: $1 service was down and has been restarted"
    fi
}

# Check services
check_service "prod-lims"
check_service "prod-backup"
check_service "prod-tunnel"

# Check disk space
DISK_USAGE=$(df -h /opt/production | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ Disk usage high: ${DISK_USAGE}%"
fi

# Check database size
DB_SIZE=$(du -h /opt/production/lims/data/lims.db | cut -f1)
echo "📊 Database size: $DB_SIZE"

# Check last backup
LAST_BACKUP=$(ls -t /opt/production/lims/backups/*.db | head -1)
echo "💾 Last backup: $(basename $LAST_BACKUP)"
EOF

chmod +x /opt/production/monitor.sh

# Add to cron
echo "*/5 * * * * /opt/production/monitor.sh >> /var/log/production-monitor.log" | crontab -
```

## Part 2: Developer's K3s Showcase

### Why K3s for Showcase?
- 🚀 **Lightweight**: ~40MB binary, 512MB RAM minimum
- 🎯 **Full K8s Features**: All the bells and whistles
- 📦 **Built-in Components**: Traefik, CoreDNS, Metrics Server
- 🔧 **Easy Setup**: Single command installation
- 💼 **Portfolio Ready**: Shows enterprise skills

### Install K3s
```bash
# Install K3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --node-name showcase-master \
  --data-dir /opt/k3s/data

# Wait for K3s to be ready
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=60s

# Create namespace for showcase
sudo k3s kubectl create namespace showcase
sudo k3s kubectl create namespace devops-tools
sudo k3s kubectl create namespace monitoring
```

### Deploy NGINX Ingress Controller
```yaml
# /opt/k3s/manifests/nginx-ingress.yaml
cat > /opt/k3s/manifests/nginx-ingress.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx
---
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: NodePort
  ports:
  - name: http
    port: 80
    targetPort: 80
    nodePort: 30080
  - name: https
    port: 443
    targetPort: 443
    nodePort: 30443
  selector:
    app.kubernetes.io/name: ingress-nginx
EOF

sudo k3s kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/baremetal/deploy.yaml
```

### Deploy Multiple LIMS Versions
```yaml
# /opt/k3s/manifests/showcase-lims.yaml
cat > /opt/k3s/manifests/showcase-lims.yaml << 'EOF'
---
# Stable Version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-stable
  namespace: showcase
  labels:
    app: lims
    version: stable
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lims
      version: stable
  template:
    metadata:
      labels:
        app: lims
        version: stable
    spec:
      containers:
      - name: lims
        image: labscientific-lims:stable
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: VERSION
          value: "stable"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
---
# Beta Version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-beta
  namespace: showcase
  labels:
    app: lims
    version: beta
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lims
      version: beta
  template:
    metadata:
      labels:
        app: lims
        version: beta
    spec:
      containers:
      - name: lims
        image: labscientific-lims:beta
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "staging"
        - name: VERSION
          value: "beta"
        - name: FEATURE_FLAGS
          value: "new_ui,advanced_analytics"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
---
# Canary Version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-canary
  namespace: showcase
  labels:
    app: lims
    version: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lims
      version: canary
  template:
    metadata:
      labels:
        app: lims
        version: canary
    spec:
      containers:
      - name: lims
        image: labscientific-lims:canary
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "development"
        - name: VERSION
          value: "canary"
        - name: DEBUG
          value: "true"
---
# Services
apiVersion: v1
kind: Service
metadata:
  name: lims-stable
  namespace: showcase
spec:
  selector:
    app: lims
    version: stable
  ports:
  - port: 80
    targetPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: lims-beta
  namespace: showcase
spec:
  selector:
    app: lims
    version: beta
  ports:
  - port: 80
    targetPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: lims-canary
  namespace: showcase
spec:
  selector:
    app: lims
    version: canary
  ports:
  - port: 80
    targetPort: 3001
---
# Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lims-ingress
  namespace: showcase
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: stable.showcase.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lims-stable
            port:
              number: 80
  - host: beta.showcase.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lims-beta
            port:
              number: 80
  - host: canary.showcase.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lims-canary
            port:
              number: 80
EOF

sudo k3s kubectl apply -f /opt/k3s/manifests/showcase-lims.yaml
```

### Deploy Jenkins for CI/CD
```yaml
# /opt/k3s/manifests/jenkins.yaml
cat > /opt/k3s/manifests/jenkins.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: jenkins
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jenkins-pvc
  namespace: jenkins
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jenkins
  namespace: jenkins
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jenkins
  template:
    metadata:
      labels:
        app: jenkins
    spec:
      containers:
      - name: jenkins
        image: jenkins/jenkins:lts
        ports:
        - containerPort: 8080
        - containerPort: 50000
        volumeMounts:
        - name: jenkins-home
          mountPath: /var/jenkins_home
        env:
        - name: JAVA_OPTS
          value: "-Xmx1024m -Xms512m"
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
          requests:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: jenkins-home
        persistentVolumeClaim:
          claimName: jenkins-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: jenkins
  namespace: jenkins
spec:
  type: NodePort
  ports:
  - port: 8080
    targetPort: 8080
    nodePort: 30808
  - port: 50000
    targetPort: 50000
  selector:
    app: jenkins
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jenkins-ingress
  namespace: jenkins
spec:
  ingressClassName: nginx
  rules:
  - host: jenkins.showcase.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: jenkins
            port:
              number: 8080
EOF

sudo k3s kubectl apply -f /opt/k3s/manifests/jenkins.yaml
```

### Deploy ArgoCD for GitOps
```bash
# Install ArgoCD
sudo k3s kubectl create namespace argocd
sudo k3s kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Expose ArgoCD UI
sudo k3s kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort", "ports": [{"port": 443, "nodePort": 30443}]}}'

# Get initial admin password
sudo k3s kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Deploy Prometheus & Grafana
```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.resources.requests.memory=512Mi \
  --set prometheus.prometheusSpec.resources.limits.memory=1Gi \
  --set grafana.adminPassword=admin123 \
  --set grafana.service.type=NodePort \
  --set grafana.service.nodePort=30300
```

### Create CI/CD Pipeline
```groovy
// /opt/k3s/jenkins/Jenkinsfile
pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'your-registry.com'
        K3S_NAMESPACE = 'showcase'
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: '${BRANCH_NAME}', 
                    url: 'https://github.com/yourusername/labscientific-lims.git'
            }
        }
        
        stage('Build') {
            steps {
                sh 'docker build -t labscientific-lims:${BUILD_NUMBER} .'
            }
        }
        
        stage('Test') {
            steps {
                sh 'docker run --rm labscientific-lims:${BUILD_NUMBER} npm test'
            }
        }
        
        stage('Security Scan') {
            steps {
                sh 'trivy image labscientific-lims:${BUILD_NUMBER}'
            }
        }
        
        stage('Push Image') {
            steps {
                sh '''
                    docker tag labscientific-lims:${BUILD_NUMBER} ${DOCKER_REGISTRY}/labscientific-lims:${BUILD_NUMBER}
                    docker push ${DOCKER_REGISTRY}/labscientific-lims:${BUILD_NUMBER}
                '''
            }
        }
        
        stage('Deploy to K3s') {
            steps {
                script {
                    def deploymentName = ''
                    if (env.BRANCH_NAME == 'main') {
                        deploymentName = 'lims-stable'
                    } else if (env.BRANCH_NAME == 'beta') {
                        deploymentName = 'lims-beta'
                    } else {
                        deploymentName = 'lims-canary'
                    }
                    
                    sh """
                        kubectl set image deployment/${deploymentName} \
                          lims=${DOCKER_REGISTRY}/labscientific-lims:${BUILD_NUMBER} \
                          -n ${K3S_NAMESPACE}
                        
                        kubectl rollout status deployment/${deploymentName} -n ${K3S_NAMESPACE}
                    """
                }
            }
        }
        
        stage('Smoke Test') {
            steps {
                sh '''
                    sleep 30
                    curl -f http://stable.showcase.yourdomain.com/health || exit 1
                '''
            }
        }
    }
    
    post {
        success {
            slackSend color: 'good', 
                message: "Deployment successful: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
        }
        failure {
            slackSend color: 'danger', 
                message: "Deployment failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
        }
    }
}
```

## Part 3: Cloudflare Setup for Both

### Multiple Tunnels Configuration
```bash
# Create tunnels
cloudflared tunnel create production-lims
cloudflared tunnel create showcase-cluster

# Get tunnel IDs
PROD_TUNNEL_ID=$(cloudflared tunnel list | grep production-lims | awk '{print $1}')
SHOWCASE_TUNNEL_ID=$(cloudflared tunnel list | grep showcase-cluster | awk '{print $1}')

# Configure DNS
cloudflared tunnel route dns production-lims lims.clientdomain.com
cloudflared tunnel route dns showcase-cluster *.showcase.yourdomain.com

# Production tunnel config
cat > /opt/production/cloudflared.yml << EOF
tunnel: $PROD_TUNNEL_ID
credentials-file: /root/.cloudflared/$PROD_TUNNEL_ID.json

ingress:
  - hostname: lims.clientdomain.com
    service: http://localhost:3001
  - service: http_status:404
EOF

# Showcase tunnel config
cat > /opt/k3s/cloudflared.yml << EOF
tunnel: $SHOWCASE_TUNNEL_ID
credentials-file: /root/.cloudflared/$SHOWCASE_TUNNEL_ID.json

ingress:
  - hostname: stable.showcase.yourdomain.com
    service: http://localhost:30080
  - hostname: beta.showcase.yourdomain.com
    service: http://localhost:30080
  - hostname: canary.showcase.yourdomain.com
    service: http://localhost:30080
  - hostname: jenkins.showcase.yourdomain.com
    service: http://localhost:30808
  - hostname: argocd.showcase.yourdomain.com
    service: https://localhost:30443
    originRequest:
      noTLSVerify: true
  - hostname: grafana.showcase.yourdomain.com
    service: http://localhost:30300
  - service: http_status:404
EOF
```

## Part 4: Resource Management

### System Resource Allocation
```yaml
# /etc/systemd/system/resource-limits.conf
# For 16GB RAM Mini PC

# Production (Client): 6GB RAM, 4 CPU cores
[Slice]
CPUQuota=400%
MemoryMax=6G
MemoryHigh=5G

# K3s (Showcase): 8GB RAM, 4 CPU cores  
[Slice]
CPUQuota=400%
MemoryMax=8G
MemoryHigh=7G

# System Reserved: 2GB RAM
```

### Resource Monitoring Dashboard
```bash
# Install htop for real-time monitoring
sudo apt install htop iotop nethogs

# Create monitoring script
cat > /opt/monitor-all.sh << 'EOF'
#!/bin/bash

echo "=== PRODUCTION ENVIRONMENT ==="
docker stats --no-stream $(docker ps --filter "name=prod-" -q)

echo -e "\n=== K3S SHOWCASE ENVIRONMENT ==="
sudo k3s kubectl top nodes
sudo k3s kubectl top pods -A

echo -e "\n=== SYSTEM RESOURCES ==="
free -h
df -h /opt/production /opt/k3s

echo -e "\n=== NETWORK USAGE ==="
ss -s

echo -e "\n=== TOP PROCESSES ==="
ps aux | head -10
EOF

chmod +x /opt/monitor-all.sh
```

## Part 5: Backup Strategy

### Dual Backup System
```bash
# Production backups
cat > /opt/production/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/production"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup production database
docker exec prod-lims sqlite3 /app/data/lims.db ".backup $BACKUP_DIR/lims_$DATE.db"

# Backup production configs
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /opt/production/*.yml /opt/production/.env

# Upload to cloud
rclone copy $BACKUP_DIR remote:production-backups/ --max-age 24h
EOF

# K3s backups
cat > /opt/k3s/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/k3s"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup K3s cluster
sudo k3s kubectl cluster-info dump --output-directory=$BACKUP_DIR/cluster_$DATE

# Backup all deployments
for ns in showcase jenkins argocd monitoring; do
  sudo k3s kubectl get all -n $ns -o yaml > $BACKUP_DIR/${ns}_$DATE.yaml
done

# Backup persistent volumes
tar -czf $BACKUP_DIR/volumes_$DATE.tar.gz /opt/k3s/data/

# Upload to cloud
rclone copy $BACKUP_DIR remote:k3s-backups/ --max-age 24h
EOF

# Schedule backups
echo "0 2 * * * /opt/production/backup.sh" | crontab -
echo "0 3 * * * /opt/k3s/backup.sh" | crontab -l | crontab -
```

## Part 6: Troubleshooting Guide

### If Production Affects K3s
```bash
# Limit production resources
docker update --cpus="2" --memory="2g" prod-lims

# Restart with limits
docker-compose -f /opt/production/lims/docker-compose.yml down
docker-compose -f /opt/production/lims/docker-compose.yml up -d
```

### If K3s Affects Production
```bash
# Scale down K3s workloads
sudo k3s kubectl scale deployment --all --replicas=0 -n showcase

# Limit K3s resources
sudo systemctl set-property k3s.service CPUQuota=200%
sudo systemctl set-property k3s.service MemoryMax=4G
sudo systemctl daemon-reload
sudo systemctl restart k3s
```

### Emergency Access
```bash
# Direct access bypassing Cloudflare
ssh admin@<public-ip> -p 22

# Access production
docker exec -it prod-lims sh

# Access K3s
sudo k3s kubectl exec -it deployment/lims-stable -n showcase -- sh
```

## Part 7: Cost-Benefit Analysis

### Why This Architecture Makes Sense

#### For the Client:
- ✅ Production runs on simple, stable Docker
- ✅ Easy to maintain and troubleshoot
- ✅ Isolated from experimental features
- ✅ Guaranteed resources and uptime
- ✅ Simple backup and recovery

#### For You (Developer):
- 🚀 Full K8s environment for learning/showcasing
- 📊 Real production metrics for portfolio
- 🔧 CI/CD pipeline experience
- 📈 GitOps and modern DevOps practices
- 💼 Impressive setup for potential employers

#### Resource Usage:
```
Mini PC (16GB RAM, 8 CPU cores):
├── Production LIMS: 3GB RAM, 2 CPUs (19% resources)
├── K3s Cluster: 8GB RAM, 4 CPUs (50% resources)
├── Monitoring: 2GB RAM, 1 CPU (12% resources)
├── System/Buffer: 3GB RAM, 1 CPU (19% resources)
└── Total: 100% optimized usage
```

## Quick Start Commands

```bash
# Check production
docker ps | grep prod-
curl http://localhost:3001/health

# Check K3s showcase
sudo k3s kubectl get pods -A
sudo k3s kubectl get ingress -A

# View all logs
docker logs prod-lims --tail 50
sudo k3s kubectl logs -n showcase deployment/lims-stable

# Access URLs
echo "Production: https://lims.clientdomain.com"
echo "Showcase Stable: https://stable.showcase.yourdomain.com"
echo "Jenkins: https://jenkins.showcase.yourdomain.com"
echo "ArgoCD: https://argocd.showcase.yourdomain.com"
echo "Grafana: https://grafana.showcase.yourdomain.com"
```

## Summary

This dual architecture gives you the best of both worlds:
1. **Client gets**: Stable, simple, reliable production system
2. **You get**: Full DevOps playground for portfolio and learning
3. **Both benefit**: Shared infrastructure costs, professional setup

The client's production LIMS remains isolated, stable, and simple to maintain, while you have a complete K8s environment to showcase your DevOps skills to potential employers or clients.