/**
 * Sample Ingestion Service
 *
 * Fetches fake patient data from external APIs (RandomUser.me)
 * and creates real samples in the LIMS system.
 *
 * This creates observable HTTP traffic for DevOps monitoring:
 * - Outbound: Calls to RandomUser API (external dependency metrics)
 * - Inbound: POST to /api/samples (request rate, latency, errors)
 * - Workflow: Samples flow through existing batch processing
 */

const { logger } = require('../utils/logger');

class SampleIngestionService {
  constructor(options = {}) {
    this.config = {
      // Ingestion rate
      samplesPerBatch: options.samplesPerBatch || 3,
      intervalMs: options.intervalMs || 15000, // Every 15 seconds

      // API endpoints
      randomUserApi: 'https://randomuser.me/api/',
      localApiBase: options.localApiBase || 'http://localhost:3001',

      // Case grouping (creates family groups for paternity testing)
      createFamilyGroups: options.createFamilyGroups !== false,

      // Failure simulation for realistic metrics
      simulateFailures: options.simulateFailures !== false,
      failureRate: options.failureRate || 0.05, // 5% failure rate

      // Enabled state
      enabled: options.enabled !== false
    };

    this.stats = {
      totalFetched: 0,
      totalCreated: 0,
      totalFailed: 0,
      totalBatches: 0,
      lastFetchTime: null,
      lastError: null,
      avgLatencyMs: 0,
      externalApiLatencyMs: 0
    };

    this.intervalId = null;
    this.isRunning = false;
    this.caseCounter = 1;
  }

  /**
   * Start the ingestion service
   */
  start() {
    if (this.isRunning) {
      logger.warn('SampleIngestionService already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 SampleIngestionService started', {
      samplesPerBatch: this.config.samplesPerBatch,
      intervalMs: this.config.intervalMs,
      createFamilyGroups: this.config.createFamilyGroups
    });

    // Run immediately, then on interval
    this.ingestBatch();
    this.intervalId = setInterval(() => this.ingestBatch(), this.config.intervalMs);
  }

  /**
   * Stop the ingestion service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('🛑 SampleIngestionService stopped', this.stats);
  }

  /**
   * Fetch fake people from RandomUser API
   */
  async fetchFromExternalApi(count) {
    const startTime = Date.now();

    try {
      const url = `${this.config.randomUserApi}?results=${count}&nat=us,gb,au,ca`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`RandomUser API returned ${response.status}`);
      }

      const data = await response.json();

      this.stats.externalApiLatencyMs = Date.now() - startTime;
      this.stats.totalFetched += data.results.length;

      logger.debug('Fetched from RandomUser API', {
        count: data.results.length,
        latencyMs: this.stats.externalApiLatencyMs
      });

      return data.results;

    } catch (error) {
      this.stats.lastError = error.message;
      logger.error('Failed to fetch from RandomUser API', { error: error.message });
      throw error;
    }
  }

  /**
   * Transform RandomUser data into LIMS sample format
   */
  transformToSample(person, relation, caseNumber) {
    const labNumber = `ING-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return {
      lab_number: labNumber,
      name: person.name.first,
      surname: person.name.last,
      relation: relation,
      case_number: caseNumber,
      collection_date: new Date().toISOString().split('T')[0],
      sample_type: 'Buccal Swab',
      // Additional metadata
      nationality: person.nat,
      date_of_birth: person.dob?.date?.split('T')[0],
      email: person.email,
      phone: person.phone
    };
  }

  /**
   * Create a sample via the local API (generates observable HTTP traffic)
   */
  async createSampleViaApi(sampleData) {
    const startTime = Date.now();

    try {
      // Simulate occasional failures for realistic metrics
      if (this.config.simulateFailures && Math.random() < this.config.failureRate) {
        throw new Error('Simulated ingestion failure for metrics');
      }

      const response = await fetch(`${this.config.localApiBase}/api/samples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sampleData)
      });

      const latencyMs = Date.now() - startTime;
      this.updateAvgLatency(latencyMs);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API returned ${response.status}`);
      }

      const result = await response.json();
      this.stats.totalCreated++;

      logger.debug('Sample created via API', {
        lab_number: sampleData.lab_number,
        case_number: sampleData.case_number,
        latencyMs
      });

      return result;

    } catch (error) {
      this.stats.totalFailed++;
      this.stats.lastError = error.message;
      logger.warn('Failed to create sample', {
        error: error.message,
        lab_number: sampleData.lab_number
      });
      throw error;
    }
  }

  /**
   * Ingest a batch of samples (creates family groups)
   */
  async ingestBatch() {
    if (!this.config.enabled) return;

    const batchStartTime = Date.now();

    try {
      // Determine how many people to fetch
      // For family groups: 2-4 people per case (father, mother, 1-2 children)
      const familySize = this.config.createFamilyGroups ?
        Math.floor(Math.random() * 3) + 2 : // 2-4 people
        this.config.samplesPerBatch;

      // Fetch fake people from external API
      const people = await this.fetchFromExternalApi(familySize);

      if (!people || people.length === 0) {
        logger.warn('No people returned from API');
        return;
      }

      // Create case number for this family group
      const caseNumber = `API-${new Date().getFullYear()}-${String(this.caseCounter++).padStart(5, '0')}`;

      // Define relations for family group
      const relations = ['Alleged Father', 'Mother', 'Child', 'Child 2'];

      // Create samples via API (generates HTTP traffic)
      const results = [];
      for (let i = 0; i < people.length; i++) {
        const relation = this.config.createFamilyGroups ?
          relations[i] || 'Child' :
          'Individual';

        const sampleData = this.transformToSample(people[i], relation, caseNumber);

        try {
          const result = await this.createSampleViaApi(sampleData);
          results.push(result);
        } catch (error) {
          // Continue with other samples even if one fails
        }

        // Small delay between API calls (realistic traffic pattern)
        if (i < people.length - 1) {
          await this.delay(100 + Math.random() * 200);
        }
      }

      this.stats.totalBatches++;
      this.stats.lastFetchTime = new Date().toISOString();

      const batchLatencyMs = Date.now() - batchStartTime;

      logger.info('📥 Ingestion batch completed', {
        caseNumber,
        samplesCreated: results.length,
        samplesFailed: people.length - results.length,
        batchLatencyMs,
        totalCreated: this.stats.totalCreated
      });

    } catch (error) {
      logger.error('Ingestion batch failed', { error: error.message });
    }
  }

  /**
   * Update rolling average latency
   */
  updateAvgLatency(latencyMs) {
    const alpha = 0.2; // Smoothing factor
    this.stats.avgLatencyMs = this.stats.avgLatencyMs === 0 ?
      latencyMs :
      (alpha * latencyMs) + ((1 - alpha) * this.stats.avgLatencyMs);
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      config: {
        samplesPerBatch: this.config.samplesPerBatch,
        intervalMs: this.config.intervalMs,
        createFamilyGroups: this.config.createFamilyGroups,
        failureRate: this.config.failureRate
      }
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    logger.info('SampleIngestionService config updated', this.config);

    // Restart with new interval if changed
    if (newConfig.intervalMs && this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

// Singleton instance
let instance = null;

function getSampleIngestionService(options) {
  if (!instance) {
    instance = new SampleIngestionService(options);
  }
  return instance;
}

module.exports = { SampleIngestionService, getSampleIngestionService };
