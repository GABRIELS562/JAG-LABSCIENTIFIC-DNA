// In-Memory Sample Cycler - Works WITHOUT database for DevOps showcase
// This ensures the DNA workflow visualization always works even if database is down

class InMemorySampleCycler {
  constructor() {
    this.samples = [];
    this.isRunning = false;
    this.cycleInterval = null;
    this.sampleIdCounter = 1000;

    // Simplified workflow stages for showcase
    this.workflowStages = [
      'sample_collected',      // Collection
      'dna_extraction',        // Processing
      'pcr_ready',            // Processing
      'pcr_completed',        // Processing
      'electro_ready',        // Analysis
      'electro_completed',    // Analysis
      'analysis_ready',       // Analysis
      'analysis_completed',   // Review
      'report_ready',         // Review
      'report_sent'          // Complete
    ];

    // Initialize with some samples
    this.initializeSamples();
  }

  initializeSamples() {
    // Create 20 initial samples distributed across stages
    for (let i = 0; i < 20; i++) {
      const stageIndex = Math.floor(Math.random() * this.workflowStages.length);
      this.samples.push({
        id: this.sampleIdCounter++,
        lab_number: `LAB-2025-${String(this.sampleIdCounter).padStart(3, '0')}`,
        workflow_status: this.workflowStages[stageIndex],
        patient_name: `Patient ${i + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    console.log('✅ In-memory sample cycler initialized with 20 samples');
  }

  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 In-Memory Sample Cycler started - NO DATABASE REQUIRED');
    console.log('📊 Samples will progress through DNA workflow stages every 5 seconds');

    // Cycle samples every 5 seconds
    this.cycleInterval = setInterval(() => {
      this.cycleSamples();
    }, 5000);

    // Generate new samples every 30 seconds
    this.generateInterval = setInterval(() => {
      this.generateNewSamples();
    }, 30000);
  }

  stop() {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
    if (this.generateInterval) {
      clearInterval(this.generateInterval);
      this.generateInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️  In-Memory Sample Cycler stopped');
  }

  cycleSamples() {
    // Progress 3-5 random samples each cycle
    const samplesToProgress = Math.floor(Math.random() * 3) + 3;
    const shuffled = [...this.samples].sort(() => 0.5 - Math.random());
    const selectedSamples = shuffled.slice(0, samplesToProgress);

    selectedSamples.forEach(sample => {
      const currentIndex = this.workflowStages.indexOf(sample.workflow_status);

      if (currentIndex === this.workflowStages.length - 1) {
        // Sample completed, recycle to beginning
        sample.workflow_status = this.workflowStages[0];
      } else if (currentIndex >= 0) {
        // Move to next stage
        sample.workflow_status = this.workflowStages[currentIndex + 1];
      } else {
        // Unknown stage, start from beginning
        sample.workflow_status = this.workflowStages[0];
      }

      sample.updated_at = new Date().toISOString();
    });

    console.log(`🔄 Progressed ${samplesToProgress} samples through workflow`);
    this.logCurrentDistribution();
  }

  generateNewSamples() {
    // Add 2-3 new samples
    const newSampleCount = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < newSampleCount; i++) {
      this.samples.push({
        id: this.sampleIdCounter++,
        lab_number: `LAB-2025-${String(this.sampleIdCounter).padStart(3, '0')}`,
        workflow_status: 'sample_collected', // New samples start at collection
        patient_name: `Patient ${this.sampleIdCounter}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Remove oldest completed samples if we have too many
    if (this.samples.length > 50) {
      const completedSamples = this.samples.filter(s => s.workflow_status === 'report_sent');
      if (completedSamples.length > 10) {
        // Remove oldest completed samples
        const toRemove = completedSamples.slice(0, completedSamples.length - 10);
        toRemove.forEach(sample => {
          const index = this.samples.indexOf(sample);
          if (index > -1) {
            this.samples.splice(index, 1);
          }
        });
      }
    }

    console.log(`➕ Generated ${newSampleCount} new samples | Total: ${this.samples.length}`);
  }

  logCurrentDistribution() {
    const distribution = {};
    this.samples.forEach(sample => {
      distribution[sample.workflow_status] = (distribution[sample.workflow_status] || 0) + 1;
    });

    console.log('📊 Current sample distribution:');
    Object.entries(distribution).forEach(([stage, count]) => {
      if (count > 0) {
        console.log(`   ${stage}: ${count}`);
      }
    });
  }

  // API-compatible methods for integration
  async getAllSamples() {
    return this.samples;
  }

  async getSamplesByStatus(status) {
    return this.samples.filter(s => s.workflow_status === status);
  }

  async getSampleById(id) {
    return this.samples.find(s => s.id === id);
  }

  async updateSampleStatus(id, newStatus) {
    const sample = this.samples.find(s => s.id === id);
    if (sample) {
      sample.workflow_status = newStatus;
      sample.updated_at = new Date().toISOString();
      return sample;
    }
    return null;
  }

  getStats() {
    const distribution = {};
    this.samples.forEach(sample => {
      distribution[sample.workflow_status] = (distribution[sample.workflow_status] || 0) + 1;
    });

    return {
      totalSamples: this.samples.length,
      distribution,
      isRunning: this.isRunning,
      mode: 'in-memory (no database)'
    };
  }
}

// Export singleton instance
module.exports = new InMemorySampleCycler();