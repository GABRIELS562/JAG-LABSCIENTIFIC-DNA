#!/usr/bin/env node

/**
 * Continuous Sample Generator for DevOps Demo
 * Generates new paternity test samples at regular intervals
 * to showcase real-time workflow processing and monitoring
 */

const Database = require('better-sqlite3');
const path = require('path');
const { faker } = require('@faker-js/faker');

class ContinuousSampleGenerator {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/ashley_lims.db');
    this.db = null;
    this.interval = null;
    this.caseCounter = 100; // Start from case 100
    this.labCounter = 1000; // Start from lab number 1000
  }

  initialize() {
    console.log('🚀 Initializing Continuous Sample Generator');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    
    // Get current max values
    const maxCase = this.db.prepare(`
      SELECT MAX(CAST(SUBSTR(case_number, 10) AS INTEGER)) as max_case 
      FROM samples 
      WHERE case_number LIKE 'PAT-2025-%'
    `).get();
    
    const maxLab = this.db.prepare(`
      SELECT MAX(CAST(SUBSTR(lab_number, 9) AS INTEGER)) as max_lab 
      FROM samples 
      WHERE lab_number LIKE 'PAT-LAB-%'
    `).get();
    
    if (maxCase?.max_case) {
      this.caseCounter = maxCase.max_case + 1;
    }
    if (maxLab?.max_lab) {
      this.labCounter = maxLab.max_lab + 1;
    }
    
    console.log(`📊 Starting from Case: PAT-2025-${String(this.caseCounter).padStart(3, '0')}`);
    console.log(`🔬 Starting from Lab: PAT-LAB-${String(this.labCounter).padStart(3, '0')}`);
  }

  generateFamily() {
    const caseNumber = `PAT-2025-${String(this.caseCounter++).padStart(3, '0')}`;
    const familyName = faker.person.lastName();
    
    // Generate 3 samples per family (father, mother, child)
    const samples = [
      {
        lab_number: `PAT-LAB-${String(this.labCounter++).padStart(3, '0')}`,
        case_number: caseNumber,
        name: faker.person.firstName('male'),
        surname: familyName,
        relation: 'Father',
        id_number: faker.string.numeric(13),
        phone_number: faker.phone.number('###-###-####'),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        collection_date: new Date().toISOString().split('T')[0],
        submission_date: new Date().toISOString().split('T')[0],
        workflow_status: 'sample_collected',
        status: 'pending',
        gender: 'M',
        age: faker.number.int({ min: 25, max: 55 })
      },
      {
        lab_number: `PAT-LAB-${String(this.labCounter++).padStart(3, '0')}`,
        case_number: caseNumber,
        name: faker.person.firstName('female'),
        surname: familyName,
        relation: 'Mother',
        id_number: faker.string.numeric(13),
        phone_number: faker.phone.number('###-###-####'),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        collection_date: new Date().toISOString().split('T')[0],
        submission_date: new Date().toISOString().split('T')[0],
        workflow_status: 'sample_collected',
        status: 'pending',
        gender: 'F',
        age: faker.number.int({ min: 23, max: 50 })
      },
      {
        lab_number: `PAT-LAB-${String(this.labCounter++).padStart(3, '0')}`,
        case_number: caseNumber,
        name: faker.person.firstName(),
        surname: familyName,
        relation: 'Child',
        id_number: faker.string.numeric(13),
        phone_number: faker.phone.number('###-###-####'),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        collection_date: new Date().toISOString().split('T')[0],
        submission_date: new Date().toISOString().split('T')[0],
        workflow_status: 'sample_collected',
        status: 'pending',
        gender: faker.helpers.arrayElement(['M', 'F']),
        age: faker.number.int({ min: 1, max: 18 })
      }
    ];
    
    return { caseNumber, samples };
  }

  insertFamily(family) {
    const insertStmt = this.db.prepare(`
      INSERT INTO samples (
        lab_number, case_number, name, surname, relation,
        id_number, phone_number, email, address,
        collection_date, submission_date,
        workflow_status, status, gender, age,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `);
    
    const insertMany = this.db.transaction((samples) => {
      for (const sample of samples) {
        insertStmt.run(
          sample.lab_number, sample.case_number, sample.name, sample.surname, sample.relation,
          sample.id_number, sample.phone_number, sample.email, sample.address,
          sample.collection_date, sample.submission_date,
          sample.workflow_status, sample.status, sample.gender, sample.age
        );
      }
    });
    
    insertMany(family.samples);
    console.log(`✅ Generated family ${family.caseNumber}: ${family.samples.map(s => s.relation).join(', ')}`);
  }

  start(intervalSeconds = 30) {
    console.log(`⏰ Generating new family every ${intervalSeconds} seconds`);
    
    // Generate initial family
    const initialFamily = this.generateFamily();
    this.insertFamily(initialFamily);
    
    // Set up continuous generation
    this.interval = setInterval(() => {
      try {
        const family = this.generateFamily();
        this.insertFamily(family);
        
        // Show current stats
        const stats = this.db.prepare(`
          SELECT 
            COUNT(*) as total,
            COUNT(DISTINCT case_number) as families,
            workflow_status,
            COUNT(*) as count
          FROM samples
          WHERE case_number LIKE 'PAT-2025-%'
          GROUP BY workflow_status
        `).all();
        
        console.log(`📊 Current distribution:`, stats.map(s => `${s.workflow_status}: ${s.count}`).join(', '));
        
      } catch (error) {
        console.error('❌ Error generating family:', error.message);
      }
    }, intervalSeconds * 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 Sample generation stopped');
    }
    if (this.db) {
      this.db.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new ContinuousSampleGenerator();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down sample generator...');
    generator.stop();
    process.exit(0);
  });
  
  generator.initialize();
  
  // Start generating samples every 20 seconds for demo
  generator.start(20);
  
  console.log('🎯 Sample generator running. Press Ctrl+C to stop.');
}

module.exports = ContinuousSampleGenerator;