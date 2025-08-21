#!/usr/bin/env node
/**
 * Fix samples data for the test cases
 */

const dbService = require('../services/database');
const { faker } = require('@faker-js/faker');

console.log('🔧 Fixing sample data...');

dbService.ensureConnection();

// Get all test cases
const testCases = dbService.db.prepare('SELECT * FROM test_cases ORDER BY id LIMIT 20').all();

console.log(`Found ${testCases.length} test cases`);

let samplesCreated = 0;

for (const testCase of testCases) {
  // Create samples for each test case
  const relations = ['Child', 'Alleged Father'];
  if (testCase.mother_present === 'YES') {
    relations.push('Mother');
  }
  
  for (let i = 0; i < relations.length; i++) {
    const relation = relations[i];
    const labNumber = `${testCase.case_number.split('_')[2]}_${(samplesCreated + 1).toString().padStart(3, '0')}`;
    
    try {
      dbService.db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, date_of_birth,
          nationality, occupation, address, phone_number, email,
          collection_date, submission_date, relation, gender, age,
          sample_type, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        testCase.id,
        labNumber,
        faker.person.firstName(),
        faker.person.lastName(),
        faker.date.past({ years: 30 }).toISOString().split('T')[0],
        'Australian',
        faker.person.jobTitle(),
        testCase.address_area,
        testCase.phone_contact,
        testCase.email_contact,
        testCase.submission_date,
        testCase.submission_date,
        relation,
        relation === 'Mother' ? 'F' : (Math.random() > 0.5 ? 'M' : 'F'),
        faker.number.int({ min: 1, max: 50 }),
        testCase.sample_type,
        'completed',
        faker.helpers.arrayElement(['pcr_completed', 'electro_completed', 'analysis_completed']),
        testCase.case_number
      );
      
      samplesCreated++;
    } catch (error) {
      console.error(`Error creating sample for ${testCase.case_number}:`, error.message);
    }
  }
}

console.log(`✅ Created ${samplesCreated} samples`);

// Verify the results
const totalSamples = dbService.db.prepare('SELECT COUNT(*) as count FROM samples').get();
const casesWithSamples = dbService.db.prepare(`
  SELECT COUNT(*) as count 
  FROM test_cases tc 
  WHERE EXISTS (SELECT 1 FROM samples s WHERE s.case_id = tc.id)
`).get();

console.log(`📊 Total samples: ${totalSamples.count}`);
console.log(`📊 Cases with samples: ${casesWithSamples.count}`);

process.exit(0);