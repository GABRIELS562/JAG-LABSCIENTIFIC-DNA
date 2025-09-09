-- JAG DNA Scientific LIMS PostgreSQL Schema
-- Complete migration from SQLite to PostgreSQL for production deployment
-- Database: jagdna_lims

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('staff', 'client')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Test Cases Table (Groups related samples for paternity tests)
CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(100) UNIQUE NOT NULL,
    ref_kit_number VARCHAR(100) NOT NULL,
    submission_date DATE NOT NULL,
    client_type VARCHAR(50) NOT NULL CHECK (client_type IN ('paternity', 'lt', 'urgent')),
    mother_present VARCHAR(10) CHECK (mother_present IN ('YES', 'NO')),
    email_contact VARCHAR(255),
    phone_contact VARCHAR(50),
    address_area TEXT,
    comments TEXT,
    test_purpose VARCHAR(50) CHECK (test_purpose IN ('peace_of_mind', 'legal_proceedings', 'immigration', 'inheritance', 'custody', 'other')),
    sample_type VARCHAR(50) CHECK (sample_type IN ('buccal_swab', 'blood', 'saliva', 'other')),
    authorized_collector VARCHAR(255),
    consent_type VARCHAR(50) CHECK (consent_type IN ('paternity', 'legal')),
    has_signatures VARCHAR(10) CHECK (has_signatures IN ('YES', 'NO')),
    has_witness VARCHAR(10) CHECK (has_witness IN ('YES', 'NO')),
    witness_name VARCHAR(255),
    legal_declarations JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Samples Table (Main data storage for all sample information)
CREATE TABLE IF NOT EXISTS samples (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
    lab_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    id_dob VARCHAR(50),
    date_of_birth DATE,
    place_of_birth TEXT,
    nationality VARCHAR(100),
    occupation VARCHAR(255),
    address TEXT,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    id_number VARCHAR(100),
    id_type VARCHAR(50) CHECK (id_type IN ('passport', 'nationalId', 'driversLicense')),
    marital_status VARCHAR(50) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    ethnicity VARCHAR(100),
    collection_date DATE,
    submission_date DATE,
    relation VARCHAR(100) NOT NULL,
    additional_notes TEXT,
    batch_id INTEGER,
    extraction_id INTEGER,
    kit_batch_number VARCHAR(100),
    lab_batch_number VARCHAR(100),
    report_number VARCHAR(100),
    report_sent BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'active')),
    workflow_status VARCHAR(100) DEFAULT 'sample_collected' CHECK (workflow_status IN (
        'sample_collected', 'extraction_ready', 'extraction_batched', 'extraction_in_progress', 
        'extraction_completed', 'pcr_ready', 'pcr_batched', 'pcr_completed', 'electro_ready', 
        'electro_batched', 'electro_completed', 'analysis_ready', 'analysis_completed', 
        'report_ready', 'report_sent', 'dna_extraction', 'pcr_amplification', 'electrophoresis', 
        'osiris_analysis', 'report_generation', 'qpcr_ready', 'qpcr_completed', 'rerun_batched'
    )),
    case_number VARCHAR(100),
    gender VARCHAR(10) CHECK (gender IN ('M', 'F')),
    age INTEGER,
    sample_type VARCHAR(100),
    notes TEXT,
    is_real_data BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Batches Table (96-well plate batch management)
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    operator VARCHAR(255) NOT NULL,
    pcr_date DATE,
    electro_date DATE,
    settings VARCHAR(100) DEFAULT '27cycles30minExt',
    total_samples INTEGER DEFAULT 0,
    plate_layout JSONB,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DNA Extraction Batches Table
