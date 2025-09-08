#!/usr/bin/env node

/**
 * Smart DNA Workflow Cycler with Simulated Extraction and qPCR
 * Simulates full LIMS workflow including extraction and qPCR stages
 * Uses time-based simulation since database doesn't support these statuses
 */

const Database = require('better-sqlite3');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

// Simulated workflow stages with timing
const SIMULATED_STAGES = [
  { name: 'sample_collected', dbStatus: 'sample_collected', duration: 3 },
  { name: 'extraction_in_progress', dbStatus: 'sample_collected', duration: 4 },
  { name: 'extraction_completed', dbStatus: 'sample_collected', duration: 3 },
  { name: 'qpcr_in_progress', dbStatus: 'pcr_ready', duration: 4 },
  { name: 'qpcr_completed', dbStatus: 'pcr_ready', duration: 3 },
  { name: 'pcr_batched', dbStatus: 'pcr_batched', duration: 3 },
  { name: 'pcr_completed', dbStatus: 'pcr_completed', duration: 4 },
  { name: 'electro_batched', dbStatus: 'electro_batched', duration: 3 },
  { name: 'electro_completed', dbStatus: 'electro_completed', duration: 4 },
  { name: 'analysis_ready', dbStatus: 'analysis_ready', duration: 3 },
  { name: 'analysis_completed', dbStatus: 'analysis_completed', duration: 4 },
  { name: 'report_ready', dbStatus: 'report_ready', duration: 3 },
  { name: 'report_sent', dbStatus: 'report_sent', duration: 3 }
];

// Track active samples with simulated stages
let activeSamples = new Map();
const MAX_ACTIVE_SAMPLES = 30;
const SAMPLE_CREATION_INTERVAL = 8000; // Create new sample every 8 seconds

// Store simulated stages in memory for dashboard
let simulatedStages = new Map();

/**
 * Initialize the cycler
 */
function initialize() {
  console.log('🧬 Smart DNA Workflow Cycler Starting...');
  console.log('📊 Simulating FULL LIMS workflow including Extraction and qPCR');
  console.log('🔬 This provides realistic workflow visualization for DevOps portfolio');
  console.log('-----------------------------------------------------------');
  
  // Clear old samples to start fresh
  try {
    db.prepare("DELETE FROM samples WHERE lab_number LIKE 'AUTO-%'").run();
    console.log('✅ Cleared old auto-generated samples');
  } catch (error) {
    console.error('Error clearing old samples:', error);
  }
  
  // Create initial samples with staggered stages
  for (let i = 0; i < 15; i++) {
    setTimeout(() => createNewSample(), i * 500);
  }
  
  // Start the workflow progression
  setInterval(progressWorkflows, 1000); // Check every second
  
  // Create new samples periodically
  setInterval(() => {
    if (activeSamples.size < MAX_ACTIVE_SAMPLES) {
      createNewSample();
    }
  }, SAMPLE_CREATION_INTERVAL);
  
  // Update simulated stages for dashboard
  setInterval(updateSimulatedStages, 2000);
  
  // Display status periodically
  setInterval(displayStatus, 15000); // Every 15 seconds
}

/**
 * Create a new sample
 */
