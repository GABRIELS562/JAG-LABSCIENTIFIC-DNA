const db = require('../services/database');

);

function optimizeDatabase() {
  try {
    // Create indexes for frequently queried columns
    const indexes = [
      // Samples table indexes
      'CREATE INDEX IF NOT EXISTS idx_samples_workflow_status ON samples(workflow_status)',
      'CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON samples(sample_id)',
      'CREATE INDEX IF NOT EXISTS idx_samples_case_id ON samples(case_id)',
      'CREATE INDEX IF NOT EXISTS idx_samples_created_at ON samples(created_at)',
      
      // Batches table indexes
      'CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)',
      'CREATE INDEX IF NOT EXISTS idx_batches_type ON batches(type)',
      'CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at)',
      
      // Batch_samples junction table
      'CREATE INDEX IF NOT EXISTS idx_batch_samples_batch ON batch_samples(batch_number)',
      'CREATE INDEX IF NOT EXISTS idx_batch_samples_sample ON batch_samples(sample_id)',
      
      // Users table indexes
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      
      // Analysis table indexes (if exists)
      'CREATE INDEX IF NOT EXISTS idx_analysis_sample_id ON analysis(sample_id)',
      'CREATE INDEX IF NOT EXISTS idx_analysis_status ON analysis(status)',
      
      // Reports table indexes (if exists)
      'CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id)',
      'CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)'
    ];
    
    let indexCount = 0;
    indexes.forEach(indexSql => {
      try {
        db.db.exec(indexSql);
        indexCount++;
        } catch (err) {
        [0]}`);
      }
    });
    
    // Optimize database settings
    const optimizations = [
      'PRAGMA journal_mode = WAL',           // Write-Ahead Logging for better concurrency
      'PRAGMA synchronous = NORMAL',         // Balance between safety and speed
      'PRAGMA cache_size = -64000',          // 64MB cache
      'PRAGMA temp_store = MEMORY',          // Use memory for temp tables
      'PRAGMA mmap_size = 268435456',        // 256MB memory-mapped I/O
      'PRAGMA page_size = 4096',             // Optimal page size
      'PRAGMA auto_vacuum = INCREMENTAL',    // Automatic space reclamation
      'PRAGMA optimize'                      // Run query optimizer
    ];
    
    optimizations.forEach(pragma => {
      try {
        db.db.exec(pragma);
        } catch (err) {
        }
    });
    
    // Analyze tables for query optimization
    const tables = ['samples', 'batches', 'batch_samples', 'users'];
    tables.forEach(table => {
      try {
        db.db.exec(`ANALYZE ${table}`);
        } catch (err) {
        }
    });
    
    // Check database statistics
    const stats = db.db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get();
    .toFixed(2)} MB`);
    
    const tableStats = db.db.prepare(`
      SELECT name, 
             (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
      FROM sqlite_master m 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    tableStats.forEach(stat => {
      } : ${stat.index_count} indexes`);
    });
    
    // Vacuum database to reclaim space
    try {
      db.db.exec('VACUUM');
      } catch (err) {
      ');
    }
    
    );
    );
    
    return true;
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    return false;
  }
}

// Run optimization
if (require.main === module) {
  const success = optimizeDatabase();
  process.exit(success ? 0 : 1);
}

module.exports = optimizeDatabase;