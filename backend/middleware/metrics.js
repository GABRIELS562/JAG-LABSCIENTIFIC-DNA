const promClient = require('prom-client');
const logger = require('../utils/logger');
const { memoryManager } = require('../utils/memoryManager');

// Initialize Prometheus client
const register = promClient.register;

// Create default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// HTTP Request Metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestErrors = new promClient.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type']
});

// Business Metrics
const samplesProcessed = new promClient.Counter({
  name: 'lims_samples_processed_total',
  help: 'Total number of samples processed',
  labelNames: ['status', 'workflow_stage']
});

const batchesCreated = new promClient.Counter({
  name: 'lims_batches_created_total',
  help: 'Total number of batches created',
  labelNames: ['batch_type']
});

const databaseQueries = new promClient.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table']
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Application Metrics
const activeUsers = new promClient.Gauge({
  name: 'lims_active_users',
  help: 'Number of currently active users'
});

const memoryLeakCounter = new promClient.Counter({
  name: 'memory_leak_simulation_total',
  help: 'Number of times memory leak simulation was triggered'
});

const cpuIntensiveOperations = new promClient.Counter({
  name: 'cpu_intensive_operations_total',
  help: 'Number of CPU intensive operations performed'
});

const slowOperations = new promClient.Counter({
  name: 'slow_operations_total',
  help: 'Number of intentionally slow operations'
});

const errorSimulations = new promClient.Counter({
  name: 'error_simulations_total',
  help: 'Number of simulated errors',
  labelNames: ['error_type']
});

// Queue Metrics
const queueSize = new promClient.Gauge({
  name: 'lims_queue_size',
  help: 'Current size of processing queues',
  labelNames: ['queue_type']
});

const processingTime = new promClient.Histogram({
  name: 'lims_processing_time_seconds',
  help: 'Time taken to process samples',
  labelNames: ['process_type'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1200]
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(samplesProcessed);
register.registerMetric(batchesCreated);
register.registerMetric(databaseQueries);
register.registerMetric(databaseQueryDuration);
register.registerMetric(activeUsers);
register.registerMetric(memoryLeakCounter);
register.registerMetric(cpuIntensiveOperations);
register.registerMetric(slowOperations);
register.registerMetric(errorSimulations);
register.registerMetric(queueSize);
register.registerMetric(processingTime);

// Metrics middleware with memory optimization
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const route = req.route?.path || req.path;
  
  // Sanitize route for metrics (prevent memory leaks from dynamic routes)
  const sanitizedRoute = sanitizeRouteForMetrics(route);
  
  // Track request with memory limits
  httpRequestTotal.inc({ method: req.method, route: sanitizedRoute, status_code: 'pending' });
  
  // Override res.end to capture response time and status
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();
    
    // Update metrics with sanitized labels
    httpRequestDuration.observe(
      { method: req.method, route: sanitizedRoute, status_code: statusCode },
      duration
    );
    
    httpRequestTotal.inc({ method: req.method, route: sanitizedRoute, status_code: statusCode });
    
    // Track errors
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      httpRequestErrors.inc({ method: req.method, route: sanitizedRoute, error_type: errorType });
    }
    
    // Log performance for monitoring (with sampling to reduce logs)
    if (duration > 1 && Math.random() < 0.1) { // Sample 10% of slow requests
      logger.warn('Slow request detected', {
        method: req.method,
        route: sanitizedRoute,
        duration,
        statusCode
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Sanitize route names to prevent metric label explosion
function sanitizeRouteForMetrics(route) {
  if (!route) return 'unknown';
  
  // Replace dynamic segments with placeholders
  return route
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9]{24}/g, '/:objectId')
    .replace(/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/g, '/:file')
    .substring(0, 100); // Limit length
}

// Database metrics helpers
const trackDatabaseQuery = (operation, table, duration) => {
  databaseQueries.inc({ operation, table });
  databaseQueryDuration.observe({ operation, table }, duration);
};

// Business metrics helpers
const trackSampleProcessed = (status, workflowStage) => {
  samplesProcessed.inc({ status, workflow_stage: workflowStage });
};

const trackBatchCreated = (batchType) => {
  batchesCreated.inc({ batch_type: batchType });
};

const updateQueueSize = (queueType, size) => {
  queueSize.set({ queue_type: queueType }, size);
};

const trackProcessingTime = (processType, duration) => {
  processingTime.observe({ process_type: processType }, duration);
};

// Simulation metrics
const simulateMemoryLeak = () => {
  memoryLeakCounter.inc();
};

const simulateCpuIntensive = () => {
  cpuIntensiveOperations.inc();
};

const simulateSlowOperation = () => {
  slowOperations.inc();
};

const simulateError = (errorType) => {
  errorSimulations.inc({ error_type: errorType });
};

// Update active users periodically with memory management
let currentActiveUsers = 0;
let userUpdateInterval = null;

// Function to start user monitoring
function startUserMonitoring() {
  if (userUpdateInterval) return;
  
  userUpdateInterval = setInterval(() => {
    // Simulate active user count (would normally come from session store)
    currentActiveUsers = Math.floor(Math.random() * 20) + 5;
    activeUsers.set(currentActiveUsers);
    
    // Periodically clean up old metrics data
    if (Math.random() < 0.1) { // 10% chance
      memoryManager.clearCache('metrics');
    }
  }, 30000);
}

// Function to stop user monitoring
function stopUserMonitoring() {
  if (userUpdateInterval) {
    clearInterval(userUpdateInterval);
    userUpdateInterval = null;
  }
}

// Start monitoring
startUserMonitoring();

// Cleanup function
function cleanup() {
  stopUserMonitoring();
  register.clear();
  logger.info('Metrics middleware cleaned up');
}

// Graceful shutdown handler
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

module.exports = {
  register,
  metricsMiddleware,
  trackDatabaseQuery,
  trackSampleProcessed,
  trackBatchCreated,
  updateQueueSize,
  trackProcessingTime,
  simulateMemoryLeak,
  simulateCpuIntensive,
  simulateSlowOperation,
  simulateError,
  startUserMonitoring,
  stopUserMonitoring,
  cleanup,
  // Export individual metrics for direct access
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    httpRequestErrors,
    samplesProcessed,
    batchesCreated,
    databaseQueries,
    databaseQueryDuration,
    activeUsers,
    memoryLeakCounter,
    cpuIntensiveOperations,
    slowOperations,
    errorSimulations,
    queueSize,
    processingTime
  }
};
