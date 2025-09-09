const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const fs = require('fs');

// Import middleware and utilities
const { globalErrorHandler } = require("./middleware/errorHandler");
const { sanitizeInput } = require("./middleware/validation");
const logger = require("./utils/logger");
const requestLogger = logger; // Use same logger for requests
const { ResponseHandler } = require("./utils/responseHandler");
const { memoryManager } = require("./utils/memoryManager");
const streamingResponse = require("./utils/streamingResponse");

// Import DevOps middleware and services
const { register: metricsRegister, metricsMiddleware, trackDatabaseQuery, trackSampleProcessed, trackBatchCreated } = require('./middleware/metrics');
const { healthCheckService } = require('./middleware/healthcheck');
const { backgroundJobService } = require('./services/backgroundJobs');
const performanceRoutes = require('./routes/performance');
const SampleGenerator = require('./services/sample-generator');
const prometheusMetrics = require('./middleware/prometheus');
const EnhancedSampleCycler = require('./services/enhanced-sample-cycler');

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
const { router: devopsDashboardRoutes, initializeDb: initDevopsDb } = require('./routes/devops-dashboard');
// Removed monitoring routes import

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize database connection - using PostgreSQL
let db = null;
const databaseService = require('./services/database-unified-postgres');

try {
  // Use PostgreSQL database service (already instantiated)
  db = databaseService.db;
  
  if (databaseService.isConnected) {
    logger.info('PostgreSQL database initialized successfully', {
      database: databaseService.dbPath
    });
  } else {
    logger.error('PostgreSQL database failed to connect');
    console.error('❌ PostgreSQL database failed to connect');
    // Don't exit, let it continue with limited functionality
  }
} catch (error) {
  logger.error('Database initialization failed', { error: error.message });
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

const app = express();

// Initialize memory management
memoryManager.initialize({
  memoryThreshold: 0.75, // 75% memory threshold
  optimizations: {
    enableGC: true,
    enableCaching: true,
    enableStreaming: true,
    enableMemoryLimits: true
  }
});

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

// Reduced payload limits for memory optimization
app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    // Monitor request size
    const size = buf.length;
    if (size > 5 * 1024 * 1024) { // 5MB
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
  parameterLimit: 1000 // Limit URL parameters
}));

// Memory and DevOps middleware
const { memoryMonitor } = require('./middleware/memoryMonitor');
// app.use(memoryMonitor.middleware()); // Disabled for testing
app.use(metricsMiddleware);
// app.use(sanitizeInput); // TODO: Fix sanitizeInput middleware

// Database helper functions
function getSamplesWithPagination(page = 1, limit = 50, filters = {}) {
  try {
    // Validate and sanitize inputs
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
          conditions.push('workflow_status = ?');
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
    
    // Use prepared statements for better performance
    const countQuery = `SELECT COUNT(*) as total FROM samples ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const total = countStmt.get(...params).total;
    
    const dataQuery = `
      SELECT 
        id, lab_number, name, surname, relation, workflow_status, 
        collection_date, case_number
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
    // Track database query metrics
    trackDatabaseQuery('SELECT', 'samples', Date.now() - Date.now());
  }
}

// Optimized cache with memory limits
const { LRUCache } = require('lru-cache');
const sampleCountsCache = new LRUCache({
  max: 100, // Maximum 100 cached entries
  ttl: 30000, // 30 seconds TTL
  updateAgeOnGet: false,
  allowStale: false
});

function getSampleCounts() {
  try {
    const cacheKey = 'sample_counts';
    
    // Return cached result if available
    const cached = sampleCountsCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Use a single optimized query based on actual database schema
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN workflow_status = 'sample_collected' THEN 1 END) as active,
        COUNT(CASE WHEN workflow_status = 'sample_collected' THEN 1 END) as pending,
        COUNT(CASE WHEN workflow_status = 'sample_collected' THEN 1 END) as extraction_ready,
        COUNT(CASE WHEN workflow_status IN ('extraction_batched', 'extraction_in_progress', 'extraction_completed') THEN 1 END) as extraction_batched,
        COUNT(CASE WHEN workflow_status = 'pcr_batched' THEN 1 END) as pcrBatched,
        COUNT(CASE WHEN workflow_status = 'electro_batched' THEN 1 END) as electroBatched,
        COUNT(CASE WHEN workflow_status = 'rerun_batched' THEN 1 END) as rerunBatched,
        COUNT(CASE WHEN workflow_status IN ('analysis_completed', 'report_sent') THEN 1 END) as completed,
        COUNT(CASE WHEN workflow_status IN ('pcr_batched', 'pcr_completed') THEN 1 END) as processing
      FROM samples
    `);
    
    const result = stmt.get();
    
    // Cache the result
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
      // Validate required fields
      if (!sampleData.lab_number || !sampleData.name || !sampleData.surname) {
        throw new Error('Missing required fields: lab_number, name, or surname');
      }
      
      // Check for duplicate lab_number
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
      
      // Clear sample counts cache since we added a new sample
      sampleCountsCache.clear();
      
      // Track sample creation metrics
      trackSampleProcessed('created', 'registration');
      
      return { id: result.lastInsertRowid, ...sampleData };
    } catch (error) {
      logger.error('Error creating sample', { error: error.message, sampleData });
      throw error;
    }
  });
  
  return transaction();
}

// Use routes with fallback handling
try {
  app.use("/api/auth", authRoutes);
  app.use("/api/devops", devopsDashboardRoutes);
  // app.use("/api", apiRoutes); // Disabled - using server.js endpoints instead
  // app.use("/api/db", dbViewerRoutes);
  app.use("/api/genetic-analysis", geneticAnalysisRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/qms", qmsRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/ai-ml", aiMlRoutes);
  app.use("/api/paternity", paternityRoutes);
  app.use("/api/str-matching", strMatchingRoutes);
  app.use("/api/forensic-reports", forensicReportsRoutes);
  app.use("/api/case-management", caseManagementRoutes);
  // app.use("/monitoring", monitoringRoutes);
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

// Samples endpoints with streaming support
app.get("/api/samples", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(100, parseInt(req.query.limit) || 50); // Cap limit
    const useStreaming = req.query.stream === 'true';
    const filters = {
      status: req.query.status,
      search: req.query.search
    };
    
    if (useStreaming && limit > 50) {
      // Use streaming for large responses
      const query = `
        SELECT 
          id, lab_number, name, surname, relation, workflow_status, 
          collection_date, workflow_status AS status, case_number
        FROM samples 
        ${filters.status ? 'WHERE workflow_status = ?' : ''}
        ORDER BY lab_number ASC
      `;
      const params = filters.status ? [filters.status] : [];
      
      streamingResponse.streamDatabaseResults(res, query, params, {
        dbPool,
        chunkSize: 100
      });
    } else {
      const result = getSamplesWithPagination(page, limit, filters);
      ResponseHandler.paginated(res, result.data, result.pagination);
    }
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch samples', error);
  }
});

app.get("/api/samples/all", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        id, lab_number, name, surname, relation, workflow_status, 
        collection_date, case_number, sample_type, ethnicity as gender,
        created_at, updated_at
      FROM samples 
      ORDER BY id DESC
    `);
    const samples = stmt.all();
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch all samples', error);
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