CREATE TABLE IF NOT EXISTS extraction_batches (
    id SERIAL PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    operator VARCHAR(255) NOT NULL,
    extraction_date DATE,
    extraction_method VARCHAR(100),
    kit_lot_number VARCHAR(100),
    kit_expiry_date DATE,
    total_samples INTEGER DEFAULT 0,
    lysis_time INTEGER DEFAULT 60,
    lysis_temperature DECIMAL(5,2) DEFAULT 56.0,
    incubation_time INTEGER DEFAULT 30,
    centrifuge_speed INTEGER DEFAULT 14000,
    centrifuge_time INTEGER DEFAULT 3,
    elution_volume INTEGER DEFAULT 200,
    quality_control_passed BOOLEAN,
    plate_layout JSONB,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Extraction Results Table
CREATE TABLE IF NOT EXISTS extraction_results (
    id SERIAL PRIMARY KEY,
    extraction_batch_id INTEGER REFERENCES extraction_batches(id) ON DELETE CASCADE,
    sample_id INTEGER REFERENCES samples(id) ON DELETE CASCADE,
    well_position VARCHAR(10) NOT NULL,
    dna_concentration DECIMAL(10,4),
    purity_260_280 DECIMAL(5,3),
    purity_260_230 DECIMAL(5,3),
    volume_recovered INTEGER,
    quality_assessment VARCHAR(50),
    quantification_method VARCHAR(100),
    extraction_efficiency DECIMAL(5,2),
    inhibition_detected BOOLEAN DEFAULT FALSE,
    reextraction_required BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Signatures Table (Digital signatures for legal compliance)
CREATE TABLE IF NOT EXISTS signatures (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    person_type VARCHAR(50) NOT NULL CHECK (person_type IN ('mother', 'father', 'child', 'witness')),
    signature_data TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    device_info TEXT
);

-- 8. Witness Information Table (Legal witness details)
CREATE TABLE IF NOT EXISTS witnesses (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    id_number VARCHAR(100),
    id_type VARCHAR(50) CHECK (id_type IN ('passport', 'nationalId', 'driversLicense')),
    contact_number VARCHAR(50),
    address TEXT,
    relationship VARCHAR(100),
    witness_date DATE,
    signature_id INTEGER REFERENCES signatures(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Well Assignments Table (96-well plate layout details)
CREATE TABLE IF NOT EXISTS well_assignments (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    well_position VARCHAR(10) NOT NULL,
    sample_id INTEGER REFERENCES samples(id) ON DELETE SET NULL,
    well_type VARCHAR(50) NOT NULL CHECK (well_type IN ('Sample', 'Blank', 'Allelic Ladder', 'Positive Control', 'Negative Control')),
    kit_number VARCHAR(100),
    sample_name VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, well_position)
);

-- 10. Quality Control Table
CREATE TABLE IF NOT EXISTS quality_control (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    control_type VARCHAR(100) NOT NULL,
    result VARCHAR(50) CHECK (result IN ('Passed', 'Failed')),
    operator VARCHAR(255) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    last_calibration DATE,
    next_calibration DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES test_cases(id) ON DELETE SET NULL,
    batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
    report_number VARCHAR(100) UNIQUE,
    report_type VARCHAR(100) NOT NULL CHECK (report_type IN ('Batch Report', 'QC Summary', 'Paternity Report', 'Sample Report')),
    date_generated DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'sent')),
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Workflow Stage Configurations Table
CREATE TABLE IF NOT EXISTS workflow_stage_configs (
    id SERIAL PRIMARY KEY,
    stage_name VARCHAR(100) NOT NULL UNIQUE,
    duration_minutes INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Sample Workflow Timing Table
CREATE TABLE IF NOT EXISTS sample_workflow_timing (
    id SERIAL PRIMARY KEY,
    sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Basic Workflows Table (for compatibility)
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    sample_id VARCHAR(255),
    workflow_type VARCHAR(100),
    status VARCHAR(50),
    step_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Workflow Cycles Table
CREATE TABLE IF NOT EXISTS workflow_cycles (
    id SERIAL PRIMARY KEY,
    cycle_name VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    samples_processed INTEGER DEFAULT 0,
    batches_created INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INTEGER,
    action VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- 17. OSIRIS Analysis Tables
CREATE TABLE IF NOT EXISTS osiris_analyses (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(100),
    input_directory TEXT,
    output_directory TEXT,
    kit_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Genetic Analysis Tables
CREATE TABLE IF NOT EXISTS genetic_cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(100) UNIQUE NOT NULL,
    case_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for batch_id in samples table
ALTER TABLE samples ADD CONSTRAINT fk_samples_batch 
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;

ALTER TABLE samples ADD CONSTRAINT fk_samples_extraction 
    FOREIGN KEY (extraction_id) REFERENCES extraction_batches(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number);
CREATE INDEX IF NOT EXISTS idx_samples_name ON samples(name);
CREATE INDEX IF NOT EXISTS idx_samples_surname ON samples(surname);
CREATE INDEX IF NOT EXISTS idx_samples_case_id ON samples(case_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_workflow_status ON samples(workflow_status);
CREATE INDEX IF NOT EXISTS idx_samples_collection_date ON samples(collection_date);
CREATE INDEX IF NOT EXISTS idx_samples_case_number ON samples(case_number);
CREATE INDEX IF NOT EXISTS idx_samples_batch_id ON samples(batch_id);
CREATE INDEX IF NOT EXISTS idx_samples_extraction_id ON samples(extraction_id);

CREATE INDEX IF NOT EXISTS idx_test_cases_case_number ON test_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_submission_date ON test_cases(submission_date);

CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_operator ON batches(operator);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);

CREATE INDEX IF NOT EXISTS idx_extraction_batches_batch_number ON extraction_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_extraction_batches_status ON extraction_batches(status);

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

CREATE INDEX IF NOT EXISTS idx_workflow_timing_sample_id ON sample_workflow_timing(sample_id);
CREATE INDEX IF NOT EXISTS idx_workflow_timing_stage ON sample_workflow_timing(stage_name);
CREATE INDEX IF NOT EXISTS idx_workflow_timing_entry ON sample_workflow_timing(entry_time);
CREATE INDEX IF NOT EXISTS idx_workflow_stage_configs_stage ON workflow_stage_configs(stage_name);

CREATE INDEX IF NOT EXISTS idx_osiris_analyses_case_id ON osiris_analyses(case_id);
CREATE INDEX IF NOT EXISTS idx_osiris_analyses_status ON osiris_analyses(status);

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to update timestamps
CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON samples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extraction_batches_updated_at BEFORE UPDATE ON extraction_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_stage_configs_updated_at BEFORE UPDATE ON workflow_stage_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_genetic_cases_updated_at BEFORE UPDATE ON genetic_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: 'admin123' - change in production!)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@labdna.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff')
ON CONFLICT (username) DO NOTHING;

-- Insert default workflow stage configurations
INSERT INTO workflow_stage_configs (stage_name, duration_minutes, is_active, description) VALUES
('sample_collected', 3, true, 'Sample collection and labeling'),
('dna_extraction', 5, true, 'DNA extraction from biological samples'),
('pcr_amplification', 4, true, 'PCR amplification of DNA regions'),
('electrophoresis', 3, true, 'Capillary electrophoresis separation'),
('osiris_analysis', 6, true, 'OSIRIS software analysis and interpretation'),
('report_generation', 2, true, 'Final report generation and review')
ON CONFLICT (stage_name) DO NOTHING;

-- Insert sample equipment data
INSERT INTO equipment (equipment_id, type, last_calibration, next_calibration, status) VALUES
('PCR001', 'Thermocycler', '2024-06-01', '2024-12-01', 'active'),
('CENT001', 'Centrifuge', '2024-05-15', '2024-11-15', 'active'),
('PIP001', 'Pipette Set A', '2024-05-01', '2024-11-01', 'active'),
('ELEC001', 'Electrophoresis Unit', '2024-06-10', '2024-12-10', 'active')
ON CONFLICT (equipment_id) DO NOTHING;

-- Grant permissions to lims_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lims_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lims_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO lims_user;

-- Allow lims_user to create tables (for future schema updates)
GRANT CREATE ON SCHEMA public TO lims_user;