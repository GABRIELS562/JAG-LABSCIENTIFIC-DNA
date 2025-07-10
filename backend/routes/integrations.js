const express = require('express');
const router = express.Router();
const WebhookService = require('../services/webhookService');
const ExternalApiService = require('../services/externalApiService');
const logger = require('../utils/logger');

// Initialize services (would be injected in real app)
const webhookService = new WebhookService();
const externalApiService = new ExternalApiService();

// Middleware for integration access authorization
const requireIntegrationAccess = (req, res, next) => {
  // Mock authorization - implement real auth check
  const userRole = req.headers['x-user-role'] || 'user';
  const allowedRoles = ['admin', 'integration_manager', 'lab_manager'];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions for integration management'
    });
  }
  
  next();
};

// Middleware for admin-only operations
const requireAdminAccess = (req, res, next) => {
  const userRole = req.headers['x-user-role'] || 'user';
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required for this operation'
    });
  }
  
  next();
};

// ===== WEBHOOK ENDPOINTS =====

/**
 * List all webhooks
 * GET /api/integrations/webhooks
 */
router.get('/webhooks', requireIntegrationAccess, async (req, res) => {
  try {
    const webhooks = webhookService.getWebhooks();

    // Filter sensitive information for non-admin users
    const userRole = req.headers['x-user-role'] || 'user';
    const filteredWebhooks = webhooks.map(webhook => {
      const filtered = { ...webhook };
      if (userRole !== 'admin') {
        delete filtered.secret;
        delete filtered.headers;
      }
      return filtered;
    });

    res.json({
      success: true,
      data: {
        webhooks: filteredWebhooks,
        count: filteredWebhooks.length
      }
    });

  } catch (error) {
    logger.error('Failed to list webhooks', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhooks'
    });
  }
});

/**
 * Create a new webhook
 * POST /api/integrations/webhooks
 */
router.post('/webhooks', requireIntegrationAccess, async (req, res) => {
  try {
    const {
      url,
      events = ['*'],
      active = true,
      secret,
      headers = {},
      filters = {},
      description
    } = req.body;

    // Validate required fields
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required'
      });
    }

    const webhookData = {
      url,
      events,
      active,
      secret,
      headers,
      filters,
      description
    };

    const webhook = await webhookService.createWebhook(webhookData);

    res.status(201).json({
      success: true,
      data: webhook
    });

  } catch (error) {
    logger.error('Failed to create webhook', { error: error.message, body: req.body });
    
    if (error.message.includes('Invalid') || error.message.includes('test failed')) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create webhook'
      });
    }
  }
});

/**
 * Get webhook details
 * GET /api/integrations/webhooks/:id
 */
router.get('/webhooks/:id', requireIntegrationAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const webhook = webhookService.getWebhook(id);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    // Filter sensitive information for non-admin users
    const userRole = req.headers['x-user-role'] || 'user';
    const filteredWebhook = { ...webhook };
    if (userRole !== 'admin') {
      delete filteredWebhook.secret;
      delete filteredWebhook.headers;
    }

    res.json({
      success: true,
      data: filteredWebhook
    });

  } catch (error) {
    logger.error('Failed to get webhook', { webhookId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhook'
    });
  }
});

/**
 * Update webhook
 * PUT /api/integrations/webhooks/:id
 */
router.put('/webhooks/:id', requireIntegrationAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedWebhook = await webhookService.updateWebhook(id, updateData);

    res.json({
      success: true,
      data: updatedWebhook
    });

  } catch (error) {
    logger.error('Failed to update webhook', { webhookId: req.params.id, error: error.message });
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else if (error.message.includes('Invalid')) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update webhook'
      });
    }
  }
});

/**
 * Delete webhook
 * DELETE /api/integrations/webhooks/:id
 */
router.delete('/webhooks/:id', requireAdminAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await webhookService.deleteWebhook(id);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to delete webhook', { webhookId: req.params.id, error: error.message });
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete webhook'
      });
    }
  }
});

/**
 * Test webhook
 * POST /api/integrations/webhooks/:id/test
 */
router.post('/webhooks/:id/test', requireIntegrationAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await webhookService.testWebhook(id);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(422).json({
        success: false,
        error: 'Webhook test failed',
        details: result
      });
    }

  } catch (error) {
    logger.error('Failed to test webhook', { webhookId: req.params.id, error: error.message });
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to test webhook'
      });
    }
  }
});

