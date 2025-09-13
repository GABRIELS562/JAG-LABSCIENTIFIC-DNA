-- Generate sample data for LIMS DNA Testing
-- Mix of forensic and regular samples

INSERT INTO samples (
    lab_number, case_number, name, surname, relation,
    collection_date, workflow_status, status, sample_type, priority,
    barcode, metadata, created_at, updated_at
) VALUES
-- Forensic samples (with FOR- prefix)
('LAB-2025-001', 'FOR-2025-0001', 'John', 'Doe', 'Evidence', '2025-09-10', 'sample_collected', 'active', 'Blood', 'high', 'BC001FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"2ml","concentration":"45ng/ul"}', NOW(), NOW()),
('LAB-2025-002', 'FOR-2025-0001', 'Jane', 'Smith', 'Reference', '2025-09-10', 'dna_extraction', 'active', 'Buccal Swab', 'high', 'BC002FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"3ml","concentration":"60ng/ul"}', NOW(), NOW()),
('LAB-2025-003', 'FOR-2025-0002', 'Robert', 'Johnson', 'Suspect', '2025-09-11', 'pcr_ready', 'active', 'Hair', 'high', 'BC003FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"1ml","concentration":"20ng/ul"}', NOW(), NOW()),
('LAB-2025-004', 'FOR-2025-0003', 'Maria', 'Garcia', 'Victim', '2025-09-11', 'pcr_batched', 'active', 'Blood', 'high', 'BC004FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"2ml","concentration":"55ng/ul"}', NOW(), NOW()),
('LAB-2025-005', 'FOR-2025-0004', 'David', 'Wilson', 'Evidence', '2025-09-12', 'pcr_completed', 'active', 'Saliva', 'high', 'BC005FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"2ml","concentration":"40ng/ul"}', NOW(), NOW()),

-- Paternity samples
('LAB-2025-006', 'PAT-2025-0001', 'Michael', 'Brown', 'Child', '2025-09-12', 'electro_ready', 'active', 'Buccal Swab', 'normal', 'BC006PAT', '{"case_type":"Paternity","volume":"3ml","concentration":"70ng/ul"}', NOW(), NOW()),
('LAB-2025-007', 'PAT-2025-0001', 'Sarah', 'Brown', 'Mother', '2025-09-12', 'electro_batched', 'active', 'Buccal Swab', 'normal', 'BC007PAT', '{"case_type":"Paternity","volume":"3ml","concentration":"65ng/ul"}', NOW(), NOW()),
('LAB-2025-008', 'PAT-2025-0001', 'James', 'Brown', 'Alleged Father', '2025-09-12', 'electro_completed', 'active', 'Buccal Swab', 'normal', 'BC008PAT', '{"case_type":"Paternity","volume":"3ml","concentration":"75ng/ul"}', NOW(), NOW()),

-- Immigration samples
('LAB-2025-009', 'IMM-2025-0001', 'Li', 'Zhang', 'Petitioner', '2025-09-13', 'analysis_ready', 'active', 'Blood', 'normal', 'BC009IMM', '{"case_type":"Immigration","volume":"2ml","concentration":"50ng/ul"}', NOW(), NOW()),
('LAB-2025-010', 'IMM-2025-0001', 'Wei', 'Zhang', 'Beneficiary', '2025-09-13', 'analysis_completed', 'active', 'Blood', 'normal', 'BC010IMM', '{"case_type":"Immigration","volume":"2ml","concentration":"55ng/ul"}', NOW(), NOW()),

-- Kinship samples
('LAB-2025-011', 'KIN-2025-0001', 'Emily', 'Davis', 'Person 1', '2025-09-13', 'report_ready', 'active', 'Buccal Swab', 'normal', 'BC011KIN', '{"case_type":"Kinship","volume":"3ml","concentration":"60ng/ul"}', NOW(), NOW()),
('LAB-2025-012', 'KIN-2025-0001', 'Thomas', 'Davis', 'Person 2', '2025-09-13', 'report_sent', 'active', 'Buccal Swab', 'normal', 'BC012KIN', '{"case_type":"Kinship","volume":"3ml","concentration":"58ng/ul"}', NOW(), NOW()),

-- More forensic samples at various stages
('LAB-2025-013', 'FOR-2025-0005', 'Christopher', 'Lee', 'Evidence', '2025-09-13', 'sample_collected', 'active', 'Blood', 'high', 'BC013FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"2ml","concentration":"48ng/ul"}', NOW(), NOW()),
('LAB-2025-014', 'FOR-2025-0006', 'Amanda', 'White', 'Suspect', '2025-09-13', 'dna_extraction', 'active', 'Hair', 'high', 'BC014FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"1ml","concentration":"22ng/ul"}', NOW(), NOW()),
('LAB-2025-015', 'FOR-2025-0007', 'Daniel', 'Martinez', 'Reference', '2025-09-13', 'pcr_ready', 'active', 'Buccal Swab', 'high', 'BC015FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"3ml","concentration":"62ng/ul"}', NOW(), NOW()),

-- Failed QC sample
('LAB-2025-016', 'PAT-2025-0002', 'Jessica', 'Taylor', 'Mother', '2025-09-11', 'pcr_batched', 'failed', 'Buccal Swab', 'normal', 'BC016PAT', '{"case_type":"Paternity","volume":"3ml","concentration":"15ng/ul","quality":"degraded"}', NOW(), NOW()),

-- More paternity samples
('LAB-2025-017', 'PAT-2025-0003', 'Kevin', 'Anderson', 'Child', '2025-09-13', 'pcr_batched', 'active', 'Buccal Swab', 'normal', 'BC017PAT', '{"case_type":"Paternity","volume":"3ml","concentration":"68ng/ul"}', NOW(), NOW()),
('LAB-2025-018', 'PAT-2025-0003', 'Laura', 'Anderson', 'Mother', '2025-09-13', 'pcr_batched', 'active', 'Buccal Swab', 'normal', 'BC018PAT', '{"case_type":"Paternity","volume":"3ml","concentration":"72ng/ul"}', NOW(), NOW()),
('LAB-2025-019', 'PAT-2025-0003', 'Brian', 'Anderson', 'Alleged Father', '2025-09-13', 'pcr_batched', 'active', 'Buccal Swab', 'normal', 'BC019PAT', '{"case_type":"Paternity","volume":"3ml","concentration":"70ng/ul"}', NOW(), NOW()),

-- Recent forensic case
('LAB-2025-020', 'FOR-2025-0008', 'Patricia', 'Lopez', 'Evidence', '2025-09-13', 'sample_collected', 'active', 'Blood', 'high', 'BC020FOR', '{"case_type":"Forensic","forensic_priority":"high","volume":"2ml","concentration":"52ng/ul"}', NOW(), NOW());