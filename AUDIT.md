# LIMS Codebase Architectural Audit

**Date:** 2026-05-02
**Auditor:** Claude Code (Automated Analysis)
**Repository:** JAG-LABSCIENTIFIC-DNA
**Branch:** feature/ui-refresh

---

## Phase 1: Map the Territory

### 1.1 Directory Structure (Depth 3)

| Directory | Description |
|-----------|-------------|
| `src/` | React frontend - components, hooks, contexts, services |
| `src/components/features/` | Feature components (25+) - PCRPlate, GeneticAnalysis, Reports, etc. |
| `src/components/ui/` | Shared UI components - shadcn-style primitives |
| `src/components/layout/` | Layout components - Sidebar |
| `src/hooks/` | Custom React hooks - useApi, useTheme, useTable, etc. |
| `src/contexts/` | React contexts - Auth, Theme, PaternityForm |
| `src/services/` | API client and utilities |
| `backend/` | Express.js backend server |
| `backend/routes/` | 18 route files for API endpoints |
| `backend/services/` | 29 service files - business logic, Osiris integration |
| `backend/middleware/` | Auth, metrics, healthcheck, security middleware |
| `backend/osiris_workspace/` | FSA input/output dirs with test files |
| `k8s/` | Kubernetes manifests (7 files) - most recent |
| `k8s-manifests/` | Duplicate K8s manifests (2 files) - minimal |
| `k3s/` | K3s-specific deployment files (3 files) |
| `helm-charts/lims-chart/` | Helm chart with **empty templates directory** |
| `terraform/` | Partial Terraform config (4 files) |
| `argocd/` | ArgoCD application manifest (1 file) |
| `docker/` | Standalone Docker demo (3 files) - appears unused |
| `tests/` | Test stubs - mostly empty directories |
| `.github/workflows/` | Single CI/CD workflow |
| `scripts/` | Build/utility scripts |
| `devops-scripts/` | DevOps utility scripts |

### 1.2 Lines of Code by Language (Estimated)

| Language | LOC | Notes |
|----------|-----|-------|
| JavaScript/JSX | ~88,600 | Primary application code |
| CSS | ~1,500 | Tailwind + custom styles |
| YAML | ~2,800 | K8s, Docker Compose, CI configs |
| Shell Scripts | ~3,100 | 14 scripts at root level |
| JSON | ~5,000+ | package.json, configs, test data |

### 1.3 Root Config File Classification

| File | Classification | Reason |
|------|----------------|--------|
| `package.json` | **ACTIVE** | Main npm config |
| `vite.config.js` | **ACTIVE** | Frontend build |
| `vitest.config.js` | **ACTIVE** | Test config |
| `tailwind.config.js` | **ACTIVE** | CSS framework |
| `postcss.config.js` | **ACTIVE** | CSS processing |
| `docker-compose.yml` | **ACTIVE** | Local dev with PostgreSQL |
| `docker-compose.dev.yml` | **UNCLEAR** | More complex dev setup, references non-existent `Dockerfile.dev` |
| `docker-compose.dev-postgres.yml` | **LEGACY** | Simpler postgres setup, superseded |
| `docker-compose.production.yml` | **ACTIVE** | Production deployment |
| `nginx.conf` | **UNCLEAR** | Referenced by docker-compose but basic |
| `grafana-dashboard.json` | **BROKEN** | Queries metrics the app doesn't emit (see Phase 4) |
| `argocd-application.yaml` | **LEGACY** | Duplicate of `argocd/application.yaml` |
| `eslint.config.mjs` | **UNCLEAR** | Exists but `.eslintrc.ci.js` is used by npm scripts |
| `components.json` | **ACTIVE** | shadcn/ui config |
| `jsconfig.json` | **ACTIVE** | JS path aliases |
| `start.sh` | **LEGACY** | Replaced by `start-full-app.sh` and npm scripts |
| `setup.sh` | **UNCLEAR** | Not referenced anywhere |
| `setup-dev.sh` | **UNCLEAR** | Not referenced anywhere |
| `build.sh` | **LEGACY** | Superseded by npm build scripts |
| `build-production.sh` | **UNCLEAR** | Complex, not in CI |
| `deploy-*.sh` (4 files) | **UNCLEAR** | Manual deployment scripts, not in CI |
| `cleanup-repo.sh` | **UNCLEAR** | One-time use |
| `validate-production-deployment.sh` | **UNCLEAR** | Not in CI |
| `portfolio-status.sh` | **UNCLEAR** | Demo script |
| `start-dev.js` | **LEGACY** | Not referenced in package.json |

