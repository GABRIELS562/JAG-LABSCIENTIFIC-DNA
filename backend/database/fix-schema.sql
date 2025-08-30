-- Fix missing columns in genetic analysis tables

-- First check if columns exist, if not add them
-- For SQLite, we need to handle this differently

-- Create genetic_analysis_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS genetic_analysis_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER,
  case_id INTEGER,
  case_name TEXT,
  analysis_type TEXT,
  status TEXT DEFAULT 'pending',
  result_data TEXT,
  quality_score REAL,
  is_real_data BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all required tables exist
CREATE TABLE IF NOT EXISTS osiris_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT,
  input_directory TEXT,
  output_directory TEXT,
  status TEXT DEFAULT 'pending',
  kit_name TEXT,
  ladder_info TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  results TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS osiris_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER,
  sample_name TEXT,
  locus TEXT,
  allele1 TEXT,
  allele2 TEXT,
  peak_height1 INTEGER,
  peak_height2 INTEGER,
  quality_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES osiris_analyses(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_genetic_results_case ON genetic_analysis_results(case_id);
CREATE INDEX IF NOT EXISTS idx_genetic_results_status ON genetic_analysis_results(status);
CREATE INDEX IF NOT EXISTS idx_osiris_analyses_case ON osiris_analyses(case_id);
CREATE INDEX IF NOT EXISTS idx_osiris_analyses_status ON osiris_analyses(status);
CREATE INDEX IF NOT EXISTS idx_osiris_results_analysis ON osiris_results(analysis_id);
CREATE INDEX IF NOT EXISTS idx_osiris_results_sample ON osiris_results(sample_name);