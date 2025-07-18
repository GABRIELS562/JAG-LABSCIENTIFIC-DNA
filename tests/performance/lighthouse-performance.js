// Lighthouse Performance Testing for LIMS Application
// This script automates performance auditing using Google Lighthouse

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  // Lighthouse configuration
  lighthouse: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      },
      screenEmulation: {
        mobile: false,
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        disabled: false
      },
      emulatedUserAgent: false,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      skipAudits: ['uses-http2'],
      locale: 'en-US'
    }
  },
  
  // Chrome launcher options
  chrome: {
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  },
  
  // Test URLs
  urls: [
    {
      name: 'Homepage',
      url: 'http://localhost:3000',
      thresholds: {
        performance: 90,
        accessibility: 95,
        'best-practices': 90,
        seo: 80
      }
    },
    {
      name: 'Sample Search',
      url: 'http://localhost:3000/samples',
      thresholds: {
        performance: 85,
        accessibility: 95,
        'best-practices': 90,
        seo: 70
      }
    },
    {
      name: 'Client Registration',
      url: 'http://localhost:3000/clients/register',
      thresholds: {
        performance: 85,
        accessibility: 95,
        'best-practices': 90,
        seo: 70
      }
    },
    {
      name: 'Genetic Analysis',
      url: 'http://localhost:3000/genetic-analysis',
      thresholds: {
        performance: 80,
        accessibility: 95,
        'best-practices': 90,
        seo: 70
      }
    },
    {
      name: 'Reports',
      url: 'http://localhost:3000/reports',
      thresholds: {
        performance: 85,
        accessibility: 95,
        'best-practices': 90,
        seo: 70
      }
    }
  ],
  
  // Output configuration
  output: {
    directory: './lighthouse-results',
    formats: ['html', 'json', 'csv']
  }
};

// Performance budgets
const performanceBudgets = {
  'first-contentful-paint': 1800,
  'largest-contentful-paint': 2500,
  'first-meaningful-paint': 1800,
  'speed-index': 3000,
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300,
  'interactive': 3800,
  'server-response-time': 600,
  'first-cpu-idle': 3800,
  'max-potential-fid': 130
};

