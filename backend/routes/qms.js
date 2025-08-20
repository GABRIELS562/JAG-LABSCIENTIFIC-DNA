const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { ResponseHandler } = require('../utils/responseHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get database connection
const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const db = new Database(dbPath);

// CAPA (Corrective/Preventive Actions) endpoints

// Get all CAPA actions with pagination and filtering
router.get('/capa', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, type, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (priority && priority !== 'all') {
      conditions.push('priority = ?');
      params.push(priority);
    }

    if (type && type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ? OR capa_number LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM capa_actions ${whereClause}`;
    const { total } = db.prepare(countQuery).get(...params);

    // Get paginated data
    const dataQuery = `
      SELECT 
        id, capa_number, title, description, type, priority, status,
        source, responsible_person, due_date, completion_date,
        created_by, created_at, updated_at
      FROM capa_actions 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);
    const capaActions = db.prepare(dataQuery).all(...params);

    ResponseHandler.paginated(res, capaActions, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    logger.error('Error fetching CAPA actions', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch CAPA actions', error);
  }
});

// Get single CAPA action
router.get('/capa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT * FROM capa_actions WHERE id = ?
    `;
    
    const capaAction = db.prepare(query).get(id);
    
    if (!capaAction) {
      return ResponseHandler.notFound(res, 'CAPA action not found');
    }

    ResponseHandler.success(res, capaAction);
  } catch (error) {
    logger.error('Error fetching CAPA action', { error: error.message, id: req.params.id });
    ResponseHandler.error(res, 'Failed to fetch CAPA action', error);
  }
});

// Create new CAPA action
router.post('/capa', async (req, res) => {
  try {
    const {
      title, description, type, priority, source, responsible_person,
      due_date, created_by
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !responsible_person || !created_by) {
      return ResponseHandler.error(res, 'Missing required fields', null, 400);
    }

    // Generate CAPA number
    const capaNumber = await generateCapaNumber();

    const query = `
      INSERT INTO capa_actions (
        capa_number, title, description, type, priority, source,
        responsible_person, due_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = db.prepare(query).run(
      capaNumber, title, description, type, priority || 'medium',
      source, responsible_person, due_date, created_by
    );

    const newCapa = db.prepare('SELECT * FROM capa_actions WHERE id = ?').get(result.lastInsertRowid);

    logger.info('CAPA action created', { 
      capaNumber, 
      id: result.lastInsertRowid,
      createdBy: created_by 
    });

    ResponseHandler.success(res, newCapa, 'CAPA action created successfully', 201);
  } catch (error) {
    logger.error('Error creating CAPA action', { error: error.message });
    ResponseHandler.error(res, 'Failed to create CAPA action', error);
  }
});

// Update CAPA action
router.put('/capa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.capa_number;
    delete updates.created_at;

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const query = `UPDATE capa_actions SET ${fields} WHERE id = ?`;
    const result = db.prepare(query).run(...values);

    if (result.changes === 0) {
      return ResponseHandler.notFound(res, 'CAPA action not found');
    }

    const updatedCapa = db.prepare('SELECT * FROM capa_actions WHERE id = ?').get(id);

    logger.info('CAPA action updated', { id, updates: Object.keys(updates) });
    ResponseHandler.success(res, updatedCapa, 'CAPA action updated successfully');
  } catch (error) {
    logger.error('Error updating CAPA action', { error: error.message, id: req.params.id });
    ResponseHandler.error(res, 'Failed to update CAPA action', error);
  }
});

// Delete CAPA action
router.delete('/capa/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM capa_actions WHERE id = ?').run(id);

    if (result.changes === 0) {
      return ResponseHandler.notFound(res, 'CAPA action not found');
    }

    logger.info('CAPA action deleted', { id });
    ResponseHandler.success(res, null, 'CAPA action deleted successfully');
  } catch (error) {
    logger.error('Error deleting CAPA action', { error: error.message, id: req.params.id });
    ResponseHandler.error(res, 'Failed to delete CAPA action', error);
  }
});

// Equipment Management endpoints

