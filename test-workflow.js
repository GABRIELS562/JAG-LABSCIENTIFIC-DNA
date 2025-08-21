#!/usr/bin/env node

/**
 * LIMS Workflow Testing and Verification Script
 * Tests the complete sample flow: Registration → DNA Extraction → PCR → Electrophoresis → Analysis → Reporting
 */

const API_URL = 'http://localhost:3001/api';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: '\x1b[1m'
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

// Workflow status definitions
const WORKFLOW_STATUSES = {
  REGISTERED: 'registered',
  SAMPLE_COLLECTED: 'sample_collected',
  DNA_EXTRACTED: 'dna_extracted',
  IN_PCR: 'in_pcr',
  PCR_COMPLETED: 'pcr_completed',
  IN_ELECTRO: 'in_electrophoresis',
  ELECTRO_COMPLETED: 'electro_completed',
  IN_ANALYSIS: 'in_analysis',
  ANALYSIS_COMPLETED: 'analysis_completed',
  REPORT_GENERATED: 'report_generated'
};

// API helper functions
async function apiCall(endpoint, options = {}) {
  try {
    const url = `${API_URL}${endpoint}`;
    logInfo(`Making API call: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} - ${data.message || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    logError(`API call failed: ${error.message}`);
    throw error;
  }
}

// Test functions for each workflow stage
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
    logStep(1, 'Testing Database Connectivity');
    
    try {
      // Test samples endpoint
      const samplesData = await apiCall('/samples?limit=5');
      if (samplesData.success && samplesData.data) {
        logSuccess(`Database connected - Found ${samplesData.data.length} samples`);
        this.addResult('Database Connectivity', 'pass', `${samplesData.data.length} samples accessible`);
        return true;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      logError(`Database connectivity failed: ${error.message}`);
      this.addResult('Database Connectivity', 'fail', error.message);
      return false;
    }
  }

  async testSampleRegistration() {
    logStep(2, 'Testing Sample Registration Workflow');
    
    try {
      // Check for samples with sample_collected status
      const collectedSamples = await apiCall('/samples?workflow_status=sample_collected');
      
      if (collectedSamples.data && collectedSamples.data.length > 0) {
        logSuccess(`Found ${collectedSamples.data.length} samples ready for DNA extraction`);
        this.addResult('Sample Registration', 'pass', `${collectedSamples.data.length} samples in sample_collected status`);
        
        // Show sample details
        collectedSamples.data.slice(0, 5).forEach(sample => {
          logInfo(`  - ${sample.lab_number}: ${sample.name} ${sample.surname} (${sample.case_number})`);
        });
        
        return collectedSamples.data;
      } else {
        logWarning('No samples found with sample_collected status');
        this.addResult('Sample Registration', 'warning', 'No samples ready for DNA extraction');
        return [];
      }
    } catch (error) {
      logError(`Sample registration test failed: ${error.message}`);
      this.addResult('Sample Registration', 'fail', error.message);
      return [];
    }
  }

  async testDNAExtractionWorkflow(samples) {
    logStep(3, 'Testing DNA Extraction Workflow');
    
    try {
      // Check for samples ready for DNA extraction
      const extractionReadySamples = samples || await apiCall('/samples?workflow_status=sample_collected');
      
      if (extractionReadySamples.data && extractionReadySamples.data.length > 0) {
        logSuccess(`DNA Extraction queue has ${extractionReadySamples.data.length} samples`);
        this.addResult('DNA Extraction Queue', 'pass', `${extractionReadySamples.data.length} samples ready`);
        
        // Test if DNA extraction component can load samples
        logInfo('DNA Extraction component should show these samples in the "Pending Samples" tab');
        
        return true;
      } else {
        logWarning('No samples ready for DNA extraction');
        this.addResult('DNA Extraction Queue', 'warning', 'No samples in queue');
        return false;
      }
    } catch (error) {
      logError(`DNA extraction test failed: ${error.message}`);
      this.addResult('DNA Extraction Workflow', 'fail', error.message);
      return false;
    }
  }

  async testPCRWorkflow() {
    logStep(4, 'Testing PCR Workflow');
    
    try {
      // Check for PCR-ready samples
      const pcrReadySamples = await apiCall('/samples?workflow_status=dna_extracted');
      
      if (pcrReadySamples.data && pcrReadySamples.data.length > 0) {
        logSuccess(`PCR queue has ${pcrReadySamples.data.length} samples ready`);
        this.addResult('PCR Sample Queue', 'pass', `${pcrReadySamples.data.length} samples ready for PCR`);
      } else {
        logWarning('No samples ready for PCR (workflow_status=dna_extracted)');
        
        // Check for samples with pcr_completed status instead
        const pcrCompletedSamples = await apiCall('/samples?workflow_status=pcr_completed');
        if (pcrCompletedSamples.data && pcrCompletedSamples.data.length > 0) {
          logSuccess(`Found ${pcrCompletedSamples.data.length} samples with PCR completed`);
          this.addResult('PCR Completed Samples', 'pass', `${pcrCompletedSamples.data.length} samples PCR completed`);
          return pcrCompletedSamples.data;
        } else {
          this.addResult('PCR Workflow', 'warning', 'No samples in PCR workflow');
        }
      }
      
      // Check PCR batches
      const batches = await apiCall('/batches');
      const pcrBatches = batches.data.filter(batch => batch.batch_number && batch.batch_number.startsWith('LDS_'));
      
      if (pcrBatches.length > 0) {
        logSuccess(`Found ${pcrBatches.length} PCR batches`);
        this.addResult('PCR Batches', 'pass', `${pcrBatches.length} PCR batches exist`);
        
        // Show recent batches
        pcrBatches.slice(0, 3).forEach(batch => {
          logInfo(`  - ${batch.batch_number}: ${batch.operator} (${batch.total_samples} samples)`);
        });
        
        return pcrBatches;
      } else {
        logWarning('No PCR batches found');
        this.addResult('PCR Batches', 'warning', 'No PCR batches exist');
        return [];
      }
    } catch (error) {
      logError(`PCR workflow test failed: ${error.message}`);
      this.addResult('PCR Workflow', 'fail', error.message);
      return [];
    }
  }

  async testElectrophoresisWorkflow(pcrBatches) {
    logStep(5, 'Testing Electrophoresis Workflow');
    
    try {
      // Check for electrophoresis-ready samples
      const electroReadySamples = await apiCall('/samples?workflow_status=pcr_completed');
      
      if (electroReadySamples.data && electroReadySamples.data.length > 0) {
        logSuccess(`Electrophoresis queue has ${electroReadySamples.data.length} samples ready`);
        this.addResult('Electrophoresis Queue', 'pass', `${electroReadySamples.data.length} samples ready`);
        
        // Show samples ready for electrophoresis
        electroReadySamples.data.slice(0, 5).forEach(sample => {
          logInfo(`  - ${sample.lab_number}: ${sample.name} ${sample.surname} (PCR completed)`);
        });
      } else {
        logWarning('No samples ready for electrophoresis');
        this.addResult('Electrophoresis Queue', 'warning', 'No samples ready');
      }
      
      // Check electrophoresis batches
      const batches = await apiCall('/batches');
      const electroBatches = batches.data.filter(batch => 
        batch.batch_number && batch.batch_number.startsWith('ELEC_')
      );
      
      if (electroBatches.length > 0) {
        logSuccess(`Found ${electroBatches.length} electrophoresis batches`);
        this.addResult('Electrophoresis Batches', 'pass', `${electroBatches.length} electro batches exist`);
        
        // Show recent batches
        electroBatches.slice(0, 3).forEach(batch => {
          logInfo(`  - ${batch.batch_number}: ${batch.operator} (${batch.total_samples} samples)`);
        });
        
        return true;
      } else {
        logWarning('No electrophoresis batches found');
        this.addResult('Electrophoresis Batches', 'warning', 'No electro batches exist');
        return false;
      }
    } catch (error) {
      logError(`Electrophoresis workflow test failed: ${error.message}`);
      this.addResult('Electrophoresis Workflow', 'fail', error.message);
      return false;
    }
  }

  async testAnalysisWorkflow() {
    logStep(6, 'Testing Analysis Workflow');
    
    try {
      // Check for analysis-ready samples
      const analysisReadySamples = await apiCall('/samples?workflow_status=electro_completed');
      
      if (analysisReadySamples.data && analysisReadySamples.data.length > 0) {
        logSuccess(`Analysis queue has ${analysisReadySamples.data.length} samples ready`);
        this.addResult('Analysis Queue', 'pass', `${analysisReadySamples.data.length} samples ready for analysis`);
        
        // Show samples ready for analysis
        analysisReadySamples.data.slice(0, 5).forEach(sample => {
          logInfo(`  - ${sample.lab_number}: ${sample.name} ${sample.surname} (Electro completed)`);
        });
      } else {
        logWarning('No samples ready for analysis');
        this.addResult('Analysis Queue', 'warning', 'No samples ready for analysis');
      }
      
      // Check for completed analyses
      const analysisCompletedSamples = await apiCall('/samples?workflow_status=analysis_completed');
      
      if (analysisCompletedSamples.data && analysisCompletedSamples.data.length > 0) {
        logSuccess(`Found ${analysisCompletedSamples.data.length} samples with completed analysis`);
        this.addResult('Completed Analyses', 'pass', `${analysisCompletedSamples.data.length} analyses completed`);
        
        // Show completed analyses
        analysisCompletedSamples.data.slice(0, 5).forEach(sample => {
          logInfo(`  - ${sample.lab_number}: ${sample.name} ${sample.surname} (Analysis done)`);
        });
        
        return true;
      } else {
        logWarning('No completed analyses found');
        this.addResult('Completed Analyses', 'warning', 'No completed analyses');
        return false;
      }
    } catch (error) {
      logError(`Analysis workflow test failed: ${error.message}`);
      this.addResult('Analysis Workflow', 'fail', error.message);
      return false;
    }
  }

  async testWorkflowTransitions() {
    logStep(7, 'Testing Workflow Status Transitions');
    
    try {
      const allSamples = await apiCall('/samples');
      const statusCounts = {};
      
      // Count samples by workflow status
      allSamples.data.forEach(sample => {
        const status = sample.workflow_status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      logInfo('Sample distribution across workflow stages:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        logInfo(`  - ${status}: ${count} samples`);
      });
      
      // Check if we have samples in each major stage
      const criticalStatuses = ['sample_collected', 'pcr_completed', 'electro_completed', 'analysis_completed'];
      let hasFlowingSamples = false;
      
      criticalStatuses.forEach(status => {
        if (statusCounts[status] && statusCounts[status] > 0) {
          hasFlowingSamples = true;
          logSuccess(`✅ Samples found in ${status} stage`);
        } else {
          logWarning(`⚠️  No samples in ${status} stage`);
        }
      });
      
      if (hasFlowingSamples) {
        this.addResult('Workflow Transitions', 'pass', 'Samples flowing through workflow stages');
        return true;
      } else {
        this.addResult('Workflow Transitions', 'warning', 'Limited workflow flow detected');
        return false;
      }
    } catch (error) {
      logError(`Workflow transitions test failed: ${error.message}`);
      this.addResult('Workflow Transitions', 'fail', error.message);
      return false;
    }
  }

  async testBatchIntegration() {
    logStep(8, 'Testing Batch Integration');
    
    try {
      const batches = await apiCall('/batches');
      
      if (!batches.data || batches.data.length === 0) {
        logWarning('No batches found in system');
        this.addResult('Batch Integration', 'warning', 'No batches exist');
        return false;
      }
      
      logSuccess(`Found ${batches.data.length} total batches`);
      
      // Categorize batches
      const pcrBatches = batches.data.filter(b => b.batch_number && b.batch_number.startsWith('LDS_'));
      const electroBatches = batches.data.filter(b => b.batch_number && b.batch_number.startsWith('ELEC_'));
      
      logInfo(`Batch breakdown:`);
      logInfo(`  - PCR batches (LDS_*): ${pcrBatches.length}`);
      logInfo(`  - Electrophoresis batches (ELEC_*): ${electroBatches.length}`);
      
      // Check plate layouts
      let batchesWithPlateLayout = 0;
      batches.data.forEach(batch => {
        if (batch.plate_layout && typeof batch.plate_layout === 'object') {
          batchesWithPlateLayout++;
        }
      });
      
      logInfo(`  - Batches with plate layouts: ${batchesWithPlateLayout}`);
      
      if (pcrBatches.length > 0 && electroBatches.length > 0) {
        logSuccess('Both PCR and Electrophoresis batches exist - workflow integration working');
        this.addResult('Batch Integration', 'pass', 'Complete batch workflow exists');
        return true;
      } else {
        logWarning('Missing either PCR or Electrophoresis batches');
        this.addResult('Batch Integration', 'warning', 'Incomplete batch workflow');
        return false;
      }
    } catch (error) {
      logError(`Batch integration test failed: ${error.message}`);
      this.addResult('Batch Integration', 'fail', error.message);
      return false;
    }
  }

  async testEndToEndFlow() {
    logStep(9, 'Testing End-to-End Sample Flow');
    
    try {
      // Find a sample that has moved through multiple stages
      const allSamples = await apiCall('/samples');
      
      // Look for samples in advanced stages
      const advancedSamples = allSamples.data.filter(sample => 
        ['electro_completed', 'analysis_completed', 'report_generated'].includes(sample.workflow_status)
      );
      
      if (advancedSamples.length > 0) {
        logSuccess(`Found ${advancedSamples.length} samples that have progressed through multiple workflow stages`);
        this.addResult('End-to-End Flow', 'pass', `${advancedSamples.length} samples completed multiple stages`);
        
        // Show examples
        advancedSamples.slice(0, 3).forEach(sample => {
          logInfo(`  - ${sample.lab_number}: Currently at ${sample.workflow_status}`);
        });
        
        return true;
      } else {
        logWarning('No samples found that have completed multiple workflow stages');
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
    } else if (failed === 0 && warnings < 3) {
      logSuccess('✅ GOOD: Workflow is functional with minor issues to address');
    } else if (failed < 3) {
      logWarning('⚠️  FAIR: Workflow has some issues that need attention');
    } else {
      logError('❌ POOR: Workflow has significant issues requiring immediate attention');
    }
    
    // Recommendations
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
      
      log('\n📝 Suggested Actions:');
      if (warningTests.some(t => t.test.includes('Queue'))) {
        logInfo('  1. Create more test samples to populate workflow queues');
      }
      if (warningTests.some(t => t.test.includes('Batch'))) {
        logInfo('  2. Create PCR and electrophoresis batches to test batch workflow');
      }
      if (warningTests.some(t => t.test.includes('Flow'))) {
        logInfo('  3. Process some samples through multiple workflow stages');
      }
    }
    
    log('\n🚀 Next Steps:');
    logInfo('  1. Visit each workflow page to verify UI functionality');
    logInfo('  2. Create test batches and process samples through stages');
    logInfo('  3. Test the complete workflow with real sample data');
    logInfo('  4. Verify all workflow transitions work correctly');
  }

  async runAllTests() {
    logHeader('LABSCIENTIFIC LIMS - WORKFLOW VERIFICATION');
    logInfo('Testing complete sample workflow from registration to reporting...\n');
    
    try {
      // Run all tests in sequence
      const dbConnected = await this.testDatabaseConnectivity();
      if (!dbConnected) {
        logError('Database connectivity failed - cannot continue tests');
        return;
      }
      
      const registeredSamples = await this.testSampleRegistration();
      await this.testDNAExtractionWorkflow(registeredSamples);
      const pcrBatches = await this.testPCRWorkflow();
      await this.testElectrophoresisWorkflow(pcrBatches);
      await this.testAnalysisWorkflow();
      await this.testWorkflowTransitions();
      await this.testBatchIntegration();
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

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
}

module.exports = WorkflowTester;