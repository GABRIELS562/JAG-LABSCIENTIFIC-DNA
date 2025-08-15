// ISO 17025 Compliance API Routes
// Provides endpoints for quality management, document control, and compliance features

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { auditTrail, CRITICAL_ACTIONS, getAuditLogs } = require('../middleware/auditTrail');
const { logger } = require('../utils/logger');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

// =====================================================
// DOCUMENT CONTROL ENDPOINTS
// =====================================================

// Get all quality documents
router.get('/documents', authenticateToken, (req, res) => {
  try {
    const { status, type } = req.query;
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
    
    query += ' ORDER BY document_number';
    
    const documents = db.prepare(query).all(params);
    res.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single document
router.get('/documents/:id', authenticateToken, (req, res) => {
  try {
    const document = db.prepare('SELECT * FROM quality_documents WHERE id = ?').get(req.params.id);
    
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    // Get review history
    const reviews = db.prepare('SELECT * FROM document_reviews WHERE document_id = ? ORDER BY review_date DESC').all(req.params.id);
    document.reviews = reviews;
    
    res.json({ success: true, data: document });
  } catch (error) {
    logger.error('Error fetching document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create/update document
router.post('/documents', authenticateToken, auditTrail('DOCUMENT_CREATE', 'quality_documents'), (req, res) => {
  try {
    const {
      document_number, document_type, title, description, version,
      effective_date, review_date, owner_name, approved_by_name
    } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO quality_documents (
        document_number, document_type, title, description, version,
        effective_date, review_date, owner_name, approved_by_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')
    `);
    
    const result = stmt.run(
      document_number, document_type, title, description, version,
      effective_date, review_date, owner_name, approved_by_name
    );
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    logger.error('Error creating document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// NON-CONFORMANCE ENDPOINTS
// =====================================================

// Get all non-conformances
router.get('/non-conformances', authenticateToken, (req, res) => {
  try {
    const { status, severity, start_date, end_date } = req.query;
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
    
    query += ' ORDER BY detected_date DESC';
    
    const nonConformances = db.prepare(query).all(params);
    res.json({ success: true, data: nonConformances });
  } catch (error) {
    logger.error('Error fetching non-conformances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create non-conformance
router.post('/non-conformances', authenticateToken, auditTrail('NC_CREATE', 'non_conformances'), (req, res) => {
  try {
    const {
      detected_by_name, source, category, severity, description,
      immediate_action, sample_id, batch_id
    } = req.body;
    
    // Generate NC number
    const year = new Date().getFullYear();
    const count = db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE nc_number LIKE ?')
      .get(`NC-${year}-%`).count;
    const nc_number = `NC-${year}-${String(count + 1).padStart(3, '0')}`;
    
    const stmt = db.prepare(`
      INSERT INTO non_conformances (
        nc_number, detected_date, detected_by_name, source, category,
        severity, description, immediate_action, sample_id, batch_id, status
      ) VALUES (?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
    `);
    
    const result = stmt.run(
      nc_number, detected_by_name, source, category, severity,
      description, immediate_action, sample_id, batch_id
    );
    
    res.json({ success: true, id: result.lastInsertRowid, nc_number });
  } catch (error) {
    logger.error('Error creating non-conformance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update non-conformance
router.put('/non-conformances/:id', authenticateToken, auditTrail('NC_UPDATE', 'non_conformances'), (req, res) => {
  try {
    const updates = req.body;
    const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
    
    const stmt = db.prepare(`
      UPDATE non_conformances 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = @id
    `);
    
    stmt.run({ ...updates, id: req.params.id });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating non-conformance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// EQUIPMENT MANAGEMENT ENDPOINTS
// =====================================================

// Get all equipment with calibration status
router.get('/equipment', authenticateToken, (req, res) => {
  try {
    const equipment = db.prepare(`
      SELECT 
        e.*,
        ed.name,
        ed.category,
        ed.manufacturer,
        ed.model,
        ed.location,
        ed.critical_equipment,
        c.next_calibration_date,
        CASE 
          WHEN c.next_calibration_date < date('now') THEN 'Overdue'
          WHEN c.next_calibration_date < date('now', '+30 days') THEN 'Due Soon'
          ELSE 'Current'
        END as calibration_status
      FROM equipment e
      LEFT JOIN equipment_details ed ON e.equipment_id = ed.equipment_id
      LEFT JOIN (
        SELECT equipment_id, MAX(next_calibration_date) as next_calibration_date
        FROM calibrations
        GROUP BY equipment_id
      ) c ON e.id = c.equipment_id
      ORDER BY e.equipment_id
    `).all();
    
    res.json({ success: true, data: equipment });
  } catch (error) {
    logger.error('Error fetching equipment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get calibration history for equipment
router.get('/equipment/:id/calibrations', authenticateToken, (req, res) => {
  try {
    const calibrations = db.prepare(`
      SELECT * FROM calibrations 
      WHERE equipment_id = ? 
      ORDER BY calibration_date DESC
    `).all(req.params.id);
    
    res.json({ success: true, data: calibrations });
  } catch (error) {
    logger.error('Error fetching calibrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add calibration record
router.post('/calibrations', authenticateToken, auditTrail('CALIBRATION_CREATE', 'calibrations'), (req, res) => {
  try {
    const {
      equipment_id, calibration_date, next_calibration_date,
      calibration_type, performed_by, pass_fail, certificate_number
    } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO calibrations (
        equipment_id, calibration_date, next_calibration_date,
        calibration_type, performed_by, pass_fail, certificate_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      equipment_id, calibration_date, next_calibration_date,
      calibration_type, performed_by, pass_fail, certificate_number
    );
    
    // Update equipment calibration dates
    db.prepare(`
      UPDATE equipment 
      SET last_calibration = ?, next_calibration = ?
      WHERE id = ?
    `).run(calibration_date, next_calibration_date, equipment_id);
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    logger.error('Error creating calibration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// AUDIT TRAIL ENDPOINTS
// =====================================================

// Get audit logs
router.get('/audit-logs', authenticateToken, (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      action: req.query.action,
      entity_type: req.query.entity_type,
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

// =====================================================
// DASHBOARD STATISTICS
// =====================================================

// Get compliance dashboard stats
router.get('/dashboard-stats', authenticateToken, (req, res) => {
  try {
    const stats = {
      documents: {
        total: db.prepare('SELECT COUNT(*) as count FROM quality_documents').get().count,
        active: db.prepare('SELECT COUNT(*) as count FROM quality_documents WHERE status = ?').get('Active').count,
        review_due: db.prepare('SELECT COUNT(*) as count FROM quality_documents WHERE review_date < date("now", "+30 days")').get().count
      },
      nonConformances: {
        open: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE status = ?').get('Open').count,
        critical: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE severity = ? AND status != ?').get('Critical', 'Closed').count,
        this_month: db.prepare('SELECT COUNT(*) as count FROM non_conformances WHERE detected_date >= date("now", "start of month")').get().count
      },
      equipment: {
        total: db.prepare('SELECT COUNT(*) as count FROM equipment').get().count,
        calibration_due: db.prepare('SELECT COUNT(*) as count FROM equipment WHERE next_calibration < date("now", "+30 days")').get().count,
        critical: db.prepare('SELECT COUNT(DISTINCT e.id) as count FROM equipment e JOIN equipment_details ed ON e.equipment_id = ed.equipment_id WHERE ed.critical_equipment = 1').get().count
      },
      proficiency: {
        scheduled: db.prepare('SELECT COUNT(*) as count FROM proficiency_tests WHERE performance = ?').get('Pending').count,
        satisfactory: db.prepare('SELECT COUNT(*) as count FROM proficiency_tests WHERE performance = ? AND result_date >= date("now", "-1 year")').get('Satisfactory').count
      }
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// MEASUREMENT UNCERTAINTY ENDPOINTS
// =====================================================

// Get measurement uncertainties
router.get('/uncertainties', authenticateToken, (req, res) => {
  try {
    const uncertainties = db.prepare('SELECT * FROM measurement_uncertainties ORDER BY test_method, parameter').all();
    res.json({ success: true, data: uncertainties });
  } catch (error) {
    logger.error('Error fetching uncertainties:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;