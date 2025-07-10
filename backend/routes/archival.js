const express = require('express');
const router = express.Router();
const ArchivalService = require('../services/archivalService');
const logger = require('../utils/logger');

// Initialize archival service (would be injected in real app)
const archivalService = new ArchivalService({
  archivePath: process.env.ARCHIVE_PATH || './archives',
  encryption: process.env.ARCHIVE_ENCRYPTION === 'true',
  complianceStandard: process.env.COMPLIANCE_STANDARD || 'ISO17025'
});

// Middleware for archival access authorization
const requireArchivalAccess = (req, res, next) => {
  // Mock authorization - implement real auth check
  const userRole = req.headers['x-user-role'] || 'user';
  const allowedRoles = ['admin', 'compliance_officer', 'lab_manager'];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions for archival operations'
    });
  }
  
  next();
};

// Middleware for admin-only operations
const requireAdminAccess = (req, res, next) => {
  const userRole = req.headers['x-user-role'] || 'user';
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required for this operation'
    });
  }
  
  next();
};

/**
 * Create a new archive
 * POST /api/archival/archives
 */
router.post('/archives', requireArchivalAccess, async (req, res) => {
  try {
    const {
      entityType,
      filters = {},
      retentionOverride,
      description
    } = req.body;

    const userId = req.headers['x-user-id'] || 'unknown';

    // Validate required fields
    if (!entityType) {
      return res.status(400).json({
        success: false,
        error: 'Entity type is required'
      });
    }

    const options = {
      entityType,
      filters,
      retentionOverride,
      description,
      userId,
      adminOverride: req.headers['x-user-role'] === 'admin'
    };

    const result = await archivalService.createArchive(options);

    res.status(202).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to create archive', { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List all archives
 * GET /api/archival/archives
 */
router.get('/archives', requireArchivalAccess, async (req, res) => {
  try {
    const {
      entityType,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    let archives = archivalService.getArchiveIndex();

    // Apply filters
    if (entityType) {
      archives = archives.filter(archive => archive.entityType === entityType);
    }

    if (startDate) {
      const start = new Date(startDate);
      archives = archives.filter(archive => new Date(archive.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      archives = archives.filter(archive => new Date(archive.createdAt) <= end);
    }

    // Sort by creation date (newest first)
    archives.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedArchives = archives.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        archives: paginatedArchives,
        pagination: {
          total: archives.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < archives.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to list archives', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve archives'
    });
  }
});

/**
 * Get archive details
 * GET /api/archival/archives/:id
 */
router.get('/archives/:id', requireArchivalAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const archives = archivalService.getArchiveIndex();
    const archive = archives.find(a => a.id === id);

    if (!archive) {
      return res.status(404).json({
        success: false,
        error: 'Archive not found'
      });
    }

    res.json({
      success: true,
      data: archive
    });

  } catch (error) {
    logger.error('Failed to get archive details', { archiveId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve archive details'
    });
  }
});

/**
 * Retrieve archive contents
 * POST /api/archival/archives/:id/retrieve
 */
router.post('/archives/:id/retrieve', requireArchivalAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, filters = {} } = req.body;
    const userId = req.headers['x-user-id'] || 'unknown';

    const options = {
      userId,
      limit,
      filters
    };

    const result = await archivalService.retrieveArchive(id, options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to retrieve archive', { archiveId: req.params.id, error });
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else if (error.message.includes('permissions')) {
      res.status(403).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve archive'
      });
    }
  }
});

/**
 * Get active archival jobs
 * GET /api/archival/jobs
 */
router.get('/jobs', requireArchivalAccess, async (req, res) => {
  try {
    const jobs = archivalService.getActiveJobs();

    res.json({
      success: true,
      data: {
        jobs,
        count: jobs.length
      }
    });

  } catch (error) {
    logger.error('Failed to get archival jobs', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve archival jobs'
    });
  }
});

/**
 * Get job status
 * GET /api/archival/jobs/:id
 */
router.get('/jobs/:id', requireArchivalAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const jobs = archivalService.getActiveJobs();
    const job = jobs.find(j => j.id === id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    logger.error('Failed to get job status', { jobId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve job status'
    });
  }
});

