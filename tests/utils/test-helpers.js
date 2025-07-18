// Test Utilities and Helper Functions
// This file contains common utilities used across integration tests

const axios = require('axios');
const { expect } = require('chai');
const config = require('../config/test-config');

class TestHelpers {
  constructor() {
    this.authToken = null;
    this.testData = new Map();
  }

  // Authentication helper
  async authenticate(credentials = null) {
    const authData = credentials || config.auth.testUser;
    
    try {
      const response = await axios.post(`${config.services.auth.baseUrl}/auth/login`, {
        username: authData.username,
        password: authData.password
      });

      this.authToken = response.data.token;
      return this.authToken;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Get authenticated headers
  getAuthHeaders() {
    if (!this.authToken) {
      throw new Error('No authentication token available. Call authenticate() first.');
    }

    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Create test sample data
  createTestSample(overrides = {}) {
    const defaultSample = {
      sampleId: `SAMPLE_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      clientId: 'CLIENT_TEST_001',
      sampleType: 'blood',
      testType: 'genetic',
      priority: 'normal',
      volume: 5.0,
      unit: 'mL',
      collectionDate: new Date().toISOString().split('T')[0],
      notes: 'Integration test sample'
    };

    return { ...defaultSample, ...overrides };
  }

  // Create test analysis data
  createTestAnalysis(sampleId, overrides = {}) {
    const defaultAnalysis = {
      sampleId: sampleId,
      analysisType: 'whole_exome_sequencing',
      genes: ['BRCA1', 'BRCA2', 'TP53'],
      priority: 'normal',
      sequencingPlatform: 'Illumina NovaSeq 6000',
      readDepth: 100,
      coverageThreshold: 90.0
    };

    return { ...defaultAnalysis, ...overrides };
  }

  // Create test notification data
  createTestNotification(recipientId, overrides = {}) {
    const defaultNotification = {
      recipientId: recipientId,
      type: 'email',
      priority: 'normal',
      subject: 'Test Notification',
      message: 'This is a test notification from integration tests',
      template: 'test_notification',
      variables: {
        testId: Date.now(),
        environment: 'test'
      },
      metadata: {
        entityType: 'test',
        entityId: recipientId,
        source: 'integration-tests'
      }
    };

    return { ...defaultNotification, ...overrides };
  }

  // Wait for async operation with timeout
  async waitFor(condition, timeout = 10000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return result;
        }
      } catch (error) {
        // Continue waiting on error
      }
      
      await this.delay(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  // Delay helper
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate unique trace ID
  generateTraceId() {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Store test data for cleanup
  storeTestData(key, value) {
    this.testData.set(key, value);
  }

  // Get stored test data
  getTestData(key) {
    return this.testData.get(key);
  }

  // Clear test data
  clearTestData() {
    this.testData.clear();
  }

  // Health check helper
  async checkServiceHealth(serviceUrl, timeout = 5000) {
    try {
      const response = await axios.get(`${serviceUrl}/health`, {
        timeout: timeout,
        headers: this.getAuthHeaders()
      });

      return response.status === 200 && response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  // Retry helper with exponential backoff
  async retry(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }

  // Validate response structure
  validateResponse(response, expectedSchema) {
    expect(response).to.have.property('status');
    expect(response).to.have.property('data');
    
    if (expectedSchema) {
      Object.keys(expectedSchema).forEach(key => {
        expect(response.data).to.have.property(key);
        
        if (expectedSchema[key].type) {
          expect(response.data[key]).to.be.a(expectedSchema[key].type);
        }
        
        if (expectedSchema[key].required !== false) {
          expect(response.data[key]).to.not.be.undefined;
        }
      });
    }
  }

  // Performance measurement helper
  async measurePerformance(operation, operationName = 'operation') {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await operation();
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      const metrics = {
        duration: endTime - startTime,
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
        operationName: operationName,
        timestamp: new Date().toISOString()
      };
      
      return { result, metrics };
    } catch (error) {
      const endTime = Date.now();
      
      const metrics = {
        duration: endTime - startTime,
        operationName: operationName,
        timestamp: new Date().toISOString(),
        error: error.message
      };
      
      throw { error, metrics };
    }
  }

  // Database cleanup helper
  async cleanupTestData() {
    const testSampleIds = [];
    const testAnalysisIds = [];
    const testNotificationIds = [];
    
    // Collect test data IDs
    for (const [key, value] of this.testData) {
      if (key.startsWith('sample_')) {
        testSampleIds.push(value);
      } else if (key.startsWith('analysis_')) {
        testAnalysisIds.push(value);
      } else if (key.startsWith('notification_')) {
        testNotificationIds.push(value);
      }
    }
    
    // Clean up test samples
    for (const sampleId of testSampleIds) {
      try {
        await axios.delete(`${config.services.sample.baseUrl}/samples/${sampleId}`, {
          headers: this.getAuthHeaders()
        });
      } catch (error) {
        console.warn(`Failed to cleanup sample ${sampleId}: ${error.message}`);
      }
    }
    
    // Clean up test analyses
    for (const analysisId of testAnalysisIds) {
      try {
        await axios.delete(`${config.services.analysis.baseUrl}/genetic-analysis/${analysisId}`, {
          headers: this.getAuthHeaders()
        });
      } catch (error) {
        console.warn(`Failed to cleanup analysis ${analysisId}: ${error.message}`);
      }
    }
    
    // Clean up test notifications
    for (const notificationId of testNotificationIds) {
      try {
        await axios.delete(`${config.services.notification.baseUrl}/notifications/${notificationId}`, {
          headers: this.getAuthHeaders()
        });
      } catch (error) {
        console.warn(`Failed to cleanup notification ${notificationId}: ${error.message}`);
      }
    }
    
    this.clearTestData();
  }

  // Circuit breaker simulation
  async simulateCircuitBreaker(serviceUrl, failureCount = 5) {
    const failures = [];
    
    // Generate failures
    for (let i = 0; i < failureCount; i++) {
      try {
        await axios.get(`${serviceUrl}/nonexistent-endpoint`);
      } catch (error) {
        failures.push(error.response ? error.response.status : 'network_error');
      }
    }
    
    return failures;
  }

  // Load testing helper
  async loadTest(operation, options = {}) {
    const {
      concurrency = 10,
      duration = 5000,
      rampUp = 1000
    } = options;
    
    const results = [];
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    // Ramp up
    const rampUpInterval = rampUp / concurrency;
    
    for (let i = 0; i < concurrency; i++) {
      setTimeout(async () => {
        while (Date.now() < endTime) {
          try {
            const result = await this.measurePerformance(operation, `load-test-${i}`);
            results.push(result);
          } catch (error) {
            results.push({ error: error.error, metrics: error.metrics });
          }
          
          await this.delay(100); // Small delay between requests
        }
      }, i * rampUpInterval);
    }
    
    // Wait for all tests to complete
    await this.delay(duration + rampUp + 1000);
    
    return results;
  }

  // Generate test report
  generateTestReport(testResults) {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => !r.error).length;
    const failedTests = totalTests - passedTests;
    
    const durations = testResults
      .filter(r => r.metrics && r.metrics.duration)
      .map(r => r.metrics.duration);
    
    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;
    
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    
    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: (passedTests / totalTests) * 100
      },
      performance: {
        avgDuration,
        maxDuration,
        minDuration
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new TestHelpers();