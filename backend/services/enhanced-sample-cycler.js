/**
 * Enhanced Sample Cycler for Continuous DNA Lab Workflow
 * Generates samples, progresses them through workflow stages, and manages lifecycle
 */

const config = require('../config/workflow-config');
const logger = require('../utils/logger'); // Fix: import logger directly, not destructured
const databaseService = require('./database');
const forensicMetrics = require('./forensicMetricsService');

class EnhancedSampleCycler {
  constructor(db = null) {
    this.db = db || databaseService;
    this.isRunning = false;
    this.intervals = {};
    this.stats = {
      samplesGenerated: 0,
      samplesProgressed: 0,
      samplesCompleted: 0,
      samplesArchived: 0,
      currentActive: 0,
      averageThroughput: 0,
      forensicSamples: 0,
      integrityVerifications: 0,
      contaminationEvents: 0
    };
    this.lastStatsUpdate = Date.now();
    this.initializeForensicTracking();
  }

  async initializeForensicTracking() {
    try {
      // Only initialize if database is connected
      if (this.db && this.db.isConnected && this.db.isConnected()) {
        await forensicMetrics.initialize();
        logger.info('Forensic tracking initialized in sample cycler');
      } else {
        logger.warn('Skipping forensic tracking - no database connection');
      }
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Failed to initialize forensic tracking', { error: error.message });
      } else {
        console.error('Failed to initialize forensic tracking:', error.message);
      }
    }
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
    const generateSamples = async () => {
      try {
        const currentCount = await this.getCurrentSampleCount();
        
        if (currentCount >= config.sampleGeneration.maxActiveSamples) {
          logger.debug(`Sample limit reached (${currentCount}/${config.sampleGeneration.maxActiveSamples})`);
          return;
        }

        const batchSize = this.isInSpike ? 
          config.sampleGeneration.batchSize * config.devops.spikeMultiplier : 
          config.sampleGeneration.batchSize;

        for (let i = 0; i < batchSize; i++) {
          await this.generateSample();
        }

        logger.info(`📊 Generated ${batchSize} new samples`);
      } catch (error) {
        logger.error('Sample generation error:', error);
      }
    };

