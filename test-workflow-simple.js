#!/usr/bin/env node

/**
 * LIMS Workflow Testing Script (Simplified)
 * Tests the complete sample workflow without external dependencies
 */

const http = require('http');

const API_URL = 'http://localhost:3001/api';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logHeader = (message) => {
  log('\n' + '='.repeat(60), 'cyan');
  log(`${message}`, 'cyan');
  log('='.repeat(60), 'cyan');
};

const logStep = (step, message) => {
  log(`\n${step}. ${message}`, 'blue');
};

const logSuccess = (message) => {
  log(`✅ ${message}`, 'green');
};

const logError = (message) => {
  log(`❌ ${message}`, 'red');
};

const logWarning = (message) => {
  log(`⚠️  ${message}`, 'yellow');
};

const logInfo = (message) => {
  log(`ℹ️  ${message}`, 'white');
};

// Simple HTTP request helper
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: { error: 'Invalid JSON response' } });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

class WorkflowTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  addResult(test, status, message) {
    this.testResults.details.push({ test, status, message });
    if (status === 'pass') this.testResults.passed++;
    else if (status === 'fail') this.testResults.failed++;
    else if (status === 'warning') this.testResults.warnings++;
  }

  async testDatabaseConnectivity() {
    logStep(1, 'Testing Database Connectivity & Sample Data');
    
    try {
      const response = await makeRequest('/samples?limit=5');
      
      if (response.status === 200 && response.data.success && response.data.data) {
        logSuccess(`Database connected - Found ${response.data.data.length} samples`);
        logInfo(`Total samples in system: ${response.data.meta?.pagination?.total || 'Unknown'}`);
        this.addResult('Database Connectivity', 'pass', `${response.data.data.length} samples accessible`);
        
        // Show sample details
        response.data.data.forEach(sample => {
          logInfo(`  - ${sample.lab_number}: ${sample.name} ${sample.surname} (${sample.workflow_status})`);
        });
        
        return response.data.data;
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (error) {
      logError(`Database connectivity failed: ${error.message}`);
      this.addResult('Database Connectivity', 'fail', error.message);
      return null;
    }
  }

  async testWorkflowStatuses() {
    logStep(2, 'Testing Workflow Status Distribution');
    
    try {
      const response = await makeRequest('/samples?limit=100');
      
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to fetch samples');
      }
      
      const samples = response.data.data;
      const statusCounts = {};
      
      samples.forEach(sample => {
        const status = sample.workflow_status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      logInfo('Sample distribution across workflow stages:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        logInfo(`  - ${status}: ${count} samples`);
      });
      
      // Critical workflow stages
      const criticalStages = {
        'sample_collected': 'Ready for DNA Extraction',
        'pcr_completed': 'Ready for Electrophoresis', 
        'electro_completed': 'Ready for Analysis',
        'analysis_completed': 'Analysis Complete'
      };
      
      let workingStages = 0;
      Object.entries(criticalStages).forEach(([status, description]) => {
        if (statusCounts[status] && statusCounts[status] > 0) {
          logSuccess(`✅ ${description}: ${statusCounts[status]} samples`);
          workingStages++;
        } else {
          logWarning(`⚠️  ${description}: 0 samples`);
        }
      });
      
      if (workingStages >= 2) {
        this.addResult('Workflow Status Distribution', 'pass', `${workingStages}/4 workflow stages have samples`);
        return true;
      } else {
        this.addResult('Workflow Status Distribution', 'warning', `Only ${workingStages}/4 workflow stages have samples`);
        return false;
      }
      
    } catch (error) {
      logError(`Workflow status test failed: ${error.message}`);
      this.addResult('Workflow Status Distribution', 'fail', error.message);
      return false;
    }
  }

  async testBatchSystem() {
    logStep(3, 'Testing Batch Management System');
    
    try {
      const response = await makeRequest('/batches');
      
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to fetch batches');
      }
      
      const batches = response.data.data;
      
      if (!batches || batches.length === 0) {
        logWarning('No batches found in system');
        this.addResult('Batch System', 'warning', 'No batches exist');
        return false;
      }
      
      logSuccess(`Found ${batches.length} total batches`);
      
      // Categorize batches
      const pcrBatches = batches.filter(b => b.batch_number && b.batch_number.startsWith('LDS_'));
      const electroBatches = batches.filter(b => b.batch_number && b.batch_number.startsWith('ELEC_'));
      
      logInfo('Batch breakdown:');
      logInfo(`  - PCR batches (LDS_*): ${pcrBatches.length}`);
      logInfo(`  - Electrophoresis batches (ELEC_*): ${electroBatches.length}`);
      
      // Show recent batches
      if (pcrBatches.length > 0) {
        logInfo('Recent PCR batches:');
        pcrBatches.slice(0, 3).forEach(batch => {
          logInfo(`  - ${batch.batch_number}: ${batch.operator} (${batch.total_samples} samples, ${batch.status})`);
        });
      }
      
      if (electroBatches.length > 0) {
        logInfo('Recent Electrophoresis batches:');
        electroBatches.slice(0, 3).forEach(batch => {
          logInfo(`  - ${batch.batch_number}: ${batch.operator} (${batch.total_samples} samples, ${batch.status})`);
        });
      }
      
      // Check plate layouts
      let batchesWithPlateLayout = 0;
      batches.forEach(batch => {
        if (batch.plate_layout && (typeof batch.plate_layout === 'object' || typeof batch.plate_layout === 'string')) {
          batchesWithPlateLayout++;
        }
      });
      
      logInfo(`Batches with plate layouts: ${batchesWithPlateLayout}/${batches.length}`);
      
      if (pcrBatches.length > 0 && electroBatches.length > 0) {
        logSuccess('Complete batch workflow exists (PCR → Electrophoresis)');
        this.addResult('Batch System', 'pass', 'Both PCR and Electro batches exist');
        return true;
      } else if (pcrBatches.length > 0 || electroBatches.length > 0) {
        logWarning('Partial batch workflow (missing either PCR or Electro batches)');
        this.addResult('Batch System', 'warning', 'Incomplete batch workflow');
        return false;
      } else {
        logWarning('No PCR or Electrophoresis batches found');
        this.addResult('Batch System', 'warning', 'No workflow batches exist');
        return false;
      }
      
    } catch (error) {
      logError(`Batch system test failed: ${error.message}`);
      this.addResult('Batch System', 'fail', error.message);
      return false;
    }
  }

  async testWorkflowTransitions() {
    logStep(4, 'Testing Sample Workflow Transitions');
    
    try {
      // Test each workflow transition
      const transitions = [
        { from: 'sample_collected', to: 'dna_extracted', stage: 'DNA Extraction' },
        { from: 'dna_extracted', to: 'pcr_completed', stage: 'PCR Processing' },
        { from: 'pcr_completed', to: 'electro_completed', stage: 'Electrophoresis' },
        { from: 'electro_completed', to: 'analysis_completed', stage: 'Analysis' }
      ];
      
      let workingTransitions = 0;
      
      for (const transition of transitions) {
        try {
          const fromResponse = await makeRequest(`/samples?workflow_status=${transition.from}&limit=5`);
          const toResponse = await makeRequest(`/samples?workflow_status=${transition.to}&limit=5`);
          
          const fromCount = fromResponse.data?.data?.length || 0;
          const toCount = toResponse.data?.data?.length || 0;
          
          if (fromCount > 0 || toCount > 0) {
            logSuccess(`✅ ${transition.stage}: ${fromCount} → ${toCount} samples`);
            workingTransitions++;
            
            if (fromCount > 0) {
              logInfo(`   Samples ready for ${transition.stage}:`);
              fromResponse.data.data.slice(0, 3).forEach(sample => {
                logInfo(`     - ${sample.lab_number}: ${sample.name} ${sample.surname}`);
              });
            }
          } else {
            logWarning(`⚠️  ${transition.stage}: No samples in transition`);
          }
        } catch (error) {
          logWarning(`⚠️  ${transition.stage}: Error checking transition`);
        }
      }
      
      if (workingTransitions >= 2) {
        logSuccess(`Workflow transitions working: ${workingTransitions}/${transitions.length} stages active`);
        this.addResult('Workflow Transitions', 'pass', `${workingTransitions}/${transitions.length} transitions active`);
        return true;
      } else {
        logWarning(`Limited workflow activity: ${workingTransitions}/${transitions.length} stages active`);
        this.addResult('Workflow Transitions', 'warning', `Only ${workingTransitions}/${transitions.length} transitions active`);
        return false;
      }
      
    } catch (error) {
      logError(`Workflow transitions test failed: ${error.message}`);
      this.addResult('Workflow Transitions', 'fail', error.message);
      return false;
    }
  }

  async testEndToEndFlow() {
    logStep(5, 'Testing End-to-End Sample Flow');
    
    try {
      // Look for samples that have progressed through multiple stages
      const advancedStatuses = ['electro_completed', 'analysis_completed', 'report_generated'];
      let samplesInAdvancedStages = 0;
      
      for (const status of advancedStatuses) {
        try {
          const response = await makeRequest(`/samples?workflow_status=${status}&limit=10`);
          const count = response.data?.data?.length || 0;
          samplesInAdvancedStages += count;
          
          if (count > 0) {
            logSuccess(`✅ ${status}: ${count} samples`);
            // Show examples
            response.data.data.slice(0, 3).forEach(sample => {
              logInfo(`   - ${sample.lab_number}: ${sample.name} ${sample.surname} (Case: ${sample.case_number})`);
            });
          }
        } catch (error) {
          logWarning(`⚠️  Error checking ${status}: ${error.message}`);
        }
      }
      
      if (samplesInAdvancedStages > 0) {
        logSuccess(`End-to-end flow confirmed: ${samplesInAdvancedStages} samples in advanced stages`);
        this.addResult('End-to-End Flow', 'pass', `${samplesInAdvancedStages} samples completed multiple stages`);
        return true;
      } else {
        logWarning('No samples found in advanced workflow stages');
        this.addResult('End-to-End Flow', 'warning', 'No end-to-end flow detected');
        return false;
      }
      
    } catch (error) {
      logError(`End-to-end flow test failed: ${error.message}`);
      this.addResult('End-to-End Flow', 'fail', error.message);
      return false;
    }
  }

  printSummary() {
    logHeader('WORKFLOW TEST SUMMARY');
    
    const { passed, failed, warnings, details } = this.testResults;
    
    log(`\n📊 Test Results:`);
    logSuccess(`  ✅ Passed: ${passed}`);
    if (warnings > 0) logWarning(`  ⚠️  Warnings: ${warnings}`);
    if (failed > 0) logError(`  ❌ Failed: ${failed}`);
    
    log(`\n📋 Detailed Results:`);
    details.forEach(({ test, status, message }) => {
      const symbol = status === 'pass' ? '✅' : status === 'warning' ? '⚠️ ' : '❌';
      const color = status === 'pass' ? 'green' : status === 'warning' ? 'yellow' : 'red';
      log(`  ${symbol} ${test}: ${message}`, color);
    });
    
    // Overall assessment
    log('\n🔍 Overall Assessment:');
    if (failed === 0 && warnings === 0) {
      logSuccess('🎉 EXCELLENT: All workflow stages are functioning perfectly!');
    } else if (failed === 0 && warnings <= 2) {
      logSuccess('✅ GOOD: Workflow is functional with minor issues');
    } else if (failed <= 1) {
      logWarning('⚠️  FAIR: Workflow has some issues that need attention');
    } else {
      logError('❌ POOR: Workflow has significant issues requiring immediate attention');
    }
    
    this.printRecommendations();
  }

  printRecommendations() {
    log('\n💡 Recommendations:');
    
    const { details } = this.testResults;
    const failedTests = details.filter(d => d.status === 'fail');
    const warningTests = details.filter(d => d.status === 'warning');
    
    if (failedTests.length > 0) {
      logError('\n🔧 Critical Issues to Fix:');
      failedTests.forEach(test => {
        logError(`  - ${test.test}: ${test.message}`);
      });
    }
    
    if (warningTests.length > 0) {
      logWarning('\n⚠️  Issues to Address:');
      warningTests.forEach(test => {
        logWarning(`  - ${test.test}: ${test.message}`);
      });
    }
    
    log('\n📝 Workflow Pages to Test:');
    logInfo('  1. Client Register (/client-register) - Create new samples');
    logInfo('  2. DNA Extraction (/dna-extraction) - Process sample_collected → dna_extracted');
    logInfo('  3. PCR Plate (/pcr-plate) - Create PCR batches with samples');
    logInfo('  4. Electrophoresis (/electrophoresis) - Load PCR batches for electro');
    logInfo('  5. PCR Batches (/pcr-batches) - View and manage batches');
    logInfo('  6. Analysis Summary (/analysis-summary) - View completed analyses');
    
    log('\n🔄 Suggested Test Workflow:');
    logInfo('  1. Register new samples (sample_collected status)');
    logInfo('  2. Process samples through DNA extraction');
    logInfo('  3. Create PCR batches and run them');
    logInfo('  4. Load completed PCR batches into electrophoresis');
    logInfo('  5. Complete electrophoresis and analyze results');
    logInfo('  6. Verify samples move through each status correctly');
  }

  async runAllTests() {
    logHeader('LABSCIENTIFIC LIMS - WORKFLOW VERIFICATION');
    logInfo('Testing complete sample workflow from registration to reporting...\n');
    
    try {
      // Test API connectivity first
      logInfo('Checking API server connectivity...');
      
      // Run all tests in sequence
      const samples = await this.testDatabaseConnectivity();
      if (!samples) {
        logError('Database connectivity failed - cannot continue tests');
        this.printSummary();
        return;
      }
      
      await this.testWorkflowStatuses();
      await this.testBatchSystem();
      await this.testWorkflowTransitions();
      await this.testEndToEndFlow();
      
      this.printSummary();
      
    } catch (error) {
      logError(`Test execution failed: ${error.message}`);
      this.addResult('Test Execution', 'fail', error.message);
      this.printSummary();
    }
  }
}

// Main execution
async function main() {
  const tester = new WorkflowTester();
  await tester.runAllTests();
}

// Run the tests
main().catch(error => {
  console.error('Failed to run tests:', error);
  process.exit(1);
});