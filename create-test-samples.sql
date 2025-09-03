-- Insert 10 test samples with different workflow stages for automatic flow
-- These samples will be processed automatically by the workflow automation

-- Sample 1-2: Ready for extraction
INSERT INTO samples (lab_number, name, surname, case_number, sample_type, workflow_status, created_at)
VALUES 
('LAB-2025-001', 'John', 'Doe', 'CASE-001', 'blood', 'extraction_ready', datetime('now')),
('LAB-2025-002', 'Jane', 'Smith', 'CASE-001', 'saliva', 'extraction_ready', datetime('now'));

-- Sample 3-4: In extraction process
INSERT INTO samples (lab_number, name, surname, case_number, sample_type, workflow_status, created_at)
VALUES 
('LAB-2025-003', 'Robert', 'Johnson', 'CASE-002', 'blood', 'extraction_in_progress', datetime('now')),
('LAB-2025-004', 'Maria', 'Garcia', 'CASE-002', 'buccal_swab', 'extraction_in_progress', datetime('now'));

-- Sample 5-6: Ready for PCR
INSERT INTO samples (lab_number, name, surname, case_number, sample_type, workflow_status, created_at)
VALUES 
('LAB-2025-005', 'Michael', 'Brown', 'CASE-003', 'blood', 'pcr_ready', datetime('now')),
('LAB-2025-006', 'Sarah', 'Davis', 'CASE-003', 'saliva', 'pcr_ready', datetime('now'));

-- Sample 7-8: Ready for electrophoresis
INSERT INTO samples (lab_number, name, surname, case_number, sample_type, workflow_status, created_at)
VALUES 
('LAB-2025-007', 'David', 'Wilson', 'CASE-004', 'blood', 'electro_ready', datetime('now')),
('LAB-2025-008', 'Emily', 'Martinez', 'CASE-004', 'buccal_swab', 'electro_ready', datetime('now'));

-- Sample 9-10: Ready for analysis
INSERT INTO samples (lab_number, name, surname, case_number, sample_type, workflow_status, created_at)
VALUES 
('LAB-2025-009', 'James', 'Anderson', 'CASE-005', 'blood', 'analysis_ready', datetime('now')),
('LAB-2025-010', 'Lisa', 'Taylor', 'CASE-005', 'saliva', 'analysis_ready', datetime('now'));

-- Show the distribution
SELECT 'Sample Distribution by Workflow Stage:' as title;
SELECT workflow_status, COUNT(*) as count
FROM samples
GROUP BY workflow_status
ORDER BY 
  CASE workflow_status
    WHEN 'sample_collected' THEN 1
    WHEN 'extraction_ready' THEN 2  
    WHEN 'extraction_in_progress' THEN 3
    WHEN 'extraction_batched' THEN 4
    WHEN 'extraction_completed' THEN 5
    WHEN 'pcr_ready' THEN 6
    WHEN 'pcr_batched' THEN 7
    WHEN 'pcr_completed' THEN 8
    WHEN 'electro_ready' THEN 9
    WHEN 'electro_batched' THEN 10
    WHEN 'electro_completed' THEN 11
    WHEN 'analysis_ready' THEN 12
    WHEN 'analysis_completed' THEN 13
    WHEN 'report_ready' THEN 14
    WHEN 'report_sent' THEN 15
  END;

-- Show all samples
SELECT 'All Samples:' as title;
SELECT id, lab_number, name || ' ' || surname as full_name, workflow_status
FROM samples
ORDER BY id;