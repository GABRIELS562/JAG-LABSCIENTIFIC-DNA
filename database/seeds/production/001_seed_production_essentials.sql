-- Production Seed: 001_seed_production_essentials.sql
-- Description: Seed production database with essential system data only
-- Environment: Production Only
-- Author: DevOps Team
-- WARNING: This file contains only essential system data for production deployment

-- Insert production admin user (password should be changed immediately)
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active,
    created_by,
    updated_by
) VALUES (
    'admin',
    'admin@labscientific.com',
    '$2b$12$CHANGE_THIS_PASSWORD_HASH_IMMEDIATELY_AFTER_DEPLOYMENT', -- MUST BE CHANGED
    'System',
    'Administrator',
    'admin',
    TRUE,
    'system',
    'system'
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = CURRENT_TIMESTAMP
WHERE users.username = 'admin';

-- Insert essential system settings for production
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_sensitive) VALUES
('system_version', '1.0.0', 'string', 'Current system version', FALSE),
('production_mode', 'true', 'boolean', 'Production environment flag', FALSE),
('max_file_upload_size', '50', 'integer', 'Maximum file upload size in MB', FALSE),
('session_timeout', '15', 'integer', 'Session timeout in minutes', FALSE),
('password_min_length', '12', 'integer', 'Minimum password length', FALSE),
('password_complexity_required', 'true', 'boolean', 'Require complex passwords', FALSE),
('enable_email_notifications', 'true', 'boolean', 'Enable email notifications', FALSE),
('enable_audit_logging', 'true', 'boolean', 'Enable comprehensive audit logging', FALSE),
('default_sample_retention_days', '2555', 'integer', 'Default sample retention period in days (7 years)', FALSE),
('backup_retention_days', '30', 'integer', 'Database backup retention period in days', FALSE),
('failed_login_max_attempts', '5', 'integer', 'Maximum failed login attempts before lockout', FALSE),
('account_lockout_duration', '30', 'integer', 'Account lockout duration in minutes', FALSE),
('password_expiry_days', '90', 'integer', 'Password expiry period in days', FALSE),
('two_factor_auth_required', 'true', 'boolean', 'Require two-factor authentication', FALSE),
('data_encryption_enabled', 'true', 'boolean', 'Enable data encryption at rest', FALSE),
('audit_log_retention_days', '2555', 'integer', 'Audit log retention period in days', FALSE),
('compliance_mode', 'true', 'boolean', 'Enable compliance mode', FALSE),
('gdpr_compliance_enabled', 'true', 'boolean', 'Enable GDPR compliance features', FALSE),
('hipaa_compliance_enabled', 'true', 'boolean', 'Enable HIPAA compliance features', FALSE),
('fda_compliance_enabled', 'true', 'boolean', 'Enable FDA compliance features', FALSE),
('lab_name', 'LabScientific LIMS', 'string', 'Laboratory name', FALSE),
('lab_address', 'UPDATE_THIS_ADDRESS', 'string', 'Laboratory address - MUST BE UPDATED', FALSE),
('lab_phone', 'UPDATE_THIS_PHONE', 'string', 'Laboratory phone number - MUST BE UPDATED', FALSE),
('lab_email', 'UPDATE_THIS_EMAIL', 'string', 'Laboratory email address - MUST BE UPDATED', FALSE),
('lab_license_number', 'UPDATE_THIS_LICENSE', 'string', 'Laboratory license number - MUST BE UPDATED', FALSE),
('clia_number', 'UPDATE_THIS_CLIA', 'string', 'CLIA certificate number - MUST BE UPDATED', FALSE),
('cap_number', 'UPDATE_THIS_CAP', 'string', 'CAP laboratory number - MUST BE UPDATED', FALSE),
('database_backup_enabled', 'true', 'boolean', 'Enable automated database backups', FALSE),
('log_level', 'INFO', 'string', 'Application logging level', FALSE),
('maintenance_mode', 'false', 'boolean', 'System maintenance mode', FALSE),
('api_rate_limit_per_minute', '1000', 'integer', 'API rate limit per minute', FALSE),
('max_concurrent_users', '100', 'integer', 'Maximum concurrent users', FALSE)
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- Insert essential compliance configuration for production
INSERT INTO compliance_config (regulation_type, setting_name, setting_value, effective_date, is_active) VALUES
('GDPR', 'data_subject_request_response_days', '30', CURRENT_DATE, TRUE),
('GDPR', 'consent_renewal_period_months', '24', CURRENT_DATE, TRUE),
('GDPR', 'breach_notification_hours', '72', CURRENT_DATE, TRUE),
('GDPR', 'data_retention_max_years', '7', CURRENT_DATE, TRUE),
('HIPAA', 'minimum_necessary_standard', 'true', CURRENT_DATE, TRUE),
('HIPAA', 'breach_notification_days', '60', CURRENT_DATE, TRUE),
('HIPAA', 'access_log_retention_years', '6', CURRENT_DATE, TRUE),
('HIPAA', 'encryption_required', 'true', CURRENT_DATE, TRUE),
('FDA', 'electronic_signature_required', 'true', CURRENT_DATE, TRUE),
('FDA', 'audit_trail_retention_years', '7', CURRENT_DATE, TRUE),
('FDA', 'change_control_required', 'true', CURRENT_DATE, TRUE),
('FDA', 'data_integrity_validation', 'true', CURRENT_DATE, TRUE),
('SOC2', 'access_review_frequency_months', '6', CURRENT_DATE, TRUE),
('SOC2', 'log_retention_months', '12', CURRENT_DATE, TRUE),
('SOC2', 'vulnerability_scan_frequency_days', '30', CURRENT_DATE, TRUE),
('SOC2', 'incident_response_required', 'true', CURRENT_DATE, TRUE),
('CLIA', 'quality_control_frequency', 'daily', CURRENT_DATE, TRUE),
('CLIA', 'proficiency_testing_required', 'true', CURRENT_DATE, TRUE),
('CLIA', 'personnel_training_required', 'true', CURRENT_DATE, TRUE),
('CLIA', 'quality_assessment_required', 'true', CURRENT_DATE, TRUE)
ON CONFLICT (regulation_type, setting_name) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    effective_date = EXCLUDED.effective_date,
    is_active = EXCLUDED.is_active;

