// Database Performance Benchmarking for LIMS Application
// This script performs comprehensive database performance testing

const { Client } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const config = {
  postgresql: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'lims_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
  },
  benchmark: {
    iterations: 1000,
    concurrency: 10,
    warmupIterations: 100,
    testDataSize: 10000,
  }
};

// Test data generators
function generateSampleData(id) {
  return {
    id: id,
    sample_id: `SAMPLE_${id.toString().padStart(6, '0')}`,
    client_id: `CLIENT_${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
    sample_type: ['blood', 'saliva', 'tissue', 'urine', 'swab'][Math.floor(Math.random() * 5)],
    test_type: ['genetic', 'chemical', 'biological', 'pathology'][Math.floor(Math.random() * 4)],
    priority: ['low', 'normal', 'high', 'urgent'][Math.floor(Math.random() * 4)],
    status: ['pending', 'in_progress', 'completed', 'failed'][Math.floor(Math.random() * 4)],
    volume: Math.floor(Math.random() * 10) + 1,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    notes: `Test sample ${id} for performance benchmarking`
  };
}

function generateClientData(id) {
  return {
    id: id,
    client_id: `CLIENT_${id.toString().padStart(3, '0')}`,
    name: `Test Client ${id}`,
    email: `client${id}@example.com`,
    phone: `+1555${id.toString().padStart(7, '0')}`,
    address: `${id} Test Street`,
    city: 'Test City',
    state: 'TS',
    zip_code: '12345',
    country: 'USA',
    client_type: ['hospital', 'clinic', 'research', 'individual'][Math.floor(Math.random() * 4)],
    created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  };
}

function generateGeneticAnalysisData(id) {
  const genes = ['BRCA1', 'BRCA2', 'TP53', 'KRAS', 'EGFR', 'PIK3CA', 'APC', 'MLH1'];
  const selectedGenes = genes.slice(0, Math.floor(Math.random() * 4) + 1);
  
  return {
    id: id,
    sample_id: `SAMPLE_${Math.floor(Math.random() * 1000).toString().padStart(6, '0')}`,
    analysis_type: ['snp', 'cnv', 'indel', 'structural', 'pharmacogenomics'][Math.floor(Math.random() * 5)],
    genes: selectedGenes,
    priority: ['low', 'normal', 'high', 'urgent'][Math.floor(Math.random() * 4)],
    status: ['pending', 'in_progress', 'completed', 'failed'][Math.floor(Math.random() * 4)],
    created_at: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    results: Math.random() > 0.5 ? {
      variants: Math.floor(Math.random() * 50),
      mutations: Math.floor(Math.random() * 10),
      confidence: Math.random() * 100
    } : null
  };
}

// Database connection managers
class DatabaseManager {
  constructor() {
    this.pgClient = null;
    this.redisClient = null;
  }

  async connect() {
    try {
      // Connect to PostgreSQL
      this.pgClient = new Client(config.postgresql);
      await this.pgClient.connect();
      console.log('Connected to PostgreSQL');

      // Connect to Redis
      this.redisClient = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });
      
      await this.redisClient.connect();
      console.log('Connected to Redis');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.pgClient) {
        await this.pgClient.end();
        console.log('Disconnected from PostgreSQL');
      }
      
      if (this.redisClient) {
        await this.redisClient.disconnect();
        console.log('Disconnected from Redis');
      }
    } catch (error) {
      console.error('Database disconnection error:', error);
    }
  }

  async setupTables() {
    try {
      console.log('Setting up database tables...');
      
      // Create samples table
      await this.pgClient.query(`
        CREATE TABLE IF NOT EXISTS samples (
          id SERIAL PRIMARY KEY,
          sample_id VARCHAR(50) UNIQUE NOT NULL,
          client_id VARCHAR(50) NOT NULL,
          sample_type VARCHAR(20) NOT NULL,
          test_type VARCHAR(20) NOT NULL,
          priority VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          volume INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
        )
      `);

      // Create clients table
      await this.pgClient.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          client_id VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(50),
          zip_code VARCHAR(20),
          country VARCHAR(100),
          client_type VARCHAR(20),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create genetic_analysis table
      await this.pgClient.query(`
        CREATE TABLE IF NOT EXISTS genetic_analysis (
          id SERIAL PRIMARY KEY,
          sample_id VARCHAR(50) NOT NULL,
          analysis_type VARCHAR(50) NOT NULL,
          genes TEXT[],
          priority VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          results JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await this.pgClient.query('CREATE INDEX IF NOT EXISTS idx_samples_client_id ON samples(client_id)');
      await this.pgClient.query('CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status)');
      await this.pgClient.query('CREATE INDEX IF NOT EXISTS idx_samples_created_at ON samples(created_at)');
      await this.pgClient.query('CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id)');
      await this.pgClient.query('CREATE INDEX IF NOT EXISTS idx_genetic_analysis_sample_id ON genetic_analysis(sample_id)');
      await this.pgClient.query('CREATE INDEX IF NOT EXISTS idx_genetic_analysis_status ON genetic_analysis(status)');

      console.log('Database tables and indexes created successfully');
    } catch (error) {
      console.error('Error setting up tables:', error);
      throw error;
    }
  }

  async cleanupTables() {
    try {
      console.log('Cleaning up database tables...');
      
      await this.pgClient.query('DROP TABLE IF EXISTS genetic_analysis');
      await this.pgClient.query('DROP TABLE IF EXISTS samples');
      await this.pgClient.query('DROP TABLE IF EXISTS clients');
      
      // Clear Redis
      await this.redisClient.flushDb();
      
      console.log('Database tables cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up tables:', error);
    }
  }
}

