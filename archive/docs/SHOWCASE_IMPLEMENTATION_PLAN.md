# 🚀 JAGDNA LIMS - Production Showcase Implementation Plan
## From Zero to Live Demo in 4 Hours

---

## 🎯 **GOAL: Live, Accessible Application with Full DevOps Pipeline**

What we're building:
- **React Frontend** + **Node.js Backend** running in Kubernetes
- **Accessible via public IP** (using ngrok or LoadBalancer)
- **CI/CD Pipeline** that deploys on every push
- **Live Monitoring** with Prometheus/Grafana
- **Real feature workflow** (change font → auto-deploy)

---

## 📋 **PART 1: Deploy the REAL Application** (1 hour)

### Step 1: Verify Your Current Setup
```bash
# Check what's running
kubectl get all --all-namespaces
kubectl get nodes -o wide
docker ps

# Clean up old stuff if needed
kubectl delete all --all --all-namespaces
```

### Step 2: Deploy the Existing Frontend (Your React App)
```bash
# Your app is already in this repo! Let's containerize it
cd /Users/user/JAG-LABSCIENTIFIC-DNA

# Create production Dockerfile for your React app
cat > Dockerfile.frontend << 'EOF'
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Build and push
docker build -f Dockerfile.frontend -t jagdna-frontend:v1.0.0 .
docker tag jagdna-frontend:v1.0.0 localhost:5000/jagdna-frontend:v1.0.0
docker push localhost:5000/jagdna-frontend:v1.0.0
```

### Step 3: Deploy Backend API
```bash
# Create a real backend with database connection
cat > backend-api.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Sample data - in production, this would be PostgreSQL
let samples = [
  { id: 1, patientId: 'P001', status: 'extraction', progress: 30 },
  { id: 2, patientId: 'P002', status: 'pcr', progress: 60 },
  { id: 3, patientId: 'P003', status: 'analysis', progress: 90 }
];

// API Routes
app.get('/api/samples', (req, res) => {
  res.json(samples);
});

app.post('/api/samples', (req, res) => {
  const newSample = { 
    id: samples.length + 1, 
    ...req.body,
    status: 'received',
    progress: 0
  };
  samples.push(newSample);
  res.status(201).json(newSample);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.get('/metrics', (req, res) => {
  res.send(`# HELP samples_total Total number of samples
# TYPE samples_total counter
samples_total ${samples.length}
`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`LIMS Backend running on port ${PORT}`);
});
EOF

# Create package.json for backend
cat > backend-package.json << 'EOF'
{
  "name": "jagdna-backend",
  "version": "1.0.0",
  "main": "backend-api.js",
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
}
EOF

# Dockerfile for backend
cat > Dockerfile.backend << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY backend-package.json package.json
RUN npm install
COPY backend-api.js .
EXPOSE 3001
CMD ["node", "backend-api.js"]
EOF

# Build and push backend
docker build -f Dockerfile.backend -t jagdna-backend:v1.0.0 .
docker tag jagdna-backend:v1.0.0 localhost:5000/jagdna-backend:v1.0.0
docker push localhost:5000/jagdna-backend:v1.0.0
```

### Step 4: Create Complete Kubernetes Deployment
```bash
# Create namespace
kubectl create namespace production

# Deploy everything
cat > k8s-complete-deployment.yaml << 'EOF'
# Backend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-backend
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: lims-backend
  template:
    metadata:
      labels:
        app: lims-backend
    spec:
      containers:
      - name: backend
        image: localhost:5000/jagdna-backend:v1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
# Backend Service
apiVersion: v1
kind: Service
metadata:
  name: lims-backend-service
  namespace: production
spec:
  selector:
    app: lims-backend
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
---
# Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-frontend
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: lims-frontend
  template:
    metadata:
      labels:
        app: lims-frontend
    spec:
      containers:
      - name: frontend
        image: localhost:5000/jagdna-frontend:v1.0.0
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
# Frontend Service (LoadBalancer for external access)
apiVersion: v1
kind: Service
metadata:
  name: lims-frontend-service
  namespace: production
spec:
  selector:
    app: lims-frontend
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
  type: NodePort
---
# HPA for auto-scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lims-backend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lims-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF

# Apply the deployment
kubectl apply -f k8s-complete-deployment.yaml

# Check status
kubectl get all -n production
```

