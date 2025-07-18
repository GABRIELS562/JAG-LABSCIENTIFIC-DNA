-- Migration: 001_create_initial_schema.sql
-- Description: Initial schema creation for LIMS application
-- Author: DevOps Team
-- Date: 2024-01-01
-- Version: 1.0.0

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'technician', 'analyst', 'viewer');
CREATE TYPE sample_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE test_type AS ENUM ('genetic', 'chemical', 'biological', 'pathology', 'molecular');
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE client_type AS ENUM ('hospital', 'clinic', 'research', 'individual', 'pharmaceutical');
CREATE TYPE analysis_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- Create audit trail function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
        NEW.updated_by = COALESCE(NEW.updated_by, OLD.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        NEW.created_at = CURRENT_TIMESTAMP;
        NEW.updated_at = CURRENT_TIMESTAMP;
        NEW.created_by = COALESCE(NEW.created_by, 'system');
        NEW.updated_by = COALESCE(NEW.updated_by, 'system');
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system',
    version INTEGER DEFAULT 1
);

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    client_type client_type NOT NULL,
    contact_person VARCHAR(200),
    billing_address TEXT,
    tax_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system',
    version INTEGER DEFAULT 1
);

-- Samples table
CREATE TABLE samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    barcode VARCHAR(100) UNIQUE,
    sample_type VARCHAR(50) NOT NULL,
    test_type test_type NOT NULL,
    priority priority_level NOT NULL DEFAULT 'normal',
    status sample_status NOT NULL DEFAULT 'pending',
    volume DECIMAL(8,2),
    unit VARCHAR(10) DEFAULT 'mL',
    collection_date DATE,
    collection_time TIME,
    collection_location VARCHAR(200),
    storage_location VARCHAR(100),
    temperature_requirement VARCHAR(50),
    special_instructions TEXT,
    expected_completion_date DATE,
    actual_completion_date DATE,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system',
    version INTEGER DEFAULT 1
);

-- Genetic analysis table
CREATE TABLE genetic_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    genes TEXT[],
    target_regions TEXT[],
    sequencing_platform VARCHAR(100),
    library_prep_method VARCHAR(100),
    read_depth INTEGER,
    coverage_threshold DECIMAL(5,2),
    quality_score_threshold INTEGER,
    priority priority_level NOT NULL DEFAULT 'normal',
    status analysis_status NOT NULL DEFAULT 'queued',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    analysis_parameters JSONB,
    raw_data_location VARCHAR(500),
    processed_data_location VARCHAR(500),
    results JSONB,
    quality_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system',
    version INTEGER DEFAULT 1
);

-- Test results table
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    test_name VARCHAR(200) NOT NULL,
    test_method VARCHAR(100),
    result_value VARCHAR(500),
    result_unit VARCHAR(50),
    reference_range VARCHAR(200),
    interpretation VARCHAR(100),
    is_abnormal BOOLEAN DEFAULT FALSE,
    confidence_level DECIMAL(5,2),
    performed_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    equipment_used VARCHAR(200),
    reagent_lot VARCHAR(100),
    test_date DATE NOT NULL,
    result_date DATE,
    comments TEXT,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system',
    version INTEGER DEFAULT 1
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    generated_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    generated_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    file_path VARCHAR(500),
    file_size INTEGER,
    file_format VARCHAR(20),
    digital_signature TEXT,
    is_confidential BOOLEAN DEFAULT TRUE,
    retention_period INTEGER DEFAULT 2555, -- 7 years in days
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system',
    version INTEGER DEFAULT 1
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES users(id),
    user_ip VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255)
);

