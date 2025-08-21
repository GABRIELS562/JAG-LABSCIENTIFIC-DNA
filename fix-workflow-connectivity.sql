-- LIMS Workflow Connectivity Fix Script
-- This script creates samples at missing workflow stages to enable complete workflow testing

-- First, let's see current distribution
SELECT 'Current Status Distribution:' as info;
SELECT workflow_status, COUNT(*) as count 
FROM samples 
GROUP BY workflow_status 
ORDER BY workflow_status;

-- Create samples ready for DNA extraction (sample_collected status)
UPDATE samples 
SET workflow_status = 'sample_collected'
WHERE id IN (
  SELECT id FROM samples 
  WHERE workflow_status = 'pcr_completed' 
  LIMIT 5
);

-- Create samples ready for PCR processing (dna_extracted status) 
UPDATE samples
SET workflow_status = 'dna_extracted'
WHERE id IN (
  SELECT id FROM samples
  WHERE workflow_status = 'electro_completed'
  LIMIT 4
);

-- Create samples in intermediate processing states
UPDATE samples 
SET workflow_status = 'in_electrophoresis'
WHERE id IN (
  SELECT id FROM samples
  WHERE workflow_status = 'analysis_completed'
  LIMIT 3
);

UPDATE samples
SET workflow_status = 'in_analysis' 
WHERE id IN (
  SELECT id FROM samples
  WHERE workflow_status = 'analysis_completed'
  LIMIT 2
  OFFSET 3
);

-- Show new distribution
SELECT 'New Status Distribution:' as info;
SELECT workflow_status, COUNT(*) as count
FROM samples
GROUP BY workflow_status
ORDER BY 
  CASE workflow_status
    WHEN 'registered' THEN 1
    WHEN 'sample_collected' THEN 2  
    WHEN 'dna_extracted' THEN 3
    WHEN 'in_pcr' THEN 4
    WHEN 'pcr_completed' THEN 5
    WHEN 'in_electrophoresis' THEN 6
    WHEN 'electro_completed' THEN 7
    WHEN 'in_analysis' THEN 8
    WHEN 'analysis_completed' THEN 9
    WHEN 'report_generated' THEN 10
    ELSE 11
  END;

-- Show sample details for testing
SELECT 'Samples Ready for DNA Extraction:' as info;
SELECT id, lab_number, name, surname, case_number, workflow_status
FROM samples 
WHERE workflow_status = 'sample_collected'
ORDER BY lab_number;

SELECT 'Samples Ready for PCR:' as info;
SELECT id, lab_number, name, surname, case_number, workflow_status  
FROM samples
WHERE workflow_status = 'dna_extracted'
ORDER BY lab_number;

SELECT 'Samples Ready for Electrophoresis:' as info;
SELECT id, lab_number, name, surname, case_number, workflow_status
FROM samples
WHERE workflow_status = 'pcr_completed'  
ORDER BY lab_number
LIMIT 10;

-- Summary
SELECT 'WORKFLOW TESTING SUMMARY:' as summary;
SELECT 
  'DNA Extraction Queue: ' || COUNT(*) as queue_status
FROM samples WHERE workflow_status = 'sample_collected'
UNION ALL
SELECT 
  'PCR Queue: ' || COUNT(*) 
FROM samples WHERE workflow_status = 'dna_extracted'
UNION ALL  
SELECT
  'Electrophoresis Queue: ' || COUNT(*)
FROM samples WHERE workflow_status = 'pcr_completed'
UNION ALL
SELECT
  'Analysis Queue: ' || COUNT(*) 
FROM samples WHERE workflow_status = 'electro_completed'
UNION ALL
SELECT
  'In Progress: ' || COUNT(*)
FROM samples WHERE workflow_status IN ('in_pcr', 'in_electrophoresis', 'in_analysis');