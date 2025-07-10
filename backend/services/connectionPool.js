const Database = require('better-sqlite3');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Database Connection Pool for SQLite
 * Manages multiple database connections for improved performance
 */
class ConnectionPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.dbPath = options.dbPath || path.join(__dirname, '../database/ashley_lims.db');
    this.poolSize = options.poolSize || 10;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.idleTimeout = options.idleTimeout || 300000; // 5 minutes
    
    this.pool = [];
    this.activeConnections = new Set();
    this.waitingQueue = [];
    this.isInitialized = false;
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      waitingQueries: 0,
      totalQueries: 0,
      failedQueries: 0,
      avgQueryTime: 0,
      poolHits: 0,
      poolMisses: 0
    };
    
    // Connection health check interval
    this.healthCheckInterval = null;
    
    // Initialize pool
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('Initializing database connection pool', {
        dbPath: this.dbPath,
        poolSize: this.poolSize
      });

      // Ensure database file exists
      await this.ensureDatabaseExists();

      // Create initial connections
      for (let i = 0; i < this.poolSize; i++) {
        const connection = await this.createConnection();
        if (connection) {
          this.pool.push({
            id: i,
            connection,
            isActive: false,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            queryCount: 0
          });
        }
      }

      this.isInitialized = true;
      this.startHealthCheck();
      this.emit('initialized', { poolSize: this.pool.length });
      
      logger.info('Database connection pool initialized', {
        poolSize: this.pool.length,
        availableConnections: this.getAvailableConnections()
      });

    } catch (error) {
      logger.error('Failed to initialize connection pool', error);
      this.emit('error', error);
      throw error;
    }
  }

  async ensureDatabaseExists() {
    const dbDir = path.dirname(this.dbPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // If database doesn't exist, create it with schema
    if (!fs.existsSync(this.dbPath)) {
      logger.info('Database file not found, creating new database', { path: this.dbPath });
      
      const tempDb = new Database(this.dbPath);
      
      // Load and execute schema
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        tempDb.exec(schema);
        logger.info('Database schema applied');
      }
      
      tempDb.close();
    }
  }

  async createConnection() {
    try {
      const connection = new Database(this.dbPath, {
        readonly: false,
        fileMustExist: true,
        timeout: this.connectionTimeout
      });

      // Configure connection
      connection.pragma('journal_mode = WAL');
      connection.pragma('synchronous = NORMAL');
      connection.pragma('cache_size = 10000');
      connection.pragma('foreign_keys = ON');
      connection.pragma('temp_store = MEMORY');
      connection.pragma('mmap_size = 268435456'); // 256MB

      // Add connection health check
      connection.prepare('SELECT 1').get();

      this.metrics.totalConnections++;
      return connection;

    } catch (error) {
      logger.error('Failed to create database connection', error);
      this.metrics.failedQueries++;
      return null;
    }
  }

  async getConnection() {
    if (!this.isInitialized) {
      throw new Error('Connection pool not initialized');
    }

    const startTime = Date.now();

    try {
      // Try to get available connection from pool
      const poolConnection = this.getAvailableConnection();
      
      if (poolConnection) {
        this.metrics.poolHits++;
        this.activateConnection(poolConnection);
        return poolConnection;
      }

      this.metrics.poolMisses++;

      // No available connections, wait for one
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
          if (index !== -1) {
            this.waitingQueue.splice(index, 1);
          }
          this.metrics.waitingQueries--;
          reject(new Error('Connection timeout: No available connections'));
        }, this.connectionTimeout);

        this.waitingQueue.push({
          resolve: (connection) => {
            clearTimeout(timeout);
            resolve(connection);
          },
          reject: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
          requestedAt: Date.now()
        });

        this.metrics.waitingQueries++;
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to get connection', { error: error.message, duration });
      throw error;
    }
  }

  getAvailableConnection() {
    return this.pool.find(poolConnection => !poolConnection.isActive);
  }

  activateConnection(poolConnection) {
    poolConnection.isActive = true;
    poolConnection.lastUsed = Date.now();
    this.activeConnections.add(poolConnection);
    this.metrics.activeConnections = this.activeConnections.size;
  }

  releaseConnection(poolConnection) {
    if (!poolConnection || !poolConnection.isActive) {
      return;
    }

    poolConnection.isActive = false;
    poolConnection.lastUsed = Date.now();
    this.activeConnections.delete(poolConnection);
    this.metrics.activeConnections = this.activeConnections.size;

    // Process waiting queue
    if (this.waitingQueue.length > 0) {
      const waiting = this.waitingQueue.shift();
      this.metrics.waitingQueries--;
      this.activateConnection(poolConnection);
      waiting.resolve(poolConnection);
    }
  }

  async execute(query, params = []) {
    const startTime = Date.now();
    let poolConnection = null;

    try {
      poolConnection = await this.getConnection();
      const connection = poolConnection.connection;

      let result;
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        // Read operation
        const stmt = connection.prepare(query);
        result = params.length > 0 ? stmt.all(...params) : stmt.all();
      } else {
        // Write operation
        const stmt = connection.prepare(query);
        result = params.length > 0 ? stmt.run(...params) : stmt.run();
      }

      poolConnection.queryCount++;
      this.metrics.totalQueries++;

      const duration = Date.now() - startTime;
      this.updateAvgQueryTime(duration);

      logger.debug('Query executed', {
        query: query.substring(0, 100),
        duration,
        connectionId: poolConnection.id
      });

      return result;

    } catch (error) {
      this.metrics.failedQueries++;
      logger.error('Query execution failed', {
        error: error.message,
        query: query.substring(0, 100),
        duration: Date.now() - startTime
      });
      throw error;

    } finally {
      if (poolConnection) {
        this.releaseConnection(poolConnection);
      }
    }
  }

  async transaction(callback) {
    let poolConnection = null;

    try {
      poolConnection = await this.getConnection();
      const connection = poolConnection.connection;

      const transaction = connection.transaction(callback);
      const result = transaction();

      poolConnection.queryCount++;
      this.metrics.totalQueries++;

      return result;

    } catch (error) {
      this.metrics.failedQueries++;
      logger.error('Transaction failed', { error: error.message });
      throw error;

    } finally {
      if (poolConnection) {
        this.releaseConnection(poolConnection);
      }
    }
  }

  updateAvgQueryTime(duration) {
    if (this.metrics.totalQueries === 1) {
      this.metrics.avgQueryTime = duration;
    } else {
      this.metrics.avgQueryTime = (
        (this.metrics.avgQueryTime * (this.metrics.totalQueries - 1) + duration) / 
        this.metrics.totalQueries
      );
    }
  }

  getAvailableConnections() {
    return this.pool.filter(conn => !conn.isActive).length;
  }

  getPoolStats() {
    return {
      ...this.metrics,
      poolSize: this.pool.length,
      availableConnections: this.getAvailableConnections(),
      utilizationRate: (this.metrics.activeConnections / this.pool.length * 100).toFixed(2) + '%',
      avgQueriesPerConnection: this.pool.length > 0 ? 
        (this.pool.reduce((sum, conn) => sum + conn.queryCount, 0) / this.pool.length).toFixed(2) : 0
    };
  }

  startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  async performHealthCheck() {
    const unhealthyConnections = [];

    for (const poolConnection of this.pool) {
      if (!poolConnection.isActive) {
        try {
          // Test connection health
          poolConnection.connection.prepare('SELECT 1').get();
          
          // Check for idle timeout
          const idleTime = Date.now() - poolConnection.lastUsed;
          if (idleTime > this.idleTimeout && this.pool.length > 1) {
            unhealthyConnections.push(poolConnection);
          }

        } catch (error) {
          logger.warn('Unhealthy connection detected', {
            connectionId: poolConnection.id,
            error: error.message
          });
          unhealthyConnections.push(poolConnection);
        }
      }
    }

    // Replace unhealthy connections
    for (const unhealthyConnection of unhealthyConnections) {
      await this.replaceConnection(unhealthyConnection);
    }

    // Emit health check event
    this.emit('healthCheck', {
      totalConnections: this.pool.length,
      unhealthyConnections: unhealthyConnections.length,
      stats: this.getPoolStats()
    });
  }

  async replaceConnection(oldConnection) {
    try {
      // Close old connection
      if (oldConnection.connection) {
        oldConnection.connection.close();
      }

      // Create new connection
      const newConnection = await this.createConnection();
      if (newConnection) {
        const index = this.pool.indexOf(oldConnection);
        this.pool[index] = {
          id: oldConnection.id,
          connection: newConnection,
          isActive: false,
          createdAt: Date.now(),
          lastUsed: Date.now(),
          queryCount: 0
        };

        logger.info('Connection replaced', { connectionId: oldConnection.id });
      }

    } catch (error) {
      logger.error('Failed to replace connection', {
        connectionId: oldConnection.id,
        error: error.message
      });
    }
  }

  async close() {
    logger.info('Closing connection pool');

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close all connections
    for (const poolConnection of this.pool) {
      try {
        if (poolConnection.connection) {
          poolConnection.connection.close();
        }
      } catch (error) {
        logger.warn('Error closing connection', {
          connectionId: poolConnection.id,
          error: error.message
        });
      }
    }

    this.pool = [];
    this.activeConnections.clear();
    this.waitingQueue = [];
    this.isInitialized = false;

    this.emit('closed');
    logger.info('Connection pool closed');
  }
}

module.exports = ConnectionPool;