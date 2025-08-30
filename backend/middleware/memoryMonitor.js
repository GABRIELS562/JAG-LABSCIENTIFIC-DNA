const { logger } = require('../utils/logger');
const { memoryManager } = require('../utils/memoryManager');

/**
 * Memory Monitoring Middleware
 * Monitors memory usage per request and implements circuit breaker pattern
 */
class MemoryMonitor {
  constructor() {
    this.requestMemoryCache = new Map();
    this.highMemoryCount = 0;
    this.circuitBreakerTripped = false;
    this.lastMemoryAlert = 0;
    this.alertCooldown = 60000; // 1 minute between alerts
    
    // Memory thresholds - adjusted for Node.js heap behavior
    this.thresholds = {
      warning: 0.85,    // 85% - normal for Node.js
      critical: 0.92,   // 92% - getting high
      emergency: 0.98   // 98% - very high
    };
    
    // Track memory trends
    this.memoryHistory = [];
    this.maxHistorySize = 100;
    
    this.startMemoryMonitoring();
  }

  /**
   * Middleware function to monitor memory per request
   */
  middleware() {
    return (req, res, next) => {
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startMemory = process.memoryUsage();
      const startTime = Date.now();
      
      // Check if circuit breaker is tripped
      if (this.circuitBreakerTripped) {
        logger.warn('Circuit breaker tripped - rejecting request', { requestId });
        return res.status(503).json({ 
          error: 'Service temporarily unavailable due to high memory usage',
          retryAfter: 30
        });
      }
      
      // Store initial memory state
      this.requestMemoryCache.set(requestId, {
        startMemory,
        startTime,
        url: req.url,
        method: req.method
      });
      
      // Monitor response completion
      res.on('finish', () => {
        this.trackRequestCompletion(requestId);
      });
      
      // Clean up on close
      res.on('close', () => {
        this.requestMemoryCache.delete(requestId);
      });
      
      next();
    };
  }

  /**
   * Track request completion and memory usage
   */
  trackRequestCompletion(requestId) {
    const requestData = this.requestMemoryCache.get(requestId);
    if (!requestData) return;
    
    const endMemory = process.memoryUsage();
    const endTime = Date.now();
    
    const memoryDelta = endMemory.heapUsed - requestData.startMemory.heapUsed;
    const duration = endTime - requestData.startTime;
    
    // Log memory-intensive requests
    if (memoryDelta > 10 * 1024 * 1024) { // > 10MB
      logger.warn('Memory-intensive request detected', {
        requestId,
        url: requestData.url,
        method: requestData.method,
        memoryDelta: Math.round(memoryDelta / 1024 / 1024) + 'MB',
        duration: duration + 'ms',
        currentHeapUsed: Math.round(endMemory.heapUsed / 1024 / 1024) + 'MB'
      });
    }
    
    // Clean up
    this.requestMemoryCache.delete(requestId);
  }

