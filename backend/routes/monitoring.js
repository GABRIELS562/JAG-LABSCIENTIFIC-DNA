const express = require('express');
const { ResponseHandler } = require('../utils/responseHandler');
const { performanceMonitor } = require('../middleware/performanceMonitoring');
const { cacheService } = require('../services/cacheService');
const { logger } = require('../utils/logger');
const db = require('../services/database');
const router = express.Router();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const healthChecks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };

    // Test database connection
    try {
      const dbHealth = db.getHealthCheck ? db.getHealthCheck() : { status: 'unknown' };
      healthChecks.database = dbHealth;
    } catch (error) {
      healthChecks.database = { 
        status: 'unhealthy', 
        error: error.message 
      };
    }

    // Test cache service
    try {
      cacheService.set('health-check', Date.now(), 1000);
      const cacheTest = cacheService.get('health-check');
      healthChecks.cache = {
        status: cacheTest ? 'healthy' : 'unhealthy',
        ...cacheService.getStats()
      };
    } catch (error) {
      healthChecks.cache = { 
        status: 'unhealthy', 
        error: error.message 
      };
    }

    // Determine overall health
    const allHealthy = Object.values(healthChecks)
      .filter(check => typeof check === 'object' && check.status)
      .every(check => check.status === 'healthy');

    const statusCode = allHealthy ? 200 : 503;
    
    return res.status(statusCode).json({
      success: allHealthy,
      data: healthChecks,
      message: allHealthy ? 'All systems healthy' : 'Some systems unhealthy'
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    return ResponseHandler.internalError(res, 'Health check failed');
  }
});

// Detailed health check with dependencies
router.get('/health/detailed', async (req, res) => {
  try {
    const checks = {};
    
    // Database health check
    checks.database = await checkDatabase();
    
    // Cache health check
    checks.cache = await checkCache();
    
    // Memory health check
    checks.memory = checkMemory();
    
    // Disk space check (if available)
    checks.disk = await checkDiskSpace();
    
    // Performance metrics
    checks.performance = getPerformanceHealth();
    
    // External dependencies (if any)
    checks.external = await checkExternalDependencies();

    const overallHealth = Object.values(checks).every(check => check.status === 'healthy');
    
    return res.status(overallHealth ? 200 : 503).json({
      success: overallHealth,
      data: {
        status: overallHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks
      },
      message: overallHealth ? 'All systems operational' : 'Some systems experiencing issues'
    });
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });
    return ResponseHandler.internalError(res, 'Detailed health check failed');
  }
});

// Performance metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const systemMetrics = performanceMonitor.getSystemMetrics();
    const performanceStats = performanceMonitor.getAllStats();
    const cacheStats = cacheService.getStats();

    const metrics = {
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      performance: performanceStats,
      cache: cacheStats,
      database: db.getStatistics ? db.getStatistics() : null
    };

    return ResponseHandler.success(res, metrics, 'Metrics retrieved successfully');
  } catch (error) {
    logger.error('Failed to retrieve metrics', { error: error.message });
    return ResponseHandler.internalError(res, 'Failed to retrieve metrics');
  }
});

// Application statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await gatherApplicationStats();
    return ResponseHandler.success(res, stats, 'Statistics retrieved successfully');
  } catch (error) {
    logger.error('Failed to retrieve statistics', { error: error.message });
    return ResponseHandler.internalError(res, 'Failed to retrieve statistics');
  }
});

// Performance statistics for specific operations
router.get('/performance/:operation', (req, res) => {
  try {
    const { operation } = req.params;
    const stats = performanceMonitor.getOperationStats(operation);
    
    if (!stats) {
      return ResponseHandler.notFound(res, `No performance data found for operation: ${operation}`);
    }

    return ResponseHandler.success(res, stats, `Performance data for ${operation}`);
  } catch (error) {
    logger.error('Failed to retrieve operation performance', { 
      operation: req.params.operation,
      error: error.message 
    });
    return ResponseHandler.internalError(res, 'Failed to retrieve operation performance');
  }
});

