# Disaster Recovery Runbook

## Overview

This runbook covers procedures for recovering from major incidents including:
- Complete cluster failure
- Database corruption
- Data loss
- Infrastructure destruction

## Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Single pod failure | 5 min | 0 |
| Database failure | 30 min | 24 hours (daily backup) |
| Node failure | 1 hour | 0 |
| Complete cluster failure | 4 hours | 24 hours |

## Prerequisites

- Access to backup storage
- SSH access to servers
- Tailscale configured
- ArgoCD credentials
- GHCR access for container images

## Scenario 1: Single Pod/Deployment Recovery

### Symptoms
- Individual pods failing
- Single deployment unhealthy

### Recovery

```bash
# 1. Check current state
kubectl get pods -n production
kubectl describe pod <failing-pod> -n production

# 2. Force restart deployment
kubectl rollout restart deployment/lims-backend -n production

# 3. If restart fails, rollback
kubectl rollout undo deployment/lims-backend -n production

# 4. Verify recovery
kubectl get pods -n production
curl http://100.89.26.128:30007/health
```

## Scenario 2: Database Recovery

### Symptoms
- Database pod not starting
- Data corruption
- Accidental data deletion

### Recovery from Backup

```bash
# 1. Stop the backend to prevent writes
kubectl scale deployment/lims-backend -n production --replicas=0

# 2. List available backups
kubectl exec -it deployment/postgres-backup-manual -n production -- ls -la /backups/

# 3. Find the most recent good backup
kubectl exec -it deployment/postgres-backup-manual -n production -- \
  /scripts/verify.sh

# 4. Restore the database
kubectl create job postgres-restore-$(date +%s) \
  --from=cronjob/postgres-backup \
  -n production

kubectl exec -it postgres-restore-xxx -n production -- \
  /scripts/restore.sh /backups/lims_db_YYYYMMDD_HHMMSS.sql.gz

# 5. Verify data
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "SELECT COUNT(*) FROM samples;"

# 6. Restart backend
kubectl scale deployment/lims-backend -n production --replicas=2

# 7. Verify application
curl http://100.89.26.128:30007/health
```

### Recovery from GHCR Images (if on-prem registry lost)

```bash
# 1. Update Helm values to use GHCR
cat <<EOF > /tmp/ghcr-override.yaml
global:
  imageRegistry: ghcr.io/gabriels562
backend:
  image:
    repository: lims-backend
    tag: latest
frontend:
  image:
    repository: lims-frontend
    tag: latest
EOF

# 2. Deploy using GHCR images
helm upgrade lims ./helm/lims -n production -f /tmp/ghcr-override.yaml
```

## Scenario 3: Complete Cluster Recovery

### Prerequisites Checklist
- [ ] Server accessible via SSH
- [ ] Tailscale configured
- [ ] GitHub repo access
- [ ] ArgoCD credentials
- [ ] Database backup available

### Step 1: Reinstall K3s

```bash
# SSH to server
ssh server1

# Remove existing K3s (if corrupted)
/usr/local/bin/k3s-uninstall.sh

# Reinstall K3s
curl -sfL https://get.k3s.io | sh -s - server \
  --disable traefik \
  --write-kubeconfig-mode 644

# Verify installation
kubectl get nodes
```

### Step 2: Restore Core Components

```bash
# From your workstation with Terragrunt
cd terraform/live/production

# Initialize and apply
terragrunt init
terragrunt apply

# Or manually install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### Step 3: Restore Applications via ArgoCD

```bash
# Login to ArgoCD
argocd login 100.89.26.128:30338 --username admin --password <password> --insecure

# Apply ArgoCD application configs
kubectl apply -f argocd/applications/lims-application.yaml

# Sync applications
argocd app sync lims --force
```

### Step 4: Restore Database

```bash
# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n production --timeout=300s

# Restore from backup (see Scenario 2)
```

### Step 5: Verify Full Recovery

```bash
# Check all pods
kubectl get pods -n production

# Verify health endpoints
curl http://100.89.26.128:30007/health
curl http://100.89.26.128:30005

# Check ArgoCD sync status
argocd app get lims

# Run smoke tests
cd backend && npm run smoke
```

## Scenario 4: Infrastructure Recreation (Terraform)

### Full Recreation

```bash
# Navigate to Terraform directory
cd terraform/live

# Destroy existing (if needed)
terragrunt run-all destroy

# Recreate all infrastructure
terragrunt run-all apply
```

### Verify Infrastructure

```bash
# Check outputs
terragrunt output

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

## Backup Verification Schedule

| Backup Type | Frequency | Verification |
|-------------|-----------|--------------|
| Database | Daily 2 AM | Weekly restore test |
| Configuration | Git (continuous) | Every deployment |
| Container images | Every build | Before deployment |

## Communication Plan

### During Incident

1. **Acknowledge** - Respond within SLA
2. **Assess** - Determine severity
3. **Communicate** - Update stakeholders
4. **Execute** - Follow this runbook
5. **Verify** - Confirm recovery
6. **Document** - Write incident report

### Post-Incident

1. Schedule post-mortem within 48 hours
2. Document root cause
3. Identify preventive measures
4. Update runbooks as needed

## Important Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-call Engineer | - | Primary |
| DevOps Lead | - | 30 min no response |
| Management | - | SEV1 only |

## Recovery Checklist

```
□ Incident acknowledged
□ Severity assessed
□ Stakeholders notified
□ Backup availability confirmed
□ Recovery procedure selected
□ Recovery executed
□ Services verified
□ Monitoring confirmed
□ Incident documented
□ Post-mortem scheduled
```