// Benchmark runner
class BenchmarkRunner {
  constructor(dbManager) {
    this.db = dbManager;
    this.results = {
      postgresql: {
        insert: [],
        select: [],
        update: [],
        delete: [],
        complex_query: []
      },
      redis: {
        set: [],
        get: [],
        delete: [],
        complex_operations: []
      }
    };
  }

  async runBenchmarks() {
    console.log('Starting database performance benchmarks...');
    
    // Setup test data
    await this.setupTestData();
    
    // Run PostgreSQL benchmarks
    await this.runPostgreSQLBenchmarks();
    
    // Run Redis benchmarks
    await this.runRedisBenchmarks();
    
    // Generate report
    this.generateReport();
    
    console.log('Database performance benchmarks completed');
  }

  async setupTestData() {
    console.log('Setting up test data...');
    
    // Generate sample data
    const sampleData = [];
    for (let i = 1; i <= config.benchmark.testDataSize; i++) {
      sampleData.push(generateSampleData(i));
    }

    // Generate client data
    const clientData = [];
    for (let i = 1; i <= Math.floor(config.benchmark.testDataSize / 10); i++) {
      clientData.push(generateClientData(i));
    }

    // Generate genetic analysis data
    const geneticData = [];
    for (let i = 1; i <= Math.floor(config.benchmark.testDataSize / 5); i++) {
      geneticData.push(generateGeneticAnalysisData(i));
    }

    // Insert test data
    const startTime = Date.now();
    
    // Insert clients
    for (const client of clientData) {
      await this.db.pgClient.query(
        'INSERT INTO clients (client_id, name, email, phone, address, city, state, zip_code, country, client_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [client.client_id, client.name, client.email, client.phone, client.address, client.city, client.state, client.zip_code, client.country, client.client_type]
      );
    }

    // Insert samples
    for (const sample of sampleData) {
      await this.db.pgClient.query(
        'INSERT INTO samples (sample_id, client_id, sample_type, test_type, priority, status, volume, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [sample.sample_id, sample.client_id, sample.sample_type, sample.test_type, sample.priority, sample.status, sample.volume, sample.notes]
      );
    }

    // Insert genetic analysis
    for (const analysis of geneticData) {
      await this.db.pgClient.query(
        'INSERT INTO genetic_analysis (sample_id, analysis_type, genes, priority, status, results) VALUES ($1, $2, $3, $4, $5, $6)',
        [analysis.sample_id, analysis.analysis_type, analysis.genes, analysis.priority, analysis.status, JSON.stringify(analysis.results)]
      );
    }

    const setupTime = Date.now() - startTime;
    console.log(`Test data setup completed in ${setupTime}ms`);
  }