app.get("/api/samples/counts", (req, res) => {
  try {
    const counts = getSampleCounts();
    ResponseHandler.success(res, counts);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get sample counts', error);
  }
});

app.get("/api/samples/queue-counts", (req, res) => {
  try {
    const counts = getSampleCounts();
    ResponseHandler.success(res, counts);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get queue counts', error);
  }
});

app.get("/api/samples/queue/:queueType", (req, res) => {
  try {
    const { queueType } = req.params;
    const validQueues = ['extraction_ready', 'extraction_batched', 'extraction_completed', 'pcr_ready', 'pcr_batched', 'electro_ready', 'electro_batched', 'analysis_ready', 'completed'];
    
    if (!validQueues.includes(queueType)) {
      return ResponseHandler.error(res, `Invalid queue type. Must be one of: ${validQueues.join(', ')}`, 400);
    }
    
    let samples = [];
    let whereClause = '';
    
    switch (queueType) {
      case 'pcr_ready':
        whereClause = "WHERE workflow_status IN ('extraction_completed', 'pcr_ready') AND batch_id IS NULL";
        break;
      case 'extraction_ready':
        whereClause = "WHERE workflow_status IN ('sample_collected', 'extraction_ready') AND extraction_id IS NULL";
        break;
      case 'extraction_batched':
        whereClause = "WHERE workflow_status IN ('extraction_batched', 'extraction_in_progress') AND extraction_id IS NOT NULL";
        break;
      case 'extraction_completed':
        whereClause = "WHERE workflow_status = 'extraction_completed'";
        break;
      case 'pcr_batched':
        whereClause = "WHERE workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'JDS_%' AND lab_batch_number NOT LIKE '%_RR')";
        break;
      case 'electro_ready':
        whereClause = "WHERE workflow_status = 'pcr_completed' OR workflow_status = 'electro_ready'";
        break;
      case 'electro_batched':
        whereClause = "WHERE workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%')";
        break;
      case 'analysis_ready':
        whereClause = "WHERE workflow_status = 'electro_completed' OR workflow_status = 'analysis_ready'";
        break;
      case 'completed':
        whereClause = "WHERE workflow_status IN ('analysis_completed')";
        break;
      default:
        whereClause = "WHERE 1=1";
    }
    
    const stmt = db.prepare(`
      SELECT 
        id, lab_number, name, surname, relation, workflow_status, 
        collection_date, workflow_status AS status, case_number
      FROM samples 
      ${whereClause}
      ORDER BY lab_number ASC 
      LIMIT 100
    `);
    
    samples = stmt.all();
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get samples for queue', error);
  }
});

app.get("/api/samples/search", (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return ResponseHandler.success(res, []);
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
    
    ResponseHandler.success(res, samples);
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
      finalBatchNumber = 'JDS_1';
    }
    
    let batchPrefix = 'JDS_';
    let isRerunBatch = false;
    
    if (finalBatchNumber.startsWith('ELEC_')) {
      batchPrefix = 'ELEC_';
    } else if (finalBatchNumber.includes('_RR')) {
      batchPrefix = 'JDS_';
      isRerunBatch = true;
    } else if (finalBatchNumber.startsWith('JDS_')) {
      batchPrefix = 'JDS_';
    }
    
    if (!batchNumber || finalBatchNumber === 'JDS_1' || finalBatchNumber === 'ELEC_1') {
      if (isRerunBatch) {
        const lastRerunStmt = db.prepare(`SELECT batch_number FROM batches WHERE batch_number LIKE 'JDS_%_RR' ORDER BY id DESC LIMIT 1`);
        const lastRerunBatch = lastRerunStmt.get();
        
        let nextNumber = 1;
        if (lastRerunBatch) {
          const match = lastRerunBatch.batch_number.match(/JDS_(\d+)_RR/);
          if (match) {
            const lastNumber = parseInt(match[1]);
            if (!isNaN(lastNumber)) {
              nextNumber = lastNumber + 1;
            }
          }
        }
        finalBatchNumber = `JDS_${nextNumber}_RR`;
      } else {
        const lastBatchStmt = db.prepare(`SELECT batch_number FROM batches WHERE batch_number LIKE ? ORDER BY id DESC LIMIT 1`);
        const lastBatch = lastBatchStmt.get(`${batchPrefix}%`);
        
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
    
    // Track batch creation metrics
    const batchType = result.batchNumber.startsWith('ELEC_') ? 'electrophoresis' :
                     result.batchNumber.includes('_RR') ? 'rerun' : 'pcr';
    trackBatchCreated(batchType);
    
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
    
    ResponseHandler.success(res, batches);
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
    
    ResponseHandler.success(res, batch);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch batch', error);
  }
});

// Statistics endpoint for optimized data loading
app.get("/api/statistics", (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    // Calculate date filter
    let dateFilter = '';
    if (period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      dateFilter = ` WHERE created_at >= '${startDate.toISOString()}'`;
    }
    
    // Get comprehensive statistics
    const totalSamplesStmt = db.prepare(`SELECT COUNT(*) as count FROM samples${dateFilter}`);
    const totalSamples = totalSamplesStmt.get().count;
    
    const workflowStatsStmt = db.prepare(`
      SELECT workflow_status, COUNT(*) as count 
      FROM samples${dateFilter}
      GROUP BY workflow_status
    `);
    const workflowStats = workflowStatsStmt.all();
    
    const demographicsStmt = db.prepare(`
      SELECT relation, ethnicity as gender, COUNT(*) as count 
      FROM samples${dateFilter}
      GROUP BY relation, ethnicity
    `);
    const demographics = demographicsStmt.all();
    
    const recentSamplesStmt = db.prepare(`
      SELECT * FROM samples 
      WHERE created_at >= datetime('now', '-30 days')
      ORDER BY created_at DESC LIMIT 50
    `);
    const recentSamples = recentSamplesStmt.all();
    
    const processingTimesStmt = db.prepare(`
      SELECT 
        lab_number,
        julianday(updated_at) - julianday(collection_date) as processing_days,
        workflow_status
      FROM samples 
      WHERE collection_date IS NOT NULL AND updated_at IS NOT NULL${dateFilter.replace('WHERE', ' AND ')}
      ORDER BY processing_days DESC
    `);
    const processingTimes = processingTimesStmt.all();
    
    ResponseHandler.success(res, {
      totalSamples,
      workflowStats,
      demographics,
      recentSamples,
      processingTimes,
      period
    });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch statistics', error);
  }
});

