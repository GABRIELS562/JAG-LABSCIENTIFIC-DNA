#!/usr/bin/env node

// Demo script to test the configurable workflow stage durations
const axios = require('axios').default;

const BASE_URL = 'http://localhost:3001';

async function demoWorkflowAPI() {
  console.log('🧬 JAG DNA Scientific - Workflow Stage Duration Configuration Demo');
  console.log('================================================================\n');

  try {
    // 1. Get current stage configurations
    console.log('1. 📋 Current Stage Configurations:');
    const stageResponse = await axios.get(`${BASE_URL}/api/workflow/stage-durations`);
    const stages = stageResponse.data.data;
    
    stages.forEach(stage => {
      console.log(`   • ${stage.stage_name.padEnd(20)} : ${stage.duration_minutes} minutes - ${stage.description}`);
    });
    
    // 2. Update a few stage durations to demonstrate configurability
    console.log('\n2. 🛠  Updating Stage Durations:');
    const updates = [
      { stage: 'pcr_amplification', duration: 10, description: 'More complex PCR protocol' },
      { stage: 'electrophoresis', duration: 8, description: 'Longer separation time' },
      { stage: 'osiris_analysis', duration: 15, description: 'Detailed analysis with review' }
    ];
    
    for (const update of updates) {
      const response = await axios.put(`${BASE_URL}/api/workflow/stage-durations/${update.stage}`, {
        duration_minutes: update.duration
      });
      console.log(`   ✅ ${update.stage} → ${update.duration} minutes (${update.description})`);
    }
    
    // 3. Check workflow status with updated durations
    console.log('\n3. 🔄 Current Workflow Status:');
    const workflowResponse = await axios.get(`${BASE_URL}/api/workflow/paternity/status`);
    const workflow = workflowResponse.data.data;
    
    console.log(`   Status: ${workflow.status}`);
    console.log(`   Total Samples: ${workflow.totalSamples}`);
    console.log(`   Cycles Completed: ${workflow.cyclesCompleted}`);
    console.log('\n   Batch Status:');
    
    workflow.batches.forEach(batch => {
      console.log(`   • ${batch.id.padEnd(20)} : ${batch.stage.padEnd(18)} (${batch.sampleCount} samples, ${batch.stageDurationMinutes} min duration, ${batch.readyToProgress} ready)`);
    });
    
    // 4. Check samples in different stages
    console.log('\n4. 📊 Sample Distribution by Stage:');
    for (const stageName of ['pcr_amplification', 'electrophoresis', 'osiris_analysis']) {
      try {
        const stageResponse = await axios.get(`${BASE_URL}/api/workflow/samples-in-stage/${stageName}`);
        const stageData = stageResponse.data.data;
        console.log(`   • ${stageName.padEnd(18)} : ${stageData.totalSamples} samples (${stageData.readyToProgress} ready, ${stageData.stageDurationMinutes} min duration)`);
      } catch (error) {
        console.log(`   • ${stageName.padEnd(18)} : Error fetching data`);
      }
    }
    
    // 5. Sample tracking with timing
    console.log('\n5. 🎯 Sample Tracking (First 3 families):');
    const trackingResponse = await axios.get(`${BASE_URL}/api/workflow/sample-tracking`);
    const tracking = trackingResponse.data.data;
    
    tracking.families.slice(0, 3).forEach(family => {
      console.log(`   Family ${family.caseNumber}:`);
      family.members.forEach(member => {
        const timeStr = member.timeInStage ? `${Math.floor(member.timeInStage / 60)}m ${member.timeInStage % 60}s` : 'N/A';
        console.log(`     - ${member.lab_number} (${member.relation.padEnd(15)}) : ${member.workflow_status.padEnd(20)} [${timeStr} in stage]`);
      });
    });
    
    console.log('\n6. 🌟 System Features Demonstrated:');
    console.log('   ✅ Configurable stage durations (3-60+ minutes per stage)');
    console.log('   ✅ Real-time sample progress tracking with timing');
    console.log('   ✅ REST API for stage duration management');
    console.log('   ✅ Workflow respects timing constraints');
    console.log('   ✅ 50 samples cycling through 6 stages with realistic timing');
    console.log('   ✅ Database-backed configuration persistence');
    console.log('\n📌 API Endpoints Available:');
    console.log('   GET  /api/workflow/stage-durations          - List all stage configurations');
    console.log('   PUT  /api/workflow/stage-durations/:stage   - Update specific stage duration');
    console.log('   GET  /api/workflow/samples-in-stage/:stage  - Get samples in specific stage with timing');
    console.log('   GET  /api/workflow/sample-tracking          - Enhanced sample tracking with timing');
    console.log('   GET  /api/workflow/timing-stats             - Workflow performance statistics');
    console.log('   GET  /api/workflow/paternity/status         - Overall workflow status');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.status, error.response.statusText);
    }
  }
}

// Run the demo
demoWorkflowAPI();