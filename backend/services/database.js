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

try {
  const performanceUtils = require('../middleware/performanceMonitoring');
  performanceMonitor = performanceUtils.performanceMonitor || null;
} catch (error) {
  performanceMonitor = null;
}

class UnifiedDatabaseService {
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
      
      if (logger.info) {
        logger.info('Database initialized successfully', {
          path: this.dbPath,
          mode: 'WAL',
          foreignKeys: true
        });
      } else {
        console.log('✅ Database initialized successfully at:', this.dbPath);
      }
      
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
      'cache_size = -64000',
      'temp_store = MEMORY',
      'mmap_size = 268435456',
      'recursive_triggers = ON',
      'optimize = 0x10002'
    ];

    pragmas.forEach(pragma => {
      try {
        this.db.pragma(pragma);
        if (logger && logger.debug) {
          logger.debug(`Applied pragma: ${pragma}`);
        }
      } catch (error) {
        if (logger && logger.warn) {
          logger.warn('Failed to apply pragma', { pragma, error: error.message });
        } else {
          console.warn(`⚠️ Failed to apply pragma ${pragma}:`, error.message);
        }
      }
    });
    
    // Performance optimization
    try {
      this.db.pragma('analysis_limit = 1000');
      this.db.exec('PRAGMA optimize');
      console.log('✅ Database optimization pragmas applied');
    } catch (error) {
      if (logger && logger.warn) {
        logger.warn('Failed to apply optimization pragmas', { error: error.message });
      }
    }
  }

  createTables() {
    try {
      if (fs.existsSync(this.schemaPath)) {
        const schema = fs.readFileSync(this.schemaPath, 'utf8');
        this.db.exec(schema);
      }
      
      const geneticSchemaPath = path.join(__dirname, '..', 'database', 'genetic-schema-sqlite.sql');
      if (fs.existsSync(geneticSchemaPath)) {
        const geneticSchema = fs.readFileSync(geneticSchemaPath, 'utf8');
        this.db.exec(geneticSchema);
        if (logger.info) {
          logger.info('Genetic analysis schema loaded successfully');
        }
      }
      
      const osirisCacheSchemaPath = path.join(__dirname, '..', 'database', 'osiris-cache-schema.sql');
      if (fs.existsSync(osirisCacheSchemaPath)) {
        const osirisCacheSchema = fs.readFileSync(osirisCacheSchemaPath, 'utf8');
        this.db.exec(osirisCacheSchema);
        if (logger.info) {
          logger.info('Osiris cache schema loaded successfully');
        } else {
          console.log('✅ Osiris cache schema loaded successfully');
        }
      }
      
      const enhancedReportsSchemaPath = path.join(__dirname, '..', 'database', 'enhanced-reports-schema.sql');
      if (fs.existsSync(enhancedReportsSchemaPath)) {
        const enhancedReportsSchema = fs.readFileSync(enhancedReportsSchemaPath, 'utf8');
        this.db.exec(enhancedReportsSchema);
        if (logger.info) {
          logger.info('Enhanced reports schema loaded successfully');
        } else {
          console.log('✅ Enhanced reports schema loaded successfully');
        }
      }
      
      if (logger.info) {
        logger.info('Database schema created/updated successfully');
      }
      
      // Create optimized indexes for better performance
      this.createOptimizedIndexes();
      
    } catch (error) {
      throw new DatabaseError('Failed to create database schema', error);
    }
  }

  // Create optimized indexes for better query performance
  createOptimizedIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status)',
      'CREATE INDEX IF NOT EXISTS idx_samples_workflow ON samples(workflow_status)',
      'CREATE INDEX IF NOT EXISTS idx_samples_batch ON samples(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_samples_case ON samples(case_number)',
      'CREATE INDEX IF NOT EXISTS idx_samples_created ON samples(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number)',
      'CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)',
      'CREATE INDEX IF NOT EXISTS idx_batches_created ON batches(created_at)'
    ];
    
    try {
      const startTime = Date.now();
      indexes.forEach(indexSQL => {
        this.db.exec(indexSQL);
      });
      
      const indexTime = Date.now() - startTime;
      
      if (logger && logger.debug) {
        logger.debug('Database indexes created successfully', { 
          indexCount: indexes.length,
          indexTime: `${indexTime}ms`
        });
      } else {
        console.log(`✅ Created ${indexes.length} database indexes (${indexTime}ms)`);
      }
    } catch (error) {
      if (logger && logger.warn) {
        logger.warn('Failed to create some indexes', { error: error.message });
      } else {
        console.warn('⚠️ Failed to create some database indexes:', error.message);
      }
    }
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
      getAllSamples: 'SELECT * FROM samples ORDER BY id DESC',
      updateSampleWorkflow: 'UPDATE samples SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      updateSampleBatch: 'UPDATE samples SET batch_id = ?, workflow_status = ?, lab_batch_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      
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
      getAllTestCases: 'SELECT * FROM test_cases ORDER BY created_at DESC',
      
      // Batch operations
      createBatch: `
        INSERT INTO batches (
          batch_number, operator, pcr_date, electro_date, 
          settings, total_samples, plate_layout, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      
      getBatch: 'SELECT * FROM batches WHERE batch_number = ?',
      getBatchById: 'SELECT * FROM batches WHERE id = ?',
      getAllBatches: 'SELECT * FROM batches ORDER BY created_at DESC',
      
      // Quality control operations
      createQualityControl: `
        INSERT INTO quality_control (batch_id, date, control_type, result, operator, comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      
      getQualityControlRecords: 'SELECT * FROM quality_control ORDER BY date DESC',
      
      // Equipment operations
      getAllEquipment: 'SELECT * FROM equipment ORDER BY equipment_id',
      updateEquipmentCalibration: 'UPDATE equipment SET last_calibration = ?, next_calibration = ? WHERE equipment_id = ?',
      
      // Report operations
      createReport: `
        INSERT INTO reports (case_id, batch_id, report_number, report_type, date_generated, status, file_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      
      getAllReports: 'SELECT * FROM reports ORDER BY date_generated DESC'
    };

    for (const [name, sql] of Object.entries(statements)) {
      try {
        this.preparedStatements.set(name, this.db.prepare(sql));
      } catch (error) {
        if (logger.warn) {
          logger.warn('Failed to prepare statement', { name, error: error.message });
        }
      }
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

  // Sample methods
  createSample(sampleData) {
    return this.execute('createSample', [
      sampleData.case_id,
      sampleData.lab_number,
      sampleData.name,
      sampleData.surname,
      sampleData.id_dob,
      sampleData.date_of_birth,
      sampleData.place_of_birth,
      sampleData.nationality,
      sampleData.occupation,
      sampleData.address,
      sampleData.phone_number,
      sampleData.email,
      sampleData.id_number,
      sampleData.id_type,
      sampleData.marital_status,
      sampleData.ethnicity,
      sampleData.collection_date,
      sampleData.submission_date,
      sampleData.relation,
      sampleData.additional_notes,
      sampleData.case_number,
      sampleData.gender,
      sampleData.age,
      sampleData.sample_type,
      sampleData.notes,
      sampleData.status || 'active',
      sampleData.workflow_status || 'sample_collected'
    ]);
  }

  getSample(labNumber) {
    return this.query('getSample', [labNumber]);
  }

  getAllSamples() {
    return this.queryAll('getAllSamples');
  }

  updateSampleBatch(sampleId, batchId, workflowStatus, batchNumber) {
    return this.execute('updateSampleBatch', [batchId, workflowStatus, batchNumber, sampleId]);
  }

  updateSampleWorkflowStatus(sampleId, workflowStatus) {
    return this.execute('updateSampleWorkflow', [workflowStatus, sampleId]);
  }

  searchSamples(query) {
    const searchTerm = `%${query}%`;
    return this.raw(`
      SELECT s.*, tc.case_number FROM samples s
      LEFT JOIN test_cases tc ON s.case_id = tc.id
      WHERE s.lab_number LIKE ? 
         OR s.name LIKE ? 
         OR s.surname LIKE ?
         OR tc.case_number LIKE ?
      ORDER BY 
        tc.case_number ASC,
        CAST(SUBSTR(s.lab_number, INSTR(s.lab_number, '_') + 1) AS INTEGER) ASC,
        CASE s.relation
          WHEN 'Child' THEN 1
          WHEN 'Alleged Father' THEN 2
          WHEN 'Mother' THEN 3
          ELSE 4
        END ASC
      LIMIT 100
    `, [searchTerm, searchTerm, searchTerm, searchTerm]);
  }

  getSamplesWithPagination(page = 1, limit = 50, filters = {}) {
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
        default:
          conditions.push('status = ?');
          params.push(filters.status);
      }
    }
    
    if (filters.search) {
      conditions.push('(lab_number LIKE ? OR name LIKE ? OR surname LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const countQuery = `SELECT COUNT(*) as total FROM samples ${whereClause}`;
    const total = this.db.prepare(countQuery).get(...params).total;
    
    const dataQuery = `
      SELECT 
        id, lab_number, name, surname, relation, status, 
        collection_date, workflow_status, case_number, batch_id, lab_batch_number
      FROM samples 
      ${whereClause}
      ORDER BY lab_number ASC 
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
  }

  getSampleCounts() {
    return this.raw(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%' AND lab_batch_number NOT LIKE '%_RR') THEN 1 END) as pcrBatched,
        COUNT(CASE WHEN workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%') THEN 1 END) as electroBatched,
        COUNT(CASE WHEN workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR') THEN 1 END) as rerunBatched,
        COUNT(CASE WHEN workflow_status IN ('analysis_completed') THEN 1 END) as completed,
        COUNT(CASE WHEN workflow_status IN ('pcr_batched', 'pcr_completed') THEN 1 END) as processing
      FROM samples
    `)[0];
  }

  // Sample queue management methods
  getSampleQueueCounts() {
    return this.raw(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%' AND lab_batch_number NOT LIKE '%_RR') THEN 1 END) as pcrBatched,
        COUNT(CASE WHEN workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%') THEN 1 END) as electroBatched,
        COUNT(CASE WHEN workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR') THEN 1 END) as rerunBatched,
        COUNT(CASE WHEN workflow_status IN ('analysis_completed') THEN 1 END) as completed,
        COUNT(CASE WHEN workflow_status IN ('pcr_batched', 'pcr_completed') THEN 1 END) as processing
      FROM samples
    `)[0];
  }

  getSamplesForQueue(queueType) {
    let whereClause = '';
    let params = [];
    
    switch (queueType) {
      case 'pcr_ready':
        whereClause = "WHERE workflow_status IN ('sample_collected', 'pcr_ready') AND batch_id IS NULL";
        break;
      case 'pcr_batched':
        whereClause = "WHERE workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%' AND lab_batch_number NOT LIKE '%_RR')";
        break;
      case 'electro_ready':
        whereClause = "WHERE workflow_status = 'pcr_completed' OR workflow_status = 'electro_ready'";
        break;
      case 'electro_batched':
        whereClause = "WHERE workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%')";
        break;
      case 'analysis_ready':
        whereClause = "WHERE workflow_status = 'electro_completed' OR workflow_status = 'analysis_ready'";
        break;
      case 'completed':
        whereClause = "WHERE workflow_status IN ('analysis_completed')";
        break;
      default:
        whereClause = "WHERE 1=1";
    }
    
    return this.raw(`
      SELECT 
        id, lab_number, name, surname, relation, status, 
        collection_date, workflow_status, case_number, batch_id, lab_batch_number
      FROM samples 
      ${whereClause}
      ORDER BY lab_number ASC 
      LIMIT 100
    `, params);
  }

  // Batch update sample workflow status
  batchUpdateSampleWorkflowStatus(sampleIds, workflowStatus) {
    if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
      throw new DatabaseError('Sample IDs array is required and cannot be empty');
    }
    
    const placeholders = sampleIds.map(() => '?').join(',');
    const sql = `
      UPDATE samples 
      SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `;
    
    const params = [workflowStatus, ...sampleIds];
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  // Additional missing methods for API compatibility
  getSamplesWithBatchingStatus() {
    return this.raw(`
      SELECT 
        id, lab_number, name, surname, relation, status, 
        collection_date, workflow_status, case_number, batch_id, lab_batch_number
      FROM samples 
      ORDER BY lab_number ASC
    `);
  }

  generateSequentialLabNumbers(clientType = 'paternity', count = 1) {
    const year = new Date().getFullYear();
    const yearSuffix = year.toString().slice(-2);
    
    let prefix = '';
    if (clientType === 'legal' || clientType === 'lt') {
      prefix = 'LT';
    }
    
    const searchPattern = prefix ? `${prefix}${yearSuffix}_%` : `${yearSuffix}_%`;
    const stmt = this.db.prepare(`
      SELECT lab_number FROM samples 
      WHERE lab_number LIKE ? 
      ORDER BY CAST(SUBSTR(lab_number, INSTR(lab_number, '_') + 1) AS INTEGER) DESC 
      LIMIT 1
    `);
    
    const lastNumber = stmt.get(searchPattern);
    let startSeq = 1;
    
    if (lastNumber) {
      const parts = lastNumber.lab_number.split('_');
      startSeq = (parseInt(parts[1]) || 0) + 1;
    }
    
    const labNumbers = [];
    for (let i = 0; i < count; i++) {
      labNumbers.push(`${prefix}${yearSuffix}_${String(startSeq + i).padStart(3, '0')}`);
    }
    
    return labNumbers;
  }

  getSamplesByBatchNumber(batchNumber) {
    return this.raw(`
      SELECT s.*, b.batch_number 
      FROM samples s
      JOIN batches b ON s.batch_id = b.id
      WHERE b.batch_number = ?
      ORDER BY s.lab_number ASC
    `, [batchNumber]);
  }

  // Well assignment methods (create tables if needed)
  createWellAssignment(wellData) {
    try {
      // Create table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS well_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_id INTEGER NOT NULL,
          well_position TEXT NOT NULL,
          sample_id INTEGER,
          well_type TEXT NOT NULL,
          kit_number TEXT,
          sample_name TEXT,
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const stmt = this.db.prepare(`
        INSERT INTO well_assignments (
          batch_id, well_position, sample_id, well_type, 
          kit_number, sample_name, comment
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      return stmt.run(
        wellData.batch_id,
        wellData.well_position,
        wellData.sample_id,
        wellData.well_type,
        wellData.kit_number,
        wellData.sample_name,
        wellData.comment
      );
    } catch (error) {
      throw new DatabaseError('Failed to create well assignment', error);
    }
  }

  getWellAssignments(batchId) {
    try {
      // Create table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS well_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_id INTEGER NOT NULL,
          well_position TEXT NOT NULL,
          sample_id INTEGER,
          well_type TEXT NOT NULL,
          kit_number TEXT,
          sample_name TEXT,
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      return this.raw(`
        SELECT * FROM well_assignments 
        WHERE batch_id = ? 
        ORDER BY well_position ASC
      `, [batchId]);
    } catch (error) {
      throw new DatabaseError('Failed to get well assignments', error);
    }
  }

  // Test case methods
  createTestCase(testCaseData) {
    return this.execute('createTestCase', [
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
      testCaseData.legal_declarations
    ]);
  }

  getTestCase(caseNumber) {
    return this.query('getTestCase', [caseNumber]);
  }

  getAllTestCases() {
    return this.queryAll('getAllTestCases');
  }

  // Genetic analysis case methods
  getAllGeneticCases() {
    try {
      this.ensureConnection();
      // Return existing test cases as genetic cases for now
      // In the future, this could be a separate genetic_cases table
      const cases = this.queryAll('getAllTestCases');
      
      // Transform test cases to genetic case format
      return cases.map(testCase => ({
        id: testCase.id,
        caseId: `GA-${testCase.case_number}`,
        caseNumber: testCase.case_number,
        refKitNumber: testCase.ref_kit_number,
        status: testCase.status || 'pending',
        submissionDate: testCase.submission_date,
        clientType: testCase.client_type,
        testPurpose: testCase.test_purpose,
        sampleType: testCase.sample_type,
        createdAt: testCase.created_at,
        updatedAt: testCase.updated_at
      }));
    } catch (error) {
      if (logger.error) {
        logger.error('Error getting genetic cases', { error: error.message });
      }
      return [];
    }
  }

  // Batch methods
  createBatch(batchData) {
    return this.execute('createBatch', [
      batchData.batch_number,
      batchData.operator,
      batchData.pcr_date,
      batchData.electro_date,
      batchData.settings,
      batchData.total_samples,
      JSON.stringify(batchData.plate_layout),
      batchData.status || 'active'
    ]);
  }

  getBatch(batchNumber) {
    const batch = this.query('getBatch', [batchNumber]);
    if (batch && batch.plate_layout) {
      batch.plate_layout = JSON.parse(batch.plate_layout);
    }
    return batch;
  }

  getBatchById(batchId) {
    const batch = this.query('getBatchById', [batchId]);
    if (batch && batch.plate_layout) {
      batch.plate_layout = JSON.parse(batch.plate_layout);
    }
    return batch;
  }

  getAllBatches() {
    const batches = this.queryAll('getAllBatches');
    return batches.map(batch => {
      if (batch.plate_layout) {
        batch.plate_layout = JSON.parse(batch.plate_layout);
      }
      return batch;
    });
  }

  // Quality control methods
  createQualityControl(qcData) {
    return this.execute('createQualityControl', [
      qcData.batch_id,
      qcData.date,
      qcData.control_type,
      qcData.result,
      qcData.operator,
      qcData.comments
    ]);
  }

  getQualityControlRecords(batchId = null) {
    if (batchId) {
      return this.raw('SELECT * FROM quality_control WHERE batch_id = ? ORDER BY date DESC', [batchId]);
    } else {
      return this.queryAll('getQualityControlRecords');
    }
  }

  // Equipment methods
  getAllEquipment() {
    return this.queryAll('getAllEquipment');
  }

  updateEquipmentCalibration(equipmentId, lastCalibration, nextCalibration) {
    return this.execute('updateEquipmentCalibration', [lastCalibration, nextCalibration, equipmentId]);
  }

  // Report methods
  createReport(reportData) {
    return this.execute('createReport', [
      reportData.case_id,
      reportData.batch_id,
      reportData.report_number,
      reportData.report_type,
      reportData.date_generated,
      reportData.status,
      reportData.file_path
    ]);
  }

  getAllReports() {
    return this.queryAll('getAllReports');
  }

  // Utility methods for standard database operations
  generateLabNumber(clientType = 'paternity') {
    const year = new Date().getFullYear();
    const yearSuffix = year.toString().slice(-2);
    
    let prefix = '';
    if (clientType === 'legal' || clientType === 'lt') {
      prefix = 'LT';
    }
    
    const searchPattern = prefix ? `${prefix}${yearSuffix}_%` : `${yearSuffix}_%`;
    const stmt = this.db.prepare(`
      SELECT lab_number FROM samples 
      WHERE lab_number LIKE ? 
      ORDER BY CAST(SUBSTR(lab_number, INSTR(lab_number, '_') + 1) AS INTEGER) DESC 
      LIMIT 1
    `);
    
    const lastNumber = stmt.get(searchPattern);
    
    if (lastNumber) {
      const parts = lastNumber.lab_number.split('_');
      const lastSeq = parseInt(parts[1]) || 0;
      return `${prefix}${yearSuffix}_${lastSeq + 1}`;
    } else {
      return `${prefix}${yearSuffix}_1`;
    }
  }

  // Database wrapper methods for external services
  run(sql, params = []) {
    this.ensureConnection();
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    } catch (error) {
      throw new DatabaseError('Failed to execute statement', error);
    }
  }

  get(sql, params = []) {
    this.ensureConnection();
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(...params);
    } catch (error) {
      throw new DatabaseError('Failed to execute query', error);
    }
  }

  all(sql, params = []) {
    this.ensureConnection();
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      throw new DatabaseError('Failed to execute query', error);
    }
  }

  generateCaseNumber() {
    const year = new Date().getFullYear();
    const stmt = this.db.prepare(`
      SELECT case_number FROM test_cases 
      WHERE case_number LIKE ? 
      ORDER BY case_number DESC 
      LIMIT 1
    `);
    
    const lastCase = stmt.get(`CASE_${year}_%`);
    
    if (lastCase) {
      const lastSeq = parseInt(lastCase.case_number.split('_')[2]) || 0;
      return `CASE_${year}_${(lastSeq + 1).toString().padStart(3, '0')}`;
    } else {
      return `CASE_${year}_001`;
    }
  }

  // Health check and statistics
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
        if (logger.info) {
          logger.info('Database connection closed');
        }
      } catch (error) {
        if (logger.error) {
          logger.error('Error closing database connection', { error: error.message });
        }
      }
    }
  }

  // User authentication methods
  createUser(userData) {
    try {
      this.ensureConnection();
      const stmt = this.db.prepare(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        userData.username,
        userData.email,
        userData.password_hash,
        userData.role
      );
      
      return {
        id: result.lastInsertRowid,
        username: userData.username,
        email: userData.email,
        role: userData.role
      };
    } catch (error) {
      throw new DatabaseError('Failed to create user', error);
    }
  }

  getUserByUsername(username) {
    try {
      this.ensureConnection();
      const stmt = this.db.prepare(`
        SELECT id, username, email, password_hash, role, created_at, updated_at
        FROM users 
        WHERE username = ?
      `);
      
      return stmt.get(username);
    } catch (error) {
      throw new DatabaseError('Failed to get user by username', error);
    }
  }

  getUserByEmail(email) {
    try {
      this.ensureConnection();
      const stmt = this.db.prepare(`
        SELECT id, username, email, password_hash, role, created_at, updated_at
        FROM users 
        WHERE email = ?
      `);
      
      return stmt.get(email);
    } catch (error) {
      throw new DatabaseError('Failed to get user by email', error);
    }
  }

  getUserById(id) {
    try {
      this.ensureConnection();
      const stmt = this.db.prepare(`
        SELECT id, username, email, role, created_at, updated_at
        FROM users 
        WHERE id = ?
      `);
      
      return stmt.get(id);
    } catch (error) {
      throw new DatabaseError('Failed to get user by ID', error);
    }
  }

  getAllUsers() {
    try {
      this.ensureConnection();
      const stmt = this.db.prepare(`
        SELECT id, username, email, role, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC
      `);
      
      return stmt.all();
    } catch (error) {
      throw new DatabaseError('Failed to get all users', error);
    }
  }

  updateUser(id, userData) {
    try {
      this.ensureConnection();
      const updates = [];
      const values = [];
      
      if (userData.username) {
        updates.push('username = ?');
        values.push(userData.username);
      }
      
      if (userData.email) {
        updates.push('email = ?');
        values.push(userData.email);
      }
      
      if (userData.password_hash) {
        updates.push('password_hash = ?');
        values.push(userData.password_hash);
      }
      
      if (userData.role) {
        updates.push('role = ?');
        values.push(userData.role);
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const stmt = this.db.prepare(`
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `);
      
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        throw new Error('User not found');
      }
      
      return this.getUserById(id);
    } catch (error) {
      throw new DatabaseError('Failed to update user', error);
    }
  }

  deleteUser(id) {
    try {
      this.ensureConnection();
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error('User not found');
      }
      
      return { success: true, deletedId: id };
    } catch (error) {
      throw new DatabaseError('Failed to delete user', error);
    }
  }

  updateUserLastLogin(id) {
    try {
      this.ensureConnection();
      const stmt = this.db.prepare(`
        UPDATE users 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      stmt.run(id);
    } catch (error) {
      throw new DatabaseError('Failed to update user last login', error);
    }
  }

  checkUsernameExists(username, excludeId = null) {
    try {
      this.ensureConnection();
      let stmt;
      let result;
      
      if (excludeId) {
        stmt = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ? AND id != ?');
        result = stmt.get(username, excludeId);
      } else {
        stmt = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?');
        result = stmt.get(username);
      }
      
      return result.count > 0;
    } catch (error) {
      throw new DatabaseError('Failed to check username exists', error);
    }
  }

  checkEmailExists(email, excludeId = null) {
    try {
      this.ensureConnection();
      let stmt;
      let result;
      
      if (excludeId) {
        stmt = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ? AND id != ?');
        result = stmt.get(email, excludeId);
      } else {
        stmt = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
        result = stmt.get(email);
      }
      
      return result.count > 0;
    } catch (error) {
      throw new DatabaseError('Failed to check email exists', error);
    }
  }

  async shutdown() {
    if (logger.info) {
      logger.info('Initiating database shutdown');
    }
    
    if (this.transactionDepth > 0) {
      if (logger.warn) {
        logger.warn('Shutting down with active transactions', { 
          depth: this.transactionDepth 
        });
      }
    }
    
    this.close();
  }
}

// Create and export singleton instance
const databaseService = new UnifiedDatabaseService();

module.exports = databaseService;