-- LIMS Workflow Connectivity Fix Script v2
-- Using the correct workflow statuses from database constraints

-- Valid workflow statuses from database constraint:
-- 'sample_collected', 'extraction_ready', 'extraction_in_progress',
-- 'extraction_batched', 'extraction_completed', 'pcr_ready', 'pcr_batched', 
-- 'pcr_completed', 'electro_ready', 'electro_batched', 'electro_completed',
-- 'analysis_ready', 'analysis_completed', 'report_ready', 'report_sent'

-- Create more samples ready for DNA extraction (sample_collected -> extraction_ready)
UPDATE samples 
SET workflow_status = 'extraction_ready'
WHERE id IN (
  SELECT id FROM samples 
  WHERE workflow_status = 'electro_completed' 
  LIMIT 4
);

-- Create samples ready for PCR processing (extraction_completed -> pcr_ready)
UPDATE samples
SET workflow_status = 'pcr_ready'
WHERE id IN (
  SELECT id FROM samples
  WHERE workflow_status = 'analysis_completed'
  LIMIT 3
);

-- Create samples in intermediate processing states
UPDATE samples 
SET workflow_status = 'extraction_in_progress'
WHERE id IN (
  SELECT id FROM samples
  WHERE workflow_status = 'analysis_completed'
  LIMIT 2
  OFFSET 3
);

-- Create some electro-ready samples
UPDATE samples
SET workflow_status = 'electro_ready' 
WHERE id IN (
  SELECT id FROM samples
  WHERE workflow_status = 'analysis_completed'
  LIMIT 3
  OFFSET 5
);

-- Show new distribution
SELECT 'UPDATED WORKFLOW DISTRIBUTION:' as header;
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
    ELSE 16
  END;

-- Show samples for each workflow stage testing
SELECT 'SAMPLES FOR DNA EXTRACTION (extraction_ready):' as stage;
SELECT id, lab_number, name, surname, case_number
FROM samples 
WHERE workflow_status = 'extraction_ready'
ORDER BY lab_number;

SELECT 'SAMPLES FOR PCR (pcr_ready):' as stage;
SELECT id, lab_number, name, surname, case_number
FROM samples
WHERE workflow_status = 'pcr_ready'
ORDER BY lab_number;

SELECT 'SAMPLES FOR ELECTROPHORESIS (pcr_completed):' as stage;
SELECT id, lab_number, name, surname, case_number
FROM samples
WHERE workflow_status = 'pcr_completed'
ORDER BY lab_number
LIMIT 5;

SELECT 'SAMPLES FOR ANALYSIS (electro_completed):' as stage;
SELECT id, lab_number, name, surname, case_number
FROM samples
WHERE workflow_status = 'electro_completed'
ORDER BY lab_number  
LIMIT 5;

-- Final summary for testing
SELECT '=== WORKFLOW QUEUE SUMMARY ===' as summary;
SELECT 'Ready for Collection: ' || COUNT(*) as status FROM samples WHERE workflow_status = 'sample_collected'
UNION ALL
SELECT 'Ready for DNA Extraction: ' || COUNT(*) FROM samples WHERE workflow_status = 'extraction_ready'
UNION ALL  
SELECT 'DNA Extraction in Progress: ' || COUNT(*) FROM samples WHERE workflow_status = 'extraction_in_progress'
UNION ALL
SELECT 'Ready for PCR: ' || COUNT(*) FROM samples WHERE workflow_status = 'pcr_ready'
UNION ALL
SELECT 'PCR Completed (ready for Electro): ' || COUNT(*) FROM samples WHERE workflow_status = 'pcr_completed'
UNION ALL
SELECT 'Ready for Electrophoresis: ' || COUNT(*) FROM samples WHERE workflow_status = 'electro_ready'
UNION ALL
SELECT 'Electro Completed (ready for Analysis): ' || COUNT(*) FROM samples WHERE workflow_status = 'electro_completed'
UNION ALL
SELECT 'Analysis Completed: ' || COUNT(*) FROM samples WHERE workflow_status = 'analysis_completed';