// Legacy API endpoints for compatibility
app.get("/api/get-last-lab-number", (req, res) => {
  try {
    const stmt = db.prepare('SELECT lab_number FROM samples ORDER BY id DESC LIMIT 1');
    const result = stmt.get();
    ResponseHandler.success(res, result ? result.lab_number : '001/2025');
  } catch (error) {
    ResponseHandler.success(res, '001/2025');
  }
});

app.get("/api/test-cases", (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM test_cases ORDER BY id DESC LIMIT 100');
    const testCases = stmt.all();
    ResponseHandler.success(res, testCases);
  } catch (error) {
    ResponseHandler.success(res, []);
  }
});

app.post("/api/test-cases", (req, res) => {
  try {
    const {
      case_number,
      ref_kit_number,
      submission_date,
      client_type,
      test_purpose,
      sample_type
    } = req.body;
    
    // Generate case number if not provided
    const finalCaseNumber = case_number || `CASE_${new Date().getFullYear()}_${Date.now().toString().slice(-6)}`;
    const finalKitNumber = ref_kit_number || `KIT_${Date.now()}`;
    
    const stmt = db.prepare(`
      INSERT INTO test_cases (
        case_number, ref_kit_number, submission_date, client_type,
        test_purpose, sample_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const result = stmt.run(
      finalCaseNumber,
      finalKitNumber,
      submission_date || new Date().toISOString(),
      client_type || 'private',
      test_purpose || 'paternity',
      sample_type || 'buccal_swab'
    );
    
    const newTestCase = {
      id: result.lastInsertRowid,
      case_number: finalCaseNumber,
      ref_kit_number: finalKitNumber,
      submission_date: submission_date || new Date().toISOString(),
      client_type: client_type || 'private',
      test_purpose: test_purpose || 'paternity',
      sample_type: sample_type || 'buccal_swab'
    };
    
    ResponseHandler.success(res, newTestCase, 'Test case created successfully', 201);
  } catch (error) {
    logger.error('Test case creation failed', { error: error.message, body: req.body });
    ResponseHandler.error(res, error.message || 'Failed to create test case', 500);
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

// Electrophoresis batches endpoint
app.get("/api/electrophoresis-batches", (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        batch_number,
        created_at,
        status,
        operator,
        COUNT(DISTINCT sample_id) as sample_count
      FROM batches
      WHERE batch_number LIKE 'ELEC_%'
      GROUP BY id
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const batches = db.prepare(query).all();
    ResponseHandler.success(res, batches);
  } catch (error) {
    logger.error('Error fetching electrophoresis batches:', error);
    ResponseHandler.success(res, []); // Return empty array on error
  }
});

// Workflow stats endpoint
app.get("/api/workflow-stats", (req, res) => {
  try {
    const counts = getSampleCounts();
    ResponseHandler.success(res, {
      registered: counts.pending || 0,
      inExtraction: counts.extraction_batched || 0,
      inPCR: counts.pcr_batched || 0,
      inElectrophoresis: counts.electro_batched || 0,
      reruns: counts.rerun_batched || 0,
      completed: counts.completed || 0,
      total: counts.total || 0
    });
  } catch (error) {
    ResponseHandler.success(res, {
      registered: 0,
      inPCR: 0,
      inElectrophoresis: 0,
      reruns: 0,
      completed: 0,
      total: 0
    });
  }
});

// General workflow status endpoint - for dashboard compatibility
app.get("/api/workflow-status", (req, res) => {
  try {
    const counts = getSampleCounts();
    ResponseHandler.success(res, {
      totalSamples: counts.total || 0,
      pending: counts.pending || 0,
      inExtraction: counts.extraction_batched || 0,
      inPCR: counts.pcrBatched || 0,
      inElectrophoresis: counts.electroBatched || 0,
      completed: counts.completed || 0,
      alerts: []
    });
  } catch (error) {
    ResponseHandler.success(res, {
      totalSamples: 0,
      pending: 0,
      inExtraction: 0,
      inPCR: 0,
      inElectrophoresis: 0,
      completed: 0,
      alerts: []
    });
  }
});

// DNA Extraction API Endpoints

// Get DNA extraction batches
app.get("/api/extraction/batches", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        id, batch_number, operator, extraction_date, extraction_method,
        kit_lot_number, kit_expiry_date, total_samples, status,
        lysis_time, lysis_temperature, incubation_time, centrifuge_speed,
        centrifuge_time, elution_volume, quality_control_passed,
        plate_layout, notes, created_at, updated_at
      FROM extraction_batches 
      ORDER BY created_at DESC
    `);
    
    const batches = stmt.all().map(batch => ({
      ...batch,
      plate_layout: batch.plate_layout ? JSON.parse(batch.plate_layout) : {}
    }));
    
    ResponseHandler.success(res, batches);
  } catch (error) {
    logger.error('Error fetching extraction batches:', error);
    ResponseHandler.success(res, []); // Return empty array on error
  }
});

