#!/usr/bin/env node

/**
 * Setup exactly 50 paternity test samples in 5 batches
 * Each batch has 10 samples at different workflow stages
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

// Clear any existing PAT-2025 samples
console.log('Clearing existing paternity samples...');
const deleteResult = db.prepare("DELETE FROM samples WHERE case_number LIKE 'PAT-2025-%'").run();
console.log(`Deleted ${deleteResult.changes} existing samples`);

// Workflow stages for each batch (using valid workflow_status values)
const batchStages = [
  { batchId: 'COLLECT-BATCH-001', stage: 'sample_collected' },
  { batchId: 'PCR-BATCH-001', stage: 'pcr_batched' },
  { batchId: 'ELEC-BATCH-001', stage: 'electro_batched' },
  { batchId: 'ANALYSIS-BATCH-001', stage: 'analysis_ready' },
  { batchId: 'REPORT-BATCH-001', stage: 'report_ready' }
];

// Sample families (17 families to get ~50 samples with trios)
const families = [
  'Johnson', 'Smith', 'Williams', 'Brown', 'Davis',
  'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson',
  'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
  'Garcia', 'Rodriguez'
];

const insertStmt = db.prepare(`
  INSERT INTO samples (
    case_number, lab_number, name, surname, relation, 
    sample_type, workflow_status, status, is_real_data,
    collection_date, gender, age, notes, created_at,
    lab_batch_number
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
`);

let sampleCount = 0;
let batchIndex = 0;

// Create exactly 50 samples
for (let familyIndex = 0; familyIndex < families.length && sampleCount < 50; familyIndex++) {
  const familyName = families[familyIndex];
  const caseNumber = `PAT-2025-${String(familyIndex + 1).padStart(3, '0')}`;
  
  // Create trio for each family (Child, Mother, Father)
  const familyMembers = [
    { relation: 'Child', name: `Child`, gender: Math.random() > 0.5 ? 'M' : 'F', age: Math.floor(Math.random() * 17) + 1 },
    { relation: 'Mother', name: `Mother`, gender: 'F', age: Math.floor(Math.random() * 20) + 25 },
    { relation: 'Alleged Father', name: `Father`, gender: 'M', age: Math.floor(Math.random() * 20) + 28 }
  ];
  
  for (const member of familyMembers) {
    if (sampleCount >= 50) break;
    
    sampleCount++;
    const labNumber = `2025_${String(sampleCount).padStart(3, '0')}`;
    
    // Assign to batch (10 samples per batch)
    batchIndex = Math.floor((sampleCount - 1) / 10);
    if (batchIndex >= batchStages.length) batchIndex = batchStages.length - 1;
    
    const batch = batchStages[batchIndex];
    
    insertStmt.run(
      caseNumber,
      labNumber,
      `${member.name}-${familyName}`,
      familyName,
      member.relation,
      'buccal_swab',
      batch.stage,
      'processing', // Use valid status: pending, processing, or completed
      0, // is_real_data = false (demo data)
      new Date().toISOString(),
      member.gender,
      member.age,
      `Demo paternity sample - Batch ${batch.batchId}`,
      batch.batchId
    );
    
    console.log(`Created sample ${sampleCount}/50: ${labNumber} - ${member.relation} ${familyName} (${batch.stage})`);
  }
}

// Verify the samples
const verifyStmt = db.prepare(`
  SELECT 
    workflow_status,
    lab_batch_number,
    COUNT(*) as count
  FROM samples 
  WHERE case_number LIKE 'PAT-2025-%'
  GROUP BY workflow_status, lab_batch_number
  ORDER BY lab_batch_number
`);

const results = verifyStmt.all();
console.log('\n✅ Sample Distribution:');
console.log('================================');
results.forEach(r => {
  console.log(`${r.lab_batch_number}: ${r.count} samples in ${r.workflow_status}`);
});

const totalCount = db.prepare("SELECT COUNT(*) as count FROM samples WHERE case_number LIKE 'PAT-2025-%'").get();
console.log(`\nTotal samples created: ${totalCount.count}`);

db.close();
console.log('\n✅ Setup complete! 50 paternity samples are now cycling through the workflow.');