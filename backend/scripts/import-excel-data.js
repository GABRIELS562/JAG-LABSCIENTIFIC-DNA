#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

console.log('🚀 Excel Data Import Script for LabScientific LIMS');
console.log('📁 Database:', dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Sample data structure from your Excel (add more rows as needed)
const excelData = [
  {
    labNumber: '24_1',
    relation: 'child(24_2) f',
    dob: '4-Jan-2024',
    kitNumber: '111LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_79',
    processDate: '5-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_2',
    relation: 'alleged father',
    dob: '4-Jan-2024',
    kitNumber: '111LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_79',
    processDate: '5-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_3',
    relation: 'Child (24_4) M',
    dob: '4-Jan-2024',
    kitNumber: '113LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_80',
    processDate: '5-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_4',
    relation: 'alleged father',
    dob: '4-Jan-2024',
    kitNumber: '113LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_80',
    processDate: '5-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_5',
    relation: 'Child (24_6) F',
    dob: '4-Jan-2024',
    kitNumber: '115LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_81',
    processDate: '5-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_6',
    relation: 'alleged father',
    dob: '4-Jan-2024',
    kitNumber: '115LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_81',
    processDate: '5-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_7',
    relation: 'child(24_8) M',
    dob: '4-Jan-2024',
    kitNumber: '104LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_82',
    processDate: '5-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_8',
    relation: 'Alleged father',
    dob: '4-Jan-2024',
    kitNumber: '104LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_82',
    processDate: '5-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_9',
    relation: 'child(24_10) M',
    dob: '4-Jan-2024',
    kitNumber: '112LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_83',
    processDate: '11-Jan-2024',
    status: ''
  },
  {
    labNumber: '24_10',
    relation: 'Alleged father',
    dob: '4-Jan-2024',
    kitNumber: '112LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_83',
    processDate: '11-Jan-2024',
    status: ''
  },
  {
    labNumber: '24_11',
    relation: 'child(24_12) F',
    dob: '4-Jan-2024',
    kitNumber: '114LDSK',
    batchNumber: 'LDS_35',
    reportNumber: 'LDSR_85',
    processDate: '11-Jan-2024',
    status: 'ReRun'
  },
  {
    labNumber: '24_12',
    relation: 'Alleged father',
    dob: '4-Jan-2024',
    kitNumber: '114LDSK',
    batchNumber: 'LDS_35/36',
    reportNumber: 'LDSR_85',
    processDate: '11-Jan-2024',
    status: 'ReRun'
  },
  {
    labNumber: 'LT24_13',
    relation: 'child(LT24_14) M',
    dob: '9-Jan-2024',
    kitNumber: '117LDSK',
    batchNumber: 'LDS_36',
    reportNumber: 'LDSR_4LT',
    processDate: '11-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: 'LT24_14',
    relation: 'Alleged Father(LT24_13)',
    dob: '9-Jan-2024',
    kitNumber: '117LDSK',
    batchNumber: 'LDS_36',
    reportNumber: 'LDSR_4LT',
    processDate: '11-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: 'LT24_15',
    relation: 'Mother(LT24_13)',
    dob: '9-Jan-2024',
    kitNumber: '117LDSK',
    batchNumber: 'LDS_36',
    reportNumber: 'LDSR_4LT',
    processDate: '11-Jan-2024',
    status: 'urgent'
  },
  {
    labNumber: '24_16',
    relation: 'child(24_17) F',
    dob: '4-Jan-2024',
    kitNumber: '116LDSK',
    batchNumber: 'LDS_36',
    reportNumber: 'LDSR_86',
    processDate: '5-Jan-2024',
    status: ''
  }
];

// Helper functions
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Handle formats like "4-Jan-2024" or "5-Jan-2024"
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
  } catch (error) {
    console.warn(`Date parsing failed for: ${dateStr}`);
  }
  
  return null;
}

function extractGender(relation) {
  // Extract gender from relation strings like "child(24_2) f" or "Child (24_4) M"
  const match = relation.match(/\s([mfMF])$/);
  return match ? match[1].toUpperCase() : null;
}

function normalizeRelation(relation) {
  // Normalize relation strings
  const lower = relation.toLowerCase();
  
  if (lower.includes('child')) return 'child';
  if (lower.includes('father') || lower.includes('alleged father')) return 'alleged_father';
  if (lower.includes('mother')) return 'mother';
  
  return relation.toLowerCase();
}

function determineWorkflowStatus(status, batchNumber) {
  // Determine workflow status based on batch and status
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
  // Determine client type from lab number
  if (labNumber.startsWith('LT')) {
    return 'lt'; // Legal type
  }
  
  return 'paternity'; // Default to paternity
}

function generateCaseNumber(kitNumber, relation) {
  // Generate a case number based on kit number for grouping
  return `CASE_${kitNumber}`;
}

