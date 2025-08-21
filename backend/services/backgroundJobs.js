const cron = require('node-cron');
const { logger } = require('../utils/logger');
const { trackSampleProcessed, trackBatchCreated, updateQueueSize, trackProcessingTime } = require('../middleware/metrics');
const Database = require('better-sqlite3');
const path = require('path');

class BackgroundJobService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.dbPath = path.join(__dirname, '../database/ashley_lims.db');
    this.db = null;
    this.simulatedData = {
      userSessions: new Set(),
      processingQueues: {
        pcr_ready: Math.floor(Math.random() * 20) + 5,
        electro_ready: Math.floor(Math.random() * 15) + 3,
        analysis_ready: Math.floor(Math.random() * 10) + 2
      }
    };
  }

  initializeDatabase() {
    try {
      this.db = new Database(this.dbPath, { fileMustExist: false });
      this.db.pragma('journal_mode = WAL');
      logger.info('Background jobs database initialized');
    } catch (error) {
      logger.error('Failed to initialize background jobs database', { error: error.message });
    }
  }

  start() {
    if (this.isRunning) {
      logger.warn('Background jobs already running');
      return;
    }

    this.initializeDatabase();
    this.isRunning = true;
    
    logger.info('Starting background jobs service');
    
    // Sample Processing Simulation - every 30 seconds
    this.scheduleJob('sample-processing', '*/30 * * * * *', this.simulateSampleProcessing.bind(this));
    
    // API Traffic Generation - every 15 seconds
    this.scheduleJob('api-traffic', '*/15 * * * * *', this.generateApiTraffic.bind(this));
    
    // Batch Processing - every 2 minutes
    this.scheduleJob('batch-processing', '*/2 * * * *', this.simulateBatchProcessing.bind(this));
    
    // User Activity Simulation - every 45 seconds
    this.scheduleJob('user-activity', '*/45 * * * * *', this.simulateUserActivity.bind(this));
    
    // Queue Updates - every 20 seconds
    this.scheduleJob('queue-updates', '*/20 * * * * *', this.updateProcessingQueues.bind(this));
    
    // System Metrics Update - every 1 minute
    this.scheduleJob('system-metrics', '*/60 * * * * *', this.updateSystemMetrics.bind(this));
    
    // Periodic Cleanup - every 10 minutes
    this.scheduleJob('cleanup', '0 */10 * * * *', this.performCleanup.bind(this));
    
    logger.info('All background jobs scheduled successfully', {
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    });
  }

  scheduleJob(name, cronPattern, jobFunction) {
    try {
      const task = cron.schedule(cronPattern, async () => {
        try {
          await jobFunction();
        } catch (error) {
          logger.error(`Background job '${name}' failed`, {
            error: error.message,
            stack: error.stack
          });
        }
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      });
      
      this.jobs.set(name, {
        task,
        pattern: cronPattern,
        lastRun: null,
        runCount: 0,
        errorCount: 0
      });
      
      logger.debug(`Scheduled job '${name}' with pattern '${cronPattern}'`);
    } catch (error) {
      logger.error(`Failed to schedule job '${name}'`, { error: error.message, pattern: cronPattern });
    }
  }

  async simulateSampleProcessing() {
    try {
      const job = this.jobs.get('sample-processing');
      if (job) job.runCount++;
      
      logger.info('Simulating sample processing');
      
      // Simulate processing 1-5 samples
      const sampleCount = Math.floor(Math.random() * 5) + 1;
      const processes = ['pcr', 'electrophoresis', 'analysis'];
      const statuses = ['processing', 'completed', 'failed'];
      
      for (let i = 0; i < sampleCount; i++) {
        const process = processes[Math.floor(Math.random() * processes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const duration = Math.random() * 300 + 30; // 30-330 seconds
        
        // Track metrics
        trackSampleProcessed(status, process);
        trackProcessingTime(process, duration);
        
        // Simulate database update if available
        if (this.db) {
          try {
            // Create a simulated sample processing record
            const stmt = this.db.prepare(`
              INSERT OR IGNORE INTO processing_log (sample_id, process_type, status, duration, created_at)
              VALUES (?, ?, ?, ?, datetime('now'))
            `);
            
            // Create table if it doesn't exist
            this.db.exec(`
              CREATE TABLE IF NOT EXISTS processing_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sample_id INTEGER,
                process_type TEXT,
                status TEXT,
                duration REAL,
                created_at TEXT
              )
            `);
            
            stmt.run(Math.floor(Math.random() * 1000) + 1, process, status, duration);
          } catch (dbError) {
            logger.warn('Failed to log sample processing to database', { error: dbError.message });
          }
        }
      }
      
      logger.debug('Sample processing simulation completed', { samplesProcessed: sampleCount });
      
    } catch (error) {
      const job = this.jobs.get('sample-processing');
      if (job) job.errorCount++;
      logger.error('Sample processing simulation failed', { error: error.message });
    }
  }

  async generateApiTraffic() {
    try {
      const job = this.jobs.get('api-traffic');
      if (job) job.runCount++;
      
      // Simulate API calls to various endpoints
      const endpoints = [
        { path: '/api/samples', method: 'GET', weight: 5 },
        { path: '/api/samples/counts', method: 'GET', weight: 3 },
        { path: '/api/batches', method: 'GET', weight: 2 },
        { path: '/api/samples/search', method: 'GET', weight: 2 },
        { path: '/api/workflow-stats', method: 'GET', weight: 2 },
        { path: '/api/samples', method: 'POST', weight: 1 }
      ];
      
      // Generate 2-8 API calls
      const callCount = Math.floor(Math.random() * 7) + 2;
      
      for (let i = 0; i < callCount; i++) {
        const endpoint = this.weightedRandomSelect(endpoints);
        const duration = this.simulateApiCall(endpoint);
        
        logger.debug('Simulated API call', {
          method: endpoint.method,
          path: endpoint.path,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        // Add small delay between calls
        await this.sleep(Math.random() * 1000 + 100);
      }
      
    } catch (error) {
      const job = this.jobs.get('api-traffic');
      if (job) job.errorCount++;
      logger.error('API traffic generation failed', { error: error.message });
    }
  }

  simulateApiCall(endpoint) {
    // Simulate response times based on endpoint complexity
    const baseTime = {
      '/api/samples': 150,
      '/api/samples/counts': 50,
      '/api/batches': 200,
      '/api/samples/search': 300,
      '/api/workflow-stats': 100
    }[endpoint.path] || 100;
    
    // Add some randomness
    return Math.floor(baseTime + (Math.random() * baseTime * 0.5));
  }

  async simulateBatchProcessing() {
    try {
      const job = this.jobs.get('batch-processing');
      if (job) job.runCount++;
      
      logger.info('Simulating batch processing');
      
      // Simulate batch creation every few cycles
      if (Math.random() < 0.3) { // 30% chance
        const batchTypes = ['pcr', 'electrophoresis', 'rerun'];
        const batchType = batchTypes[Math.floor(Math.random() * batchTypes.length)];
        const sampleCount = Math.floor(Math.random() * 20) + 5;
        
        trackBatchCreated(batchType);
        
        logger.info('Batch created in simulation', {
          batchType,
          sampleCount,
          timestamp: new Date().toISOString()
        });
      }
      
      // Simulate batch completion
      if (Math.random() < 0.2) { // 20% chance
        const completionTime = Math.random() * 3600 + 1800; // 30-90 minutes
        trackProcessingTime('batch_completion', completionTime);
        
        logger.info('Batch completed in simulation', {
          duration: `${Math.floor(completionTime / 60)} minutes`
        });
      }
      
    } catch (error) {
      const job = this.jobs.get('batch-processing');
      if (job) job.errorCount++;
      logger.error('Batch processing simulation failed', { error: error.message });
    }
  }

  async simulateUserActivity() {
    try {
      const job = this.jobs.get('user-activity');
      if (job) job.runCount++;
      
      const activities = [
        'user_login',
        'sample_registration',
        'batch_creation',
        'report_generation',
        'data_export',
        'search_query',
        'dashboard_view',
        'user_logout'
      ];
      
      // Simulate 1-3 user activities
      const activityCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < activityCount; i++) {
        const activity = activities[Math.floor(Math.random() * activities.length)];
        const userId = Math.floor(Math.random() * 20) + 1;
        
        // Simulate user session management
        if (activity === 'user_login') {
          this.simulatedData.userSessions.add(userId);
        } else if (activity === 'user_logout') {
          this.simulatedData.userSessions.delete(userId);
        }
        
        logger.debug('User activity simulated', {
          activity,
          userId,
          activeSessions: this.simulatedData.userSessions.size,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      const job = this.jobs.get('user-activity');
      if (job) job.errorCount++;
      logger.error('User activity simulation failed', { error: error.message });
    }
  }

  async updateProcessingQueues() {
    try {
      const job = this.jobs.get('queue-updates');
      if (job) job.runCount++;
      
      // Simulate queue size changes
      Object.keys(this.simulatedData.processingQueues).forEach(queueType => {
        const currentSize = this.simulatedData.processingQueues[queueType];
        const change = Math.floor((Math.random() - 0.5) * 6); // -3 to +3
        const newSize = Math.max(0, currentSize + change);
        
        this.simulatedData.processingQueues[queueType] = newSize;
        updateQueueSize(queueType, newSize);
      });
      
      logger.debug('Processing queues updated', {
        queues: this.simulatedData.processingQueues
      });
      
    } catch (error) {
      const job = this.jobs.get('queue-updates');
      if (job) job.errorCount++;
      logger.error('Queue updates failed', { error: error.message });
    }
  }

  async updateSystemMetrics() {
    try {
      const job = this.jobs.get('system-metrics');
      if (job) job.runCount++;
      
      // Log system performance metrics
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      logger.info('System metrics update', {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024)
        },
        cpu: cpuUsage,
        uptime: Math.round(process.uptime()),
        activeSessions: this.simulatedData.userSessions.size,
        queues: this.simulatedData.processingQueues
      });
      
    } catch (error) {
      const job = this.jobs.get('system-metrics');
      if (job) job.errorCount++;
      logger.error('System metrics update failed', { error: error.message });
    }
  }

  async performCleanup() {
    try {
      const job = this.jobs.get('cleanup');
      if (job) job.runCount++;
      
      logger.info('Performing periodic cleanup');
      
      // Simulate cleanup of old processing logs
      if (this.db) {
        try {
          this.db.exec(`
            DELETE FROM processing_log 
            WHERE created_at < datetime('now', '-7 days')
          `);
        } catch (dbError) {
          logger.warn('Database cleanup failed', { error: dbError.message });
        }
      }
      
      // Clean up expired user sessions
      if (this.simulatedData.userSessions.size > 50) {
        const sessionsToRemove = Array.from(this.simulatedData.userSessions).slice(0, 10);
        sessionsToRemove.forEach(session => this.simulatedData.userSessions.delete(session));
      }
      
      logger.debug('Cleanup completed', {
        remainingSessions: this.simulatedData.userSessions.size
      });
      
    } catch (error) {
      const job = this.jobs.get('cleanup');
      if (job) job.errorCount++;
      logger.error('Cleanup failed', { error: error.message });
    }
  }

  weightedRandomSelect(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item;
      }
    }
    
    return items[items.length - 1];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    logger.info('Stopping background jobs service');
    
    this.jobs.forEach((job, name) => {
      try {
        job.task.stop();
        logger.debug(`Stopped job '${name}'`);
      } catch (error) {
        logger.error(`Failed to stop job '${name}'`, { error: error.message });
      }
    });
    
    this.jobs.clear();
    this.isRunning = false;
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    logger.info('Background jobs service stopped');
  }

  getStatus() {
    const jobStatuses = {};
    
    this.jobs.forEach((job, name) => {
      jobStatuses[name] = {
        pattern: job.pattern,
        runCount: job.runCount,
        errorCount: job.errorCount,
        lastRun: job.lastRun,
        isRunning: job.task ? job.task.running : false
      };
    });
    
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: jobStatuses,
      simulatedData: {
        activeSessions: this.simulatedData.userSessions.size,
        queues: this.simulatedData.processingQueues
      }
    };
  }

  // Method to trigger jobs manually for testing
  async triggerJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job '${jobName}' not found`);
    }
    
    logger.info(`Manually triggering job '${jobName}'`);
    
    switch (jobName) {
      case 'sample-processing':
        await this.simulateSampleProcessing();
        break;
      case 'api-traffic':
        await this.generateApiTraffic();
        break;
      case 'batch-processing':
        await this.simulateBatchProcessing();
        break;
      case 'user-activity':
        await this.simulateUserActivity();
        break;
      case 'queue-updates':
        await this.updateProcessingQueues();
        break;
      case 'system-metrics':
        await this.updateSystemMetrics();
        break;
      case 'cleanup':
        await this.performCleanup();
        break;
      default:
        throw new Error(`Unknown job '${jobName}'`);
    }
  }
}

// Create singleton instance
const backgroundJobService = new BackgroundJobService();

module.exports = {
  backgroundJobService,
  BackgroundJobService
};
