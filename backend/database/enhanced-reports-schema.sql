-- Enhanced Reports Schema for Legal and Peace of Mind Batches
-- Supports proper naming conventions and file management

-- Drop existing reports table to recreate with enhanced structure
DROP TABLE IF EXISTS reports;

-- Enhanced Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    batch_id INTEGER,
    report_number TEXT UNIQUE NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('Paternity Report', 'Batch Report', 'QC Summary', 'Sample Report')),
    batch_type TEXT NOT NULL CHECK (batch_type IN ('legal', 'peace_of_mind', 'standard')),
    lab_batch_number TEXT, -- e.g., LDSR_56LT, LDSR_454
    original_filename TEXT, -- Generated filename based on batch type
    file_path TEXT, -- Full system path to the PDF file
    download_url TEXT, -- API endpoint for downloading
    date_generated DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'sent', 'archived')),
    file_size INTEGER, -- File size in bytes
    client_email TEXT, -- Email address if sent to client
    sent_at DATETIME, -- When report was sent
    generated_by TEXT, -- User who generated the report
    notes TEXT, -- Additional notes about the report
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE SET NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

-- Report Access Log for tracking views and downloads
CREATE TABLE IF NOT EXISTS report_access_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'send')),
    user_agent TEXT,
    ip_address TEXT,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Indexes for enhanced performance
CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id);
CREATE INDEX IF NOT EXISTS idx_reports_batch_id ON reports(batch_id);
CREATE INDEX IF NOT EXISTS idx_reports_batch_type ON reports(batch_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_lab_batch_number ON reports(lab_batch_number);
CREATE INDEX IF NOT EXISTS idx_reports_date_generated ON reports(date_generated);

CREATE INDEX IF NOT EXISTS idx_report_access_log_report_id ON report_access_log(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_log_access_type ON report_access_log(access_type);
CREATE INDEX IF NOT EXISTS idx_report_access_log_accessed_at ON report_access_log(accessed_at);

-- Trigger to update timestamp
CREATE TRIGGER IF NOT EXISTS update_reports_timestamp 
    AFTER UPDATE ON reports
    BEGIN
        UPDATE reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Insert sample report data for demonstration
INSERT OR IGNORE INTO reports (
    report_number, report_type, batch_type, lab_batch_number, 
    original_filename, file_path, date_generated, status, generated_by
) VALUES
(
    'RPT-2024-001',
    'Paternity Report',
    'legal',
    'LDSR_56LT',
    'DNA Paternity Test Report - LDSR_56LT.pdf',
    '/Users/user/Downloads/DNA Paternity Test Report - LDSR_56LT.pdf',
    '2024-07-21',
    'completed',
    'system'
),
(
    'RPT-2024-002', 
    'Paternity Report',
    'peace_of_mind',
    'LDSR_454',
    'DNA Paternity Report _POM_ - LDSR_454.pdf',
    '/Users/user/Downloads/DNA Paternity Report _POM_ - LDSR_454.pdf',
    '2024-07-21',
    'completed',
    'system'
),
(
    'RPT-2024-003',
    'Paternity Report', 
    'legal',
    'LDSR_57LT',
    'DNA Paternity Test Report - LDSR_57LT.pdf',
    '/Users/user/Downloads/DNA Paternity Test Report - LDSR_57LT.pdf',
    '2024-07-20',
    'completed',
    'system'
),
(
    'RPT-2024-004',
    'Paternity Report',
    'peace_of_mind', 
    'LDSR_455',
    'DNA Paternity Report _POM_ - LDSR_455.pdf',
    '/Users/user/Downloads/DNA Paternity Report _POM_ - LDSR_455.pdf',
    '2024-07-19',
    'sent',
    'system'
);