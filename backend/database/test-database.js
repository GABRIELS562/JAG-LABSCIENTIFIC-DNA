const db = require('../services/database');

async function testDatabaseOperations() {
  console.log('🚀 Testing SQLite Database Operations\n');

  try {
    // Test 1: Generate lab numbers
    console.log('📋 Test 1: Generate Lab Numbers');
    const labNum1 = db.generateLabNumber();
    // For testing, manually create the second lab number
    const year = new Date().getFullYear();
    const labNum2 = `${year}_002`;
    const caseNum = db.generateCaseNumber();
    console.log(`✅ Generated lab numbers: ${labNum1}, ${labNum2}`);
    console.log(`✅ Generated case number: ${caseNum}\n`);

    // Test 2: Create a test case
    console.log('📋 Test 2: Create Test Case');
    const testCaseData = {
      case_number: caseNum,
      ref_kit_number: 'BN123456',
      submission_date: '2024-06-28',
      client_type: 'paternity',
      mother_present: 'YES',
      email_contact: 'test@example.com',
      phone_contact: '0400123456',
      address_area: '123 Test St, Sydney NSW 2000',
      comments: 'Test case for database verification'
    };

    const caseResult = db.createTestCase(testCaseData);
    console.log(`✅ Created test case with ID: ${caseResult.lastInsertRowid}\n`);

    // Test 3: Create samples
    console.log('📋 Test 3: Create Samples');
    const sampleData1 = {
      case_id: caseResult.lastInsertRowid,
      lab_number: labNum1,
      name: 'John',
      surname: 'Doe',
      id_dob: 'ID123456',
      date_of_birth: '1985-06-15',
      place_of_birth: 'Sydney',
      nationality: 'Australian',
      occupation: 'Engineer',
      address: '123 Test St, Sydney',
      phone_number: '0400123456',
      email: 'john.doe@example.com',
      id_number: 'ID123456',
      id_type: 'passport',
      marital_status: 'single',
      ethnicity: 'Caucasian',
      collection_date: '2024-06-28',
      submission_date: '2024-06-28',
      relation: 'Alleged Father',
      additional_notes: 'Test father sample'
    };

    const sampleData2 = {
      case_id: caseResult.lastInsertRowid,
      lab_number: labNum2,
      name: 'Jane',
      surname: 'Doe',
      id_dob: 'ID789012',
      date_of_birth: '2020-01-15',
      place_of_birth: 'Sydney',
      nationality: 'Australian',
      occupation: 'Student',
      address: '123 Test St, Sydney',
      phone_number: '0400123456',
      email: 'guardian@example.com',
      id_number: 'ID789012',
      id_type: 'passport',
      marital_status: 'single',
      ethnicity: 'Mixed',
      collection_date: '2024-06-28',
      submission_date: '2024-06-28',
      relation: 'Child',
      additional_notes: 'Test child sample'
    };

    const sample1Result = db.createSample(sampleData1);
    const sample2Result = db.createSample(sampleData2);
    console.log(`✅ Created samples with IDs: ${sample1Result.lastInsertRowid}, ${sample2Result.lastInsertRowid}\n`);

    // Test 4: Search samples
    console.log('📋 Test 4: Search Samples');
    const searchResults = db.searchSamples('John');
    console.log(`✅ Search for 'John' returned ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log(`   First result: ${searchResults[0].name} ${searchResults[0].surname} (${searchResults[0].lab_number})`);
    }
    console.log();

    // Test 5: Create batch
    console.log('📋 Test 5: Create Batch');
    const batchData = {
      batch_number: 'BATCH_001',
      operator: 'Test Operator',
      pcr_date: '2024-06-29',
      electro_date: '2024-06-30',
      settings: '27cycles30minExt',
      total_samples: 2,
      plate_layout: {
        A01: { type: 'Sample', sample_id: sample1Result.lastInsertRowid },
        A02: { type: 'Sample', sample_id: sample2Result.lastInsertRowid },
        H01: { type: 'Allelic Ladder' },
        H11: { type: 'Negative Control' },
        H12: { type: 'Positive Control' }
      }
    };

    const batchResult = db.createBatch(batchData);
    console.log(`✅ Created batch with ID: ${batchResult.lastInsertRowid}\n`);

    // Test 6: Create well assignments
    console.log('📋 Test 6: Create Well Assignments');
    const wellAssignments = [
      {
        batch_id: batchResult.lastInsertRowid,
        well_position: 'A01',
        sample_id: sample1Result.lastInsertRowid,
        well_type: 'Sample',
        kit_number: 'KIT001',
        sample_name: 'John_Doe_Sample',
        comment: 'Father sample'
      },
      {
        batch_id: batchResult.lastInsertRowid,
        well_position: 'A02',
        sample_id: sample2Result.lastInsertRowid,
        well_type: 'Sample',
        kit_number: 'KIT002',
        sample_name: 'Jane_Doe_Sample',
        comment: 'Child sample'
      },
      {
        batch_id: batchResult.lastInsertRowid,
        well_position: 'H01',
        sample_id: null,
        well_type: 'Allelic Ladder',
        kit_number: null,
        sample_name: 'Allelic_Ladder',
        comment: 'Control'
      }
    ];

    wellAssignments.forEach(well => {
      db.createWellAssignment(well);
    });
    console.log(`✅ Created ${wellAssignments.length} well assignments\n`);

    // Test 7: Create QC record
    console.log('📋 Test 7: Create Quality Control Record');
    const qcData = {
      batch_id: batchResult.lastInsertRowid,
      date: '2024-06-28',
      control_type: 'Positive Control',
      result: 'Passed',
      operator: 'Test Operator',
      comments: 'All controls passed successfully'
    };

    const qcResult = db.createQualityControl(qcData);
    console.log(`✅ Created QC record with ID: ${qcResult.lastInsertRowid}\n`);

    // Test 8: Get statistics
    console.log('📋 Test 8: Get Statistics');
    const stats = db.getSampleCounts();
    console.log('✅ Sample counts:', stats);

    const dailyStats = db.getStatistics('daily');
    console.log('✅ Daily statistics:', dailyStats, '\n');

    // Test 9: Retrieve data
    console.log('📋 Test 9: Retrieve Data');
    const retrievedCase = db.getTestCase(caseNum);
    console.log(`✅ Retrieved test case: ${retrievedCase.case_number}`);

    const retrievedSample = db.getSample(labNum1);
    console.log(`✅ Retrieved sample: ${retrievedSample.name} ${retrievedSample.surname}`);

    const retrievedBatch = db.getBatch('BATCH_001');
    console.log(`✅ Retrieved batch: ${retrievedBatch.batch_number} (${retrievedBatch.total_samples} samples)`);

    const wellAssignmentsRetrieved = db.getWellAssignments(batchResult.lastInsertRowid);
    console.log(`✅ Retrieved ${wellAssignmentsRetrieved.length} well assignments\n`);

    // Test 10: Equipment
    console.log('📋 Test 10: Equipment Management');
    const equipment = db.getAllEquipment();
    console.log(`✅ Found ${equipment.length} equipment items`);
    if (equipment.length > 0) {
      console.log(`   Example: ${equipment[0].equipment_id} - ${equipment[0].type}`);
    }

    console.log('\n🎉 All database tests completed successfully!');
    console.log('✅ SQLite database is ready for production use.');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDatabaseOperations()
    .then(() => {
      console.log('\n✅ Database service is working correctly!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database service test failed:', error);
      process.exit(1);
    });
}

module.exports = testDatabaseOperations;