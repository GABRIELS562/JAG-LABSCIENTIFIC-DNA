# Complete Cleanup and Fresh Deployment Guide

## 🧹 STEP 1: COMPLETE CLEANUP COMMANDS

### 1.1 Clean ALL Kubernetes Resources
```bash
# Delete all namespaces (except system ones)
kubectl delete namespace production --ignore-not-found=true
kubectl delete namespace monitoring --ignore-not-found=true
kubectl delete namespace default --ignore-not-found=true --cascade=foreground

# Delete ALL deployments, services, pods in all namespaces
kubectl delete deployments --all --all-namespaces
kubectl delete services --all --all-namespaces
kubectl delete pods --all --all-namespaces
kubectl delete pvc --all --all-namespaces
kubectl delete pv --all

# Clean up any configmaps and secrets
kubectl delete configmaps --all --all-namespaces
kubectl delete secrets --all --all-namespaces

# Verify everything is clean
kubectl get all --all-namespaces
```

### 1.2 Clean ALL Docker Resources
```bash
# Stop all running containers
docker stop $(docker ps -aq) 2>/dev/null || true

# Remove all containers
docker rm -f $(docker ps -aq) 2>/dev/null || true

# Remove all images related to your app
docker rmi -f $(docker images | grep jagdna | awk '{print $3}') 2>/dev/null || true
docker rmi -f $(docker images | grep lims | awk '{print $3}') 2>/dev/null || true

# Clean up all unused images, volumes, networks
docker system prune -a --volumes -f

# Verify Docker is clean
docker ps -a
docker images
```

### 1.3 Clean Kind Cluster (if using Kind)
```bash
# Delete existing cluster
kind delete cluster --name kind

# Create fresh cluster
kind create cluster --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF
```

## 🔄 STEP 2: MIGRATE FROM SQLITE TO POSTGRESQL

### 2.1 Install PostgreSQL Dependencies
```bash
# In your project directory
cd /Users/user/JAG-LABSCIENTIFIC-DNA

# Remove SQLite dependency
npm uninstall better-sqlite3

# Install PostgreSQL client
npm install pg
npm install --save-dev @types/pg  # if using TypeScript
```

### 2.2 Update Database Service
Replace `backend/services/database.js` with PostgreSQL connection:

```javascript
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jagdna_lims',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create tables with PostgreSQL syntax
    await pool.query(`
      CREATE TABLE IF NOT EXISTS samples (
        id SERIAL PRIMARY KEY,
        sample_id VARCHAR(255) UNIQUE NOT NULL,
        patient_name VARCHAR(255),
        sample_type VARCHAR(100),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add more tables as needed
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

module.exports = {
  pool,
  initializeDatabase,
  // Export query method for compatibility
  query: (text, params) => pool.query(text, params)
};
```

### 2.3 Create PostgreSQL Kubernetes Deployment
Save as `k8s-postgres.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "jagdna_lims"
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          value: "postgres"
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: production
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

## 🚀 STEP 3: FRESH DEPLOYMENT

### 3.1 Create Optimized Dockerfile
Save as `Dockerfile`:

```dockerfile
# Build stage for frontend
FROM node:18-alpine as frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend code
COPY backend ./backend

# Copy built frontend from build stage
COPY --from=frontend-builder /app/dist ./dist

# Environment variables
ENV NODE_ENV=production
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=jagdna_lims
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres

EXPOSE 3001

CMD ["node", "backend/server.js"]
```

### 3.2 Create Kubernetes Deployment
Save as `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jagdna-lims
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: jagdna-lims
  template:
    metadata:
      labels:
        app: jagdna-lims
    spec:
      containers:
      - name: jagdna-lims
        image: jagdna-lims:latest
        imagePullPolicy: Never  # For local development
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres"
        - name: DB_PORT
          value: "5432"
        - name: DB_NAME
          value: "jagdna_lims"
        - name: DB_USER
          value: "postgres"
        - name: DB_PASSWORD
          value: "postgres"
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: jagdna-lims
  namespace: production
spec:
  type: NodePort
  selector:
    app: jagdna-lims
  ports:
    - port: 80
      targetPort: 3001
      nodePort: 30080
```

## 📦 STEP 4: DEPLOYMENT COMMANDS

```bash
# 1. Build Docker image
docker build -t jagdna-lims:latest .

# 2. Load image into Kind (if using Kind)
kind load docker-image jagdna-lims:latest

# 3. Deploy PostgreSQL
kubectl apply -f k8s-postgres.yaml

# 4. Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n production --timeout=60s

# 5. Deploy your application
kubectl apply -f k8s-deployment.yaml

# 6. Check deployment status
kubectl get pods -n production
kubectl logs -f deployment/jagdna-lims -n production

# 7. Access the application
kubectl port-forward -n production service/jagdna-lims 3001:80
# OR if using NodePort
# Access at http://localhost:30080
```

## 🔍 STEP 5: VERIFY DEPLOYMENT

```bash
# Check all pods are running
kubectl get pods -n production

# Check logs for any errors
kubectl logs -f deployment/jagdna-lims -n production
kubectl logs -f deployment/postgres -n production

# Test the application
curl http://localhost:3001/api/health

# Check database connection
kubectl exec -it deployment/postgres -n production -- psql -U postgres -d jagdna_lims -c "\dt"
```

## 🛠️ TROUBLESHOOTING

### If pods are not starting:
```bash
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production --previous
```

### If database connection fails:
```bash
# Check if postgres service is accessible
kubectl exec -it deployment/jagdna-lims -n production -- nslookup postgres
kubectl exec -it deployment/jagdna-lims -n production -- nc -zv postgres 5432
```

### If frontend shows white screen:
```bash
# Check if static files are being served
kubectl exec -it deployment/jagdna-lims -n production -- ls -la /app/dist
kubectl logs deployment/jagdna-lims -n production | grep -i error
```

## 📝 NOTES

1. **Database Migration**: The PostgreSQL setup is much more suitable for Kubernetes as it handles multiple connections better than SQLite
2. **Persistent Storage**: PostgreSQL data is stored in a PersistentVolume so it survives pod restarts
3. **Environment Variables**: All database configuration is done through environment variables for easy configuration
4. **Health Checks**: Readiness and liveness probes ensure the application is healthy before serving traffic
5. **Multi-replica**: With PostgreSQL, you can safely run multiple replicas of your application

## 🎯 EXPECTED RESULT

After following all steps, you should have:
- Clean Kubernetes cluster with no old resources
- PostgreSQL database running in Kubernetes
- Your DNA LIMS application running with 2 replicas
- Accessible application at http://localhost:3001 (port-forward) or http://localhost:30080 (NodePort)
- No white screen issues
- Proper database connectivity
- All your application features working exactly as they do with `npm run dev`