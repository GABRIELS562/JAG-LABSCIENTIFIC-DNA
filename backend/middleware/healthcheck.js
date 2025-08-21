const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');
const { ResponseHandler } = require('../utils/responseHandler');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.dbPath = path.join(__dirname, '../database/ashley_lims.db');
    this.startupTime = Date.now();
    this.lastHealthCheck = null;
    this.healthStatus = 'unknown';
    
    this.initializeChecks();
  }

  initializeChecks() {
    // Database connectivity check
    this.registerCheck('database', this.checkDatabase.bind(this));
    
    // File system check
    this.registerCheck('filesystem', this.checkFileSystem.bind(this));
    
    // Memory usage check
    this.registerCheck('memory', this.checkMemory.bind(this));
    
    // Disk space check
    this.registerCheck('disk', this.checkDiskSpace.bind(this));
    
    // Process health check
    this.registerCheck('process', this.checkProcess.bind(this));
  }

  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  async checkDatabase() {
    try {
      const db = new Database(this.dbPath, { readonly: true, fileMustExist: false });
      
      // Test basic connectivity
      const result = db.prepare('SELECT 1 as test').get();
      
      // Test a simple query on actual tables
      const sampleCount = db.prepare('SELECT COUNT(*) as count FROM samples').get();
      
      db.close();
      
      return {
        status: 'healthy',
        message: 'Database connection successful',
        details: {
          connected: true,
          sampleCount: sampleCount.count,
          responseTime: Date.now() - Date.now() // Will be calculated properly in actual implementation
        }
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: error.message
      };
    }
  }

  async checkFileSystem() {
    try {
      const logsDir = path.join(__dirname, '../logs');
      const dbDir = path.join(__dirname, '../database');
      
      // Check if critical directories exist and are writable
      const checks = [
        { path: logsDir, name: 'logs' },
        { path: dbDir, name: 'database' }
      ];
      
      const results = {};
      
      for (const check of checks) {
        try {
          await fs.promises.access(check.path, fs.constants.W_OK);
          results[check.name] = { accessible: true, writable: true };
        } catch (error) {
          results[check.name] = { accessible: false, writable: false, error: error.message };
        }
      }
      
      const allHealthy = Object.values(results).every(r => r.accessible && r.writable);
      
      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        message: allHealthy ? 'File system access normal' : 'File system access issues detected',
        details: results
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'File system check failed',
        error: error.message
      };
    }
  }

  async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const totalMemGB = memUsage.heapTotal / (1024 * 1024 * 1024);
      const usedMemGB = memUsage.heapUsed / (1024 * 1024 * 1024);
      const memoryUtilization = (usedMemGB / totalMemGB) * 100;
      
      const status = memoryUtilization > 90 ? 'unhealthy' : memoryUtilization > 70 ? 'warning' : 'healthy';
      
      return {
        status,
        message: `Memory utilization: ${memoryUtilization.toFixed(2)}%`,
        details: {
          heapUsed: `${usedMemGB.toFixed(2)}GB`,
          heapTotal: `${totalMemGB.toFixed(2)}GB`,
          utilization: `${memoryUtilization.toFixed(2)}%`,
          rss: `${(memUsage.rss / (1024 * 1024 * 1024)).toFixed(2)}GB`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Memory check failed',
        error: error.message
      };
    }
  }

  async checkDiskSpace() {
    try {
      const stats = await fs.promises.statfs(process.cwd());
      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bavail * stats.bsize;
      const usedSpace = totalSpace - freeSpace;
      const utilizationPercent = (usedSpace / totalSpace) * 100;
      
      const status = utilizationPercent > 95 ? 'unhealthy' : utilizationPercent > 80 ? 'warning' : 'healthy';
      
      return {
        status,
        message: `Disk utilization: ${utilizationPercent.toFixed(2)}%`,
        details: {
          total: `${(totalSpace / (1024 * 1024 * 1024)).toFixed(2)}GB`,
          used: `${(usedSpace / (1024 * 1024 * 1024)).toFixed(2)}GB`,
          free: `${(freeSpace / (1024 * 1024 * 1024)).toFixed(2)}GB`,
          utilization: `${utilizationPercent.toFixed(2)}%`
        }
      };
    } catch (error) {
      // Fallback for systems where statfs is not available
      return {
        status: 'healthy',
        message: 'Disk space check not available on this system',
        details: { available: false }
      };
    }
  }

  async checkProcess() {
    try {
      const uptime = process.uptime();
      const cpuUsage = process.cpuUsage();
      
      return {
        status: 'healthy',
        message: `Process running for ${Math.floor(uptime)} seconds`,
        details: {
          uptime: `${Math.floor(uptime)}s`,
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuUsage: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Process check failed',
        error: error.message
      };
    }
  }

  async performHealthCheck() {
    const startTime = Date.now();
    const results = {};
    let overallStatus = 'healthy';
    
    // Run all health checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const result = await checkFn();
        results[name] = result;
        
        // Update overall status based on individual check results
        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'warning' && overallStatus !== 'unhealthy') {
          overallStatus = 'warning';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          message: 'Health check failed',
          error: error.message
        };
        overallStatus = 'unhealthy';
      }
    });
    
    await Promise.all(checkPromises);
    
    const duration = Date.now() - startTime;
    this.lastHealthCheck = Date.now();
    this.healthStatus = overallStatus;
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      duration: `${duration}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: results
    };
  }

  // Kubernetes liveness probe - simple check
  async livenessProbe() {
    try {
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid
      };
    } catch (error) {
      throw new Error('Liveness probe failed');
    }
  }

  // Kubernetes readiness probe - comprehensive check
  async readinessProbe() {
    try {
      // Check critical dependencies
      const dbCheck = await this.checkDatabase();
      const memCheck = await this.checkMemory();
      
      const isReady = dbCheck.status !== 'unhealthy' && memCheck.status !== 'unhealthy';
      
      return {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbCheck.status,
          memory: memCheck.status
        }
      };
    } catch (error) {
      throw new Error('Readiness probe failed');
    }
  }

  // Express middleware for health checks
  healthMiddleware() {
    return async (req, res, next) => {
      try {
        const health = await this.performHealthCheck();
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'warning' ? 200 : 503;
        
        ResponseHandler.success(res, health, 'Health check completed', statusCode);
      } catch (error) {
        logger.error('Health check middleware error', { error: error.message });
        ResponseHandler.error(res, 'Health check failed', error, 503);
      }
    };
  }

  livenessMiddleware() {
    return async (req, res, next) => {
      try {
        const liveness = await this.livenessProbe();
        ResponseHandler.success(res, liveness, 'Liveness check passed');
      } catch (error) {
        logger.error('Liveness check failed', { error: error.message });
        ResponseHandler.error(res, 'Liveness check failed', error, 503);
      }
    };
  }

  readinessMiddleware() {
    return async (req, res, next) => {
      try {
        const readiness = await this.readinessProbe();
        const statusCode = readiness.status === 'ready' ? 200 : 503;
        
        ResponseHandler.success(res, readiness, 'Readiness check completed', statusCode);
      } catch (error) {
        logger.error('Readiness check failed', { error: error.message });
        ResponseHandler.error(res, 'Readiness check failed', error, 503);
      }
    };
  }
}

// Create singleton instance
const healthCheckService = new HealthCheckService();

module.exports = {
  healthCheckService,
  HealthCheckService
};
