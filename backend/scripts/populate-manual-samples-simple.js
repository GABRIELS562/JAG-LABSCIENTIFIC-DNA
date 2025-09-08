const Database = require('better-sqlite3');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Database connection
const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const db = new Database(dbPath);

// Sample distribution across workflow stages
const SAMPLE_DISTRIBUTION = {
  'sample_collected': 15,
  'extraction_ready': 12,
  'extraction_batched': 10,
  'extraction_completed': 8,
  'qpcr_ready': 10,
  'qpcr_batched': 8,
  'qpcr_completed': 6,
  'pcr_ready': 10,
  'pcr_batched': 8,
  'pcr_completed': 6,
  'electro_ready': 10,
  'electro_batched': 8,
  'electro_completed': 6,
  'analysis_ready': 8,
  'analysis_completed': 6,
  'report_ready': 10,
  'report_sent': 15
};

// Create batches for different stages
function createBatches() {
  const batches = [];
  
  // PCR batches
  const pcrBatches = [
    { batch_number: 'MAN_PCR_001', operator: 'John Smith', pcr_date: '2024-01-15', status: 'completed' },
    { batch_number: 'MAN_PCR_002', operator: 'Jane Doe', pcr_date: '2024-01-16', status: 'active' },
    { batch_number: 'MAN_PCR_003', operator: 'Mike Johnson', pcr_date: '2024-01-17', status: 'active' }
  ];
  
  // Electrophoresis batches
  const electroBatches = [
    { batch_number: 'MAN_ELEC_001', operator: 'Sarah Wilson', electro_date: '2024-01-16', status: 'completed' },
    { batch_number: 'MAN_ELEC_002', operator: 'Tom Brown', electro_date: '2024-01-17', status: 'active' }
  ];
  
  const insertBatch = db.prepare(`
    INSERT OR IGNORE INTO batches (batch_number, operator, pcr_date, electro_date, status, total_samples)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  // Insert PCR batches
  pcrBatches.forEach(batch => {
    try {
      insertBatch.run(batch.batch_number, batch.operator, batch.pcr_date, null, batch.status, 8);
      console.log(`  ✅ Created PCR batch: ${batch.batch_number}`);
    } catch (error) {
      console.log(`  ℹ️ PCR batch ${batch.batch_number} already exists`);
    }
  });
  
  // Insert Electrophoresis batches
  electroBatches.forEach(batch => {
    try {
      insertBatch.run(batch.batch_number, batch.operator, null, batch.electro_date, batch.status, 6);
      console.log(`  ✅ Created electrophoresis batch: ${batch.batch_number}`);
    } catch (error) {
      console.log(`  ℹ️ Electrophoresis batch ${batch.batch_number} already exists`);
    }
  });
}

// Create manual samples
function createManualSamples() {
  // First, create cases in the simple cases table
  const insertCase = db.prepare(`INSERT OR IGNORE INTO cases (name) VALUES (?)`);
  
  // Create some cases
  for (let i = 1; i <= 50; i++) {
    const caseName = `Manual Case ${i}`;
    try {
      insertCase.run(caseName);
    } catch (error) {
      // Case might already exist
    }
  }
  
  // Get all case IDs
  const cases = db.prepare('SELECT id FROM cases').all();
  
  const insertSample = db.prepare(`
    INSERT INTO samples (
      case_id, lab_number, name, surname, id_dob, date_of_birth,
      place_of_birth, nationality, occupation, address, phone_number,
      email, id_number, id_type, marital_status, ethnicity,
      collection_date, submission_date, relation, sample_type, 
      case_number, workflow_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let sampleCount = 0;
  const startNumber = 60000; // Start from a high number to avoid conflicts
  
  // Create samples for each workflow stage
  Object.entries(SAMPLE_DISTRIBUTION).forEach(([stage, count]) => {
    console.log(`  📋 Creating ${count} samples in ${stage} stage...`);
    
    for (let i = 0; i < count; i++) {
      const labNumber = `MAN-${(startNumber + sampleCount).toString().padStart(6, '0')}`;
      
      // Pick a random case
      const caseId = cases.length > 0 ? cases[Math.floor(Math.random() * cases.length)].id : null;
      
      // Determine sample type
      const sampleTypes = ['father', 'mother', 'child'];
      const sampleType = sampleTypes[sampleCount % 3];
      
      // Create realistic sample data
      const sampleData = {
        case_id: caseId,
        lab_number: labNumber,
        name: faker.person.firstName(),
        surname: faker.person.lastName(),
        id_dob: faker.date.past({ years: 30 }).toISOString().split('T')[0],
        date_of_birth: faker.date.past({ years: 30 }).toISOString().split('T')[0],
        place_of_birth: faker.location.city(),
        nationality: faker.location.country(),
        occupation: faker.person.jobTitle(),
        address: faker.location.streetAddress(),
        phone_number: faker.phone.number(),
        email: faker.internet.email(),
        id_number: faker.string.alphanumeric(10).toUpperCase(),
        id_type: faker.helpers.arrayElement(['passport', 'nationalId', 'driversLicense']),
        marital_status: faker.helpers.arrayElement(['single', 'married', 'divorced', 'widowed']),
        ethnicity: faker.helpers.arrayElement(['African', 'European', 'Asian', 'Mixed', 'Other']),
        collection_date: faker.date.recent({ days: 7 }).toISOString().split('T')[0],
        submission_date: faker.date.recent({ days: 5 }).toISOString().split('T')[0],
        relation: sampleType, // Changed from reason to relation
        sample_type: sampleType,
        case_number: `CASE-${Math.floor((startNumber + sampleCount) / 3).toString().padStart(5, '0')}`,
        workflow_status: stage
      };
      
      try {
        insertSample.run(
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
          sampleData.sample_type,
          sampleData.case_number,
          sampleData.workflow_status
        );
        
        sampleCount++;
      } catch (error) {
        console.error(`    ❌ Error creating sample ${labNumber}:`, error.message);
      }
    }
  });
  
  console.log(`\n✅ Created ${sampleCount} manual samples distributed across workflow stages`);
}

// Main execution
async function main() {
  console.log('🚀 Populating Manual Samples for LIMS Demo');
  console.log('═══════════════════════════════════════════');
  
  try {
    // Clear existing manual samples
    console.log('\n🧹 Clearing existing manual samples...');
    const deleteResult = db.prepare("DELETE FROM samples WHERE lab_number LIKE 'MAN-%'").run();
    console.log(`  Removed ${deleteResult.changes} existing manual samples`);
    
    // Delete old manual batches
    db.prepare("DELETE FROM batches WHERE batch_number LIKE 'MAN_%'").run();
    
    // Create batches
    console.log('\n⚗️ Creating batches...');
    createBatches();
    
    // Create manual samples
    console.log('\n👨‍👩‍👧 Creating Manual Samples...');
    createManualSamples();
    
    // Show summary
    console.log('\n📊 Summary of Manual Samples by Stage:');
    const summary = db.prepare(`
      SELECT workflow_status, COUNT(*) as count
      FROM samples
      WHERE lab_number LIKE 'MAN-%'
      GROUP BY workflow_status
      ORDER BY 
        CASE workflow_status
          WHEN 'sample_collected' THEN 1
          WHEN 'extraction_ready' THEN 2
          WHEN 'extraction_batched' THEN 3
          WHEN 'extraction_completed' THEN 4
          WHEN 'qpcr_ready' THEN 5
          WHEN 'qpcr_batched' THEN 6
          WHEN 'qpcr_completed' THEN 7
          WHEN 'pcr_ready' THEN 8
          WHEN 'pcr_batched' THEN 9
          WHEN 'pcr_completed' THEN 10
          WHEN 'electro_ready' THEN 11
          WHEN 'electro_batched' THEN 12
          WHEN 'electro_completed' THEN 13
          WHEN 'analysis_ready' THEN 14
          WHEN 'analysis_completed' THEN 15
          WHEN 'report_ready' THEN 16
          WHEN 'report_sent' THEN 17
        END
    `).all();
    
    summary.forEach(row => {
      console.log(`  ${row.workflow_status}: ${row.count} samples`);
    });
    
    // Show total counts
    const totalManual = db.prepare("SELECT COUNT(*) as count FROM samples WHERE lab_number LIKE 'MAN-%'").get();
    const totalAuto = db.prepare("SELECT COUNT(*) as count FROM samples WHERE lab_number LIKE 'AUTO-%'").get();
    const totalAll = db.prepare("SELECT COUNT(*) as count FROM samples").get();
    
    console.log('\n📈 Total Sample Counts:');
    console.log(`  Manual samples: ${totalManual.count}`);
    console.log(`  Auto samples: ${totalAuto.count}`);
    console.log(`  Total samples: ${totalAll.count}`);
    
    console.log('\n✨ Manual sample population completed successfully!');
    console.log('📱 The dashboard should now show realistic manual workflow data');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    db.close();
  }
}

// Run the script
main().catch(console.error);