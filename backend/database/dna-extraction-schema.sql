-- DNA Extraction Schema Extension for LabScientific LIMS
-- Adds DNA extraction workflow between sample collection and PCR

PRAGMA foreign_keys = ON;

-- DNA Extraction Batches Table
CREATE TABLE IF NOT EXISTS extraction_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT UNIQUE NOT NULL, -- Format: EXT_001, EXT_002, etc.
    operator TEXT NOT NULL,
    extraction_date DATE NOT NULL,
    extraction_method TEXT NOT NULL CHECK (extraction_method IN ('QIAamp', 'Chelex', 'PrepFiler', 'Organic', 'Magnetic Bead')),
    kit_lot_number TEXT NOT NULL,
    kit_expiry_date DATE,
    plate_layout TEXT, -- JSON string for 96-well plate configuration
    total_samples INTEGER DEFAULT 0,
    lysis_time INTEGER, -- minutes
    lysis_temperature REAL, -- celsius
    incubation_time INTEGER, -- minutes
    centrifuge_speed INTEGER, -- rpm
    centrifuge_time INTEGER, -- minutes
    elution_volume INTEGER, -- microliters
    quality_control_passed BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'lysis', 'incubation', 'centrifuge', 'elution', 'quantification', 'completed', 'failed')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DNA Extraction Results Table (for each sample)
CREATE TABLE IF NOT EXISTS extraction_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraction_batch_id INTEGER NOT NULL,
    sample_id INTEGER NOT NULL,
    well_position TEXT NOT NULL, -- A01, B02, etc.
    dna_concentration REAL, -- ng/μL
    purity_260_280 REAL, -- A260/A280 ratio
    purity_260_230 REAL, -- A260/A230 ratio
    volume_recovered INTEGER, -- microliters
    quality_assessment TEXT CHECK (quality_assessment IN ('Good', 'Degraded', 'Failed', 'Inhibited')),
    quantification_method TEXT CHECK (quantification_method IN ('NanoDrop', 'Qubit', 'PicoGreen', 'Agarose Gel')),
    extraction_efficiency REAL, -- percentage
    inhibition_detected BOOLEAN DEFAULT FALSE,
    reextraction_required BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extraction_batch_id) REFERENCES extraction_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
    UNIQUE(extraction_batch_id, well_position)
);

-- DNA Extraction Quality Control
CREATE TABLE IF NOT EXISTS extraction_quality_control (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraction_batch_id INTEGER NOT NULL,
    control_type TEXT NOT NULL CHECK (control_type IN ('Positive Control', 'Negative Control', 'Extraction Blank', 'Inhibition Control')),
    well_position TEXT NOT NULL,
    expected_result TEXT,
    actual_result TEXT,
    result_status TEXT CHECK (result_status IN ('Pass', 'Fail', 'Warning')),
    dna_concentration REAL,
    purity_260_280 REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extraction_batch_id) REFERENCES extraction_batches(id) ON DELETE CASCADE
);

-- Reagent Tracking Table
CREATE TABLE IF NOT EXISTS extraction_reagents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraction_batch_id INTEGER NOT NULL,
    reagent_name TEXT NOT NULL,
    lot_number TEXT NOT NULL,
    expiry_date DATE,
    volume_used REAL, -- mL
    supplier TEXT,
    storage_temperature TEXT,
    notes TEXT,
    FOREIGN KEY (extraction_batch_id) REFERENCES extraction_batches(id) ON DELETE CASCADE
);

-- Update samples table workflow_status to include extraction stages
-- Note: This would be an ALTER TABLE in a migration, but showing the extended enum
-- Current workflow: sample_collected → extraction_ready → extraction_batched → 
--                   extraction_completed → pcr_ready → pcr_batched → etc.

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_extraction_batches_batch_number ON extraction_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_extraction_batches_operator ON extraction_batches(operator);
CREATE INDEX IF NOT EXISTS idx_extraction_batches_status ON extraction_batches(status);
CREATE INDEX IF NOT EXISTS idx_extraction_batches_extraction_date ON extraction_batches(extraction_date);

CREATE INDEX IF NOT EXISTS idx_extraction_results_batch_id ON extraction_results(extraction_batch_id);
CREATE INDEX IF NOT EXISTS idx_extraction_results_sample_id ON extraction_results(sample_id);
CREATE INDEX IF NOT EXISTS idx_extraction_results_quality ON extraction_results(quality_assessment);

CREATE INDEX IF NOT EXISTS idx_extraction_qc_batch_id ON extraction_quality_control(extraction_batch_id);
CREATE INDEX IF NOT EXISTS idx_extraction_qc_result ON extraction_quality_control(result_status);

CREATE INDEX IF NOT EXISTS idx_extraction_reagents_batch_id ON extraction_reagents(extraction_batch_id);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_extraction_batches_timestamp 
    AFTER UPDATE ON extraction_batches
    BEGIN
        UPDATE extraction_batches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Sample data for demonstration
INSERT OR IGNORE INTO extraction_batches 
(batch_number, operator, extraction_date, extraction_method, kit_lot_number, kit_expiry_date, total_samples, status) 
VALUES 
('EXT_001', 'Lab Technician A', date('now'), 'QIAamp', 'QIA2024001', date('now', '+1 year'), 0, 'active'),
('EXT_002', 'Lab Technician B', date('now', '-1 day'), 'PrepFiler', 'PF2024002', date('now', '+8 months'), 24, 'completed');