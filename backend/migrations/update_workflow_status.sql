-- Migration to add DNA extraction workflow statuses
-- SQLite doesn't support ALTER CHECK constraints directly, so we need to recreate the table

PRAGMA foreign_keys = OFF;

-- Create new samples table with updated workflow_status constraint
CREATE TABLE samples_new (
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
    id_type TEXT CHECK (id_type IN ('passport', 'nationalId', 'driversLicense')),
    marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    ethnicity TEXT,
    collection_date DATE,
    submission_date DATE,
    relation TEXT NOT NULL,
    additional_notes TEXT,
    batch_id INTEGER,
    extraction_id INTEGER, -- New field for extraction batch reference
    kit_batch_number TEXT,
    lab_batch_number TEXT,
    report_number TEXT,
    report_sent BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
    workflow_status TEXT DEFAULT 'sample_collected' CHECK (workflow_status IN (
        'sample_collected', 
        'extraction_ready', 
        'extraction_in_progress',
        'extraction_batched', 
        'extraction_completed', 
        'pcr_ready', 
        'pcr_batched', 
        'pcr_completed', 
        'electro_ready', 
        'electro_batched', 
        'electro_completed', 
        'analysis_ready', 
        'analysis_completed', 
        'report_ready', 
        'report_sent'
    )),
    case_number TEXT,
    gender TEXT CHECK (gender IN ('M', 'F')),
    age INTEGER,
    sample_type TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
    FOREIGN KEY (extraction_id) REFERENCES extraction_batches(id) ON DELETE SET NULL
);

-- Copy data from old table to new table
INSERT INTO samples_new (
    id, case_id, lab_number, name, surname, id_dob, date_of_birth, place_of_birth,
    nationality, occupation, address, phone_number, email, id_number, id_type,
    marital_status, ethnicity, collection_date, submission_date, relation,
    additional_notes, batch_id, kit_batch_number, lab_batch_number, report_number,
    report_sent, status, workflow_status, case_number, gender, age, sample_type,
    notes, created_at, updated_at
)
SELECT 
    id, case_id, lab_number, name, surname, id_dob, date_of_birth, place_of_birth,
    nationality, occupation, address, phone_number, email, id_number, id_type,
    marital_status, ethnicity, collection_date, submission_date, relation,
    additional_notes, batch_id, kit_batch_number, lab_batch_number, report_number,
    report_sent, status, workflow_status, case_number, gender, age, sample_type,
    notes, created_at, updated_at
FROM samples;

-- Drop the old table
DROP TABLE samples;

-- Rename new table to original name
ALTER TABLE samples_new RENAME TO samples;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number);
CREATE INDEX IF NOT EXISTS idx_samples_name ON samples(name);
CREATE INDEX IF NOT EXISTS idx_samples_surname ON samples(surname);
CREATE INDEX IF NOT EXISTS idx_samples_case_id ON samples(case_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_collection_date ON samples(collection_date);
CREATE INDEX IF NOT EXISTS idx_samples_workflow_status ON samples(workflow_status);
CREATE INDEX IF NOT EXISTS idx_samples_extraction_id ON samples(extraction_id);

-- Recreate the trigger
CREATE TRIGGER IF NOT EXISTS update_samples_timestamp 
    AFTER UPDATE ON samples
    BEGIN
        UPDATE samples SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

PRAGMA foreign_keys = ON;