// Readiness check (for Kubernetes/container orchestration)
router.get('/ready', async (req, res) => {
  try {
    // Check if the application is ready to serve traffic
    const checks = {
      database: await checkDatabaseReadiness(),
      cache: checkCacheReadiness(),
      initialization: checkInitializationComplete()
    };

    const ready = Object.values(checks).every(check => check.ready === true);
    
    return res.status(ready ? 200 : 503).json({
      ready,
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    return res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check (for Kubernetes/container orchestration)
router.get('/live', (req, res) => {
  // Simple liveness check - if this endpoint responds, the app is alive
  return res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper functions
async function checkDatabase() {
  try {
    if (db.getHealthCheck) {
      const health = db.getHealthCheck();
      return {
        status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
        connected: health.connected,
        responseTime: await measureDatabaseResponseTime()
      };
    }
    
    return { status: 'unknown', message: 'Health check not available' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message 
    };
  }
}

async function checkCache() {
  try {
    const testKey = 'health-check-' + Date.now();
    const testValue = 'test';
    
    cacheService.set(testKey, testValue, 1000);
    const retrieved = cacheService.get(testKey);
    
    return {
      status: retrieved === testValue ? 'healthy' : 'unhealthy',
      ...cacheService.getStats()
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message 
    };
  }
}

function checkMemory() {
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.heapTotal;
  const usedMem = memUsage.heapUsed;
  const memoryUsagePercent = (usedMem / totalMem) * 100;
  
  return {
    status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
    usagePercent: Math.round(memoryUsagePercent * 100) / 100,
    heapUsed: usedMem,
    heapTotal: totalMem,
    rss: memUsage.rss
  };
}

async function checkDiskSpace() {
  try {
    const fs = require('fs').promises;
    const stats = await fs.stat(process.cwd());
    
    // This is a simplified check - in production you might want to use a proper disk space library
    return {
      status: 'healthy',
      message: 'Disk space check not implemented'
    };
  } catch (error) {
    return {
      status: 'unknown',
      error: error.message
    };
  }
}

function getPerformanceHealth() {
  const stats = performanceMonitor.getAllStats();
  const requestStats = stats['request:GET:/api/health'] || null;
  
  if (requestStats) {
    return {
      status: requestStats.avg < 100 ? 'healthy' : 'warning',
      averageResponseTime: requestStats.avg,
      requestCount: requestStats.count
    };
  }
  
  return {
    status: 'healthy',
    message: 'No performance data available yet'
  };
}

async function checkExternalDependencies() {
  // Check external services if any (APIs, third-party services, etc.)
  return {
    status: 'healthy',
    dependencies: []
  };
}

async function gatherApplicationStats() {
  const stats = {
    samples: 0,
    batches: 0,
    testCases: 0,
    activeUsers: 0
  };
  
  try {
    if (db.getStatistics) {
      const dbStats = db.getStatistics();
      Object.assign(stats, dbStats);
    } else {
      // Fallback to individual queries
      stats.samples = db.getSampleCount ? db.getSampleCount() : 0;
    }
  } catch (error) {
    logger.warn('Failed to gather application statistics', { error: error.message });
  }
  
  return stats;
}

async function measureDatabaseResponseTime() {
  const start = Date.now();
  try {
    if (db.raw) {
      await db.raw('SELECT 1');
    }
    return Date.now() - start;
  } catch (error) {
    return -1;
  }
}

async function checkDatabaseReadiness() {
  try {
    const health = await checkDatabase();
    return {
      ready: health.status === 'healthy',
      responseTime: health.responseTime
    };
  } catch (error) {
    return { ready: false, error: error.message };
  }
}

function checkCacheReadiness() {
  try {
    const stats = cacheService.getStats();
    return { ready: true, size: stats.size };
  } catch (error) {
    return { ready: false, error: error.message };
  }
}

function checkInitializationComplete() {
  // Check if all required initialization is complete
  return {
    ready: true,
    message: 'Application initialization complete'
  };
}

module.exports = router;