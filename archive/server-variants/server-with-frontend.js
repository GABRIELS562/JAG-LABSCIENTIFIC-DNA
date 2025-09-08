const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const fs = require('fs');
const Database = require('better-sqlite3');

// Import middleware and utilities
const { globalErrorHandler } = require("./middleware/errorHandler");
const { sanitizeInput } = require("./middleware/validation");
const { requestLogger, logger } = require("./utils/logger");
const { ResponseHandler } = require("./utils/responseHandler");
const { memoryManager } = require("./utils/memoryManager");
const streamingResponse = require("./utils/streamingResponse");

// Import DevOps middleware and services
const { register: metricsRegister, metricsMiddleware, trackDatabaseQuery, trackSampleProcessed, trackBatchCreated } = require('./middleware/metrics');
const { healthCheckService } = require('./middleware/healthcheck');
const { backgroundJobService } = require('./services/backgroundJobs');
const performanceRoutes = require('./routes/performance');

// Import routes
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const dbViewerRoutes = require("./routes/database-viewer");
const geneticAnalysisRoutes = require("./routes/genetic-analysis");
const reportsRoutes = require("./routes/reports");
const qmsRoutes = require("./routes/qms");
const inventoryRoutes = require("./routes/inventory");
const aiMlRoutes = require("./routes/ai-ml");
const adminRoutes = require('./routes/admin');
const paternityRoutes = require('./routes/paternity');
const strMatchingRoutes = require('./routes/str-matching');
const forensicReportsRoutes = require('./routes/forensic-reports');
const caseManagementRoutes = require('./routes/case-management');

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize database connection with memory optimization
const dbPath = path.join(__dirname, 'database', 'ashley_lims.db');
let db = null;
let dbPool = null;

try {
  // Try to use database pool first
  const DatabasePool = require('./utils/databasePool');
  try {
    dbPool = new DatabasePool(dbPath, {
      maxConnections: 3,
      verbose: process.env.NODE_ENV === 'development' ? console.log : null
    });
    db = dbPool.getWriteConnection();
    logger.info('Database pool initialized successfully', { dbPath });
  } catch (poolError) {
    logger.warn('Database pool failed, falling back to single connection', { error: poolError.message });
    
    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null,
      fileMustExist: false
    });
    
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 500000');
    db.pragma('temp_store = memory');
    db.pragma('mmap_size = 134217728');
    
    logger.info('Single database connection initialized successfully', { dbPath });
  }
} catch (error) {
  logger.error('Database initialization failed', { error: error.message, dbPath });
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

const app = express();

// Initialize memory management
memoryManager.initialize({
  memoryThreshold: 0.75,
  optimizations: {
    enableGC: true,
    enableCaching: true,
    enableStreaming: true,
    enableMemoryLimits: true
  }
});

app.set('trust proxy', 1);

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    const size = buf.length;
    if (size > 5 * 1024 * 1024) {
      logger.warn('Large request payload detected', {
        size: Math.round(size / 1024 / 1024) + 'MB',
        url: req.url
      });
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '5mb',
  parameterLimit: 1000
}));

// Memory and DevOps middleware
const { memoryMonitor } = require('./middleware/memoryMonitor');
app.use(memoryMonitor.middleware());
app.use(metricsMiddleware);
app.use(sanitizeInput);

// Static file serving for frontend
const distPath = path.join(__dirname, '../dist');
console.log('Looking for dist at:', distPath);

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  logger.info('Serving static files from', { path: distPath });
} else {
  logger.warn('Frontend dist directory not found', { path: distPath });
}

