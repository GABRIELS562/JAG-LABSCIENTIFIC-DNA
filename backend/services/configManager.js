const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

/**
 * Configuration Management System
 * Supports multiple config sources, hot reloading, and environment-specific configurations
 */
class ConfigManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Configuration sources in order of priority (higher index = higher priority)
      sources: options.sources || [
        { type: 'file', path: 'config/default.json' },
        { type: 'file', path: `config/${process.env.NODE_ENV || 'development'}.json` },
        { type: 'env', prefix: 'LIMS_' },
        { type: 'file', path: 'config/local.json' }
      ],
      // Base directory for relative config paths
      baseDir: options.baseDir || process.cwd(),
      // Hot reload configuration files
      hotReload: options.hotReload !== false,
      // Validation schema
      schema: options.schema || null,
      // Encryption for sensitive values
      encryption: options.encryption || null,
      // Cache configuration
      cache: options.cache !== false,
      // Freeze configuration object to prevent mutations
      freeze: options.freeze !== false
    };

    this.config = {};
    this.watchers = new Map();
    this.loadHistory = [];
    this.isLoaded = false;
    this.encryptionKey = options.encryptionKey || process.env.CONFIG_ENCRYPTION_KEY;
    
    // Configuration metadata
    this.metadata = {
      loadedAt: null,
      sources: [],
      version: 1,
      hash: null
    };

    // Setup default schema if none provided
    if (!this.options.schema) {
      this.setupDefaultSchema();
    }
  }

  setupDefaultSchema() {
    this.options.schema = {
      type: 'object',
      properties: {
        server: {
          type: 'object',
          properties: {
            port: { type: 'number', minimum: 1, maximum: 65535 },
            host: { type: 'string' },
            ssl: { type: 'boolean' }
          },
          required: ['port']
        },
        database: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['sqlite', 'postgresql', 'mysql'] },
            host: { type: 'string' },
            port: { type: 'number' },
            database: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
            ssl: { type: 'boolean' },
            pool: {
              type: 'object',
              properties: {
                min: { type: 'number', minimum: 0 },
                max: { type: 'number', minimum: 1 }
              }
            }
          },
          required: ['type']
        },
        redis: {
          type: 'object',
          properties: {
            host: { type: 'string' },
            port: { type: 'number' },
            password: { type: 'string' },
            db: { type: 'number', minimum: 0 }
          }
        },
        logging: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
            format: { type: 'string' },
            file: { type: 'string' }
          }
        }
      }
    };
  }

  async load() {
    logger.info('Loading configuration', {
      sources: this.options.sources.length,
      hotReload: this.options.hotReload
    });

    const startTime = Date.now();
    const loadedConfig = {};
    const sourcesMetadata = [];

    try {
      // Load configuration from all sources in order
      for (const source of this.options.sources) {
        try {
          const sourceConfig = await this.loadSource(source);
          const sourceMetadata = {
            type: source.type,
            path: source.path || source.prefix,
            loadedAt: Date.now(),
            keys: Object.keys(sourceConfig).length,
            size: JSON.stringify(sourceConfig).length
          };

          // Deep merge configuration
          this.deepMerge(loadedConfig, sourceConfig);
          sourcesMetadata.push(sourceMetadata);

          logger.debug('Configuration source loaded', sourceMetadata);

        } catch (error) {
          logger.warn('Failed to load configuration source', {
            source,
            error: error.message
          });

          // Continue loading other sources even if one fails
          sourcesMetadata.push({
            type: source.type,
            path: source.path || source.prefix,
            error: error.message,
            loadedAt: Date.now()
          });
        }
      }

      // Decrypt sensitive values
      if (this.encryptionKey) {
        this.decryptSensitiveValues(loadedConfig);
      }

      // Validate configuration
      if (this.options.schema) {
        this.validateConfig(loadedConfig);
      }

      // Update configuration
      this.config = this.options.freeze ? Object.freeze(this.deepClone(loadedConfig)) : loadedConfig;
      this.isLoaded = true;

      // Update metadata
      this.metadata = {
        loadedAt: Date.now(),
        sources: sourcesMetadata,
        version: this.metadata.version + 1,
        hash: this.generateConfigHash(this.config),
        loadTime: Date.now() - startTime
      };

      // Add to load history
      this.loadHistory.push({
        timestamp: this.metadata.loadedAt,
        version: this.metadata.version,
        hash: this.metadata.hash,
        sources: sourcesMetadata.length,
        success: true
      });

      // Setup hot reload watchers
      if (this.options.hotReload) {
        this.setupWatchers();
      }

      logger.info('Configuration loaded successfully', {
        version: this.metadata.version,
        sources: sourcesMetadata.length,
        keys: Object.keys(this.config).length,
        loadTime: this.metadata.loadTime
      });

      this.emit('config:loaded', {
        config: this.config,
        metadata: this.metadata
      });

      return this.config;

    } catch (error) {
      // Add failed load to history
      this.loadHistory.push({
        timestamp: Date.now(),
        version: this.metadata.version,
        sources: sourcesMetadata.length,
        success: false,
        error: error.message
      });

      logger.error('Failed to load configuration', error);
      this.emit('config:error', error);
      throw error;
    }
  }

  async loadSource(source) {
    switch (source.type) {
      case 'file':
        return await this.loadFileSource(source);
      case 'env':
        return this.loadEnvironmentSource(source);
      case 'url':
        return await this.loadUrlSource(source);
      case 'vault':
        return await this.loadVaultSource(source);
      default:
        throw new Error(`Unknown configuration source type: ${source.type}`);
    }
  }

  async loadFileSource(source) {
    const filePath = path.isAbsolute(source.path) ? 
      source.path : 
      path.join(this.options.baseDir, source.path);

    if (!fs.existsSync(filePath)) {
      if (source.required !== false) {
        throw new Error(`Configuration file not found: ${filePath}`);
      }
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.json':
        return JSON.parse(content);
      case '.yaml':
      case '.yml':
        return yaml.load(content);
      case '.js':
        // Clear require cache for hot reload
        delete require.cache[require.resolve(filePath)];
        return require(filePath);
      default:
        throw new Error(`Unsupported configuration file format: ${ext}`);
    }
  }

  loadEnvironmentSource(source) {
    const config = {};
    const prefix = source.prefix || '';
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.slice(prefix.length).toLowerCase();
        const keyPath = configKey.split('_');
        
        // Convert environment variable to nested object
        this.setNestedValue(config, keyPath, this.parseEnvValue(value));
      }
    }

    return config;
  }

  async loadUrlSource(source) {
    // Implementation for loading config from URL (HTTP/HTTPS)
    const fetch = require('node-fetch');
    
    const response = await fetch(source.url, {
      timeout: source.timeout || 5000,
      headers: source.headers || {}
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else if (contentType?.includes('application/yaml')) {
      const text = await response.text();
      return yaml.load(text);
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
  }

  async loadVaultSource(source) {
    // Implementation for loading config from HashiCorp Vault or similar
    // This is a placeholder - would need actual vault client
    throw new Error('Vault configuration source not implemented');
  }

  parseEnvValue(value) {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, return as string
      return value;
    }
  }

  setNestedValue(obj, keyPath, value) {
    let current = obj;
    
    for (let i = 0; i < keyPath.length - 1; i++) {
      const key = keyPath[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keyPath[keyPath.length - 1]] = value;
  }

  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  validateConfig(config) {
    if (!this.options.schema) return;

    // Simple validation - in production, use a library like Ajv
    const errors = this.validateObject(config, this.options.schema);
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  validateObject(obj, schema, path = '') {
    const errors = [];

    if (schema.type === 'object' && schema.properties) {
      // Check required properties
      if (schema.required) {
        for (const required of schema.required) {
          if (!(required in obj)) {
            errors.push(`Missing required property: ${path}${required}`);
          }
        }
      }

      // Validate properties
      for (const [key, value] of Object.entries(obj)) {
        const propertySchema = schema.properties[key];
        if (propertySchema) {
          const propertyPath = path ? `${path}.${key}` : key;
          errors.push(...this.validateValue(value, propertySchema, propertyPath));
        }
      }
    }

    return errors;
  }

  validateValue(value, schema, path) {
    const errors = [];

    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schema.type) {
        errors.push(`${path}: expected ${schema.type}, got ${actualType}`);
        return errors;
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: value must be one of ${schema.enum.join(', ')}`);
    }

    // Number validations
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path}: value ${value} is below minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path}: value ${value} is above maximum ${schema.maximum}`);
      }
    }

    // Object validation
    if (schema.type === 'object' && schema.properties) {
      errors.push(...this.validateObject(value, schema, path + '.'));
    }

    return errors;
  }

  decryptSensitiveValues(config) {
    // Recursively find and decrypt encrypted values
    // This is a placeholder - would need actual encryption implementation
    this.walkObject(config, (value, key) => {
      if (typeof value === 'string' && value.startsWith('encrypted:')) {
        // Decrypt the value
        return this.decrypt(value.slice(10));
      }
      return value;
    });
  }

  encrypt(value) {
    // Placeholder encryption implementation
    if (!this.encryptionKey) {
      throw new Error('Encryption key not provided');
    }
    // In production, use proper encryption like AES
    return Buffer.from(value).toString('base64');
  }

  decrypt(encryptedValue) {
    // Placeholder decryption implementation
    if (!this.encryptionKey) {
      throw new Error('Encryption key not provided');
    }
    // In production, use proper decryption like AES
    return Buffer.from(encryptedValue, 'base64').toString('utf8');
  }

  walkObject(obj, transformer) {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.walkObject(value, transformer);
      } else {
        obj[key] = transformer(value, key);
      }
    }
  }

  generateConfigHash(config) {
    const crypto = require('crypto');
    const configString = JSON.stringify(config);
    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  setupWatchers() {
    // Clear existing watchers
    this.clearWatchers();

    for (const source of this.options.sources) {
      if (source.type === 'file') {
        this.watchFile(source);
      }
    }
  }

  watchFile(source) {
    const filePath = path.isAbsolute(source.path) ? 
      source.path : 
      path.join(this.options.baseDir, source.path);

    if (!fs.existsSync(filePath)) {
      return;
    }

    try {
      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          logger.info('Configuration file changed, reloading', { path: filePath });
          this.reload();
        }
      });

      this.watchers.set(filePath, watcher);
      
      logger.debug('Watching configuration file', { path: filePath });

    } catch (error) {
      logger.warn('Failed to watch configuration file', {
        path: filePath,
        error: error.message
      });
    }
  }

  clearWatchers() {
    for (const [path, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        logger.warn('Failed to close file watcher', { path, error: error.message });
      }
    }
    this.watchers.clear();
  }

  async reload() {
    try {
      const oldHash = this.metadata.hash;
      await this.load();
      
      if (this.metadata.hash !== oldHash) {
        logger.info('Configuration reloaded with changes', {
          oldVersion: this.metadata.version - 1,
          newVersion: this.metadata.version
        });
        
        this.emit('config:changed', {
          oldHash,
          newHash: this.metadata.hash,
          config: this.config
        });
      }

    } catch (error) {
      logger.error('Configuration reload failed', error);
      this.emit('config:reload-error', error);
    }
  }

  get(key, defaultValue = undefined) {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    return this.getNestedValue(this.config, key, defaultValue);
  }

  getNestedValue(obj, key, defaultValue) {
    const keys = key.split('.');
    let current = obj;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  has(key) {
    if (!this.isLoaded) {
      return false;
    }

    return this.getNestedValue(this.config, key, Symbol('not-found')) !== Symbol('not-found');
  }

  getAll() {
    if (!this.isLoaded) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    return this.deepClone(this.config);
  }

  getMetadata() {
    return {
      ...this.metadata,
      loadHistory: this.loadHistory.slice(-10), // Last 10 loads
      watchers: Array.from(this.watchers.keys()),
      options: {
        hotReload: this.options.hotReload,
        cache: this.options.cache,
        freeze: this.options.freeze,
        sources: this.options.sources.length
      }
    };
  }

  async stop() {
    this.clearWatchers();
    this.emit('config:stopped');
    logger.info('Configuration manager stopped');
  }
}

module.exports = ConfigManager;