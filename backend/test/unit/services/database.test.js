const { expect } = require('chai');
const sinon = require('sinon');
const EnhancedDatabaseService = require('../../../services/enhancedDatabase');

describe('EnhancedDatabaseService', () => {
  let db;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    db = createTestDatabase();
  });

  afterEach(() => {
    sandbox.restore();
    if (db) {
      db.close();
    }
    cleanupTestDatabase();
  });

  describe('initialization', () => {
    it('should create database instance successfully', () => {
      expect(db).to.not.be.null;
      expect(db.open).to.be.true;
    });

    it('should have all required tables', () => {
      const tables = [
        'users', 'test_cases', 'samples', 'batches', 
        'well_assignments', 'quality_control', 'equipment', 'reports'
      ];

      tables.forEach(table => {
        const stmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`);
        const result = stmt.get(table);
        expect(result).to.not.be.undefined;
      });
    });

    it('should have foreign key constraints enabled', () => {
      const stmt = db.prepare('PRAGMA foreign_keys');
      const result = stmt.get();
      expect(result.foreign_keys).to.equal(1);
    });
  });

  describe('sample operations', () => {
    beforeEach(() => {
      // Insert test case first
      const testCase = generateTestCase();
      const stmt = db.prepare(`
        INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(testCase.case_number, testCase.ref_kit_number, testCase.submission_date, testCase.client_type);
    });

    it('should create sample successfully', () => {
      const sampleData = generateTestSample();
      
      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number
      );

      expect(result.lastInsertRowid).to.be.a('number');
      expect(result.changes).to.equal(1);

      // Verify the sample exists
      expectDatabaseToHave(db, 'samples', { lab_number: sampleData.lab_number });
    });

    it('should retrieve sample by lab number', () => {
      const sampleData = generateTestSample();
      
      // Insert sample
      const insertStmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number
      );

      // Retrieve sample
      const selectStmt = db.prepare('SELECT * FROM samples WHERE lab_number = ?');
      const result = selectStmt.get(sampleData.lab_number);

      expect(result).to.not.be.undefined;
      expect(result.name).to.equal(sampleData.name);
      expect(result.surname).to.equal(sampleData.surname);
      expect(result.relation).to.equal(sampleData.relation);
    });

    it('should update sample workflow status', () => {
      const sampleData = generateTestSample();
      
      // Insert sample
      const insertStmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertResult = insertStmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number
      );

      // Update workflow status
      const updateStmt = db.prepare(`
        UPDATE samples 
        SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      const updateResult = updateStmt.run('pcr_ready', insertResult.lastInsertRowid);
      expect(updateResult.changes).to.equal(1);

      // Verify update
      const selectStmt = db.prepare('SELECT workflow_status FROM samples WHERE id = ?');
      const result = selectStmt.get(insertResult.lastInsertRowid);
      expect(result.workflow_status).to.equal('pcr_ready');
    });

    it('should enforce unique lab number constraint', () => {
      const sampleData = generateTestSample();
      
      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Insert first sample
      stmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number
      );

      // Attempt to insert duplicate lab number
      expect(() => {
        stmt.run(
          sampleData.case_id,
          sampleData.lab_number, // Same lab number
          'Different',
          'Name',
          sampleData.relation,
          sampleData.status,
          sampleData.workflow_status,
          sampleData.case_number
        );
      }).to.throw();
    });
  });

  describe('batch operations', () => {
    it('should create batch successfully', () => {
      const batchData = generateTestBatch();
      
      const stmt = db.prepare(`
        INSERT INTO batches (batch_number, operator, total_samples, status)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        batchData.batch_number,
        batchData.operator,
        batchData.total_samples,
        batchData.status
      );

      expect(result.lastInsertRowid).to.be.a('number');
      expect(result.changes).to.equal(1);

      expectDatabaseToHave(db, 'batches', { batch_number: batchData.batch_number });
    });

    it('should retrieve batch with samples', () => {
      // Create batch
      const batchData = generateTestBatch();
      const batchStmt = db.prepare(`
        INSERT INTO batches (batch_number, operator, total_samples, status)
        VALUES (?, ?, ?, ?)
      `);
      const batchResult = batchStmt.run(
        batchData.batch_number,
        batchData.operator,
        batchData.total_samples,
        batchData.status
      );

      // Create test case first
      const testCase = generateTestCase();
      const caseStmt = db.prepare(`
        INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type)
        VALUES (?, ?, ?, ?)
      `);
      caseStmt.run(testCase.case_number, testCase.ref_kit_number, testCase.submission_date, testCase.client_type);

      // Create sample in batch
      const sampleData = generateTestSample({ batch_id: batchResult.lastInsertRowid });
      const sampleStmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number, batch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      sampleStmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number,
        sampleData.batch_id
      );

      // Query batch with samples
      const query = `
        SELECT b.*, COUNT(s.id) as sample_count
        FROM batches b
        LEFT JOIN samples s ON b.id = s.batch_id
        WHERE b.id = ?
        GROUP BY b.id
      `;
      const result = db.prepare(query).get(batchResult.lastInsertRowid);

      expect(result.batch_number).to.equal(batchData.batch_number);
      expect(result.sample_count).to.equal(1);
    });
  });

  describe('test case operations', () => {
    it('should create test case successfully', () => {
      const testCaseData = generateTestCase();
      
      const stmt = db.prepare(`
        INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        testCaseData.case_number,
        testCaseData.ref_kit_number,
        testCaseData.submission_date,
        testCaseData.client_type,
        testCaseData.status
      );

      expect(result.lastInsertRowid).to.be.a('number');
      expectDatabaseToHave(db, 'test_cases', { case_number: testCaseData.case_number });
    });

    it('should enforce unique case number constraint', () => {
      const testCaseData = generateTestCase();
      
      const stmt = db.prepare(`
        INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type)
        VALUES (?, ?, ?, ?)
      `);
      
      // Insert first case
      stmt.run(
        testCaseData.case_number,
        testCaseData.ref_kit_number,
        testCaseData.submission_date,
        testCaseData.client_type
      );

      // Attempt to insert duplicate case number
      expect(() => {
        stmt.run(
          testCaseData.case_number, // Same case number
          'DIFFERENT_KIT',
          testCaseData.submission_date,
          testCaseData.client_type
        );
      }).to.throw();
    });
  });

  describe('well assignment operations', () => {
    let batchId, sampleId;

    beforeEach(() => {
      // Create test case
      const testCase = generateTestCase();
      const caseStmt = db.prepare(`
        INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type)
        VALUES (?, ?, ?, ?)
      `);
      caseStmt.run(testCase.case_number, testCase.ref_kit_number, testCase.submission_date, testCase.client_type);

      // Create batch
      const batchData = generateTestBatch();
      const batchStmt = db.prepare(`
        INSERT INTO batches (batch_number, operator, total_samples, status)
        VALUES (?, ?, ?, ?)
      `);
      const batchResult = batchStmt.run(
        batchData.batch_number,
        batchData.operator,
        batchData.total_samples,
        batchData.status
      );
      batchId = batchResult.lastInsertRowid;

      // Create sample
      const sampleData = generateTestSample();
      const sampleStmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const sampleResult = sampleStmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number
      );
      sampleId = sampleResult.lastInsertRowid;
    });

    it('should create well assignment successfully', () => {
      const stmt = db.prepare(`
        INSERT INTO well_assignments (batch_id, well_position, sample_id, well_type)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(batchId, 'A01', sampleId, 'Sample');

      expect(result.changes).to.equal(1);
      expectDatabaseToHave(db, 'well_assignments', { 
        batch_id: batchId, 
        well_position: 'A01' 
      });
    });

    it('should enforce unique well position per batch', () => {
      const stmt = db.prepare(`
        INSERT INTO well_assignments (batch_id, well_position, sample_id, well_type)
        VALUES (?, ?, ?, ?)
      `);
      
      // Insert first assignment
      stmt.run(batchId, 'A01', sampleId, 'Sample');

      // Attempt to insert duplicate well position
      expect(() => {
        stmt.run(batchId, 'A01', null, 'Blank');
      }).to.throw();
    });
  });

  describe('performance tests', () => {
    it('should handle large number of samples efficiently', async () => {
      // Create test case
      const testCase = generateTestCase();
      const caseStmt = db.prepare(`
        INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type)
        VALUES (?, ?, ?, ?)
      `);
      caseStmt.run(testCase.case_number, testCase.ref_kit_number, testCase.submission_date, testCase.client_type);

      const sampleCount = 1000;
      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const { duration } = await measureAsyncOperation(async () => {
        const transaction = db.transaction((samples) => {
          for (const sample of samples) {
            stmt.run(
              sample.case_id,
              sample.lab_number,
              sample.name,
              sample.surname,
              sample.relation,
              sample.status,
              sample.workflow_status,
              sample.case_number
            );
          }
        });

        const samples = Array.from({ length: sampleCount }, (_, i) => 
          generateTestSample({ lab_number: `25_${i + 1}` })
        );

        transaction(samples);
      }, `Insert ${sampleCount} samples`);

      // Should complete within reasonable time (less than 1 second)
      expect(duration).to.be.lessThan(1000);

      // Verify all samples were inserted
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM samples');
      const result = countStmt.get();
      expect(result.count).to.equal(sampleCount);
    });

    it('should query samples efficiently with indexes', async () => {
      // Insert test data
      const testCase = generateTestCase();
      const caseStmt = db.prepare(`
        INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type)
        VALUES (?, ?, ?, ?)
      `);
      caseStmt.run(testCase.case_number, testCase.ref_kit_number, testCase.submission_date, testCase.client_type);

      const samples = Array.from({ length: 1000 }, (_, i) => 
        generateTestSample({ 
          lab_number: `25_${i + 1}`,
          workflow_status: i % 3 === 0 ? 'pcr_ready' : 'sample_collected'
        })
      );

      const insertStmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertTransaction = db.transaction((samples) => {
        for (const sample of samples) {
          insertStmt.run(
            sample.case_id,
            sample.lab_number,
            sample.name,
            sample.surname,
            sample.relation,
            sample.status,
            sample.workflow_status,
            sample.case_number
          );
        }
      });

      insertTransaction(samples);

      // Query with index
      const { duration } = await measureAsyncOperation(async () => {
        const stmt = db.prepare(`
          SELECT * FROM samples 
          WHERE workflow_status = ? AND case_number = ?
          ORDER BY collection_date DESC
        `);
        return stmt.all('pcr_ready', 'CASE_2025_001');
      }, 'Query samples with workflow_status and case_number');

      // Should be very fast with proper indexing
      expect(duration).to.be.lessThan(50);
    });
  });
});