/**
 * List retention policies
 * GET /api/archival/retention-policies
 */
router.get('/retention-policies', requireArchivalAccess, async (req, res) => {
  try {
    const policies = archivalService.getRetentionPolicies();

    res.json({
      success: true,
      data: {
        policies,
        count: policies.length
      }
    });

  } catch (error) {
    logger.error('Failed to get retention policies', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve retention policies'
    });
  }
});

/**
 * Enforce retention policies manually
 * POST /api/archival/retention-policies/enforce
 */
router.post('/retention-policies/enforce', requireAdminAccess, async (req, res) => {
  try {
    const { entityType, dryRun = false } = req.body;
    const userId = req.headers['x-user-id'] || 'unknown';

    // For demo purposes, we'll simulate the enforcement
    const result = {
      entityType: entityType || 'all',
      dryRun,
      enforcedBy: userId,
      timestamp: new Date().toISOString(),
      summary: {
        recordsEvaluated: Math.floor(Math.random() * 1000) + 500,
        recordsToDelete: Math.floor(Math.random() * 100) + 10,
        spaceToReclaim: Math.floor(Math.random() * 1000000000) + 100000000, // Random bytes
        legalHoldsBlocking: Math.floor(Math.random() * 5)
      }
    };

    if (!dryRun) {
      // In real implementation, this would trigger actual enforcement
      await archivalService.enforceRetentionPolicies();
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to enforce retention policies', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enforce retention policies'
    });
  }
});

/**
 * Get archival metrics and statistics
 * GET /api/archival/metrics
 */
router.get('/metrics', requireArchivalAccess, async (req, res) => {
  try {
    const metrics = archivalService.getMetrics();

    // Add calculated metrics
    const enhancedMetrics = {
      ...metrics,
      calculated: {
        avgArchiveSize: metrics.storage.totalArchives > 0 ? 
          Math.round(metrics.storage.totalArchiveSize / metrics.storage.totalArchives) : 0,
        avgRecordsPerArchive: metrics.archival.completedJobs > 0 ?
          Math.round(metrics.archival.totalRecordsArchived / metrics.archival.completedJobs) : 0,
        storageEfficiency: metrics.archival.avgCompressionRatio,
        retentionComplianceRate: metrics.retention.policiesEnforced > 0 ?
          ((metrics.retention.policiesEnforced - metrics.retention.legalHoldsActive) / 
           metrics.retention.policiesEnforced * 100).toFixed(1) + '%' : '100%'
      }
    };

    res.json({
      success: true,
      data: enhancedMetrics
    });

  } catch (error) {
    logger.error('Failed to get archival metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve archival metrics'
    });
  }
});

/**
 * Get storage usage breakdown
 * GET /api/archival/storage
 */
router.get('/storage', requireArchivalAccess, async (req, res) => {
  try {
    const archives = archivalService.getArchiveIndex();
    
    // Group by entity type
    const breakdown = {};
    let totalSize = 0;
    
    archives.forEach(archive => {
      if (!breakdown[archive.entityType]) {
        breakdown[archive.entityType] = {
          count: 0,
          totalSize: 0,
          recordCount: 0,
          oldestArchive: null,
          newestArchive: null
        };
      }
      
      const typeData = breakdown[archive.entityType];
      typeData.count++;
      typeData.totalSize += archive.size;
      typeData.recordCount += archive.recordCount;
      totalSize += archive.size;
      
      if (!typeData.oldestArchive || archive.createdAt < typeData.oldestArchive) {
        typeData.oldestArchive = archive.createdAt;
      }
      
      if (!typeData.newestArchive || archive.createdAt > typeData.newestArchive) {
        typeData.newestArchive = archive.createdAt;
      }
    });

    // Add percentages
    Object.keys(breakdown).forEach(entityType => {
      breakdown[entityType].percentage = totalSize > 0 ? 
        ((breakdown[entityType].totalSize / totalSize) * 100).toFixed(1) + '%' : '0%';
    });

    res.json({
      success: true,
      data: {
        totalArchives: archives.length,
        totalSize,
        breakdown,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get storage breakdown', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve storage information'
    });
  }
});

/**
 * Perform archive integrity check
 * POST /api/archival/archives/:id/verify
 */
router.post('/archives/:id/verify', requireArchivalAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || 'unknown';
    
    // For demo purposes, simulate integrity check
    const result = {
      archiveId: id,
      verifiedBy: userId,
      verifiedAt: new Date().toISOString(),
      checksumValid: Math.random() > 0.05, // 95% success rate
      signatureValid: Math.random() > 0.02, // 98% success rate
      integrityScore: Math.random() * 10 + 90, // 90-100%
      issues: []
    };

    if (!result.checksumValid) {
      result.issues.push('Checksum verification failed');
    }
    
    if (!result.signatureValid) {
      result.issues.push('Digital signature verification failed');
    }

    const status = result.checksumValid && result.signatureValid ? 200 : 422;
    
    res.status(status).json({
      success: result.issues.length === 0,
      data: result
    });

  } catch (error) {
    logger.error('Failed to verify archive integrity', { archiveId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to verify archive integrity'
    });
  }
});

