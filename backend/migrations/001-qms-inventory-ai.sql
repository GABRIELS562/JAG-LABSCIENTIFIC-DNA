-- Migration: Quality Management System, Inventory Management, and AI/ML Features
-- Date: 2025-08-20
-- Version: 1.0.0

-- Quality Management System (QMS) Tables

-- 1. CAPA (Corrective/Preventive Actions) System
CREATE TABLE IF NOT EXISTS capa_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  capa_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT CHECK(type IN ('corrective', 'preventive', 'improvement')) NOT NULL,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('open', 'in_progress', 'pending_verification', 'completed', 'closed')) DEFAULT 'open',
  source TEXT, -- complaint, audit, inspection, internal review, etc.
  root_cause_analysis TEXT,
  action_plan TEXT,
  responsible_person TEXT NOT NULL,
  due_date DATE,
  completion_date DATE,
  verification_method TEXT,
  effectiveness_check TEXT,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approval_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Equipment Calibration Schedule
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_name TEXT NOT NULL,
  equipment_id TEXT UNIQUE NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  department TEXT,
  category TEXT, -- thermocycler, sequencer, centrifuge, etc.
  status TEXT CHECK(status IN ('active', 'maintenance', 'retired', 'out_of_service')) DEFAULT 'active',
  purchase_date DATE,
  warranty_expiry DATE,
  calibration_frequency INTEGER DEFAULT 365, -- days
  maintenance_frequency INTEGER DEFAULT 30, -- days
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_calibrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  calibration_date DATE NOT NULL,
  next_calibration_date DATE NOT NULL,
  performed_by TEXT NOT NULL,
  calibration_type TEXT, -- internal, external, verification
  certificate_number TEXT,
  calibration_results TEXT, -- JSON with measurement results
  status TEXT CHECK(status IN ('passed', 'failed', 'conditional')) NOT NULL,
  notes TEXT,
  document_path TEXT, -- path to calibration certificate
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- 3. Document Control System
CREATE TABLE IF NOT EXISTS document_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES document_categories(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category_id INTEGER,
  document_type TEXT CHECK(document_type IN ('sop', 'policy', 'form', 'manual', 'certificate', 'report')) NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT CHECK(status IN ('draft', 'review', 'approved', 'active', 'obsolete')) DEFAULT 'draft',
  effective_date DATE,
  review_date DATE,
  next_review_date DATE,
  author TEXT NOT NULL,
  reviewer TEXT,
  approver TEXT,
  file_path TEXT,
  content TEXT, -- for text-based documents
  keywords TEXT, -- comma-separated keywords for search
  access_level TEXT CHECK(access_level IN ('public', 'internal', 'confidential', 'restricted')) DEFAULT 'internal',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES document_categories(id)
);

CREATE TABLE IF NOT EXISTS document_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 4. Training Records Management
CREATE TABLE IF NOT EXISTS training_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT, -- safety, quality, technical, regulatory
  type TEXT CHECK(type IN ('mandatory', 'optional', 'certification')) DEFAULT 'mandatory',
  duration_hours DECIMAL(4,2),
  validity_period_days INTEGER, -- how long certification is valid
  prerequisites TEXT, -- JSON array of prerequisite program IDs
  competency_requirements TEXT, -- JSON with required competencies
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_training (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL, -- reference to user/employee
  program_id INTEGER NOT NULL,
  completion_date DATE NOT NULL,
  score DECIMAL(5,2), -- percentage score if applicable
  instructor TEXT,
  certificate_number TEXT,
  certificate_expiry DATE,
  status TEXT CHECK(status IN ('completed', 'expired', 'in_progress')) DEFAULT 'completed',
  notes TEXT,
  file_path TEXT, -- path to certificate file
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE
);

-- Inventory Management System Tables

