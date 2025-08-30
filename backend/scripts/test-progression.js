#!/usr/bin/env node

/**
 * Test sample progression manually
 */

const SampleWorkflowProgressor = require('../services/sampleWorkflowProgressor');

console.log('🔬 Testing Sample Workflow Progression...\n');

const progressor = new SampleWorkflowProgressor();

// Initialize
const initResult = progressor.initialize();
console.log('Initialization:', initResult.success ? '✅ Success' : '❌ Failed');

// Get initial status
console.log('\n📊 Initial Status:');
const initialStatus = progressor.getStatus();
console.log('Distribution:', initialStatus.distribution);

// Progress samples once
console.log('\n⏩ Progressing samples...');
progressor.progressSamples();

// Get updated status
console.log('\n📊 After Progression:');
const updatedStatus = progressor.getStatus();
console.log('Distribution:', updatedStatus.distribution);

console.log('\n✨ Sample progression test complete!');