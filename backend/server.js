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
const { createMonitoringMiddleware, errorMonitoringMiddleware } = require("./middleware/requestMonitoring");
const { performanceMiddleware, performanceMonitor } = require("./middleware/performanceMonitoring");
const { cacheMiddleware, cacheService } = require("./services/cacheService");

// Import routes
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const dbViewerRoutes = require("./routes/database-viewer");
const geneticAnalysisRoutes = require("./routes/genetic-analysis");
const monitoringRoutes = require("./routes/monitoring");

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize database connection
const dbPath = path.join(__dirname, 'database', 'ashley_lims.db');
let db = null;

try {
  db = new Database(dbPath);
  logger.info('Database connected successfully', { dbPath });
} catch (error) {
  logger.error('Database connection failed', { error: error.message, dbPath });
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

const app = express();

// Trust proxy for accurate client IP
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add comprehensive monitoring middleware (only in production)
if (process.env.NODE_ENV === 'production') {
  const monitoringMiddlewares = createMonitoringMiddleware({
    enableRateLimit: true,
    enableSlowDown: true,
    enableCompression: true,
    enableSecurity: true,
    enableLogging: true
  });
  
  monitoringMiddlewares.forEach(middleware => app.use(middleware));
  app.use(performanceMiddleware(performanceMonitor));
  app.use(sanitizeInput);
}

// Database helper functions
function getSamplesWithPagination(page = 1, limit = 50, filters = {}) {
  try {
    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];
    
    const conditions = [];
    if (filters.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'pending':
          conditions.push("workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL");
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
    const total = db.prepare(countQuery).get(...params).total;
    
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
    const samples = db.prepare(dataQuery).all(...params);
    
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
  }
}

function getSampleCounts() {
  try {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM samples');
    const activeStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'active'");
    const pendingStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL");
    const pcrBatchedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%' AND lab_batch_number NOT LIKE '%_RR')");
    const electroBatchedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%')");
    const rerunBatchedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR')");
    const completedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('analysis_completed')");
    const processingStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('pcr_batched', 'pcr_completed')");
    
    return {
      total: totalStmt.get().count,
      active: activeStmt.get().count,
      pending: pendingStmt.get().count,
      pcrBatched: pcrBatchedStmt.get().count,
      electroBatched: electroBatchedStmt.get().count,
      rerunBatched: rerunBatchedStmt.get().count,
      completed: completedStmt.get().count,
      processing: processingStmt.get().count
    };
  } catch (error) {
    logger.error('Error getting sample counts', { error: error.message });
    return { total: 0, active: 0, pending: 0, pcrBatched: 0, electroBatched: 0, rerunBatched: 0, completed: 0, processing: 0 };
  }
}

function createSample(sampleData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO samples (
        lab_number, name, surname, relation, status, phone_number,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      sampleData.lab_number,
      sampleData.name,
      sampleData.surname,
      sampleData.relation || 'Child',
      sampleData.status || 'pending',
      sampleData.phone_number
    );
    
    return { id: result.lastInsertRowid, ...sampleData };
  } catch (error) {
    logger.error('Error creating sample', { error: error.message, sampleData });
    throw error;
  }
}

// Use routes with fallback handling
try {
  app.use("/api/auth", authRoutes);
  app.use("/api", apiRoutes);
  app.use("/api/db", dbViewerRoutes);
  app.use("/api/genetic-analysis", geneticAnalysisRoutes);
  app.use("/monitoring", monitoringRoutes);
} catch (error) {
  logger.warn('Some routes not available, using fallback endpoints', { error: error.message });
}