// Database helper functions (keeping existing functions)
function getSamplesWithPagination(page = 1, limit = 50, filters = {}) {
  try {
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    const conditions = [];
    if (filters.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'pending':
          conditions.push("workflow_status IN ('sample_collected', 'extraction_ready', 'pcr_ready') AND batch_id IS NULL AND extraction_id IS NULL");
          break;
        case 'extraction_ready':
          conditions.push("workflow_status IN ('sample_collected', 'extraction_ready') AND extraction_id IS NULL");
          break;
        case 'extraction_batched':
          conditions.push("workflow_status IN ('extraction_batched', 'extraction_in_progress') AND extraction_id IS NOT NULL");
          break;
        case 'pcr_batched':
          conditions.push("(workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%'))");
          break;
        case 'electro_batched':
          conditions.push("(workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%'))");
          break;
        case 'rerun_batched':
          conditions.push("(workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR'))");
          break;
        case 'completed':
          conditions.push("workflow_status IN ('analysis_completed')");
          break;
        case 'processing':
          conditions.push("workflow_status IN ('pcr_batched', 'pcr_completed')");
          break;
        default:
          conditions.push('status = ?');
          params.push(filters.status);
      }
    }
    if (filters.search) {
      conditions.push('(lab_number LIKE ? OR name LIKE ? OR surname LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const countQuery = `SELECT COUNT(*) as total FROM samples ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const total = countStmt.get(...params).total;
    
    const dataQuery = `
      SELECT 
        id, lab_number, name, surname, relation, status, 
        collection_date, workflow_status, case_number, batch_id, lab_batch_number
      FROM samples 
      ${whereClause}
      ORDER BY lab_number ASC 
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    const dataStmt = db.prepare(dataQuery);
    const samples = dataStmt.all(...params);
    
    return {
      data: samples,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching samples with pagination', { error: error.message, page, limit, filters });
    return { data: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
  } finally {
    trackDatabaseQuery('SELECT', 'samples', Date.now() - Date.now());
  }
}

const { LRUCache } = require('lru-cache');
const sampleCountsCache = new LRUCache({
  max: 100,
  ttl: 30000,
  updateAgeOnGet: false,
  allowStale: false
});

function getSampleCounts() {
  try {
    const cacheKey = 'sample_counts';
    
    const cached = sampleCountsCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN workflow_status IN ('sample_collected', 'extraction_ready', 'pcr_ready') AND batch_id IS NULL AND extraction_id IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN workflow_status IN ('sample_collected', 'extraction_ready') AND extraction_id IS NULL THEN 1 END) as extraction_ready,
        COUNT(CASE WHEN workflow_status IN ('extraction_batched', 'extraction_in_progress', 'extraction_completed') AND extraction_id IS NOT NULL THEN 1 END) as extraction_batched,
        COUNT(CASE WHEN workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'JDS_%' AND lab_batch_number NOT LIKE '%_RR') THEN 1 END) as pcrBatched,
        COUNT(CASE WHEN workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%') THEN 1 END) as electroBatched,
        COUNT(CASE WHEN workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR') THEN 1 END) as rerunBatched,
        COUNT(CASE WHEN workflow_status IN ('analysis_completed') THEN 1 END) as completed,
        COUNT(CASE WHEN workflow_status IN ('pcr_batched', 'pcr_completed') THEN 1 END) as processing
      FROM samples
    `);
    
    const result = stmt.get();
    sampleCountsCache.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Error getting sample counts', { error: error.message });
    return { total: 0, active: 0, pending: 0, pcrBatched: 0, electroBatched: 0, rerunBatched: 0, completed: 0, processing: 0 };
  }
}

