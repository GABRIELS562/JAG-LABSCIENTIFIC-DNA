#!/usr/bin/env node
/**
 * Simple LABSCIENTIFIC LIMS Database Seeding Script
 * Focused on core tables that work with existing schema
 */

const path = require('path');
const { faker } = require('@faker-js/faker');
const dbService = require('../services/database');

console.log('🌱 Starting Simple Database Seeding...');

// Set faker locale for consistent data
faker.locale = 'en_AU';

/**
 * Seed basic test cases
 */
async function seedBasicTestCases() {
  console.log('  Creating test cases...');
  const testCases = [];
  
  for (let i = 0; i < 50; i++) {
    const caseNumber = `CASE_2025_${(i + 1).toString().padStart(3, '0')}`;
    const clientType = faker.helpers.arrayElement(['paternity', 'lt', 'urgent', 'peace_of_mind']);
    const submissionDate = faker.date.past({ months: 6 }).toISOString().split('T')[0];
    
    const testCase = {
      case_number: caseNumber,
      ref_kit_number: `BN2025${(i + 1).toString().padStart(3, '0')}`,
      submission_date: submissionDate,
      client_type: clientType,
      mother_present: faker.helpers.arrayElement(['YES', 'NO']),
      email_contact: faker.internet.email(),
      phone_contact: faker.phone.number('+61 4## ### ###'),
      address_area: `${faker.location.streetAddress()}, ${faker.location.city()} ${faker.location.state()}`,
      comments: faker.lorem.paragraph(),
      test_purpose: faker.helpers.arrayElement(['peace_of_mind', 'legal_proceedings', 'immigration']),
      sample_type: faker.helpers.arrayElement(['buccal_swab', 'blood', 'saliva']),
      authorized_collector: faker.person.fullName(),
      consent_type: clientType === 'lt' ? 'legal' : 'paternity',
      has_signatures: 'YES',
      has_witness: faker.helpers.arrayElement(['YES', 'NO']),
      witness_name: faker.person.fullName()
    };
    
    try {
      // Insert directly with raw SQL to avoid prepared statement issues
      dbService.db.prepare(`
        INSERT OR IGNORE INTO test_cases (
          case_number, ref_kit_number, submission_date, client_type, mother_present,
          email_contact, phone_contact, address_area, comments, test_purpose,
          sample_type, authorized_collector, consent_type, has_signatures,
          has_witness, witness_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        testCase.case_number, testCase.ref_kit_number, testCase.submission_date,
        testCase.client_type, testCase.mother_present, testCase.email_contact,
        testCase.phone_contact, testCase.address_area, testCase.comments,
        testCase.test_purpose, testCase.sample_type, testCase.authorized_collector,
        testCase.consent_type, testCase.has_signatures, testCase.has_witness,
        testCase.witness_name
      );
      
      testCases.push(testCase);
    } catch (error) {
      console.log(`    Error creating test case ${caseNumber}: ${error.message}`);
    }
  }
  
  console.log(`  ✅ Created ${testCases.length} test cases`);
  return testCases;
}

/**
 * Seed basic samples
 */
async function seedBasicSamples(testCases) {
  console.log('  Creating samples...');
  const samples = [];
  let sampleIndex = 0;
  
  for (const testCase of testCases.slice(0, 30)) { // Only use first 30 test cases
    // Get the case ID
    const caseRow = dbService.db.prepare('SELECT id FROM test_cases WHERE case_number = ?').get(testCase.case_number);
    if (!caseRow) continue;
    
    const familyMembers = [
      { relation: 'Child', gender: 'M', age: faker.number.int({ min: 0, max: 17 }) },
      { relation: 'Alleged Father', gender: 'M', age: faker.number.int({ min: 18, max: 65 }) }
    ];
    
    if (testCase.mother_present === 'YES') {
      familyMembers.push({ relation: 'Mother', gender: 'F', age: faker.number.int({ min: 18, max: 55 }) });
    }
    
    for (const member of familyMembers) {
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - member.age);
      
      const labNumber = `25_${(sampleIndex + 1).toString().padStart(3, '0')}`;
      
      try {
        dbService.db.prepare(`
          INSERT OR IGNORE INTO samples (
            case_id, lab_number, name, surname, date_of_birth,
            place_of_birth, nationality, occupation, address, phone_number,
            email, collection_date, submission_date, relation, gender, age,
            sample_type, status, workflow_status, case_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          caseRow.id,
          labNumber,
          faker.person.firstName(member.gender.toLowerCase()),
          faker.person.lastName(),
          dateOfBirth.toISOString().split('T')[0],
          faker.location.city(),
          faker.helpers.arrayElement(['Australian', 'British', 'Chinese', 'Other']),
          member.age < 18 ? 'Student' : faker.person.jobTitle(),
          testCase.address_area,
          testCase.phone_contact,
          testCase.email_contact,
          testCase.submission_date,
          testCase.submission_date,
          member.relation,
          member.gender,
          member.age,
          testCase.sample_type,
          'active',
          faker.helpers.arrayElement(['sample_collected', 'pcr_ready', 'pcr_batched', 'pcr_completed']),
          testCase.case_number
        );
        
        samples.push({ labNumber, relation: member.relation, caseNumber: testCase.case_number });
        sampleIndex++;
      } catch (error) {
        console.log(`    Error creating sample ${labNumber}: ${error.message}`);
      }
    }
  }
  
  console.log(`  ✅ Created ${samples.length} samples`);
  return samples;
}

