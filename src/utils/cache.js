// Advanced caching utilities for frontend performance optimization

/**
 * Memory Cache with TTL (Time To Live) support
 */
class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.timers = new Map();
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.onEvict = options.onEvict || (() => {});
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    // If cache is full, evict oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
      this.stats.evictions++;
    }

    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    });

    // Set TTL timer if specified
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }

    this.stats.sets++;
    return this;
  }

  /**
   * Get a value from cache
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access count and move to end (LRU behavior)
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key from cache
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      
      this.onEvict(key, entry.value);
      this.stats.deletes++;
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    const size = this.cache.size;
    this.cache.clear();
    this.timers.clear();
    
    this.stats.deletes += size;
    return this;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 ? 
      (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`,
      maxSize: this.maxSize
    };
  }

  /**
   * Get all keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }
}

/**
 * Browser Storage Cache (localStorage/sessionStorage)
 */
class StorageCache {
  constructor(storage = localStorage, options = {}) {
    this.storage = storage;
    this.prefix = options.prefix || 'lims_cache_';
    this.defaultTTL = options.defaultTTL || 24 * 60 * 60 * 1000; // 24 hours
    this.maxSize = options.maxSize || 50;
    this.compress = options.compress || false;
  }

  /**
   * Generate storage key with prefix
   */
  _getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Set value in storage
   */
  set(key, value, ttl = this.defaultTTL) {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        ttl,
        version: '1.0'
      };

      let serialized = JSON.stringify(item);
      
      // Simple compression if enabled
      if (this.compress && serialized.length > 1000) {
        // Basic string compression by removing extra whitespace
        serialized = serialized.replace(/\s+/g, ' ');
      }

      this.storage.setItem(this._getKey(key), serialized);
      
      // Clean up old entries if we exceed max size
      this._cleanup();
      