// Core API endpoints with database integration
app.get("/api/test", (req, res) => {
  ResponseHandler.success(res, {
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Samples endpoints
app.get("/api/samples", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filters = {
      status: req.query.status,
      search: req.query.search
    };
    
    const result = getSamplesWithPagination(page, limit, filters);
    ResponseHandler.success(res, result);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch samples', error);
  }
});

app.get("/api/samples/all", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        id, lab_number, name, surname, relation, status, 
        collection_date, workflow_status, case_number
      FROM samples 
      ORDER BY id DESC
    `);
    const samples = stmt.all();
    ResponseHandler.success(res, { data: samples });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch all samples', error);
  }
});

app.post("/api/samples", (req, res) => {
  try {
    const newSample = createSample(req.body);
    ResponseHandler.success(res, { data: newSample }, 'Sample created successfully', 201);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to create sample', error);
  }
});

app.get("/api/samples/counts", (req, res) => {
  try {
    const counts = getSampleCounts();
    ResponseHandler.success(res, { data: counts });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get sample counts', error);
  }
});

app.get("/api/samples/queue-counts", (req, res) => {
  try {
    const counts = getSampleCounts();
    ResponseHandler.success(res, { data: counts });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get queue counts', error);
  }
});

app.get("/api/samples/search", (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return ResponseHandler.success(res, { data: [] });
    }
    
    const stmt = db.prepare(`
      SELECT 
        id, lab_number, name, surname, relation, status, 
        collection_date, workflow_status, case_number
      FROM samples 
      WHERE lab_number LIKE ? OR name LIKE ? OR surname LIKE ?
      ORDER BY id DESC 
      LIMIT 50
    `);
    
    const searchTerm = `%${query}%`;
    const samples = stmt.all(searchTerm, searchTerm, searchTerm);
    
    ResponseHandler.success(res, { data: samples });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to search samples', error);
  }
});

// Batch endpoints
app.post("/api/generate-batch", (req, res) => {
  const transaction = db.transaction(() => {
    const { batchNumber, operator, wells, sampleCount, date, batchType } = req.body;
    
    if (!operator) {
      throw new Error('Operator is required');
    }

    let finalBatchNumber = batchNumber;
    if (!batchNumber) {
      finalBatchNumber = 'LDS_1';
    }
    
    let batchPrefix = 'LDS_';
    let isRerunBatch = false;
    
    if (finalBatchNumber.startsWith('ELEC_')) {
      batchPrefix = 'ELEC_';
    } else if (finalBatchNumber.includes('_RR')) {
      batchPrefix = 'LDS_';
      isRerunBatch = true;
    } else if (finalBatchNumber.startsWith('LDS_')) {
      batchPrefix = 'LDS_';
    }
    
    if (!batchNumber || finalBatchNumber === 'LDS_1' || finalBatchNumber === 'ELEC_1') {
      if (isRerunBatch) {
        const lastRerunStmt = db.prepare(`SELECT batch_number FROM batches WHERE batch_number LIKE 'LDS_%_RR' ORDER BY id DESC LIMIT 1`);
        const lastRerunBatch = lastRerunStmt.get();
        
        let nextNumber = 1;
        if (lastRerunBatch) {
          const match = lastRerunBatch.batch_number.match(/LDS_(\d+)_RR/);
          if (match) {
            const lastNumber = parseInt(match[1]);
            if (!isNaN(lastNumber)) {
              nextNumber = lastNumber + 1;
            }
          }
        }
        finalBatchNumber = `LDS_${nextNumber}_RR`;
      } else {
        const lastBatchStmt = db.prepare(`SELECT batch_number FROM batches WHERE batch_number LIKE '${batchPrefix}%' ORDER BY id DESC LIMIT 1`);
        const lastBatch = lastBatchStmt.get();
        
        let nextNumber = 1;
        if (lastBatch) {
          const lastNumber = parseInt(lastBatch.batch_number.replace(batchPrefix, ''));
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
        finalBatchNumber = `${batchPrefix}${nextNumber}`;
      }
    }

    const insertBatchStmt = db.prepare(`
      INSERT INTO batches (batch_number, operator, pcr_date, total_samples, plate_layout, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const plateLayoutJson = JSON.stringify(wells || {});
    const result = insertBatchStmt.run(
      finalBatchNumber,
      operator,
      date || new Date().toISOString().split('T')[0],
      sampleCount || 0,
      plateLayoutJson,
      'active'
    );

    let updatedSamples = 0;
    if (wells) {
      let workflowStatus = 'pcr_batched';
      if (batchType === 'electrophoresis') {
        workflowStatus = 'electro_batched';
      } else if (batchType === 'rerun') {
        workflowStatus = 'rerun_batched';
      }
      
      const updateSampleStmt = db.prepare(`
        UPDATE samples 
        SET batch_id = ?, workflow_status = ?, lab_batch_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      Object.values(wells).forEach(well => {
        if (well.samples) {
          well.samples.forEach(sample => {
            if (sample.id) {
              const updateResult = updateSampleStmt.run(result.lastInsertRowid, workflowStatus, finalBatchNumber, sample.id);
              if (updateResult.changes > 0) {
                updatedSamples++;
              }
            }
          });
        }
      });
    }

    return {
      batchId: result.lastInsertRowid,
      batchNumber: finalBatchNumber,
      operator,
      total_samples: sampleCount || 0,
      updated_samples: updatedSamples,
      status: 'active',
      plate_layout: wells || {}
    };
  });

  try {
    const result = transaction();
    ResponseHandler.success(res, result, 'Batch created successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to create batch', error);
  }
});

app.get("/api/batches", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        id, batch_number, operator, pcr_date, electro_date, 
        total_samples, status, created_at, updated_at,
        plate_layout
      FROM batches 
      ORDER BY created_at DESC
    `);
    
    const batches = stmt.all().map(batch => ({
      ...batch,
      plate_layout: batch.plate_layout ? JSON.parse(batch.plate_layout) : {}
    }));
    
    ResponseHandler.success(res, { data: batches });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch batches', error);
  }
});

app.get("/api/batches/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare(`
      SELECT 
        id, batch_number, operator, pcr_date, electro_date, 
        total_samples, status, created_at, updated_at,
        plate_layout
      FROM batches 
      WHERE id = ?
    `);
    
    const batch = stmt.get(id);
    
    if (!batch) {
      return ResponseHandler.notFound(res, 'Batch not found');
    }

    batch.plate_layout = batch.plate_layout ? JSON.parse(batch.plate_layout) : {};
    
    ResponseHandler.success(res, { data: batch });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch batch', error);
  }
});

// Legacy API endpoints for compatibility
app.get("/api/get-last-lab-number", (req, res) => {
  try {
    const stmt = db.prepare('SELECT lab_number FROM samples ORDER BY id DESC LIMIT 1');
    const result = stmt.get();
    ResponseHandler.success(res, { data: result ? result.lab_number : '25_001' });
  } catch (error) {
    ResponseHandler.success(res, { data: '25_001' });
  }
});

app.get("/api/test-cases", (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM test_cases ORDER BY id DESC LIMIT 100');
    const testCases = stmt.all();
    ResponseHandler.success(res, { data: testCases });
  } catch (error) {
    ResponseHandler.success(res, { data: [] });
  }
});

app.post("/api/refresh-database", (req, res) => {
  try {
    const counts = getSampleCounts();
    ResponseHandler.success(res, {
      message: "Database refreshed",
      statistics: {
        samples: counts.total,
        cases: Math.floor(counts.total / 3),
        batches: 0,
        reports: 0
      }
    });
  } catch (error) {
    ResponseHandler.success(res, {
      message: "Database refreshed",
      statistics: { samples: 0, cases: 0, batches: 0, reports: 0 }
    });
  }
});

// Placeholder endpoints for missing routes
const placeholderEndpoints = [
  '/api/reports',
  '/api/statistics',
  '/api/equipment',
  '/api/quality-control',
  '/api/db/reports'
];

placeholderEndpoints.forEach(endpoint => {
  app.get(endpoint, (req, res) => {
    ResponseHandler.success(res, { data: [] });
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  ResponseHandler.success(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: db ? 'connected' : 'disconnected',
    port: process.env.PORT || 3001
  }, 'Server is healthy');
});

// Test endpoint
app.get("/test", (req, res) => {
  ResponseHandler.success(res, {
    message: "Server is running",
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  ResponseHandler.success(res, {
    message: "LabScientific LIMS Backend API",
    version: "3.0.0-unified",
    status: "running",
    endpoints: {
      health: "/health",
      test: "/test",
      samples: "/api/samples",
      batches: "/api/batches",
      api: "/api"
    }
  });
});

// Handle 404 errors
app.use('*', (req, res) => {
  ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
});

// Error monitoring middleware
if (process.env.NODE_ENV === 'production') {
  app.use(errorMonitoringMiddleware);
}

// Global error handler (must be last)
app.use(globalErrorHandler);

const port = process.env.PORT || 3001;

const server = app
  .listen(port, '0.0.0.0', () => {
    logger.info('Server started successfully', {
      port,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      database: db ? 'connected' : 'disconnected'
    });
    
    console.log(`✅ LabScientific LIMS Backend running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔗 API endpoints: http://localhost:${port}/`);
    console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.warn('Port in use, trying next port', { port, nextPort: port + 1 });
      console.log(`❌ Port ${port} is in use, trying port ${port + 1}`);
      server.listen(port + 1, '0.0.0.0', () => {
        console.log(`✅ Backend server running on http://localhost:${port + 1}`);
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
    
    // Cleanup services
    if (performanceMonitor) {
      performanceMonitor.destroy();
    }
    
    if (cacheService) {
      cacheService.destroy();
    }
    
    if (db) {
      db.close();
    }
    
    process.exit(0);
  });
  
  // Force close after 10 seconds
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
    if (db) db.close();
    process.exit(0);
  });
});

// Handle uncaught exceptions
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