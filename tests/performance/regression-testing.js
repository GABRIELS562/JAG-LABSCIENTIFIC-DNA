const fs = require('fs');
const path = require('path');
const PerformanceTester = require('./load-testing');

/**
 * Performance regression testing
 * Compares current performance against baseline
 */
class RegressionTester {
  constructor() {
    this.baselineFile = path.join(__dirname, '../../performance-baseline.json');
    this.tolerances = {
      page_load: { loadTime: 1.2, fcp: 1.3 }, // 20% slower for load time, 30% for FCP
      api_performance: { responseTime: 1.5 }, // 50% slower allowed
      database_performance: { avgTime: 1.3 }, // 30% slower allowed
      concurrent_load: { avgResponseTime: 1.4, successRate: 0.95 }, // 40% slower, 95% success
      memory_usage: { memoryGrowth: 1.5 } // 50% more memory growth allowed
    };
  }

  async runRegressionTest() {
    console.log('🔄 Running performance regression test...');
    
    try {
      // Load baseline if it exists
      const baseline = await this.loadBaseline();
      
      // Run current performance tests
      const tester = new PerformanceTester();
      await tester.runAllTests();
      const currentResults = tester.results;
      
      // Compare with baseline
      const comparison = await this.compareWithBaseline(currentResults, baseline);
      
      // Update baseline if this is better or if no baseline exists
      if (!baseline || comparison.shouldUpdateBaseline) {
        await this.updateBaseline(currentResults);
      }
      
      // Generate regression report
      await this.generateRegressionReport(comparison);
      
      // Exit with appropriate code
      if (comparison.regressionDetected) {
        console.error('❌ Performance regression detected!');
        process.exit(1);
      } else {
        console.log('✅ No performance regression detected');
      }
      
    } catch (error) {
      console.error('❌ Regression testing failed:', error);
      process.exit(1);
    }
  }

  async loadBaseline() {
    if (!fs.existsSync(this.baselineFile)) {
      console.log('ℹ️ No baseline found, current run will establish baseline');
      return null;
    }
    
    try {
      const data = fs.readFileSync(this.baselineFile, 'utf8');
      const baseline = JSON.parse(data);
      console.log(`📊 Loaded baseline from ${baseline.timestamp}`);
      return baseline;
    } catch (error) {
      console.warn('⚠️ Could not load baseline:', error.message);
      return null;
    }
  }

  async compareWithBaseline(currentResults, baseline) {
    if (!baseline) {
      return {
        regressionDetected: false,
        shouldUpdateBaseline: true,
        comparisons: [],
        summary: 'No baseline available - establishing new baseline'
      };
    }
    
    const comparisons = [];
    let regressionDetected = false;
    let improvementDetected = false;
    
    // Group tests by type for easier comparison
    const currentByType = this.groupTestsByType(currentResults.tests);
    const baselineByType = this.groupTestsByType(baseline.tests);
    
    // Compare each test type
    Object.keys(currentByType).forEach(testType => {
      const currentTests = currentByType[testType];
      const baselineTests = baselineByType[testType] || [];
      
      currentTests.forEach(currentTest => {
        const baselineTest = baselineTests.find(t => t.name === currentTest.name);
        
        if (baselineTest) {
          const comparison = this.compareTest(currentTest, baselineTest, testType);
          comparisons.push(comparison);
          
          if (comparison.regression) {
            regressionDetected = true;
          }
          if (comparison.improvement) {
            improvementDetected = true;
          }
        } else {
          comparisons.push({
            testName: currentTest.name,
            testType,
            status: 'new',
            message: 'New test - no baseline comparison'
          });
        }
      });
    });
    
    return {
      regressionDetected,
      improvementDetected,
      shouldUpdateBaseline: improvementDetected && !regressionDetected,
      comparisons,
      summary: this.generateComparisonSummary(comparisons)
    };
  }

  groupTestsByType(tests) {
    return tests.reduce((acc, test) => {
      if (!acc[test.type]) {
        acc[test.type] = [];
      }
      acc[test.type].push(test);
      return acc;
    }, {});
  }

