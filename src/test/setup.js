import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { beforeAll, afterEach, afterAll } from '@jest/globals';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true
});

// Mock API responses
const handlers = [
  // Mock health check
  http.get('http://localhost:3001/health', () => {
    return HttpResponse.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString()
      }
    });
  }),

  // Mock samples API
  http.get('http://localhost:3001/api/samples', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          lab_number: '25_1',
          name: 'John',
          surname: 'Doe',
          relation: 'Child',
          status: 'pending',
          workflow_status: 'sample_collected'
        },
        {
          id: 2,
          lab_number: '25_2',
          name: 'Jane',
          surname: 'Doe',
          relation: 'Mother',
          status: 'pending',
          workflow_status: 'sample_collected'
        }
      ]
    });
  }),

  // Mock test cases API
  http.get('http://localhost:3001/api/test-cases', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          case_number: 'CASE_2025_001',
          client_type: 'paternity',
          status: 'pending',
          submission_date: '2025-01-01'
        }
      ]
    });
  }),

  // Mock batches API
  http.get('http://localhost:3001/api/batches', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          batch_number: 'BATCH_001',
          operator: 'Test Operator',
          status: 'active',
          total_samples: 5
        }
      ]
    });
  }),

  // Mock sample creation
  http.post('http://localhost:3001/api/samples', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 3,
        lab_number: '25_3',
        name: 'Test',
        surname: 'Sample'
      }
    }, { status: 201 });
  }),

  // Mock error responses
  http.get('http://localhost:3001/api/error-test', () => {
    return HttpResponse.json({
      success: false,
      error: {
        message: 'Test error',
        errorCode: 'TEST_ERROR'
      }
    }, { status: 400 });
  })
];

// Setup MSW server
const server = setupServer(...handlers);

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn'
  });
});

// Reset any request handlers that we may add during the tests
afterEach(() => {
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

// Global test utilities
global.testServer = server;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
  })
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock performance API
global.performance = {
  ...performance,
  now: () => Date.now()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Console error suppression for expected errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});