// Unified Database Service
// Automatically selects PostgreSQL or SQLite based on DB_ADAPTER environment variable

const PostgreSQLAdapter = require('./database-postgres-adapter');
const SQLiteAdapter = require('./database-sqlite-adapter');

class UnifiedDatabaseService {
  constructor() {
    // Determine which adapter to use
    const adapter = process.env.DB_ADAPTER || 'postgres';
    
    console.log(`🔧 Initializing database with adapter: ${adapter}`);
    
    if (adapter === 'sqlite') {
      this.adapter = new SQLiteAdapter();
      this.adapterType = 'sqlite';
    } else {
      // Default to PostgreSQL
      this.adapter = new PostgreSQLAdapter();
      this.adapterType = 'postgres';
    }
    
    // Bind all methods to maintain context
    this.bindMethods();
    
    // Auto-initialize
    this.initPromise = this.initialize();
  }

  bindMethods() {
    // Bind all adapter methods to this instance
    const methods = [
      'initialize', 'query', 'prepare', 'get', 'all', 'run', 'exec',
      'beginTransaction', 'commit', 'rollback', 'transaction',
      'pragma', 'getHealthCheck', 'getStatistics', 'close',
      'ensureInitialized'
    ];
    
    methods.forEach(method => {
      if (typeof this.adapter[method] === 'function') {
        this[method] = this.adapter[method].bind(this.adapter);
      }
    });
  }

  // Getter for common properties
  get isConnected() {
    return this.adapter.isConnected;
  }

  get db() {
    // For SQLite compatibility
    return this.adapter.db || this.adapter.pool;
  }

  get pool() {
    // For PostgreSQL compatibility
    return this.adapter.pool || this.adapter.db;
  }

  // Ensure initialization is complete
  async ensureReady() {
    if (this.initPromise) {
      await this.initPromise;
    }
    return this.isConnected;
  }

  // Get adapter type
  getAdapterType() {
    return this.adapterType;
  }

  // Get connection info
  getConnectionInfo() {
    return {
      adapter: this.adapterType,
      connected: this.isConnected,
      environment: process.env.NODE_ENV || 'development',
      kubernetes: !!process.env.KUBERNETES_SERVICE_HOST
    };
  }

  // Compatibility methods for legacy code
  
  // SQLite-style prepare with synchronous-looking methods
  prepareSync(sql) {
    const stmt = this.prepare(sql);
    return {
      get(...params) {
        // Note: This returns a promise, caller needs to await
        return stmt.get(...params);
      },
      all(...params) {
        // Note: This returns a promise, caller needs to await
        return stmt.all(...params);
      },
      run(...params) {
        // Note: This returns a promise, caller needs to await
        return stmt.run(...params);
      }
    };
  }

  // Helper method for migrations
  async runMigrations(migrations) {
    console.log(`Running ${migrations.length} migrations...`);
    for (const migration of migrations) {
      try {
        await this.exec(migration.sql);
        console.log(`✅ Migration completed: ${migration.name}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.name}`, error);
        throw error;
      }
    }
  }

  // Helper for bulk inserts
  async bulkInsert(table, records, columns) {
    const results = [];
    for (const record of records) {
      const values = columns.map(col => record[col]);
      const placeholders = columns.map((_, i) => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      try {
        const result = await this.run(sql, values);
        results.push(result);
      } catch (error) {
        console.error(`Bulk insert error for ${table}:`, error);
        results.push({ error: error.message });
      }
    }
    return results;
  }

  // Helper for upserts (insert or update)
  async upsert(table, data, uniqueKey) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (this.adapterType === 'sqlite') {
      // SQLite upsert syntax
      const placeholders = keys.map(() => '?').join(', ');
      const updateSet = keys.filter(k => k !== uniqueKey)
        .map(k => `${k} = excluded.${k}`).join(', ');
      
      const sql = `
        INSERT INTO ${table} (${keys.join(', ')}) 
        VALUES (${placeholders})
        ON CONFLICT(${uniqueKey}) 
        DO UPDATE SET ${updateSet}
      `;
      
      return await this.run(sql, values);
    } else {
      // PostgreSQL upsert syntax
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const updateSet = keys.filter(k => k !== uniqueKey)
        .map((k, i) => `${k} = EXCLUDED.${k}`).join(', ');
      
      const sql = `
        INSERT INTO ${table} (${keys.join(', ')}) 
        VALUES (${placeholders})
        ON CONFLICT(${uniqueKey}) 
        DO UPDATE SET ${updateSet}
        RETURNING *
      `;
      
      const result = await this.query(sql, values);
      return {
        lastInsertRowid: result.rows[0]?.id,
        changes: result.rowCount
      };
    }
  }

  // Compatibility for code expecting synchronous operations
  // These methods log warnings and return promises
  wrapSyncMethod(methodName) {
    return (...args) => {
      console.warn(`⚠️ Synchronous ${methodName} called - please update to use async/await`);
      return this[methodName](...args);
    };
  }
}

// Create and export singleton instance
let databaseService;

// Initialize on first require
if (!databaseService) {
  databaseService = new UnifiedDatabaseService();
  
  // Add backward compatibility warnings for synchronous usage
  const syncMethods = ['get', 'all', 'run'];
  syncMethods.forEach(method => {
    const asyncMethod = databaseService[method];
    databaseService[`${method}Sync`] = databaseService.wrapSyncMethod(method);
  });
}

module.exports = databaseService;