-- Migration: 003_add_compliance_features.sql
-- Description: Add compliance features for regulatory requirements (HIPAA, GDPR, SOC2, FDA CFR 21 Part 11)
-- Author: DevOps Team
-- Date: 2024-02-01
-- Version: 1.2.0

-- Create compliance-related types
CREATE TYPE data_classification AS ENUM ('public', 'internal', 'confidential', 'restricted');
CREATE TYPE consent_status AS ENUM ('pending', 'granted', 'denied', 'withdrawn', 'expired');
CREATE TYPE retention_status AS ENUM ('active', 'archived', 'pending_deletion', 'deleted');
CREATE TYPE signature_type AS ENUM ('manual', 'electronic', 'digital');

-- Compliance configuration table
CREATE TABLE compliance_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regulation_type VARCHAR(50) NOT NULL,
    setting_name VARCHAR(100) NOT NULL,
    setting_value TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system',
    UNIQUE(regulation_type, setting_name)
);

-- Data classification table
CREATE TABLE data_classification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100),
    classification data_classification NOT NULL,
    reason TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(50) DEFAULT 'system'
);

-- Consent management table
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    status consent_status NOT NULL DEFAULT 'pending',
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    expiration_date DATE,
    consent_text TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    ip_address VARCHAR(45),
    user_agent TEXT,
    legal_basis VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Data retention policies table
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_name VARCHAR(200) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    retention_period_days INTEGER NOT NULL,
    trigger_field VARCHAR(100), -- field to calculate retention from
    archive_after_days INTEGER,
    delete_after_days INTEGER,
    legal_hold_override BOOLEAN DEFAULT FALSE,
    regulation_reference VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Data subject requests table (GDPR)
CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    request_type VARCHAR(50) NOT NULL, -- access, portability, rectification, erasure, restriction
    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id),
    request_details TEXT,
    response_details TEXT,
    requester_email VARCHAR(255),
    requester_phone VARCHAR(20),
    verification_method VARCHAR(100),
    verification_completed_at TIMESTAMP WITH TIME ZONE,
    legal_basis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Electronic signatures table (FDA CFR 21 Part 11)
CREATE TABLE electronic_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signature_id VARCHAR(100) UNIQUE NOT NULL,
    signed_document_id UUID NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_hash VARCHAR(256) NOT NULL,
    signer_id UUID NOT NULL REFERENCES users(id),
    signature_type signature_type NOT NULL,
    signature_method VARCHAR(100),
    signature_data TEXT, -- encrypted signature data
    signing_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    biometric_data TEXT, -- if applicable
    witness_id UUID REFERENCES users(id),
    purpose TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    invalidated_at TIMESTAMP WITH TIME ZONE,
    invalidation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail enhancements for compliance
CREATE TABLE compliance_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- data_access, data_modification, system_access, etc.
    user_id UUID REFERENCES users(id),
    impacted_data_subject UUID, -- client or patient ID
    data_classification data_classification,
    table_name VARCHAR(100),
    record_id UUID,
    field_names TEXT[],
    old_values JSONB,
    new_values JSONB,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    geolocation VARCHAR(200),
    risk_score INTEGER, -- 1-10 scale
    regulation_tags TEXT[], -- HIPAA, GDPR, SOC2, etc.
    retention_date DATE,
    is_sensitive BOOLEAN DEFAULT FALSE,
    encrypted_data TEXT -- for highly sensitive audit data
);

-- Data processing activities (GDPR Article 30)
CREATE TABLE data_processing_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_name VARCHAR(200) NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(100) NOT NULL,
    data_categories TEXT[],
    data_subjects TEXT[],
    recipients TEXT[],
    third_country_transfers BOOLEAN DEFAULT FALSE,
    retention_period VARCHAR(100),
    security_measures TEXT,
    dpo_contact VARCHAR(255),
    controller_contact VARCHAR(255),
    processor_contact VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Data breach incidents table
