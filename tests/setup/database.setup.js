// Database Setup for Testing
// This file provides database utilities and fixtures for comprehensive testing

const { Pool } = require('pg');
const Redis = require('ioredis');
const { migrate } = require('../../backend/database/migrate');
const { seed } = require('../../backend/database/seed');

// Test database configuration
const TEST_DATABASE_CONFIG = {
  host: process.env.TEST_DATABASE_HOST || 'localhost',
  port: process.env.TEST_DATABASE_PORT || 5432,
  database: process.env.TEST_DATABASE_NAME || 'lims_test',
  user: process.env.TEST_DATABASE_USER || 'lims_user',
  password: process.env.TEST_DATABASE_PASSWORD || 'lims_password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Test Redis configuration
const TEST_REDIS_CONFIG = {
  host: process.env.TEST_REDIS_HOST || 'localhost',
  port: process.env.TEST_REDIS_PORT || 6379,
  db: process.env.TEST_REDIS_DB || 1,
  retryDelayOnFailure: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

class DatabaseTestHelper {
  constructor() {
    this.pool = null;
    this.redis = null;
    this.isSetup = false;
  }

  // Initialize database connections
  async initialize() {
    if (this.isSetup) return;

    try {
      // Setup PostgreSQL connection
      this.pool = new Pool(TEST_DATABASE_CONFIG);
      
      // Test PostgreSQL connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      // Setup Redis connection
      this.redis = new Redis(TEST_REDIS_CONFIG);
      await this.redis.ping();
      
      this.isSetup = true;
      console.log('✅ Database test helper initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database test helper:', error.message);
      throw error;
    }
  }

  // Clean database before each test
  async cleanDatabase() {
    if (!this.isSetup) await this.initialize();

    try {
      // Clean PostgreSQL
      await this.pool.query('TRUNCATE TABLE samples, analyses, users, reports, audit_logs CASCADE');
      
      // Reset sequences
      await this.pool.query(`
        SELECT setval(pg_get_serial_sequence('samples', 'id'), 1, false);
        SELECT setval(pg_get_serial_sequence('analyses', 'id'), 1, false);
        SELECT setval(pg_get_serial_sequence('users', 'id'), 1, false);
        SELECT setval(pg_get_serial_sequence('reports', 'id'), 1, false);
      `);
      
      // Clean Redis
      await this.redis.flushdb();
      
      console.log('🧹 Database cleaned successfully');
    } catch (error) {
      console.error('❌ Failed to clean database:', error.message);
      throw error;
    }
  }

  // Setup test data
  async setupTestData() {
    if (!this.isSetup) await this.initialize();

    try {
      // Insert test users
      await this.pool.query(`
        INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
        VALUES 
          (1, 'testuser', 'test@example.com', '$2b$10$hash', 'user', NOW(), NOW()),
          (2, 'testadmin', 'admin@example.com', '$2b$10$hash', 'admin', NOW(), NOW()),
          (3, 'testlab', 'lab@example.com', '$2b$10$hash', 'lab_tech', NOW(), NOW())
      `);

      // Insert test samples
      await this.pool.query(`
        INSERT INTO samples (id, sample_id, patient_id, sample_type, status, created_by, created_at, updated_at)
        VALUES 
          (1, 'SAMPLE001', 'PATIENT001', 'DNA', 'received', 1, NOW(), NOW()),
          (2, 'SAMPLE002', 'PATIENT002', 'RNA', 'processing', 1, NOW(), NOW()),
          (3, 'SAMPLE003', 'PATIENT003', 'DNA', 'completed', 1, NOW(), NOW())
      `);

      // Insert test analyses
      await this.pool.query(`
        INSERT INTO analyses (id, sample_id, analysis_type, status, results, created_by, created_at, updated_at)
        VALUES 
          (1, 1, 'STR', 'pending', NULL, 2, NOW(), NOW()),
          (2, 2, 'SNP', 'in_progress', NULL, 2, NOW(), NOW()),
          (3, 3, 'STR', 'completed', '{"markers": ["D8S1179", "D21S11"]}', 2, NOW(), NOW())
      `);

      // Setup Redis test data
      await this.redis.set('test:session:user1', JSON.stringify({
        userId: 1,
        username: 'testuser',
        role: 'user',
        loginTime: new Date().toISOString()
      }));

      await this.redis.set('test:cache:sample:1', JSON.stringify({
        id: 1,
        sampleId: 'SAMPLE001',
        status: 'received'
      }));

      console.log('📊 Test data setup completed');
    } catch (error) {
      console.error('❌ Failed to setup test data:', error.message);
      throw error;
    }
  }

  // Run database migrations
  async runMigrations() {
    if (!this.isSetup) await this.initialize();

    try {
      console.log('🔄 Running database migrations...');
      await migrate({
        database: TEST_DATABASE_CONFIG,
        migrationsPath: './backend/database/migrations'
      });
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Failed to run migrations:', error.message);
      throw error;
    }
  }

  // Seed database with test data
  async seedDatabase() {
    if (!this.isSetup) await this.initialize();

    try {
      console.log('🌱 Seeding database...');
      await seed({
        database: TEST_DATABASE_CONFIG,
        seedsPath: './backend/database/seeds/test'
      });
      console.log('✅ Database seeding completed');
    } catch (error) {
      console.error('❌ Failed to seed database:', error.message);
      throw error;
    }
  }

  // Execute raw SQL query
  async query(sql, params = []) {
    if (!this.isSetup) await this.initialize();
    
    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Database query failed:', error.message);
      throw error;
    }
  }

  // Get Redis client
  getRedisClient() {
    if (!this.isSetup) {
      throw new Error('Database helper not initialized');
    }
    return this.redis;
  }

  // Get PostgreSQL pool
  getPool() {
    if (!this.isSetup) {
      throw new Error('Database helper not initialized');
    }
    return this.pool;
  }

  // Create test transaction
  async createTransaction() {
    if (!this.isSetup) await this.initialize();
    
    const client = await this.pool.connect();
    await client.query('BEGIN');
    
    return {
      client,
      query: (sql, params) => client.query(sql, params),
      commit: () => client.query('COMMIT').then(() => client.release()),
      rollback: () => client.query('ROLLBACK').then(() => client.release())
    };
  }

  // Wait for specific condition
  async waitForCondition(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const result = await condition();
        if (result) return result;
      } catch (error) {
        // Ignore errors and continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  // Close all connections
  async cleanup() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      
      if (this.redis) {
        await this.redis.disconnect();
        this.redis = null;
      }
      
      this.isSetup = false;
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Failed to cleanup database connections:', error.message);
    }
  }
}

