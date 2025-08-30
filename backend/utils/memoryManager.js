const { logger } = require('./logger');
const { LRUCache } = require('lru-cache');

/**
 * Memory Management Utilities
 * Handles memory monitoring, caching, and optimization
 */
class MemoryManager {
  constructor() {
    this.caches = new Map();
    this.memoryThreshold = 0.8; // 80% memory threshold
    this.gcInterval = null;
    this.monitoringInterval = null;
    this.isMonitoring = false;
    
    // Performance optimization flags
    this.optimizations = {
      enableGC: true,
      enableCaching: true,
      enableStreaming: true,
      enableMemoryLimits: true
    };
  }

  /**
   * Initialize memory management with monitoring
   */
  initialize(options = {}) {
    this.memoryThreshold = options.memoryThreshold || 0.8;
    this.optimizations = { ...this.optimizations, ...options.optimizations };
    
    if (this.optimizations.enableGC) {
      this.startGarbageCollectionScheduler();
    }
    
    this.startMemoryMonitoring();
    
    logger.info('Memory manager initialized', {
      threshold: `${this.memoryThreshold * 100}%`,
      optimizations: this.optimizations
    });
  }

  /**
   * Create an LRU cache with memory-optimized settings
   */
  createCache(name, options = {}) {
    const defaultOptions = {
      max: 100,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: false,
      allowStale: false,
      dispose: (value, key) => {
        logger.debug(`Cache entry disposed: ${name}/${key}`);
      }
    };

    const cache = new LRUCache({ ...defaultOptions, ...options });
    this.caches.set(name, cache);
    
    logger.debug(`Created cache: ${name}`, { 
      maxSize: cache.max,
      ttl: cache.ttl 
    });
    
    return cache;
  }

  /**
   * Get or create a named cache
   */
  getCache(name, options = {}) {
    if (!this.caches.has(name)) {
      return this.createCache(name, options);
    }
    return this.caches.get(name);
  }

  /**
   * Clear all caches or specific cache
   */
  clearCache(name = null) {
    if (name) {
      const cache = this.caches.get(name);
      if (cache) {
        cache.clear();
        logger.info(`Cache cleared: ${name}`);
      }
    } else {
      this.caches.forEach((cache, cacheName) => {
        cache.clear();
        logger.debug(`Cache cleared: ${cacheName}`);
      });
      logger.info('All caches cleared');
    }
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    const rss = usage.rss / 1024 / 1024; // MB
    const heapUsed = usage.heapUsed / 1024 / 1024; // MB
    const heapTotal = usage.heapTotal / 1024 / 1024; // MB
    const external = usage.external / 1024 / 1024; // MB
    
    return {
      rss: Math.round(rss * 100) / 100,
      heapUsed: Math.round(heapUsed * 100) / 100,
      heapTotal: Math.round(heapTotal * 100) / 100,
      external: Math.round(external * 100) / 100,
      heapUtilization: Math.round((heapUsed / heapTotal) * 100) / 100
    };
  }

