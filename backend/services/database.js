// Simple PostgreSQL-only database service
const { Pool } = require('pg');

// Database configuration
function getDbHost() {
  // In Kubernetes, use the service name
  if (process.env.KUBERNETES_SERVICE_HOST) {
    return 'postgresql.production.svc.cluster.local';
  }
  // Support both DB_HOST and POSTGRES_HOST
  return process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost';
}

const config = {
  host: getDbHost(),
  port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'limsdb',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'lims_user',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'lims2024secure',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(config);

// Initialize connection and tables
async function initialize() {
  try {
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    // Initialize tables
    await initializeTables();
    
    console.log(`✅ PostgreSQL connected to ${config.host}:${config.port}/${config.database}`);
    return true;
  } catch (error) {
    console.error('PostgreSQL initialization error:', error);
    throw error;
  }
}

async function initializeTables() {
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
    await pool.query(sql);
  }
  console.log('✅ PostgreSQL tables initialized');
}

// Convert SQLite placeholders to PostgreSQL
function convertSqlToPostgreSQL(sql) {
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

// Helper methods
async function query(text, params = []) {
  const pgSql = convertSqlToPostgreSQL(text);
  return await pool.query(pgSql, params);
}

async function get(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

async function all(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

async function run(text, params = []) {
  const result = await query(text, params);
  return {
    lastInsertRowid: result.rows[0]?.id || null,
    changes: result.rowCount
  };
}

// Execute multiple statements
async function exec(sql) {
  const statements = sql.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await pool.query(statement);
    }
  }
}

// Transaction support
async function beginTransaction() {
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
}

async function commit(client) {
  if (client && client.query) {
    await client.query('COMMIT');
    client.release();
  }
}

async function rollback(client) {
  if (client && client.query) {
    await client.query('ROLLBACK');
    client.release();
  }
}

function transaction(fn) {
  return async (...args) => {
    const client = await beginTransaction();
    try {
      const result = await fn(...args);
      await commit(client);
      return result;
    } catch (error) {
      await rollback(client);
      throw error;
    }
  };
}

// Prepare statement (SQLite-compatible)
function prepare(sql) {
  const pgSql = convertSqlToPostgreSQL(sql);
  
  return {
    async get(...params) {
      const result = await pool.query(pgSql, params);
      return result.rows[0] || null;
    },
    async all(...params) {
      const result = await pool.query(pgSql, params);
      return result.rows;
    },
    async run(...params) {
      const result = await pool.query(pgSql, params);
      return {
        lastInsertRowid: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    }
  };
}

// Health check
async function getHealthCheck() {
  try {
    await pool.query('SELECT 1');
    return {
      status: 'healthy',
      connected: true,
      database: 'postgresql',
      host: getDbHost()
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
async function getStatistics() {
  try {
    const stats = await get(`
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
async function close() {
  if (pool) {
    await pool.end();
    console.log('PostgreSQL connection closed');
  }
}

// Initialize on startup
const initPromise = initialize();

// Export everything
module.exports = {
  pool,
  query,
  get,
  all,
  run,
  exec,
  prepare,
  beginTransaction,
  commit,
  rollback,
  transaction,
  getHealthCheck,
  getStatistics,
  close,
  initialize: () => initPromise
};