      return this;
    } catch (error) {
      console.warn('Failed to set cache item:', error);
      return this;
    }
  }

  /**
   * Get value from storage
   */
  get(key) {
    try {
      const serialized = this.storage.getItem(this._getKey(key));
      
      if (!serialized) {
        return undefined;
      }

      const item = JSON.parse(serialized);
      
      // Check if expired
      if (item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
        this.delete(key);
        return undefined;
      }

      return item.value;
    } catch (error) {
      console.warn('Failed to get cache item:', error);
      this.delete(key); // Remove corrupted entry
      return undefined;
    }
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Delete key from storage
   */
  delete(key) {
    try {
      this.storage.removeItem(this._getKey(key));
      return true;
    } catch (error) {
      console.warn('Failed to delete cache item:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    try {
      const keys = this.keys();
      keys.forEach(key => {
        this.storage.removeItem(key);
      });
      return this;
    } catch (error) {
      console.warn('Failed to clear cache:', error);
      return this;
    }
  }

  /**
   * Get all cache keys
   */
  keys() {
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Clean up expired or excess entries
   */
  _cleanup() {
    try {
      const keys = this.keys();
      const items = [];

      // Collect all items with their timestamps
      keys.forEach(fullKey => {
        const serialized = this.storage.getItem(fullKey);
        if (serialized) {
          try {
            const item = JSON.parse(serialized);
            items.push({
              key: fullKey,
              timestamp: item.timestamp,
              ttl: item.ttl,
              expired: item.ttl > 0 && Date.now() - item.timestamp > item.ttl
            });
          } catch (e) {
            // Remove corrupted entries
            this.storage.removeItem(fullKey);
          }
        }
      });

      // Remove expired items
      items.filter(item => item.expired).forEach(item => {
        this.storage.removeItem(item.key);
      });

      // Remove oldest items if we exceed maxSize
      const validItems = items.filter(item => !item.expired);
      if (validItems.length > this.maxSize) {
        validItems
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, validItems.length - this.maxSize)
          .forEach(item => {
            this.storage.removeItem(item.key);
          });
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const keys = this.keys();
    let totalSize = 0;
    let expiredCount = 0;

    keys.forEach(key => {
      try {
        const value = this.storage.getItem(key);
        if (value) {
          totalSize += value.length;
          const item = JSON.parse(value);
          if (item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
            expiredCount++;
          }
        }
      } catch (e) {
        // Ignore corrupted entries
      }
    });

    return {
      count: keys.length,
      expiredCount,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      maxSize: this.maxSize,
      storage: this.storage === localStorage ? 'localStorage' : 'sessionStorage'
    };
  }
}

/**
 * Multi-level cache combining memory and storage
 */
class MultiLevelCache {
  constructor(options = {}) {
    this.memoryCache = new MemoryCache(options.memory || {});
    this.storageCache = new StorageCache(
      options.storage?.type || localStorage,
      options.storage || {}
    );
    this.fallbackToStorage = options.fallbackToStorage !== false;
  }

  /**
   * Set value in both caches
   */
  set(key, value, ttl) {
    this.memoryCache.set(key, value, ttl);
    
    if (this.fallbackToStorage) {
      this.storageCache.set(key, value, ttl);
    }
    
    return this;
  }

  /**
   * Get value from memory first, then storage
   */
  get(key) {
    let value = this.memoryCache.get(key);
    
    if (value === undefined && this.fallbackToStorage) {
      value = this.storageCache.get(key);
      
      // Restore to memory cache if found in storage
      if (value !== undefined) {
        this.memoryCache.set(key, value);
      }
    }
    
    return value;
  }

  /**
   * Check if key exists in either cache
   */
  has(key) {
    return this.memoryCache.has(key) || 
           (this.fallbackToStorage && this.storageCache.has(key));
  }

  /**
   * Delete from both caches
   */
  delete(key) {
    const memoryDeleted = this.memoryCache.delete(key);
    const storageDeleted = this.fallbackToStorage ? this.storageCache.delete(key) : false;
    
    return memoryDeleted || storageDeleted;
  }

  /**
   * Clear both caches
   */
  clear() {
    this.memoryCache.clear();
    
    if (this.fallbackToStorage) {
      this.storageCache.clear();
    }
    
    return this;
  }

  /**
   * Get combined statistics
   */
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      storage: this.fallbackToStorage ? this.storageCache.getStats() : null
    };
  }
}

/**
 * Request cache for API calls
 */
class RequestCache {
  constructor(options = {}) {
    this.cache = new MultiLevelCache(options);
    this.pendingRequests = new Map();
  }

  /**
   * Generate cache key for request
   */
  generateKey(url, options = {}) {
    const { method = 'GET', body, headers } = options;
    const keyData = {
      url,
      method,
      body: body ? JSON.stringify(body) : null,
      headers: headers ? JSON.stringify(headers) : null
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[+/=]/g, '');
  }

  /**
   * Get cached response or execute request
   */
  async fetch(url, options = {}, cacheOptions = {}) {
    const { ttl = 5 * 60 * 1000, force = false } = cacheOptions; // 5 minute default
    const key = this.generateKey(url, options);

    // Return cached result if available and not forced
    if (!force) {
      const cached = this.cache.get(key);
      if (cached !== undefined) {
        return Promise.resolve(cached);
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Execute request
    const requestPromise = this._executeRequest(url, options)
      .then(result => {
        // Cache successful result
        this.cache.set(key, result, ttl);
        return result;
      })
      .catch(error => {
        // Don't cache errors, but let them propagate
        throw error;
      })
      .finally(() => {
        // Remove from pending requests
        this.pendingRequests.delete(key);
      });

    // Store pending request
    this.pendingRequests.set(key, requestPromise);
    
    return requestPromise;
  }

  /**
   * Execute the actual HTTP request
   */
  async _executeRequest(url, options) {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  }

  /**
   * Invalidate cache for specific pattern
   */
  invalidate(pattern) {
    if (typeof pattern === 'string') {
      this.cache.delete(pattern);
    } else if (pattern instanceof RegExp) {
      const memoryKeys = this.cache.memoryCache.keys();
      const storageKeys = this.cache.storageCache.keys();
      
      [...memoryKeys, ...storageKeys].forEach(key => {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      });
    }
  }

  /**
   * Clear all cached requests
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
    return this;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cache.getStats(),
      pendingRequests: this.pendingRequests.size
    };
  }
}

/**
 * React Hook for cached API calls
 */
export function useCachedApi(url, options = {}, cacheOptions = {}) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  const cache = React.useMemo(() => new RequestCache(), []);
  
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await cache.fetch(url, options, cacheOptions);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [cache, url, options, cacheOptions]);
  
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const refetch = React.useCallback(() => {
    return cache.fetch(url, options, { ...cacheOptions, force: true });
  }, [cache, url, options, cacheOptions]);
  
  return { data, loading, error, refetch };
}

// Global cache instances
export const memoryCache = new MemoryCache({ maxSize: 200 });
export const persistentCache = new StorageCache(localStorage, { maxSize: 100 });
export const sessionCache = new StorageCache(sessionStorage, { maxSize: 50 });
export const requestCache = new RequestCache();

// Export classes for custom implementations
export {
  MemoryCache,
  StorageCache,
  MultiLevelCache,
  RequestCache
};

// Utility functions
export const cacheUtils = {
  /**
   * Create a memoized version of a function
   */
  memoize(fn, getKey = (...args) => JSON.stringify(args)) {
    const cache = new MemoryCache({ maxSize: 100 });
    
    return function memoized(...args) {
      const key = getKey(...args);
      let result = cache.get(key);
      
      if (result === undefined) {
        result = fn.apply(this, args);
        cache.set(key, result);
      }
      
      return result;
    };
  },

  /**
   * Create a debounced cache setter
   */
  debouncedSet(cache, delay = 300) {
    const timeouts = new Map();
    
    return (key, value, ttl) => {
      if (timeouts.has(key)) {
        clearTimeout(timeouts.get(key));
      }
      
      const timeoutId = setTimeout(() => {
        cache.set(key, value, ttl);
        timeouts.delete(key);
      }, delay);
      
      timeouts.set(key, timeoutId);
    };
  },

  /**
   * Batch cache operations
   */
  batch(cache) {
    const operations = [];
    
    return {
      set(key, value, ttl) {
        operations.push({ type: 'set', key, value, ttl });
        return this;
      },
      
      delete(key) {
        operations.push({ type: 'delete', key });
        return this;
      },
      
      execute() {
        operations.forEach(op => {
          if (op.type === 'set') {
            cache.set(op.key, op.value, op.ttl);
          } else if (op.type === 'delete') {
            cache.delete(op.key);
          }
        });
        operations.length = 0;
      }
    };
  }
};

export default {
  MemoryCache,
  StorageCache,
  MultiLevelCache,
  RequestCache,
  memoryCache,
  persistentCache,
  sessionCache,
  requestCache,
  cacheUtils,
  useCachedApi
};