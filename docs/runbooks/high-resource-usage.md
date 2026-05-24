# High Resource Usage Runbook

## Symptoms

- Prometheus alerts for high CPU/memory
- Pod evictions
- Slow application response
- Node NotReady status

## Quick Diagnosis

```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n production --sort-by=memory

# Check for evicted pods
kubectl get pods -A | grep Evicted

# Check node conditions
kubectl describe nodes | grep -A 5 Conditions
```

## Common Issues & Fixes

### Issue: High Memory Usage

**Symptoms**: Memory > 80%, OOMKilled pods

```bash
# Find memory-heavy pods
kubectl top pods -n production --sort-by=memory

# Check pod memory limits
kubectl describe pod <pod-name> -n production | grep -A 3 memory

# Check for memory leaks in logs
kubectl logs deployment/lims-backend -n production | grep -i "memory\|heap"
```

**Fixes**:

```bash
# 1. Restart the pod to clear memory
kubectl rollout restart deployment/lims-backend -n production

# 2. Scale horizontally (if HPA not working)
kubectl scale deployment/lims-backend -n production --replicas=3

# 3. Increase memory limits (temporary)
kubectl patch deployment lims-backend -n production -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"1Gi"}}}]}}}}'
```

### Issue: High CPU Usage

**Symptoms**: CPU > 80%, slow responses

```bash
# Find CPU-heavy pods
kubectl top pods -n production --sort-by=cpu

# Check HPA status
kubectl get hpa -n production

# Check if HPA is scaling
kubectl describe hpa lims-backend-hpa -n production
```

**Fixes**:

```bash
# 1. Check for runaway processes
kubectl exec -it deployment/lims-backend -n production -- top

# 2. Scale out
kubectl scale deployment/lims-backend -n production --replicas=4

# 3. Check for expensive queries (database)
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### Issue: Disk Pressure

**Symptoms**: Node shows `DiskPressure` condition

```bash
# Check node disk
kubectl describe node | grep -A 3 "disk pressure"

# Check PVC usage
kubectl exec -it lims-postgresql-0 -n production -- df -h /bitnami/postgresql

# Check container logs size
kubectl get pods -n production -o jsonpath='{.items[*].metadata.name}' | \
  xargs -I {} sh -c 'echo "--- {} ---"; kubectl logs {} -n production 2>&1 | wc -l'
```

**Fixes**:

```bash
# 1. Clean up old images on node
ssh server1 "docker system prune -af"

# 2. Delete completed/failed pods
kubectl delete pods -n production --field-selector=status.phase==Succeeded
kubectl delete pods -n production --field-selector=status.phase==Failed

# 3. Expand PVC (if supported)
kubectl patch pvc postgres-data -n production -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

### Issue: Pod Evictions

**Symptoms**: Pods being evicted

```bash
# Find evicted pods
kubectl get pods -A | grep Evicted

# Check eviction events
kubectl get events --sort-by='.lastTimestamp' -A | grep -i evict

# Check resource quotas
kubectl describe resourcequota -n production
```

**Fixes**:

```bash
# 1. Delete evicted pods
kubectl delete pods -n production --field-selector=status.phase==Failed

# 2. Add pod priority
kubectl patch deployment lims-backend -n production -p \
  '{"spec":{"template":{"spec":{"priorityClassName":"high-priority"}}}}'

# 3. Adjust PodDisruptionBudget
kubectl get pdb -n production
```

## Scaling Procedures

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment/lims-backend -n production --replicas=3

# Verify scaling
kubectl get pods -n production -l app.kubernetes.io/name=lims-backend
```

### HPA Tuning

```bash
# Check current HPA
kubectl get hpa -n production -o yaml

# Adjust HPA thresholds
kubectl patch hpa lims-backend-hpa -n production -p \
  '{"spec":{"targetCPUUtilizationPercentage":70}}'
```

## Performance Optimization

### Database Optimization

```bash
# Analyze tables
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "ANALYZE;"

# Check for missing indexes
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "
    SELECT schemaname, tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public';"
```

### Application Optimization

```bash
# Check Node.js memory
kubectl exec -it deployment/lims-backend -n production -- \
  node -e "console.log(process.memoryUsage())"

# Enable garbage collection logging (requires restart)
kubectl set env deployment/lims-backend -n production NODE_OPTIONS="--expose-gc"
```

## Alerts Configuration

Ensure these Prometheus alerts are configured:

```yaml
# High memory usage
- alert: HighMemoryUsage
  expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.8
  for: 5m
  labels:
    severity: warning

# High CPU usage
- alert: HighCPUUsage
  expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
  for: 5m
  labels:
    severity: warning

# Pod eviction imminent
- alert: PodEvictionImminent
  expr: kube_node_status_condition{condition="MemoryPressure",status="true"} == 1
  for: 1m
  labels:
    severity: critical
```

## Escalation

If resource issues persist:

1. Consider vertical scaling (larger nodes)
2. Review application for optimization opportunities
3. Consider splitting workloads across nodes
4. Review recent changes that may have increased load
