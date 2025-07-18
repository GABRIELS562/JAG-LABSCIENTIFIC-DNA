// Jest Configuration for LIMS Application
// This configuration supports comprehensive testing strategies including unit, integration, and E2E tests

module.exports = {
  // Test environment configuration
  testEnvironment: 'node',
  
  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js',
    '<rootDir>/tests/setup/database.setup.js',
    '<rootDir>/tests/setup/mocks.setup.js'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/global.setup.js',
  globalTeardown: '<rootDir>/tests/setup/global.teardown.js',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js',
    '<rootDir>/tests/api/**/*.test.js',
    '<rootDir>/src/**/__tests__/**/*.test.js'
  ],
  
  // Files to ignore during testing
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/load/',
    '<rootDir>/tests/fixtures/'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'cobertura'
  ],
  
  // Files to include in coverage
  collectCoverageFrom: [
    'src/**/*.js',
    'backend/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/index.js',
    '!src/config/**',
    '!backend/config/**',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './backend/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Module name mapping for aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@backend/(.*)$': '<rootDir>/backend/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Files to transform
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@babel/runtime|@testing-library))'
  ],
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Test timeout (30 seconds)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Detect open handles
  detectOpenHandles: true,
  forceExit: true,
  
  // Test runner configuration
  maxWorkers: '50%',
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' > ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results',
      filename: 'report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'LIMS Test Report',
      logoImgPath: undefined,
      inlineSource: false
    }]
  ],
  
  // Custom test environments for different test types
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.setup.js']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/integration.setup.js',
        '<rootDir>/tests/setup/database.setup.js'
      ],
      testTimeout: 60000
    },
    {
      displayName: 'API Tests',
      testMatch: ['<rootDir>/tests/api/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/api.setup.js',
        '<rootDir>/tests/setup/database.setup.js'
      ],
      testTimeout: 30000
    },
    {
      displayName: 'Component Tests',
      testMatch: ['<rootDir>/tests/components/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/components.setup.js',
        '@testing-library/jest-dom/extend-expect'
      ],
      moduleNameMapping: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/tests/mocks/fileMock.js'
      }
    }
  ],
  
  // Snapshot configuration
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],
  
  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/logs/'
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/custom-matchers.js'
  ],
  
  // Performance testing configuration
  slowTestThreshold: 5000,
  
  // Parallel testing
  maxConcurrency: 5,
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Notification configuration (for local development)
  notify: process.env.NODE_ENV === 'development',
  notifyMode: 'failure-change',
  
  // Test result processor
  testResultsProcessor: '<rootDir>/tests/processors/results-processor.js'
};