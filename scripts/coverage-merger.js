#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Merges coverage reports from frontend and backend
 */
class CoverageMerger {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.frontendCoverageDir = path.join(this.rootDir, 'coverage');
    this.backendCoverageDir = path.join(this.rootDir, 'backend', 'coverage');
    this.mergedCoverageDir = path.join(this.rootDir, 'coverage-merged');
  }

  async mergeCoverage() {
    console.log('🔄 Merging coverage reports...');

    try {
      // Create merged coverage directory
      if (!fs.existsSync(this.mergedCoverageDir)) {
        fs.mkdirSync(this.mergedCoverageDir, { recursive: true });
      }

      // Check if coverage reports exist
      const frontendExists = fs.existsSync(this.frontendCoverageDir);
      const backendExists = fs.existsSync(this.backendCoverageDir);

      if (!frontendExists && !backendExists) {
        console.warn('⚠️ No coverage reports found');
        return;
      }

      // Merge LCOV files
      await this.mergeLcovFiles();

      // Merge JSON files for detailed analysis
      await this.mergeJsonFiles();

      // Generate combined HTML report
      await this.generateCombinedReport();

      // Generate summary
      await this.generateSummary();

      console.log('✅ Coverage reports merged successfully');
      console.log(`📁 Merged reports available at: ${this.mergedCoverageDir}`);

    } catch (error) {
      console.error('❌ Error merging coverage reports:', error);
      process.exit(1);
    }
  }

  async mergeLcovFiles() {
    const lcovFiles = [];

    // Add frontend LCOV
    const frontendLcov = path.join(this.frontendCoverageDir, 'lcov.info');
    if (fs.existsSync(frontendLcov)) {
      lcovFiles.push(frontendLcov);
    }

    // Add backend LCOV
    const backendLcov = path.join(this.backendCoverageDir, 'lcov.info');
    if (fs.existsSync(backendLcov)) {
      lcovFiles.push(backendLcov);
    }

    if (lcovFiles.length === 0) {
      console.warn('⚠️ No LCOV files found to merge');
      return;
    }

    // Merge LCOV files
    const mergedLcov = path.join(this.mergedCoverageDir, 'lcov.info');
    let mergedContent = '';

    for (const lcovFile of lcovFiles) {
      const content = fs.readFileSync(lcovFile, 'utf8');
      mergedContent += content + '\n';
    }

    fs.writeFileSync(mergedLcov, mergedContent);
    console.log('📄 LCOV files merged');
  }

  async mergeJsonFiles() {
    const jsonFiles = [];
    const mergedData = {
      total: {
        lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
        statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
      },
      files: {}
    };

    // Add frontend JSON
    const frontendJson = path.join(this.frontendCoverageDir, 'coverage-final.json');
    if (fs.existsSync(frontendJson)) {
      jsonFiles.push({ file: frontendJson, prefix: 'frontend' });
    }

    // Add backend JSON
    const backendJson = path.join(this.backendCoverageDir, 'coverage-final.json');
    if (fs.existsSync(backendJson)) {
      jsonFiles.push({ file: backendJson, prefix: 'backend' });
    }

    // Merge JSON data
    for (const { file, prefix } of jsonFiles) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      
      Object.keys(data).forEach(filePath => {
        const fileData = data[filePath];
        const prefixedPath = `${prefix}/${filePath}`;
        
        mergedData.files[prefixedPath] = fileData;
        
        // Update totals
        if (fileData.s) {
          mergedData.total.statements.total += Object.keys(fileData.s).length;
          mergedData.total.statements.covered += Object.values(fileData.s).filter(v => v > 0).length;
        }
        
        if (fileData.f) {
          mergedData.total.functions.total += Object.keys(fileData.f).length;
          mergedData.total.functions.covered += Object.values(fileData.f).filter(v => v > 0).length;
        }
        
        if (fileData.b) {
          Object.values(fileData.b).forEach(branches => {
            mergedData.total.branches.total += branches.length;
            mergedData.total.branches.covered += branches.filter(v => v > 0).length;
          });
        }
      });
    }

    // Calculate percentages
    const calcPct = (covered, total) => total > 0 ? Math.round((covered / total) * 100) : 0;
    
    mergedData.total.statements.pct = calcPct(
      mergedData.total.statements.covered, 
      mergedData.total.statements.total
    );
    mergedData.total.functions.pct = calcPct(
      mergedData.total.functions.covered, 
      mergedData.total.functions.total
    );
    mergedData.total.branches.pct = calcPct(
      mergedData.total.branches.covered, 
      mergedData.total.branches.total
    );

    // Write merged JSON
    const mergedJsonFile = path.join(this.mergedCoverageDir, 'coverage-final.json');
    fs.writeFileSync(mergedJsonFile, JSON.stringify(mergedData, null, 2));
    
    console.log('📊 JSON coverage data merged');
  }

  async generateCombinedReport() {
    try {
      // Generate HTML report from merged LCOV
      const mergedLcov = path.join(this.mergedCoverageDir, 'lcov.info');
      const htmlOutput = path.join(this.mergedCoverageDir, 'html');
      
      if (fs.existsSync(mergedLcov)) {
        execSync(`npx lcov-result-merger '${mergedLcov}' '${htmlOutput}'`, {
          stdio: 'inherit',
          cwd: this.rootDir
        });
        console.log('🌐 Combined HTML report generated');
      }
    } catch (error) {
      console.warn('⚠️ Could not generate HTML report:', error.message);
    }
  }

  async generateSummary() {
    const summaryFile = path.join(this.mergedCoverageDir, 'summary.json');
    const mergedJsonFile = path.join(this.mergedCoverageDir, 'coverage-final.json');
    
    if (!fs.existsSync(mergedJsonFile)) {
      return;
    }

    const data = JSON.parse(fs.readFileSync(mergedJsonFile, 'utf8'));
    const summary = {
      timestamp: new Date().toISOString(),
      total: data.total,
      fileCount: Object.keys(data.files).length,
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      },
      passed: {
        statements: data.total.statements.pct >= 70,
        branches: data.total.branches.pct >= 70,
        functions: data.total.functions.pct >= 70
      }
    };

    summary.overallPassed = Object.values(summary.passed).every(Boolean);

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    // Log summary to console
    console.log('\n📈 Coverage Summary:');
    console.log(`   Statements: ${data.total.statements.pct}% (${data.total.statements.covered}/${data.total.statements.total})`);
    console.log(`   Branches:   ${data.total.branches.pct}% (${data.total.branches.covered}/${data.total.branches.total})`);
    console.log(`   Functions:  ${data.total.functions.pct}% (${data.total.functions.covered}/${data.total.functions.total})`);
    console.log(`   Files:      ${summary.fileCount}`);
    console.log(`   Status:     ${summary.overallPassed ? '✅ PASS' : '❌ FAIL'}`);
  }
}

// Run if called directly
if (require.main === module) {
  const merger = new CoverageMerger();
  merger.mergeCoverage();
}

module.exports = CoverageMerger;