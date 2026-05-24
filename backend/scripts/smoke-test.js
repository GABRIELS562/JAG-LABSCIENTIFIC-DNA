#!/usr/bin/env node

/**
 * Standalone Smoke Test Script for JAG DNA Scientific LIMS
 *
 * This script can run against any deployed server without requiring
 * the full test framework. Ideal for CI/CD pipelines and post-deployment checks.
 *
 * Usage:
 *   node smoke-test.js                    # Tests localhost:3001
 *   node smoke-test.js http://prod.example.com  # Tests production
 *   BASE_URL=http://staging.example.com node smoke-test.js
 *
 * Exit codes:
 *   0 - All smoke tests passed
 *   1 - One or more smoke tests failed
 */

const BASE_URL = process.argv[2] || process.env.BASE_URL || 'http://localhost:3001';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

const log = {
  pass: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.blue}▸${colors.reset} ${msg}`),
};

// Test results collector
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

/**
 * Makes an HTTP request and returns the response
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const duration = Date.now() - startTime;
    let body;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    return {
      status: response.status,
      body,
      duration,
      ok: response.ok,
    };
  } catch (error) {
    return {
      status: 0,
      body: null,
      error: error.message,
      duration: Date.now() - startTime,
      ok: false,
    };
  }
}

/**
 * Runs a single smoke test
 */
async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    log.pass(`${name} ${colors.dim}(passed)${colors.reset}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    log.fail(`${name}`);
    console.log(`   ${colors.dim}${error.message}${colors.reset}`);
  }
}

/**
 * Assertion helper
 */
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeOneOf(values) {
      if (!values.includes(actual)) {
        throw new Error(`Expected one of [${values.join(', ')}], got ${actual}`);
      }
    },
    toBeGreaterThan(value) {
      if (actual <= value) {
        throw new Error(`Expected ${actual} to be greater than ${value}`);
      }
    },
    toBeLessThan(value) {
      if (actual >= value) {
        throw new Error(`Expected ${actual} to be less than ${value}`);
      }
    },
    toMatch(pattern) {
      if (!pattern.test(actual)) {
        throw new Error(`Expected "${actual}" to match ${pattern}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toHaveProperty(prop) {
      if (typeof actual !== 'object' || actual === null || !(prop in actual)) {
        throw new Error(`Expected object to have property "${prop}"`);
      }
    },
  };
}

// ============================================================================
// SMOKE TESTS
// ============================================================================

async function runSmokeTests() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  SMOKE TESTS - ${BASE_URL}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Started: ${new Date().toISOString()}`);

  // -------------------------------------------------------------------------
  log.header('Health & Readiness');
  // -------------------------------------------------------------------------

  await test('GET /health - returns health info', async () => {
    const res = await request('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('uptime');
  });

  await test('GET /api/health - frontend compatibility endpoint', async () => {
    const res = await request('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });

  await test('GET /ready - readiness probe responds', async () => {
    const res = await request('/ready');
    expect(res.status).toBeOneOf([200, 503]); // OK or Service Unavailable
    expect(res.body).toHaveProperty('status');
  });

  // -------------------------------------------------------------------------
  log.header('Core API Endpoints');
  // -------------------------------------------------------------------------

  await test('GET /api/test - API connectivity', async () => {
    const res = await request('/api/test');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  await test('GET /api/samples - samples endpoint responds', async () => {
    const res = await request('/api/samples');
    expect(res.status).toBeOneOf([200, 503]);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('success');
    }
  });

  await test('GET /api/samples/counts - sample counts endpoint', async () => {
    const res = await request('/api/samples/counts');
    expect(res.status).toBeOneOf([200, 503]);
  });

  await test('GET /api/batches - batches endpoint responds', async () => {
    const res = await request('/api/batches');
    expect(res.status).toBeOneOf([200, 503]);
  });

  await test('GET /api/statistics - statistics endpoint', async () => {
    const res = await request('/api/statistics');
    expect(res.status).toBeOneOf([200, 503]);
  });

  await test('GET /api/workflow-status - workflow status endpoint', async () => {
    const res = await request('/api/workflow-status');
    expect(res.status).toBeOneOf([200, 503]);
  });

  // -------------------------------------------------------------------------
  log.header('Metrics & Monitoring');
  // -------------------------------------------------------------------------

  await test('GET /metrics - Prometheus metrics available', async () => {
    const res = await request('/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toMatch(/nodejs_|process_/);
  });

  // -------------------------------------------------------------------------
  log.header('Authentication');
  // -------------------------------------------------------------------------

  await test('POST /api/auth/login - endpoint responds', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'invalid', password: 'invalid' }),
    });
    // Auth endpoint should respond (any status except connection error)
    // 4xx = proper rejection, 500 = server error (still responding)
    expect(res.status).toBeGreaterThan(0);
    expect(res.status).toBeOneOf([400, 401, 403, 500]);
  });

  await test('GET /api/auth/me - rejects unauthenticated request', async () => {
    const res = await request('/api/auth/me');
    expect(res.status).toBeOneOf([401, 403]);
  });

  // -------------------------------------------------------------------------
  log.header('Error Handling');
  // -------------------------------------------------------------------------

  await test('GET /nonexistent - returns 404 for unknown routes', async () => {
    const res = await request('/this-route-does-not-exist-12345');
    expect(res.status).toBe(404);
  });

  await test('Response times are acceptable', async () => {
    const res = await request('/health');
    expect(res.duration).toBeLessThan(5000); // Should respond within 5 seconds
  });

  // -------------------------------------------------------------------------
  // RESULTS SUMMARY
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log('  RESULTS');
  console.log('='.repeat(60));
  console.log(`  ${colors.green}Passed:${colors.reset}  ${results.passed}`);
  console.log(`  ${colors.red}Failed:${colors.reset}  ${results.failed}`);
  console.log(`  Total:   ${results.passed + results.failed}`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log(`\n${colors.red}SMOKE TESTS FAILED${colors.reset}`);
    console.log('\nFailed tests:');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
    process.exit(1);
  } else {
    console.log(`\n${colors.green}ALL SMOKE TESTS PASSED${colors.reset}\n`);
    process.exit(0);
  }
}

// ============================================================================
// MAIN
// ============================================================================

// Check if server is reachable before running tests
async function checkServerReachable() {
  log.info(`Checking server at ${BASE_URL}...`);

  const maxRetries = 3;
  const retryDelay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok || res.status === 503) {
        log.pass('Server is reachable');
        return true;
      }
    } catch (error) {
      if (i < maxRetries - 1) {
        log.warn(`Attempt ${i + 1}/${maxRetries} failed, retrying in ${retryDelay/1000}s...`);
        await new Promise(r => setTimeout(r, retryDelay));
      }
    }
  }

  log.fail(`Server at ${BASE_URL} is not reachable`);
  console.log('\nMake sure the server is running:');
  console.log('  npm run server\n');
  process.exit(1);
}

// Run
(async () => {
  await checkServerReachable();
  await runSmokeTests();
})();
