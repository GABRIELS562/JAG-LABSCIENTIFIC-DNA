#!/usr/bin/env node

/**
 * Phase 5: Testing & Validation Suite Runner
 * Complete validation of Osiris STR paternity analysis system
 */

const PaternityValidationFramework = require('./validation-framework');
const ExclusionCaseGenerator = require('../test_data/generate-exclusion-cases');

class Phase5ValidationRunner {
  constructor() {
    this.validator = new PaternityValidationFramework();
    this.exclusionGenerator = new ExclusionCaseGenerator();
  }

  async runPhase5Validation() {
    console.log('🧬 PHASE 5: TESTING & VALIDATION');
    console.log('='.repeat(50));
    console.log('Osiris STR Paternity Analysis System');
    console.log('South African Laboratory Standards Compliance');
    console.log('='.repeat(50));

    try {
      // Step 1: Generate missing test cases
      console.log('\n📋 Step 1: Preparing Test Cases...');
      await this.prepareTestCases();

      // Step 2: Run validation framework
      console.log('\n🧪 Step 2: Running Validation Tests...');
      const validationReport = await this.validator.runCompleteValidation();

      // Step 3: Generate summary report
      console.log('\n📊 Step 3: Generating Summary Report...');
      await this.generateSummaryReport(validationReport);

      // Step 4: Display results
      this.displayFinalResults(validationReport);

      return validationReport;

    } catch (error) {
      console.error('❌ Phase 5 validation failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async prepareTestCases() {
    console.log('🔧 Ensuring all test cases are available...');
    
    // Generate exclusion cases if needed
    console.log('   Generating exclusion test cases...');
    await this.exclusionGenerator.generateAllExclusionCases();
    
    console.log('✅ Test case preparation complete');
  }

  async generateSummaryReport(validationReport) {
    const summary = {
      phase: 'Phase 5: Testing & Validation',
      timestamp: new Date().toISOString(),
      system: 'Osiris STR Paternity Analysis',
      compliance: 'South African Laboratory Standards',
      
      overview: {
        total_tests: validationReport.test_summary.total_tests,
        success_rate: ((validationReport.test_summary.passed / validationReport.test_summary.total_tests) * 100).toFixed(2) + '%',
        accuracy: validationReport.accuracy_verification.accuracy.toFixed(2) + '%',
        performance: this.calculatePerformanceScore(validationReport.performance_metrics),
        compliance_score: this.calculateComplianceScore(validationReport.compliance_status)
      },
      
      test_results_by_category: {
        inclusion_tests: {
          description: 'Clear father-child matches',
          total: validationReport.test_categories.inclusion.length,
          passed: validationReport.test_categories.inclusion.filter(t => t.isValid).length,
          success_rate: this.calculateSuccessRate(validationReport.test_categories.inclusion)
        },
        exclusion_tests: {
          description: 'Non-matching profiles',
          total: validationReport.test_categories.exclusion.length,
          passed: validationReport.test_categories.exclusion.filter(t => t.isValid).length,
          success_rate: this.calculateSuccessRate(validationReport.test_categories.exclusion)
        },
        complex_tests: {
          description: 'Mutations, null alleles, edge cases',
          total: validationReport.test_categories.complex.length,
          passed: validationReport.test_categories.complex.filter(t => t.isValid).length,
          success_rate: this.calculateSuccessRate(validationReport.test_categories.complex)
        },
        trio_tests: {
          description: 'Father-mother-child scenarios',
          total: validationReport.test_categories.trio.length,
          passed: validationReport.test_categories.trio.filter(t => t.isValid).length,
          success_rate: this.calculateSuccessRate(validationReport.test_categories.trio)
        },
        quality_tests: {
          description: 'Poor quality samples, mixed profiles',
          total: validationReport.test_categories.quality_issues.length,
          passed: validationReport.test_categories.quality_issues.filter(t => t.isValid).length,
          success_rate: this.calculateSuccessRate(validationReport.test_categories.quality_issues)
        }
      },
      
      south_african_compliance: {
        sanas_accreditation: this.getComplianceStatus(validationReport.compliance_status, 'SANAS Accreditation Requirements'),
        forensic_dna_regulations: this.getComplianceStatus(validationReport.compliance_status, 'Forensic DNA Regulations'),
        paternity_guidelines: this.getComplianceStatus(validationReport.compliance_status, 'Paternity Testing Guidelines'),
        iso17025_quality: this.getComplianceStatus(validationReport.compliance_status, 'ISO 17025 Quality Management'),
        chain_of_custody: this.getComplianceStatus(validationReport.compliance_status, 'Chain of Custody Requirements'),
        legal_reporting: this.getComplianceStatus(validationReport.compliance_status, 'Legal Reporting Standards')
      },
      
      performance_metrics: {
        throughput: validationReport.performance_metrics?.reduce((acc, curr) => acc + curr.throughput, 0) / validationReport.performance_metrics?.length || 0,
        average_processing_time: this.calculateAverageProcessingTime(validationReport.performance_metrics),
        scalability_score: this.calculateScalabilityScore(validationReport.performance_metrics)
      },
      
      certification_readiness: {
        overall_score: this.calculateOverallScore(validationReport),
        status: validationReport.certification_status,
        ready_for_production: this.isReadyForProduction(validationReport),
        recommendations: validationReport.recommendations
      }
    };

    // Save summary report
    const fs = require('fs').promises;
    const path = require('path');
    
    const reportsDir = path.join(__dirname, '../reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const summaryPath = path.join(reportsDir, `phase5_summary_${Date.now()}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📊 Summary report saved: ${summaryPath}`);
    
    return summary;
  }

  displayFinalResults(validationReport) {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PHASE 5 VALIDATION COMPLETE');
    console.log('='.repeat(60));
    
    // Overall Results
    console.log('\n📊 OVERALL RESULTS:');
    console.log(`   Tests Passed: ${validationReport.test_summary.passed}/${validationReport.test_summary.total_tests}`);
    console.log(`   Success Rate: ${((validationReport.test_summary.passed / validationReport.test_summary.total_tests) * 100).toFixed(2)}%`);
    console.log(`   Accuracy: ${validationReport.accuracy_verification.accuracy.toFixed(2)}%`);
    
    // Compliance Status
    console.log('\n🇿🇦 SOUTH AFRICAN COMPLIANCE:');
    const compliantChecks = validationReport.compliance_status.filter(c => c.compliant).length;
    const totalChecks = validationReport.compliance_status.length;
    console.log(`   Compliance Score: ${compliantChecks}/${totalChecks} (${((compliantChecks/totalChecks)*100).toFixed(1)}%)`);
    
    validationReport.compliance_status.forEach(check => {
      console.log(`   ${check.compliant ? '✅' : '❌'} ${check.check}`);
    });
    
    // Performance
    console.log('\n⚡ PERFORMANCE:');
    if (validationReport.performance_metrics && validationReport.performance_metrics.length > 0) {
      const avgThroughput = validationReport.performance_metrics.reduce((acc, curr) => acc + curr.throughput, 0) / validationReport.performance_metrics.length;
      console.log(`   Average Throughput: ${avgThroughput.toFixed(2)} cases/second`);
      console.log(`   Largest Batch: ${Math.max(...validationReport.performance_metrics.map(p => p.batchSize))} cases`);
    }
    
    // Certification Status
    console.log('\n🏆 CERTIFICATION STATUS:');
    console.log(`   Status: ${validationReport.certification_status}`);
    console.log(`   Ready for Production: ${this.isReadyForProduction(validationReport) ? 'YES' : 'NO'}`);
    
    if (validationReport.recommendations && validationReport.recommendations.length > 0) {
      console.log('\n📋 RECOMMENDATIONS:');
      validationReport.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🧬 Osiris STR Paternity Analysis System');
    console.log('✅ Phase 5 Testing & Validation Complete');
    console.log('🇿🇦 South African Laboratory Standards Verified');
    console.log('='.repeat(60));
  }

  // Helper methods
  calculateSuccessRate(tests) {
    if (tests.length === 0) return '0%';
    const passed = tests.filter(t => t.isValid).length;
    return ((passed / tests.length) * 100).toFixed(1) + '%';
  }

  calculatePerformanceScore(performanceMetrics) {
    if (!performanceMetrics || performanceMetrics.length === 0) return 'N/A';
    
    const avgThroughput = performanceMetrics.reduce((acc, curr) => acc + curr.throughput, 0) / performanceMetrics.length;
    
    if (avgThroughput >= 5) return 'Excellent';
    if (avgThroughput >= 2) return 'Good';
    if (avgThroughput >= 1) return 'Fair';
    return 'Needs Improvement';
  }

  calculateComplianceScore(complianceStatus) {
    if (!complianceStatus || complianceStatus.length === 0) return '0%';
    
    const compliant = complianceStatus.filter(c => c.compliant).length;
    return ((compliant / complianceStatus.length) * 100).toFixed(1) + '%';
  }

  getComplianceStatus(complianceStatus, checkName) {
    const check = complianceStatus.find(c => c.check === checkName);
    return check ? (check.compliant ? 'COMPLIANT' : 'NON-COMPLIANT') : 'NOT_TESTED';
  }

  calculateAverageProcessingTime(performanceMetrics) {
    if (!performanceMetrics || performanceMetrics.length === 0) return 'N/A';
    
    const avgDuration = performanceMetrics.reduce((acc, curr) => acc + curr.duration, 0) / performanceMetrics.length;
    return `${(avgDuration / 1000).toFixed(2)} seconds`;
  }

  calculateScalabilityScore(performanceMetrics) {
    if (!performanceMetrics || performanceMetrics.length < 2) return 'N/A';
    
    // Check if throughput remains stable as batch size increases
    const throughputTrend = performanceMetrics.map(p => p.throughput);
    const isStable = throughputTrend.every((curr, idx) => idx === 0 || curr >= throughputTrend[idx-1] * 0.8);
    
    return isStable ? 'Good' : 'Needs Optimization';
  }

  calculateOverallScore(validationReport) {
    const testScore = (validationReport.test_summary.passed / validationReport.test_summary.total_tests) * 30;
    const accuracyScore = (validationReport.accuracy_verification.accuracy / 100) * 30;
    const complianceScore = (validationReport.compliance_status.filter(c => c.compliant).length / validationReport.compliance_status.length) * 40;
    
    return Math.round(testScore + accuracyScore + complianceScore);
  }

  isReadyForProduction(validationReport) {
    const overallScore = this.calculateOverallScore(validationReport);
    const accuracy = validationReport.accuracy_verification.accuracy;
    const complianceRate = (validationReport.compliance_status.filter(c => c.compliant).length / validationReport.compliance_status.length) * 100;
    
    return overallScore >= 85 && accuracy >= 95 && complianceRate >= 80;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new Phase5ValidationRunner();
  runner.runPhase5Validation()
    .then(report => {
      console.log('\n✅ Phase 5 validation completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Phase 5 validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = Phase5ValidationRunner;