  /**
   * Check if memory usage exceeds threshold
   */
  isMemoryHigh() {
    const usage = this.getMemoryUsage();
    return usage.heapUtilization > this.memoryThreshold;
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection() {
    if (global.gc && this.optimizations.enableGC) {
      const beforeGC = this.getMemoryUsage();
      global.gc();
      const afterGC = this.getMemoryUsage();
      
      logger.info('Forced garbage collection', {
        before: beforeGC,
        after: afterGC,
        freed: Math.round((beforeGC.heapUsed - afterGC.heapUsed) * 100) / 100
      });
      
      return {
        before: beforeGC,
        after: afterGC,
        freed: beforeGC.heapUsed - afterGC.heapUsed
      };
    }
    return null;
  }

  /**
   * Start periodic garbage collection
   */
  startGarbageCollectionScheduler() {
    if (this.gcInterval) return;
    
    this.gcInterval = setInterval(() => {
      if (this.isMemoryHigh()) {
        this.forceGarbageCollection();
        this.clearOldCacheEntries();
      }
    }, 60000); // Check every minute
    
    logger.info('Garbage collection scheduler started');
  }

  /**
   * Clear old cache entries to free memory
   */
  clearOldCacheEntries() {
    let totalCleared = 0;
    
    this.caches.forEach((cache, name) => {
      const sizeBefore = cache.size;
      cache.purgeStale();
      const sizeAfter = cache.size;
      const cleared = sizeBefore - sizeAfter;
      
      if (cleared > 0) {
        totalCleared += cleared;
        logger.debug(`Purged ${cleared} stale entries from cache: ${name}`);
      }
    });
    
    if (totalCleared > 0) {
      logger.info(`Purged ${totalCleared} stale cache entries`);
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      const usage = this.getMemoryUsage();
      
      if (usage.heapUtilization > 0.9) {
        logger.warn('High memory usage detected', usage);
        this.handleHighMemoryUsage(usage);
      }
      
      // Log memory stats periodically
      if (Math.random() < 0.1) { // 10% chance to log
        logger.debug('Memory usage stats', usage);
      }
    }, 30000); // Check every 30 seconds
    
    logger.info('Memory monitoring started');
  }

  /**
   * Handle high memory usage
   */
  handleHighMemoryUsage(usage) {
    logger.warn('Handling high memory usage', usage);
    
    // Clear caches aggressively
    this.caches.forEach((cache, name) => {
      if (cache.size > 10) {
        const sizeBefore = cache.size;
        cache.clear();
        logger.info(`Emergency cache clear: ${name} (${sizeBefore} entries)`);
      }
    });
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    // Set process memory limit warnings
    if (process.memoryUsage().rss > 500 * 1024 * 1024) { // 500MB
      logger.error('Process memory usage exceeds 500MB', {
        current: Math.round(process.memoryUsage().rss / 1024 / 1024),
        limit: 500
      });
    }
  }

  /**
   * Create a streaming helper for large data processing
   */
  createDataStream(data, chunkSize = 1000) {
    const { Readable } = require('stream');
    
    let index = 0;
    
    return new Readable({
      objectMode: true,
      read() {
        if (index >= data.length) {
          this.push(null);
          return;
        }
        
        const chunk = data.slice(index, index + chunkSize);
        index += chunkSize;
        this.push(chunk);
      }
    });
  }

  /**
   * Process large datasets in chunks to avoid memory spikes
   */
  async processInChunks(data, processFn, chunkSize = 100) {
    const results = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = await processFn(chunk);
      results.push(...chunkResults);
      
      // Allow garbage collection between chunks
      if (i % (chunkSize * 10) === 0 && global.gc) {
        global.gc();
      }
    }
    
    return results;
  }

  /**
   * Memory-safe JSON stringify with size limits
   */
  safeStringify(obj, maxSize = 1024 * 1024) { // 1MB default
    try {
      const str = JSON.stringify(obj);
      if (str.length > maxSize) {
        logger.warn('JSON stringify size exceeded limit', {
          size: str.length,
          limit: maxSize
        });
        return JSON.stringify({ 
          error: 'Data too large to serialize',
          originalSize: str.length,
          limit: maxSize 
        });
      }
      return str;
    } catch (error) {
      logger.error('JSON stringify failed', { error: error.message });
      return JSON.stringify({ error: 'Serialization failed' });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {};
    
    this.caches.forEach((cache, name) => {
      stats[name] = {
        size: cache.size,
        max: cache.max,
        ttl: cache.ttl,
        calculatedSize: cache.calculatedSize || 0
      };
    });
    
    return {
      totalCaches: this.caches.size,
      caches: stats,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Clean shutdown
   */
  shutdown() {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    this.clearCache();
    
    logger.info('Memory manager shutdown complete');
  }
}

// Create singleton instance
const memoryManager = new MemoryManager();

module.exports = {
  memoryManager,
  MemoryManager
};