-- Insert essential data classification rules
INSERT INTO data_classification_rules (table_name, column_name, classification, reason, applied_by) VALUES
('clients', 'email', 'confidential', 'Personal identifier - PII', 'system'),
('clients', 'phone', 'confidential', 'Personal identifier - PII', 'system'),
('clients', 'address', 'confidential', 'Personal information - PII', 'system'),
('clients', 'tax_id', 'confidential', 'Financial identifier', 'system'),
('samples', NULL, 'restricted', 'Medical sample data - PHI', 'system'),
('test_results', NULL, 'restricted', 'Medical test results - PHI', 'system'),
('genetic_analysis', NULL, 'restricted', 'Genetic information - PHI', 'system'),
('users', 'email', 'confidential', 'Employee personal information', 'system'),
('users', 'password_hash', 'restricted', 'Authentication credentials', 'system'),
('reports', 'file_path', 'restricted', 'Medical reports - PHI', 'system'),
('audit_log', 'old_values', 'restricted', 'Audit data may contain PHI', 'system'),
('audit_log', 'new_values', 'restricted', 'Audit data may contain PHI', 'system'),
('compliance_audit_trail', 'old_values', 'restricted', 'Compliance audit data', 'system'),
('compliance_audit_trail', 'new_values', 'restricted', 'Compliance audit data', 'system'),
('consent_records', 'consent_text', 'confidential', 'Consent documentation', 'system'),
('data_subject_requests', 'request_details', 'confidential', 'Data subject request information', 'system'),
('electronic_signatures', 'signature_data', 'restricted', 'Electronic signature data', 'system')
ON CONFLICT (table_name, column_name) DO UPDATE SET 
    classification = EXCLUDED.classification,
    reason = EXCLUDED.reason,
    applied_at = CURRENT_TIMESTAMP;

