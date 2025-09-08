-- Migration to add extraction and qPCR workflow stages

-- First, create a backup of the samples table
CREATE TABLE samples_backup AS SELECT * FROM samples;

-- Drop the old table
DROP TABLE samples;

-- Recreate with updated constraint including extraction and qPCR stages
CREATE TABLE samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    lab_number TEXT NOT NULL UNIQUE,
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
    sample_type TEXT,
    collection_time TIME,
    collection_location TEXT,
    collector_name TEXT,
    collector_notes TEXT,
    case_number TEXT,
    workflow_status TEXT DEFAULT 'sample_collected' CHECK (workflow_status IN (
        'sample_collected', 
        'extraction_ready', 
        'extraction_in_progress', 
        'extraction_completed',
        'qpcr_ready',
        'qpcr_in_progress', 
        'qpcr_completed',
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Copy data back from backup
INSERT INTO samples SELECT * FROM samples_backup;

-- Drop backup table
DROP TABLE samples_backup;

-- Recreate indexes
CREATE INDEX idx_samples_workflow_status ON samples(workflow_status);
CREATE INDEX idx_samples_workflow ON samples(workflow_status);
CREATE INDEX idx_samples_case_id ON samples(case_id);
CREATE INDEX idx_samples_lab_number ON samples(lab_number);