CREATE TABLE data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(100) UNIQUE NOT NULL,
    severity_level VARCHAR(50) NOT NULL, -- low, medium, high, critical
    incident_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    discovery_date DATE NOT NULL,
    occurrence_date DATE,
    affected_records_count INTEGER,
    affected_data_subjects UUID[],
    data_types_affected TEXT[],
    root_cause TEXT,
    containment_measures TEXT,
    notification_required BOOLEAN DEFAULT FALSE,
    authorities_notified BOOLEAN DEFAULT FALSE,
    authority_notification_date DATE,
    data_subjects_notified BOOLEAN DEFAULT FALSE,
    subject_notification_date DATE,
    regulatory_fines DECIMAL(15,2),
    remediation_cost DECIMAL(15,2),
    status VARCHAR(50) NOT NULL DEFAULT 'investigating',
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Privacy impact assessments table
CREATE TABLE privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id VARCHAR(100) UNIQUE NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    description TEXT,
    data_types TEXT[],
    processing_purposes TEXT[],
    necessity_justification TEXT,
    proportionality_assessment TEXT,
    risk_assessment TEXT,
    mitigation_measures TEXT,
    consultation_required BOOLEAN DEFAULT FALSE,
    dpo_reviewed BOOLEAN DEFAULT FALSE,
    dpo_review_date DATE,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approval_date DATE,
    review_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Add compliance fields to existing tables
ALTER TABLE clients ADD COLUMN data_classification data_classification DEFAULT 'confidential';
ALTER TABLE clients ADD COLUMN consent_status consent_status DEFAULT 'pending';
ALTER TABLE clients ADD COLUMN retention_status retention_status DEFAULT 'active';
ALTER TABLE clients ADD COLUMN gdpr_lawful_basis VARCHAR(100);
ALTER TABLE clients ADD COLUMN data_subject_rights_info_provided BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN research_consent BOOLEAN DEFAULT FALSE;

ALTER TABLE samples ADD COLUMN data_classification data_classification DEFAULT 'restricted';
ALTER TABLE samples ADD COLUMN retention_category VARCHAR(100);
ALTER TABLE samples ADD COLUMN legal_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE samples ADD COLUMN anonymization_date DATE;
ALTER TABLE samples ADD COLUMN destruction_date DATE;

ALTER TABLE users ADD COLUMN gdpr_consent_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN data_processing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_privacy_training_date DATE;
ALTER TABLE users ADD COLUMN access_level VARCHAR(50) DEFAULT 'standard';

-- Create indexes for compliance tables
CREATE INDEX idx_compliance_config_regulation_type ON compliance_config(regulation_type);
CREATE INDEX idx_compliance_config_is_active ON compliance_config(is_active);

CREATE INDEX idx_data_classification_rules_table_name ON data_classification_rules(table_name);
CREATE INDEX idx_data_classification_rules_classification ON data_classification_rules(classification);

CREATE INDEX idx_consent_records_client_id ON consent_records(client_id);
CREATE INDEX idx_consent_records_consent_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_status ON consent_records(status);

CREATE INDEX idx_retention_policies_table_name ON retention_policies(table_name);
CREATE INDEX idx_retention_policies_is_active ON retention_policies(is_active);

CREATE INDEX idx_data_subject_requests_request_id ON data_subject_requests(request_id);
CREATE INDEX idx_data_subject_requests_client_id ON data_subject_requests(client_id);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_submitted_at ON data_subject_requests(submitted_at);

CREATE INDEX idx_electronic_signatures_signature_id ON electronic_signatures(signature_id);
CREATE INDEX idx_electronic_signatures_document_id ON electronic_signatures(signed_document_id);
CREATE INDEX idx_electronic_signatures_signer_id ON electronic_signatures(signer_id);
CREATE INDEX idx_electronic_signatures_timestamp ON electronic_signatures(signing_timestamp);

CREATE INDEX idx_compliance_audit_trail_event_type ON compliance_audit_trail(event_type);
CREATE INDEX idx_compliance_audit_trail_user_id ON compliance_audit_trail(user_id);
CREATE INDEX idx_compliance_audit_trail_timestamp ON compliance_audit_trail(event_timestamp);
CREATE INDEX idx_compliance_audit_trail_data_subject ON compliance_audit_trail(impacted_data_subject);
CREATE INDEX idx_compliance_audit_trail_regulation_tags ON compliance_audit_trail USING gin(regulation_tags);

CREATE INDEX idx_data_processing_activities_is_active ON data_processing_activities(is_active);

CREATE INDEX idx_data_breach_incidents_incident_id ON data_breach_incidents(incident_id);
CREATE INDEX idx_data_breach_incidents_severity ON data_breach_incidents(severity_level);
CREATE INDEX idx_data_breach_incidents_status ON data_breach_incidents(status);
CREATE INDEX idx_data_breach_incidents_discovery_date ON data_breach_incidents(discovery_date);

