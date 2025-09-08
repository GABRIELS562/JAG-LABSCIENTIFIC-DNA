const express = require('express');
const { register } = require('./middleware/metrics');
const logger = require('./utils/logger');

// Create dedicated metrics server
const metricsApp = express();
const METRICS_PORT = process.env.PROMETHEUS_METRICS_PORT || 9101;

// Health check for metrics server
metricsApp.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lims-metrics',
    port: METRICS_PORT,
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint
metricsApp.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    logger.error('Error generating metrics:', err);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// FDA compliance metrics endpoint
metricsApp.get('/metrics/fda', async (req, res) => {
  try {
    const fdaMetrics = await register.getSingleMetricAsString('lims_samples_processed_total');
    res.set('Content-Type', 'text/plain');
    res.end(fdaMetrics);
  } catch (err) {
    logger.error('Error generating FDA metrics:', err);
    res.status(500).json({ error: 'Failed to generate FDA metrics' });
  }
});

// Start metrics server
function startMetricsServer() {
  const server = metricsApp.listen(METRICS_PORT, '0.0.0.0', () => {
    logger.info(`LIMS Metrics Server running on port ${METRICS_PORT}`);
    logger.info(`Metrics available at http://localhost:${METRICS_PORT}/metrics`);
    logger.info(`FDA compliance metrics at http://localhost:${METRICS_PORT}/metrics/fda`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Shutting down metrics server...');
    server.close(() => {
      logger.info('Metrics server shut down');
      process.exit(0);
    });
  });

  return server;
}

module.exports = { startMetricsServer, metricsApp };

// Start server if this file is run directly
if (require.main === module) {
  startMetricsServer();
}