# Runbooks & Incident Response

This directory contains operational runbooks for managing the JAG LabScientific LIMS infrastructure.

## Quick Reference

| Runbook | Use When |
|---------|----------|
| [Database Issues](./database-issues.md) | PostgreSQL connection failures, slow queries |
| [Deployment Failures](./deployment-failures.md) | CI/CD pipeline or ArgoCD sync failures |
| [High Resource Usage](./high-resource-usage.md) | CPU/memory alerts, pod evictions |
| [Application Errors](./application-errors.md) | 5xx errors, health check failures |
| [Network Issues](./network-issues.md) | Connectivity problems, Tailscale issues |
| [Disaster Recovery](./disaster-recovery.md) | Full restore procedures |

## Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV1** | Production down | Immediate | Database crash, full outage |
| **SEV2** | Major degradation | < 30 min | Slow responses, partial outage |
| **SEV3** | Minor issue | < 4 hours | Non-critical feature broken |
| **SEV4** | Low impact | Next business day | UI glitches, warnings |

## On-Call Checklist

1. **Acknowledge the alert** within SLA
2. **Assess severity** using the table above
3. **Start incident channel** (if SEV1/SEV2)
4. **Follow relevant runbook**
5. **Escalate if needed**
6. **Document resolution**
7. **Schedule post-mortem** (if SEV1/SEV2)

## Quick Commands

```bash
# Check all pods
kubectl get pods -A | grep -v Running

# Check recent events
kubectl get events --sort-by='.lastTimestamp' -A | tail -20

# Check node resources
kubectl top nodes

# Check ArgoCD status
argocd app list

# Tail logs
kubectl logs -f deployment/lims-backend -n production
```

## Monitoring Dashboards

- **Grafana**: http://100.103.13.92:3000
- **ArgoCD**: http://100.89.26.128:30338
- **Prometheus**: http://100.103.13.92:9090