CREATE INDEX idx_privacy_impact_assessments_assessment_id ON privacy_impact_assessments(assessment_id);
CREATE INDEX idx_privacy_impact_assessments_status ON privacy_impact_assessments(status);

-- Create compliance-specific views
CREATE VIEW v_gdpr_compliance_status AS
SELECT 
    c.id,
    c.client_id,
    c.name,
    c.email,
    c.consent_status,
    c.gdpr_lawful_basis,
    c.data_subject_rights_info_provided,
    COUNT(cr.id) as consent_records_count,
    COUNT(CASE WHEN cr.status = 'granted' THEN 1 END) as active_consents,
    COUNT(dsr.id) as data_subject_requests_count,
    COUNT(CASE WHEN dsr.status = 'completed' THEN 1 END) as completed_requests
FROM clients c
LEFT JOIN consent_records cr ON c.id = cr.client_id
LEFT JOIN data_subject_requests dsr ON c.id = dsr.client_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.client_id, c.name, c.email, c.consent_status, c.gdpr_lawful_basis, c.data_subject_rights_info_provided;

CREATE VIEW v_retention_compliance AS
SELECT 
    s.id,
    s.sample_id,
    s.created_at,
    s.retention_category,
    s.legal_hold,
    s.destruction_date,
    rp.policy_name,
    rp.retention_period_days,
    rp.archive_after_days,
    rp.delete_after_days,
    CASE 
        WHEN s.legal_hold = TRUE THEN 'legal_hold'
        WHEN s.destruction_date IS NOT NULL AND s.destruction_date <= CURRENT_DATE THEN 'overdue_deletion'
        WHEN s.created_at + INTERVAL '1 day' * rp.delete_after_days <= CURRENT_DATE THEN 'delete_eligible'
        WHEN s.created_at + INTERVAL '1 day' * rp.archive_after_days <= CURRENT_DATE THEN 'archive_eligible'
        ELSE 'active'
    END as retention_status
FROM samples s
LEFT JOIN retention_policies rp ON rp.table_name = 'samples' AND rp.is_active = TRUE;

CREATE VIEW v_audit_compliance_summary AS
SELECT 
    DATE(event_timestamp) as audit_date,
    event_category,
    user_id,
    COUNT(*) as event_count,
    COUNT(CASE WHEN is_sensitive = TRUE THEN 1 END) as sensitive_events,
    COUNT(CASE WHEN risk_score >= 8 THEN 1 END) as high_risk_events,
    STRING_AGG(DISTINCT regulation_tags::text, ', ') as regulations_involved
FROM compliance_audit_trail
WHERE event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(event_timestamp), event_category, user_id
ORDER BY audit_date DESC;

