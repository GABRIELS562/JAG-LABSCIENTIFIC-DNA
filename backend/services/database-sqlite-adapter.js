// SQLite Database Adapter
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SQLiteAdapter {
  constructor() {
    this.db = null;
    this.isConnected = false;
    this.dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database', 'ashley_lims.db');
    this.schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        // Ensure database directory exists
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        // Open database connection
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('SQLite connection error:', err);
            reject(err);
            return;
          }

          console.log(`✅ SQLite connected to ${this.dbPath}`);
          this.isConnected = true;

          // Initialize tables
          this.initializeTables()
            .then(() => resolve(true))
            .catch(reject);
        });
      } catch (error) {
        console.error('SQLite initialization error:', error);
        reject(error);
      }
    });
  }

  async initializeTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id TEXT UNIQUE NOT NULL,
        patient_name TEXT,
        sample_type TEXT,
        status TEXT DEFAULT 'pending',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS workflows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id TEXT,
        workflow_type TEXT,
        status TEXT,
        step_number INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS test_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id TEXT,
        test_type TEXT,
        status TEXT DEFAULT 'pending',
        results TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await this.exec(sql);
    }
    console.log('✅ SQLite tables initialized');
  }

  // Execute SQL (for schema creation)
  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Unified query method
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('SQLite query error:', err);
          reject(err);
        } else {
          resolve({ rows, rowCount: rows.length });
        }
      });
    });
  }

  // Prepare statement (SQLite-style)
  prepare(sql) {
    const self = this;
    return {
      async get(...params) {
        return new Promise((resolve, reject) => {
          self.db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
          });
        });
      },
      async all(...params) {
        return new Promise((resolve, reject) => {
          self.db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      },
      async run(...params) {
        return new Promise((resolve, reject) => {
          self.db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({
              lastInsertRowid: this.lastID,
              changes: this.changes
            });
          });
        });
      }
    };
  }

  // Direct method shortcuts
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({
          lastInsertRowid: this.lastID,
          changes: this.changes
        });
      });
    });
  }

  // Transaction support
  async beginTransaction() {
    await this.run('BEGIN TRANSACTION');
    return this; // Return self as "client"
  }

  async commit() {
    await this.run('COMMIT');
  }

  async rollback() {
    await this.run('ROLLBACK');
  }

  transaction(fn) {
    return async (...args) => {
      await this.beginTransaction();
      try {
        const result = await fn(...args);
        await this.commit();
        return result;
      } catch (error) {
        await this.rollback();
        throw error;
      }
    };
  }

  // SQLite pragma (for compatibility)
  pragma(setting, value) {
    return new Promise((resolve, reject) => {
      const sql = value !== undefined 
        ? `PRAGMA ${setting} = ${value}`
        : `PRAGMA ${setting}`;
      
      this.db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Health check
  async getHealthCheck() {
    try {
      await this.get('SELECT 1');
      return {
        status: 'healthy',
        connected: this.isConnected,
        database: 'sqlite',
        path: this.dbPath
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  // Statistics
  async getStatistics() {
    try {
      const stats = await this.get(`
        SELECT 
          (SELECT COUNT(*) FROM samples) as samples,
          (SELECT COUNT(*) FROM test_cases) as test_cases,
          (SELECT COUNT(*) FROM batches) as batches
      `);
      
      const fileStats = fs.statSync(this.dbPath);
      
      return {
        samples: stats.samples || 0,
        testCases: stats.test_cases || 0,
        batches: stats.batches || 0,
        dbSize: fileStats.size,
        database: 'sqlite'
      };
    } catch (error) {
      return null;
    }
  }

  // Close connection
  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) console.error('Error closing SQLite:', err);
          else console.log('SQLite connection closed');
          this.isConnected = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Compatibility method
  ensureInitialized() {
    if (!this.isConnected) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }
}

module.exports = SQLiteAdapter;