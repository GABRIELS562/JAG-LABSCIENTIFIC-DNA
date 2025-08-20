const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const { logger } = require('../utils/logger');
const { ValidationError } = require('./errorHandler');

/**
 * Security middleware collection for the LIMS backend
 */

/**
 * Rate limiting middleware
 */
const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString()
      }
    },
    skipSuccessfulRequests,
    skipFailedRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        error: {
          message,
          errorCode: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString()
        }
      });
    }
  });
};

/**
 * Different rate limits for different endpoints
 */
const rateLimits = {
  // Strict rate limit for authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
  }),

  // Moderate rate limit for API endpoints
  api: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
    skipSuccessfulRequests: true
  }),

  // Lenient rate limit for file uploads
  upload: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: 'Too many file uploads, please try again later.'
  })
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          // Remove potentially dangerous characters and scripts
          obj[key] = obj[key]
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/[<>"'&]/g, (match) => {
              const replacements = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
              };
              return replacements[match] || match;
            });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    }
  };

  try {
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
  } catch (error) {
    logger.error('Error sanitizing input', { error: error.message });
  }

  next();
};

/**
 * SQL injection prevention middleware
 */
const preventSqlInjection = (req, res, next) => {
  const sqlInjectionPatterns = [
    /('|(\-\-)|(;)|(\|)|(\*)|(%))|(union)|(select)|(insert)|(delete)|(update)|(drop)|(create)|(alter)|(exec)|(execute)|(script)/gi,
    /(\b(union|select|insert|delete|update|drop|create|alter|exec|execute|script)\b)/gi,
    /(\b(or|and)\b\s*(\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*'))/gi
  ];

  const checkForSqlInjection = (value) => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (checkForSqlInjection(obj[key])) {
          return true;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkObject(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  try {
    const hasInjection = 
      checkObject(req.body || {}) ||
      checkObject(req.query || {}) ||
      checkObject(req.params || {});

    if (hasInjection) {
      logger.warn('Potential SQL injection attempt detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid characters detected in request',
          errorCode: 'INVALID_INPUT',
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    logger.error('Error checking for SQL injection', { error: error.message });
  }

  next();
};

/**
 * CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS policy violation', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control'
  ],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};

/**
 * Helmet configuration for security headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * File upload security middleware
 */
const secureFileUpload = (options = {}) => {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB
    allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFiles = 5
  } = options;

  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    // Check number of files
    if (req.files.length > maxFiles) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Too many files. Maximum ${maxFiles} files allowed.`,
          errorCode: 'TOO_MANY_FILES'
        }
      });
    }

    // Check each file
    for (const file of req.files) {
      // Check file size
      if (file.size > maxFileSize) {
        return res.status(400).json({
          success: false,
          error: {
            message: `File ${file.originalname} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB.`,
            errorCode: 'FILE_TOO_LARGE'
          }
        });
      }

      // Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `File type ${file.mimetype} is not allowed.`,
            errorCode: 'INVALID_FILE_TYPE'
          }
        });
      }

      // Check file name for dangerous patterns
      const dangerousPatterns = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|jsp|php|asp|aspx)$/i;
      if (dangerousPatterns.test(file.originalname)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `File type is not allowed: ${file.originalname}`,
            errorCode: 'DANGEROUS_FILE_TYPE'
          }
        });
      }
    }

    next();
  };
};

/**
 * Request size limiting middleware
 */
const limitRequestSize = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = typeof limit === 'string' ? 
      parseInt(limit.replace(/\D/g, '')) * (limit.includes('mb') ? 1024 * 1024 : 1024) :
      limit;

    if (contentLength > maxSize) {
      logger.warn('Request size limit exceeded', {
        contentLength,
        maxSize,
        ip: req.ip,
        path: req.path
      });

      return res.status(413).json({
        success: false,
        error: {
          message: 'Request entity too large',
          errorCode: 'REQUEST_TOO_LARGE',
          maxSize: `${Math.floor(maxSize / 1024 / 1024)}MB`
        }
      });
    }

    next();
  };
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

module.exports = {
  rateLimits,
  sanitizeInput,
  preventSqlInjection,
  corsOptions,
  helmetConfig,
  secureFileUpload,
  limitRequestSize,
  securityHeaders,
  createRateLimit
};