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
// Removed monitoring routes import

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize database connection with better configuration
const dbPath = path.join(__dirname, 'database', 'ashley_lims.db');
let db = null;

try {
  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null,
    fileMustExist: false
  });
  
  // Configure database for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 1000000');
  db.pragma('temp_store = memory');
  db.pragma('mmap_size = 268435456'); // 256MB
  
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

// DevOps middleware
app.use(metricsMiddleware);
app.use(sanitizeInput);

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
    
    // Use prepared statements for better performance
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
    // Track database query metrics
    trackDatabaseQuery('SELECT', 'samples', Date.now() - Date.now());
  }
}

// Cache sample counts for better performance
let sampleCountsCache = null;
let sampleCountsCacheExpiry = 0;
const CACHE_DURATION = 30000; // 30 seconds

function getSampleCounts() {
  try {
    const now = Date.now();
    
    // Return cached result if still valid
    if (sampleCountsCache && now < sampleCountsCacheExpiry) {
      return sampleCountsCache;
    }
    
    // Use a single optimized query instead of multiple queries
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN workflow_status IN ('sample_collected', 'extraction_ready', 'pcr_ready') AND batch_id IS NULL AND extraction_id IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN workflow_status IN ('sample_collected', 'extraction_ready') AND extraction_id IS NULL THEN 1 END) as extraction_ready,
        COUNT(CASE WHEN workflow_status IN ('extraction_batched', 'extraction_in_progress', 'extraction_completed') AND extraction_id IS NOT NULL THEN 1 END) as extraction_batched,
        COUNT(CASE WHEN workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%' AND lab_batch_number NOT LIKE '%_RR') THEN 1 END) as pcrBatched,
        COUNT(CASE WHEN workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%') THEN 1 END) as electroBatched,
        COUNT(CASE WHEN workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR') THEN 1 END) as rerunBatched,
        COUNT(CASE WHEN workflow_status IN ('analysis_completed') THEN 1 END) as completed,
        COUNT(CASE WHEN workflow_status IN ('pcr_batched', 'pcr_completed') THEN 1 END) as processing
      FROM samples
    `);
    
    const result = stmt.get();
    
    // Cache the result
    sampleCountsCache = result;
    sampleCountsCacheExpiry = now + CACHE_DURATION;
    
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
      sampleCountsCache = null;
      
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
  // app.use("/api/auth", authRoutes);
  // app.use("/api", apiRoutes); // Disabled - using server.js endpoints instead
  // app.use("/api/db", dbViewerRoutes);
  app.use("/api/genetic-analysis", geneticAnalysisRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/qms", qmsRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/ai-ml", aiMlRoutes);
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
    ResponseHandler.paginated(res, result.data, result.pagination);
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
    ResponseHandler.error(res, 'Failed to create sample', error);
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
        whereClause = "WHERE workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%' AND lab_batch_number NOT LIKE '%_RR')";
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
        id, lab_number, name, surname, relation, status, 
        collection_date, workflow_status, case_number, batch_id, lab_batch_number
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

// Legacy API endpoints for compatibility
app.get("/api/get-last-lab-number", (req, res) => {
  try {
    const stmt = db.prepare('SELECT lab_number FROM samples ORDER BY id DESC LIMIT 1');
    const result = stmt.get();
    ResponseHandler.success(res, result ? result.lab_number : '25_001');
  } catch (error) {
    ResponseHandler.success(res, '25_001');
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

// Removed error monitoring middleware

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
    
    // Start background jobs for DevOps demonstration (only if enabled)
    if (process.env.ENABLE_DEVOPS_FEATURES === 'true') {
      try {
        backgroundJobService.start();
        logger.info('🚀 DevOps features enabled - background jobs started');
        console.log('🚀 DevOps demo mode active - generating continuous activity');
      } catch (error) {
        logger.error('Failed to start background jobs', { error: error.message });
      }
    } else {
      logger.info('💤 DevOps features disabled - running in quiet mode');
      console.log('💤 Running in quiet mode (no background activity)');
      console.log('   To enable DevOps features, use: ENABLE_DEVOPS_FEATURES=true npm start');
    }
    
    console.log(`✅ LabScientific LIMS Backend running on http://localhost:${port}`);
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
    
    // Cleanup DevOps services
    try {
      backgroundJobService.stop();
      logger.info('Background jobs stopped');
    } catch (error) {
      logger.error('Error stopping background jobs', { error: error.message });
    }
    
    if (currentLoadGenerator) {
      currentLoadGenerator.stop();
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