-- 5. Reagents and Consumables
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  rating DECIMAL(2,1) CHECK(rating >= 1 AND rating <= 5),
  status TEXT CHECK(status IN ('active', 'inactive', 'blocked')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id INTEGER,
  storage_conditions TEXT, -- temperature, humidity requirements
  safety_requirements TEXT, -- special handling requirements
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES inventory_categories(id)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  supplier_id INTEGER,
  unit_of_measure TEXT, -- ml, µl, units, etc.
  unit_cost DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  reorder_level INTEGER DEFAULT 10,
  maximum_stock_level INTEGER,
  storage_location TEXT,
  storage_conditions TEXT,
  safety_data_sheet_path TEXT,
  hazard_class TEXT,
  shelf_life_days INTEGER, -- default shelf life
  quality_control_required BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES inventory_categories(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS inventory_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  lot_number TEXT NOT NULL,
  supplier_lot_number TEXT,
  quantity_received INTEGER NOT NULL,
  quantity_available INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  received_date DATE NOT NULL,
  expiry_date DATE,
  manufactured_date DATE,
  received_by TEXT NOT NULL,
  quality_status TEXT CHECK(quality_status IN ('approved', 'quarantine', 'rejected', 'expired')) DEFAULT 'quarantine',
  certificate_analysis_path TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  UNIQUE(item_id, lot_number)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id INTEGER NOT NULL,
  transaction_type TEXT CHECK(transaction_type IN ('receipt', 'usage', 'adjustment', 'transfer', 'waste')) NOT NULL,
  quantity INTEGER NOT NULL, -- positive for receipts/adjustments in, negative for usage/waste
  reference_id TEXT, -- sample_id, batch_id, etc.
  reference_type TEXT, -- sample, batch, adjustment, etc.
  performed_by TEXT NOT NULL,
  reason TEXT,
  cost_per_unit DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE CASCADE
);

-- 6. Test Cost Calculations
CREATE TABLE IF NOT EXISTS test_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT, -- DNA, paternity, forensic, etc.
  base_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  turnaround_time_days INTEGER,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_reagent_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_type_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity_per_test DECIMAL(10,4) NOT NULL, -- amount used per test
  critical BOOLEAN DEFAULT FALSE, -- if this reagent is critical for the test
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_type_id) REFERENCES test_types(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  UNIQUE(test_type_id, item_id)
);

-- AI/ML Capabilities Tables

-- 7. Equipment Predictive Maintenance
CREATE TABLE IF NOT EXISTS equipment_sensors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  sensor_name TEXT NOT NULL,
  sensor_type TEXT, -- temperature, pressure, vibration, etc.
  unit TEXT,
  normal_range_min DECIMAL(10,4),
  normal_range_max DECIMAL(10,4),
  warning_threshold_min DECIMAL(10,4),
  warning_threshold_max DECIMAL(10,4),
  critical_threshold_min DECIMAL(10,4),
  critical_threshold_max DECIMAL(10,4),
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sensor_id INTEGER NOT NULL,
  reading_value DECIMAL(10,4) NOT NULL,
  reading_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  batch_id INTEGER, -- if reading is associated with a batch
  status TEXT CHECK(status IN ('normal', 'warning', 'critical')) DEFAULT 'normal',
  FOREIGN KEY (sensor_id) REFERENCES equipment_sensors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  prediction_type TEXT, -- failure, maintenance_due, calibration_due
  predicted_date DATE NOT NULL,
  confidence_score DECIMAL(5,4), -- 0-1 confidence score
  risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  recommendation TEXT,
  model_version TEXT,
  prediction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at DATETIME,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- 8. Quality Control Anomaly Detection