// Main import function
function importExcelData() {
  console.log('\n📊 Starting data import...');
  
  // Begin transaction
  const importTransaction = db.transaction(() => {
    let importedSamples = 0;
    let importedCases = 0;
    const processedCases = new Set();
    
    // First pass: Create test cases for unique kit numbers
    console.log('🔄 Creating test cases...');
    
    const caseStmt = db.prepare(`
      INSERT OR IGNORE INTO test_cases (
        case_number, ref_kit_number, submission_date, client_type,
        mother_present, test_purpose, sample_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const row of excelData) {
      const caseNumber = generateCaseNumber(row.kitNumber, row.relation);
      const clientType = determineClientType(row.labNumber);
      const submissionDate = parseDate(row.dob) || '2024-01-01';
      
      if (!processedCases.has(caseNumber)) {
        const hasMotherInSet = excelData.some(r => 
          generateCaseNumber(r.kitNumber, r.relation) === caseNumber && 
          r.relation.toLowerCase().includes('mother')
        );
        
        const result = caseStmt.run(
          caseNumber,
          row.kitNumber,
          submissionDate,
          clientType,
          hasMotherInSet ? 'YES' : 'NO',
          clientType === 'lt' ? 'legal_proceedings' : 'peace_of_mind',
          'buccal_swab',
          'processing'
        );
        
        if (result.changes > 0) {
          importedCases++;
          console.log(`  ✅ Created case: ${caseNumber} (${row.kitNumber})`);
        }
        
        processedCases.add(caseNumber);
      }
    }
    
    // Second pass: Insert samples
    console.log('🔄 Importing samples...');
    
    const sampleStmt = db.prepare(`
      INSERT OR REPLACE INTO samples (
        lab_number, name, surname, date_of_birth, collection_date,
        relation, gender, status, workflow_status,
        kit_batch_number, lab_batch_number, report_number,
        case_number, case_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        (SELECT id FROM test_cases WHERE case_number = ?)
      )
    `);
    
    for (const row of excelData) {
      const caseNumber = generateCaseNumber(row.kitNumber, row.relation);
      const gender = extractGender(row.relation);
      const normalizedRelation = normalizeRelation(row.relation);
      const workflowStatus = determineWorkflowStatus(row.status, row.batchNumber);
      const dob = parseDate(row.dob);
      const collectionDate = parseDate(row.processDate) || dob;
      
      // Generate placeholder names (you'll need to replace these with real data)
      const name = `Patient_${row.labNumber}`;
      const surname = `Family_${row.kitNumber}`;
      
      const result = sampleStmt.run(
        row.labNumber,
        name,
        surname,
        dob,
        collectionDate,
        normalizedRelation,
        gender,
        'processing',
        workflowStatus,
        row.kitNumber,
        row.batchNumber,
        row.reportNumber,
        caseNumber,
        caseNumber
      );
      
      if (result.changes > 0) {
        importedSamples++;
        console.log(`  ✅ Imported: ${row.labNumber} (${normalizedRelation}${gender ? ' ' + gender : ''})`);
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

// Set up sequence numbers for continuing from your current position
function setupSequences() {
  console.log('\n🔧 Setting up sequence numbers...');
  
  try {
    // Set up BN sequence to continue from your current position
    // You mentioned starting from LDS_121, so set BN sequence accordingly
    const bnSequenceStmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS bn_sequence (
        id INTEGER PRIMARY KEY,
        next_bn_number INTEGER NOT NULL
      )
    `);
    bnSequenceStmt.run();
    
    // Set next BN number (adjust as needed based on your current position)
    const updateBNStmt = db.prepare(`
      INSERT OR REPLACE INTO bn_sequence (id, next_bn_number) VALUES (1, ?)
    `);
    updateBNStmt.run(121); // Starting from BN-0121
    
    // Update the lab number generation to start from 420
    // This will be handled in the generateLabNumber function in server.js
    
    console.log('   ✅ BN sequence set to start from BN-0121');
    console.log('   ✅ Lab numbers will continue from 25_420');
    
  } catch (error) {
    console.error('❌ Sequence setup failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test database connection
    const testQuery = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"');
    const result = testQuery.get();
    console.log(`   ✅ Database connected (${result.count} tables found)`);
    
    // Setup sequences for continuing from your current lab position
    setupSequences();
    
    // Import the Excel data
    importExcelData();
    
    // Show summary
    const sampleCount = db.prepare('SELECT COUNT(*) as count FROM samples').get();
    const caseCount = db.prepare('SELECT COUNT(*) as count FROM test_cases').get();
    
    console.log('\n📊 Current Database Status:');
    console.log(`   🧪 Total Samples: ${sampleCount.count}`);
    console.log(`   📁 Total Cases: ${caseCount.count}`);
    
    // Show recent imports
    const recentSamples = db.prepare(`
      SELECT lab_number, relation, workflow_status, lab_batch_number 
      FROM samples 
      ORDER BY id DESC 
      LIMIT 5
    `).all();
    
    console.log('\n🔍 Most Recent Samples:');
    recentSamples.forEach(sample => {
      console.log(`   ${sample.lab_number}: ${sample.relation} (${sample.workflow_status}) [${sample.lab_batch_number}]`);
    });
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
    console.log('\n👋 Database connection closed. Import complete!');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { importExcelData, setupSequences };