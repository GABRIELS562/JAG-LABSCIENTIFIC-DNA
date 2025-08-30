/**
 * Paternity Testing Workflow Cycler
 * Continuously cycles 50 samples through the paternity testing workflow
 * Each batch of 10 samples progresses through different stages
 */

const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../utils/logger');

class PaternityWorkflowCycler {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/ashley_lims.db');
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
      // Family 1-5 (First batch)
      { caseNumber: 'PAT-2025-001', familyName: 'Johnson' },
      { caseNumber: 'PAT-2025-002', familyName: 'Smith' },
      { caseNumber: 'PAT-2025-003', familyName: 'Williams' },
      { caseNumber: 'PAT-2025-004', familyName: 'Brown' },
      { caseNumber: 'PAT-2025-005', familyName: 'Davis' },
      // Family 6-10 (Second batch)
      { caseNumber: 'PAT-2025-006', familyName: 'Miller' },
      { caseNumber: 'PAT-2025-007', familyName: 'Wilson' },
      { caseNumber: 'PAT-2025-008', familyName: 'Moore' },
      { caseNumber: 'PAT-2025-009', familyName: 'Taylor' },
      { caseNumber: 'PAT-2025-010', familyName: 'Anderson' },
      // Family 11-15 (Third batch)
      { caseNumber: 'PAT-2025-011', familyName: 'Thomas' },
      { caseNumber: 'PAT-2025-012', familyName: 'Jackson' },
      { caseNumber: 'PAT-2025-013', familyName: 'White' },
      { caseNumber: 'PAT-2025-014', familyName: 'Harris' },
      { caseNumber: 'PAT-2025-015', familyName: 'Martin' },
      // Family 16-17 (Fourth/Fifth batch - partial)
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
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      
      // Initialize workflow stage configurations table
      await this.initializeWorkflowTables();
      
      // Load stage durations from database
      await this.loadStageDurations();
      
