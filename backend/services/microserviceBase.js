const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

/**
 * Base class for microservices
 * Provides common functionality and patterns for service implementation
 */
class MicroserviceBase {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'unknown-service';
    this.version = options.version || '1.0.0';
    this.port = options.port || 3000;
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    
    // Service configuration
    this.config = {
      healthCheck: options.healthCheck !== false,
      metrics: options.metrics !== false,
      cors: options.cors !== false,
      compression: options.compression !== false,
      security: options.security !== false,
      rateLimit: options.rateLimit || null,
      timeout: options.timeout || 30000,
      ...options.config
    };

    // Service registry configuration
    this.registry = {
      enabled: options.registry?.enabled || false,
      url: options.registry?.url || process.env.SERVICE_REGISTRY_URL,
      heartbeatInterval: options.registry?.heartbeatInterval || 30000,
      retryAttempts: options.registry?.retryAttempts || 3
    };

    // Circuit breaker configuration
    this.circuitBreaker = {
      enabled: options.circuitBreaker?.enabled || false,
      failureThreshold: options.circuitBreaker?.failureThreshold || 5,
      resetTimeout: options.circuitBreaker?.resetTimeout || 60000,
      monitoringPeriod: options.circuitBreaker?.monitoringPeriod || 10000
    };

    this.app = express();
    this.server = null;
    this.isReady = false;
    this.dependencies = new Map();
    this.metrics = this.initializeMetrics();
    this.circuitBreakerState = new Map();

