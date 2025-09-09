-- PostgreSQL Table Initialization for LIMS Application
-- Ensures all required tables exist with proper constraints

-- Basic Samples table with required fields
CREATE TABLE IF NOT EXISTS samples (
    id SERIAL PRIMARY KEY,
    sample_id VARCHAR(255) UNIQUE NOT NULL,
    patient_name VARCHAR(255),
    sample_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Basic Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    sample_id VARCHAR(255),
    workflow_type VARCHAR(100),
    status VARCHAR(50),
    step_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON samples(sample_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_workflows_sample_id ON workflows(sample_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);

-- Update trigger for samples table
CREATE OR REPLACE FUNCTION update_samples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_samples_updated_at 
    BEFORE UPDATE ON samples 
    FOR EACH ROW 
    EXECUTE FUNCTION update_samples_updated_at();