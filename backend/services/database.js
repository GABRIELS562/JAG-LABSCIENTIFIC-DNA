// Complete LIMS database service with PostgreSQL connection pooling
const logger = require('../utils/logger');

let pool = null;
let Database = null;
let db = null;
let databaseType = 'postgresql';
let isConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;

// Try to load PostgreSQL, fallback to SQLite
try {
  const { Pool } = require('pg');
  module.exports.Pool = Pool;
} catch (err) {
  console.log('PostgreSQL not available, will use SQLite fallback');
}

// Try to load SQLite
try {
  Database = require('better-sqlite3');
} catch (err) {
  console.log('SQLite not available');
}

// Database configuration with environment variables
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
  port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432),
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'limsdb',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'lims_user',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'lims2024secure',
  max: 20, // connection pool size
  idleTimeoutMillis: 30000, // close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // 5 second connection timeout
  acquireTimeoutMillis: 10000, // 10 second acquire timeout
  createTimeoutMillis: 5000, // 5 second create timeout
  destroyTimeoutMillis: 5000, // 5 second destroy timeout
  reapIntervalMillis: 1000, // cleanup interval
  createRetryIntervalMillis: 200, // retry interval
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

// Global lab number counter
let labNumberCounter = 1000;

// Exponential backoff for retries
function getBackoffDelay(attempt) {
  return Math.min(1000 * Math.pow(2, attempt), 30000); // Cap at 30 seconds
}

