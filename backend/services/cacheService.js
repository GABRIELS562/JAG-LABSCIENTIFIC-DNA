const { logger } = require('../utils/logger');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.maxSize = 1000; // Maximum number of cached items
    this.hitCount = 0;
    this.missCount = 0;
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  set(key, value, ttl = this.defaultTTL) {
    try {
      // Check cache size limit
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evictOldest();
      }

      const expiresAt = Date.now() + ttl;
      this.cache.set(key, {
        value,
        createdAt: Date.now(),
        expiresAt,
        accessCount: 0
      });
      this.ttlMap.set(key, expiresAt);

      logger.debug('Cache set', { key, ttl, size: this.cache.size });
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
    }
  }

  get(key) {
    try {
      if (!this.cache.has(key)) {
        this.missCount++;
        logger.debug('Cache miss', { key });
        return null;
      }

      const item = this.cache.get(key);
      
      // Check if expired
      if (Date.now() > item.expiresAt) {
        this.delete(key);
        this.missCount++;
        logger.debug('Cache miss (expired)', { key });
        return null;
      }

      // Update access count and hit count
      item.accessCount++;
      this.hitCount++;
      
      logger.debug('Cache hit', { key, accessCount: item.accessCount });
      return item.value;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  delete(key) {
    try {
      this.cache.delete(key);
      this.ttlMap.delete(key);
      logger.debug('Cache delete', { key });
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
    }
  }

  clear() {
    try {
      const size = this.cache.size;
      this.cache.clear();
      this.ttlMap.clear();
      this.hitCount = 0;
      this.missCount = 0;
      logger.info('Cache cleared', { previousSize: size });
    } catch (error) {
      logger.error('Cache clear error', { error: error.message });
    }
  }

  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const item = this.cache.get(key);
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  cleanup() {
    try {
      const now = Date.now();
      let expiredCount = 0;

      for (const [key, expiresAt] of this.ttlMap.entries()) {
        if (now > expiresAt) {
          this.delete(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        logger.debug('Cache cleanup completed', { 
          expiredCount, 
          remainingSize: this.cache.size 
        });
      }
    } catch (error) {
      logger.error('Cache cleanup error', { error: error.message });
    }
  }

  evictOldest() {
    try {
      // Find the oldest entry by creation time
      let oldestKey = null;
      let oldestTime = Date.now();

      for (const [key, item] of this.cache.entries()) {
        if (item.createdAt < oldestTime) {
          oldestTime = item.createdAt;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.delete(oldestKey);
        logger.debug('Cache evicted oldest entry', { key: oldestKey });
      }
    } catch (error) {
      logger.error('Cache eviction error', { error: error.message });
    }
  }

  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
      maxSize: this.maxSize
    };
  }

  // Method for caching function results
  async memoize(key, asyncFunction, ttl = this.defaultTTL) {
    try {
      // Check cache first
      const cached = this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await asyncFunction();
      this.set(key, result, ttl);
      
      return result;
    } catch (error) {
      logger.error('Cache memoize error', { key, error: error.message });
      throw error;
    }
  }

  // Generate cache key from object
  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  // Cache middleware for database queries
  createQueryCache(ttl = this.defaultTTL) {
    return (query, params = []) => {
      const key = this.generateKey('query', { query, params });
      return this.memoize(key, () => {
        // This would be implemented by the database service
        throw new Error('Query function must be provided');
      }, ttl);
    };
  }

  // Destroy cache service
  destroy() {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      this.clear();
      logger.info('Cache service destroyed');
    } catch (error) {
      logger.error('Cache destroy error', { error: error.message });
    }
  }
}

// Cache middleware for Express routes
const cacheMiddleware = (cacheService, options = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    condition = () => true,
    vary = []
  } = options;

  return (req, res, next) => {
    // Only cache GET requests by default
    if (req.method !== 'GET' || !condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cached = cacheService.get(cacheKey);

    if (cached) {
      // Set cache headers
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${Math.floor(ttl / 1000)}`);
      
      // Set Vary headers
      if (vary.length > 0) {
        res.set('Vary', vary.join(', '));
      }

      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cacheService.set(cacheKey, body, ttl);
      }
      
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

// Create singleton instance
const cacheService = new CacheService();

module.exports = {
  CacheService,
  cacheService,
  cacheMiddleware
};