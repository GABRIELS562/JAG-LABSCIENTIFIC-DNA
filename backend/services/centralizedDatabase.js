const Database = require('better-sqlite3');
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

/**
 * Centralized Database Service
 * Consolidates all database operations and eliminates redundant functions
 */
class CentralizedDatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
    this.schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    this.db = null;
    this.isConnected = false;
    this.preparedStatements = new Map();
    this.transactionDepth = 0;
    
    this.initialize();
  }

  initialize() {
    try {
      this.ensureDirectoryExists();
      this.connect();
      this.setupPragmas();
      this.createTables();
      this.prepareCommonStatements();
      this.createOptimizedIndexes();
      
      logger.info && logger.info('Centralized database service initialized successfully', {
        path: this.dbPath,
        mode: 'WAL',
        foreignKeys: true,
        optimized: true
      });
      
      this.isConnected = true;
    } catch (error) {
      if (databaseLogger.error) {
        databaseLogger.error('Database initialization failed', { error: error.message });
      } else {
        console.error('❌ Database initialization failed:', error);
      }
      throw new DatabaseError('Failed to initialize database', error);
    }
  }

  ensureDirectoryExists() {
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  connect() {
    try {
      this.db = new Database(this.dbPath);
      
      // Test connection
      const testResult = this.db.prepare('SELECT 1 as health').get();
      if (testResult.health !== 1) {
        throw new Error('Database health check failed');
      }
      
      this.isConnected = true;
    } catch (error) {
      throw new DatabaseError('Failed to connect to database', error);
    }
  }

  setupPragmas() {
    const pragmas = [
      'journal_mode = WAL',
      'foreign_keys = ON',
      'synchronous = NORMAL',
      'cache_size = -64000', // 64MB cache
      'temp_store = MEMORY',
      'mmap_size = 268435456', // 256MB memory mapping
      'recursive_triggers = ON',
      'optimize = 0x10002'
    ];

    pragmas.forEach(pragma => {
      try {
        this.db.pragma(pragma);
      } catch (error) {
        logger.warn && logger.warn('Failed to apply pragma', { pragma, error: error.message });
      }
    });
    
    // Performance optimization
    try {
      this.db.pragma('analysis_limit = 1000');
      this.db.exec('PRAGMA optimize');
    } catch (error) {
      logger.warn && logger.warn('Failed to apply optimization pragmas', { error: error.message });
    }
  }

  createTables() {
    try {
      if (fs.existsSync(this.schemaPath)) {
        const schema = fs.readFileSync(this.schemaPath, 'utf8');
        this.db.exec(schema);
      }
      
      // Load additional schemas
      const additionalSchemas = [
        'genetic-schema-sqlite.sql',
        'enhanced-reports-schema.sql',
        'iso17025-schema.sql'
      ];
      
      additionalSchemas.forEach(schemaFile => {
        const schemaFilePath = path.join(path.dirname(this.schemaPath), schemaFile);
        if (fs.existsSync(schemaFilePath)) {
          const schema = fs.readFileSync(schemaFilePath, 'utf8');
          this.db.exec(schema);
          logger.info && logger.info(`Loaded schema: ${schemaFile}`);
        }
      });
      
      logger.info && logger.info('Database schema created/updated successfully');
      
    } catch (error) {
      throw new DatabaseError('Failed to create database schema', error);
    }
  }

  createOptimizedIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status)',
      'CREATE INDEX IF NOT EXISTS idx_samples_workflow ON samples(workflow_status)',
      'CREATE INDEX IF NOT EXISTS idx_samples_batch ON samples(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_samples_case ON samples(case_number)',
      'CREATE INDEX IF NOT EXISTS idx_samples_created ON samples(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number)',
      'CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)',
      'CREATE INDEX IF NOT EXISTS idx_batches_created ON batches(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_test_cases_number ON test_cases(case_number)',
      'CREATE INDEX IF NOT EXISTS idx_test_cases_kit ON test_cases(ref_kit_number)'
    ];
    
    try {
      const startTime = Date.now();
      indexes.forEach(indexSQL => {
        this.db.exec(indexSQL);
      });
      
      const indexTime = Date.now() - startTime;
      logger.debug && logger.debug('Database indexes created successfully', { 
        indexCount: indexes.length,
        indexTime: `${indexTime}ms`
      });
    } catch (error) {
      logger.warn && logger.warn('Failed to create some indexes', { error: error.message });
    }
  }

  prepareCommonStatements() {
    const statements = {
      // Sample operations
      createSample: `
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, phone_number,
          date_of_birth, place_of_birth, nationality, address, email, 
          id_number, id_type, collection_date, submission_date, sample_type,
          case_number, kit_batch_number, workflow_status, gender,
          test_purpose, client_type, urgent, notes, additional_notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      
      getSample: 'SELECT * FROM samples WHERE lab_number = ?',
      getSampleById: 'SELECT * FROM samples WHERE id = ?',
      getAllSamples: 'SELECT * FROM samples ORDER BY id DESC',
      updateSampleWorkflow: 'UPDATE samples SET workflow_status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      updateSampleBatch: 'UPDATE samples SET batch_id = ?, workflow_status = ?, lab_batch_number = ?, updated_at = datetime(\'now\') WHERE id = ?',
      deleteSample: 'DELETE FROM samples WHERE id = ?',
      
      // Test case operations
      createTestCase: `
        INSERT INTO test_cases (
          case_number, ref_kit_number, submission_date, client_type,
          mother_present, email_contact, phone_contact, address_area, comments,
          test_purpose, sample_type, authorized_collector, consent_type,
          has_signatures, has_witness, witness_name, legal_declarations, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      
      getTestCase: 'SELECT * FROM test_cases WHERE case_number = ?',
      getAllTestCases: 'SELECT * FROM test_cases ORDER BY created_at DESC',
      deleteTestCase: 'DELETE FROM test_cases WHERE case_number = ?',
      
      // Batch operations
      createBatch: `
        INSERT INTO batches (
          batch_number, operator, pcr_date, electro_date, 
          settings, total_samples, plate_layout, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      
      getBatch: 'SELECT * FROM batches WHERE batch_number = ?',
      getBatchById: 'SELECT * FROM batches WHERE id = ?',
      getAllBatches: 'SELECT * FROM batches ORDER BY created_at DESC'
    };

    for (const [name, sql] of Object.entries(statements)) {
      try {
        this.preparedStatements.set(name, this.db.prepare(sql));
      } catch (error) {
        logger.warn && logger.warn('Failed to prepare statement', { name, error: error.message });
      }
    }
  }

  // Enhanced sample operations
  getSamplesWithPagination(page = 1, limit = 50, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = '';
      let params = [];
      
      const conditions = [];
      if (filters.status && filters.status !== 'all') {
        switch (filters.status) {
          case 'pending':
            conditions.push("workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL");
            break;
          case 'pcr_batched':
            conditions.push("(workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%'))");
            break;
          case 'electro_batched':
            conditions.push("(workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%'))");
            break;
          case 'rerun_batched':
            conditions.push("(workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR'))");
            break;
          case 'completed':
            conditions.push("workflow_status IN ('analysis_completed')");
            break;
          case 'processing':
            conditions.push("workflow_status IN ('pcr_batched', 'pcr_completed')");
            break;
          default:
            conditions.push('status = ?');
            params.push(filters.status);
        }
      }
      if (filters.search) {
        conditions.push('(s.lab_number LIKE ? OR s.name LIKE ? OR s.surname LIKE ? OR s.case_number LIKE ? OR tc.ref_kit_number LIKE ? OR tc.test_purpose LIKE ? OR s.notes LIKE ? OR s.additional_notes LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
      
      const countQuery = `SELECT COUNT(*) as total FROM samples s LEFT JOIN test_cases tc ON s.case_id = tc.id ${whereClause}`;
      const total = this.db.prepare(countQuery).get(...params).total;
      
      const dataQuery = `
        SELECT 
          s.id, s.lab_number, s.name, s.surname, s.relation, s.status, s.gender,
          s.collection_date, s.workflow_status, s.case_number, s.batch_id, s.lab_batch_number,
          s.phone_number, s.email, s.id_number, s.notes, s.additional_notes, s.rerun_count,
          tc.test_purpose, tc.ref_kit_number, tc.client_type
        FROM samples s
        LEFT JOIN test_cases tc ON s.case_id = tc.id
        ${whereClause}
        ORDER BY s.lab_number ASC 
        LIMIT ? OFFSET ?
      `;
      
      params.push(limit, offset);
      const samples = this.db.prepare(dataQuery).all(...params);
      
      return {
        data: samples,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error && logger.error('Error fetching samples with pagination', { error: error.message, page, limit, filters });
      return { data: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
    }
  }

  getSampleCounts() {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM samples');
      const activeStmt = this.db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'active'");
      const pendingStmt = this.db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL");
      const pcrBatchedStmt = this.db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%' AND lab_batch_number NOT LIKE '%_RR')");
      const electroBatchedStmt = this.db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%')");
      const rerunBatchedStmt = this.db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR')");
      const completedStmt = this.db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('analysis_completed')");
      const processingStmt = this.db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status IN ('pcr_batched', 'pcr_completed')");
      
      return {
        total: totalStmt.get().count,
        active: activeStmt.get().count,
        pending: pendingStmt.get().count,
        pcrBatched: pcrBatchedStmt.get().count,
        electroBatched: electroBatchedStmt.get().count,
        rerunBatched: rerunBatchedStmt.get().count,
        completed: completedStmt.get().count,
        processing: processingStmt.get().count
      };
    } catch (error) {
      logger.error && logger.error('Error getting sample counts', { error: error.message });
      return { total: 0, active: 0, pending: 0, pcrBatched: 0, electroBatched: 0, rerunBatched: 0, completed: 0, processing: 0 };
    }
  }

  // Generate next lab number using sequence table for consistency
  generateLabNumber() {
    try {
      // Create lab_sequence table if it doesn't exist
      const createTableStmt = this.db.prepare(`
        CREATE TABLE IF NOT EXISTS lab_sequence (
          id INTEGER PRIMARY KEY,
          next_lab_number INTEGER NOT NULL,
          year_prefix TEXT NOT NULL
        )
      `);
      createTableStmt.run();
      
      // Get or initialize the sequence
      let sequenceStmt = this.db.prepare('SELECT next_lab_number, year_prefix FROM lab_sequence WHERE id = 1');
      let sequence = sequenceStmt.get();
      
      if (!sequence) {
        // Initialize sequence by finding the highest existing lab number
        const existingStmt = this.db.prepare('SELECT lab_number FROM samples ORDER BY id DESC LIMIT 100');
        const results = existingStmt.all();
        
        let highestNumber = 420; // Default starting point
        
        results.forEach(result => {
          const labNumber = result.lab_number;
          // Extract numbers that follow the "25_" pattern
          const matches = labNumber.match(/25_(\d+)/g);
          if (matches) {
            matches.forEach(match => {
              const number = parseInt(match.replace('25_', ''), 10);
              if (number > highestNumber) {
                highestNumber = number;
              }
            });
          }
        });
        
        // Insert initial sequence
        const initStmt = this.db.prepare(`
          INSERT INTO lab_sequence (id, next_lab_number, year_prefix) 
          VALUES (1, ?, ?)
        `);
        initStmt.run(highestNumber + 1, '25');
        sequence = { next_lab_number: highestNumber + 1, year_prefix: '25' };
      }
      
      const nextNumber = sequence.next_lab_number;
      const labNumber = `${sequence.year_prefix}_${nextNumber.toString().padStart(3, '0')}`;
      
      // Update sequence for next use
      const updateStmt = this.db.prepare(`
        UPDATE lab_sequence SET next_lab_number = ? WHERE id = 1
      `);
      updateStmt.run(nextNumber + 1);
      
      logger.info && logger.info('Generated lab number', { labNumber, nextSequence: nextNumber + 1 });
      return labNumber;
      
    } catch (error) {
      logger.error && logger.error('Error generating lab number', { error: error.message });
      
      // Fallback: use timestamp-based number
      const fallbackNumber = Date.now().toString().slice(-3);
      return `25_${fallbackNumber}`;
    }
  }

  // Create test case record for PaternityTestForm submissions
  createTestCase(testCaseData) {
    try {
      const stmt = this.preparedStatements.get('createTestCase');
      const result = stmt.run(
        testCaseData.case_number,
        testCaseData.ref_kit_number,
        testCaseData.submission_date,
        testCaseData.client_type,
        testCaseData.mother_present,
        testCaseData.email_contact,
        testCaseData.phone_contact,
        testCaseData.address_area,
        testCaseData.comments,
        testCaseData.test_purpose,
        testCaseData.sample_type,
        testCaseData.authorized_collector,
        testCaseData.consent_type,
        testCaseData.has_signatures,
        testCaseData.has_witness,
        testCaseData.witness_name,
        testCaseData.legal_declarations,
        testCaseData.status || 'pending'
      );
      
      return { id: result.lastInsertRowid, ...testCaseData };
    } catch (error) {
      logger.error && logger.error('Error creating test case', { error: error.message, testCaseData });
      throw error;
    }
  }

  createSample(sampleData, req = null) {
    try {
      const stmt = this.preparedStatements.get('createSample');
      const result = stmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation || 'child',
        sampleData.status || 'pending',
        sampleData.phone_number,
        sampleData.date_of_birth || sampleData.dateOfBirth,
        sampleData.place_of_birth || sampleData.placeOfBirth,
        sampleData.nationality,
        sampleData.address,
        sampleData.email,
        sampleData.id_number || sampleData.idNumber,
        sampleData.id_type || sampleData.idType,
        sampleData.collection_date || sampleData.collectionDate,
        sampleData.submission_date || sampleData.submissionDate,
        sampleData.sample_type || sampleData.sampleType || 'buccal_swab',
        sampleData.case_number,
        sampleData.kit_batch_number,
        sampleData.workflow_status || 'sample_collected',
        sampleData.gender,
        sampleData.test_purpose || 'peace_of_mind',
        sampleData.client_type || 'paternity',
        sampleData.urgent ? 1 : 0,
        sampleData.notes,
        sampleData.additional_notes
      );
      
      const createdSample = { id: result.lastInsertRowid, ...sampleData };
      
      // Log sample creation with audit trail if available
      if (req && typeof logSampleCreation === 'function') {
        try {
          const { logSampleCreation } = require('../middleware/auditTrail');
          logSampleCreation(
            createdSample,
            req.user?.id || null,
            req.user?.username || 'system',
            req.ip || req.connection?.remoteAddress
          );
        } catch (auditError) {
          logger.warn && logger.warn('Audit trail logging failed', { error: auditError.message });
        }
      }
      
      return createdSample;
    } catch (error) {
      logger.error && logger.error('Error creating sample', { error: error.message, sampleData });
      throw error;
    }
  }

  // Core database operations
  execute(statementName, params = []) {
    this.ensureConnection();
    
    const stmt = this.preparedStatements.get(statementName);
    if (!stmt) {
      throw new DatabaseError(`Prepared statement '${statementName}' not found`);
    }

    try {
      const result = stmt.run(...params);
      return result;
    } catch (error) {
      throw new DatabaseError(`Failed to execute statement '${statementName}'`, error);
    }
  }

  query(statementName, params = []) {
    this.ensureConnection();
    
    const stmt = this.preparedStatements.get(statementName);
    if (!stmt) {
      throw new DatabaseError(`Prepared statement '${statementName}' not found`);
    }

    try {
      const result = stmt.get(...params);
      return result;
    } catch (error) {
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
      const results = stmt.all(...params);
      return results;
    } catch (error) {
      throw new DatabaseError(`Failed to execute query all '${statementName}'`, error);
    }
  }

  raw(sql, params = []) {
    this.ensureConnection();
    
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.all(...params);
      return result;
    } catch (error) {
      throw new DatabaseError('Failed to execute raw query', error);
    }
  }

  transaction(fn) {
    this.ensureConnection();
    
    const transaction = this.db.transaction((fn) => {
      this.transactionDepth++;
      
      try {
        const result = fn();
        this.transactionDepth--;
        return result;
      } catch (error) {
        this.transactionDepth--;
        throw error;
      }
    });

    return transaction(fn);
  }

  ensureConnection() {
    if (!this.isConnected || !this.db) {
      this.connect();
    }
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
        this.isConnected = false;
        this.preparedStatements.clear();
        logger.info && logger.info('Database connection closed');
      } catch (error) {
        logger.error && logger.error('Error closing database connection', { error: error.message });
      }
    }
  }

  // Health check
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

  // Statistics
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
}

// Create and export singleton instance
const centralizedDatabaseService = new CentralizedDatabaseService();

module.exports = centralizedDatabaseService;