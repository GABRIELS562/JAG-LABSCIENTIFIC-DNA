const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const { logger, createContextLogger } = require('../utils/logger');
const { performanceMonitor } = require('./performanceMonitoring');

// Request ID generator
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Request correlation middleware
const correlationMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Create logger with request context
  req.logger = createContextLogger(`Request:${requestId}`);
  
  next();
};

// Enhanced request logging middleware
const requestLoggingMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  req.logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentLength: req.get('content-length'),
    contentType: req.get('content-type'),
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    headers: {
      authorization: req.get('authorization') ? '[REDACTED]' : undefined,
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-real-ip': req.get('x-real-ip')
    }
  });

  // Override res.json to capture response data
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  const originalEnd = res.end.bind(res);

  let responseBody = null;
  let responseSize = 0;

  res.json = function(obj) {
    responseBody = obj;
    responseSize = JSON.stringify(obj).length;
    return originalJson(obj);
  };

  res.send = function(data) {
    if (typeof data === 'string') {
      responseSize = Buffer.byteLength(data, 'utf8');
    } else if (Buffer.isBuffer(data)) {
      responseSize = data.length;
    }
    return originalSend(data);
  };

  res.end = function(...args) {
    const duration = Date.now() - start;
    
    // Log response
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    req.logger[logLevel]('Request completed', {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: responseSize || parseInt(res.get('content-length')) || 0,
      success: res.statusCode < 400,
      error: res.statusCode >= 400 ? {
        code: res.statusCode,
        message: responseBody?.error?.message || 'Unknown error'
      } : undefined
    });

    // Record performance metrics
    performanceMonitor.recordMetric(`request:${req.method}:${req.route?.path || 'unknown'}`, {
      operationId: `request:${req.method}:${req.route?.path || 'unknown'}`,
      duration,
      timestamp: Date.now(),
      metadata: {
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
        responseSize,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    });

    return originalEnd(...args);
  };

  next();
};

// Response time header middleware
const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });
  
  next();
};

// API versioning middleware
const apiVersionMiddleware = (req, res, next) => {
  const version = req.headers['api-version'] || req.query.version || 'v1';
  req.apiVersion = version;
  res.setHeader('API-Version', version);
  next();
};

// Request size monitoring
const requestSizeMiddleware = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  
  if (contentLength > 0) {
    req.logger.debug('Request size', { 
      contentLength,
      contentType: req.get('content-type')
    });
  }
  
  // Warn about large requests (> 10MB)
  if (contentLength > 10 * 1024 * 1024) {
    req.logger.warn('Large request detected', { 
      contentLength,
      path: req.path,
      method: req.method
    });
  }
  
  next();
};

// Security headers middleware
const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Disable for compatibility
});

// Compression middleware with custom configuration
const compressionMiddleware = compression({
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Only compress if response is larger than 1kb
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024 // Only compress if response is larger than 1kb
});

// Rate limiting middleware
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      errorCode: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      }
    });
  }
});

// Slow down middleware for progressive delays
const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipFailedRequests: true,
  onLimitReached: (req, res, options) => {
    req.logger.warn('Slow down limit reached', {
      ip: req.ip,
      delay: options.delay,
      path: req.path
    });
  }
});

// Error boundary middleware for monitoring
const errorMonitoringMiddleware = (err, req, res, next) => {
  // Log the error with request context
  req.logger.error('Request error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code || err.statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      body: req.method !== 'GET' ? req.body : undefined
    }
  });

  // Record error metric
  performanceMonitor.recordMetric('errors', {
    operationId: 'error',
    duration: 0,
    timestamp: Date.now(),
    metadata: {
      errorName: err.name,
      errorMessage: err.message,
      statusCode: err.statusCode || 500,
      path: req.path,
      method: req.method
    }
  });

  next(err);
};

// Combined monitoring middleware
const createMonitoringMiddleware = (options = {}) => {
  const {
    enableRateLimit = true,
    enableSlowDown = true,
    enableCompression = true,
    enableSecurity = true,
    enableLogging = true
  } = options;

  const middlewares = [];

  // Core monitoring
  middlewares.push(correlationMiddleware);
  middlewares.push(responseTimeMiddleware);
  middlewares.push(requestSizeMiddleware);
  
  if (enableLogging) {
    middlewares.push(requestLoggingMiddleware);
  }

  // Security
  if (enableSecurity) {
    middlewares.push(securityHeadersMiddleware);
  }

  // Performance
  if (enableCompression) {
    middlewares.push(compressionMiddleware);
  }

  if (enableRateLimit) {
    middlewares.push(rateLimitMiddleware);
  }

  if (enableSlowDown) {
    middlewares.push(slowDownMiddleware);
  }

  // API versioning
  middlewares.push(apiVersionMiddleware);

  return middlewares;
};

module.exports = {
  correlationMiddleware,
  requestLoggingMiddleware,
  responseTimeMiddleware,
  apiVersionMiddleware,
  requestSizeMiddleware,
  securityHeadersMiddleware,
  compressionMiddleware,
  rateLimitMiddleware,
  slowDownMiddleware,
  errorMonitoringMiddleware,
  createMonitoringMiddleware
};