**Shell Script Sprawl:** 14 shell scripts totaling 2,522 lines at repo root. Most are not referenced by CI/CD.

---

## Phase 2: Application Audit

### 2.1 Frontend UI Library Usage

| Library | Files Using | Import Count | Notes |
|---------|-------------|--------------|-------|
| **@mui/material** | 56 | 103 | Primary UI framework |
| **@mui/icons-material** | 56 | ~200+ | Icons throughout |
| **@radix-ui/*** | 7 | 7 | Used only in `src/components/ui/*.jsx` |
| **shadcn/ui components** | ~4 | ~4 | `src/components/ui/` pattern but minimal |
| **lucide-react** | 7 | 7 | Icons in select components |
| **recharts** | 2 | 2 | Charts (Statistics, QpcrQuantification) |
| **chart.js** | 0 | 0 | In deps but NOT IMPORTED |
| **Tailwind classes** | ~310 uses | - | Mixed with MUI |

**Verdict:** Heavy MUI usage (56 components), Radix primitives for 7 UI components. Mixed UI paradigm - MUI for features, Radix/shadcn for primitives. Chart.js is a dead dependency.

### 2.2 Five Largest/Most Complex Components

| Component | LOC | Complexity Notes |
|-----------|-----|------------------|
| `GenerateBatch.jsx` | 1,942 | Batch creation workflow, heavy state |
| `PaternityTestForm.jsx` | 1,920 | Multi-step form with validation |
| `ElectrophoresisLayout.jsx` | 1,804 | Well plate visualization |
| `AnalysisSummary.jsx` | 1,664 | Analysis results display |
| `ClientRegister.jsx` | 1,418 | Client registration form |

All exhibit similar patterns: inline API calls, local state, no separation of concerns.

### 2.3 Dead Code / Unused Components

**Components never imported outside their own file:**
- `OsirisIntegration.jsx` - 0 imports
- `OsirisWorkspaceManager.jsx` - 0 imports
- `SampleTracking.jsx` - 0 imports
- `WellPlateVisualization.jsx` - 0 imports
- `ElectrophoresisBatches.jsx` - 0 imports
- `AdminPanel.jsx` - 0 imports (no route)
- `PaternityCalculator.jsx` - 0 imports
- `PhotoCapture.jsx` - 0 imports
- `AnalysisProgressTracker.jsx` - 0 imports

**Dead dependencies in package.json:**
- `chart.js` / `react-chartjs-2` - never imported
- `shadcn-ui` - CLI tool, shouldn't be in dependencies

### 2.4 Routing Analysis

Routes in `App.jsx` are clean. All routes render lazy-loaded components wrapped in ErrorBoundary.

**Orphan routes:** None detected - all routes have corresponding components.

**Missing routes for existing components:** AdminPanel, PaternityCalculator, PhotoCapture have no routes.

### 2.5 Hardcoded Config / URLs

| Location | Issue | Risk |
|----------|-------|------|
| Multiple components | `import.meta.env.VITE_API_URL \|\| '/api'` | OK - fallback pattern |
| `vite.config.js` | Proxy to `localhost:3001` | OK - dev only |
| `backend/services/database.js:44` | `password: ... 'lims2024secure'` | **Default password in code** |
| `docker-compose*.yml` | `POSTGRES_PASSWORD: lims_password` | **Plaintext passwords** |
| `k8s/backend.yaml:30` | `DATABASE_URL` with password | **Secrets in manifests** |

---

## Phase 2B: Backend Audit

### 2.6 Route Files and Endpoints

| Route File | Mount Path | Key Endpoints |
|------------|------------|---------------|
| `api.js` | `/api` | `GET/POST /batches` |
| `auth.js` | `/api/auth` | `/login`, `/me`, `/refresh`, `/logout`, `/register`, `/users` |
| `samples.js` | `/api/samples` | CRUD + `/counts`, `/search` |
| `genetic-analysis.js` | `/api/genetic-analysis` | File uploads, `/launch-osiris`, `/results` |
| `paternity.js` | `/api/paternity` | `/calculate`, `/validate-trio`, `/simulate/:caseId` |
| `forensic-reports.js` | `/api/forensic-reports` | `/paternity`, `/kinship`, `/download/:id` |
| `reports.js` | `/api/reports` | CRUD + `/stats`, `/download`, `/view` |
| `qms.js` | `/api/qms` | CAPA, equipment, documents, training |
| `inventory.js` | `/api/inventory` | Items, lots, transactions, reports |
| `case-management.js` | `/api/case-management` | Cases CRUD, workload, alerts |
| `str-matching.js` | `/api/str-matching` | `/compare`, `/kinship`, `/search` |
| `ai-ml.js` | `/api/ai-ml` | Predictive maintenance, anomaly detection (all mock) |
| `admin.js` | `/api/admin` | Status, jobs, GC trigger |
| `performance.js` | `/api/performance` | `/slow`, `/memory-leak`, `/cpu-intensive` (chaos endpoints) |
| `quality.js` | `/api/quality` | `/metrics`, `/check`, `/calibration` |
| `devops-dashboard.js` | `/api/devops` | `/stats`, `/activity`, `/throughput` |
| `database-viewer.js` | `/api/db` | Debug endpoints for viewing tables |
| `documentation.js` | `/api/docs` | API documentation endpoints |

### 2.7 Database Layer

**Configuration:** `backend/services/database.js`

- **Primary:** PostgreSQL via `pg` with connection pooling
- **Fallback:** SQLite via `better-sqlite3` when PostgreSQL unavailable
- **Migrations:** **NONE** - schema created inline in service
- **ORM:** **NONE** - raw SQL queries
- **Connection pooling:** Yes, max 20 connections

**Risks:**
- No migration system = manual schema management
- Raw SQL throughout (parameterized, but verbose)
- Fallback logic makes testing complex

### 2.8 Health/Metrics/Performance Endpoints

| Endpoint | Implementation | Status |
|----------|----------------|--------|
| `GET /health` | Returns DB connection status | **Working** |
| `GET /api/health` | Same as above | **Working** |
| `GET /health/live` | Kubernetes liveness probe | **Working** |
| `GET /health/ready` | Kubernetes readiness probe | **Working** |
| `GET /health/memory` | Memory stats | **Working** |
| `GET /metrics` | Prometheus metrics | **Partial** - see Phase 4 |
| `GET /api/performance/slow` | Intentional slow endpoint | **Chaos testing** |
| `POST /api/performance/memory-leak` | Intentional memory leak | **Chaos testing** |
| `POST /api/performance/cpu-intensive` | CPU burn | **Chaos testing** |

**Note:** The `/ready` endpoint is at `/health/ready` but `k8s/backend.yaml` probes `/ready` (wrong path).

### 2.9 Winston Logger Configuration

**Location:** `backend/utils/logger.js`

```javascript
// Custom logger, NOT winston despite winston in deps
class Logger {
  // Writes JSON to backend/logs/YYYY-MM-DD.log
  // Console output in development only
}
```

**Issues:**
- Despite Winston being in `package.json`, the logger is custom
- Logs are JSON-structured (good)
- No log rotation (files accumulate)
- No external sink configuration
- Daily log files by date

### 2.10 Middleware Order

From `backend/server.js`:

1. `cors()` - CORS handling
2. Static file serving (production)
3. `express.json({ limit: '5mb' })` - Body parser
4. `express.urlencoded()` - URL-encoded parser
5. `metricsMiddleware` - Prometheus metrics
6. `// sanitizeInput` - **COMMENTED OUT** with `// TODO: Fix`
7. Routes mounted

**Missing/Wrong:**
- ❌ `helmet()` - security headers NOT applied (imported but not used)
- ❌ `hpp()` - HTTP parameter pollution NOT applied
- ❌ Rate limiting NOT applied globally (only on some routes)
- ❌ `sanitizeInput` disabled with TODO

### 2.11 SQL Injection / Input Validation

**Good:**
- PostgreSQL queries use parameterized queries (`$1`, `$2` placeholders)
- Most routes check for required fields

**Bad:**
- `sanitizeInput` middleware is disabled
- No schema validation (no Joi, Zod, etc.)
- Some routes construct queries with string interpolation in `WHERE` clauses

---

## Phase 3: Data Flow Audit (CRITICAL)

### 3A: Data Origin Inventory

#### Seed Scripts

| Script | Location | What It Creates | Data Quality |
|--------|----------|-----------------|--------------|
| **simple-seed.js** | `backend/scripts/` | Basic samples | Fake names ("John Doe") |
| **seed-database.js** | `backend/scripts/` | Comprehensive seed | Uses `@faker-js/faker` for realistic data |
| **fix-samples.js** | `backend/scripts/` | Repairs workflow status | N/A |

#### Mock Sample Generation

**Environment Variables:**
- `ENABLE_MOCK_SAMPLES=true` - Enables sample cycling
- `SAMPLE_CYCLE_INTERVAL=30000` - 30 second cycle

**SimpleSampleCycler** (`backend/services/simpleSampleCycler.js`):
- Creates 5 hardcoded samples: "John Doe", "Jane Smith", "Bob Johnson", "Alice Brown", "Charlie Wilson"
- Cycles them through workflow stages every 30 seconds
- **Works WITHOUT database** - pure in-memory

**EnhancedSampleCycler** (`backend/services/enhanced-sample-cycler.js`):
- Generates samples using config in `workflow-config.js`
- Random names from predefined lists
- Simulates full workflow with configurable timing
- Requires database connection

**Workflow Config** (`backend/config/workflow-config.js`):
- Generates 3 samples every 10 seconds
- Max 200 active samples
- Auto-cleanup after 1 hour
- **Explicitly designed for "DevOps demonstration"**

#### Hardcoded Fixture Data

| Location | Content |
|----------|---------|
| `simpleSampleCycler.js` | 5 hardcoded names |
| `workflow-config.js` | 24 first names, 24 last names |
| `paternityCalculator.js` | Allele frequency tables (Caucasian population) |
| `osirisEnhancedSTRAnalyzer.js` | **Generates random mock STR profiles** |

#### PII / Real Data Risk

| Path | Status |
|------|--------|
| `*.db`, `*.sqlite` | None committed |
| `backend/osiris_workspace/input/*.fsa` | Test FSA files with fake IDs |
| `backend/osiris_workspace/input/*.csv` | Fake genetic analyzer exports |
| `backend/.env` | Exists but likely `.gitignore`d |

**Verdict:** No real PII detected. All data is synthetic.

### 3B: Data Flow Tracing

#### 1. INTAKE: Sample Entry

```
Frontend: PaternityTestForm.jsx
    → POST /api/submit-test or POST /api/samples
    → backend/routes/samples.js or api.js
    → database.createSample()
    → PostgreSQL/SQLite
```

**Fields:** lab_number, name, surname, relation, case_number, workflow_status, collection_date

**Validation:** Minimal - checks for required fields, no schema validation

**Status: REAL CODE** - but typically fed mock data

#### 2. BATCH: Sample Grouping

```
Frontend: GenerateBatch.jsx, PCRPlate.jsx
    → POST /api/batches or /api/generate-batch
    → Creates batch record
    → Associates samples via batch_id
```

**Batch States:** pending → loaded → running → complete (conceptual, not enforced)

**Status: REAL CODE** - manual batching through UI

#### 3. OSIRIS: STR Analysis

```
Backend: OsirisIntegration.js
    → References external/osiris_software/Osiris-2.16.app
    → **DIRECTORY DOES NOT EXIST**

Fallback: OsirisEnhancedSTRAnalyzer.js
    → Line 15: "// Placeholder analysis - in production this would process real FSA data"
    → Generates RANDOM mock allele values
```

**Status: MOCK** - Osiris integration is fake. The analyzer generates random numbers.

#### 4. RESULTS: Analysis Storage

```
OsirisIntegration.analyzePaternityCase()
    → Calls strAnalyzer.analyzeSTRProfile()  (returns random data)
    → Writes JSON to backend/osiris_workspace/output/
    → Returns mock STR profiles
```

**Storage:** JSON files on disk, no database persistence of STR profiles

**Status: MOCK** - results are fabricated

#### 5. REPORTS: PDF Generation

```
Backend: forensicReportGenerator.js
    → Uses PDFKit (real)
    → Generates actual PDF files
    → Stores in backend/reports/
    → Serves via /api/forensic-reports/download/:id
```

**Status: PARTIAL** - Real PDF generation, but fed with mock data

#### 6. EXPORT: Data Export

```
Dependencies: googleapis, exceljs, xlsx
    → googleapis: Google Sheets integration (auth code commented out)
    → exceljs: Used in report generation
    → xlsx: Present but usage unclear
```

**Status: PARTIAL** - Excel export likely works, Google integration disabled

### 3C: Data Flow Diagram

```mermaid
flowchart TD
    subgraph Frontend["Frontend (React)"]
        UI[PaternityTestForm / GenerateBatch]
    end

    subgraph Backend["Backend (Express)"]
        API["/api/samples, /batches"]
        CYCLER[EnhancedSampleCycler<br/>MOCK: generates fake samples]
        OSIRIS[OsirisIntegration<br/>MOCK: random STR profiles]
        REPORT[ForensicReportGenerator<br/>REAL: generates PDFs]
    end

    subgraph Storage["Storage"]
        DB[(PostgreSQL/SQLite)]
        FILES[/osiris_workspace/output/]
        PDFS[/reports/*.pdf]
    end

    UI -->|POST /api/samples| API
    CYCLER -->|Auto-generate| DB
    API -->|CRUD| DB

    API -->|Launch analysis| OSIRIS
    OSIRIS -->|Random data| FILES

    API -->|Generate report| REPORT
    REPORT -->|PDF| PDFS
    DB -->|Sample data| REPORT
    FILES -.->|"Would read results"| REPORT

    style CYCLER fill:#ff9800,color:#000
    style OSIRIS fill:#ff9800,color:#000
    style REPORT fill:#4caf50,color:#fff
    style API fill:#4caf50,color:#fff
    style DB fill:#4caf50,color:#fff

    classDef mock fill:#ff9800,color:#000
    classDef real fill:#4caf50,color:#fff
```

**Legend:**
- 🟠 MOCK - Generates fake data
- 🟢 REAL - Working code

---

## Phase 4: Observability Audit

### 4A: Logging Analysis

#### Log Categories Found

| Category | Present | Examples |
|----------|---------|----------|
| App lifecycle | ✅ | Database init, server start |
| HTTP requests | ✅ | Via metrics middleware |
| Business events | ⚠️ Partial | Sample creation logged, but not progression |
| Errors | ✅ | Caught exceptions logged |
| Security events | ✅ | Auth failures, rate limit hits |
| Audit trail | ✅ | Via audit-trail middleware |

#### Business Event Logging Coverage

| Event | Logged? |
|-------|---------|
| Sample intake | ✅ `logger.error('Error creating sample'...)` on failure only |
| Sample workflow progression | ❌ No logging |
| Batch creation | ❌ No logging |
| Osiris invocation | ❌ No logging |
| Report generation | ✅ `logger.info('Paternity report generated'...)` |
| Export | ❌ No logging |

#### Log Format

- **Structure:** JSON with timestamp, level, message, metadata
- **Fields:** timestamp, level, message, + arbitrary meta
- **Missing:** request ID, correlation ID, user ID in most logs
- **Destination:** `backend/logs/YYYY-MM-DD.log` files
- **Rotation:** None (daily files, but no cleanup)
- **External sink:** None configured

#### PII in Logs

- Sample IDs logged (low risk if synthetic)
- No names/DNA profiles logged
- Error stacks may contain sensitive paths

### 4B: Metrics Analysis

#### Prometheus Metrics Defined

| Metric | Type | Labels | Actually Emitted? |
|--------|------|--------|-------------------|
| `http_request_duration_seconds` | Histogram | method, route, status_code | ✅ Yes |
| `http_requests_total` | Counter | method, route, status_code | ✅ Yes |
| `http_request_errors_total` | Counter | method, route, error_type | ✅ Yes |
| `lims_samples_processed_total` | Counter | status, workflow_stage | ⚠️ Sometimes |
| `lims_batches_created_total` | Counter | batch_type | ⚠️ Sometimes |
| `database_queries_total` | Counter | operation, table | ❌ Never called |
| `lims_active_users` | Gauge | - | ✅ Random mock value |
| `lims_queue_size` | Gauge | queue_type | ⚠️ Sometimes |
| `lims_processing_time_seconds` | Histogram | process_type | ⚠️ Sometimes |

#### Grafana Dashboard vs Actual Metrics

**Dashboard queries:**
```
container_cpu_usage_seconds_total{namespace="production",pod=~"jagdna-.*"}
container_memory_usage_bytes{namespace="production",pod=~"jagdna-.*"}
kube_pod_container_status_restarts_total{namespace="production"}
nginx_ingress_controller_requests{namespace="production"}
```

**Problem:** Dashboard queries Kubernetes/container metrics, NOT app metrics.
- No panels for `lims_*` metrics
- Assumes cAdvisor, kube-state-metrics, nginx-ingress are deployed
- **Dashboard will be empty** without full K8s observability stack

### 4C: Tracing & Alerting

| Feature | Present? |
|---------|----------|
| OpenTelemetry | ❌ No |
| Jaeger | ❌ No |
| Distributed tracing | ❌ No |
| Prometheus alert rules | ❌ No |
| AlertManager config | ❌ No |
| PagerDuty/Slack integration | ❌ No |

### 4D: Operability Verdict

> **"If a sample got stuck in the batch queue right now, would the operator know?"**

**Answer: No.**

There is no:
- Alert for queue depth
- Alert for sample age
- Dashboard panel for batch status
- Log entry for workflow transitions
- Metric for time-in-stage

The only way to notice would be manual inspection of the database or UI. Even then, there's no timestamp of when a sample entered its current stage.

**Detection time:** Hours to days, depending on when someone manually checks.

---

## Phase 5: Infrastructure Audit

### 5.1 Directory Comparison

| Directory | Files | Last Modified | Purpose |
|-----------|-------|---------------|---------|
| `k8s/` | 7 | Oct 2025 | Most complete K8s manifests |
| `k8s-manifests/` | 2 | Oct 2025 | Minimal deployment/service |
| `k3s/` | 3 | Oct 2025 | K3s-specific with PostgreSQL |
| `helm-charts/lims-chart/` | 2 + **empty templates/** | Oct 2025 | **Broken** - no templates |
| `terraform/` | 4 | Oct 2025 | Partial - backend only |
| `argocd/` | 1 | Sep 2025 | Application manifest |
| `docker/` | 3 | Sep 2025 | Standalone demo, unused |

### 5.2 Kubernetes Duplication Analysis

**k8s/ contains:**
- namespace.yaml
- configmap.yaml
- backend.yaml (deployment + service)
- frontend.yaml (deployment + service)
- postgres.yaml
- ingress.yaml
- deployment.yaml (duplicate of backend?)

**k8s-manifests/ contains:**
- deployment.yaml (simpler version)
- service.yaml

**k3s/ contains:**
- namespace.yaml
- postgresql.yaml
- lims-deployment-postgres.yaml (combined)

**Verdict:** Three overlapping K8s implementations. `k8s/` is most complete but has issues.

### 5.3 Helm Chart Analysis

**Chart.yaml:**
```yaml
apiVersion: v2
name: lims-chart
version: 0.1.0
appVersion: "1.0.3"
```

**values.yaml:** Has good structure (replicas, resources, autoscaling, forensics config)

**templates/:** **EMPTY DIRECTORY**

**Verdict:** Helm chart is non-functional. No templates to render.

### 5.4 Terraform Analysis

**Files:**
- `providers.tf` - Kubernetes provider
- `versions.tf` - Terraform version constraint
- `variables.tf` - Variables defined
- `main.tf` - Only backend deployment resource

**Missing:**
- No state backend configuration
- No frontend resource
- No database resource
- No service/ingress resources
- No module structure

**Verdict:** Terraform is a stub. Only creates backend deployment.

### 5.5 Dockerfile Analysis

| Dockerfile | Multi-stage? | Non-root? | Issues |
|------------|--------------|-----------|--------|
| `backend/Dockerfile` | No | No (runs as root) | `npm install --force`, no healthcheck |
| `frontend/Dockerfile` | Yes | No | `npm run build \|\| true` ignores failures |
| `docker/Dockerfile` | No | No | Standalone demo |

### 5.6 Docker Compose Comparison

| Feature | docker-compose.yml | docker-compose.dev.yml | docker-compose.production.yml |
|---------|-------------------|------------------------|------------------------------|
| Services | postgres, backend, frontend, redis | app, postgres, redis, dev-tools, prometheus, grafana | postgres, app, nginx, prometheus, grafana |
| PostgreSQL version | 14-alpine | 15-alpine | 15-bookworm |
| Secrets | Hardcoded | Hardcoded | Env var with fallback |
| Monitoring | None | Optional | Optional profiles |
| Dockerfile ref | `./backend/Dockerfile`, `./frontend/Dockerfile` | `Dockerfile.dev` (**doesn't exist**) | `Dockerfile.production` |

**Issue:** `docker-compose.dev.yml` references `Dockerfile.dev` which doesn't exist.

---

## Phase 6: CI/CD Audit

### 6.1 GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

**Triggers:** push/PR to main

**Jobs:**

| Job | Status | Issues |
|-----|--------|--------|
| `build-and-test` | ⚠️ | `npm test --if-present` with `continue-on-error: true` |
| `build-and-push-images` | ⚠️ | References `./frontend/Dockerfile` (exists), assumes secrets |
| `update-manifests` | ⚠️ | sed modifies k8s/ files, commits back |
| `deploy-to-staging` | ⚠️ | SSH to SERVER2 with assumed secrets |
| `sync-argocd` | ⚠️ | Requires ARGOCD_SERVER, ARGOCD_TOKEN secrets |
| `notify` | ✅ | Simple echo |

**Issues:**
1. Tests can fail silently (`continue-on-error: true`)
2. Relies on 6+ secrets that may not be configured
3. Modifies repo in CI (sed + commit)
4. No Jenkinsfile despite being listed in README

### 6.2 Shell Scripts at Root

| Script | Purpose | Called By? |
|--------|---------|------------|
| `start.sh` | Start backend | Not in CI |
| `setup.sh` | Initial setup | Not in CI |
| `setup-dev.sh` | Dev setup | Not in CI |
| `build.sh` | Build app | Not in CI |
| `build-production.sh` | Production build | Not in CI |
| `deploy-devops.sh` | Deploy devops stack | Not in CI |
| `deploy-lims-production.sh` | Deploy LIMS | Not in CI |
| `deploy-lims-production-postgresql.sh` | Deploy with PG | Not in CI |
| `deploy-production.sh` | Another deploy script | Not in CI |
| `docker-start.sh` | Docker startup | docker-compose command |
| `start-full-app.sh` | Full app start | Not in CI |
| `cleanup-repo.sh` | Cleanup | Not in CI |
| `portfolio-status.sh` | Show status | Not in CI |
| `validate-production-deployment.sh` | Validation | Not in CI |

**Verdict:** 14 shell scripts, none integrated with CI. Manual deployment process.

---

## Phase 7: Issues & Recommendations

### 7A: Bugs / Breakage

| Issue | Location | Severity |
|-------|----------|----------|
| Helm chart has no templates | `helm-charts/lims-chart/templates/` | **Critical** |
| Osiris executable path doesn't exist | `external/osiris_software/` | **Critical** |
| `docker-compose.dev.yml` references non-existent `Dockerfile.dev` | Root | **High** |
| K8s readiness probe path wrong | `k8s/backend.yaml:64` probes `/ready`, actual is `/health/ready` | **High** |
| `sanitizeInput` middleware disabled | `backend/server.js:214` | **High** |
| Grafana dashboard queries non-existent metrics | `grafana-dashboard.json` | **Medium** |
| `helmet()` imported but not applied | `backend/server.js` | **Medium** |
| TODO: Fix sanitizeInput middleware | `backend/server.js:214` | **Medium** |
| 10 feature components never imported | Various | **Low** |
| Chart.js in deps but never used | `package.json` | **Low** |

### 7B: Portfolio Risks

| Risk | Why It Matters |
|------|----------------|
| **Shell script sprawl** | 14 scripts at root, none in CI = manual deployment |
| **Duplicated K8s manifests** | 3 directories doing same thing, confusing |
| **Empty Helm templates** | Claims Helm support but chart is non-functional |
| **Terraform stub** | Only backend resource, no real IaC |
| **All Osiris integration is mock** | Core feature is fake, generates random data |
| **Mixed UI libraries** | MUI + Radix + Tailwind = inconsistent patterns |
| **Secrets in manifests** | Passwords in docker-compose and K8s YAML |
| **No migrations** | Schema changes require manual intervention |
| **Tests skip on failure** | CI uses `continue-on-error: true` |
| **Dashboard monitors wrong metrics** | Grafana queries container metrics, not app metrics |
| **No alerting** | Zero alert rules defined |
| **10 dead components** | Unused code bloat |
| **No log aggregation** | Logs only on disk |
| **No distributed tracing** | Can't trace requests across services |

---

## Top 10 Things to Fix First

Ordered by impact-per-hour-of-work:

| # | Fix | Effort | Impact | Why |
|---|-----|--------|--------|-----|
| 1 | **Fix K8s readiness probe path** | 5 min | High | App won't become ready in K8s |
| 2 | **Enable helmet() middleware** | 5 min | High | Security headers missing |
| 3 | **Delete duplicate infra directories** | 30 min | High | Keep only `k8s/`, delete `k8s-manifests/`, consolidate `k3s/` |
| 4 | **Add Helm templates or delete chart** | 1 hr | High | Non-functional chart is worse than none |
| 5 | **Remove 10 dead components** | 30 min | Medium | Reduce confusion and bundle size |
| 6 | **Fix Grafana dashboard** | 1 hr | Medium | Query actual `lims_*` metrics |
| 7 | **Move secrets to proper secret management** | 2 hr | High | Passwords in YAML is a red flag |
| 8 | **Add database migrations** | 4 hr | High | Professional data management |
| 9 | **Document that Osiris is mocked** | 30 min | Medium | Avoid confusion about what's real |
| 10 | **Consolidate shell scripts** | 2 hr | Medium | Reduce sprawl, integrate with CI |

---

## Summary

This is a **feature-complete portfolio application** with realistic DNA lab workflow simulation, but several DevOps claims don't hold up to scrutiny:

**What's Real:**
- Full-stack React/Express application
- PostgreSQL with SQLite fallback
- Docker multi-container setup
- Prometheus metrics collection
- PDF report generation
- Sample workflow state machine

**What's Mock/Broken:**
- Osiris STR analysis (generates random numbers)
- Helm chart (empty templates)
- Terraform (partial stub)
- Grafana dashboard (queries wrong metrics)
- 3 overlapping K8s implementations
- 14 shell scripts not in CI

**Verdict:** Good application skeleton, but infrastructure-as-code and observability are more "demo" than "production-ready." Fix the obvious breaks (Helm, metrics, probes) before showcasing.
