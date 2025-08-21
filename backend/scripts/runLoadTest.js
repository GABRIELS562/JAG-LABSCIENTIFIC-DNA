#!/usr/bin/env node

/**
 * Standalone Load Testing Script for LIMS
 * 
 * Usage:
 *   node backend/scripts/runLoadTest.js
 *   node backend/scripts/runLoadTest.js --url http://localhost:3001 --concurrency 10 --duration 120
 *   LOAD_TEST_URL=http://production.lims.com node backend/scripts/runLoadTest.js
 */

const LoadGenerator = require('./loadGenerator');
const path = require('path');
const fs = require('fs');

// Command line argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    baseUrl: process.env.LOAD_TEST_URL || 'http://localhost:3001',
    concurrency: parseInt(process.env.LOAD_TEST_CONCURRENCY) || 5,
    duration: parseInt(process.env.LOAD_TEST_DURATION) || 60
  };
  
  // Parse command line flags
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--url':
      case '-u':
        config.baseUrl = value;
        break;
      case '--concurrency':
      case '-c':
        config.concurrency = parseInt(value);
        break;
      case '--duration':
      case '-d':
        config.duration = parseInt(value);
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return config;
}

function showHelp() {
  console.log(`
LIMS Load Testing Script
`);
  console.log('Usage:');
  console.log('  node backend/scripts/runLoadTest.js [options]\n');
  console.log('Options:');
  console.log('  -u, --url <url>           Target URL (default: http://localhost:3001)');
  console.log('  -c, --concurrency <num>   Concurrent users (default: 5)');
  console.log('  -d, --duration <seconds>  Test duration in seconds (default: 60)');
  console.log('  -h, --help               Show this help message\n');
  console.log('Environment Variables:');
  console.log('  LOAD_TEST_URL            Target URL');
  console.log('  LOAD_TEST_CONCURRENCY    Concurrent users');
  console.log('  LOAD_TEST_DURATION       Test duration in seconds\n');
  console.log('Examples:');
  console.log('  node backend/scripts/runLoadTest.js');
  console.log('  node backend/scripts/runLoadTest.js --url http://staging.lims.com --concurrency 10 --duration 120');
  console.log('  LOAD_TEST_URL=http://prod.lims.com node backend/scripts/runLoadTest.js\n');
}

function validateConfig(config) {
  const errors = [];
  
  if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
    errors.push('Invalid URL: Must start with http:// or https://');
  }
  
  if (!config.concurrency || config.concurrency < 1 || config.concurrency > 100) {
    errors.push('Invalid concurrency: Must be between 1 and 100');
  }
  
  if (!config.duration || config.duration < 1 || config.duration > 3600) {
    errors.push('Invalid duration: Must be between 1 and 3600 seconds');
  }
  
  return errors;
}

