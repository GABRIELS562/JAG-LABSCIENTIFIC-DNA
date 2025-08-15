-- ISO 17025:2017 Compliance Database Schema
-- Laboratory Information Management System
-- This schema implements requirements for ISO 17025 accreditation

-- =====================================================
-- DOCUMENT CONTROL SYSTEM (ISO 17025 Section 8.3)
-- =====================================================

-- Quality Documents Management
CREATE TABLE IF NOT EXISTS quality_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_number TEXT UNIQUE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'SOP', 'Work Instruction', 'Form', 'Policy', 
        'Procedure', 'Method', 'Manual', 'Record'
    )),
    title TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0',
    effective_date DATE NOT NULL,
    review_date DATE NOT NULL,
    next_review_date DATE,
    department TEXT,
    owner_id INTEGER,
    owner_name TEXT NOT NULL,
    approved_by_id INTEGER,
    approved_by_name TEXT NOT NULL,
    approval_date DATE,
    file_path TEXT,
    file_hash TEXT, -- For integrity verification
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Under Review', 'Active', 'Obsolete')),
    distribution_list TEXT, -- JSON array of users/departments
    change_history TEXT, -- JSON array of changes
    keywords TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Document Review Records
CREATE TABLE IF NOT EXISTS document_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    review_date DATE NOT NULL,
    reviewer_id INTEGER NOT NULL,
    reviewer_name TEXT NOT NULL,
    review_outcome TEXT CHECK (review_outcome IN ('Approved', 'Rejected', 'Needs Revision')),
    comments TEXT,
    changes_made TEXT,
    new_version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES quality_documents(id)
);

-- =====================================================
-- NON-CONFORMANCE MANAGEMENT (ISO 17025 Section 7.10)
-- =====================================================

CREATE TABLE IF NOT EXISTS non_conformances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nc_number TEXT UNIQUE NOT NULL,
    detected_date DATE NOT NULL,
    detected_by_id INTEGER,
    detected_by_name TEXT NOT NULL,
    source TEXT CHECK (source IN (
        'Internal Audit', 'External Audit', 'Customer Complaint', 
        'Quality Control', 'Staff Observation', 'Management Review'
    )),
    category TEXT CHECK (category IN (
        'Documentation', 'Process', 'Equipment', 'Personnel', 
        'Environment', 'Sample', 'Result', 'Other'
    )),
    severity TEXT CHECK (severity IN ('Critical', 'Major', 'Minor', 'Observation')),
    sample_id INTEGER,
    batch_id INTEGER,
    equipment_id INTEGER,
    description TEXT NOT NULL,
    immediate_action TEXT,
    root_cause_analysis TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    responsible_person_id INTEGER,
    responsible_person_name TEXT,
    target_completion_date DATE,
    actual_completion_date DATE,
    verification_date DATE,
    verified_by_id INTEGER,
    verified_by_name TEXT,
    effectiveness_review TEXT,
    status TEXT DEFAULT 'Open' CHECK (status IN (
        'Open', 'Under Investigation', 'Corrective Action Planned',
        'Corrective Action Implemented', 'Verification Pending', 'Closed'
    )),
    recurrence_prevention TEXT,
    cost_impact DECIMAL(10,2),
    attachments TEXT, -- JSON array of file paths
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sample_id) REFERENCES samples(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- =====================================================
-- EQUIPMENT MANAGEMENT (ISO 17025 Section 6.4)
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    asset_number TEXT,
    category TEXT CHECK (category IN (
        'Analytical', 'General Lab', 'IT', 'Facility', 
        'Safety', 'Measuring', 'Reference'
    )),
    location TEXT,
    purchase_date DATE,
    commissioning_date DATE,
    warranty_expiry DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN (
        'Active', 'Inactive', 'Under Maintenance', 
        'Under Calibration', 'Out of Service', 'Retired'
    )),
    critical_equipment BOOLEAN DEFAULT FALSE,
    software_version TEXT,
    firmware_version TEXT,
    responsible_person TEXT,
    cost DECIMAL(10,2),
    supplier TEXT,
    supplier_contact TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Calibration Records
CREATE TABLE IF NOT EXISTS calibrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    calibration_date DATE NOT NULL,
    next_calibration_date DATE NOT NULL,
    calibration_type TEXT CHECK (calibration_type IN (
        'Initial', 'Routine', 'After Repair', 'Special'
    )),
    performed_by TEXT NOT NULL,
    certificate_number TEXT,
    calibration_agency TEXT,
    temperature REAL,
    humidity REAL,
    results TEXT, -- JSON with calibration data
    pass_fail TEXT CHECK (pass_fail IN ('Pass', 'Fail', 'Conditional')),
    uncertainty TEXT,
    traceability TEXT,
    standards_used TEXT,
    deviation_found TEXT,
    action_taken TEXT,
    cost DECIMAL(10,2),
    attachments TEXT, -- JSON array of certificate paths
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

