const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ForensicReportGenerator = require('../services/forensicReportGenerator');
const PaternityCalculator = require('../services/paternityCalculator');
const STRProfileMatcher = require('../services/strProfileMatcher');
const Database = require('better-sqlite3');
const { logger } = require('../utils/logger');
const { ResponseHandler } = require('../utils/responseHandler');

// Initialize services
const reportGenerator = new ForensicReportGenerator();
const paternityCalc = new PaternityCalculator();
const strMatcher = new STRProfileMatcher();
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath, { fileMustExist: false });

/**
 * Generate paternity test report
 * POST /api/forensic-reports/paternity
 */
router.post('/paternity', async (req, res) => {
  try {
    const { caseId, caseData, results, options } = req.body;

    if (!caseData || !results) {
      return ResponseHandler.error(res, 'Case data and results required', null, 400);
    }

    // If caseId provided, fetch additional data
    if (caseId && !caseData.caseNumber) {
      const caseInfo = db.prepare(`
        SELECT * FROM test_cases WHERE id = ?
      `).get(caseId);
      
      if (caseInfo) {
        caseData.caseNumber = caseInfo.case_number;
        caseData.refKitNumber = caseInfo.ref_kit_number;
        caseData.testDate = caseInfo.submission_date;
      }
    }

    // Generate PDF report
    const report = await reportGenerator.generatePaternityReport(caseData, results, options);

    // Store report reference in database
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS case_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id INTEGER,
          report_type TEXT,
          report_path TEXT,
          report_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (case_id) REFERENCES test_cases(id)
        )
      `);

      const stmt = db.prepare(`
        INSERT INTO case_reports (case_id, report_type, report_path, report_data)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(
        caseId || null,
        'paternity',
        report.filePath,
        JSON.stringify({ caseData, results })
      );
    } catch (dbError) {
      logger.warn('Could not store report reference', { error: dbError.message });
    }

    ResponseHandler.success(res, report, 'Paternity report generated successfully');

  } catch (error) {
    logger.error('Failed to generate paternity report', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate report', error);
  }
});

/**
 * Generate kinship analysis report
 * POST /api/forensic-reports/kinship
 */
router.post('/kinship', async (req, res) => {
  try {
    const { analysisData, options } = req.body;

    if (!analysisData) {
      return ResponseHandler.error(res, 'Analysis data required', null, 400);
    }

    const report = await reportGenerator.generateKinshipReport(analysisData, options);

    ResponseHandler.success(res, report, 'Kinship report generated successfully');

  } catch (error) {
    logger.error('Failed to generate kinship report', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate report', error);
  }
});

/**
 * Generate mixture analysis report
 * POST /api/forensic-reports/mixture
 */
router.post('/mixture', async (req, res) => {
  try {
    const { mixtureData, options } = req.body;

    if (!mixtureData) {
      return ResponseHandler.error(res, 'Mixture data required', null, 400);
    }

    const report = await reportGenerator.generateMixtureReport(mixtureData, options);

    ResponseHandler.success(res, report, 'Mixture report generated successfully');

  } catch (error) {
    logger.error('Failed to generate mixture report', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate report', error);
  }
});

/**
 * Generate comprehensive case report with all analyses
 * POST /api/forensic-reports/comprehensive/:caseId
 */
router.post('/comprehensive/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    
    // Fetch all case data
    const caseInfo = db.prepare(`
      SELECT * FROM test_cases WHERE id = ?
    `).get(caseId);

    if (!caseInfo) {
      return ResponseHandler.error(res, 'Case not found', null, 404);
    }

    // Get samples
    const samples = db.prepare(`
      SELECT * FROM samples WHERE case_id = ?
    `).all(caseId);

    // Get genetic profiles
    const profiles = db.prepare(`
      SELECT 
        s.relation,
        s.lab_number,
        gp.locus,
        gp.allele1,
        gp.allele2
      FROM samples s
      JOIN genetic_profiles gp ON s.id = gp.sample_id
      WHERE s.case_id = ?
      ORDER BY s.relation, gp.locus
    `).all(caseId);

    // Organize profiles by participant
    const profilesByParticipant = {};
    profiles.forEach(p => {
      if (!profilesByParticipant[p.relation]) {
        profilesByParticipant[p.relation] = {};
      }
      profilesByParticipant[p.relation][p.locus] = {
        allele1: p.allele1,
        allele2: p.allele2
      };
    });

    // Perform paternity calculation if applicable
    let paternityResults = null;
    if (profilesByParticipant['child'] && profilesByParticipant['alleged_father']) {
      const formattedProfiles = [];
      const loci = Object.keys(profilesByParticipant['child']);
      
      for (const locus of loci) {
        formattedProfiles.push({
          locus,
          child: profilesByParticipant['child'][locus],
          mother: profilesByParticipant['mother']?.[locus] || { allele1: '0', allele2: '0' },
          allegedFather: profilesByParticipant['alleged_father'][locus]
        });
      }

      paternityResults = paternityCalc.calculateCPI(formattedProfiles);
    }

    // Prepare comprehensive case data
    const caseData = {
      caseNumber: caseInfo.case_number,
      refKitNumber: caseInfo.ref_kit_number,
      testDate: caseInfo.submission_date,
      testPurpose: caseInfo.test_purpose,
      sampleType: caseInfo.sample_type,
      participants: {}
    };

    samples.forEach(s => {
      caseData.participants[s.relation] = {
        name: `${s.name} ${s.surname}`,
        labNumber: s.lab_number,
        idNumber: s.id_number
      };
    });

    // Generate comprehensive report
    const report = await reportGenerator.generatePaternityReport(
      caseData,
      paternityResults || { conclusion: 'PENDING', locusResults: [] },
      { comprehensive: true }
    );

    ResponseHandler.success(res, report, 'Comprehensive report generated successfully');

  } catch (error) {
    logger.error('Failed to generate comprehensive report', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate report', error);
  }
});

/**
 * Get report by ID
 * GET /api/forensic-reports/:reportId
 */
router.get('/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const report = reportGenerator.getReport(reportId);

    if (!report) {
      return ResponseHandler.error(res, 'Report not found', null, 404);
    }

    // Check if file exists
    if (fs.existsSync(report.file_path)) {
      res.sendFile(report.file_path);
    } else {
      ResponseHandler.error(res, 'Report file not found', null, 404);
    }

  } catch (error) {
    logger.error('Failed to retrieve report', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve report', error);
  }
});

