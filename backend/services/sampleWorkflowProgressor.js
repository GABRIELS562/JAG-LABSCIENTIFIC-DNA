/**
 * Sample Workflow Progressor
 * Continuously moves the 50 paternity samples through workflow stages
 * PostgreSQL compatible version
 */

const db = require('./database');
const { logger } = require('../utils/logger');

class SampleWorkflowProgressor {
  constructor() {
    this.db = null;
    this.isRunning = false;
    this.cycleInterval = null;

    // Workflow progression map
    this.workflowProgression = {
      'sample_collected': 'pcr_ready',
      'pcr_ready': 'pcr_batched',
      'pcr_batched': 'pcr_completed',
      'pcr_completed': 'electro_ready',
      'electro_ready': 'electro_batched',
      'electro_batched': 'electro_completed',
      'electro_completed': 'analysis_ready',
      'analysis_ready': 'analysis_completed',
      'analysis_completed': 'report_ready',
      'report_ready': 'report_sent',
      'report_sent': 'sample_collected' // Cycle back to start
    };
  }

  initialize() {
    try {
      this.db = db;
      logger.info('Sample Workflow Progressor initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize workflow progressor', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  start() {
    if (this.isRunning) {
      logger.warn('Workflow progressor already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting sample workflow progression (10-second cycles)');

    // Progress samples every 10 seconds
    this.cycleInterval = setInterval(() => {
      this.progressSamples().catch(err => {
        logger.error('Error in progressSamples interval', { error: err.message });
      });
    }, 10000);

    // Do initial progression
    this.progressSamples().catch(err => {
      logger.error('Error in initial progressSamples', { error: err.message });
    });
  }

  async progressSamples() {
    try {
      // Get all PAT-2025 samples using PostgreSQL async API
      const samples = await this.db.all(`
        SELECT id, lab_number, workflow_status, case_number
        FROM samples
        WHERE case_number LIKE 'PAT-2025-%'
      `);

      if (!samples || !Array.isArray(samples)) {
        logger.debug('No PAT-2025 samples found to progress');
        return;
      }

      let progressCount = 0;

      // Progress each sample to its next stage
      for (const sample of samples) {
        const nextStage = this.workflowProgression[sample.workflow_status];

        if (nextStage) {
          await this.db.run(`
            UPDATE samples
            SET workflow_status = $1,
                updated_at = NOW()
            WHERE id = $2
          `, [nextStage, sample.id]);

          progressCount++;

          // Log cycle completion
          if (nextStage === 'sample_collected') {
            logger.info(`Sample ${sample.lab_number} completed full cycle`);
          }
        }
      }

      // Get updated distribution
      const distribution = await this.db.all(`
        SELECT workflow_status, COUNT(*) as count
        FROM samples
        WHERE case_number LIKE 'PAT-2025-%'
        GROUP BY workflow_status
      `) || [];

      logger.info('Workflow progression cycle completed', {
        samplesProgressed: progressCount,
        distribution: distribution.reduce((acc, d) => {
          acc[d.workflow_status] = parseInt(d.count);
          return acc;
        }, {})
      });

    } catch (error) {
      logger.error('Error progressing samples', { error: error.message });
    }
  }

  async getStatus() {
    try {
      const distribution = await this.db.all(`
        SELECT
          workflow_status,
          COUNT(*) as count
        FROM samples
        WHERE case_number LIKE 'PAT-2025-%'
        GROUP BY workflow_status
        ORDER BY
          CASE workflow_status
            WHEN 'sample_collected' THEN 1
            WHEN 'pcr_ready' THEN 2
            WHEN 'pcr_batched' THEN 3
            WHEN 'pcr_completed' THEN 4
            WHEN 'electro_ready' THEN 5
            WHEN 'electro_batched' THEN 6
            WHEN 'electro_completed' THEN 7
            WHEN 'analysis_ready' THEN 8
            WHEN 'analysis_completed' THEN 9
            WHEN 'report_ready' THEN 10
            WHEN 'report_sent' THEN 11
          END
      `) || [];

      return {
        isRunning: this.isRunning,
        distribution
      };
    } catch (error) {
      return { isRunning: false, distribution: [] };
    }
  }

  stop() {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
    this.isRunning = false;
    logger.info('Workflow progressor stopped');
  }
}

module.exports = SampleWorkflowProgressor;
