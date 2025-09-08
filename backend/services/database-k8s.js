// In-memory database replacement for better-sqlite3 in Kubernetes
class InMemoryDatabase {
  constructor() {
    this.tables = {
      samples: [],
      batches: [],
      workflow_status: [],
      users: [],
      results: []
    };
    this.initializeSampleData();
  }

  initializeSampleData() {
    // Add sample data
    this.tables.samples = [
      { id: 1, lab_number: '25_001', name: 'Alice', surname: 'Johnson', relation: 'Child', status: 'active', workflow_status: 'sample_collected', case_number: 'PAT-2025-001', collection_date: '2025-01-15', created_at: new Date().toISOString() },
      { id: 2, lab_number: '25_002', name: 'Bob', surname: 'Johnson', relation: 'Alleged Father', status: 'active', workflow_status: 'dna_extraction', case_number: 'PAT-2025-001', collection_date: '2025-01-15', created_at: new Date().toISOString() },
      { id: 3, lab_number: '25_003', name: 'Carol', surname: 'Johnson', relation: 'Mother', status: 'active', workflow_status: 'pcr_amplification', case_number: 'PAT-2025-001', collection_date: '2025-01-15', created_at: new Date().toISOString() },
      { id: 4, lab_number: '25_004', name: 'David', surname: 'Smith', relation: 'Child', status: 'active', workflow_status: 'analysis_completed', case_number: 'PAT-2025-002', collection_date: '2025-01-16', created_at: new Date().toISOString() },
      { id: 5, lab_number: '25_005', name: 'Eva', surname: 'Smith', relation: 'Mother', status: 'active', workflow_status: 'report_generation', case_number: 'PAT-2025-002', collection_date: '2025-01-16', created_at: new Date().toISOString() }
    ];
    
    this.tables.batches = [
      { id: 1, batch_number: 'PCR-2025-001', status: 'in_progress', created_at: new Date().toISOString() },
      { id: 2, batch_number: 'PCR-2025-002', status: 'completed', created_at: new Date().toISOString() }
    ];
    
    this.tables.workflow_status = [
      { id: 1, stage: 'submission', status: 'completed', count: 5 },
      { id: 2, stage: 'extraction', status: 'in_progress', count: 3 },
      { id: 3, stage: 'pcr', status: 'pending', count: 2 }
    ];
  }

  prepare(sql) {
    const self = this;
    return {
      all: function(params) {
        return self.executeQuery(sql, params);
      },
      get: function(params) {
        const results = self.executeQuery(sql, params);
        return results[0] || null;
      },
      run: function(params) {
        return self.executeUpdate(sql, params);
      }
    };
  }

  executeQuery(sql, params) {
    // Simple SQL parsing for common queries
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('from samples')) {
      return this.tables.samples;
    }
    if (sqlLower.includes('from batches')) {
      return this.tables.batches;
    }
    if (sqlLower.includes('from workflow_status')) {
      return this.tables.workflow_status;
    }
    if (sqlLower.includes('count(*)')) {
      return [{ 'count(*)': this.tables.samples.length }];
    }
    
    // Default return
    return [];
  }

  executeUpdate(sql, params) {
    // Handle INSERT, UPDATE, DELETE operations
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('insert into samples')) {
      const newId = this.tables.samples.length + 1;
      const newSample = { id: newId, ...params };
      this.tables.samples.push(newSample);
      return { lastInsertRowid: newId, changes: 1 };
    }
    
    if (sqlLower.includes('update samples')) {
      // Simple update logic
      return { changes: 1 };
    }
    
    return { changes: 0 };
  }

  close() {
    // No-op for in-memory database
  }
}

// Create singleton instance
const db = new InMemoryDatabase();

// Export functions that match the original database.js interface
module.exports = {
  db,
  getDatabase: () => db,
  initializeDatabase: () => {
    console.log('✅ In-memory database initialized for Kubernetes');
    return Promise.resolve();
  },
  // Mock pool for PostgreSQL compatibility
  pool: {
    query: (sql, params) => {
      const result = db.prepare(sql).all(params);
      return Promise.resolve({ rows: result });
    }
  },
  // Mock query function
  query: (sql, params) => {
    const result = db.prepare(sql).all(params);
    return Promise.resolve({ rows: result });
  }
};