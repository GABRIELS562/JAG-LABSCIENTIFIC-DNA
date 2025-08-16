// Enhanced ISO 17025 Compliance API Routes with Full CRUD and File Upload
// Provides complete functionality for document management, equipment tracking, and compliance

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { auditTrail, CRITICAL_ACTIONS, getAuditLogs } = require('../middleware/auditTrail');
const { logger } = require('../utils/logger');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, '../uploads/iso17025');
    
    // Determine folder based on upload type
    if (req.path.includes('/documents')) {
      uploadPath = path.join(uploadPath, 'documents');
    } else if (req.path.includes('/equipment')) {
      uploadPath = path.join(uploadPath, 'equipment');
    } else if (req.path.includes('/calibrations')) {
      uploadPath = path.join(uploadPath, 'calibrations');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document formats
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, images, and text files are allowed.'));
    }
  }
});

// =====================================================
// DOCUMENT CONTROL ENDPOINTS - FULL CRUD
// =====================================================

// Get all quality documents with filters
router.get('/documents', authenticateToken, (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query = 'SELECT * FROM quality_documents WHERE 1=1';
    const params = {};
    
    if (status) {
      query += ' AND status = @status';
      params.status = status;
    }
    
    if (type) {
      query += ' AND document_type = @type';
      params.type = type;
    }
    
    if (search) {
      query += ' AND (title LIKE @search OR document_number LIKE @search OR description LIKE @search)';
      params.search = `%${search}%`;
    }
    
    query += ' ORDER BY document_number';
    
    const documents = db.prepare(query).all(params);
    res.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload and create new document
router.post('/documents/upload', authenticateToken, upload.single('file'), auditTrail('DOCUMENT_CREATE', 'quality_documents'), (req, res) => {
  try {
    const {
      document_number, document_type, title, description, version,
      effective_date, review_date, owner_name, approved_by_name, department
    } = req.body;
    
    // File information
    const file_path = req.file ? `/uploads/iso17025/documents/${req.file.filename}` : null;
    const file_hash = req.file ? require('crypto').createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex') : null;
    
    const stmt = db.prepare(`
      INSERT INTO quality_documents (
        document_number, document_type, title, description, version,
        effective_date, review_date, owner_name, approved_by_name,
        department, file_path, file_hash, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      document_number, document_type, title, description, version,
      effective_date, review_date, owner_name, approved_by_name,
      department, file_path, file_hash
    );
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Document uploaded successfully',
      file_path: file_path
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    // Delete uploaded file if database insert fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update document
router.put('/documents/:id', authenticateToken, upload.single('file'), auditTrail('DOCUMENT_UPDATE', 'quality_documents'), (req, res) => {
  try {
    const documentId = req.params.id;
    const updates = { ...req.body };
    
    // If new file uploaded, update file path and hash
    if (req.file) {
      updates.file_path = `/uploads/iso17025/documents/${req.file.filename}`;
      updates.file_hash = require('crypto').createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');
      
      // Delete old file if exists
      const oldDoc = db.prepare('SELECT file_path FROM quality_documents WHERE id = ?').get(documentId);
      if (oldDoc && oldDoc.file_path) {
        const oldPath = path.join(__dirname, '..', oldDoc.file_path);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }
    
    // Build update query
    const fields = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    const stmt = db.prepare(`
      UPDATE quality_documents 
      SET ${fields}, updated_at = datetime('now')
      WHERE id = @id
    `);
    
    stmt.run({ ...updates, id: documentId });
    
    res.json({ success: true, message: 'Document updated successfully' });
  } catch (error) {
    logger.error('Error updating document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete document
router.delete('/documents/:id', authenticateToken, auditTrail('DOCUMENT_DELETE', 'quality_documents'), (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Get document info before deletion
    const doc = db.prepare('SELECT * FROM quality_documents WHERE id = ?').get(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    // Delete file if exists
    if (doc.file_path) {
      const filePath = path.join(__dirname, '..', doc.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete from database
    db.prepare('DELETE FROM quality_documents WHERE id = ?').run(documentId);
    
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download document file
router.get('/documents/:id/download', authenticateToken, (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM quality_documents WHERE id = ?').get(req.params.id);
    
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    if (!doc.file_path) {
      return res.status(404).json({ success: false, error: 'No file attached to this document' });
    }
    
    const filePath = path.join(__dirname, '..', doc.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found on server' });
    }
    
    res.download(filePath, `${doc.document_number}_${doc.title}${path.extname(filePath)}`);
  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// EQUIPMENT MANAGEMENT - FULL CRUD
// =====================================================

// Get all equipment with details
router.get('/equipment', authenticateToken, (req, res) => {
  try {
    const { status, critical_only } = req.query;
    let query = `
      SELECT 
        e.*,
        ed.name,
        ed.category,
        ed.manufacturer,
        ed.model,
        ed.serial_number,
        ed.location,
        ed.critical_equipment,
        ed.responsible_person,
        c.next_calibration_date,
        c.certificate_number as last_calibration_cert,
        CASE 
          WHEN c.next_calibration_date < date('now') THEN 'Overdue'
          WHEN c.next_calibration_date < date('now', '+30 days') THEN 'Due Soon'
          ELSE 'Current'
        END as calibration_status
      FROM equipment e
      LEFT JOIN equipment_details ed ON e.equipment_id = ed.equipment_id
      LEFT JOIN (
        SELECT equipment_id, MAX(calibration_date) as last_cal_date, next_calibration_date, certificate_number
        FROM calibrations
        GROUP BY equipment_id
        HAVING calibration_date = MAX(calibration_date)
      ) c ON e.id = c.equipment_id
      WHERE 1=1
    `;
    
    const params = {};
    
    if (status) {
      query += ' AND e.status = @status';
      params.status = status;
    }
    
    if (critical_only === 'true') {
      query += ' AND ed.critical_equipment = 1';
    }
    
    query += ' ORDER BY e.equipment_id';
    
    const equipment = db.prepare(query).all(params);
    res.json({ success: true, data: equipment });
  } catch (error) {
    logger.error('Error fetching equipment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new equipment
router.post('/equipment', authenticateToken, upload.single('image'), auditTrail('EQUIPMENT_CREATE', 'equipment'), (req, res) => {
  try {
    const {
      equipment_id, type, name, category, manufacturer, model,
      serial_number, location, critical_equipment, responsible_person
    } = req.body;
    
    // Start transaction
    const insertEquipment = db.prepare(`
      INSERT INTO equipment (equipment_id, type, status, created_at, updated_at)
      VALUES (?, ?, 'active', datetime('now'), datetime('now'))
    `);
    
    const insertDetails = db.prepare(`
      INSERT INTO equipment_details (
        equipment_id, name, category, manufacturer, model,
        serial_number, location, critical_equipment, responsible_person
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction(() => {
      const result = insertEquipment.run(equipment_id, type || name);
      insertDetails.run(
        equipment_id, name, category, manufacturer, model,
        serial_number, location, critical_equipment === 'true' ? 1 : 0, responsible_person
      );
      return result;
    });
    
    const result = transaction();
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Equipment added successfully'
    });
  } catch (error) {
    logger.error('Error adding equipment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update equipment
router.put('/equipment/:id', authenticateToken, auditTrail('EQUIPMENT_UPDATE', 'equipment'), (req, res) => {
  try {
    const equipmentId = req.params.id;
    const updates = req.body;
    
    // Get equipment_id for updating details
    const equipment = db.prepare('SELECT equipment_id FROM equipment WHERE id = ?').get(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, error: 'Equipment not found' });
    }
    
    // Update equipment table
    if (updates.type || updates.status) {
      const equipUpdates = {};
      if (updates.type) equipUpdates.type = updates.type;
      if (updates.status) equipUpdates.status = updates.status;
      
      const fields = Object.keys(equipUpdates).map(key => `${key} = @${key}`).join(', ');
      db.prepare(`UPDATE equipment SET ${fields}, updated_at = datetime('now') WHERE id = @id`)
        .run({ ...equipUpdates, id: equipmentId });
    }
    
    // Update equipment_details table
    const detailUpdates = {};
    ['name', 'category', 'manufacturer', 'model', 'serial_number', 'location', 'critical_equipment', 'responsible_person']
      .forEach(field => {
        if (updates[field] !== undefined) {
          detailUpdates[field] = field === 'critical_equipment' ? (updates[field] === 'true' ? 1 : 0) : updates[field];
        }
      });
    
    if (Object.keys(detailUpdates).length > 0) {
      const fields = Object.keys(detailUpdates).map(key => `${key} = @${key}`).join(', ');
      db.prepare(`UPDATE equipment_details SET ${fields} WHERE equipment_id = @equipment_id`)
        .run({ ...detailUpdates, equipment_id: equipment.equipment_id });
    }
    
    res.json({ success: true, message: 'Equipment updated successfully' });
  } catch (error) {
    logger.error('Error updating equipment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete equipment
router.delete('/equipment/:id', authenticateToken, auditTrail('EQUIPMENT_DELETE', 'equipment'), (req, res) => {
  try {
    const equipmentId = req.params.id;
    
    // Get equipment info
    const equipment = db.prepare('SELECT equipment_id FROM equipment WHERE id = ?').get(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, error: 'Equipment not found' });
    }
    
    // Delete in transaction
    const transaction = db.transaction(() => {
      // Delete calibrations
      db.prepare('DELETE FROM calibrations WHERE equipment_id = ?').run(equipmentId);
      // Delete maintenance records
      db.prepare('DELETE FROM maintenance_records WHERE equipment_id = ?').run(equipmentId);
      // Delete equipment details
      db.prepare('DELETE FROM equipment_details WHERE equipment_id = ?').run(equipment.equipment_id);
      // Delete equipment
      db.prepare('DELETE FROM equipment WHERE id = ?').run(equipmentId);
    });
    
    transaction();
    
    res.json({ success: true, message: 'Equipment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting equipment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// CALIBRATION MANAGEMENT
// =====================================================

// Add calibration record with certificate upload
router.post('/calibrations', authenticateToken, upload.single('certificate'), auditTrail('CALIBRATION_CREATE', 'calibrations'), (req, res) => {
  try {
    const {
      equipment_id, calibration_date, next_calibration_date,
      calibration_type, performed_by, pass_fail, certificate_number,
      calibration_agency, results, cost
    } = req.body;
    
    // Handle certificate file
    const attachments = req.file ? JSON.stringify([`/uploads/iso17025/calibrations/${req.file.filename}`]) : null;
    
    const stmt = db.prepare(`
      INSERT INTO calibrations (
        equipment_id, calibration_date, next_calibration_date,
        calibration_type, performed_by, pass_fail, certificate_number,
        calibration_agency, results, cost, attachments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const result = stmt.run(
      equipment_id, calibration_date, next_calibration_date,
      calibration_type, performed_by, pass_fail, certificate_number,
      calibration_agency, results, cost, attachments
    );
    
    // Update equipment calibration dates
    db.prepare(`
      UPDATE equipment 
      SET last_calibration = ?, next_calibration = ?
      WHERE id = ?
    `).run(calibration_date, next_calibration_date, equipment_id);
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Calibration record added successfully'
    });
  } catch (error) {
    logger.error('Error creating calibration:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get calibration history with certificates
router.get('/equipment/:id/calibrations', authenticateToken, (req, res) => {
  try {
    const calibrations = db.prepare(`
      SELECT * FROM calibrations 
      WHERE equipment_id = ? 
      ORDER BY calibration_date DESC
    `).all(req.params.id);
    
    // Parse attachments JSON
    calibrations.forEach(cal => {
      if (cal.attachments) {
        cal.attachments = JSON.parse(cal.attachments);
      }
    });
    
    res.json({ success: true, data: calibrations });
  } catch (error) {
    logger.error('Error fetching calibrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download calibration certificate
router.get('/calibrations/:id/certificate', authenticateToken, (req, res) => {
  try {
    const calibration = db.prepare('SELECT * FROM calibrations WHERE id = ?').get(req.params.id);
    
    if (!calibration) {
      return res.status(404).json({ success: false, error: 'Calibration record not found' });
    }
    
    if (!calibration.attachments) {
      return res.status(404).json({ success: false, error: 'No certificate attached' });
    }
    
    const attachments = JSON.parse(calibration.attachments);
    if (attachments.length === 0) {
      return res.status(404).json({ success: false, error: 'No certificate file found' });
    }
    
    const filePath = path.join(__dirname, '..', attachments[0]);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Certificate file not found on server' });
    }
    
    res.download(filePath, `Calibration_Certificate_${calibration.certificate_number}${path.extname(filePath)}`);
  } catch (error) {
    logger.error('Error downloading certificate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// NON-CONFORMANCE ENDPOINTS - FULL CRUD
// =====================================================

// Get all non-conformances with full details
router.get('/non-conformances', authenticateToken, (req, res) => {
  try {
    const { status, severity, start_date, end_date, search } = req.query;
    let query = 'SELECT * FROM non_conformances WHERE 1=1';
    const params = {};
    
    if (status) {
      query += ' AND status = @status';
      params.status = status;
    }
    
    if (severity) {
      query += ' AND severity = @severity';
      params.severity = severity;
    }
    
    if (start_date) {
      query += ' AND detected_date >= @start_date';
      params.start_date = start_date;
    }
    
    if (end_date) {
      query += ' AND detected_date <= @end_date';
      params.end_date = end_date;
    }
    
    if (search) {
      query += ' AND (nc_number LIKE @search OR description LIKE @search OR corrective_action LIKE @search)';
      params.search = `%${search}%`;
    }
    
    query += ' ORDER BY detected_date DESC';
    
    const nonConformances = db.prepare(query).all(params);
    res.json({ success: true, data: nonConformances });
  } catch (error) {
    logger.error('Error fetching non-conformances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single non-conformance with full details
router.get('/non-conformances/:id', authenticateToken, (req, res) => {
  try {
    const nc = db.prepare('SELECT * FROM non_conformances WHERE id = ?').get(req.params.id);
    
    if (!nc) {
      return res.status(404).json({ success: false, error: 'Non-conformance not found' });
    }
    
    res.json({ success: true, data: nc });
  } catch (error) {
    logger.error('Error fetching non-conformance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create non-conformance with file attachments
router.post('/non-conformances', authenticateToken, upload.array('attachments', 5), auditTrail('NC_CREATE', 'non_conformances'), (req, res) => {
  try {
    const {
      detected_by_name, source, category, severity, description,
      immediate_action, sample_id, batch_id, equipment_id,
      responsible_person_name, target_completion_date
    } = req.body;
    
    // Generate NC number
    const year = new Date().getFullYear();
    const count = db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE nc_number LIKE ?')
      .get(`NC-${year}-%`).count;
    const nc_number = `NC-${year}-${String(count + 1).padStart(3, '0')}`;
    
    // Handle file attachments
    const attachments = req.files && req.files.length > 0
      ? JSON.stringify(req.files.map(file => `/uploads/iso17025/documents/${file.filename}`))
      : null;
    
    const stmt = db.prepare(`
      INSERT INTO non_conformances (
        nc_number, detected_date, detected_by_name, source, category,
        severity, description, immediate_action, sample_id, batch_id,
        equipment_id, responsible_person_name, target_completion_date,
        attachments, status, created_at, updated_at
      ) VALUES (?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      nc_number, detected_by_name, source, category, severity,
      description, immediate_action, sample_id, batch_id, equipment_id,
      responsible_person_name, target_completion_date, attachments
    );
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid, 
      nc_number,
      message: 'Non-conformance created successfully'
    });
  } catch (error) {
    logger.error('Error creating non-conformance:', error);
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update non-conformance
router.put('/non-conformances/:id', authenticateToken, upload.array('attachments', 5), auditTrail('NC_UPDATE', 'non_conformances'), (req, res) => {
  try {
    const ncId = req.params.id;
    const updates = { ...req.body };
    
    // Handle new attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => `/uploads/iso17025/documents/${file.filename}`);
      
      // Get existing attachments
      const existing = db.prepare('SELECT attachments FROM non_conformances WHERE id = ?').get(ncId);
      let allAttachments = [];
      
      if (existing && existing.attachments) {
        allAttachments = JSON.parse(existing.attachments);
      }
      
      allAttachments = allAttachments.concat(newAttachments);
      updates.attachments = JSON.stringify(allAttachments);
    }
    
    // Build update query
    const fields = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    const stmt = db.prepare(`
      UPDATE non_conformances 
      SET ${fields}, updated_at = datetime('now')
      WHERE id = @id
    `);
    
    stmt.run({ ...updates, id: ncId });
    
    res.json({ success: true, message: 'Non-conformance updated successfully' });
  } catch (error) {
    logger.error('Error updating non-conformance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete non-conformance
router.delete('/non-conformances/:id', authenticateToken, auditTrail('NC_DELETE', 'non_conformances'), (req, res) => {
  try {
    const ncId = req.params.id;
    
    // Get NC info before deletion
    const nc = db.prepare('SELECT * FROM non_conformances WHERE id = ?').get(ncId);
    if (!nc) {
      return res.status(404).json({ success: false, error: 'Non-conformance not found' });
    }
    
    // Delete attached files if any
    if (nc.attachments) {
      const files = JSON.parse(nc.attachments);
      files.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }
    
    // Delete from database
    db.prepare('DELETE FROM non_conformances WHERE id = ?').run(ncId);
    
    res.json({ success: true, message: 'Non-conformance deleted successfully' });
  } catch (error) {
    logger.error('Error deleting non-conformance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// AUDIT TRAIL ENDPOINTS
// =====================================================

// Get audit logs with enhanced filtering
router.get('/audit-logs', authenticateToken, (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      action: req.query.action,
      entity_type: req.query.entity_type,
      entity_id: req.query.entity_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const logs = getAuditLogs(filters);
    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export audit logs as CSV
router.get('/audit-logs/export', authenticateToken, (req, res) => {
  try {
    const logs = getAuditLogs(req.query);
    
    // Create CSV content
    const csv = [
      'Timestamp,User,Action,Entity Type,Entity ID,Status,IP Address',
      ...logs.map(log => 
        `"${log.timestamp}","${log.username}","${log.action}","${log.entity_type || ''}","${log.entity_id || ''}","${log.status}","${log.ip_address || ''}"`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// DASHBOARD STATISTICS
// =====================================================

// Get comprehensive dashboard stats
router.get('/dashboard-stats', authenticateToken, (req, res) => {
  try {
    const stats = {
      documents: {
        total: db.prepare('SELECT COUNT(*) as count FROM quality_documents').get().count,
        active: db.prepare('SELECT COUNT(*) as count FROM quality_documents WHERE status = ?').get('Active').count,
        draft: db.prepare('SELECT COUNT(*) as count FROM quality_documents WHERE status = ?').get('Draft').count,
        review_due: db.prepare('SELECT COUNT(*) as count FROM quality_documents WHERE review_date < date("now", "+30 days")').get().count,
        overdue_review: db.prepare('SELECT COUNT(*) as count FROM quality_documents WHERE review_date < date("now")').get().count
      },
      nonConformances: {
        total: db.prepare('SELECT COUNT(*) as count FROM non_conformances').get().count,
        open: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE status = ?').get('Open').count,
        critical: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE severity = ? AND status != ?').get('Critical', 'Closed').count,
        major: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE severity = ? AND status != ?').get('Major', 'Closed').count,
        this_month: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE detected_date >= date("now", "start of month")').get().count,
        overdue: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE target_completion_date < date("now") AND status != ?').get('Closed').count
      },
      equipment: {
        total: db.prepare('SELECT COUNT(*) as count FROM equipment').get().count,
        active: db.prepare('SELECT COUNT(*) as count FROM equipment WHERE status = ?').get('active').count,
        calibration_due: db.prepare('SELECT COUNT(*) as count FROM equipment WHERE next_calibration < date("now", "+30 days")').get().count,
        calibration_overdue: db.prepare('SELECT COUNT(*) as count FROM equipment WHERE next_calibration < date("now")').get().count,
        critical: db.prepare('SELECT COUNT(DISTINCT e.id) as count FROM equipment e JOIN equipment_details ed ON e.equipment_id = ed.equipment_id WHERE ed.critical_equipment = 1').get().count,
        maintenance_required: db.prepare('SELECT COUNT(*) as count FROM equipment WHERE status = ?').get('maintenance').count
      },
      proficiency: {
        scheduled: db.prepare('SELECT COUNT(*) as count FROM proficiency_tests WHERE performance = ?').get('Pending').count,
        satisfactory: db.prepare('SELECT COUNT(*) as count FROM proficiency_tests WHERE performance = ? AND result_date >= date("now", "-1 year")').get('Satisfactory').count,
        unsatisfactory: db.prepare('SELECT COUNT(*) as count FROM proficiency_tests WHERE performance = ? AND result_date >= date("now", "-1 year")').get('Unsatisfactory').count
      },
      recentActivity: {
        documents_updated: db.prepare('SELECT COUNT(*) as count FROM quality_documents WHERE updated_at >= date("now", "-7 days")').get().count,
        nc_created: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE created_at >= date("now", "-7 days")').get().count,
        calibrations_performed: db.prepare('SELECT COUNT(*) as count FROM calibrations WHERE created_at >= date("now", "-30 days")').get().count
      }
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;