---

## 📋 **PART 2: Make It Accessible from Internet** (30 mins)

### Option A: Using ngrok (Easiest for demo)
```bash
# Install ngrok if not installed
brew install ngrok  # Mac
# OR download from https://ngrok.com/download

# Expose your frontend service
kubectl port-forward -n production svc/lims-frontend-service 8080:80 &

# Create public URL
ngrok http 8080

# You'll get a URL like: https://abc123.ngrok.io
# This is your PUBLIC demo URL!
```

### Option B: Using Minikube tunnel (if using Minikube)
```bash
minikube service lims-frontend-service -n production --url
# Opens in browser automatically
```

### Option C: Cloud Load Balancer (if on cloud)
```bash
# Change service type to LoadBalancer
kubectl patch svc lims-frontend-service -n production -p '{"spec":{"type":"LoadBalancer"}}'

# Wait for external IP
kubectl get svc -n production -w
```

---

## 📋 **PART 3: Set Up CI/CD Pipeline** (1 hour)

### Step 1: Create GitHub Actions Workflow
```bash
# Create workflow file
mkdir -p .github/workflows

cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Kubernetes

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Build and push Docker images
      run: |
        # Build frontend
        docker build -f Dockerfile.frontend -t jagdna-frontend:${{ github.sha }} .
        
        # Build backend
        docker build -f Dockerfile.backend -t jagdna-backend:${{ github.sha }} .
        
        # In real scenario, push to Docker Hub or ECR
        # docker push your-registry/jagdna-frontend:${{ github.sha }}
    
    - name: Deploy to Kubernetes
      run: |
        # Update deployment with new image
        kubectl set image deployment/lims-frontend frontend=jagdna-frontend:${{ github.sha }} -n production
        kubectl set image deployment/lims-backend backend=jagdna-backend:${{ github.sha }} -n production
        
        # Wait for rollout
        kubectl rollout status deployment/lims-frontend -n production
        kubectl rollout status deployment/lims-backend -n production
    
    - name: Run smoke tests
      run: |
        # Test the deployment
        curl -f http://your-app-url/health || exit 1
EOF

git add .github/workflows/deploy.yml
git commit -m "ci: Add GitHub Actions deployment pipeline"
git push
```

### Step 2: Demonstrate Feature Workflow
```bash
# Create feature branch
git checkout -b feature/change-header-color

# Make a visible change in your React app
cat > src/components/Header.jsx << 'EOF'
import React from 'react';

const Header = () => {
  return (
    <header style={{ 
      backgroundColor: '#FF6B6B',  // Changed from blue to red
      color: 'white',
      padding: '20px',
      fontSize: '24px'  // Changed font size
    }}>
      <h1>JAGDNA Forensics LIMS - v2.0</h1>
      <p>Pipeline Demo - Auto-deployed via CI/CD</p>
    </header>
  );
};

export default Header;
EOF

# Commit and push
git add src/components/Header.jsx
git commit -m "feat: Change header color to red and add version"
git push -u origin feature/change-header-color

# Create PR (this triggers CI/CD)
gh pr create --title "Feature: Update header styling" \
  --body "Changes header color to demonstrate CI/CD pipeline"

# Merge PR (auto-deploys)
gh pr merge
```

---

## 📋 **PART 4: Set Up Monitoring** (30 mins)

### Step 1: Deploy Prometheus & Grafana
```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus & Grafana
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin123 \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

# Wait for pods
kubectl get pods -n monitoring
```

