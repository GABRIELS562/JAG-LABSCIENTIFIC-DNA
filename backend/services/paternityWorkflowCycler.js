/**
 * Paternity Testing Workflow Cycler
 * Continuously cycles 50 samples through the paternity testing workflow
 * Each batch of 10 samples progresses through different stages
 * PostgreSQL compatible version
 */

const db = require('./database');
const { logger } = require('../utils/logger');

class PaternityWorkflowCycler {
  constructor() {
    this.db = null;
    this.isRunning = false;
    this.cycleInterval = null;

    // Paternity testing workflow stages
    this.workflowStages = [
      'sample_collected',
      'dna_extraction',
      'pcr_amplification',
      'electrophoresis',
      'osiris_analysis',
      'report_generation'
    ];

    // Stage durations will be loaded from database (in minutes, converted to seconds)
    this.stageDurations = {};
    this.defaultStageDurations = {
      'sample_collected': 3,
      'dna_extraction': 5,
      'pcr_amplification': 4,
      'electrophoresis': 3,
      'osiris_analysis': 6,
      'report_generation': 2
    };

    // Sample families for paternity testing
    this.sampleFamilies = [
      { caseNumber: 'PAT-2025-001', familyName: 'Johnson' },
      { caseNumber: 'PAT-2025-002', familyName: 'Smith' },
      { caseNumber: 'PAT-2025-003', familyName: 'Williams' },
      { caseNumber: 'PAT-2025-004', familyName: 'Brown' },
      { caseNumber: 'PAT-2025-005', familyName: 'Davis' },
      { caseNumber: 'PAT-2025-006', familyName: 'Miller' },
      { caseNumber: 'PAT-2025-007', familyName: 'Wilson' },
      { caseNumber: 'PAT-2025-008', familyName: 'Moore' },
      { caseNumber: 'PAT-2025-009', familyName: 'Taylor' },
      { caseNumber: 'PAT-2025-010', familyName: 'Anderson' },
      { caseNumber: 'PAT-2025-011', familyName: 'Thomas' },
      { caseNumber: 'PAT-2025-012', familyName: 'Jackson' },
      { caseNumber: 'PAT-2025-013', familyName: 'White' },
      { caseNumber: 'PAT-2025-014', familyName: 'Harris' },
      { caseNumber: 'PAT-2025-015', familyName: 'Martin' },
      { caseNumber: 'PAT-2025-016', familyName: 'Garcia' },
      { caseNumber: 'PAT-2025-017', familyName: 'Rodriguez' }
    ];

    this.batches = [
      { id: 'PCR-BATCH-001', stage: 'pcr_amplification', samples: [] },
      { id: 'ELEC-BATCH-001', stage: 'electrophoresis', samples: [] },
      { id: 'OSIRIS-BATCH-001', stage: 'osiris_analysis', samples: [] },
      { id: 'DNA-BATCH-001', stage: 'dna_extraction', samples: [] },
      { id: 'REPORT-BATCH-001', stage: 'report_generation', samples: [] }
    ];
  }

