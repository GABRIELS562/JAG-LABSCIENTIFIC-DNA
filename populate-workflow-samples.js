#!/usr/bin/env node

/**
 * Populate LIMS with test samples at various workflow stages
 * This script creates samples to test the complete workflow
 */

const http = require('http');

const API_URL = 'http://localhost:3001/api';

// Simple HTTP request helper
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Add auth if needed
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: { error: 'Invalid JSON', body: body } });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function updateSampleStatus(sampleId, newStatus) {
  try {
    const response = await makeRequest(`/samples/${sampleId}`, 'PUT', {
      workflow_status: newStatus
    });
    
    if (response.status === 200) {
      console.log(`✅ Updated sample ${sampleId} to status: ${newStatus}`);
      return true;
    } else {
      console.log(`⚠️  Failed to update sample ${sampleId}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error updating sample ${sampleId}: ${error.message}`);
    return false;
  }
}

async function populateWorkflowSamples() {
  console.log('🔬 LIMS Workflow Population Script');
  console.log('====================================\n');
  
  try {
    // Get all current samples
    console.log('📋 Fetching current samples...');
    const samplesResponse = await makeRequest('/samples?limit=100');
    
    if (samplesResponse.status !== 200 || !samplesResponse.data.success) {
      throw new Error('Failed to fetch samples');
    }
    
    const samples = samplesResponse.data.data;
    console.log(`Found ${samples.length} total samples\n`);
    
    // Organize samples by current status
    const statusGroups = {};
    samples.forEach(sample => {
      const status = sample.workflow_status || 'unknown';
      if (!statusGroups[status]) statusGroups[status] = [];
      statusGroups[status].push(sample);
    });
    
    console.log('Current status distribution:');
    Object.entries(statusGroups).forEach(([status, sampleList]) => {
      console.log(`  - ${status}: ${sampleList.length} samples`);
    });
    console.log();
    
    // Strategy: Move some samples backwards to create workflow queues
    let updatesCount = 0;
    
    // 1. Move some PCR completed samples back to sample_collected (for DNA extraction queue)
    console.log('🧬 Creating DNA Extraction queue...');
    const pcrCompletedSamples = statusGroups['pcr_completed'] || [];
    const samplesToMoveBack = pcrCompletedSamples.slice(0, 5); // Take first 5
    
    for (const sample of samplesToMoveBack) {
      const success = await updateSampleStatus(sample.id, 'sample_collected');
      if (success) updatesCount++;
    }
    
    // 2. Move some electro completed samples to dna_extracted (for PCR queue)
    console.log('\n🔬 Creating PCR queue...');
    const electroCompletedSamples = statusGroups['electro_completed'] || [];
    const samplesForPCR = electroCompletedSamples.slice(0, 4); // Take first 4
    
    for (const sample of samplesForPCR) {
      const success = await updateSampleStatus(sample.id, 'dna_extracted');
      if (success) updatesCount++;
    }
    
    // 3. Ensure we have samples ready for electrophoresis (keep some at pcr_completed)
    console.log('\n⚡ Ensuring Electrophoresis queue...');
    const remainingPCRCompleted = pcrCompletedSamples.slice(5); // Skip the ones we moved back
    console.log(`Keeping ${remainingPCRCompleted.length} samples at pcr_completed status for electrophoresis`);
    
    // 4. Ensure we have samples in electrophoresis processing
    console.log('\n📊 Creating in-process samples...');
    const analysisCompletedSamples = statusGroups['analysis_completed'] || [];
    const samplesForElectroProcess = analysisCompletedSamples.slice(0, 3);
    
    for (const sample of samplesForElectroProcess) {
      const success = await updateSampleStatus(sample.id, 'in_electrophoresis');
      if (success) updatesCount++;
    }
    
    // 5. Create some samples in analysis
    const remainingElectroCompleted = electroCompletedSamples.slice(4); // Skip the ones moved to dna_extracted
    const samplesForAnalysis = remainingElectroCompleted.slice(0, 3);
    
    for (const sample of samplesForAnalysis) {
      const success = await updateSampleStatus(sample.id, 'in_analysis');
      if (success) updatesCount++;
    }
    
    console.log(`\n✅ Successfully updated ${updatesCount} samples`);
    
    // Show new distribution
    console.log('\n📊 Verifying new workflow distribution...');
    const newSamplesResponse = await makeRequest('/samples?limit=100');
    const newSamples = newSamplesResponse.data.data;
    
    const newStatusGroups = {};
    newSamples.forEach(sample => {
      const status = sample.workflow_status || 'unknown';
      if (!newStatusGroups[status]) newStatusGroups[status] = [];
      newStatusGroups[status].push(sample);
    });
    
    console.log('\nNew status distribution:');
    const workflowOrder = [
      'registered',
      'sample_collected',
      'dna_extracted',
      'in_pcr',
      'pcr_completed',
      'in_electrophoresis',
      'electro_completed',
      'in_analysis',
      'analysis_completed',
      'report_generated'
    ];
    
    workflowOrder.forEach(status => {
      const count = newStatusGroups[status] ? newStatusGroups[status].length : 0;
      const arrow = count > 0 ? '→' : ' ';
      console.log(`  ${arrow} ${status}: ${count} samples`);
    });
    
    // Summary
    console.log('\n🎯 Workflow Queue Summary:');
    console.log(`  📝 Ready for DNA Extraction: ${newStatusGroups['sample_collected']?.length || 0} samples`);
    console.log(`  🧬 Ready for PCR: ${newStatusGroups['dna_extracted']?.length || 0} samples`);
    console.log(`  ⚡ Ready for Electrophoresis: ${newStatusGroups['pcr_completed']?.length || 0} samples`);
    console.log(`  🔬 Ready for Analysis: ${newStatusGroups['electro_completed']?.length || 0} samples`);
    console.log(`  📊 In Process: ${(newStatusGroups['in_pcr']?.length || 0) + (newStatusGroups['in_electrophoresis']?.length || 0) + (newStatusGroups['in_analysis']?.length || 0)} samples`);
    
    console.log('\n🚀 Workflow testing recommendations:');
    console.log('  1. Visit DNA Extraction page - should show sample_collected samples');
    console.log('  2. Visit PCR Plate page - should show dna_extracted samples');
    console.log('  3. Visit Electrophoresis page - should show pcr_completed samples');
    console.log('  4. Test creating batches and moving samples through workflow');
    console.log('  5. Verify each page properly updates workflow_status');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the population script
populateWorkflowSamples().catch(error => {
  console.error('Failed to populate workflow samples:', error);
  process.exit(1);
});