// Initialize database connection with retry logic
async function initializeConnection() {
  // Try PostgreSQL first
  if (module.exports.Pool) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        pool = new module.exports.Pool(config);

        // Set up connection error handlers
        pool.on('error', (err) => {
          logger.error('PostgreSQL pool error', { error: err.message, code: err.code });
          isConnected = false;
        });

        pool.on('connect', () => {
          logger.info('PostgreSQL client connected');
          isConnected = true;
          connectionRetries = 0;
        });

        pool.on('remove', () => {
          logger.info('PostgreSQL client removed from pool');
        });

        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();

        databaseType = 'postgresql';
        isConnected = true;
        logger.info('PostgreSQL connection pool initialized successfully');
        return pool;
      } catch (error) {
        connectionRetries = attempt + 1;
        logger.warn(`PostgreSQL connection attempt ${attempt + 1} failed`, {
          error: error.message,
          code: error.code,
          host: config.host,
          port: config.port,
          database: config.database
        });

        if (attempt < MAX_RETRIES - 1) {
          const delay = getBackoffDelay(attempt);
          logger.info(`Retrying PostgreSQL connection in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error('PostgreSQL connection failed after all retries, falling back to SQLite');
        }
      }
    }
  }

  // Fallback to SQLite
  if (Database) {
    try {
      const dbPath = require('path').join(__dirname, '../database.db');
      db = new Database(dbPath);
      databaseType = 'sqlite';
      isConnected = true;
      logger.info('Using SQLite database fallback', { path: dbPath });
      return db;
    } catch (error) {
      logger.error('SQLite fallback also failed', { error: error.message });
    }
  }

  throw new Error('No database available (neither PostgreSQL nor SQLite)');
}

// Initialize connection and tables
async function initialize() {
  try {
    await initializeConnection();

    if (databaseType === 'postgresql') {
      logger.info(`PostgreSQL connected successfully`, {
        host: config.host,
        port: config.port,
        database: config.database,
        ssl: !!config.ssl
      });

      // Ensure database schema is correct on every startup
      try {
        const { initializeDatabase } = require('../utils/ensureDatabase');
        await initializeDatabase(pool);
      } catch (schemaError) {
        logger.warn('Schema initialization warning', { error: schemaError.message });
        // Continue even if schema initialization has issues
      }
    } else {
      // Test SQLite connection
      db.prepare('SELECT 1').get();
      logger.info('SQLite database connected successfully');
    }

    // Initialize tables
    await initializeTables();

    return true;
  } catch (error) {
    logger.error('Database initialization failed', {
      error: error.message,
      databaseType,
      retries: connectionRetries
    });

    // Don't throw error - allow app to start with limited functionality
    isConnected = false;
    return false;
  }
}

async function initializeTables() {
  if (databaseType === 'postgresql') {
    return initializePostgreSQLTables();
  } else {
    return initializeSQLiteTables();
  }
}

async function initializePostgreSQLTables() {
  const tables = [
    // Core LIMS tables with complete schema
    `CREATE TABLE IF NOT EXISTS test_cases (
      id SERIAL PRIMARY KEY,
      case_number VARCHAR(255) UNIQUE NOT NULL,
      ref_kit_number VARCHAR(255),
      submission_date DATE,
      client_type VARCHAR(50) DEFAULT 'paternity',
      mother_present VARCHAR(10) DEFAULT 'NO',
      email_contact VARCHAR(255),
      phone_contact VARCHAR(50),
      address_area TEXT,
      comments TEXT,
      test_purpose VARCHAR(100),
      sample_type VARCHAR(100),
      authorized_collector VARCHAR(255),
      consent_type VARCHAR(100),
      has_signatures VARCHAR(10),
      has_witness VARCHAR(10),
      witness_name VARCHAR(255),
      legal_declarations JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS samples (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES test_cases(id),
      lab_number VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      surname VARCHAR(255),
      id_dob VARCHAR(255),
      date_of_birth DATE,
      place_of_birth VARCHAR(255),
      nationality VARCHAR(100),
      occupation VARCHAR(255),
      address TEXT,
      phone_number VARCHAR(50),
      email VARCHAR(255),
      id_number VARCHAR(255),
      id_type VARCHAR(50),
      marital_status VARCHAR(50),
      ethnicity VARCHAR(100),
      collection_date DATE,
      submission_date DATE,
      relation VARCHAR(100),
      additional_notes TEXT,
      workflow_status VARCHAR(100) DEFAULT 'sample_collected',
      status VARCHAR(50) DEFAULT 'pending',
      batch_id INTEGER,
      extraction_id INTEGER,
      lab_batch_number VARCHAR(255),
      is_real_data BOOLEAN DEFAULT true,
      case_number VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS batches (
      id SERIAL PRIMARY KEY,
      batch_number VARCHAR(255) UNIQUE NOT NULL,
      operator VARCHAR(255),
      pcr_date DATE,
      electro_date DATE,
      settings VARCHAR(255) DEFAULT '27cycles30minExt',
      total_samples INTEGER DEFAULT 0,
      plate_layout JSONB,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS well_assignments (
      id SERIAL PRIMARY KEY,
      batch_id INTEGER REFERENCES batches(id),
      well_position VARCHAR(10),
      sample_id INTEGER,
      well_type VARCHAR(50),
      kit_number VARCHAR(255),
      sample_name VARCHAR(255),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS quality_control (
      id SERIAL PRIMARY KEY,
      batch_id INTEGER REFERENCES batches(id),
      date DATE,
      control_type VARCHAR(100),
      result VARCHAR(50),
      operator VARCHAR(255),
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      case_id INTEGER REFERENCES test_cases(id),
      report_type VARCHAR(100),
      report_data JSONB,
      generated_by VARCHAR(255),
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS equipment (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      type VARCHAR(100),
      manufacturer VARCHAR(255),
      model VARCHAR(255),
      serial_number VARCHAR(255),
      status VARCHAR(50) DEFAULT 'operational',
      location VARCHAR(255),
      last_maintenance DATE,
      next_maintenance DATE,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS extraction_batches (
      id SERIAL PRIMARY KEY,
      batch_number VARCHAR(255) UNIQUE NOT NULL,
      operator VARCHAR(255),
      extraction_date DATE,
      extraction_method VARCHAR(255),
      kit_lot_number VARCHAR(255),
      kit_expiry_date DATE,
      total_samples INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      lysis_time INTEGER,
      lysis_temperature DECIMAL(5,2),
      incubation_time INTEGER,
      centrifuge_speed INTEGER,
      centrifuge_time INTEGER,
      elution_volume INTEGER,
      quality_control_passed BOOLEAN,
      plate_layout JSONB,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS extraction_results (
      id SERIAL PRIMARY KEY,
      extraction_batch_id INTEGER REFERENCES extraction_batches(id),
      sample_id INTEGER REFERENCES samples(id),
      well_position VARCHAR(10),
      dna_concentration DECIMAL(10,3),
      purity_260_280 DECIMAL(5,3),
      purity_260_230 DECIMAL(5,3),
      volume_recovered INTEGER,
      quality_assessment VARCHAR(50),
      quantification_method VARCHAR(100),
      extraction_efficiency DECIMAL(5,2),
      inhibition_detected BOOLEAN DEFAULT false,
      reextraction_required BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(extraction_batch_id, sample_id)
    )`,
    `CREATE TABLE IF NOT EXISTS osiris_analyses (
      id SERIAL PRIMARY KEY,
      case_id VARCHAR(255),
      input_directory VARCHAR(500),
      output_directory VARCHAR(500),
      status VARCHAR(50) DEFAULT 'pending',
      kit_name VARCHAR(255),
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS workflow_stage_configs (
      id SERIAL PRIMARY KEY,
      stage_name VARCHAR(100) UNIQUE NOT NULL,
      duration_minutes INTEGER DEFAULT 3,
      is_active BOOLEAN DEFAULT true,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sample_workflow_timing (
      id SERIAL PRIMARY KEY,
      sample_id INTEGER REFERENCES samples(id),
      stage_name VARCHAR(100),
      entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      exit_time TIMESTAMP,
      duration_seconds INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS workflow_cycles (
      id SERIAL PRIMARY KEY,
      cycle_number INTEGER,
      samples_processed INTEGER,
      stage_transitions INTEGER,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tables) {
    await pool.query(sql);
  }
  console.log('✅ PostgreSQL LIMS tables initialized');

  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number)',
    'CREATE INDEX IF NOT EXISTS idx_samples_workflow_status ON samples(workflow_status)',
    'CREATE INDEX IF NOT EXISTS idx_samples_case_id ON samples(case_id)',
    'CREATE INDEX IF NOT EXISTS idx_samples_extraction_id ON samples(extraction_id)',
    'CREATE INDEX IF NOT EXISTS idx_test_cases_case_number ON test_cases(case_number)',
    'CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON batches(batch_number)',
    'CREATE INDEX IF NOT EXISTS idx_well_assignments_batch_id ON well_assignments(batch_id)',
    'CREATE INDEX IF NOT EXISTS idx_extraction_batches_batch_number ON extraction_batches(batch_number)',
    'CREATE INDEX IF NOT EXISTS idx_extraction_results_batch_id ON extraction_results(extraction_batch_id)',
    'CREATE INDEX IF NOT EXISTS idx_extraction_results_sample_id ON extraction_results(sample_id)',
    'CREATE INDEX IF NOT EXISTS idx_osiris_analyses_case_id ON osiris_analyses(case_id)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_timing_sample_id ON sample_workflow_timing(sample_id)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_timing_stage ON sample_workflow_timing(stage_name)'
  ];

  for (const sql of indexes) {
    try {
      await pool.query(sql);
    } catch (err) {
      // Index might already exist
    }
  }
}

function initializeSQLiteTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT UNIQUE NOT NULL,
      ref_kit_number TEXT,
      submission_date TEXT,
      client_type TEXT DEFAULT 'paternity',
      mother_present TEXT DEFAULT 'NO',
      email_contact TEXT,
      phone_contact TEXT,
      address_area TEXT,
      comments TEXT,
      test_purpose TEXT,
      sample_type TEXT,
      authorized_collector TEXT,
      consent_type TEXT,
      has_signatures TEXT,
      has_witness TEXT,
      witness_name TEXT,
      legal_declarations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER,
      lab_number TEXT UNIQUE NOT NULL,
      name TEXT,
      surname TEXT,
      id_dob TEXT,
      date_of_birth TEXT,
      place_of_birth TEXT,
      nationality TEXT,
      occupation TEXT,
      address TEXT,
      phone_number TEXT,
      email TEXT,
      id_number TEXT,
      id_type TEXT,
      marital_status TEXT,
      ethnicity TEXT,
      collection_date TEXT,
      submission_date TEXT,
      relation TEXT,
      additional_notes TEXT,
      workflow_status TEXT DEFAULT 'sample_collected',
      status TEXT DEFAULT 'pending',
      batch_id INTEGER,
      extraction_id INTEGER,
      lab_batch_number TEXT,
      is_real_data INTEGER DEFAULT 1,
      case_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES test_cases(id)
    )`,
    `CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_number TEXT UNIQUE NOT NULL,
      operator TEXT,
      pcr_date TEXT,
      electro_date TEXT,
      settings TEXT DEFAULT '27cycles30minExt',
      total_samples INTEGER DEFAULT 0,
      plate_layout TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS well_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER,
      well_position TEXT,
      sample_id INTEGER,
      well_type TEXT,
      kit_number TEXT,
      sample_name TEXT,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    )`,
    `CREATE TABLE IF NOT EXISTS quality_control (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER,
      date TEXT,
      control_type TEXT,
      result TEXT,
      operator TEXT,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER,
      report_type TEXT,
      report_data TEXT,
      generated_by TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES test_cases(id)
    )`,
    `CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT,
      status TEXT DEFAULT 'operational',
      location TEXT,
      last_maintenance TEXT,
      next_maintenance TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS extraction_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_number TEXT UNIQUE NOT NULL,
      operator TEXT,
      extraction_date TEXT,
      extraction_method TEXT,
      kit_lot_number TEXT,
      kit_expiry_date TEXT,
      total_samples INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      lysis_time INTEGER,
      lysis_temperature REAL,
      incubation_time INTEGER,
      centrifuge_speed INTEGER,
      centrifuge_time INTEGER,
      elution_volume INTEGER,
      quality_control_passed INTEGER,
      plate_layout TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS extraction_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extraction_batch_id INTEGER,
      sample_id INTEGER,
      well_position TEXT,
      dna_concentration REAL,
      purity_260_280 REAL,
      purity_260_230 REAL,
      volume_recovered INTEGER,
      quality_assessment TEXT,
      quantification_method TEXT,
      extraction_efficiency REAL,
      inhibition_detected INTEGER DEFAULT 0,
      reextraction_required INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(extraction_batch_id, sample_id),
      FOREIGN KEY (extraction_batch_id) REFERENCES extraction_batches(id),
      FOREIGN KEY (sample_id) REFERENCES samples(id)
    )`,
    `CREATE TABLE IF NOT EXISTS osiris_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT,
      input_directory TEXT,
      output_directory TEXT,
      status TEXT DEFAULT 'pending',
      kit_name TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS workflow_stage_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stage_name TEXT UNIQUE NOT NULL,
      duration_minutes INTEGER DEFAULT 3,
      is_active INTEGER DEFAULT 1,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sample_workflow_timing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER,
      stage_name TEXT,
      entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      exit_time DATETIME,
      duration_seconds INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES samples(id)
    )`,
    `CREATE TABLE IF NOT EXISTS workflow_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_number INTEGER,
      samples_processed INTEGER,
      stage_transitions INTEGER,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tables) {
    db.exec(sql);
  }
  console.log('✅ SQLite LIMS tables initialized');

  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number)',
    'CREATE INDEX IF NOT EXISTS idx_samples_workflow_status ON samples(workflow_status)',
    'CREATE INDEX IF NOT EXISTS idx_samples_case_id ON samples(case_id)',
    'CREATE INDEX IF NOT EXISTS idx_samples_extraction_id ON samples(extraction_id)',
    'CREATE INDEX IF NOT EXISTS idx_test_cases_case_number ON test_cases(case_number)',
    'CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON batches(batch_number)',
    'CREATE INDEX IF NOT EXISTS idx_well_assignments_batch_id ON well_assignments(batch_id)',
    'CREATE INDEX IF NOT EXISTS idx_extraction_batches_batch_number ON extraction_batches(batch_number)',
    'CREATE INDEX IF NOT EXISTS idx_extraction_results_batch_id ON extraction_results(extraction_batch_id)',
    'CREATE INDEX IF NOT EXISTS idx_extraction_results_sample_id ON extraction_results(sample_id)',
    'CREATE INDEX IF NOT EXISTS idx_osiris_analyses_case_id ON osiris_analyses(case_id)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_timing_sample_id ON sample_workflow_timing(sample_id)',
    'CREATE INDEX IF NOT EXISTS idx_workflow_timing_stage ON sample_workflow_timing(stage_name)'
  ];

  for (const sql of indexes) {
    try {
      db.exec(sql);
    } catch (err) {
      // Index might already exist
    }
  }
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

// Helper methods that work with both PostgreSQL and SQLite
async function query(text, params = []) {
  if (!isConnected) {
    throw new Error('Database not connected');
  }

  if (databaseType === 'postgresql') {
    try {
      const pgSql = convertSqlToPostgreSQL(text);
      return await pool.query(pgSql, params);
    } catch (error) {
      // Handle connection errors gracefully
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        isConnected = false;
        logger.error('Database connection lost', { error: error.message, code: error.code });
        throw new Error('Database connection unavailable');
      }
      throw error;
    }
  } else {
    // Convert PostgreSQL placeholders to SQLite
    let sqliteQuery = text;
    params.forEach((param, index) => {
      sqliteQuery = sqliteQuery.replace(`$${index + 1}`, '?');
    });
    const stmt = db.prepare(sqliteQuery);
    const result = stmt.all(...params);
    return { rows: result };
  }
}

async function get(text, params = []) {
  if (!isConnected) {
    logger.warn('Database not connected, returning null');
    return null;
  }

  try {
    if (databaseType === 'postgresql') {
      const result = await query(text, params);
      return result.rows[0] || null;
    } else {
      let sqliteQuery = text;
      params.forEach((param, index) => {
        sqliteQuery = sqliteQuery.replace(`$${index + 1}`, '?');
      });
      const stmt = db.prepare(sqliteQuery);
      return stmt.get(...params) || null;
    }
  } catch (error) {
    logger.error('Database get error', { error: error.message, query: text.substring(0, 100) });
    return null;
  }
}

async function all(text, params = []) {
  if (!isConnected) {
    logger.warn('Database not connected, returning empty array');
    return [];
  }

  try {
    if (databaseType === 'postgresql') {
      const result = await query(text, params);
      return result.rows;
    } else {
      let sqliteQuery = text;
      params.forEach((param, index) => {
        sqliteQuery = sqliteQuery.replace(`$${index + 1}`, '?');
      });
      const stmt = db.prepare(sqliteQuery);
      return stmt.all(...params);
    }
  } catch (error) {
    logger.error('Database all error', { error: error.message, query: text.substring(0, 100) });
    return [];
  }
}

async function run(text, params = []) {
  try {
    // Force PostgreSQL only - convert SQLite syntax if needed
    const convertedQuery = convertSQLiteToPostgreSQL(text);
    const result = await query(convertedQuery, params);
    return {
      lastInsertRowid: result.rows[0]?.id || null,
      changes: result.rowCount || 0,
      rows: result.rows || []
    };
  } catch (error) {
    // Handle common PostgreSQL schema errors gracefully
    if (error.code === '42703') { // undefined column
      console.warn(`Column missing in query: ${text.substring(0, 80)}...`);
      return { lastInsertRowid: null, changes: 0, rows: [] };
    } else if (error.code === '42P01') { // undefined table
      console.warn(`Table missing for query: ${text.substring(0, 80)}...`);
      return { lastInsertRowid: null, changes: 0, rows: [] };
    } else if (error.code === '42601') { // syntax error
      console.warn(`Query syntax error: ${text.substring(0, 80)}...`);
      return { lastInsertRowid: null, changes: 0, rows: [] };
    }
    // Log other errors but don't crash the app
    console.error('Database run error:', error.message);
    return { lastInsertRowid: null, changes: 0, rows: [] };
  }
}

// Convert SQLite syntax to PostgreSQL
function convertSQLiteToPostgreSQL(sql) {
  return sql
    // Convert AUTOINCREMENT to SERIAL
    .replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/\s+AUTOINCREMENT/gi, '')

    // Convert SQLite datetime to PostgreSQL timestamp
    .replace(/\bdatetime\b/gi, 'TIMESTAMP')

    // Convert IF NOT EXISTS syntax (PostgreSQL doesn't support it in all contexts)
    .replace(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/gi, 'CREATE TABLE IF NOT EXISTS')

    // Handle SQLite INSERT OR syntax patterns
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO')
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO')
    .replace(/INSERT\s+OR\s+ABORT\s+INTO/gi, 'INSERT INTO')
    .replace(/INSERT\s+OR\s+FAIL\s+INTO/gi, 'INSERT INTO')
    .replace(/INSERT\s+OR\s+ROLLBACK\s+INTO/gi, 'INSERT INTO')

    // Convert SQLite boolean values (but be careful not to replace all numbers)
    .replace(/\b(true|false)\b/g, '$1') // Keep existing booleans

    // Handle SQLite specific column types
    .replace(/\bINTEGER\b/gi, 'INTEGER')
    .replace(/\bTEXT\b/gi, 'TEXT')
    .replace(/\bREAL\b/gi, 'NUMERIC')
    .replace(/\bBLOB\b/gi, 'BYTEA');
}

// Execute multiple statements
async function exec(sql) {
  try {
    // Convert SQLite syntax to PostgreSQL
    const convertedSQL = convertSQLiteToPostgreSQL(sql);
    const statements = convertedSQL.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (error) {
          // Skip errors for tables that already exist or syntax incompatibilities
          if (error.code !== '42P07' && // relation already exists
              error.code !== '42701' && // duplicate column
              error.code !== '42P01') { // undefined table (might be expected)
            console.warn(`Database exec warning for statement: ${statement.substring(0, 100)}...`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Database exec error:', error.message);
    // Don't throw - let the application continue with degraded functionality
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

// Health check - basic health without database dependency
async function getHealthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}

// Ready check - includes database connectivity
async function getReadyCheck() {
  try {
    if (databaseType === 'postgresql') {
      if (!pool) {
        throw new Error('Connection pool not initialized');
      }
      await pool.query('SELECT 1');
      return {
        status: 'ready',
        connected: true,
        database: 'postgresql',
        host: getDbHost(),
        poolSize: pool.totalCount,
        idleConnections: pool.idleCount
      };
    } else if (db) {
      db.prepare('SELECT 1').get();
      return {
        status: 'ready',
        connected: true,
        database: 'sqlite',
        path: require('path').join(__dirname, '../database.db')
      };
    } else {
      throw new Error('No database connection available');
    }
  } catch (error) {
    return {
      status: 'not_ready',
      connected: false,
      error: error.message,
      database: databaseType
    };
  }
}

// LIMS-specific methods

// Lab number generation
function generateLabNumber(clientType = 'paternity') {
  const year = new Date().getFullYear();
  const prefix = clientType === 'urgent' ? 'URG' : clientType === 'lt' ? 'LT' : '';
  const number = (++labNumberCounter).toString().padStart(3, '0');
  return `${year}_${prefix}${number}`;
}

function generateSequentialLabNumbers(clientType = 'paternity', count = 1) {
  const numbers = [];
  for (let i = 0; i < count; i++) {
    numbers.push(generateLabNumber(clientType));
  }
  return numbers;
}

function generateCaseNumber() {
  const year = new Date().getFullYear();
  const counter = (++labNumberCounter).toString().padStart(3, '0');
  return `CASE_${year}_${counter}`;
}

// Test case methods
async function createTestCase(data) {
  const sql = `
    INSERT INTO test_cases (
      case_number, ref_kit_number, submission_date, client_type, mother_present,
      email_contact, phone_contact, address_area, comments, test_purpose,
      sample_type, authorized_collector, consent_type, has_signatures,
      has_witness, witness_name, legal_declarations
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING id
  `;
  
  const params = [
    data.case_number, data.ref_kit_number, data.submission_date, data.client_type,
    data.mother_present, data.email_contact, data.phone_contact, data.address_area,
    data.comments, data.test_purpose, data.sample_type, data.authorized_collector,
    data.consent_type, data.has_signatures, data.has_witness, data.witness_name,
    JSON.stringify(data.legal_declarations)
  ];
  
  const result = await query(sql, params);
  return { lastInsertRowid: result.rows[0]?.id || null };
}

// Sample methods
async function createSample(data) {
  const sql = `
    INSERT INTO samples (
      case_id, lab_number, name, surname, id_dob, date_of_birth, place_of_birth,
      nationality, occupation, address, phone_number, email, id_number, id_type,
      marital_status, ethnicity, collection_date, submission_date, relation,
      additional_notes, workflow_status, case_number
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING id
  `;
  
  const params = [
    data.case_id, data.lab_number, data.name, data.surname, data.id_dob,
    data.date_of_birth, data.place_of_birth, data.nationality, data.occupation,
    data.address, data.phone_number, data.email, data.id_number, data.id_type,
    data.marital_status, data.ethnicity, data.collection_date, data.submission_date,
    data.relation, data.additional_notes, data.workflow_status || 'sample_collected',
    data.case_number
  ];
  
  const result = await query(sql, params);
  return { lastInsertRowid: result.rows[0]?.id || null };
}

async function getAllSamples() {
  try {
    // Ensure database is initialized
    await initPromise;
    
    if (databaseType === 'postgresql') {
      const result = await pool.query('SELECT * FROM samples ORDER BY created_at DESC');
      return result.rows || [];
    } else {
      // SQLite - ensure db is initialized
      if (!db) {
        console.warn('Database not initialized, attempting to initialize...');
        await initialize();
      }
      const stmt = db.prepare('SELECT * FROM samples ORDER BY created_at DESC');
      return stmt.all() || [];
    }
  } catch (error) {
    console.error('Error getting all samples:', error);
    return [];
  }
}

async function getSample(id) {
  try {
    return await get('SELECT * FROM samples WHERE id = $1', [id]);
  } catch (error) {
    console.error('Error getting sample:', error);
    return null;
  }
}

async function searchSamples(searchQuery) {
  const sql = `
    SELECT * FROM samples 
    WHERE lab_number LIKE $1 OR name LIKE $1 OR surname LIKE $1 OR case_number LIKE $1
    ORDER BY created_at DESC
    LIMIT 100
  `;
  try {
    return await all(sql, [`%${searchQuery}%`]);
  } catch (error) {
    console.error('Error searching samples:', error);
    return [];
  }
}

// Batch methods
async function createBatch(data) {
  const sql = `
    INSERT INTO batches (
      batch_number, operator, pcr_date, electro_date, settings,
      total_samples, plate_layout
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;
  
  const params = [
    data.batch_number, data.operator, data.pcr_date, data.electro_date,
    data.settings, data.total_samples, JSON.stringify(data.plate_layout)
  ];
  
  const result = await query(sql, params);
  return { lastInsertRowid: result.rows[0]?.id || null };
}

async function getAllBatches() {
  try {
    // Ensure database is initialized
    await initPromise;
    
    if (databaseType === 'postgresql') {
      const result = await pool.query('SELECT * FROM batches ORDER BY created_at DESC');
      return result.rows || [];
    } else {
      // SQLite - ensure db is initialized
      if (!db) {
        console.warn('Database not initialized, attempting to initialize...');
        await initialize();
      }
      const stmt = db.prepare('SELECT * FROM batches ORDER BY created_at DESC');
      return stmt.all() || [];
    }
  } catch (error) {
    console.error('Error getting all batches:', error);
    return [];
  }
}

async function getBatch(batchNumber) {
  try {
    return await get('SELECT * FROM batches WHERE batch_number = $1', [batchNumber]);
  } catch (error) {
    console.error('Error getting batch:', error);
    return null;
  }
}

// Well assignment methods
async function createWellAssignment(data) {
  const sql = `
    INSERT INTO well_assignments (
      batch_id, well_position, sample_id, well_type, kit_number, sample_name, comment
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;
  
  const params = [
    data.batch_id, data.well_position, data.sample_id, data.well_type,
    data.kit_number, data.sample_name, data.comment
  ];
  
  const result = await query(sql, params);
  return { lastInsertRowid: result.rows[0]?.id || null };
}

async function getWellAssignments(batchId) {
  try {
    return await all('SELECT * FROM well_assignments WHERE batch_id = $1', [batchId]) || [];
  } catch (error) {
    console.error('Error getting well assignments:', error);
    return [];
  }
}

// Sample workflow methods
async function getSampleQueueCounts() {
  try {
    const counts = await get(`
      SELECT 
        COUNT(CASE WHEN workflow_status = 'pcr_ready' THEN 1 END) as pcr_ready,
        COUNT(CASE WHEN workflow_status = 'pcr_batched' THEN 1 END) as pcr_batched,
        COUNT(CASE WHEN workflow_status = 'electro_ready' THEN 1 END) as electro_ready,
        COUNT(CASE WHEN workflow_status = 'electro_batched' THEN 1 END) as electro_batched,
        COUNT(CASE WHEN workflow_status = 'analysis_ready' THEN 1 END) as analysis_ready,
        COUNT(CASE WHEN workflow_status IN ('completed', 'report_sent') THEN 1 END) as completed
      FROM samples
    `);
    
    return {
      pcr_ready: parseInt(counts.pcr_ready) || 0,
      pcr_batched: parseInt(counts.pcr_batched) || 0,
      electro_ready: parseInt(counts.electro_ready) || 0,
      electro_batched: parseInt(counts.electro_batched) || 0,
      analysis_ready: parseInt(counts.analysis_ready) || 0,
      completed: parseInt(counts.completed) || 0
    };
  } catch (error) {
    console.error('Error getting sample queue counts:', error);
    return {};
  }
}

async function getSamplesForQueue(queueType) {
  const statusMap = {
    pcr_ready: ['pcr_ready'],
    pcr_batched: ['pcr_batched'],
    electro_ready: ['electro_ready'],
    electro_batched: ['electro_batched'],
    analysis_ready: ['analysis_ready'],
    completed: ['completed', 'report_sent']
  };
  
  const statuses = statusMap[queueType] || [queueType];
  const placeholders = statuses.map((_, i) => `$${i + 1}`).join(', ');
  
  try {
    return await all(`SELECT * FROM samples WHERE workflow_status IN (${placeholders}) ORDER BY created_at DESC`, statuses) || [];
  } catch (error) {
    console.error('Error getting samples for queue:', error);
    return [];
  }
}

async function batchUpdateSampleWorkflowStatus(sampleIds, workflowStatus) {
  if (!Array.isArray(sampleIds) || sampleIds.length === 0) return;
  
  const placeholders = sampleIds.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `UPDATE samples SET workflow_status = $${sampleIds.length + 1}, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
  
  try {
    return await run(sql, [...sampleIds, workflowStatus]);
  } catch (error) {
    console.error('Error updating sample workflow status:', error);
    throw error;
  }
}

async function getSamplesByBatchNumber(batchNumber) {
  try {
    return await all(`
      SELECT s.* FROM samples s
      JOIN well_assignments wa ON s.id = wa.sample_id
      JOIN batches b ON wa.batch_id = b.id
      WHERE b.batch_number = $1
    `, [batchNumber]) || [];
  } catch (error) {
    console.error('Error getting samples by batch number:', error);
    return [];
  }
}

// Quality Control methods
async function createQualityControl(data) {
  const sql = `
    INSERT INTO quality_control (batch_id, date, control_type, result, operator, comments)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;
  
  const params = [data.batch_id, data.date, data.control_type, data.result, data.operator, data.comments];
  const result = await query(sql, params);
  return { lastInsertRowid: result.rows[0]?.id || null };
}

async function getQualityControlRecords(batchId = null) {
  try {
    if (batchId) {
      return await all('SELECT * FROM quality_control WHERE batch_id = $1 ORDER BY created_at DESC', [batchId]) || [];
    } else {
      return await all('SELECT * FROM quality_control ORDER BY created_at DESC') || [];
    }
  } catch (error) {
    console.error('Error getting QC records:', error);
    return [];
  }
}

// Equipment methods
async function getAllEquipment() {
  try {
    // Ensure database is initialized
    await initPromise;
    
    if (databaseType === 'postgresql') {
      const result = await pool.query('SELECT * FROM equipment ORDER BY name');
      return result.rows || [];
    } else {
      // SQLite - ensure db is initialized
      if (!db) {
        console.warn('Database not initialized, attempting to initialize...');
        await initialize();
      }
      const stmt = db.prepare('SELECT * FROM equipment ORDER BY name');
      return stmt.all() || [];
    }
  } catch (error) {
    console.error('Error getting all equipment:', error);
    return [];
  }
}

// Reports methods
async function getAllReports() {
  try {
    // Ensure database is initialized
    await initPromise;
    
    if (databaseType === 'postgresql') {
      const result = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
      return result.rows || [];
    } else {
      // SQLite - ensure db is initialized
      if (!db) {
        console.warn('Database not initialized, attempting to initialize...');
        await initialize();
      }
      const stmt = db.prepare('SELECT * FROM reports ORDER BY created_at DESC');
      return stmt.all() || [];
    }
  } catch (error) {
    console.error('Error getting all reports:', error);
    return [];
  }
}

// Statistics methods
async function getStatistics(period = 'daily') {
  try {
    let dateFilter = '';
    switch (period) {
      case 'daily':
        dateFilter = "AND created_at >= CURRENT_DATE";
        break;
      case 'weekly':
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'monthly':
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
    }
    
    const stats = await all(`
      SELECT 
        workflow_status as status,
        COUNT(*) as count
      FROM samples 
      WHERE 1=1 ${dateFilter}
      GROUP BY workflow_status
      ORDER BY count DESC
    `);
    
    return stats || [];
  } catch (error) {
    console.error('Error getting statistics:', error);
    return [];
  }
}

async function getSampleCounts() {
  try {
    const counts = await get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN workflow_status IN ('sample_collected', 'extraction_ready') THEN 1 END) as pending,
        COUNT(CASE WHEN workflow_status IN ('pcr_batched', 'electro_batched', 'analysis_in_progress') THEN 1 END) as processing,
        COUNT(CASE WHEN workflow_status IN ('completed', 'report_sent') THEN 1 END) as completed
      FROM samples
    `);
    
    return {
      total: parseInt(counts.total) || 0,
      pending: parseInt(counts.pending) || 0,
      processing: parseInt(counts.processing) || 0,
      completed: parseInt(counts.completed) || 0
    };
  } catch (error) {
    console.error('Error getting sample counts:', error);
    return { total: 0, pending: 0, processing: 0, completed: 0 };
  }
}

// Utility methods
function ensureInitialized() {
  // For compatibility with existing code
}

function createTables() {
  return initializeTables();
}

function getConnectionInfo() {
  if (databaseType === 'postgresql') {
    return {
      type: 'postgresql',
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      connected: true
    };
  } else {
    return {
      type: 'sqlite',
      path: require('path').join(__dirname, '../database.db'),
      connected: true
    };
  }
}

async function ensureReady() {
  try {
    if (databaseType === 'postgresql') {
      await pool.query('SELECT 1');
    } else {
      db.prepare('SELECT 1').get();
    }
    return true;
  } catch (error) {
    throw new Error(`Database not ready: ${error.message}`);
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

// Close connection gracefully
async function close() {
  try {
    if (databaseType === 'postgresql' && pool) {
      await pool.end();
      logger.info('PostgreSQL connection pool closed');
    } else if (databaseType === 'sqlite' && db) {
      db.close();
      logger.info('SQLite connection closed');
    }
    isConnected = false;
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
  }
}

// Initialize on startup
const initPromise = initialize();

// Export everything including LIMS methods
module.exports = {
  // Core PostgreSQL methods
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
  getReadyCheck,
  getStatistics,
  close,
  initialize: () => initPromise,
  isConnected: () => isConnected,
  getDatabaseType: () => databaseType,
  getConnectionInfo: () => ({ type: databaseType, connected: isConnected, config: { host: config.host, port: config.port, database: config.database } }),
  
  // LIMS-specific methods
  generateLabNumber,
  generateSequentialLabNumbers,
  generateCaseNumber,
  createTestCase,
  createSample,
  getAllSamples,
  getSample,
  searchSamples,
  createBatch,
  getAllBatches,
  getBatch,
  createWellAssignment,
  getWellAssignments,
  getSampleQueueCounts,
  getSamplesForQueue,
  batchUpdateSampleWorkflowStatus,
  getSamplesByBatchNumber,
  createQualityControl,
  getQualityControlRecords,
  getAllEquipment,
  getAllReports,
  getSampleCounts,
  ensureInitialized,
  createTables,
  getConnectionInfo,
  ensureReady
};