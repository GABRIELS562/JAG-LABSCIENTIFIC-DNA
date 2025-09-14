-- PostgreSQL Database Initialization Script for LIMS
-- This ensures all required tables and columns exist for deployment

-- Add missing columns to samples table if they don't exist
DO $$
BEGIN
    -- Add ethnicity column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='samples' AND column_name='ethnicity') THEN
        ALTER TABLE samples ADD COLUMN ethnicity VARCHAR(100);
    END IF;

    -- Add email column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='samples' AND column_name='email') THEN
        ALTER TABLE samples ADD COLUMN email VARCHAR(255);
    END IF;

    -- Add id_number column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='samples' AND column_name='id_number') THEN
        ALTER TABLE samples ADD COLUMN id_number VARCHAR(50);
    END IF;

    -- Add id_type column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='samples' AND column_name='id_type') THEN
        ALTER TABLE samples ADD COLUMN id_type VARCHAR(50);
    END IF;

    -- Add marital_status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='samples' AND column_name='marital_status') THEN
        ALTER TABLE samples ADD COLUMN marital_status VARCHAR(50);
    END IF;

    -- Add submission_date column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name='samples' AND column_name='submission_date') THEN
        ALTER TABLE samples ADD COLUMN submission_date TIMESTAMP;
    END IF;
END $$;

-- Create processing_log table for workflow tracking
CREATE TABLE IF NOT EXISTS processing_log (
    id SERIAL PRIMARY KEY,
    sample_id INTEGER REFERENCES samples(id),
    stage VARCHAR(100) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'in_progress',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for processing_log
CREATE INDEX IF NOT EXISTS idx_processing_log_sample_id ON processing_log(sample_id);
CREATE INDEX IF NOT EXISTS idx_processing_log_stage ON processing_log(stage);
CREATE INDEX IF NOT EXISTS idx_processing_log_status ON processing_log(status);

-- Create devops_metrics table for monitoring
CREATE TABLE IF NOT EXISTS devops_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2),
    metric_unit VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create indexes for devops_metrics
CREATE INDEX IF NOT EXISTS idx_devops_metrics_name ON devops_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_devops_metrics_timestamp ON devops_metrics(timestamp);

-- Create background_jobs table for job tracking
CREATE TABLE IF NOT EXISTS background_jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for background_jobs
CREATE INDEX IF NOT EXISTS idx_background_jobs_name ON background_jobs(job_name);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status);

-- Create workflow_metrics table for tracking sample progression
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id SERIAL PRIMARY KEY,
    sample_id INTEGER REFERENCES samples(id),
    stage VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_workflow_metrics_sample_id ON workflow_metrics(sample_id);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_stage ON workflow_metrics(stage);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_processed_at ON workflow_metrics(processed_at);

-- Ensure samples have some initial data for cycling
DO $$
BEGIN
    -- Only insert if table is empty
    IF NOT EXISTS (SELECT 1 FROM samples LIMIT 1) THEN
        INSERT INTO samples (lab_number, name, surname, relation, workflow_status, case_number, collection_date)
        VALUES
            ('LAB-2025-001', 'John', 'Doe', 'Child', 'sample_collected', 'PAT-2025-001', CURRENT_DATE),
            ('LAB-2025-002', 'Jane', 'Doe', 'Mother', 'dna_extraction', 'PAT-2025-001', CURRENT_DATE),
            ('LAB-2025-003', 'James', 'Doe', 'Alleged Father', 'pcr_ready', 'PAT-2025-001', CURRENT_DATE);
    END IF;
END $$;

-- Grant permissions (adjust as needed for your deployment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;