const db = require('../services/database');

function assignSamplesToBatches() {
  console.log('🧪 Assigning samples to LDS batches...');
  
  try {
    // Get all LDS batches
    const ldsBatches = db.db.prepare("SELECT * FROM batches WHERE batch_number LIKE 'LDS_%' AND status = 'active'").all();
    
    if (ldsBatches.length === 0) {
      console.log('No LDS batches found');
      return;
    }
    
    // Get available samples that aren't already assigned to batches
    const availableSamples = db.db.prepare("SELECT * FROM samples WHERE batch_id IS NULL ORDER BY case_number ASC, lab_number ASC").all();
    
    if (availableSamples.length === 0) {
      console.log('No available samples to assign');
      return;
    }
    
    console.log(`Found ${ldsBatches.length} LDS batches and ${availableSamples.length} available samples`);
    
    let sampleIndex = 0;
    
    // Assign samples to each LDS batch
    for (const batch of ldsBatches) {
      const samplesPerBatch = batch.total_samples || 8;
      const batchSamples = availableSamples.slice(sampleIndex, sampleIndex + samplesPerBatch);
      
      if (batchSamples.length === 0) {
        console.log(`No more samples available for batch ${batch.batch_number}`);
        break;
      }
      
      // Update samples to assign them to this batch
      const updateStmt = db.db.prepare("UPDATE samples SET batch_id = ?, workflow_status = 'pcr_completed' WHERE id = ?");
      
      for (const sample of batchSamples) {
        updateStmt.run(batch.id, sample.id);
      }
      
      // Update batch sample count
      const updateBatchStmt = db.db.prepare("UPDATE batches SET total_samples = ? WHERE id = ?");
      updateBatchStmt.run(batchSamples.length, batch.id);
      
      console.log(`✅ Assigned ${batchSamples.length} samples to batch ${batch.batch_number}`);
      console.log(`   Samples: ${batchSamples.map(s => s.lab_number).join(', ')}`);
      
      sampleIndex += samplesPerBatch;
    }
    
    console.log('🎉 Sample assignment completed!');
    
  } catch (error) {
    console.error('❌ Error assigning samples to batches:', error);
    throw error;
  }
}

// Run the assignment
if (require.main === module) {
  assignSamplesToBatches();
}

module.exports = assignSamplesToBatches;