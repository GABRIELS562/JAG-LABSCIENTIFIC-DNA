// Live Sample Cycler - Cycles samples through DNA workflow stages
const db = require('./database');

class LiveSampleCycler {
  constructor() {
    this.workflowStages = [
      'sample_collected',
      'extraction_ready',
      'extraction_in_progress',
      'extraction_completed',
      'quantification_ready',
      'quantification_completed',
      'pcr_ready',
      'pcr_batched',
      'pcr_in_progress',
      'pcr_completed',
      'electro_ready',
      'electro_batched',
      'electro_in_progress',
      'electro_completed',
      'analysis_ready',
      'analysis_in_progress',
      'analysis_completed',
      'review_pending',
      'report_generation',
      'report_sent'
    ];
    
    this.isRunning = false;
    this.cycleInterval = null;
    this.totalProcessed = 0;
    this.maxSamples = 300;
  }
  
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Live Sample Cycler started - samples will progress through workflow stages');
    
    // Cycle samples every 5 seconds
    this.cycleInterval = setInterval(async () => {
      await this.cycleSamples();
    }, 5000);
    
    // Initial cycle
    await this.cycleSamples();
  }
  
  async stop() {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️  Live Sample Cycler stopped');
  }
  
  async cycleSamples() {
    try {
      // Get all AUTO- samples
      const samples = await db.getAllSamples();
      const autoSamples = samples.filter(s => s.lab_number && s.lab_number.startsWith('AUTO-'));
      
      if (autoSamples.length === 0) {
        console.log('No AUTO- samples found to cycle');
        return;
      }
      
      // Process random number of samples (1-5) each cycle
      const samplesToProcess = Math.min(Math.floor(Math.random() * 5) + 1, autoSamples.length);
      const selectedSamples = this.selectRandomSamples(autoSamples, samplesToProcess);
      
      for (const sample of selectedSamples) {
        await this.progressSample(sample);
      }
      
      // Check if we need to reset
      if (this.totalProcessed >= this.maxSamples) {
        await this.resetSamples();
      }
      
      console.log(`🔄 Cycled ${samplesToProcess} samples | Total processed: ${this.totalProcessed}`);
      
    } catch (error) {
      console.error('Error cycling samples:', error.message);
    }
  }
  
  selectRandomSamples(samples, count) {
    const shuffled = [...samples].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  async progressSample(sample) {
    try {
      const currentStageIndex = this.workflowStages.indexOf(sample.workflow_status);
      let nextStageIndex;
      
      if (currentStageIndex === -1) {
        // Unknown stage, start from beginning
        nextStageIndex = 0;
      } else if (currentStageIndex === this.workflowStages.length - 1) {
        // At last stage (report_sent), cycle back to beginning
        nextStageIndex = 0;
        this.totalProcessed++;
      } else {
        // Move to next stage
        nextStageIndex = currentStageIndex + 1;
        
        // Count as processed when reaching report_sent
        if (nextStageIndex === this.workflowStages.length - 1) {
          this.totalProcessed++;
        }
      }
      
      const nextStage = this.workflowStages[nextStageIndex];
      
      // Update the sample's workflow status
      await db.run(
        'UPDATE samples SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nextStage, sample.id]
      );
      
      console.log(`   📊 ${sample.lab_number}: ${sample.workflow_status} → ${nextStage}`);
      
    } catch (error) {
      console.error(`Error progressing sample ${sample.lab_number}:`, error.message);
    }
  }
  
  async resetSamples() {
    try {
      console.log('🔄 Resetting all samples to initial stages (reached 300 processed)');
      
      // Reset all AUTO- samples to random initial stages
      const samples = await db.getAllSamples();
      const autoSamples = samples.filter(s => s.lab_number && s.lab_number.startsWith('AUTO-'));
      
      for (const sample of autoSamples) {
        // Assign random initial stage from first 5 stages
        const randomStage = this.workflowStages[Math.floor(Math.random() * 5)];
        
        await db.run(
          'UPDATE samples SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [randomStage, sample.id]
        );
      }
      
      this.totalProcessed = 0;
      console.log('✅ Reset complete - all samples back to initial stages');
      
    } catch (error) {
      console.error('Error resetting samples:', error.message);
    }
  }
  
  async getStatus() {
    const samples = await db.getAllSamples();
    const autoSamples = samples.filter(s => s.lab_number && s.lab_number.startsWith('AUTO-'));
    
    const stageCount = {};
    for (const stage of this.workflowStages) {
      stageCount[stage] = autoSamples.filter(s => s.workflow_status === stage).length;
    }
    
    return {
      isRunning: this.isRunning,
      totalSamples: autoSamples.length,
      totalProcessed: this.totalProcessed,
      resetThreshold: this.maxSamples,
      stageDistribution: stageCount
    };
  }
}

module.exports = new LiveSampleCycler();