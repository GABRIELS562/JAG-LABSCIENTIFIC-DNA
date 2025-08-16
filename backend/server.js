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
const { auditTrail, CRITICAL_ACTIONS, logSampleWorkflowChange, logSampleCreation } = require("./middleware/auditTrail");
const { authenticateToken, requireRole } = require('./middleware/auth');
const {
  authLimiter,
  apiLimiter,
  securityHeaders,
  corsOptions,
  sessionTimeout,
  securityLogger,
  validateInput
} = require('./middleware/sessionSecurity');

// Import routes
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const dbViewerRoutes = require("./routes/database-viewer");
const geneticAnalysisRoutes = require("./routes/genetic-analysis");
const reportsRoutes = require("./routes/reports");
const iso17025Routes = require("./routes/iso17025-enhanced");
const reportGenerationRoutes = require("./routes/report-generation");
const sampleDashboardRoutes = require("./routes/sample-dashboard");
const qualityControlRoutes = require("./routes/quality-control");
const webSocketService = require("./services/websocketService");
// Removed monitoring routes import

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

// Apply security middleware first
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(securityLogger);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced middleware with security features
app.use(sanitizeInput);
app.use(validateInput);

// Apply session timeout to authenticated routes
app.use('/api', sessionTimeout);

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

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
      conditions.push('(s.lab_number LIKE ? OR s.name LIKE ? OR s.surname LIKE ? OR s.case_number LIKE ? OR tc.ref_kit_number LIKE ? OR tc.test_purpose LIKE ? OR s.notes LIKE ? OR s.additional_notes LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const countQuery = `SELECT COUNT(*) as total FROM samples s LEFT JOIN test_cases tc ON s.case_id = tc.id ${whereClause}`;
    const total = db.prepare(countQuery).get(...params).total;
    
    const dataQuery = `
      SELECT 
        s.id, s.lab_number, s.name, s.surname, s.relation, s.status, s.gender,
        s.collection_date, s.workflow_status, s.case_number, s.batch_id, s.lab_batch_number,
        s.phone_number, s.email, s.id_number, s.notes, s.additional_notes, s.rerun_count,
        tc.test_purpose, tc.ref_kit_number, tc.client_type
      FROM samples s
      LEFT JOIN test_cases tc ON s.case_id = tc.id
      ${whereClause}
      ORDER BY s.lab_number ASC 
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

// Generate next lab number using sequence table for consistency
function generateLabNumber() {
  try {
    // Create lab_sequence table if it doesn't exist
    const createTableStmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS lab_sequence (
        id INTEGER PRIMARY KEY,
        next_lab_number INTEGER NOT NULL,
        year_prefix TEXT NOT NULL
      )
    `);
    createTableStmt.run();
    
    // Get or initialize the sequence
    let sequenceStmt = db.prepare('SELECT next_lab_number, year_prefix FROM lab_sequence WHERE id = 1');
    let sequence = sequenceStmt.get();
    
    if (!sequence) {
      // Initialize sequence by finding the highest existing lab number
      const existingStmt = db.prepare('SELECT lab_number FROM samples ORDER BY id DESC LIMIT 100');
      const results = existingStmt.all();
      
      let highestNumber = 420; // Default starting point as requested
      
      results.forEach(result => {
        const labNumber = result.lab_number;
        // Extract numbers that follow the "25_" pattern
        const matches = labNumber.match(/25_(\d+)/g);
        if (matches) {
          matches.forEach(match => {
            const number = parseInt(match.replace('25_', ''), 10);
            if (number > highestNumber) {
              highestNumber = number;
            }
          });
        }
      });
      
      // Insert initial sequence
      const initStmt = db.prepare(`
        INSERT INTO lab_sequence (id, next_lab_number, year_prefix) 
        VALUES (1, ?, ?)
      `);
      initStmt.run(highestNumber + 1, '25');
      sequence = { next_lab_number: highestNumber + 1, year_prefix: '25' };
    }
    
    const nextNumber = sequence.next_lab_number;
    const labNumber = `${sequence.year_prefix}_${nextNumber.toString().padStart(3, '0')}`;
    
    // Update sequence for next use
    const updateStmt = db.prepare(`
      UPDATE lab_sequence SET next_lab_number = ? WHERE id = 1
    `);
    updateStmt.run(nextNumber + 1);
    
    logger.info('Generated lab number', { labNumber, nextSequence: nextNumber + 1 });
    return labNumber;
    
  } catch (error) {
    logger.error('Error generating lab number', { error: error.message });
    
    // Fallback: use timestamp-based number
    const fallbackNumber = Date.now().toString().slice(-3);
    return `25_${fallbackNumber}`;
  }
}