    this.intervals.generation = setInterval(generateSamples, config.sampleGeneration.interval);
    generateSamples(); // Generate immediately
  }

  async generateSample() {
    const firstName = config.sampleNames.firstNames[Math.floor(Math.random() * config.sampleNames.firstNames.length)];
    const lastName = config.sampleNames.lastNames[Math.floor(Math.random() * config.sampleNames.lastNames.length)];
    const sampleType = this.selectByProbability(config.sampleTypes);
    const caseType = this.selectByProbability(config.caseTypes);

    // Use FOR- prefix for forensic cases
    const casePrefix = caseType === 'Forensic' ? 'FOR' : 'CASE';

    const sample = {
      lab_number: `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      case_number: `${casePrefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      name: firstName,
      surname: lastName,
      relation: this.getRelation(caseType),
      sample_type: sampleType,
      collection_date: new Date().toISOString().split('T')[0],
      workflow_status: 'sample_collected',
      status: 'active',
      created_at: new Date().toISOString(),
      metadata: JSON.stringify({
        barcode: `BC${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
        volume: Math.floor(Math.random() * 5 + 1) + 'ml',
        concentration: Math.floor(Math.random() * 100 + 20) + 'ng/ul',
        quality: Math.random() > 0.1 ? 'good' : 'degraded',
        case_type: caseType,
        forensic_priority: caseType === 'Forensic' ? 'high' : 'normal'
      })
    };

    try {
      const result = await this.db.run(`
        INSERT INTO samples (
          lab_number, case_number, name, surname, relation,
          collection_date, workflow_status, status, sample_type, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sample.lab_number,
        sample.case_number,
        sample.name,
        sample.surname,
        sample.relation,
        sample.collection_date,
        sample.workflow_status,
        sample.status,
        sample.sample_type,
        sample.metadata
      ]);

      this.stats.samplesGenerated++;
      this.stats.currentActive++;

      // Track forensic samples and establish chain of custody
      if (caseType === 'Forensic') {
        this.stats.forensicSamples++;

        // Record initial chain of custody
        forensicMetrics.recordCustodyEvent(
          result.lastID || sample.lab_number,
          sample.lab_number,
          'EVIDENCE_COLLECTED',
          {
            location: 'Crime Scene / Collection Point',
            performed_by: 'Evidence Technician',
            temperature: 4,
            notes: `${sampleType} sample collected, sealed and labeled`
          }
        );

        // Calculate initial integrity hash
        forensicMetrics.calculateEvidenceIntegrity(result.lastID || sample.lab_number, sample);

        logger.info(`🔬 Forensic sample ${sample.lab_number} created with chain of custody`);
      }
    } catch (error) {
      logger.error('Failed to insert sample:', error);
    }
  }

  startWorkflowProgression() {
    const progressWorkflows = async () => {
      try {
        const stages = Object.keys(config.workflowProgression.stages);

        for (const stage of stages) {
          if (stage === 'report_sent') continue; // Final stage

          const stageConfig = config.workflowProgression.stages[stage];
          const nextStage = stageConfig.next;

          if (!nextStage) continue;

          // Get samples ready for progression
          const samples = await this.db.all(`
            SELECT id, lab_number, workflow_status,
                   EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - updated_at)) / 86400 as days_in_stage
            FROM samples
            WHERE workflow_status = ?
              AND status = 'active'
            LIMIT 10
          `, [stage]);

          if (Array.isArray(samples)) {
            samples.forEach(sample => {
              const requiredTime = stageConfig.duration / config.workflowProgression.simulationSpeed;
              const timeInStage = (sample.days_in_stage || 0) * 86400; // Convert days to seconds

              if (timeInStage >= requiredTime) {
                // Progress to next stage
                this.progressSample(sample.id, sample.lab_number, nextStage);
              }
            });
          }
        }
      } catch (error) {
        logger.error('Workflow progression error:', error);
      }
    };

    this.intervals.progression = setInterval(progressWorkflows, config.workflowProgression.interval);
    progressWorkflows(); // Progress immediately
  }

  async progressSample(sampleId, labNumber, nextStage) {
    try {
      // Check if this is a forensic sample
      const sample = await this.db.get(`
        SELECT metadata, case_number FROM samples WHERE id = ?
      `, [sampleId]);

      // Check if metadata is a string (JSON) or object
      let isForensic = sample?.case_number?.startsWith('FOR-');
      if (sample?.metadata) {
        if (typeof sample.metadata === 'string') {
          isForensic = isForensic || sample.metadata.includes('"case_type":"Forensic"');
        } else if (typeof sample.metadata === 'object') {
          isForensic = isForensic || sample.metadata.case_type === 'Forensic';
        }
      }

      // Simulate quality control failures
      if (config.qualityControl.enabled && Math.random() < config.qualityControl.failureRate) {
        await this.db.run(`
          UPDATE samples
          SET status = 'failed',
              updated_at = CURRENT_TIMESTAMP,
              notes = 'Quality control failure'
          WHERE id = ?
        `, [sampleId]);

        // Record contamination event for forensic samples
        if (isForensic) {
          this.stats.contaminationEvents++;
          forensicMetrics.recordContaminationEvent(
            sampleId,
            labNumber,
            'QC_FAILURE',
            'medium',
            {
              detected_at: nextStage,
              source: 'Processing error or contamination',
              remediation: 'Sample marked for reprocessing'
            }
          );
        }

        logger.warn(`⚠️ Sample ${labNumber} failed QC at ${nextStage}`);
        return;
      }

      await this.db.run(`
        UPDATE samples
        SET workflow_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [nextStage, sampleId]);
      this.stats.samplesProgressed++;

      // Record chain of custody for forensic samples
      if (isForensic) {
        const stageActions = {
          'dna_extraction': 'DNA_EXTRACTION',
          'pcr_ready': 'PCR_PREPARATION',
          'pcr_batched': 'PCR_BATCHED',
          'pcr_completed': 'PCR_AMPLIFICATION_COMPLETE',
          'electro_ready': 'ELECTROPHORESIS_PREPARATION',
          'electro_completed': 'ELECTROPHORESIS_COMPLETE',
          'analysis_ready': 'STR_ANALYSIS_INITIATED',
          'analysis_completed': 'STR_ANALYSIS_COMPLETE',
          'report_ready': 'REPORT_GENERATION',
          'report_sent': 'REPORT_FINALIZED'
        };

        if (stageActions[nextStage]) {
          forensicMetrics.recordCustodyEvent(
            sampleId,
            labNumber,
            stageActions[nextStage],
            {
              location: `Lab Station ${nextStage}`,
              performed_by: 'Automated System',
              temperature: nextStage.includes('pcr') ? 95 : 20,
              notes: `Sample progressed to ${nextStage}`
            }
          );
        }

        // Verify integrity at key stages
        if (['pcr_completed', 'analysis_completed', 'report_sent'].includes(nextStage)) {
          this.stats.integrityVerifications++;
          const verification = forensicMetrics.verifyIntegrity(sampleId, {
            lab_number: labNumber,
            workflow_status: nextStage,
            timestamp: new Date().toISOString()
          });

          if (!verification.verified) {
            logger.error(`❌ Integrity verification failed for ${labNumber} at ${nextStage}`);
          }
        }
      }

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
        const result = this.db.run(`
          DELETE FROM samples
          WHERE workflow_status = 'report_sent'
            AND updated_at < (CURRENT_TIMESTAMP - INTERVAL '1 hour')
        `, []);
        
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
    const updateMetrics = async () => {
      try {
        const now = Date.now();
        const timeDiff = (now - this.lastStatsUpdate) / 1000; // seconds
        
        this.stats.averageThroughput = this.stats.samplesCompleted / (timeDiff / 3600); // per hour
        
        // Get current distribution
        const distribution = await this.db.all(`
          SELECT workflow_status, COUNT(*) as count 
          FROM samples 
          WHERE status = 'active'
          GROUP BY workflow_status
        `);
        
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

  async getCurrentSampleCount() {
    try {
      const result = await this.db.get(`
        SELECT COUNT(*) as count 
        FROM samples 
        WHERE status = 'active'
      `);
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
    return {
      ...this.stats,
      forensicMetrics: {
        forensicSamples: this.stats.forensicSamples,
        integrityVerifications: this.stats.integrityVerifications,
        contaminationEvents: this.stats.contaminationEvents,
        forensicPercentage: ((this.stats.forensicSamples / Math.max(1, this.stats.samplesGenerated)) * 100).toFixed(1)
      }
    };
  }
}

module.exports = EnhancedSampleCycler;