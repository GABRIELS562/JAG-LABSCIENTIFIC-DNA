# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LabScientific LIMS is a full-stack Laboratory Information Management System for DNA analysis, including paternity testing and forensic workflows. It integrates with OSIRIS (Open Source STR Interpretation System) for STR (Short Tandem Repeat) analysis using the PowerPlex ESX 17 kit.

## Development Commands

```bash
# Start frontend + backend together (recommended for development)
npm run dev:all

# Frontend only (Vite dev server on port 5173)
npm run dev

# Backend only (Express server on port 3001)
npm run server

# Build production frontend
npm run build

# Run frontend tests (Vitest)
npm test                    # Interactive mode
npm run test:run            # Single run
npm run test:coverage       # With coverage report

# Run a single frontend test file
npm test -- src/path/to/file.test.jsx

# Run backend tests (Jest)
npm run test:backend
cd backend && npm test      # Direct

# Run a single backend test file
cd backend && npm test -- path/to/file.test.js

# Run all tests
npm run test:all

# Smoke tests (post-deployment verification)
npm run test:smoke              # Run against localhost:3001
BASE_URL=http://prod.example.com npm run test:smoke  # Run against any server

# Linting
npm run lint

# Database seeding
npm run seed:database       # Quick seed
npm run seed:comprehensive  # Full seed
```

## Architecture

### Frontend (React + Vite)
- **Entry**: `src/main.jsx` → `src/App.jsx`
- **UI**: Material-UI + Tailwind CSS + Radix UI primitives + shadcn/ui components
- **Path alias**: `@/` maps to `src/`
- **State**: React Context (`AuthContext`, `ThemeContext`, `PaternityFormContext`)
- **Feature components**: `src/components/features/` - lazy-loaded for code splitting
- **UI components**: `src/components/ui/` - reusable shadcn-style components

### Backend (Express + PostgreSQL)
- **Entry**: `backend/server.js`
- **Database**: PostgreSQL via `pg` (graceful degradation if unavailable)
- **Routes**: `backend/routes/` - RESTful API endpoints
- **Services**: `backend/services/` - business logic
- **API prefix**: `/api`

### Key Service Layers
- **STR Importer**: `backend/services/strImporter/` - Multi-adapter system for STR results import (synthetic, GeneMapper, OSIRIS)
- **Paternity Calculator**: `backend/services/paternityCalculator.js`
- **STR Profile Matcher**: `backend/services/strProfileMatcher.js`
- **Report Generation**: `backend/services/reportGenerator.js`, `forensicReportGenerator.js`
- **FSA Processing**: `backend/services/fsaProcessor.js` - genetic analyzer file processing
- **Database Service**: `backend/services/database.js` - connection pooling with auto-reconnect

### OSIRIS Workspace
The `backend/osiris_workspace/` directory contains:
- `input/` - FSA files from genetic analyzers
- `output/` - OSIRIS analysis results (.oar, .plt files)
- `config/` - Kit configurations (PowerPlex ESX 17 ladder specs, lab settings)

## API Route Structure

| Prefix | File | Purpose |
|--------|------|---------|
| `/api` | `routes/api.js` | Main sample/batch operations |
| `/api/auth` | `routes/auth.js` | Authentication |
| `/api/genetic-analysis` | `routes/genetic-analysis.js` | OSIRIS integration, file uploads |
| `/api/paternity` | `routes/paternity.js` | Paternity calculations |
| `/api/forensic-reports` | `routes/forensic-reports.js` | Report generation |
| `/api/qms` | `routes/qms.js` | Quality management |
| `/api/inventory` | `routes/inventory.js` | Reagent/consumable tracking |
| `/api/case-management` | `routes/case-management.js` | Case workflow management |
| `/api/str-matching` | `routes/str-matching.js` | STR profile comparisons |

## Testing

- **Frontend**: Vitest with jsdom, test files in `src/**/__tests__/` or `*.test.{js,jsx}`
- **Backend**: Jest with supertest, tests in `backend/__tests__/` or `backend/**/*.test.js`
- **Smoke tests**: Fast post-deployment verification in `backend/tests/smoke/`
- **Frontend setup**: `src/test/setup.js` - MSW mocks configured in `src/test/mocks/handlers.js`
- **Backend setup**: `backend/tests/setup.js`

### Smoke Tests
Smoke tests verify critical paths after deployment. They check:
- Health endpoints (`/health`, `/ready`)
- Core API connectivity (`/api/test`, `/api/samples`, `/api/batches`)
- Prometheus metrics (`/metrics`)
- Authentication rejection for invalid credentials
- Proper error handling (404s, malformed requests)

Run with `npm run test:smoke` or directly: `node backend/scripts/smoke-test.js [URL]`

## Environment

- Frontend dev server: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Vite proxies `/api` requests to backend automatically
- Environment variables loaded from `.env` in project root

## Key Patterns

- Feature components wrap content in `ErrorBoundary` and `Suspense`
- Database service (`backend/services/database.js`) handles connection pooling and graceful degradation
- Winston logger with daily rotation in `backend/logs/`
- Memory management via `backend/utils/memoryManager.js`
- Prometheus metrics exposed at `/metrics` endpoint
- Health checks at `/health` endpoint

## STR Import Modes

The system supports multiple modes for importing STR results (set via `IMPORTER_MODE` env var):
- `synthetic` - Generates deterministic profiles from sample names (demo/testing)
- `genemapper` - Parses tab-delimited GeneMapper exports (Applied Biosystems 3130xl/3500)
- `osiris` - Parses .oar XML from NCBI OSIRIS

## Sample Naming Convention

Samples follow the pattern: `<PREFIX><YY>_<NNNN>_<ROLE>_<surname>`
- **PREFIX**: POM, LT, UP, MAT, IND, SIB
- **YY**: Two-digit year
- **NNNN**: Sequence number (0001-9999)
- **ROLE**: C (Child), F (Father), M (Mother)

Example: `POM26_0001_C_Smith` - Child in paternity case #1 of 2026
