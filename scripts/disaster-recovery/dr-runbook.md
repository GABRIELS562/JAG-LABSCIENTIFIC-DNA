# LIMS Disaster Recovery Runbook

## Table of Contents
1. [Overview](#overview)
2. [Emergency Contacts](#emergency-contacts)
3. [Disaster Recovery Procedures](#disaster-recovery-procedures)
4. [Backup Verification](#backup-verification)
5. [Recovery Testing](#recovery-testing)
6. [Post-Recovery Procedures](#post-recovery-procedures)
7. [Troubleshooting](#troubleshooting)

## Overview

This runbook provides step-by-step procedures for recovering the LIMS (Laboratory Information Management System) from various disaster scenarios.

### Recovery Time Objectives (RTO)
- **Critical Systems**: 2 hours
- **Database Recovery**: 1 hour
- **Full System Recovery**: 4 hours

### Recovery Point Objectives (RPO)
- **Database**: 1 hour (last backup)
- **Application State**: 15 minutes (last replication)
- **Configuration**: 5 minutes (GitOps sync)

## Emergency Contacts

### Primary Contacts
- **DevOps Lead**: +1-555-0101
- **Database Administrator**: +1-555-0102
- **Application Lead**: +1-555-0103
- **Security Lead**: +1-555-0104

### Secondary Contacts
- **Platform Team**: +1-555-0201
- **Infrastructure Team**: +1-555-0202
- **On-Call Engineer**: +1-555-0203

### Escalation
- **Engineering Manager**: +1-555-0301
- **CTO**: +1-555-0302

## Disaster Recovery Procedures

### Scenario 1: Complete Cluster Failure

#### Prerequisites
- Access to backup storage (S3)
- New Kubernetes cluster provisioned
- Velero installed and configured
- Network connectivity to backups

#### Steps

1. **Verify Backup Availability**
   ```bash
   # List available backups
   velero backup get --selector=app=lims
   
   # Check latest backup status
   velero backup describe <backup-name> --details
   ```

2. **Restore Namespaces and Resources**
   ```bash
   # Restore from latest backup
   velero restore create lims-disaster-recovery \
     --from-backup <latest-backup-name> \
     --wait
   
   # Monitor restore progress
   velero restore describe lims-disaster-recovery
   ```

3. **Verify Database Recovery**
   ```bash
   # Check database pods
   kubectl get pods -n labscientific-lims -l component=postgresql
   
   # Verify database connectivity
   kubectl exec -n labscientific-lims <postgres-pod> -- \
     psql -U postgres -d lims -c "SELECT COUNT(*) FROM samples;"
   ```

4. **Verify Application Recovery**
   ```bash
   # Check application pods
   kubectl get pods -n labscientific-lims -l component=app
   
   # Test application health
   kubectl exec -n labscientific-lims <app-pod> -- \
     curl -f http://localhost:3000/health
   ```

5. **Update DNS/Load Balancer**
   ```bash
   # Update DNS records to point to new cluster
   # This depends on your DNS provider
   
   # Verify ingress is working
   kubectl get ingress -n labscientific-lims
   ```

### Scenario 2: Database Corruption

#### Prerequisites
- Access to database backups
- Database administrator access
- Maintenance window scheduled

#### Steps

1. **Identify Corruption**
   ```bash
   # Check database logs
   kubectl logs -n labscientific-lims <postgres-pod>
   
   # Run database integrity check
   kubectl exec -n labscientific-lims <postgres-pod> -- \
     psql -U postgres -d lims -c "VACUUM ANALYZE;"
   ```

2. **Stop Application**
   ```bash
   # Scale down application
   kubectl scale deployment lims-app -n labscientific-lims --replicas=0
   
   # Verify no connections to database
   kubectl exec -n labscientific-lims <postgres-pod> -- \
     psql -U postgres -d lims -c "SELECT COUNT(*) FROM pg_stat_activity;"
   ```

3. **Restore Database**
   ```bash
   # Find latest backup
   BACKUP_FILE=$(find /backup/postgresql -name "lims_backup_*.sql.gz" | sort | tail -1)
   
   # Drop and recreate database
   kubectl exec -n labscientific-lims <postgres-pod> -- \
     psql -U postgres -c "DROP DATABASE lims;"
   kubectl exec -n labscientific-lims <postgres-pod> -- \
     psql -U postgres -c "CREATE DATABASE lims;"
   
   # Restore from backup
   kubectl exec -n labscientific-lims <postgres-pod> -- \
     bash -c "gunzip -c $BACKUP_FILE | psql -U postgres -d lims"
   ```

4. **Verify and Restart**
   ```bash
   # Verify database integrity
   kubectl exec -n labscientific-lims <postgres-pod> -- \
     psql -U postgres -d lims -c "SELECT COUNT(*) FROM samples;"
   
   # Restart application
   kubectl scale deployment lims-app -n labscientific-lims --replicas=3
   ```

### Scenario 3: Regional Disaster

#### Prerequisites
- Multi-region deployment
- Cross-region backup replication
- DR cluster ready

#### Steps

1. **Activate DR Site**
   ```bash
   # Switch to DR cluster context
   kubectl config use-context dr-cluster
   
   # Verify DR cluster status
   kubectl get nodes
   kubectl get namespaces
   ```

2. **Restore from Backup**
   ```bash
   # Restore latest backup to DR site
   velero restore create lims-dr-restore \
     --from-backup <latest-backup-name> \
     --wait
   ```

3. **Update DNS Failover**
   ```bash
   # Update DNS to point to DR site
   # Implementation depends on DNS provider
   
   # Verify DNS propagation
   nslookup lims.labscientific.local
   ```

4. **Verify Application**
   ```bash
   # Test application functionality
   curl -f https://lims.labscientific.local/health
   
   # Check database connectivity
   kubectl exec -n labscientific-lims <app-pod> -- \
     curl -f http://localhost:3000/api/health/database
   ```

### Scenario 4: Data Center Network Failure

#### Prerequisites
- Network monitoring alerts
- Alternative connectivity options
- VPN access to infrastructure

#### Steps

1. **Assess Network Status**
   ```bash
   # Check cluster connectivity
   kubectl cluster-info
   
   # Verify pod network
   kubectl get pods -A -o wide
   
   # Check service connectivity
   kubectl get svc -A
   ```

2. **Implement Network Workarounds**
   ```bash
   # Set up temporary port forwarding
   kubectl port-forward -n labscientific-lims svc/lims-app-service 8080:3000
   
   # Configure temporary ingress
   kubectl apply -f - <<EOF
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: lims-emergency-ingress
     namespace: labscientific-lims
   spec:
     rules:
     - host: lims-emergency.labscientific.local
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: lims-app-service
               port:
                 number: 3000
   EOF
   ```

3. **Notify Users**
   ```bash
   # Send notification to users
   curl -X POST "$SLACK_WEBHOOK_URL" \
     -H 'Content-Type: application/json' \
     -d '{"text":"🚨 LIMS Network Emergency - Using temporary access URL: lims-emergency.labscientific.local"}'
   ```

## Backup Verification

### Daily Backup Verification

```bash
#!/bin/bash
# Daily backup verification script

# Check Velero backups
echo "Checking Velero backups..."
LATEST_BACKUP=$(velero backup get --selector=app=lims -o json | jq -r '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name')

if [ "$LATEST_BACKUP" != "null" ]; then
    BACKUP_STATUS=$(velero backup describe $LATEST_BACKUP --details)
    if echo "$BACKUP_STATUS" | grep -q "Phase: Completed"; then
        echo "✅ Velero backup verified: $LATEST_BACKUP"
    else
        echo "❌ Velero backup failed: $LATEST_BACKUP"
    fi
else
    echo "❌ No Velero backups found"
fi

# Check database backups
echo "Checking database backups..."
POSTGRES_BACKUP=$(find /backup/postgresql -name "lims_backup_*.sql.gz" -mtime -1 | head -1)
REDIS_BACKUP=$(find /backup/redis -name "redis_backup_*.rdb.gz" -mtime -1 | head -1)

if [ -n "$POSTGRES_BACKUP" ]; then
    echo "✅ PostgreSQL backup verified: $(basename $POSTGRES_BACKUP)"
else
    echo "❌ No recent PostgreSQL backup found"
fi

if [ -n "$REDIS_BACKUP" ]; then
    echo "✅ Redis backup verified: $(basename $REDIS_BACKUP)"
else
    echo "❌ No recent Redis backup found"
fi
```

### Weekly Backup Testing

```bash
#!/bin/bash
# Weekly backup testing script

# Create test namespace
kubectl create namespace lims-backup-test

# Restore latest backup to test namespace
LATEST_BACKUP=$(velero backup get --selector=app=lims -o json | jq -r '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name')

velero restore create lims-backup-test-$(date +%Y%m%d) \
  --from-backup $LATEST_BACKUP \
  --namespace-mappings labscientific-lims:lims-backup-test \
  --wait

# Verify restore
if kubectl get pods -n lims-backup-test | grep -q "Running"; then
    echo "✅ Backup test successful"
else
    echo "❌ Backup test failed"
fi

# Cleanup
kubectl delete namespace lims-backup-test
```

## Recovery Testing

### Monthly DR Test

```bash
#!/bin/bash
# Monthly disaster recovery test

# 1. Create test environment
kubectl create namespace lims-dr-test

# 2. Restore from backup
velero restore create lims-dr-test-$(date +%Y%m%d) \
  --from-backup $(velero backup get --selector=app=lims -o json | jq -r '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name') \
  --namespace-mappings labscientific-lims:lims-dr-test \
  --wait

# 3. Verify database
kubectl wait --for=condition=ready pod -l component=postgresql -n lims-dr-test --timeout=300s
DB_POD=$(kubectl get pods -n lims-dr-test -l component=postgresql -o jsonpath='{.items[0].metadata.name}')
TABLE_COUNT=$(kubectl exec -n lims-dr-test $DB_POD -- psql -U postgres -d lims -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

if [ $TABLE_COUNT -gt 0 ]; then
    echo "✅ Database recovery test successful ($TABLE_COUNT tables)"
else
    echo "❌ Database recovery test failed"
fi

# 4. Verify application
kubectl wait --for=condition=ready pod -l component=app -n lims-dr-test --timeout=300s
APP_POD=$(kubectl get pods -n lims-dr-test -l component=app -o jsonpath='{.items[0].metadata.name}')
HEALTH_STATUS=$(kubectl exec -n lims-dr-test $APP_POD -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ $HEALTH_STATUS -eq 200 ]; then
    echo "✅ Application recovery test successful"
else
    echo "❌ Application recovery test failed (HTTP $HEALTH_STATUS)"
fi

# 5. Cleanup
kubectl delete namespace lims-dr-test
```

## Post-Recovery Procedures

### Verification Checklist

- [ ] Database connectivity restored
- [ ] Application health checks passing
- [ ] User authentication working
- [ ] Sample data accessible
- [ ] Reports generation functional
- [ ] Monitoring and alerting active
- [ ] Backups resuming normally
- [ ] Performance metrics normal

### Communication

1. **Notify Stakeholders**
   ```bash
   # Send recovery notification
   curl -X POST "$SLACK_WEBHOOK_URL" \
     -H 'Content-Type: application/json' \
     -d '{"text":"✅ LIMS Recovery Completed - System is operational"}'
   ```

2. **Update Status Page**
   ```bash
   # Update incident status
   curl -X PATCH "https://api.statuspage.io/v1/pages/PAGE_ID/incidents/INCIDENT_ID" \
     -H "Authorization: OAuth TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"incident": {"status": "resolved"}}'
   ```

### Documentation

1. **Create Incident Report**
   - Root cause analysis
   - Timeline of events
   - Recovery procedures used
   - Lessons learned
   - Improvement recommendations

2. **Update Runbook**
   - Document any new procedures
   - Update contact information
   - Revise recovery time estimates
   - Add new troubleshooting steps

## Troubleshooting

### Common Issues

#### Backup Restore Fails

**Symptoms:**
- Velero restore stuck in "InProgress"
- Pods not starting after restore
- Database connection failures

**Solutions:**
```bash
# Check restore status
velero restore describe <restore-name> --details

# Check pod events
kubectl describe pods -n labscientific-lims

# Check storage class availability
kubectl get storageclass

# Check PVC status
kubectl get pvc -n labscientific-lims
```

#### Database Recovery Issues

**Symptoms:**
- Database startup failures
- Data corruption errors
- Connection timeouts

**Solutions:**
```bash
# Check database logs
kubectl logs -n labscientific-lims <postgres-pod>

# Check disk space
kubectl exec -n labscientific-lims <postgres-pod> -- df -h

# Check database configuration
kubectl exec -n labscientific-lims <postgres-pod> -- cat /var/lib/postgresql/data/postgresql.conf
```

#### Network Connectivity Problems

**Symptoms:**
- Service unreachable
- DNS resolution failures
- Timeout errors

**Solutions:**
```bash
# Check service endpoints
kubectl get endpoints -n labscientific-lims

# Check ingress configuration
kubectl describe ingress -n labscientific-lims

# Test internal connectivity
kubectl run test-pod --rm -i --tty --image=busybox --restart=Never -- nslookup lims-app-service.labscientific-lims.svc.cluster.local
```

### Emergency Procedures

#### Immediate Actions
1. Assess the scope of the disaster
2. Activate the incident response team
3. Notify stakeholders
4. Begin recovery procedures
5. Document all actions taken

#### Escalation Triggers
- Recovery time exceeds 2 hours
- Data loss detected
- Security breach suspected
- Multiple system failures
- Recovery procedures not working

### Contact Information

**24/7 Support Hotline:** +1-555-0911
**Email:** lims-emergency@labscientific.com
**Slack Channel:** #lims-incidents
**Status Page:** https://status.labscientific.com

---

**Document Version:** 1.0
**Last Updated:** 2024-01-15
**Next Review:** 2024-04-15
**Owner:** DevOps Team