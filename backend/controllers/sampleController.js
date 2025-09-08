/**
 * Sample Controller
 * Handles all sample-related operations
 */

const logger = require('../utils/logger');
const { validateSample } = require('../middleware/validation');

class SampleController {
  constructor(database) {
    this.db = database;
  }

  /**
   * Get all samples with optional filtering
   */
  async getSamples(req, res) {
    try {
      const { limit = 50, offset = 0, search, status, workflow_status } = req.query;
      
      // Validate parameters
      const validLimit = Math.min(parseInt(limit) || 50, 500);
      const validOffset = parseInt(offset) || 0;
      
      let query = `
        SELECT 
          s.*,
          b.batch_number as lab_batch_number
        FROM samples s
        LEFT JOIN batch_samples bs ON s.id = bs.sample_id
        LEFT JOIN batches b ON bs.batch_id = b.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (search) {
        query += ` AND (s.lab_number LIKE ? OR s.case_number LIKE ? OR s.name LIKE ? OR s.surname LIKE ?)`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      if (status) {
        query += ` AND s.status = ?`;
        params.push(status);
      }
      
      if (workflow_status) {
        query += ` AND s.workflow_status = ?`;
        params.push(workflow_status);
      }
      
      query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
      params.push(validLimit, validOffset);
      
      const samples = await this.db.all(query, params);
      
      logger.info('Samples fetched', { count: samples.length });
      
      res.json({
        success: true,
        data: samples,
        pagination: {
          limit: validLimit,
          offset: validOffset,
          total: samples.length
        }
      });
    } catch (error) {
      logger.error('Failed to fetch samples', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch samples'
      });
    }
  }

  /**
   * Get single sample by ID
   */
  async getSampleById(req, res) {
    try {
      const { id } = req.params;
      
      const sample = await this.db.get(
        'SELECT * FROM samples WHERE id = ?',
        [id]
      );
      
      if (!sample) {
        return res.status(404).json({
          success: false,
          error: 'Sample not found'
        });
      }
      
      res.json({
        success: true,
        data: sample
      });
    } catch (error) {
      logger.error('Failed to fetch sample', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sample'
      });
    }
  }

  /**
   * Create new sample
   */
  async createSample(req, res) {
    try {
      const sampleData = req.body;
      
      // Generate lab number if not provided
      if (!sampleData.lab_number) {
        sampleData.lab_number = await this.generateLabNumber();
      }
      
      const result = await this.db.createSample(sampleData);
      
      logger.info('Sample created', { id: result.id, lab_number: sampleData.lab_number });
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to create sample', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to create sample'
      });
    }
  }

  /**
   * Update sample
   */
  async updateSample(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const result = await this.db.updateSample(id, updates);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Sample not found'
        });
      }
      
      logger.info('Sample updated', { id });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to update sample', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update sample'
      });
    }
  }

  /**
   * Delete sample
   */
  async deleteSample(req, res) {
    try {
      const { id } = req.params;
      
      await this.db.run('DELETE FROM samples WHERE id = ?', [id]);
      
      logger.info('Sample deleted', { id });
      
      res.json({
        success: true,
        message: 'Sample deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete sample', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to delete sample'
      });
    }
  }

  /**
   * Progress sample workflow
   */
  async progressWorkflow(req, res) {
    try {
      const { id } = req.params;
      const { nextStage } = req.body;
      
      const sample = await this.db.get('SELECT * FROM samples WHERE id = ?', [id]);
      
      if (!sample) {
        return res.status(404).json({
          success: false,
          error: 'Sample not found'
        });
      }
      
      await this.db.run(
        'UPDATE samples SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nextStage, id]
      );
      
      logger.info('Workflow progressed', { id, from: sample.workflow_status, to: nextStage });
      
      res.json({
        success: true,
        message: 'Workflow progressed successfully'
      });
    } catch (error) {
      logger.error('Failed to progress workflow', { error: error.message, id: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to progress workflow'
      });
    }
  }

  /**
   * Generate unique lab number
   */
  async generateLabNumber() {
    const prefix = 'LAB';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}

module.exports = SampleController;