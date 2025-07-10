module.exports = {
  // Coverage reporters
  reporter: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'cobertura'
  ],
  
  // Output directories
  'report-dir': './coverage',
  'temp-dir': './coverage/.nyc_output',
  
  // Include patterns
  include: [
    'routes/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    'controllers/**/*.js'
  ],
  
  // Exclude patterns
  exclude: [
    'test/**',
    'tests/**',
    '**/*.test.js',
    '**/*.spec.js',
    'coverage/**',
    'node_modules/**',
    'database/**',
    'logs/**',
    'temp/**',
    'scripts/**'
  ],
  
  // Coverage thresholds
  'check-coverage': true,
  branches: 70,
  functions: 70,
  lines: 70,
  statements: 70,
  
  // Per-file thresholds
  'per-file': true,
  
  // Watermarks for color coding
  watermarks: {
    lines: [70, 85],
    functions: [70, 85],
    branches: [70, 85],
    statements: [70, 85]
  },
  
  // Source map support
  'source-map': true,
  'produce-source-map': true,
  
  // All files coverage
  all: true,
  
  // Skip empty files
  'skip-empty': true,
  
  // Skip full coverage files
  'skip-full': false,
  
  // Cache
  cache: true,
  'cache-dir': './coverage/.nyc_cache',
  
  // Clean output directories
  clean: true
};