CREATE TABLE IF NOT EXISTS qc_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_name TEXT UNIQUE NOT NULL,
  pattern_type TEXT, -- trend, spike, drift, outlier
  description TEXT,
  detection_algorithm TEXT, -- statistical method used
  parameters TEXT, -- JSON with algorithm parameters
  sensitivity DECIMAL(5,4) DEFAULT 0.95,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qc_anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER,
  sample_id INTEGER,
  metric_type TEXT, -- peak_height, allele_quality, contamination, etc.
  anomaly_type TEXT, -- outlier, trend_shift, spike, drift
  severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  confidence_score DECIMAL(5,4), -- 0-1 confidence score
  detected_value DECIMAL(10,4),
  expected_value DECIMAL(10,4),
  threshold_value DECIMAL(10,4),
  pattern_id INTEGER,
  detection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT,
  review_date DATETIME,
  action_taken TEXT,
  false_positive BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (pattern_id) REFERENCES qc_patterns(id)
);

-- 9. Workflow Optimization
CREATE TABLE IF NOT EXISTS workflow_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_name TEXT UNIQUE NOT NULL,
  step_type TEXT, -- manual, automated, qc_check
  description TEXT,
  estimated_duration_minutes INTEGER,
  required_skills TEXT, -- JSON array of required skills
  equipment_required TEXT, -- JSON array of equipment IDs
  reagents_required TEXT, -- JSON array of reagent IDs
  predecessor_steps TEXT, -- JSON array of prerequisite step IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER,
  sample_id INTEGER,
  step_id INTEGER NOT NULL,
  operator TEXT,
  start_time DATETIME,
  end_time DATETIME,
  duration_minutes INTEGER,
  status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
  quality_score DECIMAL(5,2), -- 0-100 quality score
  efficiency_score DECIMAL(5,2), -- 0-100 efficiency score
  notes TEXT,
  issues_encountered TEXT, -- JSON array of issues
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (step_id) REFERENCES workflow_steps(id)
);

