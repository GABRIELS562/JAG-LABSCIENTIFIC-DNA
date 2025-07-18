// Performance Testing Helper Functions for LIMS Application
// This module provides utilities for Artillery.io load testing

const crypto = require('crypto');

/**
 * Generate random string for unique test data
 */
function generateRandomString(length = 8) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

/**
 * Generate random email address
 */
function generateRandomEmail() {
  return `loadtest-${generateRandomString()}@example.com`;
}

/**
 * Generate random phone number
 */
function generateRandomPhone() {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

/**
 * Generate random sample ID
 */
function generateSampleId() {
  return `SAMPLE_${generateRandomString(6).toUpperCase()}`;
}

/**
 * Generate random client ID
 */
function generateClientId() {
  return `CLIENT_${generateRandomString(6).toUpperCase()}`;
}

/**
 * Authenticate user and store token
 */
function authenticateUser(requestParams, context, ee, next) {
  const authRequest = {
    url: '/api/auth/login',
    method: 'POST',
    json: {
      username: 'loadtest@example.com',
      password: 'loadtest123'
    }
  };

  // Make authentication request
  context.http.request(authRequest, (err, response, body) => {
    if (err) {
      return next(err);
    }

    if (response.statusCode !== 200) {
      return next(new Error(`Authentication failed with status ${response.statusCode}`));
    }

    // Store token in context
    context.vars.authToken = body.token;
    return next();
  });
}

/**
 * Setup test data before load testing
 */
function setupTestData(requestParams, context, ee, next) {
  console.log('Setting up test data for load testing...');
  
  // Generate test data
  context.vars.testUserEmail = generateRandomEmail();
  context.vars.testClientName = `Load Test Client ${generateRandomString()}`;
  context.vars.testSampleId = generateSampleId();
  
  console.log('Test data setup completed');
  return next();
}

/**
 * Cleanup test data after load testing
 */
function cleanupTestData(requestParams, context, ee, next) {
  console.log('Cleaning up test data...');
  
  // In a real scenario, you would clean up test data here
  // For now, we'll just log the completion
  console.log('Test data cleanup completed');
  return next();
}

/**
 * Generate realistic sample data
 */
function generateSampleData(requestParams, context, ee, next) {
  const sampleTypes = ['blood', 'saliva', 'tissue', 'urine', 'swab'];
  const testTypes = ['genetic', 'chemical', 'biological', 'pathology'];
  const priorities = ['low', 'normal', 'high', 'urgent'];
  
  context.vars.sampleType = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
  context.vars.testType = testTypes[Math.floor(Math.random() * testTypes.length)];
  context.vars.priority = priorities[Math.floor(Math.random() * priorities.length)];
  context.vars.volume = Math.floor(Math.random() * 10) + 1; // 1-10 mL
  
  return next();
}

/**
 * Generate realistic client data
 */
function generateClientData(requestParams, context, ee, next) {
  const clientTypes = ['hospital', 'clinic', 'research', 'individual'];
  const countries = ['USA', 'Canada', 'UK', 'Germany', 'France'];
  
  context.vars.clientType = clientTypes[Math.floor(Math.random() * clientTypes.length)];
  context.vars.country = countries[Math.floor(Math.random() * countries.length)];
  context.vars.clientEmail = generateRandomEmail();
  context.vars.clientPhone = generateRandomPhone();
  
  return next();
}

/**
 * Generate genetic analysis parameters
 */
function generateGeneticAnalysisData(requestParams, context, ee, next) {
  const analysisTypes = ['snp', 'cnv', 'indel', 'structural', 'pharmacogenomics'];
  const geneList = ['BRCA1', 'BRCA2', 'TP53', 'KRAS', 'EGFR', 'PIK3CA', 'APC', 'MLH1'];
  
  context.vars.analysisType = analysisTypes[Math.floor(Math.random() * analysisTypes.length)];
  
  // Select random genes
  const selectedGenes = [];
  const numGenes = Math.floor(Math.random() * 5) + 1; // 1-5 genes
  for (let i = 0; i < numGenes; i++) {
    const gene = geneList[Math.floor(Math.random() * geneList.length)];
    if (!selectedGenes.includes(gene)) {
      selectedGenes.push(gene);
    }
  }
  
  context.vars.selectedGenes = selectedGenes;
  return next();
}

/**
 * Validate response data
 */
function validateResponse(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.error(`Request failed with status ${response.statusCode}: ${response.body}`);
    return next(new Error(`Request failed with status ${response.statusCode}`));
  }
  
  // Custom validation logic
  if (response.body && typeof response.body === 'object') {
    // Validate required fields based on endpoint
    const url = requestParams.url;
    
    if (url.includes('/api/samples') && requestParams.method === 'POST') {
      if (!response.body.id || !response.body.sampleId) {
        return next(new Error('Sample creation response missing required fields'));
      }
    }
    
    if (url.includes('/api/clients') && requestParams.method === 'POST') {
      if (!response.body.id || !response.body.name) {
        return next(new Error('Client creation response missing required fields'));
      }
    }
  }
  
  return next();
}

