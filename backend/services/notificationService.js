const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const WebSocket = require('ws');
const logger = require('../utils/logger');

/**
 * Real-time Notifications and Alerts Service
 * Manages multi-channel notifications with real-time delivery and escalation
 */
class NotificationService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // Channel configurations
      channels: {
        email: {
          enabled: options.emailEnabled !== false,
          host: options.emailHost || process.env.SMTP_HOST || 'localhost',
          port: options.emailPort || process.env.SMTP_PORT || 587,
          secure: options.emailSecure || false,
          auth: {
            user: options.emailUser || process.env.SMTP_USER,
            pass: options.emailPass || process.env.SMTP_PASS
          },
          from: options.emailFrom || process.env.SMTP_FROM || 'noreply@labscientific-lims.com'
        },
        websocket: {
          enabled: options.websocketEnabled !== false,
          port: options.websocketPort || 8080,
          heartbeatInterval: options.heartbeatInterval || 30000
        },
        sms: {
          enabled: options.smsEnabled || false,
          provider: options.smsProvider || 'twilio',
          apiKey: options.smsApiKey || process.env.SMS_API_KEY,
          apiSecret: options.smsApiSecret || process.env.SMS_API_SECRET,
          from: options.smsFrom || process.env.SMS_FROM
        },
        push: {
          enabled: options.pushEnabled || false,
          fcmKey: options.fcmKey || process.env.FCM_SERVER_KEY
        }
      },

      // Notification settings
      notifications: {
        defaultPriority: options.defaultPriority || 'medium',
        retryAttempts: options.retryAttempts || 3,
        retryDelay: options.retryDelay || 5000,
        batchSize: options.batchSize || 50,
        queueEnabled: options.queueEnabled !== false
      },

      // Escalation settings
      escalation: {
        enabled: options.escalationEnabled !== false,
        levels: options.escalationLevels || [
          { level: 1, delay: 5 * 60 * 1000, channels: ['email'] },      // 5 minutes
          { level: 2, delay: 15 * 60 * 1000, channels: ['email', 'sms'] }, // 15 minutes
          { level: 3, delay: 30 * 60 * 1000, channels: ['email', 'sms', 'push'] } // 30 minutes
        ],
        maxLevel: options.maxEscalationLevel || 3
      },

      // Rate limiting
      rateLimit: {
        enabled: options.rateLimitEnabled !== false,
        windowMs: options.rateLimitWindow || 60000, // 1 minute
        maxPerWindow: options.maxPerWindow || 100,
        perUserLimit: options.perUserLimit || 10
      },

      // Templates
      templates: {
        path: options.templatesPath || './templates',
        engine: options.templateEngine || 'handlebars',
        defaultLanguage: options.defaultLanguage || 'en'
      }
    };

    // Service state
    this.emailTransporter = null;
    this.websocketServer = null;
    this.connectedClients = new Map();
    this.notificationQueue = [];
    this.escalationTimers = new Map();
    this.rateLimitCounters = new Map();
    this.userPreferences = new Map();
    this.templates = new Map();

    // Metrics
    this.metrics = {
      sent: {
        total: 0,
        email: 0,
        websocket: 0,
        sms: 0,
        push: 0
      },
      failed: {
        total: 0,
        email: 0,
        websocket: 0,
        sms: 0,
        push: 0
      },
      escalations: 0,
      rateLimited: 0,
      avgDeliveryTime: 0,
      connectedClients: 0,
      queueSize: 0
    };

    this.initializeService();
  }

  async initializeService() {
    try {
      // Initialize email transporter
      if (this.config.channels.email.enabled) {
        await this.initializeEmailTransporter();
      }

      // Initialize WebSocket server
      if (this.config.channels.websocket.enabled) {
        await this.initializeWebSocketServer();
      }

      // Load notification templates
      await this.loadTemplates();

      // Start queue processor
      if (this.config.notifications.queueEnabled) {
        this.startQueueProcessor();
      }

      // Start cleanup interval
      this.startCleanupInterval();

      logger.info('Notification service initialized', {
        emailEnabled: this.config.channels.email.enabled,
        websocketEnabled: this.config.channels.websocket.enabled,
        smsEnabled: this.config.channels.sms.enabled,
        pushEnabled: this.config.channels.push.enabled
      });

    } catch (error) {
      logger.error('Failed to initialize notification service', error);
      throw error;
    }
  }

  async initializeEmailTransporter() {
    this.emailTransporter = nodemailer.createTransporter({
      host: this.config.channels.email.host,
      port: this.config.channels.email.port,
      secure: this.config.channels.email.secure,
      auth: this.config.channels.email.auth
    });

    // Verify connection
    await this.emailTransporter.verify();
    logger.info('Email transporter initialized');
  }

  async initializeWebSocketServer() {
    this.websocketServer = new WebSocket.Server({
      port: this.config.channels.websocket.port
    });

    this.websocketServer.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        userId: null, // Will be set during authentication
        subscriptions: new Set()
      };

      this.connectedClients.set(clientId, clientInfo);
      this.metrics.connectedClients++;

      logger.debug('WebSocket client connected', { clientId, clientsCount: this.connectedClients.size });

      ws.on('message', (message) => {
        this.handleWebSocketMessage(clientId, message);
      });

      ws.on('close', () => {
        this.connectedClients.delete(clientId);
        this.metrics.connectedClients--;
        logger.debug('WebSocket client disconnected', { clientId });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket client error', { clientId, error: error.message });
      });

      // Send initial connection confirmation
      this.sendToWebSocketClient(clientId, {
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString()
      });
    });

    // Start heartbeat interval
    setInterval(() => {
      this.sendHeartbeat();
    }, this.config.channels.websocket.heartbeatInterval);

    logger.info('WebSocket server initialized', { port: this.config.channels.websocket.port });
  }

  handleWebSocketMessage(clientId, message) {
    try {
      const data = JSON.parse(message);
      const client = this.connectedClients.get(clientId);

      if (!client) return;

      switch (data.type) {
        case 'authenticate':
          this.authenticateWebSocketClient(clientId, data.token);
          break;
        case 'subscribe':
          this.subscribeToNotifications(clientId, data.topics);
          break;
        case 'unsubscribe':
          this.unsubscribeFromNotifications(clientId, data.topics);
          break;
        case 'heartbeat':
          client.lastHeartbeat = Date.now();
          break;
        case 'preferences':
          this.updateUserPreferences(client.userId, data.preferences);
          break;
        default:
          logger.warn('Unknown WebSocket message type', { clientId, type: data.type });
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message', { clientId, error: error.message });
    }
  }

  async authenticateWebSocketClient(clientId, token) {
    try {
      // This would integrate with your authentication service
      const userId = await this.validateAuthToken(token);
      
      const client = this.connectedClients.get(clientId);
      if (client) {
        client.userId = userId;
        
        this.sendToWebSocketClient(clientId, {
          type: 'authentication_success',
          userId,
          timestamp: new Date().toISOString()
        });

        logger.debug('WebSocket client authenticated', { clientId, userId });
      }
    } catch (error) {
      this.sendToWebSocketClient(clientId, {
        type: 'authentication_failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.warn('WebSocket authentication failed', { clientId, error: error.message });
    }
  }

  async validateAuthToken(token) {
    // Mock implementation - integrate with your auth service
    if (token === 'valid_token') {
      return 'user123';
    }
    throw new Error('Invalid token');
  }

  subscribeToNotifications(clientId, topics) {
    const client = this.connectedClients.get(clientId);
    if (!client) return;

    topics.forEach(topic => {
      client.subscriptions.add(topic);
    });

    this.sendToWebSocketClient(clientId, {
      type: 'subscription_confirmed',
      topics,
      timestamp: new Date().toISOString()
    });

    logger.debug('Client subscribed to topics', { clientId, topics });
  }

  unsubscribeFromNotifications(clientId, topics) {
    const client = this.connectedClients.get(clientId);
    if (!client) return;

    topics.forEach(topic => {
      client.subscriptions.delete(topic);
    });

    this.sendToWebSocketClient(clientId, {
      type: 'unsubscription_confirmed',
      topics,
      timestamp: new Date().toISOString()
    });
  }

  sendHeartbeat() {
    const now = Date.now();
    const heartbeatTimeout = this.config.channels.websocket.heartbeatInterval * 2;

    for (const [clientId, client] of this.connectedClients) {
      // Check for stale connections
      if (now - client.lastHeartbeat > heartbeatTimeout) {
        logger.debug('Removing stale WebSocket connection', { clientId });
        client.ws.terminate();
        this.connectedClients.delete(clientId);
        this.metrics.connectedClients--;
        continue;
      }

      // Send heartbeat
      this.sendToWebSocketClient(clientId, {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
    }
  }

  sendToWebSocketClient(clientId, data) {
    const client = this.connectedClients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(data));
      } catch (error) {
        logger.error('Failed to send WebSocket message', { clientId, error: error.message });
      }
    }
  }

  async loadTemplates() {
    // Load default templates
    this.templates.set('sample_assignment', {
      subject: 'Sample Assignment Notification',
      body: 'Sample {{sampleId}} has been assigned to batch {{batchId}} for processing.',
      html: '<p>Sample <strong>{{sampleId}}</strong> has been assigned to batch <strong>{{batchId}}</strong> for processing.</p>'
    });

    this.templates.set('batch_completion', {
      subject: 'Batch Processing Complete',
      body: 'Batch {{batchId}} has completed processing with {{passCount}}/{{totalCount}} samples passing QC.',
      html: '<p>Batch <strong>{{batchId}}</strong> has completed processing with <strong>{{passCount}}/{{totalCount}}</strong> samples passing QC.</p>'
    });

    this.templates.set('system_alert', {
      subject: 'System Alert: {{alertType}}',
      body: 'Alert: {{message}}. Severity: {{severity}}. Time: {{timestamp}}',
      html: '<p><strong>Alert:</strong> {{message}}</p><p><strong>Severity:</strong> {{severity}}</p><p><strong>Time:</strong> {{timestamp}}</p>'
    });

    this.templates.set('compliance_violation', {
      subject: 'Compliance Violation Detected',
      body: 'Compliance violation detected: {{violation}}. Immediate action required.',
      html: '<p><strong>Compliance violation detected:</strong> {{violation}}</p><p><em>Immediate action required.</em></p>'
    });

    logger.debug('Notification templates loaded', { count: this.templates.size });
  }

  // Main notification methods
  async sendNotification(notification) {
    const startTime = Date.now();

    try {
      // Validate notification
      const validatedNotification = await this.validateNotification(notification);

      // Check rate limits
      if (this.isRateLimited(validatedNotification)) {
        this.metrics.rateLimited++;
        throw new Error('Rate limit exceeded');
      }

      // Apply user preferences
      const processedNotification = await this.applyUserPreferences(validatedNotification);

      // Queue or send immediately
      if (this.config.notifications.queueEnabled) {
        this.queueNotification(processedNotification);
      } else {
        await this.deliverNotification(processedNotification);
      }

      // Update metrics
      const deliveryTime = Date.now() - startTime;
      this.updateDeliveryMetrics(deliveryTime);

      return {
        success: true,
        id: processedNotification.id,
        deliveryTime
      };

    } catch (error) {
      logger.error('Failed to send notification', { notification, error: error.message });
      this.metrics.failed.total++;
      throw error;
    }
  }

  async validateNotification(notification) {
    const {
      type = 'info',
      recipients,
      subject,
      message,
      channels = ['email'],
      priority = this.config.notifications.defaultPriority,
      data = {},
      template
    } = notification;

    if (!recipients || recipients.length === 0) {
      throw new Error('Recipients are required');
    }

    if (!subject && !template) {
      throw new Error('Subject or template is required');
    }

    if (!message && !template) {
      throw new Error('Message or template is required');
    }

    return {
      id: this.generateNotificationId(),
      type,
      recipients: Array.isArray(recipients) ? recipients : [recipients],
      subject,
      message,
      channels,
      priority,
      data,
      template,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
  }

  isRateLimited(notification) {
    if (!this.config.rateLimit.enabled) return false;

    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;

    // Clean old entries
    for (const [key, timestamps] of this.rateLimitCounters) {
      this.rateLimitCounters.set(key, timestamps.filter(t => t > windowStart));
    }

    // Check global rate limit
    const globalKey = 'global';
    const globalTimestamps = this.rateLimitCounters.get(globalKey) || [];
    if (globalTimestamps.length >= this.config.rateLimit.maxPerWindow) {
      return true;
    }

    // Check per-user rate limits
    for (const recipient of notification.recipients) {
      const userKey = `user_${recipient}`;
      const userTimestamps = this.rateLimitCounters.get(userKey) || [];
      if (userTimestamps.length >= this.config.rateLimit.perUserLimit) {
        return true;
      }
    }

    // Update counters
    globalTimestamps.push(now);
    this.rateLimitCounters.set(globalKey, globalTimestamps);

    for (const recipient of notification.recipients) {
      const userKey = `user_${recipient}`;
      const userTimestamps = this.rateLimitCounters.get(userKey) || [];
      userTimestamps.push(now);
      this.rateLimitCounters.set(userKey, userTimestamps);
    }

    return false;
  }

  async applyUserPreferences(notification) {
    const processedNotification = { ...notification };

    for (const recipient of notification.recipients) {
      const preferences = this.userPreferences.get(recipient);
      if (preferences) {
        // Apply channel preferences
        if (preferences.disabledChannels) {
          processedNotification.channels = processedNotification.channels.filter(
            channel => !preferences.disabledChannels.includes(channel)
          );
        }

        // Apply priority filtering
        if (preferences.minPriority) {
          const priorityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
          const notificationLevel = priorityLevels[notification.priority] || 1;
          const minLevel = priorityLevels[preferences.minPriority] || 1;
          
          if (notificationLevel < minLevel) {
            logger.debug('Notification filtered by user preference', { recipient, priority: notification.priority });
            continue;
          }
        }
      }
    }

    return processedNotification;
  }

  queueNotification(notification) {
    this.notificationQueue.push(notification);
    this.metrics.queueSize = this.notificationQueue.length;
  }

  async deliverNotification(notification) {
    const promises = [];

    for (const channel of notification.channels) {
      switch (channel) {
        case 'email':
          if (this.config.channels.email.enabled) {
            promises.push(this.sendEmailNotification(notification));
          }
          break;
        case 'websocket':
          if (this.config.channels.websocket.enabled) {
            promises.push(this.sendWebSocketNotification(notification));
          }
          break;
        case 'sms':
          if (this.config.channels.sms.enabled) {
            promises.push(this.sendSMSNotification(notification));
          }
          break;
        case 'push':
          if (this.config.channels.push.enabled) {
            promises.push(this.sendPushNotification(notification));
          }
          break;
        default:
          logger.warn('Unknown notification channel', { channel });
      }
    }

    const results = await Promise.allSettled(promises);
    
    // Check if any delivery succeeded
    const hasSuccess = results.some(result => result.status === 'fulfilled');
    
    if (!hasSuccess && notification.priority === 'critical') {
      // Start escalation for critical notifications
      this.startEscalation(notification);
    }

    return results;
  }

  async sendEmailNotification(notification) {
    try {
      const { subject, html, text } = await this.renderTemplate(notification);

      for (const recipient of notification.recipients) {
        await this.emailTransporter.sendMail({
          from: this.config.channels.email.from,
          to: recipient,
          subject,
          text,
          html
        });

        logger.debug('Email notification sent', { recipient, subject });
      }

      this.metrics.sent.email += notification.recipients.length;
      this.metrics.sent.total += notification.recipients.length;

    } catch (error) {
      this.metrics.failed.email += notification.recipients.length;
      this.metrics.failed.total += notification.recipients.length;
      throw error;
    }
  }

  async sendWebSocketNotification(notification) {
    try {
      const message = {
        type: 'notification',
        id: notification.id,
        notificationType: notification.type,
        priority: notification.priority,
        subject: notification.subject,
        message: notification.message,
        data: notification.data,
        timestamp: notification.timestamp
      };

      let sentCount = 0;

      for (const [clientId, client] of this.connectedClients) {
        if (notification.recipients.includes(client.userId)) {
          this.sendToWebSocketClient(clientId, message);
          sentCount++;
        }
      }

      this.metrics.sent.websocket += sentCount;
      this.metrics.sent.total += sentCount;

      logger.debug('WebSocket notification sent', { recipients: sentCount });

    } catch (error) {
      this.metrics.failed.websocket++;
      this.metrics.failed.total++;
      throw error;
    }
  }

  async sendSMSNotification(notification) {
    try {
      // Mock SMS implementation
      // In real implementation, integrate with Twilio, AWS SNS, or other SMS provider
      const message = `${notification.subject}: ${notification.message}`;
      
      for (const recipient of notification.recipients) {
        // Mock SMS send
        logger.debug('SMS notification sent (mock)', { recipient, message });
      }

      this.metrics.sent.sms += notification.recipients.length;
      this.metrics.sent.total += notification.recipients.length;

    } catch (error) {
      this.metrics.failed.sms += notification.recipients.length;
      this.metrics.failed.total += notification.recipients.length;
      throw error;
    }
  }

  async sendPushNotification(notification) {
    try {
      // Mock push notification implementation
      // In real implementation, integrate with FCM, APNs, or other push service
      
      for (const recipient of notification.recipients) {
        // Mock push send
        logger.debug('Push notification sent (mock)', { recipient });
      }

      this.metrics.sent.push += notification.recipients.length;
      this.metrics.sent.total += notification.recipients.length;

    } catch (error) {
      this.metrics.failed.push += notification.recipients.length;
      this.metrics.failed.total += notification.recipients.length;
      throw error;
    }
  }

  async renderTemplate(notification) {
    let subject = notification.subject;
    let text = notification.message;
    let html = notification.message;

    if (notification.template && this.templates.has(notification.template)) {
      const template = this.templates.get(notification.template);
      
      // Simple template rendering (replace {{variable}} with data values)
      subject = this.interpolateTemplate(template.subject, notification.data);
      text = this.interpolateTemplate(template.body, notification.data);
      html = this.interpolateTemplate(template.html, notification.data);
    }

    return { subject, text, html };
  }

  interpolateTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  // Escalation methods
  startEscalation(notification) {
    if (!this.config.escalation.enabled) return;

    const escalationId = `escalation_${notification.id}`;
    let currentLevel = 1;

    const escalate = () => {
      if (currentLevel > this.config.escalation.maxLevel) return;

      const levelConfig = this.config.escalation.levels.find(l => l.level === currentLevel);
      if (!levelConfig) return;

      const escalatedNotification = {
        ...notification,
        id: `${notification.id}_escalation_${currentLevel}`,
        subject: `[ESCALATED ${currentLevel}] ${notification.subject}`,
        channels: levelConfig.channels,
        priority: 'critical'
      };

      this.deliverNotification(escalatedNotification);
      this.metrics.escalations++;

      logger.warn('Notification escalated', {
        originalId: notification.id,
        level: currentLevel,
        channels: levelConfig.channels
      });

      currentLevel++;

      if (currentLevel <= this.config.escalation.maxLevel) {
        const nextLevel = this.config.escalation.levels.find(l => l.level === currentLevel);
        if (nextLevel) {
          this.escalationTimers.set(escalationId, 
            setTimeout(escalate, nextLevel.delay)
          );
        }
      }
    };

    // Start first escalation
    const firstLevel = this.config.escalation.levels.find(l => l.level === 1);
    if (firstLevel) {
      this.escalationTimers.set(escalationId, 
        setTimeout(escalate, firstLevel.delay)
      );
    }
  }

  stopEscalation(notificationId) {
    const escalationId = `escalation_${notificationId}`;
    const timer = this.escalationTimers.get(escalationId);
    
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(escalationId);
      logger.debug('Escalation stopped', { notificationId });
    }
  }

  // Queue processing
  startQueueProcessor() {
    setInterval(async () => {
      await this.processQueue();
    }, 1000); // Process every second
  }

  async processQueue() {
    if (this.notificationQueue.length === 0) return;

    const batchSize = Math.min(this.config.notifications.batchSize, this.notificationQueue.length);
    const batch = this.notificationQueue.splice(0, batchSize);

    for (const notification of batch) {
      try {
        await this.deliverNotification(notification);
      } catch (error) {
        notification.attempts++;
        
        if (notification.attempts < this.config.notifications.retryAttempts) {
          // Re-queue for retry
          setTimeout(() => {
            this.notificationQueue.push(notification);
          }, this.config.notifications.retryDelay);
        } else {
          logger.error('Notification delivery failed after all retries', {
            id: notification.id,
            attempts: notification.attempts
          });
        }
      }
    }

    this.metrics.queueSize = this.notificationQueue.length;
  }

  // User preference management
  updateUserPreferences(userId, preferences) {
    this.userPreferences.set(userId, preferences);
    logger.debug('User preferences updated', { userId, preferences });
  }

  getUserPreferences(userId) {
    return this.userPreferences.get(userId) || {};
  }

  // Utility methods
  generateNotificationId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  updateDeliveryMetrics(deliveryTime) {
    const currentAvg = this.metrics.avgDeliveryTime;
    const totalSent = this.metrics.sent.total;
    
    this.metrics.avgDeliveryTime = totalSent === 1 ? 
      deliveryTime : 
      (currentAvg * (totalSent - 1) + deliveryTime) / totalSent;
  }

  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  cleanup() {
    // Clean up old rate limit counters
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;

    for (const [key, timestamps] of this.rateLimitCounters) {
      const filteredTimestamps = timestamps.filter(t => t > windowStart);
      if (filteredTimestamps.length === 0) {
        this.rateLimitCounters.delete(key);
      } else {
        this.rateLimitCounters.set(key, filteredTimestamps);
      }
    }

    // Clean up completed escalation timers
    // (Note: Active timers are automatically cleaned up when they complete)
  }

  // Management methods
  getConnectedClients() {
    return Array.from(this.connectedClients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      connectedAt: client.connectedAt,
      subscriptions: Array.from(client.subscriptions)
    }));
  }

  getQueueStatus() {
    return {
      size: this.notificationQueue.length,
      processing: this.config.notifications.queueEnabled,
      batchSize: this.config.notifications.batchSize
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      connectedClients: this.connectedClients.size,
      queueSize: this.notificationQueue.length,
      activeEscalations: this.escalationTimers.size,
      rateLimitCounters: this.rateLimitCounters.size,
      userPreferences: this.userPreferences.size,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    logger.info('Shutting down notification service');

    // Close WebSocket server
    if (this.websocketServer) {
      this.websocketServer.close();
    }

    // Clear all timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }

    // Process remaining queue
    if (this.notificationQueue.length > 0) {
      logger.info('Processing remaining notifications in queue', { count: this.notificationQueue.length });
      await this.processQueue();
    }

    logger.info('Notification service shutdown complete');
  }
}

module.exports = NotificationService;