  async runPostgreSQLBenchmarks() {
    console.log('Running PostgreSQL benchmarks...');

    // Warmup
    await this.runWarmup();

    // INSERT benchmark
    await this.benchmarkPostgreSQLInsert();

    // SELECT benchmark
    await this.benchmarkPostgreSQLSelect();

    // UPDATE benchmark
    await this.benchmarkPostgreSQLUpdate();

    // DELETE benchmark
    await this.benchmarkPostgreSQLDelete();

    // Complex query benchmark
    await this.benchmarkPostgreSQLComplexQuery();
  }

  async runWarmup() {
    console.log('Running warmup queries...');
    
    for (let i = 0; i < config.benchmark.warmupIterations; i++) {
      await this.db.pgClient.query('SELECT 1');
    }
  }

  async benchmarkPostgreSQLInsert() {
    console.log('Benchmarking PostgreSQL INSERT operations...');
    
    const times = [];
    
    for (let i = 0; i < config.benchmark.iterations; i++) {
      const sample = generateSampleData(10000 + i);
      const startTime = process.hrtime.bigint();
      
      try {
        await this.db.pgClient.query(
          'INSERT INTO samples (sample_id, client_id, sample_type, test_type, priority, status, volume, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [sample.sample_id, sample.client_id, sample.sample_type, sample.test_type, sample.priority, sample.status, sample.volume, sample.notes]
        );
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        times.push(duration);
      } catch (error) {
        console.error('INSERT error:', error);
      }
    }
    
    this.results.postgresql.insert = times;
    console.log(`INSERT benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  async benchmarkPostgreSQLSelect() {
    console.log('Benchmarking PostgreSQL SELECT operations...');
    
    const times = [];
    
    for (let i = 0; i < config.benchmark.iterations; i++) {
      const startTime = process.hrtime.bigint();
      
      try {
        await this.db.pgClient.query('SELECT * FROM samples WHERE status = $1 LIMIT 10', ['pending']);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        times.push(duration);
      } catch (error) {
        console.error('SELECT error:', error);
      }
    }
    
    this.results.postgresql.select = times;
    console.log(`SELECT benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  async benchmarkPostgreSQLUpdate() {
    console.log('Benchmarking PostgreSQL UPDATE operations...');
    
    const times = [];
    
    for (let i = 0; i < config.benchmark.iterations; i++) {
      const sampleId = `SAMPLE_${Math.floor(Math.random() * 1000).toString().padStart(6, '0')}`;
      const startTime = process.hrtime.bigint();
      
      try {
        await this.db.pgClient.query('UPDATE samples SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE sample_id = $2', ['in_progress', sampleId]);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        times.push(duration);
      } catch (error) {
        console.error('UPDATE error:', error);
      }
    }
    
    this.results.postgresql.update = times;
    console.log(`UPDATE benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  async benchmarkPostgreSQLDelete() {
    console.log('Benchmarking PostgreSQL DELETE operations...');
    
    const times = [];
    
    for (let i = 0; i < Math.min(config.benchmark.iterations, 100); i++) {
      const sampleId = `SAMPLE_${(10000 + i).toString().padStart(6, '0')}`;
      const startTime = process.hrtime.bigint();
      
      try {
        await this.db.pgClient.query('DELETE FROM samples WHERE sample_id = $1', [sampleId]);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        times.push(duration);
      } catch (error) {
        console.error('DELETE error:', error);
      }
    }
    
    this.results.postgresql.delete = times;
    console.log(`DELETE benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  async benchmarkPostgreSQLComplexQuery() {
    console.log('Benchmarking PostgreSQL complex queries...');
    
    const times = [];
    
    for (let i = 0; i < config.benchmark.iterations; i++) {
      const startTime = process.hrtime.bigint();
      
      try {
        await this.db.pgClient.query(`
          SELECT 
            c.name as client_name,
            COUNT(s.id) as total_samples,
            COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_samples,
            COUNT(ga.id) as genetic_analyses,
            AVG(s.volume) as avg_volume
          FROM clients c
          LEFT JOIN samples s ON c.client_id = s.client_id
          LEFT JOIN genetic_analysis ga ON s.sample_id = ga.sample_id
          WHERE c.created_at > $1
          GROUP BY c.id, c.name
          ORDER BY total_samples DESC
          LIMIT 10
        `, [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        times.push(duration);
      } catch (error) {
        console.error('Complex query error:', error);
      }
    }
    
    this.results.postgresql.complex_query = times;
    console.log(`Complex query benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  async runRedisBenchmarks() {
    console.log('Running Redis benchmarks...');

    // SET benchmark
    await this.benchmarkRedisSet();

    // GET benchmark
    await this.benchmarkRedisGet();

    // DELETE benchmark
    await this.benchmarkRedisDelete();

    // Complex operations benchmark
    await this.benchmarkRedisComplexOperations();
  }

  async benchmarkRedisSet() {
    console.log('Benchmarking Redis SET operations...');
    
    const times = [];
    
    for (let i = 0; i < config.benchmark.iterations; i++) {
      const key = `sample:${i}`;
      const value = JSON.stringify(generateSampleData(i));
      const startTime = process.hrtime.bigint();
      
      try {
        await this.db.redisClient.set(key, value);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        times.push(duration);
      } catch (error) {
        console.error('Redis SET error:', error);
      }
    }
    
    this.results.redis.set = times;
    console.log(`Redis SET benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  async benchmarkRedisGet() {
    console.log('Benchmarking Redis GET operations...');
    
    const times = [];
    
    for (let i = 0; i < config.benchmark.iterations; i++) {
      const key = `sample:${Math.floor(Math.random() * config.benchmark.iterations)}`;
      const startTime = process.hrtime.bigint();
      
      try {
        await this.db.redisClient.get(key);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        times.push(duration);
      } catch (error) {
        console.error('Redis GET error:', error);
      }
    }
    
    this.results.redis.get = times;
    console.log(`Redis GET benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  async benchmarkRedisDelete() {
    console.log('Benchmarking Redis DELETE operations...');
    
    const times = [];
    
    for (let i = 0; i < Math.min(config.benchmark.iterations, 100); i++) {
      const key = `sample:${i}`;
      const startTime = process.hrtime.bigint();
      
      try {
        await this.db.redisClient.del(key);
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        times.push(duration);
      } catch (error) {
        console.error('Redis DELETE error:', error);
      }
    }
    
    this.results.redis.delete = times;
    console.log(`Redis DELETE benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  async benchmarkRedisComplexOperations() {
    console.log('Benchmarking Redis complex operations...');
    
    const times = [];
    
    for (let i = 0; i < config.benchmark.iterations; i++) {
      const startTime = process.hrtime.bigint();
      
      try {
        const pipeline = this.db.redisClient.multi();
        
        // Add multiple operations to pipeline
        pipeline.set(`complex:${i}:data`, JSON.stringify({ id: i, timestamp: Date.now() }));
        pipeline.lpush(`complex:${i}:list`, 'item1', 'item2', 'item3');
        pipeline.sadd(`complex:${i}:set`, 'member1', 'member2', 'member3');
        pipeline.hset(`complex:${i}:hash`, 'field1', 'value1', 'field2', 'value2');
        pipeline.expire(`complex:${i}:data`, 300);
        
        await pipeline.exec();
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        times.push(duration);
      } catch (error) {
        console.error('Redis complex operations error:', error);
      }
    }
    
    this.results.redis.complex_operations = times;
    console.log(`Redis complex operations benchmark completed. Average time: ${this.calculateAverage(times).toFixed(2)}ms`);
  }

  calculateAverage(times) {
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  calculatePercentile(times, percentile) {
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  generateReport() {
    console.log('Generating database performance report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      configuration: config,
      results: {
        postgresql: {},
        redis: {}
      },
      summary: {
        postgresql: {},
        redis: {}
      }
    };

    // Process PostgreSQL results
    Object.keys(this.results.postgresql).forEach(operation => {
      const times = this.results.postgresql[operation];
      if (times.length > 0) {
        report.results.postgresql[operation] = {
          count: times.length,
          average: this.calculateAverage(times),
          min: Math.min(...times),
          max: Math.max(...times),
          p50: this.calculatePercentile(times, 50),
          p95: this.calculatePercentile(times, 95),
          p99: this.calculatePercentile(times, 99),
          throughput: times.length / (Math.max(...times) - Math.min(...times)) * 1000
        };
      }
    });

    // Process Redis results
    Object.keys(this.results.redis).forEach(operation => {
      const times = this.results.redis[operation];
      if (times.length > 0) {
        report.results.redis[operation] = {
          count: times.length,
          average: this.calculateAverage(times),
          min: Math.min(...times),
          max: Math.max(...times),
          p50: this.calculatePercentile(times, 50),
          p95: this.calculatePercentile(times, 95),
          p99: this.calculatePercentile(times, 99),
          throughput: times.length / (Math.max(...times) - Math.min(...times)) * 1000
        };
      }
    });

    // Generate summary
    const pgOperations = Object.keys(report.results.postgresql);
    const redisOperations = Object.keys(report.results.redis);

    if (pgOperations.length > 0) {
      report.summary.postgresql = {
        total_operations: pgOperations.reduce((sum, op) => sum + report.results.postgresql[op].count, 0),
        average_response_time: pgOperations.reduce((sum, op) => sum + report.results.postgresql[op].average, 0) / pgOperations.length,
        best_operation: pgOperations.reduce((best, op) => 
          report.results.postgresql[op].average < report.results.postgresql[best].average ? op : best
        ),
        worst_operation: pgOperations.reduce((worst, op) => 
          report.results.postgresql[op].average > report.results.postgresql[worst].average ? op : worst
        )
      };
    }

    if (redisOperations.length > 0) {
      report.summary.redis = {
        total_operations: redisOperations.reduce((sum, op) => sum + report.results.redis[op].count, 0),
        average_response_time: redisOperations.reduce((sum, op) => sum + report.results.redis[op].average, 0) / redisOperations.length,
        best_operation: redisOperations.reduce((best, op) => 
          report.results.redis[op].average < report.results.redis[best].average ? op : best
        ),
        worst_operation: redisOperations.reduce((worst, op) => 
          report.results.redis[op].average > report.results.redis[worst].average ? op : worst
        )
      };
    }

    // Save report
    const reportPath = path.join(__dirname, `database-benchmark-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`Database performance report saved: ${reportPath}`);
    console.log('\n--- Database Performance Summary ---');
    console.log('PostgreSQL:');
    if (report.summary.postgresql.total_operations) {
      console.log(`  Total Operations: ${report.summary.postgresql.total_operations}`);
      console.log(`  Average Response Time: ${report.summary.postgresql.average_response_time.toFixed(2)}ms`);
      console.log(`  Best Operation: ${report.summary.postgresql.best_operation}`);
      console.log(`  Worst Operation: ${report.summary.postgresql.worst_operation}`);
    }
    
    console.log('\nRedis:');
    if (report.summary.redis.total_operations) {
      console.log(`  Total Operations: ${report.summary.redis.total_operations}`);
      console.log(`  Average Response Time: ${report.summary.redis.average_response_time.toFixed(2)}ms`);
      console.log(`  Best Operation: ${report.summary.redis.best_operation}`);
      console.log(`  Worst Operation: ${report.summary.redis.worst_operation}`);
    }
    
    return report;
  }
}

// Main execution
async function main() {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.connect();
    await dbManager.setupTables();
    
    const benchmarkRunner = new BenchmarkRunner(dbManager);
    await benchmarkRunner.runBenchmarks();
    
    await dbManager.cleanupTables();
  } catch (error) {
    console.error('Database benchmark error:', error);
    process.exit(1);
  } finally {
    await dbManager.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseManager, BenchmarkRunner };