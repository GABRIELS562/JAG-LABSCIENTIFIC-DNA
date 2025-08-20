const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = path.join(__dirname, '..', 'labdna.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('🔧 Setting up database tables...');

try {
  // Enable foreign keys
  db.prepare('PRAGMA foreign_keys = ON').run();

  // 1. Clients table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT UNIQUE NOT NULL,
      kit_number TEXT,
      collection_date DATE,
      alleged_father_name TEXT,
      mother_name TEXT,
      child_name TEXT,
      alleged_father_id TEXT,
      mother_id TEXT,
      child_id TEXT,
      alleged_father_phone TEXT,
      mother_phone TEXT,
      address TEXT,
      status TEXT DEFAULT 'registered',
      workflow_status TEXT DEFAULT 'registered',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 2. Samples table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lab_number TEXT UNIQUE NOT NULL,
      case_number TEXT,
      kit_number TEXT,
      name TEXT,
      surname TEXT,
      relation TEXT,
      sex TEXT,
      id_number TEXT,
      phone TEXT,
      email TEXT,
      sample_type TEXT,
      collection_date DATE,
      status TEXT DEFAULT 'active',
      priority TEXT DEFAULT 'normal',
      workflow_status TEXT DEFAULT 'registered',
      quality_score REAL,
      barcode TEXT,
      pcr_batch TEXT,
      electro_batch TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 3. Batches table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_number TEXT UNIQUE NOT NULL,
      batch_type TEXT,
      status TEXT DEFAULT 'pending',
      created_date DATETIME,
      operator TEXT,
      sample_count INTEGER DEFAULT 0,
      control_count INTEGER DEFAULT 0,
      notes TEXT,
      wells TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 4. STR Analysis table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS str_analysis (
      analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id TEXT,
      lab_number TEXT,
      case_number TEXT,
      fsa_file_path TEXT,
      osiris_version TEXT DEFAULT '2.16',
      analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      quality_score REAL,
      technician TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 5. Genotypes table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS genotypes (
      genotype_id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER,
      marker TEXT,
      allele1 TEXT,
      allele2 TEXT,
      peak_height1 INTEGER,
      peak_height2 INTEGER,
      quality TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES str_analysis(analysis_id)
    )
  `).run();

  // 6. Quality Control Metrics table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS qc_metrics (
      metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_number TEXT,
      metric_type TEXT,
      metric_value REAL,
      target_value REAL,
      lower_limit REAL,
      upper_limit REAL,
      status TEXT,
      measured_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      technician TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 7. Audit Trail table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT,
      entity_type TEXT,
      entity_id TEXT,
      user_name TEXT,
      action_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 8. Equipment Calibration table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS equipment_calibration (
      calibration_id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_name TEXT,
      equipment_id TEXT,
      calibration_date DATE,
      next_calibration DATE,
      performed_by TEXT,
      status TEXT,
      certificate_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 9. OSIRIS Queue table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS osiris_queue (
      queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER,
      sample_id TEXT,
      fsa_file_path TEXT,
      status TEXT DEFAULT 'pending',
      queued_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_date DATETIME,
      completed_date DATETIME,
      error_message TEXT,
      FOREIGN KEY (analysis_id) REFERENCES str_analysis(analysis_id)
    )
  `).run();

  // 10. Paternity Cases table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS paternity_cases (
      case_id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT UNIQUE,
      child_analysis_id INTEGER,
      father_analysis_id INTEGER,
      mother_analysis_id INTEGER,
      paternity_index REAL,
      probability_percentage REAL,
      conclusion TEXT,
      report_date DATETIME,
      reviewed_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 11. STR Markers table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS str_markers (
      marker_id INTEGER PRIMARY KEY AUTOINCREMENT,
      marker_name TEXT UNIQUE,
      chromosome TEXT,
      repeat_unit TEXT,
      min_allele INTEGER,
      max_allele INTEGER,
      kit_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 12. Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      email TEXT,
      role TEXT DEFAULT 'technician',
      status TEXT DEFAULT 'active',
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 13. Reports table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number TEXT,
      report_type TEXT,
      file_path TEXT,
      generated_by TEXT,
      generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'draft',
      reviewed_by TEXT,
      review_date DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create indexes for better performance
  db.prepare('CREATE INDEX IF NOT EXISTS idx_samples_case ON samples(case_number)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_samples_workflow ON samples(workflow_status)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_str_analysis_sample ON str_analysis(sample_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id)').run();

  console.log('✅ All database tables created successfully!');
  
  // List all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n📋 Created tables:');
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`   - ${table.name} (${count.count} records)`);
  });

} catch (error) {
  console.error('❌ Error setting up database:', error);
  throw error;
} finally {
  db.close();
}

console.log('\n🎉 Database setup completed!');