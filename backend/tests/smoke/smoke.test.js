/**
 * Smoke Tests for JAG DNA Scientific LIMS Backend
 *
 * These tests verify critical functionality works after deployment.
 * They are fast, broad, and focus on the most important paths.
 *
 * Run with: npm run test:smoke (from backend directory)
 *
 * NOTE: These Jest-based tests require importing the server, which may fail
 * if there are syntax errors in the codebase. For CI/CD pipelines, prefer
 * using the standalone script: node scripts/smoke-test.js [URL]
 */

const request = require('supertest');
const app = require('../../server');

describe('Smoke Tests', () => {
  // Increase timeout for smoke tests as they may hit real services
  jest.setTimeout(10000);

  describe('Health & Readiness', () => {
    test('GET /health - returns 200 with health info', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });

    test('GET /api/health - returns 200 (frontend compatibility)', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
    });

    test('GET /ready - returns readiness status', async () => {
      const res = await request(app).get('/ready');

      // Ready can be 200 (db connected) or 503 (db not connected)
      // Both are valid for smoke test - we just verify the endpoint works
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
    });
  });

  describe('Core API Endpoints', () => {
    test('GET /api/test - API connectivity check', async () => {
      const res = await request(app).get('/api/test');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    test('GET /api/samples - returns samples or graceful error', async () => {
      const res = await request(app).get('/api/samples');

      // Should return 200 with data or 503 if DB unavailable
      expect([200, 503]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });

    test('GET /api/samples/counts - returns sample counts', async () => {
      const res = await request(app).get('/api/samples/counts');

      expect([200, 503]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
      }
    });

    test('GET /api/batches - returns batches or graceful error', async () => {
      const res = await request(app).get('/api/batches');

      expect([200, 503]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
      }
    });

    test('GET /api/statistics - returns workflow statistics', async () => {
      const res = await request(app).get('/api/statistics');

      expect([200, 503]).toContain(res.status);
    });

    test('GET /api/workflow-status - returns workflow status', async () => {
      const res = await request(app).get('/api/workflow-status');

      expect([200, 503]).toContain(res.status);
    });
  });

  describe('Metrics & Monitoring', () => {
    test('GET /metrics - returns Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/text\/plain|text\/html/);
      // Prometheus metrics should contain standard Node.js metrics
      expect(res.text).toMatch(/nodejs_|process_/);
    });
  });

  describe('Static Assets & Documentation', () => {
    test('GET /api-docs - Swagger documentation loads', async () => {
      const res = await request(app).get('/api-docs/');

      // Swagger UI should return HTML
      expect([200, 301, 302]).toContain(res.status);
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/login - endpoint responds', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'invalid', password: 'invalid' });

      // Auth endpoint should respond (4xx for rejection, 5xx still acceptable for smoke test)
      expect([400, 401, 403, 500]).toContain(res.status);
    });

    test('GET /api/auth/me - rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/me');

      // Should return 401 without token, not 500
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('Error Handling', () => {
    test('GET /nonexistent-route - returns 404', async () => {
      const res = await request(app).get('/this-route-does-not-exist');

      expect(res.status).toBe(404);
    });

    test('POST /api/samples - handles empty body gracefully', async () => {
      const res = await request(app)
        .post('/api/samples')
        .send({}); // Empty body

      // Should return error response (4xx or 5xx), not crash
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});

// Graceful shutdown after tests
afterAll(async () => {
  // Give time for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
