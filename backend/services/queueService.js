const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const RedisCache = require('./redisCache');

/**
 * Queue Service for background processing
 * Supports both in-memory and Redis-backed queues
 */
class QueueService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      backend: options.backend || 'memory', // 'memory' or 'redis'
      concurrency: options.concurrency || 5,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      jobTimeout: options.jobTimeout || 30000,
      persistence: options.persistence || false,
      persistencePath: options.persistencePath || path.join(__dirname, '../temp/queue-state.json'),
      cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
      maxQueueSize: options.maxQueueSize || 10000,
      redis: options.redis || {}
    };

    this.queues = new Map();
    this.workers = new Map();
    this.activeJobs = new Map();
    this.redisClient = null;
    this.isStarted = false;
    
    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      retriedJobs: 0,
      activeJobs: 0,
      queueSizes: {},
      processingTimes: {},
      workerUtilization: {}
    };

    if (this.config.backend === 'redis') {
      this.initializeRedis();
    }

    if (this.config.persistence) {
      this.loadPersistedState();
    }
  }

  async initializeRedis() {
    try {
      this.redisClient = new RedisCache(this.config.redis);
      await this.redisClient.connect();
      
      // Subscribe to job completion events
      await this.redisClient.subscribe('queue:*', (message, channel) => {
        this.handleRedisMessage(message, channel);
      });
      
      logger.info('Queue service connected to Redis backend');
    } catch (error) {
      logger.error('Failed to initialize Redis backend for queue service', error);
      // Fallback to memory backend
      this.config.backend = 'memory';
    }
  }

  handleRedisMessage(message, channel) {
    try {
      const data = JSON.parse(message);
      this.emit(data.event, data.payload);
    } catch (error) {
      logger.error('Failed to parse Redis queue message', { message, channel, error: error.message });
    }
  }

  createQueue(name, options = {}) {
    if (this.queues.has(name)) {
      throw new Error(`Queue ${name} already exists`);
    }

    const queue = {
      name,
      jobs: [],
      processing: false,
      paused: false,
      concurrency: options.concurrency || this.config.concurrency,
      retryAttempts: options.retryAttempts || this.config.retryAttempts,
      retryDelay: options.retryDelay || this.config.retryDelay,
      jobTimeout: options.jobTimeout || this.config.jobTimeout,
      processor: options.processor || null,
      middleware: options.middleware || [],
      created: Date.now(),
      stats: {
        added: 0,
        completed: 0,
        failed: 0,
        retried: 0,
        waiting: 0,
        active: 0
      }
    };

    this.queues.set(name, queue);
    this.metrics.queueSizes[name] = 0;
    this.metrics.processingTimes[name] = { avg: 0, min: 0, max: 0, total: 0 };

    logger.info('Queue created', { name, config: options });
    this.emit('queue:created', { name, queue });

    return this.getQueueInterface(name);
  }

  getQueue(name) {
    if (!this.queues.has(name)) {
      throw new Error(`Queue ${name} does not exist`);
    }
    return this.getQueueInterface(name);
  }

  getQueueInterface(name) {
    const queue = this.queues.get(name);
    
    return {
      name,
      add: (data, options = {}) => this.addJob(name, data, options),
      process: (processor) => this.setProcessor(name, processor),
      pause: () => this.pauseQueue(name),
      resume: () => this.resumeQueue(name),
      drain: () => this.drainQueue(name),
      clean: (grace = 0) => this.cleanQueue(name, grace),
      getStats: () => queue.stats,
      getJobs: (status) => this.getJobs(name, status),
      removeJob: (jobId) => this.removeJob(name, jobId),
      retryJob: (jobId) => this.retryJob(name, jobId)
    };
  }

  async addJob(queueName, data, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    if (queue.jobs.length >= this.config.maxQueueSize) {
      throw new Error(`Queue ${queueName} is full (max size: ${this.config.maxQueueSize})`);
    }

    const job = {
      id: this.generateJobId(),
      queueName,
      data,
      options: {
        delay: options.delay || 0,
        priority: options.priority || 0,
        attempts: options.attempts || queue.retryAttempts,
        backoff: options.backoff || queue.retryDelay,
        removeOnComplete: options.removeOnComplete || false,
        removeOnFail: options.removeOnFail || false,
        ...options
      },
      status: 'waiting',
      progress: 0,
      attempts: 0,
      failedReason: null,
      finishedOn: null,
      processedOn: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Handle delayed jobs
    if (job.options.delay > 0) {
      job.status = 'delayed';
      job.delayedUntil = Date.now() + job.options.delay;
    }

    // Insert job based on priority
    this.insertJobByPriority(queue, job);
    
    queue.stats.added++;
    queue.stats.waiting++;
    this.metrics.totalJobs++;
    this.metrics.queueSizes[queueName] = queue.jobs.length;

    if (this.config.backend === 'redis') {
      await this.persistJobToRedis(job);
    }

    logger.debug('Job added to queue', {
      queueName,
      jobId: job.id,
      priority: job.options.priority,
      delay: job.options.delay
    });

    this.emit('job:added', job);
    
    // Start processing if not already running
    if (!queue.processing && !queue.paused) {
      this.processQueue(queueName);
    }

    return job;
  }

  insertJobByPriority(queue, job) {
    const priority = job.options.priority;
    let insertIndex = queue.jobs.length;

    // Find insertion point based on priority (higher priority first)
    for (let i = 0; i < queue.jobs.length; i++) {
      if (queue.jobs[i].options.priority < priority) {
        insertIndex = i;
        break;
      }
    }

    queue.jobs.splice(insertIndex, 0, job);
  }

  setProcessor(queueName, processor) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    queue.processor = processor;
    
    if (!queue.processing && !queue.paused && queue.jobs.length > 0) {
      this.processQueue(queueName);
    }
  }

  async processQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue || queue.processing || queue.paused || !queue.processor) {
      return;
    }

    queue.processing = true;
    
    try {
      while (queue.jobs.length > 0 && !queue.paused) {
        const activeWorkers = this.getActiveWorkers(queueName);
        
        if (activeWorkers >= queue.concurrency) {
          break;
        }

        const job = this.getNextJob(queue);
        if (!job) {
          break;
        }

        // Process job in parallel
        this.processJob(queueName, job);
      }
    } finally {
      queue.processing = false;
    }
  }

  getNextJob(queue) {
    const now = Date.now();
    
    // Find first job that's ready to process
    for (let i = 0; i < queue.jobs.length; i++) {
      const job = queue.jobs[i];
      
      if (job.status === 'waiting' || 
          (job.status === 'delayed' && job.delayedUntil <= now)) {
        
        // Remove job from queue
        queue.jobs.splice(i, 1);
        queue.stats.waiting--;
        
        return job;
      }
    }
    
    return null;
  }

  async processJob(queueName, job) {
    const queue = this.queues.get(queueName);
    const workerId = this.generateWorkerId();
    
    try {
      // Mark job as active
      job.status = 'active';
      job.processedOn = Date.now();
      job.attempts++;
      job.updatedAt = Date.now();
      
      queue.stats.active++;
      this.metrics.activeJobs++;
      this.activeJobs.set(job.id, job);
      
      // Track worker
      this.workers.set(workerId, {
        id: workerId,
        queueName,
        jobId: job.id,
        startTime: Date.now(),
        status: 'processing'
      });

      logger.debug('Processing job', {
        queueName,
        jobId: job.id,
        workerId,
        attempts: job.attempts
      });

      this.emit('job:active', job);

      // Apply middleware
      await this.applyMiddleware(queue, job, 'before');

      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job timeout after ${queue.jobTimeout}ms`));
        }, queue.jobTimeout);
      });

      // Process job with timeout
      const processingPromise = queue.processor(job);
      const result = await Promise.race([processingPromise, timeoutPromise]);

      // Apply middleware
      await this.applyMiddleware(queue, job, 'after', result);

      // Mark job as completed
      job.status = 'completed';
      job.result = result;
      job.finishedOn = Date.now();
      job.updatedAt = Date.now();

      const processingTime = job.finishedOn - job.processedOn;
      this.updateProcessingTimeMetrics(queueName, processingTime);

      queue.stats.active--;
      queue.stats.completed++;
      this.metrics.activeJobs--;
      this.metrics.completedJobs++;

      logger.debug('Job completed', {
        queueName,
        jobId: job.id,
        workerId,
        processingTime
      });

      this.emit('job:completed', job);

      // Remove job if configured
      if (job.options.removeOnComplete) {
        this.activeJobs.delete(job.id);
      }

    } catch (error) {
      await this.handleJobFailure(queueName, job, error, workerId);
    } finally {
      // Cleanup worker
      this.workers.delete(workerId);
      
      // Continue processing queue
      setImmediate(() => this.processQueue(queueName));
    }
  }

  async handleJobFailure(queueName, job, error, workerId) {
    const queue = this.queues.get(queueName);
    
    job.failedReason = error.message;
    job.updatedAt = Date.now();
    
    logger.error('Job failed', {
      queueName,
      jobId: job.id,
      workerId,
      attempts: job.attempts,
      error: error.message
    });

    // Apply error middleware
    await this.applyMiddleware(queue, job, 'error', error);

    // Retry logic
    if (job.attempts < job.options.attempts) {
      job.status = 'waiting';
      
      // Calculate backoff delay
      const delay = this.calculateBackoffDelay(job);
      if (delay > 0) {
        job.status = 'delayed';
        job.delayedUntil = Date.now() + delay;
      }

      // Re-add job to queue
      this.insertJobByPriority(queue, job);
      
      queue.stats.retried++;
      this.metrics.retriedJobs++;
      
      this.emit('job:retrying', job);
      
    } else {
      // Mark as failed
      job.status = 'failed';
      job.finishedOn = Date.now();
      
      queue.stats.active--;
      queue.stats.failed++;
      this.metrics.activeJobs--;
      this.metrics.failedJobs++;
      
      this.emit('job:failed', job);
      
      // Remove job if configured
      if (job.options.removeOnFail) {
        this.activeJobs.delete(job.id);
      }
    }
  }

  calculateBackoffDelay(job) {
    const { backoff } = job.options;
    
    if (typeof backoff === 'number') {
      return backoff;
    }
    
    if (typeof backoff === 'object') {
      const { type, delay, multiplier = 2 } = backoff;
      
      switch (type) {
        case 'exponential':
          return delay * Math.pow(multiplier, job.attempts - 1);
        case 'linear':
          return delay * job.attempts;
        case 'fixed':
        default:
          return delay;
      }
    }
    
    return 0;
  }

  async applyMiddleware(queue, job, phase, data = null) {
    for (const middleware of queue.middleware) {
      if (typeof middleware[phase] === 'function') {
        try {
          await middleware[phase](job, data);
        } catch (error) {
          logger.error('Middleware error', {
            queueName: queue.name,
            jobId: job.id,
            phase,
            error: error.message
          });
        }
      }
    }
  }

  pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.paused = true;
      this.emit('queue:paused', { name: queueName });
      logger.info('Queue paused', { queueName });
    }
  }

  resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.paused = false;
      this.emit('queue:resumed', { name: queueName });
      logger.info('Queue resumed', { queueName });
      
      if (!queue.processing && queue.jobs.length > 0) {
        this.processQueue(queueName);
      }
    }
  }

  async drainQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    // Wait for all active jobs to complete
    while (this.getActiveWorkers(queueName) > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear remaining jobs
    queue.jobs = [];
    queue.stats.waiting = 0;
    this.metrics.queueSizes[queueName] = 0;

    this.emit('queue:drained', { name: queueName });
    logger.info('Queue drained', { queueName });
  }

  cleanQueue(queueName, grace = 0) {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    const cutoff = Date.now() - grace;
    let removedCount = 0;

    // Remove completed and failed jobs older than grace period
    queue.jobs = queue.jobs.filter(job => {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.finishedOn && job.finishedOn < cutoff) {
        removedCount++;
        return false;
      }
      return true;
    });

    this.metrics.queueSizes[queueName] = queue.jobs.length;

    logger.info('Queue cleaned', { queueName, removedJobs: removedCount });
    return removedCount;
  }

  getJobs(queueName, status = null) {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    if (status) {
      return queue.jobs.filter(job => job.status === status);
    }

    return [...queue.jobs];
  }

  removeJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const jobIndex = queue.jobs.findIndex(job => job.id === jobId);
    if (jobIndex !== -1) {
      const job = queue.jobs[jobIndex];
      queue.jobs.splice(jobIndex, 1);
      
      if (job.status === 'waiting') {
        queue.stats.waiting--;
      }
      
      this.metrics.queueSizes[queueName] = queue.jobs.length;
      this.emit('job:removed', job);
      
      return true;
    }

    return false;
  }

  retryJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const job = queue.jobs.find(job => job.id === jobId);
    if (job && job.status === 'failed') {
      job.status = 'waiting';
      job.attempts = 0;
      job.failedReason = null;
      job.updatedAt = Date.now();
      
      queue.stats.failed--;
      queue.stats.waiting++;
      
      this.emit('job:retrying', job);
      
      if (!queue.processing && !queue.paused) {
        this.processQueue(queueName);
      }
      
      return true;
    }

    return false;
  }

  getActiveWorkers(queueName) {
    return Array.from(this.workers.values())
      .filter(worker => worker.queueName === queueName).length;
  }

  updateProcessingTimeMetrics(queueName, time) {
    const metrics = this.metrics.processingTimes[queueName];
    
    if (metrics.total === 0) {
      metrics.min = time;
      metrics.max = time;
      metrics.avg = time;
    } else {
      metrics.min = Math.min(metrics.min, time);
      metrics.max = Math.max(metrics.max, time);
      metrics.avg = (metrics.avg * metrics.total + time) / (metrics.total + 1);
    }
    
    metrics.total++;
  }

  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateWorkerId() {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async persistJobToRedis(job) {
    if (this.redisClient) {
      const key = `queue:${job.queueName}:job:${job.id}`;
      await this.redisClient.set(key, job, 3600); // 1 hour TTL
    }
  }

  loadPersistedState() {
    try {
      if (fs.existsSync(this.config.persistencePath)) {
        const state = JSON.parse(fs.readFileSync(this.config.persistencePath, 'utf8'));
        
        for (const [queueName, queueData] of Object.entries(state.queues || {})) {
          if (!this.queues.has(queueName)) {
            this.createQueue(queueName);
          }
          
          const queue = this.queues.get(queueName);
          queue.jobs = queueData.jobs || [];
          queue.stats = queueData.stats || queue.stats;
        }
        
        logger.info('Queue state loaded from persistence', {
          path: this.config.persistencePath,
          queues: Object.keys(state.queues || {}).length
        });
      }
    } catch (error) {
      logger.warn('Failed to load persisted queue state', error);
    }
  }

  savePersistedState() {
    if (!this.config.persistence) return;

    try {
      const state = {
        timestamp: Date.now(),
        queues: {}
      };

      for (const [queueName, queue] of this.queues) {
        state.queues[queueName] = {
          jobs: queue.jobs,
          stats: queue.stats
        };
      }

      const dir = path.dirname(this.config.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.config.persistencePath, JSON.stringify(state, null, 2));
    } catch (error) {
      logger.error('Failed to save queue state', error);
    }
  }

  getMetrics() {
    // Update current queue sizes
    for (const [queueName, queue] of this.queues) {
      this.metrics.queueSizes[queueName] = queue.jobs.length;
      this.metrics.workerUtilization[queueName] = {
        active: this.getActiveWorkers(queueName),
        max: queue.concurrency,
        utilization: (this.getActiveWorkers(queueName) / queue.concurrency * 100).toFixed(2) + '%'
      };
    }

    return {
      ...this.metrics,
      queues: Array.from(this.queues.entries()).map(([name, queue]) => ({
        name,
        stats: queue.stats,
        paused: queue.paused,
        processing: queue.processing,
        concurrency: queue.concurrency,
        jobCount: queue.jobs.length
      })),
      workers: Array.from(this.workers.values()),
      backend: this.config.backend,
      timestamp: Date.now()
    };
  }

  async start() {
    if (this.isStarted) return;

    this.isStarted = true;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      for (const queueName of this.queues.keys()) {
        this.cleanQueue(queueName, 24 * 60 * 60 * 1000); // Clean jobs older than 24 hours
      }
      
      if (this.config.persistence) {
        this.savePersistedState();
      }
    }, this.config.cleanupInterval);

    logger.info('Queue service started', {
      backend: this.config.backend,
      queues: this.queues.size
    });

    this.emit('service:started');
  }

  async stop() {
    if (!this.isStarted) return;

    this.isStarted = false;

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Drain all queues
    const drainPromises = [];
    for (const queueName of this.queues.keys()) {
      drainPromises.push(this.drainQueue(queueName));
    }
    await Promise.all(drainPromises);

    // Save state if persistence is enabled
    if (this.config.persistence) {
      this.savePersistedState();
    }

    // Disconnect Redis if used
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }

    logger.info('Queue service stopped');
    this.emit('service:stopped');
  }
}

module.exports = QueueService;