      // Check if we already have samples
      const sampleCount = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM samples 
        WHERE case_number LIKE 'PAT-2025-%'
      `).get();
      
      if (sampleCount.count < 50) {
        // Clear existing demo samples
        await this.clearDemoSamples();
        
        // Create 50 samples (17 families x 3 members each ≈ 50 samples)
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
      // Create workflow stage configs table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS workflow_stage_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stage_name VARCHAR(50) NOT NULL UNIQUE,
          duration_minutes INTEGER NOT NULL DEFAULT 3,
          is_active BOOLEAN NOT NULL DEFAULT true,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create sample workflow timing table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sample_workflow_timing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sample_id INTEGER NOT NULL,
          stage_name VARCHAR(50) NOT NULL,
          entry_time DATETIME NOT NULL,
          exit_time DATETIME,
          duration_seconds INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
        )
      `);
      
      // Insert default stage configurations if not exists
      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO workflow_stage_configs (stage_name, duration_minutes, is_active, description) 
        VALUES (?, ?, ?, ?)
      `);
      
      const stageConfigs = [
        ['sample_collected', 3, true, 'Sample collection and labeling'],
        ['dna_extraction', 5, true, 'DNA extraction from biological samples'],
        ['pcr_amplification', 4, true, 'PCR amplification of DNA regions'],
        ['electrophoresis', 3, true, 'Capillary electrophoresis separation'],
        ['osiris_analysis', 6, true, 'OSIRIS software analysis and interpretation'],
        ['report_generation', 2, true, 'Final report generation and review']
      ];
      
      for (const config of stageConfigs) {
        insertStmt.run(...config);
      }
      
      logger.info('Workflow tables initialized');
    } catch (error) {
      logger.error('Failed to initialize workflow tables', { error: error.message });
    }
  }

  async loadStageDurations() {
    try {
      const stages = this.db.prepare(`
        SELECT stage_name, duration_minutes, is_active 
        FROM workflow_stage_configs 
        WHERE is_active = true
      `).all();
      
      // Convert minutes to seconds and store
      for (const stage of stages) {
        this.stageDurations[stage.stage_name] = stage.duration_minutes * 60;
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
      // Use default durations
      for (const stage of this.workflowStages) {
        this.stageDurations[stage] = this.defaultStageDurations[stage] * 60;
      }
    }
  }

  async clearDemoSamples() {
    try {
      // Clear only demo samples (keep real samples)
      this.db.prepare(`
        DELETE FROM samples 
        WHERE case_number LIKE 'PAT-2025-%' 
        AND is_real_data = 0
      `).run();
      
      // Clear workflow timing records for demo samples
      this.db.prepare(`
        DELETE FROM sample_workflow_timing 
        WHERE sample_id IN (
          SELECT id FROM samples 
          WHERE case_number LIKE 'PAT-2025-%' 
          AND is_real_data = 0
        )
      `).run();
      
      logger.info('Cleared existing demo samples and timing records');
    } catch (error) {
      logger.warn('Could not clear demo samples', { error: error.message });
    }
  }

  async createPaternityTestSamples() {
    const insertStmt = this.db.prepare(`
      INSERT INTO samples (
        case_number, lab_number, name, surname, relation, 
        sample_type, workflow_status, status, is_real_data,
        collection_date, gender, age, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    let sampleCount = 0;
    const year = new Date().getFullYear();
    
    for (const family of this.sampleFamilies) {
      // Create trio for each family (Child, Mother, Alleged Father)
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
        if (sampleCount > 50) break; // Limit to 50 samples
        
        const labNumber = `${year}_${String(sampleCount).padStart(3, '0')}`;
        
        insertStmt.run(
          family.caseNumber,
          labNumber,
          member.name,
          family.familyName,
          member.relation,
          'buccal_swab',
          'sample_collected', // Initial status
          'active',
          0, // is_real_data = false (demo data)
          new Date().toISOString(),
          member.gender,
          member.age,
          'Demo sample for paternity testing workflow'
        );
      }
      
      if (sampleCount >= 50) break;
    }
    
    logger.info(`Created ${sampleCount} paternity test samples`);
  }

  async assignSamplesToBatches() {
    // Get all demo samples
    const samples = this.db.prepare(`
      SELECT id, lab_number, case_number, relation 
      FROM samples 
      WHERE is_real_data = 0 
      AND case_number LIKE 'PAT-2025-%'
      ORDER BY case_number, 
        CASE relation 
          WHEN 'Child' THEN 1 
          WHEN 'Mother' THEN 2 
          WHEN 'Alleged Father' THEN 3 
        END
      LIMIT 50
    `).all();
    
    // Distribute samples across batches (10 samples per batch)
    const batchSize = 10;
    for (let i = 0; i < this.batches.length; i++) {
      const batchSamples = samples.slice(i * batchSize, (i + 1) * batchSize);
      
      if (batchSamples.length > 0) {
        // Update samples with batch assignment and workflow status
        const updateStmt = this.db.prepare(`
          UPDATE samples 
          SET workflow_status = ?, 
              lab_batch_number = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `);
        
        for (const sample of batchSamples) {
          updateStmt.run(
            this.batches[i].stage,
            this.batches[i].id,
            sample.id
          );
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
    
    // Process batches every 30 seconds (checking for samples ready to progress)
    this.cycleInterval = setInterval(() => {
      this.processBatches();
    }, 30000);
    
    // Do initial processing
    this.processBatches();
  }

  async initializeSampleTiming() {
    try {
      // Find samples without timing records and create initial entries
      const samplesWithoutTiming = this.db.prepare(`
        SELECT s.id, s.workflow_status
        FROM samples s
        LEFT JOIN sample_workflow_timing swt ON s.id = swt.sample_id AND swt.exit_time IS NULL
        WHERE s.case_number LIKE 'PAT-2025-%'
        AND s.is_real_data = 0
        AND swt.id IS NULL
      `).all();
      
      const insertTimingStmt = this.db.prepare(`
        INSERT INTO sample_workflow_timing (sample_id, stage_name, entry_time)
        VALUES (?, ?, datetime('now'))
      `);
      
      for (const sample of samplesWithoutTiming) {
        insertTimingStmt.run(sample.id, sample.workflow_status);
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
          // Get current stage index
          const currentStageIndex = this.workflowStages.indexOf(batch.stage);
          
          // Calculate next stage (cycle back to start after report generation)
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
            
            // Log progress
            logger.info(`Batch ${batch.id} progressed`, {
              from: this.workflowStages[currentStageIndex],
              to: nextStage,
              samplesProgressed: readySamples.length,
              cycleComplete: nextStageIndex === 0
            });
            
            // If cycle complete (back to sample_collected), log completion
            if (nextStageIndex === 0) {
              logger.info(`✅ Batch ${batch.id} completed full cycle, restarting workflow`);
              this.recordCycleCompletion(batch.id);
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
      this.updateBatchNames();
      
    } catch (error) {
      logger.error('Error processing batches', { error: error.message });
    }
  }

  async getSamplesReadyToProgress(batch) {
    try {
      const stageDurationSeconds = this.stageDurations[batch.stage] || 180; // Default 3 minutes
      
      // Get samples that have been in current stage long enough
      const samples = this.db.prepare(`
        SELECT 
          s.id,
          s.lab_number,
          s.workflow_status as current_stage,
          swt.entry_time,
          (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_in_stage
        FROM samples s
        LEFT JOIN (
          SELECT sample_id, stage_name, entry_time
          FROM sample_workflow_timing swt1
          WHERE swt1.exit_time IS NULL
          AND swt1.id = (
            SELECT MAX(id) FROM sample_workflow_timing swt2
            WHERE swt2.sample_id = swt1.sample_id
          )
        ) swt ON s.id = swt.sample_id
        WHERE s.lab_batch_number = ?
        AND s.is_real_data = 0
        AND s.workflow_status = ?
        AND (
          swt.entry_time IS NULL OR
          (julianday('now') - julianday(swt.entry_time)) * 86400 >= ?
        )
      `).all(batch.id, batch.stage, stageDurationSeconds);
      
      return samples;
    } catch (error) {
      logger.error('Error getting ready samples', { error: error.message });
      return [];
    }
  }

  async getSamplesInBatch(batchId, stage) {
    try {
      return this.db.prepare(`
        SELECT id, lab_number 
        FROM samples 
        WHERE lab_batch_number = ? 
        AND workflow_status = ?
        AND is_real_data = 0
      `).all(batchId, stage);
    } catch (error) {
      logger.error('Error getting samples in batch', { error: error.message });
      return [];
    }
  }

  async progressSampleToNextStage(sampleId, currentStage, nextStage) {
    try {
      const transaction = this.db.transaction(() => {
        // Update sample workflow status
        this.db.prepare(`
          UPDATE samples 
          SET workflow_status = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(nextStage, sampleId);
        
        // Close current stage timing record
        this.db.prepare(`
          UPDATE sample_workflow_timing 
          SET exit_time = datetime('now'),
              duration_seconds = (julianday('now') - julianday(entry_time)) * 86400
          WHERE sample_id = ? 
          AND stage_name = ?
          AND exit_time IS NULL
        `).run(sampleId, currentStage);
        
        // Create new stage timing record
        this.db.prepare(`
          INSERT INTO sample_workflow_timing (sample_id, stage_name, entry_time)
          VALUES (?, ?, datetime('now'))
        `).run(sampleId, nextStage);
      });
      
      transaction();
    } catch (error) {
      logger.error('Error progressing sample', { sampleId, currentStage, nextStage, error: error.message });
    }
  }

  updateBatchNames() {
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
      const oldId = this.batches[i].id;
      const newId = `${stagePrefix[this.batches[i].stage]}-BATCH-${String(i + 1).padStart(3, '0')}`;
      
      // Update batch ID in database
      this.db.prepare(`
        UPDATE samples 
        SET lab_batch_number = ?
        WHERE lab_batch_number = ?
        AND is_real_data = 0
      `).run(newId, oldId);
      
      this.batches[i].id = newId;
    }
  }

  recordCycleCompletion(batchId) {
    try {
      // Record cycle completion for tracking
      this.db.prepare(`
        INSERT INTO workflow_cycles (
          batch_id, completed_at, cycle_time_seconds, notes
        ) VALUES (?, datetime('now'), ?, ?)
      `).run(
        batchId,
        Object.values(this.stageDurations).reduce((a, b) => a + b, 0),
        'Paternity testing workflow cycle completed with configurable timing'
      );
    } catch (error) {
      // Table might not exist, create it
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS workflow_cycles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_id TEXT,
          completed_at DATETIME,
          cycle_time_seconds INTEGER,
          notes TEXT
        )
      `);
    }
  }

  // Method to update stage durations
  async updateStageDuration(stageName, durationMinutes) {
    try {
      this.db.prepare(`
        UPDATE workflow_stage_configs 
        SET duration_minutes = ?, updated_at = datetime('now')
        WHERE stage_name = ?
      `).run(durationMinutes, stageName);
      
      // Reload durations
      await this.loadStageDurations();
      
      logger.info(`Updated ${stageName} duration to ${durationMinutes} minutes`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to update stage duration', { stageName, durationMinutes, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Method to get current stage configurations
  getStageDurationsConfig() {
    try {
      return this.db.prepare(`
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
      `).all();
    } catch (error) {
      logger.error('Failed to get stage durations config', { error: error.message });
      return [];
    }
  }

  // Method to get samples currently in a specific stage with timing info
  getSamplesInStageWithTiming(stageName) {
    try {
      const stageDurationSeconds = this.stageDurations[stageName] || 180;
      
      return this.db.prepare(`
        SELECT 
          s.id,
          s.lab_number,
          s.name,
          s.surname,
          s.case_number,
          s.workflow_status,
          swt.entry_time,
          (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_in_stage,
          ? - (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_remaining,
          CASE 
            WHEN (julianday('now') - julianday(swt.entry_time)) * 86400 >= ? THEN 1
            ELSE 0
          END as ready_to_progress
        FROM samples s
        LEFT JOIN (
          SELECT sample_id, stage_name, entry_time
          FROM sample_workflow_timing swt1
          WHERE swt1.exit_time IS NULL
          AND swt1.id = (
            SELECT MAX(id) FROM sample_workflow_timing swt2
            WHERE swt2.sample_id = swt1.sample_id
          )
        ) swt ON s.id = swt.sample_id
        WHERE s.workflow_status = ?
        AND s.is_real_data = 0
        AND s.case_number LIKE 'PAT-2025-%'
        ORDER BY swt.entry_time ASC
      `).all(stageDurationSeconds, stageDurationSeconds, stageName);
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
      const samples = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM samples 
        WHERE lab_batch_number = ?
        AND is_real_data = 0
      `).get(batch.id);
      
      const readySamples = await this.getSamplesReadyToProgress(batch);
      
      status.batches.push({
        id: batch.id,
        stage: batch.stage,
        sampleCount: samples.count,
        readyToProgress: readySamples.length,
        stageDurationMinutes: Math.round(this.stageDurations[batch.stage] / 60),
        stageProgress: this.getStageProgress(batch.stage)
      });
    }
    
    // Get cycle count
    try {
      const cycles = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM workflow_cycles
      `).get();
      status.cyclesCompleted = cycles.count;
    } catch (error) {
      status.cyclesCompleted = 0;
    }
    
    return status;
  }

  getStageProgress(stage) {
    // Return a percentage of how far through the stage we are
    // This is simulated for demo purposes
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