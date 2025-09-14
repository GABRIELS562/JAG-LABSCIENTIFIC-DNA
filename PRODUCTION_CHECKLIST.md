# JAG DNA LIMS - Production Deployment Checklist

## 🚀 Production-Ready LIMS with PostgreSQL

This checklist ensures a successful production deployment of the JAG DNA Scientific LIMS with PostgreSQL database.

## ✅ Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] Kubernetes cluster is running and accessible
- [ ] kubectl is configured and can access the cluster
- [ ] Docker is installed and running
- [ ] Local registry is available (localhost:5000) or external registry is configured
- [ ] Sufficient cluster resources:
  - [ ] Minimum 4GB RAM available
  - [ ] Minimum 2 CPU cores available
  - [ ] Minimum 20GB storage available

### Security Preparation
- [ ] Review and update default passwords in deployment script:
  - [ ] Database password: `lims2024secure` → Generate secure password
  - [ ] JWT secret: Generate cryptographically secure secret
  - [ ] Admin password: Generate secure password
- [ ] Configure TLS certificates if using Ingress
- [ ] Review network policies and firewall rules
- [ ] Set up proper RBAC if required

### Configuration Review
- [ ] Environment variables are properly configured
- [ ] Database connection parameters are correct
- [ ] Resource limits are appropriate for your environment
- [ ] Storage class is available for PostgreSQL persistent volumes
- [ ] Ingress controller is installed (if using external access)

## 📋 Deployment Steps

### 1. Build and Deploy
```bash
# Full deployment (recommended for first deployment)
./deploy-lims-production-postgresql.sh

# Or step-by-step:
# Build only
./deploy-lims-production-postgresql.sh build-only

# Deploy only (after build)
./deploy-lims-production-postgresql.sh deploy-only
```

### 2. Verify Deployment
```bash
# Check deployment status
./deploy-lims-production-postgresql.sh status

# Check all pods are running
kubectl get pods -n production

# Check services
kubectl get services -n production

# View logs
kubectl logs -f deployment/lims-app -n production
kubectl logs -f statefulset/postgresql -n production
```

### 3. Test Connectivity
```bash
# Get access URL
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
NODE_PORT=30001

# Test health endpoint
curl http://$NODE_IP:$NODE_PORT/health

# Test API endpoint
curl http://$NODE_IP:$NODE_PORT/api/test

# Test database connectivity
kubectl exec -n production deployment/lims-app -- curl -f http://localhost:3001/ready
```

## 🔧 Production Configuration Details

### Dockerfile Optimizations
- ✅ Multi-stage build for smaller image size
- ✅ Non-root user for security
- ✅ Health checks implemented
- ✅ Frontend built at build time (not runtime)
- ✅ PostgreSQL client included
- ✅ dumb-init for proper signal handling

### Kubernetes Features
- ✅ ConfigMap for database configuration
- ✅ Secrets for sensitive data
- ✅ Init container to wait for PostgreSQL
- ✅ Health and readiness probes
- ✅ Resource limits and requests
- ✅ Horizontal Pod Autoscaler
- ✅ Network policies for security
- ✅ Pod Disruption Budget
- ✅ Persistent storage for PostgreSQL

### Database Management
- ✅ PostgreSQL 15 with optimized configuration
- ✅ Connection pooling (2-20 connections)
- ✅ Persistent storage with StatefulSet
- ✅ Database initialization and schema management
- ✅ Graceful connection handling

### Monitoring & Observability
- ✅ Prometheus metrics endpoint (/metrics)
- ✅ Health checks (live, ready, startup)
- ✅ Structured logging
- ✅ ServiceMonitor for Prometheus Operator
- ✅ Resource monitoring

## 🛠️ Troubleshooting Guide

### Common Issues and Solutions

#### 1. Pod Stuck in Pending State
```bash
kubectl describe pod <pod-name> -n production
# Check for resource constraints or scheduling issues
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL logs
kubectl logs -f statefulset/postgresql -n production

# Test database connectivity from app pod
kubectl exec -it deployment/lims-app -n production -- bash
psql -h postgresql.production.svc.cluster.local -U lims_user -d limsdb
```

