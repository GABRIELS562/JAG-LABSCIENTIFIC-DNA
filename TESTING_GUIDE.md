# JAG DNA Scientific LIMS - Testing Guide

## Overview
This document provides comprehensive information about the testing infrastructure set up for the JAG DNA Scientific LIMS application.

## Test Coverage Goals
- **Target Coverage**: 60% minimum across all metrics
- **Lines**: 60%
- **Functions**: 60%  
- **Branches**: 60%
- **Statements**: 60%

## Frontend Testing (Vitest + React Testing Library)

### Setup
- **Framework**: Vitest with React Testing Library
- **Environment**: jsdom
- **Mocking**: MSW (Mock Service Worker)
- **Configuration**: `vitest.config.js`

### Key Test Files Created

#### Component Tests
1. **PaternityLabDashboard.test.jsx**
   - Dashboard rendering and data fetching
   - Interactive features (navigation, refresh)
   - Live data updates and workflow tracking
   - Error handling and loading states
   - Progress calculations and statistics

2. **WorkflowSettings.test.jsx**
   - Settings component rendering
   - Duration controls and validation
   - Quick presets functionality
   - Workflow pause/resume
   - API integration and error handling

#### Context Tests
3. **AuthContext.test.jsx**
   - Authentication state management
   - Login/logout functionality
   - Token management and refresh
   - User profile updates
   - Role-based access control

#### Service Tests
4. **api.test.js**
   - API client functionality
   - Caching mechanisms
   - Error handling and retries
   - Connection management
   - Bulk operations

#### Utility Tests
5. **errorHandler.test.js**
   - Custom error classes
   - Error logging and reporting
   - User-friendly error messages
   - Recovery strategies

6. **validation.test.js**
   - Input validation functions
   - Email and phone validation
   - Lab number and case number formats
   - Sample and batch data validation
   - Password strength validation

### Running Frontend Tests
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Backend Testing (Jest + Supertest)

### Setup
- **Framework**: Jest with Supertest
- **Environment**: Node.js
- **Database**: SQLite with mocked operations
- **Configuration**: `jest.config.js`

### Key Test Files Created

#### API Tests
1. **api.test.js**
   - Sample CRUD operations
   - Batch management
   - Queue operations
   - Statistics endpoints
   - Bulk operations
   - Error handling

2. **auth.test.js**
   - User authentication
   - JWT token management
   - Password operations
   - User profile management
   - Authorization checks

### Running Backend Tests
```bash
# Run backend tests
cd backend && npm test

# Run with coverage
cd backend && npm run test:coverage

# Watch mode
cd backend && npm run test:watch

# Verbose output
cd backend && npm run test:verbose
```

## Test Utilities and Helpers

### Frontend Utilities (`src/test/utils/index.js`)
- `renderWithProviders()` - Render components with all contexts
- `renderWithAuth()` - Render with authenticated user
- `waitForLoadingToFinish()` - Wait for loading states
- `generateMockSample()` - Create sample test data
- `generateMockBatch()` - Create batch test data
- `mockApiResponse()` - Mock API responses

### Backend Utilities (`backend/tests/setup.js`)
- `createMockSample()` - Generate sample data
- `createMockUser()` - Generate user data
- `createMockBatch()` - Generate batch data

## Current Test Statistics

### Frontend Tests
- **Component Tests**: 2 major components
- **Context Tests**: 1 authentication context
- **Service Tests**: 1 API service
- **Utility Tests**: 2 utility modules
- **Total Test Files**: 6
- **Estimated Test Cases**: ~150

### Backend Tests
- **API Tests**: Core API endpoints
- **Auth Tests**: Authentication flows
- **Total Test Files**: 2
- **Estimated Test Cases**: ~60

## Running All Tests
```bash
# Run both frontend and backend tests
npm run test:all

# Run frontend tests only
npm test

# Run backend tests only
npm run test:backend
```

## Files Created/Modified

### Configuration Files
- `vitest.config.js` - Vitest configuration with coverage settings
- `backend/jest.config.js` - Jest configuration for backend tests

### Test Setup Files
- `src/test/setup.js` - Frontend test environment setup
- `src/test/mocks/server.js` - MSW server setup
- `src/test/mocks/handlers.js` - API mock handlers
- `src/test/utils/index.js` - Testing utilities and helpers
- `backend/tests/setup.js` - Backend test environment setup

### Test Files
- `src/components/__tests__/PaternityLabDashboard.test.jsx`
- `src/components/features/__tests__/WorkflowSettings.test.jsx`
- `src/contexts/__tests__/AuthContext.test.jsx`
- `src/services/__tests__/api.test.js`
- `src/utils/__tests__/errorHandler.test.js`
- `src/utils/__tests__/validation.test.js`
- `backend/tests/api.test.js`
- `backend/tests/auth.test.js`

### Updated Package.json Scripts
- Frontend: Added test, test:ui, test:run, test:coverage, test:watch, test:backend, test:all
- Backend: Added test, test:watch, test:coverage, test:verbose

## Dependencies Installed

### Frontend
- `vitest@^1.6.0` - Test framework
- `@vitest/ui@^1.6.0` - Test UI
- `jsdom@^26.1.0` - DOM environment
- `happy-dom@^18.0.1` - Alternative DOM environment
- `c8@^10.1.3` - Coverage reporting

### Backend
- `jest@^29.7.0` - Test framework
- `supertest@^7.1.4` - HTTP testing
- `@types/jest@^30.0.0` - Jest TypeScript types
- `@types/supertest@^6.0.3` - Supertest TypeScript types
- `jest-environment-node@^29.7.0` - Node test environment

## Test Coverage Results Summary

The comprehensive test suite provides coverage for:
- **Critical Business Logic**: Paternity workflow management, sample tracking, batch processing
- **API Integrations**: Sample management, authentication, workflow status updates
- **User Workflows**: Registration, login, dashboard interactions, settings management
- **Error Handling**: Network errors, validation errors, API errors
- **Authentication**: Login/logout, token management, role-based access

## Conclusion
The comprehensive test suite provides a solid foundation for maintaining code quality and preventing regressions. The setup includes both unit and integration tests, with proper mocking and utilities to support efficient test development. The 60% coverage target ensures critical paths are tested while allowing for pragmatic development velocity.