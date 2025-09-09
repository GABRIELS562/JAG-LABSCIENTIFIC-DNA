#!/usr/bin/env node

const db = require('./services/database');
const path = require('path');

// Test the workflow configuration system
const dbPath = path.join(__dirname, 'database/ashley_lims.db');

try {
  // Using unified database service instead of direct Database instantiation
  
  console.log('🔍 Testing Workflow Configuration System');
  console.log('=====================================');
  
  // Test 1: Check if tables exist
  console.log('\n1. Checking if workflow tables exist...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%workflow%' OR name LIKE '%stage%')").all();
  console.log('   Found tables:', tables.map(t => t.name).join(', '));
  
  // Test 2: Check stage configurations
  console.log('\n2. Current stage configurations:');
  const stages = db.prepare("SELECT * FROM workflow_stage_configs ORDER BY stage_name").all();
  stages.forEach(stage => {
    console.log(`   ${stage.stage_name}: ${stage.duration_minutes} minutes (${stage.is_active ? 'active' : 'inactive'})`);
  });
  
  // Test 3: Update a stage duration
  console.log('\n3. Testing stage duration update...');
  const oldDuration = stages[0].duration_minutes;
  const newDuration = oldDuration + 1;
  
  const result = db.prepare("UPDATE workflow_stage_configs SET duration_minutes = ? WHERE stage_name = ?")
    .run(newDuration, stages[0].stage_name);
  
  console.log(`   Updated ${stages[0].stage_name} from ${oldDuration} to ${newDuration} minutes`);
  console.log(`   Rows affected: ${result.changes}`);
  
  // Test 4: Check samples with timing info
  console.log('\n4. Checking sample workflow timing...');
  const sampleCount = db.prepare("SELECT COUNT(*) as count FROM sample_workflow_timing").get();
  console.log(`   Total timing records: ${sampleCount.count}`);
  
  // Test 5: Get samples in a specific stage
  console.log('\n5. Samples currently in PCR amplification stage:');
  const pcrSamples = db.prepare(`
    SELECT s.lab_number, s.workflow_status, s.case_number
    FROM samples s
    WHERE s.workflow_status = 'pcr_amplification'
    AND s.is_real_data = 0
    LIMIT 5
  `).all();
  
  pcrSamples.forEach(sample => {
    console.log(`   ${sample.lab_number} (${sample.case_number}) - ${sample.workflow_status}`);
  });
  
  console.log('\n✅ Workflow configuration system is working!');
  console.log('\nAPI Endpoints available:');
  console.log('   GET  /api/workflow/stage-durations');
  console.log('   PUT  /api/workflow/stage-durations/:stage');
  console.log('   GET  /api/workflow/samples-in-stage/:stage');
  console.log('   GET  /api/workflow/timing-stats');
  
  // Restore original value
  db.prepare("UPDATE workflow_stage_configs SET duration_minutes = ? WHERE stage_name = ?")
    .run(oldDuration, stages[0].stage_name);
  
  db.close();
  
} catch (error) {
  console.error('❌ Error testing workflow system:', error.message);
  process.exit(1);
}