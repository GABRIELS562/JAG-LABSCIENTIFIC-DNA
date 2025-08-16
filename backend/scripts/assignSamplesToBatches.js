const db = require('../services/database');

function assignSamplesToBatches() {
  try {
    // Get all LDS batches
    const ldsBatches = db.db.prepare("SELECT * FROM batches WHERE batch_number LIKE 'LDS_%' AND status = 'active'").all();
    
    if (ldsBatches.length === 0) {
      return;
    }
    
    // Get available samples that aren't already assigned to batches
    const availableSamples = db.db.prepare("SELECT * FROM samples WHERE batch_id IS NULL ORDER BY case_number ASC, lab_number ASC").all();
    
    if (availableSamples.length === 0) {
      return;
    }
    
    let sampleIndex = 0;
    
    // Assign samples to each LDS batch
    for (const batch of ldsBatches) {
      const samplesPerBatch = batch.total_samples || 8;
      const batchSamples = availableSamples.slice(sampleIndex, sampleIndex + samplesPerBatch);
      
      if (batchSamples.length === 0) {
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
      
      .join(', ')}`);
      
      sampleIndex += samplesPerBatch;
    }
    
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