  /**
   * Start continuous memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      this.checkMemoryStatus();
    }, 10000); // Check every 10 seconds
    
    logger.info('Memory monitoring started');
  }

  /**
   * Check current memory status and take action if needed
   */
  checkMemoryStatus() {
    const usage = memoryManager.getMemoryUsage();
    const utilizationPercent = usage.heapUtilization;
    
    // Store history for trend analysis
    this.memoryHistory.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      utilization: utilizationPercent
    });
    
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
    
    // Check thresholds and take action
    if (utilizationPercent >= this.thresholds.emergency) {
      this.handleEmergencyMemory(usage);
    } else if (utilizationPercent >= this.thresholds.critical) {
      this.handleCriticalMemory(usage);
    } else if (utilizationPercent >= this.thresholds.warning) {
      this.handleWarningMemory(usage);
    } else if (utilizationPercent < this.thresholds.warning && this.circuitBreakerTripped) {
      this.resetCircuitBreaker();
    }
  }

  /**
   * Handle warning level memory usage
   */
  handleWarningMemory(usage) {
    if (this.shouldSendAlert()) {
      logger.warn('Memory usage at warning level', {
        heapUsed: usage.heapUsed + 'MB',
        heapTotal: usage.heapTotal + 'MB',
        utilization: usage.heapUtilization * 100 + '%',
        threshold: this.thresholds.warning * 100 + '%'
      });
      
      // Gentle cleanup
      memoryManager.clearOldCacheEntries();
    }
  }

  /**
   * Handle critical level memory usage
   */
  handleCriticalMemory(usage) {
    this.highMemoryCount++;
    
    if (this.shouldSendAlert()) {
      logger.error('Critical memory usage detected', {
        heapUsed: usage.heapUsed + 'MB',
        heapTotal: usage.heapTotal + 'MB',
        utilization: usage.heapUtilization * 100 + '%',
        threshold: this.thresholds.critical * 100 + '%',
        consecutiveHighMemory: this.highMemoryCount
      });
      
      // Aggressive cleanup
      memoryManager.clearCache();
      memoryManager.forceGarbageCollection();
      
      // Trip circuit breaker if sustained high memory
      if (this.highMemoryCount >= 3) {
        this.tripCircuitBreaker('Critical memory usage sustained');
      }
    }
  }

  /**
   * Handle emergency level memory usage
   */
  handleEmergencyMemory(usage) {
    logger.error('Emergency memory usage - immediate action required', {
      heapUsed: usage.heapUsed + 'MB',
      heapTotal: usage.heapTotal + 'MB',
      utilization: usage.heapUtilization * 100 + '%',
      threshold: this.thresholds.emergency * 100 + '%'
    });
    
    // Emergency cleanup
    memoryManager.clearCache();
    memoryManager.forceGarbageCollection();
    this.clearLargeObjects();
    
    // Trip circuit breaker immediately
    this.tripCircuitBreaker('Emergency memory usage');
  }

  /**
   * Trip the circuit breaker
   */
  tripCircuitBreaker(reason) {
    if (this.circuitBreakerTripped) return;
    
    this.circuitBreakerTripped = true;
    
    logger.error('Circuit breaker TRIPPED', {
      reason,
      activeRequests: this.requestMemoryCache.size,
      memoryUsage: memoryManager.getMemoryUsage()
    });
    
    // Auto-reset after 30 seconds
    setTimeout(() => {
      const currentUsage = memoryManager.getMemoryUsage();
      if (currentUsage.heapUtilization < this.thresholds.critical) {
        this.resetCircuitBreaker();
      } else {
        logger.warn('Circuit breaker auto-reset delayed - memory still high');
        // Try again in 30 seconds
        setTimeout(() => this.resetCircuitBreaker(), 30000);
      }
    }, 30000);
  }

  /**
   * Reset the circuit breaker
   */
  resetCircuitBreaker() {
    if (!this.circuitBreakerTripped) return;
    
    this.circuitBreakerTripped = false;
    this.highMemoryCount = 0;
    
    logger.info('Circuit breaker RESET', {
      memoryUsage: memoryManager.getMemoryUsage()
    });
  }

  /**
   * Clear large objects from memory
   */
  clearLargeObjects() {
    // Clear request cache
    this.requestMemoryCache.clear();
    
    // Truncate memory history
    this.memoryHistory = this.memoryHistory.slice(-10);
    
    logger.info('Large objects cleared from memory monitor');
  }

  /**
   * Check if we should send an alert (rate limiting)
   */
  shouldSendAlert() {
    const now = Date.now();
    if (now - this.lastMemoryAlert > this.alertCooldown) {
      this.lastMemoryAlert = now;
      return true;
    }
    return false;
  }

  /**
   * Get memory trend analysis
   */
  getMemoryTrends() {
    if (this.memoryHistory.length < 2) return null;
    
    const recent = this.memoryHistory.slice(-10);
    const avgUtilization = recent.reduce((sum, entry) => sum + entry.utilization, 0) / recent.length;
    const trend = recent.length > 1 
      ? recent[recent.length - 1].utilization - recent[0].utilization
      : 0;
    
    return {
      averageUtilization: Math.round(avgUtilization * 100) / 100,
      trend: Math.round(trend * 1000) / 1000,
      trendDirection: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
      dataPoints: recent.length
    };
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      circuitBreakerTripped: this.circuitBreakerTripped,
      highMemoryCount: this.highMemoryCount,
      activeRequests: this.requestMemoryCache.size,
      memoryUsage: memoryManager.getMemoryUsage(),
      trends: this.getMemoryTrends(),
      thresholds: this.thresholds
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.requestMemoryCache.clear();
    this.memoryHistory = [];
    logger.info('Memory monitor cleaned up');
  }
}

// Create singleton instance
const memoryMonitor = new MemoryMonitor();

module.exports = {
  memoryMonitor,
  MemoryMonitor
};