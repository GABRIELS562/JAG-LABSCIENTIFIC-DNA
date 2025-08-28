const express = require('express');
const router = express.Router();
const CaseManagementService = require('../services/caseManagementService');
const { logger } = require('../utils/logger');
const { ResponseHandler } = require('../utils/responseHandler');

// Initialize service
const caseService = new CaseManagementService();

/**
 * Create new case
 * POST /api/case-management/cases
 */
router.post('/cases', async (req, res) => {
  try {
    const result = await caseService.createCase(req.body);
    ResponseHandler.success(res, result, 'Case created successfully');
  } catch (error) {
    logger.error('Failed to create case', { error: error.message });
    ResponseHandler.error(res, 'Failed to create case', error);
  }
});

/**
 * Get case details
 * GET /api/case-management/cases/:caseId
 */
router.get('/cases/:caseId', (req, res) => {
  try {
    const { caseId } = req.params;
    const caseDetails = caseService.getCaseDetails(caseId);
    
    if (!caseDetails) {
      return ResponseHandler.error(res, 'Case not found', null, 404);
    }
    
    ResponseHandler.success(res, caseDetails, 'Case details retrieved');
  } catch (error) {
    logger.error('Failed to get case details', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve case details', error);
  }
});

/**
 * Update case status
 * PUT /api/case-management/cases/:caseId/status
 */
router.put('/cases/:caseId/status', (req, res) => {
  try {
    const { caseId } = req.params;
    const { status, notes } = req.body;
    
    if (!status) {
      return ResponseHandler.error(res, 'Status is required', null, 400);
    }
    
    const result = caseService.updateCaseStatus(caseId, status, notes);
    ResponseHandler.success(res, result, 'Case status updated');
  } catch (error) {
    logger.error('Failed to update case status', { error: error.message });
    ResponseHandler.error(res, 'Failed to update case status', error);
  }
});

/**
 * Search cases
 * GET /api/case-management/cases/search
 */
router.get('/cases/search', (req, res) => {
  try {
    const cases = caseService.searchCases(req.query);
    ResponseHandler.success(res, cases, 'Cases retrieved');
  } catch (error) {
    logger.error('Failed to search cases', { error: error.message });
    ResponseHandler.error(res, 'Failed to search cases', error);
  }
});

/**
 * Add case note
 * POST /api/case-management/cases/:caseId/notes
 */
router.post('/cases/:caseId/notes', (req, res) => {
  try {
    const { caseId } = req.params;
    const { noteType, content, createdBy, isConfidential } = req.body;
    
    if (!content) {
      return ResponseHandler.error(res, 'Note content is required', null, 400);
    }
    
    caseService.addCaseNote(caseId, noteType, content, createdBy, isConfidential);
    ResponseHandler.success(res, null, 'Note added successfully');
  } catch (error) {
    logger.error('Failed to add case note', { error: error.message });
    ResponseHandler.error(res, 'Failed to add note', error);
  }
});

/**
 * Add timeline event
 * POST /api/case-management/cases/:caseId/timeline
 */
router.post('/cases/:caseId/timeline', (req, res) => {
  try {
    const { caseId } = req.params;
    const { eventType, description, performedBy } = req.body;
    
    caseService.addTimelineEvent(caseId, eventType, description, performedBy);
    ResponseHandler.success(res, null, 'Timeline event added');
  } catch (error) {
    logger.error('Failed to add timeline event', { error: error.message });
    ResponseHandler.error(res, 'Failed to add timeline event', error);
  }
});

/**
 * Assign case
 * POST /api/case-management/cases/:caseId/assignments
 */
router.post('/cases/:caseId/assignments', (req, res) => {
  try {
    const { caseId } = req.params;
    const { assignedTo, role, assignedBy } = req.body;
    
    if (!assignedTo) {
      return ResponseHandler.error(res, 'Assigned to is required', null, 400);
    }
    
    caseService.assignCase(caseId, assignedTo, role, assignedBy);
    ResponseHandler.success(res, null, 'Case assigned successfully');
  } catch (error) {
    logger.error('Failed to assign case', { error: error.message });
    ResponseHandler.error(res, 'Failed to assign case', error);
  }
});

/**
 * Add case review
 * POST /api/case-management/cases/:caseId/reviews
 */
router.post('/cases/:caseId/reviews', (req, res) => {
  try {
    const { caseId } = req.params;
    const reviewId = caseService.addCaseReview(caseId, req.body);
    ResponseHandler.success(res, { reviewId }, 'Review added successfully');
  } catch (error) {
    logger.error('Failed to add case review', { error: error.message });
    ResponseHandler.error(res, 'Failed to add review', error);
  }
});

/**
 * Get case workload summary
 * GET /api/case-management/workload
 */
router.get('/workload', (req, res) => {
  try {
    const workload = caseService.getCaseWorkload();
    ResponseHandler.success(res, workload, 'Workload summary retrieved');
  } catch (error) {
    logger.error('Failed to get workload summary', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve workload', error);
  }
});

/**
 * Get analyst workload
 * GET /api/case-management/workload/analyst/:analyst?
 */
router.get('/workload/analyst/:analyst?', (req, res) => {
  try {
    const { analyst } = req.params;
    const workload = caseService.getAnalystWorkload(analyst);
    ResponseHandler.success(res, workload, 'Analyst workload retrieved');
  } catch (error) {
    logger.error('Failed to get analyst workload', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve analyst workload', error);
  }
});

/**
 * Create alert
 * POST /api/case-management/cases/:caseId/alerts
 */
router.post('/cases/:caseId/alerts', (req, res) => {
  try {
    const { caseId } = req.params;
    const { alertType, message, severity } = req.body;
    
    if (!message) {
      return ResponseHandler.error(res, 'Alert message is required', null, 400);
    }
    
    caseService.createAlert(caseId, alertType, message, severity);
    ResponseHandler.success(res, null, 'Alert created');
  } catch (error) {
    logger.error('Failed to create alert', { error: error.message });
    ResponseHandler.error(res, 'Failed to create alert', error);
  }
});

/**
 * Resolve alert
 * PUT /api/case-management/alerts/:alertId/resolve
 */
router.put('/alerts/:alertId/resolve', (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy } = req.body;
    
    caseService.resolveAlert(alertId, resolvedBy);
    ResponseHandler.success(res, null, 'Alert resolved');
  } catch (error) {
    logger.error('Failed to resolve alert', { error: error.message });
    ResponseHandler.error(res, 'Failed to resolve alert', error);
  }
});

/**
 * Export case data
 * GET /api/case-management/cases/:caseId/export
 */
router.get('/cases/:caseId/export', (req, res) => {
  try {
    const { caseId } = req.params;
    const { format = 'json' } = req.query;
    
    const exportData = caseService.exportCaseData(caseId, format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=case_${caseId}.csv`);
      res.send(exportData);
    } else {
      ResponseHandler.success(res, exportData, 'Case data exported');
    }
  } catch (error) {
    logger.error('Failed to export case data', { error: error.message });
    ResponseHandler.error(res, 'Failed to export case data', error);
  }
});

/**
 * Get all cases (paginated)
 * GET /api/case-management/cases
 */
router.get('/cases', (req, res) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query;
    
    const cases = caseService.searchCases({
      ...filters,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    ResponseHandler.success(res, {
      cases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: cases.length
      }
    }, 'Cases retrieved');
  } catch (error) {
    logger.error('Failed to get cases', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve cases', error);
  }
});

module.exports = router;