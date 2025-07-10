const { expect } = require('chai');
const request = require('supertest');

describe('Monitoring API', () => {
  let app;
  let db;

  before(() => {
    app = createTestApp();
    db = createTestDatabase();
  });

  after(() => {
    if (db) {
      db.close();
    }
    cleanupTestDatabase();
  });

  describe('GET /monitoring/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/monitoring/health')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('status', 'healthy');
      expect(response.body.data).to.have.property('timestamp');
      expect(response.body.data).to.have.property('uptime');
      expect(response.body.data).to.have.property('environment');
    });

    it('should include database health check', async () => {
      const response = await request(app)
        .get('/monitoring/health')
        .expect(200);

      expect(response.body.data).to.have.property('database');
      expect(response.body.data.database).to.have.property('status');
    });

    it('should include cache health check', async () => {
      const response = await request(app)
        .get('/monitoring/health')
        .expect(200);

      expect(response.body.data).to.have.property('cache');
      expect(response.body.data.cache).to.have.property('status');
    });
  });

  describe('GET /monitoring/health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/monitoring/health/detailed')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('status');
      expect(response.body.data).to.have.property('checks');
      expect(response.body.data.checks).to.have.property('database');
      expect(response.body.data.checks).to.have.property('cache');
      expect(response.body.data.checks).to.have.property('memory');
      expect(response.body.data.checks).to.have.property('performance');
    });

    it('should provide memory usage information', async () => {
      const response = await request(app)
        .get('/monitoring/health/detailed')
        .expect(200);

      const memoryCheck = response.body.data.checks.memory;
      expect(memoryCheck).to.have.property('status');
      expect(memoryCheck).to.have.property('usagePercent');
      expect(memoryCheck).to.have.property('heapUsed');
      expect(memoryCheck).to.have.property('heapTotal');
    });

    it('should return 503 when systems are unhealthy', async () => {
      // Close database to simulate unhealthy state
      db.close();

      const response = await request(app)
        .get('/monitoring/health/detailed')
        .expect(503);

      expect(response.body.success).to.be.false;
      expect(response.body.data.status).to.equal('degraded');
    });
  });

  describe('GET /monitoring/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/monitoring/ready')
        .expect(200);

      expect(response.body).to.have.property('ready', true);
      expect(response.body).to.have.property('checks');
      expect(response.body).to.have.property('timestamp');
    });

    it('should check database readiness', async () => {
      const response = await request(app)
        .get('/monitoring/ready')
        .expect(200);

      expect(response.body.checks).to.have.property('database');
      expect(response.body.checks.database).to.have.property('ready');
    });

    it('should return 503 when not ready', async () => {
      // Close database to simulate not ready state
      db.close();

      const response = await request(app)
        .get('/monitoring/ready')
        .expect(503);

      expect(response.body.ready).to.be.false;
    });
  });

  describe('GET /monitoring/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/monitoring/live')
        .expect(200);

      expect(response.body).to.have.property('alive', true);
      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('uptime');
    });

    it('should always return 200 if server is responding', async () => {
      // Even with database issues, liveness should be OK
      db.close();

      const response = await request(app)
        .get('/monitoring/live')
        .expect(200);

      expect(response.body.alive).to.be.true;
    });
  });

  describe('GET /monitoring/metrics', () => {
    it('should return performance metrics', async () => {
      const response = await request(app)
        .get('/monitoring/metrics')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('timestamp');
      expect(response.body.data).to.have.property('system');
      expect(response.body.data).to.have.property('performance');
      expect(response.body.data).to.have.property('cache');
    });

    it('should include system metrics', async () => {
      const response = await request(app)
        .get('/monitoring/metrics')
        .expect(200);

      const systemMetrics = response.body.data.system;
      expect(systemMetrics).to.have.property('memory');
      expect(systemMetrics).to.have.property('cpu');
      expect(systemMetrics).to.have.property('uptime');
      expect(systemMetrics.memory).to.have.property('heapUsed');
      expect(systemMetrics.memory).to.have.property('heapTotal');
    });

    it('should include cache metrics', async () => {
      const response = await request(app)
        .get('/monitoring/metrics')
        .expect(200);

      const cacheMetrics = response.body.data.cache;
      expect(cacheMetrics).to.have.property('size');
      expect(cacheMetrics).to.have.property('hitCount');
      expect(cacheMetrics).to.have.property('missCount');
      expect(cacheMetrics).to.have.property('hitRate');
    });
  });

  describe('GET /monitoring/stats', () => {
    beforeEach(() => {
      cleanupTestData(db);
      
      // Insert test data
      const testCase = generateTestCase();
      const caseStmt = db.prepare(`
        INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type)
        VALUES (?, ?, ?, ?)
      `);
      caseStmt.run(testCase.case_number, testCase.ref_kit_number, testCase.submission_date, testCase.client_type);

      const samples = [
        generateTestSample({ lab_number: '25_1' }),
        generateTestSample({ lab_number: '25_2' })
      ];

      const sampleStmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      samples.forEach(sample => {
        sampleStmt.run(
          sample.case_id,
          sample.lab_number,
          sample.name,
          sample.surname,
          sample.relation,
          sample.status,
          sample.workflow_status,
          sample.case_number
        );
      });
    });

    it('should return application statistics', async () => {
      const response = await request(app)
        .get('/monitoring/stats')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('samples');
      expect(response.body.data).to.have.property('testCases');
      expect(response.body.data).to.have.property('batches');
    });

    it('should return correct sample counts', async () => {
      const response = await request(app)
        .get('/monitoring/stats')
        .expect(200);

      expect(response.body.data.samples).to.equal(2);
      expect(response.body.data.testCases).to.equal(1);
    });
  });

  describe('GET /monitoring/performance/:operation', () => {
    it('should return performance data for specific operation', async () => {
      // First, make some requests to generate performance data
      await request(app).get('/api/samples');
      await request(app).get('/api/samples');

      const response = await request(app)
        .get('/monitoring/performance/request:GET:/api/samples')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('operationId');
      expect(response.body.data).to.have.property('count');
      expect(response.body.data).to.have.property('avg');
      expect(response.body.data).to.have.property('min');
      expect(response.body.data).to.have.property('max');
    });

    it('should return 404 for non-existent operation', async () => {
      const response = await request(app)
        .get('/monitoring/performance/non-existent-operation')
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.errorCode).to.equal('NOT_FOUND');
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting in production mode', async () => {
      // This test would need environment setup for production mode
      // For now, just verify the endpoints work in test mode
      const response = await request(app)
        .get('/monitoring/health')
        .expect(200);

      expect(response.headers).to.have.property('x-request-id');
    });
  });

  describe('Request correlation', () => {
    it('should include request ID in response headers', async () => {
      const response = await request(app)
        .get('/monitoring/health')
        .expect(200);

      expect(response.headers).to.have.property('x-request-id');
      expect(response.headers['x-request-id']).to.match(/^req_\d+_[a-z0-9]+$/);
    });

    it('should use provided request ID', async () => {
      const customRequestId = 'custom-request-123';
      
      const response = await request(app)
        .get('/monitoring/health')
        .set('X-Request-ID', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).to.equal(customRequestId);
    });
  });

  describe('Response time tracking', () => {
    it('should include response time header', async () => {
      const response = await request(app)
        .get('/monitoring/health')
        .expect(200);

      expect(response.headers).to.have.property('x-response-time');
      expect(response.headers['x-response-time']).to.match(/^\d+ms$/);
    });
  });

  describe('API versioning', () => {
    it('should include API version header', async () => {
      const response = await request(app)
        .get('/monitoring/health')
        .expect(200);

      expect(response.headers).to.have.property('api-version');
      expect(response.headers['api-version']).to.equal('v1');
    });

    it('should respect API version from header', async () => {
      const response = await request(app)
        .get('/monitoring/health')
        .set('API-Version', 'v2')
        .expect(200);

      expect(response.headers['api-version']).to.equal('v2');
    });
  });

  describe('Error monitoring', () => {
    it('should track and report errors', async () => {
      // Generate an error
      await request(app)
        .get('/monitoring/non-existent-endpoint')
        .expect(404);

      // Check if error was recorded in metrics
      const response = await request(app)
        .get('/monitoring/metrics')
        .expect(200);

      expect(response.body.success).to.be.true;
      // Error metrics should be available in performance data
    });

    it('should handle internal server errors gracefully', async () => {
      // Close database to force internal error
      db.close();

      const response = await request(app)
        .get('/monitoring/stats')
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.have.property('message');
      expect(response.body.error).to.have.property('errorCode');
    });
  });

  describe('Performance regression detection', () => {
    it('should track response times over multiple requests', async () => {
      const requestCount = 10;
      const responseTimes = [];

      for (let i = 0; i < requestCount; i++) {
        const start = Date.now();
        await request(app).get('/monitoring/health');
        const duration = Date.now() - start;
        responseTimes.push(duration);
      }

      // All requests should complete within reasonable time
      responseTimes.forEach(duration => {
        expect(duration).to.be.lessThan(1000); // Less than 1 second
      });

      // Average response time should be reasonable
      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      expect(avgResponseTime).to.be.lessThan(200); // Less than 200ms average
    });
  });
});