// Test fixture factories
class TestFixtures {
  static createUser(overrides = {}) {
    return {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      ...overrides
    };
  }

  static createSample(overrides = {}) {
    return {
      sampleId: `SAMPLE${Date.now()}`,
      patientId: `PATIENT${Date.now()}`,
      sampleType: 'DNA',
      status: 'received',
      collectionDate: new Date(),
      receivedDate: new Date(),
      ...overrides
    };
  }

  static createAnalysis(overrides = {}) {
    return {
      sampleId: 1,
      analysisType: 'STR',
      status: 'pending',
      requestedDate: new Date(),
      parameters: {
        markers: ['D8S1179', 'D21S11', 'D7S820'],
        threshold: 50
      },
      ...overrides
    };
  }

  static createReport(overrides = {}) {
    return {
      title: 'Test Report',
      type: 'genetic_analysis',
      status: 'draft',
      parameters: {
        sampleIds: [1, 2, 3],
        analysisTypes: ['STR'],
        format: 'PDF'
      },
      ...overrides
    };
  }
}

// Database matchers for Jest
const customMatchers = {
  // Check if record exists in database
  async toExistInDatabase(received, tableName, conditions = {}) {
    const helper = global.dbHelper;
    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    const query = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause ? `WHERE ${whereClause}` : ''}`;
    const values = Object.values(conditions);
    
    const result = await helper.query(query, values);
    const count = parseInt(result[0].count);
    
    return {
      pass: count > 0,
      message: () => `Expected record ${count > 0 ? 'not ' : ''}to exist in ${tableName}`
    };
  },

  // Check if Redis key exists
  async toExistInRedis(received, key) {
    const helper = global.dbHelper;
    const redis = helper.getRedisClient();
    const exists = await redis.exists(key);
    
    return {
      pass: exists === 1,
      message: () => `Expected Redis key '${key}' ${exists ? 'not ' : ''}to exist`
    };
  },

  // Check database count
  async toHaveCountInDatabase(received, tableName, expectedCount, conditions = {}) {
    const helper = global.dbHelper;
    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    const query = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause ? `WHERE ${whereClause}` : ''}`;
    const values = Object.values(conditions);
    
    const result = await helper.query(query, values);
    const count = parseInt(result[0].count);
    
    return {
      pass: count === expectedCount,
      message: () => `Expected ${expectedCount} records in ${tableName}, but found ${count}`
    };
  }
};

// Export database helper instance
const dbHelper = new DatabaseTestHelper();

module.exports = {
  DatabaseTestHelper,
  TestFixtures,
  customMatchers,
  dbHelper
};