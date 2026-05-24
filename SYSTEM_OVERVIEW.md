# JAG DNA Scientific LIMS - Complete System Overview

> A comprehensive guide for understanding the Laboratory Information Management System (LIMS) architecture, features, and DevOps infrastructure.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Frontend Application](#3-frontend-application)
4. [Backend Services](#4-backend-services)
5. [Database Layer](#5-database-layer)
6. [OSIRIS Integration](#6-osiris-integration)
7. [Key Features](#7-key-features)
8. [DevOps Infrastructure](#8-devops-infrastructure)
9. [Kubernetes & Helm](#9-kubernetes--helm)
10. [CI/CD Pipelines](#10-cicd-pipelines)
11. [Monitoring Stack](#11-monitoring-stack)
12. [Security](#12-security)
13. [Testing Infrastructure](#13-testing-infrastructure)
14. [Quick Start Guide](#14-quick-start-guide)

---

## 1. Project Overview

### What is JAG DNA Scientific LIMS?

JAG DNA Scientific LIMS is a **production-ready Laboratory Information Management System** designed for:

- **DNA Analysis**: Paternity testing and forensic DNA workflows
- **STR Analysis**: Integration with OSIRIS (Open Source STR Interpretation System)
- **PowerPlex ESX 17 Kit**: Support for 17-locus STR analysis
- **Full Sample Lifecycle**: From collection through reporting

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Material-UI, Tailwind CSS, Radix UI |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL (production), SQLite (development fallback) |
| **Container** | Docker, k3s Kubernetes |
| **CI/CD** | GitHub Actions, ArgoCD (GitOps) |
| **Monitoring** | Prometheus, Grafana, Loki, Alertmanager |
| **Secrets** | HashiCorp Vault, External Secrets Operator |
| **IaC** | Terraform, Terragrunt |

### Infrastructure Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Server1 (100.89.26.128)              Server2 (100.103.13.92)        │
│  ┌───────────────────────┐            ┌───────────────────────┐      │
│  │   K3s Cluster         │            │   Monitoring Stack    │      │
│  │                       │            │                       │      │
│  │  ┌─────────────────┐  │            │  ┌─────────────────┐  │      │
│  │  │ LIMS (Helm)     │  │◄──────────►│  │ Prometheus      │  │      │
│  │  │ - Backend (:30007)│ │  Scrape   │  │ (:9090)         │  │      │
│  │  │ - Frontend(:30005)│ │           │  └─────────────────┘  │      │
│  │  │ - PostgreSQL    │  │            │  ┌─────────────────┐  │      │
│  │  └─────────────────┘  │            │  │ Grafana (:3000) │  │      │
│  │                       │            │  └─────────────────┘  │      │
│  │  ┌─────────────────┐  │            │  ┌─────────────────┐  │      │
│  │  │ Pharma (:30002) │  │            │  │ Vault (:8200)   │  │      │
│  │  └─────────────────┘  │            │  └─────────────────┘  │      │
│  │                       │            │  ┌─────────────────┐  │      │
│  │  ┌─────────────────┐  │            │  │ Alertmanager    │  │      │
│  │  │ Finance (:30003)│  │            │  │ (:9093)         │  │      │
│  │  └─────────────────┘  │            │  └─────────────────┘  │      │
│  │                       │            │  ┌─────────────────┐  │      │
│  │  ┌─────────────────┐  │            │  │ Loki (:3100)    │  │      │
│  │  │ ArgoCD          │  │            │  └─────────────────┘  │      │
│  │  └─────────────────┘  │            │  ┌─────────────────┐  │      │
│  │                       │            │  │ Locust (:8089)  │  │      │
│  │  ┌─────────────────┐  │            │  └─────────────────┘  │      │
│  │  │ External Secrets│  │◄──────────►│                       │      │
│  │  │ Operator        │  │  Secrets   │                       │      │
│  │  └─────────────────┘  │            │                       │      │
│  └───────────────────────┘            └───────────────────────┘      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Summary

### Directory Structure

```
JAG-LABSCIENTIFIC-DNA/
├── src/                    # React frontend source
│   ├── components/         # UI components (76 files)
│   │   ├── features/       # Feature modules (45 files)
│   │   ├── ui/             # Reusable UI library (22 files)
│   │   ├── layout/         # Layout components
│   │   └── forms/          # Form components
│   ├── contexts/           # React Context (Auth, Theme)
│   ├── hooks/              # Custom hooks (13 files)
│   ├── services/           # API client
│   └── utils/              # Utilities
│
├── backend/                # Express.js backend
│   ├── routes/             # API endpoints (18 files)
│   ├── services/           # Business logic (28+ files)
│   ├── middleware/         # Express middleware (9 files)
│   ├── osiris_workspace/   # OSIRIS integration
│   └── utils/              # Helpers
│
├── helm/lims/              # Helm chart for Kubernetes
├── k8s/                    # Raw Kubernetes manifests
├── argocd/                 # ArgoCD GitOps configuration
├── infrastructure/         # Terraform/Terragrunt IaC
├── monitoring/             # Prometheus, Grafana, Locust
├── .github/workflows/      # CI/CD pipelines
└── tests/                  # Test suites
```

### Data Flow

```
User Browser
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  React App  │────►│  Express    │────►│ PostgreSQL  │
│  (Vite)     │◄────│  API        │◄────│ Database    │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │
     │              ┌─────┴─────┐
     │              ▼           ▼
     │        ┌─────────┐ ┌─────────┐
     │        │ OSIRIS  │ │ Reports │
     │        │ (STR)   │ │ (PDF)   │
     │        └─────────┘ └─────────┘
     │
     ▼
┌─────────────┐
│ Prometheus  │◄── Metrics scraping
│ /metrics    │
└─────────────┘
```

---

## 3. Frontend Application

### Entry Points

| File | Purpose |
|------|---------|
| `src/main.jsx` | React DOM initialization, service workers |
| `src/App.jsx` | Root router, layout, lazy loading |
| `src/index.css` | Global styles with Tailwind |

### State Management

**Three React Contexts:**

1. **AuthContext** (`src/contexts/AuthContext.jsx`)
   - User login/logout
   - JWT token management
   - Role-based access control
   - localStorage persistence

2. **ThemeContext** (`src/contexts/ThemeContext.jsx`)
   - Dark/light mode toggle
   - Material-UI theme provider
   - localStorage persistence

3. **PaternityFormContext** (`src/contexts/PaternityFormContext.jsx`)
   - Multi-step form state
   - Form progress tracking

### Component Library

**UI Components** (`src/components/ui/`) - 22 shadcn-style components:
- `button.jsx`, `input.jsx`, `select.jsx` - Form controls
- `card.jsx`, `table.jsx`, `tabs.jsx` - Layout
- `dialog.jsx`, `toast.jsx`, `alert.jsx` - Feedback
- `Logo.jsx`, `ThemeToggle.jsx`, `ConnectionStatus.jsx` - App-specific

### Feature Components

**Major Features** (`src/components/features/`) - 45 components:

| Feature | Component | Purpose |
|---------|-----------|---------|
| **Dashboard** | `PaternityLabDashboard.jsx` | Main workflow overview |
| **Paternity** | `PaternityCalculator.jsx` | CPI calculations |
| **Forensic** | `ForensicWorkflowDashboard.jsx` | Forensic case workflow |
| **Genetic** | `GeneticAnalysis/` | FSA file processing |
| **OSIRIS** | `OsirisAnalysis.jsx` | STR analysis UI |
| **PCR** | `PCRPlate.jsx`, `PCRBatches.jsx` | PCR workflow |
| **Reports** | `Reports.jsx`, `ForensicReports.jsx` | Report generation |
| **QMS** | `QualityControlISO17025.jsx` | Quality management |
| **Inventory** | `InventoryManagement.jsx` | Reagent tracking |
| **AI/ML** | `AIMachineLearning.jsx` | Analysis tools |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useApi.js` | Data fetching with retry logic |
| `useAuth.js` | Authentication state |
| `useForm.js` | Form state management |
| `useTable.js` | Pagination/sorting |
| `useTheme.js` | Theme management |
| `useNotifications.js` | Toast notifications |
| `useFrontendMonitoring.js` | Performance tracking |

### API Client

**UnifiedApiClient** (`src/services/api.js`):
- Automatic retry with exponential backoff (3 attempts)
- Connection monitoring (online/offline detection)
- Health checking (30-second intervals)
- Offline caching with localStorage (24-hour TTL)
- Request/response interceptors

---

## 4. Backend Services

### Server Configuration

**Entry Point:** `backend/server.js` (2,503 lines)

**Middleware Stack:**
1. Helmet (security headers)
2. CORS (cross-origin requests)
3. Body parsing (5MB limit)
4. Prometheus metrics
5. Memory monitoring
6. Error handling

### API Routes

| Route | File | Purpose |
|-------|------|---------|
| `/api` | `api.js` | Core batch/sample operations |
| `/api/auth` | `auth.js` | Authentication (JWT) |
| `/api/samples` | `samples.js` | Sample CRUD |
| `/api/genetic-analysis` | `genetic-analysis.js` | OSIRIS integration, FSA upload |
| `/api/paternity` | `paternity.js` | Paternity calculations |
| `/api/forensic-reports` | `forensic-reports.js` | Forensic reporting |
| `/api/str-matching` | `str-matching.js` | DNA profile matching |
| `/api/qms` | `qms.js` | Quality management |
| `/api/inventory` | `inventory.js` | Reagent tracking |
| `/api/ai-ml` | `ai-ml.js` | AI/ML endpoints |
| `/api/admin` | `admin.js` | Admin operations |
| `/api/case-management` | `case-management.js` | Case lifecycle |

### Core Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| `database.js` | PostgreSQL/SQLite connection | `query()`, `transaction()`, `getHealthCheck()` |
| `paternityCalculator.js` | CPI calculations | `calculateCPI()`, `generateReport()` |
| `strProfileMatcher.js` | DNA matching | `compareProfiles()`, `calculateKinship()` |
| `reportGenerator.js` | PDF generation | `generateEnhancedPaternityReport()` |
| `fsaProcessor.js` | FSA file parsing | `parseFSA()`, `callAlleles()` |
| `osirisLauncher.js` | OSIRIS app control | `launchOsiris()`, `launchWithAutoConfig()` |
| `strImporter/` | STR file import | Adapters for OSIRIS, GeneMapper |
| `backgroundJobs.js` | Scheduled tasks | Cron jobs for processing |

### Workflow Stages

```
sample_collected → dna_extraction → pcr_ready → pcr_batched → pcr_completed
       ↓
electro_ready → electro_batched → electro_completed → analysis_ready
       ↓
analysis_completed → report_ready → report_sent
```

---

## 5. Database Layer

### Connection Strategy

**PostgreSQL (Production):**
- Connection pooling (20 connections max)
- Retry logic with exponential backoff (5 retries)
- SSL/TLS support
- Kubernetes service discovery

**SQLite (Development Fallback):**
- Automatic fallback if PostgreSQL unavailable
- Same schema with SQL conversion

### Core Tables

| Table | Purpose |
|-------|---------|
| `test_cases` | Case management |
| `samples` | Individual samples |
| `batches` | PCR/Electrophoresis batches |
| `well_assignments` | Plate well mappings |
| `quality_control` | QC records |
| `reports` | Generated reports (JSONB) |
| `users` | User accounts |
| `osiris_analyses` | OSIRIS job tracking |

### Configuration

```bash
# Environment Variables
DATABASE_HOST=postgres.production.svc.cluster.local
DB_PORT=5432
DB_NAME=lims_db
DB_USER=lims_user
DB_PASSWORD=<from-vault>
```

---

## 6. OSIRIS Integration

### What is OSIRIS?

OSIRIS (Open Source STR Interpretation System) is an external application for analyzing STR (Short Tandem Repeat) DNA profiles from genetic analyzer output.

### Integration Architecture

```
FSA File Upload
       ↓
┌──────────────┐
│ FSAProcessor │ Parse binary FSA files
└──────┬───────┘
       ↓
┌──────────────┐
│OsirisLauncher│ Launch OSIRIS with auto-config
└──────┬───────┘
       ↓
┌──────────────┐
│   OSIRIS     │ External STR analysis
└──────┬───────┘
       ↓
┌──────────────┐
│ STR Importer │ Parse .oar XML results
└──────┬───────┘
       ↓
┌──────────────┐
│  Database    │ Store profiles
└──────────────┘
```

### Workspace Structure

```
backend/osiris_workspace/
├── config/              # Kit configurations (PowerPlex ESX 17)
├── input/               # FSA files from genetic analyzers
├── output/              # OSIRIS results (.oar, .plt files)
└── temp/                # Temporary processing
```

### STR Importer Adapters

| Adapter | Format | Purpose |
|---------|--------|---------|
| `osirisAdapter.js` | .oar XML | Parse OSIRIS output |
| `genemapperAdapter.js` | Tab-delimited | Parse GeneMapper export |
| `syntheticAdapter.js` | Generated | Demo/test data |

---

## 7. Key Features

### 7.1 Paternity Testing

- **CPI Calculation**: Cumulative Paternity Index computation
- **Statistical Analysis**: Probability of paternity
- **16-Locus Analysis**: PowerPlex ESX 17 kit support
- **Report Generation**: PDF reports with electropherograms

### 7.2 Forensic Analysis

- **Case Management**: Track forensic cases through workflow
- **STR Matching**: CODIS-compatible profile comparison
- **Mixture Interpretation**: Multi-contributor deconvolution
- **Kinship Analysis**: Relationship determination

### 7.3 Quality Management (ISO 17025)

- **Equipment Calibration**: Track calibration schedules
- **QC Batches**: Quality control validation
- **Audit Trails**: Complete action logging
- **Document Control**: Version-controlled procedures

### 7.4 Inventory Management

- **Reagent Tracking**: Stock levels, lot numbers
- **Expiry Management**: Alert on expiring items
- **Supplier Management**: Vendor information
- **Usage Logging**: Track consumption

### 7.5 AI/ML Analysis

- **Predictive Maintenance**: Equipment failure prediction
- **Anomaly Detection**: Unusual result flagging
- **Workflow Optimization**: Processing efficiency

---

## 8. DevOps Infrastructure

### Environment Strategy

| Environment | Branch | Namespace | Purpose |
|-------------|--------|-----------|---------|
| **Test** | feature/* | test | Feature testing |
| **Develop** | develop | develop | Integration testing |
| **Production** | main | production | Live system |

### Port Mapping

| Service | Test | Develop | Production |
|---------|------|---------|------------|
| Backend | 30101 | 30201 | 30007 |
| Frontend | 30102 | 30202 | 30005 |

### Infrastructure as Code

**Terraform Modules** (`infrastructure/modules/`):
- `aws-vpc/` - VPC, subnets, NAT gateway
- `aws-ec2/` - k3s server instances
- `aws-security-group/` - Network access control
- `k8s-namespace/` - Kubernetes namespaces
- `k8s-helm-release/` - Helm deployments

**Terragrunt Environments** (`infrastructure/live/`):
```
live/
├── aws-infra/
│   ├── vpc/
│   └── ec2/
└── k3s/
    ├── test/
    ├── develop/
    └── production/
```

---

## 9. Kubernetes & Helm

### Helm Chart Structure

```
helm/lims/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values
├── values-production.yaml  # Production overrides
├── values-develop.yaml     # Develop overrides
├── values-test.yaml        # Test overrides
└── templates/
    ├── backend-deployment.yaml
    ├── frontend-deployment.yaml
    ├── configmap.yaml
    ├── db-secret.yaml
    ├── hpa.yaml            # Horizontal Pod Autoscaler
    ├── pdb.yaml            # Pod Disruption Budget
    ├── ingress.yaml
    └── servicemonitor.yaml # Prometheus integration
```

### Production Configuration

```yaml
# values-production.yaml highlights
backend:
  replicaCount: 2
  resources:
    requests: { memory: "512Mi", cpu: "500m" }
    limits: { memory: "1Gi", cpu: "1000m" }

frontend:
  replicaCount: 2
  resources:
    requests: { memory: "128Mi", cpu: "100m" }

postgresql:
  enabled: true
  persistence:
    size: 10Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  hosts:
    - host: lims.jagdevops.co.za
```

### ArgoCD Applications

**Project:** `portfolio` (argocd/projects/portfolio-project.yaml)
- Restricts to production/develop/test namespaces
- RBAC for devops-team (admin) and developers (read+sync)

**Applications:**
- `lims` - Main LIMS application (Helm chart)
- `pharma` - Pharma frontend (raw manifests)
- `finance` - Finance application (raw manifests)

### External Secrets

Secrets synced from HashiCorp Vault:
- `lims-secrets` - DB credentials, JWT secret, API key
- `pharma-secrets` - App configuration
- `finance-secrets` - App configuration

---

## 10. CI/CD Pipelines

### GitHub Actions Workflows

#### 1. CI Pipeline (ci.yml)
**Triggers:** All branches, PRs

**Jobs:**
1. **Lint & Test** - ESLint, Vitest, Jest
2. **Build** - Vite production build
3. **Docker Build** - Build images (no push)
4. **Security Scan** - npm audit

#### 2. Deploy to Test (deploy-test.yml)
**Triggers:** feature/* branches

**Flow:**
```
Build & Push Images → Helm Deploy to test namespace → Comment PR with URLs
```

#### 3. Deploy to Develop (deploy-develop.yml)
**Triggers:** develop branch

**Flow:**
```
Build & Push Images → Helm Deploy to develop → Smoke Tests
```

#### 4. Deploy to Production (deploy-production.yml)
**Triggers:** main branch

**Flow:**
```
Build & Push Images → Helm Deploy to production → ArgoCD Sync → Smoke Tests
```

#### 5. Cleanup (cleanup.yml)
**Triggers:** PR close on feature/*

**Action:** Uninstall Helm release from test namespace

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `DOCKER_REGISTRY` | Container registry URL |
| `TS_OAUTH_CLIENT_ID` | Tailscale VPN |
| `TS_OAUTH_SECRET` | Tailscale VPN |
| `KUBECONFIG_B64` | Kubernetes access |
| `DB_PASSWORD` | PostgreSQL password |
| `ARGOCD_AUTH_TOKEN` | ArgoCD API |

---

## 11. Monitoring Stack

### Components (Server2)

| Service | Port | Purpose |
|---------|------|---------|
| Prometheus | 9090 | Metrics collection |
| Grafana | 3000 | Dashboards |
| Alertmanager | 9093 | Alert routing |
| Loki | 3100 | Log aggregation |
| Node Exporter | 9100 | System metrics |
| Locust | 8089 | Load testing |

### Prometheus Scrape Targets

```yaml
scrape_configs:
  - job_name: 'lims-production'
    static_configs:
      - targets: ['100.89.26.128:30007']
  - job_name: 'lims-develop'
    static_configs:
      - targets: ['100.89.26.128:30201']
  - job_name: 'lims-test'
    static_configs:
      - targets: ['100.89.26.128:30101']
```

### Alert Rules

**Critical Alerts:**
- `LIMSBackendDown` - Backend unreachable >1 minute
- `LIMSProductionUnhealthy` - Production down >30 seconds

**Warning Alerts:**
- `LIMSHighErrorRate` - Error rate >5% for 5 minutes
- `LIMSHighLatency` - p95 >2 seconds
- `LIMSHighMemory` - Memory >85%
- `LIMSHighCPU` - CPU >80%

### Grafana Dashboards

- **Portfolio Overview** - All apps status
- **LIMS Workflow** - Sample pipeline flow
- **CI/CD Pipeline** - Build/deploy metrics
- **Server Resources** - CPU, memory, disk

### Load Testing (Locust)

**Scenarios:**
| Type | Users | Duration | Purpose |
|------|-------|----------|---------|
| Smoke | 1 | 1 min | Endpoint verification |
| Load | 50 | 5 min | Normal load |
| Stress | 200 | 10 min | Breaking points |

**Performance Targets:**
- p50: <100ms
- p95: <500ms
- p99: <1000ms
- Error rate: <1%

---

## 12. Security

### Authentication

- **JWT Tokens** - 24-hour expiry
- **bcrypt** - Password hashing (10 rounds)
- **Role-based Access** - Staff/Admin roles
- **Token Blacklist** - Logout invalidation

### Middleware Security

1. **Helmet** - Security headers
2. **HPP** - HTTP Parameter Pollution protection
3. **CORS** - Configurable origins
4. **Rate Limiting** - 100 requests/15 minutes
5. **Input Validation** - XSS/SQL injection prevention

### Secret Management

- **HashiCorp Vault** - Central secret store
- **External Secrets Operator** - Kubernetes sync
- **GitHub Actions Secrets** - CI/CD credentials

### Audit Logging

- All user actions logged
- Database changes tracked
- Access logs maintained
- Winston logger with rotation

---

## 13. Testing Infrastructure

### Frontend Testing (Vitest)

**Configuration:** `vitest.config.js`
- Environment: jsdom
- Coverage: 60% threshold
- MSW for API mocking

**Test Utilities:**
- `renderWithProviders()` - Full context rendering
- `generateMockSample()` - Test data
- `mockApiClient` - API mocking

### Backend Testing (Jest)

**Configuration:** `backend/jest.config.js`
- Environment: node
- Coverage: 60% threshold
- Supertest for HTTP

**Test Suites:**
- API endpoint tests (13 files)
- STR importer tests (159 tests)
- Integration tests (2 workflows)

### Test Commands

```bash
# Frontend
npm test              # Interactive
npm run test:run      # Single run
npm run test:coverage # With coverage

# Backend
npm run test:backend  # Jest tests
cd backend && npm test

# All
npm run test:all      # Frontend + Backend
```

---

## 14. Quick Start Guide

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (optional, SQLite fallback)
- Docker (for containerized deployment)

### Development Setup

```bash
# 1. Clone repository
git clone https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA.git
cd JAG-LABSCIENTIFIC-DNA

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Start development servers
npm run dev:all

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

### Database Seeding

```bash
npm run seed:database       # Quick seed
npm run seed:comprehensive  # Full seed
```

### Running Tests

```bash
npm test              # Frontend tests
npm run test:backend  # Backend tests
npm run test:all      # All tests
```

### Docker Build

```bash
# Backend
cd backend
docker build -t lims-backend:latest .

# Frontend
docker build -f Dockerfile.frontend -t lims-frontend:latest .
```

### Kubernetes Deployment

```bash
# Using Helm
helm upgrade --install lims helm/lims \
  --namespace production \
  --values helm/lims/values-production.yaml

# Using Terragrunt
cd infrastructure/live/k3s/production
terragrunt apply
```

### Monitoring Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://100.103.13.92:3000 | admin / portfolio123 |
| Prometheus | http://100.103.13.92:9090 | - |
| Alertmanager | http://100.103.13.92:9093 | - |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Frontend Components | 76 files |
| Backend Services | 28+ files |
| API Routes | 18 endpoints |
| Custom Hooks | 13 hooks |
| UI Components | 22 components |
| Feature Components | 45 components |
| Helm Templates | 10+ templates |
| CI/CD Workflows | 5 pipelines |
| Alert Rules | 13 rules |
| Test Suites | 22+ files |

---

*Document generated: 2026-05-24*
*Version: 1.0.0*
