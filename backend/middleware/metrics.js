const promClient = require('prom-client');
const { logger } = require('../utils/logger');

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

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const route = req.route?.path || req.path;
  
  // Track request
  httpRequestTotal.inc({ method: req.method, route, status_code: 'pending' });
  
  // Override res.end to capture response time and status
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();
    
    // Update metrics
    httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );
    
    httpRequestTotal.inc({ method: req.method, route, status_code: statusCode });
    
    // Track errors
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      httpRequestErrors.inc({ method: req.method, route, error_type: errorType });
    }
    
    // Log performance for monitoring
    if (duration > 1) {
      logger.warn('Slow request detected', {
        method: req.method,
        route,
        duration,
        statusCode
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

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

// Update active users periodically
let currentActiveUsers = 0;
setInterval(() => {
  // Simulate active user count (would normally come from session store)
  currentActiveUsers = Math.floor(Math.random() * 20) + 5;
  activeUsers.set(currentActiveUsers);
}, 30000);

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
