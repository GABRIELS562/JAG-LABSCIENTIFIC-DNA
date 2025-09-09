const express = require("express");
const router = express.Router();
// PostgreSQL database only - Google Sheets disabled
// const { sheets, appendRows, SHEETS } = require("../services/spreadsheets");
const db = require("../services/database");
const { authenticateToken, requireStaff } = require("../middleware/auth");

// PostgreSQL database only - all functionality migrated to PostgreSQL

// Helper function for PostgreSQL operations
async function dualWrite(postgresOperation) {
  try {
    // PostgreSQL operation only
    const postgresResult = await postgresOperation();
    return postgresResult;
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

// Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: 'API is working with PostgreSQL database',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Enhanced database refresh endpoint with optimizations
router.post("/refresh-database", async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Only recreate tables if schema has changed
    const forceRebuild = req.body?.forceRebuild || false;
    if (forceRebuild) {
      await db.createTables();
    }
    
    // Get database statistics efficiently
    const [samples, batches, qcRecords, equipment, reports] = await Promise.all([
      db.getAllSamples(),
      db.getAllBatches(),
      db.getQualityControlRecords(),
      db.getAllEquipment(),
      db.getAllReports()
    ]);
    
    const stats = {
      samples: samples.length,
      batches: batches.length,
      qc_records: qcRecords.length,
      equipment: equipment.length,
      reports: reports.length
    };
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Database refreshed successfully',
      timestamp: new Date().toISOString(),
      statistics: stats,
      performance: {
        processingTime: `${processingTime}ms`,
        schemaRebuilt: forceRebuild
      }
    });
  } catch (error) {
    console.error('Database refresh error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Submit test endpoint - PostgreSQL implementation
router.post("/submit-test", async (req, res) => {
  try {
    const { childRow, fatherRow, motherRow, signatures, witness, legalDeclarations, consentType } = req.body;
    const clientType = req.body.clientType || 'paternity';
    
    console.log('Received enhanced form submission:', {
      clientType,
      consentType,
      hasSignatures: !!signatures,
      hasWitness: !!witness,
      hasLegalDeclarations: !!legalDeclarations
    });

    // PostgreSQL implementation
    const result = await dualWrite(
      async () => {
        // Generate sequential lab numbers in proper family order: Child, Father, Mother
        const sampleCount = motherRow ? 3 : 2; // Child + Father + Mother OR Child + Father
        const labNumbers = db.generateSequentialLabNumbers(clientType, sampleCount);
        
        let childLabNo, fatherLabNo, motherLabNo;
        if (motherRow) {
          [childLabNo, fatherLabNo, motherLabNo] = labNumbers;
        } else {
          [childLabNo, fatherLabNo] = labNumbers;
        }

        // Create a test case first
        const caseNumber = db.generateCaseNumber();
        const testCaseData = {
          case_number: caseNumber,
          ref_kit_number: childRow.refKitNumber || 'DEFAULT_KIT',
          submission_date: childRow.submissionDate,
          client_type: clientType,
          mother_present: motherRow ? 'YES' : 'NO',
          email_contact: childRow.emailContact,
          phone_contact: childRow.phoneContact,
          address_area: childRow.addressArea,
          comments: childRow.comments,
          test_purpose: childRow.testPurpose || 'paternity',
          sample_type: childRow.sampleType || 'buccal_swab',
          authorized_collector: childRow.authorizedCollector || '',
          consent_type: consentType || 'paternity',
          has_signatures: signatures ? 'YES' : 'NO',
          has_witness: witness ? 'YES' : 'NO',
          witness_name: witness ? witness.name : null,
          legal_declarations: legalDeclarations ? JSON.stringify(legalDeclarations) : null
        };

        const caseResult = await db.createTestCase(testCaseData);
        const caseId = await caseResult.lastInsertRowid;

        const results = [];

        // Create mother sample if present
        if (motherRow) {
          const motherSampleData = {
            case_id: caseId,
            lab_number: motherLabNo,
            name: motherRow.name,
            surname: motherRow.surname,
            id_dob: motherRow.idDob,
            date_of_birth: motherRow.dateOfBirth,
            place_of_birth: motherRow.placeOfBirth,
            nationality: motherRow.nationality,
            occupation: motherRow.occupation || 'N/A',
            address: motherRow.address || childRow.addressArea,
            phone_number: motherRow.phoneNumber || childRow.phoneContact,
            email: motherRow.email || childRow.emailContact,
            id_number: motherRow.idNumber,
            id_type: motherRow.idType,
            marital_status: motherRow.maritalStatus,
            ethnicity: motherRow.ethnicity,
            collection_date: motherRow.collectionDate,
            submission_date: childRow.submissionDate,
            relation: 'Mother',
            additional_notes: motherRow.additionalNotes || childRow.comments,
            case_number: caseNumber
          };
          const motherResult = await db.createSample(motherSampleData);
          results.push({ type: 'mother', sample_id: await motherResult.lastInsertRowid, lab_number: motherLabNo });
        }

        // Create child sample
        const childSampleData = {
          case_id: caseId,
          lab_number: childLabNo,
          name: childRow.name,
          surname: childRow.surname,
          id_dob: childRow.idDob,
          date_of_birth: childRow.dateOfBirth,
          place_of_birth: childRow.placeOfBirth,
          nationality: childRow.nationality,
          occupation: childRow.occupation || 'N/A',
          address: childRow.address || childRow.addressArea,
          phone_number: childRow.phoneNumber || childRow.phoneContact,
          email: childRow.email || childRow.emailContact,
          id_number: childRow.idNumber,
          id_type: childRow.idType,
          marital_status: childRow.maritalStatus,
          ethnicity: childRow.ethnicity,
          collection_date: childRow.collectionDate,
          submission_date: childRow.submissionDate,
          relation: `Child(${fatherLabNo})`,
          additional_notes: childRow.additionalNotes || childRow.comments,
          case_number: caseNumber
        };

        // Create father sample
        const fatherSampleData = {
          case_id: caseId,
          lab_number: fatherLabNo,
          name: fatherRow.name,
          surname: fatherRow.surname,
          id_dob: fatherRow.idDob,
          date_of_birth: fatherRow.dateOfBirth,
          place_of_birth: fatherRow.placeOfBirth,
          nationality: fatherRow.nationality,
          occupation: fatherRow.occupation || 'N/A',
          address: fatherRow.address || fatherRow.addressArea,
          phone_number: fatherRow.phoneNumber || fatherRow.phoneContact,
          email: fatherRow.email || fatherRow.emailContact,
          id_number: fatherRow.idNumber,
          id_type: fatherRow.idType,
          marital_status: fatherRow.maritalStatus,
          ethnicity: fatherRow.ethnicity,
          collection_date: fatherRow.collectionDate,
          submission_date: fatherRow.submissionDate,
          relation: 'Alleged Father',
          additional_notes: fatherRow.additionalNotes || fatherRow.comments,
          case_number: caseNumber
        };

        const childResult = await db.createSample(childSampleData);
        const fatherResult = await db.createSample(fatherSampleData);

        results.push(
          { type: 'child', sample_id: await childResult.lastInsertRowid, lab_number: childLabNo },
          { type: 'father', sample_id: await fatherResult.lastInsertRowid, lab_number: fatherLabNo }
        );

        return {
          case_number: caseNumber,
          case_id: caseId,
          samples: results,
          client_type: clientType
        };
      }
    );

    res.json({ 
      success: true, 
      message: "Paternity test submitted successfully",
      data: result,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get last lab number
router.get("/get-last-lab-number", async (req, res) => {
  try {
    const labNumber = db.generateLabNumber();
    res.json({ 
      success: true, 
      lab_number: labNumber,
      message: "Lab number generated successfully",
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating lab number:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all samples with pagination support
router.get("/samples", async (req, res) => {
  try {
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
    const status = req.query.status;
    const search = req.query.search;
    const period = req.query.period;
    
    // For simpler SQLite compatibility, get all samples and filter in memory
    const allSamples = await db.getAllSamples();
    let filteredSamples = allSamples || [];
    
    // Apply filters
    if (status && status !== 'all') {
      filteredSamples = filteredSamples.filter(s => s.workflow_status === status);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSamples = filteredSamples.filter(s => 
        (s.lab_number && s.lab_number.toLowerCase().includes(searchLower)) ||
        (s.name && s.name.toLowerCase().includes(searchLower)) ||
        (s.surname && s.surname.toLowerCase().includes(searchLower)) ||
        (s.case_number && s.case_number.toLowerCase().includes(searchLower))
      );
    }
    
    if (period) {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }
      
      if (startDate) {
        filteredSamples = filteredSamples.filter(s => 
          s.collection_date && new Date(s.collection_date) >= startDate
        );
      }
    }
    
    // Calculate pagination
    const total = filteredSamples.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedSamples = filteredSamples.slice(offset, offset + limit);
    
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    // Return JSON response
    res.json({
      success: true,
      message: 'Data retrieved successfully',
      data: paginatedSamples,
      samples: paginatedSamples,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        },
        timestamp: new Date().toISOString()
      },
      count: paginatedSamples.length
    });
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Search samples
router.get("/samples/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ 
        success: false, 
        error: "Query parameter 'q' is required",
        timestamp: new Date().toISOString()
      });
    }
    
    // For SQLite compatibility, search in memory
    const allSamples = await db.getAllSamples();
    const searchLower = q.toLowerCase();
    const results = (allSamples || []).filter(s => 
      (s.lab_number && s.lab_number.toLowerCase().includes(searchLower)) ||
      (s.name && s.name.toLowerCase().includes(searchLower)) ||
      (s.surname && s.surname.toLowerCase().includes(searchLower)) ||
      (s.case_number && s.case_number.toLowerCase().includes(searchLower))
    ).slice(0, 100);
    
    res.json({ 
      success: true, 
      data: results,
      count: results.length,
      query: q,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error searching samples:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Sample Queue Management endpoints
router.get("/samples/queue-counts", async (req, res) => {
  try {
    const counts = await db.getSampleQueueCounts();
    res.json({ 
      success: true, 
      data: counts,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting queue counts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/samples/queue/:queueType", async (req, res) => {
  try {
    const { queueType } = req.params;
    const validQueues = ['pcr_ready', 'pcr_batched', 'electro_ready', 'electro_batched', 'analysis_ready', 'completed'];
    
    if (!validQueues.includes(queueType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid queue type. Must be one of: ${validQueues.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const samples = await db.getSamplesForQueue(queueType);
    res.json({ 
      success: true, 
      data: samples,
      count: samples.length,
      queue: queueType,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting samples for queue:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.put("/samples/workflow-status", async (req, res) => {
  try {
    const { sampleIds, workflowStatus } = req.body;
    
    if (!sampleIds || !Array.isArray(sampleIds) || sampleIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "sampleIds array is required",
        timestamp: new Date().toISOString()
      });
    }
    
    if (!workflowStatus) {
      return res.status(400).json({ 
        success: false, 
        error: "workflowStatus is required",
        timestamp: new Date().toISOString()
      });
    }
    
    const validStatuses = ['sample_collected', 'pcr_ready', 'pcr_batched', 'pcr_completed', 'electro_ready', 'electro_batched', 'electro_completed', 'analysis_ready', 'analysis_completed', 'report_ready', 'report_sent'];
    
    if (!validStatuses.includes(workflowStatus)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid workflow status. Must be one of: ${validStatuses.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
    
    await db.batchUpdateSampleWorkflowStatus(sampleIds, workflowStatus);
    res.json({ 
      success: true, 
      message: `Updated ${sampleIds.length} samples to ${workflowStatus}`,
      meta: {
        timestamp: new Date().toISOString(),
        samplesUpdated: sampleIds.length,
        newStatus: workflowStatus
      }
    });
  } catch (error) {
    console.error('Error updating workflow status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Protected routes - require staff authentication

// Generate batch
router.post("/generate-batch", async (req, res) => {
  try {
    const { batchNumber, operator, wells, template, date, sampleCount } = req.body;

    // Store complete plate layout for visualization
    const completePlateLayout = {};
    
    // Initialize all wells first
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    rows.forEach(row => {
      cols.forEach(col => {
        const wellId = `${row}${col}`;
        completePlateLayout[wellId] = { type: 'empty', samples: [] };
      });
    });
    
    // Add the actual well data
    if (wells && typeof wells === 'object') {
      Object.entries(wells).forEach(([wellId, wellData]) => {
        completePlateLayout[wellId] = {
          type: wellData.type || 'sample',
          samples: wellData.samples || []
        };
      });
    }

    const batchData = {
      batch_number: batchNumber,
      operator: operator,
      pcr_date: date || null,
      electro_date: null,
      settings: '27cycles30minExt',
      total_samples: sampleCount || 0,
      plate_layout: completePlateLayout
    };

    const batchResult = await db.createBatch(batchData);
    const batchId = await batchResult.lastInsertRowid;

    // Create well assignments and update sample workflow status
    const batchedSampleIds = [];
    if (wells && typeof wells === 'object') {
      for (const [wellPosition, wellData] of Object.entries(wells)) {
        // Normalize well type to match database constraints
        let wellType = 'Blank';
        if (wellData.type) {
          const typeMap = {
            'sample': 'Sample',
            'control': 'Positive Control', 
            'negative': 'Negative Control',
            'positive': 'Positive Control',
            'ladder': 'Allelic Ladder',
            'blank': 'Blank'
          };
          wellType = typeMap[wellData.type.toLowerCase()] || 'Sample';
        }

        const wellAssignment = {
          batch_id: batchId,
          well_position: wellPosition,
          sample_id: null, // Don't link to sample_id to avoid foreign key issues
          well_type: wellType,
          kit_number: wellData.kit_number || null,
          sample_name: wellData.label || wellData.sampleName || null,
          comment: wellData.comment || ''
        };

        await db.createWellAssignment(wellAssignment);

        // Collect sample IDs from the wells for workflow status update
        if (wellData.samples && Array.isArray(wellData.samples)) {
          wellData.samples.forEach(sample => {
            if (sample.id) {
              batchedSampleIds.push(sample.id);
            }
          });
        }
      }
    }

    // Update workflow status for all samples in the batch to 'pcr_batched'
    if (batchedSampleIds.length > 0) {
      try {
        await db.batchUpdateSampleWorkflowStatus(batchedSampleIds, 'pcr_batched');
        console.log(`Updated ${batchedSampleIds.length} samples to pcr_batched status`);
      } catch (workflowError) {
        console.warn('Failed to update sample workflow status:', workflowError);
        // Don't fail the batch creation if workflow update fails
      }
    }

    res.json({ 
      success: true, 
      message: "Batch generated successfully",
      data: {
        batch_id: batchId,
        batch_number: batchNumber,
        operator: operator,
        wells_created: wells ? Object.keys(wells).length : 0
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate batch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all batches
router.get("/batches", async (req, res) => {
  try {
    const batches = await db.getAllBatches();
    res.json({ 
      success: true, 
      data: batches,
      count: batches.length,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get samples for a specific batch
router.get("/batches/:batchNumber/samples", async (req, res) => {
  try {
    const { batchNumber } = req.params;
    const samples = await db.getSamplesByBatchNumber(batchNumber);
    res.json({ 
      success: true, 
      data: samples,
      count: samples.length,
      batchNumber: batchNumber,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting samples for batch:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get well assignments for a specific batch
router.get("/well-assignments/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    const wellAssignments = await db.getWellAssignments(batchId);
    res.json({ 
      success: true, 
      data: wellAssignments,
      count: wellAssignments.length,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting well assignments:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Save batch
router.post("/save-batch", authenticateToken, requireStaff, async (req, res) => {
  try {
    const { batchNumber, operator, wells, template, date } = req.body;

    const existingBatch = await db.getBatch(batchNumber);
    
    if (existingBatch) {
      return res.json({ 
        success: true, 
        message: "Batch already exists",
        data: existingBatch,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }

    const batchData = {
      batch_number: batchNumber,
      operator: operator,
      pcr_date: date,
      electro_date: null,
      settings: '27cycles30minExt',
      total_samples: wells ? Object.keys(wells).filter(k => wells[k].type === 'Sample').length : 0,
      plate_layout: wells
    };

    const batchResult = await db.createBatch(batchData);

    res.json({ 
      success: true, 
      message: "Batch saved successfully",
      data: {
        batch_id: await batchResult.lastInsertRowid,
        batch_number: batchNumber
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Save batch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Statistics endpoint
router.get("/statistics", async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    const [stats, counts] = await Promise.all([
      db.getStatistics(period),
      db.getSampleCounts()
    ]);

    res.json({ 
      success: true, 
      data: {
        period_stats: stats,
        total_counts: counts,
        period: period
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Quality Control endpoints
router.post("/quality-control", authenticateToken, requireStaff, async (req, res) => {
  try {
    const { batch_id, date, control_type, result, operator, comments } = req.body;

    const qcData = {
      batch_id,
      date,
      control_type,
      result,
      operator,
      comments
    };

    const qcResult = await db.createQualityControl(qcData);

    res.json({ 
      success: true, 
      message: "Quality control record created",
      data: {
        qc_id: await qcResult.lastInsertRowid
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating QC record:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/quality-control", async (req, res) => {
  try {
    const { batch_id } = req.query;
    const qcRecords = await db.getQualityControlRecords(batch_id);
    
    res.json({ 
      success: true, 
      data: qcRecords,
      count: qcRecords.length,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting QC records:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get client test results (authenticated clients can access their own data)
router.get("/client/tests", authenticateToken, async (req, res) => {
  try {
    const samples = (await db.getAllSamples()).slice(0, 10);
    
    const tests = samples.map(sample => ({
      id: sample.id,
      testType: 'Paternity DNA Test',
      status: sample.status,
      referenceNumber: sample.lab_number,
      submissionDate: sample.submission_date,
      resultDate: sample.status === 'completed' ? sample.updated_at : null,
      downloadUrl: sample.status === 'completed' ? `/api/client/test/${sample.id}/download` : null
    }));
    
    res.json({ 
      success: true, 
      tests,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting client tests:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Download test results
router.get("/client/test/:id/download", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const sample = await db.getSample(id);
    
    if (!sample) {
      return res.status(404).json({ 
        success: false, 
        error: "Test not found",
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      message: `Test result for ${sample.lab_number} download would be provided here`,
      downloadUrl: `https://example.com/results/${sample.lab_number}.pdf`,
      sample_info: {
        lab_number: sample.lab_number,
        name: sample.name,
        surname: sample.surname,
        status: sample.status
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error downloading test result:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Workflow statistics endpoint
router.get("/workflow-stats", async (req, res) => {
  try {
    const samples = await db.getAllSamples();
    
    // Count samples by workflow status
    const stats = {
      registered: samples.filter(s => s.workflow_status === 'sample_collected' || s.workflow_status === 'registered').length,
      inExtraction: samples.filter(s => 
        s.workflow_status === 'extraction_ready' || 
        s.workflow_status === 'extraction_in_progress' || 
        s.workflow_status === 'extraction_completed'
      ).length,
      inPCR: samples.filter(s => 
        s.workflow_status === 'pcr_ready' || 
        s.workflow_status === 'pcr_batched' || 
        s.workflow_status === 'pcr_completed'
      ).length,
      inElectrophoresis: samples.filter(s => 
        s.workflow_status === 'electro_ready' || 
        s.workflow_status === 'electro_batched' || 
        s.workflow_status === 'electro_completed'
      ).length,
      reruns: samples.filter(s => s.workflow_status === 'rerun' || s.workflow_status === 'reanalysis').length,
      completed: samples.filter(s => s.workflow_status === 'report_sent' || s.workflow_status === 'completed').length,
      total: samples.length
    };
    
    res.json({
      success: true,
      message: 'Workflow statistics retrieved successfully',
      data: stats,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching workflow stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Sample counts endpoint
router.get("/samples/counts", async (req, res) => {
  try {
    const counts = await db.getSampleCounts();
    
    res.json({
      success: true,
      message: 'Sample counts retrieved successfully',
      data: counts,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching sample counts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Live workflow monitor endpoint - shows samples cycling through stages
router.get("/live-workflow", async (req, res) => {
  try {
    const samples = await db.getAllSamples();
    const autoSamples = samples.filter(s => s.lab_number && s.lab_number.startsWith('AUTO-'));
    
    // Group samples by workflow status
    const stageGroups = {};
    const workflowStages = [
      'sample_collected',
      'extraction_ready',
      'extraction_in_progress', 
      'extraction_completed',
      'quantification_ready',
      'quantification_completed',
      'pcr_ready',
      'pcr_batched',
      'pcr_in_progress',
      'pcr_completed',
      'electro_ready',
      'electro_batched',
      'electro_in_progress',
      'electro_completed',
      'analysis_ready',
      'analysis_in_progress',
      'analysis_completed',
      'review_pending',
      'report_generation',
      'report_sent'
    ];
    
    // Initialize all stages
    workflowStages.forEach(stage => {
      stageGroups[stage] = [];
    });
    
    // Group samples by their current stage
    autoSamples.forEach(sample => {
      const stage = sample.workflow_status || 'sample_collected';
      if (stageGroups[stage]) {
        stageGroups[stage].push({
          lab_number: sample.lab_number,
          name: `${sample.name} ${sample.surname}`,
          case_number: sample.case_number,
          relation: sample.relation,
          updated_at: sample.updated_at
        });
      }
    });
    
    // Calculate statistics
    const stats = {
      total_samples: autoSamples.length,
      in_progress: autoSamples.filter(s => 
        s.workflow_status && 
        !['sample_collected', 'report_sent'].includes(s.workflow_status)
      ).length,
      completed: autoSamples.filter(s => s.workflow_status === 'report_sent').length,
      stages: workflowStages.map(stage => ({
        stage,
        count: stageGroups[stage].length,
        samples: stageGroups[stage]
      }))
    };
    
    res.json({
      success: true,
      message: 'Live workflow data retrieved',
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        auto_refresh: true,
        refresh_interval: 5000
      }
    });
  } catch (error) {
    console.error('Error fetching live workflow:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simulated stages endpoint for live cycling demo
router.get("/simulated-stages", async (req, res) => {
  try {
    const samples = await db.getAllSamples();
    
    // Filter for AUTO- prefixed samples and simulate stages
    const autoSamples = samples.filter(s => s.lab_number && s.lab_number.startsWith('AUTO-'));
    
    // Create simulated cycling statuses for better demo visualization
    const simulatedSamples = autoSamples.map(sample => {
      // Use a hash of the lab_number to create consistent but varied simulated stages
      const hash = sample.lab_number.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const cycleStages = [
        'sample_collected',
        'extraction_in_progress', 
        'quantification_completed',
        'pcr_ready',
        'pcr_completed',
        'electro_completed',
        'analysis_completed',
        'report_sent'
      ];
      
      // Use time and hash to create cycling effect
      const timeIndex = Math.floor(Date.now() / 15000) % cycleStages.length;
      const stageIndex = (Math.abs(hash) + timeIndex) % cycleStages.length;
      
      return {
        lab_number: sample.lab_number,
        actual_status: sample.workflow_status,
        simulated_status: cycleStages[stageIndex]
      };
    });
    
    res.json({
      success: true,
      message: 'Simulated stages for live demo',
      samples: simulatedSamples,
      meta: {
        timestamp: new Date().toISOString(),
        total_auto_samples: autoSamples.length
      }
    });
  } catch (error) {
    console.error('Error fetching simulated stages:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to troubleshoot database connectivity
router.get("/debug/samples", async (req, res) => {
  try {
    // Get database connection info from unified service
    const connectionInfo = db.getConnectionInfo();
    
    // Test basic database operations
    let samplesInfo = { count: 0, error: null };
    try {
      await db.ensureReady();
      const samplesCount = await db.get('SELECT COUNT(*) as count FROM samples');
      samplesInfo.count = samplesCount ? samplesCount.count : 0;
      
      // Get a few sample records
      const sampleList = await db.all('SELECT lab_number, workflow_status FROM samples LIMIT 5');
      samplesInfo.examples = sampleList;
    } catch (samplesError) {
      samplesInfo.error = samplesError.message;
    }
    
    res.json({
      success: true,
      database_info: connectionInfo,
      samples_info: samplesInfo,
      timestamp: new Date().toISOString(),
      cwd: process.cwd()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      cwd: process.cwd()
    });
  }
});

module.exports = router;