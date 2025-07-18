// K6 Load Testing Script for LIMS Application
// This script provides comprehensive load testing scenarios using k6

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestsPerSecond = new Rate('requests_per_second');
const concurrentUsers = new Gauge('concurrent_users');
const authFailures = new Counter('auth_failures');
const sampleCreationTime = new Trend('sample_creation_time');

// Configuration
export const options = {
  stages: [
    // Warm-up
    { duration: '30s', target: 5 },
    
    // Ramp-up
    { duration: '2m', target: 20 },
    
    // Sustained load
    { duration: '5m', target: 50 },
    
    // Peak load
    { duration: '2m', target: 100 },
    
    // Stress test
    { duration: '1m', target: 200 },
    
    // Recovery
    { duration: '1m', target: 50 },
    
    // Cool-down
    { duration: '30s', target: 0 }
  ],
  
  thresholds: {
    // Error rate should be less than 1%
    errors: ['rate<0.01'],
    
    // Response time should be less than 2 seconds for 95% of requests
    http_req_duration: ['p(95)<2000'],
    
    // Authentication failures should be zero
    auth_failures: ['count==0'],
    
    // Sample creation should be fast
    sample_creation_time: ['p(90)<1000']
  },
  
  // Environment-specific configurations
  env: {
    BASE_URL: __ENV.BASE_URL || 'http://localhost:3000',
    TEST_USER_EMAIL: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
    TEST_USER_PASSWORD: __ENV.TEST_USER_PASSWORD || 'loadtest123',
    ENABLE_DETAILED_LOGGING: __ENV.ENABLE_DETAILED_LOGGING || 'false'
  }
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testData = {
  users: [
    { email: 'test1@example.com', password: 'password123' },
    { email: 'test2@example.com', password: 'password123' },
    { email: 'test3@example.com', password: 'password123' }
  ],
  
  sampleTypes: ['blood', 'saliva', 'tissue', 'urine', 'swab'],
  testTypes: ['genetic', 'chemical', 'biological', 'pathology'],
  priorities: ['low', 'normal', 'high', 'urgent'],
  
  clients: [
    { name: 'Hospital A', type: 'hospital' },
    { name: 'Clinic B', type: 'clinic' },
    { name: 'Research Center C', type: 'research' }
  ]
};

// Helper functions
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateSampleId() {
  return `SAMPLE_${generateRandomString(6).toUpperCase()}`;
}

function generateClientId() {
  return `CLIENT_${generateRandomString(6).toUpperCase()}`;
}

function logRequest(name, response) {
  if (__ENV.ENABLE_DETAILED_LOGGING === 'true') {
    console.log(`${name}: ${response.status} - ${response.timings.duration}ms`);
  }
}

// Authentication helper
function authenticate() {
  const user = getRandomElement(testData.users);
  
  const response = http.post(`${BASE_URL}/api/auth/login`, 
    JSON.stringify({
      username: user.email,
      password: user.password
    }), 
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
  
  logRequest('Authentication', response);
  
  const authSuccess = check(response, {
    'authentication successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined
  });
  
  if (!authSuccess) {
    authFailures.add(1);
    return null;
  }
  
  return response.json('token');
}

// Main test scenarios
export default function () {
  concurrentUsers.add(1);
  
  // Authenticate user
  const token = authenticate();
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test scenario selection (weighted)
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Sample management workflow
    sampleManagementWorkflow(headers);
  } else if (scenario < 0.5) {
    // 20% - Search and filtering
    searchAndFilterWorkflow(headers);
  } else if (scenario < 0.65) {
    // 15% - Client registration
    clientRegistrationWorkflow(headers);
  } else if (scenario < 0.8) {
    // 15% - Genetic analysis
    geneticAnalysisWorkflow(headers);
  } else if (scenario < 0.9) {
    // 10% - Reporting
    reportingWorkflow(headers);
  } else {
    // 10% - Profile management
    profileManagementWorkflow(headers);
  }
  
  // Simulate user think time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
  
  concurrentUsers.add(-1);
}

function sampleManagementWorkflow(headers) {
  const startTime = Date.now();
  
  // Create sample
  const sampleData = {
    sampleId: generateSampleId(),
    clientId: generateClientId(),
    sampleType: getRandomElement(testData.sampleTypes),
    testType: getRandomElement(testData.testTypes),
    priority: getRandomElement(testData.priorities),
    volume: Math.floor(Math.random() * 10) + 1,
    notes: `Load test sample ${generateRandomString()}`
  };
  
  const createResponse = http.post(`${BASE_URL}/api/samples`, 
    JSON.stringify(sampleData), 
    { headers }
  );
  
  logRequest('Sample Creation', createResponse);
  
  const createSuccess = check(createResponse, {
    'sample created': (r) => r.status === 201,
    'sample ID returned': (r) => r.json('id') !== undefined
  });
  
  if (!createSuccess) {
    errorRate.add(1);
    return;
  }
  
  sampleCreationTime.add(Date.now() - startTime);
  
  const sampleId = createResponse.json('id');
  
  // Get sample details
  const getResponse = http.get(`${BASE_URL}/api/samples/${sampleId}`, { headers });
  
  logRequest('Sample Details', getResponse);
  
  check(getResponse, {
    'sample retrieved': (r) => r.status === 200,
    'sample data correct': (r) => r.json('sampleId') === sampleData.sampleId
  });
  
  // Update sample status
  const updateResponse = http.patch(`${BASE_URL}/api/samples/${sampleId}`, 
    JSON.stringify({ status: 'in_progress' }), 
    { headers }
  );
  
  logRequest('Sample Update', updateResponse);
  
  check(updateResponse, {
    'sample updated': (r) => r.status === 200
  });
  
  sleep(0.5);
}

function searchAndFilterWorkflow(headers) {
  // Search samples
  const searchQuery = {
    q: generateRandomString(4),
    type: getRandomElement(testData.testTypes),
    limit: 20
  };
  
  const searchParams = new URLSearchParams(searchQuery).toString();
  const searchResponse = http.get(`${BASE_URL}/api/samples/search?${searchParams}`, { headers });
  
  logRequest('Sample Search', searchResponse);
  
  check(searchResponse, {
    'search successful': (r) => r.status === 200,
    'results returned': (r) => Array.isArray(r.json('results'))
  });
  
  // List samples with pagination
  const listResponse = http.get(`${BASE_URL}/api/samples?page=1&limit=50&sortBy=createdAt&sortOrder=desc`, { headers });
  
  logRequest('Sample List', listResponse);
  
  check(listResponse, {
    'list successful': (r) => r.status === 200,
    'pagination data present': (r) => r.json('pagination') !== undefined
  });
  
  sleep(0.3);
}

function clientRegistrationWorkflow(headers) {
  const clientData = {
    name: `Load Test Client ${generateRandomString()}`,
    email: `loadtest-${generateRandomString()}@example.com`,
    phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    address: `${Math.floor(Math.random() * 9999) + 1} Test Street`,
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345',
    country: 'USA',
    contactPerson: 'Test Person',
    clientType: getRandomElement(['hospital', 'clinic', 'research', 'individual'])
  };
  
  const createResponse = http.post(`${BASE_URL}/api/clients`, 
    JSON.stringify(clientData), 
    { headers }
  );
  
  logRequest('Client Creation', createResponse);
  
  const createSuccess = check(createResponse, {
    'client created': (r) => r.status === 201,
    'client ID returned': (r) => r.json('id') !== undefined
  });
  
  if (!createSuccess) {
    errorRate.add(1);
    return;
  }
  
  const clientId = createResponse.json('id');
  
  // Get client details
  const getResponse = http.get(`${BASE_URL}/api/clients/${clientId}`, { headers });
  
  logRequest('Client Details', getResponse);
  
  check(getResponse, {
    'client retrieved': (r) => r.status === 200,
    'client data correct': (r) => r.json('name') === clientData.name
  });
  
  sleep(0.4);
}

function geneticAnalysisWorkflow(headers) {
  const genes = ['BRCA1', 'BRCA2', 'TP53', 'KRAS', 'EGFR', 'PIK3CA'];
  const analysisTypes = ['snp', 'cnv', 'indel', 'structural'];
  
  const analysisData = {
    sampleId: generateSampleId(),
    analysisType: getRandomElement(analysisTypes),
    genes: genes.slice(0, Math.floor(Math.random() * 4) + 1),
    priority: getRandomElement(testData.priorities),
    notes: `Load test genetic analysis ${generateRandomString()}`
  };
  
  const createResponse = http.post(`${BASE_URL}/api/genetic-analysis`, 
    JSON.stringify(analysisData), 
    { headers }
  );
  
  logRequest('Genetic Analysis Creation', createResponse);
  
  const createSuccess = check(createResponse, {
    'analysis created': (r) => r.status === 201,
    'analysis ID returned': (r) => r.json('id') !== undefined
  });
  
  if (!createSuccess) {
    errorRate.add(1);
    return;
  }
  
  const analysisId = createResponse.json('id');
  
  // Check analysis status
  const statusResponse = http.get(`${BASE_URL}/api/genetic-analysis/${analysisId}/status`, { headers });
  
  logRequest('Analysis Status', statusResponse);
  
  check(statusResponse, {
    'status retrieved': (r) => r.status === 200
  });
  
  // Try to get results (may not be ready)
  const resultsResponse = http.get(`${BASE_URL}/api/genetic-analysis/${analysisId}/results`, { headers });
  
  logRequest('Analysis Results', resultsResponse);
  
  check(resultsResponse, {
    'results endpoint accessible': (r) => r.status === 200 || r.status === 202
  });
  
  sleep(0.6);
}

function reportingWorkflow(headers) {
  const reportData = {
    reportType: getRandomElement(['daily', 'weekly', 'monthly']),
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    filters: {
      testType: getRandomElement(testData.testTypes),
      priority: getRandomElement(testData.priorities)
    },
    format: getRandomElement(['pdf', 'excel', 'csv'])
  };
  
  const generateResponse = http.post(`${BASE_URL}/api/reports/generate`, 
    JSON.stringify(reportData), 
    { headers }
  );
  
  logRequest('Report Generation', generateResponse);
  
  const generateSuccess = check(generateResponse, {
    'report generation started': (r) => r.status === 202,
    'job ID returned': (r) => r.json('jobId') !== undefined
  });
  
  if (!generateSuccess) {
    errorRate.add(1);
    return;
  }
  
  const jobId = generateResponse.json('jobId');
  
  // Check report status
  const statusResponse = http.get(`${BASE_URL}/api/reports/status/${jobId}`, { headers });
  
  logRequest('Report Status', statusResponse);
  
  check(statusResponse, {
    'status retrieved': (r) => r.status === 200
  });
  
  sleep(0.5);
}

function profileManagementWorkflow(headers) {
  // Get user profile
  const profileResponse = http.get(`${BASE_URL}/api/auth/profile`, { headers });
  
  logRequest('Profile Get', profileResponse);
  
  check(profileResponse, {
    'profile retrieved': (r) => r.status === 200,
    'profile data present': (r) => r.json('id') !== undefined
  });
  
  // Update profile
  const updateData = {
    firstName: `Test${generateRandomString(4)}`,
    lastName: `User${generateRandomString(4)}`,
    preferences: {
      theme: 'dark',
      notifications: true,
      language: 'en'
    }
  };
  
  const updateResponse = http.patch(`${BASE_URL}/api/auth/profile`, 
    JSON.stringify(updateData), 
    { headers }
  );
  
  logRequest('Profile Update', updateResponse);
  
  check(updateResponse, {
    'profile updated': (r) => r.status === 200
  });
  
  sleep(0.2);
}

// Setup function
export function setup() {
  console.log('Starting LIMS load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test duration: ${options.stages.reduce((acc, stage) => acc + parseInt(stage.duration), 0)}s`);
  
  // Health check
  const healthResponse = http.get(`${BASE_URL}/api/health`);
  
  if (healthResponse.status !== 200) {
    throw new Error(`System health check failed: ${healthResponse.status}`);
  }
  
  console.log('System health check passed');
  return { startTime: Date.now() };
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration}s`);
}

// Custom summary report
export function handleSummary(data) {
  return {
    'k6-load-test-results.html': htmlReport(data),
    'k6-load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}