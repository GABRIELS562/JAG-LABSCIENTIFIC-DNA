const cluster = require('cluster');
const os = require('os');
const http = require('http');
const httpProxy = require('http-proxy-middleware');
const express = require('express');
const logger = require('../utils/logger');

/**
 * Load Balancer for horizontal scaling
 * Distributes requests across multiple worker processes
 */
class LoadBalancer {
  constructor(options = {}) {
    this.port = options.port || 3001;
    this.workerPort = options.workerPort || 3002;
    this.numWorkers = options.numWorkers || os.cpus().length;
    this.strategy = options.strategy || 'round-robin'; // round-robin, least-connections, ip-hash
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.maxRetries = options.maxRetries || 3;
    
    this.workers = new Map();
    this.currentWorkerIndex = 0;
    this.isShuttingDown = false;
    
    this.metrics = {
      totalRequests: 0,
      totalConnections: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      workerStats: new Map()
    };
  }

  async start() {
    if (cluster.isMaster) {
      await this.startMaster();
    } else {
      await this.startWorker();
    }
  }

  async startMaster() {
    logger.info('Starting load balancer master process', {
      workers: this.numWorkers,
      port: this.port,
      strategy: this.strategy
    });

    // Fork workers
    for (let i = 0; i < this.numWorkers; i++) {
      this.forkWorker(i);
    }

    // Create proxy server
    await this.createProxyServer();

    // Start health checks
    this.startHealthChecks();

    // Handle graceful shutdown
    this.setupGracefulShutdown();

    logger.info('Load balancer started successfully', {
      pid: process.pid,
      workers: this.workers.size
    });
  }

  forkWorker(workerId) {
    const worker = cluster.fork({
      WORKER_ID: workerId,
      WORKER_PORT: this.workerPort + workerId
    });

    const workerInfo = {
      id: workerId,
      pid: worker.process.pid,
      port: this.workerPort + workerId,
      status: 'starting',
      connections: 0,
      totalRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      lastHealthCheck: Date.now(),
      restarts: 0
    };

    this.workers.set(worker.id, workerInfo);
    this.metrics.workerStats.set(worker.id, workerInfo);

    worker.on('message', (message) => {
      this.handleWorkerMessage(worker.id, message);
    });

    worker.on('exit', (code, signal) => {
      this.handleWorkerExit(worker.id, code, signal);
    });

    worker.on('error', (error) => {
      logger.error('Worker error', {
        workerId: worker.id,
        error: error.message
      });
    });

    // Send initial configuration
    worker.send({
      type: 'config',
      config: {
        port: workerInfo.port,
        workerId: workerId
      }
    });

    return worker;
  }

  async createProxyServer() {
    const app = express();

    // Health check endpoint for load balancer itself
    app.get('/health', (req, res) => {
      const healthyWorkers = Array.from(this.workers.values())
        .filter(worker => worker.status === 'healthy').length;

      res.json({
        status: healthyWorkers > 0 ? 'healthy' : 'unhealthy',
        workers: {
          total: this.workers.size,
          healthy: healthyWorkers,
          unhealthy: this.workers.size - healthyWorkers
        },
        metrics: this.getMetrics(),
        uptime: process.uptime()
      });
    });

    // Metrics endpoint
    app.get('/metrics', (req, res) => {
      res.json(this.getDetailedMetrics());
    });

    // Proxy middleware
    const proxy = httpProxy.createProxyMiddleware({
      target: `http://localhost:${this.workerPort}`,
      changeOrigin: true,
      router: (req) => {
        const worker = this.selectWorker(req);
        return worker ? `http://localhost:${worker.port}` : null;
      },
      onError: (err, req, res) => {
        this.metrics.failedRequests++;
        logger.error('Proxy error', {
          error: err.message,
          url: req.url,
          method: req.method
        });

        if (!res.headersSent) {
          res.status(503).json({
            error: 'Service temporarily unavailable',
            message: 'All workers are unavailable'
          });
        }
      },
      onProxyReq: (proxyReq, req, res) => {
        const startTime = Date.now();
        req.startTime = startTime;
        this.metrics.totalRequests++;
        this.metrics.totalConnections++;
      },
      onProxyRes: (proxyRes, req, res) => {
        const duration = Date.now() - req.startTime;
        this.updateAvgResponseTime(duration);
        this.metrics.totalConnections--;

        // Update worker stats
        const workerPort = proxyRes.req.host.split(':')[1];
        const worker = Array.from(this.workers.values())
          .find(w => w.port.toString() === workerPort);

        if (worker) {
          worker.totalRequests++;
          worker.avgResponseTime = worker.avgResponseTime === 0 ? duration :
            (worker.avgResponseTime + duration) / 2;
        }
      }
    });

    app.use('/', proxy);

    // Start server
    this.server = app.listen(this.port, () => {
      logger.info('Load balancer proxy server started', { port: this.port });
    });
  }

  selectWorker(req) {
    const healthyWorkers = Array.from(this.workers.values())
      .filter(worker => worker.status === 'healthy');

    if (healthyWorkers.length === 0) {
      logger.warn('No healthy workers available');
      return null;
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobinSelection(healthyWorkers);

      case 'least-connections':
        return this.leastConnectionsSelection(healthyWorkers);

      case 'ip-hash':
        return this.ipHashSelection(healthyWorkers, req);

      default:
        return this.roundRobinSelection(healthyWorkers);
    }
  }

