#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Handle formats like "4-Jan-2024" or "5-Jan-2024"
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthNames = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const month = monthNames[parts[1]] || '01';
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    
    // Handle ISO format
    if (dateStr.includes('-') && dateStr.length >= 8) {
      return dateStr.substring(0, 10);
    }
  } catch (error) {
    }
  
  return null;
}

function extractGender(relation) {
  const match = relation.match(/\s([mfMF])$/);
  return match ? match[1].toUpperCase() : null;
}

function normalizeRelation(relation) {
  const lower = relation.toLowerCase();
  
  if (lower.includes('child')) return 'child';
  if (lower.includes('father') || lower.includes('alleged father')) return 'alleged_father';
  if (lower.includes('mother')) return 'mother';
  
  return relation.toLowerCase().replace(/\s+/g, '_');
}

function determineWorkflowStatus(status, batchNumber) {
  if (status && status.toLowerCase().includes('rerun')) {
    return 'rerun_batched';
  }
  
  if (batchNumber.startsWith('LDS_')) {
    return 'pcr_batched';
  }
  
  if (batchNumber.startsWith('ELEC_')) {
    return 'electro_batched';
  }
  
  return 'sample_collected';
}

function determineClientType(labNumber) {
  if (labNumber.startsWith('LT')) {
    return 'lt';
  }
  
  return 'paternity';
}

function generateCaseNumber(kitNumber) {
  return `CASE_${kitNumber}`;
}

function importCSVData(csvFilePath) {
  // Parse CSV file
  const csvData = parseCSV(csvFilePath);
  
  // Begin transaction
  const importTransaction = db.transaction(() => {
    let importedSamples = 0;
    let importedCases = 0;
    const processedCases = new Set();
    
    // Prepare statements
    const caseStmt = db.prepare(`
      INSERT OR IGNORE INTO test_cases (
        case_number, ref_kit_number, submission_date, client_type,
        mother_present, test_purpose, sample_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const sampleStmt = db.prepare(`
      INSERT OR REPLACE INTO samples (
        lab_number, name, surname, date_of_birth, collection_date,
        relation, gender, status, workflow_status,
        kit_batch_number, lab_batch_number, report_number,
        case_number, case_id, additional_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        (SELECT id FROM test_cases WHERE case_number = ?), ?
      )
    `);
    
    // First pass: Create test cases
    for (const row of csvData) {
      const caseNumber = generateCaseNumber(row.kit_number);
      const clientType = determineClientType(row.lab_number);
      const submissionDate = parseDate(row.dob) || parseDate(row.process_date) || '2024-01-01';
      
      if (!processedCases.has(caseNumber)) {
        const hasMotherInSet = csvData.some(r => 
          generateCaseNumber(r.kit_number) === caseNumber && 
          r.relation.toLowerCase().includes('mother')
        );
        
        const result = caseStmt.run(
          caseNumber,
          row.kit_number,
          submissionDate,
          clientType,
          hasMotherInSet ? 'YES' : 'NO',
          clientType === 'lt' ? 'legal_proceedings' : 'peace_of_mind',
          'buccal_swab',
          'processing'
        );
        
        if (result.changes > 0) {
          importedCases++;
          `);
        }
        
        processedCases.add(caseNumber);
      }
    }
    
    // Second pass: Insert samples
    for (const row of csvData) {
      const caseNumber = generateCaseNumber(row.kit_number);
      const gender = extractGender(row.relation);
      const normalizedRelation = normalizeRelation(row.relation);
      const workflowStatus = determineWorkflowStatus(row.status, row.batch_number);
      const dob = parseDate(row.dob);
      const collectionDate = parseDate(row.process_date) || dob;
      
      const result = sampleStmt.run(
        row.lab_number,
        row.name || `Patient_${row.lab_number}`,
        row.surname || `Family_${row.kit_number}`,
        dob,
        collectionDate,
        normalizedRelation,
        gender,
        'processing',
        workflowStatus,
        row.kit_number,
        row.batch_number,
        row.report_number,
        caseNumber,
        caseNumber,
        row.notes || ''
      );
      
      if (result.changes > 0) {
        importedSamples++;
        `);
      }
    }
    
    });
  
  try {
    importTransaction();
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  }
}

// Setup sequence numbers for continuing from specific positions
function setupSequences(nextBNNumber = 121, nextLabNumber = 420) {
  try {
    // Set up BN sequence table
    const bnSequenceStmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS bn_sequence (
        id INTEGER PRIMARY KEY,
        next_bn_number INTEGER NOT NULL
      )
    `);
    bnSequenceStmt.run();
    
    // Set next BN number
    const updateBNStmt = db.prepare(`
      INSERT OR REPLACE INTO bn_sequence (id, next_bn_number) VALUES (1, ?)
    `);
    updateBNStmt.run(nextBNNumber);
    
    // Set up lab number sequence table
    const labSequenceStmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS lab_sequence (
        id INTEGER PRIMARY KEY,
        next_lab_number INTEGER NOT NULL,
        year_prefix TEXT NOT NULL
      )
    `);
    labSequenceStmt.run();
    
    // Set next lab number
    const updateLabStmt = db.prepare(`
      INSERT OR REPLACE INTO lab_sequence (id, next_lab_number, year_prefix) VALUES (1, ?, ?)
    `);
    updateLabStmt.run(nextLabNumber, '25');
    
    .padStart(4, '0')}`);
    .padStart(3, '0')}`);
    
  } catch (error) {
    console.error('❌ Sequence setup failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      process.exit(1);
    }
    
    const csvFilePath = path.resolve(args[0]);
    const nextBNNumber = parseInt(args[1]) || 121;
    const nextLabNumber = parseInt(args[2]) || 420;
    
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ CSV file not found: ${csvFilePath}`);
      process.exit(1);
    }
    
    // Test database connection
    const testQuery = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"');
    const result = testQuery.get();
    `);
    
    // Setup sequences
    setupSequences(nextBNNumber, nextLabNumber);
    
    // Import the CSV data
    importCSVData(csvFilePath);
    
    // Show summary
    const sampleCount = db.prepare('SELECT COUNT(*) as count FROM samples').get();
    const caseCount = db.prepare('SELECT COUNT(*) as count FROM test_cases').get();
    
    // Show recent imports
    const recentSamples = db.prepare(`
      SELECT lab_number, name, surname, relation, workflow_status, lab_batch_number 
      FROM samples 
      ORDER BY id DESC 
      LIMIT 10
    `).all();
    
    recentSamples.forEach(sample => {
      [${sample.lab_batch_number}]`);
    });
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { importCSVData, setupSequences, parseCSV };