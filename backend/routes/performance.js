const express = require('express');
const { logger } = require('../utils/logger');
const { ResponseHandler } = require('../utils/responseHandler');
const { 
  simulateMemoryLeak, 
  simulateCpuIntensive, 
  simulateSlowOperation, 
  simulateError 
} = require('../middleware/metrics');

const router = express.Router();

// Memory leak to store large objects
let memoryLeakStore = [];

/**
 * Intentionally slow endpoint (3-5 second delay)
 * Demonstrates slow response monitoring
 */
router.get('/slow', async (req, res) => {
  try {
    simulateSlowOperation();
    
    const delay = Math.random() * 2000 + 3000; // 3-5 seconds
    
    logger.info('Slow endpoint accessed', {
      endpoint: '/performance/slow',
      delay: `${delay}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate some database operations
    const simulatedData = {
      processedSamples: Math.floor(Math.random() * 100) + 1,
      analysisResults: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        result: Math.random() > 0.5 ? 'positive' : 'negative',
        confidence: Math.random() * 100
      })),
      processingTime: delay,
      timestamp: new Date().toISOString()
    };
    
    ResponseHandler.success(res, simulatedData, 'Slow operation completed');
    
  } catch (error) {
    logger.error('Slow endpoint error', { error: error.message });
    ResponseHandler.error(res, 'Slow operation failed', error);
  }
});

/**
 * Endpoint with 10% error rate
 * Demonstrates error monitoring and alerting
 */
router.get('/unreliable', (req, res) => {
  try {
    // 10% chance of failure
    if (Math.random() < 0.1) {
      simulateError('random_failure');
      
      logger.error('Unreliable endpoint failed', {
        endpoint: '/performance/unreliable',
        reason: 'Random failure simulation',
        ip: req.ip
      });
      
      // Simulate different types of errors
      const errorTypes = [
        { status: 500, message: 'Internal server error during analysis' },
        { status: 503, message: 'Database temporarily unavailable' },
        { status: 429, message: 'Rate limit exceeded' },
        { status: 502, message: 'Upstream service unavailable' }
      ];
      
      const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      return ResponseHandler.error(res, error.message, null, error.status);
    }
    
    // Successful response (90% of the time)
    const data = {
      status: 'success',
      reliability: '90%',
      message: 'Operation completed successfully',
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(2, 15)
    };
    
    logger.debug('Unreliable endpoint succeeded', {
      endpoint: '/performance/unreliable',
      requestId: data.requestId
    });
    
    ResponseHandler.success(res, data, 'Unreliable operation succeeded');
    
  } catch (error) {
    simulateError('exception');
    logger.error('Unreliable endpoint exception', { error: error.message });
    ResponseHandler.error(res, 'Unexpected error in unreliable endpoint', error);
  }
});

/**
 * Memory leak simulation endpoint
 * Demonstrates memory monitoring and alerts
 */
router.post('/memory-leak', (req, res) => {
  try {
    simulateMemoryLeak();
    
    const leakSize = req.body.size || 1000;
    const iterations = req.body.iterations || 10;
    
    logger.warn('Memory leak simulation triggered', {
      endpoint: '/performance/memory-leak',
      leakSize,
      iterations,
      currentStoreSize: memoryLeakStore.length,
      ip: req.ip
    });
    
    // Create memory leak by storing large objects
    for (let i = 0; i < iterations; i++) {
      const largeObject = {
        id: Date.now() + i,
        data: new Array(leakSize).fill(0).map(() => ({
          timestamp: new Date().toISOString(),
          randomData: Math.random().toString(36).substring(2, 15),
          largeString: 'x'.repeat(100),
          nestedObject: {
            level1: { level2: { level3: 'deep data' } },
            arrayData: new Array(50).fill(Math.random())
          }
        }))
      };
      
      memoryLeakStore.push(largeObject);
    }
    
    const memUsage = process.memoryUsage();
    
    ResponseHandler.success(res, {
      message: 'Memory leak created',
      leakSize,
      iterations,
      totalLeakedObjects: memoryLeakStore.length,
      memoryUsage: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
      }
    });
    
  } catch (error) {
    logger.error('Memory leak simulation error', { error: error.message });
    ResponseHandler.error(res, 'Memory leak simulation failed', error);
  }
});

/**
 * Memory cleanup endpoint
 * Allows cleaning up the intentional memory leak
 */
router.delete('/memory-leak', (req, res) => {
  try {
    const originalSize = memoryLeakStore.length;
    memoryLeakStore = [];
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const memUsage = process.memoryUsage();
    
    logger.info('Memory leak cleaned up', {
      originalSize,
      clearedObjects: originalSize,
      memoryAfterCleanup: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      }
    });
    
    ResponseHandler.success(res, {
      message: 'Memory leak cleaned up',
      clearedObjects: originalSize,
      memoryUsage: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
      }
    });
    
  } catch (error) {
    logger.error('Memory cleanup error', { error: error.message });
    ResponseHandler.error(res, 'Memory cleanup failed', error);
  }
});

/**
 * CPU intensive endpoint
 * Demonstrates CPU usage monitoring
 */
router.post('/cpu-intensive', (req, res) => {
  try {
    simulateCpuIntensive();
    
    const duration = req.body.duration || 5000; // Default 5 seconds
    const complexity = req.body.complexity || 1000000; // Default complexity
    
    logger.info('CPU intensive operation started', {
      endpoint: '/performance/cpu-intensive',
      duration,
      complexity,
      ip: req.ip
    });
    
    const startTime = Date.now();
    
    // CPU intensive calculation
    let result = 0;
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      for (let i = 0; i < complexity; i++) {
        result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      }
    }
    
    const actualDuration = Date.now() - startTime;
    const cpuUsage = process.cpuUsage();
    
    logger.warn('CPU intensive operation completed', {
      requestedDuration: duration,
      actualDuration,
      complexity,
      cpuUsage
    });
    
    ResponseHandler.success(res, {
      message: 'CPU intensive operation completed',
      duration: actualDuration,
      complexity,
      result: result.toString().slice(0, 10), // Truncate result
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    });
    
  } catch (error) {
    logger.error('CPU intensive operation error', { error: error.message });
    ResponseHandler.error(res, 'CPU intensive operation failed', error);
  }
});

/**
 * Endpoint that randomly returns different status codes
 * Demonstrates error rate monitoring
 */
router.get('/random-status', (req, res) => {
  try {
    const statuses = [
      { code: 200, weight: 70, message: 'Success' },
      { code: 400, weight: 10, message: 'Bad Request' },
      { code: 401, weight: 5, message: 'Unauthorized' },
      { code: 403, weight: 3, message: 'Forbidden' },
      { code: 404, weight: 5, message: 'Not Found' },
      { code: 429, weight: 2, message: 'Too Many Requests' },
      { code: 500, weight: 3, message: 'Internal Server Error' },
      { code: 502, weight: 1, message: 'Bad Gateway' },
      { code: 503, weight: 1, message: 'Service Unavailable' }
    ];
    
    const totalWeight = statuses.reduce((sum, status) => sum + status.weight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedStatus = statuses[0];
    for (const status of statuses) {
      random -= status.weight;
      if (random <= 0) {
        selectedStatus = status;
        break;
      }
    }
    
    if (selectedStatus.code >= 400) {
      simulateError('random_status');
    }
    
    logger.debug('Random status endpoint accessed', {
      statusCode: selectedStatus.code,
      message: selectedStatus.message,
      ip: req.ip
    });
    
    res.status(selectedStatus.code).json({
      status: selectedStatus.code >= 400 ? 'error' : 'success',
      code: selectedStatus.code,
      message: selectedStatus.message,
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(2, 15)
    });
    
  } catch (error) {
    simulateError('exception');
    logger.error('Random status endpoint error', { error: error.message });
    ResponseHandler.error(res, 'Random status endpoint failed', error);
  }
});

/**
 * Performance test endpoint with configurable behavior
 * Useful for load testing and monitoring demonstrations
 */
router.post('/test', async (req, res) => {
  try {
    const config = {
      delay: req.body.delay || 0,
      cpuWork: req.body.cpuWork || 0,
      memoryAllocation: req.body.memoryAllocation || 0,
      errorRate: req.body.errorRate || 0,
      ...req.body
    };
    
    logger.info('Performance test started', { config, ip: req.ip });
    
    // Simulate error based on error rate
    if (Math.random() < config.errorRate) {
      simulateError('performance_test');
      throw new Error('Simulated error during performance test');
    }
    
    // Add delay if requested
    if (config.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }
    
    // CPU intensive work if requested
    if (config.cpuWork > 0) {
      simulateCpuIntensive();
      let result = 0;
      for (let i = 0; i < config.cpuWork; i++) {
        result += Math.sqrt(i);
      }
    }
    
    // Memory allocation if requested
    if (config.memoryAllocation > 0) {
      simulateMemoryLeak();
      const tempArray = new Array(config.memoryAllocation).fill(Math.random());
    }
    
    const memUsage = process.memoryUsage();
    
    ResponseHandler.success(res, {
      message: 'Performance test completed',
      config,
      memoryUsage: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Performance test error', { error: error.message, config: req.body });
    ResponseHandler.error(res, 'Performance test failed', error);
  }
});

/**
 * Get current memory usage and leak status
 */
router.get('/memory-status', (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    
    ResponseHandler.success(res, {
      memoryUsage: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      leakStore: {
        size: memoryLeakStore.length,
        estimatedMemory: `${Math.round(memoryLeakStore.length * 0.1)}MB`
      },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Memory status error', { error: error.message });
    ResponseHandler.error(res, 'Failed to get memory status', error);
  }
});

module.exports = router;