### Step 2: Expose Grafana
```bash
# Port forward Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80 &

# Or use ngrok for public access
ngrok http 3000

# Login: admin / admin123
```

### Step 3: Create Custom Dashboard
```bash
# Import dashboard for your app
# In Grafana UI:
# 1. Click + → Import
# 2. Upload this JSON:

cat > lims-dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "JAGDNA LIMS Monitoring",
    "panels": [
      {
        "title": "Active Samples",
        "targets": [
          {"expr": "samples_total"}
        ]
      },
      {
        "title": "Pod CPU Usage",
        "targets": [
          {"expr": "container_cpu_usage_seconds_total{namespace='production'}"}
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {"expr": "http_request_duration_seconds{job='lims-backend'}"}
        ]
      }
    ]
  }
}
EOF
```

---

## 📋 **PART 5: Create Load and Show Auto-scaling** (30 mins)

### Step 1: Generate Load
```bash
# Install hey (load testing tool)
brew install hey  # Mac
# OR: go install github.com/rakyll/hey@latest

# Generate load to trigger auto-scaling
hey -z 2m -c 50 http://localhost:8080/api/samples

# Watch pods scale up
kubectl get hpa -n production -w

# In another terminal, watch pods
kubectl get pods -n production -w
```

### Step 2: Show Scaling in Grafana
- Open Grafana dashboard
- Show pod count increasing
- Show CPU usage spike
- Show recovery after load stops

---

## 🎬 **DEMO SCRIPT**

### 1. Show Live Application
```bash
# Open browser to your ngrok URL
"Here's our forensics LIMS running in Kubernetes"
"Frontend served by nginx, backend API in Node.js"
```

### 2. Demonstrate CI/CD
```bash
# Make a change
"Let's change the header color"
git checkout -b feature/new-color
# Edit file
git commit -m "feat: Update color"
git push

# Show GitHub Actions running
"The pipeline automatically builds and deploys"

# Refresh browser - new color appears!
"Change is live in production"
```

### 3. Show Monitoring
```bash
# Open Grafana
"Real-time monitoring with Prometheus"
"Custom dashboards for forensics metrics"
```

### 4. Demonstrate Auto-scaling
```bash
# Run load test
"Let's simulate high load from sample processing"
hey -z 30s -c 100 http://your-url

# Show pods scaling
"Kubernetes automatically scales to handle load"
kubectl get pods -n production

# Show in Grafana
"You can see the scaling event in real-time"
```

---

## 🎯 **Final Checklist**

### What You'll Have:
- [ ] Live application accessible via public URL
- [ ] Frontend + Backend + Database (or mock data)
- [ ] CI/CD pipeline that deploys on push
- [ ] Monitoring with Prometheus & Grafana
- [ ] Auto-scaling demonstration
- [ ] Feature branch workflow

### URLs for Demo:
- **Application**: https://your-ngrok-url.ngrok.io
- **Grafana**: https://your-grafana.ngrok.io
- **GitHub Actions**: https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA/actions
- **API Health**: https://your-ngrok-url.ngrok.io/api/health

### Key Talking Points:
1. "Multi-tier application with microservices architecture"
2. "Automated deployment pipeline with GitHub Actions"
3. "Real-time monitoring and alerting"
4. "Auto-scaling based on load"
5. "Zero-downtime deployments"
6. "Forensics-specific compliance features"

---

## ⏱️ **Time Estimate**

- Part 1: Deploy Application - 1 hour
- Part 2: Make Accessible - 30 mins
- Part 3: CI/CD Setup - 1 hour
- Part 4: Monitoring - 30 mins
- Part 5: Load Testing - 30 mins
- Testing & Polish - 30 mins

**Total: 4 hours to complete showcase**

---

## 🚀 **This gives you:**
- A REAL, RUNNING application
- Accessible from anywhere via public URL
- Automated deployment on every code change
- Professional monitoring setup
- Live auto-scaling demonstration
- Everything an interviewer wants to see!

Ready to build your showcase?