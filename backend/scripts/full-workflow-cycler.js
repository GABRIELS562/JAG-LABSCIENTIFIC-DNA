#!/usr/bin/env node

/**
 * Full DNA Workflow Cycler for DevOps Portfolio
 * Cycles samples through ALL stages including extraction and qPCR
 * Demonstrates complete LIMS workflow automation
 */

const Database = require('better-sqlite3');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

// Complete workflow stages in order - using only database-allowed values
const WORKFLOW_STAGES = [
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

// Stage durations in seconds (faster for demo)
const STAGE_DURATIONS = {
  'sample_collected': 3,
  'pcr_ready': 3,
  'pcr_batched': 3,
  'pcr_completed': 4,
  'electro_ready': 3,
  'electro_batched': 3,
  'electro_completed': 4,
  'analysis_ready': 3,
  'analysis_completed': 4,
  'report_ready': 3,
  'report_sent': 3
};

// Track active samples
let activeSamples = new Map();
const MAX_ACTIVE_SAMPLES = 50;
const SAMPLE_CREATION_INTERVAL = 5000; // Create new sample every 5 seconds

/**
 * Initialize the cycler
 */
function initialize() {
  console.log('🧬 Full DNA Workflow Cycler Starting...');
  console.log('📊 This demonstrates complete LIMS workflow for DevOps portfolio');
  console.log('🔄 Samples will cycle through ALL stages including extraction and qPCR');
  console.log('-----------------------------------------------------------');
  
  // Clear old samples to start fresh
  try {
    db.prepare("DELETE FROM samples WHERE lab_number LIKE 'AUTO-%'").run();
    console.log('✅ Cleared old auto-generated samples');
  } catch (error) {
    console.error('Error clearing old samples:', error);
  }
  
  // Start with some initial samples
  for (let i = 0; i < 10; i++) {
    createNewSample();
  }
  
  // Start the workflow progression
  setInterval(progressWorkflows, 1000); // Check every second
  
  // Create new samples periodically
  setInterval(() => {
    if (activeSamples.size < MAX_ACTIVE_SAMPLES) {
      createNewSample();
    }
  }, SAMPLE_CREATION_INTERVAL);
  
  // Display status periodically
  setInterval(displayStatus, 10000); // Every 10 seconds
}

/**
 * Create a new sample
 */
function createNewSample() {
  const labNumber = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const caseNumber = `CASE-${faker.number.int({ min: 1000, max: 9999 })}`;
  
  const sample = {
    lab_number: labNumber,
    case_number: caseNumber,
    name: faker.person.firstName(),
    surname: faker.person.lastName(),
    sample_type: faker.helpers.arrayElement(['Alleged Father', 'Child', 'Mother']),
    relation: faker.helpers.arrayElement(['Father', 'Mother', 'Child']),
    collection_date: new Date().toISOString().split('T')[0],
    workflow_status: 'sample_collected',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    const insert = db.prepare(`
      INSERT INTO samples (
        lab_number, case_number, name, surname, sample_type, relation,
        collection_date, workflow_status, created_at, updated_at
      ) VALUES (
        @lab_number, @case_number, @name, @surname, @sample_type, @relation,
        @collection_date, @workflow_status, @created_at, @updated_at
      )
    `);
    
    const result = insert.run(sample);
    
    activeSamples.set(labNumber, {
      id: result.lastInsertRowid,
      ...sample,
      stageStartTime: Date.now()
    });
    
    console.log(`✨ Created new sample: ${labNumber} - ${sample.name} ${sample.surname} (${sample.sample_type})`);
  } catch (error) {
    console.error('Error creating sample:', error);
  }
}

/**
 * Progress all active samples through workflow
 */
function progressWorkflows() {
  const now = Date.now();
  
  for (const [labNumber, sample] of activeSamples.entries()) {
    const currentStageIndex = WORKFLOW_STAGES.indexOf(sample.workflow_status);
    if (currentStageIndex === -1) continue;
    
    const stageDuration = STAGE_DURATIONS[sample.workflow_status] * 1000;
    const timeInStage = now - sample.stageStartTime;
    
    if (timeInStage >= stageDuration) {
      // Move to next stage
      if (currentStageIndex < WORKFLOW_STAGES.length - 1) {
        const nextStage = WORKFLOW_STAGES[currentStageIndex + 1];
        
        // Update database
        try {
          const updates = {
            workflow_status: nextStage,
            updated_at: new Date().toISOString()
          };
          
          const updateQuery = `
            UPDATE samples 
            SET workflow_status = @workflow_status,
                updated_at = @updated_at
            WHERE lab_number = @lab_number
          `;
          
          db.prepare(updateQuery).run({
            workflow_status: nextStage,
            updated_at: updates.updated_at,
            lab_number: labNumber
          });
          
          // Update local tracking
          sample.workflow_status = nextStage;
          sample.stageStartTime = now;
          
          console.log(`📈 ${labNumber}: ${WORKFLOW_STAGES[currentStageIndex]} → ${nextStage}`);
        } catch (error) {
          console.error(`Error updating sample ${labNumber}:`, error);
        }
      } else {
        // Sample completed full workflow - remove and create a new one
        console.log(`🎉 ${labNumber} completed full workflow!`);
        activeSamples.delete(labNumber);
        
        // Clean up completed sample after a delay
        setTimeout(() => {
          try {
            db.prepare('DELETE FROM samples WHERE lab_number = ?').run(labNumber);
          } catch (error) {
            console.error('Error deleting completed sample:', error);
          }
        }, 30000); // Keep completed samples for 30 seconds
      }
    }
  }
}

/**
 * Display current status
 */
function displayStatus() {
  console.log('\n📊 Current Workflow Status:');
  console.log('-----------------------------------------------------------');
  
  const stageCounts = {};
  WORKFLOW_STAGES.forEach(stage => stageCounts[stage] = 0);
  
  for (const sample of activeSamples.values()) {
    stageCounts[sample.workflow_status]++;
  }
  
  console.log('Stage Distribution:');
  Object.entries(stageCounts).forEach(([stage, count]) => {
    if (count > 0) {
      const bar = '█'.repeat(Math.min(count, 20));
      console.log(`  ${stage.padEnd(25)} ${bar} ${count}`);
    }
  });
  
  console.log(`\nTotal Active Samples: ${activeSamples.size}`);
  console.log('-----------------------------------------------------------\n');
}

/**
 * Cleanup on exit
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down Full Workflow Cycler...');
  
  // Clean up auto-generated samples
  try {
    const result = db.prepare("DELETE FROM samples WHERE lab_number LIKE 'AUTO-%'").run();
    console.log(`✅ Cleaned up ${result.changes} auto-generated samples`);
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  db.close();
  process.exit(0);
});

// Start the cycler
initialize();