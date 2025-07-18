# LabScientific LIMS - Kubernetes Infrastructure

This directory contains comprehensive Kubernetes configurations for the LabScientific LIMS (Laboratory Information Management System) application, demonstrating production-ready container orchestration with advanced features.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Deployment Options](#deployment-options)
- [Configuration Management](#configuration-management)
- [Security Features](#security-features)
- [Monitoring & Observability](#monitoring--observability)
- [Networking](#networking)
- [Storage](#storage)
- [Scaling](#scaling)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## 🏗️ Overview

This Kubernetes implementation provides a production-ready, scalable, and secure deployment of the LIMS application with:

- **High Availability**: Multi-replica deployments with anti-affinity rules
- **Auto-scaling**: HPA and VPA for dynamic resource management
- **Security**: Network policies, RBAC, and security contexts
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Observability**: Distributed tracing and comprehensive logging
- **Service Mesh**: Istio integration for advanced traffic management
- **CI/CD Ready**: GitOps-friendly configurations

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Internet / Load Balancer                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                    ┌─────▼─────┐
                    │  Ingress  │
                    │Controller │
                    └─────┬─────┘
                          │
        ┌─────────────────▼─────────────────┐
        │            Service Mesh           │
        │              (Istio)              │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │          LIMS Application         │
        │    ┌─────────┐  ┌─────────┐      │
        │    │  Pod 1  │  │  Pod 2  │      │
        │    │   App   │  │   App   │      │
        │    │ Worker  │  │ Worker  │      │
        │    └─────────┘  └─────────┘      │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │            Data Layer             │
        │  ┌─────────┐  ┌─────────┐        │
        │  │PostgreSQL│  │  Redis  │        │
        │  │StatefulSet│  │StatefulSet│      │
        │  └─────────┘  └─────────┘        │
        └───────────────────────────────────┘
```

## 📋 Prerequisites

### Required Tools
- **Kubernetes cluster** (v1.23+)
- **kubectl** (v1.23+)
- **Helm** (v3.8+)
- **Docker** (for building images)

### Optional Tools
- **Kustomize** (for configuration management)
- **Istio** (for service mesh)
- **Prometheus** (for monitoring)
- **Grafana** (for dashboards)

### Cluster Requirements
- **Minimum 3 nodes** for high availability
- **8 CPU cores** and **16GB RAM** per node
- **100GB storage** per node
- **Network policies** support
- **Ingress controller** (NGINX recommended)

## 📁 Directory Structure

```
k8s/
├── README.md                    # This file
├── namespace.yaml              # Namespace configuration
├── rbac.yaml                   # RBAC and service accounts
├── configmap.yaml              # Configuration management
├── secrets.yaml                # Secret management (examples)
├── pvc.yaml                    # Persistent volume claims
├── deployment.yaml             # Basic deployment configuration
├── service.yaml                # Service definitions
├── ingress.yaml                # Ingress configurations
├── hpa.yaml                    # Horizontal Pod Autoscaler
├── network-policies.yaml       # Network security policies
├── pod-security-policies.yaml  # Pod security policies
├── enhanced/                   # Advanced configurations
│   ├── statefulset.yaml        # StatefulSet for databases
│   ├── deployment-advanced.yaml # Production-ready deployment
│   ├── services-advanced.yaml  # Advanced service configurations
│   └── ingress-advanced.yaml   # Comprehensive ingress setup
├── overlays/                   # Kustomize overlays
│   ├── dev/
│   ├── staging/
│   └── prod/
└── monitoring/                 # Monitoring configurations
    ├── servicemonitor.yaml
    ├── prometheusrule.yaml
    └── grafana-dashboard.yaml
```

## 🚀 Quick Start

### 1. Basic Deployment

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Apply basic configuration
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f pvc.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### 2. Using Deployment Script

```bash
# Deploy to development
./scripts/kubernetes/deploy-k8s.sh -e dev -t helm

# Deploy to production with custom values
./scripts/kubernetes/deploy-k8s.sh -e prod -t helm -f values-prod.yaml

# Dry run deployment
./scripts/kubernetes/deploy-k8s.sh -e staging -t helm -d
```

### 3. Using Helm Chart

```bash
# Add dependencies
helm dependency update ./helm/lims/

# Deploy with Helm
helm install lims ./helm/lims/ \
  --namespace labscientific-lims \
  --create-namespace \
  --values helm/lims/values-advanced.yaml
```

## 🔧 Deployment Options

### Option 1: Helm (Recommended)
- **Pros**: Template-based, dependency management, easy upgrades
- **Cons**: Additional complexity, requires Helm knowledge
- **Best for**: Production deployments, complex configurations

### Option 2: Raw Manifests
- **Pros**: Simple, direct control, no additional tools
- **Cons**: Hard to maintain, no templating
- **Best for**: Simple deployments, learning

### Option 3: Kustomize
- **Pros**: Configuration overlays, built into kubectl
- **Cons**: Limited templating, YAML-heavy
- **Best for**: GitOps workflows, environment-specific configs

## ⚙️ Configuration Management

### Environment-Specific Configuration

```yaml
# dev environment
replicas: 1
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"

# prod environment
replicas: 5
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "8Gi"
    cpu: "4000m"
```

### ConfigMap Management

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lims-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  DATABASE_URL: "postgresql://user:pass@postgres:5432/lims"
  REDIS_URL: "redis://redis:6379"
```

### Secret Management

```bash
# Create secrets from command line
kubectl create secret generic lims-secrets \
  --from-literal=postgres-password='secure-password' \
  --from-literal=redis-password='redis-password' \
  --from-literal=jwt-secret='jwt-secret-key'

# Using external secrets operator
kubectl apply -f external-secrets.yaml
```

## 🔐 Security Features

### Network Policies
- **Ingress Control**: Allow only necessary traffic
- **Egress Control**: Restrict outbound connections
- **Namespace Isolation**: Separate environments
- **Service-to-Service**: Control inter-service communication

### RBAC Configuration
- **Service Accounts**: Dedicated accounts per component
- **Role-Based Access**: Minimum required permissions
- **Cluster Roles**: Cross-namespace access where needed
- **Binding Management**: Proper role assignments

### Pod Security
- **Security Contexts**: Non-root containers
- **Read-Only Filesystem**: Where possible
- **Capability Dropping**: Remove unnecessary capabilities
- **Seccomp Profiles**: Runtime security profiles

### Example Security Configuration

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
    add:
      - NET_BIND_SERVICE
  seccompProfile:
    type: RuntimeDefault
```

## 📊 Monitoring & Observability

### Prometheus Metrics
- **Application Metrics**: Custom business metrics
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Kubernetes Metrics**: Pod, node, cluster metrics
- **Custom Alerts**: Business-specific alerting rules

### Grafana Dashboards
- **Application Dashboard**: Request rates, latency, errors
- **Infrastructure Dashboard**: Resource utilization
- **Business Dashboard**: LIMS-specific metrics
- **Alerting Dashboard**: Current alerts and status

### Distributed Tracing
- **Jaeger Integration**: Request tracing across services
- **Correlation IDs**: Track requests end-to-end
- **Performance Analysis**: Identify bottlenecks
- **Dependency Mapping**: Service relationship visualization

### Example Monitoring Configuration

```yaml
monitoring:
  enabled: true
  prometheus:
    enabled: true
    port: 9090
    path: /metrics
    serviceMonitor:
      enabled: true
      interval: 30s
  
  alerts:
    - name: HighCPUUsage
      condition: cpu > 80%
      duration: 5m
      severity: warning
    
    - name: ServiceDown
      condition: up == 0
      duration: 1m
      severity: critical
```

## 🌐 Networking

### Service Types
- **ClusterIP**: Internal services (databases, cache)
- **NodePort**: Development access
- **LoadBalancer**: External access in cloud environments
- **ExternalName**: External service references

### Ingress Configuration
- **SSL/TLS Termination**: Automatic certificate management
- **Path-Based Routing**: Route by URL path
- **Host-Based Routing**: Route by hostname
- **Rate Limiting**: Protect against abuse
- **Authentication**: Basic auth, OAuth integration

### Service Mesh (Istio)
- **Traffic Management**: Canary deployments, blue-green
- **Security**: mTLS, authorization policies
- **Observability**: Automatic metrics and tracing
- **Resilience**: Circuit breakers, retries, timeouts

## 💾 Storage

### Persistent Volume Claims
- **Database Storage**: High-performance SSDs
- **Application Data**: General-purpose storage
- **Log Storage**: Fast access for debugging
- **Backup Storage**: Long-term archival

### Storage Classes
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  encrypted: "true"
  fsType: ext4
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## 📈 Scaling

### Horizontal Pod Autoscaler (HPA)
- **CPU-based scaling**: Scale based on CPU utilization
- **Memory-based scaling**: Scale based on memory usage
- **Custom metrics**: Scale based on business metrics
- **Predictive scaling**: Anticipate load changes

### Vertical Pod Autoscaler (VPA)
- **Resource right-sizing**: Optimize resource requests
- **Automatic updates**: Update containers with new resources
- **Recommendation mode**: Suggest optimal resources
- **Mixed mode**: Combine with HPA for comprehensive scaling

### Cluster Autoscaler
- **Node scaling**: Add/remove nodes based on demand
- **Multi-zone**: Scale across availability zones
- **Cost optimization**: Scale down unused nodes
- **Integration**: Works with cloud provider APIs

## 🔧 Maintenance

### Regular Tasks
- **Update images**: Keep container images up-to-date
- **Patch nodes**: Apply security patches
- **Monitor resources**: Track resource usage trends
- **Backup verification**: Ensure backups are working
- **Certificate renewal**: Manage SSL/TLS certificates

### Upgrade Procedures
1. **Test in staging**: Validate changes in staging environment
2. **Rolling updates**: Use rolling update strategy
3. **Rollback plan**: Prepare rollback procedures
4. **Monitoring**: Watch metrics during updates
5. **Verification**: Validate functionality after updates

### Health Checks
- **Liveness probes**: Restart unhealthy containers
- **Readiness probes**: Control traffic routing
- **Startup probes**: Handle slow-starting containers
- **Custom health checks**: Application-specific validations

## 🔍 Troubleshooting

### Common Issues

#### Pod Startup Issues
```bash
# Check pod status
kubectl get pods -n labscientific-lims

# Check pod events
kubectl describe pod <pod-name> -n labscientific-lims

# Check logs
kubectl logs <pod-name> -n labscientific-lims
```

#### Network Connectivity
```bash
# Test service connectivity
kubectl run test-pod --rm -i --tty --image=busybox --restart=Never -- /bin/sh

# Inside the test pod
nslookup lims-app-service.labscientific-lims.svc.cluster.local
wget -O- http://lims-app-service.labscientific-lims.svc.cluster.local:3000/health
```

#### Resource Issues
```bash
# Check resource usage
kubectl top pods -n labscientific-lims
kubectl top nodes

# Check resource limits
kubectl describe pod <pod-name> -n labscientific-lims
```

#### Storage Issues
```bash
# Check PVC status
kubectl get pvc -n labscientific-lims

# Check storage events
kubectl describe pvc <pvc-name> -n labscientific-lims
```

### Debugging Commands

```bash
# Get all resources
kubectl get all -n labscientific-lims

# Check events
kubectl get events -n labscientific-lims --sort-by=.metadata.creationTimestamp

# Check resource usage
kubectl top pods -n labscientific-lims
kubectl top nodes

# Debug networking
kubectl exec -it <pod-name> -n labscientific-lims -- /bin/sh
```

## 📝 Best Practices

### Resource Management
- **Set resource requests and limits**: Ensure proper scheduling
- **Use quality of service classes**: Guaranteed, Burstable, BestEffort
- **Monitor resource usage**: Right-size containers
- **Plan for growth**: Anticipate scaling needs

### Security
- **Principle of least privilege**: Minimal required permissions
- **Network segmentation**: Use network policies
- **Image security**: Scan for vulnerabilities
- **Secrets management**: Use external secret stores
- **Regular updates**: Keep components up-to-date

### Operations
- **Infrastructure as Code**: Version control all configurations
- **GitOps workflows**: Automated deployments
- **Monitoring and alerting**: Proactive issue detection
- **Backup and recovery**: Regular backups and tested recovery
- **Documentation**: Keep documentation current

### Development
- **Environment parity**: Keep environments similar
- **Configuration externalization**: Use ConfigMaps and Secrets
- **Health checks**: Implement proper probes
- **Logging**: Structured logging for better observability
- **Testing**: Include deployment tests

## 🔗 Related Documentation

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Istio Documentation](https://istio.io/docs/)
- [LIMS Application Documentation](../README.md)

## 📞 Support

For issues with the Kubernetes deployment:

1. Check the [troubleshooting section](#troubleshooting)
2. Review application logs: `kubectl logs <pod-name> -n labscientific-lims`
3. Check cluster events: `kubectl get events -n labscientific-lims`
4. Create an issue in the project repository

---

**Note**: This Kubernetes configuration is designed for production use with comprehensive security, monitoring, and operational features. Ensure you understand the implications of each configuration before deploying to production.