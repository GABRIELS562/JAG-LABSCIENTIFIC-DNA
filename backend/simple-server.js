const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads/legal_ids');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp_kitNumber_type_originalname
    const timestamp = Date.now();
    const kitNumber = req.body.kitNumber || 'unknown';
    const type = req.body.type || 'document'; // father, mother, child
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${kitNumber}_${type}_${safeName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbPath = path.join(__dirname, 'data/lims.db');
const db = new Database(dbPath);

// Basic API routes
app.get('/api/samples', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const samples = db.prepare('SELECT * FROM samples ORDER BY id DESC LIMIT ?').all(limit);
    res.json({ success: true, data: samples });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/samples/count', (req, res) => {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM samples').get();
    res.json({ success: true, count: result.count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Also add /api/samples/counts endpoint (plural)
app.get('/api/samples/counts', (req, res) => {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM samples').get();
    res.json({ success: true, count: result.count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/get-last-lab-number', (req, res) => {
  try {
    const result = db.prepare(`
      SELECT lab_number FROM samples 
      WHERE lab_number LIKE '25_%' 
      AND lab_number NOT LIKE '%(%'
      ORDER BY CAST(SUBSTR(lab_number, 4) AS INTEGER) DESC 
      LIMIT 1
    `).get();
    
    res.json({ 
      success: true, 
      data: result ? result.lab_number : null 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get next sequential lab numbers for multiple participants
app.get('/api/get-next-lab-numbers', (req, res) => {
  try {
    const count = parseInt(req.query.count) || 1;
    
    // Get the highest lab number that matches pattern 25_XXX (excluding child format)
    const result = db.prepare(`
      SELECT lab_number FROM samples 
      WHERE lab_number LIKE '25_%' 
      AND lab_number NOT LIKE '%(%'
      AND lab_number GLOB '25_[0-9][0-9][0-9]'
      ORDER BY CAST(SUBSTR(lab_number, 4) AS INTEGER) DESC 
      LIMIT 1
    `).get();
    
    let baseNumber = 1;
    if (result && result.lab_number) {
      const parts = result.lab_number.split('_');
      if (parts.length === 2) {
        baseNumber = parseInt(parts[1]) + 1;
      }
    }
    
    // Generate sequential lab numbers
    const labNumbers = [];
    for (let i = 0; i < count; i++) {
      labNumbers.push(`25_${(baseNumber + i).toString().padStart(3, '0')}`);
    }
    
    res.json({ 
      success: true, 
      labNumbers,
      baseNumber
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/samples/dashboard-stats', (req, res) => {
  try {
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM samples').get().count,
      pending: db.prepare('SELECT COUNT(*) as count FROM samples WHERE status = "pending"').get().count,
      processing: db.prepare('SELECT COUNT(*) as count FROM samples WHERE status = "processing"').get().count,
      completed: db.prepare('SELECT COUNT(*) as count FROM samples WHERE status = "completed"').get().count,
      workflow: {
        sample_collected: db.prepare('SELECT COUNT(*) as count FROM samples WHERE workflow_status = "sample_collected"').get().count,
        pcr_ready: 0,
        pcr_batched: 0,
        pcr_completed: 0,
        electro_ready: 0,
        electro_batched: 0,
        electro_completed: 0,
        analysis_ready: 0,
        analysis_completed: 0,
        report_generated: 0
      },
      pending: {
        pcr_queue: 0,
        electro_queue: 0,
        analysis_queue: 0,
        reporting_queue: 0
      },
      today: {
        received: 0,
        processed: 0,
        completed: 0,
        reports: 0
      }
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/samples/recent-activity', (req, res) => {
  try {
    const recent = db.prepare(`
      SELECT * FROM samples 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all();
    res.json({ success: true, data: recent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/samples/turnaround-metrics', (req, res) => {
  res.json({ 
    success: true, 
    data: {
      average: 3.5,
      min: 1,
      max: 7,
      current: 2.8
    }
  });
});

// File upload endpoint for ID documents
app.post('/api/upload-id-document', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { kitNumber, type, labNumber } = req.body;
    const filePath = `/uploads/legal_ids/${req.file.filename}`;
    
    // Update the sample record with the document path if labNumber is provided
    if (labNumber) {
      const stmt = db.prepare('UPDATE samples SET id_document_path = ? WHERE lab_number = ?');
      stmt.run(filePath, labNumber);
    }

    res.json({ 
      success: true, 
      filename: req.file.filename,
      path: filePath,
      originalName: req.file.originalname,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// General paternity test submission endpoint (for 8-step form)
app.post('/api/submit-test', (req, res) => {
  try {
    const data = req.body;
    console.log('Received paternity test submission:', data);
    
    // Start a transaction
    const insertSample = db.prepare(`
      INSERT INTO samples (
        lab_number, name, surname, id_number, date_of_birth,
        relation, case_number, kit_batch_number,
        collection_date, submission_date,
        email, phone_number, notes, additional_notes,
        workflow_status, status, gender, is_urgent, id_document_path, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, datetime('now'), datetime('now')
      )
    `);
    
    const transaction = db.transaction(() => {
      // Insert father sample
      if (data.father && data.father.labNo && !data.fatherNotAvailable) {
        insertSample.run(
          data.father.labNo,
          data.father.name || '',
          data.father.surname || data.father.name || '',  // Use name as surname if surname is empty
          data.father.idNumber || '',
          data.father.dateOfBirth || null,
          'alleged_father',
          data.refKitNumber || data.caseNumber,
          data.refKitNumber || data.caseNumber,
          data.father.collectionDate || data.submissionDate,
          data.submissionDate,
          data.father.email || data.contactEmail || '',
          data.father.phoneNumber || data.contactPhone || '',
          data.comments || '',
          `Test Purpose: ${data.testPurpose || 'peace_of_mind'}`,
          'pcr_ready',
          'pending',
          'M',
          data.isUrgent ? 1 : 0,
          data.idDocumentPaths?.fatherIdPath || null
        );
      }
      
      // Insert mother sample if available
      if (data.mother && data.mother.labNo && !data.motherNotAvailable) {
        insertSample.run(
          data.mother.labNo,
          data.mother.name || '',
          data.mother.surname || data.mother.name || '',  // Use name as surname if surname is empty
          data.mother.idNumber || '',
          data.mother.dateOfBirth || null,
          'mother',
          data.refKitNumber || data.caseNumber,
          data.refKitNumber || data.caseNumber,
          data.mother.collectionDate || data.submissionDate,
          data.submissionDate,
          data.mother.email || data.contactEmail || '',
          data.mother.phoneNumber || data.contactPhone || '',
          data.comments || '',
          `Test Purpose: ${data.testPurpose || 'peace_of_mind'}`,
          'pcr_ready',
          'pending',
          'F',
          data.isUrgent ? 1 : 0,
          data.idDocumentPaths?.motherIdPath || null
        );
      }
      
      // Insert children samples
      if (data.children && Array.isArray(data.children)) {
        data.children.forEach((child, index) => {
          if (child && child.labNo) {
            insertSample.run(
              child.labNo,
              child.name || '',
              child.surname || child.name || '',  // Use name as surname if surname is empty
              child.idNumber || '',
              child.dateOfBirth || null,
              child.relation || `child(${data.father?.labNo || ''})`,
              data.refKitNumber || data.caseNumber,
              data.refKitNumber || data.caseNumber,
              child.collectionDate || data.submissionDate,
              data.submissionDate,
              child.email || data.contactEmail || '',
              child.phoneNumber || data.contactPhone || '',
              data.comments || '',
              `Test Purpose: ${data.testPurpose || 'peace_of_mind'}`,
              'pcr_ready',
              'pending',
              child.gender || 'M',
              data.isUrgent ? 1 : 0,
              index === 0 ? (data.idDocumentPaths?.childIdPath || null) : null // Only first child gets the ID doc path
            );
          }
        });
      }
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: 'Samples saved successfully',
      caseNumber: data.refKitNumber || data.caseNumber
    });
    
  } catch (error) {
    console.error('Error saving paternity test submission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Peace of Mind form submission endpoint (for 6-step form)
app.post('/api/submit-paternity-test', (req, res) => {
  try {
    const data = req.body;
    console.log('Received Peace of Mind submission:', data);
    
    // Start a transaction
    const insertSample = db.prepare(`
      INSERT INTO samples (
        lab_number, name, surname, id_number, date_of_birth,
        relation, case_number, kit_batch_number,
        collection_date, submission_date,
        email, phone_number, notes, additional_notes,
        workflow_status, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, datetime('now'), datetime('now')
      )
    `);
    
    const transaction = db.transaction(() => {
      // Insert father sample
      if (data.father && data.father.labNo) {
        insertSample.run(
          data.father.labNo,
          data.father.name || '',
          data.father.surname || data.father.name || '',  // Use name as surname if surname is empty
          data.father.idNumber || '',
          data.father.dateOfBirth || null,
          data.father.relation || 'alleged_father',
          data.ref_kit_number,
          data.ref_kit_number,
          data.father.collectionDate || data.submission_date,
          data.submission_date,
          data.email_contact,
          data.phone_contact,
          `Peace of Mind - ${data.comments || ''}`,
          `Test Purpose: ${data.test_purpose}`,
          'pcr_ready',
          'pending'
        );
      }
      
      // Insert mother sample if available
      if (data.mother && data.mother_present === 'YES') {
        const motherLabNo = `25_${String(parseInt(data.father.labNo.split('_')[1]) + 1).padStart(3, '0')}`;
        insertSample.run(
          motherLabNo,
          data.mother.name || '',
          data.mother.surname || data.mother.name || '',  // Use name as surname if surname is empty
          data.mother.idNumber || '',
          data.mother.dateOfBirth || null,
          'mother',
          data.ref_kit_number,
          data.ref_kit_number,
          data.mother.collectionDate || data.submission_date,
          data.submission_date,
          data.email_contact,
          data.phone_contact,
          `Peace of Mind - ${data.comments || ''}`,
          `Test Purpose: ${data.test_purpose}`,
          'pcr_ready',
          'pending'
        );
      }
      
      // Insert child sample
      if (data.child && data.child.labNo) {
        insertSample.run(
          data.child.labNo,
          data.child.name || '',
          data.child.surname || data.child.name || '',  // Use name as surname if surname is empty
          data.child.idNumber || '',
          data.child.dateOfBirth || null,
          data.child.relation || `child(${data.father.labNo})${data.child.gender || 'M'}`,
          data.ref_kit_number,
          data.ref_kit_number,
          data.child.collectionDate || data.submission_date,
          data.submission_date,
          data.email_contact,
          data.phone_contact,
          `Peace of Mind - ${data.comments || ''}`,
          `Test Purpose: ${data.test_purpose}`,
          'pcr_ready',
          'pending'
        );
      }
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: 'Peace of Mind samples saved successfully',
      kit_number: data.ref_kit_number
    });
    
  } catch (error) {
    console.error('Error saving Peace of Mind submission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a single sample
app.delete('/api/samples/:labNumber', (req, res) => {
  try {
    const { labNumber } = req.params;
    const { password } = req.body;
    
    // Check password
    if (password !== 'admin') {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
    
    const stmt = db.prepare('DELETE FROM samples WHERE lab_number = ?');
    const result = stmt.run(labNumber);
    
    if (result.changes > 0) {
      res.json({ success: true, message: `Sample ${labNumber} deleted successfully` });
    } else {
      res.status(404).json({ success: false, error: 'Sample not found' });
    }
  } catch (error) {
    console.error('Error deleting sample:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete an entire kit (all samples with the same kit_batch_number)
app.delete('/api/kits/:kitNumber', (req, res) => {
  try {
    const { kitNumber } = req.params;
    const { password } = req.body;
    
    // Check password
    if (password !== 'admin') {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
    
    const stmt = db.prepare('DELETE FROM samples WHERE kit_batch_number = ?');
    const result = stmt.run(kitNumber);
    
    if (result.changes > 0) {
      res.json({ 
        success: true, 
        message: `Kit ${kitNumber} and all ${result.changes} samples deleted successfully` 
      });
    } else {
      res.status(404).json({ success: false, error: 'Kit not found' });
    }
  } catch (error) {
    console.error('Error deleting kit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get detailed information for a kit
app.get('/api/kits/:kitNumber/details', (req, res) => {
  try {
    const { kitNumber } = req.params;
    
    const samples = db.prepare(`
      SELECT * FROM samples 
      WHERE kit_batch_number = ? 
      ORDER BY relation
    `).all(kitNumber);
    
    if (samples.length === 0) {
      return res.status(404).json({ success: false, error: 'Kit not found' });
    }
    
    // Organize samples by relation
    const details = {
      kitNumber,
      submissionDate: samples[0]?.submission_date,
      mother: samples.find(s => s.relation === 'mother'),
      father: samples.find(s => s.relation === 'alleged_father'),
      children: samples.filter(s => s.relation && s.relation.includes('child')),
      allSamples: samples
    };
    
    res.json({ success: true, data: details });
  } catch (error) {
    console.error('Error getting kit details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all batches
app.get('/api/batches', (req, res) => {
  try {
    const batches = db.prepare('SELECT * FROM batches ORDER BY id DESC').all();
    res.json({ success: true, data: batches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save genetic analysis template
app.post('/api/batches/:batchNumber/genetic-template', (req, res) => {
  try {
    const { batchNumber } = req.params;
    const { template } = req.body;
    
    const stmt = db.prepare('UPDATE batches SET genetic_analysis_template = ? WHERE batch_number = ?');
    const result = stmt.run(template, batchNumber);
    
    if (result.changes > 0) {
      res.json({ success: true, message: 'Template saved successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Batch not found' });
    }
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save genetic template to backup storage
app.post('/api/genetic-templates', (req, res) => {
  try {
    const { batchNumber, sourceBatch, templateContent, sampleCount } = req.body;
    
    // Check if template already exists
    const existing = db.prepare('SELECT id FROM genetic_templates WHERE batch_number = ? AND is_deleted = 0').get(batchNumber);
    
    if (existing) {
      // Update existing template
      const stmt = db.prepare(`
        UPDATE genetic_templates 
        SET template_content = ?, sample_count = ?, created_at = datetime('now')
        WHERE batch_number = ? AND is_deleted = 0
      `);
      stmt.run(templateContent, sampleCount, batchNumber);
    } else {
      // Insert new template
      const stmt = db.prepare(`
        INSERT INTO genetic_templates (batch_number, source_batch, template_content, sample_count)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(batchNumber, sourceBatch, templateContent, sampleCount);
    }
    
    res.json({ success: true, message: 'Template backed up successfully' });
  } catch (error) {
    console.error('Error backing up template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all genetic templates
app.get('/api/genetic-templates', (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT * FROM genetic_templates 
      WHERE is_deleted = 0 
      ORDER BY created_at DESC
    `).all();
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Soft delete genetic template (requires password)
app.delete('/api/genetic-templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // Check password
    if (password !== 'admin') {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
    
    const stmt = db.prepare('UPDATE genetic_templates SET is_deleted = 1 WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes > 0) {
      res.json({ success: true, message: 'Template deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Template not found' });
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save genetic analysis results from GeneMapper
app.post('/api/genetic-analysis-results', (req, res) => {
  try {
    const { samples, importDate, fileName } = req.body;
    
    // Create a batch ID for this import
    const batchId = 'GAR_' + Date.now();
    
    // Store each sample's results
    const insertStmt = db.prepare(`
      INSERT INTO genetic_analysis_results (
        batch_id, sample_name, marker_data, import_date, file_name, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const transaction = db.transaction(() => {
      samples.forEach(sample => {
        insertStmt.run(
          batchId,
          sample.sampleName,
          JSON.stringify(sample.markers),
          importDate,
          fileName
        );
      });
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: 'Analysis results saved successfully',
      batchId,
      sampleCount: samples.length
    });
  } catch (error) {
    console.error('Error saving analysis results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get genetic analysis results
app.get('/api/genetic-analysis-results', (req, res) => {
  try {
    const results = db.prepare(`
      SELECT * FROM genetic_analysis_results 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all();
    
    // Parse marker data JSON
    const parsed = results.map(r => ({
      ...r,
      marker_data: JSON.parse(r.marker_data || '[]')
    }));
    
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Error fetching analysis results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update batch status
app.put('/api/batches/update-status', (req, res) => {
  try {
    const { batchNumber, status } = req.body;
    
    if (!batchNumber || !status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Batch number and status are required' 
      });
    }
    
    const stmt = db.prepare('UPDATE batches SET status = ?, updated_at = datetime(\'now\') WHERE batch_number = ?');
    const result = stmt.run(status, batchNumber);
    
    if (result.changes > 0) {
      res.json({ 
        success: true, 
        message: `Batch ${batchNumber} status updated to ${status}` 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Batch not found' 
      });
    }
  } catch (error) {
    console.error('Error updating batch status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate/Save batch (PCR or Electrophoresis)
app.post('/api/generate-batch', (req, res) => {
  try {
    const { batchNumber, analyst, operator, wells, sampleCount, date, batchType, sourcePCRBatch } = req.body;
    
    // Use existing batches table schema
    // Insert the batch using existing columns
    const result = db.prepare(`
      INSERT INTO batches (batch_number, operator, pcr_date, total_samples, plate_layout, status, source_pcr_batch)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(
      batchNumber,
      operator || analyst || '',
      date || new Date().toISOString().split('T')[0],
      sampleCount || 0,
      JSON.stringify(wells || {}),
      sourcePCRBatch || null
    );
    
    // Update samples with batch number if sample IDs provided
    if (wells) {
      const sampleLabNumbers = [];
      Object.values(wells).forEach(well => {
        if (well.samples && Array.isArray(well.samples)) {
          well.samples.forEach(sample => {
            if (sample.lab_number) {
              sampleLabNumbers.push(sample.lab_number);
            }
          });
        }
      });
      
      if (sampleLabNumbers.length > 0) {
        // For PCR batches (LDS_), update lab_batch_number
        // For Electrophoresis batches (ELEC_), update electro_batch_number
        if (batchNumber.startsWith('LDS_')) {
          const updateStmt = db.prepare('UPDATE samples SET lab_batch_number = ? WHERE lab_number = ?');
          sampleLabNumbers.forEach(labNumber => {
            updateStmt.run(batchNumber, labNumber);
          });
        } else if (batchNumber.startsWith('ELEC_')) {
          const updateStmt = db.prepare('UPDATE samples SET electro_batch_number = ? WHERE lab_number = ?');
          sampleLabNumbers.forEach(labNumber => {
            updateStmt.run(batchNumber, labNumber);
          });
        }
      }
    }
    
    res.json({ 
      success: true, 
      batchId: result.lastInsertRowid,
      batchNumber: batchNumber,
      message: `Batch ${batchNumber} created successfully`
    });
  } catch (error) {
    console.error('Error generating batch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update sample workflow status
app.put('/api/samples/workflow-status', (req, res) => {
  try {
    const { sampleIds, workflowStatus } = req.body;
    
    if (!sampleIds || !workflowStatus) {
      return res.status(400).json({ 
        success: false, 
        error: 'Sample IDs and workflow status required' 
      });
    }
    
    const updateStmt = db.prepare('UPDATE samples SET workflow_status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    
    const transaction = db.transaction(() => {
      sampleIds.forEach(id => {
        updateStmt.run(workflowStatus, id);
      });
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: `Updated ${sampleIds.length} samples to ${workflowStatus}` 
    });
  } catch (error) {
    console.error('Error updating workflow status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get queue counts for workflow dashboard
app.get('/api/samples/queue-counts', (req, res) => {
  try {
    const counts = {
      all: db.prepare('SELECT COUNT(*) as count FROM samples').get().count,
      pcr_ready: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'pcr_ready'").get().count,
      pcr_batched: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'pcr_batched'").get().count,
      electro_ready: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'electro_ready'").get().count,
      electro_batched: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'electro_batched'").get().count,
      analysis_ready: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'analysis_ready'").get().count,
      completed: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'completed'").get().count
    };
    
    res.json({ success: true, data: counts });
  } catch (error) {
    console.error('Error getting queue counts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get samples by queue/workflow status
app.get('/api/samples/queue/:queueType', (req, res) => {
  try {
    const { queueType } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    let samples;
    if (queueType === 'all') {
      samples = db.prepare('SELECT * FROM samples ORDER BY created_at DESC LIMIT ?').all(limit);
    } else {
      // Map queue types to workflow statuses
      const workflowStatus = queueType.replace(/-/g, '_'); // Convert kebab-case to snake_case
      samples = db.prepare('SELECT * FROM samples WHERE workflow_status = ? ORDER BY created_at DESC LIMIT ?').all(workflowStatus, limit);
    }
    
    res.json({ success: true, data: samples });
  } catch (error) {
    console.error('Error getting samples by queue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk import samples from Google Sheets format
app.post('/api/samples/import', (req, res) => {
  try {
    const { textData } = req.body;
    
    if (!textData) {
      return res.status(400).json({ success: false, error: 'No data provided' });
    }
    
    // Parse the tab-delimited data
    const lines = textData.trim().split('\n');
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    const insertSample = db.prepare(`
      INSERT OR IGNORE INTO samples (
        lab_number, name, surname, relation, 
        collection_date, submission_date, 
        is_mother_available, email, address_area, 
        phone_number, kit_batch_number, case_number,
        workflow_status, status, gender, is_urgent,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'sample_collected', 'pending', ?, 0,
        datetime('now'), datetime('now')
      )
    `);
    
    const transaction = db.transaction(() => {
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Split by tab
        const parts = line.split('\t').map(p => p.trim());
        
        // Expected format:
        // 0: lab_number, 1: name, 2: surname, 3: relation, 
        // 4: collection_date, 5: submission_date, 6: mother_available,
        // 7: email, 8: address, 9: phone, 10: kit_number
        
        if (parts.length < 11) {
          errorCount++;
          errors.push(`Line has insufficient columns: ${line}`);
          continue;
        }
        
        try {
          // Parse dates from DD-MMM-YYYY to YYYY-MM-DD
          const parseDate = (dateStr) => {
            if (!dateStr || dateStr === '') return null;
            const months = {
              'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
              'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
              'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = months[parts[1]] || '01';
              const year = parts[2];
              return `${year}-${month}-${day}`;
            }
            return dateStr;
          };
          
          // Determine gender from relation
          let gender = 'M'; // Default
          const relationLower = parts[3].toLowerCase();
          if (relationLower.includes('mother')) {
            gender = 'F';
          } else if (relationLower.includes('child')) {
            // Extract gender from relation like "child(25_95) M"
            const genderMatch = relationLower.match(/\s+([mf])\s*$/i);
            if (genderMatch) {
              gender = genderMatch[1].toUpperCase();
            }
          }
          
          // Clean up relation field (remove gender indicator if present)
          let relation = parts[3];
          if (relation.toLowerCase().includes('child')) {
            relation = relation.replace(/\s+[MF]\s*$/i, '').trim();
          }
          
          // Map "Alleged Father" to our standard "alleged_father"
          if (relation.toLowerCase() === 'alleged father') {
            relation = 'alleged_father';
          }
          
          const result = insertSample.run(
            parts[0], // lab_number
            parts[1], // name
            parts[2] || '', // surname
            relation, // relation
            parseDate(parts[4]), // collection_date
            parseDate(parts[5]), // submission_date
            parts[6] === 'Yes' ? 'YES' : parts[6] === 'No' ? 'NO' : parts[6], // is_mother_available
            parts[7] || '', // email
            parts[8] || '', // address_area
            parts[9] || '', // phone_number
            parts[10], // kit_batch_number
            parts[10], // case_number (same as kit_batch_number)
            gender // gender
          );
          
          if (result.changes > 0) {
            successCount++;
          } else {
            // Sample already exists (ignored due to OR IGNORE)
            console.log(`Sample ${parts[0]} already exists, skipping`);
          }
        } catch (err) {
          errorCount++;
          errors.push(`Error inserting ${parts[0]}: ${err.message}`);
        }
      }
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      data: {
        successful: successCount,
        failed: errorCount,
        errors: errors.slice(0, 10) // Return first 10 errors
      },
      message: `Imported ${successCount} samples successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Increment rerun count for samples
app.post('/api/samples/increment-rerun-count', (req, res) => {
  try {
    const { sampleIds } = req.body;
    
    if (!sampleIds || !Array.isArray(sampleIds)) {
      return res.status(400).json({ success: false, error: 'Sample IDs required' });
    }
    
    // Update rerun_count for each sample
    const stmt = db.prepare(`
      UPDATE samples 
      SET rerun_count = COALESCE(rerun_count, 0) + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const transaction = db.transaction(() => {
      for (const sampleId of sampleIds) {
        stmt.run(sampleId);
      }
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: `Updated rerun count for ${sampleIds.length} samples`
    });
  } catch (error) {
    console.error('Error updating rerun count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update workflow status for samples
app.post('/api/samples/update-workflow-status', (req, res) => {
  try {
    const { sampleIds, status, batchNumber } = req.body;
    
    if (!sampleIds || !Array.isArray(sampleIds) || !status) {
      return res.status(400).json({ success: false, error: 'Sample IDs and status required' });
    }
    
    // Update workflow_status and optionally lab_batch_number
    const stmt = batchNumber 
      ? db.prepare(`
          UPDATE samples 
          SET workflow_status = ?,
              lab_batch_number = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `)
      : db.prepare(`
          UPDATE samples 
          SET workflow_status = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `);
    
    const transaction = db.transaction(() => {
      for (const sampleId of sampleIds) {
        if (batchNumber) {
          stmt.run(status, batchNumber, sampleId);
        } else {
          stmt.run(status, sampleId);
        }
      }
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: `Updated workflow status for ${sampleIds.length} samples`
    });
  } catch (error) {
    console.error('Error updating workflow status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save report backup endpoint
app.post('/api/reports/save-backup', (req, res) => {
  try {
    const reportData = req.body;
    
    // Create reports backup table if it doesn't exist
    db.prepare(`
      CREATE TABLE IF NOT EXISTS report_backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL,
        family_name TEXT,
        report_type TEXT,
        report_data TEXT,
        generated_date TEXT,
        analyst_name TEXT,
        reviewer_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // Insert the backup
    const stmt = db.prepare(`
      INSERT INTO report_backups (
        case_id, family_name, report_type, report_data,
        generated_date, analyst_name, reviewer_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      reportData.caseId,
      reportData.familyName,
      reportData.reportType,
      JSON.stringify(reportData), // Store full data as JSON
      reportData.generatedDate,
      reportData.analystName || 'Lab Analyst',
      reportData.reviewerName || 'Lab Reviewer'
    );
    
    res.json({ 
      success: true, 
      message: 'Report backup saved successfully',
      backupId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error saving report backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get report backups endpoint
app.get('/api/reports/backups', (req, res) => {
  try {
    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='report_backups'
    `).get();
    
    if (!tableExists) {
      return res.json({ success: true, data: [] });
    }
    
    const backups = db.prepare(`
      SELECT * FROM report_backups 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all();
    
    res.json({ success: true, data: backups });
  } catch (error) {
    console.error('Error fetching report backups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Default error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Simple backend server running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  const count = db.prepare('SELECT COUNT(*) as count FROM samples').get();
  console.log(`💾 Total samples in database: ${count.count}`);
});