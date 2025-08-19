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
          data.father.surname || '',
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
          'sample_collected',
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
          data.mother.surname || '',
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
          'sample_collected',
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
              child.surname || '',
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
              'sample_collected',
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
          data.father.surname || '',
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
          'sample_collected',
          'pending'
        );
      }
      
      // Insert mother sample if available
      if (data.mother && data.mother_present === 'YES') {
        const motherLabNo = `25_${String(parseInt(data.father.labNo.split('_')[1]) + 1).padStart(3, '0')}`;
        insertSample.run(
          motherLabNo,
          data.mother.name || '',
          data.mother.surname || '',
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
          'sample_collected',
          'pending'
        );
      }
      
      // Insert child sample
      if (data.child && data.child.labNo) {
        insertSample.run(
          data.child.labNo,
          data.child.name || '',
          data.child.surname || '',
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
          'sample_collected',
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