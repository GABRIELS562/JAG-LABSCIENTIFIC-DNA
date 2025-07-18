-- Development Seed: 002_seed_clients.sql
-- Description: Seed development database with sample clients
-- Environment: Development Only
-- Author: DevOps Team

-- Insert hospital clients
INSERT INTO clients (
    client_id,
    name,
    email,
    phone,
    address,
    city,
    state,
    postal_code,
    country,
    client_type,
    contact_person,
    billing_address,
    tax_id,
    is_active,
    credit_limit,
    data_classification,
    consent_status,
    gdpr_lawful_basis,
    created_by,
    updated_by
) VALUES 
(
    'CLIENT_001',
    'General Hospital Medical Center',
    'admin@generalhospital.com',
    '+1-555-0101',
    '123 Healthcare Drive',
    'Medical City',
    'CA',
    '90210',
    'USA',
    'hospital',
    'Dr. Robert Thompson, Chief Medical Officer',
    '123 Healthcare Drive, Medical City, CA 90210',
    'TAX123456789',
    TRUE,
    50000.00,
    'confidential',
    'granted',
    'contract',
    'system',
    'system'
),
(
    'CLIENT_002',
    'Metropolitan Health System',
    'procurement@metrohealth.com',
    '+1-555-0102',
    '456 Medical Plaza',
    'Metro City',
    'NY',
    '10001',
    'USA',
    'hospital',
    'Sarah Williams, Laboratory Director',
    '456 Medical Plaza, Metro City, NY 10001',
    'TAX234567890',
    TRUE,
    75000.00,
    'confidential',
    'granted',
    'contract',
    'system',
    'system'
),
(
    'CLIENT_003',
    'Regional Medical Center',
    'lab@regionalmedical.com',
    '+1-555-0103',
    '789 Hospital Way',
    'Regional City',
    'TX',
    '77001',
    'USA',
    'hospital',
    'Dr. Michael Davis, Pathology Director',
    '789 Hospital Way, Regional City, TX 77001',
    'TAX345678901',
    TRUE,
    60000.00,
    'confidential',
    'granted',
    'contract',
    'system',
    'system'
) ON CONFLICT (client_id) DO NOTHING;

-- Insert clinic clients
INSERT INTO clients (
    client_id,
    name,
    email,
    phone,
    address,
    city,
    state,
    postal_code,
    country,
    client_type,
    contact_person,
    billing_address,
    tax_id,
    is_active,
    credit_limit,
    data_classification,
    consent_status,
    gdpr_lawful_basis,
    created_by,
    updated_by
) VALUES 
(
    'CLIENT_004',
    'Family Medicine Clinic',
    'office@familymedclinic.com',
    '+1-555-0104',
    '321 Clinic Street',
    'Suburb City',
    'FL',
    '33101',
    'USA',
    'clinic',
    'Dr. Jennifer Lopez, Managing Partner',
    '321 Clinic Street, Suburb City, FL 33101',
    'TAX456789012',
    TRUE,
    25000.00,
    'confidential',
    'granted',
    'contract',
    'system',
    'system'
),
(
    'CLIENT_005',
    'Specialized Diagnostics Clinic',
    'info@specdiagnostics.com',
    '+1-555-0105',
    '654 Diagnostic Avenue',
    'Healthcare City',
    'WA',
    '98101',
    'USA',
    'clinic',
    'Dr. Kevin Park, Clinical Director',
    '654 Diagnostic Avenue, Healthcare City, WA 98101',
    'TAX567890123',
    TRUE,
    35000.00,
    'confidential',
    'granted',
    'contract',
    'system',
    'system'
) ON CONFLICT (client_id) DO NOTHING;

-- Insert research institution clients
INSERT INTO clients (
    client_id,
    name,
    email,
    phone,
    address,
    city,
    state,
    postal_code,
    country,
    client_type,
    contact_person,
    billing_address,
    tax_id,
    is_active,
    credit_limit,
    data_classification,
    consent_status,
    gdpr_lawful_basis,
    created_by,
    updated_by
) VALUES 
(
    'CLIENT_006',
    'University Research Institute',
    'research@university.edu',
    '+1-555-0106',
    '987 Research Boulevard',
    'University City',
    'MA',
    '02101',
    'USA',
    'research',
    'Dr. Amanda Zhang, Principal Investigator',
    '987 Research Boulevard, University City, MA 02101',
    'TAX678901234',
    TRUE,
    100000.00,
    'confidential',
    'granted',
    'legitimate_interest',
    'system',
    'system'
),
(
    'CLIENT_007',
    'Genomics Research Foundation',
    'admin@genomicsresearch.org',
    '+1-555-0107',
    '111 Science Park',
    'Innovation City',
    'CA',
    '94101',
    'USA',
    'research',
    'Dr. David Kumar, Research Director',
    '111 Science Park, Innovation City, CA 94101',
    'TAX789012345',
    TRUE,
    150000.00,
    'restricted',
    'granted',
    'legitimate_interest',
    'system',
    'system'
) ON CONFLICT (client_id) DO NOTHING;

