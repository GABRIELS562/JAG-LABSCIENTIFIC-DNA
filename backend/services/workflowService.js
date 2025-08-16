const db = require('./database');
const { logger } = require('../utils/logger');

/**
 * Workflow Service - Manages sample status transitions through the testing pipeline
 * Handles: sample_collected → pcr_ready → pcr_batched → pcr_completed → 
 *          electro_ready → electro_batched → electro_completed → 
 *          analysis_ready → analysis_completed → report_generated
 */
class WorkflowService {
  constructor() {
    this.statusTransitions = {
      'sample_collected': ['pcr_ready', 'pcr_batched'],
      'pcr_ready': ['pcr_batched'],
      'pcr_batched': ['pcr_completed', 'rerun_required'],
      'pcr_completed': ['electro_ready', 'electro_batched'],
      'electro_ready': ['electro_batched'],
      'electro_batched': ['electro_completed', 'rerun_required'],
      'electro_completed': ['analysis_ready', 'analysis_in_progress'],
      'analysis_ready': ['analysis_in_progress'],
      'analysis_in_progress': ['analysis_completed', 'rerun_required'],
      'analysis_completed': ['report_generated'],
      'rerun_required': ['pcr_ready', 'electro_ready'],
      'report_generated': ['completed']
    };
  }

