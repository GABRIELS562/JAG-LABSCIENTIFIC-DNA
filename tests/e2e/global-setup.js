const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function globalSetup() {
  console.log('🚀 Starting E2E test environment setup...');

  // Create test database
  const testDbPath = path.join(__dirname, '../../backend/database/test_e2e_lims.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Set environment variables for E2E testing
  process.env.NODE_ENV = 'test';
  process.env.DB_PATH = testDbPath;
  process.env.PORT = '3001';
  process.env.FRONTEND_PORT = '3000';
  
  // Create a browser instance for authentication setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Check if login page is accessible
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ Application is ready for testing');

    // Setup test data if needed
    await setupTestData(page);

  } catch (error) {
    console.error('❌ Failed to setup E2E environment:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ E2E test environment setup complete');
}

async function setupTestData(page) {
  // Navigate to the application and create initial test data
  try {
    // Check if we can access the main application
    const response = await page.goto('http://localhost:3000');
    
    if (response && response.status() === 200) {
      console.log('📊 Setting up test data...');
      
      // Wait for the app to load completely
      await page.waitForLoadState('networkidle');
      
      // You can add specific test data setup here
      // For example, creating test cases, samples, etc.
      
      console.log('✅ Test data setup complete');
    }
  } catch (error) {
    console.warn('⚠️ Could not setup test data:', error.message);
    // Don't throw here as the app might not have initial data requirements
  }
}

module.exports = globalSetup;