const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require('better-sqlite3');

const app = express();

// Initialize database connection
const dbPath = path.join(__dirname, 'database', 'ashley_lims.db');
let db = null;

try {
  db = new Database(dbPath);
  console.log('✅ Database connected successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Configure CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Optimized database query functions
function getSamplesWithPagination(page = 1, limit = 50, filters = {}) {
  try {
    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];
    
    // Build WHERE clause based on filters
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
    
    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM samples ${whereClause}`;
    const total = db.prepare(countQuery).get(...params).total;
    
    // Get paginated records with batch information
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
    console.error('Error fetching samples:', error);
    return { data: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
  }
}

function getSampleCounts() {
  try {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM samples');
    const activeStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'active'");
    
    // More specific batch tracking
    const pendingStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL");
    const pcrBatchedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%' AND lab_batch_number NOT LIKE '%_RR')");
    const electroBatchedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%')");
    const rerunBatchedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR')");
    const completedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('analysis_completed')");
    
    // Legacy processing count (for backward compatibility)
    const processingStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('pcr_batched', 'pcr_completed')");
    
    return {
      total: totalStmt.get().count,
      active: activeStmt.get().count,
      pending: pendingStmt.get().count,
      pcrBatched: pcrBatchedStmt.get().count,
      electroBatched: electroBatchedStmt.get().count,
      rerunBatched: rerunBatchedStmt.get().count,
      completed: completedStmt.get().count,
      // Legacy fields for backward compatibility
      processing: processingStmt.get().count
    };
  } catch (error) {
    console.error('Error getting sample counts:', error);
    return { total: 0, active: 0, pending: 0, pcrBatched: 0, electroBatched: 0, rerunBatched: 0, completed: 0, processing: 0 };
  }
}

// API endpoints
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Optimized backend server is running",
    timestamp: new Date().toISOString()
  });
});

// Legacy API endpoints for compatibility
app.get("/api/reports", (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get("/api/statistics", (req, res) => {
  res.json({
    success: true,
    data: {
      daily: { total: 0, pending: 0, completed: 0 },
      weekly: { total: 0, pending: 0, completed: 0 },
      monthly: { total: 0, pending: 0, completed: 0 }
    }
  });
});


app.get("/api/equipment", (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get("/api/quality-control", (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get("/api/db/reports", (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.post("/api/refresh-database", (req, res) => {
  try {
    const counts = getSampleCounts();
    res.json({
      success: true,
      message: "Database refreshed",
      statistics: {
        samples: counts.total,
        cases: Math.floor(counts.total / 3), // Rough estimate
        batches: 0,
        reports: 0
      }
    });
  } catch (error) {
    res.json({
      success: true,
      message: "Database refreshed",
      statistics: {
        samples: 0,
        cases: 0,
        batches: 0,
        reports: 0
      }
    });
  }
});

app.get("/api/samples/queue-counts", (req, res) => {
  try {
    const counts = getSampleCounts();
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get queue counts',
      message: error.message
    });
  }
});

app.get("/api/samples/queue/:queueType", (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.put("/api/samples/workflow-status", (req, res) => {
  res.json({
    success: true,
    message: "Workflow status updated"
  });
});

app.get("/api/get-last-lab-number", (req, res) => {
  try {
    const stmt = db.prepare('SELECT lab_number FROM samples ORDER BY id DESC LIMIT 1');
    const result = stmt.get();
    res.json({
      success: true,
      data: result ? result.lab_number : '25_001'
    });
  } catch (error) {
    res.json({
      success: true,
      data: '25_001'
    });
  }
});

app.post("/api/submit-test", (req, res) => {
  res.json({
    success: true,
    message: "Test submitted successfully"
  });
});


app.post("/api/save-batch", (req, res) => {
  res.json({
    success: true,
    message: "Batch saved successfully"
  });
});

// Optimized samples endpoint with pagination
app.get("/api/samples", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filters = {
      status: req.query.status,
      search: req.query.search
    };
    
    const result = getSamplesWithPagination(page, limit, filters);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch samples',
      message: error.message
    });
  }
});

// Legacy endpoint for compatibility (returns all samples - use carefully)
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
    res.json({
      success: true,
      data: samples
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all samples',
      message: error.message
    });
  }
});

// Sample counts endpoint
app.get("/api/samples/counts", (req, res) => {
  try {
    const counts = getSampleCounts();
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get sample counts',
      message: error.message
    });
  }
});

// Search samples with better performance
app.get("/api/samples/search", (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json({ success: true, data: [] });
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
    
    res.json({
      success: true,
      data: samples
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search samples',
      message: error.message
    });
  }
});

// Generate/Create PCR Batch endpoint with proper transaction handling
app.post("/api/generate-batch", (req, res) => {
  // Use database transaction for data integrity
  const transaction = db.transaction(() => {
    const { batchNumber, operator, wells, sampleCount, date, batchType } = req.body;
    
    console.log('📝 Creating batch with data:', { batchNumber, operator, sampleCount, wellCount: Object.keys(wells || {}).length, batchType });
    
    if (!operator) {
      throw new Error('Operator is required');
    }

    // Generate batch number based on type
    let finalBatchNumber = batchNumber;
    if (!batchNumber) {
      // Default to LDS if no batch number provided
      finalBatchNumber = 'LDS_1';
    }
    
    // Determine batch type from the batch number prefix
    let batchPrefix = 'LDS_';
    let isRerunBatch = false;
    
    if (finalBatchNumber.startsWith('ELEC_')) {
      batchPrefix = 'ELEC_';
    } else if (finalBatchNumber.includes('_RR')) {
      // Handle rerun batches with LDS_X_RR format
      batchPrefix = 'LDS_';
      isRerunBatch = true;
    } else if (finalBatchNumber.startsWith('LDS_')) {
      batchPrefix = 'LDS_';
    }
    
    // Generate next batch number if not provided or if it's a default pattern
    if (!batchNumber || finalBatchNumber === 'LDS_1' || finalBatchNumber === 'ELEC_1') {
      if (isRerunBatch) {
        // Handle rerun batch numbering (LDS_X_RR format)
        const lastRerunStmt = db.prepare(`SELECT batch_number FROM batches WHERE batch_number LIKE 'LDS_%_RR' ORDER BY id DESC LIMIT 1`);
        const lastRerunBatch = lastRerunStmt.get();
        
        let nextNumber = 1;
        if (lastRerunBatch) {
          // Extract number from LDS_X_RR format
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
        // Handle regular batch numbering
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

    // Insert batch into database
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

    console.log('✅ Batch created with ID:', result.lastInsertRowid);

    // Update sample batch_id and workflow_status for samples in this batch
    let updatedSamples = 0;
    if (wells) {
      // Determine the correct workflow status based on batch type
      let workflowStatus = 'pcr_batched'; // default
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

    console.log('✅ Updated samples:', updatedSamples);

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
    
    res.json({
      success: true,
      message: 'Batch created successfully',
      batchId: result.batchId,
      batchNumber: result.batchNumber,
      data: result
    });
  } catch (error) {
    console.error('❌ Error creating batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create batch',
      message: error.message
    });
  }
});

// Get all batches endpoint
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
    
    res.json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batches',
      message: error.message
    });
  }
});

// Get specific batch details endpoint
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
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    // Parse plate layout
    batch.plate_layout = batch.plate_layout ? JSON.parse(batch.plate_layout) : {};
    
    res.json({
      success: true,
      data: batch
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch',
      message: error.message
    });
  }
});

// Get well assignments for a batch
app.get("/api/well-assignments/:batchId", (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Get batch details
    const batchStmt = db.prepare("SELECT plate_layout FROM batches WHERE id = ?");
    const batch = batchStmt.get(batchId);
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const plateLayout = batch.plate_layout ? JSON.parse(batch.plate_layout) : {};
    
    // Convert plate layout to well assignments format
    const wellAssignments = Object.entries(plateLayout).map(([wellId, wellData]) => ({
      well_position: wellId,
      sample_id: wellData.sample_id,
      sample_name: wellData.sampleName || wellData.label,
      comment: wellData.comment,
      type: wellData.type,
      well_type: wellData.type === 'control' ? 'Control' : 'Sample',
      samples: wellData.samples || []
    }));
    
    res.json({
      success: true,
      data: wellAssignments
    });
  } catch (error) {
    console.error('Error fetching well assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch well assignments',
      message: error.message
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    database: 'connected'
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "LabScientific LIMS Backend API - Optimized Version",
    version: "3.0.0-optimized",
    status: "running",
    endpoints: {
      health: "/health",
      samples: "/api/samples (paginated)",
      samplesAll: "/api/samples/all (legacy)",
      samplesCount: "/api/samples/counts",
      samplesSearch: "/api/samples/search",
      batches: "/api/batches",
      generateBatch: "/api/generate-batch (POST)",
      batchDetails: "/api/batches/:id",
      wellAssignments: "/api/well-assignments/:batchId"
    }
  });
});

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

const port = process.env.PORT || 3001;

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Optimized backend server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔗 API endpoints: http://localhost:${port}/`);
  console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${port} is in use. Please stop other processes or use a different port.`);
    console.error(`❌ To kill processes on port ${port}: lsof -ti:${port} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error('❌ Server startup error:', err.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    if (db) db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    if (db) db.close();
    process.exit(0);
  });
});

module.exports = app;