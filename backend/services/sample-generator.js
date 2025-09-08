/**
 * Sample Generator for DevOps Monitoring
 * Continuously creates samples moving through workflow stages
 */

const logger = require('../utils/logger');

class SampleGenerator {
  constructor(db) {
    this.db = db;
    this.isRunning = false;
    this.interval = null;
    this.sampleCounter = 1000;
    this.stages = [
      'sample_collected',
      'dna_extraction',
      'pcr_ready',
      'pcr_batched',
      'pcr_completed',
      'electro_ready',
      'electro_batched',
      'electro_completed',
      'analysis_ready',
      'analysis_completed',
      'report_ready',
      'report_sent'
    ];
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('🚀 Sample Generator Started - DevOps Mode');
    
    // Generate new samples every 30 seconds
    this.generateSamples();
    this.interval = setInterval(() => {
      this.generateSamples();
      this.moveWorkflow();
      this.simulateErrors();
    }, 30000);

    // Move workflow every 10 seconds
    setInterval(() => this.moveWorkflow(), 10000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    logger.info('🛑 Sample Generator Stopped');
  }

  generateSamples() {
    try {
      const relations = ['Child', 'Mother', 'Alleged Father', 'Sibling'];
      const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
      const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Emma'];
      
      // Generate 1-3 samples
      const count = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < count; i++) {
        const sampleNumber = `AUTO_${Date.now()}_${this.sampleCounter++}`;
        const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
        
        const sample = {
          lab_number: sampleNumber,
          case_number: caseNumber,
          name: names[Math.floor(Math.random() * names.length)],
          surname: surnames[Math.floor(Math.random() * surnames.length)],
          relation: relations[Math.floor(Math.random() * relations.length)],
          collection_date: new Date().toISOString().split('T')[0],
          workflow_status: 'sample_collected',
          status: 'active'
        };

        // PostgreSQL only
        await this.db.query(`
          INSERT INTO samples (lab_number, case_number, name, surname, relation, collection_date, workflow_status, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          sample.lab_number,
          sample.case_number,
          sample.name,
          sample.surname,
          sample.relation,
          sample.collection_date,
          sample.workflow_status,
          sample.status
        ]);

        logger.info(`📊 Generated sample: ${sample.lab_number} - ${sample.name} ${sample.surname}`);
      }
    } catch (error) {
      logger.error('Sample generation error:', error);
    }
  }

  async moveWorkflow() {
    try {
      // Get samples that can move to next stage (PostgreSQL syntax)
      const result = await this.db.query(`
        SELECT id, lab_number, workflow_status 
        FROM samples 
        WHERE status = 'active' 
        AND workflow_status != 'report_sent'
        ORDER BY RANDOM()
        LIMIT 5
      `);
      
      const samples = result.rows;

      for (const sample of samples) {
        const currentIndex = this.stages.indexOf(sample.workflow_status);
        if (currentIndex < this.stages.length - 1) {
          const nextStage = this.stages[currentIndex + 1];
          
          await this.db.query(`
            UPDATE samples 
            SET workflow_status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [nextStage, sample.id]);

          logger.info(`🔄 Moved ${sample.lab_number} from ${sample.workflow_status} to ${nextStage}`);
          
          // Emit metrics for Prometheus
          this.emitMetrics(nextStage);
        }
      }
    } catch (error) {
      logger.error('Workflow movement error:', error);
    }
  }

  simulateErrors() {
    // 5% chance of error for monitoring alerts
    if (Math.random() < 0.05) {
      logger.error('⚠️ SIMULATED ERROR: PCR batch failed - contamination detected');
    }
    
    // 10% chance of warning
    if (Math.random() < 0.10) {
      logger.warn('⚠️ SIMULATED WARNING: Sample approaching expiry date');
    }
  }

  emitMetrics(stage) {
    // This would integrate with Prometheus metrics
    // For now, just log it
    logger.info(`📈 METRIC: workflow_stage_transition{stage="${stage}"} 1`);
  }

  async getStats() {
    try {
      // PostgreSQL queries
      const totalResult = await this.db.query('SELECT COUNT(*) as count FROM samples');
      const activeResult = await this.db.query('SELECT COUNT(*) as count FROM samples WHERE status = $1', ['active']);
      
      const stats = {
        total: parseInt(totalResult.rows[0].count),
        byStage: {},
        activeCount: parseInt(activeResult.rows[0].count)
      };

      for (const stage of this.stages) {
        const stageResult = await this.db.query('SELECT COUNT(*) as count FROM samples WHERE workflow_status = $1', [stage]);
        stats.byStage[stage] = parseInt(stageResult.rows[0].count);
      }

      return stats;
    } catch (error) {
      logger.error('Stats generation error:', error);
      return null;
    }
  }
}

module.exports = SampleGenerator;