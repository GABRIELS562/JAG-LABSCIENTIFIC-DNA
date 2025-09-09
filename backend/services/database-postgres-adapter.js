// PostgreSQL Database Adapter
const { Pool } = require('pg');

class PostgreSQLAdapter {
  constructor() {
    this.pool = null;
    this.isConnected = false;
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
    const tables = [
      `CREATE TABLE IF NOT EXISTS samples (
        id SERIAL PRIMARY KEY,
        sample_id VARCHAR(255) UNIQUE NOT NULL,
        patient_name VARCHAR(255),
        sample_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS workflows (
        id SERIAL PRIMARY KEY,
        sample_id VARCHAR(255),
        workflow_type VARCHAR(100),
        status VARCHAR(50),
        step_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS test_cases (
        id SERIAL PRIMARY KEY,
        sample_id VARCHAR(255),
        test_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        results JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS batches (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await this.pool.query(sql);
    }
    console.log('✅ PostgreSQL tables initialized');
  }

  // Convert SQLite placeholders to PostgreSQL
  convertSqlToPostgreSQL(sql) {
    let paramIndex = 0;
    let convertedSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
    
    // Convert SQLite functions to PostgreSQL equivalents
    return convertedSql
      .replace(/datetime\('now'\)/gi, 'NOW()')
      .replace(/AUTOINCREMENT/gi, '')
      .replace(/INTEGER PRIMARY KEY/gi, 'SERIAL PRIMARY KEY')
      .replace(/TEXT/gi, 'VARCHAR(255)')
      .replace(/DATETIME/gi, 'TIMESTAMP');
  }

  // Unified query method
  async query(sql, params = []) {
    const pgSql = this.convertSqlToPostgreSQL(sql);
    const result = await this.pool.query(pgSql, params);
    return result;
  }

  // Prepare statement (SQLite-compatible)
  prepare(sql) {
    const self = this;
    const pgSql = this.convertSqlToPostgreSQL(sql);
    
    return {
      async get(...params) {
        const result = await self.pool.query(pgSql, params);
        return result.rows[0] || null;
      },
      async all(...params) {
        const result = await self.pool.query(pgSql, params);
        return result.rows;
      },
      async run(...params) {
        const result = await self.pool.query(pgSql, params);
        return {
          lastInsertRowid: result.rows[0]?.id || null,
          changes: result.rowCount
        };
      }
    };
  }

  // Direct method shortcuts
  async get(sql, params = []) {
    const pgSql = this.convertSqlToPostgreSQL(sql);
    const result = await this.pool.query(pgSql, params);
    return result.rows[0] || null;
  }

  async all(sql, params = []) {
    const pgSql = this.convertSqlToPostgreSQL(sql);
    const result = await this.pool.query(pgSql, params);
    return result.rows;
  }

  async run(sql, params = []) {
    const pgSql = this.convertSqlToPostgreSQL(sql);
    const result = await this.pool.query(pgSql, params);
    return {
      lastInsertRowid: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  }

  // Execute SQL (for schema creation)
  async exec(sql) {
    // Split multiple statements and execute them
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.pool.query(statement);
      }
    }
  }

  // Transaction support
  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  async commit(client) {
    if (client && client.query) {
      await client.query('COMMIT');
      client.release();
    }
  }

  async rollback(client) {
    if (client && client.query) {
      await client.query('ROLLBACK');
      client.release();
    }
  }

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

  // PostgreSQL doesn't use pragma
  pragma() {
    return () => {};
  }

  // Health check
  async getHealthCheck() {
    try {
      const result = await this.pool.query('SELECT 1');
      return {
        status: 'healthy',
        connected: this.isConnected,
        database: 'postgresql',
        host: this.getDbHost()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  // Statistics
  async getStatistics() {
    try {
      const stats = await this.get(`
        SELECT 
          (SELECT COUNT(*) FROM samples) as samples,
          (SELECT COUNT(*) FROM test_cases) as test_cases,
          (SELECT COUNT(*) FROM batches) as batches
      `);
      
      return {
        samples: parseInt(stats.samples) || 0,
        testCases: parseInt(stats.test_cases) || 0,
        batches: parseInt(stats.batches) || 0,
        database: 'postgresql'
      };
    } catch (error) {
      return null;
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

  // Compatibility method
  ensureInitialized() {
    if (!this.isConnected) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }
}

module.exports = PostgreSQLAdapter;