/**
 * Get webhook delivery history
 * GET /api/integrations/webhooks/:id/deliveries
 */
router.get('/webhooks/:id/deliveries', requireIntegrationAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const deliveries = webhookService.getDeliveryHistory(id, parseInt(limit));

    res.json({
      success: true,
      data: {
        deliveries,
        count: deliveries.length,
        webhookId: id
      }
    });

  } catch (error) {
    logger.error('Failed to get delivery history', { webhookId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve delivery history'
    });
  }
});

/**
 * Publish a test event
 * POST /api/integrations/webhooks/events/publish
 */
router.post('/webhooks/events/publish', requireIntegrationAccess, async (req, res) => {
  try {
    const {
      eventType,
      data = {},
      metadata = {}
    } = req.body;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Event type is required'
      });
    }

    const eventId = await webhookService.publishEvent(eventType, data, {
      ...metadata,
      publishedBy: req.headers['x-user-id'] || 'unknown',
      test: true
    });

    res.json({
      success: true,
      data: {
        eventId,
        eventType,
        publishedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to publish event', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish event'
    });
  }
});

/**
 * Get webhook queue status
 * GET /api/integrations/webhooks/queue
 */
router.get('/webhooks/queue', requireIntegrationAccess, async (req, res) => {
  try {
    const queueStatus = webhookService.getQueueStatus();

    res.json({
      success: true,
      data: queueStatus
    });

  } catch (error) {
    logger.error('Failed to get queue status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve queue status'
    });
  }
});

/**
 * Get webhook metrics
 * GET /api/integrations/webhooks/metrics
 */
router.get('/webhooks/metrics', requireIntegrationAccess, async (req, res) => {
  try {
    const metrics = webhookService.getMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get webhook metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhook metrics'
    });
  }
});

// ===== EXTERNAL API ENDPOINTS =====

/**
 * List external integrations
 * GET /api/integrations/external
 */
router.get('/external', requireIntegrationAccess, async (req, res) => {
  try {
    const integrations = externalApiService.getIntegrations();

    // Filter sensitive information
    const filteredIntegrations = integrations.map(integration => {
      const filtered = { ...integration };
      delete filtered.auth; // Remove auth details
      return filtered;
    });

    res.json({
      success: true,
      data: {
        integrations: filteredIntegrations,
        count: filteredIntegrations.length
      }
    });

  } catch (error) {
    logger.error('Failed to list external integrations', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve external integrations'
    });
  }
});

/**
 * Get external integration details
 * GET /api/integrations/external/:id
 */
router.get('/external/:id', requireIntegrationAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const integration = externalApiService.getIntegration(id);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found'
      });
    }

    // Filter sensitive information
    const filtered = { ...integration };
    delete filtered.auth;

    res.json({
      success: true,
      data: filtered
    });

  } catch (error) {
    logger.error('Failed to get external integration', { integrationId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve external integration'
    });
  }
});

/**
 * Test external integration
 * POST /api/integrations/external/:id/test
 */
router.post('/external/:id/test', requireIntegrationAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const healthCheck = await externalApiService.checkIntegrationHealth(id);

    res.json({
      success: true,
      data: healthCheck
    });

  } catch (error) {
    logger.error('Failed to test external integration', { integrationId: req.params.id, error });
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to test external integration'
      });
    }
  }
});

/**
 * Check health of all external integrations
 * GET /api/integrations/external/health
 */
router.get('/external/health', requireIntegrationAccess, async (req, res) => {
  try {
    const healthStatus = await externalApiService.checkAllIntegrationsHealth();

    res.json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    logger.error('Failed to check integrations health', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check integrations health'
    });
  }
});

/**
 * Get external API metrics
 * GET /api/integrations/external/metrics
 */
router.get('/external/metrics', requireIntegrationAccess, async (req, res) => {
  try {
    const metrics = externalApiService.getMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get external API metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve external API metrics'
    });
  }
});

// ===== SPECIFIC INTEGRATION ENDPOINTS =====

/**
 * Submit sample for Osiris analysis
 * POST /api/integrations/osiris/analyze
 */
router.post('/osiris/analyze', requireIntegrationAccess, async (req, res) => {
  try {
    const { sampleData, files } = req.body;

    if (!sampleData) {
      return res.status(400).json({
        success: false,
        error: 'Sample data is required'
      });
    }

    const result = await externalApiService.analyzeWithOsiris(sampleData, files || []);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to submit Osiris analysis', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit sample for analysis'
    });
  }
});

