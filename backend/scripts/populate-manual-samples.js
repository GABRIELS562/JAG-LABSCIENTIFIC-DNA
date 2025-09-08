#!/usr/bin/env node

/**
 * Populate Manual Samples for LIMS Demo
 * Creates realistic dummy samples distributed across all workflow stages
 * Shows complete workflow from sample collection to report generation
 */

const Database = require('better-sqlite3');
const path = require('path');
const { faker } = require('@faker-js/faker');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

// Sample distribution across workflow stages
const SAMPLE_DISTRIBUTION = {
  'sample_collected': 15,    // Fresh samples awaiting extraction
  'extraction_ready': 12,     // Ready for DNA extraction
  'extraction_batched': 10,   // In DNA extraction batch
  'extraction_completed': 8,  // DNA extraction complete
  'qpcr_ready': 10,          // Ready for qPCR quantification
  'qpcr_batched': 8,         // In qPCR batch
  'qpcr_completed': 6,       // qPCR complete
  'pcr_ready': 12,           // Ready for PCR amplification
  'pcr_batched': 10,         // In PCR batch (JDS_XXX)
  'pcr_completed': 8,        // PCR amplification complete
  'electro_ready': 10,       // Ready for electrophoresis
  'electro_batched': 8,      // In electrophoresis batch
  'electro_completed': 6,    // Electrophoresis complete
  'analysis_ready': 8,       // Ready for analysis
  'analysis_in_progress': 6, // Analysis in progress
  'analysis_completed': 10,  // Analysis complete
  'report_ready': 8,         // Report being prepared
  'report_sent': 15          // Reports sent to clients
};

// Batch information
const BATCHES = {
  extraction: [],
  qpcr: [],
  pcr: [],
  electrophoresis: []
};

/**
 * Clear existing manual samples (non-AUTO samples)
 */
function clearManualSamples() {
  console.log('🧹 Clearing existing manual samples...');
  
  try {
    // Delete only non-AUTO samples
    const result = db.prepare("DELETE FROM samples WHERE lab_number NOT LIKE 'AUTO-%'").run();
    console.log(`✅ Cleared ${result.changes} manual samples`);
    
    // Clear related batches
    db.prepare("DELETE FROM batches").run();
    db.prepare("DELETE FROM extraction_batches").run();
    db.prepare("DELETE FROM qpcr_batches").run();
    console.log('✅ Cleared all batch records');
  } catch (error) {
    console.error('Error clearing samples:', error);
  }
}

/**
 * Create extraction batches
 */
function createExtractionBatches() {
  console.log('\n🧪 Creating DNA Extraction Batches...');
  
  for (let i = 1; i <= 3; i++) {
    const batchNumber = `EXT-2025-${String(i).padStart(3, '0')}`;
    const batch = {
      batch_number: batchNumber,
      operator: faker.person.fullName(),
      extraction_date: faker.date.recent({ days: 5 }).toISOString().split('T')[0],
      extraction_method: faker.helpers.arrayElement(['Silica Column', 'Magnetic Beads', 'Organic Extraction']),
      kit_lot_number: `LOT-${faker.string.alphanumeric(8).toUpperCase()}`,
      kit_expiry_date: faker.date.future({ years: 1 }).toISOString().split('T')[0],
      total_samples: 0,
      status: i === 3 ? 'in_progress' : 'completed',
      quality_control_passed: i !== 3,
      notes: faker.lorem.sentence()
    };
    
    try {
      const stmt = db.prepare(`
        INSERT INTO extraction_batches (
          batch_number, operator, extraction_date, extraction_method,
          kit_lot_number, kit_expiry_date, total_samples, status,
          quality_control_passed, notes, created_at, updated_at
        ) VALUES (
          @batch_number, @operator, @extraction_date, @extraction_method,
          @kit_lot_number, @kit_expiry_date, @total_samples, @status,
          @quality_control_passed, @notes, datetime('now'), datetime('now')
        )
      `);
      
      const result = stmt.run(batch);
      BATCHES.extraction.push({ id: result.lastInsertRowid, ...batch });
      console.log(`  ✅ Created extraction batch: ${batchNumber}`);
    } catch (error) {
      console.error(`  ❌ Error creating extraction batch:`, error.message);
    }
  }
}

/**
 * Create qPCR batches
 */