/**
 * Log performance metrics
 */
function logMetrics(requestParams, response, context, ee, next) {
  const responseTime = response.timings ? response.timings.response : 0;
  const statusCode = response.statusCode;
  
  if (responseTime > 2000) {
    console.warn(`Slow response detected: ${requestParams.url} - ${responseTime}ms`);
  }
  
  if (statusCode >= 500) {
    console.error(`Server error: ${requestParams.url} - ${statusCode}`);
  }
  
  return next();
}

/**
 * Generate report data
 */
function generateReportData(requestParams, context, ee, next) {
  const reportTypes = ['daily', 'weekly', 'monthly', 'quarterly'];
  const formats = ['pdf', 'excel', 'csv'];
  
  context.vars.reportType = reportTypes[Math.floor(Math.random() * reportTypes.length)];
  context.vars.reportFormat = formats[Math.floor(Math.random() * formats.length)];
  
  // Generate date range
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30); // Last 30 days
  
  context.vars.startDate = startDate.toISOString().split('T')[0];
  context.vars.endDate = endDate.toISOString().split('T')[0];
  
  return next();
}

/**
 * Simulate user think time
 */
function simulateThinkTime(requestParams, context, ee, next) {
  const thinkTime = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds
  
  setTimeout(() => {
    return next();
  }, thinkTime);
}

/**
 * Check system health before test
 */
function checkSystemHealth(requestParams, context, ee, next) {
  const healthRequest = {
    url: '/api/health',
    method: 'GET'
  };

  context.http.request(healthRequest, (err, response, body) => {
    if (err) {
      console.error('System health check failed:', err);
      return next(err);
    }

    if (response.statusCode !== 200) {
      console.error(`System health check failed with status ${response.statusCode}`);
      return next(new Error(`System unhealthy: ${response.statusCode}`));
    }

    console.log('System health check passed');
    return next();
  });
}

/**
 * Generate concurrent user sessions
 */
function generateUserSession(requestParams, context, ee, next) {
  const sessionData = {
    userId: `user_${generateRandomString()}`,
    sessionId: `session_${generateRandomString()}`,
    userAgent: 'Artillery Load Test Agent',
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    timestamp: new Date().toISOString()
  };
  
  Object.assign(context.vars, sessionData);
  return next();
}

/**
 * Custom error handler
 */
function handleError(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    const error = {
      url: requestParams.url,
      method: requestParams.method,
      statusCode: response.statusCode,
      body: response.body,
      timestamp: new Date().toISOString()
    };
    
    console.error('Load test error:', JSON.stringify(error, null, 2));
  }
  
  return next();
}

module.exports = {
  authenticateUser,
  setupTestData,
  cleanupTestData,
  generateSampleData,
  generateClientData,
  generateGeneticAnalysisData,
  validateResponse,
  logMetrics,
  generateReportData,
  simulateThinkTime,
  checkSystemHealth,
  generateUserSession,
  handleError,
  generateRandomString,
  generateRandomEmail,
  generateRandomPhone,
  generateSampleId,
  generateClientId
};