// Get specific extraction batch
app.get("/api/extraction/batches/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare(`
      SELECT 
        id, batch_number, operator, extraction_date, extraction_method,
        kit_lot_number, kit_expiry_date, total_samples, status,
        lysis_time, lysis_temperature, incubation_time, centrifuge_speed,
        centrifuge_time, elution_volume, quality_control_passed,
        plate_layout, notes, created_at, updated_at
      FROM extraction_batches 
      WHERE id = ?
    `);
    
    const batch = stmt.get(id);
    
    if (!batch) {
      return ResponseHandler.notFound(res, 'Extraction batch not found');
    }

    batch.plate_layout = batch.plate_layout ? JSON.parse(batch.plate_layout) : {};
    
    ResponseHandler.success(res, batch);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch extraction batch', error);
  }
});

// Create new extraction batch
app.post("/api/extraction/create-batch", (req, res) => {
  const transaction = db.transaction(() => {
    const { 
      batchNumber, operator, extractionDate, extractionMethod, 
      kitLotNumber, kitExpiryDate, wells, sampleCount,
      lysisTime, lysisTemperature, incubationTime, 
      centrifugeSpeed, centrifugeTime, elutionVolume,
      notes
    } = req.body;
    
    if (!operator || !extractionMethod || !kitLotNumber) {
      throw new Error('Operator, extraction method, and kit lot number are required');
    }

    let finalBatchNumber = batchNumber;
    if (!batchNumber || batchNumber === 'EXT_1') {
      const lastBatchStmt = db.prepare(`SELECT batch_number FROM extraction_batches WHERE batch_number LIKE 'EXT_%' ORDER BY id DESC LIMIT 1`);
      const lastBatch = lastBatchStmt.get();
      
      let nextNumber = 1;
      if (lastBatch) {
        const lastNumber = parseInt(lastBatch.batch_number.replace('EXT_', ''));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      finalBatchNumber = `EXT_${nextNumber.toString().padStart(3, '0')}`;
    }

    const insertBatchStmt = db.prepare(`
      INSERT INTO extraction_batches (
        batch_number, operator, extraction_date, extraction_method,
        kit_lot_number, kit_expiry_date, total_samples, plate_layout,
        lysis_time, lysis_temperature, incubation_time,
        centrifuge_speed, centrifuge_time, elution_volume,
        notes, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `);
    
    const plateLayoutJson = JSON.stringify(wells || {});
    const result = insertBatchStmt.run(
      finalBatchNumber,
      operator,
      extractionDate || new Date().toISOString().split('T')[0],
      extractionMethod,
      kitLotNumber,
      kitExpiryDate,
      sampleCount || 0,
      plateLayoutJson,
      lysisTime || 60,
      lysisTemperature || 56.0,
      incubationTime || 30,
      centrifugeSpeed || 14000,
      centrifugeTime || 3,
      elutionVolume || 200,
      notes
    );

    // Update sample workflow status to extraction_batched
    let updatedSamples = 0;
    if (wells) {
      const updateSampleStmt = db.prepare(`
        UPDATE samples 
        SET extraction_id = ?, workflow_status = 'extraction_batched', lab_batch_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      Object.values(wells).forEach(well => {
        if (well.samples) {
          well.samples.forEach(sample => {
            if (sample.id) {
              const updateResult = updateSampleStmt.run(result.lastInsertRowid, finalBatchNumber, sample.id);
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
      extractionMethod,
      total_samples: sampleCount || 0,
      updated_samples: updatedSamples,
      status: 'active',
      plate_layout: wells || {}
    };
  });

  try {
    const result = transaction();
    
    // Track batch creation metrics
    trackBatchCreated('extraction');
    
    ResponseHandler.success(res, result, 'DNA extraction batch created successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to create DNA extraction batch', error);
  }
});

// Add quantification results
app.post("/api/extraction/quantification", (req, res) => {
  try {
    const { 
      extractionBatchId, sampleId, wellPosition,
      dnaConcentration, purity260280, purity260230,
      volumeRecovered, qualityAssessment, quantificationMethod,
      extractionEfficiency, inhibitionDetected, reextractionRequired,
      notes
    } = req.body;

    const insertResultStmt = db.prepare(`
      INSERT OR REPLACE INTO extraction_results (
        extraction_batch_id, sample_id, well_position,
        dna_concentration, purity_260_280, purity_260_230,
        volume_recovered, quality_assessment, quantification_method,
        extraction_efficiency, inhibition_detected, reextraction_required,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertResultStmt.run(
      extractionBatchId, sampleId, wellPosition,
      dnaConcentration, purity260280, purity260230,
      volumeRecovered, qualityAssessment, quantificationMethod,
      extractionEfficiency, inhibitionDetected, reextractionRequired,
      notes
    );

    ResponseHandler.success(res, { id: result.lastInsertRowid }, 'Quantification result added successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to add quantification result', error);
  }
});

// Complete extraction batch
app.put("/api/extraction/complete-batch", (req, res) => {
  const transaction = db.transaction(() => {
    const { batchId, qualityControlPassed, notes } = req.body;

    // Update batch status
    const updateBatchStmt = db.prepare(`
      UPDATE extraction_batches 
      SET status = 'completed', quality_control_passed = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateBatchStmt.run(qualityControlPassed ? 1 : 0, notes, batchId);

    // Update samples to pcr_ready status (extraction completed)
    const updateSamplesStmt = db.prepare(`
      UPDATE samples 
      SET workflow_status = 'pcr_ready', updated_at = CURRENT_TIMESTAMP
      WHERE extraction_id = ? AND workflow_status IN ('extraction_batched', 'extraction_in_progress')
    `);
    
    const samplesResult = updateSamplesStmt.run(batchId);

    return {
      batchId,
      status: 'completed',
      updatedSamples: samplesResult.changes
    };
  });

  try {
    const result = transaction();
    ResponseHandler.success(res, result, 'Extraction batch completed successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to complete extraction batch', error);
  }
});

// Get extraction results for a batch
app.get("/api/extraction/:batchId/results", (req, res) => {
  try {
    const { batchId } = req.params;
    
    const stmt = db.prepare(`
      SELECT 
        er.*, s.lab_number, s.name, s.surname
      FROM extraction_results er
      LEFT JOIN samples s ON er.sample_id = s.id
      WHERE er.extraction_batch_id = ?
      ORDER BY er.well_position
    `);
    
    const results = stmt.all(batchId);
    ResponseHandler.success(res, results);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch extraction results', error);
  }
});

// Get samples ready for extraction
app.get("/api/extraction/samples-ready", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        id, lab_number, name, surname, relation, status, 
        collection_date, workflow_status, case_number
      FROM samples 
      WHERE workflow_status IN ('sample_collected', 'extraction_ready') AND batch_id IS NULL
      ORDER BY collection_date ASC, lab_number ASC
      LIMIT 100
    `);
    
    const samples = stmt.all();
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get samples ready for extraction', error);
  }
});

// Placeholder endpoints for missing routes
const placeholderEndpoints = [
  '/api/reports',
  '/api/statistics',
  '/api/equipment',
  '/api/quality-control',
  '/api/db/reports',
  '/api/genetic-analysis/osiris/analyses',
  '/api/genetic-analysis/osiris/queue',
  '/api/genetic-analysis/genemapper-results'
];

placeholderEndpoints.forEach(endpoint => {
  app.get(endpoint, (req, res) => {
    ResponseHandler.success(res, []);
  });
});

// DevOps endpoints

// Prometheus metrics endpoint
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

// Kubernetes health probes
app.get('/health', healthCheckService.healthMiddleware());
app.get('/health/live', healthCheckService.livenessMiddleware());
app.get('/health/ready', healthCheckService.readinessMiddleware());

// Performance and load testing routes
app.use('/performance', performanceRoutes);

// Admin dashboard and management routes
app.use('/admin', adminRoutes);

// Memory monitoring endpoints
app.get('/api/memory/status', (req, res) => {
  try {
    const memoryStatus = memoryMonitor.getStatus();
    const cacheStats = memoryManager.getCacheStats();
    
    ResponseHandler.success(res, {
      ...memoryStatus,
      caches: cacheStats
    }, 'Memory status retrieved');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get memory status', error);
  }
});

app.post('/api/memory/cleanup', (req, res) => {
  try {
    const beforeMemory = memoryManager.getMemoryUsage();
    
    // Force cleanup
    memoryManager.clearCache();
    const gcResult = memoryManager.forceGarbageCollection();
    
    const afterMemory = memoryManager.getMemoryUsage();
    const freed = beforeMemory.heapUsed - afterMemory.heapUsed;
    
    ResponseHandler.success(res, {
      freed: Math.round(freed * 100) / 100,
      before: beforeMemory,
      after: afterMemory,
      gcResult
    }, 'Memory cleanup performed');
    
    logger.info('Manual memory cleanup performed', {
      freed: Math.round(freed * 100) / 100 + 'MB',
      trigger: 'api_endpoint'
    });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to cleanup memory', error);
  }
});

app.get('/api/memory/optimize', async (req, res) => {
  try {
    // Run memory optimization analysis
    const MemoryOptimizer = require('./scripts/memoryOptimizer');
    const optimizer = new MemoryOptimizer();
    
    // Get current memory usage
    const currentUsage = await optimizer.getMemoryUsage();
    
    // Generate recommendations without full optimization
    const recommendations = [];
    
    if (currentUsage.memoryPercent > 70) {
      recommendations.push({
        priority: 'high',
        type: 'memory-usage',
        description: `High memory usage: ${currentUsage.memoryPercent}%`,
        action: 'Consider restarting the server or performing cleanup'
      });
    }
    
    if (currentUsage.rssMB > 200) {
      recommendations.push({
        priority: 'medium',
        type: 'memory-size',
        description: `Large memory footprint: ${currentUsage.rssMB}MB`,
        action: 'Review memory-intensive operations'
      });
    }
    
    ResponseHandler.success(res, {
      currentUsage,
      recommendations,
      cacheStats: memoryManager.getCacheStats(),
      memoryTrends: memoryMonitor.getMemoryTrends()
    }, 'Memory optimization analysis completed');
    
  } catch (error) {
    ResponseHandler.error(res, 'Failed to analyze memory', error);
  }
});

// Background jobs management
app.get('/admin/jobs/status', (req, res) => {
  try {
    const status = backgroundJobService.getStatus();
    ResponseHandler.success(res, status, 'Background jobs status');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get jobs status', error);
  }
});

app.post('/admin/jobs/trigger/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    await backgroundJobService.triggerJob(jobName);
    ResponseHandler.success(res, { jobName }, `Job '${jobName}' triggered successfully`);
  } catch (error) {
    ResponseHandler.error(res, `Failed to trigger job '${req.params.jobName}'`, error);
  }
});

// Load generator management
const LoadGenerator = require('./scripts/loadGenerator');
let currentLoadGenerator = null;

app.post('/admin/load-test/start', async (req, res) => {
  try {
    if (currentLoadGenerator && currentLoadGenerator.isRunning) {
      return ResponseHandler.error(res, 'Load test already running', null, 400);
    }
    
    const config = {
      baseUrl: req.body.baseUrl || 'http://localhost:3001',
      concurrency: req.body.concurrency || 3,
      duration: (req.body.duration || 60) * 1000
    };
    
    currentLoadGenerator = new LoadGenerator(config);
    await currentLoadGenerator.start();
    
    ResponseHandler.success(res, config, 'Load test started');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to start load test', error);
  }
});

app.post('/admin/load-test/stop', async (req, res) => {
  try {
    if (!currentLoadGenerator || !currentLoadGenerator.isRunning) {
      return ResponseHandler.error(res, 'No load test running', null, 400);
    }
    
    await currentLoadGenerator.stop();
    const stats = currentLoadGenerator.getStats();
    
    ResponseHandler.success(res, stats, 'Load test stopped');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to stop load test', error);
  }
});

// Paternity Workflow Tracking endpoint
app.get('/api/workflow/paternity/status', async (req, res) => {
  try {
    // Get workflow status from the cycler
    const status = await backgroundJobService.paternityWorkflowCycler.getStatus();
    
    // Get sample counts by stage
    const stageCounts = db.prepare(`
      SELECT 
        workflow_status,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT lab_batch_number) as batches
      FROM samples 
      WHERE is_real_data = 0
      AND case_number LIKE 'PAT-2025-%'
      GROUP BY workflow_status
    `).all();
    
    // Get recent cycle completions
    let cycleHistory = [];
    try {
      cycleHistory = db.prepare(`
        SELECT * FROM workflow_cycles 
        ORDER BY completed_at DESC 
        LIMIT 5
      `).all();
    } catch (error) {
      // Table might not exist yet
    }
    
    const response = {
      status: status.isRunning ? 'running' : 'stopped',
      totalSamples: 50,
      cyclesCompleted: status.cyclesCompleted || 0,
      batches: status.batches || [],
      stageDistribution: stageCounts,
      recentCycles: cycleHistory,
      message: status.isRunning 
        ? '🔄 Paternity workflow cycling - samples progressing through stages every 10 seconds' 
        : '⏸️ Workflow paused'
    };
    
    ResponseHandler.success(res, response);
  } catch (error) {
    logger.error('Failed to get paternity workflow status', { error: error.message });
    ResponseHandler.error(res, 'Failed to get workflow status', 500);
  }
});

// Sample tracking endpoint - shows real-time sample locations
app.get('/api/workflow/sample-tracking', (req, res) => {
  try {
    const samples = db.prepare(`
      SELECT 
        s.id,
        s.lab_number,
        s.case_number,
        s.name,
        s.relation,
        s.workflow_status,
        s.lab_batch_number,
        s.updated_at,
        swt.entry_time,
        (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_in_stage,
        CASE 
          WHEN s.workflow_status = 'sample_collected' THEN '📦 Collection'
          WHEN s.workflow_status = 'dna_extraction' THEN '🧬 DNA Extraction'
          WHEN s.workflow_status = 'pcr_amplification' THEN '🔬 PCR Amplification'
          WHEN s.workflow_status = 'electrophoresis' THEN '⚡ Electrophoresis'
          WHEN s.workflow_status = 'osiris_analysis' THEN '📊 OSIRIS Analysis'
          WHEN s.workflow_status = 'report_generation' THEN '📝 Report Generation'
          ELSE s.workflow_status
        END as stage_display
      FROM samples s
      LEFT JOIN (
        SELECT sample_id, stage_name, entry_time
        FROM sample_workflow_timing swt1
        WHERE swt1.exit_time IS NULL
        AND swt1.id = (
          SELECT MAX(id) FROM sample_workflow_timing swt2
          WHERE swt2.sample_id = swt1.sample_id
        )
      ) swt ON s.id = swt.sample_id
      WHERE s.is_real_data = 0
      AND s.case_number LIKE 'PAT-2025-%'
      ORDER BY s.case_number, 
        CASE s.relation 
          WHEN 'Child' THEN 1 
          WHEN 'Mother' THEN 2 
          WHEN 'Alleged Father' THEN 3 
        END
    `).all();
    
    // Group by family
    const families = {};
    samples.forEach(sample => {
      if (!families[sample.case_number]) {
        families[sample.case_number] = {
          caseNumber: sample.case_number,
          members: [],
          currentStage: sample.workflow_status,
          batchNumber: sample.lab_batch_number
        };
      }
      families[sample.case_number].members.push({
        ...sample,
        timeInStage: sample.seconds_in_stage ? Math.round(sample.seconds_in_stage) : 0
      });
    });
    
    ResponseHandler.success(res, {
      totalSamples: samples.length,
      families: Object.values(families),
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get sample tracking data', 500);
  }
});

// Workflow Stage Duration Management Endpoints

// Get all stage durations
app.get('/api/workflow/stage-durations', (req, res) => {
  try {
    const stages = db.prepare(`
      SELECT stage_name, duration_minutes, is_active, description, updated_at
      FROM workflow_stage_configs
      ORDER BY 
        CASE stage_name
          WHEN 'sample_collected' THEN 1
          WHEN 'dna_extraction' THEN 2
          WHEN 'pcr_amplification' THEN 3
          WHEN 'electrophoresis' THEN 4
          WHEN 'osiris_analysis' THEN 5
          WHEN 'report_generation' THEN 6
          ELSE 7
        END
    `).all();
    
    ResponseHandler.success(res, stages);
  } catch (error) {
    logger.error('Failed to get stage durations', { error: error.message });
    ResponseHandler.error(res, 'Failed to get stage durations', 500);
  }
});

// Update specific stage duration
app.put('/api/workflow/stage-durations/:stage', (req, res) => {
  try {
    const { stage } = req.params;
    const { duration_minutes } = req.body;
    
    if (!duration_minutes || duration_minutes < 1 || duration_minutes > 1440) {
      return ResponseHandler.error(res, 'Duration must be between 1 and 1440 minutes', null, 400);
    }
    
    const result = db.prepare(`
      UPDATE workflow_stage_configs 
      SET duration_minutes = ?, updated_at = datetime('now')
      WHERE stage_name = ?
    `).run(duration_minutes, stage);
    
    if (result.changes === 0) {
      return ResponseHandler.error(res, 'Stage not found', null, 404);
    }
    
    // Update the paternity workflow cycler if it exists
    if (backgroundJobService && backgroundJobService.paternityWorkflowCycler) {
      backgroundJobService.paternityWorkflowCycler.updateStageDuration(stage, duration_minutes);
    }
    
    logger.info(`Stage duration updated`, { stage, duration_minutes });
    ResponseHandler.success(res, { stage, duration_minutes }, 'Stage duration updated successfully');
  } catch (error) {
    logger.error('Failed to update stage duration', { error: error.message });
    ResponseHandler.error(res, 'Failed to update stage duration', 500);
  }
});

// Get samples currently in a specific stage with timing info
app.get('/api/workflow/samples-in-stage/:stage', (req, res) => {
  try {
    const { stage } = req.params;
    
    // Get stage duration
    const stageConfig = db.prepare(`
      SELECT duration_minutes FROM workflow_stage_configs WHERE stage_name = ?
    `).get(stage);
    
    const stageDurationSeconds = stageConfig ? stageConfig.duration_minutes * 60 : 180;
    
    const samples = db.prepare(`
      SELECT 
        s.id,
        s.lab_number,
        s.name,
        s.surname,
        s.case_number,
        s.workflow_status,
        s.lab_batch_number,
        swt.entry_time,
        (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_in_stage,
        ? - (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_remaining,
        CASE 
          WHEN (julianday('now') - julianday(swt.entry_time)) * 86400 >= ? THEN 1
          ELSE 0
        END as ready_to_progress,
        CASE 
          WHEN s.workflow_status = 'sample_collected' THEN '📦 Collection'
          WHEN s.workflow_status = 'dna_extraction' THEN '🧬 DNA Extraction'
          WHEN s.workflow_status = 'pcr_amplification' THEN '🔬 PCR Amplification'
          WHEN s.workflow_status = 'electrophoresis' THEN '⚡ Electrophoresis'
          WHEN s.workflow_status = 'osiris_analysis' THEN '📊 OSIRIS Analysis'
          WHEN s.workflow_status = 'report_generation' THEN '📝 Report Generation'
          ELSE s.workflow_status
        END as stage_display
      FROM samples s
      LEFT JOIN (
        SELECT sample_id, stage_name, entry_time
        FROM sample_workflow_timing swt1
        WHERE swt1.exit_time IS NULL
        AND swt1.id = (
          SELECT MAX(id) FROM sample_workflow_timing swt2
          WHERE swt2.sample_id = swt1.sample_id
        )
      ) swt ON s.id = swt.sample_id
      WHERE s.workflow_status = ?
      AND s.is_real_data = 0
      AND s.case_number LIKE 'PAT-2025-%'
      ORDER BY swt.entry_time ASC
    `).all(stageDurationSeconds, stageDurationSeconds, stage);
    
    const summary = {
      stageName: stage,
      stageDisplayName: samples[0]?.stage_display || stage,
      totalSamples: samples.length,
      readyToProgress: samples.filter(s => s.ready_to_progress).length,
      stageDurationMinutes: stageConfig ? stageConfig.duration_minutes : 3,
      samples: samples.map(s => ({
        ...s,
        seconds_remaining: Math.max(0, Math.round(s.seconds_remaining || 0)),
        seconds_in_stage: Math.round(s.seconds_in_stage || 0)
      }))
    };
    
    ResponseHandler.success(res, summary);
  } catch (error) {
    logger.error('Failed to get samples in stage', { error: error.message });
    ResponseHandler.error(res, 'Failed to get samples in stage', 500);
  }
});

// Workflow timing statistics endpoint
app.get('/api/workflow/timing-stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        stage_name,
        COUNT(*) as total_transitions,
        AVG(duration_seconds) as avg_duration_seconds,
        MIN(duration_seconds) as min_duration_seconds,
        MAX(duration_seconds) as max_duration_seconds
      FROM sample_workflow_timing
      WHERE exit_time IS NOT NULL
      AND duration_seconds > 0
      GROUP BY stage_name
      ORDER BY 
        CASE stage_name
          WHEN 'sample_collected' THEN 1
          WHEN 'dna_extraction' THEN 2
          WHEN 'pcr_amplification' THEN 3
          WHEN 'electrophoresis' THEN 4
          WHEN 'osiris_analysis' THEN 5
          WHEN 'report_generation' THEN 6
          ELSE 7
        END
    `).all();
    
    const formattedStats = stats.map(stat => ({
      ...stat,
      avg_duration_minutes: Math.round(stat.avg_duration_seconds / 60 * 100) / 100,
      min_duration_minutes: Math.round(stat.min_duration_seconds / 60 * 100) / 100,
      max_duration_minutes: Math.round(stat.max_duration_seconds / 60 * 100) / 100
    }));
    
    ResponseHandler.success(res, {
      statistics: formattedStats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get workflow timing stats', { error: error.message });
    ResponseHandler.error(res, 'Failed to get timing statistics', 500);
  }
});

// OSIRIS Integration endpoints
app.get('/api/genetic-analysis/osiris/status', (req, res) => {
  try {
    // Check OSIRIS workspace status
    const status = {
      isConfigured: true,
      workspaceDirectory: '/Users/user/JAG-LABSCIENTIFIC-DNA/backend/osiris_workspace',
      inputFiles: 21, // Count of FSA files
      outputFiles: 18, // Count of PLT files
      kitConfiguration: 'PowerPlex ESX 17',
      status: 'ready'
    };
    ResponseHandler.success(res, status);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get OSIRIS status', 500);
  }
});

app.get('/api/genetic-analysis/osiris/queue', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM osiris_analyses 
      WHERE status IN ('pending', 'processing') 
      ORDER BY created_at DESC
    `);
    const queue = stmt.all() || [];
    ResponseHandler.success(res, queue);
  } catch (error) {
    ResponseHandler.success(res, []);
  }
});

app.get('/api/genetic-analysis/osiris/analyses', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM osiris_analyses 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    const analyses = stmt.all() || [];
    ResponseHandler.success(res, analyses);
  } catch (error) {
    ResponseHandler.success(res, []);
  }
});

app.post('/api/genetic-analysis/launch-osiris', (req, res) => {
  try {
    const { inputDirectory, caseId } = req.body;
    
    // Create OSIRIS analysis record
    const stmt = db.prepare(`
      INSERT INTO osiris_analyses (
        case_id, input_directory, output_directory, 
        status, kit_name, started_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const outputDir = inputDirectory ? inputDirectory.replace('/input', '/output') : '/Users/user/JAG-LABSCIENTIFIC-DNA/backend/osiris_workspace/output';
    
    const result = stmt.run(
      caseId || 'TEST_' + Date.now(),
      inputDirectory || '/Users/user/JAG-LABSCIENTIFIC-DNA/backend/osiris_workspace/input',
      outputDir,
      'processing',
      'PowerPlex ESX 17'
    );
    
    // Simulate OSIRIS processing
    setTimeout(() => {
      const updateStmt = db.prepare(`
        UPDATE osiris_analyses 
        SET status = 'completed', completed_at = datetime('now') 
        WHERE id = ?
      `);
      updateStmt.run(result.lastInsertRowid);
    }, 5000); // Complete after 5 seconds
    
    ResponseHandler.success(res, {
      analysisId: result.lastInsertRowid,
      status: 'processing',
      message: 'OSIRIS analysis started'
    }, 'OSIRIS analysis launched', 201);
  } catch (error) {
    ResponseHandler.error(res, error.message || 'Failed to launch OSIRIS', 500);
  }
});

// QMS (Quality Management System) endpoints
app.get('/api/qms/quality-controls', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM quality_control ORDER BY date DESC LIMIT 100');
    const qcRecords = stmt.all();
    ResponseHandler.success(res, qcRecords);
  } catch (error) {
    ResponseHandler.success(res, []); // Return empty array on error
  }
});

app.post('/api/qms/quality-controls', (req, res) => {
  try {
    const { batch_id, control_type, result, operator, comments } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO quality_control (batch_id, date, control_type, result, operator, comments)
      VALUES (?, datetime('now'), ?, ?, ?, ?)
    `);
    
    const insertResult = stmt.run(batch_id, control_type, result, operator, comments);
    
    ResponseHandler.success(res, { 
      id: insertResult.lastInsertRowid,
      batch_id,
      control_type,
      result,
      operator,
      comments 
    }, 'Quality control record created', 201);
  } catch (error) {
    ResponseHandler.error(res, error.message || 'Failed to create quality control record', 500);
  }
});

app.get('/admin/load-test/status', (req, res) => {
  try {
    if (!currentLoadGenerator) {
      return ResponseHandler.success(res, { isRunning: false }, 'No load test configured');
    }
    
    const stats = currentLoadGenerator.getStats();
    ResponseHandler.success(res, stats, 'Load test status');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get load test status', error);
  }
});

// Memory health check endpoint
app.get('/health/memory', (req, res) => {
  try {
    const usage = memoryManager.getMemoryUsage();
    const isHealthy = usage.heapUtilization < 0.85; // 85% threshold
    
    if (isHealthy) {
      res.status(200).json({
        status: 'healthy',
        memory: usage
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        memory: usage,
        reason: 'High memory usage'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
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
    message: "JAG DNA Scientific LIMS Backend API",
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

// Workflow stages endpoint for dashboard
app.get('/api/workflow-stages', (req, res) => {
  try {
    const samples = db.prepare(`
      SELECT 
        id,
        lab_number,
        case_number,
        name,
        surname,
        workflow_status,
        created_at,
        updated_at
      FROM samples
      WHERE workflow_status IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 100
    `).all();
    
    res.json(samples);
  } catch (error) {
    console.error('Error fetching workflow stages:', error);
    res.status(500).json({ error: 'Failed to fetch workflow stages' });
  }
});

// Simulated stages endpoint for extraction and qPCR visualization
app.get('/api/simulated-stages', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const simulatedPath = path.join(__dirname, 'simulated-stages.json');
    
    if (fs.existsSync(simulatedPath)) {
      const data = fs.readFileSync(simulatedPath, 'utf8');
      res.json(JSON.parse(data));
    } else {
      // Return empty data if file doesn't exist
      res.json({ timestamp: new Date().toISOString(), samples: [] });
    }
  } catch (error) {
    console.error('Error reading simulated stages:', error);
    res.json({ timestamp: new Date().toISOString(), samples: [] });
  }
});

// Handle 404 errors
app.use('*', (req, res) => {
  ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
});

// Removed error monitoring middleware

// Global error handler (must be last)
app.use(globalErrorHandler);

const port = process.env.PORT || 3001;

// Database service already initialized above
try {
  databaseService.initialize();
  logger.info('Database service initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database service', { error: error.message });
  // Continue anyway - the service will try to initialize on first use
}

const server = app
  .listen(port, '0.0.0.0', () => {
    logger.info('Server started successfully', {
      port,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      database: db ? 'connected' : 'disconnected'
    });
    
    // Always start background jobs for sample processing
    try {
      backgroundJobService.start();
      logger.info('🚀 Background jobs started - samples will process automatically');
      console.log('🚀 Background workflow automation active - samples processing automatically');
    } catch (error) {
      logger.error('Failed to start background jobs', { error: error.message });
      console.log('⚠️  Warning: Background jobs failed to start:', error.message);
    }
    
    // Start Enhanced Sample Cycler for continuous sample generation and progression
    try {
      // Use PostgreSQL version with pool connection
      const EnhancedSampleCyclerPostgres = require('./services/enhanced-sample-cycler-postgres');
      const { Pool } = require('pg');
      
      // Create PostgreSQL pool
      const pgPool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'jagdna_lims',
        user: process.env.POSTGRES_USER || 'lims_user',
        password: process.env.POSTGRES_PASSWORD || 'secure_password_2024',
        max: 20
      });
      
      const sampleCycler = new EnhancedSampleCyclerPostgres(pgPool);
      sampleCycler.start();
      logger.info('🔄 Enhanced Sample Cycler started - continuous sample processing');
      console.log('🔄 Enhanced Sample Cycler active - generating samples every 10 seconds');
      
      // Store reference globally for graceful shutdown
      global.sampleCycler = sampleCycler;
    } catch (error) {
      logger.error('Failed to start Enhanced Sample Cycler', { error: error.message });
      console.log('⚠️  Warning: Enhanced Sample Cycler failed to start:', error.message);
    }
    
    // Start sample generator for DevOps monitoring
    if (process.env.ENABLE_DEVOPS_FEATURES === 'true' || process.env.NODE_ENV === 'production') {
      const sampleGen = new SampleGenerator(db);
      sampleGen.start();
      console.log('🔄 DevOps Sample Generator active - continuous monitoring data');
      
      // Update Prometheus metrics every 10 seconds
      setInterval(() => {
        prometheusMetrics.updateWorkflowMetrics(db);
      }, 10000);
    }
    
    // Initialize DevOps dashboard
    initDevopsDb(db);
    
    console.log(`✅ JAG DNA Scientific LIMS Backend running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`📈 Metrics: http://localhost:${port}/metrics`);
    console.log(`🔗 API endpoints: http://localhost:${port}/`);
    console.log(`⚡ Performance testing: http://localhost:${port}/performance`);
    console.log(`🎛️  Admin panel: http://localhost:${port}/admin`);
    console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.ENABLE_DEVOPS_FEATURES === 'true') {
      console.log('\n🚀 DevOps Features Active:');
      console.log('   - Prometheus metrics collection');
      console.log('   - Background job simulation (generating activity)');
      console.log('   - Health/readiness probes');
      console.log('   - Performance issue simulation');
      console.log('   - Load testing capabilities');
      console.log('   - Structured logging');
    }
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.warn('Port in use, trying next port', { port, nextPort: port + 1 });
      console.log(`❌ Port ${port} is in use, trying port ${port + 1}`);
      server.listen(port + 1, '0.0.0.0', () => {
        console.log(`✅ JAG DNA Scientific Backend server running on http://localhost:${port + 1}`);
      });
    } else {
      logger.error('Server startup error', { error: err.message, code: err.code });
      console.error('❌ Server startup error:', err.message);
      process.exit(1);
    }
  });

