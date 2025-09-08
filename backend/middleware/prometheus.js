/**
 * Prometheus Metrics for DevOps Monitoring
 */

const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics for LIMS
const httpRequestDuration = new promClient.Histogram({
  name: 'lims_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeWorkflowGauge = new promClient.Gauge({
  name: 'lims_active_workflows',
  help: 'Number of active workflows by stage',
  labelNames: ['stage']
});

const sampleProcessingCounter = new promClient.Counter({
  name: 'lims_samples_processed_total',
  help: 'Total number of samples processed',
  labelNames: ['stage', 'status']
});

const batchSizeHistogram = new promClient.Histogram({
  name: 'lims_batch_size',
  help: 'Size of processing batches',
  labelNames: ['type'],
  buckets: [5, 10, 15, 20, 25, 30]
});

const errorCounter = new promClient.Counter({
  name: 'lims_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity']
});

const databaseConnectionsGauge = new promClient.Gauge({
  name: 'lims_database_connections',
  help: 'Number of active database connections'
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(activeWorkflowGauge);
register.registerMetric(sampleProcessingCounter);
register.registerMetric(batchSizeHistogram);
register.registerMetric(errorCounter);
register.registerMetric(databaseConnectionsGauge);

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
const updateWorkflowMetrics = (db) => {
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

    stages.forEach(stage => {
      const count = db.prepare('SELECT COUNT(*) as count FROM samples WHERE workflow_status = ?').get(stage);
      activeWorkflowGauge.labels(stage).set(count?.count || 0);
    });

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