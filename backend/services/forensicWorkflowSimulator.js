const db = require('./database');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../utils/logger');
const { trackSampleProcessed, trackBatchCreated, updateQueueSize } = require('../middleware/metrics');

/**
 * Forensic DNA Laboratory Workflow Simulator
 * Simulates realistic DNA testing workflow for paternity cases
 * Following forensic lab SOPs and ISO 17025 standards
 */
class ForensicWorkflowSimulator {
  constructor() {
    this.db = null;
    this.isRunning = false;
    this.simulationSpeed = 1; // 1 = real-time, 10 = 10x speed
    
    // Workflow stages with realistic timing (in minutes)
    this.workflowStages = {
      sample_collected: { next: 'dna_extraction', duration: 5 },
      dna_extraction: { next: 'pcr_ready', duration: 45 },
      pcr_ready: { next: 'pcr_batched', duration: 10 },
      pcr_batched: { next: 'pcr_completed', duration: 180 }, // 3 hours
      pcr_completed: { next: 'electro_ready', duration: 15 },
      electro_ready: { next: 'electro_batched', duration: 10 },
      electro_batched: { next: 'electro_completed', duration: 60 },
      electro_completed: { next: 'analysis_ready', duration: 5 },
      analysis_ready: { next: 'analysis_completed', duration: 20 },
      analysis_completed: { next: 'report_ready', duration: 10 },
      report_ready: { next: 'report_sent', duration: 5 }
    };

    // Paternity case templates
    this.caseTemplates = [
      { type: 'standard_trio', participants: ['child', 'mother', 'alleged_father'] },
      { type: 'motherless', participants: ['child', 'alleged_father'] },
      { type: 'complex_family', participants: ['child', 'mother', 'alleged_father', 'sibling'] },
      { type: 'prenatal', participants: ['fetus', 'mother', 'alleged_father'] },
      { type: 'immigration', participants: ['child', 'mother', 'father'] }
    ];

    // Sample quality scenarios (affects workflow)
    this.qualityScenarios = [
      { type: 'optimal', successRate: 0.98, description: 'High quality DNA, clear profiles' },
      { type: 'degraded', successRate: 0.85, description: 'Partially degraded DNA, may need re-extraction' },
      { type: 'low_quantity', successRate: 0.75, description: 'Low DNA concentration, requires optimization' },
      { type: 'contaminated', successRate: 0.60, description: 'Contamination detected, requires re-sampling' },
      { type: 'inhibited', successRate: 0.70, description: 'PCR inhibition present, requires purification' }
    ];

    // STR loci for paternity testing (PowerPlex ESX 17)
    this.strLoci = [
      'D3S1358', 'TH01', 'D21S11', 'D18S51', 'D10S1248',
      'D1S1656', 'D2S1338', 'D16S539', 'D22S1045', 'vWA',
      'D8S1179', 'FGA', 'D2S441', 'D12S391', 'D19S433',
      'SE33', 'Amelogenin'
    ];

    // Realistic lab equipment and capacity
    this.labCapacity = {
      extractionStations: 4,
      thermalCyclers: 2,
      geneticAnalyzers: 1,
      maxBatchSize: 96,
      dailySampleTarget: 48
    };

    this.activeProcesses = new Map();
    this.sampleQueue = [];
    this.metrics = {
      totalSamplesProcessed: 0,
      successfulCompletions: 0,
      failures: 0,
      reruns: 0,
      averageTAT: 0, // Turnaround time in hours
      bottlenecks: {}
    };
  }

  async initialize() {
    try {
      this.db = db;
      this.db.pragma('synchronous = NORMAL');
      
      // Create necessary tables if they don't exist
      await this.ensureTablesExist();
      
      logger.info('Forensic Workflow Simulator initialized', {
        stages: Object.keys(this.workflowStages).length,
        caseTypes: this.caseTemplates.length,
        labCapacity: this.labCapacity
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize forensic workflow simulator', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async ensureTablesExist() {
    // Ensure workflow_history table exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER,
        case_id INTEGER,
        stage TEXT,
        status TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        duration_minutes INTEGER,
        quality_score REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure genetic_profiles table exists for STR results
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS genetic_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER,
        case_id INTEGER,
        locus TEXT,
        allele1 TEXT,
        allele2 TEXT,
        quality_score REAL,
        peak_height1 INTEGER,
        peak_height2 INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sample_id) REFERENCES samples(id)
      )
    `);

    // Ensure quality_metrics table exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quality_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER,
        metric_type TEXT,
        value REAL,
        unit TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sample_id) REFERENCES samples(id)
      )
    `);
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Forensic workflow simulator already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Forensic DNA Workflow Simulation');

    // Start continuous case generation
    this.startCaseGeneration();
    
    // Start sample processing engine
    this.startProcessingEngine();
    
    // Start quality control checks
    this.startQualityControl();
    
    // Start metrics collection
    this.startMetricsCollection();

    return { 
      success: true, 
      message: 'Forensic workflow simulation started',
      currentQueue: this.sampleQueue.length 
    };
  }

