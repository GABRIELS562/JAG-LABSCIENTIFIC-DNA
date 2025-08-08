#!/usr/bin/env node

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

console.log('📊 Google Sheets Import Script for LabScientific LIMS');

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Google Sheets configuration
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

class GoogleSheetsImporter {
  constructor(serviceAccountKeyPath, spreadsheetId) {
    this.serviceAccountKeyPath = serviceAccountKeyPath;
    this.spreadsheetId = spreadsheetId;
    this.doc = null;
    this.serviceAccountAuth = null;
  }

  async authenticate() {
    console.log('🔐 Authenticating with Google Sheets API...');
    
    try {
      // Load service account key
      if (!fs.existsSync(this.serviceAccountKeyPath)) {
        throw new Error(`Service account key file not found: ${this.serviceAccountKeyPath}`);
      }
      
      const serviceAccountKey = JSON.parse(fs.readFileSync(this.serviceAccountKeyPath, 'utf8'));
      
      // Initialize JWT auth
      this.serviceAccountAuth = new JWT({
        email: serviceAccountKey.client_email,
        key: serviceAccountKey.private_key,
        scopes: SCOPES,
      });
      
      // Initialize the sheet document
      this.doc = new GoogleSpreadsheet(this.spreadsheetId, this.serviceAccountAuth);
      
      await this.doc.loadInfo();
      console.log(`   ✅ Connected to spreadsheet: ${this.doc.title}`);
      console.log(`   📄 Available sheets: ${this.doc.sheetCount}`);
      
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  async getSheetData(sheetName = null, headerRow = 1) {
    console.log(`📥 Reading sheet data...`);
    
    try {
      // Get the first sheet or specified sheet
      const sheet = sheetName 
        ? this.doc.sheetsByTitle[sheetName]
        : this.doc.sheetsByIndex[0];
      
      if (!sheet) {
        throw new Error(`Sheet not found: ${sheetName || 'first sheet'}`);
      }
      
      console.log(`   📋 Reading from sheet: ${sheet.title}`);
      console.log(`   📊 Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}`);
      
      // Load the sheet data
      await sheet.loadCells();
      
      // Get headers from the specified row (default: row 1)
      const headers = [];
      for (let col = 0; col < sheet.columnCount; col++) {
        const cell = sheet.getCell(headerRow - 1, col);
        if (cell.value) {
          headers.push(cell.value.toString().trim());
        }
      }
      
      console.log(`   📑 Headers found: ${headers.join(', ')}`);
      
      // Get data rows
      const data = [];
      for (let row = headerRow; row < sheet.rowCount; row++) {
        const rowData = {};
        let hasData = false;
        
        for (let col = 0; col < headers.length; col++) {
          const cell = sheet.getCell(row, col);
          const value = cell.value ? cell.value.toString().trim() : '';
          rowData[headers[col]] = value;
          if (value) hasData = true;
        }
        
        // Only add rows that have at least some data
        if (hasData) {
          data.push(rowData);
        }
      }
      
      console.log(`   ✅ Read ${data.length} data rows`);
      return { headers, data };
      
    } catch (error) {
      console.error('❌ Failed to read sheet data:', error.message);
      throw error;
    }
  }

  normalizeColumnNames(data) {
    console.log('🔄 Normalizing column names...');
    
    const columnMap = {
      // Common variations for lab number
      'lab_number': 'lab_number',
      'labnumber': 'lab_number',
      'lab number': 'lab_number',
      'sample_id': 'lab_number',
      'sample id': 'lab_number',
      
      // Relation variations
      'relation': 'relation',
      'relationship': 'relation',
      'role': 'relation',
      
      // Date variations
      'dob': 'dob',
      'date_of_birth': 'dob',
      'date of birth': 'dob',
      'birth_date': 'dob',
      'birthdate': 'dob',
      
      // Name variations
      'name': 'name',
      'first_name': 'name',
      'first name': 'name',
      'surname': 'surname',
      'last_name': 'surname',
      'last name': 'surname',
      'family_name': 'surname',
      
      // Kit/Batch variations
      'kit_number': 'kit_number',
      'kit number': 'kit_number',
      'kit': 'kit_number',
      'batch_number': 'batch_number',
      'batch number': 'batch_number',
      'batch': 'batch_number',
      'lab_batch': 'batch_number',
      
      // Report variations
      'report_number': 'report_number',
      'report number': 'report_number',
      'report': 'report_number',
      
      // Date variations
      'process_date': 'process_date',
      'process date': 'process_date',
      'collection_date': 'process_date',
      'collection date': 'process_date',
      
      // Status variations
      'status': 'status',
      'priority': 'status',
      'urgent': 'status',
      
      // Notes variations
      'notes': 'notes',
      'comments': 'notes',
      'remarks': 'notes'
    };
    
    return data.map(row => {
      const normalizedRow = {};
      
      Object.keys(row).forEach(key => {
        const normalizedKey = columnMap[key.toLowerCase()] || key;
        normalizedRow[normalizedKey] = row[key];
      });
      
      return normalizedRow;
    });
  }
}

// Data processing functions (reusing from CSV import)
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
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
    
    if (dateStr.includes('-') && dateStr.length >= 8) {
      return dateStr.substring(0, 10);
    }
  } catch (error) {
    console.warn(`Date parsing failed for: ${dateStr}`);
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
  
  if (batchNumber && batchNumber.startsWith('LDS_')) {
    return 'pcr_batched';
  }
  
  if (batchNumber && batchNumber.startsWith('ELEC_')) {
    return 'electro_batched';
  }
  
  return 'sample_collected';
}

function determineClientType(labNumber) {
  if (labNumber && labNumber.startsWith('LT')) {
    return 'lt';
  }
  
  return 'paternity';
}

function generateCaseNumber(kitNumber) {
  return `CASE_${kitNumber}`;
}

function setupSequences(nextBNNumber = 121, nextLabNumber = 420) {
  console.log(`\n🔧 Setting up sequence numbers...`);
  
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
    
    console.log(`   ✅ BN sequence set to start from BN-${nextBNNumber.toString().padStart(4, '0')}`);
    console.log(`   ✅ Lab numbers will continue from 25_${nextLabNumber.toString().padStart(3, '0')}`);
    
  } catch (error) {
    console.error('❌ Sequence setup failed:', error.message);
    throw error;
  }
}

