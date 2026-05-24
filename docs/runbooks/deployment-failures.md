# Deployment Failures Runbook

## Symptoms

- GitHub Actions workflow failed
- ArgoCD sync failed or stuck
- Pods not starting after deployment
- Image pull errors

## Quick Diagnosis

```bash
# Check GitHub Actions status
gh run list --limit 5

# Check ArgoCD app status
argocd app get lims --grpc-web

# Check recent deployments
kubectl rollout history deployment/lims-backend -n production

# Check pod status
kubectl get pods -n production -l app.kubernetes.io/instance=lims
```

## Common Issues & Fixes

### Issue: GitHub Actions Build Failed

**Symptoms**: Workflow shows red X

```bash
# View failed run
gh run view <run-id> --log-failed
```

**Common causes & fixes**:

| Error | Cause | Fix |
|-------|-------|-----|
| `npm ci` failed | Dependency issue | Clear cache, update lockfile |
| Docker build failed | Dockerfile error | Check build logs |
| Trivy found vulnerabilities | Security issue | Review and fix vulnerabilities |
| Tailscale connection failed | VPN issue | Check Tailscale status |

```bash
# Re-run failed workflow
gh run rerun <run-id>
```

### Issue: Image Pull Error

**Symptoms**: `ErrImagePull` or `ImagePullBackOff`

```bash
# Check pod events
kubectl describe pod <pod-name> -n production | grep -A 10 Events

# Verify image exists in registry
curl -s http://localhost:5000/v2/lims-backend/tags/list

# Check GHCR
gh api user/packages/container/lims-backend/versions
```

**Fix**: Verify image tag and push if missing

```bash
# Check what tag ArgoCD is trying to use
argocd app get lims --grpc-web | grep image

# Manually push to registry if needed
docker pull ghcr.io/gabriels562/lims-backend:latest
docker tag ghcr.io/gabriels562/lims-backend:latest localhost:5000/lims-backend:latest
docker push localhost:5000/lims-backend:latest
```

### Issue: ArgoCD Sync Failed

**Symptoms**: App stuck in `OutOfSync` or `Degraded`

```bash
# Check sync status
argocd app get lims --grpc-web

# View sync errors
argocd app sync lims --grpc-web --dry-run

# Check ArgoCD logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=100
```

**Fix**: Force sync or rollback

```bash
# Force sync
argocd app sync lims --grpc-web --force

# Rollback to previous version
argocd app rollback lims <revision> --grpc-web

# Hard refresh
argocd app get lims --grpc-web --hard-refresh
```

### Issue: Pod CrashLoopBackOff

**Symptoms**: Pod keeps restarting

```bash
# Check pod logs
kubectl logs deployment/lims-backend -n production --previous

# Check resource limits
kubectl describe pod -n production -l app.kubernetes.io/name=lims-backend | grep -A 5 Limits
```

**Common causes**:

| Cause | Log Message | Fix |
|-------|-------------|-----|
| OOM Kill | `OOMKilled` | Increase memory limits |
| Missing env var | `undefined` errors | Check ConfigMap/Secrets |
| DB connection | `ECONNREFUSED` | Check database status |
| Port conflict | `EADDRINUSE` | Check for duplicate pods |

### Issue: Helm Upgrade Failed

**Symptoms**: `helm upgrade` times out or errors

```bash
# Check Helm release status
helm list -n production

# View release history
helm history lims -n production

# Rollback if needed
helm rollback lims <revision> -n production
```

## Rollback Procedures

### Rollback via ArgoCD

```bash
# List available revisions
argocd app history lims --grpc-web

# Rollback to specific revision
argocd app rollback lims <revision> --grpc-web
```

### Rollback via Helm

```bash
# List revisions
helm history lims -n production

# Rollback
helm rollback lims <revision> -n production
```

### Rollback via kubectl

```bash
# Rollback deployment
kubectl rollout undo deployment/lims-backend -n production

# Rollback to specific revision
kubectl rollout undo deployment/lims-backend -n production --to-revision=<rev>
```

## Post-Deployment Verification

```bash
# 1. Check all pods are running
kubectl get pods -n production -l app.kubernetes.io/instance=lims

# 2. Verify health endpoints
curl -s http://100.89.26.128:30007/health | jq .

# 3. Check recent logs for errors
kubectl logs deployment/lims-backend -n production --since=5m | grep -i error

# 4. Verify in ArgoCD
argocd app get lims --grpc-web
```

## Escalation

If deployment issues persist:

1. Check if changes were made to Helm values
2. Verify Kubernetes cluster health
3. Check node resources (disk, memory)
4. Review recent infrastructure changes