/**
 * Seed basic batches
 */
async function seedBasicBatches() {
  console.log('  Creating batches...');
  const batches = [];
  
  for (let i = 0; i < 15; i++) {
    const batchNumber = `LDS_${(i + 1).toString().padStart(3, '0')}`;
    const operator = faker.person.fullName();
    const pcrDate = faker.date.past({ months: 3 }).toISOString().split('T')[0];
    
    try {
      dbService.db.prepare(`
        INSERT OR IGNORE INTO batches (
          batch_number, operator, pcr_date, settings, total_samples, status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        batchNumber,
        operator,
        pcrDate,
        '27cycles30minExt',
        faker.number.int({ min: 16, max: 48 }),
        faker.helpers.arrayElement(['active', 'completed'])
      );
      
      batches.push({ batchNumber, operator, pcrDate });
    } catch (error) {
      console.log(`    Error creating batch ${batchNumber}: ${error.message}`);
    }
  }
  
  console.log(`  ✅ Created ${batches.length} batches`);
  return batches;
}

/**
 * Create some genetic analysis results
 */
async function seedAnalysisResults(samples) {
  console.log('  Creating analysis results...');
  const results = [];
  
  // Group samples by case
  const samplesByCase = {};
  samples.forEach(sample => {
    if (!samplesByCase[sample.caseNumber]) {
      samplesByCase[sample.caseNumber] = [];
    }
    samplesByCase[sample.caseNumber].push(sample);
  });
  
  // Create results for first 10 cases
  const caseNumbers = Object.keys(samplesByCase).slice(0, 10);
  
  for (const caseNumber of caseNumbers) {
    const caseSamples = samplesByCase[caseNumber];
    const child = caseSamples.find(s => s.relation === 'Child');
    const father = caseSamples.find(s => s.relation === 'Alleged Father');
    
    if (child && father) {
      const conclusion = faker.helpers.arrayElement(['INCLUSION', 'EXCLUSION']);
      const paternity = conclusion === 'INCLUSION' ? 
        faker.number.float({ min: 99.0, max: 99.99, precision: 0.01 }) :
        faker.number.float({ min: 0.001, max: 1.0, precision: 0.001 });
      
      try {
        dbService.db.prepare(`
          INSERT OR IGNORE INTO genetic_analysis_results (
            case_id, paternity_probability, exclusion_probability, matching_loci,
            total_loci, conclusion, quality_score, osiris_compliant, 
            software_version, analysis_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          caseNumber,
          paternity,
          100 - paternity,
          faker.number.int({ min: 10, max: 16 }),
          16,
          conclusion,
          faker.number.float({ min: 75.0, max: 99.0, precision: 0.1 }),
          1,
          '2.16',
          faker.date.past({ months: 2 }).toISOString().split('T')[0]
        );
        
        results.push({ caseNumber, conclusion, paternity });
      } catch (error) {
        console.log(`    Error creating analysis result for ${caseNumber}: ${error.message}`);
      }
    }
  }
  
  console.log(`  ✅ Created ${results.length} analysis results`);
  return results;
}

