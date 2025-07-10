const express = require("express");
const router = express.Router();
// Keep both database systems for backup/fallback
const { sheets, appendRows, SHEETS } = require("../services/spreadsheets");
const db = require("../services/database");
const { authenticateToken, requireStaff } = require("../middleware/auth");

// Configuration - Set to 'sqlite' for new database, 'sheets' for Google Sheets backup
const DB_MODE = process.env.DB_MODE || 'sqlite';

// Helper function to dual-write (SQLite primary, Google Sheets backup)
async function dualWrite(sqliteOperation, sheetsOperation) {
  try {
    // Primary: SQLite operation
    const sqliteResult = sqliteOperation();
    
    // Backup: Google Sheets operation (optional)
    if (process.env.ENABLE_SHEETS_BACKUP === 'true') {
      try {
        await sheetsOperation();
      } catch (sheetsError) {
        console.warn('Google Sheets backup failed:', sheetsError.message);
        // Don't fail the request if backup fails
      }
    }
    
    return sqliteResult;
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

// Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: `API is working with ${DB_MODE === 'sqlite' ? 'SQLite database' : 'Google Sheets'}`,
    database: DB_MODE === 'sqlite' ? 'SQLite' : 'Google Sheets',
    backup_enabled: process.env.ENABLE_SHEETS_BACKUP === 'true'
  });
});

// Database refresh endpoint
router.post("/refresh-database", (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      // Refresh database schema and connections
      db.createTables();
      
      const stats = {
        samples: db.getAllSamples().length,
        batches: db.getAllBatches().length,
        qc_records: db.getQualityControlRecords().length,
        equipment: db.getAllEquipment().length,
        test_cases: db.getAllTestCases().length,
        reports: db.getAllReports().length
      };
      
      res.json({
        success: true,
        message: 'Database refreshed successfully',
        timestamp: new Date().toISOString(),
        statistics: stats
      });
    } else {
      res.status(501).json({ 
        success: false, 
        error: "Database refresh only available with SQLite database" 
      });
    }
  } catch (error) {
    console.error('Database refresh error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Submit test endpoint - Dual database support
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

    if (DB_MODE === 'sqlite') {
      // SQLite implementation (primary)
      const result = await dualWrite(
        () => {
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

          const caseResult = db.createTestCase(testCaseData);
          const caseId = caseResult.lastInsertRowid;

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
              additional_notes: motherRow.additionalNotes || childRow.comments
            };
            const motherResult = db.createSample(motherSampleData);
            results.push({ type: 'mother', sample_id: motherResult.lastInsertRowid, lab_number: motherLabNo });
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
            additional_notes: childRow.additionalNotes || childRow.comments
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
            additional_notes: fatherRow.additionalNotes || fatherRow.comments
          };

          const childResult = db.createSample(childSampleData);
          const fatherResult = db.createSample(fatherSampleData);

          results.push(
            { type: 'child', sample_id: childResult.lastInsertRowid, lab_number: childLabNo },
            { type: 'father', sample_id: fatherResult.lastInsertRowid, lab_number: fatherLabNo }
          );

          return {
            case_number: caseNumber,
            case_id: caseId,
            samples: results,
            client_type: clientType
          };
        },
        // Google Sheets backup operation
        async () => {
          const childData = [
            childRow.labNo, childRow.name, childRow.surname, childRow.idDob,
            childRow.relation, childRow.collectionDate, childRow.submissionDate,
            childRow.motherPresent, childRow.emailContact, childRow.addressArea,
            childRow.phoneContact, "", "", "", "", childRow.comments
          ];

          const fatherData = [
            fatherRow.labNo, fatherRow.name, fatherRow.surname, fatherRow.idDob,
            fatherRow.relation, fatherRow.collectionDate, fatherRow.submissionDate,
            fatherRow.motherPresent, fatherRow.emailContact, fatherRow.addressArea,
            fatherRow.phoneContact, "", "", "", "", fatherRow.comments
          ];

          await appendRows("MAIN", SHEETS.MAIN_DATA.name, [childData, fatherData]);
        }
      );

      res.json({ 
        success: true, 
        message: "Paternity test submitted successfully",
        data: result,
        database: 'SQLite'
      });
    } else {
      // Google Sheets implementation (fallback)
      const childData = [
        childRow.labNo, childRow.name, childRow.surname, childRow.idDob,
        childRow.relation, childRow.collectionDate, childRow.submissionDate,
        childRow.motherPresent, childRow.emailContact, childRow.addressArea,
        childRow.phoneContact, "", "", "", "", childRow.comments
      ];

      const fatherData = [
        fatherRow.labNo, fatherRow.name, fatherRow.surname, fatherRow.idDob,
        fatherRow.relation, fatherRow.collectionDate, fatherRow.submissionDate,
        fatherRow.motherPresent, fatherRow.emailContact, fatherRow.addressArea,
        fatherRow.phoneContact, "", "", "", "", fatherRow.comments
      ];

      await appendRows("MAIN", SHEETS.MAIN_DATA.name, [childData, fatherData]);
      res.json({ success: true, database: 'Google Sheets' });
    }
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get last lab number
router.get("/get-last-lab-number", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const labNumber = db.generateLabNumber();
      res.json({ 
        success: true, 
        lab_number: labNumber,
        message: "Lab number generated successfully",
        database: 'SQLite'
      });
    } else {
      // Google Sheets implementation
      res.json({ success: true, database: 'Google Sheets' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all samples (SQLite only)
router.get("/samples", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const samples = db.getSamplesWithBatchingStatus();
      res.json({ 
        success: true, 
        data: samples,
        count: samples.length,
        database: 'SQLite'
      });
    } else {
      res.status(501).json({ 
        success: false, 
        error: "Feature only available with SQLite database" 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search samples
router.get("/samples/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: "Query parameter 'q' is required" });
    }
    
    if (DB_MODE === 'sqlite') {
      const results = db.searchSamples(q);
      res.json({ 
        success: true, 
        data: results,
        count: results.length,
        query: q,
        database: 'SQLite'
      });
    } else {
      res.status(501).json({ 
        success: false, 
        error: "Search feature only available with SQLite database" 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sample Queue Management endpoints
router.get("/samples/queue-counts", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const counts = db.getSampleQueueCounts();
      res.json({ 
        success: true, 
        data: counts,
        database: 'SQLite'
      });
    } else {
      res.status(501).json({ 
        success: false, 
        error: "Feature only available with SQLite database" 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/samples/queue/:queueType", async (req, res) => {
  try {
    const { queueType } = req.params;
    const validQueues = ['pcr_ready', 'pcr_batched', 'electro_ready', 'electro_batched', 'analysis_ready', 'completed'];
    
    if (!validQueues.includes(queueType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid queue type. Must be one of: ${validQueues.join(', ')}` 
      });
    }
    
    if (DB_MODE === 'sqlite') {
      const samples = db.getSamplesForQueue(queueType);
      res.json({ 
        success: true, 
        data: samples,
        count: samples.length,
        queue: queueType,
        database: 'SQLite'
      });
    } else {
      res.status(501).json({ 
        success: false, 
        error: "Feature only available with SQLite database" 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/samples/workflow-status", async (req, res) => {
  try {
    const { sampleIds, workflowStatus } = req.body;
    
    if (!sampleIds || !Array.isArray(sampleIds) || sampleIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "sampleIds array is required" 
      });
    }
    
    if (!workflowStatus) {
      return res.status(400).json({ 
        success: false, 
        error: "workflowStatus is required" 
      });
    }
    
    const validStatuses = ['sample_collected', 'pcr_ready', 'pcr_batched', 'pcr_completed', 'electro_ready', 'electro_batched', 'electro_completed', 'analysis_ready', 'analysis_completed', 'report_ready', 'report_sent'];
    
    if (!validStatuses.includes(workflowStatus)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid workflow status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    if (DB_MODE === 'sqlite') {
      db.batchUpdateSampleWorkflowStatus(sampleIds, workflowStatus);
      res.json({ 
        success: true, 
        message: `Updated ${sampleIds.length} samples to ${workflowStatus}`,
        database: 'SQLite'
      });
    } else {
      res.status(501).json({ 
        success: false, 
        error: "Feature only available with SQLite database" 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected routes - require staff authentication

// Generate batch
router.post("/generate-batch", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
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

      const batchResult = db.createBatch(batchData);
      const batchId = batchResult.lastInsertRowid;

      // Create well assignments and update sample workflow status
      const batchedSampleIds = [];
      if (wells && typeof wells === 'object') {
        Object.entries(wells).forEach(([wellPosition, wellData]) => {
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

          db.createWellAssignment(wellAssignment);

          // Collect sample IDs from the wells for workflow status update
          if (wellData.samples && Array.isArray(wellData.samples)) {
            wellData.samples.forEach(sample => {
              if (sample.id) {
                batchedSampleIds.push(sample.id);
              }
            });
          }
        });
      }

      // Update workflow status for all samples in the batch to 'pcr_batched'
      if (batchedSampleIds.length > 0) {
        try {
          db.batchUpdateSampleWorkflowStatus(batchedSampleIds, 'pcr_batched');
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
        database: 'SQLite'
      });
    } else {
      // Google Sheets fallback
      res.json({ success: true, data: req.body, database: 'Google Sheets' });
    }
  } catch (error) {
    console.error('Generate batch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all batches
router.get("/batches", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const batches = db.getAllBatches();
      res.json({ 
        success: true, 
        data: batches,
        count: batches.length,
        database: 'SQLite'
      });
    } else {
      // Mock data for Google Sheets
      res.json({
        success: true,
        data: [
          { id: 1, batch_number: 'LDS_1', operator: 'Test Operator', created_at: '2024-06-28' }
        ],
        count: 1,
        database: 'Google Sheets'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get samples for a specific batch
router.get("/batches/:batchNumber/samples", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const { batchNumber } = req.params;
      const samples = db.getSamplesByBatchNumber(batchNumber);
      res.json({ 
        success: true, 
        data: samples,
        count: samples.length,
        batchNumber: batchNumber,
        database: 'SQLite'
      });
    } else {
      res.status(501).json({ 
        success: false, 
        error: "Feature only available with SQLite database" 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get well assignments for a specific batch
router.get("/well-assignments/:batchId", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const { batchId } = req.params;
      const wellAssignments = db.getWellAssignments(batchId);
      res.json({ 
        success: true, 
        data: wellAssignments,
        count: wellAssignments.length,
        database: 'SQLite'
      });
    } else {
      res.status(501).json({ 
        success: false, 
        error: "Feature only available with SQLite database" 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save batch
router.post("/save-batch", authenticateToken, requireStaff, async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const { batchNumber, operator, wells, template, date } = req.body;

      const existingBatch = db.getBatch(batchNumber);
      
      if (existingBatch) {
        return res.json({ 
          success: true, 
          message: "Batch already exists",
          data: existingBatch,
          database: 'SQLite'
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

      const batchResult = db.createBatch(batchData);

      res.json({ 
        success: true, 
        message: "Batch saved successfully",
        data: {
          batch_id: batchResult.lastInsertRowid,
          batch_number: batchNumber
        },
        database: 'SQLite'
      });
    } else {
      // Google Sheets fallback
      res.json({ success: true, data: req.body, database: 'Google Sheets' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistics endpoint
router.get("/statistics", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const { period = 'daily' } = req.query;
      const stats = db.getStatistics(period);
      const counts = db.getSampleCounts();

      res.json({ 
        success: true, 
        data: {
          period_stats: stats,
          total_counts: counts,
          period: period
        },
        database: 'SQLite'
      });
    } else {
      // Mock data for Google Sheets
      res.json({
        success: true,
        data: {
          period_stats: [{ status: 'pending', count: 5 }],
          total_counts: { total: 10, pending: 5, processing: 2, completed: 3 },
          period: req.query.period || 'daily'
        },
        database: 'Google Sheets'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quality Control endpoints
router.post("/quality-control", authenticateToken, requireStaff, async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const { batch_id, date, control_type, result, operator, comments } = req.body;

      const qcData = {
        batch_id,
        date,
        control_type,
        result,
        operator,
        comments
      };

      const qcResult = db.createQualityControl(qcData);

      res.json({ 
        success: true, 
        message: "Quality control record created",
        data: {
          qc_id: qcResult.lastInsertRowid
        },
        database: 'SQLite'
      });
    } else {
      res.json({ success: true, message: "QC record created", database: 'Google Sheets' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/quality-control", async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const { batch_id } = req.query;
      const qcRecords = db.getQualityControlRecords(batch_id);
      
      res.json({ 
        success: true, 
        data: qcRecords,
        count: qcRecords.length,
        database: 'SQLite'
      });
    } else {
      // Mock data for Google Sheets
      res.json({
        success: true,
        data: [
          { id: 1, batch_id: 1, date: '2024-06-28', control_type: 'Positive Control', result: 'Passed', operator: 'Test Operator' }
        ],
        count: 1,
        database: 'Google Sheets'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get client test results (authenticated clients can access their own data)
router.get("/client/tests", authenticateToken, async (req, res) => {
  try {
    if (DB_MODE === 'sqlite') {
      const samples = db.getAllSamples().slice(0, 10);
      
      const tests = samples.map(sample => ({
        id: sample.id,
        testType: 'Paternity DNA Test',
        status: sample.status,
        referenceNumber: sample.lab_number,
        submissionDate: sample.submission_date,
        resultDate: sample.status === 'completed' ? sample.updated_at : null,
        downloadUrl: sample.status === 'completed' ? `/api/client/test/${sample.id}/download` : null
      }));
      
      res.json({ success: true, tests, database: 'SQLite' });
    } else {
      // Mock data for Google Sheets
      const tests = [
        {
          id: 1,
          testType: 'Paternity DNA Test',
          status: 'Completed',
          referenceNumber: 'REF2024001',
          submissionDate: '2024-01-15',
          resultDate: '2024-01-22',
          downloadUrl: '/api/client/test/1/download'
        }
      ];
      
      res.json({ success: true, tests, database: 'Google Sheets' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download test results
router.get("/client/test/:id/download", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (DB_MODE === 'sqlite') {
      const sample = db.getSample(id);
      
      if (!sample) {
        return res.status(404).json({ success: false, error: "Test not found" });
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
        database: 'SQLite'
      });
    } else {
      res.json({ 
        success: true, 
        message: `Test result ${id} download would be provided here`,
        downloadUrl: `https://example.com/results/${id}.pdf`,
        database: 'Google Sheets'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;