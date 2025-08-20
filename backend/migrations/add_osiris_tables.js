#!/usr/bin/env node
/**
 * Migration to add OSIRIS analysis tables to the database
 * Run: node backend/migrations/add_osiris_tables.js
 */

const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

console.log('🔄 Starting OSIRIS tables migration...');

try {
  // Begin transaction
  db.exec('BEGIN TRANSACTION');

  // Create STR Analysis table for OSIRIS results
  db.exec(`
    CREATE TABLE IF NOT EXISTS str_analysis (
      analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER,
      kit_id INTEGER,
      fsa_file_path TEXT,
      osiris_version TEXT,
      analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      quality_score REAL,
      review_required BOOLEAN DEFAULT 0,
      reviewed_by TEXT,
      review_date DATETIME,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES samples(sample_id),
      FOREIGN KEY (kit_id) REFERENCES kits(kit_id)
    )
  `);

  // Create Genotypes table for allele calls
  db.exec(`
    CREATE TABLE IF NOT EXISTS genotypes (
      genotype_id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL,
      locus_name TEXT NOT NULL,
      allele_1 TEXT,
      allele_2 TEXT,
      peak_height_1 INTEGER,
      peak_height_2 INTEGER,
      rfu_1 REAL,
      rfu_2 REAL,
      quality_flag TEXT,
      is_homozygote BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES str_analysis(analysis_id) ON DELETE CASCADE
    )
  `);

  // Create Paternity Cases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS paternity_cases (
      case_id TEXT PRIMARY KEY,
      father_sample_id INTEGER,
      mother_sample_id INTEGER,
      child_sample_id INTEGER,
      case_type TEXT NOT NULL CHECK(case_type IN ('duo', 'trio')),
      status TEXT DEFAULT 'active',
      paternity_index REAL,
      probability_of_paternity REAL,
      conclusion TEXT,
      report_generated BOOLEAN DEFAULT 0,
      report_path TEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_date DATETIME,
      FOREIGN KEY (father_sample_id) REFERENCES samples(sample_id),
      FOREIGN KEY (mother_sample_id) REFERENCES samples(sample_id),
      FOREIGN KEY (child_sample_id) REFERENCES samples(sample_id)
    )
  `);

  // Create OSIRIS Processing Queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS osiris_queue (
      queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT,
      sample_id INTEGER,
      fsa_file_path TEXT NOT NULL,
      priority INTEGER DEFAULT 5,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_attempt DATETIME,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (sample_id) REFERENCES samples(sample_id)
    )
  `);

  // Create Quality Control Metrics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS qc_metrics (
      metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value REAL,
      pass_fail TEXT CHECK(pass_fail IN ('PASS', 'FAIL', 'REVIEW')),
      threshold_min REAL,
      threshold_max REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES str_analysis(analysis_id) ON DELETE CASCADE
    )
  `);

  // Create STR Markers Reference table
  db.exec(`
    CREATE TABLE IF NOT EXISTS str_markers (
      marker_id INTEGER PRIMARY KEY AUTOINCREMENT,
      locus_name TEXT UNIQUE NOT NULL,
      chromosome TEXT,
      repeat_unit TEXT,
      min_allele REAL,
      max_allele REAL,
      kit_name TEXT,
      is_core_codis BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert standard STR markers for PowerPlex 16
  const markers = [
    ['AMEL', 'X/Y', null, null, null, 'PowerPlex_16', 0],
    ['CSF1PO', '5', 'AGAT', 6, 16, 'PowerPlex_16', 1],
    ['D13S317', '13', 'TATC', 5, 16, 'PowerPlex_16', 1],
    ['D16S539', '16', 'GATA', 5, 16, 'PowerPlex_16', 1],
    ['D18S51', '18', 'AGAA', 7, 39, 'PowerPlex_16', 1],
    ['D19S433', '19', 'AAGG', 9, 17.2, 'PowerPlex_16', 0],
    ['D21S11', '21', 'TCTA/TCTG', 24, 38, 'PowerPlex_16', 1],
    ['D2S1338', '2', 'TGCC/TTCC', 15, 28, 'PowerPlex_16', 0],
    ['D3S1358', '3', 'TCTA/TCTG', 12, 20, 'PowerPlex_16', 1],
    ['D5S818', '5', 'AGAT', 7, 16, 'PowerPlex_16', 1],
    ['D7S820', '7', 'GATA', 6, 15, 'PowerPlex_16', 1],
    ['D8S1179', '8', 'TCTA/TCTG', 8, 19, 'PowerPlex_16', 1],
    ['FGA', '4', 'CTTT', 17, 51.2, 'PowerPlex_16', 1],
    ['TH01', '11', 'AATG', 3, 14, 'PowerPlex_16', 1],
    ['TPOX', '2', 'AATG', 6, 13, 'PowerPlex_16', 1],
    ['vWA', '12', 'TCTA/TCTG', 11, 24, 'PowerPlex_16', 1]
  ];

  const insertMarker = db.prepare(`
    INSERT OR IGNORE INTO str_markers 
    (locus_name, chromosome, repeat_unit, min_allele, max_allele, kit_name, is_core_codis)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const marker of markers) {
    insertMarker.run(...marker);
  }

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_str_analysis_sample ON str_analysis(sample_id);
    CREATE INDEX IF NOT EXISTS idx_str_analysis_status ON str_analysis(status);
    CREATE INDEX IF NOT EXISTS idx_genotypes_analysis ON genotypes(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_genotypes_locus ON genotypes(locus_name);
    CREATE INDEX IF NOT EXISTS idx_paternity_cases_status ON paternity_cases(status);
    CREATE INDEX IF NOT EXISTS idx_osiris_queue_status ON osiris_queue(status);
    CREATE INDEX IF NOT EXISTS idx_osiris_queue_batch ON osiris_queue(batch_id);
  `);

  // Commit transaction
  db.exec('COMMIT');
  
  console.log('✅ OSIRIS tables created successfully!');
  console.log('📊 Tables created:');
  console.log('   - str_analysis');
  console.log('   - genotypes');
  console.log('   - paternity_cases');
  console.log('   - osiris_queue');
  console.log('   - qc_metrics');
  console.log('   - str_markers');
  console.log(`📍 Inserted ${markers.length} STR markers for PowerPlex 16`);

} catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  // Close database connection
  db.close();
}

console.log('🎉 Migration completed successfully!');