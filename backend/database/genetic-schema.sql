-- Genetic Analysis Schema for Paternity Testing
-- Compatible with existing LIMS database structure

-- Cases table for paternity testing cases
CREATE TABLE IF NOT EXISTS genetic_cases (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) UNIQUE NOT NULL,
    case_type VARCHAR(20) DEFAULT 'paternity',
    status VARCHAR(20) DEFAULT 'pending',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analyst_id INTEGER,
    reviewer_id INTEGER,
    priority VARCHAR(10) DEFAULT 'normal',
    notes TEXT,
    CONSTRAINT fk_analyst FOREIGN KEY (analyst_id) REFERENCES users(id),
    CONSTRAINT fk_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Genetic samples table
CREATE TABLE IF NOT EXISTS genetic_samples (
    id SERIAL PRIMARY KEY,
    sample_id VARCHAR(50) UNIQUE NOT NULL,
    case_id VARCHAR(50) NOT NULL,
    sample_type VARCHAR(20) NOT NULL, -- 'alleged_father', 'child', 'mother'
    file_path VARCHAR(500),
    original_filename VARCHAR(255),
    file_hash VARCHAR(64),
    collection_date DATE,
    received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'received',
    quality_score DECIMAL(5,2),
    instrument VARCHAR(50),
    kit VARCHAR(50),
    CONSTRAINT fk_genetic_case FOREIGN KEY (case_id) REFERENCES genetic_cases(case_id) ON DELETE CASCADE
);

-- STR profiles table for storing genetic markers
CREATE TABLE IF NOT EXISTS str_profiles (
    id SERIAL PRIMARY KEY,
    sample_id VARCHAR(50) NOT NULL,
    locus VARCHAR(20) NOT NULL,
    allele_1 VARCHAR(10),
    allele_2 VARCHAR(10),
    peak_height_1 INTEGER,
    peak_height_2 INTEGER,
    peak_area_1 INTEGER,
    peak_area_2 INTEGER,
    quality_flags TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_genetic_sample FOREIGN KEY (sample_id) REFERENCES genetic_samples(sample_id) ON DELETE CASCADE,
    UNIQUE(sample_id, locus)
);

-- Analysis results table
CREATE TABLE IF NOT EXISTS genetic_analysis_results (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL,
    paternity_probability DECIMAL(5,2),
    exclusion_probability DECIMAL(5,2),
    matching_loci INTEGER,
    total_loci INTEGER,
    conclusion VARCHAR(20), -- 'inclusion', 'exclusion', 'inconclusive'
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    osiris_output_path VARCHAR(500),
    report_generated BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(5,2),
    notes TEXT,
    CONSTRAINT fk_genetic_analysis_case FOREIGN KEY (case_id) REFERENCES genetic_cases(case_id) ON DELETE CASCADE
);

-- Loci comparison details
CREATE TABLE IF NOT EXISTS loci_comparisons (
    id SERIAL PRIMARY KEY,
    result_id INTEGER NOT NULL,
    locus VARCHAR(20) NOT NULL,
    child_allele_1 VARCHAR(10),
    child_allele_2 VARCHAR(10),
    father_allele_1 VARCHAR(10),
    father_allele_2 VARCHAR(10),
    mother_allele_1 VARCHAR(10),
    mother_allele_2 VARCHAR(10),
    match_status BOOLEAN,
    mutation_indicator BOOLEAN DEFAULT FALSE,
    exclusion_power DECIMAL(8,6),
    CONSTRAINT fk_genetic_result FOREIGN KEY (result_id) REFERENCES genetic_analysis_results(id) ON DELETE CASCADE
);

-- File processing audit trail
CREATE TABLE IF NOT EXISTS genetic_file_audit (
    id SERIAL PRIMARY KEY,
    sample_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'uploaded', 'processed', 'analyzed', 'approved'
    user_id INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    ip_address INET,
    CONSTRAINT fk_genetic_audit_sample FOREIGN KEY (sample_id) REFERENCES genetic_samples(sample_id) ON DELETE CASCADE,
    CONSTRAINT fk_genetic_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Quality control metrics
CREATE TABLE IF NOT EXISTS genetic_qc_metrics (
    id SERIAL PRIMARY KEY,
    sample_id VARCHAR(50) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,4),
    threshold_min DECIMAL(10,4),
    threshold_max DECIMAL(10,4),
    pass_status BOOLEAN,
    measured_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_genetic_qc_sample FOREIGN KEY (sample_id) REFERENCES genetic_samples(sample_id) ON DELETE CASCADE
);

-- Osiris analysis jobs queue
CREATE TABLE IF NOT EXISTS osiris_analysis_queue (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
    priority INTEGER DEFAULT 5,
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_date TIMESTAMP,
    completed_date TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    CONSTRAINT fk_osiris_queue_case FOREIGN KEY (case_id) REFERENCES genetic_cases(case_id) ON DELETE CASCADE
);

-- Population frequency data for statistical calculations
CREATE TABLE IF NOT EXISTS population_frequencies (
    id SERIAL PRIMARY KEY,
    population VARCHAR(50) NOT NULL,
    locus VARCHAR(20) NOT NULL,
    allele VARCHAR(10) NOT NULL,
    frequency DECIMAL(8,6) NOT NULL,
    sample_size INTEGER,
    source VARCHAR(100),
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
INSERT INTO population_frequencies (population, locus, allele, frequency, sample_size, source) VALUES
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
('South_African', 'vWA', '20', 0.0527, 1000, 'SA_Forensic_Database_2020')
ON CONFLICT (population, locus, allele) DO NOTHING;

-- Views for easy data access
CREATE OR REPLACE VIEW genetic_case_summary AS
SELECT 
    gc.case_id,
    gc.case_type,
    gc.status,
    gc.created_date,
    COUNT(gs.id) as sample_count,
    COUNT(CASE WHEN gs.sample_type = 'alleged_father' THEN 1 END) as father_samples,
    COUNT(CASE WHEN gs.sample_type = 'child' THEN 1 END) as child_samples,
    COUNT(CASE WHEN gs.sample_type = 'mother' THEN 1 END) as mother_samples,
    gar.paternity_probability,
    gar.conclusion
FROM genetic_cases gc
LEFT JOIN genetic_samples gs ON gc.case_id = gs.case_id
LEFT JOIN genetic_analysis_results gar ON gc.case_id = gar.case_id
GROUP BY gc.case_id, gc.case_type, gc.status, gc.created_date, gar.paternity_probability, gar.conclusion;

CREATE OR REPLACE VIEW sample_str_profile AS
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