const { performance } = require('perf_hooks');
const { logger, createContextLogger } = require('../utils/logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
    this.logger = createContextLogger('PerformanceMonitor');
    
    // Store performance data for the last hour
    this.metricsWindow = 60 * 60 * 1000; // 1 hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  // Start timing an operation
  startTimer(operationId) {
    const startTime = performance.now();
    this.startTimes.set(operationId, startTime);
    return startTime;
  }

  // End timing and record the duration
  endTimer(operationId, metadata = {}) {
    const endTime = performance.now();
    const startTime = this.startTimes.get(operationId);
    
    if (!startTime) {
      this.logger.warn('No start time found for operation', { operationId });
      return null;
    }

    const duration = endTime - startTime;
    this.startTimes.delete(operationId);

    const metric = {
      operationId,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.recordMetric(operationId, metric);
    
    // Log slow operations (> 1 second)
    if (duration > 1000) {
      this.logger.warn('Slow operation detected', {
        operationId,
        duration: `${duration.toFixed(2)}ms`,
        metadata
      });
    }

    return duration;
  }

  // Record a metric
  recordMetric(operationId, metric) {
    if (!this.metrics.has(operationId)) {
      this.metrics.set(operationId, []);
    }

    const operationMetrics = this.metrics.get(operationId);
    operationMetrics.push(metric);

    // Keep only recent metrics
    const cutoff = Date.now() - this.metricsWindow;
    const filteredMetrics = operationMetrics.filter(m => m.timestamp >= cutoff);
    this.metrics.set(operationId, filteredMetrics);
  }

  // Get performance statistics for an operation
  getOperationStats(operationId) {
    const operationMetrics = this.metrics.get(operationId) || [];
    
    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration);
    const sorted = durations.sort((a, b) => a - b);
    
    return {
      operationId,
      count: durations.length,
      avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      recentActivity: operationMetrics.slice(-10).map(m => ({
        duration: m.duration,
        timestamp: m.timestamp,
        metadata: m.metadata
      }))
    };
  }

  // Get all operation statistics
  getAllStats() {
    const stats = {};
    for (const operationId of this.metrics.keys()) {
      stats[operationId] = this.getOperationStats(operationId);
    }
    return stats;
  }

  // Calculate percentile
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    
    const index = p * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    return sortedArray[lower] * (upper - index) + sortedArray[upper] * (index - lower);
  }

  // Clean up old metrics
  cleanup() {
    const cutoff = Date.now() - this.metricsWindow;
    let cleanedCount = 0;

    for (const [operationId, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
      
      if (filteredMetrics.length === 0) {
        this.metrics.delete(operationId);
      } else {
        this.metrics.set(operationId, filteredMetrics);
      }
      
      cleanedCount += metrics.length - filteredMetrics.length;
    }

    if (cleanedCount > 0) {
      this.logger.debug('Cleaned up old metrics', { cleanedCount });
    }
  }

  // Get system performance metrics
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };
  }

  // Destroy the monitor
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Middleware for automatic request performance monitoring
const performanceMiddleware = (monitor) => {
  return (req, res, next) => {
    const requestId = `${req.method}:${req.route?.path || req.path}:${Date.now()}`;
    const operationType = `request:${req.method}:${req.route?.path || req.path}`;
    
    // Start timing
    const startTime = monitor.startTimer(requestId);
    
    // Add request metadata
    req.performanceId = requestId;
    req.startTime = startTime;
    
    // Override res.end to capture completion time
    const originalEnd = res.end.bind(res);
    res.end = function(...args) {
      const duration = monitor.endTimer(requestId, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        contentLength: res.get('content-length'),
        userAgent: req.get('user-agent'),
        ip: req.ip
      });
      
      // Record operation-level metrics
      monitor.recordMetric(operationType, {
        operationId: operationType,
        duration,
        timestamp: Date.now(),
        metadata: {
          statusCode: res.statusCode,
          method: req.method,
          path: req.path
        }
      });
      
      originalEnd(...args);
    };
    
    next();
  };
};

// Function decorator for automatic performance monitoring
const monitorFunction = (monitor, operationName) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const operationId = `${operationName}:${Date.now()}`;
      
      monitor.startTimer(operationId);
      
      try {
        const result = await originalMethod.apply(this, args);
        monitor.endTimer(operationId, {
          function: operationName,
          success: true,
          argsCount: args.length
        });
        return result;
      } catch (error) {
        monitor.endTimer(operationId, {
          function: operationName,
          success: false,
          error: error.message,
          argsCount: args.length
        });
        throw error;
      }
    };
    
    return descriptor;
  };
};

// High-level performance monitoring wrapper
const withPerformanceMonitoring = (monitor, operationName, fn) => {
  return async (...args) => {
    const operationId = `${operationName}:${Date.now()}`;
    
    monitor.startTimer(operationId);
    
    try {
      const result = await fn(...args);
      monitor.endTimer(operationId, {
        operation: operationName,
        success: true
      });
      return result;
    } catch (error) {
      monitor.endTimer(operationId, {
        operation: operationName,
        success: false,
        error: error.message
      });
      throw error;
    }
  };
};

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  PerformanceMonitor,
  performanceMonitor,
  performanceMiddleware,
  monitorFunction,
  withPerformanceMonitoring
};