const db = require('./database');
const path = require('path');
const { logger } = require('../utils/logger');

class QualityControlService {
  constructor() {
    this.db = db;
    this.initializeDatabase();
    this.qcThresholds = this.loadQCThresholds();
  }

  initializeDatabase() {
    // Create QC tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS qc_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER,
        metric_type TEXT NOT NULL,
        metric_value REAL,
        threshold_min REAL,
        threshold_max REAL,
        passed BOOLEAN,
        notes TEXT,
        measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        measured_by TEXT,
        FOREIGN KEY (sample_id) REFERENCES samples(id)
      );

      CREATE TABLE IF NOT EXISTS qc_controls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        control_type TEXT NOT NULL,
        control_name TEXT NOT NULL,
        expected_profile TEXT,
        lot_number TEXT,
        expiry_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS qc_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        run_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        control_results TEXT,
        overall_status TEXT,
        reviewed_by TEXT,
        review_date DATETIME,
        comments TEXT,
        FOREIGN KEY (batch_id) REFERENCES batches(id)
      );

      CREATE TABLE IF NOT EXISTS sample_degradation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER,
        degradation_index REAL,
        rin_value REAL,
        260_280_ratio REAL,
        260_230_ratio REAL,
        assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sample_id) REFERENCES samples(id)
      );

      CREATE TABLE IF NOT EXISTS contamination_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER,
        check_type TEXT,
        contamination_detected BOOLEAN,
        contamination_level TEXT,
        contaminant_profile TEXT,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checked_by TEXT,
        FOREIGN KEY (sample_id) REFERENCES samples(id)
      );
    `);
  }

  loadQCThresholds() {
    return {
      dna: {
        concentration: { min: 0.5, max: 50, unit: 'ng/µL' },
        purity_260_280: { min: 1.7, max: 2.0 },
        purity_260_230: { min: 1.8, max: 2.2 },
        volume: { min: 20, max: 100, unit: 'µL' },
        rin_value: { min: 7.0, max: 10.0 },
        degradation_index: { min: 0, max: 1.5 }
      },
      pcr: {
        ct_value: { min: 18, max: 35 },
        efficiency: { min: 90, max: 110, unit: '%' },
        r_squared: { min: 0.98, max: 1.0 },
        melt_curve_tm: { min: 78, max: 82, unit: '°C' }
      },
      str: {
        rfu_height: { min: 150, max: 6000 },
        peak_height_ratio: { min: 0.6, max: 1.0 },
        stutter_percentage: { min: 0, max: 15, unit: '%' },
        pull_up_percentage: { min: 0, max: 5, unit: '%' },
        allele_count: { min: 1, max: 2 },
        heterozygote_balance: { min: 0.6, max: 1.0 }
      },
      electrophoresis: {
        sizing_quality: { min: 0.95, max: 1.0 },
        baseline_noise: { min: 0, max: 50, unit: 'RFU' },
        resolution: { min: 0.9, max: 1.0 },
        ladder_quality: { min: 0.95, max: 1.0 }
      },
      controls: {
        positive_match: { min: 0.99, max: 1.0 },
        negative_peaks: { min: 0, max: 0 }
      }
    };
  }

  // Assess sample quality
  assessSampleQuality(sampleId, measurements) {
    try {
      const results = {
        sampleId,
        overall: 'PASS',
        metrics: {},
        warnings: [],
        failures: []
      };

      // Check DNA quality metrics
      if (measurements.dna) {
        const dnaQC = this.assessDNAQuality(measurements.dna);
        results.metrics.dna = dnaQC;
        if (dnaQC.status === 'FAIL') {
          results.overall = 'FAIL';
          results.failures.push(...dnaQC.failures);
        } else if (dnaQC.status === 'WARNING') {
          results.warnings.push(...dnaQC.warnings);
        }
      }

      // Check STR profile quality
      if (measurements.str) {
        const strQC = this.assessSTRQuality(measurements.str);
        results.metrics.str = strQC;
        if (strQC.status === 'FAIL') {
          results.overall = 'FAIL';
          results.failures.push(...strQC.failures);
        } else if (strQC.status === 'WARNING') {
          results.warnings.push(...strQC.warnings);
        }
      }

      // Store QC metrics
      this.storeQCMetrics(sampleId, results.metrics);

      return results;
    } catch (error) {
      logger.error('Sample quality assessment failed', { error: error.message, sampleId });
      throw error;
    }
  }

  // Assess DNA quality
  assessDNAQuality(measurements) {
    const result = {
      status: 'PASS',
      warnings: [],
      failures: [],
      values: {}
    };

    const thresholds = this.qcThresholds.dna;

    // Check concentration
    if (measurements.concentration !== undefined) {
      const conc = parseFloat(measurements.concentration);
      result.values.concentration = conc;
      
      if (conc < thresholds.concentration.min) {
        result.failures.push(`DNA concentration too low: ${conc} ng/µL (min: ${thresholds.concentration.min})`);
        result.status = 'FAIL';
      } else if (conc > thresholds.concentration.max) {
        result.warnings.push(`DNA concentration high: ${conc} ng/µL (max: ${thresholds.concentration.max})`);
        if (result.status === 'PASS') result.status = 'WARNING';
      }
    }

    // Check 260/280 ratio (protein contamination)
    if (measurements.ratio_260_280 !== undefined) {
      const ratio = parseFloat(measurements.ratio_260_280);
      result.values.ratio_260_280 = ratio;
      
      if (ratio < thresholds.purity_260_280.min || ratio > thresholds.purity_260_280.max) {
        result.warnings.push(`260/280 ratio outside range: ${ratio} (expected: ${thresholds.purity_260_280.min}-${thresholds.purity_260_280.max})`);
        if (result.status === 'PASS') result.status = 'WARNING';
      }
    }

    // Check 260/230 ratio (organic contamination)
    if (measurements.ratio_260_230 !== undefined) {
      const ratio = parseFloat(measurements.ratio_260_230);
      result.values.ratio_260_230 = ratio;
      
      if (ratio < thresholds.purity_260_230.min) {
        result.warnings.push(`260/230 ratio low: ${ratio} - possible organic contamination`);
        if (result.status === 'PASS') result.status = 'WARNING';
      }
    }

    // Check RIN value for RNA integrity
    if (measurements.rin_value !== undefined) {
      const rin = parseFloat(measurements.rin_value);
      result.values.rin_value = rin;
      
      if (rin < thresholds.rin_value.min) {
        result.failures.push(`RIN value too low: ${rin} (min: ${thresholds.rin_value.min}) - sample degraded`);
        result.status = 'FAIL';
      }
    }

    // Check degradation index
    if (measurements.degradation_index !== undefined) {
      const di = parseFloat(measurements.degradation_index);
      result.values.degradation_index = di;
      
      if (di > thresholds.degradation_index.max) {
        result.warnings.push(`High degradation index: ${di} - partial profile expected`);
        if (result.status === 'PASS') result.status = 'WARNING';
      }
    }

    return result;
  }

  // Assess STR profile quality
  assessSTRQuality(measurements) {
    const result = {
      status: 'PASS',
      warnings: [],
      failures: [],
      values: {},
      loci: {}
    };

    const thresholds = this.qcThresholds.str;

    // Process each locus
    if (measurements.loci) {
      for (const [locus, data] of Object.entries(measurements.loci)) {
        const locusQC = {
          status: 'PASS',
          issues: []
        };

        // Check RFU heights
        if (data.peak1_height !== undefined) {
          const height = parseFloat(data.peak1_height);
          if (height < thresholds.rfu_height.min) {
            locusQC.issues.push(`Low RFU: ${height}`);
            locusQC.status = 'WARNING';
          } else if (height > thresholds.rfu_height.max) {
            locusQC.issues.push(`Off-scale RFU: ${height}`);
            locusQC.status = 'FAIL';
          }
        }

        // Check heterozygote balance
        if (data.peak1_height && data.peak2_height) {
          const balance = Math.min(data.peak1_height, data.peak2_height) / 
                          Math.max(data.peak1_height, data.peak2_height);
          
          if (balance < thresholds.heterozygote_balance.min) {
            locusQC.issues.push(`Poor balance: ${(balance * 100).toFixed(1)}%`);
            locusQC.status = 'WARNING';
          }
        }

        // Check stutter
        if (data.stutter_percentage !== undefined) {
          const stutter = parseFloat(data.stutter_percentage);
          if (stutter > thresholds.stutter_percentage.max) {
            locusQC.issues.push(`High stutter: ${stutter}%`);
            locusQC.status = 'WARNING';
          }
        }

        // Check pull-up/bleed-through
        if (data.pullup_detected) {
          locusQC.issues.push('Pull-up detected');
          locusQC.status = 'WARNING';
        }

        result.loci[locus] = locusQC;

        // Update overall status
        if (locusQC.status === 'FAIL') {
          result.status = 'FAIL';
          result.failures.push(`${locus}: ${locusQC.issues.join(', ')}`);
        } else if (locusQC.status === 'WARNING' && result.status === 'PASS') {
          result.status = 'WARNING';
          result.warnings.push(`${locus}: ${locusQC.issues.join(', ')}`);
        }
      }
    }

    // Check overall metrics
    if (measurements.overall) {
      // Check baseline noise
      if (measurements.overall.baseline_noise > thresholds.electrophoresis.baseline_noise.max) {
        result.warnings.push(`High baseline noise: ${measurements.overall.baseline_noise} RFU`);
        if (result.status === 'PASS') result.status = 'WARNING';
      }

      // Check sizing quality
      if (measurements.overall.sizing_quality < thresholds.electrophoresis.sizing_quality.min) {
        result.failures.push(`Poor sizing quality: ${measurements.overall.sizing_quality}`);
        result.status = 'FAIL';
      }
    }

    return result;
  }

  // Check for contamination
  checkContamination(sampleId, profile) {
    try {
      const result = {
        contaminated: false,
        type: null,
        level: null,
        evidence: []
      };

      // Check for extra alleles (more than 2 per locus)
      const extraAlleles = this.detectExtraAlleles(profile);
      if (extraAlleles.length > 0) {
        result.contaminated = true;
        result.type = 'mixture';
        result.evidence.push(`Extra alleles at: ${extraAlleles.join(', ')}`);
      }

      // Check for unexpected peak patterns
      const unexpectedPeaks = this.detectUnexpectedPeaks(profile);
      if (unexpectedPeaks.length > 0) {
        result.contaminated = true;
        result.type = result.type || 'cross-contamination';
        result.evidence.push(`Unexpected peaks: ${unexpectedPeaks.length}`);
      }

      // Assess contamination level
      if (result.contaminated) {
        result.level = this.assessContaminationLevel(profile);
      }

      // Store contamination check
      this.storeContaminationCheck(sampleId, result);

      return result;
    } catch (error) {
      logger.error('Contamination check failed', { error: error.message, sampleId });
      throw error;
    }
  }

  // Detect extra alleles
  detectExtraAlleles(profile) {
    const extraAlleleLoci = [];
    
    for (const [locus, data] of Object.entries(profile)) {
      if (data.alleles && data.alleles.length > 2) {
        extraAlleleLoci.push(locus);
      }
    }
    
    return extraAlleleLoci;
  }

  // Detect unexpected peaks
  detectUnexpectedPeaks(profile) {
    const unexpectedPeaks = [];
    
    for (const [locus, data] of Object.entries(profile)) {
      if (data.peaks) {
        // Check for peaks outside expected allele positions
        const expectedPositions = data.expected_alleles || [];
        const observedPositions = data.peaks.map(p => p.position);
        
        for (const pos of observedPositions) {
          if (!expectedPositions.includes(pos)) {
            unexpectedPeaks.push({ locus, position: pos });
          }
        }
      }
    }
    
    return unexpectedPeaks;
  }

  // Assess contamination level
  assessContaminationLevel(profile) {
    let totalMinorPeakHeight = 0;
    let totalMajorPeakHeight = 0;
    
    for (const [locus, data] of Object.entries(profile)) {
      if (data.peaks && data.peaks.length > 0) {
        const sortedPeaks = [...data.peaks].sort((a, b) => b.height - a.height);
        
        if (sortedPeaks.length >= 2) {
          totalMajorPeakHeight += sortedPeaks[0].height + sortedPeaks[1].height;
        }
        
        if (sortedPeaks.length > 2) {
          for (let i = 2; i < sortedPeaks.length; i++) {
            totalMinorPeakHeight += sortedPeaks[i].height;
          }
        }
      }
    }
    
    const contaminationRatio = totalMinorPeakHeight / totalMajorPeakHeight;
    
    if (contaminationRatio < 0.05) return 'trace';
    if (contaminationRatio < 0.15) return 'minor';
    if (contaminationRatio < 0.35) return 'moderate';
    return 'major';
  }

  // Run control checks
  runControlChecks(batchId, controls) {
    try {
      const results = {
        batchId,
        passed: true,
        controls: {}
      };

      // Check positive control
      if (controls.positive) {
        const positiveCheck = this.checkPositiveControl(controls.positive);
        results.controls.positive = positiveCheck;
        if (!positiveCheck.passed) {
          results.passed = false;
        }
      }

      // Check negative control
      if (controls.negative) {
        const negativeCheck = this.checkNegativeControl(controls.negative);
        results.controls.negative = negativeCheck;
        if (!negativeCheck.passed) {
          results.passed = false;
        }
      }

      // Check reagent blank
      if (controls.blank) {
        const blankCheck = this.checkReagentBlank(controls.blank);
        results.controls.blank = blankCheck;
        if (!blankCheck.passed) {
          results.passed = false;
        }
      }

      // Store control run results
      this.storeControlRun(batchId, results);

      return results;
    } catch (error) {
      logger.error('Control checks failed', { error: error.message, batchId });
      throw error;
    }
  }

  // Check positive control
  checkPositiveControl(controlData) {
    const expected = this.getExpectedControlProfile('positive');
    const matchScore = this.compareProfiles(controlData.profile, expected);
    
    return {
      passed: matchScore >= this.qcThresholds.controls.positive_match.min,
      matchScore,
      issues: matchScore < this.qcThresholds.controls.positive_match.min ? 
        ['Positive control does not match expected profile'] : []
    };
  }

  // Check negative control
  checkNegativeControl(controlData) {
    const peakCount = this.countPeaks(controlData.profile);
    
    return {
      passed: peakCount === 0,
      peakCount,
      issues: peakCount > 0 ? 
        [`Negative control shows ${peakCount} unexpected peaks`] : []
    };
  }

  // Check reagent blank
  checkReagentBlank(blankData) {
    const peakCount = this.countPeaks(blankData.profile);
    
    return {
      passed: peakCount === 0,
      peakCount,
      issues: peakCount > 0 ? 
        [`Reagent blank contamination: ${peakCount} peaks detected`] : []
    };
  }

  // Get expected control profile
  getExpectedControlProfile(controlType) {
    const stmt = this.db.prepare(`
      SELECT expected_profile 
      FROM qc_controls 
      WHERE control_type = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    const control = stmt.get(controlType);
    return control ? JSON.parse(control.expected_profile) : {};
  }

  // Compare profiles
  compareProfiles(observed, expected) {
    let matches = 0;
    let total = 0;
    
    for (const locus in expected) {
      total++;
      if (observed[locus]) {
        const obsAlleles = new Set(observed[locus].alleles || []);
        const expAlleles = new Set(expected[locus].alleles || []);
        
        if (this.setsEqual(obsAlleles, expAlleles)) {
          matches++;
        }
      }
    }
    
    return total > 0 ? matches / total : 0;
  }

  // Check if two sets are equal
  setsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }

  // Count peaks in profile
  countPeaks(profile) {
    let count = 0;
    for (const locus in profile) {
      if (profile[locus].peaks) {
        count += profile[locus].peaks.length;
      }
    }
    return count;
  }

  // Store QC metrics
  storeQCMetrics(sampleId, metrics) {
    const stmt = this.db.prepare(`
      INSERT INTO qc_metrics (sample_id, metric_type, metric_value, passed, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const [type, data] of Object.entries(metrics)) {
      const passed = data.status === 'PASS';
      const notes = [...(data.warnings || []), ...(data.failures || [])].join('; ');
      
      stmt.run(sampleId, type, JSON.stringify(data.values), passed, notes);
    }
  }

  // Store contamination check
  storeContaminationCheck(sampleId, result) {
    const stmt = this.db.prepare(`
      INSERT INTO contamination_checks 
      (sample_id, check_type, contamination_detected, contamination_level, contaminant_profile)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      sampleId,
      result.type || 'routine',
      result.contaminated,
      result.level,
      JSON.stringify(result.evidence)
    );
  }

  // Store control run
  storeControlRun(batchId, results) {
    const stmt = this.db.prepare(`
      INSERT INTO qc_runs (batch_id, control_results, overall_status)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(
      batchId,
      JSON.stringify(results.controls),
      results.passed ? 'PASS' : 'FAIL'
    );
  }

  // Get sample QC history
  getSampleQCHistory(sampleId) {
    const metrics = this.db.prepare(`
      SELECT * FROM qc_metrics 
      WHERE sample_id = ?
      ORDER BY measured_at DESC
    `).all(sampleId);

    const contamination = this.db.prepare(`
      SELECT * FROM contamination_checks
      WHERE sample_id = ?
      ORDER BY checked_at DESC
    `).all(sampleId);

    const degradation = this.db.prepare(`
      SELECT * FROM sample_degradation
      WHERE sample_id = ?
      ORDER BY assessed_at DESC
    `).all(sampleId);

    return {
      metrics,
      contamination,
      degradation
    };
  }

  // Get batch QC summary
  getBatchQCSummary(batchId) {
    const runs = this.db.prepare(`
      SELECT * FROM qc_runs
      WHERE batch_id = ?
      ORDER BY run_date DESC
    `).all(batchId);

    const sampleMetrics = this.db.prepare(`
      SELECT qm.*, s.lab_number
      FROM qc_metrics qm
      JOIN samples s ON qm.sample_id = s.id
      WHERE s.batch_id = ?
      ORDER BY qm.measured_at DESC
    `).all(batchId);

    return {
      controlRuns: runs,
      sampleMetrics,
      overallStatus: this.calculateBatchStatus(runs, sampleMetrics)
    };
  }

  // Calculate batch status
  calculateBatchStatus(runs, metrics) {
    let status = 'PASS';
    
    // Check control runs
    for (const run of runs) {
      if (run.overall_status === 'FAIL') {
        return 'FAIL';
      }
    }
    
    // Check sample metrics
    let failCount = 0;
    let warningCount = 0;
    
    for (const metric of metrics) {
      if (!metric.passed) {
        failCount++;
      }
    }
    
    if (failCount > 0) {
      status = 'FAIL';
    } else if (warningCount > metrics.length * 0.1) {
      status = 'WARNING';
    }
    
    return status;
  }
}

module.exports = QualityControlService;