function createQPCRBatches() {
  console.log('\n🔬 Creating qPCR Batches...');
  
  for (let i = 1; i <= 2; i++) {
    const batchNumber = `QPCR-2025-${String(i).padStart(3, '0')}`;
    const batch = {
      batch_number: batchNumber,
      operator: faker.person.fullName(),
      run_date: faker.date.recent({ days: 3 }).toISOString().split('T')[0],
      instrument: faker.helpers.arrayElement(['QuantStudio 5', 'CFX96', 'StepOnePlus']),
      total_samples: 0,
      status: i === 2 ? 'in_progress' : 'completed',
      notes: 'Quantification for paternity testing'
    };
    
    try {
      const stmt = db.prepare(`
        INSERT INTO qpcr_batches (
          batch_number, operator, run_date, instrument,
          total_samples, status, notes, created_at, updated_at
        ) VALUES (
          @batch_number, @operator, @run_date, @instrument,
          @total_samples, @status, @notes, datetime('now'), datetime('now')
        )
      `);
      
      const result = stmt.run(batch);
      BATCHES.qpcr.push({ id: result.lastInsertRowid, ...batch });
      console.log(`  ✅ Created qPCR batch: ${batchNumber}`);
    } catch (error) {
      console.error(`  ❌ Error creating qPCR batch:`, error.message);
    }
  }
}

/**
 * Create PCR batches
 */
function createPCRBatches() {
  console.log('\n⚗️ Creating PCR Amplification Batches...');
  
  for (let i = 1; i <= 3; i++) {
    const batchNumber = `JDS_${String(1000 + i)}`;
    const batch = {
      batch_number: batchNumber,
      operator: faker.person.fullName(),
      pcr_date: faker.date.recent({ days: 2 }).toISOString().split('T')[0],
      total_samples: 0,
      status: i === 3 ? 'in_progress' : 'completed'
    };
    
    try {
      const stmt = db.prepare(`
        INSERT INTO batches (
          batch_number, operator, pcr_date, total_samples, status,
          created_at, updated_at
        ) VALUES (
          @batch_number, @operator, @pcr_date, @total_samples, @status,
          datetime('now'), datetime('now')
        )
      `);
      
      const result = stmt.run(batch);
      BATCHES.pcr.push({ id: result.lastInsertRowid, ...batch });
      console.log(`  ✅ Created PCR batch: ${batchNumber}`);
    } catch (error) {
      console.error(`  ❌ Error creating PCR batch:`, error.message);
    }
  }
}

/**
 * Create electrophoresis batches
 */
function createElectroBatches() {
  console.log('\n⚡ Creating Electrophoresis Batches...');
  
  for (let i = 1; i <= 2; i++) {
    const batchNumber = `ELEC_${String(2000 + i)}`;
    const batch = {
      batch_number: batchNumber,
      operator: faker.person.fullName(),
      electro_date: faker.date.recent({ days: 1 }).toISOString().split('T')[0],
      total_samples: 0,
      status: i === 2 ? 'in_progress' : 'completed'
    };
    
    try {
      const stmt = db.prepare(`
        INSERT INTO batches (
          batch_number, operator, electro_date, total_samples, status,
          created_at, updated_at
        ) VALUES (
          @batch_number, @operator, @electro_date, @total_samples, @status,
          datetime('now'), datetime('now')
        )
      `);
      
      const result = stmt.run(batch);
      BATCHES.electrophoresis.push({ id: result.lastInsertRowid, ...batch });
      console.log(`  ✅ Created electrophoresis batch: ${batchNumber}`);
    } catch (error) {
      console.error(`  ❌ Error creating electrophoresis batch:`, error.message);
    }
  }
}

/**
 * Generate a realistic case with family members
 */
function generateCase(caseNumber) {
  const familyName = faker.person.lastName();
  const motherFirstName = faker.person.firstName('female');
  const fatherFirstName = faker.person.firstName('male');
  const childFirstName = faker.person.firstName();
  
  return {
    caseNumber: `PAT-2025-${String(caseNumber).padStart(4, '0')}`,
    members: [
      {
        name: fatherFirstName,
        surname: familyName,
        relation: 'Father',
        sample_type: 'Alleged Father',
        phone_number: faker.phone.number()
      },
      {
        name: motherFirstName,
        surname: familyName,
        relation: 'Mother',
        sample_type: 'Mother',
        phone_number: faker.phone.number()
      },
      {
        name: childFirstName,
        surname: familyName,
        relation: 'Child',
        sample_type: 'Child',
        phone_number: faker.phone.number()
      }
    ]
  };
}