-- System settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) NOT NULL DEFAULT 'string',
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_clients_client_id ON clients(client_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_client_type ON clients(client_type);
CREATE INDEX idx_clients_is_active ON clients(is_active);

CREATE INDEX idx_samples_sample_id ON samples(sample_id);
CREATE INDEX idx_samples_client_id ON samples(client_id);
CREATE INDEX idx_samples_barcode ON samples(barcode);
CREATE INDEX idx_samples_status ON samples(status);
CREATE INDEX idx_samples_priority ON samples(priority);
CREATE INDEX idx_samples_test_type ON samples(test_type);
CREATE INDEX idx_samples_collection_date ON samples(collection_date);
CREATE INDEX idx_samples_created_at ON samples(created_at);

CREATE INDEX idx_genetic_analysis_sample_id ON genetic_analysis(sample_id);
CREATE INDEX idx_genetic_analysis_status ON genetic_analysis(status);
CREATE INDEX idx_genetic_analysis_priority ON genetic_analysis(priority);
CREATE INDEX idx_genetic_analysis_analysis_type ON genetic_analysis(analysis_type);
CREATE INDEX idx_genetic_analysis_started_at ON genetic_analysis(started_at);
CREATE INDEX idx_genetic_analysis_completed_at ON genetic_analysis(completed_at);

CREATE INDEX idx_test_results_sample_id ON test_results(sample_id);
CREATE INDEX idx_test_results_test_name ON test_results(test_name);
CREATE INDEX idx_test_results_test_date ON test_results(test_date);
CREATE INDEX idx_test_results_performed_by ON test_results(performed_by);
CREATE INDEX idx_test_results_reviewed_by ON test_results(reviewed_by);

CREATE INDEX idx_reports_report_id ON reports(report_id);
CREATE INDEX idx_reports_client_id ON reports(client_id);
CREATE INDEX idx_reports_sample_id ON reports(sample_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_generated_at ON reports(generated_at);

CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_samples_metadata_gin ON samples USING gin(metadata);
CREATE INDEX idx_genetic_analysis_parameters_gin ON genetic_analysis USING gin(analysis_parameters);
CREATE INDEX idx_genetic_analysis_results_gin ON genetic_analysis USING gin(results);
CREATE INDEX idx_genetic_analysis_quality_gin ON genetic_analysis USING gin(quality_metrics);

-- Create triggers for audit trail
CREATE TRIGGER users_audit_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER clients_audit_trigger
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER samples_audit_trigger
    BEFORE INSERT OR UPDATE ON samples
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER genetic_analysis_audit_trigger
    BEFORE INSERT OR UPDATE ON genetic_analysis
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER test_results_audit_trigger
    BEFORE INSERT OR UPDATE ON test_results
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER reports_audit_trigger
    BEFORE INSERT OR UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Create views for common queries
CREATE VIEW v_active_samples AS
SELECT 
    s.id,
    s.sample_id,
    s.barcode,
    c.name as client_name,
    c.client_id,
    s.sample_type,
    s.test_type,
    s.priority,
    s.status,
    s.collection_date,
    s.expected_completion_date,
    s.created_at
FROM samples s
JOIN clients c ON s.client_id = c.id
WHERE s.status IN ('pending', 'in_progress')
AND c.is_active = TRUE;

CREATE VIEW v_pending_genetic_analysis AS
SELECT 
    ga.id,
    ga.sample_id,
    s.sample_id as sample_identifier,
    ga.analysis_type,
    ga.genes,
    ga.priority,
    ga.status,
    ga.created_at,
    c.name as client_name
FROM genetic_analysis ga
JOIN samples s ON ga.sample_id = s.id
JOIN clients c ON s.client_id = c.id
WHERE ga.status IN ('queued', 'running')
ORDER BY ga.priority DESC, ga.created_at ASC;

CREATE VIEW v_sample_summary AS
SELECT 
    s.id,
    s.sample_id,
    s.barcode,
    c.name as client_name,
    s.sample_type,
    s.test_type,
    s.priority,
    s.status,
    s.collection_date,
    COUNT(tr.id) as test_count,
    COUNT(ga.id) as genetic_analysis_count,
    COUNT(r.id) as report_count,
    s.created_at,
    s.updated_at
FROM samples s
JOIN clients c ON s.client_id = c.id
LEFT JOIN test_results tr ON s.id = tr.sample_id
LEFT JOIN genetic_analysis ga ON s.id = ga.sample_id
LEFT JOIN reports r ON s.id = r.sample_id
GROUP BY s.id, s.sample_id, s.barcode, c.name, s.sample_type, s.test_type, s.priority, s.status, s.collection_date, s.created_at, s.updated_at;

-- Create stored procedures
CREATE OR REPLACE FUNCTION get_sample_timeline(sample_uuid UUID)
RETURNS TABLE (
    timestamp TIMESTAMP WITH TIME ZONE,
    event_type VARCHAR(50),
    description TEXT,
    user_name VARCHAR(150)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.timestamp,
        al.action as event_type,
        CONCAT('Sample ', al.action, ' by ', COALESCE(u.first_name || ' ' || u.last_name, 'System')) as description,
        COALESCE(u.first_name || ' ' || u.last_name, 'System') as user_name
    FROM audit_log al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.table_name = 'samples' AND al.record_id = sample_uuid
    ORDER BY al.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_sample_status(
    sample_uuid UUID,
    new_status sample_status,
    updated_by_user VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE samples 
    SET status = new_status,
        updated_by = updated_by_user,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = sample_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add constraints
ALTER TABLE samples ADD CONSTRAINT chk_samples_volume_positive CHECK (volume > 0);
ALTER TABLE samples ADD CONSTRAINT chk_samples_dates CHECK (collection_date <= CURRENT_DATE);
ALTER TABLE test_results ADD CONSTRAINT chk_test_results_confidence CHECK (confidence_level >= 0 AND confidence_level <= 100);
ALTER TABLE genetic_analysis ADD CONSTRAINT chk_genetic_analysis_coverage CHECK (coverage_threshold >= 0 AND coverage_threshold <= 100);

-- Create database functions for data integrity
CREATE OR REPLACE FUNCTION validate_sample_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sample_id !~ '^[A-Z0-9_-]+$' THEN
        RAISE EXCEPTION 'Invalid sample ID format. Use only uppercase letters, numbers, underscores, and hyphens.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_sample_id_trigger
    BEFORE INSERT OR UPDATE ON samples
    FOR EACH ROW
    EXECUTE FUNCTION validate_sample_id();

-- Insert initial system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('system_version', '1.0.0', 'string', 'Current system version'),
('max_file_upload_size', '100', 'integer', 'Maximum file upload size in MB'),
('session_timeout', '30', 'integer', 'Session timeout in minutes'),
('password_min_length', '8', 'integer', 'Minimum password length'),
('enable_email_notifications', 'true', 'boolean', 'Enable email notifications'),
('default_sample_retention_days', '2555', 'integer', 'Default sample retention period in days'),
('lab_name', 'LabScientific LIMS', 'string', 'Laboratory name'),
('lab_address', '123 Science Drive, Research City, RC 12345', 'string', 'Laboratory address'),
('lab_phone', '+1-555-123-4567', 'string', 'Laboratory phone number'),
('lab_email', 'info@labscientific.com', 'string', 'Laboratory email address');

-- Create schema version tracking
CREATE TABLE schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(50) DEFAULT 'system',
    checksum VARCHAR(64)
);

-- Record this migration
INSERT INTO schema_migrations (version, description, checksum) VALUES 
('001', 'Initial schema creation', md5('001_create_initial_schema.sql'));

-- Grant permissions (to be customized based on roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lims_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lims_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO lims_app;

COMMIT;