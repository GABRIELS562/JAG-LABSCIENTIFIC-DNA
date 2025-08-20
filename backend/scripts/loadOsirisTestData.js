#!/usr/bin/env node
/**
 * Script to load OSIRIS test data into the database
 * Run: node backend/scripts/loadOsirisTestData.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Connect to the database
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

console.log('🔄 Loading OSIRIS test data...');

try {
  // Begin transaction
  db.exec('BEGIN TRANSACTION');

  // Check if samples table exists, if not create it
  db.exec(`
    CREATE TABLE IF NOT EXISTS samples (
      sample_id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      sample_type TEXT,
      kit_id INTEGER,
      case_id TEXT,
      status TEXT DEFAULT 'received',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if kits table exists, if not create it
  db.exec(`
    CREATE TABLE IF NOT EXISTS kits (
      kit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      kit_number TEXT UNIQUE,
      kit_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert test kits
  const insertKit = db.prepare(`
    INSERT OR IGNORE INTO kits (kit_number, kit_type)
    VALUES (?, ?)
  `);

  const kits = [
    ['PT001', 'PowerPlex_16'],
    ['PT002', 'PowerPlex_16'],
    ['PT003', 'PowerPlex_16']
  ];

  for (const kit of kits) {
    insertKit.run(...kit);
  }

  // Get kit IDs
  const getKitId = db.prepare('SELECT kit_id FROM kits WHERE kit_number = ?');
  
  // Insert test samples
  const insertSample = db.prepare(`
    INSERT OR IGNORE INTO samples (barcode, sample_type, kit_id, case_id, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const samples = [
    // PT001 case
    ['PT001_Father_001', 'father', getKitId.get('PT001').kit_id, 'PT001', 'collected'],
    ['PT001_Mother_001', 'mother', getKitId.get('PT001').kit_id, 'PT001', 'collected'],
    ['PT001_Child_001', 'child', getKitId.get('PT001').kit_id, 'PT001', 'collected'],
    // PT002 case
    ['PT002_Father_001', 'father', getKitId.get('PT002').kit_id, 'PT002', 'collected'],
    ['PT002_Mother_001', 'mother', getKitId.get('PT002').kit_id, 'PT002', 'collected'],
    ['PT002_Child_001', 'child', getKitId.get('PT002').kit_id, 'PT002', 'collected'],
    // PT003 case
    ['PT003_Father_001', 'father', getKitId.get('PT003').kit_id, 'PT003', 'collected'],
    ['PT003_Mother_001', 'mother', getKitId.get('PT003').kit_id, 'PT003', 'collected'],
    ['PT003_Child_001', 'child', getKitId.get('PT003').kit_id, 'PT003', 'collected']
  ];

  for (const sample of samples) {
    insertSample.run(...sample);
  }

  // Get sample IDs
  const getSampleId = db.prepare('SELECT sample_id FROM samples WHERE barcode = ?');

  // Insert paternity cases
  const insertCase = db.prepare(`
    INSERT OR IGNORE INTO paternity_cases (
      case_id, father_sample_id, mother_sample_id, child_sample_id, case_type, status
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const cases = [
    [
      'PT001',
      getSampleId.get('PT001_Father_001').sample_id,
      getSampleId.get('PT001_Mother_001').sample_id,
      getSampleId.get('PT001_Child_001').sample_id,
      'trio',
      'active'
    ],
    [
      'PT002',
      getSampleId.get('PT002_Father_001').sample_id,
      getSampleId.get('PT002_Mother_001').sample_id,
      getSampleId.get('PT002_Child_001').sample_id,
      'trio',
      'active'
    ],
    [
      'PT003',
      getSampleId.get('PT003_Father_001').sample_id,
      getSampleId.get('PT003_Mother_001').sample_id,
      getSampleId.get('PT003_Child_001').sample_id,
      'trio',
      'active'
    ]
  ];

  for (const testCase of cases) {
    insertCase.run(...testCase);
  }

  // Add FSA files to OSIRIS queue
  const insertQueue = db.prepare(`
    INSERT OR IGNORE INTO osiris_queue (
      batch_id, sample_id, fsa_file_path, priority, status
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const fsaDir = path.join(__dirname, '..', 'sample-data', 'fsa-files');
  const fsaFiles = fs.readdirSync(fsaDir).filter(f => f.endsWith('.fsa'));

  for (const file of fsaFiles) {
    // Extract sample info from filename
    const match = file.match(/(PT\d{3})_(Father|Mother|Child)_\d{3}\.fsa/);
    if (match) {
      const [, caseId, sampleType] = match;
      const barcode = file.replace('.fsa', '');
      const sample = getSampleId.get(barcode);
      
      if (sample) {
        insertQueue.run(
          caseId,
          sample.sample_id,
          path.join(fsaDir, file),
          5,
          'pending'
        );
      }
    }
  }

  // Insert some mock analysis results for demonstration
  const insertAnalysis = db.prepare(`
    INSERT INTO str_analysis (
      sample_id, kit_id, fsa_file_path, osiris_version, status, quality_score
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertGenotype = db.prepare(`
    INSERT INTO genotypes (
      analysis_id, locus_name, allele_1, allele_2, rfu_1, rfu_2, quality_flag
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Add one completed analysis for demonstration
  const demoSample = getSampleId.get('PT001_Father_001');
  if (demoSample) {
    insertAnalysis.run(
      demoSample.sample_id,
      getKitId.get('PT001').kit_id,
      path.join(fsaDir, 'PT001_Father_001.fsa'),
      '2.16',
      'completed',
      0.95
    );

    const analysisId = db.prepare('SELECT last_insert_rowid() as id').get().id;

    // Insert some genotypes
    const demoGenotypes = [
      [analysisId, 'AMEL', 'X', 'Y', 3245, 3156, 'PASS'],
      [analysisId, 'CSF1PO', '10', '11', 2567, 2489, 'PASS'],
      [analysisId, 'D13S317', '12', '13', 1876, 1923, 'PASS'],
      [analysisId, 'D16S539', '9', '13', 2234, 2345, 'PASS'],
      [analysisId, 'D18S51', '14', '16', 1567, 1623, 'PASS'],
      [analysisId, 'D21S11', '29', '29', 2134, 2089, 'PASS'],
      [analysisId, 'D3S1358', '16', '17', 1789, 1823, 'PASS'],
      [analysisId, 'D5S818', '8', '10', 2456, 2512, 'PASS'],
      [analysisId, 'D7S820', '8', '11', 1923, 1876, 'PASS'],
      [analysisId, 'D8S1179', '13', '15', 2234, 2298, 'PASS'],
      [analysisId, 'FGA', '21', '24', 1456, 1523, 'PASS'],
      [analysisId, 'TH01', '7', '9', 2678, 2734, 'PASS'],
      [analysisId, 'TPOX', '8', '12', 3123, 3056, 'PASS'],
      [analysisId, 'vWA', '17', '18', 1987, 2045, 'PASS']
    ];

    for (const genotype of demoGenotypes) {
      insertGenotype.run(...genotype);
    }
  }

  // Commit transaction
  db.exec('COMMIT');
  
  console.log('✅ OSIRIS test data loaded successfully!');
  console.log('📊 Data loaded:');
  console.log(`   - ${kits.length} test kits`);
  console.log(`   - ${samples.length} test samples`);
  console.log(`   - ${cases.length} paternity cases`);
  console.log(`   - ${fsaFiles.filter(f => f.match(/PT\d{3}_(Father|Mother|Child)_\d{3}\.fsa/)).length} FSA files queued`);
  console.log('   - 1 completed analysis with genotypes (demonstration)');

} catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('❌ Data loading failed:', error.message);
  process.exit(1);
} finally {
  // Close database connection
  db.close();
}

console.log('🎉 OSIRIS test data loaded successfully!');
console.log('📍 You can now:');
console.log('   1. Navigate to /osiris-analysis to view the OSIRIS interface');
console.log('   2. Process the queued FSA files');
console.log('   3. View analysis results');
console.log('   4. Generate paternity test reports');