-- PostgreSQL Schema for JAG DNA Scientific LIMS
-- Migrated from SQLite schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Samples table (main entity)
CREATE TABLE IF NOT EXISTS samples (
    id SERIAL PRIMARY KEY,
    lab_number VARCHAR(50) UNIQUE NOT NULL,
    case_number VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    relation VARCHAR(50),
    collection_date DATE,
    workflow_status VARCHAR(50) DEFAULT 'sample_collected',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    -- Additional fields for comprehensive LIMS
    barcode VARCHAR(100),
    collection_method VARCHAR(50),
    sample_type VARCHAR(50) DEFAULT 'buccal_swab',
    priority VARCHAR(20) DEFAULT 'normal',
    chain_of_custody JSONB,
    metadata JSONB
);

-- Batches table for processing batches
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    batch_type VARCHAR(50) NOT NULL, -- 'pcr', 'electrophoresis', etc.
    status VARCHAR(20) DEFAULT 'pending',
    sample_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    metadata JSONB
);

-- Batch samples relationship
CREATE TABLE IF NOT EXISTS batch_samples (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
    sample_id INTEGER REFERENCES samples(id) ON DELETE CASCADE,
    position INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, sample_id)
);

-- Workflow status tracking
CREATE TABLE IF NOT EXISTS workflow_status (
    id SERIAL PRIMARY KEY,
    stage VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Results table for genetic analysis
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    sample_id INTEGER REFERENCES samples(id) ON DELETE CASCADE,
    loci_name VARCHAR(50) NOT NULL,
    allele_1 VARCHAR(20),
    allele_2 VARCHAR(20),
    peak_height_1 INTEGER,
    peak_height_2 INTEGER,
    quality_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'technician',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    metadata JSONB
);

-- Audit trail table
CREATE TABLE IF NOT EXISTS audit_trail (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number);
CREATE INDEX IF NOT EXISTS idx_samples_case_number ON samples(case_number);
CREATE INDEX IF NOT EXISTS idx_samples_workflow_status ON samples(workflow_status);
CREATE INDEX IF NOT EXISTS idx_samples_created_at ON samples(created_at);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_results_sample_id ON results(sample_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);

-- Create trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_samples_updated_at ON samples;
CREATE TRIGGER update_samples_updated_at
    BEFORE UPDATE ON samples
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_batches_updated_at ON batches;
CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert demo data for development
INSERT INTO samples (lab_number, name, surname, relation, case_number, workflow_status, collection_date, sample_type)
VALUES 
    ('DEV_001', 'Alice', 'Johnson', 'Child', 'CASE-2025-001', 'sample_collected', CURRENT_DATE, 'buccal_swab'),
    ('DEV_002', 'Bob', 'Johnson', 'Alleged Father', 'CASE-2025-001', 'dna_extraction', CURRENT_DATE, 'buccal_swab'),
    ('DEV_003', 'Carol', 'Johnson', 'Mother', 'CASE-2025-001', 'pcr_ready', CURRENT_DATE, 'buccal_swab'),
    ('DEV_004', 'David', 'Smith', 'Child', 'CASE-2025-002', 'analysis_completed', CURRENT_DATE - INTERVAL '1 day', 'buccal_swab'),
    ('DEV_005', 'Eva', 'Smith', 'Mother', 'CASE-2025-002', 'report_ready', CURRENT_DATE - INTERVAL '1 day', 'buccal_swab'),
    ('DEV_006', 'Frank', 'Brown', 'Alleged Father', 'CASE-2025-003', 'pcr_batched', CURRENT_DATE, 'blood'),
    ('DEV_007', 'Grace', 'Brown', 'Child', 'CASE-2025-003', 'electro_ready', CURRENT_DATE, 'blood'),
    ('DEV_008', 'Henry', 'Wilson', 'Child', 'CASE-2025-004', 'dna_extraction', CURRENT_DATE, 'buccal_swab'),
    ('DEV_009', 'Iris', 'Wilson', 'Mother', 'CASE-2025-004', 'sample_collected', CURRENT_DATE, 'buccal_swab'),
    ('DEV_010', 'Jack', 'Miller', 'Alleged Father', 'CASE-2025-005', 'report_sent', CURRENT_DATE - INTERVAL '2 days', 'buccal_swab')
ON CONFLICT (lab_number) DO NOTHING;

-- Insert demo batches
INSERT INTO batches (batch_number, batch_type, status, sample_count)
VALUES 
    ('PCR-2025-001', 'pcr', 'completed', 5),
    ('PCR-2025-002', 'pcr', 'in_progress', 3),
    ('ELECTRO-2025-001', 'electrophoresis', 'pending', 4)
ON CONFLICT (batch_number) DO NOTHING;

-- Insert workflow status tracking
INSERT INTO workflow_status (stage, status, count)
VALUES 
    ('sample_collected', 'active', 2),
    ('dna_extraction', 'active', 2),
    ('pcr_ready', 'active', 1),
    ('pcr_batched', 'active', 1),
    ('pcr_completed', 'active', 0),
    ('electro_ready', 'active', 1),
    ('electro_batched', 'active', 0),
    ('electro_completed', 'active', 0),
    ('analysis_ready', 'active', 0),
    ('analysis_completed', 'active', 1),
    ('report_ready', 'active', 1),
    ('report_sent', 'active', 1)
ON CONFLICT DO NOTHING;

-- Insert demo user
INSERT INTO users (username, email, password_hash, role)
VALUES 
    ('admin', 'admin@jagdna.local', '$2b$10$rQHjCqVZtQcOZCn1OqGk5OQ8qJTcE5jJ5YzQZnXcY7kY7rQZnXcY7', 'admin'),
    ('tech1', 'tech1@jagdna.local', '$2b$10$rQHjCqVZtQcOZCn1OqGk5OQ8qJTcE5jJ5YzQZnXcY7kY7rQZnXcY7', 'technician')
ON CONFLICT (username) DO NOTHING;