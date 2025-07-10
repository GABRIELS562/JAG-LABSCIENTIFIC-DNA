-- Optimization indexes for SQLite performance
-- Run this to optimize the samples table queries

-- Index for lab_number searches (most common)
CREATE INDEX IF NOT EXISTS idx_samples_lab_number ON samples(lab_number);

-- Index for name searches
CREATE INDEX IF NOT EXISTS idx_samples_name ON samples(name);

-- Index for surname searches  
CREATE INDEX IF NOT EXISTS idx_samples_surname ON samples(surname);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);

-- Index for workflow_status filtering
CREATE INDEX IF NOT EXISTS idx_samples_workflow_status ON samples(workflow_status);

-- Index for case_number grouping
CREATE INDEX IF NOT EXISTS idx_samples_case_number ON samples(case_number);

-- Composite index for common filtering scenarios
CREATE INDEX IF NOT EXISTS idx_samples_status_workflow ON samples(status, workflow_status);

-- Index for batch operations
CREATE INDEX IF NOT EXISTS idx_samples_batch_id ON samples(batch_id);

-- Index for date sorting and filtering
CREATE INDEX IF NOT EXISTS idx_samples_collection_date ON samples(collection_date);

-- Index for pagination ordering (most important for performance)
CREATE INDEX IF NOT EXISTS idx_samples_id_desc ON samples(id DESC);

-- Analyze tables to update statistics
ANALYZE samples;

-- Enable optimization settings
PRAGMA optimize;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;