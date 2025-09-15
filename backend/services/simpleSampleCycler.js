// Simple Sample Cycler - Works WITHOUT database
// Generates 5 samples and cycles them through DNA workflow stages

class SimpleSampleCycler {
  constructor() {
    this.samples = [];
    this.isRunning = false;
    this.cycleInterval = null;

    // DNA workflow stages
    this.workflowStages = [
      'sample_collected',
      'dna_extraction',
      'pcr_ready',
      'pcr_completed',
      'electro_ready',
      'electro_completed',
      'analysis_ready',
      'analysis_completed',
      'report_ready',
      'report_sent'
    ];

    // Initialize 5 samples
    this.initializeSamples();
  }

  initializeSamples() {
    const names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'];

    for (let i = 0; i < 5; i++) {
      // Distribute samples across different stages
      const stageIndex = i * 2; // Spread them out
      this.samples.push({
        id: i + 1,
        lab_number: `DEMO-2025-${String(i + 1).padStart(3, '0')}`,
        name: names[i].split(' ')[0],
        surname: names[i].split(' ')[1],
        workflow_status: this.workflowStages[stageIndex % this.workflowStages.length],
        patient_name: names[i],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        collection_date: new Date().toISOString(),
        case_number: `CASE-2025-${String(i + 1).padStart(3, '0')}`
      });
    }

    console.log('✅ Simple Sample Cycler initialized with 5 demo samples');
    this.logStatus();
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Simple Sample Cycler started - cycling samples every 30 seconds');

    // Cycle samples every 30 seconds
    this.cycleInterval = setInterval(() => {
      this.cycleSamples();
    }, 30000);
  }

  stop() {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️  Simple Sample Cycler stopped');
  }

  cycleSamples() {
    const timestamp = new Date().toISOString();
    console.log(`\n🔄 [${timestamp}] Cycling samples...`);

    this.samples.forEach(sample => {
      const currentIndex = this.workflowStages.indexOf(sample.workflow_status);
      const oldStatus = sample.workflow_status;

      // Move to next stage (or loop back to start)
      const nextIndex = (currentIndex + 1) % this.workflowStages.length;
      sample.workflow_status = this.workflowStages[nextIndex];
      sample.updated_at = timestamp;

      console.log(`   📊 ${sample.lab_number}: ${oldStatus} → ${sample.workflow_status}`);
    });

    this.logStatus();
  }

  logStatus() {
    const distribution = {};
    this.samples.forEach(sample => {
      distribution[sample.workflow_status] = (distribution[sample.workflow_status] || 0) + 1;
    });

    console.log('\n📈 Current Sample Distribution:');
    Object.entries(distribution).forEach(([stage, count]) => {
      console.log(`   ${stage}: ${count} sample(s)`);
    });
  }

  // API methods
  async getAllSamples() {
    return this.samples;
  }

  async getSamplesByStatus(status) {
    return this.samples.filter(s => s.workflow_status === status);
  }

  async getSampleById(id) {
    return this.samples.find(s => s.id === id);
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
      mode: 'demo (no database)',
      message: 'Using mock data - database not available'
    };
  }
}

// Export singleton instance
module.exports = new SimpleSampleCycler();