  compareTest(currentTest, baselineTest, testType) {
    const tolerance = this.tolerances[testType] || {};
    const comparison = {
      testName: currentTest.name,
      testType,
      regression: false,
      improvement: false,
      metrics: {}
    };
    
    switch (testType) {
      case 'page_load':
        comparison.metrics = this.comparePageLoadMetrics(
          currentTest.metrics, 
          baselineTest.metrics, 
          tolerance
        );
        break;
        
      case 'api_performance':
        comparison.metrics = this.compareAPIMetrics(
          currentTest.metrics, 
          baselineTest.metrics, 
          tolerance
        );
        break;
        
      case 'database_performance':
        comparison.metrics = this.compareDatabaseMetrics(
          currentTest.metrics, 
          baselineTest.metrics, 
          tolerance
        );
        break;
        
      case 'concurrent_load':
        comparison.metrics = this.compareConcurrentLoadMetrics(
          currentTest.metrics, 
          baselineTest.metrics, 
          tolerance
        );
        break;
        
      case 'memory_usage':
        comparison.metrics = this.compareMemoryMetrics(
          currentTest.metrics, 
          baselineTest.metrics, 
          tolerance
        );
        break;
    }
    
    // Determine if there's regression or improvement
    const regressionMetrics = Object.values(comparison.metrics).filter(m => m.regression);
    const improvementMetrics = Object.values(comparison.metrics).filter(m => m.improvement);
    
    comparison.regression = regressionMetrics.length > 0;
    comparison.improvement = improvementMetrics.length > 0 && regressionMetrics.length === 0;
    comparison.status = comparison.regression ? 'regression' : 
                      comparison.improvement ? 'improvement' : 'stable';
    
    return comparison;
  }

  comparePageLoadMetrics(current, baseline, tolerance) {
    const metrics = {};
    
    if (current.loadTime && baseline.loadTime) {
      const ratio = current.loadTime / baseline.loadTime;
      metrics.loadTime = {
        current: current.loadTime,
        baseline: baseline.loadTime,
        ratio,
        regression: ratio > (tolerance.loadTime || 1.2),
        improvement: ratio < 0.9,
        change: ((ratio - 1) * 100).toFixed(1) + '%'
      };
    }
    
    if (current.fcp && baseline.fcp) {
      const ratio = current.fcp / baseline.fcp;
      metrics.fcp = {
        current: current.fcp,
        baseline: baseline.fcp,
        ratio,
        regression: ratio > (tolerance.fcp || 1.3),
        improvement: ratio < 0.9,
        change: ((ratio - 1) * 100).toFixed(1) + '%'
      };
    }
    
    return metrics;
  }

  compareAPIMetrics(current, baseline, tolerance) {
    const metrics = {};
    
    if (current.responseTime && baseline.responseTime) {
      const ratio = current.responseTime / baseline.responseTime;
      metrics.responseTime = {
        current: current.responseTime,
        baseline: baseline.responseTime,
        ratio,
        regression: ratio > (tolerance.responseTime || 1.5),
        improvement: ratio < 0.9,
        change: ((ratio - 1) * 100).toFixed(1) + '%'
      };
    }
    
    return metrics;
  }

  compareDatabaseMetrics(current, baseline, tolerance) {
    const metrics = {};
    
    if (current.avgTime && baseline.avgTime) {
      const ratio = current.avgTime / baseline.avgTime;
      metrics.avgTime = {
        current: current.avgTime,
        baseline: baseline.avgTime,
        ratio,
        regression: ratio > (tolerance.avgTime || 1.3),
        improvement: ratio < 0.9,
        change: ((ratio - 1) * 100).toFixed(1) + '%'
      };
    }
    
    return metrics;
  }

  compareConcurrentLoadMetrics(current, baseline, tolerance) {
    const metrics = {};
    
    if (current.avgResponseTime && baseline.avgResponseTime) {
      const ratio = current.avgResponseTime / baseline.avgResponseTime;
      metrics.avgResponseTime = {
        current: current.avgResponseTime,
        baseline: baseline.avgResponseTime,
        ratio,
        regression: ratio > (tolerance.avgResponseTime || 1.4),
        improvement: ratio < 0.9,
        change: ((ratio - 1) * 100).toFixed(1) + '%'
      };
    }
    
    if (current.successRate !== undefined && baseline.successRate !== undefined) {
      const ratio = current.successRate / baseline.successRate;
      metrics.successRate = {
        current: current.successRate,
        baseline: baseline.successRate,
        ratio,
        regression: current.successRate < (tolerance.successRate || 0.95),
        improvement: ratio > 1.05,
        change: ((ratio - 1) * 100).toFixed(1) + '%'
      };
    }
    
    return metrics;
  }