-- Insert pharmaceutical company clients
INSERT INTO clients (
    client_id,
    name,
    email,
    phone,
    address,
    city,
    state,
    postal_code,
    country,
    client_type,
    contact_person,
    billing_address,
    tax_id,
    is_active,
    credit_limit,
    data_classification,
    consent_status,
    gdpr_lawful_basis,
    created_by,
    updated_by
) VALUES 
(
    'CLIENT_008',
    'BioPharm Solutions Inc.',
    'procurement@biopharm.com',
    '+1-555-0108',
    '222 Pharmaceutical Way',
    'BioPharma City',
    'NJ',
    '08901',
    'USA',
    'pharmaceutical',
    'Dr. Lisa Chen, VP of Clinical Development',
    '222 Pharmaceutical Way, BioPharma City, NJ 08901',
    'TAX890123456',
    TRUE,
    200000.00,
    'restricted',
    'granted',
    'contract',
    'system',
    'system'
),
(
    'CLIENT_009',
    'Global Therapeutics Corp.',
    'clinical@globaltherapeutics.com',
    '+1-555-0109',
    '333 Drug Development Drive',
    'Pharma City',
    'CA',
    '92101',
    'USA',
    'pharmaceutical',
    'Dr. Robert Johnson, Clinical Operations Manager',
    '333 Drug Development Drive, Pharma City, CA 92101',
    'TAX901234567',
    TRUE,
    250000.00,
    'restricted',
    'granted',
    'contract',
    'system',
    'system'
) ON CONFLICT (client_id) DO NOTHING;

-- Insert individual clients
INSERT INTO clients (
    client_id,
    name,
    email,
    phone,
    address,
    city,
    state,
    postal_code,
    country,
    client_type,
    contact_person,
    billing_address,
    tax_id,
    is_active,
    credit_limit,
    data_classification,
    consent_status,
    gdpr_lawful_basis,
    created_by,
    updated_by
) VALUES 
(
    'CLIENT_010',
    'Individual Patient Services',
    'patient@individualservices.com',
    '+1-555-0110',
    '444 Patient Avenue',
    'Patient City',
    'IL',
    '60601',
    'USA',
    'individual',
    'Patient Services Coordinator',
    '444 Patient Avenue, Patient City, IL 60601',
    'TAX012345678',
    TRUE,
    5000.00,
    'restricted',
    'granted',
    'consent',
    'system',
    'system'
) ON CONFLICT (client_id) DO NOTHING;

-- Insert consent records for clients
INSERT INTO consent_records (
    client_id,
    consent_type,
    purpose,
    status,
    granted_at,
    consent_text,
    version,
    ip_address,
    legal_basis,
    created_by,
    updated_by
)
SELECT 
    c.id,
    'data_processing',
    'Laboratory testing and analysis services',
    'granted',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    'I consent to the processing of my personal data for laboratory testing and analysis services.',
    '1.0',
    '192.168.1.100',
    c.gdpr_lawful_basis,
    'system',
    'system'
FROM clients c
WHERE c.client_id IN ('CLIENT_001', 'CLIENT_002', 'CLIENT_003', 'CLIENT_004', 'CLIENT_005', 'CLIENT_006', 'CLIENT_007', 'CLIENT_008', 'CLIENT_009', 'CLIENT_010');

-- Insert additional consent records for research clients
INSERT INTO consent_records (
    client_id,
    consent_type,
    purpose,
    status,
    granted_at,
    consent_text,
    version,
    ip_address,
    legal_basis,
    created_by,
    updated_by
)
SELECT 
    c.id,
    'research_participation',
    'Participation in approved research studies',
    'granted',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    'I consent to the use of my data for approved research studies.',
    '1.0',
    '192.168.1.100',
    'legitimate_interest',
    'system',
    'system'
FROM clients c
WHERE c.client_type = 'research';

-- Update system settings to reflect seeded data
UPDATE system_settings 
SET setting_value = 'true' 
WHERE setting_key = 'seed_data_loaded';

-- Record seed execution
INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    new_values,
    user_id,
    timestamp
) VALUES (
    'clients',
    (SELECT id FROM clients WHERE client_id = 'CLIENT_001'),
    'SEED_DATA_LOADED',
    '{"seed_file": "002_seed_clients.sql", "environment": "development", "clients_count": 10}'::jsonb,
    (SELECT id FROM users WHERE username = 'admin'),
    CURRENT_TIMESTAMP
);

COMMIT;