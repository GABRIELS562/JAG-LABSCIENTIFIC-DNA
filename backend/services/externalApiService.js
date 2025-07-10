const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * External API Integration Service
 * Manages integrations with external systems and third-party APIs
 */
class ExternalApiService {
  constructor(options = {}) {
    this.config = {
      // Connection settings
      connection: {
        timeout: options.timeout || 30000,
        retries: options.retries || 3,
        retryDelay: options.retryDelay || 5000,
        keepAlive: options.keepAlive !== false,
        maxConnections: options.maxConnections || 100
      },

      // Security settings
      security: {
        requireAuth: options.requireAuth !== false,
        encryptSensitiveData: options.encryptSensitiveData || false,
        validateCertificates: options.validateCertificates !== false,
        allowedDomains: options.allowedDomains || [],
        rateLimitPerDomain: options.rateLimitPerDomain || 60 // per minute
      },

      // Cache settings
      cache: {
        enabled: options.cacheEnabled !== false,
        ttl: options.cacheTtl || 300000, // 5 minutes
        maxSize: options.cacheMaxSize || 1000,
        keyPrefix: options.cacheKeyPrefix || 'lims_api_'
      },

      // Monitoring settings
      monitoring: {
        logRequests: options.logRequests !== false,
        logResponses: options.logResponses || false,
        collectMetrics: options.collectMetrics !== false,
        alertOnFailures: options.alertOnFailures !== false
      }
    };

    // Service state
    this.integrations = new Map();
    this.apiClients = new Map();
    this.requestCache = new Map();
    this.rateLimiters = new Map();
    this.circuitBreakers = new Map();

    // Metrics
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0,
        rateLimited: 0
      },
      integrations: {
        total: 0,
        active: 0,
        errors: 0
      },
      performance: {
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        timeouts: 0
      },
      errors: {
        authentication: 0,
        network: 0,
        timeout: 0,
        serverError: 0,
        clientError: 0
      }
    };

    this.initializeService();
  }

  async initializeService() {
    try {
      // Load integrations configuration
      await this.loadIntegrations();

      // Initialize API clients
      this.initializeApiClients();

      // Setup monitoring
      this.setupMonitoring();

      logger.info('External API service initialized', {
        integrations: this.integrations.size,
        clients: this.apiClients.size
      });

    } catch (error) {
      logger.error('Failed to initialize external API service', error);
      throw error;
    }
  }

  async loadIntegrations() {
    // Mock integrations - replace with actual configuration
    const mockIntegrations = [
      {
        id: 'osiris_str',
        name: 'Osiris STR Analysis',
        type: 'laboratory_instrument',
        baseUrl: 'http://localhost:8080/osiris',
        auth: {
          type: 'api_key',
          apiKey: process.env.OSIRIS_API_KEY || 'test_key'
        },
        endpoints: {
          analyze: '/analyze',
          results: '/results/{id}',
          status: '/status'
        },
        active: true,
        settings: {
          maxFileSize: 100 * 1024 * 1024, // 100MB
          supportedFormats: ['fsa', 'hid'],
          timeout: 60000 // 1 minute for analysis
        }
      },
      {
        id: 'lab_information_system',
        name: 'Legacy LIS Integration',
        type: 'laboratory_system',
        baseUrl: 'https://api.legacy-lis.com/v1',
        auth: {
          type: 'oauth2',
          clientId: process.env.LIS_CLIENT_ID || 'test_client',
          clientSecret: process.env.LIS_CLIENT_SECRET || 'test_secret',
          tokenUrl: 'https://api.legacy-lis.com/oauth/token'
        },
        endpoints: {
          patients: '/patients',
          orders: '/orders',
          results: '/results'
        },
        active: true,
        settings: {
          syncInterval: 300000, // 5 minutes
          batchSize: 100
        }
      },
      {
        id: 'reference_database',
        name: 'DNA Reference Database',
        type: 'reference_system',
        baseUrl: 'https://api.dna-reference.gov/v2',
        auth: {
          type: 'certificate',
          certPath: process.env.DNA_REF_CERT_PATH,
          keyPath: process.env.DNA_REF_KEY_PATH
        },
        endpoints: {
          search: '/search',
          submit: '/submit',
          status: '/submissions/{id}'
        },
        active: process.env.NODE_ENV === 'production',
        settings: {
          requireEncryption: true,
          complianceLevel: 'high',
          auditRequired: true
        }
      },
      {
        id: 'notification_service',
        name: 'External Notification Service',
        type: 'communication',
        baseUrl: 'https://api.notifications.com/v1',
        auth: {
          type: 'bearer',
          token: process.env.NOTIFICATION_TOKEN
        },
        endpoints: {
          send: '/messages',
          templates: '/templates',
          status: '/status/{id}'
        },
        active: true,
        settings: {
          defaultChannel: 'email',
          retryOnFailure: true
        }
      },
      {
        id: 'quality_system',
        name: 'Quality Management System',
        type: 'quality_system',
        baseUrl: 'https://qms.company.com/api/v1',
        auth: {
          type: 'basic',
          username: process.env.QMS_USERNAME,
          password: process.env.QMS_PASSWORD
        },
        endpoints: {
          nonconformance: '/nonconformance',
          corrective_action: '/corrective-actions',
          audit: '/audits'
        },
        active: true,
        settings: {
          autoReporting: true,
          criticalThreshold: 5
        }
      }
    ];

    for (const integration of mockIntegrations) {
      this.integrations.set(integration.id, {
        ...integration,
        status: 'unknown',
        lastHealthCheck: null,
        errorCount: 0,
        lastError: null,
        requestCount: 0,
        avgResponseTime: 0
      });
    }

    this.metrics.integrations.total = this.integrations.size;
  }

  initializeApiClients() {
    for (const [integrationId, integration] of this.integrations) {
      try {
        const client = this.createApiClient(integration);
        this.apiClients.set(integrationId, client);
        
        // Initialize circuit breaker
        this.circuitBreakers.set(integrationId, {
          state: 'closed', // closed, open, half-open
          failures: 0,
          lastFailure: null,
          threshold: 5,
          timeout: 60000 // 1 minute
        });

        if (integration.active) {
          this.metrics.integrations.active++;
        }

      } catch (error) {
        logger.error('Failed to initialize API client', {
          integrationId,
          error: error.message
        });
        integration.status = 'error';
        integration.lastError = error.message;
        this.metrics.integrations.errors++;
      }
    }
  }

  createApiClient(integration) {
    const client = axios.create({
      baseURL: integration.baseUrl,
      timeout: integration.settings?.timeout || this.config.connection.timeout,
      validateStatus: status => status >= 200 && status < 500,
      headers: {
        'User-Agent': 'LabScientific-LIMS/2.0',
        'Content-Type': 'application/json'
      }
    });

    // Add authentication interceptor
    this.addAuthInterceptor(client, integration);

    // Add request/response interceptors
    this.addLoggingInterceptors(client, integration);

    // Add retry interceptor
    this.addRetryInterceptor(client, integration);

    return client;
  }

  addAuthInterceptor(client, integration) {
    client.interceptors.request.use(async config => {
      const auth = integration.auth;

      switch (auth.type) {
        case 'api_key':
          config.headers['X-API-Key'] = auth.apiKey;
          break;

        case 'bearer':
          config.headers['Authorization'] = `Bearer ${auth.token}`;
          break;

        case 'basic':
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          config.headers['Authorization'] = `Basic ${credentials}`;
          break;

        case 'oauth2':
          const token = await this.getOAuth2Token(integration);
          config.headers['Authorization'] = `Bearer ${token}`;
          break;

        case 'certificate':
          // Certificate-based auth would be configured at client level
          break;

        default:
          logger.warn('Unknown auth type', { 
            integrationId: integration.id, 
            authType: auth.type 
          });
      }

      return config;
    });
  }

  addLoggingInterceptors(client, integration) {
    // Request interceptor
    client.interceptors.request.use(config => {
      const requestId = this.generateRequestId();
      config.metadata = { startTime: Date.now(), requestId };

      if (this.config.monitoring.logRequests) {
        logger.debug('External API request', {
          integrationId: integration.id,
          requestId,
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: this.sanitizeHeaders(config.headers)
        });
      }

      return config;
    });

    // Response interceptor
    client.interceptors.response.use(
      response => {
        const duration = Date.now() - response.config.metadata.startTime;
        
        // Update metrics
        this.updateRequestMetrics(integration.id, duration, true);

        if (this.config.monitoring.logResponses) {
          logger.debug('External API response', {
            integrationId: integration.id,
            requestId: response.config.metadata.requestId,
            status: response.status,
            duration,
            dataSize: JSON.stringify(response.data).length
          });
        }

        return response;
      },
      error => {
        const duration = error.config?.metadata ? 
          Date.now() - error.config.metadata.startTime : 0;

        // Update metrics
        this.updateRequestMetrics(integration.id, duration, false, error);

        logger.error('External API error', {
          integrationId: integration.id,
          requestId: error.config?.metadata?.requestId,
          error: error.message,
          status: error.response?.status,
          duration
        });

        // Update circuit breaker
        this.updateCircuitBreaker(integration.id, false);

        return Promise.reject(error);
      }
    );
  }

  addRetryInterceptor(client, integration) {
    client.interceptors.response.use(undefined, async error => {
      const config = error.config;

      // Don't retry if no config or already retried max times
      if (!config || config.__retryCount >= this.config.connection.retries) {
        return Promise.reject(error);
      }

      // Initialize retry count
      config.__retryCount = config.__retryCount || 0;
      config.__retryCount++;

      // Only retry on network errors or 5xx responses
      const shouldRetry = !error.response || 
        (error.response.status >= 500 && error.response.status < 600);

      if (!shouldRetry) {
        return Promise.reject(error);
      }

      // Wait before retry
      await new Promise(resolve => 
        setTimeout(resolve, this.config.connection.retryDelay * config.__retryCount)
      );

      logger.debug('Retrying external API request', {
        integrationId: integration.id,
        attempt: config.__retryCount,
        error: error.message
      });

      return client(config);
    });
  }

  async getOAuth2Token(integration) {
    const tokenKey = `oauth_token_${integration.id}`;
    
    // Check cache first
    if (this.requestCache.has(tokenKey)) {
      const cached = this.requestCache.get(tokenKey);
      if (cached.expiresAt > Date.now()) {
        return cached.token;
      }
    }

    try {
      const response = await axios.post(integration.auth.tokenUrl, {
        grant_type: 'client_credentials',
        client_id: integration.auth.clientId,
        client_secret: integration.auth.clientSecret
      });

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;

      // Cache token
      this.requestCache.set(tokenKey, {
        token,
        expiresAt: Date.now() + (expiresIn - 60) * 1000 // Refresh 1 minute early
      });

      return token;

    } catch (error) {
      logger.error('Failed to get OAuth2 token', {
        integrationId: integration.id,
        error: error.message
      });
      throw error;
    }
  }

  // Integration Methods
  async callExternalApi(integrationId, endpoint, options = {}) {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    if (!integration.active) {
      throw new Error(`Integration is not active: ${integrationId}`);
    }

    // Check circuit breaker
    if (!this.checkCircuitBreaker(integrationId)) {
      throw new Error(`Circuit breaker is open for integration: ${integrationId}`);
    }

    // Check rate limit
    if (this.isRateLimited(integrationId)) {
      this.metrics.requests.rateLimited++;
      throw new Error(`Rate limit exceeded for integration: ${integrationId}`);
    }

    const client = this.apiClients.get(integrationId);
    if (!client) {
      throw new Error(`API client not found: ${integrationId}`);
    }

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(integrationId, endpoint, options);
      if (this.config.cache.enabled && options.method === 'GET') {
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          this.metrics.requests.cached++;
          return cached;
        }
      }

      // Make request
      const response = await client.request({
        url: endpoint,
        method: options.method || 'GET',
        data: options.data,
        params: options.params,
        headers: options.headers,
        ...options.config
      });

      // Cache successful GET responses
      if (this.config.cache.enabled && options.method === 'GET' && response.status < 300) {
        this.setCachedResponse(cacheKey, response.data);
      }

      // Update circuit breaker
      this.updateCircuitBreaker(integrationId, true);

      this.metrics.requests.total++;
      this.metrics.requests.successful++;

      return response.data;

    } catch (error) {
      this.metrics.requests.total++;
      this.metrics.requests.failed++;

      // Update integration error stats
      integration.errorCount++;
      integration.lastError = error.message;

      throw error;
    }
  }

  // Specific Integration Methods
  async analyzeWithOsiris(sampleData, files) {
    try {
      const formData = new FormData();
      formData.append('sampleData', JSON.stringify(sampleData));
      
      for (const file of files) {
        formData.append('files', file);
      }

      const result = await this.callExternalApi('osiris_str', '/analyze', {
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        config: {
          timeout: 60000 // 1 minute for analysis
        }
      });

      logger.info('Osiris analysis initiated', {
        sampleId: sampleData.id,
        analysisId: result.analysisId
      });

      return result;

    } catch (error) {
      logger.error('Osiris analysis failed', {
        sampleId: sampleData.id,
        error: error.message
      });
      throw error;
    }
  }

  async getOsirisResults(analysisId) {
    try {
      const endpoint = `/results/${analysisId}`;
      const result = await this.callExternalApi('osiris_str', endpoint);

      return result;

    } catch (error) {
      logger.error('Failed to get Osiris results', {
        analysisId,
        error: error.message
      });
      throw error;
    }
  }

  async syncWithLegacyLIS(patientId, orderData) {
    try {
      // First, check if patient exists
      let patient;
      try {
        patient = await this.callExternalApi('lab_information_system', `/patients/${patientId}`);
      } catch (error) {
        if (error.response?.status === 404) {
          // Create patient if not found
          patient = await this.callExternalApi('lab_information_system', '/patients', {
            method: 'POST',
            data: orderData.patient
          });
        } else {
          throw error;
        }
      }

      // Create order
      const order = await this.callExternalApi('lab_information_system', '/orders', {
        method: 'POST',
        data: {
          ...orderData,
          patientId: patient.id
        }
      });

      logger.info('LIS sync completed', {
        patientId,
        orderId: order.id
      });

      return { patient, order };

    } catch (error) {
      logger.error('LIS sync failed', {
        patientId,
        error: error.message
      });
      throw error;
    }
  }

  async submitToReferenceDatabase(dnaProfile, metadata) {
    try {
      // Encrypt sensitive data if required
      let encryptedProfile = dnaProfile;
      if (this.config.security.encryptSensitiveData) {
        encryptedProfile = this.encryptData(dnaProfile);
      }

      const submission = await this.callExternalApi('reference_database', '/submit', {
        method: 'POST',
        data: {
          profile: encryptedProfile,
          metadata,
          timestamp: new Date().toISOString()
        }
      });

      logger.info('Reference database submission completed', {
        submissionId: submission.id,
        profileId: dnaProfile.id
      });

      return submission;

    } catch (error) {
      logger.error('Reference database submission failed', {
        profileId: dnaProfile.id,
        error: error.message
      });
      throw error;
    }
  }

  async sendExternalNotification(message, channel = 'email') {
    try {
      const notification = await this.callExternalApi('notification_service', '/messages', {
        method: 'POST',
        data: {
          channel,
          message,
          timestamp: new Date().toISOString()
        }
      });

      logger.info('External notification sent', {
        notificationId: notification.id,
        channel
      });

      return notification;

    } catch (error) {
      logger.error('External notification failed', {
        channel,
        error: error.message
      });
      throw error;
    }
  }

  async reportToQualitySystem(incident) {
    try {
      const report = await this.callExternalApi('quality_system', '/nonconformance', {
        method: 'POST',
        data: {
          ...incident,
          reportedAt: new Date().toISOString(),
          source: 'lims_automated'
        }
      });

      logger.info('Quality system report submitted', {
        reportId: report.id,
        incidentType: incident.type
      });

      return report;

    } catch (error) {
      logger.error('Quality system reporting failed', {
        incidentType: incident.type,
        error: error.message
      });
      throw error;
    }
  }

  // Health Monitoring
  async checkIntegrationHealth(integrationId) {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    try {
      // Use status endpoint if available, otherwise try a simple GET
      const endpoint = integration.endpoints.status || '/health';
      
      const startTime = Date.now();
      const response = await this.callExternalApi(integrationId, endpoint, {
        config: { timeout: 10000 } // 10 second timeout for health checks
      });
      const responseTime = Date.now() - startTime;

      integration.status = 'healthy';
      integration.lastHealthCheck = new Date().toISOString();
      integration.avgResponseTime = responseTime;

      return {
        integrationId,
        status: 'healthy',
        responseTime,
        data: response
      };

    } catch (error) {
      integration.status = 'unhealthy';
      integration.lastHealthCheck = new Date().toISOString();
      integration.lastError = error.message;

      return {
        integrationId,
        status: 'unhealthy',
        error: error.message,
        lastSuccess: integration.lastHealthCheck
      };
    }
  }

  async checkAllIntegrationsHealth() {
    const healthChecks = [];

    for (const [integrationId, integration] of this.integrations) {
      if (integration.active) {
        try {
          const health = await this.checkIntegrationHealth(integrationId);
          healthChecks.push(health);
        } catch (error) {
          healthChecks.push({
            integrationId,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    return {
      overall: healthChecks.every(h => h.status === 'healthy') ? 'healthy' : 'degraded',
      integrations: healthChecks,
      checkedAt: new Date().toISOString()
    };
  }

  // Utility Methods
  updateRequestMetrics(integrationId, duration, success, error = null) {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      integration.requestCount++;
      
      // Update average response time
      const totalRequests = integration.requestCount;
      const currentAvg = integration.avgResponseTime;
      integration.avgResponseTime = (currentAvg * (totalRequests - 1) + duration) / totalRequests;
    }

    // Update global metrics
    this.metrics.performance.avgResponseTime = 
      (this.metrics.performance.avgResponseTime * (this.metrics.requests.total - 1) + duration) / 
      this.metrics.requests.total;

    this.metrics.performance.minResponseTime = Math.min(
      this.metrics.performance.minResponseTime, 
      duration
    );

    this.metrics.performance.maxResponseTime = Math.max(
      this.metrics.performance.maxResponseTime, 
      duration
    );

    // Update error metrics
    if (!success && error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        this.metrics.performance.timeouts++;
        this.metrics.errors.timeout++;
      } else if (error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          this.metrics.errors.clientError++;
        } else if (status >= 500) {
          this.metrics.errors.serverError++;
        }
      } else {
        this.metrics.errors.network++;
      }
    }
  }

  checkCircuitBreaker(integrationId) {
    const breaker = this.circuitBreakers.get(integrationId);
    if (!breaker) return true;

    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return true;

      case 'open':
        if (now - breaker.lastFailure > breaker.timeout) {
          breaker.state = 'half-open';
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return true;
    }
  }

  updateCircuitBreaker(integrationId, success) {
    const breaker = this.circuitBreakers.get(integrationId);
    if (!breaker) return;

    if (success) {
      breaker.failures = 0;
      breaker.state = 'closed';
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();

      if (breaker.failures >= breaker.threshold) {
        breaker.state = 'open';
        logger.warn('Circuit breaker opened', { integrationId });
      }
    }
  }

  isRateLimited(integrationId) {
    if (!this.config.security.rateLimitPerDomain) return false;

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!this.rateLimiters.has(integrationId)) {
      this.rateLimiters.set(integrationId, []);
    }

    const requests = this.rateLimiters.get(integrationId);
    
    // Remove old requests
    const validRequests = requests.filter(time => time > windowStart);
    this.rateLimiters.set(integrationId, validRequests);

    // Check limit
    if (validRequests.length >= this.config.security.rateLimitPerDomain) {
      return true;
    }

    // Add current request
    validRequests.push(now);
    return false;
  }

  generateCacheKey(integrationId, endpoint, options) {
    const keyData = {
      integrationId,
      endpoint,
      params: options.params,
      method: options.method || 'GET'
    };

    return this.config.cache.keyPrefix + 
           crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  getCachedResponse(key) {
    const cached = this.requestCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    this.requestCache.delete(key);
    return null;
  }

  setCachedResponse(key, data) {
    if (this.requestCache.size >= this.config.cache.maxSize) {
      // Remove oldest entry
      const firstKey = this.requestCache.keys().next().value;
      this.requestCache.delete(firstKey);
    }

    this.requestCache.set(key, {
      data,
      expiresAt: Date.now() + this.config.cache.ttl
    });
  }

  encryptData(data) {
    // Mock encryption - implement actual encryption
    return {
      encrypted: true,
      data: Buffer.from(JSON.stringify(data)).toString('base64')
    };
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  setupMonitoring() {
    // Setup health check interval
    setInterval(async () => {
      try {
        await this.checkAllIntegrationsHealth();
      } catch (error) {
        logger.error('Health check failed', error);
      }
    }, 60000); // Every minute

    // Setup cache cleanup
    setInterval(() => {
      this.cleanupCache();
    }, 300000); // Every 5 minutes
  }

  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.requestCache) {
      if (cached.expiresAt <= now) {
        this.requestCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup completed', { entriesRemoved: cleaned });
    }
  }

  // Management Methods
  getIntegrations() {
    return Array.from(this.integrations.values());
  }

  getIntegration(integrationId) {
    return this.integrations.get(integrationId);
  }

  getMetrics() {
    return {
      ...this.metrics,
      cache: {
        size: this.requestCache.size,
        maxSize: this.config.cache.maxSize,
        hitRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.cached / this.metrics.requests.total * 100).toFixed(1) + '%' : '0%'
      },
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    logger.info('Shutting down external API service');

    // Clear all caches
    this.requestCache.clear();
    this.rateLimiters.clear();

    logger.info('External API service shutdown complete');
  }
}

module.exports = ExternalApiService;