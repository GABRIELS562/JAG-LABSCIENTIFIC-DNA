/**
 * PostgreSQL Database Service for K3s Deployment
 * Replaces SQLite for better K8s compatibility
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class PostgreSQLService {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
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

  async initialize() {
    try {
      // Database connection config - Kubernetes-aware
      const config = {
        host: this.getDbHost(),
        port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
        database: process.env.DB_NAME || process.env.POSTGRES_DB || 'limsdb',
        user: process.env.DB_USER || process.env.POSTGRES_USER || 'lims_user',
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'lims2024secure',
        max: 10, // max connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      this.pool = new Pool(config);

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      logger.info('PostgreSQL connected successfully', { 
        timestamp: result.rows[0].now,
        database: config.database,
        host: config.host 
      });

      // Schema already exists from migration
      // await this.initializeSchema();
      
      this.isInitialized = true;
      return true;

    } catch (error) {
      logger.error('PostgreSQL connection failed', { error: error.message });
      throw error;
    }
  }

  async initializeSchema() {
    // Schema is already initialized from migration
    // This method is kept for compatibility but doesn't do anything
    logger.info('PostgreSQL schema already exists (migrated from SQLite)');
  }

  async insertDemoData(client) {
    // No demo data needed - we have migrated real data
    logger.info('Using migrated data from SQLite');
  }

  // SQLite-compatible interface methods
  prepare(sql) {
    const self = this;
    return {
      async all(params = []) {
        const client = await self.pool.connect();
        try {
          const result = await client.query(sql, params);
          return result.rows;
        } finally {
          client.release();
        }
      },
      async get(params = []) {
        const client = await self.pool.connect();
        try {
          const result = await client.query(sql, params);
          return result.rows[0] || null;
        } finally {
          client.release();
        }
      },
      async run(params = []) {
        const client = await self.pool.connect();
        try {
          const result = await client.query(sql, params);
          return {
            lastInsertRowid: result.rows[0]?.id || null,
            changes: result.rowCount
          };
        } finally {
          client.release();
        }
      }
    };
  }

  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return { rows: result.rows };
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('PostgreSQL pool closed');
    }
  }

  getPool() {
    return this.pool;
  }

  isReady() {
    return this.isInitialized && this.pool;
  }
}

// Create singleton instance
const pgService = new PostgreSQLService();

module.exports = {
  db: pgService,
  getDatabase: () => pgService,
  initializeDatabase: () => pgService.initialize(),
  pool: pgService.getPool(),
  query: (sql, params) => pgService.query(sql, params)
};