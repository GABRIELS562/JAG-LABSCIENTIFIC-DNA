/**
 * Prometheus Metrics for DevOps Monitoring
 */

const promClient = require('prom-client');

// Use the default registry (shared with metrics.js)
const register = promClient.register;

// Add default metrics (CPU, memory, etc.) - only if not already collecting
if (!register.getSingleMetric('process_cpu_user_seconds_total')) {
  promClient.collectDefaultMetrics({ register });
}

// Custom metrics for LIMS
let httpRequestDuration, activeWorkflowGauge, sampleProcessingCounter;
let batchSizeHistogram, errorCounter, databaseConnectionsGauge;

// Register metrics only if not already registered
httpRequestDuration = register.getSingleMetric('lims_http_request_duration_seconds') || new promClient.Histogram({
  name: 'lims_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

activeWorkflowGauge = register.getSingleMetric('lims_active_workflows') || new promClient.Gauge({
  name: 'lims_active_workflows',
  help: 'Number of active workflows by stage',
  labelNames: ['stage']
});

sampleProcessingCounter = register.getSingleMetric('lims_samples_processed_total') || new promClient.Counter({
  name: 'lims_samples_processed_total',
  help: 'Total number of samples processed',
  labelNames: ['stage', 'status']
});

batchSizeHistogram = register.getSingleMetric('lims_batch_size') || new promClient.Histogram({
  name: 'lims_batch_size',
  help: 'Size of processing batches',
  labelNames: ['type'],
  buckets: [5, 10, 15, 20, 25, 30]
});

errorCounter = register.getSingleMetric('lims_errors_total') || new promClient.Counter({
  name: 'lims_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity']
});

databaseConnectionsGauge = register.getSingleMetric('lims_database_connections') || new promClient.Gauge({
  name: 'lims_database_connections',
  help: 'Number of active database connections'
});

// Middleware to track HTTP metrics
const httpMetricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
};

// Update workflow metrics
const updateWorkflowMetrics = async (db) => {
  try {
    const stages = [
      'sample_collected',
      'dna_extraction',
      'pcr_ready',
      'pcr_batched',
      'pcr_completed',
      'electro_ready',
      'electro_batched',
      'electro_completed',
      'analysis_ready',
      'analysis_completed',
      'report_ready',
      'report_sent'
    ];

    // PostgreSQL query
    for (const stage of stages) {
      try {
        const result = await db.query('SELECT COUNT(*) as count FROM samples WHERE workflow_status = $1', [stage]);
        const count = parseInt(result.rows[0]?.count || 0);
        activeWorkflowGauge.labels(stage).set(count);
      } catch (err) {
        // Silently handle individual stage errors
      }
    }

    // Update database connections
    databaseConnectionsGauge.set(5); // Simulated value
  } catch (error) {
    console.error('Error updating metrics:', error);
  }
};

// Export metrics endpoint handler
const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};

module.exports = {
  register,
  httpMetricsMiddleware,
  metricsHandler,
  updateWorkflowMetrics,
  sampleProcessingCounter,
  batchSizeHistogram,
  errorCounter
};