async function checkServerHealth(baseUrl) {
  try {
    const fetch = require('axios');
    const response = await fetch.get(`${baseUrl}/health`, { timeout: 5000 });
    if (response.status === 200) {
      // Check if response contains health data
      const healthData = response.data;
      if (healthData && healthData.success) {
        // Accept healthy, warning, or any successful response
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function runLoadTest() {
  console.log('🚀 LIMS Load Testing Script');
  console.log('============================\n');
  
  const config = parseArgs();
  const errors = validateConfig(config);
  
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`   ${error}`));
    console.log('\nUse --help for usage information.');
    process.exit(1);
  }
  
  console.log('Configuration:');
  console.log(`   Target URL: ${config.baseUrl}`);
  console.log(`   Concurrency: ${config.concurrency} users`);
  console.log(`   Duration: ${config.duration} seconds`);
  console.log(`   Total expected requests: ~${Math.floor(config.concurrency * config.duration / 3)}\n`);
  
  // Check if server is reachable
  console.log('🔍 Checking server health...');
  const isHealthy = await checkServerHealth(config.baseUrl);
  
  if (!isHealthy) {
    console.error('❌ Server health check failed!');
    console.error('   Make sure the LIMS server is running and accessible.');
    console.error(`   Tried to reach: ${config.baseUrl}/health`);
    process.exit(1);
  }
  
  console.log('✅ Server is healthy and ready for testing\n');
  
  // Create load generator
  const loadGenerator = new LoadGenerator({
    baseUrl: config.baseUrl,
    concurrency: config.concurrency,
    duration: config.duration * 1000 // Convert to milliseconds
  });
  
  // Handle graceful shutdown
  let isShuttingDown = false;
  
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('\n🛑 Shutting down load test...');
    await loadGenerator.stop();
    
    // Generate report
    const stats = loadGenerator.getStats();
    generateReport(stats, config);
    
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Start load test
  console.log('🎯 Starting load test...');
  console.log('   Press Ctrl+C to stop early and generate report\n');
  
  try {
    await loadGenerator.start();
    
    // Wait for completion (the LoadGenerator will stop automatically after duration)
    while (loadGenerator.getStats().isRunning) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Load test completed successfully!');
    
    // Generate final report
    const finalStats = loadGenerator.getStats();
    generateReport(finalStats, config);
    
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
    process.exit(1);
  }
}

function generateReport(stats, config) {
  console.log('\n📊 LOAD TEST RESULTS');
  console.log('====================');
  
  const duration = stats.runtime || config.duration;
  const successRate = stats.successRate || 0;
  
  // Overall statistics
  console.log('\n📈 Overall Statistics:');
  console.log(`   Duration: ${duration}s`);
  console.log(`   Total Requests: ${stats.totalRequests || 0}`);
  console.log(`   Successful Requests: ${stats.successfulRequests || 0}`);
  console.log(`   Failed Requests: ${stats.failedRequests || 0}`);
  console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`   Requests/Second: ${stats.requestsPerSecond || 0}`);
  
  // Performance metrics
  console.log('\n⚡ Performance Metrics:');
  console.log(`   Average Response Time: ${stats.averageResponseTime || 0}ms`);
  
  // Quality assessment
  console.log('\n🎯 Quality Assessment:');
  
  if (successRate >= 99.5) {
    console.log('   ✅ EXCELLENT: Success rate is outstanding (≥99.5%)');
  } else if (successRate >= 99) {
    console.log('   ✅ GOOD: Success rate is very good (≥99%)');
  } else if (successRate >= 95) {
    console.log('   ⚠️  ACCEPTABLE: Success rate is acceptable (≥95%)');
  } else {
    console.log('   ❌ POOR: Success rate needs improvement (<95%)');
  }
  
  const avgResponseTime = stats.averageResponseTime || 0;
  if (avgResponseTime <= 200) {
    console.log('   ✅ EXCELLENT: Response time is excellent (≤200ms)');
  } else if (avgResponseTime <= 500) {
    console.log('   ✅ GOOD: Response time is good (≤500ms)');
  } else if (avgResponseTime <= 1000) {
    console.log('   ⚠️  ACCEPTABLE: Response time is acceptable (≤1000ms)');
  } else {
    console.log('   ❌ POOR: Response time needs improvement (>1000ms)');
  }
  
  // Errors breakdown
  if (stats.errors && Object.keys(stats.errors).length > 0) {
    console.log('\n❌ Errors Breakdown:');
    Object.entries(stats.errors).forEach(([error, count]) => {
      console.log(`   ${error}: ${count}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (successRate < 99) {
    console.log('   - Investigate failed requests to improve reliability');
  }
  if (avgResponseTime > 500) {
    console.log('   - Consider performance optimization for better response times');
  }
  if (stats.requestsPerSecond < config.concurrency * 0.3) {
    console.log('   - Server might be overloaded, consider scaling up');
  }
  if (successRate >= 99.5 && avgResponseTime <= 200) {
    console.log('   - System performance is excellent! Consider increasing load for stress testing.');
  }
  
  console.log('\n🎯 Use this data to:');
  console.log('   - Set up monitoring alerts and SLIs');
  console.log('   - Configure auto-scaling triggers');
  console.log('   - Establish performance baselines');
  console.log('   - Plan capacity requirements');
  
  // Save report to file
  const reportFile = `load-test-report-${Date.now()}.json`;
  const reportPath = path.join(__dirname, '..', 'reports', reportFile);
  
  try {
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      config,
      results: stats,
      summary: {
        duration,
        successRate,
        avgResponseTime,
        totalRequests: stats.totalRequests || 0,
        requestsPerSecond: stats.requestsPerSecond || 0
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  } catch (error) {
    console.log(`\n⚠️  Could not save report to file: ${error.message}`);
  }
  
  console.log('\n✨ Load test completed successfully!\n');
}

// Run the load test if this script is executed directly
if (require.main === module) {
  runLoadTest().catch(error => {
    console.error('\n❌ Load test script failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = { runLoadTest, parseArgs, validateConfig, generateReport };
