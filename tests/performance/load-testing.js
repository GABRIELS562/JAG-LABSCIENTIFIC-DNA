const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Performance and load testing suite
 */
class PerformanceTester {
  constructor() {
    this.baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
    this.apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {}
    };
  }

  async runAllTests() {
    console.log('🚀 Starting performance testing suite...');
    
    try {
      await this.testPageLoadPerformance();
      await this.testAPIPerformance();
      await this.testDatabasePerformance();
      await this.testConcurrentUsers();
      await this.testMemoryUsage();
      
      await this.generateReport();
      
      console.log('✅ Performance testing completed');
      
    } catch (error) {
      console.error('❌ Performance testing failed:', error);
      throw error;
    }
  }

  async testPageLoadPerformance() {
    console.log('📊 Testing page load performance...');
    
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const pages = [
      { name: 'Home', url: '/' },
      { name: 'Sample Registration', url: '/register' },
      { name: 'Sample List', url: '/samples' },
      { name: 'Batch Generation', url: '/batch' },
      { name: 'Reports', url: '/reports' }
    ];
    
    for (const pageInfo of pages) {
      const metrics = await this.measurePageLoad(page, pageInfo);
      this.results.tests.push({
        type: 'page_load',
        name: pageInfo.name,
        metrics,
        passed: metrics.loadTime < 3000 && metrics.fcp < 2000
      });
    }
    
    await browser.close();
  }

  async measurePageLoad(page, pageInfo) {
    const startTime = Date.now();
    
    await page.goto(`${this.baseUrl}${pageInfo.url}`, {
      waitUntil: 'networkidle'
    });
    
    const loadTime = Date.now() - startTime;
    
    // Get Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'paint') {
              vitals[entry.name] = entry.startTime;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.fid = entry.processingStart - entry.startTime;
            }
          });
          
          resolve(vitals);
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input'] });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    return {
      loadTime,
      fcp: vitals['first-contentful-paint'] || null,
      lcp: vitals.lcp || null,
      fid: vitals.fid || null,
      url: pageInfo.url
    };
  }

  async testAPIPerformance() {
    console.log('🔌 Testing API performance...');
    
    const endpoints = [
      { method: 'GET', path: '/api/samples', expectedTime: 500 },
      { method: 'GET', path: '/api/test-cases', expectedTime: 300 },
      { method: 'GET', path: '/api/batches', expectedTime: 400 },
      { method: 'GET', path: '/monitoring/health', expectedTime: 100 },
      { method: 'GET', path: '/monitoring/metrics', expectedTime: 200 }
    ];
    
    for (const endpoint of endpoints) {
      const metrics = await this.measureAPICall(endpoint);
      this.results.tests.push({
        type: 'api_performance',
        name: `${endpoint.method} ${endpoint.path}`,
        metrics,
        passed: metrics.responseTime < endpoint.expectedTime
      });
    }
  }

  async measureAPICall(endpoint) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.apiUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        responseTime,
        statusCode: response.status,
        success: response.ok,
        size: response.headers.get('content-length') || 0
      };
      
    } catch (error) {
      return {
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      };
    }
  }

  async testDatabasePerformance() {
    console.log('🗄️ Testing database performance...');
    
    const operations = [
      { name: 'Sample Query', samples: 100 },
      { name: 'Complex Join', samples: 50 },
      { name: 'Batch Insert', samples: 1000 },
      { name: 'Search Query', samples: 200 }
    ];
    
    for (const operation of operations) {
      const metrics = await this.measureDatabaseOperation(operation);
      this.results.tests.push({
        type: 'database_performance',
        name: operation.name,
        metrics,
        passed: metrics.avgTime < 1000 && metrics.maxTime < 5000
      });
    }
  }

  async measureDatabaseOperation(operation) {
    const times = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Simulate database operation via API
      try {
        await fetch(`${this.apiUrl}/api/samples?limit=${operation.samples}`, {
          method: 'GET'
        });
        
        const endTime = Date.now();
        times.push(endTime - startTime);
        
      } catch (error) {
        times.push(5000); // Penalty for failed operations
      }
      
      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return {
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      samples: operation.samples,
      iterations
    };
  }

  async testConcurrentUsers() {
    console.log('👥 Testing concurrent user load...');
    
    const userCounts = [1, 5, 10, 20];
    
    for (const userCount of userCounts) {
      const metrics = await this.simulateConcurrentUsers(userCount);
      this.results.tests.push({
        type: 'concurrent_load',
        name: `${userCount} Concurrent Users`,
        metrics,
        passed: metrics.successRate > 0.95 && metrics.avgResponseTime < 2000
      });
    }
  }

  async simulateConcurrentUsers(userCount) {
    const browser = await chromium.launch();
    const contexts = [];
    const results = [];
    
    // Create contexts for each user
    for (let i = 0; i < userCount; i++) {
      contexts.push(await browser.newContext());
    }
    
    const startTime = Date.now();
    
    // Simulate user actions concurrently
    const promises = contexts.map(async (context, index) => {
      const page = await context.newPage();
      const userStartTime = Date.now();
      
      try {
        // Simulate typical user workflow
        await page.goto(this.baseUrl);
        await page.waitForLoadState('networkidle');
        
        await page.click('text=Sample', { timeout: 5000 });
        await page.waitForLoadState('networkidle');
        
        await page.click('text=Client Register', { timeout: 5000 });
        await page.waitForLoadState('networkidle');
        
        const userEndTime = Date.now();
        
        return {
          userId: index,
          success: true,
          responseTime: userEndTime - userStartTime
        };
        
      } catch (error) {
        return {
          userId: index,
          success: false,
          responseTime: Date.now() - userStartTime,
          error: error.message
        };
      } finally {
        await context.close();
      }
    });
    
    const userResults = await Promise.all(promises);
    const endTime = Date.now();
    
    await browser.close();
    
    const successfulUsers = userResults.filter(r => r.success);
    const totalTime = endTime - startTime;
    
    return {
      userCount,
      totalTime,
      successRate: successfulUsers.length / userCount,
      avgResponseTime: successfulUsers.reduce((sum, r) => sum + r.responseTime, 0) / successfulUsers.length || 0,
      maxResponseTime: Math.max(...userResults.map(r => r.responseTime)),
      errors: userResults.filter(r => !r.success).length
    };
  }

  async testMemoryUsage() {
    console.log('💾 Testing memory usage...');
    
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to application
    await page.goto(this.baseUrl);
    
    // Get initial memory usage
    const initialMemory = await this.getMemoryUsage(page);
    
    // Perform memory-intensive operations
    const operations = [
      () => page.click('text=Sample'),
      () => page.click('text=Batch'),
      () => page.click('text=Reports'),
      () => page.reload()
    ];
    
    const memoryReadings = [initialMemory];
    
    for (const operation of operations) {
      await operation();
      await page.waitForTimeout(1000);
      
      const memory = await this.getMemoryUsage(page);
      memoryReadings.push(memory);
    }
    
    await browser.close();
    
    const maxMemory = Math.max(...memoryReadings.map(m => m.heapUsed));
    const memoryGrowth = maxMemory - initialMemory.heapUsed;
    
    this.results.tests.push({
      type: 'memory_usage',
      name: 'Memory Usage Test',
      metrics: {
        initialMemory: initialMemory.heapUsed,
        maxMemory,
        memoryGrowth,
        memoryReadings
      },
      passed: memoryGrowth < 50 * 1024 * 1024 // Less than 50MB growth
    });
  }

  async getMemoryUsage(page) {
    return await page.evaluate(() => {
      if (performance.memory) {
        return {
          heapUsed: performance.memory.usedJSHeapSize,
          heapTotal: performance.memory.totalJSHeapSize,
          heapLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return { heapUsed: 0, heapTotal: 0, heapLimit: 0 };
    });
  }

  async generateReport() {
    console.log('📄 Generating performance report...');
    
    // Calculate summary statistics
    const testsByType = this.results.tests.reduce((acc, test) => {
      if (!acc[test.type]) {
        acc[test.type] = [];
      }
      acc[test.type].push(test);
      return acc;
    }, {});
    
    this.results.summary = {
      totalTests: this.results.tests.length,
      passedTests: this.results.tests.filter(t => t.passed).length,
      failedTests: this.results.tests.filter(t => !t.passed).length,
      testsByType,
      overallPassed: this.results.tests.every(t => t.passed)
    };
    
    // Create results directory
    const resultsDir = path.join(__dirname, '../../performance-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Write detailed JSON report
    const jsonReport = path.join(resultsDir, 'performance-report.json');
    fs.writeFileSync(jsonReport, JSON.stringify(this.results, null, 2));
    
    // Write summary report
    const summaryReport = path.join(resultsDir, 'performance-summary.txt');
    const summary = this.generateTextSummary();
    fs.writeFileSync(summaryReport, summary);
    
    console.log(`📊 Performance report saved to: ${resultsDir}`);
    console.log(summary);
  }

  generateTextSummary() {
    const { summary } = this.results;
    
    let report = '🎯 PERFORMANCE TEST SUMMARY\n';
    report += '================================\n\n';
    report += `Timestamp: ${this.results.timestamp}\n`;
    report += `Total Tests: ${summary.totalTests}\n`;
    report += `Passed: ${summary.passedTests}\n`;
    report += `Failed: ${summary.failedTests}\n`;
    report += `Overall Status: ${summary.overallPassed ? '✅ PASS' : '❌ FAIL'}\n\n`;
    
    // Test results by type
    Object.keys(summary.testsByType).forEach(type => {
      const tests = summary.testsByType[type];
      const passed = tests.filter(t => t.passed).length;
      
      report += `${type.toUpperCase().replace('_', ' ')}:\n`;
      report += `  Passed: ${passed}/${tests.length}\n`;
      
      tests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        report += `  ${status} ${test.name}\n`;
        
        if (test.type === 'page_load' && test.metrics) {
          report += `     Load Time: ${test.metrics.loadTime}ms\n`;
          if (test.metrics.fcp) report += `     FCP: ${test.metrics.fcp.toFixed(1)}ms\n`;
        }
        
        if (test.type === 'api_performance' && test.metrics) {
          report += `     Response Time: ${test.metrics.responseTime}ms\n`;
        }
        
        if (test.type === 'concurrent_load' && test.metrics) {
          report += `     Success Rate: ${(test.metrics.successRate * 100).toFixed(1)}%\n`;
          report += `     Avg Response: ${test.metrics.avgResponseTime.toFixed(1)}ms\n`;
        }
      });
      
      report += '\n';
    });
    
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runAllTests().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = PerformanceTester;