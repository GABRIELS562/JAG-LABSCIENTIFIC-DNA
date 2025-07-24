const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const db = require('../services/database');

const router = express.Router();

/**
 * Get all reports with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      batch_type, 
      status, 
      search,
      sort_by = 'date_generated',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];
    const conditions = [];

    // Add batch type filter
    if (batch_type && batch_type !== 'all') {
      conditions.push('batch_type = ?');
      params.push(batch_type);
    }

    // Add status filter
    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    // Add search filter
    if (search) {
      conditions.push('(report_number LIKE ? OR lab_batch_number LIKE ? OR original_filename LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM reports ${whereClause}`;
    const total = db.get(countQuery, params).total;

    // Get reports data
    const reportsQuery = `
      SELECT 
        r.*,
        CASE 
          WHEN r.file_path IS NOT NULL AND r.file_path != '' THEN 1 
          ELSE 0 
        END as file_exists
      FROM reports r
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const reports = db.all(reportsQuery, params);

    // Add download URLs and check file existence
    const enhancedReports = await Promise.all(
      reports.map(async (report) => {
        // Generate download URL
        report.download_url = `/api/reports/${report.id}/download`;
        report.view_url = `/api/reports/${report.id}/view`;

        // Check if file actually exists on filesystem
        if (report.file_path) {
          try {
            await fs.access(report.file_path);
            report.file_accessible = true;
          } catch (error) {
            report.file_accessible = false;
          }
        } else {
          report.file_accessible = false;
        }

        return report;
      })
    );

    res.json({
      success: true,
      data: enhancedReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get report statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = db.get(`
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN batch_type = 'legal' THEN 1 END) as legal_reports,
        COUNT(CASE WHEN batch_type = 'peace_of_mind' THEN 1 END) as peace_of_mind_reports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_reports,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_reports,
        COUNT(CASE WHEN date_generated = DATE('now') THEN 1 END) as today_reports
      FROM reports
    `);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get specific report by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = db.get('SELECT * FROM reports WHERE id = ?', [id]);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check if file exists
    if (report.file_path) {
      try {
        await fs.access(report.file_path);
        report.file_accessible = true;
      } catch (error) {
        report.file_accessible = false;
      }
    }

    // Add URLs
    report.download_url = `/api/reports/${report.id}/download`;
    report.view_url = `/api/reports/${report.id}/view`;

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Download report file
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = db.get('SELECT * FROM reports WHERE id = ?', [id]);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    if (!report.file_path) {
      return res.status(404).json({
        success: false,
        error: 'Report file path not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(report.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Report file does not exist on filesystem'
      });
    }

    // Log the download access
    db.run(`
      INSERT INTO report_access_log (report_id, access_type, user_agent, ip_address)
      VALUES (?, 'download', ?, ?)
    `, [id, req.get('User-Agent'), req.ip]);

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.original_filename}"`);
    
    // Stream the file
    const fileBuffer = await fs.readFile(report.file_path);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * View report file in browser (inline)
 */
router.get('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = db.get('SELECT * FROM reports WHERE id = ?', [id]);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    if (!report.file_path) {
      return res.status(404).json({
        success: false,
        error: 'Report file path not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(report.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Report file does not exist on filesystem'
      });
    }

    // Log the view access
    db.run(`
      INSERT INTO report_access_log (report_id, access_type, user_agent, ip_address)
      VALUES (?, 'view', ?, ?)
    `, [id, req.get('User-Agent'), req.ip]);

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    
    // Stream the file
    const fileBuffer = await fs.readFile(report.file_path);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Error viewing report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create new report
 */
router.post('/', async (req, res) => {
  try {
    const {
      case_id,
      batch_id,
      report_type,
      batch_type,
      lab_batch_number,
      generated_by,
      notes
    } = req.body;

    // Generate report number
    const reportNumber = generateReportNumber();

    // Generate filename based on batch type
    const originalFilename = generateFilename(batch_type, lab_batch_number);
    
    // Generate file path (you might want to customize this)
    const filePath = `/Users/user/Downloads/${originalFilename}`;

    // Insert report record
    const result = db.run(`
      INSERT INTO reports (
        report_number, case_id, batch_id, report_type, batch_type,
        lab_batch_number, original_filename, file_path, date_generated,
        status, generated_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), 'pending', ?, ?)
    `, [
      reportNumber, case_id, batch_id, report_type, batch_type,
      lab_batch_number, originalFilename, filePath, generated_by, notes
    ]);

    // Get the created report
    const createdReport = db.get('SELECT * FROM reports WHERE id = ?', [result.lastInsertRowid]);

    res.json({
      success: true,
      data: createdReport,
      message: 'Report created successfully'
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update report status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'completed', 'sent', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Update report
    const result = db.run(`
      UPDATE reports 
      SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, notes, id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Get updated report
    const updatedReport = db.get('SELECT * FROM reports WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedReport,
      message: 'Report status updated successfully'
    });

  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get report access logs
 */
router.get('/:id/access-logs', async (req, res) => {
  try {
    const { id } = req.params;
    
    const logs = db.all(`
      SELECT * FROM report_access_log 
      WHERE report_id = ? 
      ORDER BY accessed_at DESC
    `, [id]);

    res.json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions
function generateReportNumber() {
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  return `RPT-${year}-${timestamp}`;
}

function generateFilename(batchType, labBatchNumber) {
  if (batchType === 'legal') {
    return `DNA Paternity Test Report - ${labBatchNumber}.pdf`;
  } else if (batchType === 'peace_of_mind') {
    return `DNA Paternity Report _POM_ - ${labBatchNumber}.pdf`;
  } else {
    return `DNA Report - ${labBatchNumber}.pdf`;
  }
}

module.exports = router;