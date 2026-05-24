# Database Issues Runbook

## Symptoms

- Backend returning 503 errors
- `/health` endpoint showing `database: false`
- Slow API responses
- Connection timeout errors

## Quick Diagnosis

```bash
# 1. Check PostgreSQL pod status
kubectl get pods -n production -l app.kubernetes.io/name=postgresql

# 2. Check PostgreSQL logs
kubectl logs -n production -l app.kubernetes.io/name=postgresql --tail=100

# 3. Check backend database connection
kubectl exec -it deployment/lims-backend -n production -- \
  curl -s localhost:3001/health | jq .

# 4. Check PVC status
kubectl get pvc -n production
```

## Common Issues & Fixes

### Issue: PostgreSQL Pod Not Running

**Symptoms**: Pod in `CrashLoopBackOff` or `Pending`

```bash
# Check pod events
kubectl describe pod -n production -l app.kubernetes.io/name=postgresql

# Check if PVC is bound
kubectl get pvc -n production

# If PVC is Pending, check storage
kubectl get storageclass
kubectl get pv
```

**Fix**: Restart the pod

```bash
kubectl rollout restart statefulset/lims-postgresql -n production
```

### Issue: Connection Refused

**Symptoms**: Backend can't connect to database

```bash
# Verify service exists
kubectl get svc -n production | grep postgresql

# Test connectivity from backend pod
kubectl exec -it deployment/lims-backend -n production -- \
  nc -zv lims-postgresql 5432
```

**Fix**: Check service selector matches pod labels

```bash
kubectl describe svc lims-postgresql -n production
kubectl get pods -n production --show-labels | grep postgresql
```

### Issue: Too Many Connections

**Symptoms**: `FATAL: too many connections for role`

```bash
# Check current connections
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "SELECT count(*) FROM pg_stat_activity;"
```

**Fix**: Increase connection limit or restart backend to clear connections

```bash
# Restart backend to release connections
kubectl rollout restart deployment/lims-backend -n production
```

### Issue: Database Corruption

**Symptoms**: Data integrity errors, missing tables

```bash
# Check tables exist
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "\dt"

# Check for corruption
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "SELECT * FROM pg_catalog.pg_tables WHERE schemaname = 'public';"
```

**Fix**: Restore from backup (see [Disaster Recovery](./disaster-recovery.md))

## Database Restore Procedure

### From Automated Backup

```bash
# 1. List available backups
kubectl exec -it deployment/lims-backend -n production -- \
  ls -la /backups/

# 2. Create a restore job
kubectl create job postgres-restore-$(date +%s) \
  --from=cronjob/postgres-backup \
  -n production

# 3. Exec into restore pod and run restore
kubectl exec -it postgres-restore-xxx -n production -- \
  /scripts/restore.sh /backups/lims_db_YYYYMMDD_HHMMSS.sql.gz
```

### Manual Restore

```bash
# 1. Copy backup file to pod
kubectl cp backup.sql.gz production/lims-postgresql-0:/tmp/

# 2. Restore
kubectl exec -it lims-postgresql-0 -n production -- \
  bash -c "gunzip -c /tmp/backup.sql.gz | psql -U lims_user -d lims_db"
```

## Performance Tuning

### Check Slow Queries

```bash
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "
    SELECT pid, now() - pg_stat_activity.query_start AS duration, query
    FROM pg_stat_activity
    WHERE state != 'idle'
    ORDER BY duration DESC
    LIMIT 10;"
```

### Check Table Sizes

```bash
kubectl exec -it lims-postgresql-0 -n production -- \
  psql -U lims_user -d lims_db -c "
    SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
    LIMIT 10;"
```

## Escalation

If none of the above resolves the issue:

1. Check Vault for credential issues
2. Review recent deployments in ArgoCD
3. Check if network policies are blocking traffic
4. Escalate to database administrator
