-- Ashley LIMS v2 SQLite Database Schema
-- Complete schema for Laboratory Information Management System

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- 1. Users Table (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('staff', 'client')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Test Cases Table (Groups related samples for paternity tests)
CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_number TEXT UNIQUE NOT NULL,
    ref_kit_number TEXT NOT NULL,
    submission_date DATE NOT NULL,
    client_type TEXT NOT NULL CHECK (client_type IN ('paternity', 'lt', 'urgent')),
    mother_present TEXT CHECK (mother_present IN ('YES', 'NO')),
    email_contact TEXT,
    phone_contact TEXT,
    address_area TEXT,
    comments TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Samples Table (Main data storage for all sample information)
CREATE TABLE IF NOT EXISTS samples (
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
    kit_batch_number TEXT,
    lab_batch_number TEXT,
    report_number TEXT,
    report_sent BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

-- 4. Batches Table (96-well plate batch management)
CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT UNIQUE NOT NULL,
    operator TEXT NOT NULL,
    pcr_date DATE,
    electro_date DATE,
    settings TEXT DEFAULT '27cycles30minExt',
    total_samples INTEGER DEFAULT 0,
    plate_layout TEXT, -- JSON string for full plate configuration
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Well Assignments Table (96-well plate layout details)
CREATE TABLE IF NOT EXISTS well_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    well_position TEXT NOT NULL, -- A01, B02, etc.
    sample_id INTEGER, -- NULL for blanks and controls
    well_type TEXT NOT NULL CHECK (well_type IN ('Sample', 'Blank', 'Allelic Ladder', 'Positive Control', 'Negative Control')),
    kit_number TEXT,
    sample_name TEXT,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE SET NULL,
    UNIQUE(batch_id, well_position)
);

-- 6. Quality Control Table
CREATE TABLE IF NOT EXISTS quality_control (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER,
    date DATE NOT NULL,
    control_type TEXT NOT NULL,
    result TEXT CHECK (result IN ('Passed', 'Failed')),
    operator TEXT NOT NULL,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

-- 7. Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    last_calibration DATE,
    next_calibration DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    batch_id INTEGER,
    report_number TEXT UNIQUE,
    report_type TEXT NOT NULL CHECK (report_type IN ('Batch Report', 'QC Summary', 'Paternity Report', 'Sample Report')),
    date_generated DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'sent')),
    file_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE SET NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

-- Indexes for fast searching and lookups
CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number);
CREATE INDEX IF NOT EXISTS idx_samples_name ON samples(name);
CREATE INDEX IF NOT EXISTS idx_samples_surname ON samples(surname);
CREATE INDEX IF NOT EXISTS idx_samples_case_id ON samples(case_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_collection_date ON samples(collection_date);

CREATE INDEX IF NOT EXISTS idx_test_cases_case_number ON test_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_submission_date ON test_cases(submission_date);

CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_operator ON batches(operator);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

CREATE INDEX IF NOT EXISTS idx_well_assignments_batch_id ON well_assignments(batch_id);
CREATE INDEX IF NOT EXISTS idx_well_assignments_sample_id ON well_assignments(sample_id);
CREATE INDEX IF NOT EXISTS idx_well_assignments_well_type ON well_assignments(well_type);

CREATE INDEX IF NOT EXISTS idx_quality_control_batch_id ON quality_control(batch_id);
CREATE INDEX IF NOT EXISTS idx_quality_control_date ON quality_control(date);

CREATE INDEX IF NOT EXISTS idx_equipment_equipment_id ON equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);

CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id);
CREATE INDEX IF NOT EXISTS idx_reports_batch_id ON reports(batch_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_samples_timestamp 
    AFTER UPDATE ON samples
    BEGIN
        UPDATE samples SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_test_cases_timestamp 
    AFTER UPDATE ON test_cases
    BEGIN
        UPDATE test_cases SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_batches_timestamp 
    AFTER UPDATE ON batches
    BEGIN
        UPDATE batches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_equipment_timestamp 
    AFTER UPDATE ON equipment
    BEGIN
        UPDATE equipment SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Insert default admin user (password: 'admin123' - change in production!)
INSERT OR IGNORE INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@labdna.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff');

-- Insert sample equipment data
INSERT OR IGNORE INTO equipment (equipment_id, type, last_calibration, next_calibration, status) VALUES
('PCR001', 'Thermocycler', '2024-06-01', '2024-12-01', 'active'),
('CENT001', 'Centrifuge', '2024-05-15', '2024-11-15', 'active'),
('PIP001', 'Pipette Set A', '2024-05-01', '2024-11-01', 'active'),
('ELEC001', 'Electrophoresis Unit', '2024-06-10', '2024-12-10', 'active');