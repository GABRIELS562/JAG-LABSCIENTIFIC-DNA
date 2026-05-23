# Kubernetes Namespaces

This directory contains namespace configurations for the LIMS application across different environments.

## Environment Mapping

| Branch | Namespace | Purpose |
|--------|-----------|---------|
| `feature/*` | `test` | Feature branch testing |
| `develop` | `develop` | Integration testing |
| `main` | `lims` (production) | Production deployment |

## Apply Namespaces

Run these commands on Server1 (192.168.50.100 / 100.89.26.128 via Tailscale):

```bash
# Create all namespaces
kubectl apply -f k8s/namespaces/

# Or apply individually
kubectl apply -f k8s/namespaces/test.yaml
kubectl apply -f k8s/namespaces/develop.yaml
kubectl apply -f k8s/namespaces/production.yaml

# Verify namespaces
kubectl get namespaces -l app.kubernetes.io/name=lims
```

## Resource Quotas

Each namespace has resource quotas to prevent runaway resource consumption:

| Namespace | CPU Request | Memory Request | CPU Limit | Memory Limit | Max Pods |
|-----------|------------|----------------|-----------|--------------|----------|
| test | 500m | 512Mi | 1 | 1Gi | 10 |
| develop | 1 | 1Gi | 2 | 2Gi | 15 |
| lims (prod) | 2 | 2Gi | 4 | 4Gi | 20 |

## Network Policies

Each namespace has network policies that:
- Allow traffic within the same namespace
- Allow DNS resolution (kube-system)
- Production allows external ingress for public access

## Verification

```bash
# Check resource quotas
kubectl get resourcequota -n test
kubectl get resourcequota -n develop
kubectl get resourcequota -n lims

# Check network policies
kubectl get networkpolicy -n test
kubectl get networkpolicy -n develop
kubectl get networkpolicy -n lims
```