CREATE TABLE IF NOT EXISTS optimization_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  suggestion_type TEXT, -- schedule_optimization, resource_allocation, bottleneck_removal
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_estimate TEXT, -- JSON with estimated improvements
  implementation_effort TEXT CHECK(implementation_effort IN ('low', 'medium', 'high')) DEFAULT 'medium',
  confidence_score DECIMAL(5,4), -- 0-1 confidence score
  affected_steps TEXT, -- JSON array of workflow step IDs
  status TEXT CHECK(status IN ('pending', 'reviewed', 'approved', 'implemented', 'rejected')) DEFAULT 'pending',
  created_by TEXT DEFAULT 'AI_SYSTEM',
  reviewed_by TEXT,
  review_date DATETIME,
  implementation_date DATETIME,
  actual_impact TEXT, -- JSON with actual improvements after implementation
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Demand Forecasting
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER,
  test_type_id INTEGER,
  forecast_type TEXT CHECK(forecast_type IN ('item_demand', 'test_volume', 'resource_utilization')) NOT NULL,
  forecast_period TEXT, -- daily, weekly, monthly
  forecast_date DATE NOT NULL,
  predicted_value DECIMAL(10,2) NOT NULL,
  confidence_interval_lower DECIMAL(10,2),
  confidence_interval_upper DECIMAL(10,2),
  model_name TEXT,
  model_accuracy DECIMAL(5,4), -- 0-1 accuracy score
  actual_value DECIMAL(10,2), -- filled in after the fact
  forecast_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id),
  FOREIGN KEY (test_type_id) REFERENCES test_types(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_capa_status ON capa_actions(status);
CREATE INDEX IF NOT EXISTS idx_capa_due_date ON capa_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_calibrations_next_date ON equipment_calibrations(next_calibration_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_training_expiry ON employee_training(certificate_expiry);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_expiry ON inventory_lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_quality ON inventory_lots(quality_status);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(reading_timestamp);
CREATE INDEX IF NOT EXISTS idx_qc_anomalies_batch ON qc_anomalies(batch_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_batch ON workflow_executions(batch_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_date ON demand_forecasts(forecast_date);

-- Insert default data
INSERT OR IGNORE INTO document_categories (name, description) VALUES 
  ('Standard Operating Procedures', 'Laboratory SOPs and work instructions'),
  ('Quality Manual', 'Quality management system documentation'),
  ('Forms and Templates', 'Laboratory forms and templates'),
  ('Policies', 'Company and laboratory policies'),
  ('Training Materials', 'Training documents and materials'),
  ('Certificates', 'Calibration certificates and quality documents');

INSERT OR IGNORE INTO inventory_categories (name, description, storage_conditions) VALUES 
  ('PCR Reagents', 'Reagents for PCR amplification', '-20°C'),
  ('DNA Extraction', 'DNA extraction and purification reagents', '4°C to room temperature'),
  ('Electrophoresis', 'Gel electrophoresis consumables', 'Room temperature'),
  ('Standards and Controls', 'DNA standards and control samples', '-20°C to -80°C'),
  ('Consumables', 'General laboratory consumables', 'Room temperature'),
  ('Chemicals', 'Laboratory chemicals and solvents', 'As per SDS');

INSERT OR IGNORE INTO test_types (test_name, description, category, base_price, turnaround_time_days) VALUES 
  ('Paternity Test', 'DNA paternity testing using STR analysis', 'Paternity', 299.00, 5),
  ('Maternity Test', 'DNA maternity testing using STR analysis', 'Maternity', 299.00, 5),
  ('Sibling Test', 'DNA sibling relationship testing', 'Relationship', 399.00, 7),
  ('Grandparent Test', 'DNA grandparent relationship testing', 'Relationship', 449.00, 7),
  ('Y-Chromosome Test', 'Paternal lineage testing', 'Lineage', 349.00, 10);

INSERT OR IGNORE INTO training_programs (program_name, description, category, type, duration_hours, validity_period_days) VALUES 
  ('Laboratory Safety', 'Basic laboratory safety training', 'Safety', 'mandatory', 4.0, 365),
  ('Quality Management', 'ISO 17025 quality management principles', 'Quality', 'mandatory', 8.0, 730),
  ('DNA Extraction', 'DNA extraction techniques and protocols', 'Technical', 'mandatory', 6.0, 365),
  ('PCR and STR Analysis', 'PCR amplification and STR analysis', 'Technical', 'mandatory', 12.0, 365),
  ('Data Analysis and Interpretation', 'Genetic data analysis and interpretation', 'Technical', 'mandatory', 8.0, 365);

INSERT OR IGNORE INTO qc_patterns (pattern_name, pattern_type, description, detection_algorithm, sensitivity) VALUES 
  ('Peak Height Outlier', 'outlier', 'Detects unusually high or low peak heights', 'z_score', 0.95),
  ('Allelic Dropout', 'anomaly', 'Detects potential allelic dropout events', 'threshold', 0.98),
  ('Contamination Signal', 'spike', 'Detects potential sample contamination', 'statistical_process_control', 0.90),
  ('Quality Score Drift', 'trend', 'Detects gradual decline in quality scores', 'regression_analysis', 0.85);

INSERT OR IGNORE INTO workflow_steps (step_name, step_type, description, estimated_duration_minutes) VALUES 
  ('Sample Registration', 'manual', 'Register samples in LIMS system', 5),
  ('DNA Extraction', 'manual', 'Extract DNA from biological samples', 120),
  ('Quality Control Check', 'qc_check', 'Verify DNA quality and quantity', 15),
  ('PCR Setup', 'manual', 'Prepare PCR reactions', 60),
  ('PCR Amplification', 'automated', 'Thermal cycling for DNA amplification', 180),
  ('Electrophoresis Prep', 'manual', 'Prepare samples for electrophoresis', 30),
  ('Capillary Electrophoresis', 'automated', 'Run samples on genetic analyzer', 240),
  ('Data Analysis', 'manual', 'Analyze genetic data and generate results', 45),
  ('Quality Review', 'qc_check', 'Review results for quality and accuracy', 30),
  ('Report Generation', 'manual', 'Generate final laboratory report', 20);