  roundRobinSelection(workers) {
    const worker = workers[this.currentWorkerIndex % workers.length];
    this.currentWorkerIndex++;
    return worker;
  }

  leastConnectionsSelection(workers) {
    return workers.reduce((least, current) => 
      current.connections < least.connections ? current : least
    );
  }

  ipHashSelection(workers, req) {
    const clientIP = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const hash = this.hashCode(clientIP);
    const index = Math.abs(hash) % workers.length;
    return workers[index];
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  handleWorkerMessage(workerId, message) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    switch (message.type) {
      case 'ready':
        worker.status = 'healthy';
        worker.lastHealthCheck = Date.now();
        logger.info('Worker ready', {
          workerId,
          pid: worker.pid,
          port: worker.port
        });
        break;

      case 'health':
        worker.status = message.status;
        worker.lastHealthCheck = Date.now();
        worker.connections = message.connections || 0;
        break;

      case 'metrics':
        Object.assign(worker, message.metrics);
        break;

      case 'error':
        worker.status = 'unhealthy';
        worker.failedRequests++;
        logger.error('Worker reported error', {
          workerId,
          error: message.error
        });
        break;
    }
  }

  handleWorkerExit(workerId, code, signal) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    logger.warn('Worker exited', {
      workerId,
      pid: worker.pid,
      code,
      signal,
      restarts: worker.restarts
    });

    this.workers.delete(workerId);

    // Restart worker if not shutting down
    if (!this.isShuttingDown && worker.restarts < 5) {
      setTimeout(() => {
        logger.info('Restarting worker', { workerId });
        const newWorker = this.forkWorker(worker.id);
        const newWorkerInfo = this.workers.get(newWorker.id);
        newWorkerInfo.restarts = worker.restarts + 1;
      }, 1000);
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  performHealthChecks() {
    for (const [workerId, worker] of this.workers) {
      // Check if worker is responsive
      const timeSinceLastCheck = Date.now() - worker.lastHealthCheck;
      
      if (timeSinceLastCheck > this.healthCheckInterval * 2) {
        worker.status = 'unhealthy';
        logger.warn('Worker health check timeout', {
          workerId,
          lastCheck: timeSinceLastCheck
        });
      }

      // Send health check request
      const workerProcess = cluster.workers[workerId];
      if (workerProcess) {
        workerProcess.send({ type: 'health-check' });
      }
    }

    // Log cluster status
    const healthyWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'healthy').length;

    logger.debug('Health check completed', {
      totalWorkers: this.workers.size,
      healthyWorkers,
      unhealthyWorkers: this.workers.size - healthyWorkers
    });
  }

  updateAvgResponseTime(duration) {
    if (this.metrics.totalRequests === 1) {
      this.metrics.avgResponseTime = duration;
    } else {
      this.metrics.avgResponseTime = (
        (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + duration) / 
        this.metrics.totalRequests
      );
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      workers: {
        total: this.workers.size,
        healthy: Array.from(this.workers.values()).filter(w => w.status === 'healthy').length,
        unhealthy: Array.from(this.workers.values()).filter(w => w.status === 'unhealthy').length
      },
      uptime: process.uptime()
    };
  }

  getDetailedMetrics() {
    return {
      loadBalancer: this.getMetrics(),
      workers: Array.from(this.workers.values()).map(worker => ({
        id: worker.id,
        pid: worker.pid,
        port: worker.port,
        status: worker.status,
        connections: worker.connections,
        totalRequests: worker.totalRequests,
        failedRequests: worker.failedRequests,
        avgResponseTime: worker.avgResponseTime,
        restarts: worker.restarts,
        uptime: Date.now() - worker.lastHealthCheck
      }))
    };
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      logger.info('Received shutdown signal', { signal });
      this.isShuttingDown = true;

      // Stop accepting new requests
      if (this.server) {
        this.server.close(() => {
          logger.info('Load balancer server closed');
        });
      }

      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Gracefully shutdown workers
      const shutdownPromises = [];
      for (const [workerId, worker] of this.workers) {
        const workerProcess = cluster.workers[workerId];
        if (workerProcess) {
          shutdownPromises.push(new Promise((resolve) => {
            workerProcess.send({ type: 'shutdown' });
            setTimeout(() => {
              if (!workerProcess.isDead()) {
                workerProcess.kill('SIGTERM');
              }
              resolve();
            }, 5000);
          }));
        }
      }

      Promise.all(shutdownPromises).then(() => {
        logger.info('All workers shut down gracefully');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Force exit - graceful shutdown timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }

  async startWorker() {
    // Worker process implementation
    const app = require('../server'); // Your existing Express app
    
    const workerId = process.env.WORKER_ID;
    const port = process.env.WORKER_PORT;

    const server = app.listen(port, () => {
      logger.info('Worker started', {
        workerId,
        pid: process.pid,
        port
      });

      // Notify master that worker is ready
      process.send({ type: 'ready' });
    });

    // Handle messages from master
    process.on('message', (message) => {
      switch (message.type) {
        case 'health-check':
          process.send({
            type: 'health',
            status: 'healthy',
            connections: server.connections || 0
          });
          break;

        case 'shutdown':
          logger.info('Worker shutting down gracefully', { workerId });
          server.close(() => {
            process.exit(0);
          });
          break;
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in worker', {
        workerId,
        error: error.message,
        stack: error.stack
      });
      
      process.send({
        type: 'error',
        error: error.message
      });
      
      process.exit(1);
    });
  }
}

module.exports = LoadBalancer;