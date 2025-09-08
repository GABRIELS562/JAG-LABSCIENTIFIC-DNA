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

  async initialize() {
    try {
      // Database connection config
      const config = {
        host: process.env.POSTGRES_HOST || 'postgres-service',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'jagdna_lims',
        user: process.env.POSTGRES_USER || 'lims_user',
        password: process.env.POSTGRES_PASSWORD || 'lims_password_change_in_prod',
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

      // Initialize schema
      await this.initializeSchema();
      
      this.isInitialized = true;
      return true;

    } catch (error) {
      logger.error('PostgreSQL connection failed', { error: error.message });
      throw error;
    }
  }

  async initializeSchema() {
    const client = await this.pool.connect();
    try {
      // Create samples table
      await client.query(`
        CREATE TABLE IF NOT EXISTS samples (
          id SERIAL PRIMARY KEY,
          lab_number VARCHAR(50) UNIQUE NOT NULL,
          case_number VARCHAR(100),
          name VARCHAR(100) NOT NULL,
          surname VARCHAR(100) NOT NULL,
          relation VARCHAR(50),
          collection_date DATE,
          workflow_status VARCHAR(50) DEFAULT 'sample_collected',
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
        )
      `);

      // Create trigger for updated_at
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS update_samples_updated_at ON samples;
        CREATE TRIGGER update_samples_updated_at
          BEFORE UPDATE ON samples
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column()
      `);

      // Create batches table
      await client.query(`
        CREATE TABLE IF NOT EXISTS batches (
          id SERIAL PRIMARY KEY,
          batch_number VARCHAR(50) UNIQUE NOT NULL,
          batch_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create workflow_status table for tracking
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflow_status (
          id SERIAL PRIMARY KEY,
          stage VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL,
          count INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert some demo data if table is empty
      const sampleCount = await client.query('SELECT COUNT(*) FROM samples');
      if (parseInt(sampleCount.rows[0].count) === 0) {
        await this.insertDemoData(client);
      }

      logger.info('PostgreSQL schema initialized successfully');

    } catch (error) {
      logger.error('Schema initialization failed', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  async insertDemoData(client) {
    const demoSamples = [
      { lab_number: 'PG_001', name: 'Alice', surname: 'Johnson', relation: 'Child', case_number: 'CASE-2025-001', workflow_status: 'sample_collected' },
      { lab_number: 'PG_002', name: 'Bob', surname: 'Johnson', relation: 'Alleged Father', case_number: 'CASE-2025-001', workflow_status: 'dna_extraction' },
      { lab_number: 'PG_003', name: 'Carol', surname: 'Johnson', relation: 'Mother', case_number: 'CASE-2025-001', workflow_status: 'pcr_ready' },
      { lab_number: 'PG_004', name: 'David', surname: 'Smith', relation: 'Child', case_number: 'CASE-2025-002', workflow_status: 'analysis_completed' },
      { lab_number: 'PG_005', name: 'Eva', surname: 'Smith', relation: 'Mother', case_number: 'CASE-2025-002', workflow_status: 'report_ready' }
    ];

    for (const sample of demoSamples) {
      await client.query(`
        INSERT INTO samples (lab_number, name, surname, relation, case_number, workflow_status, collection_date)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
      `, [sample.lab_number, sample.name, sample.surname, sample.relation, sample.case_number, sample.workflow_status]);
    }

    logger.info('Demo data inserted successfully');
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