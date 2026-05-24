# Application Errors Runbook

## Symptoms

- HTTP 5xx errors
- Health check failures
- API timeouts
- Frontend not loading

## Quick Diagnosis

```bash
# Check backend health
curl -s http://100.89.26.128:30007/health | jq .

# Check frontend
curl -sI http://100.89.26.128:30005 | head -5

# Check recent logs
kubectl logs deployment/lims-backend -n production --since=10m | grep -i error

# Check pod status
kubectl get pods -n production -l app.kubernetes.io/instance=lims
```

## Common Issues & Fixes

### Issue: Backend Health Check Failing

**Symptoms**: `/health` returns error or non-200

```bash
# Check health endpoint
curl -v http://100.89.26.128:30007/health

# Check readiness probe logs
kubectl describe pod -n production -l app.kubernetes.io/name=lims-backend | grep -A 10 "Readiness"
```

**Common health check failures**:

| Component | Status | Fix |
|-----------|--------|-----|
| `database: false` | DB connection failed | See [Database Issues](./database-issues.md) |
| `redis: false` | Redis connection failed | Check Redis pod |
| `disk: false` | Disk space low | Clean up disk |

### Issue: 500 Internal Server Error

**Symptoms**: API returns 500 errors

```bash
# Check backend logs for stack traces
kubectl logs deployment/lims-backend -n production --since=5m | grep -A 20 "Error:"

# Check for unhandled rejections
kubectl logs deployment/lims-backend -n production | grep -i "unhandled"
```

**Fixes**:

```bash
# 1. Restart backend
kubectl rollout restart deployment/lims-backend -n production

# 2. Check environment variables
kubectl exec -it deployment/lims-backend -n production -- env | sort

# 3. Check for missing config
kubectl get configmap -n production
kubectl get secrets -n production
```

### Issue: 502 Bad Gateway

**Symptoms**: Ingress returns 502

```bash
# Check ingress configuration
kubectl describe ingress -n production

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=50

# Test backend directly (bypassing ingress)
kubectl port-forward deployment/lims-backend -n production 3001:3001
curl localhost:3001/health
```

**Fixes**:

```bash
# 1. Check if backend pods are ready
kubectl get pods -n production -l app.kubernetes.io/name=lims-backend -o wide

# 2. Verify service endpoints
kubectl get endpoints -n production

# 3. Restart ingress controller
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx
```

### Issue: 503 Service Unavailable

**Symptoms**: No healthy backends

```bash
# Check if any pods are ready
kubectl get pods -n production -l app.kubernetes.io/name=lims-backend

# Check endpoints
kubectl describe endpoints lims-backend-service -n production
```

**Fixes**:

```bash
# 1. Check why pods aren't ready
kubectl describe pod -n production -l app.kubernetes.io/name=lims-backend

# 2. Check readiness probe
kubectl get deployment lims-backend -n production -o yaml | grep -A 10 readinessProbe

# 3. Temporarily disable readiness probe (emergency only)
kubectl patch deployment lims-backend -n production -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"backend","readinessProbe":null}]}}}}'
```

### Issue: Timeout Errors

**Symptoms**: Requests timing out

```bash
# Check response times
kubectl logs deployment/lims-backend -n production | grep -E "took [0-9]+ms" | tail -20

# Check for slow queries
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "
    SELECT pid, now() - query_start AS duration, query
    FROM pg_stat_activity
    WHERE state = 'active' AND now() - query_start > interval '5 seconds';"
```

**Fixes**:

```bash
# 1. Scale out backend
kubectl scale deployment/lims-backend -n production --replicas=3

# 2. Increase timeout in ingress
kubectl annotate ingress lims-ingress -n production \
  nginx.ingress.kubernetes.io/proxy-read-timeout="300"
```

### Issue: Frontend Not Loading

**Symptoms**: White screen, JS errors

```bash
# Check frontend pod
kubectl get pods -n production -l app.kubernetes.io/name=lims-frontend

# Check frontend logs
kubectl logs deployment/lims-frontend -n production --tail=50

# Check if static files are being served
curl -I http://100.89.26.128:30005/index.html
```

**Fixes**:

```bash
# 1. Restart frontend
kubectl rollout restart deployment/lims-frontend -n production

# 2. Check nginx configuration
kubectl exec -it deployment/lims-frontend -n production -- cat /etc/nginx/conf.d/default.conf

# 3. Verify build artifacts
kubectl exec -it deployment/lims-frontend -n production -- ls -la /usr/share/nginx/html
```

## Log Analysis

### Search for errors

```bash
# All errors in last hour
kubectl logs deployment/lims-backend -n production --since=1h | grep -i error | sort | uniq -c | sort -rn

# Stack traces
kubectl logs deployment/lims-backend -n production --since=1h | grep -A 5 "at "

# Specific endpoint errors
kubectl logs deployment/lims-backend -n production | grep "POST /api/samples" | grep -E "5[0-9]{2}"
```

### Export logs for analysis

```bash
# Export to file
kubectl logs deployment/lims-backend -n production --since=1h > backend-logs.txt

# Send to Loki (if configured)
kubectl logs deployment/lims-backend -n production | \
  curl -X POST -H "Content-Type: application/json" \
  -d @- http://100.103.13.92:3100/loki/api/v1/push
```

## Escalation

If application errors persist:

1. Check recent code deployments
2. Review application metrics in Grafana
3. Check external dependencies (APIs, services)
4. Engage development team for code-level issues