// Utility functions
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function calculateScore(audit) {
  if (audit.score === null) return 'N/A';
  return Math.round(audit.score * 100);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatMs(ms) {
  return Math.round(ms) + ' ms';
}

// Main audit function
async function runLighthouseAudit(url, options = {}) {
  const chrome = await chromeLauncher.launch(config.chrome);
  const port = chrome.port;
  
  try {
    const lighthouseConfig = {
      ...config.lighthouse,
      port: port,
      ...options
    };
    
    console.log(`Running Lighthouse audit for: ${url}`);
    const result = await lighthouse(url, lighthouseConfig);
    
    await chrome.kill();
    return result;
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

// Performance analysis
function analyzePerformance(lhr) {
  const audits = lhr.audits;
  const categories = lhr.categories;
  
  const analysis = {
    scores: {
      performance: calculateScore(categories.performance),
      accessibility: calculateScore(categories.accessibility),
      'best-practices': calculateScore(categories['best-practices']),
      seo: calculateScore(categories.seo)
    },
    metrics: {
      'First Contentful Paint': {
        value: audits['first-contentful-paint']?.displayValue || 'N/A',
        score: calculateScore(audits['first-contentful-paint']),
        budget: performanceBudgets['first-contentful-paint']
      },
      'Largest Contentful Paint': {
        value: audits['largest-contentful-paint']?.displayValue || 'N/A',
        score: calculateScore(audits['largest-contentful-paint']),
        budget: performanceBudgets['largest-contentful-paint']
      },
      'First Meaningful Paint': {
        value: audits['first-meaningful-paint']?.displayValue || 'N/A',
        score: calculateScore(audits['first-meaningful-paint']),
        budget: performanceBudgets['first-meaningful-paint']
      },
      'Speed Index': {
        value: audits['speed-index']?.displayValue || 'N/A',
        score: calculateScore(audits['speed-index']),
        budget: performanceBudgets['speed-index']
      },
      'Cumulative Layout Shift': {
        value: audits['cumulative-layout-shift']?.displayValue || 'N/A',
        score: calculateScore(audits['cumulative-layout-shift']),
        budget: performanceBudgets['cumulative-layout-shift']
      },
      'Total Blocking Time': {
        value: audits['total-blocking-time']?.displayValue || 'N/A',
        score: calculateScore(audits['total-blocking-time']),
        budget: performanceBudgets['total-blocking-time']
      },
      'Time to Interactive': {
        value: audits['interactive']?.displayValue || 'N/A',
        score: calculateScore(audits['interactive']),
        budget: performanceBudgets['interactive']
      },
      'Server Response Time': {
        value: audits['server-response-time']?.displayValue || 'N/A',
        score: calculateScore(audits['server-response-time']),
        budget: performanceBudgets['server-response-time']
      }
    },
    opportunities: [],
    diagnostics: []
  };
  
  // Extract optimization opportunities
  Object.keys(audits).forEach(auditKey => {
    const audit = audits[auditKey];
    if (audit.details && audit.details.type === 'opportunity' && audit.score < 1) {
      analysis.opportunities.push({
        title: audit.title,
        description: audit.description,
        score: calculateScore(audit),
        savings: audit.details.overallSavingsMs || 0
      });
    }
  });
  
  // Extract diagnostics
  Object.keys(audits).forEach(auditKey => {
    const audit = audits[auditKey];
    if (audit.details && audit.details.type === 'diagnostic' && audit.score < 1) {
      analysis.diagnostics.push({
        title: audit.title,
        description: audit.description,
        score: calculateScore(audit)
      });
    }
  });
  
  return analysis;
}

// Generate performance report
function generatePerformanceReport(results) {
  const timestamp = generateTimestamp();
  const reportPath = path.join(config.output.directory, `performance-report-${timestamp}.html`);
  
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LIMS Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; text-align: center; }
        h2 { color: #555; border-bottom: 2px solid #007acc; padding-bottom: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .score-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .score { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .score.good { color: #28a745; }
        .score.average { color: #ffc107; }
        .score.poor { color: #dc3545; }
        .metric { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .metric-name { font-weight: bold; color: #333; }
        .metric-value { color: #007acc; }
        .opportunities, .diagnostics { margin-top: 30px; }
        .opportunity, .diagnostic { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .url-section { margin-bottom: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #007acc; color: white; }
        .pass { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 LIMS Performance Report</h1>
        <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
`;

  results.forEach(result => {
    const analysis = analyzePerformance(result.lhr);
    
    html += `
        <div class="url-section">
            <h2>📄 ${result.name}</h2>
            <p><strong>URL:</strong> ${result.url}</p>
            
            <div class="summary">
                <div class="score-card">
                    <h3>Performance</h3>
                    <div class="score ${analysis.scores.performance >= 90 ? 'good' : analysis.scores.performance >= 70 ? 'average' : 'poor'}">${analysis.scores.performance}</div>
                </div>
                <div class="score-card">
                    <h3>Accessibility</h3>
                    <div class="score ${analysis.scores.accessibility >= 90 ? 'good' : analysis.scores.accessibility >= 70 ? 'average' : 'poor'}">${analysis.scores.accessibility}</div>
                </div>
                <div class="score-card">
                    <h3>Best Practices</h3>
                    <div class="score ${analysis.scores['best-practices'] >= 90 ? 'good' : analysis.scores['best-practices'] >= 70 ? 'average' : 'poor'}">${analysis.scores['best-practices']}</div>
                </div>
                <div class="score-card">
                    <h3>SEO</h3>
                    <div class="score ${analysis.scores.seo >= 90 ? 'good' : analysis.scores.seo >= 70 ? 'average' : 'poor'}">${analysis.scores.seo}</div>
                </div>
            </div>
            
            <h3>📊 Core Web Vitals</h3>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Score</th>
                    <th>Budget</th>
                    <th>Status</th>
                </tr>
`;

    Object.entries(analysis.metrics).forEach(([metric, data]) => {
      const status = data.score >= 90 ? 'pass' : 'fail';
      html += `
                <tr>
                    <td>${metric}</td>
                    <td class="metric-value">${data.value}</td>
                    <td>${data.score}</td>
                    <td>${data.budget ? formatMs(data.budget) : 'N/A'}</td>
                    <td class="${status}">${status.toUpperCase()}</td>
                </tr>
`;
    });

    html += `
            </table>
            
            <div class="opportunities">
                <h3>💡 Optimization Opportunities</h3>
`;

    if (analysis.opportunities.length > 0) {
      analysis.opportunities.forEach(opportunity => {
        html += `
                <div class="opportunity">
                    <div class="metric-name">${opportunity.title}</div>
                    <div>${opportunity.description}</div>
                    <div>Potential savings: ${formatMs(opportunity.savings)}</div>
                </div>
`;
      });
    } else {
      html += `<p>No optimization opportunities identified.</p>`;
    }

    html += `
            </div>
            
            <div class="diagnostics">
                <h3>🔍 Diagnostics</h3>
`;

    if (analysis.diagnostics.length > 0) {
      analysis.diagnostics.forEach(diagnostic => {
        html += `
                <div class="diagnostic">
                    <div class="metric-name">${diagnostic.title}</div>
                    <div>${diagnostic.description}</div>
                </div>
`;
      });
    } else {
      html += `<p>No diagnostic issues found.</p>`;
    }

    html += `
            </div>
        </div>
`;
  });

  html += `
    </div>
</body>
</html>
`;

  fs.writeFileSync(reportPath, html);
  console.log(`Performance report generated: ${reportPath}`);
  return reportPath;
}

// Main execution function
async function runPerformanceTests() {
  try {
    console.log('Starting LIMS performance testing with Lighthouse...');
    
    // Ensure output directory exists
    ensureDirectoryExists(config.output.directory);
    
    const results = [];
    
    // Run audits for each URL
    for (const urlConfig of config.urls) {
      try {
        const result = await runLighthouseAudit(urlConfig.url);
        results.push({
          name: urlConfig.name,
          url: urlConfig.url,
          thresholds: urlConfig.thresholds,
          lhr: result.lhr
        });
        
        // Save individual reports
        const timestamp = generateTimestamp();
        const fileName = `lighthouse-${urlConfig.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
        
        // Save JSON report
        if (config.output.formats.includes('json')) {
          const jsonPath = path.join(config.output.directory, `${fileName}.json`);
          fs.writeFileSync(jsonPath, JSON.stringify(result.lhr, null, 2));
        }
        
        // Save HTML report
        if (config.output.formats.includes('html')) {
          const htmlPath = path.join(config.output.directory, `${fileName}.html`);
          fs.writeFileSync(htmlPath, result.report);
        }
        
        console.log(`✅ Completed audit for ${urlConfig.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to audit ${urlConfig.name}:`, error.message);
      }
    }
    
    // Generate summary report
    if (results.length > 0) {
      const reportPath = generatePerformanceReport(results);
      console.log(`\n📊 Performance testing completed!`);
      console.log(`Summary report: ${reportPath}`);
      
      // Check thresholds
      let allPassed = true;
      results.forEach(result => {
        const analysis = analyzePerformance(result.lhr);
        const thresholds = result.thresholds;
        
        Object.entries(thresholds).forEach(([category, threshold]) => {
          const score = analysis.scores[category];
          if (score < threshold) {
            console.log(`❌ ${result.name} - ${category}: ${score} (threshold: ${threshold})`);
            allPassed = false;
          } else {
            console.log(`✅ ${result.name} - ${category}: ${score} (threshold: ${threshold})`);
          }
        });
      });
      
      if (allPassed) {
        console.log('\n🎉 All performance thresholds passed!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some performance thresholds failed. Please review the report.');
        process.exit(1);
      }
    } else {
      console.log('❌ No successful audits completed.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Fatal error during performance testing:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  runPerformanceTests,
  runLighthouseAudit,
  analyzePerformance,
  generatePerformanceReport
};

// Run if called directly
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}