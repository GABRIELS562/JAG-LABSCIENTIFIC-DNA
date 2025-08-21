const axios = require('axios');
const { logger } = require('../utils/logger');

class LoadGenerator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3001';
    this.concurrency = options.concurrency || 5;
    this.duration = options.duration || 60000; // 1 minute default
    this.isRunning = false;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: [],
      errors: {},
      startTime: null,
      endTime: null
    };
    this.workers = [];
    this.scenarios = this.getScenarios();
  }

  getScenarios() {
    return [
      // User login scenario
      {
        name: 'user_login_cycle',
        weight: 1,
        steps: [
          { method: 'GET', path: '/health' },
          { method: 'GET', path: '/api/test' },
          { method: 'GET', path: '/api/samples/counts' }
        ]
      },
      
      // Sample management scenario
      {
        name: 'sample_management',
        weight: 3,
        steps: [
          { method: 'GET', path: '/api/samples?limit=20&page=1' },
          { method: 'GET', path: '/api/samples/counts' },
          { method: 'GET', path: '/api/samples/search?q=test' },
          { method: 'GET', path: '/api/workflow-stats' }
        ]
      },
      
      // Batch processing scenario
      {
        name: 'batch_processing',
        weight: 2,
        steps: [
          { method: 'GET', path: '/api/batches' },
          { method: 'GET', path: '/api/samples/queue/pcr_ready' },
          { method: 'GET', path: '/api/samples/queue/electro_ready' }
        ]
      },
      
      // Report generation scenario
      {
        name: 'report_generation',
        weight: 1,
        steps: [
          { method: 'GET', path: '/api/samples/all' },
          { method: 'GET', path: '/api/workflow-stats' },
          { method: 'GET', path: '/api/electrophoresis-batches' }
        ]
      },
      
      // Performance testing scenario
      {
        name: 'performance_testing',
        weight: 1,
        steps: [
          { method: 'GET', path: '/performance/slow' },
          { method: 'GET', path: '/performance/unreliable' },
          { method: 'GET', path: '/performance/random-status' },
          { method: 'GET', path: '/performance/memory-status' }
        ]
      },
      
      // Search operations scenario
      {
        name: 'search_operations',
        weight: 2,
        steps: [
          { method: 'GET', path: '/api/samples/search?q=lab' },
          { method: 'GET', path: '/api/samples/search?q=smith' },
          { method: 'GET', path: '/api/samples?status=pending&limit=10' },
          { method: 'GET', path: '/api/samples?status=completed&limit=10' }
        ]
      },
      
      // Dashboard monitoring scenario
      {
        name: 'dashboard_monitoring',
        weight: 4,
        steps: [
          { method: 'GET', path: '/api/samples/counts' },
          { method: 'GET', path: '/api/workflow-stats' },
          { method: 'GET', path: '/api/samples/queue-counts' },
          { method: 'GET', path: '/health' },
          { method: 'GET', path: '/metrics' }
        ]
      }
    ];
  }

  selectScenario() {
    const totalWeight = this.scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const scenario of this.scenarios) {
      random -= scenario.weight;
      if (random <= 0) {
        return scenario;
      }
    }
    
    return this.scenarios[0];
  }

  async executeStep(step, scenarioName) {
    const startTime = Date.now();
    
    try {
      const config = {
        method: step.method.toLowerCase(),
        url: `${this.baseUrl}${step.path}`,
        timeout: 30000,
        headers: {
          'User-Agent': 'LIMS-LoadGenerator/1.0',
          'X-Scenario': scenarioName
        }
      };
      
      // Add request body for POST requests
      if (step.method === 'POST' && step.data) {
        config.data = step.data;
        config.headers['Content-Type'] = 'application/json';
      }
      
      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      
      this.recordSuccess(responseTime, step.path, scenarioName);
      
      return {
        success: true,
        statusCode: response.status,
        responseTime,
        dataSize: JSON.stringify(response.data).length
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordError(error, responseTime, step.path, scenarioName);
      
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status || 0,
        responseTime
      };
    }
  }

  async executeScenario(scenario) {
    const scenarioStart = Date.now();
    const results = [];
    
    for (const step of scenario.steps) {
      const result = await this.executeStep(step, scenario.name);
      results.push(result);
      
      // Small delay between steps to simulate user behavior
      await this.sleep(Math.random() * 500 + 100);
    }
    
    const scenarioDuration = Date.now() - scenarioStart;
    
    logger.debug('Scenario completed', {
      scenario: scenario.name,
      duration: scenarioDuration,
      steps: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
    return results;
  }

  async workerLoop(workerId) {
    logger.info(`Load generator worker ${workerId} started`);
    
    while (this.isRunning) {
      try {
        const scenario = this.selectScenario();
        await this.executeScenario(scenario);
        
        // Random delay between scenario executions
        await this.sleep(Math.random() * 2000 + 1000);
        
      } catch (error) {
        logger.error(`Worker ${workerId} error`, { error: error.message });
        await this.sleep(5000); // Wait before retrying
      }
    }
    
    logger.info(`Load generator worker ${workerId} stopped`);
  }

  recordSuccess(responseTime, endpoint, scenario) {
    this.stats.totalRequests++;
    this.stats.successfulRequests++;
    this.stats.responseTimes.push(responseTime);
    this.updateAverageResponseTime();
    
    if (responseTime > 5000) {
      logger.warn('Slow response detected', {
        endpoint,
        scenario,
        responseTime,
        threshold: '5000ms'
      });
    }
  }

  recordError(error, responseTime, endpoint, scenario) {
    this.stats.totalRequests++;
    this.stats.failedRequests++;
    this.stats.responseTimes.push(responseTime);
    this.updateAverageResponseTime();
    
    const errorKey = error.code || error.message || 'unknown';
    this.stats.errors[errorKey] = (this.stats.errors[errorKey] || 0) + 1;
    
    logger.warn('Request failed in load test', {
      endpoint,
      scenario,
      error: error.message,
      statusCode: error.response?.status,
      responseTime
    });
  }

  updateAverageResponseTime() {
    if (this.stats.responseTimes.length > 0) {
      const sum = this.stats.responseTimes.reduce((a, b) => a + b, 0);
      this.stats.averageResponseTime = Math.round(sum / this.stats.responseTimes.length);
    }
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Load generator is already running');
    }
    
    logger.info('Starting load generator', {
      baseUrl: this.baseUrl,
      concurrency: this.concurrency,
      duration: this.duration,
      scenarios: this.scenarios.length
    });
    
    this.isRunning = true;
    this.stats.startTime = Date.now();
    this.resetStats();
    
    // Start worker threads
    this.workers = [];
    for (let i = 0; i < this.concurrency; i++) {
      const worker = this.workerLoop(i + 1);
      this.workers.push(worker);
    }
    
    // Stop after duration
    setTimeout(async () => {
      await this.stop();
    }, this.duration);
    
    // Start periodic stats logging
    this.statsInterval = setInterval(() => {
      this.logStats();
    }, 10000); // Every 10 seconds
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }
    
    logger.info('Stopping load generator');
    
    this.isRunning = false;
    this.stats.endTime = Date.now();
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    
    // Wait for all workers to complete
    await Promise.all(this.workers);
    
    this.logFinalStats();
  }

  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: [],
      errors: {},
      startTime: Date.now(),
      endTime: null
    };
  }

  logStats() {
    const runtime = Date.now() - this.stats.startTime;
    const rps = Math.round((this.stats.totalRequests / runtime) * 1000);
    const successRate = this.stats.totalRequests > 0 ? 
      ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) : 0;
    
    logger.info('Load generator stats', {
      runtime: `${Math.round(runtime / 1000)}s`,
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      successRate: `${successRate}%`,
      averageResponseTime: `${this.stats.averageResponseTime}ms`,
      requestsPerSecond: rps,
      errors: Object.keys(this.stats.errors).length > 0 ? this.stats.errors : 'none'
    });
  }

  logFinalStats() {
    const runtime = this.stats.endTime - this.stats.startTime;
    const rps = Math.round((this.stats.totalRequests / runtime) * 1000);
    const successRate = this.stats.totalRequests > 0 ? 
      ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) : 0;
    
    // Calculate percentiles
    const sortedTimes = this.stats.responseTimes.sort((a, b) => a - b);
    const p50 = this.percentile(sortedTimes, 0.5);
    const p95 = this.percentile(sortedTimes, 0.95);
    const p99 = this.percentile(sortedTimes, 0.99);
    const min = sortedTimes.length > 0 ? sortedTimes[0] : 0;
    const max = sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0;
    
    logger.info('Load generator final results', {
      duration: `${Math.round(runtime / 1000)}s`,
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      successRate: `${successRate}%`,
      requestsPerSecond: rps,
      responseTimeStats: {
        average: `${this.stats.averageResponseTime}ms`,
        min: `${min}ms`,
        max: `${max}ms`,
        p50: `${p50}ms`,
        p95: `${p95}ms`,
        p99: `${p99}ms`
      },
      errors: this.stats.errors
    });
  }

  percentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return Math.round(sortedArray[index] || 0);
  }

  getStats() {
    const runtime = this.isRunning ? Date.now() - this.stats.startTime : 
      (this.stats.endTime - this.stats.startTime);
    const rps = Math.round((this.stats.totalRequests / runtime) * 1000);
    const successRate = this.stats.totalRequests > 0 ? 
      ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) : 0;
    
    return {
      isRunning: this.isRunning,
      runtime: Math.round(runtime / 1000),
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      successRate: parseFloat(successRate),
      averageResponseTime: this.stats.averageResponseTime,
      requestsPerSecond: rps,
      errors: this.stats.errors,
      concurrency: this.concurrency
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Create sample with realistic data
  async createSampleData() {
    const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Mary'];
    const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const relations = ['Child', 'Parent', 'Sibling', 'Unknown'];
    
    return {
      lab_number: `25_${String(Math.floor(Math.random() * 9999) + 1).padStart(3, '0')}`,
      name: names[Math.floor(Math.random() * names.length)],
      surname: surnames[Math.floor(Math.random() * surnames.length)],
      relation: relations[Math.floor(Math.random() * relations.length)],
      status: 'pending',
      phone_number: `555-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
    };
  }

  // Stress test specific endpoints
  async stressTest(endpoint, requests = 100, concurrency = 10) {
    logger.info('Starting stress test', { endpoint, requests, concurrency });
    
    const results = [];
    const batches = [];
    
    // Split requests into batches
    for (let i = 0; i < requests; i += concurrency) {
      const batchSize = Math.min(concurrency, requests - i);
      batches.push(batchSize);
    }
    
    for (const batchSize of batches) {
      const batchPromises = [];
      
      for (let j = 0; j < batchSize; j++) {
        const promise = this.executeStep(
          { method: 'GET', path: endpoint },
          'stress_test'
        );
        batchPromises.push(promise);
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      await this.sleep(100);
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    logger.info('Stress test completed', {
      endpoint,
      totalRequests: results.length,
      successful,
      failed,
      successRate: `${((successful / results.length) * 100).toFixed(2)}%`,
      averageResponseTime: `${Math.round(avgResponseTime)}ms`
    });
    
    return {
      endpoint,
      totalRequests: results.length,
      successful,
      failed,
      successRate: (successful / results.length) * 100,
      averageResponseTime: Math.round(avgResponseTime),
      results
    };
  }
}

// CLI interface for running load tests
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {
    baseUrl: process.env.LOAD_TEST_URL || 'http://localhost:3001',
    concurrency: parseInt(process.env.LOAD_TEST_CONCURRENCY) || 5,
    duration: parseInt(process.env.LOAD_TEST_DURATION) || 60000
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'url') config.baseUrl = value;
    if (key === 'concurrency') config.concurrency = parseInt(value);
    if (key === 'duration') config.duration = parseInt(value) * 1000; // Convert to ms
  }
  
  console.log('Starting LIMS Load Generator...');
  console.log('Configuration:', config);
  
  const loadGenerator = new LoadGenerator(config);
  
  loadGenerator.start().catch(error => {
    console.error('Load generator failed:', error.message);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down load generator...');
    await loadGenerator.stop();
    process.exit(0);
  });
}

module.exports = LoadGenerator;
