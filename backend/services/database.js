const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
    this.schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    this.db = null;
    this.initialize();
  }

  initialize() {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize database
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      // Create tables if they don't exist
      this.createTables();
      
      console.log('SQLite database initialized successfully at:', this.dbPath);
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  createTables() {
    try {
      const schema = fs.readFileSync(this.schemaPath, 'utf8');
      this.db.exec(schema);
      
      // Add genetic analysis schema
      const geneticSchemaPath = path.join(__dirname, '..', 'database', 'genetic-schema-sqlite.sql');
      if (fs.existsSync(geneticSchemaPath)) {
        const geneticSchema = fs.readFileSync(geneticSchemaPath, 'utf8');
        this.db.exec(geneticSchema);
        console.log('Genetic analysis schema loaded successfully');
      }
      
      console.log('Database schema created/updated successfully');
    } catch (error) {
      console.error('Error creating database schema:', error);
      throw error;
    }
  }

  // Test Cases Methods
  createTestCase(testCaseData) {
    const stmt = this.db.prepare(`
      INSERT INTO test_cases (
        case_number, ref_kit_number, submission_date, client_type,
        mother_present, email_contact, phone_contact, address_area, comments,
        test_purpose, sample_type, authorized_collector, consent_type,
        has_signatures, has_witness, witness_name, legal_declarations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
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
    );
  }

  getTestCase(caseNumber) {
    const stmt = this.db.prepare('SELECT * FROM test_cases WHERE case_number = ?');
    return stmt.get(caseNumber);
  }

  // Samples Methods
  createSample(sampleData) {
    const stmt = this.db.prepare(`
      INSERT INTO samples (
        case_id, lab_number, name, surname, id_dob, date_of_birth,
        place_of_birth, nationality, occupation, address, phone_number,
        email, id_number, id_type, marital_status, ethnicity,
        collection_date, submission_date, relation, additional_notes,
        case_number, gender, age, sample_type, notes, status, workflow_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
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
    );
  }

  getSample(labNumber) {
    const stmt = this.db.prepare('SELECT * FROM samples WHERE lab_number = ?');
    return stmt.get(labNumber);
  }

  updateSampleBatch(sampleId, batchId, status = 'processing') {
    const stmt = this.db.prepare(`
      UPDATE samples 
      SET batch_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    return stmt.run(batchId, status, sampleId);
  }

  searchSamples(query) {
    const stmt = this.db.prepare(`
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
    `);
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  getAllSamples() {
    const stmt = this.db.prepare(`
      SELECT s.*, b.batch_number
      FROM samples s
      LEFT JOIN batches b ON s.batch_id = b.id
      ORDER BY 
        s.case_number ASC,
        CAST(SUBSTR(s.lab_number, INSTR(s.lab_number, '_') + 1) AS INTEGER) ASC,
        CASE s.relation
          WHEN 'child' THEN 1
          WHEN 'alleged_father' THEN 2
          WHEN 'mother' THEN 3
          ELSE 4
        END ASC
    `);
    return stmt.all();
  }

  getSamplesWithBatchingStatus() {
    const stmt = this.db.prepare(`
      SELECT s.*, tc.case_number, b.batch_number,
             CASE 
               WHEN s.batch_id IS NOT NULL THEN 'batched'
               WHEN s.status = 'pending' THEN 'to_be_batched'
               ELSE 'not_applicable'
             END as batch_status
      FROM samples s
      LEFT JOIN test_cases tc ON s.case_id = tc.id
      LEFT JOIN batches b ON s.batch_id = b.id
      ORDER BY 
        tc.case_number ASC,
        CAST(SUBSTR(s.lab_number, INSTR(s.lab_number, '_') + 1) AS INTEGER) ASC,
        CASE s.relation
          WHEN 'Child' THEN 1
          WHEN 'Alleged Father' THEN 2
          WHEN 'Mother' THEN 3
          ELSE 4
        END ASC
    `);
    return stmt.all();
  }

  // Batches Methods
  createBatch(batchData) {
    const stmt = this.db.prepare(`
      INSERT INTO batches (
        batch_number, operator, pcr_date, electro_date, 
        settings, total_samples, plate_layout
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      batchData.batch_number,
      batchData.operator,
      batchData.pcr_date,
      batchData.electro_date,
      batchData.settings,
      batchData.total_samples,
      JSON.stringify(batchData.plate_layout)
    );
  }

  getBatch(batchNumber) {
    const stmt = this.db.prepare('SELECT * FROM batches WHERE batch_number = ?');
    const batch = stmt.get(batchNumber);
    if (batch && batch.plate_layout) {
      batch.plate_layout = JSON.parse(batch.plate_layout);
    }
    return batch;
  }

  getAllBatches() {
    const stmt = this.db.prepare('SELECT * FROM batches ORDER BY created_at DESC');
    const batches = stmt.all();
    return batches.map(batch => {
      if (batch.plate_layout) {
        batch.plate_layout = JSON.parse(batch.plate_layout);
      }
      return batch;
    });
  }

  // Well Assignments Methods
  createWellAssignment(wellData) {
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
  }

  getWellAssignments(batchId) {
    const stmt = this.db.prepare(`
      SELECT wa.*, s.name as sample_name_full, s.surname 
      FROM well_assignments wa
      LEFT JOIN samples s ON wa.sample_id = s.id
      WHERE wa.batch_id = ?
      ORDER BY wa.well_position
    `);
    return stmt.all(batchId);
  }

  // Quality Control Methods
  createQualityControl(qcData) {
    const stmt = this.db.prepare(`
      INSERT INTO quality_control (
        batch_id, date, control_type, result, operator, comments
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      qcData.batch_id,
      qcData.date,
      qcData.control_type,
      qcData.result,
      qcData.operator,
      qcData.comments
    );
  }

  getQualityControlRecords(batchId = null) {
    let stmt;
    if (batchId) {
      stmt = this.db.prepare('SELECT * FROM quality_control WHERE batch_id = ? ORDER BY date DESC');
      return stmt.all(batchId);
    } else {
      stmt = this.db.prepare('SELECT * FROM quality_control ORDER BY date DESC');
      return stmt.all();
    }
  }

  // Equipment Methods
  getAllEquipment() {
    const stmt = this.db.prepare('SELECT * FROM equipment ORDER BY equipment_id');
    return stmt.all();
  }

  updateEquipmentCalibration(equipmentId, lastCalibration, nextCalibration) {
    const stmt = this.db.prepare(`
      UPDATE equipment 
      SET last_calibration = ?, next_calibration = ?
      WHERE equipment_id = ?
    `);
    return stmt.run(lastCalibration, nextCalibration, equipmentId);
  }

  // Reports Methods
  createReport(reportData) {
    const stmt = this.db.prepare(`
      INSERT INTO reports (
        case_id, batch_id, report_number, report_type,
        date_generated, status, file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      reportData.case_id,
      reportData.batch_id,
      reportData.report_number,
      reportData.report_type,
      reportData.date_generated,
      reportData.status,
      reportData.file_path
    );
  }

  getAllReports() {
    const stmt = this.db.prepare('SELECT * FROM reports ORDER BY date_generated DESC');
    return stmt.all();
  }

  // Test Cases Methods
  getAllTestCases() {
    const stmt = this.db.prepare('SELECT * FROM test_cases ORDER BY created_at DESC');
    return stmt.all();
  }

  // Statistics Methods
  getStatistics(period = 'daily') {
    const dateFilter = period === 'daily' 
      ? "DATE(created_at) = DATE('now')"
      : "DATE(created_at) >= DATE('now', 'start of month')";

    const stmt = this.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM samples 
      WHERE ${dateFilter}
      GROUP BY status
    `);

    return stmt.all();
  }

  getSampleCounts() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM samples
    `);

    return stmt.get();
  }

  // Utility Methods
  generateLabNumber(clientType = 'paternity') {
    const year = new Date().getFullYear();
    const yearSuffix = year.toString().slice(-2); // Get last 2 digits (25 for 2025)
    
    let prefix = '';
    if (clientType === 'legal' || clientType === 'lt') {
      prefix = 'LT';
    }
    
    // Get the highest sequence number for this year and client type
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

  generateSequentialLabNumbers(clientType = 'paternity', count = 2) {
    const year = new Date().getFullYear();
    const yearSuffix = year.toString().slice(-2);
    
    let prefix = '';
    if (clientType === 'legal' || clientType === 'lt') {
      prefix = 'LT';
    }
    
    // Get the highest sequence number for this year and client type
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
    
    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(`${prefix}${yearSuffix}_${startSeq + i}`);
    }
    
    return numbers;
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

  // Transaction wrapper
  transaction(fn) {
    return this.db.transaction(fn);
  }

  // Genetic Analysis Methods
  createGeneticCase(caseData) {
    const stmt = this.db.prepare(`
      INSERT INTO genetic_cases (case_id, case_type, priority, notes) 
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(caseData.caseId, caseData.caseType, caseData.priority, caseData.notes);
  }

  getGeneticCase(caseId) {
    const stmt = this.db.prepare('SELECT * FROM genetic_cases WHERE case_id = ?');
    return stmt.get(caseId);
  }

  getAllGeneticCases() {
    const stmt = this.db.prepare('SELECT * FROM genetic_case_summary ORDER BY created_date DESC');
    return stmt.all();
  }

  updateGeneticCaseStatus(caseId, status) {
    const stmt = this.db.prepare(`
      UPDATE genetic_cases 
      SET status = ?, updated_date = CURRENT_TIMESTAMP 
      WHERE case_id = ?
    `);
    return stmt.run(status, caseId);
  }

  createGeneticSample(sampleData) {
    const stmt = this.db.prepare(`
      INSERT INTO genetic_samples (
        sample_id, case_id, sample_type, file_path, original_filename,
        file_hash, quality_score, instrument, kit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      sampleData.sampleId,
      sampleData.caseId,
      sampleData.sampleType,
      sampleData.filePath,
      sampleData.originalFilename,
      sampleData.fileHash,
      sampleData.qualityScore,
      sampleData.instrument,
      sampleData.kit
    );
  }

  getGeneticSamplesByCase(caseId) {
    const stmt = this.db.prepare('SELECT * FROM genetic_samples WHERE case_id = ?');
    return stmt.all(caseId);
  }

  createSTRProfile(profileData) {
    const stmt = this.db.prepare(`
      INSERT INTO str_profiles (
        sample_id, locus, allele_1, allele_2, peak_height_1, peak_height_2
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      profileData.sampleId,
      profileData.locus,
      profileData.allele1,
      profileData.allele2,
      profileData.peakHeight1,
      profileData.peakHeight2
    );
  }

  getSTRProfile(sampleId) {
    const stmt = this.db.prepare('SELECT * FROM str_profiles WHERE sample_id = ? ORDER BY locus');
    return stmt.all(sampleId);
  }

  createGeneticAnalysisResult(resultData) {
    const stmt = this.db.prepare(`
      INSERT INTO genetic_analysis_results (
        case_id, paternity_probability, exclusion_probability, 
        matching_loci, total_loci, conclusion, osiris_output_path, quality_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      resultData.caseId,
      resultData.paternityProbability,
      resultData.exclusionProbability,
      resultData.matchingLoci,
      resultData.totalLoci,
      resultData.conclusion,
      resultData.osirisOutputPath,
      resultData.qualityScore
    );
  }

  getGeneticAnalysisResult(caseId) {
    const stmt = this.db.prepare('SELECT * FROM genetic_analysis_results WHERE case_id = ?');
    return stmt.get(caseId);
  }

  createLociComparison(comparisonData) {
    const stmt = this.db.prepare(`
      INSERT INTO loci_comparisons (
        result_id, locus, child_allele_1, child_allele_2,
        father_allele_1, father_allele_2, mother_allele_1, mother_allele_2, match_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      comparisonData.resultId,
      comparisonData.locus,
      comparisonData.childAllele1,
      comparisonData.childAllele2,
      comparisonData.fatherAllele1,
      comparisonData.fatherAllele2,
      comparisonData.motherAllele1,
      comparisonData.motherAllele2,
      comparisonData.matchStatus ? 1 : 0
    );
  }

  getLociComparisons(resultId) {
    const stmt = this.db.prepare('SELECT * FROM loci_comparisons WHERE result_id = ? ORDER BY locus');
    return stmt.all(resultId);
  }

  addToOsirisQueue(caseId, priority = 5) {
    const stmt = this.db.prepare(`
      INSERT INTO osiris_analysis_queue (case_id, priority) 
      VALUES (?, ?)
    `);
    return stmt.run(caseId, priority);
  }

  updateOsirisQueueStatus(caseId, status, errorMessage = null) {
    const stmt = this.db.prepare(`
      UPDATE osiris_analysis_queue 
      SET status = ?, 
          ${status === 'running' ? 'started_date = CURRENT_TIMESTAMP' : ''},
          ${status === 'completed' || status === 'failed' ? 'completed_date = CURRENT_TIMESTAMP' : ''},
          ${errorMessage ? 'error_message = ?' : ''}
      WHERE case_id = ?
    `);
    
    const params = errorMessage ? [status, errorMessage, caseId] : [status, caseId];
    return stmt.run(...params);
  }

  getOsirisQueueStatus(caseId) {
    const stmt = this.db.prepare(`
      SELECT * FROM osiris_analysis_queue 
      WHERE case_id = ? 
      ORDER BY submitted_date DESC 
      LIMIT 1
    `);
    return stmt.get(caseId);
  }

  addGeneticFileAudit(auditData) {
    const stmt = this.db.prepare(`
      INSERT INTO genetic_file_audit (sample_id, action, details) 
      VALUES (?, ?, ?)
    `);
    return stmt.run(auditData.sampleId, auditData.action, auditData.details);
  }

  addGeneticQCMetric(metricData) {
    const stmt = this.db.prepare(`
      INSERT INTO genetic_qc_metrics (
        sample_id, metric_name, metric_value, pass_status
      ) VALUES (?, ?, ?, ?)
    `);
    return stmt.run(
      metricData.sampleId,
      metricData.metricName,
      metricData.metricValue,
      metricData.passStatus ? 1 : 0
    );
  }

  generateGeneticCaseNumber() {
    const year = new Date().getFullYear();
    const stmt = this.db.prepare(`
      SELECT case_id FROM genetic_cases 
      WHERE case_id LIKE ? 
      ORDER BY case_id DESC 
      LIMIT 1
    `);
    
    const lastCase = stmt.get(`PAT-${year}-%`);
    
    if (lastCase) {
      const lastSeq = parseInt(lastCase.case_id.split('-')[2]) || 0;
      return `PAT-${year}-${(lastSeq + 1).toString().padStart(3, '0')}`;
    } else {
      return `PAT-${year}-001`;
    }
  }

  // Sample Queue Management Methods
  
  updateSampleWorkflowStatus(sampleId, workflowStatus) {
    const stmt = this.db.prepare(`
      UPDATE samples 
      SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    return stmt.run(workflowStatus, sampleId);
  }

  getSamplesByWorkflowStatus(workflowStatus) {
    const stmt = this.db.prepare(`
      SELECT s.*, tc.case_number, b.batch_number
      FROM samples s
      LEFT JOIN test_cases tc ON s.case_id = tc.id
      LEFT JOIN batches b ON s.batch_id = b.id
      WHERE s.workflow_status = ?
      ORDER BY s.collection_date ASC, s.id ASC
    `);
    return stmt.all(workflowStatus);
  }

  getSampleQueueCounts() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_samples,
        COUNT(CASE WHEN workflow_status = 'sample_collected' THEN 1 END) as sample_collected,
        COUNT(CASE WHEN workflow_status = 'pcr_ready' THEN 1 END) as pcr_ready,
        COUNT(CASE WHEN workflow_status = 'pcr_batched' THEN 1 END) as pcr_batched,
        COUNT(CASE WHEN workflow_status = 'pcr_completed' THEN 1 END) as pcr_completed,
        COUNT(CASE WHEN workflow_status = 'electro_ready' THEN 1 END) as electro_ready,
        COUNT(CASE WHEN workflow_status = 'electro_batched' THEN 1 END) as electro_batched,
        COUNT(CASE WHEN workflow_status = 'electro_completed' THEN 1 END) as electro_completed,
        COUNT(CASE WHEN workflow_status = 'analysis_ready' THEN 1 END) as analysis_ready,
        COUNT(CASE WHEN workflow_status = 'analysis_completed' THEN 1 END) as analysis_completed,
        COUNT(CASE WHEN workflow_status = 'report_ready' THEN 1 END) as report_ready,
        COUNT(CASE WHEN workflow_status = 'report_sent' THEN 1 END) as report_sent
      FROM samples
      WHERE status != 'cancelled'
    `);
    return stmt.get();
  }

  getSamplesForQueue(queueType) {
    let workflowStatuses = [];
    
    switch (queueType) {
      case 'pcr_ready':
        workflowStatuses = ['sample_collected', 'pcr_ready'];
        break;
      case 'pcr_batched':
        workflowStatuses = ['pcr_batched'];
        break;
      case 'electro_ready':
        workflowStatuses = ['pcr_completed', 'electro_ready'];
        break;
      case 'electro_batched':
        workflowStatuses = ['electro_batched'];
        break;
      case 'analysis_ready':
        workflowStatuses = ['electro_completed', 'analysis_ready'];
        break;
      case 'completed':
        workflowStatuses = ['analysis_completed', 'report_ready', 'report_sent'];
        break;
      default:
        workflowStatuses = ['sample_collected'];
    }

    const placeholders = workflowStatuses.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT s.*, tc.case_number, b.batch_number
      FROM samples s
      LEFT JOIN test_cases tc ON s.case_id = tc.id
      LEFT JOIN batches b ON s.batch_id = b.id
      WHERE s.workflow_status IN (${placeholders})
      ORDER BY s.collection_date ASC, tc.case_number ASC, 
               CASE s.relation 
                 WHEN 'Child' THEN 1
                 WHEN 'Father' THEN 2
                 WHEN 'Mother' THEN 3
                 ELSE 4
               END ASC
    `);
    return stmt.all(...workflowStatuses);
  }

  batchUpdateSampleWorkflowStatus(sampleIds, workflowStatus) {
    const stmt = this.db.prepare(`
      UPDATE samples 
      SET workflow_status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    const updateBatch = this.db.transaction((ids, status) => {
      for (const id of ids) {
        stmt.run(status, id);
      }
    });
    
    return updateBatch(sampleIds, workflowStatus);
  }

  // Clear all samples from database
  clearAllSamples() {
    const stmt = this.db.prepare('DELETE FROM samples');
    stmt.run();
  }

  // Get total sample count
  getSampleCount() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM samples');
    const result = stmt.get();
    return result.count;
  }

  // Get samples for a specific batch
  getSamplesByBatchId(batchId) {
    const stmt = this.db.prepare(`
      SELECT s.*, b.batch_number
      FROM samples s
      LEFT JOIN batches b ON s.batch_id = b.id
      WHERE s.batch_id = ?
      ORDER BY 
        s.case_number ASC,
        CAST(SUBSTR(s.lab_number, INSTR(s.lab_number, '_') + 1) AS INTEGER) ASC
    `);
    return stmt.all(batchId);
  }

  // Get samples for a specific batch by batch number
  getSamplesByBatchNumber(batchNumber) {
    const stmt = this.db.prepare(`
      SELECT s.*, b.batch_number
      FROM samples s
      LEFT JOIN batches b ON s.batch_id = b.id
      WHERE b.batch_number = ?
      ORDER BY 
        s.case_number ASC,
        CAST(SUBSTR(s.lab_number, INSTR(s.lab_number, '_') + 1) AS INTEGER) ASC
    `);
    return stmt.all(batchNumber);
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Create and export singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;