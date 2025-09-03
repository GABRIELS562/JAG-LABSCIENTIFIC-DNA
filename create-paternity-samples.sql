-- Create 10 paternity test samples that will automatically flow through the workflow
-- These will be picked up by the SampleWorkflowProgressor and move every 10 seconds

-- Clear existing PAT-2025 samples first
DELETE FROM samples WHERE case_number LIKE 'PAT-2025-%';

-- Insert 10 paternity samples at different workflow stages
INSERT INTO samples (lab_number, name, surname, relation, case_number, sample_type, workflow_status, created_at)
VALUES 
-- 2 samples ready for PCR
('PAT-LAB-001', 'John', 'Smith', 'Father', 'PAT-2025-001', 'buccal_swab', 'pcr_ready', datetime('now')),
('PAT-LAB-002', 'Jane', 'Smith', 'Mother', 'PAT-2025-001', 'buccal_swab', 'pcr_ready', datetime('now')),

-- 2 samples in PCR batch
('PAT-LAB-003', 'Michael', 'Johnson', 'Alleged Father', 'PAT-2025-002', 'blood', 'pcr_batched', datetime('now')),
('PAT-LAB-004', 'Sarah', 'Johnson', 'Child', 'PAT-2025-002', 'blood', 'pcr_batched', datetime('now')),

-- 2 samples ready for electrophoresis
('PAT-LAB-005', 'Robert', 'Williams', 'Father', 'PAT-2025-003', 'saliva', 'electro_ready', datetime('now')),
('PAT-LAB-006', 'Emily', 'Williams', 'Child', 'PAT-2025-003', 'saliva', 'electro_ready', datetime('now')),

-- 2 samples in electrophoresis
('PAT-LAB-007', 'David', 'Brown', 'Alleged Father', 'PAT-2025-004', 'buccal_swab', 'electro_batched', datetime('now')),
('PAT-LAB-008', 'Lisa', 'Brown', 'Mother', 'PAT-2025-004', 'buccal_swab', 'electro_batched', datetime('now')),

-- 2 samples ready for analysis
('PAT-LAB-009', 'James', 'Davis', 'Father', 'PAT-2025-005', 'blood', 'analysis_ready', datetime('now')),
('PAT-LAB-010', 'Maria', 'Davis', 'Child', 'PAT-2025-005', 'blood', 'analysis_ready', datetime('now'));

-- Show the initial distribution
SELECT '🧬 Initial Paternity Sample Distribution:' as title;
SELECT 
  workflow_status, 
  COUNT(*) as count,
  GROUP_CONCAT(lab_number) as samples
FROM samples
WHERE case_number LIKE 'PAT-2025-%'
GROUP BY workflow_status
ORDER BY 
  CASE workflow_status
    WHEN 'sample_collected' THEN 1
    WHEN 'pcr_ready' THEN 2
    WHEN 'pcr_batched' THEN 3
    WHEN 'pcr_completed' THEN 4
    WHEN 'electro_ready' THEN 5
    WHEN 'electro_batched' THEN 6
    WHEN 'electro_completed' THEN 7
    WHEN 'analysis_ready' THEN 8
    WHEN 'analysis_completed' THEN 9
    WHEN 'report_ready' THEN 10
    WHEN 'report_sent' THEN 11
  END;

-- Show all paternity samples
SELECT '📊 All Paternity Test Samples:' as title;
SELECT 
  id, 
  lab_number, 
  name || ' ' || surname || ' (' || relation || ')' as full_name, 
  workflow_status,
  case_number
FROM samples
WHERE case_number LIKE 'PAT-2025-%'
ORDER BY case_number, id;