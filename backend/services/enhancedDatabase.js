const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { DatabaseError } = require('../middleware/errorHandler');
const { logger, databaseLogger, performanceLogger } = require('../utils/logger');
const { performanceMonitor } = require('../middleware/performanceMonitoring');

class EnhancedDatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
    this.schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    this.db = null;
    this.isConnected = false;
    this.connectionPool = new Map();
    this.preparedStatements = new Map();
    this.transactionDepth = 0;
    
    this.initialize();
  }

  async initialize() {
    try {
      await this.ensureDirectoryExists();
      this.connect();
      this.setupPragmas();
      await this.createTables();
      this.prepareCommonStatements();
      
      logger.info('Database initialized successfully', {
        path: this.dbPath,
        mode: 'WAL',
        foreignKeys: true
      });
      
      this.isConnected = true;
    } catch (error) {
      databaseLogger.error(error, 'Database initialization failed');
      throw new DatabaseError('Failed to initialize database', error);
    }
  }

  async ensureDirectoryExists() {
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.debug('Created database directory', { path: dbDir });
    }
  }

  connect() {
    try {
      this.db = new Database(this.dbPath);
      this.isConnected = true;
    } catch (error) {
      databaseLogger.error(error, 'Database connection failed');
      throw new DatabaseError('Failed to connect to database', error);
    }
  }

  setupPragmas() {
    const pragmas = [
      'journal_mode = WAL',
      'foreign_keys = ON',
      'synchronous = NORMAL',
      'cache_size = -64000',
      'temp_store = MEMORY',
      'mmap_size = 268435456'
    ];

    pragmas.forEach(pragma => {
      try {
        this.db.pragma(pragma);
        logger.debug('Applied pragma', { pragma });
      } catch (error) {
        logger.warn('Failed to apply pragma', { pragma, error: error.message });
      }
    });
  }

  async createTables() {
    const createTablesWithLogging = performanceLogger.measureFunction('createTables', () => {
      try {
        const schema = fs.readFileSync(this.schemaPath, 'utf8');
        this.db.exec(schema);
        
        const geneticSchemaPath = path.join(__dirname, '..', 'database', 'genetic-schema-sqlite.sql');
        if (fs.existsSync(geneticSchemaPath)) {
          const geneticSchema = fs.readFileSync(geneticSchemaPath, 'utf8');
          this.db.exec(geneticSchema);
          logger.info('Genetic analysis schema loaded successfully');
        }
        
        logger.info('Database schema created/updated successfully');
      } catch (error) {
        databaseLogger.error(error, 'Schema creation failed');
        throw new DatabaseError('Failed to create database schema', error);
      }
    });

    await createTablesWithLogging();
  }

  prepareCommonStatements() {
    const statements = {
      // Sample operations
      createSample: `
        INSERT INTO samples (
          case_id, lab_number, name, surname, id_dob, date_of_birth,
          place_of_birth, nationality, occupation, address, phone_number,
          email, id_number, id_type, marital_status, ethnicity,
          collection_date, submission_date, relation, additional_notes,
          case_number, gender, age, sample_type, notes, status, workflow_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      
      getSample: 'SELECT * FROM samples WHERE lab_number = ?',
      
      getSamplesByCase: `
        SELECT s.*, tc.case_number FROM samples s
        LEFT JOIN test_cases tc ON s.case_id = tc.id
        WHERE tc.case_number = ?
        ORDER BY CASE s.relation
          WHEN 'Child' THEN 1
          WHEN 'Alleged Father' THEN 2
          WHEN 'Mother' THEN 3
          ELSE 4
        END ASC
      `,
      
      updateSampleWorkflow: `
        UPDATE samples 
        SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `,
      
      // Test case operations
      createTestCase: `
        INSERT INTO test_cases (
          case_number, ref_kit_number, submission_date, client_type,
          mother_present, email_contact, phone_contact, address_area, comments,
          test_purpose, sample_type, authorized_collector, consent_type,
          has_signatures, has_witness, witness_name, legal_declarations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      
      getTestCase: 'SELECT * FROM test_cases WHERE case_number = ?',
      
      // Batch operations
      createBatch: `
        INSERT INTO batches (
          batch_number, operator, pcr_date, electro_date, 
          settings, total_samples, plate_layout
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      
      getBatch: 'SELECT * FROM batches WHERE batch_number = ?',
      
      // Well assignment operations
      createWellAssignment: `
        INSERT INTO well_assignments (
          batch_id, well_position, sample_id, well_type,
          kit_number, sample_name, comment
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      
      getWellAssignments: `
        SELECT wa.*, s.name as sample_name_full, s.surname 
        FROM well_assignments wa
        LEFT JOIN samples s ON wa.sample_id = s.id
        WHERE wa.batch_id = ?
        ORDER BY wa.well_position
      `
    };

    for (const [name, sql] of Object.entries(statements)) {
      try {
        this.preparedStatements.set(name, this.db.prepare(sql));
        logger.debug('Prepared statement', { name });
      } catch (error) {
        logger.warn('Failed to prepare statement', { name, error: error.message });
      }
    }

    logger.info('Prepared statements cache initialized', { 
      count: this.preparedStatements.size 
    });
  }

  execute(statementName, params = []) {
    this.ensureConnection();
    
    const stmt = this.preparedStatements.get(statementName);
    if (!stmt) {
      throw new DatabaseError(`Prepared statement '${statementName}' not found`);
    }

    const operationId = `db:execute:${statementName}:${Date.now()}`;
    performanceMonitor.startTimer(operationId);

    try {
      databaseLogger.query(statementName, params);
      const result = stmt.run(...params);
      
      const duration = performanceMonitor.endTimer(operationId, {
        statement: statementName,
        operation: 'execute',
        paramCount: params.length,
        changes: result.changes
      });
      
      logger.debug('Statement executed', {
        statement: statementName,
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
        duration: `${duration?.toFixed(2)}ms`
      });
      
      return result;
    } catch (error) {
      performanceMonitor.endTimer(operationId, {
        statement: statementName,
        operation: 'execute',
        paramCount: params.length,
        error: error.message
      });
      databaseLogger.error(error, statementName, params);
      throw new DatabaseError(`Failed to execute statement '${statementName}'`, error);
    }
  }

  query(statementName, params = []) {
    this.ensureConnection();
    
    const stmt = this.preparedStatements.get(statementName);
    if (!stmt) {
      throw new DatabaseError(`Prepared statement '${statementName}' not found`);
    }

    const operationId = `db:query:${statementName}:${Date.now()}`;
    performanceMonitor.startTimer(operationId);

    try {
      databaseLogger.query(statementName, params);
      const result = stmt.get(...params);
      
      const duration = performanceMonitor.endTimer(operationId, {
        statement: statementName,
        operation: 'query',
        paramCount: params.length,
        hasResult: !!result
      });
      
      logger.debug('Query executed', {
        statement: statementName,
        hasResult: !!result,
        duration: `${duration?.toFixed(2)}ms`
      });
      
      return result;
    } catch (error) {
      performanceMonitor.endTimer(operationId, {
        statement: statementName,
        operation: 'query',
        paramCount: params.length,
        error: error.message
      });
      databaseLogger.error(error, statementName, params);
      throw new DatabaseError(`Failed to execute query '${statementName}'`, error);
    }
  }

  queryAll(statementName, params = []) {
    this.ensureConnection();
    
    const stmt = this.preparedStatements.get(statementName);
    if (!stmt) {
      throw new DatabaseError(`Prepared statement '${statementName}' not found`);
    }

    try {
      databaseLogger.query(statementName, params);
      const results = stmt.all(...params);
      
      logger.debug('Query all executed', {
        statement: statementName,
        resultCount: results.length
      });
      
      return results;
    } catch (error) {
      databaseLogger.error(error, statementName, params);
      throw new DatabaseError(`Failed to execute query all '${statementName}'`, error);
    }
  }

  raw(sql, params = []) {
    this.ensureConnection();
    
    try {
      databaseLogger.query(sql, params);
      const stmt = this.db.prepare(sql);
      const result = stmt.all(...params);
      
      logger.debug('Raw query executed', {
        resultCount: result.length
      });
      
      return result;
    } catch (error) {
      databaseLogger.error(error, sql, params);
      throw new DatabaseError('Failed to execute raw query', error);
    }
  }

  transaction(fn) {
    this.ensureConnection();
    
    const transaction = this.db.transaction((fn) => {
      this.transactionDepth++;
      databaseLogger.transaction('begin', { depth: this.transactionDepth });
      
      try {
        const result = fn();
        databaseLogger.transaction('commit', { depth: this.transactionDepth });
        this.transactionDepth--;
        return result;
      } catch (error) {
        databaseLogger.transaction('rollback', { 
          depth: this.transactionDepth,
          error: error.message 
        });
        this.transactionDepth--;
        throw error;
      }
    });

    return transaction(fn);
  }

  ensureConnection() {
    if (!this.isConnected || !this.db) {
      logger.warn('Database connection lost, attempting to reconnect');
      this.connect();
    }
  }

  getHealthCheck() {
    try {
      this.ensureConnection();
      const result = this.db.prepare('SELECT 1 as health').get();
      return {
        status: 'healthy',
        connected: this.isConnected,
        result: result.health === 1
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  getStatistics() {
    try {
      this.ensureConnection();
      
      const stats = {
        samples: this.db.prepare('SELECT COUNT(*) as count FROM samples').get().count,
        testCases: this.db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count,
        batches: this.db.prepare('SELECT COUNT(*) as count FROM batches').get().count,
        preparedStatements: this.preparedStatements.size,
        transactionDepth: this.transactionDepth,
        dbSize: this.getDbSize()
      };
      
      return stats;
    } catch (error) {
      logger.error('Failed to get database statistics', { error: error.message });
      return null;
    }
  }

  getDbSize() {
    try {
      const stats = fs.statSync(this.dbPath);
      return Math.round(stats.size / 1024 / 1024 * 100) / 100; // MB
    } catch (error) {
      return 0;
    }
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
        this.isConnected = false;
        this.preparedStatements.clear();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection', { error: error.message });
      }
    }
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('Initiating database shutdown');
    
    if (this.transactionDepth > 0) {
      logger.warn('Shutting down with active transactions', { 
        depth: this.transactionDepth 
      });
    }
    
    this.close();
  }
}

module.exports = EnhancedDatabaseService;