// Create test case record for PaternityTestForm submissions
function createTestCase(testCaseData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO test_cases (
        case_number, ref_kit_number, submission_date, client_type, mother_present,
        email_contact, phone_contact, address_area, comments, test_purpose,
        sample_type, authorized_collector, consent_type, has_signatures, has_witness,
        witness_name, legal_declarations, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      testCaseData.case_number,
      testCaseData.ref_kit_number,
      testCaseData.submission_date,
      testCaseData.client_type,
      testCaseData.mother_present,
      testCaseData.email_contact,
      testCaseData.phone_contact,
      testCaseData.address_area,
      testCaseData.comments,
      testCaseData.test_purpose,
      testCaseData.sample_type,
      testCaseData.authorized_collector,
      testCaseData.consent_type,
      testCaseData.has_signatures,
      testCaseData.has_witness,
      testCaseData.witness_name,
      testCaseData.legal_declarations,
      testCaseData.status || 'pending'
    );
    
    return { id: result.lastInsertRowid, ...testCaseData };
  } catch (error) {
    logger.error('Error creating test case', { error: error.message, testCaseData });
    throw error;
  }
}

function createSample(sampleData, req = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO samples (
        case_id, lab_number, name, surname, relation, status, phone_number,
        date_of_birth, place_of_birth, nationality, address, email, 
        id_number, id_type, collection_date, submission_date, sample_type,
        case_number, kit_batch_number, workflow_status, gender,
        test_purpose, client_type, urgent,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      sampleData.case_id,
      sampleData.lab_number,
      sampleData.name,
      sampleData.surname,
      sampleData.relation || 'child',
      sampleData.status || 'pending',
      sampleData.phone_number,
      sampleData.date_of_birth || sampleData.dateOfBirth,
      sampleData.place_of_birth || sampleData.placeOfBirth,
      sampleData.nationality,
      sampleData.address,
      sampleData.email,
      sampleData.id_number || sampleData.idNumber,
      sampleData.id_type || sampleData.idType,
      sampleData.collection_date || sampleData.collectionDate,
      sampleData.submission_date || sampleData.submissionDate,
      sampleData.sample_type || sampleData.sampleType || 'buccal_swab',
      sampleData.case_number,
      sampleData.kit_batch_number,
      sampleData.workflow_status || 'sample_collected',
      sampleData.gender,
      sampleData.test_purpose || 'peace_of_mind',
      sampleData.client_type || 'paternity',
      sampleData.urgent ? 1 : 0
    );
    
    const createdSample = { id: result.lastInsertRowid, ...sampleData };
    
    // Log sample creation with audit trail
    if (req) {
      logSampleCreation(
        createdSample,
        req.user?.id || null,
        req.user?.username || 'system',
        req.ip || req.connection?.remoteAddress
      );
    }
    
    return createdSample;
  } catch (error) {
    logger.error('Error creating sample', { error: error.message, sampleData });
    throw error;
  }
}

