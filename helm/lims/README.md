# LIMS Helm Chart

A Helm chart for deploying the Laboratory Information Management System (LIMS) for DNA analysis.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- PV provisioner support (for PostgreSQL persistence)

## Installing the Chart

### Add Bitnami Repository (for PostgreSQL dependency)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### Update Dependencies

```bash
cd helm/lims
helm dependency update
```

### Install

```bash
# Test environment
helm install lims-test ./helm/lims \
  -n test \
  -f helm/lims/values-test.yaml

# Develop environment
helm install lims-develop ./helm/lims \
  -n develop \
  -f helm/lims/values-develop.yaml

# Production environment
helm install lims ./helm/lims \
  -n production \
  -f helm/lims/values-production.yaml \
  --set postgresql.auth.password=<secure-password> \
  --set postgresql.auth.postgresPassword=<secure-admin-password>
```

## Upgrading the Chart

```bash
helm upgrade lims ./helm/lims \
  -n production \
  -f helm/lims/values-production.yaml
```

## Uninstalling the Chart

```bash
helm uninstall lims -n production
```

## Configuration

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.environment` | Environment name | `production` |
| `global.imageRegistry` | Docker registry | `localhost:5000` |

### Backend Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.enabled` | Enable backend deployment | `true` |
| `backend.replicaCount` | Number of replicas | `2` |
| `backend.image.repository` | Image repository | `lims-backend` |
| `backend.image.tag` | Image tag | `latest` |
| `backend.service.type` | Service type | `ClusterIP` |
| `backend.service.port` | Service port | `3001` |
| `backend.service.nodePort` | NodePort (if type=NodePort) | `null` |
| `backend.resources` | Resource limits/requests | See values.yaml |

### Frontend Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `frontend.enabled` | Enable frontend deployment | `true` |
| `frontend.replicaCount` | Number of replicas | `2` |
| `frontend.image.repository` | Image repository | `lims-frontend` |
| `frontend.image.tag` | Image tag | `latest` |
| `frontend.service.type` | Service type | `ClusterIP` |
| `frontend.service.port` | Service port | `80` |
| `frontend.service.nodePort` | NodePort (if type=NodePort) | `null` |

### PostgreSQL Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable Bitnami PostgreSQL | `true` |
| `postgresql.auth.database` | Database name | `lims_db` |
| `postgresql.auth.username` | Database user | `lims_user` |
| `postgresql.auth.password` | Database password | `lims_password` |
| `postgresql.primary.persistence.size` | PVC size | `5Gi` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.hosts` | Ingress hosts configuration | See values.yaml |
| `ingress.tls` | TLS configuration | `[]` |

### Monitoring Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `serviceMonitor.enabled` | Enable ServiceMonitor | `false` |
| `serviceMonitor.interval` | Scrape interval | `30s` |
| `serviceMonitor.path` | Metrics path | `/metrics` |

### Autoscaling Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable HPA | `false` |
| `autoscaling.minReplicas` | Minimum replicas | `2` |
| `autoscaling.maxReplicas` | Maximum replicas | `5` |
| `autoscaling.targetCPUUtilizationPercentage` | CPU threshold | `80` |

## Environment-Specific Deployments

### Test (feature/* branches)
- 1 replica each
- NodePort: Backend 30101, Frontend 30102
- Minimal resources
- ServiceMonitor enabled

### Develop (develop branch)
- 1 replica each
- NodePort: Backend 30201, Frontend 30202
- Moderate resources
- ServiceMonitor enabled

### Production (main branch)
- 2+ replicas with HPA
- NodePort: Backend 30007, Frontend 30005
- Full resources
- TLS enabled
- PDB enabled
- ServiceMonitor enabled

## Accessing the Application

### Via NodePort
```bash
# Get node IP
kubectl get nodes -o wide

# Access
curl http://<node-ip>:30007/health  # Backend
curl http://<node-ip>:30005         # Frontend
```

### Via Port-Forward
```bash
kubectl port-forward svc/lims-backend 3001:3001 -n production
kubectl port-forward svc/lims-frontend 8080:80 -n production
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n production -l app.kubernetes.io/name=lims
```

### View logs
```bash
kubectl logs -n production -l app.kubernetes.io/component=backend -f
```

### Describe deployment
```bash
kubectl describe deployment lims-backend -n production
```
