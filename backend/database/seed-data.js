const db = require('../services/database');

async function seedDatabase() {
  console.log('🌱 Seeding database with comprehensive dummy data...\n');

  try {
    // Clear existing data first
    console.log('🧹 Clearing existing data...');
    db.db.exec(`
      DELETE FROM reports;
      DELETE FROM quality_control;
      DELETE FROM well_assignments;
      DELETE FROM batches;
      DELETE FROM samples;
      DELETE FROM test_cases;
      DELETE FROM equipment;
    `);
    console.log('✅ Existing data cleared\n');
    // Generate multiple test cases
    const testCases = [];
    const samples = [];
    const batches = [];
    const wellAssignments = [];
    const qcRecords = [];
    
    // Global counter for unique lab numbers
    let globalSampleCounter = 0;

    // Create 60 test cases with families (mix of paternity, urgent, and LT)
    for (let i = 1; i <= 60; i++) {
      const caseNumber = `CASE_2024_${i.toString().padStart(3, '0')}`;
      
      const testCaseData = {
        case_number: caseNumber,
        ref_kit_number: `KIT2024${i.toString().padStart(3, '0')}`,
        submission_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        client_type: i <= 30 ? 'paternity' : i <= 45 ? 'lt' : 'urgent',
        mother_present: Math.random() > 0.5 ? 'YES' : 'NO',
        email_contact: `client${i}@example.com`,
        phone_contact: `040012${i.toString().padStart(2, '0')}56`,
        address_area: `${i * 123} Test Street, Sydney NSW 200${i % 10}`,
        comments: `Test case ${i} - Family paternity testing`
      };

      const caseResult = db.createTestCase(testCaseData);
      const caseId = caseResult.lastInsertRowid;
      testCases.push({ id: caseId, ...testCaseData });

      // Create family members for each case
      const fatherNames = ['John', 'Michael', 'David', 'Robert', 'James', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Alexander', 'Jack', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Henry', 'Zachary', 'Douglas', 'Arthur', 'Carl', 'Harold', 'Jordan', 'Jesse', 'Bryan', 'Lawrence'];
      const motherNames = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Deborah', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Deborah', 'Dorothy', 'Amy', 'Angela', 'Ashley', 'Brenda', 'Emma', 'Olivia', 'Sophia', 'Emily', 'Madison', 'Abigail', 'Hannah', 'Elizabeth', 'Addison', 'Samantha', 'Katherine', 'Natalie', 'Grace', 'Chloe', 'Jessica'];
      const childNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Logan', 'Mia', 'Lucas', 'Amelia', 'Oliver', 'Charlotte', 'Elijah', 'Harper', 'William', 'Evelyn', 'Benjamin', 'Abigail', 'Sebastian', 'Emily', 'Henry', 'Elizabeth', 'Matthew', 'Mila', 'Michael', 'Ella', 'Alexander', 'Avery', 'Owen', 'Sofia', 'Daniel', 'Camila', 'Jacob', 'Aria', 'Luke', 'Scarlett', 'Jackson', 'Victoria', 'Levi', 'Madison', 'Gabriel', 'Luna', 'Carter', 'Grace', 'Jayden', 'Chloe', 'John', 'Penelope', 'Anthony', 'Layla', 'Isaac', 'Riley', 'Dylan', 'Zoey', 'Wyatt', 'Nora', 'Andrew'];
      const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes'];

      // Create multiple samples for LT cases (multiple children)
      const isLTCase = testCaseData.client_type === 'lt';
      const childrenCount = isLTCase ? Math.floor(Math.random() * 3) + 2 : 1; // 2-4 children for LT cases
      
      // Father sample
      const fatherData = {
        case_id: caseId,
        lab_number: `2024_${(++globalSampleCounter).toString().padStart(3, '0')}`,
        name: fatherNames[(i-1) % fatherNames.length],
        surname: surnames[(i-1) % surnames.length],
        id_dob: `ID${2024}${i.toString().padStart(3, '0')}F`,
        date_of_birth: new Date(1980 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        place_of_birth: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'][Math.floor(Math.random() * 5)],
        nationality: 'Australian',
        occupation: ['Engineer', 'Doctor', 'Teacher', 'Lawyer', 'Accountant'][Math.floor(Math.random() * 5)],
        address: testCaseData.address_area,
        phone_number: testCaseData.phone_contact,
        email: `${fatherNames[i-1].toLowerCase()}.${surnames[i-1].toLowerCase()}@example.com`,
        id_number: `ID${2024}${i.toString().padStart(3, '0')}F`,
        id_type: ['passport', 'nationalId', 'driversLicense'][Math.floor(Math.random() * 3)],
        marital_status: ['single', 'married', 'divorced'][Math.floor(Math.random() * 3)],
        ethnicity: ['Caucasian', 'Asian', 'Aboriginal', 'Mixed'][Math.floor(Math.random() * 4)],
        collection_date: testCaseData.submission_date,
        submission_date: testCaseData.submission_date,
        relation: 'Alleged Father',
        additional_notes: `Father sample for case ${caseNumber}`
      };

      // Create children samples
      const childrenData = [];
      for (let childIndex = 0; childIndex < childrenCount; childIndex++) {
        const childData = {
          case_id: caseId,
          lab_number: `2024_${(++globalSampleCounter).toString().padStart(3, '0')}`,
          name: childNames[((i-1) * childrenCount + childIndex) % childNames.length],
          surname: surnames[(i-1) % surnames.length],
        id_dob: `ID${2024}${i.toString().padStart(3, '0')}C`,
        date_of_birth: new Date(2010 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        place_of_birth: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'][Math.floor(Math.random() * 5)],
        nationality: 'Australian',
        occupation: 'Student',
        address: testCaseData.address_area,
        phone_number: testCaseData.phone_contact,
        email: testCaseData.email_contact,
        id_number: `ID${2024}${i.toString().padStart(3, '0')}C`,
        id_type: ['passport', 'nationalId'][Math.floor(Math.random() * 2)],
        marital_status: 'single',
        ethnicity: ['Caucasian', 'Asian', 'Aboriginal', 'Mixed'][Math.floor(Math.random() * 4)],
        collection_date: testCaseData.submission_date,
        submission_date: testCaseData.submission_date,
          relation: 'Child',
          additional_notes: `Child sample for case ${caseNumber}${childrenCount > 1 ? ` - Child ${childIndex + 1}` : ''}`
        };
        childrenData.push(childData);
      }

      // Mother sample (50% chance)
      let motherSample = null;
      let motherData = null;
      if (testCaseData.mother_present === 'YES') {
        motherData = {
          case_id: caseId,
          lab_number: `2024_${(++globalSampleCounter).toString().padStart(3, '0')}`,
          name: motherNames[(i-1) % motherNames.length],
          surname: surnames[(i-1) % surnames.length],
          id_dob: `ID${2024}${i.toString().padStart(3, '0')}M`,
          date_of_birth: new Date(1982 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          place_of_birth: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'][Math.floor(Math.random() * 5)],
          nationality: 'Australian',
          occupation: ['Nurse', 'Teacher', 'Manager', 'Designer', 'Analyst'][Math.floor(Math.random() * 5)],
          address: testCaseData.address_area,
          phone_number: testCaseData.phone_contact,
          email: `${motherNames[i-1].toLowerCase()}.${surnames[i-1].toLowerCase()}@example.com`,
          id_number: `ID${2024}${i.toString().padStart(3, '0')}M`,
          id_type: ['passport', 'nationalId', 'driversLicense'][Math.floor(Math.random() * 3)],
          marital_status: ['single', 'married', 'divorced'][Math.floor(Math.random() * 3)],
          ethnicity: ['Caucasian', 'Asian', 'Aboriginal', 'Mixed'][Math.floor(Math.random() * 4)],
          collection_date: testCaseData.submission_date,
          submission_date: testCaseData.submission_date,
          relation: 'Mother',
          additional_notes: `Mother sample for case ${caseNumber}`
        };
        motherSample = db.createSample(motherData);
      }

      // Set random status for samples (urgent cases get priority)
      const statuses = testCaseData.client_type === 'urgent' ? ['processing', 'completed'] : ['pending', 'processing', 'completed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Update sample status to add variety
      fatherData.status = randomStatus;
      
      const fatherResult = db.createSample(fatherData);
      samples.push({ id: fatherResult.lastInsertRowid, ...fatherData });
      
      // Create all children samples
      childrenData.forEach(childData => {
        childData.status = randomStatus;
        const childResult = db.createSample(childData);
        samples.push({ id: childResult.lastInsertRowid, ...childData });
      });

      if (motherSample) {
        motherData.status = randomStatus;
        samples.push({ id: motherSample.lastInsertRowid, ...motherData });
      }
    }

    console.log(`✅ Created ${testCases.length} test cases`);
    console.log(`✅ Created ${samples.length} samples`);

    // Create 5 batches with different operators and dates
    const operators = ['Dr. Smith', 'Dr. Johnson', 'Lab Tech A', 'Lab Tech B', 'Supervisor'];
    const batchStatuses = ['active', 'completed'];

    for (let i = 1; i <= 5; i++) {
      const batchData = {
        batch_number: `BATCH_2024_${i.toString().padStart(3, '0')}`,
        operator: operators[i-1],
        pcr_date: new Date(2024, 5, i * 2).toISOString().split('T')[0],
        electro_date: new Date(2024, 5, i * 2 + 1).toISOString().split('T')[0],
        settings: ['27cycles30minExt', '28cycles25minExt', '30cycles35minExt'][Math.floor(Math.random() * 3)],
        total_samples: Math.floor(Math.random() * 20) + 10,
        plate_layout: {
          A01: { type: 'Allelic Ladder', comment: 'Control' },
          H11: { type: 'Negative Control', comment: 'Negative' },
          H12: { type: 'Positive Control', comment: 'Positive' }
        },
        status: batchStatuses[Math.floor(Math.random() * 2)]
      };

      const batchResult = db.createBatch(batchData);
      const batchId = batchResult.lastInsertRowid;
      batches.push({ id: batchId, ...batchData });

      // Create well assignments for this batch
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const cols = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      
      // Add control wells
      const controlWells = [
        { batch_id: batchId, well_position: 'A01', sample_id: null, well_type: 'Allelic Ladder', kit_number: null, sample_name: 'Allelic_Ladder', comment: 'Control' },
        { batch_id: batchId, well_position: 'H11', sample_id: null, well_type: 'Negative Control', kit_number: null, sample_name: 'Negative_Control', comment: 'Negative' },
        { batch_id: batchId, well_position: 'H12', sample_id: null, well_type: 'Positive Control', kit_number: null, sample_name: 'Positive_Control', comment: 'Positive' }
      ];

      controlWells.forEach(well => {
        db.createWellAssignment(well);
        wellAssignments.push(well);
      });

      // Add some sample wells
      for (let j = 0; j < Math.min(batchData.total_samples, 10); j++) {
        const row = rows[j % 8];
        const col = cols[Math.floor(j / 8) + 1];
        const wellPosition = `${row}${col}`;
        
        // Skip control positions
        if (['A01', 'H11', 'H12'].includes(wellPosition)) continue;

        const wellAssignment = {
          batch_id: batchId,
          well_position: wellPosition,
          sample_id: samples[j % samples.length].id,
          well_type: 'Sample',
          kit_number: `KIT2024${(j + 1).toString().padStart(3, '0')}`,
          sample_name: `Sample_${wellPosition}`,
          comment: `Batch ${batchData.batch_number} sample`
        };

        db.createWellAssignment(wellAssignment);
        wellAssignments.push(wellAssignment);
      }

      // Create QC records for each batch
      const qcTypes = ['Positive Control', 'Negative Control', 'Allelic Ladder', 'Sample Quality'];
      const qcResults = ['Passed', 'Failed'];

      for (let k = 0; k < 3; k++) {
        const qcData = {
          batch_id: batchId,
          date: new Date(2024, 5, i * 2 + k).toISOString().split('T')[0],
          control_type: qcTypes[k],
          result: k < 2 ? 'Passed' : qcResults[Math.floor(Math.random() * 2)],
          operator: operators[i-1],
          comments: `QC ${qcTypes[k]} for batch ${batchData.batch_number} - ${k < 2 ? 'All parameters within acceptable range' : 'Standard QC procedure completed'}`
        };

        const qcResult = db.createQualityControl(qcData);
        qcRecords.push({ id: qcResult.lastInsertRowid, ...qcData });
      }
    }

    console.log(`✅ Created ${batches.length} batches`);
    console.log(`✅ Created ${wellAssignments.length} well assignments`);
    console.log(`✅ Created ${qcRecords.length} QC records`);

    // Create additional equipment records
    const additionalEquipment = [
      { equipment_id: 'SEQ001', type: 'DNA Sequencer', last_calibration: '2024-05-01', next_calibration: '2024-11-01', status: 'active' },
      { equipment_id: 'SPEC001', type: 'Spectrophotometer', last_calibration: '2024-04-15', next_calibration: '2024-10-15', status: 'active' },
      { equipment_id: 'MICRO001', type: 'Microscope', last_calibration: '2024-03-01', next_calibration: '2024-09-01', status: 'maintenance' },
      { equipment_id: 'FREEZE001', type: 'Freezer -80C', last_calibration: '2024-06-01', next_calibration: '2024-12-01', status: 'active' },
      { equipment_id: 'INCU001', type: 'Incubator', last_calibration: '2024-05-15', next_calibration: '2024-11-15', status: 'active' }
    ];

    // Check if equipment already exists before inserting
    additionalEquipment.forEach(eq => {
      try {
        db.db.prepare(`
          INSERT OR IGNORE INTO equipment (equipment_id, type, last_calibration, next_calibration, status) 
          VALUES (?, ?, ?, ?, ?)
        `).run(eq.equipment_id, eq.type, eq.last_calibration, eq.next_calibration, eq.status);
      } catch (error) {
        console.warn(`Equipment ${eq.equipment_id} already exists`);
      }
    });

    console.log(`✅ Added additional equipment records`);

    // Create some reports
    const reportTypes = ['Batch Report', 'QC Summary', 'Paternity Report', 'Sample Report'];
    const reportStatuses = ['pending', 'completed', 'sent'];

    for (let i = 0; i < 8; i++) {
      const reportData = {
        case_id: testCases[i % testCases.length].id,
        batch_id: batches[i % batches.length].id,
        report_number: `RPT_2024_${(i + 1).toString().padStart(3, '0')}`,
        report_type: reportTypes[i % reportTypes.length],
        date_generated: new Date(2024, 5, i + 1).toISOString().split('T')[0],
        status: reportStatuses[i % reportStatuses.length],
        file_path: `/reports/2024/RPT_2024_${(i + 1).toString().padStart(3, '0')}.pdf`
      };

      db.createReport(reportData);
    }

    console.log(`✅ Created 8 report records`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${testCases.length} Test Cases`);
    console.log(`   • ${samples.length} Samples`);
    console.log(`   • ${batches.length} Batches`);
    console.log(`   • ${wellAssignments.length} Well Assignments`);
    console.log(`   • ${qcRecords.length} QC Records`);
    console.log(`   • ${additionalEquipment.length} Additional Equipment Items`);
    console.log(`   • 8 Report Records`);

    return {
      testCases: testCases.length,
      samples: samples.length,
      batches: batches.length,
      wellAssignments: wellAssignments.length,
      qcRecords: qcRecords.length,
      equipment: additionalEquipment.length,
      reports: 8
    };

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then((summary) => {
      console.log('\n✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;