-- Insert essential retention policies
INSERT INTO retention_policies (
    policy_name, 
    table_name, 
    retention_period_days, 
    trigger_field, 
    archive_after_days, 
    delete_after_days, 
    regulation_reference, 
    is_active
) VALUES 
('Client Records Retention', 'clients', 2555, 'created_at', 1825, 2555, 'HIPAA 45 CFR 164.316(b)(2)', TRUE),
('Sample Data Retention', 'samples', 2555, 'created_at', 1095, 2555, 'CLIA 42 CFR 493.1105(a)(3)', TRUE),
('Test Results Retention', 'test_results', 2555, 'test_date', 1095, 2555, 'CLIA 42 CFR 493.1105(a)(4)', TRUE),
('Genetic Analysis Retention', 'genetic_analysis', 3650, 'created_at', 1825, 3650, 'GINA Section 105', TRUE),
('Reports Retention', 'reports', 2555, 'generated_at', 1095, 2555, 'HIPAA 45 CFR 164.316(b)(2)', TRUE),
('Audit Log Retention', 'audit_log', 2555, 'timestamp', 365, 2555, 'SOC2 CC6.1', TRUE),
('Compliance Audit Retention', 'compliance_audit_trail', 2555, 'event_timestamp', 365, 2555, 'SOC2 CC6.1', TRUE),
('User Activity Retention', 'users', 2555, 'created_at', 1095, 2555, 'SOC2 CC6.2', TRUE),
('Consent Records Retention', 'consent_records', 2555, 'created_at', 1095, 2555, 'GDPR Article 7', TRUE),
('Data Subject Requests Retention', 'data_subject_requests', 2555, 'submitted_at', 1095, 2555, 'GDPR Article 12', TRUE),
('Electronic Signatures Retention', 'electronic_signatures', 2555, 'signing_timestamp', 1095, 2555, 'FDA CFR 21 Part 11', TRUE),
('Workflow Data Retention', 'workflow_instances', 1825, 'created_at', 365, 1825, 'ISO 15189', TRUE),
('Equipment Data Retention', 'equipment', 2555, 'created_at', 1095, 2555, 'CLIA 42 CFR 493.1105(c)', TRUE),
('QC Data Retention', 'qc_samples', 2555, 'test_date', 1095, 2555, 'CLIA 42 CFR 493.1281(e)', TRUE)
ON CONFLICT (policy_name) DO UPDATE SET 
    retention_period_days = EXCLUDED.retention_period_days,
    trigger_field = EXCLUDED.trigger_field,
    archive_after_days = EXCLUDED.archive_after_days,
    delete_after_days = EXCLUDED.delete_after_days,
    regulation_reference = EXCLUDED.regulation_reference,
    is_active = EXCLUDED.is_active;

-- Insert essential data processing activities for GDPR compliance
INSERT INTO data_processing_activities (
    activity_name,
    purpose,
    legal_basis,
    data_categories,
    data_subjects,
    recipients,
    third_country_transfers,
    retention_period,
    security_measures,
    dpo_contact,
    controller_contact,
    processor_contact,
    is_active
) VALUES 
(
    'Laboratory Testing Services',
    'Provision of medical laboratory testing and diagnostic services',
    'contract',
    ARRAY['health_data', 'personal_identifiers', 'contact_information'],
    ARRAY['patients', 'healthcare_providers'],
    ARRAY['healthcare_providers', 'insurance_companies'],
    FALSE,
    '7 years from last activity',
    'Encryption at rest and in transit, access controls, audit logging',
    'UPDATE_DPO_CONTACT',
    'UPDATE_CONTROLLER_CONTACT',
    'UPDATE_PROCESSOR_CONTACT',
    TRUE
),
(
    'Clinical Research Support',
    'Support for clinical research studies and trials',
    'legitimate_interest',
    ARRAY['health_data', 'genetic_data', 'research_data'],
    ARRAY['research_participants'],
    ARRAY['research_institutions', 'pharmaceutical_companies'],
    FALSE,
    '10 years from study completion',
    'Encryption, pseudonymization, access controls, audit logging',
    'UPDATE_DPO_CONTACT',
    'UPDATE_CONTROLLER_CONTACT',
    'UPDATE_PROCESSOR_CONTACT',
    TRUE
),
(
    'Quality Control and Compliance',
    'Monitoring and ensuring quality of laboratory services',
    'legal_obligation',
    ARRAY['operational_data', 'quality_metrics', 'audit_trails'],
    ARRAY['employees', 'contractors'],
    ARRAY['regulatory_authorities', 'accreditation_bodies'],
    FALSE,
    '7 years from creation',
    'Access controls, audit logging, data integrity controls',
    'UPDATE_DPO_CONTACT',
    'UPDATE_CONTROLLER_CONTACT',
    'UPDATE_PROCESSOR_CONTACT',
    TRUE
);