  async startCaseGeneration() {
    // Generate new paternity cases at realistic intervals
    const generateCase = async () => {
      if (!this.isRunning) return;

      try {
        const caseTemplate = this.caseTemplates[Math.floor(Math.random() * this.caseTemplates.length)];
        const qualityScenario = this.qualityScenarios[Math.floor(Math.random() * this.qualityScenarios.length)];
        
        // Create case with realistic metadata
        const caseNumber = `PAT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
        
        const caseData = {
          case_number: caseNumber,
          case_type: caseTemplate.type,
          priority: Math.random() > 0.9 ? 'urgent' : 'standard',
          quality_scenario: qualityScenario.type,
          participants: caseTemplate.participants,
          created_at: new Date().toISOString()
        };

        // Create case in database
        const caseInsert = this.db.prepare(`
          INSERT INTO test_cases (
            case_number, ref_kit_number, submission_date, client_type, 
            test_purpose, sample_type, status, comments
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const caseResult = caseInsert.run(
          caseNumber,
          `KIT-${Date.now()}`,
          new Date().toISOString().split('T')[0],
          caseData.priority === 'urgent' ? 'urgent' : 'paternity',
          'legal_proceedings',
          'buccal_swab',
          'pending',
          JSON.stringify({ quality: qualityScenario, template: caseTemplate })
        );

        const caseId = caseResult.lastInsertRowid;

        // Create samples for each participant
        for (const participant of caseTemplate.participants) {
          const labNumber = `L${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          
          const sampleInsert = this.db.prepare(`
            INSERT INTO samples (
              case_id, lab_number, name, surname, relation, 
              collection_date, submission_date, workflow_status, 
              status, case_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const sampleResult = sampleInsert.run(
            caseId,
            labNumber,
            `Test_${participant}`,
            caseNumber.replace('PAT-', ''),
            participant,
            new Date().toISOString().split('T')[0],
            new Date().toISOString().split('T')[0],
            'sample_collected',
            'pending',
            caseNumber
          );

          // Add to processing queue
          this.sampleQueue.push({
            id: sampleResult.lastInsertRowid,
            lab_number: labNumber,
            case_id: caseId,
            case_number: caseNumber,
            relation: participant,
            quality: qualityScenario,
            stage: 'sample_collected',
            created_at: Date.now()
          });

          // Track metrics
          trackSampleProcessed('created', 'sample_collected');
          updateQueueSize('sample_collection', this.sampleQueue.length);
        }

        logger.info(`Generated forensic case: ${caseNumber}`, {
          type: caseTemplate.type,
          participants: caseTemplate.participants.length,
          quality: qualityScenario.type,
          queueSize: this.sampleQueue.length
        });

      } catch (error) {
        logger.error('Failed to generate case', { error: error.message });
      }

      // Schedule next case generation (random interval between 5-15 minutes at 1x speed)
      const nextInterval = (Math.random() * 10 + 5) * 60000 / this.simulationSpeed;
      setTimeout(generateCase, nextInterval);
    };

    // Start generating cases
    generateCase();
  }

  async startProcessingEngine() {
    const processSamples = async () => {
      if (!this.isRunning) return;

      try {
        // Process samples through workflow stages
        const samplesToProcess = this.sampleQueue.filter(s => !this.activeProcesses.has(s.id));
        
        for (const sample of samplesToProcess) {
          // Check lab capacity constraints
          const currentStage = sample.stage;
          if (!this.hasCapacity(currentStage)) continue;

          // Start processing this sample
          this.activeProcesses.set(sample.id, {
            startTime: Date.now(),
            stage: currentStage
          });

          // Simulate stage processing
          this.processStage(sample);
        }

        // Update queue metrics
        const queuesByStage = {};
        this.sampleQueue.forEach(s => {
          queuesByStage[s.stage] = (queuesByStage[s.stage] || 0) + 1;
        });

        Object.entries(queuesByStage).forEach(([stage, count]) => {
          updateQueueSize(stage, count);
        });

      } catch (error) {
        logger.error('Sample processing engine error', { error: error.message });
      }

      // Run processing engine every 30 seconds
      setTimeout(processSamples, 30000 / this.simulationSpeed);
    };

    processSamples();
  }

  async processStage(sample) {
    const currentStage = this.workflowStages[sample.stage];
    if (!currentStage) return;

    // Calculate processing time with variability
    const baseTime = currentStage.duration;
    const variance = baseTime * 0.2; // 20% variance
    const actualTime = (baseTime + (Math.random() - 0.5) * variance) * 60000 / this.simulationSpeed;

    // Simulate quality events
    const qualityCheck = Math.random();
    const failureRate = 1 - sample.quality.successRate;
    
    setTimeout(async () => {
      try {
        let nextStage = currentStage.next;
        let status = 'completed';
        let notes = '';

        // Check for quality failures
        if (qualityCheck < failureRate) {
          status = 'failed';
          notes = `Quality issue: ${sample.quality.description}`;
          
          // Determine if rerun is needed
          if (Math.random() > 0.5) {
            nextStage = sample.stage; // Retry same stage
            this.metrics.reruns++;
            notes += ' - Rerun scheduled';
          }
        }

        // Update sample in database
        const updateStmt = this.db.prepare(`
          UPDATE samples 
          SET workflow_status = ?, 
              updated_at = CURRENT_TIMESTAMP,
              notes = COALESCE(notes || ' | ', '') || ?
          WHERE id = ?
        `);
        
        updateStmt.run(nextStage, notes, sample.id);

        // Record workflow history
        const historyStmt = this.db.prepare(`
          INSERT INTO workflow_history (
            sample_id, case_id, stage, status, 
            started_at, completed_at, duration_minutes, 
            quality_score, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        historyStmt.run(
          sample.id,
          sample.case_id,
          sample.stage,
          status,
          new Date(Date.now() - actualTime).toISOString(),
          new Date().toISOString(),
          Math.round(actualTime / 60000),
          sample.quality.successRate,
          notes
        );

        // Generate STR profiles for completed analysis
        if (nextStage === 'analysis_completed' && status === 'completed') {
          await this.generateSTRProfile(sample);
        }

        // Update sample in queue
        const queueIndex = this.sampleQueue.findIndex(s => s.id === sample.id);
        if (queueIndex !== -1) {
          if (nextStage === 'report_sent') {
            // Remove completed samples
            this.sampleQueue.splice(queueIndex, 1);
            this.metrics.successfulCompletions++;
          } else {
            // Move to next stage
            this.sampleQueue[queueIndex].stage = nextStage;
          }
        }

        // Remove from active processes
        this.activeProcesses.delete(sample.id);

        // Track metrics
        trackSampleProcessed(status, nextStage);
        
        logger.debug(`Sample ${sample.lab_number} processed`, {
          from: sample.stage,
          to: nextStage,
          status,
          duration: Math.round(actualTime / 60000) + ' min'
        });

      } catch (error) {
        logger.error('Failed to process stage', { 
          sample: sample.lab_number, 
          stage: sample.stage, 
          error: error.message 
        });
        this.activeProcesses.delete(sample.id);
      }
    }, actualTime);
  }

  async generateSTRProfile(sample) {
    try {
      // Generate realistic STR profile data
      for (const locus of this.strLoci) {
        // Generate alleles based on population frequencies
        const allele1 = this.generateAllele(locus);
        const allele2 = this.generateAllele(locus);
        
        const profileStmt = this.db.prepare(`
          INSERT INTO genetic_profiles (
            sample_id, case_id, locus, allele1, allele2, 
            quality_score, peak_height1, peak_height2
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        profileStmt.run(
          sample.id,
          sample.case_id,
          locus,
          allele1,
          allele2,
          sample.quality.successRate,
          Math.floor(Math.random() * 5000) + 500, // Peak heights 500-5500 RFU
          Math.floor(Math.random() * 5000) + 500
        );
      }

      logger.info(`STR profile generated for sample ${sample.lab_number}`, {
        loci: this.strLoci.length,
        quality: sample.quality.type
      });

    } catch (error) {
      logger.error('Failed to generate STR profile', { 
        sample: sample.lab_number, 
        error: error.message 
      });
    }
  }

  generateAllele(locus) {
    // Realistic allele ranges for common STR loci
    const alleleRanges = {
      'D3S1358': { min: 12, max: 20 },
      'TH01': { min: 5, max: 11 },
      'D21S11': { min: 24, max: 38 },
      'D18S51': { min: 7, max: 27 },
      'vWA': { min: 11, max: 24 },
      'FGA': { min: 17, max: 30 },
      'Amelogenin': { values: ['X', 'Y'] }
    };

    const range = alleleRanges[locus] || { min: 8, max: 20 };
    
    if (range.values) {
      return range.values[Math.floor(Math.random() * range.values.length)];
    }
    
    // Generate with decimal points for some loci
    const baseAllele = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    const hasDecimal = Math.random() > 0.7;
    return hasDecimal ? `${baseAllele}.${Math.floor(Math.random() * 3) + 1}` : String(baseAllele);
  }

  hasCapacity(stage) {
    // Check if lab has capacity for this stage
    const stageCapacity = {
      'dna_extraction': this.labCapacity.extractionStations,
      'pcr_batched': this.labCapacity.thermalCyclers,
      'electro_batched': this.labCapacity.geneticAnalyzers
    };

    const limit = stageCapacity[stage] || 10;
    const currentlyProcessing = Array.from(this.activeProcesses.values())
      .filter(p => p.stage === stage).length;

    return currentlyProcessing < limit;
  }

  async startQualityControl() {
    const runQC = async () => {
      if (!this.isRunning) return;

      try {
        // Simulate quality control checks
        const activeSamples = await this.db.prepare(`
          SELECT id, lab_number, workflow_status 
          FROM samples 
          WHERE status = 'pending' 
          AND workflow_status NOT IN ('report_sent', 'cancelled')
        `).all();

        for (const sample of activeSamples) {
          // Random quality metrics
          const metrics = [
            { type: 'dna_concentration', value: Math.random() * 100 + 10, unit: 'ng/µl' },
            { type: 'purity_260_280', value: 1.7 + Math.random() * 0.3, unit: 'ratio' },
            { type: 'purity_260_230', value: 1.8 + Math.random() * 0.4, unit: 'ratio' },
            { type: 'degradation_index', value: Math.random() * 0.5, unit: 'DI' }
          ];

          for (const metric of metrics) {
            const qcStmt = this.db.prepare(`
              INSERT INTO quality_metrics (sample_id, metric_type, value, unit)
              VALUES (?, ?, ?, ?)
            `);
            
            qcStmt.run(sample.id, metric.type, metric.value, metric.unit);
          }
        }

      } catch (error) {
        logger.error('Quality control check failed', { error: error.message });
      }

      // Run QC every 5 minutes
      setTimeout(runQC, 300000 / this.simulationSpeed);
    };

    runQC();
  }

  async startMetricsCollection() {
    const collectMetrics = async () => {
      if (!this.isRunning) return;

      try {
        // Calculate TAT metrics
        const completedSamples = await this.db.prepare(`
          SELECT 
            s.id,
            s.lab_number,
            MIN(wh.started_at) as start_time,
            MAX(wh.completed_at) as end_time
          FROM samples s
          JOIN workflow_history wh ON s.id = wh.sample_id
          WHERE s.workflow_status = 'report_sent'
          AND wh.created_at > datetime('now', '-24 hours')
          GROUP BY s.id
        `).all();

        if (completedSamples.length > 0) {
          const tats = completedSamples.map(s => {
            const start = new Date(s.start_time);
            const end = new Date(s.end_time);
            return (end - start) / (1000 * 60 * 60); // Hours
          });

          this.metrics.averageTAT = tats.reduce((a, b) => a + b, 0) / tats.length;
        }

        // Identify bottlenecks
        const stageQueues = await this.db.prepare(`
          SELECT workflow_status, COUNT(*) as count
          FROM samples
          WHERE status = 'pending'
          GROUP BY workflow_status
        `).all();

        this.metrics.bottlenecks = {};
        stageQueues.forEach(sq => {
          if (sq.count > 10) {
            this.metrics.bottlenecks[sq.workflow_status] = sq.count;
          }
        });

        logger.info('Forensic workflow metrics', {
          totalProcessed: this.metrics.totalSamplesProcessed,
          successRate: this.metrics.successfulCompletions / (this.metrics.totalSamplesProcessed || 1),
          avgTAT: this.metrics.averageTAT.toFixed(2) + ' hours',
          bottlenecks: this.metrics.bottlenecks,
          queueDepth: this.sampleQueue.length
        });

      } catch (error) {
        logger.error('Metrics collection failed', { error: error.message });
      }

      // Collect metrics every 2 minutes
      setTimeout(collectMetrics, 120000 / this.simulationSpeed);
    };

    collectMetrics();
  }

  stop() {
    this.isRunning = false;
    logger.info('Forensic workflow simulator stopped', {
      totalProcessed: this.metrics.totalSamplesProcessed,
      successRate: (this.metrics.successfulCompletions / this.metrics.totalSamplesProcessed * 100).toFixed(2) + '%'
    });
  }

  setSpeed(speed) {
    this.simulationSpeed = Math.max(1, Math.min(100, speed));
    logger.info(`Simulation speed set to ${this.simulationSpeed}x`);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      simulationSpeed: this.simulationSpeed,
      queueDepth: this.sampleQueue.length,
      activeProcesses: this.activeProcesses.size,
      metrics: this.metrics,
      labCapacity: this.labCapacity,
      queueByStage: this.sampleQueue.reduce((acc, s) => {
        acc[s.stage] = (acc[s.stage] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

module.exports = ForensicWorkflowSimulator;