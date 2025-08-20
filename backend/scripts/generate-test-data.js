const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = path.join(__dirname, '..', 'labdna.db');
const db = new Database(dbPath);

// Helper function to generate random date within range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate random ID
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// STR markers for PowerPlex 16
const strMarkers = [
  'AMEL', 'CSF1PO', 'D13S317', 'D16S539', 'D18S51', 'D21S11',
  'D3S1358', 'D5S818', 'D7S820', 'D8S1179', 'FGA', 'Penta D',
  'Penta E', 'TH01', 'TPOX', 'vWA'
];

// Generate comprehensive test data
function generateTestData() {
  console.log('🚀 Starting comprehensive test data generation...');

  try {
    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();

    // 1. Generate Clients
    console.log('\n📝 Generating clients...');
    const clients = [];
    const clientInsert = db.prepare(`
      INSERT OR REPLACE INTO clients (
        case_number, kit_number, collection_date, 
        alleged_father_name, mother_name, child_name,
        alleged_father_id, mother_id, child_id,
        alleged_father_phone, mother_phone,
        address, status, workflow_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 50; i++) {
      const caseNum = `BN-${String(i).padStart(3, '0')}`;
      const kitNum = `PT${String(i).padStart(3, '0')}`;
      const collectionDate = randomDate(new Date(2024, 0, 1), new Date()).toISOString().split('T')[0];
      
      const client = {
        case_number: caseNum,
        kit_number: kitNum,
        collection_date: collectionDate,
        alleged_father_name: `John Smith_${i}`,
        mother_name: `Jane Smith_${i}`,
        child_name: `Baby Smith_${i}`,
        alleged_father_id: `ID${String(i * 3).padStart(6, '0')}`,
        mother_id: `ID${String(i * 3 + 1).padStart(6, '0')}`,
        child_id: `ID${String(i * 3 + 2).padStart(6, '0')}`,
        alleged_father_phone: `555-${String(1000 + i).padStart(4, '0')}`,
        mother_phone: `555-${String(2000 + i).padStart(4, '0')}`,
        address: `${100 + i} Test Street, Lab City, LC ${10000 + i}`,
        status: ['registered', 'in_progress', 'completed', 'delivered'][Math.floor(Math.random() * 4)],
        workflow_status: 'registered'
      };
      
      clientInsert.run(
        client.case_number, client.kit_number, client.collection_date,
        client.alleged_father_name, client.mother_name, client.child_name,
        client.alleged_father_id, client.mother_id, client.child_id,
        client.alleged_father_phone, client.mother_phone,
        client.address, client.status, client.workflow_status
      );
      
      clients.push(client);
    }
    console.log(`✅ Generated ${clients.length} clients`);

    // 2. Generate Samples
    console.log('\n🧪 Generating samples...');
    const samples = [];
    const sampleInsert = db.prepare(`
      INSERT OR REPLACE INTO samples (
        lab_number, case_number, kit_number, name, surname,
        relation, sex, id_number, phone, email,
        sample_type, collection_date, status, priority,
        workflow_status, quality_score, barcode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let sampleId = 1;
    for (const client of clients) {
      // Generate 3 samples per client (father, mother, child)
      const relations = [
        { name: client.alleged_father_name.split('_')[0], surname: client.alleged_father_name.split('_')[1], relation: 'Alleged Father', sex: 'Male', id: client.alleged_father_id },
        { name: client.mother_name.split('_')[0], surname: client.mother_name.split('_')[1], relation: 'Mother', sex: 'Female', id: client.mother_id },
        { name: client.child_name.split('_')[0], surname: client.child_name.split('_')[1], relation: 'Child', sex: ['Male', 'Female'][Math.floor(Math.random() * 2)], id: client.child_id }
      ];

      for (const person of relations) {
        const labNumber = `25_${String(sampleId).padStart(3, '0')}`;
        const barcode = `LDS${String(sampleId).padStart(6, '0')}`;
        
        const sample = {
          lab_number: labNumber,
          case_number: client.case_number,
          kit_number: client.kit_number,
          name: person.name,
          surname: person.surname,
          relation: person.relation,
          sex: person.sex,
          id_number: person.id,
          phone: client.alleged_father_phone,
          email: `${person.name.toLowerCase()}@testlab.com`,
          sample_type: ['Buccal Swab', 'Blood', 'Saliva'][Math.floor(Math.random() * 3)],
          collection_date: client.collection_date,
          status: 'active',
          priority: ['normal', 'urgent', 'critical'][Math.floor(Math.random() * 3)],
          workflow_status: ['registered', 'in_pcr', 'in_electrophoresis', 'in_analysis', 'completed'][Math.floor(Math.random() * 5)],
          quality_score: Math.random() * 0.3 + 0.7,
          barcode: barcode
        };
        
        sampleInsert.run(
          sample.lab_number, sample.case_number, sample.kit_number,
          sample.name, sample.surname, sample.relation, sample.sex,
          sample.id_number, sample.phone, sample.email, sample.sample_type,
          sample.collection_date, sample.status, sample.priority,
          sample.workflow_status, sample.quality_score, sample.barcode
        );
        
        samples.push(sample);
        sampleId++;
      }
    }
    console.log(`✅ Generated ${samples.length} samples`);

    // 3. Generate PCR Batches
    console.log('\n🧬 Generating PCR batches...');
    const pcrBatches = [];
    const batchInsert = db.prepare(`
      INSERT OR REPLACE INTO batches (
        batch_number, batch_type, status, created_date,
        operator, sample_count, control_count, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 135; i <= 145; i++) {
      const batch = {
        batch_number: `LDS_${i}`,
        batch_type: 'pcr',
        status: ['pending', 'active', 'completed'][Math.floor(Math.random() * 3)],
        created_date: randomDate(new Date(2024, 0, 1), new Date()).toISOString(),
        operator: `Tech_${Math.floor(Math.random() * 5) + 1}`,
        sample_count: Math.floor(Math.random() * 30) + 20,
        control_count: 2,
        notes: `PCR batch ${i} - PowerPlex 16 amplification`
      };
      
      batchInsert.run(
        batch.batch_number, batch.batch_type, batch.status,
        batch.created_date, batch.operator, batch.sample_count,
        batch.control_count, batch.notes
      );
      
      pcrBatches.push(batch);
    }
    console.log(`✅ Generated ${pcrBatches.length} PCR batches`);

    // 4. Generate Electrophoresis Batches
    console.log('\n⚡ Generating electrophoresis batches...');
    const electroBatches = [];
    for (let i = 135; i <= 145; i++) {
      const batch = {
        batch_number: `LDS_${i}-ELECTRO`,
        batch_type: 'electrophoresis',
        status: ['pending', 'running', 'completed'][Math.floor(Math.random() * 3)],
        created_date: randomDate(new Date(2024, 0, 1), new Date()).toISOString(),
        operator: `Tech_${Math.floor(Math.random() * 5) + 1}`,
        sample_count: Math.floor(Math.random() * 30) + 20,
        control_count: 2,
        notes: `Electrophoresis run for batch LDS_${i}`
      };
      
      batchInsert.run(
        batch.batch_number, batch.batch_type, batch.status,
        batch.created_date, batch.operator, batch.sample_count,
        batch.control_count, batch.notes
      );
      
      electroBatches.push(batch);
    }
    console.log(`✅ Generated ${electroBatches.length} electrophoresis batches`);

    // 5. Generate STR Analysis Data
    console.log('\n🔬 Generating STR analysis data...');
    
    // Check if tables exist, if not create them
    db.prepare(`
      CREATE TABLE IF NOT EXISTS str_analysis (
        analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id TEXT,
        lab_number TEXT,
        case_number TEXT,
        fsa_file_path TEXT,
        osiris_version TEXT DEFAULT '2.16',
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        quality_score REAL,
        technician TEXT,
        notes TEXT
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS genotypes (
        genotype_id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER,
        marker TEXT,
        allele1 TEXT,
        allele2 TEXT,
        peak_height1 INTEGER,
        peak_height2 INTEGER,
        quality TEXT,
        FOREIGN KEY (analysis_id) REFERENCES str_analysis(analysis_id)
      )
    `).run();

    const analysisInsert = db.prepare(`
      INSERT OR REPLACE INTO str_analysis (
        sample_id, lab_number, case_number, fsa_file_path,
        osiris_version, status, quality_score, technician, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const genotypeInsert = db.prepare(`
      INSERT OR REPLACE INTO genotypes (
        analysis_id, marker, allele1, allele2,
        peak_height1, peak_height2, quality
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let analysisCount = 0;
    for (const sample of samples.slice(0, 30)) { // Analyze first 30 samples
      const analysisId = analysisInsert.run(
        sample.lab_number,
        sample.lab_number,
        sample.case_number,
        `/data/fsa/${sample.lab_number}.fsa`,
        '2.16',
        'completed',
        Math.random() * 0.3 + 0.7,
        `Tech_${Math.floor(Math.random() * 5) + 1}`,
        'Automated STR analysis'
      ).lastInsertRowid;

      // Generate genotypes for each marker
      for (const marker of strMarkers) {
        const allele1 = marker === 'AMEL' ? 'X' : String(Math.floor(Math.random() * 20) + 5);
        const allele2 = marker === 'AMEL' ? 
          (sample.sex === 'Male' ? 'Y' : 'X') : 
          String(Math.floor(Math.random() * 20) + 5);
        
        genotypeInsert.run(
          analysisId,
          marker,
          allele1,
          allele2,
          Math.floor(Math.random() * 3000) + 1000,
          Math.floor(Math.random() * 3000) + 1000,
          ['Good', 'Excellent', 'Fair'][Math.floor(Math.random() * 3)]
        );
      }
      analysisCount++;
    }
    console.log(`✅ Generated ${analysisCount} STR analyses with genotypes`);

    // 6. Generate Quality Control Data
    console.log('\n📊 Generating quality control data...');
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS qc_metrics (
        metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_number TEXT,
        metric_type TEXT,
        metric_value REAL,
        target_value REAL,
        lower_limit REAL,
        upper_limit REAL,
        status TEXT,
        measured_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        technician TEXT,
        notes TEXT
      )
    `).run();

    const qcInsert = db.prepare(`
      INSERT OR REPLACE INTO qc_metrics (
        batch_number, metric_type, metric_value, target_value,
        lower_limit, upper_limit, status, technician, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const metricTypes = [
      { type: 'PCR_Efficiency', target: 95, lower: 90, upper: 100 },
      { type: 'Signal_Intensity', target: 2000, lower: 1500, upper: 3000 },
      { type: 'Baseline_Noise', target: 50, lower: 0, upper: 100 },
      { type: 'Peak_Height_Ratio', target: 0.7, lower: 0.6, upper: 1.0 },
      { type: 'Capillary_Temperature', target: 60, lower: 58, upper: 62 }
    ];

    let qcCount = 0;
    for (const batch of pcrBatches) {
      for (const metric of metricTypes) {
        const value = metric.target + (Math.random() - 0.5) * (metric.upper - metric.lower) * 0.3;
        const status = value >= metric.lower && value <= metric.upper ? 'Pass' : 'Fail';
        
        qcInsert.run(
          batch.batch_number,
          metric.type,
          value,
          metric.target,
          metric.lower,
          metric.upper,
          status,
          `QC_Tech_${Math.floor(Math.random() * 3) + 1}`,
          `Quality control for ${metric.type}`
        );
        qcCount++;
      }
    }
    console.log(`✅ Generated ${qcCount} quality control metrics`);

    // 7. Generate Audit Trail
    console.log('\n📝 Generating audit trail...');
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS audit_trail (
        audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT,
        entity_type TEXT,
        entity_id TEXT,
        user_name TEXT,
        action_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        old_value TEXT,
        new_value TEXT,
        ip_address TEXT,
        notes TEXT
      )
    `).run();

    const auditInsert = db.prepare(`
      INSERT OR REPLACE INTO audit_trail (
        action_type, entity_type, entity_id, user_name,
        old_value, new_value, ip_address, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const auditActions = [
      'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'APPROVE', 'REJECT'
    ];

    let auditCount = 0;
    for (let i = 0; i < 100; i++) {
      auditInsert.run(
        auditActions[Math.floor(Math.random() * auditActions.length)],
        ['sample', 'batch', 'client', 'report'][Math.floor(Math.random() * 4)],
        `ID_${Math.floor(Math.random() * 1000)}`,
        `User_${Math.floor(Math.random() * 10) + 1}`,
        null,
        null,
        `192.168.1.${Math.floor(Math.random() * 255)}`,
        'Automated audit trail entry'
      );
      auditCount++;
    }
    console.log(`✅ Generated ${auditCount} audit trail entries`);

    // 8. Generate Equipment Calibration Records
    console.log('\n🔧 Generating equipment calibration records...');
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS equipment_calibration (
        calibration_id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_name TEXT,
        equipment_id TEXT,
        calibration_date DATE,
        next_calibration DATE,
        performed_by TEXT,
        status TEXT,
        certificate_number TEXT,
        notes TEXT
      )
    `).run();

    const calibrationInsert = db.prepare(`
      INSERT OR REPLACE INTO equipment_calibration (
        equipment_name, equipment_id, calibration_date,
        next_calibration, performed_by, status,
        certificate_number, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const equipment = [
      { name: 'Thermal Cycler 1', id: 'TC-001' },
      { name: 'Thermal Cycler 2', id: 'TC-002' },
      { name: 'Genetic Analyzer 3500', id: 'GA-3500' },
      { name: 'Centrifuge 1', id: 'CF-001' },
      { name: 'Pipette Set A', id: 'PP-A01' }
    ];

    for (const equip of equipment) {
      const calibDate = randomDate(new Date(2023, 6, 1), new Date());
      const nextCalib = new Date(calibDate);
      nextCalib.setFullYear(nextCalib.getFullYear() + 1);
      
      calibrationInsert.run(
        equip.name,
        equip.id,
        calibDate.toISOString().split('T')[0],
        nextCalib.toISOString().split('T')[0],
        `Cal_Tech_${Math.floor(Math.random() * 3) + 1}`,
        'Valid',
        `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        'Annual calibration completed'
      );
    }
    console.log(`✅ Generated ${equipment.length} equipment calibration records`);

    // Commit transaction
    db.prepare('COMMIT').run();
    
    console.log('\n✨ Test data generation completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Clients: ${clients.length}`);
    console.log(`   - Samples: ${samples.length}`);
    console.log(`   - PCR Batches: ${pcrBatches.length}`);
    console.log(`   - Electrophoresis Batches: ${electroBatches.length}`);
    console.log(`   - STR Analyses: ${analysisCount}`);
    console.log(`   - QC Metrics: ${qcCount}`);
    console.log(`   - Audit Trail: ${auditCount}`);
    console.log(`   - Equipment Records: ${equipment.length}`);

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    db.prepare('ROLLBACK').run();
    throw error;
  } finally {
    db.close();
  }
}

// Run the test data generation
generateTestData();