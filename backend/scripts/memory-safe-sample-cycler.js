#!/usr/bin/env node

/**
 * Memory-Safe Sample Cycler for DevOps Demo
 * Maintains a fixed pool of samples that cycle through workflow stages
 * Automatically cleans up old samples to prevent memory issues
 */

const Database = require('better-sqlite3');
const path = require('path');
const { faker } = require('@faker-js/faker');

class MemorySafeSampleCycler {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/ashley_lims.db');
    this.db = null;
    this.interval = null;
    
    // Memory safety settings
    this.MAX_SAMPLES = 100; // Maximum samples to keep in database
    this.MAX_FAMILIES = 30;  // Maximum families (30 families x 3 members = 90 samples)
    this.CLEANUP_THRESHOLD = 80; // Start cleanup when we hit 80 samples
    
    // Counters for generating new samples
    this.caseCounter = 1000;
    this.labCounter = 10000;
    
    // Track active cases for rotation
    this.activeCases = new Set();
  }

  initialize() {
    console.log('🚀 Initializing Memory-Safe Sample Cycler');
    console.log(`📊 Maximum samples: ${this.MAX_SAMPLES}`);
    console.log(`🧬 Maximum families: ${this.MAX_FAMILIES}`);
    
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    
    // Clean up any existing test data first
    this.cleanupAllTestData();
    
    // Initialize with a base set of samples
    this.initializeBaseSamples();
  }

  cleanupAllTestData() {
    console.log('🧹 Cleaning up existing test data...');
    
    // Delete all PAT-2025 samples (our test samples)
    const deleteStmt = this.db.prepare(`
      DELETE FROM samples 
      WHERE case_number LIKE 'PAT-2025-%' 
         OR case_number LIKE 'PAT-MEM-%'
    `);
    
    const result = deleteStmt.run();
    console.log(`🗑️  Deleted ${result.changes} existing test samples`);
  }

  initializeBaseSamples() {
    console.log('🔬 Creating initial sample pool...');
    
    // Create 10 initial families (30 samples)
    for (let i = 0; i < 10; i++) {
      this.createFamily();
    }
    
    // Distribute them across different workflow stages
    this.distributeAcrossWorkflow();
    
    console.log('✅ Initial sample pool created');
  }

  distributeAcrossWorkflow() {
    const stages = [
      'sample_collected',
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
    
    // Get all samples and distribute them evenly across stages
    const samples = this.db.prepare(`
      SELECT id FROM samples 
      WHERE case_number LIKE 'PAT-MEM-%'
      ORDER BY id
    `).all();
    
    const updateStmt = this.db.prepare(`
      UPDATE samples 
      SET workflow_status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    samples.forEach((sample, index) => {
      const stage = stages[index % stages.length];
      updateStmt.run(stage, sample.id);
    });
    
    console.log(`📊 Distributed ${samples.length} samples across ${stages.length} workflow stages`);
  }

  createFamily() {
    const caseNumber = `PAT-MEM-${String(this.caseCounter++).padStart(4, '0')}`;
    const familyName = faker.person.lastName();
    
    // Track this case
    this.activeCases.add(caseNumber);
    
    const samples = [
      {
        lab_number: `LAB-MEM-${String(this.labCounter++).padStart(5, '0')}`,
        case_number: caseNumber,
        name: faker.person.firstName('male'),
        surname: familyName,
        relation: 'Father',
        workflow_status: 'sample_collected',
        status: 'pending'
      },
      {
        lab_number: `LAB-MEM-${String(this.labCounter++).padStart(5, '0')}`,
        case_number: caseNumber,
        name: faker.person.firstName('female'),
        surname: familyName,
        relation: 'Mother',
        workflow_status: 'sample_collected',
        status: 'pending'
      },
      {
        lab_number: `LAB-MEM-${String(this.labCounter++).padStart(5, '0')}`,
        case_number: caseNumber,
        name: faker.person.firstName(),
        surname: familyName,
        relation: 'Child',
        workflow_status: 'sample_collected',
        status: 'pending'
      }
    ];
    
    const insertStmt = this.db.prepare(`
      INSERT INTO samples (
        lab_number, case_number, name, surname, relation,
        workflow_status, status,
        collection_date, submission_date,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?,
        date('now'), date('now'),
        datetime('now'), datetime('now')
      )
    `);
    
    const insertMany = this.db.transaction((samples) => {
      for (const sample of samples) {
        insertStmt.run(
          sample.lab_number, sample.case_number, sample.name, sample.surname, sample.relation,
          sample.workflow_status, sample.status
        );
      }
    });
    
    insertMany(samples);
    return caseNumber;
  }

  checkAndCleanup() {
    // Count current samples
    const countResult = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM samples 
      WHERE case_number LIKE 'PAT-MEM-%'
    `).get();
    
    const currentCount = countResult.count;
    
    if (currentCount >= this.CLEANUP_THRESHOLD) {
      console.log(`⚠️  Sample count (${currentCount}) exceeds threshold (${this.CLEANUP_THRESHOLD})`);
      this.performCleanup();
    }
    
    return currentCount;
  }

  performCleanup() {
    console.log('🧹 Performing memory cleanup...');
    
    // Strategy 1: Delete samples that have completed the full cycle (report_sent)
    const deleteCompleted = this.db.prepare(`
      DELETE FROM samples 
      WHERE case_number LIKE 'PAT-MEM-%' 
        AND workflow_status = 'report_sent'
        AND updated_at < datetime('now', '-2 minutes')
    `);
    
    const result1 = deleteCompleted.run();
    console.log(`  ✓ Deleted ${result1.changes} completed samples`);
    
    // Strategy 2: If still over limit, delete oldest families
    const currentCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM samples WHERE case_number LIKE 'PAT-MEM-%'
    `).get().count;
    
    if (currentCount > this.CLEANUP_THRESHOLD) {
      // Get oldest cases
      const oldestCases = this.db.prepare(`
        SELECT DISTINCT case_number 
        FROM samples 
        WHERE case_number LIKE 'PAT-MEM-%'
        ORDER BY created_at ASC
        LIMIT 5
      `).all();
      
      if (oldestCases.length > 0) {
        const casesToDelete = oldestCases.map(c => c.case_number);
        const deleteCases = this.db.prepare(`
          DELETE FROM samples 
          WHERE case_number IN (${casesToDelete.map(() => '?').join(',')})
        `);
        
        const result2 = deleteCases.run(...casesToDelete);
        console.log(`  ✓ Deleted ${result2.changes} samples from oldest families`);
        
        // Remove from active cases
        casesToDelete.forEach(c => this.activeCases.delete(c));
      }
    }
    
    // Final count
    const finalCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM samples WHERE case_number LIKE 'PAT-MEM-%'
    `).get().count;
    
    console.log(`  ✓ Cleanup complete. Current sample count: ${finalCount}`);
  }

  rotateOrCreateFamily() {
    // Check if we need to clean up first
    const currentCount = this.checkAndCleanup();
    
    // Decide whether to create new family or just rotate existing
    if (currentCount < this.MAX_SAMPLES - 10 && this.activeCases.size < this.MAX_FAMILIES) {
      // Create new family
      const caseNumber = this.createFamily();
      console.log(`✅ Created new family: ${caseNumber}`);
    } else {
      // Just report rotation
      console.log(`♻️  Rotating existing ${currentCount} samples through workflow`);
    }
    
    // Show current distribution
    this.showDistribution();
  }

  showDistribution() {
    const distribution = this.db.prepare(`
      SELECT 
        workflow_status,
        COUNT(*) as count
      FROM samples
      WHERE case_number LIKE 'PAT-MEM-%'
      GROUP BY workflow_status
      ORDER BY workflow_status
    `).all();
    
    const total = distribution.reduce((sum, d) => sum + d.count, 0);
    
    console.log(`📊 Distribution (${total} total):`, 
      distribution.map(d => `${d.workflow_status}: ${d.count}`).join(', ')
    );
    
    // Also show memory usage
    const memUsage = process.memoryUsage();
    console.log(`💾 Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  }

  start(intervalSeconds = 30) {
    console.log(`⏰ Starting memory-safe sample cycling every ${intervalSeconds} seconds`);
    console.log('📋 Features:');
    console.log('  • Maximum ' + this.MAX_SAMPLES + ' samples maintained');
    console.log('  • Automatic cleanup of old samples');
    console.log('  • Continuous workflow progression');
    console.log('  • Memory-safe operation');
    
    // Initial rotation
    this.rotateOrCreateFamily();
    
    // Set up interval
    this.interval = setInterval(() => {
      try {
        this.rotateOrCreateFamily();
      } catch (error) {
        console.error('❌ Error in rotation cycle:', error.message);
      }
    }, intervalSeconds * 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 Sample cycler stopped');
    }
    if (this.db) {
      // Final cleanup
      this.cleanupAllTestData();
      this.db.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const cycler = new MemorySafeSampleCycler();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down memory-safe cycler...');
    cycler.stop();
    process.exit(0);
  });
  
  cycler.initialize();
  
  // Start cycling every 20 seconds
  cycler.start(20);
  
  console.log('🎯 Memory-safe sample cycler running. Press Ctrl+C to stop.');
  console.log('');
}

module.exports = MemorySafeSampleCycler;