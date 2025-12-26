/**
 * Sample Management Routes
 * Handles all sample-related CRUD operations
 */

const express = require('express');
const router = express.Router();
const db = require('../services/database');
const { logger } = require('../utils/logger');
const { LRUCache } = require('lru-cache');

// Cache for sample counts
const sampleCountsCache = new LRUCache({
  max: 100,
  ttl: 30000,
  updateAgeOnGet: false,
  allowStale: false
});

// Middleware to check database connection
const requireDatabase = (req, res, next) => {
  if (!db.isConnected()) {
    return res.status(503).json({
      success: false,
      error: 'Database unavailable',
      message: 'The database is currently unavailable. Please try again later.'
    });
  }
  next();
};

/**
 * GET /api/samples
 * Get samples with pagination and filtering
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const { status, search } = req.query;

    let whereClause = '';
    let params = [];
    const conditions = [];

    // Status filtering
    if (status && status !== 'all') {
      const statusMap = {
        'pending': "workflow_status IN ('sample_collected', 'extraction_ready', 'pcr_ready') AND batch_id IS NULL",
        'extraction_ready': "workflow_status IN ('sample_collected', 'extraction_ready') AND extraction_id IS NULL",
        'extraction_batched': "workflow_status IN ('extraction_batched', 'extraction_in_progress')",
        'pcr_batched': "workflow_status = 'pcr_batched'",
        'electro_batched': "workflow_status = 'electro_batched'",
        'completed': "workflow_status IN ('analysis_completed', 'report_sent')",
        'processing': "workflow_status IN ('pcr_batched', 'pcr_completed')"
      };

      if (statusMap[status]) {
        conditions.push(statusMap[status]);
      } else {
        conditions.push(`workflow_status = $${params.length + 1}`);
        params.push(status);
      }
    }

    // Search filtering
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(`(lab_number ILIKE $${params.length + 1} OR name ILIKE $${params.length + 2} OR surname ILIKE $${params.length + 3})`);
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countResult = await db.get(`SELECT COUNT(*) as total FROM samples ${whereClause}`, params);
    const total = parseInt(countResult?.total || 0);

    // Get paginated data
    const dataQuery = `
      SELECT id, lab_number, name, surname, relation, workflow_status,
             collection_date, case_number, created_at, updated_at
      FROM samples ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    const samples = await db.all(dataQuery, params);

    res.json({
      success: true,
      message: 'Data retrieved successfully',
      data: samples || [],
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching samples', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/samples/counts
 * Get sample counts by workflow status
 */
router.get('/counts', requireDatabase, async (req, res) => {
  try {
    const cacheKey = 'sample_counts';
    const cached = sampleCountsCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN workflow_status = 'sample_collected' THEN 1 END) as registered,
        COUNT(CASE WHEN workflow_status IN ('dna_extraction') THEN 1 END) as in_extraction,
        COUNT(CASE WHEN workflow_status IN ('pcr_ready', 'pcr_batched', 'pcr_completed') THEN 1 END) as in_pcr,
        COUNT(CASE WHEN workflow_status IN ('electro_ready', 'electro_batched', 'electro_completed') THEN 1 END) as in_electrophoresis,
        COUNT(CASE WHEN workflow_status IN ('analysis_ready', 'analysis_completed') THEN 1 END) as in_analysis,
        COUNT(CASE WHEN workflow_status IN ('report_ready', 'report_sent') THEN 1 END) as completed
      FROM samples
    `;
    const result = await db.get(query, []);

    if (result) {
      sampleCountsCache.set(cacheKey, result);
    }

    res.json({ success: true, data: result || {} });
  } catch (error) {
    logger.error('Error getting sample counts', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/samples/search
 * Search samples by various criteria
 */
router.get('/search', requireDatabase, async (req, res) => {
  try {
    const { q, field = 'all' } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const searchTerm = `%${q}%`;
    let query, params;

    if (field === 'all') {
      query = `
        SELECT id, lab_number, name, surname, relation, workflow_status, case_number
        FROM samples
        WHERE lab_number ILIKE $1 OR name ILIKE $2 OR surname ILIKE $3 OR case_number ILIKE $4
        ORDER BY created_at DESC
        LIMIT 50
      `;
      params = [searchTerm, searchTerm, searchTerm, searchTerm];
    } else {
      query = `
        SELECT id, lab_number, name, surname, relation, workflow_status, case_number
        FROM samples WHERE ${field} ILIKE $1
        ORDER BY created_at DESC LIMIT 50
      `;
      params = [searchTerm];
    }

    const samples = await db.all(query, params);
    res.json({ success: true, data: samples || [] });
  } catch (error) {
    logger.error('Error searching samples', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/samples
 * Create a new sample
 */
router.post('/', requireDatabase, async (req, res) => {
  try {
    const { lab_number, name, surname, relation, case_number, collection_date, sample_type } = req.body;

    if (!lab_number || !name || !surname) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: lab_number, name, surname'
      });
    }

    // Check for duplicate
    const existing = await db.get('SELECT id FROM samples WHERE lab_number = $1', [lab_number]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Sample with lab number ${lab_number} already exists`
      });
    }

    const query = `
      INSERT INTO samples (lab_number, name, surname, relation, case_number, collection_date,
                          sample_type, workflow_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'sample_collected', NOW(), NOW())
      RETURNING id, lab_number, name, surname, workflow_status
    `;

    const result = await db.get(query, [
      lab_number, name.trim(), surname.trim(),
      relation || 'Child', case_number, collection_date || new Date(), sample_type || 'Buccal Swab'
    ]);

    sampleCountsCache.clear();
    res.status(201).json({ success: true, data: result, message: 'Sample created successfully' });
  } catch (error) {
    logger.error('Error creating sample', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/samples/:id
 * Get a single sample by ID
 */
router.get('/:id', requireDatabase, async (req, res) => {
  try {
    const sample = await db.get('SELECT * FROM samples WHERE id = $1', [req.params.id]);
    if (!sample) {
      return res.status(404).json({ success: false, error: 'Sample not found' });
    }
    res.json({ success: true, data: sample });
  } catch (error) {
    logger.error('Error fetching sample', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/samples/:id
 * Update a sample
 */
router.put('/:id', requireDatabase, async (req, res) => {
  try {
    const { workflow_status, notes, batch_id } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (workflow_status) {
      updates.push(`workflow_status = $${paramIndex++}`);
      params.push(workflow_status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    if (batch_id !== undefined) {
      updates.push(`batch_id = $${paramIndex++}`);
      params.push(batch_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const query = `UPDATE samples SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.get(query, params);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Sample not found' });
    }

    sampleCountsCache.clear();
    res.json({ success: true, data: result, message: 'Sample updated successfully' });
  } catch (error) {
    logger.error('Error updating sample', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