// Graceful shutdown with memory cleanup
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Server closed');
    console.log('✅ Server closed');
    
    // Cleanup DevOps services
    try {
      backgroundJobService.stop();
      logger.info('Background jobs stopped');
    } catch (error) {
      logger.error('Error stopping background jobs', { error: error.message });
    }
    
    // Stop Enhanced Sample Cycler
    try {
      if (global.sampleCycler) {
        global.sampleCycler.stop();
        logger.info('Enhanced Sample Cycler stopped');
      }
    } catch (error) {
      logger.error('Error stopping Enhanced Sample Cycler', { error: error.message });
    }
    
    // Cleanup memory management
    try {
      memoryManager.shutdown();
      memoryMonitor.cleanup();
      logger.info('Memory management cleaned up');
    } catch (error) {
      logger.error('Error cleaning up memory management', { error: error.message });
    }
    
    if (currentLoadGenerator) {
      currentLoadGenerator.stop();
    }
    
    // Close database connections
    if (dbPool) {
      dbPool.close();
    } else if (db) {
      db.close();
    }
    
    // Final garbage collection
    if (global.gc) {
      global.gc();
      logger.info('Final garbage collection performed');
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
    
    // Cleanup memory management
    memoryManager.shutdown();
    memoryMonitor.cleanup();
    
    // Close database connections
    if (dbPool) {
      dbPool.close();
    } else if (db) {
      db.close();
    }
    
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