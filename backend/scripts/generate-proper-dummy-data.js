#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

console.log('🎭 Generating Proper Dummy Data - Continuing from LDS_121, Sample 420');

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Sample first names and surnames for variety
const firstNames = {
  male: ['John', 'Michael', 'David', 'James', 'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth'],
  female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle'],
  child: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander']
};

const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

// Generate random date within last year
function randomDate() {
  const start = new Date(2024, 0, 1);
  const end = new Date(2025, 7, 6);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate random birth date
function randomBirthDate(minAge, maxAge) {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(Math.random() * (maxAge - minAge + 1)) - minAge;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// Generate random phone number
function randomPhone() {
  const prefix = '07';
  const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + number;
}

// Generate random ID number (South African format)
function randomIdNumber(birthDate) {
  const datePart = birthDate.replace(/-/g, '').slice(2); // YYMMDD
  const genderDigit = Math.floor(Math.random() * 10);
  const citizenDigit = Math.random() < 0.9 ? '0' : '1'; // 90% citizens
  const raceDigit = '8'; // Not used anymore but still in format
  const randomDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return datePart + genderDigit + citizenDigit + raceDigit + randomDigits;
}

// Setup sequences to continue from your current position
function setupSequences() {
  console.log('🔧 Setting up sequence numbers...');
  
  try {
    // Set up BN sequence table
    const bnSequenceStmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS bn_sequence (
        id INTEGER PRIMARY KEY,
        next_bn_number INTEGER NOT NULL
      )
    `);
    bnSequenceStmt.run();
    
    // Set next BN number to 122 (after your current LDS_121)
    const updateBNStmt = db.prepare(`
      INSERT OR REPLACE INTO bn_sequence (id, next_bn_number) VALUES (1, ?)
    `);
    updateBNStmt.run(122);
    
    // Set up lab number sequence table
    const labSequenceStmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS lab_sequence (
        id INTEGER PRIMARY KEY,
        next_lab_number INTEGER NOT NULL,
        year_prefix TEXT NOT NULL
      )
    `);
    labSequenceStmt.run();
    
    // Set next lab number to 421 (after your current 420)
    const updateLabStmt = db.prepare(`
      INSERT OR REPLACE INTO lab_sequence (id, next_lab_number, year_prefix) VALUES (1, ?, ?)
    `);
    updateLabStmt.run(421, '25');
    
    console.log('   ✅ BN sequence set to start from BN-0122');
    console.log('   ✅ Lab numbers will continue from 25_421');
    
  } catch (error) {
    console.error('❌ Sequence setup failed:', error.message);
    throw error;
  }
}

function clearExistingData() {
  console.log('🧹 Clearing existing dummy data (keeping your real data)...');
  
  // Only clear dummy data, not your imported real data
  // Clear samples with lab numbers starting with "25_" that are > 420
  db.prepare("DELETE FROM samples WHERE lab_number LIKE '25_%' AND CAST(SUBSTR(lab_number, 4) AS INTEGER) > 420").run();
  
  // Clear test cases with BN numbers > 121
  db.prepare("DELETE FROM test_cases WHERE case_number LIKE 'BN-%' AND CAST(SUBSTR(case_number, 4) AS INTEGER) > 121").run();
  
  console.log('✅ Existing dummy data cleared (your real data preserved)');
}

function generateDummyData() {
  console.log('🎭 Generating realistic dummy data continuing from your current position...');
  
  // Sample data that would logically follow your current lab state
  const dummyTestCases = [
    {
      case_number: 'BN-0122',
      ref_kit_number: 'BN-0122',
      submission_date: '2024-08-07',
      client_type: 'paternity',
      mother_present: 'YES',
      test_purpose: 'peace_of_mind',
      sample_type: 'buccal_swab',
      status: 'pending'
    },
    {
      case_number: 'BN-0123',
      ref_kit_number: 'BN-0123',
      submission_date: '2024-08-07',
      client_type: 'paternity',
      mother_present: 'NO',
      test_purpose: 'legal_proceedings',
      sample_type: 'buccal_swab',
      status: 'pending'
    },
    {
      case_number: 'BN-0124',
      ref_kit_number: 'BN-0124',
      submission_date: '2024-08-08',
      client_type: 'lt',
      mother_present: 'YES',
      test_purpose: 'legal_proceedings',
      sample_type: 'buccal_swab',
      status: 'processing'
    }
  ];
  
  // Sample data that continues from your lab numbering (starting after 420)
  const dummySamples = [
    // BN-0122 Case - Peace of Mind (Father, Mother, Child)
    {
      lab_number: '25_421(25_422)F',
      name: 'Emma',
      surname: 'Johnson',
      relation: 'child',
      gender: 'F',
      date_of_birth: '2020-05-15',
      collection_date: '2024-08-07',
      case_number: 'BN-0122',
      workflow_status: 'sample_collected',
      kit_batch_number: 'BN-0122',
      lab_batch_number: null,
      report_number: null
    },
    {
      lab_number: '25_422',
      name: 'Michael',
      surname: 'Johnson',
      relation: 'alleged_father',
      gender: 'M',
      date_of_birth: '1985-03-22',
      collection_date: '2024-08-07',
      case_number: 'BN-0122',
      workflow_status: 'sample_collected',
      kit_batch_number: 'BN-0122',
      lab_batch_number: null,
      report_number: null
    },
    {
      lab_number: '25_423',
      name: 'Sarah',
      surname: 'Johnson',
      relation: 'mother',
      gender: 'F',
      date_of_birth: '1987-09-10',
      collection_date: '2024-08-07',
      case_number: 'BN-0122',
      workflow_status: 'sample_collected',
      kit_batch_number: 'BN-0122',
      lab_batch_number: null,
      report_number: null
    },
    
    // BN-0123 Case - Legal Proceedings (Father, Child only)
    {
      lab_number: '25_424(25_425)M',
      name: 'James',
      surname: 'Wilson',
      relation: 'child',
      gender: 'M',
      date_of_birth: '2018-11-03',
      collection_date: '2024-08-07',
      case_number: 'BN-0123',
      workflow_status: 'sample_collected',
      kit_batch_number: 'BN-0123',
      lab_batch_number: null,
      report_number: null
    },
    {
      lab_number: '25_425',
      name: 'David',
      surname: 'Wilson',
      relation: 'alleged_father',
      gender: 'M',
      date_of_birth: '1980-07-18',
      collection_date: '2024-08-07',
      case_number: 'BN-0123',
      workflow_status: 'sample_collected',
      kit_batch_number: 'BN-0123',
      lab_batch_number: null,
      report_number: null
    },
    
    // BN-0124 Case - LT Case (all three participants)
    {
      lab_number: '25_426(25_427)F',
      name: 'Olivia',
      surname: 'Martinez',
      relation: 'child',
      gender: 'F',
      date_of_birth: '2019-01-20',
      collection_date: '2024-08-08',
      case_number: 'BN-0124',
      workflow_status: 'pcr_ready',
      kit_batch_number: 'BN-0124',
      lab_batch_number: 'LDS_122',
      report_number: null
    },
    {
      lab_number: '25_427',
      name: 'Carlos',
      surname: 'Martinez',
      relation: 'alleged_father',
      gender: 'M',
      date_of_birth: '1988-12-05',
      collection_date: '2024-08-08',
      case_number: 'BN-0124',
      workflow_status: 'pcr_ready',
      kit_batch_number: 'BN-0124',
      lab_batch_number: 'LDS_122',
      report_number: null
    },
    {
      lab_number: '25_428',
      name: 'Maria',
      surname: 'Martinez',
      relation: 'mother',
      gender: 'F',
      date_of_birth: '1990-04-12',
      collection_date: '2024-08-08',
      case_number: 'BN-0124',
      workflow_status: 'pcr_ready',
      kit_batch_number: 'BN-0124',
      lab_batch_number: 'LDS_122',
      report_number: null
    }
  ];
  
  // Begin transaction
  const dataTransaction = db.transaction(() => {
    let insertedCases = 0;
    let insertedSamples = 0;
    
    // Prepare statements
    const caseStmt = db.prepare(`
      INSERT OR REPLACE INTO test_cases (
        case_number, ref_kit_number, submission_date, client_type,
        mother_present, test_purpose, sample_type, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const sampleStmt = db.prepare(`
      INSERT OR REPLACE INTO samples (
        lab_number, name, surname, relation, gender, date_of_birth,
        collection_date, case_number, case_id, workflow_status,
        kit_batch_number, lab_batch_number, report_number,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 
        (SELECT id FROM test_cases WHERE case_number = ?), 
        ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
    `);
    
    // Insert test cases
    console.log('📁 Creating test cases...');
    for (const testCase of dummyTestCases) {
      const result = caseStmt.run(
        testCase.case_number,
        testCase.ref_kit_number,
        testCase.submission_date,
        testCase.client_type,
        testCase.mother_present,
        testCase.test_purpose,
        testCase.sample_type,
        testCase.status
      );
      
      if (result.changes > 0) {
        insertedCases++;
        console.log(`  ✅ Created case: ${testCase.case_number}`);
      }
    }
    
    // Insert samples
    console.log('🧪 Creating samples...');
    for (const sample of dummySamples) {
      const result = sampleStmt.run(
        sample.lab_number,
        sample.name,
        sample.surname,
        sample.relation,
        sample.gender,
        sample.date_of_birth,
        sample.collection_date,
        sample.case_number,
        sample.case_number,
        sample.workflow_status,
        sample.kit_batch_number,
        sample.lab_batch_number,
        sample.report_number
      );
      
      if (result.changes > 0) {
        insertedSamples++;
        console.log(`  ✅ Created sample: ${sample.lab_number} - ${sample.name} ${sample.surname} (${sample.relation})`);
      }
    }
    
    console.log(`\n📊 Dummy data generation completed!`);
    console.log(`   📁 Test cases created: ${insertedCases}`);
    console.log(`   🧪 Samples created: ${insertedSamples}`);
  });
  
  try {
    dataTransaction();
  } catch (error) {
    console.error('❌ Dummy data generation failed:', error.message);
    throw error;
  }
}

// Create a sample batch continuing from LDS_121
function createSampleBatch() {
  console.log('⚗️  Creating sample batch LDS_122...');
  
  try {
    const batchStmt = db.prepare(`
      INSERT OR REPLACE INTO batches (
        batch_number, operator, pcr_date, electro_date, 
        settings, total_samples, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = batchStmt.run(
      'LDS_122',
      'Lab Technician',
      '2024-08-08',
      null,
      '27cycles30minExt',
      3, // 3 samples from BN-0124
      'active'
    );
    
    if (result.changes > 0) {
      console.log('  ✅ Created batch: LDS_122');
    }
  } catch (error) {
    console.error('❌ Batch creation failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test database connection
    const testQuery = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
    const result = testQuery.get();
    console.log(`   ✅ Database connected (${result.count} tables found)`);
    
    // Setup sequences to continue from your current position
    setupSequences();
    
    // Clear existing dummy data (preserving real data)
    clearExistingData();
    
    // Generate dummy data
    generateDummyData();
    
    // Create sample batch
    createSampleBatch();
    
    // Show final summary
    const sampleCount = db.prepare('SELECT COUNT(*) as count FROM samples').get();
    const caseCount = db.prepare('SELECT COUNT(*) as count FROM test_cases').get();
    const batchCount = db.prepare('SELECT COUNT(*) as count FROM batches').get();
    
    console.log('\n📊 Final Database Status:');
    console.log(`   🧪 Total Samples: ${sampleCount.count}`);
    console.log(`   📁 Total Cases: ${caseCount.count}`);
    console.log(`   ⚗️  Total Batches: ${batchCount.count}`);
    
    // Show recent samples
    const recentSamples = db.prepare(`
      SELECT lab_number, name, surname, relation, workflow_status, kit_batch_number
      FROM samples 
      ORDER BY id DESC 
      LIMIT 8
    `).all();
    
    console.log('\n🔍 Recent Samples:');
    recentSamples.forEach(sample => {
      console.log(`   ${sample.lab_number}: ${sample.name} ${sample.surname} (${sample.relation}) - ${sample.kit_batch_number}`);
    });
    
    // Show next numbers that will be generated
    const bnSequence = db.prepare('SELECT next_bn_number FROM bn_sequence WHERE id = 1').get();
    const labSequence = db.prepare('SELECT next_lab_number, year_prefix FROM lab_sequence WHERE id = 1').get();
    
    console.log('\n🎯 Next Generated Numbers:');
    console.log(`   📋 Next BN Kit: BN-${bnSequence.next_bn_number.toString().padStart(4, '0')}`);
    console.log(`   🧪 Next Lab Number: ${labSequence.year_prefix}_${labSequence.next_lab_number.toString().padStart(3, '0')}`);
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
      console.log('\n👋 Database connection closed. Dummy data generation complete!');
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateDummyData, setupSequences };
