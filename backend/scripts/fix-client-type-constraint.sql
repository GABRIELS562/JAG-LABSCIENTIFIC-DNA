-- Begin transaction
BEGIN TRANSACTION;

-- Create new table with updated constraint
CREATE TABLE test_cases_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_number TEXT UNIQUE NOT NULL,
    ref_kit_number TEXT NOT NULL,
    submission_date DATE DEFAULT (DATE('now')),
    client_type TEXT NOT NULL CHECK (client_type IN ('paternity', 'lt', 'urgent', 'peace_of_mind')),
    mother_present TEXT CHECK (mother_present IN ('YES', 'NO')),
    created_at DATETIME DEFAULT (DATETIME('now')),
    updated_at DATETIME DEFAULT (DATETIME('now')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    test_purpose TEXT CHECK (test_purpose IN ('peace_of_mind', 'legal_proceedings', 'immigration', 'inheritance', 'custody', 'other')),
    sample_type TEXT CHECK (sample_type IN ('buccal_swab', 'blood', 'saliva', 'other')),
    authorized_collector TEXT,
    consent_type TEXT CHECK (consent_type IN ('paternity', 'legal')),
    has_signatures TEXT CHECK (has_signatures IN ('YES', 'NO')),
    has_witness TEXT CHECK (has_witness IN ('YES', 'NO')),
    witness_name TEXT,
    legal_declarations TEXT
);

-- Copy data from old table to new table
INSERT INTO test_cases_new SELECT * FROM test_cases;

-- Drop old table
DROP TABLE test_cases;

-- Rename new table to original name
ALTER TABLE test_cases_new RENAME TO test_cases;

-- Recreate indexes if any
CREATE INDEX IF NOT EXISTS idx_test_cases_case_number ON test_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_test_cases_submission_date ON test_cases(submission_date);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON test_cases(status);

-- Commit transaction
COMMIT;