// Get all equipment
router.get('/equipment', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    let whereClause = '';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        e.*,
        (
          SELECT MAX(next_calibration_date) 
          FROM equipment_calibrations ec 
          WHERE ec.equipment_id = e.id
        ) as next_calibration_date,
        (
          SELECT status 
          FROM equipment_calibrations ec 
          WHERE ec.equipment_id = e.id 
          ORDER BY calibration_date DESC 
          LIMIT 1
        ) as last_calibration_status
      FROM equipment e
      ${whereClause}
      ORDER BY e.equipment_name
    `;

    const equipment = db.prepare(query).all(...params);
    ResponseHandler.success(res, equipment);
  } catch (error) {
    logger.error('Error fetching equipment', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch equipment', error);
  }
});

// Get equipment calibration schedule
router.get('/equipment/calibration-schedule', async (req, res) => {
  try {
    const { upcoming_days = 30 } = req.query;
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + parseInt(upcoming_days));

    const query = `
      SELECT 
        e.id, e.equipment_name, e.equipment_id, e.location, e.status,
        ec.next_calibration_date, ec.calibration_date as last_calibration_date,
        ec.status as calibration_status,
        CASE 
          WHEN ec.next_calibration_date < date('now') THEN 'overdue'
          WHEN ec.next_calibration_date <= date('now', '+7 days') THEN 'urgent'
          WHEN ec.next_calibration_date <= date('now', '+30 days') THEN 'upcoming'
          ELSE 'scheduled'
        END as urgency
      FROM equipment e
      LEFT JOIN equipment_calibrations ec ON e.id = ec.equipment_id
      AND ec.calibration_date = (
        SELECT MAX(calibration_date) 
        FROM equipment_calibrations 
        WHERE equipment_id = e.id
      )
      WHERE e.status = 'active'
      AND (ec.next_calibration_date IS NULL OR ec.next_calibration_date <= ?)
      ORDER BY 
        CASE 
          WHEN ec.next_calibration_date < date('now') THEN 1
          WHEN ec.next_calibration_date <= date('now', '+7 days') THEN 2
          WHEN ec.next_calibration_date <= date('now', '+30 days') THEN 3
          ELSE 4
        END,
        ec.next_calibration_date
    `;

    const schedule = db.prepare(query).all(upcomingDate.toISOString().split('T')[0]);
    ResponseHandler.success(res, schedule);
  } catch (error) {
    logger.error('Error fetching calibration schedule', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch calibration schedule', error);
  }
});

// Create equipment calibration record
router.post('/equipment/:equipmentId/calibrations', async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const {
      calibration_date, performed_by, calibration_type, certificate_number,
      calibration_results, status, notes, document_path
    } = req.body;

    if (!calibration_date || !performed_by || !status) {
      return ResponseHandler.error(res, 'Missing required fields', null, 400);
    }

    // Get equipment to calculate next calibration date
    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId);
    if (!equipment) {
      return ResponseHandler.notFound(res, 'Equipment not found');
    }

    const nextCalibrationDate = new Date(calibration_date);
    nextCalibrationDate.setDate(nextCalibrationDate.getDate() + equipment.calibration_frequency);

    const query = `
      INSERT INTO equipment_calibrations (
        equipment_id, calibration_date, next_calibration_date, performed_by,
        calibration_type, certificate_number, calibration_results, status,
        notes, document_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = db.prepare(query).run(
      equipmentId, calibration_date, nextCalibrationDate.toISOString().split('T')[0],
      performed_by, calibration_type, certificate_number,
      JSON.stringify(calibration_results), status, notes, document_path
    );

    const newCalibration = db.prepare('SELECT * FROM equipment_calibrations WHERE id = ?').get(result.lastInsertRowid);

    logger.info('Equipment calibration recorded', { 
      equipmentId, 
      calibrationId: result.lastInsertRowid,
      performedBy: performed_by 
    });

    ResponseHandler.success(res, newCalibration, 'Calibration record created successfully', 201);
  } catch (error) {
    logger.error('Error creating calibration record', { error: error.message });
    ResponseHandler.error(res, 'Failed to create calibration record', error);
  }
});

// Document Control endpoints

// Get all documents
router.get('/documents', async (req, res) => {
  try {
    const { category, status, type, search } = req.query;
    
    let whereClause = '';
    const params = [];
    const conditions = [];

    if (category && category !== 'all') {
      conditions.push('d.category_id = ?');
      params.push(category);
    }

    if (status && status !== 'all') {
      conditions.push('d.status = ?');
      params.push(status);
    }

    if (type && type !== 'all') {
      conditions.push('d.document_type = ?');
      params.push(type);
    }

    if (search) {
      conditions.push('(d.title LIKE ? OR d.document_number LIKE ? OR d.keywords LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        d.*,
        dc.name as category_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      ${whereClause}
      ORDER BY d.created_at DESC
    `;

    const documents = db.prepare(query).all(...params);
    ResponseHandler.success(res, documents);
  } catch (error) {
    logger.error('Error fetching documents', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch documents', error);
  }
});

// Get document categories
router.get('/documents/categories', async (req, res) => {
  try {
    const query = 'SELECT * FROM document_categories ORDER BY name';
    const categories = db.prepare(query).all();
    ResponseHandler.success(res, categories);
  } catch (error) {
    logger.error('Error fetching document categories', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch document categories', error);
  }
});

// Training Management endpoints

// Get all training programs
router.get('/training/programs', async (req, res) => {
  try {
    const query = `
      SELECT 
        tp.*,
        COUNT(et.id) as enrolled_count,
        COUNT(CASE WHEN et.status = 'completed' THEN 1 END) as completed_count
      FROM training_programs tp
      LEFT JOIN employee_training et ON tp.id = et.program_id
      GROUP BY tp.id
      ORDER BY tp.program_name
    `;

    const programs = db.prepare(query).all();
    ResponseHandler.success(res, programs);
  } catch (error) {
    logger.error('Error fetching training programs', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch training programs', error);
  }
});

// Get training records for an employee
router.get('/training/records/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const query = `
      SELECT 
        et.*,
        tp.program_name,
        tp.category,
        tp.validity_period_days,
        CASE 
          WHEN et.certificate_expiry < date('now') THEN 'expired'
          WHEN et.certificate_expiry <= date('now', '+30 days') THEN 'expiring_soon'
          ELSE 'valid'
        END as validity_status
      FROM employee_training et
      JOIN training_programs tp ON et.program_id = tp.id
      WHERE et.employee_id = ?
      ORDER BY et.completion_date DESC
    `;

    const records = db.prepare(query).all(employeeId);
    ResponseHandler.success(res, records);
  } catch (error) {
    logger.error('Error fetching training records', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch training records', error);
  }
});

// Helper function to generate CAPA number
async function generateCapaNumber() {
  const year = new Date().getFullYear();
  const yearPrefix = `CAPA-${year}-`;
  
  // Get the last CAPA number for this year
  const lastCapa = db.prepare(`
    SELECT capa_number 
    FROM capa_actions 
    WHERE capa_number LIKE ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(`${yearPrefix}%`);

  let nextNumber = 1;
  if (lastCapa) {
    const lastNumber = parseInt(lastCapa.capa_number.split('-').pop());
    nextNumber = lastNumber + 1;
  }

  return `${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
}

module.exports = router;