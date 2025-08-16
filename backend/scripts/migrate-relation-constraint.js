const Database = require('better-sqlite3');
const path = require('path');

async function migrateRelationConstraint() {
  const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
  const db = new Database(dbPath);
  
  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    // Create new samples table without relation CHECK constraint
    db.exec(`
      CREATE TABLE IF NOT EXISTS samples_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER,
        lab_number TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        id_dob TEXT,
        date_of_birth DATE,
        place_of_birth TEXT,
        nationality TEXT,
        occupation TEXT,
        address TEXT,
        phone_number TEXT,
        email TEXT,
        id_number TEXT,
        id_type TEXT,
        marital_status TEXT,
        ethnicity TEXT,
        collection_date DATE,
        submission_date DATE,
        relation TEXT NOT NULL,
        additional_notes TEXT,
        batch_id INTEGER,
        kit_batch_number TEXT,
        lab_batch_number TEXT,
        report_number TEXT,
        report_sent BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Copy all data from old table to new table
    db.exec(`
      INSERT INTO samples_new 
      SELECT * FROM samples
    `);
    
    // Drop the old table
    db.exec('DROP TABLE samples');
    
    // Rename new table to original name
    db.exec('ALTER TABLE samples_new RENAME TO samples');
    
    // Recreate indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_samples_name ON samples(name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_samples_surname ON samples(surname)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_samples_case_id ON samples(case_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_samples_collection_date ON samples(collection_date)');
    
    // Recreate trigger
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_samples_timestamp 
        AFTER UPDATE ON samples
        BEGIN
          UPDATE samples SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    `);
    
    // Commit transaction
    db.exec('COMMIT');
    
    } catch (error) {
    console.error('❌ Migration failed:', error);
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

// Run the migration
if (require.main === module) {
  migrateRelationConstraint().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateRelationConstraint };