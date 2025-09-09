/**
 * DNA Laboratory Workflow Configuration
 * Optimized for continuous sample flow and DevOps demonstration
 */

module.exports = {
  // Sample Generation Settings
  sampleGeneration: {
    enabled: true,
    interval: 10000, // Generate new samples every 10 seconds
    batchSize: 3, // Number of samples per generation
    maxActiveSamples: 200, // Maximum samples in the system
    autoCleanup: true, // Remove completed samples after 1 hour
    cleanupAge: 3600000 // 1 hour in milliseconds
  },

  // Workflow Progression Settings
  workflowProgression: {
    enabled: true,
    interval: 5000, // Progress workflows every 5 seconds
    simulationSpeed: 10, // 10x speed for demo purposes
    stages: {
      sample_collected: { duration: 30, next: 'dna_extraction' },
      dna_extraction: { duration: 60, next: 'pcr_ready' },
      pcr_ready: { duration: 20, next: 'pcr_batched' },
      pcr_batched: { duration: 90, next: 'pcr_completed' },
      pcr_completed: { duration: 30, next: 'electro_ready' },
      electro_ready: { duration: 20, next: 'electro_batched' },
      electro_batched: { duration: 60, next: 'electro_completed' },
      electro_completed: { duration: 20, next: 'analysis_ready' },
      analysis_ready: { duration: 40, next: 'analysis_completed' },
      analysis_completed: { duration: 20, next: 'report_ready' },
      report_ready: { duration: 10, next: 'report_sent' },
      report_sent: { duration: 0, next: null } // Final stage
    }
  },

  // Batch Processing Settings
  batchProcessing: {
    enabled: true,
    pcrBatchSize: 16,
    electroBatchSize: 8,
    minBatchWaitTime: 30000, // 30 seconds
    maxBatchWaitTime: 120000 // 2 minutes
  },

  // Quality Control Settings
  qualityControl: {
    enabled: true,
    failureRate: 0.05, // 5% failure rate for realism
    retryEnabled: true,
    maxRetries: 2
  },

  // Metrics and Monitoring
  metrics: {
    enabled: true,
    updateInterval: 15000, // Update metrics every 15 seconds
    exportToPrometheus: true,
    dashboardRefreshRate: 5000
  },

  // Sample Types for Generation
  sampleTypes: [
    { type: 'Blood', probability: 0.4 },
    { type: 'Buccal Swab', probability: 0.4 },
    { type: 'Hair', probability: 0.1 },
    { type: 'Saliva', probability: 0.1 }
  ],

  // Case Types for Generation
  caseTypes: [
    { type: 'Paternity', probability: 0.5 },
    { type: 'Maternity', probability: 0.2 },
    { type: 'Kinship', probability: 0.15 },
    { type: 'Immigration', probability: 0.1 },
    { type: 'Forensic', probability: 0.05 }
  ],

  // Names for Random Sample Generation
  sampleNames: {
    firstNames: [
      'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer',
      'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara',
      'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah',
      'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa'
    ],
    lastNames: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
      'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez',
      'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
      'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'
    ]
  },

  // DevOps Demo Features
  devops: {
    generateLoadSpikes: true, // Create periodic load spikes
    spikeInterval: 300000, // Every 5 minutes
    spikeDuration: 60000, // 1 minute spike
    spikeMultiplier: 3, // 3x normal load during spike
    simulateErrors: true, // Occasional errors for monitoring
    errorRate: 0.01 // 1% error rate
  }
};