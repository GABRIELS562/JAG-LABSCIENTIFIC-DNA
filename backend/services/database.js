// PostgreSQL-based database service
// This replaces the old better-sqlite3 implementation for Kubernetes compatibility
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Import utilities with fallback handling
let logger, databaseLogger, performanceMonitor, DatabaseError;

try {
  const { globalErrorHandler } = require('../middleware/errorHandler');
  DatabaseError = globalErrorHandler.DatabaseError || Error;
} catch (error) {
  DatabaseError = Error;
}

try {
  const loggerUtils = require('../utils/logger');
  logger = loggerUtils.logger || console;
  databaseLogger = loggerUtils.databaseLogger || console;
} catch (error) {
  logger = console;
  databaseLogger = console;
}

try {
  const performanceUtils = require('../middleware/performanceMonitoring');
  performanceMonitor = performanceUtils.performanceMonitor || null;
} catch (error) {
  performanceMonitor = null;
}

class UnifiedDatabaseService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.preparedStatements = new Map();
    this.transactionDepth = 0;
    this.initAttempted = false;
    
    // Initialize immediately
    try {
      this.initialize();
      console.log('✅ PostgreSQL database initialized successfully');
    } catch (error) {
      console.error('❌ PostgreSQL database initialization failed:', error.message);
    }
  }

  getDbHost() {
    // In Kubernetes, use the service name
    if (process.env.KUBERNETES_SERVICE_HOST) {
      return 'postgresql.production.svc.cluster.local';
    }
    // Support both DB_HOST and POSTGRES_HOST
    return process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost';
  }

  async initialize() {
    if (this.initAttempted) {
      return this.isConnected;
    }
    
    this.initAttempted = true;
    
    try {
      // PostgreSQL connection configuration
      const config = {
        host: this.getDbHost(),
        port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
        database: process.env.DB_NAME || process.env.POSTGRES_DB || 'limsdb',
        user: process.env.DB_USER || process.env.POSTGRES_USER || 'lims_user',
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'lims2024secure',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      this.pool = new Pool(config);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      this.isConnected = true;
      
      // Initialize tables
      await this.initializeTables();
      
      console.log(`✅ PostgreSQL connected to ${config.host}:${config.port}/${config.database}`);
      return true;
    } catch (error) {
      console.error('PostgreSQL initialization error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async initializeTables() {
    try {
      // Create samples table if not exists
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS samples (
          id SERIAL PRIMARY KEY,
          sample_id VARCHAR(255) UNIQUE NOT NULL,
          patient_name VARCHAR(255),
          sample_type VARCHAR(100),
          status VARCHAR(50) DEFAULT 'pending',
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create workflows table if not exists  
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id SERIAL PRIMARY KEY,
          sample_id VARCHAR(255),
          workflow_type VARCHAR(100),
          status VARCHAR(50),
          step_number INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ Database tables initialized');
    } catch (error) {
      console.error('Table initialization error:', error);
    }
  }

  ensureInitialized() {
    if (!this.isConnected) {
      throw new DatabaseError('Database not initialized. Call initialize() first.');
    }
  }

  // SQLite-compatible prepare method (converts to PostgreSQL parameterized queries)
  prepare(sql) {
    this.ensureInitialized();
    
    // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
    let paramIndex = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
    
    return {
      run: async (...params) => {
        try {
          const result = await this.pool.query(pgSql, params);
          return {
            changes: result.rowCount,
            lastInsertRowid: result.rows[0]?.id || null
          };
        } catch (error) {
          console.error('Query execution error:', error);
          throw error;
        }
      },
      get: async (...params) => {
        try {
          const result = await this.pool.query(pgSql, params);
          return result.rows[0] || undefined;
        } catch (error) {
          console.error('Query execution error:', error);
          throw error;
        }
      },
      all: async (...params) => {
        try {
          const result = await this.pool.query(pgSql, params);
          return result.rows;
        } catch (error) {
          console.error('Query execution error:', error);
          throw error;
        }
      }
    };
  }

  // Direct query execution
  async query(sql, params = []) {
    this.ensureInitialized();
    
    try {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      let paramIndex = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
      
      const result = await this.pool.query(pgSql, params);
      return result.rows;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }

  // Transaction support
  async beginTransaction() {
    this.ensureInitialized();
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  async commit(client) {
    await client.query('COMMIT');
    client.release();
  }

  async rollback(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  // SQLite exec compatibility
  async exec(sql) {
    this.ensureInitialized();
    
    try {
      // Split multiple statements and execute them
      const statements = sql.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await this.pool.query(statement);
        }
      }
    } catch (error) {
      console.error('Exec error:', error);
      throw error;
    }
  }

  // Close connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('PostgreSQL connection closed');
    }
  }

  // SQLite compatibility methods
  transaction(fn) {
    return async (...args) => {
      const client = await this.beginTransaction();
      try {
        const result = await fn(...args);
        await this.commit(client);
        return result;
      } catch (error) {
        await this.rollback(client);
        throw error;
      }
    };
  }

  pragma() {
    // PostgreSQL doesn't use pragma, return dummy function
    return () => {};
  }
}

// Export singleton instance
const databaseService = new UnifiedDatabaseService();
module.exports = databaseService;