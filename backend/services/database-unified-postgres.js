/**
 * Unified PostgreSQL Database Service
 * Drop-in replacement for SQLite database service
 * Provides SQLite-compatible interface for PostgreSQL
 */

const { Pool } = require('pg');
// deasync removed - using async/await instead
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

class UnifiedPostgreSQLService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.initAttempted = false;
    this.preparedStatements = new Map();
    this.transactionDepth = 0;
    
    // Configuration - supports both K8s service and environment variables
    this.config = {
      host: this.getDbHost(),
      port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
      database: process.env.DB_NAME || process.env.POSTGRES_DB || 'limsdb',
      user: process.env.DB_USER || process.env.POSTGRES_USER || 'lims_user',
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'lims2024secure',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    
    // Initialize asynchronously (will be called by server.js)
    // Don't initialize immediately to avoid blocking constructor
  }

  // Determine the correct database host based on environment
  getDbHost() {
    // In Kubernetes, check for service discovery
    if (process.env.KUBERNETES_SERVICE_HOST) {
      // Use PostgreSQL service name in Kubernetes
      return process.env.DB_HOST || 'postgresql.production.svc.cluster.local';
    }
    
    // Check for explicit database URL
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        return url.hostname;
      } catch (error) {
        // Fall through to environment variables
      }
    }
    
    // Use environment variables or default
    return process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost';
  }

  async initializeTables() {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Initialize basic required tables
      const initSql = `
        -- Basic Samples table with required fields
        CREATE TABLE IF NOT EXISTS samples (
            id SERIAL PRIMARY KEY,
            sample_id VARCHAR(255) UNIQUE NOT NULL,
            patient_name VARCHAR(255),
            sample_type VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Basic Workflows table
        CREATE TABLE IF NOT EXISTS workflows (
            id SERIAL PRIMARY KEY,
            sample_id VARCHAR(255),
            workflow_type VARCHAR(100),
            status VARCHAR(50),
            step_number INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON samples(sample_id);
        CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
        CREATE INDEX IF NOT EXISTS idx_workflows_sample_id ON workflows(sample_id);
        CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
      `;
      
      const client = await this.pool.connect();
      try {
        await client.query(initSql);
        console.log('✅ PostgreSQL tables initialized successfully');
      } finally {
        client.release();
      }
    } catch (error) {
      if (logger.error) {
        logger.error('Failed to initialize PostgreSQL tables', { error: error.message });
      } else {
        console.error('❌ Failed to initialize PostgreSQL tables:', error.message);
      }
      // Don't throw - let the app continue with existing tables
    }
  }

  async initialize() {
    if (this.initAttempted) {
      return;
    }
    this.initAttempted = true;
    
    try {
      this.pool = new Pool(this.config);
      
      // Test connection
      await this.testConnection();
      
      this.isConnected = true;
      
      // Initialize required tables
      await this.initializeTables();
      
      if (logger.info) {
        logger.info('PostgreSQL initialized successfully', {
          database: this.config.database,
          host: this.config.host
        });
      } else {
        console.log('✅ PostgreSQL initialized successfully at:', `${this.config.host}:${this.config.port}/${this.config.database}`);
      }
      
    } catch (error) {
      if (databaseLogger.error) {
        databaseLogger.error('PostgreSQL initialization failed', { error: error.message });
      } else {
        console.error('❌ PostgreSQL initialization failed:', error);
      }
      throw new DatabaseError('Failed to initialize PostgreSQL database', error);
    }
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      return result.rows[0];
    } catch (error) {
      throw new DatabaseError('PostgreSQL connection test failed', error);
    }
  }

  ensureConnection() {
    if (!this.isConnected || !this.pool) {
      this.initialize();
    }
  }

  ensureInitialized() {
    if (!this.initAttempted) {
      this.initialize();
    }
    if (!this.isConnected) {
      throw new DatabaseError('Database not connected');
    }
  }

  // Convert SQLite-style SQL to PostgreSQL
  convertSqlToPostgreSQL(sql) {
    // Convert ? placeholders to $1, $2, etc.
    let paramCount = 0;
    const convertedSql = sql.replace(/\?/g, () => {
      paramCount++;
      return `$${paramCount}`;
    });
    
    // Convert SQLite functions to PostgreSQL equivalents
    return convertedSql
      .replace(/datetime\('now'\)/gi, 'NOW()')
      .replace(/julianday\('now'\)\s*-\s*julianday\(([^)]+)\)/gi, 'EXTRACT(EPOCH FROM (NOW() - $1))');
  }

  // SQLite-compatible prepare method
  prepare(sql) {
    const self = this;
    const postgresqlSql = this.convertSqlToPostgreSQL(sql);
    return {
      // SQLite-compatible get method (returns single row) - NOW ASYNC
      async get(...params) {
        const client = await self.pool.connect();
        try {
          const queryResult = await client.query(postgresqlSql, params);
          return queryResult.rows[0] || null;
        } finally {
          client.release();
        }
      },

      // SQLite-compatible all method (returns all rows) - NOW ASYNC
      async all(...params) {
        const client = await self.pool.connect();
        try {
          const queryResult = await client.query(postgresqlSql, params);
          return queryResult.rows;
        } finally {
          client.release();
        }
      },

      // SQLite-compatible run method (for INSERT/UPDATE/DELETE) - NOW ASYNC
      async run(...params) {
        const client = await self.pool.connect();
        try {
          const queryResult = await client.query(postgresqlSql, params);
          return {
            lastInsertRowid: queryResult.rows[0]?.id || queryResult.insertId || null,
            changes: queryResult.rowCount
          };
        } finally {
          client.release();
        }
      }
    };
  }

  // Direct query method for async operations
  async query(sql, params = []) {
    this.ensureConnection();
    const postgresqlSql = this.convertSqlToPostgreSQL(sql);
    const client = await this.pool.connect();
    try {
      const result = await client.query(postgresqlSql, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Synchronous methods for direct SQL calls (used in server.js)
  async get(sql, params = []) {
    const queryResult = await this.query(sql, params);
    return queryResult.rows[0] || null;
  }

  async all(sql, params = []) {
    const queryResult = await this.query(sql, params);
    return queryResult.rows;
  }

  async run(sql, params = []) {
    const queryResult = await this.query(sql, params);
    return {
      lastInsertRowid: queryResult.rows[0]?.id || queryResult.insertId || null,
      changes: queryResult.rowCount
    };
  }

  // Transaction support (simplified for compatibility)
  transaction(fn) {
    this.ensureConnection();
    
    // For now, just execute the function synchronously
    // In a real implementation, we'd wrap this in a database transaction
    try {
      return fn();
    } catch (error) {
      throw error;
    }
  }

  // Health check
  getHealthCheck() {
    try {
      this.ensureConnection();
      return this.testConnection().then(() => ({
        status: 'healthy',
        connected: this.isConnected,
        result: true
      }));
    } catch (error) {
      return Promise.resolve({
        status: 'unhealthy',
        connected: false,
        error: error.message
      });
    }
  }

  // Statistics
  async getStatistics() {
    try {
      this.ensureConnection();
      
      const stats = await this.query(`
        SELECT 
          (SELECT COUNT(*) FROM samples) as samples,
          (SELECT COUNT(*) FROM test_cases) as test_cases,
          (SELECT COUNT(*) FROM batches) as batches
      `);
      
      return {
        samples: parseInt(stats.rows[0].samples),
        testCases: parseInt(stats.rows[0].test_cases),
        batches: parseInt(stats.rows[0].batches),
        preparedStatements: this.preparedStatements.size,
        transactionDepth: this.transactionDepth,
        dbSize: 0 // PostgreSQL doesn't have simple file size
      };
    } catch (error) {
      return null;
    }
  }

  // Close connection
  async close() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isConnected = false;
        this.preparedStatements.clear();
        if (logger.info) {
          logger.info('PostgreSQL connection pool closed');
        }
      } catch (error) {
        if (logger.error) {
          logger.error('Error closing PostgreSQL connection pool', { error: error.message });
        }
      }
    }
  }

  async shutdown() {
    if (logger.info) {
      logger.info('Initiating PostgreSQL shutdown');
    }
    
    if (this.transactionDepth > 0) {
      if (logger.warn) {
        logger.warn('Shutting down with active transactions', { 
          depth: this.transactionDepth 
        });
      }
    }
    
    await this.close();
  }

  // Expose the pool for advanced operations
  getPool() {
    return this.pool;
  }

  // SQLite compatibility properties
  get db() {
    return this; // Return self to maintain compatibility
  }

  get dbPath() {
    return `postgresql://${this.config.host}:${this.config.port}/${this.config.database}`;
  }
}

// Create and export singleton instance
const databaseService = new UnifiedPostgreSQLService();

// Export in the same format as the SQLite service
module.exports = databaseService;