#### 3. Application Not Starting
```bash
# Check application logs
kubectl logs -f deployment/lims-app -n production

# Check environment variables
kubectl exec deployment/lims-app -n production -- env | grep DB_
```

#### 4. Health Check Failures
```bash
# Test health endpoints manually
kubectl exec deployment/lims-app -n production -- curl http://localhost:3001/health
kubectl exec deployment/lims-app -n production -- curl http://localhost:3001/ready
```

### Useful Commands
```bash
# Port forward for local access
kubectl port-forward svc/lims-service 3001:3001 -n production

# Scale deployment
kubectl scale deployment lims-app --replicas=3 -n production

# Rolling restart
kubectl rollout restart deployment/lims-app -n production

# View resource usage
kubectl top pods -n production
kubectl top nodes

# Backup database
kubectl exec -n production statefulset/postgresql -- pg_dump -U lims_user limsdb > backup.sql

# Restore database
kubectl exec -i -n production statefulset/postgresql -- psql -U lims_user -d limsdb < backup.sql
```

## 🔐 Security Hardening

### Immediate Actions
- [ ] Change all default passwords
- [ ] Configure proper TLS certificates
- [ ] Enable audit logging
- [ ] Set up network policies
- [ ] Configure RBAC

### Production Security
- [ ] Use external secret management (e.g., Vault, AWS Secrets Manager)
- [ ] Enable Pod Security Standards
- [ ] Configure image scanning
- [ ] Set up vulnerability monitoring
- [ ] Implement backup strategy

## 📈 Performance Optimization

### Database Performance
- [ ] Monitor query performance
- [ ] Adjust PostgreSQL configuration for workload
- [ ] Set up connection pooler (PgBouncer) if needed
- [ ] Configure proper indexes

### Application Performance
- [ ] Monitor memory usage patterns
- [ ] Adjust HPA settings based on actual usage
- [ ] Optimize resource requests and limits
- [ ] Monitor response times

## 📊 Monitoring Setup

### Prometheus Metrics
The application exposes metrics at:
- `/metrics` - Prometheus format metrics
- `/api/devops-metrics` - Application-specific metrics

### Grafana Dashboard
Import the provided dashboard for comprehensive monitoring:
- Application metrics
- Database performance
- Resource utilization
- Error rates

## 🔄 Maintenance

### Regular Tasks
- [ ] Update application images regularly
- [ ] Monitor disk usage and clean logs
- [ ] Backup database regularly
- [ ] Update secrets/certificates before expiry
- [ ] Review and update resource allocations

### Disaster Recovery
- [ ] Test backup and restore procedures
- [ ] Document recovery steps
- [ ] Maintain off-site backups
- [ ] Test failover scenarios

## 📞 Support

### Getting Help
1. Check application logs: `kubectl logs -f deployment/lims-app -n production`
2. Check database logs: `kubectl logs -f statefulset/postgresql -n production`
3. Review this checklist for common issues
4. Check resource usage: `kubectl top pods -n production`

### Cleanup (if needed)
```bash
# Remove entire deployment
./deploy-lims-production-postgresql.sh cleanup

# Or manually
kubectl delete namespace production
```

---

## ✅ Deployment Success Criteria

Your deployment is successful when:
- [ ] All pods are in Running state
- [ ] Health checks pass consistently
- [ ] Database connectivity is established
- [ ] Application responds to HTTP requests
- [ ] Metrics are being exposed
- [ ] Logs show no critical errors

**URL Access Points:**
- Application: `http://<NODE_IP>:30001`
- Health: `http://<NODE_IP>:30001/health`
- API Test: `http://<NODE_IP>:30001/api/test`
- Metrics: `http://<NODE_IP>:30001/metrics`

🎉 **Congratulations!** Your JAG DNA Scientific LIMS is now running in production with PostgreSQL!