/**
 * Get Osiris analysis results
 * GET /api/integrations/osiris/results/:analysisId
 */
router.get('/osiris/results/:analysisId', requireIntegrationAccess, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const results = await externalApiService.getOsirisResults(analysisId);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Failed to get Osiris results', { analysisId: req.params.analysisId, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis results'
    });
  }
});

/**
 * Sync with legacy LIS
 * POST /api/integrations/lis/sync
 */
router.post('/lis/sync', requireIntegrationAccess, async (req, res) => {
  try {
    const { patientId, orderData } = req.body;

    if (!patientId || !orderData) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID and order data are required'
      });
    }

    const result = await externalApiService.syncWithLegacyLIS(patientId, orderData);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to sync with LIS', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync with legacy LIS'
    });
  }
});

/**
 * Submit to reference database
 * POST /api/integrations/reference-db/submit
 */
router.post('/reference-db/submit', requireAdminAccess, async (req, res) => {
  try {
    const { dnaProfile, metadata } = req.body;

    if (!dnaProfile) {
      return res.status(400).json({
        success: false,
        error: 'DNA profile is required'
      });
    }

    const result = await externalApiService.submitToReferenceDatabase(dnaProfile, metadata || {});

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to submit to reference database', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit to reference database'
    });
  }
});

/**
 * Send external notification
 * POST /api/integrations/notifications/send
 */
router.post('/notifications/send', requireIntegrationAccess, async (req, res) => {
  try {
    const { message, channel = 'email' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const result = await externalApiService.sendExternalNotification(message, channel);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to send external notification', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send external notification'
    });
  }
});

/**
 * Report to quality management system
 * POST /api/integrations/quality/report
 */
router.post('/quality/report', requireIntegrationAccess, async (req, res) => {
  try {
    const incident = req.body;

    if (!incident.type || !incident.description) {
      return res.status(400).json({
        success: false,
        error: 'Incident type and description are required'
      });
    }

    const result = await externalApiService.reportToQualitySystem(incident);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to report to quality system', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report to quality management system'
    });
  }
});

// ===== GENERAL INTEGRATION ENDPOINTS =====

/**
 * Get integration overview
 * GET /api/integrations/overview
 */
router.get('/overview', requireIntegrationAccess, async (req, res) => {
  try {
    const webhooks = webhookService.getWebhooks();
    const externalIntegrations = externalApiService.getIntegrations();
    const webhookMetrics = webhookService.getMetrics();
    const externalMetrics = externalApiService.getMetrics();

    const overview = {
      webhooks: {
        total: webhooks.length,
        active: webhooks.filter(w => w.active).length,
        metrics: webhookMetrics
      },
      external: {
        total: externalIntegrations.length,
        active: externalIntegrations.filter(i => i.active).length,
        healthy: externalIntegrations.filter(i => i.status === 'healthy').length,
        metrics: externalMetrics
      },
      summary: {
        totalIntegrations: webhooks.length + externalIntegrations.length,
        overallHealth: 'healthy', // Would be calculated based on actual health checks
        lastUpdated: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: overview
    });

  } catch (error) {
    logger.error('Failed to get integration overview', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve integration overview'
    });
  }
});

/**
 * Get supported webhook events
 * GET /api/integrations/webhooks/events
 */
router.get('/webhooks/events', (req, res) => {
  try {
    const supportedEvents = webhookService.config.events.supportedEvents;

    const eventGroups = {
      samples: supportedEvents.filter(e => e.startsWith('sample.')),
      testCases: supportedEvents.filter(e => e.startsWith('test_case.')),
      batches: supportedEvents.filter(e => e.startsWith('batch.')),
      reports: supportedEvents.filter(e => e.startsWith('report.')),
      alerts: supportedEvents.filter(e => e.startsWith('alert.')),
      workflows: supportedEvents.filter(e => e.startsWith('workflow.')),
      system: supportedEvents.filter(e => e.startsWith('user.') || e.startsWith('export.') || e.startsWith('import.'))
    };

    res.json({
      success: true,
      data: {
        all: supportedEvents,
        grouped: eventGroups,
        wildcard: ['*', 'sample.*', 'test_case.*', 'batch.*', 'report.*', 'alert.*', 'workflow.*']
      }
    });

  } catch (error) {
    logger.error('Failed to get supported events', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve supported events'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('Integration API error', {
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTEGRATION_ERROR',
      message: 'Internal integration service error',
      details: error.message
    }
  });
});

module.exports = router;