/**
 * Search archives
 * POST /api/archival/archives/search
 */
router.post('/archives/search', requireArchivalAccess, async (req, res) => {
  try {
    const {
      query,
      entityTypes = [],
      dateRange = {},
      sizeRange = {},
      recordCountRange = {},
      limit = 50,
      offset = 0
    } = req.body;

    let archives = archivalService.getArchiveIndex();

    // Apply filters
    if (query) {
      archives = archives.filter(archive =>
        archive.id.toLowerCase().includes(query.toLowerCase()) ||
        (archive.metadata && JSON.stringify(archive.metadata).toLowerCase().includes(query.toLowerCase()))
      );
    }

    if (entityTypes.length > 0) {
      archives = archives.filter(archive => entityTypes.includes(archive.entityType));
    }

    if (dateRange.start) {
      const start = new Date(dateRange.start);
      archives = archives.filter(archive => new Date(archive.createdAt) >= start);
    }

    if (dateRange.end) {
      const end = new Date(dateRange.end);
      archives = archives.filter(archive => new Date(archive.createdAt) <= end);
    }

    if (sizeRange.min) {
      archives = archives.filter(archive => archive.size >= sizeRange.min);
    }

    if (sizeRange.max) {
      archives = archives.filter(archive => archive.size <= sizeRange.max);
    }

    if (recordCountRange.min) {
      archives = archives.filter(archive => archive.recordCount >= recordCountRange.min);
    }

    if (recordCountRange.max) {
      archives = archives.filter(archive => archive.recordCount <= recordCountRange.max);
    }

    // Sort by relevance (creation date for now)
    archives.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedArchives = archives.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        archives: paginatedArchives,
        pagination: {
          total: archives.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < archives.length
        },
        searchCriteria: {
          query,
          entityTypes,
          dateRange,
          sizeRange,
          recordCountRange
        }
      }
    });

  } catch (error) {
    logger.error('Failed to search archives', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search archives'
    });
  }
});

/**
 * Export archive metadata
 * GET /api/archival/archives/export
 */
router.get('/archives/export', requireArchivalAccess, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const archives = archivalService.getArchiveIndex();

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalArchives: archives.length,
      archives: archives.map(archive => ({
        id: archive.id,
        entityType: archive.entityType,
        size: archive.size,
        recordCount: archive.recordCount,
        createdAt: archive.createdAt,
        retentionUntil: archive.retentionUntil,
        encrypted: archive.encrypted,
        checksum: archive.checksum
      }))
    };

    if (format === 'csv') {
      // Convert to CSV format
      const headers = ['id', 'entityType', 'size', 'recordCount', 'createdAt', 'retentionUntil', 'encrypted', 'checksum'];
      const csvRows = [headers.join(',')];
      
      exportData.archives.forEach(archive => {
        const row = headers.map(header => archive[header] || '').join(',');
        csvRows.push(row);
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="archive-metadata.csv"');
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="archive-metadata.json"');
      res.json(exportData);
    }

  } catch (error) {
    logger.error('Failed to export archive metadata', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export archive metadata'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('Archival API error', {
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'ARCHIVAL_ERROR',
      message: 'Internal archival service error',
      details: error.message
    }
  });
});

module.exports = router;