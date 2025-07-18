// Test Configuration for Integration Tests
// This file contains configuration settings for different test environments

const config = {
  // Service endpoints for internal microservices
  services: {
    auth: {
      baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: 5000
    },
    sample: {
      baseUrl: process.env.SAMPLE_SERVICE_URL || 'http://localhost:3002',
      timeout: 5000
    },
    analysis: {
      baseUrl: process.env.ANALYSIS_SERVICE_URL || 'http://localhost:3003',
      timeout: 5000
    },
    notification: {
      baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
      timeout: 5000
    },
    websocket: {
      baseUrl: process.env.WEBSOCKET_SERVICE_URL || 'ws://localhost:3005',
      timeout: 5000
    },
    messageQueue: {
      baseUrl: process.env.MESSAGE_QUEUE_URL || 'http://localhost:3006',
      timeout: 5000
    },
    mesh: {
      baseUrl: process.env.SERVICE_MESH_URL || 'http://localhost:15000',
      timeout: 5000
    }
  },

  // External service endpoints (mocked in tests)
  externalServices: {
    labEquipment: {
      baseUrl: process.env.LAB_EQUIPMENT_API_URL || 'https://api.labequipment.example.com',
      apiKey: process.env.LAB_EQUIPMENT_API_KEY || 'test-api-key-equipment'
    },
    emr: {
      baseUrl: process.env.EMR_API_URL || 'https://api.emr.example.com',
      apiKey: process.env.EMR_API_KEY || 'test-api-key-emr'
    },
    cloudStorage: {
      baseUrl: process.env.CLOUD_STORAGE_API_URL || 'https://api.cloudstorage.example.com',
      apiKey: process.env.CLOUD_STORAGE_API_KEY || 'test-api-key-storage'
    },
    notifications: {
      baseUrl: process.env.EXTERNAL_NOTIFICATIONS_API_URL || 'https://api.notifications.example.com',
      apiKey: process.env.EXTERNAL_NOTIFICATIONS_API_KEY || 'test-api-key-notifications'
    }
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'lims_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true'
  },

  // Test environment settings
  test: {
    timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
    retries: parseInt(process.env.TEST_RETRIES) || 3,
    parallel: process.env.TEST_PARALLEL === 'true',
    coverage: process.env.TEST_COVERAGE === 'true',
    verbose: process.env.TEST_VERBOSE === 'true'
  },

  // Authentication settings for tests
  auth: {
    testUser: {
      username: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'testpassword',
      role: 'admin'
    },
    tokenExpiry: '1h',
    jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret'
  },

  // Pact contract testing configuration
  pact: {
    consumer: 'lims-frontend',
    provider: 'lims-backend',
    port: parseInt(process.env.PACT_PORT) || 1234,
    host: process.env.PACT_HOST || 'localhost',
    logLevel: process.env.PACT_LOG_LEVEL || 'INFO',
    pactFileWriteMode: 'merge',
    spec: 2,
    cors: true
  },

  // Performance test thresholds
  performance: {
    responseTime: {
      p95: parseInt(process.env.PERF_P95_THRESHOLD) || 2000, // 2 seconds
      p99: parseInt(process.env.PERF_P99_THRESHOLD) || 5000, // 5 seconds
      average: parseInt(process.env.PERF_AVG_THRESHOLD) || 1000 // 1 second
    },
    throughput: {
      requestsPerSecond: parseInt(process.env.PERF_RPS_THRESHOLD) || 100
    },
    concurrency: {
      maxUsers: parseInt(process.env.PERF_MAX_USERS) || 50
    }
  },

  // Circuit breaker settings
  circuitBreaker: {
    threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 5,
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 60000,
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000
  },

  // Rate limiting settings
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // requests per window
  },

  // Monitoring and observability
  monitoring: {
    jaeger: {
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      serviceName: 'lims-integration-tests'
    },
    prometheus: {
      gateway: process.env.PROMETHEUS_GATEWAY || 'http://localhost:9091',
      jobName: 'integration-tests'
    }
  },

  // Feature flags for test scenarios
  features: {
    enableWebSocketTests: process.env.ENABLE_WEBSOCKET_TESTS !== 'false',
    enableContractTests: process.env.ENABLE_CONTRACT_TESTS !== 'false',
    enablePerformanceTests: process.env.ENABLE_PERFORMANCE_TESTS !== 'false',
    enableExternalAPITests: process.env.ENABLE_EXTERNAL_API_TESTS !== 'false',
    enableSecurityTests: process.env.ENABLE_SECURITY_TESTS !== 'false'
  }
};

// Environment-specific overrides
const environment = process.env.NODE_ENV || 'test';

switch (environment) {
  case 'development':
    config.test.timeout = 60000;
    config.test.verbose = true;
    break;
  
  case 'ci':
    config.test.parallel = true;
    config.test.coverage = true;
    config.test.retries = 2;
    break;
  
  case 'production':
    // Production testing should use different endpoints
    config.services.auth.baseUrl = process.env.PROD_AUTH_SERVICE_URL || config.services.auth.baseUrl;
    config.services.sample.baseUrl = process.env.PROD_SAMPLE_SERVICE_URL || config.services.sample.baseUrl;
    config.features.enablePerformanceTests = false; // Don't run performance tests in production
    break;
}

module.exports = config;