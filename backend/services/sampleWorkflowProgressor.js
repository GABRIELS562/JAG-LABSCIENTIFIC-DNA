/**
 * Sample Workflow Progressor
 * Continuously moves the 50 paternity samples through workflow stages
 */

const db = require('./database');
const path = require('path');
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
      this.progressSamples();
    }, 10000);
    
    // Do initial progression
    this.progressSamples();
  }

  progressSamples() {
    try {
      // Get all PAT-2025 samples
      const samples = this.db.prepare(`
        SELECT id, lab_number, workflow_status, case_number
        FROM samples 
        WHERE case_number LIKE 'PAT-2025-%'
      `).all();
      
      let progressCount = 0;
      const updateStmt = this.db.prepare(`
        UPDATE samples 
        SET workflow_status = ?, 
            updated_at = datetime('now')
        WHERE id = ?
      `);
      
      // Progress each sample to its next stage
      for (const sample of samples) {
        const nextStage = this.workflowProgression[sample.workflow_status];
        
        if (nextStage) {
          updateStmt.run(nextStage, sample.id);
          progressCount++;
          
          // Log cycle completion
          if (nextStage === 'sample_collected') {
            logger.info(`✅ Sample ${sample.lab_number} completed full cycle`);
          }
        }
      }
      
      // Get updated distribution
      const distribution = this.db.prepare(`
        SELECT workflow_status, COUNT(*) as count
        FROM samples 
        WHERE case_number LIKE 'PAT-2025-%'
        GROUP BY workflow_status
      `).all();
      
      logger.info('Workflow progression cycle completed', {
        samplesProgressed: progressCount,
        distribution: distribution.reduce((acc, d) => {
          acc[d.workflow_status] = d.count;
          return acc;
        }, {})
      });
      
    } catch (error) {
      logger.error('Error progressing samples', { error: error.message });
    }
  }
  
  getStatus() {
    try {
      const distribution = this.db.prepare(`
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
      `).all();
      
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