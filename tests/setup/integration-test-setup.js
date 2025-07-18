// Integration Test Setup
// This file handles the setup and teardown for integration tests

const MockServiceManager = require('../utils/mock-services');
const testHelpers = require('../utils/test-helpers');
const config = require('../config/test-config');

class IntegrationTestSetup {
  constructor() {
    this.mockServiceManager = new MockServiceManager();
    this.isSetup = false;
    this.cleanup = [];
  }

  // Global setup for all integration tests
  async globalSetup() {
    if (this.isSetup) {
      return;
    }

    console.log('🚀 Setting up integration test environment...');

    try {
      // Start mock services if needed
      if (process.env.USE_MOCK_SERVICES === 'true') {
        await this.startMockServices();
      }

      // Wait for services to be ready
      await this.waitForServices();

      // Setup test database
      await this.setupTestDatabase();

      // Authenticate test user
      await this.authenticateTestUser();

      // Create test data
      await this.createTestData();

      this.isSetup = true;
      console.log('✅ Integration test environment setup complete');

    } catch (error) {
      console.error('❌ Integration test setup failed:', error);
      throw error;
    }
  }

  // Global teardown for all integration tests
  async globalTeardown() {
    if (!this.isSetup) {
      return;
    }

    console.log('🧹 Cleaning up integration test environment...');

    try {
      // Clean up test data
      await this.cleanupTestData();

      // Stop mock services
      if (process.env.USE_MOCK_SERVICES === 'true') {
        await this.stopMockServices();
      }

      // Run cleanup functions
      for (const cleanupFn of this.cleanup) {
        await cleanupFn();
      }

      this.isSetup = false;
      console.log('✅ Integration test environment cleanup complete');

    } catch (error) {
      console.error('❌ Integration test cleanup failed:', error);
      throw error;
    }
  }

  // Start mock services
  async startMockServices() {
    console.log('🎭 Starting mock services...');

    return new Promise((resolve, reject) => {
      this.mockServiceManager.once('allServicesStarted', (ports) => {
        console.log('✅ Mock services started:', ports);
        resolve(ports);
      });

      this.mockServiceManager.once('error', (error) => {
        console.error('❌ Failed to start mock services:', error);
        reject(error);
      });

      this.mockServiceManager.startAllServices();
    });
  }

  // Stop mock services
  async stopMockServices() {
    console.log('🛑 Stopping mock services...');

    return new Promise((resolve) => {
      this.mockServiceManager.once('allServicesStopped', () => {
        console.log('✅ Mock services stopped');
        resolve();
      });

      this.mockServiceManager.stopAllServices();
    });
  }

  // Wait for services to be ready
  async waitForServices() {
    console.log('⏳ Waiting for services to be ready...');

    const services = [
      { name: 'auth', url: config.services.auth.baseUrl },
      { name: 'sample', url: config.services.sample.baseUrl },
      { name: 'analysis', url: config.services.analysis.baseUrl },
      { name: 'notification', url: config.services.notification.baseUrl }
    ];

    const maxRetries = 30;
    const retryDelay = 2000;

    for (const service of services) {
      let retries = 0;
      let isReady = false;

      while (retries < maxRetries && !isReady) {
        try {
          isReady = await testHelpers.checkServiceHealth(service.url);
          
          if (isReady) {
            console.log(`✅ ${service.name} service is ready`);
          } else {
            console.log(`⏳ ${service.name} service not ready, retrying in ${retryDelay}ms...`);
            await testHelpers.delay(retryDelay);
            retries++;
          }
        } catch (error) {
          console.log(`⏳ ${service.name} service health check failed, retrying...`);
          await testHelpers.delay(retryDelay);
          retries++;
        }
      }

      if (!isReady) {
        throw new Error(`${service.name} service failed to become ready after ${maxRetries} retries`);
      }
    }

    console.log('✅ All services are ready');
  }

  // Setup test database
  async setupTestDatabase() {
    console.log('🗄️ Setting up test database...');

    // Add database setup logic here
    // This would typically involve:
    // - Creating test database
    // - Running migrations
    // - Setting up test data

    console.log('✅ Test database setup complete');
  }

  // Authenticate test user
  async authenticateTestUser() {
    console.log('🔐 Authenticating test user...');

    try {
      await testHelpers.authenticate();
      console.log('✅ Test user authenticated');
    } catch (error) {
      console.error('❌ Test user authentication failed:', error);
      throw error;
    }
  }

  // Create test data
  async createTestData() {
    console.log('📊 Creating test data...');

    // Create common test data that will be used across tests
    const testSample = testHelpers.createTestSample({
      sampleId: 'SAMPLE_INTEGRATION_TEST',
      notes: 'Created during integration test setup'
    });

    // Store test data for later cleanup
    testHelpers.storeTestData('setup_sample', testSample);

    console.log('✅ Test data created');
  }

  // Clean up test data
  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');

    try {
      await testHelpers.cleanupTestData();
      console.log('✅ Test data cleanup complete');
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error);
      // Don't throw here, as we want to continue with other cleanup
    }
  }

  // Add cleanup function
  addCleanup(cleanupFn) {
    this.cleanup.push(cleanupFn);
  }

  // Individual test setup
  async testSetup() {
    // This can be called before each test if needed
    console.log('🔧 Setting up individual test...');
  }

  // Individual test teardown
  async testTeardown() {
    // This can be called after each test if needed
    console.log('🧹 Tearing down individual test...');
  }
}

// Create singleton instance
const integrationTestSetup = new IntegrationTestSetup();

// Export setup hooks for test runners
module.exports = {
  integrationTestSetup,
  
  // Mocha hooks
  mochaHooks: {
    beforeAll: async function() {
      this.timeout(60000); // 60 second timeout for setup
      await integrationTestSetup.globalSetup();
    },
    
    afterAll: async function() {
      this.timeout(30000); // 30 second timeout for teardown
      await integrationTestSetup.globalTeardown();
    },
    
    beforeEach: async function() {
      await integrationTestSetup.testSetup();
    },
    
    afterEach: async function() {
      await integrationTestSetup.testTeardown();
    }
  },

  // Jest hooks
  jestSetup: {
    globalSetup: async () => {
      await integrationTestSetup.globalSetup();
    },
    
    globalTeardown: async () => {
      await integrationTestSetup.globalTeardown();
    },
    
    setupFilesAfterEnv: [
      () => {
        beforeEach(async () => {
          await integrationTestSetup.testSetup();
        });
        
        afterEach(async () => {
          await integrationTestSetup.testTeardown();
        });
      }
    ]
  }
};