function createNewSample() {
  const labNumber = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const caseNumber = `CASE-${faker.number.int({ min: 1000, max: 9999 })}`;
  
  const relations = ['Alleged Father', 'Child', 'Mother'];
  const relation = faker.helpers.arrayElement(relations);
  
  const sample = {
    lab_number: labNumber,
    case_number: caseNumber,
    name: faker.person.firstName(),
    surname: faker.person.lastName(),
    sample_type: relation,
    relation: relation === 'Alleged Father' ? 'Father' : relation,
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
      simulatedStage: 0,
      stageStartTime: Date.now()
    });
    
    console.log(`✨ Created: ${labNumber} - ${sample.name} ${sample.surname} (${sample.sample_type})`);
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
    const currentStage = SIMULATED_STAGES[sample.simulatedStage];
    if (!currentStage) continue;
    
    const stageDuration = currentStage.duration * 1000;
    const timeInStage = now - sample.stageStartTime;
    
    if (timeInStage >= stageDuration) {
      // Move to next stage
      if (sample.simulatedStage < SIMULATED_STAGES.length - 1) {
        const nextStageIndex = sample.simulatedStage + 1;
        const nextStage = SIMULATED_STAGES[nextStageIndex];
        
        // Update database only when db status changes
        if (nextStage.dbStatus !== currentStage.dbStatus) {
          try {
            db.prepare(`
              UPDATE samples 
              SET workflow_status = @workflow_status,
                  updated_at = @updated_at
              WHERE lab_number = @lab_number
            `).run({
              workflow_status: nextStage.dbStatus,
              updated_at: new Date().toISOString(),
              lab_number: labNumber
            });
          } catch (error) {
            console.error(`Error updating sample ${labNumber}:`, error);
          }
        }
        
        // Update local tracking
        sample.simulatedStage = nextStageIndex;
        sample.stageStartTime = now;
        sample.workflow_status = nextStage.dbStatus;
        
        // Log significant transitions
        if (nextStage.name === 'extraction_in_progress') {
          console.log(`🧪 ${labNumber}: Starting DNA extraction`);
        } else if (nextStage.name === 'qpcr_in_progress') {
          console.log(`🔬 ${labNumber}: Starting qPCR quantification`);
        } else if (nextStage.name === 'pcr_batched') {
          console.log(`⚗️ ${labNumber}: Added to PCR batch`);
        } else if (nextStage.name === 'report_sent') {
          console.log(`📊 ${labNumber}: Report completed and sent`);
        }
      } else {
        // Sample completed full workflow
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
 * Update simulated stages for dashboard consumption
 */
function updateSimulatedStages() {
  simulatedStages.clear();
  
  for (const [labNumber, sample] of activeSamples.entries()) {
    const stage = SIMULATED_STAGES[sample.simulatedStage];
    if (stage) {
      simulatedStages.set(labNumber, {
        lab_number: labNumber,
        simulated_status: stage.name,
        actual_status: sample.workflow_status,
        progress: ((sample.simulatedStage / (SIMULATED_STAGES.length - 1)) * 100).toFixed(1)
      });
    }
  }
  
  // Write to a file that the dashboard can read
  const fs = require('fs');
  const simulatedData = {
    timestamp: new Date().toISOString(),
    samples: Array.from(simulatedStages.values())
  };
  
  try {
    fs.writeFileSync(
      path.join(__dirname, '../simulated-stages.json'),
      JSON.stringify(simulatedData, null, 2)
    );
  } catch (error) {
    // Ignore file write errors
  }
}

/**
 * Display current status
 */
function displayStatus() {
  console.log('\n📊 Current Workflow Status:');
  console.log('-----------------------------------------------------------');
  
  const stageCounts = {};
  SIMULATED_STAGES.forEach(stage => stageCounts[stage.name] = 0);
  
  for (const sample of activeSamples.values()) {
    const stage = SIMULATED_STAGES[sample.simulatedStage];
    if (stage) {
      stageCounts[stage.name]++;
    }
  }
  
  console.log('Stage Distribution:');
  Object.entries(stageCounts).forEach(([stage, count]) => {
    if (count > 0) {
      const bar = '█'.repeat(Math.min(count, 20));
      console.log(`  ${stage.padEnd(25)} ${bar} ${count}`);
    }
  });
  
  console.log(`\nTotal Active Samples: ${activeSamples.size}`);
  console.log('Simulated Stages: Extraction & qPCR (visual only)');
  console.log('-----------------------------------------------------------\n');
}

/**
 * Cleanup on exit
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down Smart Workflow Cycler...');
  
  // Clean up auto-generated samples
  try {
    const result = db.prepare("DELETE FROM samples WHERE lab_number LIKE 'AUTO-%'").run();
    console.log(`✅ Cleaned up ${result.changes} auto-generated samples`);
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  // Clean up simulated stages file
  const fs = require('fs');
  try {
    fs.unlinkSync(path.join(__dirname, '../simulated-stages.json'));
  } catch (error) {
    // Ignore if file doesn't exist
  }
  
  db.close();
  process.exit(0);
});

// Start the cycler
initialize();