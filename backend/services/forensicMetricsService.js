/**
 * Forensic Metrics Service
 * Tracks chain of custody, evidence integrity, and compliance for forensic DNA samples
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');
const db = require('./database');

class ForensicMetricsService {
  constructor() {
    this.db = db;
    this.complianceChecks = {
      'FDA_21_CFR_Part_11': [
        'electronic_signatures',
        'audit_trails',
        'system_validation',
        'access_controls',
        'data_integrity'
      ],
      'CAP_15189': [
        'sample_identification',
        'chain_of_custody',
        'quality_control',
        'proficiency_testing',
        'document_control'
      ],
      'ISO_15189': [
        'management_requirements',
        'technical_requirements',
        'quality_management',
        'document_control',
        'continual_improvement'
      ]
    };
  }

  /**
   * Initialize forensic tracking tables
   */
  async initialize() {
    try {
      // Chain of custody table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS chain_of_custody (
          id SERIAL PRIMARY KEY,
          sample_id INTEGER NOT NULL,
          lab_number VARCHAR(100) NOT NULL,
          action VARCHAR(100) NOT NULL,
          performed_by VARCHAR(100) DEFAULT 'System',
          location VARCHAR(100),
          temperature DECIMAL(5,2),
          integrity_hash VARCHAR(64) NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
        )
      `);

      // Evidence integrity table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS evidence_integrity (
          id SERIAL PRIMARY KEY,
          sample_id INTEGER NOT NULL,
          lab_number VARCHAR(100) NOT NULL,
          data_hash VARCHAR(64) NOT NULL,
          hash_algorithm VARCHAR(20) DEFAULT 'SHA256',
          verification_status VARCHAR(20) DEFAULT 'verified',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_verified DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
        )
      `);

      // Contamination events table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS contamination_events (
          id SERIAL PRIMARY KEY,
          sample_id INTEGER NOT NULL,
          lab_number VARCHAR(100) NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          detected_at VARCHAR(50),
          contamination_source VARCHAR(100),
          remediation_action TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
        )
      `);

      // Compliance audit table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS compliance_audit (
          id SERIAL PRIMARY KEY,
          standard VARCHAR(50) NOT NULL,
          requirement VARCHAR(100) NOT NULL,
          status VARCHAR(20) CHECK (status IN ('compliant', 'non_compliant', 'partial')),
          evidence TEXT,
          last_audit DATETIME DEFAULT CURRENT_TIMESTAMP,
          next_audit DATE,
          notes TEXT
        )
      `);

      logger.info('Forensic metrics tables initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize forensic metrics', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Record chain of custody event
   */
  recordCustodyEvent(sampleId, labNumber, action, details = {}) {
    try {
      // Generate integrity hash of the custody event
      const eventData = JSON.stringify({
        sampleId,
        labNumber,
        action,
        timestamp: new Date().toISOString(),
        ...details
      });
      const hash = crypto.createHash('sha256').update(eventData).digest('hex');

      const stmt = this.db.prepare(`
        INSERT INTO chain_of_custody
        (sample_id, lab_number, action, performed_by, location, temperature, integrity_hash, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        sampleId,
        labNumber,
        action,
        details.performed_by || 'System',
        details.location || 'Laboratory',
        details.temperature || null,
        hash,
        details.notes || null
      );

      logger.debug(`Chain of custody recorded: ${action} for ${labNumber}`);
    } catch (error) {
      logger.error('Failed to record custody event', { error: error.message });
    }
  }

  /**
   * Calculate and store evidence integrity hash
   */
  calculateEvidenceIntegrity(sampleId, sampleData) {
    try {
      const dataString = JSON.stringify(sampleData);
      const hash = crypto.createHash('sha256').update(dataString).digest('hex');

      const existing = this.db.prepare(`
        SELECT id FROM evidence_integrity WHERE sample_id = ?
      `).get(sampleId);

      if (existing) {
        // Update existing hash
        const updateStmt = this.db.prepare(`
          UPDATE evidence_integrity
          SET data_hash = ?, last_verified = CURRENT_TIMESTAMP
          WHERE sample_id = ?
        `);
        updateStmt.run(hash, sampleId);
      } else {
        // Insert new hash
        const insertStmt = this.db.prepare(`
          INSERT INTO evidence_integrity (sample_id, lab_number, data_hash)
          VALUES (?, ?, ?)
        `);
        insertStmt.run(sampleId, sampleData.lab_number, hash);
      }

      return hash;
    } catch (error) {
      logger.error('Failed to calculate evidence integrity', { error: error.message });
      return null;
    }
  }

  /**
   * Verify evidence integrity
   */
  verifyIntegrity(sampleId, currentData) {
    try {
      const stored = this.db.prepare(`
        SELECT data_hash FROM evidence_integrity WHERE sample_id = ?
      `).get(sampleId);

      if (!stored) return { verified: false, reason: 'No integrity record found' };

      const currentHash = crypto.createHash('sha256')
        .update(JSON.stringify(currentData))
        .digest('hex');

      const verified = stored.data_hash === currentHash;

      // Update verification status
      const updateStmt = this.db.prepare(`
        UPDATE evidence_integrity
        SET verification_status = ?, last_verified = CURRENT_TIMESTAMP
        WHERE sample_id = ?
      `);
      updateStmt.run(verified ? 'verified' : 'failed', sampleId);

      return { verified, storedHash: stored.data_hash, currentHash };
    } catch (error) {
      logger.error('Failed to verify integrity', { error: error.message });
      return { verified: false, error: error.message };
    }
  }

  /**
   * Record contamination event
   */
  recordContaminationEvent(sampleId, labNumber, eventType, severity = 'low', details = {}) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO contamination_events
        (sample_id, lab_number, event_type, severity, detected_at, contamination_source, remediation_action)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        sampleId,
        labNumber,
        eventType,
        severity,
        details.detected_at || 'processing',
        details.source || 'unknown',
        details.remediation || 'sample_reprocessing'
      );

      logger.warn(`Contamination event recorded: ${eventType} for ${labNumber}`, { severity });
    } catch (error) {
      logger.error('Failed to record contamination event', { error: error.message });
    }
  }

  /**
   * Calculate compliance score
   */
  calculateComplianceScore() {
    try {
      const scores = {};
      let totalScore = 0;
      let totalChecks = 0;

      // Check each compliance standard
      for (const [standard, requirements] of Object.entries(this.complianceChecks)) {
        let standardScore = 0;
        let checkCount = 0;

        requirements.forEach(requirement => {
          // Simulate compliance check (in production, this would check actual implementations)
          const compliant = this.checkRequirement(standard, requirement);
          if (compliant) standardScore++;
          checkCount++;
        });

        scores[standard] = {
          score: (standardScore / checkCount) * 100,
          passed: standardScore,
          total: checkCount
        };

        totalScore += standardScore;
        totalChecks += checkCount;
      }

      return {
        overall_score: (totalScore / totalChecks) * 100,
        standards: scores,
        last_audit: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to calculate compliance score', { error: error.message });
      return { overall_score: 0, error: error.message };
    }
  }

  /**
   * Check individual compliance requirement
   */
  checkRequirement(standard, requirement) {
    // In production, this would check actual system features
    // For demo, we'll simulate high compliance with some realistic gaps
    const complianceMap = {
      'electronic_signatures': true,
      'audit_trails': true,
      'system_validation': true,
      'access_controls': true,
      'data_integrity': true,
      'sample_identification': true,
      'chain_of_custody': true,
      'quality_control': Math.random() > 0.05, // 95% compliance
      'proficiency_testing': Math.random() > 0.1, // 90% compliance
      'document_control': true,
      'management_requirements': true,
      'technical_requirements': true,
      'quality_management': true,
      'continual_improvement': Math.random() > 0.2 // 80% compliance
    };

    return complianceMap[requirement] !== undefined ? complianceMap[requirement] : true;
  }

  /**
   * Get forensic metrics for a specific sample
   */
  async getSampleForensicMetrics(sampleId) {
    try {
      // Get chain of custody
      const custody = this.db.prepare(`
        SELECT * FROM chain_of_custody
        WHERE sample_id = ?
        ORDER BY timestamp DESC
      `).all(sampleId);

      // Get integrity record
      const integrity = this.db.prepare(`
        SELECT * FROM evidence_integrity
        WHERE sample_id = ?
      `).get(sampleId);

      // Get contamination events
      const contamination = this.db.prepare(`
        SELECT * FROM contamination_events
        WHERE sample_id = ?
        ORDER BY timestamp DESC
      `).all(sampleId);

      return {
        chain_of_custody: custody,
        evidence_integrity: integrity,
        contamination_events: contamination
      };
    } catch (error) {
      logger.error('Failed to get sample forensic metrics', { error: error.message });
      return null;
    }
  }

  /**
   * Get overall forensic metrics
   */
  async getForensicMetrics() {
    try {
      // Get forensic samples
      const forensicSamples = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE case_number LIKE 'FOR-%'
           OR metadata LIKE '%"case_type":"Forensic"%'
      `).get();

      // Get custody events count
      const custodyEvents = this.db.prepare(`
        SELECT COUNT(*) as count FROM chain_of_custody
      `).get();

      // Get integrity verifications
      const integrityChecks = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified
        FROM evidence_integrity
      `).get();

      // Get contamination statistics
      const contaminationStats = this.db.prepare(`
        SELECT
          COUNT(*) as total_events,
          COUNT(DISTINCT sample_id) as affected_samples,
          severity,
          COUNT(*) as count
        FROM contamination_events
        GROUP BY severity
      `).all();

      // Calculate compliance score
      const compliance = this.calculateComplianceScore();

      // Get recent custody events
      const recentCustody = this.db.prepare(`
        SELECT * FROM chain_of_custody
        ORDER BY timestamp DESC
        LIMIT 10
      `).all();

      return {
        forensic_samples: {
          total: forensicSamples.count,
          percentage: ((forensicSamples.count / 200) * 100).toFixed(1)
        },
        chain_of_custody: {
          total_events: custodyEvents.count,
          recent_events: recentCustody
        },
        evidence_integrity: {
          total_checks: integrityChecks.total,
          verified: integrityChecks.verified,
          integrity_rate: integrityChecks.total > 0
            ? ((integrityChecks.verified / integrityChecks.total) * 100).toFixed(1)
            : 100
        },
        contamination_events: {
          total: contaminationStats.reduce((sum, s) => sum + s.count, 0),
          by_severity: contaminationStats,
          affected_samples: contaminationStats[0]?.affected_samples || 0
        },
        compliance_score: compliance,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get forensic metrics', { error: error.message });
      return { error: error.message };
    }
  }
}

module.exports = new ForensicMetricsService();