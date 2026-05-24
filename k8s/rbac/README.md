# Kubernetes RBAC Configuration

This directory contains Role-Based Access Control (RBAC) configurations for the JAG LabScientific LIMS cluster.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        RBAC HIERARCHY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ClusterRole                    ClusterRoleBinding              │
│   ┌─────────────┐               ┌─────────────────────┐         │
│   │ cluster-    │──────────────►│ cluster-admin-      │         │
│   │ admin       │               │ binding             │         │
│   └─────────────┘               └─────────────────────┘         │
│                                          │                       │
│                                          ▼                       │
│                                 ┌─────────────────────┐         │
│                                 │ User: admin         │         │
│                                 │ Group: system:admin │         │
│                                 └─────────────────────┘         │
│                                                                  │
│   Role (namespace-scoped)       RoleBinding                      │
│   ┌─────────────┐               ┌─────────────────────┐         │
│   │ developer   │──────────────►│ dev-team-binding    │         │
│   │ (production)│               │                     │         │
│   └─────────────┘               └─────────────────────┘         │
│                                          │                       │
│                                          ▼                       │
│                                 ┌─────────────────────┐         │
│                                 │ ServiceAccount:     │         │
│                                 │ developer-sa        │         │
│                                 └─────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Roles Defined

| Role | Scope | Permissions | Use Case |
|------|-------|-------------|----------|
| `cluster-admin` | Cluster | Full access | Platform admins |
| `namespace-admin` | Namespace | Full namespace access | Team leads |
| `developer` | Namespace | Deploy, view logs | Developers |
| `read-only` | Namespace | View resources | Auditors, support |
| `ci-deployer` | Namespace | Deploy workloads | CI/CD pipelines |
| `monitoring` | Cluster | Read metrics/logs | Monitoring tools |

## Files

| File | Description |
|------|-------------|
| `cluster-roles.yaml` | Cluster-wide role definitions |
| `namespace-roles.yaml` | Namespace-scoped roles |
| `service-accounts.yaml` | Service accounts for automation |
| `bindings.yaml` | Role and ClusterRole bindings |

## Applying RBAC

```bash
# Apply all RBAC configurations
kubectl apply -k k8s/rbac/

# Or apply individually
kubectl apply -f k8s/rbac/cluster-roles.yaml
kubectl apply -f k8s/rbac/namespace-roles.yaml
kubectl apply -f k8s/rbac/service-accounts.yaml
kubectl apply -f k8s/rbac/bindings.yaml
```

## Verifying Permissions

```bash
# Check what a user can do
kubectl auth can-i --list --as=developer

# Check specific action
kubectl auth can-i create pods --namespace=production --as=developer

# Check service account permissions
kubectl auth can-i --list --as=system:serviceaccount:production:ci-deployer
```

## Security Best Practices

1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Namespace Isolation**: Use namespace-scoped roles when possible
3. **Regular Audits**: Review RBAC configurations periodically
4. **Service Accounts**: Use dedicated SAs for each application
5. **No Wildcard Resources**: Avoid `*` in resource specifications
