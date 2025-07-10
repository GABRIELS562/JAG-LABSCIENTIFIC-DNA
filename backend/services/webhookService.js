const EventEmitter = require('events');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Webhook Service
 * Manages webhook subscriptions, event delivery, and external integrations
 */
class WebhookService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // Delivery options
      delivery: {
        timeout: options.timeout || 30000, // 30 seconds
        maxRetries: options.maxRetries || 3,
        retryDelays: options.retryDelays || [1000, 5000, 15000], // 1s, 5s, 15s
        concurrentDeliveries: options.concurrentDeliveries || 10,
        batchSize: options.batchSize || 100
      },

      // Security options
      security: {
        requireSignature: options.requireSignature !== false,
        signatureHeader: options.signatureHeader || 'X-LIMS-Signature',
        algorithm: options.algorithm || 'sha256',
        secretLength: options.secretLength || 32,
        allowedIPs: options.allowedIPs || [],
        maxPayloadSize: options.maxPayloadSize || 1024 * 1024 // 1MB
      },

      // Rate limiting
      rateLimit: {
        enabled: options.rateLimitEnabled !== false,
        maxPerMinute: options.maxPerMinute || 60,
        maxPerHour: options.maxPerHour || 1000,
        windowMs: options.windowMs || 60000
      },

      // Event filtering
      events: {
        maxFilters: options.maxFilters || 10,
        defaultEvents: options.defaultEvents || ['*'],
        supportedEvents: options.supportedEvents || [
          'sample.created', 'sample.updated', 'sample.completed', 'sample.deleted',
          'test_case.created', 'test_case.updated', 'test_case.completed',
          'batch.created', 'batch.completed', 'batch.failed',
          'report.generated', 'report.published',
          'alert.triggered', 'alert.resolved',
          'workflow.started', 'workflow.completed', 'workflow.failed',
          'export.completed', 'import.completed',
          'user.created', 'user.updated', 'user.login'
        ]
      }
    };

    // Service state
    this.webhooks = new Map();
    this.eventQueue = [];
    this.deliveryQueue = [];
    this.rateLimitCounters = new Map();
    this.deliveryHistory = new Map();
    this.activeDeliveries = new Set();

    // Metrics
    this.metrics = {
      webhooks: {
        total: 0,
        active: 0,
        inactive: 0
      },
      events: {
        total: 0,
        queued: 0,
        delivered: 0,
        failed: 0,
        retried: 0
      },
      delivery: {
        avgResponseTime: 0,
        successRate: 0,
        timeouts: 0,
        networkErrors: 0
      },
      rateLimit: {
        blocked: 0,
        allowedRequests: 0
      }
    };

    this.initializeService();
  }

  async initializeService() {
    try {
      // Load existing webhooks
      await this.loadWebhooks();

      // Start event processing
      this.startEventProcessor();

      // Start delivery processor
      this.startDeliveryProcessor();

      // Start cleanup tasks
      this.startCleanupTasks();

      logger.info('Webhook service initialized', {
        webhooks: this.webhooks.size,
        supportedEvents: this.config.events.supportedEvents.length
      });

    } catch (error) {
      logger.error('Failed to initialize webhook service', error);
      throw error;
    }
  }

  async loadWebhooks() {
    // Mock implementation - replace with actual database loading
    const mockWebhooks = [
      {
        id: 'wh_001',
        url: 'https://example.com/webhooks/lims',
        events: ['sample.created', 'sample.completed'],
        active: true,
        secret: 'webhook_secret_123',
        headers: { 'Authorization': 'Bearer token123' },
        filters: { entity_type: 'samples' }
      }
    ];

    for (const webhook of mockWebhooks) {
      this.webhooks.set(webhook.id, {
        ...webhook,
        createdAt: new Date().toISOString(),
        deliveryStats: {
          totalDeliveries: 0,
          successfulDeliveries: 0,
          failedDeliveries: 0,
          avgResponseTime: 0,
          lastDelivery: null,
          lastSuccess: null,
          lastFailure: null
        }
      });
    }

    this.updateWebhookMetrics();
  }

  // Webhook Management
  async createWebhook(webhookData) {
    const {
      url,
      events = ['*'],
      active = true,
      secret,
      headers = {},
      filters = {},
      description
    } = webhookData;

    // Validate webhook data
    await this.validateWebhookData(webhookData);

    const webhookId = this.generateWebhookId();
    const webhookSecret = secret || this.generateSecret();

    const webhook = {
      id: webhookId,
      url,
      events,
      active,
      secret: webhookSecret,
      headers,
      filters,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryStats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        avgResponseTime: 0,
        lastDelivery: null,
        lastSuccess: null,
        lastFailure: null
      }
    };

    this.webhooks.set(webhookId, webhook);
    this.updateWebhookMetrics();

    // Persist webhook
    await this.persistWebhook(webhook);

    logger.info('Webhook created', { webhookId, url, events });

    return {
      id: webhookId,
      url,
      events,
      active,
      secret: webhookSecret,
      createdAt: webhook.createdAt
    };
  }

  async validateWebhookData(data) {
    const { url, events, headers } = data;

    // Validate URL
    if (!url || !this.isValidUrl(url)) {
      throw new Error('Invalid webhook URL');
    }

    // Validate events
    if (events && Array.isArray(events)) {
      const invalidEvents = events.filter(event => 
        event !== '*' && !this.config.events.supportedEvents.includes(event)
      );
      
      if (invalidEvents.length > 0) {
        throw new Error(`Unsupported events: ${invalidEvents.join(', ')}`);
      }
    }

    // Validate headers
    if (headers && typeof headers !== 'object') {
      throw new Error('Headers must be an object');
    }

    // Test webhook endpoint
    await this.testWebhookEndpoint(url, headers);
  }

  isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  async testWebhookEndpoint(url, headers = {}) {
    try {
      const testPayload = {
        event: 'ping',
        timestamp: new Date().toISOString(),
        data: { test: true }
      };

      const response = await axios.post(url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LabScientific-LIMS-Webhook/1.0',
          ...headers
        },
        timeout: this.config.delivery.timeout,
        validateStatus: status => status >= 200 && status < 300
      });

      logger.debug('Webhook endpoint test successful', { 
        url, 
        status: response.status 
      });

    } catch (error) {
      logger.warn('Webhook endpoint test failed', { 
        url, 
        error: error.message 
      });
      throw new Error(`Webhook endpoint test failed: ${error.message}`);
    }
  }

  async updateWebhook(webhookId, updateData) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Validate update data
    if (updateData.url || updateData.events || updateData.headers) {
      await this.validateWebhookData({ ...webhook, ...updateData });
    }

    // Update webhook
    const updatedWebhook = {
      ...webhook,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.webhooks.set(webhookId, updatedWebhook);
    this.updateWebhookMetrics();

    // Persist changes
    await this.persistWebhook(updatedWebhook);

    logger.info('Webhook updated', { webhookId, changes: Object.keys(updateData) });

    return updatedWebhook;
  }

  async deleteWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    this.webhooks.delete(webhookId);
    this.updateWebhookMetrics();

    // Remove from persistence
    await this.removeWebhook(webhookId);

    logger.info('Webhook deleted', { webhookId, url: webhook.url });

    return { deleted: true, webhookId };
  }

  // Event Publishing
  async publishEvent(eventType, data, metadata = {}) {
    try {
      const event = {
        id: this.generateEventId(),
        event: eventType,
        timestamp: new Date().toISOString(),
        data,
        metadata: {
          ...metadata,
          source: 'lims_api',
          version: '2.0'
        }
      };

      // Add to event queue
      this.eventQueue.push(event);
      this.metrics.events.total++;
      this.metrics.events.queued++;

      // Emit for real-time processing
      this.emit('event:published', event);

      logger.debug('Event published', { 
        eventType, 
        eventId: event.id,
        queueSize: this.eventQueue.length
      });

      return event.id;

    } catch (error) {
      logger.error('Failed to publish event', { eventType, error: error.message });
      throw error;
    }
  }

  // Event Processing
  startEventProcessor() {
    setInterval(() => {
      this.processEventQueue();
    }, 1000); // Process every second
  }

  async processEventQueue() {
    if (this.eventQueue.length === 0) return;

    const batchSize = Math.min(this.config.delivery.batchSize, this.eventQueue.length);
    const eventBatch = this.eventQueue.splice(0, batchSize);

    for (const event of eventBatch) {
      try {
        await this.processEvent(event);
        this.metrics.events.queued--;
      } catch (error) {
        logger.error('Failed to process event', { 
          eventId: event.id, 
          error: error.message 
        });
        this.metrics.events.failed++;
      }
    }
  }

  async processEvent(event) {
    const matchingWebhooks = this.findMatchingWebhooks(event);

    for (const webhook of matchingWebhooks) {
      if (!webhook.active) continue;

      // Check rate limits
      if (this.isRateLimited(webhook.id)) {
        this.metrics.rateLimit.blocked++;
        continue;
      }

      // Create delivery job
      const delivery = {
        id: this.generateDeliveryId(),
        webhookId: webhook.id,
        event,
        webhook,
        attempts: 0,
        maxAttempts: this.config.delivery.maxRetries,
        nextAttempt: Date.now(),
        createdAt: new Date().toISOString()
      };

      this.deliveryQueue.push(delivery);
      this.metrics.rateLimit.allowedRequests++;
    }
  }

  findMatchingWebhooks(event) {
    const matchingWebhooks = [];

    for (const webhook of this.webhooks.values()) {
      if (!webhook.active) continue;

      // Check event matching
      if (!this.eventMatches(event, webhook.events)) continue;

      // Check filters
      if (!this.filtersMatch(event, webhook.filters)) continue;

      matchingWebhooks.push(webhook);
    }

    return matchingWebhooks;
  }

  eventMatches(event, subscribedEvents) {
    if (subscribedEvents.includes('*')) return true;
    
    return subscribedEvents.some(subscribedEvent => {
      if (subscribedEvent === event.event) return true;
      
      // Support wildcard patterns (e.g., 'sample.*')
      if (subscribedEvent.endsWith('.*')) {
        const prefix = subscribedEvent.slice(0, -2);
        return event.event.startsWith(prefix + '.');
      }
      
      return false;
    });
  }

  filtersMatch(event, filters) {
    if (!filters || Object.keys(filters).length === 0) return true;

    for (const [key, value] of Object.entries(filters)) {
      const eventValue = this.getNestedValue(event, key);
      
      if (Array.isArray(value)) {
        if (!value.includes(eventValue)) return false;
      } else {
        if (eventValue !== value) return false;
      }
    }

    return true;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  isRateLimited(webhookId) {
    if (!this.config.rateLimit.enabled) return false;

    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;
    
    if (!this.rateLimitCounters.has(webhookId)) {
      this.rateLimitCounters.set(webhookId, []);
    }

    const timestamps = this.rateLimitCounters.get(webhookId);
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    this.rateLimitCounters.set(webhookId, validTimestamps);

    // Check limit
    if (validTimestamps.length >= this.config.rateLimit.maxPerMinute) {
      return true;
    }

    // Add current timestamp
    validTimestamps.push(now);
    return false;
  }

  // Delivery Processing
  startDeliveryProcessor() {
    setInterval(() => {
      this.processDeliveryQueue();
    }, 500); // Process every 500ms
  }

  async processDeliveryQueue() {
    if (this.deliveryQueue.length === 0) return;
    if (this.activeDeliveries.size >= this.config.delivery.concurrentDeliveries) return;

    const readyDeliveries = this.deliveryQueue.filter(delivery => 
      delivery.nextAttempt <= Date.now()
    );

    const deliveriesToProcess = readyDeliveries.slice(
      0, 
      this.config.delivery.concurrentDeliveries - this.activeDeliveries.size
    );

    for (const delivery of deliveriesToProcess) {
      // Remove from queue
      const index = this.deliveryQueue.indexOf(delivery);
      if (index > -1) {
        this.deliveryQueue.splice(index, 1);
      }

      // Process delivery
      this.processDelivery(delivery);
    }
  }

  async processDelivery(delivery) {
    this.activeDeliveries.add(delivery.id);
    const startTime = Date.now();

    try {
      delivery.attempts++;

      const payload = this.createPayload(delivery.event, delivery.webhook);
      const response = await this.deliverWebhook(delivery.webhook, payload);

      // Success
      const responseTime = Date.now() - startTime;
      await this.handleDeliverySuccess(delivery, response, responseTime);

    } catch (error) {
      // Failure
      const responseTime = Date.now() - startTime;
      await this.handleDeliveryFailure(delivery, error, responseTime);

    } finally {
      this.activeDeliveries.delete(delivery.id);
    }
  }

  createPayload(event, webhook) {
    const payload = {
      event: event.event,
      timestamp: event.timestamp,
      data: event.data,
      metadata: {
        ...event.metadata,
        webhook_id: webhook.id,
        delivery_id: this.generateDeliveryId()
      }
    };

    // Add signature if required
    if (this.config.security.requireSignature && webhook.secret) {
      payload.signature = this.generateSignature(payload, webhook.secret);
    }

    return payload;
  }

  async deliverWebhook(webhook, payload) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'LabScientific-LIMS-Webhook/1.0',
      [this.config.security.signatureHeader]: payload.signature,
      ...webhook.headers
    };

    // Remove signature from payload body
    const { signature, ...bodyPayload } = payload;

    const response = await axios.post(webhook.url, bodyPayload, {
      headers,
      timeout: this.config.delivery.timeout,
      maxContentLength: this.config.security.maxPayloadSize,
      validateStatus: status => status >= 200 && status < 300
    });

    return response;
  }

  generateSignature(payload, secret) {
    const { signature, ...payloadToSign } = payload;
    const payloadString = JSON.stringify(payloadToSign);
    
    return crypto
      .createHmac(this.config.security.algorithm, secret)
      .update(payloadString)
      .digest('hex');
  }

  async handleDeliverySuccess(delivery, response, responseTime) {
    const webhook = this.webhooks.get(delivery.webhookId);
    if (webhook) {
      // Update webhook stats
      webhook.deliveryStats.totalDeliveries++;
      webhook.deliveryStats.successfulDeliveries++;
      webhook.deliveryStats.lastDelivery = new Date().toISOString();
      webhook.deliveryStats.lastSuccess = new Date().toISOString();
      
      // Update average response time
      const totalSuccessful = webhook.deliveryStats.successfulDeliveries;
      const currentAvg = webhook.deliveryStats.avgResponseTime;
      webhook.deliveryStats.avgResponseTime = 
        (currentAvg * (totalSuccessful - 1) + responseTime) / totalSuccessful;
    }

    // Store delivery record
    this.deliveryHistory.set(delivery.id, {
      ...delivery,
      status: 'success',
      completedAt: new Date().toISOString(),
      responseTime,
      statusCode: response.status,
      responseHeaders: response.headers
    });

    // Update metrics
    this.metrics.events.delivered++;
    this.updateDeliveryMetrics(responseTime, true);

    logger.debug('Webhook delivered successfully', {
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      responseTime,
      statusCode: response.status
    });

    // Emit success event
    this.emit('delivery:success', {
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      event: delivery.event,
      responseTime
    });
  }

  async handleDeliveryFailure(delivery, error, responseTime) {
    const webhook = this.webhooks.get(delivery.webhookId);
    if (webhook) {
      webhook.deliveryStats.totalDeliveries++;
      webhook.deliveryStats.failedDeliveries++;
      webhook.deliveryStats.lastDelivery = new Date().toISOString();
      webhook.deliveryStats.lastFailure = new Date().toISOString();
    }

    // Update metrics based on error type
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      this.metrics.delivery.timeouts++;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      this.metrics.delivery.networkErrors++;
    }

    this.metrics.events.failed++;
    this.updateDeliveryMetrics(responseTime, false);

    // Retry logic
    if (delivery.attempts < delivery.maxAttempts) {
      const retryDelay = this.config.delivery.retryDelays[delivery.attempts - 1] || 
                        this.config.delivery.retryDelays[this.config.delivery.retryDelays.length - 1];
      
      delivery.nextAttempt = Date.now() + retryDelay;
      this.deliveryQueue.push(delivery);
      this.metrics.events.retried++;

      logger.warn('Webhook delivery failed, scheduling retry', {
        deliveryId: delivery.id,
        webhookId: delivery.webhookId,
        attempt: delivery.attempts,
        nextAttempt: new Date(delivery.nextAttempt).toISOString(),
        error: error.message
      });

    } else {
      // Max retries exceeded
      this.deliveryHistory.set(delivery.id, {
        ...delivery,
        status: 'failed',
        completedAt: new Date().toISOString(),
        responseTime,
        error: error.message,
        statusCode: error.response?.status
      });

      logger.error('Webhook delivery failed permanently', {
        deliveryId: delivery.id,
        webhookId: delivery.webhookId,
        attempts: delivery.attempts,
        error: error.message
      });

      // Emit failure event
      this.emit('delivery:failed', {
        deliveryId: delivery.id,
        webhookId: delivery.webhookId,
        event: delivery.event,
        error: error.message,
        attempts: delivery.attempts
      });
    }
  }

  updateDeliveryMetrics(responseTime, success) {
    const delivered = this.metrics.events.delivered;
    const failed = this.metrics.events.failed;
    const total = delivered + failed;

    // Update success rate
    this.metrics.delivery.successRate = total > 0 ? (delivered / total) * 100 : 0;

    // Update average response time (only for successful deliveries)
    if (success && delivered > 0) {
      const currentAvg = this.metrics.delivery.avgResponseTime;
      this.metrics.delivery.avgResponseTime = 
        (currentAvg * (delivered - 1) + responseTime) / delivered;
    }
  }

  updateWebhookMetrics() {
    let active = 0;
    let inactive = 0;

    for (const webhook of this.webhooks.values()) {
      if (webhook.active) {
        active++;
      } else {
        inactive++;
      }
    }

    this.metrics.webhooks = {
      total: this.webhooks.size,
      active,
      inactive
    };
  }

  // Cleanup and Maintenance
  startCleanupTasks() {
    // Clean up delivery history every hour
    setInterval(() => {
      this.cleanupDeliveryHistory();
    }, 60 * 60 * 1000);

    // Clean up rate limit counters every 5 minutes
    setInterval(() => {
      this.cleanupRateLimitCounters();
    }, 5 * 60 * 1000);
  }

  cleanupDeliveryHistory() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [deliveryId, delivery] of this.deliveryHistory) {
      const completedAt = new Date(delivery.completedAt).getTime();
      if (completedAt < cutoff) {
        this.deliveryHistory.delete(deliveryId);
      }
    }

    logger.debug('Delivery history cleanup completed', {
      remaining: this.deliveryHistory.size
    });
  }

  cleanupRateLimitCounters() {
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;

    for (const [webhookId, timestamps] of this.rateLimitCounters) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      
      if (validTimestamps.length === 0) {
        this.rateLimitCounters.delete(webhookId);
      } else {
        this.rateLimitCounters.set(webhookId, validTimestamps);
      }
    }
  }

  // Utility Methods
  generateWebhookId() {
    return `wh_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  generateDeliveryId() {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  generateSecret() {
    return crypto.randomBytes(this.config.security.secretLength).toString('hex');
  }

  // Persistence (Mock implementations)
  async persistWebhook(webhook) {
    // Mock implementation - replace with actual database persistence
    logger.debug('Persisting webhook', { webhookId: webhook.id });
  }

  async removeWebhook(webhookId) {
    // Mock implementation - replace with actual database removal
    logger.debug('Removing webhook from persistence', { webhookId });
  }

  // Management Methods
  getWebhooks() {
    return Array.from(this.webhooks.values());
  }

  getWebhook(webhookId) {
    return this.webhooks.get(webhookId);
  }

  getDeliveryHistory(webhookId = null, limit = 100) {
    let deliveries = Array.from(this.deliveryHistory.values());
    
    if (webhookId) {
      deliveries = deliveries.filter(d => d.webhookId === webhookId);
    }

    return deliveries
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
      .slice(0, limit);
  }

  getQueueStatus() {
    return {
      eventQueue: this.eventQueue.length,
      deliveryQueue: this.deliveryQueue.length,
      activeDeliveries: this.activeDeliveries.size,
      maxConcurrent: this.config.delivery.concurrentDeliveries
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      queues: this.getQueueStatus(),
      timestamp: new Date().toISOString()
    };
  }

  async testWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testEvent = {
      id: this.generateEventId(),
      event: 'ping',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        webhook_id: webhookId,
        message: 'This is a test webhook delivery'
      },
      metadata: {
        source: 'webhook_test',
        version: '2.0'
      }
    };

    try {
      const payload = this.createPayload(testEvent, webhook);
      const response = await this.deliverWebhook(webhook, payload);

      return {
        success: true,
        webhookId,
        statusCode: response.status,
        responseTime: Date.now() - Date.now(), // Would be calculated properly
        headers: response.headers,
        testedAt: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        webhookId,
        error: error.message,
        statusCode: error.response?.status,
        testedAt: new Date().toISOString()
      };
    }
  }

  async shutdown() {
    logger.info('Shutting down webhook service');

    // Stop accepting new events
    this.eventQueue.length = 0;

    // Wait for active deliveries to complete
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeDeliveries.size > 0 && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.activeDeliveries.size > 0) {
      logger.warn('Forcibly terminating active deliveries', {
        count: this.activeDeliveries.size
      });
    }

    logger.info('Webhook service shutdown complete');
  }
}

module.exports = WebhookService;