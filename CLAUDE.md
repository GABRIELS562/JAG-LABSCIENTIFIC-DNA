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

# Run backend tests (Jest)
npm run test:backend
cd backend && npm test      # Direct

# Run all tests
npm run test:all

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
- **Database**: PostgreSQL via `pg` (with SQLite fallback for development)
- **Routes**: `backend/routes/` - RESTful API endpoints
- **Services**: `backend/services/` - business logic
- **API prefix**: `/api`

### Key Service Layers
- **OSIRIS Integration**: `backend/services/osirisIntegration.js` - STR analysis via OSIRIS software
- **Paternity Calculator**: `backend/services/paternityCalculator.js`
- **STR Profile Matcher**: `backend/services/strProfileMatcher.js`
- **Report Generation**: `backend/services/reportGenerator.js`, `forensicReportGenerator.js`
- **FSA Processing**: `backend/services/fsaProcessor.js` - genetic analyzer file processing

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

## Testing

- **Frontend**: Vitest with jsdom, test files in `src/**/__tests__/` or `*.test.{js,jsx}`
- **Backend**: Jest with supertest, tests in `backend/__tests__/` (pending structure)
- **Setup file**: `src/test/setup.js`
- **MSW mocks**: `src/test/mocks/handlers.js`

## Environment

- Frontend dev server: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Vite proxies `/api` requests to backend automatically

## Key Patterns

- Feature components wrap content in `ErrorBoundary` and `Suspense`
- Database service (`backend/services/database.js`) handles connection pooling and graceful degradation
- Winston logger with daily rotation in `backend/logs/`
- Memory management via `backend/utils/memoryManager.js`