/**
 * Create some equipment records
 */
async function seedEquipment() {
  console.log('  Creating equipment...');
  const equipment = [];
  
  const equipmentTypes = [
    'PCR Thermal Cycler', 'Genetic Analyzer', 'Centrifuge', 'Incubator', 
    'Freezer -20C', 'Spectrophotometer', 'Pipettes', 'Balance'
  ];
  
  for (let i = 0; i < equipmentTypes.length; i++) {
    const equipmentId = `EQ${(i + 1).toString().padStart(3, '0')}`;
    const lastCalibration = faker.date.past({ years: 1 });
    const nextCalibration = new Date(lastCalibration);
    nextCalibration.setMonth(nextCalibration.getMonth() + 6);
    
    try {
      dbService.db.prepare(`
        INSERT OR IGNORE INTO equipment (
          equipment_id, type, status, last_calibration, next_calibration
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        equipmentId,
        equipmentTypes[i],
        faker.helpers.arrayElement(['active', 'maintenance']),
        lastCalibration.toISOString().split('T')[0],
        nextCalibration.toISOString().split('T')[0]
      );
      
      equipment.push({ equipmentId, type: equipmentTypes[i] });
    } catch (error) {
      console.log(`    Error creating equipment ${equipmentId}: ${error.message}`);
    }
  }
  
  console.log(`  ✅ Created ${equipment.length} equipment records`);
  return equipment;
}

/**
 * Generate summary statistics
 */
async function generateSummary() {
  try {
    const summary = {
      'Test Cases': dbService.db.prepare('SELECT COUNT(*) as count FROM test_cases').get()?.count || 0,
      'Samples': dbService.db.prepare('SELECT COUNT(*) as count FROM samples').get()?.count || 0,
      'Batches': dbService.db.prepare('SELECT COUNT(*) as count FROM batches').get()?.count || 0,
      'Equipment': dbService.db.prepare('SELECT COUNT(*) as count FROM equipment').get()?.count || 0,
      'Analysis Results': dbService.db.prepare('SELECT COUNT(*) as count FROM genetic_analysis_results').get()?.count || 0,
      'Users': dbService.db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0
    };
    
    return summary;
  } catch (error) {
    console.log('Error generating summary:', error.message);
    return {};
  }
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  try {
    console.log('🔧 Initializing database connection...');
    dbService.ensureConnection();
    console.log('✅ Database connected successfully');
    
    // Seed data in order
    console.log('\n🧬 Seeding test cases...');
    const testCases = await seedBasicTestCases();
    
    console.log('\n🔬 Seeding samples...');
    const samples = await seedBasicSamples(testCases);
    
    console.log('\n🧪 Seeding batches...');
    const batches = await seedBasicBatches();
    
    console.log('\n📊 Seeding analysis results...');
    const results = await seedAnalysisResults(samples);
    
    console.log('\n⚙️ Seeding equipment...');
    const equipment = await seedEquipment();
    
    // Generate summary
    const summary = await generateSummary();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 SEEDING SUMMARY:');
    console.log('═'.repeat(50));
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`${key.padEnd(20)}: ${value.toString().padStart(6)}`);
    });
    console.log('═'.repeat(50));
    
    return summary;
    
  } catch (error) {
    console.error('\n❌ Database seeding failed:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then((summary) => {
      console.log('\n🎯 Simple database seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Simple database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };