# START HERE - JAG LabScientific LIMS System Overview

**Last Updated**: May 24, 2026
**Author**: Gabriel S. (DevOps Engineer)

---

## Quick Reference

| Resource | URL/Location | Purpose |
|----------|--------------|---------|
| **Production Frontend** | https://lims.jagdevops.co.za | Live application |
| **Production Backend** | http://100.89.26.128:30007 | API endpoint |
| **ArgoCD Dashboard** | http://100.89.26.128:30338 | GitOps deployments |
| **Grafana** | http://100.103.13.92:3000 | Monitoring dashboards |
| **Prometheus** | http://100.103.13.92:9090 | Metrics |
| **GitHub Repo** | github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA | Source code |
| **GHCR Images** | ghcr.io/gabriels562/lims-* | Container images |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                              │
│                                              INTERNET                                                        │
│                                                  │                                                           │
│                                    ┌─────────────┴─────────────┐                                            │
│                                    │       CLOUDFLARE          │                                            │
│                                    │    (DNS + CDN + Tunnel)   │                                            │
│                                    │                           │                                            │
│                                    │  lims.jagdevops.co.za ────┼───────────────────┐                        │
│                                    │  jagdevops.com ───────────┼─────────┐         │                        │
│                                    └───────────────────────────┘         │         │                        │
│                                                                          │         │                        │
└──────────────────────────────────────────────────────────────────────────┼─────────┼────────────────────────┘
                                                                           │         │
                                          ┌────────────────────────────────┘         │
                                          │                                          │
                              ┌───────────▼────────────┐            ┌────────────────▼────────────────────┐
                              │                        │            │                                     │
                              │     SERVER 2           │            │          SERVER 1                   │
                              │  (MONITORING)          │◄══════════►│       (K3S CLUSTER)                 │
                              │                        │  Tailscale │                                     │
                              │  IP: 100.103.13.92     │    VPN     │   IP: 100.89.26.128                 │
                              │                        │            │                                     │
                              └───────────┬────────────┘            └──────────────┬──────────────────────┘
                                          │                                        │
           ┌──────────────────────────────┼────────────────────────────────────────┼──────────────────────────┐
           │                              │                                        │                          │
           │  ┌───────────────────────────▼───────────────────────────┐            │                          │
           │  │                  SERVER 2 COMPONENTS                   │            │                          │
           │  │                                                        │            │                          │
           │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │            │                          │
           │  │  │ PROMETHEUS  │  │   GRAFANA   │  │    LOKI     │    │            │                          │
           │  │  │   :9090     │  │    :3000    │  │    :3100    │    │            │                          │
           │  │  │             │  │             │  │             │    │            │                          │
           │  │  │ Scrapes     │  │ Dashboards  │  │ Log         │    │            │                          │
           │  │  │ metrics     │  │ & Alerts    │  │ Aggregation │    │            │                          │
           │  │  │ from K3s    │  │             │  │             │    │            │                          │
           │  │  └──────┬──────┘  └─────────────┘  └─────────────┘    │            │                          │
           │  │         │                                              │            │                          │
           │  │  ┌──────▼──────┐  ┌─────────────┐  ┌─────────────┐    │            │                          │
           │  │  │ALERTMANAGER │  │    VAULT    │  │   LEGACY    │    │            │                          │
           │  │  │   :9093     │  │    :8200    │  │   DOCKER    │    │            │                          │
           │  │  │             │  │             │  │    LIMS     │    │            │                          │
           │  │  │ Routes      │  │ Secrets     │  │  (Backup)   │    │            │                          │
           │  │  │ alerts      │  │ Management  │  │             │    │            │                          │
           │  │  └─────────────┘  └─────────────┘  └─────────────┘    │            │                          │
           │  │                                                        │            │                          │
           │  └────────────────────────────────────────────────────────┘            │                          │
           │                              │                                         │                          │
           │                              │ Scrapes /metrics                        │                          │
           │                              │ every 15s                               │                          │
           │                              ▼                                         │                          │
           │  ┌─────────────────────────────────────────────────────────────────────▼─────────────────────────┐│
           │  │                           SERVER 1 - K3S KUBERNETES CLUSTER                                   ││
           │  │                                                                                               ││
           │  │   ┌─────────────────────────────────────────────────────────────────────────────────────┐     ││
           │  │   │                              CONTROL PLANE                                           │     ││
           │  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │     ││
           │  │   │  │   ArgoCD    │  │  External   │  │   NGINX     │  │   Docker    │                 │     ││
           │  │   │  │   :30338    │  │   Secrets   │  │   Ingress   │  │  Registry   │                 │     ││
           │  │   │  │             │  │  Operator   │  │             │  │    :5000    │                 │     ││
           │  │   │  │  Syncs      │  │             │  │  Routes     │  │             │                 │     ││
           │  │   │  │  from       │  │  Syncs      │  │  traffic    │  │  Stores     │                 │     ││
           │  │   │  │  GitHub     │  │  from       │  │             │  │  images     │                 │     ││
           │  │   │  │             │  │  Vault      │  │             │  │             │                 │     ││
           │  │   │  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────┘                 │     ││
           │  │   └─────────┼───────────────────────────────────────────────────────────────────────────┘     ││
           │  │             │                                                                                  ││
           │  │             │ Deploys to                                                                       ││
           │  │             ▼                                                                                  ││
           │  │   ┌─────────────────────────────────────────────────────────────────────────────────────┐     ││
           │  │   │                              NAMESPACES                                              │     ││
           │  │   │                                                                                      │     ││
           │  │   │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐          │     ││
           │  │   │  │    PRODUCTION       │  │      DEVELOP        │  │        TEST         │          │     ││
           │  │   │  │                     │  │                     │  │                     │          │     ││
           │  │   │  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │          │     ││
           │  │   │  │  │lims-backend   │  │  │  │lims-develop-  │  │  │  │lims-test-     │  │          │     ││
           │  │   │  │  │  Replicas: 2  │  │  │  │backend        │  │  │  │backend        │  │          │     ││
           │  │   │  │  │  HPA: 2-5     │  │  │  │  Replicas: 1  │  │  │  │  Replicas: 1  │  │          │     ││
           │  │   │  │  │  Port: 3001   │  │  │  │  :30201       │  │  │  │  :30101       │  │          │     ││
           │  │   │  │  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │          │     ││
           │  │   │  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │          │     ││
           │  │   │  │  │lims-frontend  │  │  │  │lims-develop-  │  │  │  │lims-test-     │  │          │     ││
           │  │   │  │  │  Replicas: 2  │  │  │  │frontend       │  │  │  │frontend       │  │          │     ││
           │  │   │  │  │  HPA: 2-5     │  │  │  │  Replicas: 1  │  │  │  │  Replicas: 1  │  │          │     ││
           │  │   │  │  │  :30005       │  │  │  │  :30202       │  │  │  │  :30102       │  │          │     ││
           │  │   │  │  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │          │     ││
           │  │   │  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │          │     ││
           │  │   │  │  │ PostgreSQL    │  │  │  │ PostgreSQL    │  │  │  │ PostgreSQL    │  │          │     ││
           │  │   │  │  │  PVC: 10Gi    │  │  │  │  PVC: 2Gi     │  │  │  │  PVC: 1Gi     │  │          │     ││
           │  │   │  │  │  lims_db      │  │  │  │  lims_develop │  │  │  │  lims_test    │  │          │     ││
           │  │   │  │  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │          │     ││
           │  │   │  │                     │  │                     │  │                     │          │     ││
           │  │   │  │  Trigger: main      │  │  Trigger: develop   │  │  Trigger: feature/* │          │     ││
           │  │   │  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘          │     ││
           │  │   │                                                                                      │     ││
           │  │   └──────────────────────────────────────────────────────────────────────────────────────┘     ││
           │  │                                                                                                ││
           │  └────────────────────────────────────────────────────────────────────────────────────────────────┘│
           │                                                                                                    │
           └────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           GITHUB ACTIONS                                                     │
│                                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                                         CI/CD PIPELINES                                              │    │
│  │                                                                                                      │    │
│  │   Developer pushes code                                                                              │    │
│  │         │                                                                                            │    │
│  │         ▼                                                                                            │    │
│  │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐                  │    │
│  │   │  CI Pipeline  │───►│ Security Scan │───►│  Build Docker │───►│ Push to GHCR  │                  │    │
│  │   │  (All Branches)│    │  (Trivy)      │    │    Images     │    │ + On-Prem     │                  │    │
│  │   └───────────────┘    └───────────────┘    └───────────────┘    └───────┬───────┘                  │    │
│  │                                                                          │                           │    │
│  │         ┌────────────────────────────────────────────────────────────────┘                           │    │
│  │         │                                                                                            │    │
│  │         ▼                                                                                            │    │
│  │   ┌─────────────────────────────────────────────────────────────────────────────────────────┐       │    │
│  │   │                              DEPLOYMENT WORKFLOWS                                        │       │    │
│  │   │                                                                                          │       │    │
│  │   │   feature/* branch          develop branch            main branch                        │       │    │
│  │   │         │                        │                        │                              │       │    │
│  │   │         ▼                        ▼                        ▼                              │       │    │
│  │   │   ┌───────────────┐        ┌───────────────┐        ┌───────────────┐                   │       │    │
│  │   │   │ deploy-test   │        │deploy-develop │        │deploy-production│                  │       │    │
│  │   │   │               │        │               │        │               │                   │       │    │
│  │   │   │ Helm Deploy   │        │ Helm Deploy   │        │ ArgoCD Sync   │                   │       │    │
│  │   │   │ to test ns    │        │ to develop ns │        │ (GitOps)      │                   │       │    │
│  │   │   │               │        │               │        │               │                   │       │    │
│  │   │   │ + Load Test   │        │ + Smoke Test  │        │ + Smoke Test  │                   │       │    │
│  │   │   └───────────────┘        └───────────────┘        └───────────────┘                   │       │    │
│  │   │                                                                                          │       │    │
│  │   └──────────────────────────────────────────────────────────────────────────────────────────┘       │    │
│  │                                                                                                      │    │
│  │   ┌──────────────────────────────────────────────────────────────────────────────────────────┐      │    │
│  │   │                              TAILSCALE VPN                                                │      │    │
│  │   │                                                                                           │      │    │
│  │   │   GitHub Actions Runner ◄─────── Secure Tunnel ───────► Server 1 (K3s)                   │      │    │
│  │   │                                                                                           │      │    │
│  │   │   - OAuth Client ID/Secret for authentication                                            │      │    │
│  │   │   - Tag: ci for ACL rules                                                                │      │    │
│  │   │   - Allows kubectl, argocd, docker push commands                                         │      │    │
│  │   └──────────────────────────────────────────────────────────────────────────────────────────┘      │    │
│  │                                                                                                      │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Explanations

### Server 1 - K3s Cluster (100.89.26.128)

| Component | Port | Purpose |
|-----------|------|---------|
| **ArgoCD** | 30338 | GitOps controller - watches GitHub repo, auto-deploys changes |
| **NGINX Ingress** | 80/443 | Routes external traffic to services |
| **Docker Registry** | 5000 | Local container image storage |
| **External Secrets** | - | Syncs secrets from Vault to K8s |

#### Namespaces

| Namespace | Purpose | Trigger |
|-----------|---------|---------|
| `production` | Live application (2+ replicas, HPA) | `main` branch |
| `develop` | Integration testing | `develop` branch |
| `test` | Feature branch testing | `feature/*` branches |
| `argocd` | GitOps controller | - |
| `monitoring` | ServiceMonitors | - |

### Server 2 - Monitoring (100.103.13.92)

| Component | Port | Purpose |
|-----------|------|---------|
| **Prometheus** | 9090 | Collects metrics from K3s cluster |
| **Grafana** | 3000 | Visualization dashboards |
| **Loki** | 3100 | Log aggregation |
| **Alertmanager** | 9093 | Alert routing (email, Slack) |
| **Vault** | 8200 | Secrets management |

---

## How Data Flows

### 1. User Request Flow

```
User Browser
    │
    ▼
Cloudflare (lims.jagdevops.co.za)
    │
    ▼
Cloudflare Tunnel
    │
    ▼
Server 1 → NGINX Ingress
    │
    ├──► /api/* → lims-backend:3001
    │
    └──► /* → lims-frontend:80
              │
              ▼
         lims-backend:3001
              │
              ▼
         PostgreSQL:5432
```

### 2. Deployment Flow

```
Developer pushes to GitHub
    │
    ▼
GitHub Actions triggered
    │
    ├──► CI Pipeline (lint, test, build)
    │
    ├──► Security Scan (Trivy)
    │
    ├──► Docker Build
    │
    ├──► Push to GHCR + On-Prem Registry
    │
    └──► Deploy based on branch:
         │
         ├── feature/* → Helm deploy to test namespace
         │
         ├── develop → Helm deploy to develop namespace
         │
         └── main → ArgoCD sync to production namespace
                        │
                        ▼
                    ArgoCD detects change
                        │
                        ▼
                    Updates K8s deployments
                        │
                        ▼
                    Smoke tests verify health
```

### 3. Monitoring Flow

```
Applications expose /metrics endpoint
    │
    ▼
ServiceMonitor in K8s defines scrape targets
    │
    ▼
Prometheus (Server 2) scrapes every 15 seconds
    │
    ├──► Stores time-series data
    │
    ├──► Evaluates alerting rules
    │         │
    │         ▼
    │    Alertmanager routes alerts
    │         │
    │         ├──► Email
    │         └──► Slack
    │
    └──► Grafana queries for dashboards
```

---

## Key Files and Their Purposes

### CI/CD

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Runs tests, linting, security scans on all branches |
| `.github/workflows/deploy-production.yml` | Builds, pushes, and syncs ArgoCD for main branch |
| `.github/workflows/deploy-develop.yml` | Deploys to develop namespace |
| `.github/workflows/deploy-test.yml` | Deploys to test namespace for feature branches |
| `.github/workflows/load-test.yml` | Runs Locust load tests |

### Kubernetes

| File | Purpose |
|------|---------|
| `helm/lims/` | Helm chart for application deployment |
| `helm/lims/values-production.yaml` | Production config (HPA, TLS, etc.) |
| `k8s/network-policies/` | Zero-trust networking between namespaces |
| `k8s/backup/` | PostgreSQL backup CronJob |
| `k8s/rbac/` | Role-based access control |

### Infrastructure

| File | Purpose |
|------|---------|
| `terraform/terragrunt.hcl` | Root Terragrunt config |
| `terraform/live/production/` | Production infrastructure |
| `terraform/modules/k3s-cluster/` | K3s provisioning module |
| `argocd/applications/lims-application.yaml` | ArgoCD app definition |

### Monitoring

| File | Purpose |
|------|---------|
| `monitoring/prometheus/slo-rules.yaml` | SLO recording/alerting rules |
| `docs/slo/README.md` | SLO definitions and error budgets |

### Documentation

| File | Purpose |
|------|---------|
| `docs/runbooks/` | Incident response procedures |
| `README.md` | Project overview |
| `STARTHERE.md` | This file |

---

## Common Operations

### Check System Status

```bash
# Check all pods
kubectl get pods -A | grep -v Running

# Check ArgoCD app status
argocd app get lims --grpc-web

# Check recent deployments
kubectl rollout history deployment/lims-backend -n production

# Check health endpoint
curl http://100.89.26.128:30007/health
```

### Deploy a Fix

```bash
# For production (via GitOps)
git checkout main
# make changes
git commit -m "fix: description"
git push origin main
# ArgoCD will auto-sync

# Force ArgoCD sync
argocd app sync lims --grpc-web --force
```

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/lims-backend -n production

# All logs for a namespace
kubectl logs -l app.kubernetes.io/instance=lims -n production --all-containers

# Loki (via Grafana)
# Go to Grafana → Explore → Loki
# Query: {namespace="production"}
```

### Database Operations

```bash
# Connect to PostgreSQL
kubectl exec -it lims-postgresql-0 -n production -- psql -U lims_user -d lims_db

# Trigger manual backup
kubectl create job backup-manual-$(date +%s) --from=cronjob/postgres-backup -n production

# List backups
kubectl exec -it $(kubectl get pods -n production -l app=postgres-backup -o name | head -1) -- ls -la /backups/
```

### Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/lims-backend -n production

# Rollback ArgoCD
argocd app history lims --grpc-web
argocd app rollback lims <revision> --grpc-web
```

---

## Credentials and Secrets

| Secret | Location | Purpose |
|--------|----------|---------|
| ArgoCD admin password | ArgoCD UI / `argocd-initial-admin-secret` | ArgoCD login |
| Grafana admin password | Grafana UI | Dashboard access |
| Vault token | `vault-token-secret` in `external-secrets` namespace | Secrets sync |
| GitHub token | GitHub Secrets | CI/CD permissions |
| Tailscale OAuth | GitHub Secrets | VPN for CI runners |
| kubeconfig | GitHub Secrets (base64) | K8s access |

---

## SLOs (Service Level Objectives)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Availability** | 99.9% | < 99.9% for 5 min |
| **Latency (P99)** | < 200ms | > 500ms for 5 min |
| **Error Rate** | < 0.1% | > 1% for 5 min |
| **Error Budget** | 43 min/month | > 10% burn rate |

---

## Troubleshooting Quick Guide

| Symptom | Likely Cause | Runbook |
|---------|--------------|---------|
| 503 errors | Database down | [database-issues.md](docs/runbooks/database-issues.md) |
| Deploy failed | CI/CD issue | [deployment-failures.md](docs/runbooks/deployment-failures.md) |
| High latency | Resource exhaustion | [high-resource-usage.md](docs/runbooks/high-resource-usage.md) |
| 5xx errors | Application bug | [application-errors.md](docs/runbooks/application-errors.md) |
| Can't connect | Network/Tailscale | [network-issues.md](docs/runbooks/network-issues.md) |

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Orchestration | K3s | Lightweight, single binary, production-ready |
| GitOps | ArgoCD | Auto-sync, self-healing, great UI |
| CI/CD | GitHub Actions | Native integration, free for public repos |
| IaC | Terragrunt | DRY configuration, dependency management |
| Secrets | Vault + ESO | Enterprise-grade, rotation, audit logs |
| Monitoring | Prometheus/Grafana | Industry standard, open source |
| Registry | GHCR + On-prem | Hybrid for resilience and portfolio visibility |

---

## Contact

**Gabriel S.** - DevOps Engineer
- GitHub: [@GABRIELS562](https://github.com/GABRIELS562)
- Portfolio: [jagdevops.com](https://jagdevops.com)
