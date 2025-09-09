const db = require('./services/database');

async function populateSampleData() {
  try {
    console.log('🔄 Initializing database connection...');
    await db.initialize();
    
    console.log('🔄 Creating sample data for Enhanced Sample Cycler...');
    
    // Create a test case first
    const testCaseData = {
      case_number: 'CASE_2024_001',
      ref_kit_number: 'BN2024001',
      submission_date: new Date().toISOString().split('T')[0],
      client_type: 'paternity',
      mother_present: 'YES',
      email_contact: 'test@example.com',
      phone_contact: '0400123456',
      address_area: '123 Test Street, Sydney NSW 2000',
      comments: 'Test case for Enhanced Sample Cycler',
      test_purpose: 'paternity',
      sample_type: 'buccal_swab',
      authorized_collector: 'Test Collector',
      consent_type: 'paternity',
      has_signatures: 'YES',
      has_witness: 'YES',
      witness_name: 'Test Witness',
      legal_declarations: null
    };

    const caseResult = await db.createTestCase(testCaseData);
    const caseId = caseResult.lastInsertRowid;
    console.log(`✅ Created test case: ${testCaseData.case_number} (ID: ${caseId})`);

    // Create sample data with AUTO- prefixed lab numbers for the Enhanced Sample Cycler
    const samples = [
      {
        lab_number: 'AUTO-001',
        name: 'John',
        surname: 'Doe',
        relation: 'Father',
        workflow_status: 'sample_collected'
      },
      {
        lab_number: 'AUTO-002',
        name: 'Jane',
        surname: 'Doe',
        relation: 'Child',
        workflow_status: 'pcr_ready'
      },
      {
        lab_number: 'AUTO-003',
        name: 'Mary',
        surname: 'Smith',
        relation: 'Mother',
        workflow_status: 'pcr_batched'
      },
      {
        lab_number: 'AUTO-004',
        name: 'Robert',
        surname: 'Johnson',
        relation: 'Father',
        workflow_status: 'electro_ready'
      },
      {
        lab_number: 'AUTO-005',
        name: 'Emily',
        surname: 'Johnson',
        relation: 'Child',
        workflow_status: 'analysis_completed'
      }
    ];

    for (const sampleData of samples) {
      const fullSampleData = {
        case_id: caseId,
        lab_number: sampleData.lab_number,
        name: sampleData.name,
        surname: sampleData.surname,
        id_dob: `ID2024${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        date_of_birth: '1985-01-01',
        place_of_birth: 'Sydney',
        nationality: 'Australian',
        occupation: 'Test',
        address: testCaseData.address_area,
        phone_number: testCaseData.phone_contact,
        email: testCaseData.email_contact,
        id_number: `ID2024${Math.floor(Math.random() * 1000)}`,
        id_type: 'passport',
        marital_status: 'single',
        ethnicity: 'Caucasian',
        collection_date: new Date().toISOString().split('T')[0],
        submission_date: new Date().toISOString().split('T')[0],
        relation: sampleData.relation,
        additional_notes: 'Enhanced Sample Cycler test data',
        workflow_status: sampleData.workflow_status,
        case_number: testCaseData.case_number
      };

      const sampleResult = await db.createSample(fullSampleData);
      console.log(`✅ Created sample: ${sampleData.lab_number} (${sampleData.workflow_status})`);
    }

    console.log('🎉 Sample data populated successfully!');
    console.log('🔬 Enhanced Sample Cycler should now show live data');
    
    // Test API endpoints
    console.log('\n🧪 Testing API endpoints...');
    const allSamples = await db.getAllSamples();
    console.log(`📊 Total samples: ${allSamples.length}`);
    
    const counts = await db.getSampleCounts();
    console.log('📈 Sample counts:', counts);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateSampleData();
}

module.exports = { populateSampleData };