/**
 * Download report
 * GET /api/forensic-reports/download/:reportId
 */
router.get('/download/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const report = reportGenerator.getReport(reportId);

    if (!report) {
      return ResponseHandler.error(res, 'Report not found', null, 404);
    }

    if (fs.existsSync(report.file_path)) {
      res.download(report.file_path, `${report.report_id}.pdf`);
    } else {
      ResponseHandler.error(res, 'Report file not found', null, 404);
    }

  } catch (error) {
    logger.error('Failed to download report', { error: error.message });
    ResponseHandler.error(res, 'Failed to download report', error);
  }
});

/**
 * List reports for a case
 * GET /api/forensic-reports/case/:caseNumber
 */
router.get('/case/:caseNumber', (req, res) => {
  try {
    const { caseNumber } = req.params;
    const reports = reportGenerator.getReportsByCase(caseNumber);

    ResponseHandler.success(res, reports, 'Reports retrieved successfully');

  } catch (error) {
    logger.error('Failed to retrieve case reports', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve reports', error);
  }
});

/**
 * Generate batch report for multiple samples
 * POST /api/forensic-reports/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { batchId, sampleIds, options } = req.body;

    if (!batchId && !sampleIds) {
      return ResponseHandler.error(res, 'Batch ID or sample IDs required', null, 400);
    }

    let samples;
    if (batchId) {
      samples = db.prepare(`
        SELECT * FROM samples WHERE batch_id = ?
      `).all(batchId);
    } else {
      samples = db.prepare(`
        SELECT * FROM samples WHERE id IN (${sampleIds.map(() => '?').join(',')})
      `).all(...sampleIds);
    }

    const batchData = {
      batchNumber: batchId ? `BATCH-${batchId}` : `SAMPLES-${Date.now()}`,
      samples,
      totalSamples: samples.length,
      dateGenerated: new Date()
    };

    const report = await reportGenerator.generateBatchReport(batchData, options);

    ResponseHandler.success(res, report, 'Batch report generated successfully');

  } catch (error) {
    logger.error('Failed to generate batch report', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate report', error);
  }
});

/**
 * Generate chain of custody report
 * POST /api/forensic-reports/chain-of-custody
 */
router.post('/chain-of-custody', async (req, res) => {
  try {
    const { caseId, custodyData } = req.body;

    if (!caseId) {
      return ResponseHandler.error(res, 'Case ID required', null, 400);
    }

    // Fetch custody events
    const events = db.prepare(`
      SELECT 
        'Collection' as event_type,
        collection_date as event_date,
        'Sample Collector' as person,
        'Collection Site' as location
      FROM samples
      WHERE case_id = ?
      
      UNION
      
      SELECT 
        'Receipt' as event_type,
        submission_date as event_date,
        'Lab Technician' as person,
        'Laboratory' as location
      FROM samples
      WHERE case_id = ?
      
      ORDER BY event_date
    `).all(caseId, caseId);

    const reportData = {
      caseId,
      events,
      additionalData: custodyData
    };

    // Generate simplified custody report
    const reportId = `COC-${Date.now()}`;
    const report = {
      reportId,
      caseId,
      events,
      generated: new Date()
    };

    ResponseHandler.success(res, report, 'Chain of custody report generated');

  } catch (error) {
    logger.error('Failed to generate custody report', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate report', error);
  }
});

/**
 * Get report templates
 * GET /api/forensic-reports/templates
 */
router.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'paternity',
      name: 'Paternity Test Report',
      description: 'Standard paternity testing report with CPI and probability calculations',
      requiredData: ['caseData', 'results']
    },
    {
      id: 'kinship',
      name: 'Kinship Analysis Report',
      description: 'Relationship analysis including siblings, grandparents, and extended family',
      requiredData: ['analysisData']
    },
    {
      id: 'mixture',
      name: 'Mixture Interpretation Report',
      description: 'Analysis of DNA mixtures with contributor separation',
      requiredData: ['mixtureData']
    },
    {
      id: 'identification',
      name: 'DNA Identification Report',
      description: 'Direct comparison and identification report',
      requiredData: ['profileData', 'referenceData']
    },
    {
      id: 'batch',
      name: 'Batch Processing Report',
      description: 'Summary report for multiple samples processed together',
      requiredData: ['batchId or sampleIds']
    },
    {
      id: 'chain-of-custody',
      name: 'Chain of Custody Report',
      description: 'Documentation of sample handling and custody',
      requiredData: ['caseId']
    }
  ];

  ResponseHandler.success(res, templates, 'Report templates retrieved');
});

module.exports = router;