-- Create compliance-specific stored procedures
CREATE OR REPLACE FUNCTION record_compliance_event(
    p_event_type VARCHAR(100),
    p_event_category VARCHAR(50),
    p_user_id UUID,
    p_impacted_data_subject UUID,
    p_table_name VARCHAR(100),
    p_record_id UUID,
    p_regulation_tags TEXT[]
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
    event_uuid VARCHAR(100);
BEGIN
    event_uuid := 'EVT_' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    INSERT INTO compliance_audit_trail (
        event_id,
        event_type,
        event_category,
        user_id,
        impacted_data_subject,
        table_name,
        record_id,
        regulation_tags,
        risk_score
    ) VALUES (
        event_uuid,
        p_event_type,
        p_event_category,
        p_user_id,
        p_impacted_data_subject,
        p_table_name,
        p_record_id,
        p_regulation_tags,
        CASE 
            WHEN p_event_category = 'data_access' AND 'restricted' = ANY(SELECT data_classification FROM data_classification_rules WHERE table_name = p_table_name) THEN 8
            WHEN p_event_category = 'data_modification' THEN 6
            WHEN p_event_category = 'system_access' THEN 4
            ELSE 2
        END
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_data_subject_request(
    p_request_id VARCHAR(100),
    p_processed_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    request_record RECORD;
    client_data JSONB;
    sample_data JSONB;
BEGIN
    -- Get request details
    SELECT * INTO request_record 
    FROM data_subject_requests 
    WHERE request_id = p_request_id AND status = 'submitted';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Process based on request type
    CASE request_record.request_type
        WHEN 'access' THEN
            -- Compile client data
            SELECT to_jsonb(c.*) INTO client_data
            FROM clients c
            WHERE c.id = request_record.client_id;
            
            -- Compile sample data
            SELECT jsonb_agg(to_jsonb(s.*)) INTO sample_data
            FROM samples s
            WHERE s.client_id = request_record.client_id;
            
            -- Update request with compiled data
            UPDATE data_subject_requests 
            SET response_details = jsonb_build_object(
                'client_data', client_data,
                'sample_data', sample_data,
                'compiled_at', NOW()
            )::text,
            processed_at = NOW()
            WHERE request_id = p_request_id;
            
        WHEN 'erasure' THEN
            -- Mark for deletion (actual deletion would be done by separate process)
            UPDATE clients 
            SET retention_status = 'pending_deletion',
                updated_at = NOW()
            WHERE id = request_record.client_id;
            
            UPDATE samples 
            SET retention_status = 'pending_deletion',
                updated_at = NOW()
            WHERE client_id = request_record.client_id;
            
            UPDATE data_subject_requests 
            SET response_details = 'Data marked for deletion',
                processed_at = NOW()
            WHERE request_id = p_request_id;
    END CASE;
    
    -- Record compliance event
    PERFORM record_compliance_event(
        'data_subject_request_processed',
        'data_subject_rights',
        p_processed_by,
        request_record.client_id,
        'data_subject_requests',
        request_record.id,
        ARRAY['GDPR']
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION apply_retention_policy()
RETURNS TABLE (
    action VARCHAR(20),
    table_name VARCHAR(100),
    record_count INTEGER
) AS $$
DECLARE
    policy_record RECORD;
    archive_count INTEGER;
    delete_count INTEGER;
BEGIN
    FOR policy_record IN SELECT * FROM retention_policies WHERE is_active = TRUE LOOP
        -- Archive eligible records
        IF policy_record.archive_after_days IS NOT NULL THEN
            EXECUTE format('
                UPDATE %I 
                SET retention_status = ''archived'', updated_at = NOW()
                WHERE retention_status = ''active'' 
                AND %I < NOW() - INTERVAL ''%s days''
                AND legal_hold = FALSE',
                policy_record.table_name,
                policy_record.trigger_field,
                policy_record.archive_after_days
            );
            
            GET DIAGNOSTICS archive_count = ROW_COUNT;
            
            IF archive_count > 0 THEN
                RETURN QUERY SELECT 'archive'::VARCHAR(20), policy_record.table_name, archive_count;
            END IF;
        END IF;
        
        -- Delete eligible records
        IF policy_record.delete_after_days IS NOT NULL THEN
            EXECUTE format('
                UPDATE %I 
                SET retention_status = ''deleted'', 
                    destruction_date = CURRENT_DATE,
                    updated_at = NOW()
                WHERE retention_status IN (''active'', ''archived'') 
                AND %I < NOW() - INTERVAL ''%s days''
                AND legal_hold = FALSE',
                policy_record.table_name,
                policy_record.trigger_field,
                policy_record.delete_after_days
            );
            
            GET DIAGNOSTICS delete_count = ROW_COUNT;
            
            IF delete_count > 0 THEN
                RETURN QUERY SELECT 'delete'::VARCHAR(20), policy_record.table_name, delete_count;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create compliance audit trigger
CREATE OR REPLACE FUNCTION compliance_audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    regulation_tags TEXT[];
    data_class data_classification;
BEGIN
    -- Determine regulation tags based on table
    CASE TG_TABLE_NAME
        WHEN 'clients' THEN regulation_tags := ARRAY['GDPR', 'HIPAA'];
        WHEN 'samples' THEN regulation_tags := ARRAY['HIPAA', 'FDA'];
        WHEN 'test_results' THEN regulation_tags := ARRAY['HIPAA', 'FDA', 'CLIA'];
        WHEN 'genetic_analysis' THEN regulation_tags := ARRAY['HIPAA', 'FDA', 'GINA'];
        ELSE regulation_tags := ARRAY['SOC2'];
    END CASE;
    
    -- Get data classification
    SELECT classification INTO data_class
    FROM data_classification_rules
    WHERE table_name = TG_TABLE_NAME
    ORDER BY classification DESC
    LIMIT 1;
    
    IF data_class IS NULL THEN
        data_class := 'internal';
    END IF;
    
    -- Log the event
    INSERT INTO compliance_audit_trail (
        event_id,
        event_type,
        event_category,
        user_id,
        impacted_data_subject,
        data_classification,
        table_name,
        record_id,
        old_values,
        new_values,
        regulation_tags,
        is_sensitive
    ) VALUES (
        'EVT_' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '_' || substr(gen_random_uuid()::text, 1, 8),
        TG_OP,
        'data_modification',
        COALESCE(NEW.updated_by, OLD.updated_by, 'system')::UUID,
        CASE 
            WHEN TG_TABLE_NAME = 'clients' THEN COALESCE(NEW.id, OLD.id)
            WHEN TG_TABLE_NAME IN ('samples', 'test_results', 'genetic_analysis') THEN 
                COALESCE(NEW.client_id, OLD.client_id)
            ELSE NULL
        END,
        data_class,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(NEW) END,
        regulation_tags,
        data_class IN ('confidential', 'restricted')
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply compliance audit triggers to sensitive tables
CREATE TRIGGER compliance_audit_clients_trigger
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION compliance_audit_trigger_function();

CREATE TRIGGER compliance_audit_samples_trigger
    AFTER INSERT OR UPDATE OR DELETE ON samples
    FOR EACH ROW
    EXECUTE FUNCTION compliance_audit_trigger_function();

CREATE TRIGGER compliance_audit_test_results_trigger
    AFTER INSERT OR UPDATE OR DELETE ON test_results
    FOR EACH ROW
    EXECUTE FUNCTION compliance_audit_trigger_function();

CREATE TRIGGER compliance_audit_genetic_analysis_trigger
    AFTER INSERT OR UPDATE OR DELETE ON genetic_analysis
    FOR EACH ROW
    EXECUTE FUNCTION compliance_audit_trigger_function();

-- Insert initial compliance configuration
INSERT INTO compliance_config (regulation_type, setting_name, setting_value, effective_date) VALUES
('GDPR', 'data_subject_request_response_days', '30', CURRENT_DATE),
('GDPR', 'consent_renewal_period_months', '24', CURRENT_DATE),
('GDPR', 'breach_notification_hours', '72', CURRENT_DATE),
('HIPAA', 'minimum_necessary_standard', 'true', CURRENT_DATE),
('HIPAA', 'breach_notification_days', '60', CURRENT_DATE),
('FDA', 'electronic_signature_required', 'true', CURRENT_DATE),
('FDA', 'audit_trail_retention_years', '7', CURRENT_DATE),
('SOC2', 'access_review_frequency_months', '6', CURRENT_DATE),
('SOC2', 'log_retention_months', '12', CURRENT_DATE);

-- Insert data classification rules
INSERT INTO data_classification_rules (table_name, column_name, classification, reason) VALUES
('clients', 'email', 'confidential', 'Personal identifier'),
('clients', 'phone', 'confidential', 'Personal identifier'),
('clients', 'address', 'confidential', 'Personal information'),
('samples', NULL, 'restricted', 'Medical sample data'),
('test_results', NULL, 'restricted', 'Medical test results'),
('genetic_analysis', NULL, 'restricted', 'Genetic information'),
('users', 'email', 'confidential', 'Employee personal information'),
('users', 'password_hash', 'restricted', 'Authentication credentials');

-- Insert sample retention policies
INSERT INTO retention_policies (policy_name, table_name, retention_period_days, trigger_field, archive_after_days, delete_after_days, regulation_reference) VALUES
('Client Records Retention', 'clients', 2555, 'created_at', 1825, 2555, 'HIPAA 45 CFR 164.316'),
('Sample Data Retention', 'samples', 2555, 'created_at', 1095, 2555, 'CLIA 42 CFR 493.1105'),
('Test Results Retention', 'test_results', 2555, 'test_date', 1095, 2555, 'CLIA 42 CFR 493.1105'),
('Genetic Analysis Retention', 'genetic_analysis', 3650, 'created_at', 1825, 3650, 'GINA Section 105'),
('Audit Log Retention', 'audit_log', 2555, 'timestamp', 365, 2555, 'SOC2 CC6.1');

-- Record this migration
INSERT INTO schema_migrations (version, description, checksum) VALUES 
('003', 'Add compliance features for regulatory requirements', md5('003_add_compliance_features.sql'));

COMMIT;