-- Maintenance Records
CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    maintenance_date DATE NOT NULL,
    maintenance_type TEXT CHECK (maintenance_type IN (
        'Preventive', 'Corrective', 'Emergency', 'Upgrade'
    )),
    description TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    parts_replaced TEXT,
    cost DECIMAL(10,2),
    downtime_hours REAL,
    next_maintenance_date DATE,
    status TEXT CHECK (status IN ('Completed', 'Pending', 'In Progress')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

-- =====================================================
-- PROFICIENCY TESTING (ISO 17025 Section 7.7.2)
-- =====================================================

CREATE TABLE IF NOT EXISTS proficiency_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pt_number TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL,
    scheme_name TEXT NOT NULL,
    test_type TEXT,
    matrix TEXT,
    parameters TEXT, -- JSON array
    receipt_date DATE,
    analysis_date DATE,
    submission_date DATE,
    result_date DATE,
    assigned_value TEXT,
    reported_value TEXT,
    z_score REAL,
    performance TEXT CHECK (performance IN (
        'Satisfactory', 'Questionable', 'Unsatisfactory', 'Pending'
    )),
    analyst_id INTEGER,
    analyst_name TEXT,
    reviewed_by TEXT,
    corrective_action TEXT,
    comments TEXT,
    report_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRAINING RECORDS (ISO 17025 Section 6.2)
-- =====================================================

CREATE TABLE IF NOT EXISTS training_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    training_type TEXT CHECK (training_type IN (
        'Initial', 'Refresher', 'New Method', 'Safety', 
        'Quality', 'Software', 'Equipment', 'Other'
    )),
    training_title TEXT NOT NULL,
    description TEXT,
    provider TEXT,
    trainer TEXT,
    training_date DATE NOT NULL,
    duration_hours REAL,
    assessment_method TEXT,
    assessment_result TEXT CHECK (assessment_result IN (
        'Pass', 'Fail', 'Not Assessed', 'In Progress'
    )),
    certificate_number TEXT,
    certificate_expiry DATE,
    competency_achieved TEXT,
    next_training_date DATE,
    cost DECIMAL(10,2),
    attachments TEXT, -- JSON array of certificate paths
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- METHOD VALIDATION (ISO 17025 Section 7.2)
-- =====================================================

CREATE TABLE IF NOT EXISTS method_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method_id TEXT UNIQUE NOT NULL,
    method_name TEXT NOT NULL,
    method_type TEXT CHECK (method_type IN (
        'Standard', 'Modified', 'In-House', 'Rapid'
    )),
    validation_date DATE NOT NULL,
    validated_by TEXT NOT NULL,
    parameters_validated TEXT, -- JSON array
    accuracy TEXT,
    precision TEXT,
    linearity TEXT,
    range TEXT,
    lod TEXT, -- Limit of Detection
    loq TEXT, -- Limit of Quantification
    specificity TEXT,
    robustness TEXT,
    measurement_uncertainty TEXT,
    acceptance_criteria TEXT,
    validation_report_path TEXT,
    approval_status TEXT CHECK (approval_status IN (
        'Pending', 'Approved', 'Rejected', 'Conditional'
    )),
    approved_by TEXT,
    approval_date DATE,
    review_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INTERNAL AUDITS (ISO 17025 Section 8.8)
-- =====================================================

CREATE TABLE IF NOT EXISTS internal_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_number TEXT UNIQUE NOT NULL,
    audit_date DATE NOT NULL,
    audit_type TEXT CHECK (audit_type IN (
        'Full System', 'Partial', 'Process', 'Witness', 'Follow-up'
    )),
    scope TEXT NOT NULL,
    lead_auditor TEXT NOT NULL,
    audit_team TEXT, -- JSON array
    departments_audited TEXT, -- JSON array
    standards_referenced TEXT,
    findings_summary TEXT,
    total_nonconformities INTEGER DEFAULT 0,
    critical_findings INTEGER DEFAULT 0,
    major_findings INTEGER DEFAULT 0,
    minor_findings INTEGER DEFAULT 0,
    observations INTEGER DEFAULT 0,
    report_date DATE,
    report_path TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    status TEXT CHECK (status IN (
        'Planned', 'In Progress', 'Completed', 'Follow-up Required', 'Closed'
    )),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MANAGEMENT REVIEW (ISO 17025 Section 8.9)
-- =====================================================

CREATE TABLE IF NOT EXISTS management_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_date DATE NOT NULL,
    review_period TEXT,
    attendees TEXT, -- JSON array
    agenda TEXT,
    inputs_reviewed TEXT, -- JSON of topics covered
    decisions_made TEXT,
    actions_identified TEXT, -- JSON array
    resources_needed TEXT,
    quality_objectives_review TEXT,
    customer_feedback_summary TEXT,
    internal_audit_summary TEXT,
    corrective_actions_summary TEXT,
    proficiency_testing_summary TEXT,
    staff_feedback TEXT,
    improvement_opportunities TEXT,
    next_review_date DATE,
    minutes_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MEASUREMENT UNCERTAINTY (ISO 17025 Section 7.6)
-- =====================================================

CREATE TABLE IF NOT EXISTS measurement_uncertainties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_method TEXT NOT NULL,
    parameter TEXT NOT NULL,
    matrix TEXT,
    uncertainty_value TEXT NOT NULL,
    coverage_factor REAL DEFAULT 2.0,
    confidence_level TEXT DEFAULT '95%',
    calculation_method TEXT,
    components TEXT, -- JSON of uncertainty components
    validation_date DATE,
    validated_by TEXT,
    review_date DATE,
    reviewed_by TEXT,
    reference_document TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_method, parameter, matrix)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON quality_documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON quality_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_nc_status ON non_conformances(status);
CREATE INDEX IF NOT EXISTS idx_nc_date ON non_conformances(detected_date);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_calibration_date ON calibrations(next_calibration_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_records(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_training_user ON training_records(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON internal_audits(audit_date);