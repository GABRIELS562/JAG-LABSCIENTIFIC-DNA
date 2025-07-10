const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.DB_MODE = 'sqlite';
process.env.LOG_LEVEL = 'error';

// Disable console output during tests unless explicitly enabled
if (!process.env.ENABLE_TEST_LOGS) {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };

  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.error = (message) => {
    // Only show actual errors, not expected test errors
    if (message && typeof message === 'string' && message.includes('Test:')) {
      originalConsole.error(message);
    }
  };
}

// Global test utilities
global.expect = require('chai').expect;
global.request = require('supertest');
global.sinon = require('sinon');

// Test database utilities
const fs = require('fs');
const Database = require('better-sqlite3');

// Create test database utilities
global.createTestDatabase = () => {
  const testDbPath = path.join(__dirname, '../database/test_ashley_lims.db');
  
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  const db = new Database(testDbPath);
  
  // Load schema
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  
  // Load genetic schema if it exists
  const geneticSchemaPath = path.join(__dirname, '../database/genetic-schema-sqlite.sql');
  if (fs.existsSync(geneticSchemaPath)) {
    const geneticSchema = fs.readFileSync(geneticSchemaPath, 'utf8');
    db.exec(geneticSchema);
  }
  
  return db;
};

global.cleanupTestDatabase = () => {
  const testDbPath = path.join(__dirname, '../database/test_ashley_lims.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
};

// Mock data generators
global.generateTestSample = (overrides = {}) => ({
  case_id: 1,
  lab_number: '25_1',
  name: 'John',
  surname: 'Doe',
  date_of_birth: '1990-01-01',
  relation: 'Child',
  status: 'pending',
  workflow_status: 'sample_collected',
  case_number: 'CASE_2025_001',
  gender: 'M',
  created_at: new Date().toISOString(),
  ...overrides
});

global.generateTestCase = (overrides = {}) => ({
  case_number: 'CASE_2025_001',
  ref_kit_number: 'KIT_001',
  submission_date: '2025-01-01',
  client_type: 'paternity',
  status: 'pending',
  created_at: new Date().toISOString(),
  ...overrides
});

global.generateTestBatch = (overrides = {}) => ({
  batch_number: 'BATCH_001',
  operator: 'Test Operator',
  total_samples: 5,
  status: 'active',
  created_at: new Date().toISOString(),
  ...overrides
});

// Test data cleanup utilities
global.cleanupTestData = (db) => {
  const tables = [
    'well_assignments',
    'quality_control',
    'reports',
    'samples',
    'test_cases',
    'batches',
    'equipment',
    'signatures',
    'witnesses'
  ];
  
  // Disable foreign key constraints temporarily
  db.exec('PRAGMA foreign_keys = OFF');
  
  tables.forEach(table => {
    try {
      db.exec(`DELETE FROM ${table}`);
    } catch (error) {
      // Table might not exist, ignore
    }
  });
  
  // Re-enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON');
};

// API testing utilities
global.createTestApp = () => {
  const express = require('express');
  const cors = require('cors');
  
  // Import middleware
  const { globalErrorHandler } = require('../middleware/errorHandler');
  const { sanitizeInput } = require('../middleware/validation');
  
  // Import routes
  const apiRoutes = require('../routes/api');
  const authRoutes = require('../routes/auth');
  const monitoringRoutes = require('../routes/monitoring');
  
  const app = express();
  
  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(sanitizeInput);
  
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', apiRoutes);
  app.use('/monitoring', monitoringRoutes);
  
  // Error handling
  app.use(globalErrorHandler);
  
  return app;
};

// Authentication helpers for tests
global.generateTestToken = () => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: 1, 
      username: 'testuser', 
      role: 'staff' 
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Performance testing utilities
global.measureAsyncOperation = async (operation, description = 'Operation') => {
  const start = process.hrtime.bigint();
  const result = await operation();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
  
  console.log(`${description}: ${duration.toFixed(2)}ms`);
  
  return { result, duration };
};

// Database assertion helpers
global.expectDatabaseToHave = (db, table, conditions) => {
  const whereClause = Object.keys(conditions)
    .map(key => `${key} = ?`)
    .join(' AND ');
  
  const values = Object.values(conditions);
  
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`);
  const result = stmt.get(...values);
  
  expect(result.count).to.be.greaterThan(0, 
    `Expected to find record in ${table} with conditions: ${JSON.stringify(conditions)}`
  );
};

global.expectDatabaseNotToHave = (db, table, conditions) => {
  const whereClause = Object.keys(conditions)
    .map(key => `${key} = ?`)
    .join(' AND ');
  
  const values = Object.values(conditions);
  
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`);
  const result = stmt.get(...values);
  
  expect(result.count).to.equal(0, 
    `Expected not to find record in ${table} with conditions: ${JSON.stringify(conditions)}`
  );
};

// Async testing helpers
global.eventually = (assertion, options = {}) => {
  const { timeout = 5000, interval = 100 } = options;
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      try {
        assertion();
        resolve();
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(new Error(`Assertion failed after ${timeout}ms: ${error.message}`));
        } else {
          setTimeout(check, interval);
        }
      }
    };
    
    check();
  });
};