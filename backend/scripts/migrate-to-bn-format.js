const Database = require('better-sqlite3');
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const db = new Database(dbPath);

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  // 1. Get all test cases and create BN numbers for them
  const testCases = db.prepare('SELECT * FROM test_cases ORDER BY created_at ASC').all();
  let bnCounter = 1;
  const caseToKitMap = {};

  // Create BN kit numbers for each case
  for (const testCase of testCases) {
    const kitNumber = `BN-${bnCounter.toString().padStart(4, '0')}`;
    caseToKitMap[testCase.id] = kitNumber;
    
    // Update the ref_kit_number in test_cases table
    db.prepare('UPDATE test_cases SET ref_kit_number = ? WHERE id = ?')
      .run(kitNumber, testCase.id);
    
    bnCounter++;
  }

  // 2. Update all samples with new lab numbers based on their kit and relation
  const samples = db.prepare(`
    SELECT s.*, tc.ref_kit_number 
    FROM samples s 
    LEFT JOIN test_cases tc ON s.case_id = tc.id 
    ORDER BY s.case_id, s.relation
  `).all();

  let migratedCount = 0;
  for (const sample of samples) {
    if (!sample.ref_kit_number) {
      continue;
    }

    // Determine suffix based on relation
    let suffix = '';
    switch(sample.relation?.toLowerCase()) {
      case 'child':
        suffix = 'C';
        break;
      case 'father':
        suffix = 'F';
        break;
      case 'mother':
        suffix = 'M';
        break;
      default:
        suffix = 'X'; // Unknown relation
        }

    const newLabNumber = `${sample.ref_kit_number}-${suffix}`;

    // Update the sample
    db.prepare('UPDATE samples SET lab_number = ? WHERE id = ?')
      .run(newLabNumber, sample.id);

    `);
    migratedCount++;
  }

  // 3. Create a sequence table to track the next BN number
  db.exec(`
    CREATE TABLE IF NOT EXISTS bn_sequence (
      id INTEGER PRIMARY KEY,
      next_bn_number INTEGER NOT NULL DEFAULT 1
    )
  `);

  // Initialize with next available number
  db.prepare(`
    INSERT OR REPLACE INTO bn_sequence (id, next_bn_number) 
    VALUES (1, ?)
  `).run(bnCounter);

  // 4. Update case_number format to prepare for LDS batching
  // For now, keep existing case numbers but mark them for future LDS conversion
  .padStart(4, '0')}`);

  // Commit transaction
  db.exec('COMMIT');
  } catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error);
  throw error;
} finally {
  db.close();
}