/**
 * Enhanced Sample Cycler for Continuous DNA Lab Workflow
 * Generates samples, progresses them through workflow stages, and manages lifecycle
 */

const config = require('../config/workflow-config');
const { logger } = require('../utils/logger');
const databaseService = require('./database-unified-postgres');

class EnhancedSampleCycler {
  constructor(db = null) {
    this.db = db || databaseService.db;
    this.isRunning = false;
    this.intervals = {};
    this.stats = {
      samplesGenerated: 0,
      samplesProgressed: 0,
      samplesCompleted: 0,
      samplesArchived: 0,
      currentActive: 0,
      averageThroughput: 0
    };
    this.lastStatsUpdate = Date.now();
  }

  start() {
    if (this.isRunning) {
      logger.warn('Enhanced Sample Cycler already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Enhanced Sample Cycler started');

    // Start all processes
    if (config.sampleGeneration.enabled) {
      this.startSampleGeneration();
    }
    if (config.workflowProgression.enabled) {
      this.startWorkflowProgression();
    }
    if (config.sampleGeneration.autoCleanup) {
      this.startCleanup();
    }
    if (config.metrics.enabled) {
      this.startMetricsUpdate();
    }
    if (config.devops.generateLoadSpikes) {
      this.startLoadSpikes();
    }
  }

  stop() {
    this.isRunning = false;
    Object.values(this.intervals).forEach(interval => clearInterval(interval));
    this.intervals = {};
    logger.info('🛑 Enhanced Sample Cycler stopped');
  }

  startSampleGeneration() {
    const generateSamples = () => {
      try {
        const currentCount = this.getCurrentSampleCount();
        
        if (currentCount >= config.sampleGeneration.maxActiveSamples) {
          logger.debug(`Sample limit reached (${currentCount}/${config.sampleGeneration.maxActiveSamples})`);
          return;
        }

        const batchSize = this.isInSpike ? 
          config.sampleGeneration.batchSize * config.devops.spikeMultiplier : 
          config.sampleGeneration.batchSize;

        for (let i = 0; i < batchSize; i++) {
          this.generateSample();
        }

        logger.info(`📊 Generated ${batchSize} new samples`);
      } catch (error) {
        logger.error('Sample generation error:', error);
      }
    };

    this.intervals.generation = setInterval(generateSamples, config.sampleGeneration.interval);
    generateSamples(); // Generate immediately
  }

  generateSample() {
    const firstName = config.sampleNames.firstNames[Math.floor(Math.random() * config.sampleNames.firstNames.length)];
    const lastName = config.sampleNames.lastNames[Math.floor(Math.random() * config.sampleNames.lastNames.length)];
    const sampleType = this.selectByProbability(config.sampleTypes);
    const caseType = this.selectByProbability(config.caseTypes);
    
    const sample = {
      lab_number: `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      case_number: `CASE-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      name: firstName,
      surname: lastName,
      relation: this.getRelation(caseType),
      sample_type: sampleType,
      // case_type: caseType, // Not in PostgreSQL table schema
      collection_date: new Date().toISOString().split('T')[0],
      workflow_status: 'sample_collected',
      status: 'active',
      created_at: new Date().toISOString(),
      metadata: JSON.stringify({
        barcode: `BC${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
        volume: Math.floor(Math.random() * 5 + 1) + 'ml',
        concentration: Math.floor(Math.random() * 100 + 20) + 'ng/ul',
        quality: Math.random() > 0.1 ? 'good' : 'degraded'
      })
    };

    try {
      const stmt = this.db.prepare(`
        INSERT INTO samples (
          lab_number, case_number, name, surname, relation,
          collection_date, workflow_status, status, sample_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        sample.lab_number,
        sample.case_number,
        sample.name,
        sample.surname,
        sample.relation,
        sample.collection_date,
        sample.workflow_status,
        sample.status,
        sample.sample_type
      );

      this.stats.samplesGenerated++;
      this.stats.currentActive++;
    } catch (error) {
      logger.error('Failed to insert sample:', error);
    }
  }

  startWorkflowProgression() {
    const progressWorkflows = () => {
      try {
        const stages = Object.keys(config.workflowProgression.stages);
        
        stages.forEach(stage => {
          if (stage === 'report_sent') return; // Final stage
          
          const stageConfig = config.workflowProgression.stages[stage];
          const nextStage = stageConfig.next;
          
          if (!nextStage) return;
          
          // Get samples ready for progression
          const stmt = this.db.prepare(`
            SELECT id, lab_number, workflow_status, 
                   EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 as hours_in_stage
            FROM samples 
            WHERE workflow_status = ? 
              AND status = 'active'
            LIMIT 10
          `);
          
          const samples = stmt.all(stage);
          
          samples.forEach(sample => {
            const requiredTime = stageConfig.duration / config.workflowProgression.simulationSpeed;
            const timeInStage = (sample.hours_in_stage || 0) * 3600; // Convert to seconds
            
            if (timeInStage >= requiredTime) {
              // Progress to next stage
              this.progressSample(sample.id, sample.lab_number, nextStage);
            }
          });
        });
      } catch (error) {
        logger.error('Workflow progression error:', error);
      }
    };

    this.intervals.progression = setInterval(progressWorkflows, config.workflowProgression.interval);
    progressWorkflows(); // Progress immediately
  }

  progressSample(sampleId, labNumber, nextStage) {
    try {
      // Simulate quality control failures
      if (config.qualityControl.enabled && Math.random() < config.qualityControl.failureRate) {
        const stmt = this.db.prepare(`
          UPDATE samples 
          SET status = 'failed', 
              updated_at = NOW(),
              notes = 'Quality control failure'
          WHERE id = ?
        `);
        stmt.run(sampleId);
        logger.warn(`⚠️ Sample ${labNumber} failed QC at ${nextStage}`);
        return;
      }

      const stmt = this.db.prepare(`
        UPDATE samples 
        SET workflow_status = ?, 
            updated_at = NOW()
        WHERE id = ?
      `);
      
      stmt.run(nextStage, sampleId);
      this.stats.samplesProgressed++;
      
      if (nextStage === 'report_sent') {
        this.stats.samplesCompleted++;
        this.stats.currentActive--;
        logger.info(`✅ Sample ${labNumber} completed workflow`);
      } else {
        logger.debug(`➡️ Sample ${labNumber} progressed to ${nextStage}`);
      }
    } catch (error) {
      logger.error(`Failed to progress sample ${labNumber}:`, error);
    }
  }

  startCleanup() {
    const cleanup = () => {
      try {
        const stmt = this.db.prepare(`
          DELETE FROM samples 
          WHERE workflow_status = 'report_sent' 
            AND updated_at < NOW() - INTERVAL '1 hour'
        `);
        
        const result = stmt.run();
        
        if (result.changes > 0) {
          this.stats.samplesArchived += result.changes;
          logger.info(`🗑️ Archived ${result.changes} completed samples`);
        }
      } catch (error) {
        logger.error('Cleanup error:', error);
      }
    };

    this.intervals.cleanup = setInterval(cleanup, 60000); // Run every minute
  }

  startMetricsUpdate() {
    const updateMetrics = () => {
      try {
        const now = Date.now();
        const timeDiff = (now - this.lastStatsUpdate) / 1000; // seconds
        
        this.stats.averageThroughput = this.stats.samplesCompleted / (timeDiff / 3600); // per hour
        
        // Get current distribution
        const stmt = this.db.prepare(`
          SELECT workflow_status, COUNT(*) as count 
          FROM samples 
          WHERE status = 'active'
          GROUP BY workflow_status
        `);
        
        const distribution = stmt.all();
        
        logger.info('📈 Workflow Metrics:', {
          generated: this.stats.samplesGenerated,
          progressed: this.stats.samplesProgressed,
          completed: this.stats.samplesCompleted,
          active: this.stats.currentActive,
          throughput: `${this.stats.averageThroughput.toFixed(1)}/hour`,
          distribution: distribution
        });
      } catch (error) {
        logger.error('Metrics update error:', error);
      }
    };

    this.intervals.metrics = setInterval(updateMetrics, config.metrics.updateInterval);
  }

  startLoadSpikes() {
    this.isInSpike = false;
    
    const triggerSpike = () => {
      this.isInSpike = true;
      logger.info('📈 Load spike started');
      
      setTimeout(() => {
        this.isInSpike = false;
        logger.info('📉 Load spike ended');
      }, config.devops.spikeDuration);
    };

    this.intervals.spikes = setInterval(triggerSpike, config.devops.spikeInterval);
  }

  getCurrentSampleCount() {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM samples 
        WHERE status = 'active'
      `);
      const result = stmt.get();
      return parseInt(result?.count) || 0;
    } catch (error) {
      logger.error('Failed to get sample count:', error);
      return 0;
    }
  }

  selectByProbability(items) {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const item of items) {
      cumulative += item.probability;
      if (rand < cumulative) {
        return item.type;
      }
    }
    
    return items[0].type;
  }

  getRelation(caseType) {
    const relations = {
      'Paternity': ['Child', 'Mother', 'Alleged Father'],
      'Maternity': ['Child', 'Father', 'Alleged Mother'],
      'Kinship': ['Person 1', 'Person 2', 'Reference'],
      'Immigration': ['Petitioner', 'Beneficiary', 'Reference'],
      'Forensic': ['Evidence', 'Reference', 'Suspect']
    };
    
    const caseRelations = relations[caseType] || relations['Paternity'];
    return caseRelations[Math.floor(Math.random() * caseRelations.length)];
  }

  getStats() {
    return this.stats;
  }
}

module.exports = EnhancedSampleCycler;