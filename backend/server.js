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
// Removed unused middleware imports

// Import routes
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const dbViewerRoutes = require("./routes/database-viewer");
const geneticAnalysisRoutes = require("./routes/genetic-analysis");
const reportsRoutes = require("./routes/reports");
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

// Basic middleware (removed monitoring for portfolio simplicity)
app.use(sanitizeInput);

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

// Generate next lab number based on the last one
function generateLabNumber() {
  try {
    const stmt = db.prepare('SELECT lab_number FROM samples ORDER BY id DESC LIMIT 1');
    const result = stmt.get();
    
    if (!result) {
      return '25_001';
    }
    
    const lastLabNumber = result.lab_number;
    const parts = lastLabNumber.split('_');
    
    if (parts.length === 2) {
      const year = parts[0];
      const number = parseInt(parts[1], 10);
      const nextNumber = number + 1;
      return `${year}_${nextNumber.toString().padStart(3, '0')}`;
    }
    
    // Fallback
    return '25_001';
  } catch (error) {
    logger.error('Error generating lab number', { error: error.message });
    return '25_001';
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

function createSample(sampleData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO samples (
        case_id, lab_number, name, surname, relation, status, phone_number,
        date_of_birth, place_of_birth, nationality, address, email, 
        id_number, id_type, collection_date, submission_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      sampleData.case_id,
      sampleData.lab_number,
      sampleData.name,
      sampleData.surname,
      sampleData.relation || 'Child',
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
      sampleData.submission_date || sampleData.submissionDate
    );
    
    return { id: result.lastInsertRowid, ...sampleData };
  } catch (error) {
    logger.error('Error creating sample', { error: error.message, sampleData });
    throw error;
  }
}

// Use routes with fallback handling
try {
  // app.use("/api/auth", authRoutes);
  // app.use("/api", apiRoutes); // Disabled - using server.js endpoints instead
  // app.use("/api/db", dbViewerRoutes);
  app.use("/api/genetic-analysis", geneticAnalysisRoutes);
  app.use("/api/reports", reportsRoutes);
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

// Submit paternity test form
app.post("/api/submit-test", (req, res) => {
  try {
    const { childRow, fatherRow, motherRow, clientType, signatures, witness, legalDeclarations, consentType } = req.body;
    
    // Generate case number
    const caseNumber = `CASE_${Date.now()}`;
    
    // Create test case record first
    const testCase = createTestCase({
      case_number: caseNumber,
      ref_kit_number: childRow?.refKitNumber || `BN-${Date.now()}`,
      submission_date: childRow?.submissionDate || new Date().toISOString().split('T')[0],
      client_type: clientType || 'paternity',
      mother_present: motherRow ? 'YES' : 'NO',
      email_contact: childRow?.emailContact,
      phone_contact: childRow?.phoneContact,
      address_area: childRow?.addressArea,
      comments: childRow?.comments,
      test_purpose: childRow?.testPurpose || 'peace_of_mind',
      sample_type: childRow?.sampleType || 'buccal_swab',
      authorized_collector: childRow?.authorizedCollector,
      consent_type: consentType || 'paternity',
      has_signatures: signatures ? 'YES' : 'NO',
      has_witness: witness ? 'YES' : 'NO',
      witness_name: witness?.name,
      legal_declarations: legalDeclarations ? JSON.stringify(legalDeclarations) : null
    });
    
    // Create samples for each person and link to test case
    const samples = [];
    
    // Create child sample (from additionalInfo section)
    if (childRow) {
      const childSample = createSample({
        case_id: testCase.id,
        lab_number: childRow.labNo || generateLabNumber(),
        name: childRow.name,
        surname: childRow.surname,
        relation: 'Child',
        status: 'pending',
        phone_number: childRow.phoneNumber || childRow.phoneContact,
        date_of_birth: childRow.dateOfBirth,
        place_of_birth: childRow.placeOfBirth,
        nationality: childRow.nationality,
        address: childRow.address,
        email: childRow.email,
        id_number: childRow.idNumber,
        id_type: childRow.idType,
        collection_date: childRow.collectionDate,
        submission_date: childRow.submissionDate
      });
      samples.push(childSample);
    }
    
    // Create father sample
    if (fatherRow && fatherRow.name) {
      const fatherSample = createSample({
        case_id: testCase.id,
        lab_number: fatherRow.labNo || generateLabNumber(),
        name: fatherRow.name,
        surname: fatherRow.surname,
        relation: 'Father',
        status: 'pending',
        phone_number: fatherRow.phoneNumber || fatherRow.phoneContact,
        date_of_birth: fatherRow.dateOfBirth,
        place_of_birth: fatherRow.placeOfBirth,
        nationality: fatherRow.nationality,
        address: fatherRow.address,
        email: fatherRow.email,
        id_number: fatherRow.idNumber,
        id_type: fatherRow.idType,
        collection_date: fatherRow.collectionDate
      });
      samples.push(fatherSample);
    }
    
    // Create mother sample
    if (motherRow && motherRow.name) {
      const motherSample = createSample({
        case_id: testCase.id,
        lab_number: motherRow.labNo || generateLabNumber(),
        name: motherRow.name,
        surname: motherRow.surname,
        relation: 'Mother',
        status: 'pending',
        phone_number: motherRow.phoneNumber || motherRow.phoneContact,
        date_of_birth: motherRow.dateOfBirth,
        place_of_birth: motherRow.placeOfBirth,
        nationality: motherRow.nationality,
        address: motherRow.address,
        email: motherRow.email,
        id_number: motherRow.idNumber,
        id_type: motherRow.idType,
        collection_date: motherRow.collectionDate
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
      ORDER BY s.id DESC 
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
      ORDER BY s.id DESC
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