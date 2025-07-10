const fs = require('fs');
const path = require('path');

async function globalTeardown() {
  console.log('🧹 Starting E2E test environment cleanup...');

  try {
    // Clean up test database
    const testDbPath = path.join(__dirname, '../../backend/database/test_e2e_lims.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('🗑️ Test database cleaned up');
    }

    // Clean up test artifacts
    const testResultsDir = path.join(__dirname, '../../test-results');
    if (fs.existsSync(testResultsDir)) {
      // Keep test results for CI but clean up locally if needed
      if (!process.env.CI) {
        console.log('📁 Test results preserved at:', testResultsDir);
      }
    }

    // Clean up any temporary files
    const tempDir = path.join(__dirname, '../../temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🗑️ Temporary files cleaned up');
    }

    console.log('✅ E2E test environment cleanup complete');

  } catch (error) {
    console.error('❌ Error during E2E cleanup:', error);
    // Don't throw here as cleanup failures shouldn't fail the test run
  }
}

module.exports = globalTeardown;