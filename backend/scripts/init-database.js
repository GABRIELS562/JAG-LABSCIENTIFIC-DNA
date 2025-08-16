const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Create samples table
db.exec(`
  CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id TEXT UNIQUE,
    lab_number TEXT,
    name TEXT,
    surname TEXT,
    relation TEXT,
    case_number TEXT,
    ref_kit_number TEXT,
    kit_batch_number TEXT,
    collection_date DATE,
    workflow_status TEXT DEFAULT 'sample_collected',
    status TEXT DEFAULT 'pending',
    comments TEXT,
    notes TEXT,
    additional_notes TEXT,
    test_purpose TEXT,
    client_type TEXT,
    urgent INTEGER DEFAULT 0,
    phone_number TEXT,
    email TEXT,
    id_number TEXT,
    id_type TEXT,
    date_of_birth DATE,
    place_of_birth TEXT,
    nationality TEXT,
    address TEXT,
    ethnicity TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create batches table
db.exec(`
  CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('pcr', 'electrophoresis', 'rerun')),
    status TEXT DEFAULT 'processing' CHECK(status IN ('processing', 'completed', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    notes TEXT
  )
`);

// Create batch_samples junction table
db.exec(`
  CREATE TABLE IF NOT EXISTS batch_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT NOT NULL,
    sample_id TEXT NOT NULL,
    well_position TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_number) REFERENCES batches(batch_number),
    UNIQUE(batch_number, sample_id)
  )
`);

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'supervisor', 'staff', 'client')),
    full_name TEXT,
    active INTEGER DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create analysis table
db.exec(`
  CREATE TABLE IF NOT EXISTS analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id TEXT NOT NULL,
    analysis_type TEXT,
    status TEXT DEFAULT 'pending',
    str_profile TEXT,
    paternity_index REAL,
    probability_of_paternity REAL,
    conclusion TEXT,
    analyst_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (sample_id) REFERENCES samples(sample_id)
  )
`);

// Create reports table
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    case_number TEXT,
    report_type TEXT,
    status TEXT DEFAULT 'draft',
    file_path TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finalized_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_samples_workflow_status ON samples(workflow_status);
  CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON samples(sample_id);
  CREATE INDEX IF NOT EXISTS idx_samples_ref_kit_number ON samples(ref_kit_number);
  CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
  CREATE INDEX IF NOT EXISTS idx_batches_type ON batches(type);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Insert some test data
const stmt = db.prepare(`
  INSERT OR IGNORE INTO samples (
    sample_id, lab_number, name, surname, relation, 
    case_number, ref_kit_number, collection_date, 
    workflow_status, status, test_purpose, client_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const testSamples = [
  ['S001', '25_001', 'John', 'Doe', 'child', 'BN-001', 'BN-001', '2025-08-16', 'sample_collected', 'pending', 'peace_of_mind', 'paternity'],
  ['S002', '25_002', 'Jane', 'Doe', 'mother', 'BN-001', 'BN-001', '2025-08-16', 'sample_collected', 'pending', 'peace_of_mind', 'paternity'],
  ['S003', '25_003', 'Robert', 'Doe', 'alleged_father', 'BN-001', 'BN-001', '2025-08-16', 'sample_collected', 'pending', 'peace_of_mind', 'paternity'],
  ['S004', '25_004', 'Emily', 'Smith', 'child', 'BN-002', 'BN-002', '2025-08-15', 'sample_collected', 'pending', 'legal_proceedings', 'lt'],
  ['S005', '25_005', 'Sarah', 'Smith', 'mother', 'BN-002', 'BN-002', '2025-08-15', 'sample_collected', 'pending', 'legal_proceedings', 'lt'],
  ['S006', '25_006', 'Michael', 'Smith', 'alleged_father', 'BN-002', 'BN-002', '2025-08-15', 'sample_collected', 'pending', 'legal_proceedings', 'lt']
];

testSamples.forEach(sample => {
  stmt.run(...sample);
});

// Run the production user setup
const setupUsers = require('./setup-production-users');
setupUsers();

db.close();