// Use routes with fallback handling
try {
  app.use("/api/auth", authRoutes);
  // app.use("/api", apiRoutes); // Disabled - using server.js endpoints instead
  // app.use("/api/db", dbViewerRoutes);
  app.use("/api/genetic-analysis", geneticAnalysisRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/iso17025", iso17025Routes);
  app.use("/api/report-generation", reportGenerationRoutes);
  app.use("/api/samples", sampleDashboardRoutes);
  app.use("/api/qc", qualityControlRoutes);
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

// Dashboard endpoints
app.get("/api/samples/dashboard-stats", (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN workflow_status = 'sample_collected' THEN 1 ELSE 0 END) as sample_collected,
        SUM(CASE WHEN workflow_status = 'pcr_ready' THEN 1 ELSE 0 END) as pcr_ready,
        SUM(CASE WHEN workflow_status = 'pcr_batched' THEN 1 ELSE 0 END) as pcr_batched,
        SUM(CASE WHEN workflow_status = 'pcr_completed' THEN 1 ELSE 0 END) as pcr_completed,
        SUM(CASE WHEN workflow_status = 'electro_ready' THEN 1 ELSE 0 END) as electro_ready,
        SUM(CASE WHEN workflow_status = 'electro_batched' THEN 1 ELSE 0 END) as electro_batched,
        SUM(CASE WHEN workflow_status = 'electro_completed' THEN 1 ELSE 0 END) as electro_completed,
        SUM(CASE WHEN workflow_status = 'analysis_ready' THEN 1 ELSE 0 END) as analysis_ready,
        SUM(CASE WHEN workflow_status = 'analysis_completed' THEN 1 ELSE 0 END) as analysis_completed,
        SUM(CASE WHEN workflow_status = 'report_generated' THEN 1 ELSE 0 END) as report_generated
      FROM samples
    `).get();

    const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as received,
        SUM(CASE WHEN workflow_status != 'sample_collected' THEN 1 ELSE 0 END) as processed,
        SUM(CASE WHEN workflow_status = 'analysis_completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN workflow_status = 'report_generated' THEN 1 ELSE 0 END) as reports_generated
      FROM samples
      WHERE DATE(created_at) = DATE('now')
    `).get();

    const batchStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'pcr' AND status = 'processing' THEN 1 ELSE 0 END) as pcr_active,
        SUM(CASE WHEN type = 'electrophoresis' AND status = 'processing' THEN 1 ELSE 0 END) as electro_active,
        SUM(CASE WHEN type = 'rerun' AND status = 'processing' THEN 1 ELSE 0 END) as rerun_active,
        COUNT(*) as total_today
      FROM batches
      WHERE DATE(created_at) = DATE('now')
    `).get() || { pcr_active: 0, electro_active: 0, rerun_active: 0, total_today: 0 };

    const response = {
      workflow: {
        sample_collected: stats.sample_collected || 0,
        pcr_ready: stats.pcr_ready || 0,
        pcr_batched: stats.pcr_batched || 0,
        pcr_completed: stats.pcr_completed || 0,
        electro_ready: stats.electro_ready || 0,
        electro_batched: stats.electro_batched || 0,
        electro_completed: stats.electro_completed || 0,
        analysis_ready: stats.analysis_ready || 0,
        analysis_completed: stats.analysis_completed || 0,
        report_generated: stats.report_generated || 0
      },
      pending: {
        pcr_queue: stats.pcr_ready || 0,
        electro_queue: stats.electro_ready || 0,
        analysis_queue: stats.analysis_ready || 0,
        reporting_queue: stats.analysis_completed || 0
      },
      today: todayStats || { received: 0, processed: 0, completed: 0, reports_generated: 0 },
      batches: batchStats
    };

    ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    ResponseHandler.error(res, 'Failed to fetch dashboard stats', error);
  }
});

app.get("/api/samples/turnaround-metrics", (req, res) => {
  try {
    // For now, return mock data - can be enhanced with real calculations later
    const metrics = {
      average_tat: 3.5,
      min_tat: 2,
      max_tat: 7,
      current_week: 3.2,
      last_week: 3.8,
      monthly_trend: [3.5, 3.7, 3.4, 3.2, 3.1, 3.2],
      by_stage: {
        collection_to_pcr: 0.5,
        pcr_to_electro: 1.0,
        electro_to_analysis: 0.8,
        analysis_to_report: 0.7
      }
    };
    
    ResponseHandler.success(res, metrics);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch turnaround metrics', error);
  }
});

app.get("/api/samples/recent-activity", (req, res) => {
  try {
    const recentSamples = db.prepare(`
      SELECT 
        'sample' as type,
        'New sample registered: ' || lab_number as action,
        name || ' ' || surname as user,
        created_at as time
      FROM samples
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    const activities = recentSamples.map(item => ({
      type: item.type,
      action: item.action,
      user: item.user || 'System',
      time: formatTimeAgo(item.time)
    }));

    ResponseHandler.success(res, activities);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch recent activity', error);
  }
});

// Helper function for time formatting
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // Difference in seconds
  
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

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
        collection_date, workflow_status, case_number, rerun_count
      FROM samples 
      ORDER BY id DESC
    `);
    const samples = stmt.all();
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch all samples', error);
  }
});

app.post("/api/samples", authenticateToken, requireRole(['admin', 'supervisor', 'staff']), auditTrail(CRITICAL_ACTIONS.SAMPLE_CREATE, 'samples'), (req, res) => {
  try {
    const newSample = createSample(req.body, req);
    ResponseHandler.success(res, newSample, 'Sample created successfully', 201);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to create sample', error);
  }
});

// Workflow management endpoints
const workflowService = require('./services/workflowService');

// Update sample workflow status - Staff only
app.put("/api/samples/:id/status", authenticateToken, requireRole(['admin', 'supervisor', 'staff']), auditTrail('SAMPLE_STATUS_UPDATE', 'samples'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, context } = req.body;
    
    const result = await workflowService.updateSampleStatus(id, status, context);
    
    if (result.success) {
      ResponseHandler.success(res, result.sample, 'Status updated successfully');
    } else {
      ResponseHandler.error(res, result.error);
    }
  } catch (error) {
    ResponseHandler.error(res, 'Failed to update sample status', error);
  }
});

// Handle batch completion - Staff only
app.post("/api/batches/:batchId/complete", authenticateToken, requireRole(['admin', 'supervisor', 'staff']), auditTrail('BATCH_COMPLETE', 'batches'), async (req, res) => {
  try {
    const { batchId } = req.params;
    const { batchType, completionStatus } = req.body;
    
    const result = await workflowService.handleBatchCompletion(batchId, batchType, completionStatus);
    
    if (result.success) {
      ResponseHandler.success(res, result, 'Batch completed successfully');
    } else {
      ResponseHandler.error(res, result.error);
    }
  } catch (error) {
    ResponseHandler.error(res, 'Failed to complete batch', error);
  }
});

// Progress workflow automatically - Staff only
app.post("/api/workflow/progress", authenticateToken, requireRole(['admin', 'supervisor', 'staff']), auditTrail('WORKFLOW_PROGRESS', 'workflow'), async (req, res) => {
  try {
    const result = await workflowService.progressWorkflow();
    
    if (result.success) {
      ResponseHandler.success(res, result, 'Workflow progressed successfully');
    } else {
      ResponseHandler.error(res, result.error);
    }
  } catch (error) {
    ResponseHandler.error(res, 'Failed to progress workflow', error);
  }
});

// Get workflow statistics
app.get("/api/workflow/stats", async (req, res) => {
  try {
    const stats = await workflowService.getWorkflowStats();
    ResponseHandler.success(res, stats, 'Workflow statistics retrieved');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get workflow stats', error);
  }
});

// Get active batches
app.get("/api/batches/active", async (req, res) => {
  try {
    const batches = db.prepare(`
      SELECT * FROM batches 
      WHERE status = 'active' 
      ORDER BY created_at DESC
    `).all();
    
    ResponseHandler.success(res, batches, 'Active batches retrieved');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get active batches', error);
  }
});

// GeneMapper import and analysis endpoints
const geneMapperParser = require('./services/geneMapperParser');

// Import GeneMapper results - Staff only
app.post("/api/analysis/import-genemapper", authenticateToken, requireRole(['admin', 'supervisor', 'staff']), auditTrail('GENEMAPPER_IMPORT', 'analysis'), async (req, res) => {
  try {
    const { fileContent, batchId } = req.body;
    
    if (!fileContent) {
      return ResponseHandler.error(res, 'No file content provided');
    }
    
    const result = await geneMapperParser.parseGeneMapperFile(fileContent, batchId);
    
    if (result.success) {
      ResponseHandler.success(res, result, `Successfully imported ${result.samplesProcessed} samples`);
    } else {
      ResponseHandler.error(res, 'Failed to import GeneMapper data');
    }
  } catch (error) {
    logger.error('GeneMapper import error:', error);
    ResponseHandler.error(res, 'Failed to import GeneMapper data', error);
  }
});

// Analyze paternity case - Staff only
app.post("/api/analysis/paternity/:caseNumber", authenticateToken, requireRole(['admin', 'supervisor', 'staff']), auditTrail('PATERNITY_ANALYSIS', 'analysis'), async (req, res) => {
  try {
    const { caseNumber } = req.params;
    
    const result = await geneMapperParser.analyzePaternityCase(caseNumber);
    
    if (result.error) {
      ResponseHandler.error(res, result.error);
    } else {
      ResponseHandler.success(res, result, 'Paternity analysis completed');
    }
  } catch (error) {
    logger.error('Paternity analysis error:', error);
    ResponseHandler.error(res, 'Failed to analyze paternity', error);
  }
});

// Generate paternity report - Staff only
const ReportGenerator = require('./services/reportGenerator');
const reportGenerator = new ReportGenerator();

app.post("/api/reports/generate/:caseNumber", authenticateToken, requireRole(['admin', 'supervisor', 'staff']), auditTrail('REPORT_GENERATION', 'reports'), async (req, res) => {
  try {
    const { caseNumber } = req.params;
    
    // Get case data
    const caseData = db.prepare(`
      SELECT DISTINCT 
        case_number as case_id,
        'paternity' as case_type,
        MIN(created_at) as created_date,
        'completed' as status,
        'normal' as priority
      FROM samples
      WHERE case_number = ?
      GROUP BY case_number
    `).get(caseNumber);

    if (!caseData) {
      return ResponseHandler.error(res, 'Case not found');
    }

    // Get samples
    const samples = db.prepare(`
      SELECT 
        lab_number as sample_id,
        relation as sample_type,
        90 as quality_score,
        collection_date as received_date
      FROM samples
      WHERE case_number = ?
    `).all(caseNumber);

    caseData.samples = samples;

    // Get analysis results
    const analysisResults = db.prepare(`
      SELECT 
        probability as paternity_probability,
        exclusions,
        result as conclusion
      FROM genetic_cases
      WHERE case_number = ?
      ORDER BY created_date DESC
      LIMIT 1
    `).get(caseNumber);

    if (!analysisResults) {
      return ResponseHandler.error(res, 'No analysis results found for this case');
    }

    // Add default values
    analysisResults.total_loci = 21;
    analysisResults.matching_loci = analysisResults.exclusions > 0 ? 0 : 21;
    analysisResults.quality_score = 95;
    analysisResults.exclusion_probability = 100 - analysisResults.paternity_probability;

    // Get STR comparisons
    const lociComparisons = db.prepare(`
      SELECT 
        locus,
        allele1 as child_allele_1,
        allele2 as child_allele_2,
        allele1 as father_allele_1,
        allele2 as father_allele_2,
        '' as mother_allele_1,
        '' as mother_allele_2,
        1 as match_status
      FROM str_profiles
      WHERE sample_id IN (SELECT id FROM samples WHERE case_number = ?)
      GROUP BY locus
      LIMIT 21
    `).all(caseNumber);

    // Generate report
    const reportResult = await reportGenerator.generatePaternityReport(
      caseData,
      analysisResults,
      lociComparisons || []
    );

    if (reportResult.success) {
      ResponseHandler.success(res, reportResult, 'Report generated successfully');
    } else {
      ResponseHandler.error(res, 'Failed to generate report', reportResult.error);
    }
  } catch (error) {
    logger.error('Report generation error:', error);
    ResponseHandler.error(res, 'Failed to generate report', error);
  }
});

// Import samples from tab-delimited text - Staff only
app.post("/api/samples/import", authenticateToken, requireRole(['admin', 'supervisor', 'staff']), auditTrail('SAMPLE_BATCH_IMPORT', 'samples'), async (req, res) => {
  try {
    const SampleImporter = require('./utils/sampleImporter');
    const importer = new SampleImporter();
    
    const { textData } = req.body;
    if (!textData) {
      return ResponseHandler.error(res, 'No data provided for import');
    }
    
    const results = await importer.importFromText(textData);
    
    if (results.successful > 0) {
      ResponseHandler.success(res, results, `Successfully imported ${results.successful} samples`);
    } else {
      ResponseHandler.error(res, 'No samples were imported', results.errors);
    }
  } catch (error) {
    logger.error('Sample import error:', error);
    ResponseHandler.error(res, 'Failed to import samples', error);
  }
});

// Increment rerun count for samples
app.post("/api/samples/increment-rerun-count", auditTrail('SAMPLE_RERUN_INCREMENT', 'samples'), (req, res) => {
  try {
    const { sampleIds } = req.body;
    
    if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
      return ResponseHandler.error(res, 'Sample IDs array is required', null, 400);
    }
    
    // First check if rerun_count column exists, if not add it
    try {
      db.exec(`ALTER TABLE samples ADD COLUMN rerun_count INTEGER DEFAULT 0`);
    } catch (alterError) {
      // Column likely already exists, ignore error
    }
    
    const transaction = db.transaction(() => {
      const updateStmt = db.prepare(`
        UPDATE samples 
        SET rerun_count = COALESCE(rerun_count, 0) + 1, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      let updatedCount = 0;
      sampleIds.forEach(sampleId => {
        const result = updateStmt.run(sampleId);
        if (result.changes > 0) {
          updatedCount++;
        }
      });
      
      return updatedCount;
    });
    
    const updatedCount = transaction();
    ResponseHandler.success(res, { 
      updatedCount, 
      message: `Updated rerun count for ${updatedCount} samples` 
    });
    
  } catch (error) {
    console.error('Error incrementing rerun count:', error);
    ResponseHandler.error(res, 'Failed to increment rerun count', error);
  }
});