function importSheetsData(data) {
  console.log('\n🚀 Starting Google Sheets import...');
  
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
    console.log('🔄 Creating test cases...');
    
    for (const row of data) {
      if (!row.lab_number || !row.kit_number) continue;
      
      const caseNumber = generateCaseNumber(row.kit_number);
      const clientType = determineClientType(row.lab_number);
      const submissionDate = parseDate(row.dob) || parseDate(row.process_date) || '2024-01-01';
      
      if (!processedCases.has(caseNumber)) {
        const hasMotherInSet = data.some(r => 
          r.kit_number === row.kit_number && 
          r.relation && r.relation.toLowerCase().includes('mother')
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
          console.log(`  ✅ Created case: ${caseNumber} (${row.kit_number})`);
        }
        
        processedCases.add(caseNumber);
      }
    }
    
    // Second pass: Insert samples
    console.log('🔄 Importing samples...');
    
    for (const row of data) {
      if (!row.lab_number) continue;
      
      const caseNumber = generateCaseNumber(row.kit_number || 'UNKNOWN');
      const gender = extractGender(row.relation || '');
      const normalizedRelation = normalizeRelation(row.relation || 'unknown');
      const workflowStatus = determineWorkflowStatus(row.status, row.batch_number);
      const dob = parseDate(row.dob);
      const collectionDate = parseDate(row.process_date) || dob;
      
      const result = sampleStmt.run(
        row.lab_number,
        row.name || `Patient_${row.lab_number}`,
        row.surname || `Family_${row.kit_number || 'UNKNOWN'}`,
        dob,
        collectionDate,
        normalizedRelation,
        gender,
        'processing',
        workflowStatus,
        row.kit_number || '',
        row.batch_number || '',
        row.report_number || '',
        caseNumber,
        caseNumber,
        row.notes || ''
      );
      
      if (result.changes > 0) {
        importedSamples++;
        console.log(`  ✅ Imported: ${row.lab_number} - ${row.name || 'Patient'} ${row.surname || 'Unknown'} (${normalizedRelation}${gender ? ' ' + gender : ''})`);
      }
    }
    
    console.log(`\n📈 Import completed successfully!`);
    console.log(`   📁 Cases created: ${importedCases}`);
    console.log(`   🧪 Samples imported: ${importedSamples}`);
  });
  
  try {
    importTransaction();
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('📖 Usage:');
      console.log('  node google-sheets-import.js <service-account-key.json> <spreadsheet-id> [sheet-name] [next-bn] [next-lab]');
      console.log('  node google-sheets-import.js ./service-account.json 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Sheet1 121 420');
      console.log('\n📝 Setup:');
      console.log('  1. Create a Google Cloud project');
      console.log('  2. Enable Google Sheets API');
      console.log('  3. Create a service account and download the key JSON file');
      console.log('  4. Share your Google Sheet with the service account email');
      process.exit(1);
    }
    
    const serviceAccountKeyPath = path.resolve(args[0]);
    const spreadsheetId = args[1];
    const sheetName = args[2] || null;
    const nextBNNumber = parseInt(args[3]) || 121;
    const nextLabNumber = parseInt(args[4]) || 420;
    
    if (!fs.existsSync(serviceAccountKeyPath)) {
      console.error(`❌ Service account key file not found: ${serviceAccountKeyPath}`);
      process.exit(1);
    }
    
    console.log('🔍 Checking database connection...');
    const testQuery = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"');
    const result = testQuery.get();
    console.log(`   ✅ Database connected (${result.count} tables found)`);
    
    // Setup sequences
    setupSequences(nextBNNumber, nextLabNumber);
    
    // Initialize Google Sheets importer
    const importer = new GoogleSheetsImporter(serviceAccountKeyPath, spreadsheetId);
    
    // Authenticate
    await importer.authenticate();
    
    // Get sheet data
    const { headers, data } = await importer.getSheetData(sheetName);
    
    if (data.length === 0) {
      console.log('⚠️  No data found in the sheet');
      process.exit(1);
    }
    
    // Normalize column names
    const normalizedData = importer.normalizeColumnNames(data);
    
    // Import the data
    importSheetsData(normalizedData);
    
    // Show summary
    const sampleCount = db.prepare('SELECT COUNT(*) as count FROM samples').get();
    const caseCount = db.prepare('SELECT COUNT(*) as count FROM test_cases').get();
    
    console.log('\n📊 Current Database Status:');
    console.log(`   🧪 Total Samples: ${sampleCount.count}`);
    console.log(`   📁 Total Cases: ${caseCount.count}`);
    
    // Show recent imports
    const recentSamples = db.prepare(`
      SELECT lab_number, name, surname, relation, workflow_status, lab_batch_number 
      FROM samples 
      ORDER BY id DESC 
      LIMIT 10
    `).all();
    
    console.log('\n🔍 Most Recent Samples:');
    recentSamples.forEach(sample => {
      console.log(`   ${sample.lab_number}: ${sample.name} ${sample.surname} (${sample.relation}) [${sample.lab_batch_number}]`);
    });
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      console.log('\n👋 Database connection closed. Import complete!');
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { GoogleSheetsImporter, importSheetsData, setupSequences };