    this.setupMiddleware();
    this.setupRoutes();
  }

  initializeMetrics() {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0
      },
      dependencies: {},
      circuitBreakers: {},
      health: {
        status: 'starting',
        uptime: 0,
        timestamp: Date.now()
      },
      custom: {}
    };
  }

  setupMiddleware() {
    // Request ID middleware
    this.app.use((req, res, next) => {
      req.id = req.headers['x-request-id'] || uuidv4();
      res.set('X-Request-ID', req.id);
      next();
    });

    // Security middleware
    if (this.config.security) {
      this.app.use(helmet({
        contentSecurityPolicy: false // Disable for API services
      }));
    }

    // CORS middleware
    if (this.config.cors) {
      this.app.use(cors({
        origin: this.environment === 'production' ? false : true,
        credentials: true
      }));
    }

    // Compression middleware
    if (this.config.compression) {
      this.app.use(compression());
    }

    // Rate limiting
    if (this.config.rateLimit) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimit.windowMs || 15 * 60 * 1000, // 15 minutes
        max: this.config.rateLimit.max || 100,
        message: 'Too many requests from this IP'
      });
      this.app.use(limiter);
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging and metrics
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.updateRequestMetrics(req, res, duration);
      });

      next();
    });

    // Timeout middleware
    this.app.use((req, res, next) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          res.status(408).json({
            error: 'Request timeout',
            message: 'Request took too long to process'
          });
        }
      }, this.config.timeout);

      res.on('finish', () => clearTimeout(timeout));
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    if (this.config.healthCheck) {
      this.app.get('/health', (req, res) => {
        res.json(this.getHealthStatus());
      });

      this.app.get('/health/ready', (req, res) => {
        const status = this.getReadinessStatus();
        res.status(status.ready ? 200 : 503).json(status);
      });

      this.app.get('/health/live', (req, res) => {
        res.json({
          status: 'alive',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        });
      });
    }

    // Metrics endpoint
    if (this.config.metrics) {
      this.app.get('/metrics', (req, res) => {
        res.json(this.getMetrics());
      });
    }

    // Service info endpoint
    this.app.get('/info', (req, res) => {
      res.json({
        service: this.serviceName,
        version: this.version,
        environment: this.environment,
        timestamp: new Date().toISOString(),
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch
        }
      });
    });
  }

  updateRequestMetrics(req, res, duration) {
    this.metrics.requests.total++;
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update average response time
    const total = this.metrics.requests.total;
    this.metrics.requests.avgResponseTime = (
      (this.metrics.requests.avgResponseTime * (total - 1) + duration) / total
    );
  }

  // Dependency management
  addDependency(name, healthCheckFunction, options = {}) {
    this.dependencies.set(name, {
      name,
      healthCheck: healthCheckFunction,
      required: options.required !== false,
      timeout: options.timeout || 5000,
      retryAttempts: options.retryAttempts || 3,
      lastCheck: null,
      status: 'unknown',
      error: null
    });

    this.metrics.dependencies[name] = {
      calls: 0,
      failures: 0,
      avgResponseTime: 0,
      lastError: null
    };
  }

  async checkDependencies() {
    const results = {};
    
    for (const [name, dependency] of this.dependencies) {
      try {
        const startTime = Date.now();
        await dependency.healthCheck();
        const duration = Date.now() - startTime;
        
        dependency.status = 'healthy';
        dependency.lastCheck = Date.now();
        dependency.error = null;
        
        this.metrics.dependencies[name].calls++;
        this.updateDependencyMetrics(name, duration);
        
        results[name] = { status: 'healthy', responseTime: duration };
        
      } catch (error) {
        dependency.status = 'unhealthy';
        dependency.lastCheck = Date.now();
        dependency.error = error.message;
        
        this.metrics.dependencies[name].failures++;
        this.metrics.dependencies[name].lastError = error.message;
        
        results[name] = { status: 'unhealthy', error: error.message };
        
        if (dependency.required) {
          logger.error('Required dependency unhealthy', {
            service: this.serviceName,
            dependency: name,
            error: error.message
          });
        }
      }
    }
    
    return results;
  }

  updateDependencyMetrics(name, duration) {
    const metrics = this.metrics.dependencies[name];
    if (metrics.calls === 1) {
      metrics.avgResponseTime = duration;
    } else {
      metrics.avgResponseTime = (
        (metrics.avgResponseTime * (metrics.calls - 1) + duration) / metrics.calls
      );
    }
  }

  // Circuit breaker implementation
  async callWithCircuitBreaker(name, operation, fallback = null) {
    if (!this.circuitBreaker.enabled) {
      return await operation();
    }

    const breaker = this.getOrCreateCircuitBreaker(name);
    
    if (breaker.state === 'open') {
      if (Date.now() - breaker.lastFailureTime < this.circuitBreaker.resetTimeout) {
        if (fallback) {
          return await fallback();
        }
        throw new AppError('Service temporarily unavailable', 503, 'CIRCUIT_BREAKER_OPEN');
      } else {
        breaker.state = 'half-open';
      }
    }

    try {
      const result = await operation();
      
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failureCount = 0;
      }
      
      breaker.successCount++;
      this.metrics.circuitBreakers[name] = { ...breaker };
      
      return result;
      
    } catch (error) {
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();
      
      if (breaker.failureCount >= this.circuitBreaker.failureThreshold) {
        breaker.state = 'open';
        logger.warn('Circuit breaker opened', {
          service: this.serviceName,
          operation: name,
          failures: breaker.failureCount
        });
      }
      
      this.metrics.circuitBreakers[name] = { ...breaker };
      
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }

  getOrCreateCircuitBreaker(name) {
    if (!this.circuitBreakerState.has(name)) {
      this.circuitBreakerState.set(name, {
        state: 'closed', // closed, open, half-open
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0
      });
    }
    return this.circuitBreakerState.get(name);
  }

  getHealthStatus() {
    const dependencyStatuses = {};
    let allDependenciesHealthy = true;
    
    for (const [name, dependency] of this.dependencies) {
      dependencyStatuses[name] = {
        status: dependency.status,
        required: dependency.required,
        lastCheck: dependency.lastCheck,
        error: dependency.error
      };
      
      if (dependency.required && dependency.status !== 'healthy') {
        allDependenciesHealthy = false;
      }
    }
    
    const status = this.isReady && allDependenciesHealthy ? 'healthy' : 'unhealthy';
    
    return {
      status,
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: dependencyStatuses,
      checks: {
        database: 'N/A', // Override in subclass
        cache: 'N/A',    // Override in subclass
        external: 'N/A'  // Override in subclass
      }
    };
  }

  getReadinessStatus() {
    const health = this.getHealthStatus();
    const ready = health.status === 'healthy' && this.isReady;
    
    return {
      ready,
      status: ready ? 'ready' : 'not ready',
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      checks: health.dependencies
    };
  }

  getMetrics() {
    return {
      service: {
        name: this.serviceName,
        version: this.version,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      requests: this.metrics.requests,
      dependencies: this.metrics.dependencies,
      circuitBreakers: this.metrics.circuitBreakers,
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        eventLoop: this.getEventLoopLag()
      },
      custom: this.metrics.custom
    };
  }

  getEventLoopLag() {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
      this.metrics.custom.eventLoopLag = lag;
    });
    return this.metrics.custom.eventLoopLag || 0;
  }

  // Service registry integration
  async registerService() {
    if (!this.registry.enabled || !this.registry.url) {
      return;
    }

    const registration = {
      name: this.serviceName,
      version: this.version,
      host: process.env.SERVICE_HOST || 'localhost',
      port: this.port,
      health: `http://${process.env.SERVICE_HOST || 'localhost'}:${this.port}/health`,
      tags: [this.environment, this.version],
      timestamp: new Date().toISOString()
    };

    try {
      // Implementation depends on service registry type (Consul, Eureka, etc.)
      logger.info('Service registered', registration);
    } catch (error) {
      logger.error('Service registration failed', error);
    }
  }

  async deregisterService() {
    if (!this.registry.enabled || !this.registry.url) {
      return;
    }

    try {
      // Implementation depends on service registry type
      logger.info('Service deregistered', { service: this.serviceName });
    } catch (error) {
      logger.error('Service deregistration failed', error);
    }
  }

  async start() {
    try {
      // Check dependencies before starting
      await this.checkDependencies();
      
      // Start server
      this.server = this.app.listen(this.port, () => {
        this.isReady = true;
        logger.info('Microservice started', {
          service: this.serviceName,
          version: this.version,
          port: this.port,
          environment: this.environment
        });
      });

      // Register with service registry
      await this.registerService();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start periodic health checks
      this.startPeriodicHealthChecks();

    } catch (error) {
      logger.error('Failed to start microservice', {
        service: this.serviceName,
        error: error.message
      });
      throw error;
    }
  }

  startPeriodicHealthChecks() {
    if (this.dependencies.size > 0) {
      setInterval(async () => {
        await this.checkDependencies();
      }, 30000); // Check every 30 seconds
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info('Received shutdown signal', {
        service: this.serviceName,
        signal
      });

      this.isReady = false;

      try {
        // Deregister from service registry
        await this.deregisterService();

        // Close server
        if (this.server) {
          this.server.close(() => {
            logger.info('Server closed gracefully', {
              service: this.serviceName
            });
            process.exit(0);
          });
        }

        // Force exit after timeout
        setTimeout(() => {
          logger.error('Force exit - graceful shutdown timeout');
          process.exit(1);
        }, 10000);

      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown); // Nodemon restart
  }

  // Override in subclasses for custom initialization
  async initialize() {
    // Custom initialization logic
  }

  // Override in subclasses for custom health checks
  async customHealthCheck() {
    return { status: 'healthy' };
  }

  // Add custom metrics
  addCustomMetric(name, value) {
    this.metrics.custom[name] = value;
  }

  incrementCustomMetric(name, increment = 1) {
    if (!this.metrics.custom[name]) {
      this.metrics.custom[name] = 0;
    }
    this.metrics.custom[name] += increment;
  }
}

module.exports = MicroserviceBase;