function createSample(sampleData) {
  const transaction = db.transaction(() => {
    try {
      if (!sampleData.lab_number || !sampleData.name || !sampleData.surname) {
        throw new Error('Missing required fields: lab_number, name, or surname');
      }
      
      const duplicateCheck = db.prepare('SELECT id FROM samples WHERE lab_number = ?');
      const existing = duplicateCheck.get(sampleData.lab_number);
      
      if (existing) {
        throw new Error(`Sample with lab number ${sampleData.lab_number} already exists`);
      }
      
      const stmt = db.prepare(`
        INSERT INTO samples (
          lab_number, name, surname, relation, status, phone_number,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const result = stmt.run(
        sampleData.lab_number,
        sampleData.name.trim(),
        sampleData.surname.trim(),
        sampleData.relation || 'Child',
        sampleData.status || 'pending',
        sampleData.phone_number
      );
      
      sampleCountsCache.clear();
      trackSampleProcessed('created', 'registration');
      
      return { id: result.lastInsertRowid, ...sampleData };
    } catch (error) {
      logger.error('Error creating sample', { error: error.message, sampleData });
      throw error;
    }
  });
  
  return transaction();
}

// API Routes
try {
  app.use("/api/auth", authRoutes);
  app.use("/api/genetic-analysis", geneticAnalysisRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/qms", qmsRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/ai-ml", aiMlRoutes);
  app.use("/api/paternity", paternityRoutes);
  app.use("/api/str-matching", strMatchingRoutes);
  app.use("/api/forensic-reports", forensicReportsRoutes);
  app.use("/api/case-management", caseManagementRoutes);
} catch (error) {
  logger.warn('Some routes not available, using fallback endpoints', { error: error.message });
}

// Core API endpoints
app.get("/api/test", (req, res) => {
  ResponseHandler.success(res, {
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

app.get("/api/samples", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const filters = {
      status: req.query.status,
      search: req.query.search
    };
    
    const result = getSamplesWithPagination(page, limit, filters);
    ResponseHandler.paginated(res, result.data, result.pagination);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch samples', error);
  }
});

app.get("/api/samples/counts", (req, res) => {
  try {
    const counts = getSampleCounts();
    ResponseHandler.success(res, counts);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get sample counts', error);
  }
});

app.post("/api/samples", (req, res) => {
  try {
    const newSample = createSample(req.body);
    ResponseHandler.success(res, newSample, 'Sample created successfully', 201);
  } catch (error) {
    logger.error('Sample creation failed', { error: error.message, body: req.body });
    ResponseHandler.error(res, error.message || 'Failed to create sample', 500);
  }
});

// Health endpoints
app.get('/health', healthCheckService.healthMiddleware());
app.get('/health/live', healthCheckService.livenessMiddleware());
app.get('/health/ready', healthCheckService.readinessMiddleware());

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType);
    const metrics = await metricsRegister.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error: error.message });
    res.status(500).end('Failed to generate metrics');
  }
});

// Performance routes
app.use('/performance', performanceRoutes);
app.use('/admin', adminRoutes);

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      message: 'Frontend not found',
      error: 'Frontend build files are missing'
    });
  }
});

// Global error handler
app.use(globalErrorHandler);

const port = process.env.PORT || 3001;

// Initialize database service
const databaseService = require('./services/database');
try {
  databaseService.initialize();
  logger.info('Database service initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database service', { error: error.message });
}

const server = app
  .listen(port, '0.0.0.0', () => {
    logger.info('Server started successfully', {
      port,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      database: db ? 'connected' : 'disconnected',
      staticFiles: fs.existsSync(distPath) ? 'serving' : 'not-found'
    });
    
    try {
      backgroundJobService.start();
      logger.info('Background jobs started');
    } catch (error) {
      logger.error('Failed to start background jobs', { error: error.message });
    }
    
    console.log(`✅ JAG DNA Scientific LIMS running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`📈 Metrics: http://localhost:${port}/metrics`);
    console.log(`🌐 Frontend: http://localhost:${port}/`);
    console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Static files: ${fs.existsSync(distPath) ? 'Available' : 'Missing'}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.warn('Port in use, trying next port', { port, nextPort: port + 1 });
      console.log(`❌ Port ${port} is in use, trying port ${port + 1}`);
      server.listen(port + 1, '0.0.0.0', () => {
        console.log(`✅ JAG DNA Scientific LIMS running on http://localhost:${port + 1}`);
      });
    } else {
      logger.error('Server startup error', { error: err.message, code: err.code });
      console.error('❌ Server startup error:', err.message);
      process.exit(1);
    }
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Server closed');
    console.log('✅ Server closed');
    
    try {
      backgroundJobService.stop();
      logger.info('Background jobs stopped');
    } catch (error) {
      logger.error('Error stopping background jobs', { error: error.message });
    }
    
    try {
      memoryManager.shutdown();
      memoryMonitor.cleanup();
      logger.info('Memory management cleaned up');
    } catch (error) {
      logger.error('Error cleaning up memory management', { error: error.message });
    }
    
    if (dbPool) {
      dbPool.close();
    } else if (db) {
      db.close();
    }
    
    if (global.gc) {
      global.gc();
      logger.info('Final garbage collection performed');
    }
    
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Server closed');
    console.log('✅ Server closed');
    
    memoryManager.shutdown();
    memoryMonitor.cleanup();
    
    if (dbPool) {
      dbPool.close();
    } else if (db) {
      db.close();
    }
    
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  console.error('❌ Unhandled Rejection:', reason);
});

module.exports = app;