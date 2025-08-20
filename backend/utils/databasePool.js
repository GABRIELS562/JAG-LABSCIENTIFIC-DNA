const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('./logger');

/**
 * Database Connection Pool Manager for SQLite
 * Since SQLite doesn't support traditional connection pooling,
 * we manage multiple database instances for read operations
 */
class DatabasePool {
  constructor(dbPath, options = {}) {
    this.dbPath = dbPath;
    this.options = {
      maxConnections: options.maxConnections || 5,
      verbose: options.verbose || null,
      timeout: options.timeout || 5000,
      ...options
    };
    
    this.writeConnection = null;
    this.readConnections = [];
    this.connectionIndex = 0;
    this.isInitialized = false;
    
    this.initialize();
  }

  initialize() {
    try {
      // Create write connection (WAL mode allows concurrent reads)
      this.writeConnection = new Database(this.dbPath, {
        verbose: this.options.verbose,
        fileMustExist: false,
        timeout: this.options.timeout
      });

      // Configure for optimal performance
      this.configureDatabase(this.writeConnection);

      // Create read connections
      for (let i = 0; i < this.options.maxConnections; i++) {
        const readConnection = new Database(this.dbPath, {
          verbose: this.options.verbose,
          readonly: true,
          timeout: this.options.timeout
        });
        
        this.configureDatabase(readConnection);
        this.readConnections.push(readConnection);
      }

      this.isInitialized = true;
      logger.info('Database pool initialized successfully', {
        writeConnections: 1,
        readConnections: this.readConnections.length,
        dbPath: this.dbPath
      });

    } catch (error) {
      logger.error('Failed to initialize database pool', {
        error: error.message,
        dbPath: this.dbPath
      });
      throw error;
    }
  }

  configureDatabase(db) {
    // Set pragmas for optimal performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 1000000');
    db.pragma('temp_store = memory');
    db.pragma('mmap_size = 268435456'); // 256MB
    db.pragma('auto_vacuum = INCREMENTAL');
    db.pragma('incremental_vacuum');
  }

  /**
   * Get a read connection using round-robin
   */
  getReadConnection() {
    if (!this.isInitialized) {
      throw new Error('Database pool not initialized');
    }

    const connection = this.readConnections[this.connectionIndex];
    this.connectionIndex = (this.connectionIndex + 1) % this.readConnections.length;
    return connection;
  }

  /**
   * Get the write connection
   */
  getWriteConnection() {
    if (!this.isInitialized) {
      throw new Error('Database pool not initialized');
    }

    return this.writeConnection;
  }

  /**
   * Execute a read query
   */
  executeRead(sql, params = []) {
    try {
      const db = this.getReadConnection();
      const stmt = db.prepare(sql);
      
      if (sql.trim().toLowerCase().startsWith('select')) {
        return stmt.all(...params);
      } else {
        return stmt.get(...params);
      }
    } catch (error) {
      logger.error('Read query error', {
        error: error.message,
        sql: sql.substring(0, 100),
        params
      });
      throw error;
    }
  }

  /**
   * Execute a write query
   */
  executeWrite(sql, params = []) {
    try {
      const db = this.getWriteConnection();
      const stmt = db.prepare(sql);
      return stmt.run(...params);
    } catch (error) {
      logger.error('Write query error', {
        error: error.message,
        sql: sql.substring(0, 100),
        params
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  executeTransaction(queries) {
    const db = this.getWriteConnection();
    const transaction = db.transaction(() => {
      const results = [];
      
      for (const { sql, params = [] } of queries) {
        const stmt = db.prepare(sql);
        const result = stmt.run(...params);
        results.push(result);
      }
      
      return results;
    });

    try {
      return transaction();
    } catch (error) {
      logger.error('Transaction error', {
        error: error.message,
        queriesCount: queries.length
      });
      throw error;
    }
  }

  /**
   * Execute a prepared statement with caching
   */
  executePrepared(sql, params = [], useCache = true) {
    if (!this.preparedStatements) {
      this.preparedStatements = new Map();
    }

    let stmt;
    
    if (useCache && this.preparedStatements.has(sql)) {
      stmt = this.preparedStatements.get(sql);
    } else {
      const db = sql.trim().toLowerCase().startsWith('select') ? 
        this.getReadConnection() : this.getWriteConnection();
      
      stmt = db.prepare(sql);
      
      if (useCache) {
        this.preparedStatements.set(sql, stmt);
      }
    }

    try {
      if (sql.trim().toLowerCase().startsWith('select')) {
        return stmt.all(...params);
      } else {
        return stmt.run(...params);
      }
    } catch (error) {
      logger.error('Prepared statement error', {
        error: error.message,
        sql: sql.substring(0, 100),
        params
      });
      throw error;
    }
  }

  /**
   * Health check for all connections
   */
  healthCheck() {
    const results = {
      writeConnection: false,
      readConnections: 0,
      totalConnections: 0,
      errors: []
    };

    try {
      // Test write connection
      this.writeConnection.prepare('SELECT 1').get();
      results.writeConnection = true;
      results.totalConnections++;
    } catch (error) {
      results.errors.push(`Write connection error: ${error.message}`);
    }

    // Test read connections
    for (let i = 0; i < this.readConnections.length; i++) {
      try {
        this.readConnections[i].prepare('SELECT 1').get();
        results.readConnections++;
        results.totalConnections++;
      } catch (error) {
        results.errors.push(`Read connection ${i} error: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get database statistics
   */
  getStats() {
    try {
      const db = this.getReadConnection();
      
      const stats = {
        pageCount: db.pragma('page_count', { simple: true }),
        pageSize: db.pragma('page_size', { simple: true }),
        freelistCount: db.pragma('freelist_count', { simple: true }),
        cacheSize: db.pragma('cache_size', { simple: true }),
        journalMode: db.pragma('journal_mode', { simple: true }),
        synchronous: db.pragma('synchronous', { simple: true })
      };

      stats.databaseSize = stats.pageCount * stats.pageSize;
      stats.freeSpace = stats.freelistCount * stats.pageSize;
      stats.usedSpace = stats.databaseSize - stats.freeSpace;

      return stats;
    } catch (error) {
      logger.error('Error getting database stats', { error: error.message });
      return null;
    }
  }

  /**
   * Close all connections
   */
  close() {
    try {
      if (this.writeConnection) {
        this.writeConnection.close();
      }

      this.readConnections.forEach((connection, index) => {
        try {
          connection.close();
        } catch (error) {
          logger.warn(`Error closing read connection ${index}`, { error: error.message });
        }
      });

      this.isInitialized = false;
      
      logger.info('Database pool closed successfully');
    } catch (error) {
      logger.error('Error closing database pool', { error: error.message });
    }
  }

  /**
   * Vacuum the database (maintenance operation)
   */
  vacuum() {
    try {
      const db = this.getWriteConnection();
      db.exec('VACUUM');
      logger.info('Database vacuum completed');
    } catch (error) {
      logger.error('Error during vacuum operation', { error: error.message });
      throw error;
    }
  }

  /**
   * Backup the database
   */
  backup(backupPath) {
    try {
      const db = this.getWriteConnection();
      const backup = db.backup(backupPath);
      
      logger.info('Database backup completed', { backupPath });
      return backup;
    } catch (error) {
      logger.error('Error during backup operation', { 
        error: error.message, 
        backupPath 
      });
      throw error;
    }
  }
}

module.exports = DatabasePool;