/**
 * Create manual samples with realistic distribution
 */
function createManualSamples() {
  console.log('\n👨‍👩‍👧 Creating Manual Samples...');
  
  let labNumberCounter = 1;
  let caseCounter = 1;
  const stages = Object.keys(SAMPLE_DISTRIBUTION);
  
  // Create cases first
  const cases = [];
  const totalFamilies = Math.ceil(Object.values(SAMPLE_DISTRIBUTION).reduce((a, b) => a + b, 0) / 3);
  
  for (let i = 0; i < totalFamilies; i++) {
    cases.push(generateCase(caseCounter++));
  }
  
  // Distribute samples across stages
  let caseIndex = 0;
  let memberIndex = 0;
  
  for (const [stage, count] of Object.entries(SAMPLE_DISTRIBUTION)) {
    console.log(`\n  📋 Creating ${count} samples in ${stage} stage...`);
    
    for (let i = 0; i < count; i++) {
      const currentCase = cases[caseIndex];
      const member = currentCase.members[memberIndex];
      
      const labNumber = `LAB-2025-${String(labNumberCounter++).padStart(5, '0')}`;
      const collectionDate = faker.date.recent({ days: stage.includes('report') ? 10 : 5 });
      
      // Determine batch assignment based on stage
      let batchId = null;
      let extractionId = null;
      let qpcrId = null;
      
      if (stage.includes('extraction_batched')) {
        extractionId = faker.helpers.arrayElement(BATCHES.extraction).id;
      } else if (stage.includes('qpcr_batched')) {
        qpcrId = faker.helpers.arrayElement(BATCHES.qpcr).id;
      } else if (stage.includes('pcr_batched')) {
        batchId = faker.helpers.arrayElement(BATCHES.pcr).id;
      } else if (stage.includes('electro_batched')) {
        batchId = faker.helpers.arrayElement(BATCHES.electrophoresis).id;
      }
      
      const sample = {
        lab_number: labNumber,
        case_number: currentCase.caseNumber,
        name: member.name,
        surname: member.surname,
        relation: member.relation,
        sample_type: member.sample_type,
        phone_number: member.phone_number,
        collection_date: collectionDate.toISOString().split('T')[0],
        workflow_status: stage,
        notes: stage.includes('report') ? 'Report generated and sent to client' : null,
        created_at: collectionDate.toISOString(),
        updated_at: new Date().toISOString()
      };
      
      try {
        const stmt = db.prepare(`
          INSERT INTO samples (
            lab_number, case_number, name, surname, relation, sample_type,
            phone_number, collection_date, workflow_status, notes,
            created_at, updated_at
          ) VALUES (
            @lab_number, @case_number, @name, @surname, @relation, @sample_type,
            @phone_number, @collection_date, @workflow_status, @notes,
            @created_at, @updated_at
          )
        `);
        
        stmt.run(sample);
        console.log(`    ✅ ${labNumber}: ${member.name} ${member.surname} (${member.relation})`);
      } catch (error) {
        console.error(`    ❌ Error creating sample:`, error.message);
      }
      
      // Move to next family member or case
      memberIndex++;
      if (memberIndex >= currentCase.members.length) {
        memberIndex = 0;
        caseIndex++;
        if (caseIndex >= cases.length) {
          caseIndex = 0; // Loop back if needed
        }
      }
    }
  }
}

/**
 * Update batch counts
 */
