-- Performance optimization indexes for LabScientific LIMS
-- This file contains additional indexes beyond the basic ones in schema.sql

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_samples_workflow_case_date ON samples(workflow_status, case_number, collection_date DESC);
CREATE INDEX IF NOT EXISTS idx_samples_batch_status ON samples(batch_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_samples_relation_case ON samples(relation, case_number);
CREATE INDEX IF NOT EXISTS idx_samples_date_range ON samples(collection_date, submission_date);

-- Test cases performance indexes
CREATE INDEX IF NOT EXISTS idx_test_cases_client_date ON test_cases(client_type, submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_test_cases_status_date ON test_cases(status, created_at DESC);

-- Batches optimization
CREATE INDEX IF NOT EXISTS idx_batches_operator_date ON batches(operator, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_status_pcr_date ON batches(status, pcr_date DESC);
CREATE INDEX IF NOT EXISTS idx_batches_electro_date ON batches(electro_date DESC) WHERE electro_date IS NOT NULL;

-- Well assignments for plate queries
CREATE INDEX IF NOT EXISTS idx_well_assignments_batch_position ON well_assignments(batch_id, well_position);
CREATE INDEX IF NOT EXISTS idx_well_assignments_sample_type ON well_assignments(sample_id, well_type);

-- Quality control indexes
CREATE INDEX IF NOT EXISTS idx_quality_control_date_result ON quality_control(date DESC, result);
CREATE INDEX IF NOT EXISTS idx_quality_control_operator_date ON quality_control(operator, date DESC);

-- Equipment maintenance tracking
CREATE INDEX IF NOT EXISTS idx_equipment_calibration_due ON equipment(next_calibration ASC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_equipment_type_status ON equipment(type, status);

-- Reports performance
CREATE INDEX IF NOT EXISTS idx_reports_type_date ON reports(report_type, date_generated DESC);
CREATE INDEX IF NOT EXISTS idx_reports_case_status ON reports(case_id, status);

-- Genetic analysis performance indexes
CREATE INDEX IF NOT EXISTS idx_genetic_cases_type_status ON genetic_cases(case_type, status, created_date DESC);
CREATE INDEX IF NOT EXISTS idx_genetic_samples_case_type ON genetic_samples(case_id, sample_type);
CREATE INDEX IF NOT EXISTS idx_str_profiles_sample_locus ON str_profiles(sample_id, locus);
CREATE INDEX IF NOT EXISTS idx_genetic_analysis_results_case ON genetic_analysis_results(case_id, created_date DESC);

-- Audit and logging indexes
CREATE INDEX IF NOT EXISTS idx_genetic_file_audit_sample_date ON genetic_file_audit(sample_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_genetic_qc_metrics_sample ON genetic_qc_metrics(sample_id, metric_name);

-- Osiris queue performance
CREATE INDEX IF NOT EXISTS idx_osiris_queue_status_priority ON osiris_analysis_queue(status, priority DESC, submitted_date ASC);
CREATE INDEX IF NOT EXISTS idx_osiris_queue_case_status ON osiris_analysis_queue(case_id, status);

-- Optimize for dashboard queries
CREATE INDEX IF NOT EXISTS idx_samples_dashboard_counts ON samples(status, workflow_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_dashboard_status ON batches(status, created_at DESC);

-- Text search optimization (for SQLite FTS if needed)
-- Note: These would be implemented as triggers in a real FTS scenario
CREATE INDEX IF NOT EXISTS idx_samples_name_search ON samples(name COLLATE NOCASE, surname COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_test_cases_number_search ON test_cases(case_number COLLATE NOCASE);

-- Partial indexes for active records (more efficient)
CREATE INDEX IF NOT EXISTS idx_samples_active_workflow ON samples(workflow_status, updated_at DESC) 
  WHERE status != 'cancelled' AND status != 'completed';

CREATE INDEX IF NOT EXISTS idx_batches_active ON batches(status, created_at DESC) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_due ON equipment(next_calibration ASC) 
  WHERE status = 'active' AND next_calibration <= date('now', '+30 days');

-- Statistics and reporting optimization
CREATE INDEX IF NOT EXISTS idx_samples_monthly_stats ON samples(
  strftime('%Y-%m', created_at), 
  status, 
  workflow_status
);

CREATE INDEX IF NOT EXISTS idx_genetic_cases_monthly ON genetic_cases(
  strftime('%Y-%m', created_date),
  case_type,
  status
);

-- Performance views for common queries
CREATE VIEW IF NOT EXISTS sample_summary AS
SELECT 
  s.id,
  s.lab_number,
  s.name,
  s.surname,
  s.relation,
  s.workflow_status,
  s.status,
  s.collection_date,
  tc.case_number,
  tc.client_type,
  b.batch_number,
  b.operator as batch_operator
FROM samples s
LEFT JOIN test_cases tc ON s.case_id = tc.id
LEFT JOIN batches b ON s.batch_id = b.id;

CREATE VIEW IF NOT EXISTS workflow_queue_summary AS
SELECT 
  workflow_status,
  COUNT(*) as count,
  MIN(collection_date) as oldest_sample,
  MAX(collection_date) as newest_sample
FROM samples 
WHERE status NOT IN ('cancelled', 'completed')
GROUP BY workflow_status;

CREATE VIEW IF NOT EXISTS batch_progress_summary AS
SELECT 
  b.id,
  b.batch_number,
  b.operator,
  b.status as batch_status,
  b.pcr_date,
  b.electro_date,
  COUNT(s.id) as total_samples,
  COUNT(CASE WHEN s.workflow_status IN ('pcr_completed', 'electro_ready', 'electro_batched', 'electro_completed', 'analysis_ready', 'analysis_completed', 'report_ready', 'report_sent') THEN 1 END) as pcr_completed_samples,
  COUNT(CASE WHEN s.workflow_status IN ('electro_completed', 'analysis_ready', 'analysis_completed', 'report_ready', 'report_sent') THEN 1 END) as electro_completed_samples
FROM batches b
LEFT JOIN samples s ON b.id = s.batch_id
WHERE b.status = 'active'
GROUP BY b.id, b.batch_number, b.operator, b.status, b.pcr_date, b.electro_date;

-- ANALYZE to update SQLite query planner statistics
ANALYZE;