module.exports = {
  // Extend the base Jest configuration
  ...require('./jest.config.js'),
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'cobertura'
  ],
  
  // Coverage collection patterns
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/serviceWorker.js',
    '!src/reportWebVitals.js',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/setupTests.js',
    '!src/test-utils.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Component-specific thresholds
    'src/components/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    'src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/utils/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/coverage/',
    '/public/',
    '/src/mocks/',
    '/src/__tests__/',
    '/src/test-utils.js',
    '/src/setupTests.js'
  ],
  
  // Additional reporters for CI
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'LabScientific LIMS Test Report'
    }]
  ],
  
  // Performance monitoring
  slowTestThreshold: 5,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};