function updateBatchCounts() {
  console.log('\n📊 Updating Batch Sample Counts...');
  
  // Update extraction batch counts
  for (const batch of BATCHES.extraction) {
    const count = db.prepare(
      "SELECT COUNT(*) as count FROM samples WHERE workflow_status LIKE 'extraction_%'"
    ).get();
    
    db.prepare(
      "UPDATE extraction_batches SET total_samples = ? WHERE id = ?"
    ).run(Math.floor(count.count / BATCHES.extraction.length), batch.id);
  }
  
  // Update qPCR batch counts
  for (const batch of BATCHES.qpcr) {
    const count = db.prepare(
      "SELECT COUNT(*) as count FROM samples WHERE workflow_status LIKE 'qpcr_%'"
    ).get();
    
    db.prepare(
      "UPDATE qpcr_batches SET total_samples = ? WHERE id = ?"
    ).run(Math.floor(count.count / BATCHES.qpcr.length), batch.id);
  }
  
  // Update PCR batch counts
  for (const batch of BATCHES.pcr) {
    const count = db.prepare(
      "SELECT COUNT(*) as count FROM samples WHERE workflow_status LIKE 'pcr_%'"
    ).get();
    
    db.prepare(
      "UPDATE batches SET total_samples = ? WHERE batch_number LIKE 'JDS_%' AND id = ?"
    ).run(Math.floor(count.count / BATCHES.pcr.length), batch.id);
  }
  
  // Update electrophoresis batch counts
  for (const batch of BATCHES.electrophoresis) {
    const count = db.prepare(
      "SELECT COUNT(*) as count FROM samples WHERE workflow_status LIKE 'electro_%'"
    ).get();
    
    db.prepare(
      "UPDATE batches SET total_samples = ? WHERE batch_number LIKE 'ELEC_%' AND id = ?"
    ).run(Math.floor(count.count / BATCHES.electrophoresis.length), batch.id);
  }
  
  console.log('✅ Batch counts updated');
}

/**
 * Display summary statistics
 */
function displaySummary() {
  console.log('\n📈 Database Population Summary:');
  console.log('═══════════════════════════════════════════');
  
  // Count samples by stage
  const stageCounts = db.prepare(`
    SELECT workflow_status, COUNT(*) as count 
    FROM samples 
    WHERE lab_number NOT LIKE 'AUTO-%'
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
        WHEN 'analysis_in_progress' THEN 15
        WHEN 'analysis_completed' THEN 16
        WHEN 'report_ready' THEN 17
        WHEN 'report_sent' THEN 18
        ELSE 99
      END
  `).all();
  
  console.log('\n🔬 Workflow Stage Distribution:');
  for (const stage of stageCounts) {
    const bar = '█'.repeat(Math.min(stage.count, 20));
    console.log(`  ${stage.workflow_status.padEnd(25)} ${bar} ${stage.count}`);
  }
  
  // Total counts
  const totalManual = db.prepare(
    "SELECT COUNT(*) as count FROM samples WHERE lab_number NOT LIKE 'AUTO-%'"
  ).get();
  
  const totalAuto = db.prepare(
    "SELECT COUNT(*) as count FROM samples WHERE lab_number LIKE 'AUTO-%'"
  ).get();
  
  console.log('\n📊 Sample Totals:');
  console.log(`  Manual Samples: ${totalManual.count}`);
  console.log(`  AUTO Samples:   ${totalAuto.count}`);
  console.log(`  Total Samples:  ${totalManual.count + totalAuto.count}`);
  
  // Batch counts
  const extractionBatches = db.prepare("SELECT COUNT(*) as count FROM extraction_batches").get();
  const qpcrBatches = db.prepare("SELECT COUNT(*) as count FROM qpcr_batches").get();
  const pcrBatches = db.prepare("SELECT COUNT(*) as count FROM batches WHERE batch_number LIKE 'JDS_%'").get();
  const electroBatches = db.prepare("SELECT COUNT(*) as count FROM batches WHERE batch_number LIKE 'ELEC_%'").get();
  
  console.log('\n📦 Batch Counts:');
  console.log(`  Extraction Batches:     ${extractionBatches.count}`);
  console.log(`  qPCR Batches:          ${qpcrBatches.count}`);
  console.log(`  PCR Batches:           ${pcrBatches.count}`);
  console.log(`  Electrophoresis Batches: ${electroBatches.count}`);
  
  console.log('\n═══════════════════════════════════════════');
  console.log('✅ Manual sample population complete!');
  console.log('🎯 Ready for DevOps showcase demonstration');
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Populating Manual Samples for LIMS Demo');
  console.log('═══════════════════════════════════════════');
  
  try {
    // Clear existing manual samples
    clearManualSamples();
    
    // Create batches
    createExtractionBatches();
    createQPCRBatches();
    createPCRBatches();
    createElectroBatches();
    
    // Create samples
    createManualSamples();
    
    // Update batch counts
    updateBatchCounts();
    
    // Display summary
    displaySummary();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    db.close();
  }
}

// Run the script
main();