  async initialize() {
    try {
      this.db = db;

      // Initialize workflow stage configurations table
      await this.initializeWorkflowTables();

      // Load stage durations from database
      await this.loadStageDurations();

      // Check if we already have samples
      const sampleCount = await this.db.get(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE case_number LIKE 'PAT-2025-%'
      `);

      if (!sampleCount || parseInt(sampleCount.count) < 50) {
        // Clear existing demo samples
        await this.clearDemoSamples();

        // Create 50 samples (17 families x 3 members each)
        await this.createPaternityTestSamples();

        // Assign samples to initial batches
        await this.assignSamplesToBatches();
      } else {
        logger.info('Using existing paternity samples', { count: sampleCount.count });
      }

      logger.info('Paternity Workflow Cycler initialized', {
        totalSamples: 50,
        batches: 5,
        families: 17,
        stageDurations: this.stageDurations
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize paternity workflow cycler', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async initializeWorkflowTables() {
    try {
      // Create workflow stage configs table (PostgreSQL syntax)
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS workflow_stage_configs (
          id SERIAL PRIMARY KEY,
          stage_name VARCHAR(50) NOT NULL UNIQUE,
          duration_minutes INTEGER NOT NULL DEFAULT 3,
          is_active BOOLEAN NOT NULL DEFAULT true,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create sample workflow timing table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS sample_workflow_timing (
          id SERIAL PRIMARY KEY,
          sample_id INTEGER NOT NULL,
          stage_name VARCHAR(50) NOT NULL,
          entry_time TIMESTAMP NOT NULL,
          exit_time TIMESTAMP,
          duration_seconds INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert default stage configurations if not exists
      const stageConfigs = [
        ['sample_collected', 3, true, 'Sample collection and labeling'],
        ['dna_extraction', 5, true, 'DNA extraction from biological samples'],
        ['pcr_amplification', 4, true, 'PCR amplification of DNA regions'],
        ['electrophoresis', 3, true, 'Capillary electrophoresis separation'],
        ['osiris_analysis', 6, true, 'OSIRIS software analysis and interpretation'],
        ['report_generation', 2, true, 'Final report generation and review']
      ];

      for (const config of stageConfigs) {
        await this.db.run(`
          INSERT INTO workflow_stage_configs (stage_name, duration_minutes, is_active, description)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (stage_name) DO NOTHING
        `, config);
      }

      logger.info('Workflow tables initialized');
    } catch (error) {
      logger.error('Failed to initialize workflow tables', { error: error.message });
    }
  }

  async loadStageDurations() {
    try {
      const stages = await this.db.all(`
        SELECT stage_name, duration_minutes, is_active
        FROM workflow_stage_configs
        WHERE is_active = true
      `) || [];

      // Convert minutes to seconds and store
      for (const stage of stages) {
        this.stageDurations[stage.stage_name] = parseInt(stage.duration_minutes) * 60;
      }

      // Ensure all workflow stages have durations
      for (const stage of this.workflowStages) {
        if (!this.stageDurations[stage]) {
          this.stageDurations[stage] = this.defaultStageDurations[stage] * 60;
        }
      }

      logger.info('Stage durations loaded', { durations: this.stageDurations });
    } catch (error) {
      logger.warn('Failed to load stage durations, using defaults', { error: error.message });
      for (const stage of this.workflowStages) {
        this.stageDurations[stage] = this.defaultStageDurations[stage] * 60;
      }
    }
  }

  async clearDemoSamples() {
    try {
      // Clear workflow timing records for demo samples
      await this.db.run(`
        DELETE FROM sample_workflow_timing
        WHERE sample_id IN (
          SELECT id FROM samples
          WHERE case_number LIKE 'PAT-2025-%'
        )
      `);

      // Clear only demo samples
      await this.db.run(`
        DELETE FROM samples
        WHERE case_number LIKE 'PAT-2025-%'
      `);

      logger.info('Cleared existing demo samples and timing records');
    } catch (error) {
      logger.warn('Could not clear demo samples', { error: error.message });
    }
  }

  async createPaternityTestSamples() {
    let sampleCount = 0;
    const year = new Date().getFullYear();

    for (const family of this.sampleFamilies) {
      const familyMembers = [
        {
          relation: 'Child',
          name: `Child-${family.familyName}`,
          gender: Math.random() > 0.5 ? 'M' : 'F',
          age: Math.floor(Math.random() * 17) + 1
        },
        {
          relation: 'Mother',
          name: `Mother-${family.familyName}`,
          gender: 'F',
          age: Math.floor(Math.random() * 20) + 25
        },
        {
          relation: 'Alleged Father',
          name: `Father-${family.familyName}`,
          gender: 'M',
          age: Math.floor(Math.random() * 20) + 28
        }
      ];

      for (const member of familyMembers) {
        sampleCount++;
        if (sampleCount > 50) break;

        const labNumber = `${year}_${String(sampleCount).padStart(3, '0')}`;

        await this.db.run(`
          INSERT INTO samples (
            case_number, lab_number, name, surname, relation,
            sample_type, workflow_status, status,
            collection_date, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
          family.caseNumber,
          labNumber,
          member.name,
          family.familyName,
          member.relation,
          'buccal_swab',
          'sample_collected',
          'active',
          new Date().toISOString().split('T')[0],
          'Demo sample for paternity testing workflow'
        ]);
      }

      if (sampleCount >= 50) break;
    }

