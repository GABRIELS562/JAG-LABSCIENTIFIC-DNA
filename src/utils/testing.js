// Comprehensive testing utilities and helpers

/**
 * Mock data generators for testing
 */
export const mockDataGenerators = {
  /**
   * Generate mock sample data
   */
  sample(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 10000),
      lab_number: `LT${new Date().getFullYear().toString().slice(-2)}_${Math.floor(Math.random() * 1000)}`,
      name: 'John',
      surname: 'Doe',
      relation: 'Child',
      status: 'active',
      workflow_status: 'sample_collected',
      collection_date: new Date().toISOString().split('T')[0],
      case_number: `CASE_${new Date().getFullYear()}_${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
      phone_number: '+1234567890',
      email: 'john.doe@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  },

  /**
   * Generate mock batch data
   */
  batch(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 1000),
      batch_number: `LDS_${Math.floor(Math.random() * 1000)}`,
      operator: 'Test Operator',
      status: 'active',
      pcr_date: new Date().toISOString().split('T')[0],
      electro_date: null,
      total_samples: 24,
      plate_layout: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  },

  /**
   * Generate mock user data
   */
  user(overrides = {}) {
    return {
      id: Math.floor(Math.random() * 1000),
      username: 'testuser',
      email: 'test@example.com',
      role: 'staff',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      ...overrides
    };
  },

  /**
   * Generate mock API response
   */
  apiResponse(data = null, overrides = {}) {
    return {
      success: true,
      data,
      message: 'Operation completed successfully',
      meta: {
        timestamp: new Date().toISOString()
      },
      ...overrides
    };
  },

  /**
   * Generate mock error response
   */
  errorResponse(message = 'Test error', overrides = {}) {
    return {
      success: false,
      error: {
        message,
        code: 'TEST_ERROR',
        timestamp: new Date().toISOString()
      },
      ...overrides
    };
  },

  /**
   * Generate array of samples for testing
   */
  samples(count = 10, overrides = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.sample({ 
        id: index + 1,
        lab_number: `LT${new Date().getFullYear().toString().slice(-2)}_${(index + 1).toString().padStart(3, '0')}`,
        ...overrides 
      })
    );
  },

  /**
   * Generate plate data for testing
   */
  plateData(sampleCount = 24) {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => i + 1);
    const plateData = {};
    
    let sampleIndex = 0;
    
    for (const row of rows) {
      for (const col of cols) {
        const wellId = `${row}${col}`;
        
        if (sampleIndex < sampleCount) {
          plateData[wellId] = {
            id: wellId,
            type: 'sample',
            samples: [this.sample({ id: sampleIndex + 1 })]
          };
          sampleIndex++;
        } else {
          plateData[wellId] = {
            id: wellId,
            type: 'empty',
            samples: []
          };
        }
      }
    }
    
    return plateData;
  }
};

/**
 * API mocking utilities
 */
export const apiMocks = {
  /**
   * Mock fetch function
   */
  mockFetch(responses = {}) {
    const originalFetch = global.fetch;
    
    global.fetch = jest.fn((url, options = {}) => {
      const key = `${options.method || 'GET'} ${url}`;
      const response = responses[key] || responses[url];
      
      if (response) {
        return Promise.resolve({
          ok: response.status < 400,
          status: response.status || 200,
          statusText: response.statusText || 'OK',
          headers: new Map(Object.entries(response.headers || {})),
          json: () => Promise.resolve(response.data),
          text: () => Promise.resolve(JSON.stringify(response.data))
        });
      }
      
      // Default success response
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: () => Promise.resolve(mockDataGenerators.apiResponse()),
        text: () => Promise.resolve(JSON.stringify(mockDataGenerators.apiResponse()))
      });
    });
    
    return () => {
      global.fetch = originalFetch;
    };
  },

  /**
   * Mock API endpoints
   */
  mockEndpoints: {
    getSamples: (samples = mockDataGenerators.samples()) => ({
      'GET /api/samples': {
        status: 200,
        data: mockDataGenerators.apiResponse(samples)
      }
    }),
    
    createSample: (sample = mockDataGenerators.sample()) => ({
      'POST /api/samples': {
        status: 201,
        data: mockDataGenerators.apiResponse(sample, { message: 'Sample created successfully' })
      }
    }),
    
    getBatches: (batches = [mockDataGenerators.batch()]) => ({
      'GET /api/batches': {
        status: 200,
        data: mockDataGenerators.apiResponse(batches)
      }
    }),
    
    createBatch: (batch = mockDataGenerators.batch()) => ({
      'POST /api/generate-batch': {
        status: 201,
        data: mockDataGenerators.apiResponse(batch, { message: 'Batch created successfully' })
      }
    }),
    
    error: (message = 'Test error', status = 400) => ({
      status,
      data: mockDataGenerators.errorResponse(message)
    })
  }
};

/**
 * Component testing utilities
 */
export const componentTestUtils = {
  /**
   * Create mock component props
   */
  mockProps(componentType, overrides = {}) {
    const basePropsByType = {
      PCRPlate: {
        selectedSamples: mockDataGenerators.samples(5),
        batchNumber: 'LDS_TEST_001',
        operator: 'Test Operator',
        onFinalizeBatch: jest.fn(),
        onClearPlate: jest.fn()
      },
      
      ElectrophoresisLayout: {
        selectedSamples: mockDataGenerators.samples(8),
        batchNumber: 'ELEC_TEST_001',
        operator: 'Test Operator',
        runParameters: {
          voltage: 3000,
          current: 150,
          power: 450,
          temperature: 60,
          runTime: 120
        }
      },
      
      Reruns: {
        selectedSamples: mockDataGenerators.samples(3),
        batchNumber: 'LDS_TEST_001_RR',
        operator: 'Test Operator'
      },
      
      QualityControlModule: {
        samples: mockDataGenerators.samples(10),
        onQualityCheck: jest.fn(),
        onGenerateReport: jest.fn()
      }
    };
    
    return {
      ...basePropsByType[componentType],
      ...overrides
    };
  },

  /**
   * Create mock context values
   */
  mockContexts: {
    auth: (overrides = {}) => ({
      user: mockDataGenerators.user(),
      token: 'mock-jwt-token',
      loading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: () => true,
      ...overrides
    }),
    
    theme: (overrides = {}) => ({
      theme: { palette: { mode: 'light' } },
      isDarkMode: false,
      toggleTheme: jest.fn(),
      colors: {
        primary: '#0D488F',
        secondary: '#8EC74F'
      },
      ...overrides
    })
  },

  /**
   * Create wrapper with providers
   */
  createWrapper(providers = []) {
    return ({ children }) => {
      let wrapper = children;
      
      providers.reverse().forEach(Provider => {
        wrapper = React.createElement(Provider, {}, wrapper);
      });
      
      return wrapper;
    };
  },

  /**
   * Wait for async operations
   */
  waitFor: async (callback, timeout = 5000) => {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const result = callback();
        if (result) return result;
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    throw new Error(`Timeout after ${timeout}ms`);
  },

  /**
   * Simulate user interactions
   */
  userActions: {
    click: (element) => {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(event);
    },
    
    type: (element, text) => {
      element.value = text;
      const event = new Event('input', {
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    },
    
    submit: (form) => {
      const event = new Event('submit', {
        bubbles: true,
        cancelable: true
      });
      form.dispatchEvent(event);
    }
  }
};

/**
 * Performance testing utilities
 */
export const performanceTestUtils = {
  /**
   * Measure component render time
   */
  measureRenderTime: (renderFunction) => {
    const start = performance.now();
    const result = renderFunction();
    const end = performance.now();
    
    return {
      result,
      renderTime: end - start
    };
  },

  /**
   * Measure function execution time
   */
  measureExecutionTime: async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    return {
      result,
      executionTime: end - start
    };
  },

  /**
   * Memory usage tracker
   */
  trackMemoryUsage: () => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  /**
   * Load testing utility
   */
  loadTest: async (fn, iterations = 100) => {
    const results = [];
    let totalTime = 0;
    let errors = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const { result, executionTime } = await performanceTestUtils.measureExecutionTime(fn);
        results.push({ iteration: i + 1, executionTime, success: true });
        totalTime += executionTime;
      } catch (error) {
        errors++;
        results.push({ iteration: i + 1, error: error.message, success: false });
      }
    }
    
    return {
      totalIterations: iterations,
      successful: iterations - errors,
      errors,
      averageTime: totalTime / (iterations - errors),
      results
    };
  }
};

/**
 * Database testing utilities
 */
export const databaseTestUtils = {
  /**
   * Create test database state
   */
  createTestState: () => ({
    samples: mockDataGenerators.samples(10),
    batches: [mockDataGenerators.batch()],
    users: [mockDataGenerators.user()],
    wellAssignments: []
  }),

  /**
   * Reset database state
   */
  resetDatabase: (testState) => {
    // Mock database reset
    return {
      ...testState,
      samples: [],
      batches: [],
      users: [],
      wellAssignments: []
    };
  },

  /**
   * Seed test data
   */
  seedTestData: (testState, data) => {
    return {
      ...testState,
      ...data
    };
  }
};

/**
 * Integration testing utilities
 */
export const integrationTestUtils = {
  /**
   * Test complete user workflows
   */
  workflows: {
    /**
     * Sample creation to batch workflow
     */
    sampleToBatch: async (testRunner) => {
      const steps = [
        'Create sample',
        'Verify sample in queue',
        'Add sample to batch',
        'Finalize batch',
        'Verify batch creation'
      ];
      
      const results = [];
      
      for (const step of steps) {
        try {
          const result = await testRunner[step]();
          results.push({ step, success: true, result });
        } catch (error) {
          results.push({ step, success: false, error: error.message });
          break; // Stop on first failure
        }
      }
      
      return {
        workflow: 'Sample to Batch',
        completed: results.filter(r => r.success).length,
        total: steps.length,
        results
      };
    },

    /**
     * PCR to electrophoresis workflow
     */
    pcrToElectrophoresis: async (testRunner) => {
      const steps = [
        'Create PCR batch',
        'Complete PCR batch',
        'Load samples for electrophoresis',
        'Create electrophoresis batch',
        'Complete electrophoresis'
      ];
      
      const results = [];
      
      for (const step of steps) {
        try {
          const result = await testRunner[step]();
          results.push({ step, success: true, result });
        } catch (error) {
          results.push({ step, success: false, error: error.message });
          break;
        }
      }
      
      return {
        workflow: 'PCR to Electrophoresis',
        completed: results.filter(r => r.success).length,
        total: steps.length,
        results
      };
    }
  },

  /**
   * API integration testing
   */
  apiIntegration: {
    /**
     * Test API endpoint chain
     */
    testEndpointChain: async (endpoints) => {
      const results = [];
      let context = {};
      
      for (const endpoint of endpoints) {
        try {
          const { url, method, data, transform } = endpoint;
          const response = await fetch(url, {
            method: method || 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : undefined
          });
          
          const result = await response.json();\n          
          if (transform) {\n            context = { ...context, ...transform(result) };\n          }\n          \n          results.push({\n            endpoint: `${method || 'GET'} ${url}`,\n            success: response.ok,\n            status: response.status,\n            result\n          });\n          \n          if (!response.ok) break;\n        } catch (error) {\n          results.push({\n            endpoint: `${endpoint.method || 'GET'} ${endpoint.url}`,\n            success: false,\n            error: error.message\n          });\n          break;\n        }\n      }\n      \n      return {\n        successful: results.filter(r => r.success).length,\n        total: endpoints.length,\n        results,\n        context\n      };\n    }\n  }\n};\n\n/**\n * Test suite utilities\n */\nexport const testSuiteUtils = {\n  /**\n   * Create test suite configuration\n   */\n  createSuite: (name, tests, options = {}) => {\n    return {\n      name,\n      tests,\n      setup: options.setup || (() => {}),\n      teardown: options.teardown || (() => {}),\n      timeout: options.timeout || 30000\n    };\n  },\n\n  /**\n   * Run test suite\n   */\n  runSuite: async (suite) => {\n    const results = {\n      name: suite.name,\n      passed: 0,\n      failed: 0,\n      total: suite.tests.length,\n      tests: []\n    };\n\n    // Setup\n    if (suite.setup) {\n      await suite.setup();\n    }\n\n    // Run tests\n    for (const test of suite.tests) {\n      try {\n        const start = performance.now();\n        await test.fn();\n        const end = performance.now();\n        \n        results.tests.push({\n          name: test.name,\n          passed: true,\n          duration: end - start\n        });\n        results.passed++;\n      } catch (error) {\n        results.tests.push({\n          name: test.name,\n          passed: false,\n          error: error.message,\n          stack: error.stack\n        });\n        results.failed++;\n      }\n    }\n\n    // Teardown\n    if (suite.teardown) {\n      await suite.teardown();\n    }\n\n    return results;\n  }\n};\n\n// Global test utilities\nexport const globalTestUtils = {\n  /**\n   * Clean up after tests\n   */\n  cleanup: () => {\n    // Clear all caches\n    if (global.localStorage) {\n      global.localStorage.clear();\n    }\n    if (global.sessionStorage) {\n      global.sessionStorage.clear();\n    }\n    \n    // Clear timers\n    jest.clearAllTimers();\n    \n    // Clear mocks\n    jest.clearAllMocks();\n  },\n\n  /**\n   * Setup global test environment\n   */\n  setup: () => {\n    // Mock localStorage\n    if (!global.localStorage) {\n      global.localStorage = {\n        store: {},\n        getItem: jest.fn(key => global.localStorage.store[key] || null),\n        setItem: jest.fn((key, value) => { global.localStorage.store[key] = value; }),\n        removeItem: jest.fn(key => { delete global.localStorage.store[key]; }),\n        clear: jest.fn(() => { global.localStorage.store = {}; })\n      };\n    }\n    \n    // Mock sessionStorage\n    if (!global.sessionStorage) {\n      global.sessionStorage = {\n        store: {},\n        getItem: jest.fn(key => global.sessionStorage.store[key] || null),\n        setItem: jest.fn((key, value) => { global.sessionStorage.store[key] = value; }),\n        removeItem: jest.fn(key => { delete global.sessionStorage.store[key]; }),\n        clear: jest.fn(() => { global.sessionStorage.store = {}; })\n      };\n    }\n    \n    // Mock performance\n    if (!global.performance) {\n      global.performance = {\n        now: jest.fn(() => Date.now()),\n        memory: {\n          usedJSHeapSize: 1000000,\n          totalJSHeapSize: 2000000,\n          jsHeapSizeLimit: 4000000\n        }\n      };\n    }\n  }\n};\n\nexport default {\n  mockDataGenerators,\n  apiMocks,\n  componentTestUtils,\n  performanceTestUtils,\n  databaseTestUtils,\n  integrationTestUtils,\n  testSuiteUtils,\n  globalTestUtils\n};"