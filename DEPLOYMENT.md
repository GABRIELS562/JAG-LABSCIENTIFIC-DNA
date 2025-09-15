# LIMS Deployment Guide

This guide covers all deployment scenarios for the Laboratory Information Management System (LIMS).

## Architecture Overview

The LIMS application uses a microservices architecture with:
- **Frontend**: React/Vue.js application served via Nginx
- **Backend**: Node.js API server
- **Database**: PostgreSQL with persistent storage
- **Infrastructure**: Kubernetes (K3s) with ArgoCD for GitOps

## Infrastructure Setup

### Server1 (Production K3s Cluster)
- **Services**: K3s, ArgoCD, Jenkins
- **Role**: Production Kubernetes cluster with CI/CD
- **Access**: Via Cloudflare Tunnels

### Server2 (Staging/Development)
- **Services**: Docker Compose setup
- **Role**: Staging environment and local development
- **Access**: Direct SSH access

## Prerequisites

### Required Tools
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install ArgoCD CLI
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
```

### Environment Variables
Create a `.env` file with required secrets:
```env
# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=lims_db
DATABASE_USER=lims_user
DATABASE_PASSWORD=your_secure_password

# Docker Registry (for production)
DOCKER_REGISTRY=localhost:5000
DOCKER_USERNAME=admin
DOCKER_PASSWORD=your_registry_password

# ArgoCD Configuration
ARGOCD_SERVER=argocd.example.com
ARGOCD_TOKEN=your_argocd_token

# GitHub Configuration (for CI/CD)
GITHUB_TOKEN=your_github_token
```

## Deployment Methods

### 1. Local Development with Docker Compose

For local development and testing:

```bash
# Clone the repository
git clone https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA.git
cd JAG-LABSCIENTIFIC-DNA

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Services Available:**
- Frontend: http://localhost (port 80)
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 2. Server2 (Staging) Deployment

Deploy to Server2 for staging:

```bash
# SSH to Server2
ssh user@server2

# Pull latest changes
cd /path/to/lims
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose pull
docker-compose up -d

# Check deployment
docker-compose ps
docker-compose logs -f
```

### 3. Server1 (Production) K3s Deployment

#### Initial Setup

1. **Install ArgoCD Application**
```bash
# Apply the ArgoCD application
kubectl apply -f argocd/application.yaml

# Verify application is created
argocd app list
```

2. **Deploy Infrastructure**
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n lims

# Deploy backend
kubectl apply -f k8s/backend.yaml

# Deploy frontend
kubectl apply -f k8s/frontend.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

3. **Verify Deployment**
```bash
# Check all pods are running
kubectl get pods -n lims

# Check services
kubectl get services -n lims

# Check ingress
kubectl get ingress -n lims

# View application logs
kubectl logs -f deployment/lims-backend -n lims
kubectl logs -f deployment/lims-frontend -n lims
```

#### GitOps Sync
ArgoCD automatically syncs from the Git repository:

```bash
# Manual sync if needed
argocd app sync lims

# Check application status
argocd app get lims

# View sync history
argocd app history lims
```

## CI/CD Pipeline

### Jenkins Pipeline

The Jenkins pipeline automatically:
1. Builds Docker images for backend and frontend
2. Pushes images to local registry (localhost:5000)
3. Updates Kubernetes manifests with new image tags
4. Commits changes back to Git
5. Triggers ArgoCD sync

**Jenkinsfile Stages:**
- Checkout: Pull source code
- Build Backend: Create backend Docker image
- Build Frontend: Create frontend Docker image
- Push Images: Push to localhost:5000 registry
- Update Manifests: Update image tags in K8s YAML
- Deploy: Apply to Kubernetes cluster
- Sync ArgoCD: Trigger GitOps sync

### GitHub Actions

GitHub Actions provides additional CI/CD capabilities:
1. **Build and Test**: Runs on every PR and push
2. **Build Images**: Creates Docker images for main branch
3. **Update Manifests**: Updates Kubernetes manifests
4. **Deploy Staging**: Deploys to Server2
5. **Sync Production**: Triggers ArgoCD for production

**Required Secrets in GitHub:**
- `DOCKER_REGISTRY`
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `ARGOCD_SERVER`
- `ARGOCD_TOKEN`
- `SERVER2_HOST`
- `SERVER2_USERNAME`
- `SERVER2_SSH_KEY`

