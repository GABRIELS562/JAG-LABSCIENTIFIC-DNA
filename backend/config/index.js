/**
 * Centralized Configuration
 * Single source of truth for all application configuration
 */

const path = require('path');

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // Database Configuration
  database: {
    path: path.join(__dirname, '../database/ashley_lims.db'),
    options: {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null,
      fileMustExist: false
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'http://localhost:5173'
      : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Security Configuration
  security: {
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: 100,
    helmetOptions: {
      contentSecurityPolicy: false, // Set to true in production with proper CSP
      crossOriginEmbedderPolicy: false
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: path.join(__dirname, '../logs'),
    maxFiles: 14,
    maxSize: '20m'
  },

  // Cache Configuration
  cache: {
    ttl: 60 * 1000, // 1 minute
    checkPeriod: 120 * 1000 // 2 minutes
  },

  // Workflow Configuration
  workflow: {
    stages: [
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
    ],
    batchSizes: {
      pcr: 20,
      electrophoresis: 15
    }
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    uploadDir: path.join(__dirname, '../uploads')
  },

  // API Configuration
  api: {
    baseUrl: '/api',
    version: 'v1',
    pagination: {
      defaultLimit: 50,
      maxLimit: 500
    }
  }
};

module.exports = config;