# JAG LabScientific LIMS

**Enterprise-Grade Laboratory Information Management System with Production DevOps Infrastructure**

[![CI Pipeline](https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA/actions/workflows/ci.yml/badge.svg)](https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA/actions/workflows/ci.yml)
[![Deploy Production](https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA/actions/workflows/deploy-production.yml)
[![Security Scan](https://img.shields.io/badge/Security-Trivy%20Scanned-green?logo=aqua)](https://github.com/aquasecurity/trivy)

[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-4169E1?logo=postgresql)](https://postgresql.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-K3s-326CE5?logo=kubernetes)](https://k3s.io/)
[![ArgoCD](https://img.shields.io/badge/ArgoCD-GitOps-EF7B4D?logo=argo)](https://argoproj.github.io/cd/)
[![Terraform](https://img.shields.io/badge/Terraform-IaC-844FBA?logo=terraform)](https://terraform.io/)

---

## Overview

A full-stack Laboratory Information Management System for DNA analysis workflows, built with modern DevOps practices. This project demonstrates production-ready infrastructure, CI/CD pipelines, GitOps deployment, and comprehensive observability.

### Live Environments

| Environment | URL | Branch |
|-------------|-----|--------|
| **Production** | [lims.jagdevops.co.za](https://lims.jagdevops.co.za) | `main` |
| **Develop** | Internal (Tailscale) | `develop` |
| **Test** | Internal (Tailscale) | `feature/*` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   CI/CD     │    │  Security   │    │    Load     │    │   GitOps    │   │
│  │  Pipeline   │    │   Scans     │    │   Tests     │    │   Config    │   │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTAINER REGISTRIES                                 │
│         ┌─────────────────────┐    ┌─────────────────────┐                  │
│         │   On-Prem Registry  │    │       GHCR          │                  │
│         │   (localhost:5000)  │    │  (ghcr.io/...)      │                  │
│         └──────────┬──────────┘    └──────────┬──────────┘                  │
└────────────────────┼───────────────────────────┼────────────────────────────┘
                     │                           │
                     ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        K3S KUBERNETES CLUSTER                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Production    │  │     Develop     │  │      Test       │              │
│  │   Namespace     │  │    Namespace    │  │    Namespace    │              │
│  │                 │  │                 │  │                 │              │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │              │
│  │ │   Backend   │ │  │ │   Backend   │ │  │ │   Backend   │ │              │
│  │ │   (HPA)     │ │  │ │             │ │  │ │             │ │              │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │              │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │              │
│  │ │  Frontend   │ │  │ │  Frontend   │ │  │ │  Frontend   │ │              │
│  │ │   (HPA)     │ │  │ │             │ │  │ │             │ │              │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │              │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │              │
│  │ │ PostgreSQL  │ │  │ │ PostgreSQL  │ │  │ │ PostgreSQL  │ │              │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   ArgoCD    │  │  External   │  │   Network   │  │   Backup    │         │
│  │   (GitOps)  │  │   Secrets   │  │  Policies   │  │  CronJobs   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MONITORING (Server 2)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Prometheus  │  │   Grafana   │  │    Loki     │  │    Vault    │         │
│  │  (Metrics)  │  │ (Dashboards)│  │   (Logs)    │  │  (Secrets)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## DevOps Features

### CI/CD Pipeline

| Workflow | Trigger | Actions |
|----------|---------|---------|
| **CI Pipeline** | All branches | Lint, Test, Build, Security Scan |
| **Deploy Test** | `feature/*` | Build → Push → Helm Deploy |
| **Deploy Develop** | `develop` | Build → Push → Helm Deploy → Load Test |
| **Deploy Production** | `main` | Build → Push → ArgoCD Sync → Smoke Test |
| **Load Testing** | Manual/Auto | Locust performance tests |

### Security

- **Container Scanning**: Trivy scans for vulnerabilities in CI
- **Network Policies**: Zero-trust networking between namespaces
- **Secrets Management**: HashiCorp Vault + External Secrets Operator
- **RBAC**: Role-based access control for Kubernetes

### Reliability

- **GitOps**: ArgoCD with auto-sync and self-healing
- **Autoscaling**: HPA for production workloads (2-5 replicas)
- **Backups**: Automated PostgreSQL backups with 7-day retention
- **SLOs**: Defined availability (99.9%) and latency targets

### Observability

- **Metrics**: Prometheus + custom SLI/SLO recording rules
- **Dashboards**: Grafana with application and infrastructure views
- **Logs**: Loki for centralized log aggregation
- **Alerts**: Prometheus Alertmanager with Slack/email

---

## Technology Stack

### Application

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Material-UI, Tailwind CSS |
| Backend | Node.js 18, Express.js |
| Database | PostgreSQL 14 |
| Testing | Vitest, Jest, Supertest |

### Infrastructure

| Category | Technology |
|----------|------------|
| Container Runtime | Docker, containerd |
| Orchestration | K3s (Lightweight Kubernetes) |
| Package Management | Helm 3 |
| GitOps | ArgoCD |
| IaC | Terraform + Terragrunt |
| Secrets | HashiCorp Vault, External Secrets Operator |
| Ingress | NGINX Ingress Controller |
| VPN | Tailscale |
| DNS/CDN | Cloudflare |

### CI/CD

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipelines |
| Trivy | Container vulnerability scanning |
| Locust | Load testing |

### Monitoring

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection |
| Grafana | Visualization |
| Loki | Log aggregation |
| Alertmanager | Alert routing |

---

## Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA.git
cd JAG-LABSCIENTIFIC-DNA

# Install dependencies
npm ci --legacy-peer-deps
cd backend && npm ci && cd ..

# Start development servers
npm run dev:all
```

### Docker Compose

```bash
docker-compose up -d
```

### Kubernetes (Helm)

```bash
# Add Helm dependencies
cd helm/lims && helm dependency update

# Install
helm upgrade --install lims ./helm/lims \
  --namespace production \
  --create-namespace \
  -f helm/lims/values-production.yaml
```

### Terragrunt

```bash
cd terraform/live/production
terragrunt init
terragrunt apply
```

---

## Project Structure

```
.
├── .github/workflows/       # GitHub Actions CI/CD
│   ├── ci.yml              # CI pipeline
│   ├── deploy-production.yml
│   ├── deploy-develop.yml
│   ├── deploy-test.yml
│   └── load-test.yml
├── argocd/                  # ArgoCD application configs
├── backend/                 # Express.js API
├── docs/                    # Documentation
│   ├── runbooks/           # Incident response guides
│   └── slo/                # SLO definitions
├── helm/lims/              # Helm chart
│   ├── templates/
│   ├── values.yaml
│   ├── values-production.yaml
│   ├── values-develop.yaml
│   └── values-test.yaml
├── k8s/                     # Kubernetes manifests
│   ├── backup/             # Backup CronJobs
│   ├── network-policies/   # Network segmentation
│   └── external-secrets/   # Vault integration
├── monitoring/              # Observability configs
│   ├── prometheus/         # Recording/alerting rules
│   ├── grafana/            # Dashboards
│   └── locust/             # Load test scenarios
├── src/                     # React frontend
└── terraform/               # Infrastructure as Code
    ├── modules/            # Terraform modules
    ├── live/               # Terragrunt environments
    └── terragrunt.hcl
```

---

## Architecture Decisions

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| **Orchestration** | Docker Swarm, K8s, K3s | K3s | Lightweight, production-ready, single binary |
| **CI/CD** | Jenkins, GitLab CI, GitHub Actions | GitHub Actions | Native integration, marketplace actions, free for public repos |
| **GitOps** | Flux, ArgoCD | ArgoCD | Better UI, RBAC, SSO support |
| **Secrets** | K8s Secrets, Sealed Secrets, Vault | Vault + ESO | Enterprise-grade, rotation, audit logging |
| **Registry** | Docker Hub, ECR, GHCR | GHCR + On-prem | Hybrid for resilience, GHCR for portfolio visibility |
| **Monitoring** | Datadog, New Relic, Prometheus | Prometheus Stack | Open source, industry standard, cost-effective |
| **IaC** | Ansible, Pulumi, Terraform | Terraform + Terragrunt | DRY config, state management, large ecosystem |

---

## SLOs (Service Level Objectives)

| Service | Availability | Latency (P99) | Error Budget |
|---------|--------------|---------------|--------------|
| Backend API | 99.9% | < 200ms | 43 min/month |
| Frontend | 99.5% | < 500ms | 3.6 hrs/month |
| Database | 99.95% | < 50ms | 21 min/month |

See [docs/slo/README.md](docs/slo/README.md) for detailed SLO documentation.

---

## Runbooks

| Runbook | Use Case |
|---------|----------|
| [Database Issues](docs/runbooks/database-issues.md) | PostgreSQL failures, slow queries |
| [Deployment Failures](docs/runbooks/deployment-failures.md) | CI/CD or ArgoCD issues |
| [High Resource Usage](docs/runbooks/high-resource-usage.md) | CPU/memory alerts |
| [Application Errors](docs/runbooks/application-errors.md) | 5xx errors, health failures |
| [Network Issues](docs/runbooks/network-issues.md) | Connectivity, Tailscale |
| [Disaster Recovery](docs/runbooks/disaster-recovery.md) | Full restore procedures |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software developed for JAG DNA Scientific.

---

## Contact

**Gabriel S.** - DevOps Engineer

- Portfolio: [jagdevops.com](https://jagdevops.com)
- GitHub: [@GABRIELS562](https://github.com/GABRIELS562)
- LinkedIn: [Gabriel S.](https://linkedin.com/in/gabriels562)
