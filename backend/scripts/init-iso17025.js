#!/usr/bin/env node

// Script to initialize ISO 17025 compliance tables
// Run this script to add compliance features to existing database

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database paths
const mainDbPath = path.join(__dirname, '../database/ashley_lims.db');
const schemaPath = path.join(__dirname, '../database/iso17025-schema.sql');

try {
  // Connect to main database
  const db = new Database(mainDbPath);
  // Read ISO 17025 schema
  const schema = fs.readFileSync(schemaPath, 'utf8');
  // Execute schema
  db.exec(schema);
  // Add initial quality documents
  const insertDoc = db.prepare(`
    INSERT OR IGNORE INTO quality_documents (
      document_number, document_type, title, version, 
      effective_date, review_date, owner_name, approved_by_name, status
    ) VALUES (?, ?, ?, ?, date('now'), date('now', '+1 year'), ?, ?, ?)
  `);
  
  const initialDocs = [
    ['QM-001', 'Manual', 'Quality Manual - ISO 17025:2017', '1.0', 'Lab Director', 'Lab Director', 'Active'],
    ['SOP-001', 'SOP', 'Sample Receipt and Registration', '1.0', 'Lab Manager', 'Lab Director', 'Active'],
    ['SOP-002', 'SOP', 'DNA Extraction Procedure', '1.0', 'Lab Manager', 'Lab Director', 'Active'],
    ['SOP-003', 'SOP', 'PCR Amplification Protocol', '1.0', 'Lab Manager', 'Lab Director', 'Active'],
    ['SOP-004', 'SOP', 'Electrophoresis and Analysis', '1.0', 'Lab Manager', 'Lab Director', 'Active'],
    ['SOP-005', 'SOP', 'Result Reporting and Review', '1.0', 'Lab Manager', 'Lab Director', 'Active'],
    ['SOP-006', 'SOP', 'Equipment Calibration and Maintenance', '1.0', 'Lab Manager', 'Lab Director', 'Active'],
    ['SOP-007', 'SOP', 'Non-Conformance Management', '1.0', 'Quality Manager', 'Lab Director', 'Active'],
    ['SOP-008', 'SOP', 'Document Control Procedure', '1.0', 'Quality Manager', 'Lab Director', 'Active'],
    ['SOP-009', 'SOP', 'Internal Audit Procedure', '1.0', 'Quality Manager', 'Lab Director', 'Active'],
    ['WI-001', 'Work Instruction', 'GeneMapper ID Operation', '1.0', 'Technical Lead', 'Lab Manager', 'Active'],
    ['FORM-001', 'Form', 'Sample Chain of Custody Form', '1.0', 'Lab Manager', 'Lab Director', 'Active'],
    ['FORM-002', 'Form', 'Non-Conformance Report Form', '1.0', 'Quality Manager', 'Lab Director', 'Active']
  ];
  
  initialDocs.forEach(doc => {
    insertDoc.run(...doc);
  });
  // Add enhanced equipment tracking table (keeps existing simple table intact)
  db.exec(`
    CREATE TABLE IF NOT EXISTS equipment_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT,
      location TEXT,
      critical_equipment BOOLEAN DEFAULT FALSE,
      responsible_person TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
    )
  `);
  
  // Add sample equipment records to existing table
  const insertEquipment = db.prepare(`
    INSERT OR IGNORE INTO equipment (
      equipment_id, type, status
    ) VALUES (?, ?, ?)
  `);
  
  const equipment = [
    ['EQ-001', 'Thermal Cycler', 'active'],
    ['EQ-002', 'Genetic Analyzer', 'active'],
    ['EQ-003', 'Centrifuge', 'active'],
    ['EQ-004', 'Analytical Balance', 'active'],
    ['EQ-005', 'Refrigerator', 'active'],
    ['EQ-006', 'Freezer -80°C', 'active'],
    ['EQ-007', 'Pipette Set', 'active'],
    ['EQ-008', 'Vortex Mixer', 'active']
  ];
  
  equipment.forEach(eq => {
    insertEquipment.run(...eq);
  });
  
  // Add detailed information
  const insertDetails = db.prepare(`
    INSERT OR IGNORE INTO equipment_details (
      equipment_id, name, category, manufacturer, model, critical_equipment, location, responsible_person
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const details = [
    ['EQ-001', 'Thermal Cycler', 'Analytical', 'Applied Biosystems', 'ProFlex', 1, 'PCR Room', 'Lab Technician'],
    ['EQ-002', 'Genetic Analyzer', 'Analytical', 'Applied Biosystems', '3130xl', 1, 'Sequencing Room', 'Lab Technician'],
    ['EQ-003', 'Centrifuge', 'General Lab', 'Eppendorf', '5424R', 0, 'Extraction Room', 'Lab Technician'],
    ['EQ-004', 'Analytical Balance', 'Measuring', 'Mettler Toledo', 'XPE205', 1, 'Reagent Prep', 'Lab Technician'],
    ['EQ-005', 'Refrigerator', 'General Lab', 'Thermo Fisher', 'TSX505', 1, 'Sample Storage', 'Lab Manager'],
    ['EQ-006', 'Freezer -80°C', 'General Lab', 'Thermo Fisher', 'TSU700', 1, 'Sample Storage', 'Lab Manager'],
    ['EQ-007', 'Pipette Set', 'Measuring', 'Eppendorf', 'Research Plus', 0, 'General Lab', 'Lab Technician'],
    ['EQ-008', 'Vortex Mixer', 'General Lab', 'Scientific Industries', 'Vortex-Genie 2', 0, 'Extraction Room', 'Lab Technician']
  ];
  
  details.forEach(det => {
    insertDetails.run(...det);
  });
  // Add calibration schedule for critical equipment
  const insertCalibration = db.prepare(`
    INSERT OR IGNORE INTO calibrations (
      equipment_id, calibration_date, next_calibration_date,
      calibration_type, performed_by, pass_fail, certificate_number
    ) VALUES (
      (SELECT id FROM equipment WHERE equipment_id = ?),
      date('now', '-6 months'), date('now', '+6 months'),
      'Routine', 'External Calibration Service', 'Pass', ?
    )
  `);
  
  const calibrations = [
    ['EQ-001', 'CAL-2024-001'],
    ['EQ-002', 'CAL-2024-002'],
    ['EQ-004', 'CAL-2024-004']
  ];
  
  calibrations.forEach(cal => {
    insertCalibration.run(...cal);
  });
  // Create measurement uncertainty records
  const insertUncertainty = db.prepare(`
    INSERT OR IGNORE INTO measurement_uncertainties (
      test_method, parameter, uncertainty_value, 
      confidence_level, validated_by, validation_date
    ) VALUES (?, ?, ?, ?, ?, date('now'))
  `);
  
  const uncertainties = [
    ['STR Analysis', 'D3S1358', '±0.1 bp', '95%', 'Technical Lead'],
    ['STR Analysis', 'vWA', '±0.1 bp', '95%', 'Technical Lead'],
    ['STR Analysis', 'FGA', '±0.1 bp', '95%', 'Technical Lead'],
    ['STR Analysis', 'D8S1179', '±0.1 bp', '95%', 'Technical Lead'],
    ['STR Analysis', 'D21S11', '±0.1 bp', '95%', 'Technical Lead'],
    ['STR Analysis', 'D18S51', '±0.1 bp', '95%', 'Technical Lead'],
    ['STR Analysis', 'D5S818', '±0.1 bp', '95%', 'Technical Lead'],
    ['STR Analysis', 'D13S317', '±0.1 bp', '95%', 'Technical Lead'],
    ['STR Analysis', 'D7S820', '±0.1 bp', '95%', 'Technical Lead']
  ];
  
  uncertainties.forEach(unc => {
    insertUncertainty.run(...unc);
  });
  // Add indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_samples_workflow ON samples(workflow_status);
    CREATE INDEX IF NOT EXISTS idx_samples_case ON samples(case_id);
    CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
  `);
  // Get statistics
  const stats = {
    documents: db.prepare('SELECT COUNT(*) as count FROM quality_documents').get().count,
    equipment: db.prepare('SELECT COUNT(*) as count FROM equipment').get().count,
    equipment_details: db.prepare('SELECT COUNT(*) as count FROM equipment_details').get().count,
    calibrations: db.prepare('SELECT COUNT(*) as count FROM calibrations').get().count,
    uncertainties: db.prepare('SELECT COUNT(*) as count FROM measurement_uncertainties').get().count
  };
  
  db.close();
  
} catch (error) {
  console.error('[ISO 17025] ❌ Error initializing compliance features:', error.message);
  process.exit(1);
}

