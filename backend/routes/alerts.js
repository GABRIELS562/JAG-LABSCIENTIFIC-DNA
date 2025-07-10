const express = require('express');
const router = express.Router();
const AlertService = require('../services/alertService');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// Initialize services (would be injected in real app)
const alertService = new AlertService();
const notificationService = new NotificationService();

// Middleware for alert management authorization
const requireAlertAccess = (req, res, next) => {
  // Mock authorization - implement real auth check
  const userRole = req.headers['x-user-role'] || 'user';
  const allowedRoles = ['admin', 'ops', 'lab_manager'];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions for alert management'
    });
  }
  
  next();
};

/**
 * Get all active alerts
 * GET /api/alerts
 */
router.get('/', async (req, res) => {
  try {
    const {
      severity,
      category,
      status = 'active',
      limit = 50,
      offset = 0
    } = req.query;

    let alerts = alertService.getActiveAlerts();

    // Apply filters
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    if (category) {
      alerts = alerts.filter(alert => alert.category === category);
    }

    // Sort by severity and timestamp
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.triggeredAt) - new Date(a.triggeredAt);
    });

    // Apply pagination
    const paginatedAlerts = alerts.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          total: alerts.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < alerts.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get alerts', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts'
    });
  }
});

/**
 * Get alert by ID
 * GET /api/alerts/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const alerts = alertService.getActiveAlerts();
    const alert = alerts.find(a => a.id === id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    logger.error('Failed to get alert', { alertId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert'
    });
  }
});

/**
 * Resolve an alert
 * PATCH /api/alerts/:id/resolve
 */
router.patch('/:id/resolve', requireAlertAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const resolvedBy = req.headers['x-user-id'] || 'unknown';

    const resolvedAlert = await alertService.resolveAlert(id, reason, resolvedBy);

    if (!resolvedAlert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or already resolved'
      });
    }

    // Send notification about resolution
    await notificationService.sendNotification({
      type: 'alert_resolved',
      recipients: [resolvedBy],
      subject: 'Alert Resolved',
      message: `Alert ${id} has been resolved: ${reason}`,
      channels: ['email', 'websocket'],
      priority: 'medium',
      data: {
        alertId: id,
        resolvedBy,
        reason,
        resolvedAt: resolvedAlert.resolvedAt
      }
    });

    res.json({
      success: true,
      data: resolvedAlert
    });

  } catch (error) {
    logger.error('Failed to resolve alert', { alertId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

/**
 * Suppress an alert
 * PATCH /api/alerts/:id/suppress
 */
router.patch('/:id/suppress', requireAlertAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { durationMs = 300000 } = req.body; // Default 5 minutes
    const suppressedBy = req.headers['x-user-id'] || 'unknown';

    alertService.suppressAlert(id, durationMs);

    res.json({
      success: true,
      data: {
        alertId: id,
        suppressedBy,
        durationMs,
        suppressedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + durationMs).toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to suppress alert', { alertId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to suppress alert'
    });
  }
});

/**
 * Trigger a manual alert
 * POST /api/alerts/trigger
 */
router.post('/trigger', requireAlertAccess, async (req, res) => {
  try {
    const {
      type,
      category,
      severity,
      message,
      data = {}
    } = req.body;

    const triggeredBy = req.headers['x-user-id'] || 'unknown';

    if (!type || !category || !severity || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, category, severity, message'
      });
    }

    const alert = await alertService.triggerAlert({
      type,
      category,
      severity,
      message,
      data: {
        ...data,
        triggeredBy,
        manual: true
      }
    });

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    logger.error('Failed to trigger alert', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger alert'
    });
  }
});

/**
 * Get alert history
 * GET /api/alerts/history
 */
router.get('/history/list', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const history = alertService.getAlertHistory(parseInt(limit));

    res.json({
      success: true,
      data: {
        alerts: history,
        count: history.length
      }
    });

  } catch (error) {
    logger.error('Failed to get alert history', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert history'
    });
  }
});

/**
 * Get alert metrics
 * GET /api/alerts/metrics
 */
router.get('/metrics/summary', async (req, res) => {
  try {
    const metrics = alertService.getMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get alert metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert metrics'
    });
  }
});

/**
 * Get system health status
 * GET /api/alerts/health
 */
router.get('/health/status', async (req, res) => {
  try {
    const healthStatus = alertService.getHealthStatus();
    const overallHealth = Object.values(healthStatus).every(
      check => check && check.status === 'healthy'
    );

    res.json({
      success: true,
      data: {
        overallHealth: overallHealth ? 'healthy' : 'unhealthy',
        checks: healthStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get health status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health status'
    });
  }
});

/**
 * Get notification metrics
 * GET /api/alerts/notifications/metrics
 */
router.get('/notifications/metrics', async (req, res) => {
  try {
    const metrics = notificationService.getMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get notification metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification metrics'
    });
  }
});

/**
 * Send a test notification
 * POST /api/alerts/notifications/test
 */
router.post('/notifications/test', requireAlertAccess, async (req, res) => {
  try {
    const {
      recipients,
      channels = ['email'],
      message = 'This is a test notification'
    } = req.body;

    const sentBy = req.headers['x-user-id'] || 'unknown';

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients are required'
      });
    }

    const result = await notificationService.sendNotification({
      type: 'test',
      recipients,
      subject: 'Test Notification',
      message,
      channels,
      priority: 'low',
      data: {
        sentBy,
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to send test notification', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

/**
 * Get connected WebSocket clients
 * GET /api/alerts/notifications/clients
 */
router.get('/notifications/clients', requireAlertAccess, async (req, res) => {
  try {
    const clients = notificationService.getConnectedClients();

    res.json({
      success: true,
      data: {
        clients,
        count: clients.length
      }
    });

  } catch (error) {
    logger.error('Failed to get connected clients', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve connected clients'
    });
  }
});

/**
 * Update user notification preferences
 * PUT /api/alerts/notifications/preferences
 */
router.put('/notifications/preferences', async (req, res) => {
  try {
    const {
      disabledChannels = [],
      minPriority = 'low',
      emailDigest = false,
      realTimeAlerts = true
    } = req.body;

    const userId = req.headers['x-user-id'] || 'unknown';

    const preferences = {
      disabledChannels,
      minPriority,
      emailDigest,
      realTimeAlerts,
      updatedAt: new Date().toISOString()
    };

    notificationService.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      data: {
        userId,
        preferences
      }
    });

  } catch (error) {
    logger.error('Failed to update preferences', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
});

/**
 * Get user notification preferences
 * GET /api/alerts/notifications/preferences
 */
router.get('/notifications/preferences', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'unknown';
    const preferences = notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      data: {
        userId,
        preferences
      }
    });

  } catch (error) {
    logger.error('Failed to get preferences', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification preferences'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('Alert API error', {
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

module.exports = router;