    logger.info(`Created ${sampleCount} paternity test samples`);
  }

  async assignSamplesToBatches() {
    // Get all demo samples
    const samples = await this.db.all(`
      SELECT id, lab_number, case_number, relation
      FROM samples
      WHERE case_number LIKE 'PAT-2025-%'
      ORDER BY case_number,
        CASE relation
          WHEN 'Child' THEN 1
          WHEN 'Mother' THEN 2
          WHEN 'Alleged Father' THEN 3
        END
      LIMIT 50
    `) || [];

    // Distribute samples across batches (10 samples per batch)
    const batchSize = 10;
    for (let i = 0; i < this.batches.length; i++) {
      const batchSamples = samples.slice(i * batchSize, (i + 1) * batchSize);

      if (batchSamples.length > 0) {
        for (const sample of batchSamples) {
          await this.db.run(`
            UPDATE samples
            SET workflow_status = $1,
                updated_at = NOW()
            WHERE id = $2
          `, [this.batches[i].stage, sample.id]);

          this.batches[i].samples.push(sample);
        }

        logger.info(`Assigned ${batchSamples.length} samples to batch ${this.batches[i].id}`);
      }
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Paternity workflow cycler already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting paternity workflow cycler with configurable durations');

    // Initialize timing records for existing samples
    await this.initializeSampleTiming();

    // Process batches every 30 seconds
    this.cycleInterval = setInterval(() => {
      this.processBatches().catch(err => {
        logger.error('Error in processBatches interval', { error: err.message });
      });
    }, 30000);

    // Do initial processing
    this.processBatches().catch(err => {
      logger.error('Error in initial processBatches', { error: err.message });
    });
  }

  async initializeSampleTiming() {
    try {
      // Find samples without timing records and create initial entries
      const samplesWithoutTiming = await this.db.all(`
        SELECT s.id, s.workflow_status
        FROM samples s
        LEFT JOIN sample_workflow_timing swt ON s.id = swt.sample_id AND swt.exit_time IS NULL
        WHERE s.case_number LIKE 'PAT-2025-%'
        AND swt.id IS NULL
      `) || [];

      for (const sample of samplesWithoutTiming) {
        await this.db.run(`
          INSERT INTO sample_workflow_timing (sample_id, stage_name, entry_time)
          VALUES ($1, $2, NOW())
        `, [sample.id, sample.workflow_status]);
      }

      if (samplesWithoutTiming.length > 0) {
        logger.info(`Initialized timing for ${samplesWithoutTiming.length} samples`);
      }
    } catch (error) {
      logger.warn('Failed to initialize sample timing', { error: error.message });
    }
  }

  async processBatches() {
    try {
      for (const batch of this.batches) {
        // Get samples in current batch that are ready to progress
        const readySamples = await this.getSamplesReadyToProgress(batch);

        if (readySamples.length > 0) {
          const currentStageIndex = this.workflowStages.indexOf(batch.stage);
          const nextStageIndex = (currentStageIndex + 1) % this.workflowStages.length;
          const nextStage = this.workflowStages[nextStageIndex];

          // Update ready samples to next stage
          for (const sample of readySamples) {
            await this.progressSampleToNextStage(sample.id, sample.current_stage, nextStage);
          }

          // Update batch stage if all samples have progressed
          const remainingSamples = await this.getSamplesInBatch(batch.id, batch.stage);
          if (remainingSamples.length === 0) {
            batch.stage = nextStage;

            logger.info(`Batch ${batch.id} progressed`, {
              from: this.workflowStages[currentStageIndex],
              to: nextStage,
              samplesProgressed: readySamples.length,
              cycleComplete: nextStageIndex === 0
            });

            if (nextStageIndex === 0) {
              logger.info(`Batch ${batch.id} completed full cycle, restarting workflow`);
              await this.recordCycleCompletion(batch.id);
            }
          } else {
            logger.debug(`Batch ${batch.id} partially progressed`, {
              readySamples: readySamples.length,
              remainingSamples: remainingSamples.length,
              stage: batch.stage
            });
          }
        }
      }

      // Update batch names based on current stage
      await this.updateBatchNames();

    } catch (error) {
      logger.error('Error processing batches', { error: error.message });
    }
  }

  async getSamplesReadyToProgress(batch) {
    try {
      const stageDurationSeconds = this.stageDurations[batch.stage] || 180;

      // Get samples that have been in current stage long enough (PostgreSQL syntax)
      const samples = await this.db.all(`
        SELECT
          s.id,
          s.lab_number,
          s.workflow_status as current_stage,
          swt.entry_time,
          EXTRACT(EPOCH FROM (NOW() - swt.entry_time)) as seconds_in_stage
        FROM samples s
        LEFT JOIN (
          SELECT DISTINCT ON (sample_id) sample_id, stage_name, entry_time
          FROM sample_workflow_timing
          WHERE exit_time IS NULL
          ORDER BY sample_id, id DESC
        ) swt ON s.id = swt.sample_id
        WHERE s.workflow_status = $1
        AND s.case_number LIKE 'PAT-2025-%'
        AND (
          swt.entry_time IS NULL OR
          EXTRACT(EPOCH FROM (NOW() - swt.entry_time)) >= $2
        )
      `, [batch.stage, stageDurationSeconds]) || [];

      return samples;
    } catch (error) {
      logger.error('Error getting ready samples', { error: error.message });
      return [];
    }
  }

  async getSamplesInBatch(batchId, stage) {
    try {
      return await this.db.all(`
        SELECT id, lab_number
        FROM samples
        WHERE workflow_status = $1
        AND case_number LIKE 'PAT-2025-%'
      `, [stage]) || [];
    } catch (error) {
      logger.error('Error getting samples in batch', { error: error.message });
      return [];
    }
  }

  async progressSampleToNextStage(sampleId, currentStage, nextStage) {
    try {
      // Update sample workflow status
      await this.db.run(`
        UPDATE samples
        SET workflow_status = $1, updated_at = NOW()
        WHERE id = $2
      `, [nextStage, sampleId]);

      // Close current stage timing record
      await this.db.run(`
        UPDATE sample_workflow_timing
        SET exit_time = NOW(),
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - entry_time))
        WHERE sample_id = $1
        AND stage_name = $2
        AND exit_time IS NULL
      `, [sampleId, currentStage]);

      // Create new stage timing record
      await this.db.run(`
        INSERT INTO sample_workflow_timing (sample_id, stage_name, entry_time)
        VALUES ($1, $2, NOW())
      `, [sampleId, nextStage]);

    } catch (error) {
      logger.error('Error progressing sample', { sampleId, currentStage, nextStage, error: error.message });
    }
  }

  async updateBatchNames() {
    // Update batch IDs to reflect current stage
    const stagePrefix = {
      'sample_collected': 'COLLECT',
      'dna_extraction': 'DNA',
      'pcr_amplification': 'PCR',
      'electrophoresis': 'ELEC',
      'osiris_analysis': 'OSIRIS',
      'report_generation': 'REPORT'
    };

    for (let i = 0; i < this.batches.length; i++) {
      const newId = `${stagePrefix[this.batches[i].stage]}-BATCH-${String(i + 1).padStart(3, '0')}`;
      this.batches[i].id = newId;
    }
  }

  async recordCycleCompletion(batchId) {
    try {
      // Create table if it doesn't exist
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS workflow_cycles (
          id SERIAL PRIMARY KEY,
          batch_id TEXT,
          completed_at TIMESTAMP,
          cycle_time_seconds INTEGER,
          notes TEXT
        )
      `);

      // Record cycle completion for tracking
      await this.db.run(`
        INSERT INTO workflow_cycles (batch_id, completed_at, cycle_time_seconds, notes)
        VALUES ($1, NOW(), $2, $3)
      `, [
        batchId,
        Object.values(this.stageDurations).reduce((a, b) => a + b, 0),
        'Paternity testing workflow cycle completed with configurable timing'
      ]);
    } catch (error) {
      logger.debug('Could not record cycle completion', { error: error.message });
    }
  }

  async updateStageDuration(stageName, durationMinutes) {
    try {
      await this.db.run(`
        UPDATE workflow_stage_configs
        SET duration_minutes = $1, updated_at = NOW()
        WHERE stage_name = $2
      `, [durationMinutes, stageName]);

      await this.loadStageDurations();

      logger.info(`Updated ${stageName} duration to ${durationMinutes} minutes`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to update stage duration', { stageName, durationMinutes, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async getStageDurationsConfig() {
    try {
      return await this.db.all(`
        SELECT stage_name, duration_minutes, is_active, description
        FROM workflow_stage_configs
        ORDER BY
          CASE stage_name
            WHEN 'sample_collected' THEN 1
            WHEN 'dna_extraction' THEN 2
            WHEN 'pcr_amplification' THEN 3
            WHEN 'electrophoresis' THEN 4
            WHEN 'osiris_analysis' THEN 5
            WHEN 'report_generation' THEN 6
            ELSE 7
          END
      `) || [];
    } catch (error) {
      logger.error('Failed to get stage durations config', { error: error.message });
      return [];
    }
  }

  async getSamplesInStageWithTiming(stageName) {
    try {
      const stageDurationSeconds = this.stageDurations[stageName] || 180;

      return await this.db.all(`
        SELECT
          s.id,
          s.lab_number,
          s.name,
          s.surname,
          s.case_number,
          s.workflow_status,
          swt.entry_time,
          EXTRACT(EPOCH FROM (NOW() - swt.entry_time)) as seconds_in_stage,
          $1 - EXTRACT(EPOCH FROM (NOW() - swt.entry_time)) as seconds_remaining,
          CASE
            WHEN EXTRACT(EPOCH FROM (NOW() - swt.entry_time)) >= $1 THEN 1
            ELSE 0
          END as ready_to_progress
        FROM samples s
        LEFT JOIN (
          SELECT DISTINCT ON (sample_id) sample_id, stage_name, entry_time
          FROM sample_workflow_timing
          WHERE exit_time IS NULL
          ORDER BY sample_id, id DESC
        ) swt ON s.id = swt.sample_id
        WHERE s.workflow_status = $2
        AND s.case_number LIKE 'PAT-2025-%'
        ORDER BY swt.entry_time ASC
      `, [stageDurationSeconds, stageName]) || [];
    } catch (error) {
      logger.error('Failed to get samples in stage with timing', { stageName, error: error.message });
      return [];
    }
  }

  async getStatus() {
    const status = {
      isRunning: this.isRunning,
      batches: [],
      totalSamples: 50,
      cyclesCompleted: 0,
      stageDurations: this.stageDurations
    };

    // Get current status of each batch
    for (const batch of this.batches) {
      const samples = await this.db.get(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE workflow_status = $1
        AND case_number LIKE 'PAT-2025-%'
      `, [batch.stage]);

      const readySamples = await this.getSamplesReadyToProgress(batch);

      status.batches.push({
        id: batch.id,
        stage: batch.stage,
        sampleCount: samples ? parseInt(samples.count) : 0,
        readyToProgress: readySamples.length,
        stageDurationMinutes: Math.round(this.stageDurations[batch.stage] / 60),
        stageProgress: this.getStageProgress(batch.stage)
      });
    }

    // Get cycle count
    try {
      const cycles = await this.db.get(`
        SELECT COUNT(*) as count
        FROM workflow_cycles
      `);
      status.cyclesCompleted = cycles ? parseInt(cycles.count) : 0;
    } catch (error) {
      status.cyclesCompleted = 0;
    }

    return status;
  }

  getStageProgress(stage) {
    return Math.floor(Math.random() * 100);
  }

  stop() {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
    this.isRunning = false;
    logger.info('Paternity workflow cycler stopped');
  }
}

module.exports = PaternityWorkflowCycler;
