-- Genetic Analysis Schema for SQLite (Paternity Testing)
-- Compatible with existing LIMS database structure

-- Cases table for paternity testing cases
CREATE TABLE IF NOT EXISTS genetic_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT UNIQUE NOT NULL,
    case_type TEXT DEFAULT 'paternity',
    status TEXT DEFAULT 'pending',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    analyst_id INTEGER,
    reviewer_id INTEGER,
    priority TEXT DEFAULT 'normal',
    notes TEXT
);

-- Genetic samples table
CREATE TABLE IF NOT EXISTS genetic_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id TEXT UNIQUE NOT NULL,
    case_id TEXT NOT NULL,
    sample_type TEXT NOT NULL, -- 'alleged_father', 'child', 'mother'
    file_path TEXT,
    original_filename TEXT,
    file_hash TEXT,
    collection_date DATE,
    received_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'received',
    quality_score REAL,
    instrument TEXT,
    kit TEXT,
    FOREIGN KEY (case_id) REFERENCES genetic_cases(case_id) ON DELETE CASCADE
);

-- STR profiles table for storing genetic markers
CREATE TABLE IF NOT EXISTS str_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id TEXT NOT NULL,
    locus TEXT NOT NULL,
    allele_1 TEXT,
    allele_2 TEXT,
    peak_height_1 INTEGER,
    peak_height_2 INTEGER,
    peak_area_1 INTEGER,
    peak_area_2 INTEGER,
    quality_flags TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sample_id) REFERENCES genetic_samples(sample_id) ON DELETE CASCADE,
    UNIQUE(sample_id, locus)
);

-- Analysis results table
CREATE TABLE IF NOT EXISTS genetic_analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    paternity_probability REAL,
    exclusion_probability REAL,
    matching_loci INTEGER,
    total_loci INTEGER,
    conclusion TEXT, -- 'inclusion', 'exclusion', 'inconclusive'
    analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    osiris_output_path TEXT,
    report_generated INTEGER DEFAULT 0,
    quality_score REAL,
    notes TEXT,
    FOREIGN KEY (case_id) REFERENCES genetic_cases(case_id) ON DELETE CASCADE
);

-- Loci comparison details
CREATE TABLE IF NOT EXISTS loci_comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL,
    locus TEXT NOT NULL,
    child_allele_1 TEXT,
    child_allele_2 TEXT,
    father_allele_1 TEXT,
    father_allele_2 TEXT,
    mother_allele_1 TEXT,
    mother_allele_2 TEXT,
    match_status INTEGER,
    mutation_indicator INTEGER DEFAULT 0,
    exclusion_power REAL,
    FOREIGN KEY (result_id) REFERENCES genetic_analysis_results(id) ON DELETE CASCADE
);

-- File processing audit trail
CREATE TABLE IF NOT EXISTS genetic_file_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'uploaded', 'processed', 'analyzed', 'approved'
    user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    ip_address TEXT,
    FOREIGN KEY (sample_id) REFERENCES genetic_samples(sample_id) ON DELETE CASCADE
);

-- Quality control metrics
CREATE TABLE IF NOT EXISTS genetic_qc_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    threshold_min REAL,
    threshold_max REAL,
    pass_status INTEGER,
    measured_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sample_id) REFERENCES genetic_samples(sample_id) ON DELETE CASCADE
);

-- Osiris analysis jobs queue
CREATE TABLE IF NOT EXISTS osiris_analysis_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    status TEXT DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
    priority INTEGER DEFAULT 5,
    submitted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_date DATETIME,
    completed_date DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    FOREIGN KEY (case_id) REFERENCES genetic_cases(case_id) ON DELETE CASCADE
);

-- Population frequency data for statistical calculations
CREATE TABLE IF NOT EXISTS population_frequencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    population TEXT NOT NULL,
    locus TEXT NOT NULL,
    allele TEXT NOT NULL,
    frequency REAL NOT NULL,
    sample_size INTEGER,
    source TEXT,
    UNIQUE(population, locus, allele)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_genetic_cases_status ON genetic_cases(status);
CREATE INDEX IF NOT EXISTS idx_genetic_cases_created ON genetic_cases(created_date);
CREATE INDEX IF NOT EXISTS idx_genetic_samples_case ON genetic_samples(case_id);
CREATE INDEX IF NOT EXISTS idx_genetic_samples_type ON genetic_samples(sample_type);
CREATE INDEX IF NOT EXISTS idx_str_profiles_sample ON str_profiles(sample_id);
CREATE INDEX IF NOT EXISTS idx_str_profiles_locus ON str_profiles(locus);
CREATE INDEX IF NOT EXISTS idx_genetic_results_case ON genetic_analysis_results(case_id);
CREATE INDEX IF NOT EXISTS idx_genetic_audit_sample ON genetic_file_audit(sample_id);
CREATE INDEX IF NOT EXISTS idx_genetic_audit_timestamp ON genetic_file_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_osiris_queue_status ON osiris_analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_population_freq_lookup ON population_frequencies(population, locus, allele);

-- Insert default South African population frequency data (sample)
INSERT OR IGNORE INTO population_frequencies (population, locus, allele, frequency, sample_size, source) VALUES
('South_African', 'D3S1358', '12', 0.0895, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'D3S1358', '13', 0.0721, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'D3S1358', '14', 0.2156, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'D3S1358', '15', 0.2789, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'D3S1358', '16', 0.2398, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'D3S1358', '17', 0.1456, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'D3S1358', '18', 0.0585, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'vWA', '11', 0.0123, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'vWA', '14', 0.1234, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'vWA', '15', 0.0987, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'vWA', '16', 0.1897, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'vWA', '17', 0.2456, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'vWA', '18', 0.2789, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'vWA', '19', 0.0987, 1000, 'SA_Forensic_Database_2020'),
('South_African', 'vWA', '20', 0.0527, 1000, 'SA_Forensic_Database_2020');

-- Views for easy data access (SQLite compatible)
CREATE VIEW IF NOT EXISTS genetic_case_summary AS
SELECT 
    gc.case_id,
    gc.case_type,
    gc.status,
    gc.created_date,
    COUNT(gs.id) as sample_count,
    SUM(CASE WHEN gs.sample_type = 'alleged_father' THEN 1 ELSE 0 END) as father_samples,
    SUM(CASE WHEN gs.sample_type = 'child' THEN 1 ELSE 0 END) as child_samples,
    SUM(CASE WHEN gs.sample_type = 'mother' THEN 1 ELSE 0 END) as mother_samples,
    gar.paternity_probability,
    gar.conclusion
FROM genetic_cases gc
LEFT JOIN genetic_samples gs ON gc.case_id = gs.case_id
LEFT JOIN genetic_analysis_results gar ON gc.case_id = gar.case_id
GROUP BY gc.case_id, gc.case_type, gc.status, gc.created_date, gar.paternity_probability, gar.conclusion;

CREATE VIEW IF NOT EXISTS sample_str_profile AS
SELECT 
    gs.sample_id,
    gs.case_id,
    gs.sample_type,
    sp.locus,
    sp.allele_1,
    sp.allele_2,
    sp.peak_height_1,
    sp.peak_height_2
FROM genetic_samples gs
JOIN str_profiles sp ON gs.sample_id = sp.sample_id
ORDER BY gs.sample_id, sp.locus;