  /**
   * Update sample workflow status with validation
   */
  async updateSampleStatus(sampleId, newStatus, context = {}) {
    try {
      // Get current sample status
      const sample = db.db.prepare(
        'SELECT * FROM samples WHERE id = ?'
      ).get(sampleId);

      if (!sample) {
        throw new Error(`Sample ${sampleId} not found`);
      }

      // Validate transition
      const currentStatus = sample.workflow_status || 'sample_collected';
      if (!this.isValidTransition(currentStatus, newStatus)) {
        logger.warn(`Invalid status transition attempted: ${currentStatus} → ${newStatus}`);
        return { success: false, error: 'Invalid status transition' };
      }

      // Update sample status
      const updateStmt = db.db.prepare(`
        UPDATE samples 
        SET workflow_status = ?, 
            last_status_update = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      updateStmt.run(newStatus, sampleId);

      // Log status change
      this.logStatusChange(sampleId, currentStatus, newStatus, context);

      // Trigger any automated actions
      await this.handleStatusChange(sample, newStatus, context);

      logger.info(`Sample ${sample.lab_number} status updated: ${currentStatus} → ${newStatus}`);
      
      return { 
        success: true, 
        sample: { ...sample, workflow_status: newStatus }
      };
    } catch (error) {
      logger.error('Error updating sample status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch update sample statuses
   */
  async batchUpdateStatus(sampleIds, newStatus, context = {}) {
    const results = [];
    const transaction = db.db.transaction(() => {
      for (const sampleId of sampleIds) {
        const result = this.updateSampleStatus(sampleId, newStatus, context);
        results.push(result);
      }
    });

    try {
      transaction();
      return { success: true, results };
    } catch (error) {
      logger.error('Batch status update failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update all samples in a batch when batch completes
   */
  async handleBatchCompletion(batchId, batchType, completionStatus) {
    try {
      // Get all samples in this batch
      const samples = db.db.prepare(`
        SELECT id, lab_number, workflow_status 
        FROM samples 
        WHERE lab_batch_number = ?
      `).all(batchId);

      if (!samples || samples.length === 0) {
        logger.warn(`No samples found for batch ${batchId}`);
        return { success: false, error: 'No samples in batch' };
      }

      // Determine new status based on batch type
      let newStatus;
      switch (batchType) {
        case 'pcr':
          newStatus = completionStatus === 'completed' ? 'pcr_completed' : 'rerun_required';
          break;
        case 'electrophoresis':
          newStatus = completionStatus === 'completed' ? 'electro_completed' : 'rerun_required';
          break;
        case 'analysis':
          newStatus = 'analysis_completed';
          break;
        default:
          logger.error(`Unknown batch type: ${batchType}`);
          return { success: false, error: 'Unknown batch type' };
      }

      // Update all samples in batch
      const sampleIds = samples.map(s => s.id);
      const updateResult = await this.batchUpdateStatus(sampleIds, newStatus, {
        batchId,
        batchType,
        completionStatus
      });

      // Update batch status
      const updateBatchStmt = db.db.prepare(`
        UPDATE batches 
        SET status = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE batch_number = ?
      `);
      
      updateBatchStmt.run(completionStatus, batchId);

      logger.info(`Batch ${batchId} completed. Updated ${samples.length} samples to ${newStatus}`);

      return {
        success: true,
        updatedSamples: samples.length,
        newStatus
      };
    } catch (error) {
      logger.error('Error handling batch completion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Automatically move samples to next stage when ready
   */
  async progressWorkflow() {
    try {
      // Find PCR ready samples and create batch if enough samples
      const pcrReadySamples = db.db.prepare(`
        SELECT id FROM samples 
        WHERE workflow_status = 'pcr_ready' 
        AND lab_batch_number IS NULL
        LIMIT 96
      `).all();

      if (pcrReadySamples.length >= 8) { // Minimum batch size
        await this.createAutoBatch('pcr', pcrReadySamples.slice(0, 96));
      }

      // Find electro ready samples and create batch
      const electroReadySamples = db.db.prepare(`
        SELECT id FROM samples 
        WHERE workflow_status = 'electro_ready'
        LIMIT 96
      `).all();

      if (electroReadySamples.length >= 8) {
        await this.createAutoBatch('electrophoresis', electroReadySamples.slice(0, 96));
      }

      // Find analysis ready samples
      const analysisReadySamples = db.db.prepare(`
        SELECT id FROM samples 
        WHERE workflow_status = 'analysis_ready'
        LIMIT 50
      `).all();

      if (analysisReadySamples.length > 0) {
        // Mark as in progress for analysis
        for (const sample of analysisReadySamples) {
          await this.updateSampleStatus(sample.id, 'analysis_in_progress');
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Error progressing workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create automatic batch for samples
   */
  async createAutoBatch(batchType, samples) {
    try {
      const batchId = this.generateBatchId(batchType);
      const plateLayout = this.generatePlateLayout(samples);

      // Create batch record
      const insertBatch = db.db.prepare(`
        INSERT INTO batches (
          batch_number, operator, total_samples, status, 
          plate_layout, pcr_date, created_at
        ) VALUES (?, 'system', ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      insertBatch.run(batchId, samples.length, JSON.stringify(plateLayout));

      // Update samples with batch assignment
      const updateSamples = db.db.prepare(`
        UPDATE samples 
        SET lab_batch_number = ?,
            workflow_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const newStatus = batchType === 'pcr' ? 'pcr_batched' : 'electro_batched';
      
      for (const sample of samples) {
        updateSamples.run(batchId, newStatus, sample.id);
      }

      logger.info(`Auto-created ${batchType} batch ${batchId} with ${samples.length} samples`);

      return { success: true, batchId };
    } catch (error) {
      logger.error('Error creating auto batch:', error);
      throw error;
    }
  }

  /**
   * Generate plate layout for batch
   */
  generatePlateLayout(samples) {
    const layout = {};
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = 12;
    
    let sampleIndex = 0;
    for (let row of rows) {
      for (let col = 1; col <= cols; col++) {
        if (sampleIndex < samples.length) {
          const well = `${row}${col}`;
          layout[well] = {
            sampleId: samples[sampleIndex].id,
            position: well,
            status: 'assigned'
          };
          sampleIndex++;
        }
      }
    }

    return layout;
  }

  /**
   * Check if status transition is valid
   */
  isValidTransition(currentStatus, newStatus) {
    const allowedTransitions = this.statusTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Handle automated actions on status change
   */
  async handleStatusChange(sample, newStatus, context) {
    switch (newStatus) {
      case 'pcr_completed':
        // Automatically move to electro ready
        setTimeout(() => {
          this.updateSampleStatus(sample.id, 'electro_ready');
        }, 1000);
        break;
        
      case 'electro_completed':
        // Automatically move to analysis ready
        setTimeout(() => {
          this.updateSampleStatus(sample.id, 'analysis_ready');
        }, 1000);
        break;
        
      case 'analysis_completed':
        // Trigger report generation
        this.triggerReportGeneration(sample);
        break;
    }
  }

  /**
   * Trigger report generation for completed analysis
   */
  async triggerReportGeneration(sample) {
    // This would integrate with report generation service
    logger.info(`Report generation triggered for sample ${sample.lab_number}`);
  }

  /**
   * Log status changes for audit trail
   */
  logStatusChange(sampleId, oldStatus, newStatus, context) {
    try {
      const insertLog = db.db.prepare(`
        INSERT INTO workflow_logs (
          sample_id, old_status, new_status, 
          changed_by, change_context, created_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      insertLog.run(
        sampleId,
        oldStatus,
        newStatus,
        context.userId || 'system',
        JSON.stringify(context)
      );
    } catch (error) {
      logger.error('Error logging status change:', error);
    }
  }

  /**
   * Generate batch ID
   */
  generateBatchId(type) {
    const prefix = type === 'pcr' ? 'PCR' : type === 'electrophoresis' ? 'ELEC' : 'BATCH';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats() {
    try {
      const stats = db.db.prepare(`
        SELECT 
          workflow_status,
          COUNT(*) as count
        FROM samples
        GROUP BY workflow_status
      `).all();

      const stageStats = {};
      let total = 0;

      for (const stat of stats) {
        stageStats[stat.workflow_status || 'unknown'] = stat.count;
        total += stat.count;
      }

      // Calculate completion rate
      const completed = stageStats['report_generated'] || 0;
      const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

      return {
        total,
        stages: stageStats,
        completionRate: `${completionRate}%`,
        bottlenecks: this.identifyBottlenecks(stageStats)
      };
    } catch (error) {
      logger.error('Error getting workflow stats:', error);
      return null;
    }
  }

  /**
   * Identify workflow bottlenecks
   */
  identifyBottlenecks(stageStats) {
    const bottlenecks = [];
    const threshold = 20; // Flag if more than 20 samples stuck at a stage

    for (const [stage, count] of Object.entries(stageStats)) {
      if (count > threshold && !['completed', 'report_generated'].includes(stage)) {
        bottlenecks.push({
          stage,
          count,
          severity: count > 50 ? 'high' : 'medium'
        });
      }
    }

    return bottlenecks.sort((a, b) => b.count - a.count);
  }
}

module.exports = new WorkflowService();