## Database Management

### PostgreSQL Configuration

**Development/Staging:**
```yaml
environment:
  POSTGRES_DB: lims_db
  POSTGRES_USER: lims_user
  POSTGRES_PASSWORD: lims_password
```

**Production (Kubernetes):**
Uses ConfigMap and Secret for secure configuration:
```bash
# View database config
kubectl get configmap postgres-config -n lims -o yaml
kubectl get secret postgres-secret -n lims -o yaml
```

### Database Initialization

The backend automatically:
1. Connects to PostgreSQL on startup
2. Creates all required tables and indexes
3. Handles schema migrations
4. Falls back to SQLite if PostgreSQL unavailable

### Backup and Restore

```bash
# Backup database (production)
kubectl exec deployment/postgres -n lims -- pg_dump -U lims_user lims_db > lims_backup.sql

# Restore database
kubectl exec -i deployment/postgres -n lims -- psql -U lims_user -d lims_db < lims_backup.sql

# Backup database (local)
docker-compose exec postgres pg_dump -U lims_user lims_db > local_backup.sql
```

## Monitoring and Maintenance

### Health Checks

**Application Health:**
```bash
# Check application health
curl http://localhost:3001/health
curl http://lims.local/health

# Kubernetes health checks
kubectl get pods -n lims
kubectl describe pod <pod-name> -n lims
```

**Database Health:**
```bash
# PostgreSQL connection test
kubectl exec deployment/postgres -n lims -- pg_isready -U lims_user

# Local PostgreSQL test
docker-compose exec postgres pg_isready -U lims_user
```

### Logs and Debugging

```bash
# Application logs (Kubernetes)
kubectl logs -f deployment/lims-backend -n lims
kubectl logs -f deployment/lims-frontend -n lims

# Application logs (Docker Compose)
docker-compose logs -f backend
docker-compose logs -f frontend

# Database logs
kubectl logs -f deployment/postgres -n lims
```

### Scaling

```bash
# Scale backend replicas
kubectl scale deployment lims-backend --replicas=3 -n lims

# Scale frontend replicas
kubectl scale deployment lims-frontend --replicas=3 -n lims

# Check scaling status
kubectl get deployment -n lims
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Check PostgreSQL is running
kubectl get pods -n lims | grep postgres
# Verify connection string in backend logs
kubectl logs deployment/lims-backend -n lims | grep -i database
```

2. **Image Pull Errors**
```bash
# Check image exists in registry
docker pull localhost:5000/lims-backend:latest
# Verify registry connectivity
curl http://localhost:5000/v2/_catalog
```

3. **ArgoCD Sync Issues**
```bash
# Check ArgoCD application status
argocd app get lims
# Force sync
argocd app sync lims --force
```

4. **Ingress/DNS Issues**
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
# Verify DNS resolution
nslookup lims.local
```

### Recovery Procedures

**Complete System Recovery:**
```bash
# 1. Stop all services
kubectl delete namespace lims

# 2. Recreate namespace and secrets
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml

# 3. Wait for database ready
kubectl wait --for=condition=available deployment/postgres -n lims

# 4. Restore database from backup
kubectl exec -i deployment/postgres -n lims -- psql -U lims_user -d lims_db < lims_backup.sql

# 5. Deploy applications
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

## Security Considerations

1. **Database Credentials**: Stored in Kubernetes secrets
2. **TLS/SSL**: Configure ingress with certificates
3. **Network Policies**: Restrict pod-to-pod communication
4. **RBAC**: Implement role-based access control
5. **Image Security**: Scan images for vulnerabilities

## Performance Optimization

1. **Resource Limits**: Set appropriate CPU/memory limits
2. **Database Indexing**: Optimize queries with proper indexes
3. **Caching**: Utilize Redis for session and data caching
4. **CDN**: Use Cloudflare for static asset delivery
5. **Monitoring**: Implement Prometheus/Grafana for metrics

## Support and Maintenance

- **Documentation**: Keep this guide updated with changes
- **Backups**: Schedule regular database backups
- **Updates**: Follow semantic versioning for releases
- **Security**: Apply security patches promptly
- **Monitoring**: Set up alerts for system issues

For additional support, check the project repository issues or contact the development team.