-- Create production-specific database maintenance job schedule
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_sensitive) VALUES
('maintenance_window_start', '02:00', 'string', 'Daily maintenance window start time (UTC)', FALSE),
('maintenance_window_end', '04:00', 'string', 'Daily maintenance window end time (UTC)', FALSE),
('backup_schedule', '0 1 * * *', 'string', 'Database backup cron schedule', FALSE),
('log_cleanup_schedule', '0 3 * * 0', 'string', 'Log cleanup cron schedule (weekly)', FALSE),
('retention_policy_schedule', '0 2 * * 1', 'string', 'Retention policy execution schedule (weekly)', FALSE),
('health_check_interval', '300', 'integer', 'Health check interval in seconds', FALSE),
('performance_monitoring_enabled', 'true', 'boolean', 'Enable performance monitoring', FALSE),
('alert_thresholds_cpu', '80', 'integer', 'CPU usage alert threshold percentage', FALSE),
('alert_thresholds_memory', '85', 'integer', 'Memory usage alert threshold percentage', FALSE),
('alert_thresholds_disk', '90', 'integer', 'Disk usage alert threshold percentage', FALSE),
('alert_thresholds_response_time', '5000', 'integer', 'Response time alert threshold in milliseconds', FALSE)
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- Record production deployment
INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    new_values,
    user_id,
    timestamp
) VALUES (
    'system_settings',
    (SELECT id FROM system_settings WHERE setting_key = 'production_mode'),
    'PRODUCTION_DEPLOYMENT',
    '{"deployment_date": "' || CURRENT_TIMESTAMP || '", "environment": "production", "version": "1.0.0"}'::jsonb,
    (SELECT id FROM users WHERE username = 'admin'),
    CURRENT_TIMESTAMP
);

-- Create a reminder for post-deployment tasks
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_sensitive) VALUES
('post_deployment_tasks', 'CHANGE_ADMIN_PASSWORD,UPDATE_LAB_INFO,CONFIGURE_SMTP,SETUP_BACKUPS,CONFIGURE_MONITORING,SETUP_SSL,CONFIGURE_ALERTS', 'string', 'Post-deployment tasks checklist', FALSE)
ON CONFLICT (setting_key) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- Production deployment complete message
DO $$
BEGIN
    RAISE NOTICE 'Production deployment seed complete. IMPORTANT: Execute post-deployment tasks immediately:';
    RAISE NOTICE '1. Change admin password';
    RAISE NOTICE '2. Update laboratory information';
    RAISE NOTICE '3. Configure SMTP settings';
    RAISE NOTICE '4. Setup database backups';
    RAISE NOTICE '5. Configure monitoring and alerting';
    RAISE NOTICE '6. Setup SSL certificates';
    RAISE NOTICE '7. Configure external integrations';
    RAISE NOTICE '8. Review and test all compliance features';
    RAISE NOTICE '9. Perform security audit';
    RAISE NOTICE '10. Create operational procedures';
END $$;

COMMIT;