  compareMemoryMetrics(current, baseline, tolerance) {
    const metrics = {};
    
    if (current.memoryGrowth !== undefined && baseline.memoryGrowth !== undefined) {
      const ratio = current.memoryGrowth / baseline.memoryGrowth;
      metrics.memoryGrowth = {
        current: current.memoryGrowth,
        baseline: baseline.memoryGrowth,
        ratio,
        regression: ratio > (tolerance.memoryGrowth || 1.5),
        improvement: ratio < 0.9,
        change: ((ratio - 1) * 100).toFixed(1) + '%'
      };
    }
    
    return metrics;
  }

  generateComparisonSummary(comparisons) {
    const total = comparisons.length;
    const regressions = comparisons.filter(c => c.status === 'regression').length;
    const improvements = comparisons.filter(c => c.status === 'improvement').length;
    const stable = comparisons.filter(c => c.status === 'stable').length;
    
    return {
      total,
      regressions,
      improvements,
      stable,
      regressionRate: (regressions / total * 100).toFixed(1) + '%',
      improvementRate: (improvements / total * 100).toFixed(1) + '%'
    };
  }

  async updateBaseline(currentResults) {
    console.log('📝 Updating performance baseline...');
    
    const baselineData = {
      timestamp: currentResults.timestamp,
      version: process.env.npm_package_version || '1.0.0',
      tests: currentResults.tests,
      summary: currentResults.summary,
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    fs.writeFileSync(this.baselineFile, JSON.stringify(baselineData, null, 2));
    console.log(`✅ Baseline updated: ${this.baselineFile}`);
  }

  async generateRegressionReport(comparison) {
    console.log('📄 Generating regression report...');
    
    const resultsDir = path.join(__dirname, '../../performance-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Write detailed JSON report
    const jsonReport = path.join(resultsDir, 'regression-report.json');
    fs.writeFileSync(jsonReport, JSON.stringify(comparison, null, 2));
    
    // Write text summary
    const textReport = path.join(resultsDir, 'regression-summary.txt');
    const summary = this.generateRegressionSummary(comparison);
    fs.writeFileSync(textReport, summary);
    
    console.log(summary);
  }

  generateRegressionSummary(comparison) {
    let report = '📈 PERFORMANCE REGRESSION REPORT\n';
    report += '====================================\n\n';
    
    if (comparison.summary) {
      report += `Total Tests: ${comparison.summary.total}\n`;
      report += `Regressions: ${comparison.summary.regressions} (${comparison.summary.regressionRate})\n`;
      report += `Improvements: ${comparison.summary.improvements} (${comparison.summary.improvementRate})\n`;
      report += `Stable: ${comparison.summary.stable}\n\n`;
    }
    
    report += `Overall Status: ${comparison.regressionDetected ? '❌ REGRESSION DETECTED' : '✅ NO REGRESSION'}\n\n`;
    
    // Group comparisons by status
    const regressions = comparison.comparisons.filter(c => c.status === 'regression');
    const improvements = comparison.comparisons.filter(c => c.status === 'improvement');
    
    if (regressions.length > 0) {
      report += '❌ REGRESSIONS:\n';
      regressions.forEach(regression => {
        report += `\n  ${regression.testName} (${regression.testType}):\n`;
        Object.keys(regression.metrics).forEach(metricName => {
          const metric = regression.metrics[metricName];
          if (metric.regression) {
            report += `    ${metricName}: ${metric.current} → ${metric.baseline} (${metric.change})\n`;
          }
        });
      });
      report += '\n';
    }
    
    if (improvements.length > 0) {
      report += '✅ IMPROVEMENTS:\n';
      improvements.forEach(improvement => {
        report += `\n  ${improvement.testName} (${improvement.testType}):\n`;
        Object.keys(improvement.metrics).forEach(metricName => {
          const metric = improvement.metrics[metricName];
          if (metric.improvement) {
            report += `    ${metricName}: ${metric.current} → ${metric.baseline} (${metric.change})\n`;
          }
        });
      });
      report += '\n';
    }
    
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new RegressionTester();
  tester.runRegressionTest().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = RegressionTester;