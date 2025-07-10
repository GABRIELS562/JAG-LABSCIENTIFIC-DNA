const redis = require('redis');
const logger = require('../utils/logger');

/**
 * Redis Cache Service for distributed caching
 * Provides high-performance caching with TTL and eviction policies
 */
class RedisCache {
  constructor(options = {}) {
    this.config = {
      host: options.host || process.env.REDIS_HOST || 'localhost',
      port: options.port || process.env.REDIS_PORT || 6379,
      password: options.password || process.env.REDIS_PASSWORD,
      db: options.db || process.env.REDIS_DB || 0,
      retryDelayOnFailover: options.retryDelayOnFailover || 100,
      maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
      lazyConnect: options.lazyConnect || true,
      keepAlive: options.keepAlive || 30000,
      family: options.family || 4,
      connectTimeout: options.connectTimeout || 10000,
      commandTimeout: options.commandTimeout || 5000
    };

    this.defaultTTL = options.defaultTTL || 3600; // 1 hour
    this.keyPrefix = options.keyPrefix || 'lims:';
    this.isConnected = false;
    this.client = null;
    this.subscriber = null;
    this.publisher = null;

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      avgResponseTime: 0,
      connectionCount: 0,
      lastError: null
    };

    this.eventHandlers = new Map();
  }

  async connect() {
    try {
      logger.info('Connecting to Redis cache', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db
      });

      // Create main client
      this.client = redis.createClient(this.config);
      
      // Create subscriber client for pub/sub
      this.subscriber = redis.createClient(this.config);
      
      // Create publisher client for pub/sub
      this.publisher = redis.createClient(this.config);

      // Setup event handlers
      this.setupEventHandlers();

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      this.isConnected = true;
      this.metrics.connectionCount++;

      logger.info('Redis cache connected successfully');

      // Setup cache warming
      await this.warmCache();

    } catch (error) {
      this.metrics.errors++;
      this.metrics.lastError = error.message;
      logger.error('Failed to connect to Redis cache', error);
      throw error;
    }
  }

  setupEventHandlers() {
    // Main client events
    this.client.on('error', (error) => {
      this.metrics.errors++;
      this.metrics.lastError = error.message;
      logger.error('Redis client error', error);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis client ready');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis client connection ended');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    // Subscriber events
    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error', error);
    });

    // Publisher events
    this.publisher.on('error', (error) => {
      logger.error('Redis publisher error', error);
    });
  }

  async warmCache() {
    try {
      logger.info('Warming Redis cache with frequently accessed data');

      // Warm cache with sample data
      const sampleQueries = [
        { key: 'samples:recent', data: 'SELECT * FROM samples ORDER BY created_at DESC LIMIT 50' },
        { key: 'batches:active', data: 'SELECT * FROM batches WHERE status = "active"' },
        { key: 'workflow:stats', data: 'Workflow statistics data' }
      ];

      const warmingPromises = sampleQueries.map(async (query) => {
        const key = this.buildKey(query.key);
        await this.set(key, query.data, 300); // 5 minutes TTL for warming
      });

      await Promise.all(warmingPromises);
      logger.info('Cache warming completed');

    } catch (error) {
      logger.warn('Cache warming failed', error);
    }
  }

  buildKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  async get(key) {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const fullKey = this.buildKey(key);
      const value = await this.client.get(fullKey);
      
      const duration = Date.now() - startTime;
      this.updateMetrics('get', duration);

      if (value !== null) {
        this.metrics.hits++;
        
        try {
          return JSON.parse(value);
        } catch {
          return value; // Return as string if not JSON
        }
      } else {
        this.metrics.misses++;
        return null;
      }

    } catch (error) {
      this.metrics.errors++;
      this.metrics.lastError = error.message;
      logger.error('Redis get operation failed', {
        key,
        error: error.message,
        duration: Date.now() - startTime
      });
      return null; // Graceful degradation
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const fullKey = this.buildKey(key);
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      let result;
      if (ttl > 0) {
        result = await this.client.setEx(fullKey, ttl, serializedValue);
      } else {
        result = await this.client.set(fullKey, serializedValue);
      }
      
      const duration = Date.now() - startTime;
      this.updateMetrics('set', duration);
      this.metrics.sets++;

      // Publish cache update event
      await this.publish('cache:update', { key: fullKey, operation: 'set' });

      return result === 'OK';

    } catch (error) {
      this.metrics.errors++;
      this.metrics.lastError = error.message;
      logger.error('Redis set operation failed', {
        key,
        error: error.message,
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async del(key) {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const fullKey = this.buildKey(key);
      const result = await this.client.del(fullKey);
      
      const duration = Date.now() - startTime;
      this.updateMetrics('del', duration);
      this.metrics.deletes++;

      // Publish cache update event
      await this.publish('cache:update', { key: fullKey, operation: 'delete' });

      return result > 0;

    } catch (error) {
      this.metrics.errors++;
      this.metrics.lastError = error.message;
      logger.error('Redis delete operation failed', {
        key,
        error: error.message,
        duration: Date.now() - startTime
      });
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const fullKey = this.buildKey(key);
      const result = await this.client.exists(fullKey);
      return result === 1;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis exists operation failed', { key, error: error.message });
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const fullKey = this.buildKey(key);
      const result = await this.client.expire(fullKey, ttl);
      return result === 1;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis expire operation failed', { key, error: error.message });
      return false;
    }
  }

  async ttl(key) {
    try {
      if (!this.isConnected) {
        return -1;
      }

      const fullKey = this.buildKey(key);
      return await this.client.ttl(fullKey);

    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis TTL operation failed', { key, error: error.message });
      return -1;
    }
  }

  async mget(keys) {
    try {
      if (!this.isConnected) {
        return [];
      }

      const fullKeys = keys.map(key => this.buildKey(key));
      const values = await this.client.mGet(fullKeys);
      
      return values.map(value => {
        if (value === null) {
          this.metrics.misses++;
          return null;
        }
        
        this.metrics.hits++;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });

    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis mget operation failed', { keys, error: error.message });
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const pipeline = this.client.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const fullKey = this.buildKey(key);
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (ttl > 0) {
          pipeline.setEx(fullKey, ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      }

      const results = await pipeline.exec();
      const success = results.every(result => result[1] === 'OK');
      
      if (success) {
        this.metrics.sets += Object.keys(keyValuePairs).length;
      }

      return success;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis mset operation failed', { error: error.message });
      return false;
    }
  }

  async keys(pattern) {
    try {
      if (!this.isConnected) {
        return [];
      }

      const fullPattern = this.buildKey(pattern);
      return await this.client.keys(fullPattern);

    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis keys operation failed', { pattern, error: error.message });
      return [];
    }
  }

  async flush() {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.flushDb();
      logger.info('Redis cache flushed');
      return true;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis flush operation failed', error);
      return false;
    }
  }

  async subscribe(pattern, callback) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis subscriber not connected');
      }

      await this.subscriber.pSubscribe(pattern, callback);
      this.eventHandlers.set(pattern, callback);
      
      logger.info('Subscribed to Redis pattern', { pattern });

    } catch (error) {
      logger.error('Redis subscribe failed', { pattern, error: error.message });
    }
  }

  async unsubscribe(pattern) {
    try {
      if (!this.isConnected) {
        return;
      }

      await this.subscriber.pUnsubscribe(pattern);
      this.eventHandlers.delete(pattern);
      
      logger.info('Unsubscribed from Redis pattern', { pattern });

    } catch (error) {
      logger.error('Redis unsubscribe failed', { pattern, error: error.message });
    }
  }

  async publish(channel, message) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      const result = await this.publisher.publish(channel, serializedMessage);
      
      return result > 0;

    } catch (error) {
      logger.error('Redis publish failed', { channel, error: error.message });
      return false;
    }
  }

  updateMetrics(operation, duration) {
    this.metrics.totalOperations++;
    
    if (this.metrics.totalOperations === 1) {
      this.metrics.avgResponseTime = duration;
    } else {
      this.metrics.avgResponseTime = (
        (this.metrics.avgResponseTime * (this.metrics.totalOperations - 1) + duration) / 
        this.metrics.totalOperations
      );
    }
  }

  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 ? 
      (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2) + '%' : '0%';

    return {
      ...this.metrics,
      hitRate,
      isConnected: this.isConnected,
      keyPrefix: this.keyPrefix,
      defaultTTL: this.defaultTTL
    };
  }

  async getInfo() {
    try {
      if (!this.isConnected) {
        return null;
      }

      const info = await this.client.info();
      return info;

    } catch (error) {
      logger.error('Failed to get Redis info', error);
      return null;
    }
  }

  async ping() {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.ping();
      return result === 'PONG';

    } catch (error) {
      return false;
    }
  }

  async disconnect() {
    try {
      logger.info('Disconnecting from Redis cache');

      if (this.client) {
        await this.client.quit();
      }
      
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      
      if (this.publisher) {
        await this.publisher.quit();
      }

      this.isConnected = false;
      logger.info('Redis cache disconnected');

    } catch (error) {
      logger.error('Error disconnecting from Redis cache', error);
    }
  }

  // Cache wrapper for database queries
  async cacheQuery(key, queryFunction, ttl = this.defaultTTL) {
    try {
      // Try to get from cache first
      const cachedResult = await this.get(key);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute query and cache result
      const result = await queryFunction();
      await this.set(key, result, ttl);
      
      return result;

    } catch (error) {
      logger.error('Cache query wrapper failed', { key, error: error.message });
      // Fallback to direct query execution
      return await queryFunction();
    }
  }

  // Invalidate cache by pattern
  async invalidatePattern(pattern) {
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        const pipeline = this.client.multi();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
        
        logger.info('Cache invalidated by pattern', { pattern, keysCount: keys.length });
      }
      
      return true;

    } catch (error) {
      logger.error('Cache invalidation failed', { pattern, error: error.message });
      return false;
    }
  }
}

module.exports = RedisCache;