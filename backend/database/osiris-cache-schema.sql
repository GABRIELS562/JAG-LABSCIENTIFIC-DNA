-- Osiris Results Cache Schema
-- Stores processed analysis results from Osiris for fast API access

-- Analysis runs table - tracks each Osiris analysis execution
CREATE TABLE IF NOT EXISTS osiris_analysis_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT UNIQUE NOT NULL,
    case_id TEXT NOT NULL,
    input_directory TEXT NOT NULL,
    output_directory TEXT NOT NULL,
    oar_file_path TEXT,
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT,
    kit_type TEXT,
    osiris_version TEXT,
    total_samples INTEGER DEFAULT 0,
    successful_samples INTEGER DEFAULT 0,
    failed_samples INTEGER DEFAULT 0,
    FOREIGN KEY (case_id) REFERENCES genetic_cases(case_id) ON DELETE CASCADE
);

-- Sample analysis results - individual sample outcomes
CREATE TABLE IF NOT EXISTS osiris_sample_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    sample_name TEXT NOT NULL,
    sample_type TEXT, -- 'child', 'father', 'mother', 'control', 'ladder'
    file_name TEXT NOT NULL,
    analysis_status TEXT DEFAULT 'pending', -- 'success', 'warning', 'error'
    confidence_score REAL,
    loci_detected INTEGER DEFAULT 0,
    total_loci INTEGER DEFAULT 16,
    rfu_average REAL,
    peak_balance TEXT,
    stutter_ratio REAL,
    noise_level TEXT,
    issues TEXT, -- JSON array of issues/warnings
    quality_flags TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES osiris_analysis_runs(run_id) ON DELETE CASCADE
);

-- STR comparison results - stores paternity comparison data
CREATE TABLE IF NOT EXISTS osiris_str_comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    mother_sample TEXT,
    child_sample TEXT,
    alleged_father_sample TEXT,
    locus_name TEXT NOT NULL,
    mother_alleles TEXT, -- e.g., "X X"
    child_alleles TEXT,
    father_alleles TEXT,
    comparison_result TEXT, -- '✓', '✗', '?'
    interpretation TEXT, -- 'Not excluded', 'Excluded', 'Inconclusive'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES osiris_analysis_runs(run_id) ON DELETE CASCADE
);

-- Overall paternity conclusions
CREATE TABLE IF NOT EXISTS osiris_paternity_conclusions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT UNIQUE NOT NULL,
    case_id TEXT NOT NULL,
    mother_sample TEXT,
    child_sample TEXT,
    alleged_father_sample TEXT,
    total_loci INTEGER DEFAULT 16,
    matching_loci INTEGER DEFAULT 0,
    excluding_loci INTEGER DEFAULT 0,
    inconclusive_loci INTEGER DEFAULT 0,
    overall_conclusion TEXT, -- 'INCLUSION', 'EXCLUSION', 'INCONCLUSIVE'
    probability_percentage REAL,
    interpretation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES osiris_analysis_runs(run_id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES genetic_cases(case_id) ON DELETE CASCADE
);

-- File processing log - tracks which files have been processed
CREATE TABLE IF NOT EXISTS osiris_file_processing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    file_hash TEXT,
    file_size INTEGER,
    last_modified DATETIME,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    run_id TEXT,
    processing_status TEXT DEFAULT 'processed', -- 'processed', 'error', 'skipped'
    error_details TEXT,
    FOREIGN KEY (run_id) REFERENCES osiris_analysis_runs(run_id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_osiris_runs_case_id ON osiris_analysis_runs(case_id);
CREATE INDEX IF NOT EXISTS idx_osiris_runs_status ON osiris_analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_osiris_sample_results_run_id ON osiris_sample_results(run_id);
CREATE INDEX IF NOT EXISTS idx_osiris_str_comparisons_run_id ON osiris_str_comparisons(run_id);
CREATE INDEX IF NOT EXISTS idx_osiris_conclusions_case_id ON osiris_paternity_conclusions(case_id);
CREATE INDEX IF NOT EXISTS idx_file_processing_path ON osiris_file_processing_log(file_path);