const db = require('./services/database');

async function populateLiveSamples() {
  try {
    console.log('🔄 Initializing database connection...');
    await db.initialize();
    
    console.log('🔄 Creating 30 live samples for DNA Workflow Monitor...');
    
    // Workflow stages for cycling
    const workflowStages = [
      'sample_collected',
      'extraction_ready',
      'extraction_in_progress',
      'extraction_completed',
      'quantification_ready',
      'quantification_completed',
      'pcr_ready',
      'pcr_batched',
      'pcr_in_progress',
      'pcr_completed',
      'electro_ready',
      'electro_batched',
      'electro_in_progress',
      'electro_completed',
      'analysis_ready',
      'analysis_in_progress',
      'analysis_completed',
      'review_pending',
      'report_generation',
      'report_sent'
    ];
    
    const names = [
      { first: 'John', last: 'Smith' },
      { first: 'Emma', last: 'Johnson' },
      { first: 'Michael', last: 'Williams' },
      { first: 'Sarah', last: 'Brown' },
      { first: 'David', last: 'Jones' },
      { first: 'Lisa', last: 'Garcia' },
      { first: 'Robert', last: 'Miller' },
      { first: 'Mary', last: 'Davis' },
      { first: 'James', last: 'Rodriguez' },
      { first: 'Jennifer', last: 'Martinez' },
      { first: 'William', last: 'Hernandez' },
      { first: 'Patricia', last: 'Lopez' },
      { first: 'Richard', last: 'Gonzalez' },
      { first: 'Linda', last: 'Wilson' },
      { first: 'Charles', last: 'Anderson' }
    ];
    
    const relations = ['Father', 'Mother', 'Child', 'Alleged Father', 'Sibling'];
    
    // Check if we already have AUTO- samples
    const existingSamples = await db.getAllSamples();
    const autoSamples = existingSamples.filter(s => s.lab_number && s.lab_number.startsWith('AUTO-'));
    const startNumber = autoSamples.length + 1;
    
    // Create test cases and samples
    for (let i = startNumber; i <= 30; i++) {
      const labNumber = `AUTO-${i.toString().padStart(3, '0')}`;
      const stageIndex = (i - 1) % workflowStages.length;
      const nameIndex = (i - 1) % names.length;
      const relationIndex = (i - 1) % relations.length;
      
      // Create a test case for every 3 samples (family group)
      let caseId;
      if ((i - 1) % 3 === 0) {
        const caseNumber = `CASE_2024_${Math.floor((i - 1) / 3 + 100)}`;
        const testCaseData = {
          case_number: caseNumber,
          ref_kit_number: `KIT${i.toString().padStart(4, '0')}`,
          submission_date: new Date().toISOString().split('T')[0],
          client_type: 'paternity',
          mother_present: relationIndex === 1 ? 'YES' : 'NO',
          email_contact: `client${i}@example.com`,
          phone_contact: `040012${i.toString().padStart(4, '0')}`,
          address_area: `${i} Test Street, Sydney NSW 2000`,
          comments: 'Live DNA Workflow Monitor test',
          test_purpose: 'paternity',
          sample_type: 'buccal_swab',
          authorized_collector: 'Lab Technician',
          consent_type: 'paternity',
          has_signatures: 'YES',
          has_witness: 'YES',
          witness_name: 'Lab Supervisor',
          legal_declarations: null
        };
        
        try {
          const caseResult = await db.createTestCase(testCaseData);
          caseId = caseResult.lastInsertRowid;
          console.log(`✅ Created test case: ${caseNumber}`);
        } catch (error) {
          // Case might already exist, try to get it
          const existingCase = await db.get('SELECT id FROM test_cases WHERE case_number = ?', [caseNumber]);
          caseId = existingCase ? existingCase.id : 1;
        }
      } else {
        // Use the last case ID
        const cases = await db.all('SELECT id FROM test_cases ORDER BY id DESC LIMIT 1');
        caseId = cases[0]?.id || 1;
      }
      
      // Check if sample already exists
      const existingSample = await db.get('SELECT id FROM samples WHERE lab_number = ?', [labNumber]);
      
      if (!existingSample) {
        const sampleData = {
          case_id: caseId,
          lab_number: labNumber,
          name: names[nameIndex].first,
          surname: names[nameIndex].last,
          id_dob: `ID2024${i.toString().padStart(4, '0')}`,
          date_of_birth: '1985-01-01',
          place_of_birth: 'Sydney',
          nationality: 'Australian',
          occupation: 'Professional',
          address: `${i} Test Street, Sydney NSW 2000`,
          phone_number: `040012${i.toString().padStart(4, '0')}`,
          email: `sample${i}@example.com`,
          id_number: `ID2024${i.toString().padStart(4, '0')}`,
          id_type: 'passport',
          marital_status: 'single',
          ethnicity: 'Caucasian',
          collection_date: new Date().toISOString().split('T')[0],
          submission_date: new Date().toISOString().split('T')[0],
          relation: relations[relationIndex],
          additional_notes: 'Live workflow tracking sample',
          workflow_status: workflowStages[stageIndex],
          case_number: `CASE_2024_${Math.floor((i - 1) / 3 + 100)}`
        };
        
        await db.createSample(sampleData);
        console.log(`✅ Created sample ${labNumber} (${workflowStages[stageIndex]})`);
      } else {
        console.log(`⏭️  Sample ${labNumber} already exists`);
      }
    }
    
    console.log('🎉 Live samples populated successfully!');
    console.log('🔬 DNA Workflow Monitor should now show 30 samples cycling through stages');
    
    // Test API endpoints
    console.log('\n🧪 Testing API endpoints...');
    const allSamples = await db.getAllSamples();
    const autoSamplesCount = allSamples.filter(s => s.lab_number && s.lab_number.startsWith('AUTO-')).length;
    console.log(`📊 Total AUTO- samples: ${autoSamplesCount}`);
    
    const counts = await db.getSampleCounts();
    console.log('📈 Sample counts:', counts);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating live samples:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateLiveSamples();
}

module.exports = { populateLiveSamples };