// Update workflow status for samples
app.post("/api/samples/update-workflow-status", auditTrail(CRITICAL_ACTIONS.SAMPLE_STATUS_CHANGE, 'samples'), (req, res) => {
  try {
    const { sampleIds, workflowStatus, batchNumber } = req.body;
    
    if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
      return ResponseHandler.error(res, 'Sample IDs array is required', null, 400);
    }
    
    if (!workflowStatus) {
      return ResponseHandler.error(res, 'Workflow status is required', null, 400);
    }
    
    // Get current status before updating for audit trail
    const getCurrentStatusStmt = db.prepare('SELECT workflow_status FROM samples WHERE id = ?');
    const currentStatuses = sampleIds.map(id => ({
      id: id,
      oldStatus: getCurrentStatusStmt.get(id)?.workflow_status || 'unknown'
    }));
    
    const transaction = db.transaction(() => {
      const updateStmt = db.prepare(`
        UPDATE samples 
        SET workflow_status = ?, 
            lab_batch_number = COALESCE(?, lab_batch_number),
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      let updatedCount = 0;
      sampleIds.forEach(sampleId => {
        const result = updateStmt.run(workflowStatus, batchNumber, sampleId);
        if (result.changes > 0) {
          updatedCount++;
        }
      });
      
      return updatedCount;
    });
    
    const updatedCount = transaction();
    
    // Log workflow changes with old and new values
    logSampleWorkflowChange(
      sampleIds,
      currentStatuses[0]?.oldStatus || 'unknown',
      workflowStatus,
      req.user?.id || null,
      req.user?.username || 'system',
      req.ip || req.connection?.remoteAddress,
      batchNumber
    );
    ResponseHandler.success(res, { 
      updatedCount, 
      message: `Updated workflow status to '${workflowStatus}' for ${updatedCount} samples` 
    });
    
  } catch (error) {
    console.error('Error updating workflow status:', error);
    ResponseHandler.error(res, 'Failed to update workflow status', error);
  }
});

// Submit paternity test form - NEW BN Kit System
app.post("/api/submit-test", auditTrail('TEST_CASE_CREATE', 'test_cases'), (req, res) => {
  try {
    const { childrenRows, childRow, fatherRow, motherRow, clientType, signatures, witness, legalDeclarations, consentType, sampleType, numberOfChildren } = req.body;
    
    // Generate BN kit number using sequence table
    let kitNumber;
    try {
      const sequenceStmt = db.prepare('SELECT next_bn_number FROM bn_sequence WHERE id = 1');
      const sequence = sequenceStmt.get();
      
      const nextNumber = sequence ? sequence.next_bn_number : 69; // Start from 69 (next after migration)
      kitNumber = `BN-${nextNumber.toString().padStart(4, '0')}`;
      
      // Update sequence for next use
      const updateStmt = db.prepare(`
        INSERT OR REPLACE INTO bn_sequence (id, next_bn_number) 
        VALUES (1, ?)
      `);
      updateStmt.run(nextNumber + 1);
    } catch (error) {
      console.error('Error generating BN kit number:', error);
      // Fallback to timestamp-based kit number
      kitNumber = `BN-${Date.now().toString().slice(-4)}`;
    }
    
    // For now, use kit number as case number (will be replaced with LDS batching later)
    const caseNumber = kitNumber;
    
    // Use childrenRows (new format) or fallback to childRow (legacy)
    const children = childrenRows || (childRow ? [childRow] : []);
    const firstChild = children[0];
    
    // Create test case record first
    const testCase = createTestCase({
      case_number: caseNumber,
      ref_kit_number: kitNumber,
      submission_date: firstChild?.submissionDate || new Date().toISOString().split('T')[0],
      client_type: clientType || 'peace_of_mind',
      mother_present: motherRow ? 'YES' : 'NO',
      email_contact: firstChild?.emailContact,
      phone_contact: firstChild?.phoneContact,
      address_area: firstChild?.addressArea,
      comments: firstChild?.comments,
      test_purpose: firstChild?.testPurpose || 'peace_of_mind',
      sample_type: firstChild?.sampleType || 'buccal_swab',
      authorized_collector: firstChild?.authorizedCollector,
      consent_type: consentType || 'paternity',
      has_signatures: signatures ? 'YES' : 'NO',
      has_witness: witness ? 'YES' : 'NO',
      witness_name: witness?.name,
      legal_declarations: legalDeclarations ? JSON.stringify(legalDeclarations) : null
    });
    
    // Create samples for each person and link to test case
    const samples = [];
    let fatherSample = null;
    
    // Create father sample first to get his lab number
    if (fatherRow && fatherRow.name) {
      try {
        fatherSample = createSample({
        case_id: testCase.id,
        lab_number: fatherRow.labNo || generateLabNumber(),
        name: fatherRow.name,
        surname: fatherRow.surname,
        relation: 'alleged_father',
        status: 'pending',
        phone_number: fatherRow.phoneNumber || fatherRow.phoneContact,
        date_of_birth: fatherRow.dateOfBirth,
        place_of_birth: fatherRow.placeOfBirth,
        nationality: fatherRow.nationality,
        address: fatherRow.address,
        email: fatherRow.email,
        id_number: fatherRow.idNumber,
        id_type: fatherRow.idType,
        collection_date: fatherRow.collectionDate || new Date().toISOString().split('T')[0],
        submission_date: fatherRow.submissionDate || new Date().toISOString().split('T')[0],
        sample_type: fatherRow.sampleType || 'buccal_swab',
        case_number: caseNumber,
        kit_batch_number: kitNumber,
        workflow_status: 'sample_collected',
        test_purpose: firstChild?.testPurpose || 'peace_of_mind',
        client_type: clientType || 'peace_of_mind',
        urgent: clientType === 'urgent' || firstChild?.testPurpose === 'urgent'
        });
        samples.push(fatherSample);
      } catch (fatherError) {
        console.error('❌ Error creating father sample:', fatherError.message);
        throw fatherError;
      }
    }
    
    // Create child samples with father's lab number in brackets
    if (children && children.length > 0) {
      children.forEach((child, index) => {
        try {
          let childLabNumber = child.labNo || generateLabNumber();
          
          // Format child lab number with father's lab number in brackets if father exists
          if (fatherSample && fatherSample.lab_number) {
            // Extract base number from child lab number (e.g., "25_421" -> "421")
            const childBaseNumber = childLabNumber.split('_')[1];
            // Determine gender from child data (default to M if not specified)
            const genderIndicator = (child.gender && child.gender.toLowerCase() === 'f') ? 'F' : 'M';
            // Format as child(father)M or child(father)F
            childLabNumber = `25_${childBaseNumber}(${fatherSample.lab_number})${genderIndicator}`;
          }
          
          const childSample = createSample({
          case_id: testCase.id,
          lab_number: childLabNumber,
          name: child.name,
          surname: child.surname,
          relation: 'child',
          status: 'pending',
          phone_number: child.phoneNumber || child.phoneContact,
          date_of_birth: child.dateOfBirth,
          place_of_birth: child.placeOfBirth,
          nationality: child.nationality,
          address: child.address,
          email: child.email,
          id_number: child.idNumber,
          id_type: child.idType,
          collection_date: child.collectionDate || new Date().toISOString().split('T')[0],
          submission_date: child.submissionDate || new Date().toISOString().split('T')[0],
          sample_type: child.sampleType || 'buccal_swab',
          case_number: caseNumber,
          kit_batch_number: kitNumber,
          workflow_status: 'sample_collected',
          gender: (child.gender && child.gender.toLowerCase() === 'f') ? 'F' : 'M',
          test_purpose: child.testPurpose || firstChild?.testPurpose || 'peace_of_mind',
          client_type: clientType || 'peace_of_mind',
          urgent: clientType === 'urgent' || child.testPurpose === 'urgent'
          });
          samples.push(childSample);
        } catch (childError) {
          console.error('❌ Error creating child sample:', childError.message);
          throw childError;
        }
      });
    }
    
    // Create mother sample
    if (motherRow && motherRow.name) {
      const motherSample = createSample({
        case_id: testCase.id,
        lab_number: motherRow.labNo || generateLabNumber(),
        name: motherRow.name,
        surname: motherRow.surname,
        relation: 'mother',
        status: 'pending',
        phone_number: motherRow.phoneNumber || motherRow.phoneContact,
        date_of_birth: motherRow.dateOfBirth,
        place_of_birth: motherRow.placeOfBirth,
        nationality: motherRow.nationality,
        address: motherRow.address,
        email: motherRow.email,
        id_number: motherRow.idNumber,
        id_type: motherRow.idType,
        collection_date: motherRow.collectionDate || new Date().toISOString().split('T')[0],
        submission_date: motherRow.submissionDate || new Date().toISOString().split('T')[0],
        sample_type: motherRow.sampleType || 'buccal_swab',
        case_number: caseNumber,
        kit_batch_number: kitNumber,
        workflow_status: 'sample_collected',
        test_purpose: firstChild?.testPurpose || 'peace_of_mind',
        client_type: clientType || 'peace_of_mind',
        urgent: clientType === 'urgent' || firstChild?.testPurpose === 'urgent'
      });
      samples.push(motherSample);
    }
    
    ResponseHandler.success(res, {
      testCase,
      samples,
      testType: clientType,
      caseNumber: testCase.case_number
    }, 'Paternity test submitted successfully', 201);
    
  } catch (error) {
    logger.error('Error submitting paternity test', { error: error.message, body: req.body });
    ResponseHandler.error(res, 'Failed to submit paternity test', error);
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

// Update workflow status for multiple samples
app.put("/api/samples/workflow-status", auditTrail(CRITICAL_ACTIONS.SAMPLE_STATUS_CHANGE, 'samples'), (req, res) => {
  try {
    const { sampleIds, workflowStatus } = req.body;
    
    if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
      return ResponseHandler.error(res, 'Sample IDs are required and must be an array');
    }
    
    if (!workflowStatus) {
      return ResponseHandler.error(res, 'Workflow status is required');
    }
    
    // Update workflow status for all provided sample IDs
    const placeholders = sampleIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE samples 
      SET workflow_status = ?, updated_at = datetime('now') 
      WHERE id IN (${placeholders})
    `);
    
    const result = stmt.run(workflowStatus, ...sampleIds);
    
    ResponseHandler.success(res, {
      updatedCount: result.changes,
      workflowStatus,
      sampleIds
    }, `Successfully updated ${result.changes} samples to ${workflowStatus}`);
    
  } catch (error) {
    logger.error('Error updating workflow status', { error: error.message });
    ResponseHandler.error(res, 'Failed to update workflow status', error);
  }
});

app.get("/api/samples/queue/:queueType", (req, res) => {
  try {
    const { queueType } = req.params;
    const validQueues = ['pcr_ready', 'pcr_batched', 'electro_ready', 'electro_batched', 'analysis_ready', 'completed'];
    
    if (!validQueues.includes(queueType)) {
      return ResponseHandler.error(res, `Invalid queue type. Must be one of: ${validQueues.join(', ')}`, 400);
    }
    
    let samples = [];
    let whereClause = '';
    
    switch (queueType) {
      case 'pcr_ready':
        whereClause = "WHERE workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL";
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
    
    // Enhanced search with case information and more fields
    const stmt = db.prepare(`
      SELECT 
        s.*,
        tc.case_number,
        tc.ref_kit_number,
        tc.client_type,
        tc.test_purpose,
        tc.has_signatures,
        tc.has_witness
      FROM samples s
      LEFT JOIN test_cases tc ON s.case_id = tc.id
      WHERE s.lab_number LIKE ? 
         OR s.name LIKE ? 
         OR s.surname LIKE ? 
         OR s.id_number LIKE ?
         OR s.phone_number LIKE ?
         OR tc.case_number LIKE ?
         OR tc.ref_kit_number LIKE ?
      ORDER BY s.case_id DESC, 
        CASE s.relation 
          WHEN 'Child' THEN 1 
          WHEN 'Father' THEN 2 
          WHEN 'Mother' THEN 3 
          ELSE 4 
        END ASC
      LIMIT 50
    `);
    
    const searchTerm = `%${query}%`;
    const samples = stmt.all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to search samples', error);
  }
});

// Batch endpoints
app.post("/api/generate-batch", auditTrail(CRITICAL_ACTIONS.BATCH_CREATE, 'batches'), (req, res) => {
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

// Get samples with test case data for verification
app.get("/api/samples-with-cases", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        s.*,
        tc.case_number,
        tc.ref_kit_number,
        tc.client_type,
        tc.test_purpose,
        tc.has_signatures,
        tc.has_witness
      FROM samples s
      LEFT JOIN test_cases tc ON s.case_id = tc.id
      ORDER BY s.case_id DESC, 
        CASE s.relation 
          WHEN 'Child' THEN 1 
          WHEN 'Father' THEN 2 
          WHEN 'Mother' THEN 3 
          ELSE 4 
        END ASC
    `);
    
    const samples = stmt.all();
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch samples with cases', error);
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
    ResponseHandler.success(res, []);
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

// Rerun functionality endpoints
app.post("/api/samples/increment-rerun-count", auditTrail('SAMPLE_RERUN_INCREMENT', 'samples'), (req, res) => {
  const transaction = db.transaction(() => {
    const { sampleIds } = req.body;
    
    if (!sampleIds || !Array.isArray(sampleIds)) {
      throw new Error('sampleIds array is required');
    }

    // Ensure rerun_count column exists
    try {
      db.prepare(`ALTER TABLE samples ADD COLUMN rerun_count INTEGER DEFAULT 0`).run();
    } catch (error) {
      // Column might already exist
    }

    const updateStmt = db.prepare(`
      UPDATE samples 
      SET rerun_count = COALESCE(rerun_count, 0) + 1, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    let updatedCount = 0;
    sampleIds.forEach(sampleId => {
      const result = updateStmt.run(sampleId);
      if (result.changes > 0) {
        updatedCount++;
      }
    });

    return { updatedCount };
  });

  try {
    const result = transaction();
    ResponseHandler.success(res, result, 'Rerun count incremented successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to increment rerun count', 500, 'INCREMENT_ERROR', { message: error.message });
  }
});

app.post("/api/samples/update-workflow-status", auditTrail(CRITICAL_ACTIONS.SAMPLE_STATUS_CHANGE, 'samples'), (req, res) => {
  const transaction = db.transaction(() => {
    const { sampleIds, status, batchNumber } = req.body;
    
    if (!sampleIds || !Array.isArray(sampleIds) || !status) {
      throw new Error('sampleIds array and status are required');
    }

    const updateStmt = db.prepare(`
      UPDATE samples 
      SET workflow_status = ?, 
          lab_batch_number = COALESCE(?, lab_batch_number),
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    let updatedCount = 0;
    sampleIds.forEach(sampleId => {
      const result = updateStmt.run(status, batchNumber, sampleId);
      if (result.changes > 0) {
        updatedCount++;
      }
    });

    return { updatedCount, status, batchNumber };
  });

  try {
    const result = transaction();
    ResponseHandler.success(res, result, 'Workflow status updated successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to update workflow status', 500, 'UPDATE_ERROR', { message: error.message });
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

const server = app
  .listen(port, '0.0.0.0', () => {
    logger.info('Server started successfully', {
      port,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      database: db ? 'connected' : 'disconnected'
    });
    
    // Initialize WebSocket service
    webSocketService.initialize(server);
    
    })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.warn('Port in use, trying next port', { port, nextPort: port + 1 });
      server.listen(port + 1, '0.0.0.0', () => {
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
  server.close(() => {
    logger.info('Server closed');
    // Cleanup services
    // performanceMonitor and cacheService are not used in this simplified version
    
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
  server.close(() => {
    logger.info('Server closed');
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

module.exports = { app, webSocketService };