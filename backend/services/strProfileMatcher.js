/**
 * STR Profile Matcher & Comparison Service
 * Implements advanced DNA profile matching, kinship analysis, and mixture deconvolution
 * Based on forensic genetics principles and ISFG recommendations
 */

const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../utils/logger');

class STRProfileMatcher {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/ashley_lims.db');
    this.db = new Database(this.dbPath, { fileMustExist: false });
    
    // Initialize database tables if they don't exist
    this.initializeTables();
    
    // STR loci configuration
    this.coreCODISLoci = [
      'D3S1358', 'vWA', 'FGA', 'D8S1179', 'D21S11', 'D18S51',
      'D5S818', 'D13S317', 'D7S820', 'D16S539', 'TH01',
      'TPOX', 'CSF1PO'
    ];
    
    this.expandedLoci = [
      'D10S1248', 'D1S1656', 'D2S1338', 'D22S1045', 'D2S441',
      'D12S391', 'D19S433', 'SE33'
    ];
    
    // Kinship coefficients (IBS - Identity By State)
    this.kinshipCoefficients = {
      'parent-child': { k0: 0, k1: 1, k2: 0 },
      'full-sibling': { k0: 0.25, k1: 0.5, k2: 0.25 },
      'half-sibling': { k0: 0.5, k1: 0.5, k2: 0 },
      'grandparent': { k0: 0.5, k1: 0.5, k2: 0 },
      'avuncular': { k0: 0.5, k1: 0.5, k2: 0 }, // aunt/uncle
      'first-cousin': { k0: 0.75, k1: 0.25, k2: 0 },
      'unrelated': { k0: 1, k1: 0, k2: 0 }
    };
    
    // Match stringency levels
    this.matchCriteria = {
      'exact': { tolerance: 0, requiredLoci: 13 },
      'stringent': { tolerance: 0.5, requiredLoci: 13 },
      'moderate': { tolerance: 1.0, requiredLoci: 10 },
      'search': { tolerance: 2.0, requiredLoci: 8 }
    };
    
    // Mixture interpretation thresholds
    this.mixtureThresholds = {
      minorContributorThreshold: 0.05, // 5% minimum for minor contributor
      stutterThreshold: 0.15, // 15% of main peak
      imbalanceThreshold: 0.60, // 60% heterozygote balance
      dropoutThreshold: 50, // RFU threshold for allelic dropout
      dropinRate: 0.001 // Probability of drop-in
    };
  }

  initializeTables() {
    // Profile comparison results table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profile_comparisons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile1_id INTEGER,
        profile2_id INTEGER,
        comparison_type TEXT,
        match_score REAL,
        matching_loci INTEGER,
        total_loci INTEGER,
        likelihood_ratio REAL,
        relationship_probability TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Mixture analysis table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mixture_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id INTEGER,
        num_contributors INTEGER,
        major_profile TEXT,
        minor_profiles TEXT,
        mixture_ratio TEXT,
        interpretation TEXT,
        analyst_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Profile database for searching
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profile_database (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT UNIQUE,
        source_type TEXT,
        profile_data TEXT,
        metadata TEXT,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_searched DATETIME
      )
    `);
  }

  /**
   * Compare two STR profiles
   * @param {Object} profile1 - First profile {locus: {allele1, allele2}}
   * @param {Object} profile2 - Second profile {locus: {allele1, allele2}}
   * @param {String} stringency - Match criteria level
   * @returns {Object} Comparison results
   */
  compareProfiles(profile1, profile2, stringency = 'moderate') {
    const criteria = this.matchCriteria[stringency];
    const results = {
      totalLoci: 0,
      matchingLoci: 0,
      partialMatches: 0,
      mismatches: 0,
      locusDetails: [],
      matchScore: 0,
      matchType: '',
      randomMatchProbability: 1
    };
    
    // Get all unique loci from both profiles
    const allLoci = new Set([...Object.keys(profile1), ...Object.keys(profile2)]);
    
    for (const locus of allLoci) {
      const p1 = profile1[locus];
      const p2 = profile2[locus];
      
      if (!p1 || !p2) {
        results.locusDetails.push({
          locus,
          status: 'missing_data',
          profile1: p1 || null,
          profile2: p2 || null
        });
        continue;
      }
      
      results.totalLoci++;
      
      // Compare alleles at this locus
      const comparison = this.compareLocus(p1, p2, criteria.tolerance);
      results.locusDetails.push({
        locus,
        ...comparison
      });
      
      if (comparison.status === 'match') {
        results.matchingLoci++;
        results.randomMatchProbability *= comparison.matchProbability;
      } else if (comparison.status === 'partial') {
        results.partialMatches++;
        results.randomMatchProbability *= comparison.matchProbability;
      } else {
        results.mismatches++;
      }
    }
    
    // Calculate match score
    if (results.totalLoci > 0) {
      results.matchScore = (results.matchingLoci + results.partialMatches * 0.5) / results.totalLoci;
    }
    
    // Determine match type
    if (results.matchingLoci === results.totalLoci) {
      results.matchType = 'exact_match';
    } else if (results.matchingLoci >= criteria.requiredLoci) {
      results.matchType = 'probable_match';
    } else if (results.matchingLoci + results.partialMatches >= criteria.requiredLoci) {
      results.matchType = 'possible_match';
    } else {
      results.matchType = 'no_match';
    }
    
    // Calculate likelihood ratio for match
    results.likelihoodRatio = 1 / results.randomMatchProbability;
    
    return results;
  }

  /**
   * Compare alleles at a single locus
   */
  compareLocus(profile1Locus, profile2Locus, tolerance) {
    const p1Alleles = [profile1Locus.allele1, profile1Locus.allele2].sort();
    const p2Alleles = [profile2Locus.allele1, profile2Locus.allele2].sort();
    
    // Check for exact match
    if (p1Alleles[0] === p2Alleles[0] && p1Alleles[1] === p2Alleles[1]) {
      return {
        status: 'match',
        profile1: p1Alleles.join('/'),
        profile2: p2Alleles.join('/'),
        sharedAlleles: 2,
        matchProbability: this.calculateMatchProbability(p1Alleles)
      };
    }
    
    // Check for partial matches (shared alleles)
    const sharedAlleles = this.countSharedAlleles(p1Alleles, p2Alleles);
    
    if (sharedAlleles > 0) {
      // Check if within tolerance (for continuous alleles)
      const withinTolerance = this.checkTolerance(p1Alleles, p2Alleles, tolerance);
      
      if (withinTolerance || sharedAlleles === 1) {
        return {
          status: 'partial',
          profile1: p1Alleles.join('/'),
          profile2: p2Alleles.join('/'),
          sharedAlleles,
          matchProbability: this.calculatePartialMatchProbability(p1Alleles, p2Alleles)
        };
      }
    }
    
    return {
      status: 'mismatch',
      profile1: p1Alleles.join('/'),
      profile2: p2Alleles.join('/'),
      sharedAlleles: 0,
      matchProbability: 1
    };
  }

  /**
   * Count shared alleles between two profiles at a locus
   */
  countSharedAlleles(alleles1, alleles2) {
    let shared = 0;
    const alleles2Copy = [...alleles2];
    
    for (const allele of alleles1) {
      const index = alleles2Copy.indexOf(allele);
      if (index !== -1) {
        shared++;
        alleles2Copy.splice(index, 1);
      }
    }
    
    return shared;
  }

  /**
   * Check if alleles are within tolerance
   */
  checkTolerance(alleles1, alleles2, tolerance) {
    if (tolerance === 0) return false;
    
    for (const a1 of alleles1) {
      for (const a2 of alleles2) {
        const diff = Math.abs(parseFloat(a1) - parseFloat(a2));
        if (!isNaN(diff) && diff <= tolerance) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Calculate match probability for a genotype
   */
  calculateMatchProbability(alleles) {
    // Simplified - should use population-specific frequencies
    const freq = 0.1; // Default frequency
    
    if (alleles[0] === alleles[1]) {
      // Homozygous: p^2
      return freq * freq;
    } else {
      // Heterozygous: 2pq
      return 2 * freq * freq;
    }
  }

  /**
   * Calculate partial match probability
   */
  calculatePartialMatchProbability(alleles1, alleles2) {
    // Simplified calculation
    const sharedCount = this.countSharedAlleles(alleles1, alleles2);
    return 0.1 * sharedCount; // Base frequency times shared alleles
  }

  /**
   * Perform kinship analysis between two profiles
   * @param {Object} profile1 - First profile
   * @param {Object} profile2 - Second profile
   * @param {String} relationship - Hypothesized relationship
   * @returns {Object} Kinship analysis results
   */
  analyzeKinship(profile1, profile2, relationship = 'full-sibling') {
    const coefficients = this.kinshipCoefficients[relationship] || this.kinshipCoefficients['unrelated'];
    const results = {
      relationship,
      coefficients,
      locusResults: [],
      combinedLR: 1,
      ibsStatistics: { ibs0: 0, ibs1: 0, ibs2: 0 },
      conclusion: ''
    };
    
    // Analyze each locus
    const loci = [...new Set([...Object.keys(profile1), ...Object.keys(profile2)])];
    
    for (const locus of loci) {
      const p1 = profile1[locus];
      const p2 = profile2[locus];
      
      if (!p1 || !p2) continue;
      
      const locusResult = this.calculateKinshipLR(p1, p2, coefficients);
      results.locusResults.push({
        locus,
        ...locusResult
      });
      
      results.combinedLR *= locusResult.lr;
      
      // Track IBS statistics
      if (locusResult.ibs === 0) results.ibsStatistics.ibs0++;
      else if (locusResult.ibs === 1) results.ibsStatistics.ibs1++;
      else if (locusResult.ibs === 2) results.ibsStatistics.ibs2++;
    }
    
    // Interpret results
    results.interpretation = this.interpretKinshipResults(results, relationship);
    
    return results;
  }

  /**
   * Calculate likelihood ratio for kinship at a single locus
   */
  calculateKinshipLR(profile1Locus, profile2Locus, coefficients) {
    const p1 = [profile1Locus.allele1, profile1Locus.allele2];
    const p2 = [profile2Locus.allele1, profile2Locus.allele2];
    
    // Count IBS (Identity By State)
    const sharedAlleles = this.countSharedAlleles(p1, p2);
    
    // Calculate probabilities for each hypothesis
    let probRelated = 0;
    let probUnrelated = 0;
    
    // Simplified calculation - should use full IBS/IBD probabilities
    if (sharedAlleles === 2) {
      // IBS = 2
      probRelated = coefficients.k2 + coefficients.k1 * 0.5 + coefficients.k0 * 0.01;
      probUnrelated = 0.01; // Rare for unrelated
    } else if (sharedAlleles === 1) {
      // IBS = 1
      probRelated = coefficients.k1 * 0.5 + coefficients.k0 * 0.1;
      probUnrelated = 0.1;
    } else {
      // IBS = 0
      probRelated = coefficients.k0 * 0.25;
      probUnrelated = 0.25;
    }
    
    const lr = probRelated / probUnrelated;
    
    return {
      ibs: sharedAlleles,
      profile1: p1.join('/'),
      profile2: p2.join('/'),
      lr: lr,
      probRelated,
      probUnrelated
    };
  }

  /**
   * Interpret kinship analysis results
   */
  interpretKinshipResults(results, relationship) {
    const lr = results.combinedLR;
    
    if (lr > 10000) {
      return `Very strong support for ${relationship} relationship`;
    } else if (lr > 1000) {
      return `Strong support for ${relationship} relationship`;
    } else if (lr > 100) {
      return `Moderate support for ${relationship} relationship`;
    } else if (lr > 10) {
      return `Limited support for ${relationship} relationship`;
    } else if (lr > 1) {
      return `Weak support for ${relationship} relationship`;
    } else {
      return `No support for ${relationship} relationship`;
    }
  }

  /**
   * Analyze a DNA mixture
   * @param {Object} mixtureProfile - Profile with possible multiple contributors
   * @param {Array} referenceProfiles - Known reference profiles
   * @returns {Object} Mixture interpretation results
   */
  analyzeMixture(mixtureProfile, referenceProfiles = []) {
    const results = {
      estimatedContributors: 0,
      majorContributor: null,
      minorContributors: [],
      mixtureRatio: null,
      deconvolutedProfiles: [],
      inclusionProbabilities: {},
      interpretation: ''
    };
    
    // Estimate number of contributors
    results.estimatedContributors = this.estimateContributors(mixtureProfile);
    
    // Attempt to deconvolute the mixture
    if (results.estimatedContributors === 2) {
      const deconvolution = this.deconvoluteTwoPersonMixture(mixtureProfile);
      results.majorContributor = deconvolution.major;
      results.minorContributors = [deconvolution.minor];
      results.mixtureRatio = deconvolution.ratio;
      results.deconvolutedProfiles = [deconvolution.major, deconvolution.minor];
    } else if (results.estimatedContributors > 2) {
      results.interpretation = 'Complex mixture with more than 2 contributors';
    }
    
    // Compare against reference profiles if provided
    if (referenceProfiles.length > 0 && results.deconvolutedProfiles.length > 0) {
      for (const reference of referenceProfiles) {
        const inclusionLR = this.calculateInclusionLR(mixtureProfile, reference);
        results.inclusionProbabilities[reference.id] = {
          lr: inclusionLR,
          included: inclusionLR > 1000
        };
      }
    }
    
    // Generate interpretation
    results.interpretation = this.interpretMixture(results);
    
    return results;
  }

  /**
   * Estimate number of contributors in a mixture
   */
  estimateContributors(mixtureProfile) {
    let maxAlleles = 0;
    
    for (const locus in mixtureProfile) {
      const alleles = mixtureProfile[locus].alleles || [];
      maxAlleles = Math.max(maxAlleles, alleles.length);
    }
    
    // Estimate based on maximum allele count
    return Math.ceil(maxAlleles / 2);
  }

  /**
   * Deconvolute a two-person mixture
   */
  deconvoluteTwoPersonMixture(mixtureProfile) {
    const major = {};
    const minor = {};
    let totalMajorPeaks = 0;
    let totalMinorPeaks = 0;
    
    for (const locus in mixtureProfile) {
      const locusData = mixtureProfile[locus];
      const alleles = locusData.alleles || [];
      const peaks = locusData.peaks || [];
      
      if (alleles.length <= 2) {
        // Simple case - likely single contributor at this locus
        major[locus] = { allele1: alleles[0], allele2: alleles[1] || alleles[0] };
      } else {
        // Multiple alleles - determine major and minor
        const sortedPeaks = peaks
          .map((peak, i) => ({ allele: alleles[i], height: peak }))
          .sort((a, b) => b.height - a.height);
        
        // Assign top 2 peaks to major
        major[locus] = {
          allele1: sortedPeaks[0]?.allele,
          allele2: sortedPeaks[1]?.allele || sortedPeaks[0]?.allele
        };
        totalMajorPeaks += (sortedPeaks[0]?.height || 0) + (sortedPeaks[1]?.height || 0);
        
        // Remaining peaks to minor
        if (sortedPeaks.length > 2) {
          minor[locus] = {
            allele1: sortedPeaks[2]?.allele,
            allele2: sortedPeaks[3]?.allele || sortedPeaks[2]?.allele
          };
          totalMinorPeaks += (sortedPeaks[2]?.height || 0) + (sortedPeaks[3]?.height || 0);
        }
      }
    }
    
    // Calculate mixture ratio
    const ratio = totalMajorPeaks / (totalMajorPeaks + totalMinorPeaks);
    
    return {
      major,
      minor,
      ratio: `${(ratio * 100).toFixed(0)}:${((1 - ratio) * 100).toFixed(0)}`
    };
  }

  /**
   * Calculate likelihood ratio for inclusion in a mixture
   */
  calculateInclusionLR(mixture, reference) {
    let lr = 1;
    
    for (const locus in reference) {
      const refAlleles = [reference[locus].allele1, reference[locus].allele2];
      const mixAlleles = mixture[locus]?.alleles || [];
      
      // Check if reference alleles are present in mixture
      let matches = 0;
      for (const refAllele of refAlleles) {
        if (mixAlleles.includes(refAllele)) {
          matches++;
        }
      }
      
      if (matches === 0) {
        // Exclusion at this locus
        lr *= 0.001; // Small probability for dropout
      } else if (matches === 1) {
        lr *= 10; // Partial inclusion
      } else {
        lr *= 100; // Full inclusion
      }
    }
    
    return lr;
  }

  /**
   * Interpret mixture analysis results
   */
  interpretMixture(results) {
    let interpretation = [];
    
    interpretation.push(`Estimated ${results.estimatedContributors} contributor(s)`);
    
    if (results.mixtureRatio) {
      interpretation.push(`Mixture ratio approximately ${results.mixtureRatio}`);
    }
    
    const included = Object.values(results.inclusionProbabilities)
      .filter(p => p.included).length;
    
    if (included > 0) {
      interpretation.push(`${included} reference profile(s) cannot be excluded as contributors`);
    }
    
    return interpretation.join('. ');
  }

  /**
   * Search for profile matches in database
   * @param {Object} queryProfile - Profile to search
   * @param {String} stringency - Search stringency
   * @returns {Array} Matching profiles
   */
  async searchDatabase(queryProfile, stringency = 'moderate') {
    const matches = [];
    
    // Get all profiles from database
    const dbProfiles = this.db.prepare(`
      SELECT id, profile_id, profile_data, metadata 
      FROM profile_database
    `).all();
    
    for (const dbProfile of dbProfiles) {
      const profile = JSON.parse(dbProfile.profile_data);
      const comparison = this.compareProfiles(queryProfile, profile, stringency);
      
      if (comparison.matchType !== 'no_match') {
        matches.push({
          profileId: dbProfile.profile_id,
          matchScore: comparison.matchScore,
          matchType: comparison.matchType,
          matchingLoci: comparison.matchingLoci,
          totalLoci: comparison.totalLoci,
          likelihoodRatio: comparison.likelihoodRatio,
          metadata: JSON.parse(dbProfile.metadata || '{}')
        });
      }
    }
    
    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Update last searched timestamp
    this.db.prepare(`
      UPDATE profile_database 
      SET last_searched = CURRENT_TIMESTAMP 
      WHERE profile_id IN (${matches.map(() => '?').join(',')})
    `).run(...matches.map(m => m.profileId));
    
    return matches;
  }

  /**
   * Add profile to searchable database
   */
  addToDatabase(profileId, profile, metadata = {}) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO profile_database 
        (profile_id, source_type, profile_data, metadata)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(
        profileId,
        metadata.sourceType || 'unknown',
        JSON.stringify(profile),
        JSON.stringify(metadata)
      );
      
      return { success: true, profileId };
    } catch (error) {
      logger.error('Failed to add profile to database', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate match statistics report
   */
  generateMatchReport(comparison, profile1Info, profile2Info) {
    const report = {
      header: {
        reportType: 'STR Profile Comparison',
        date: new Date().toISOString(),
        laboratory: 'JAG DNA Scientific Laboratory'
      },
      profiles: {
        profile1: profile1Info,
        profile2: profile2Info
      },
      summary: {
        matchType: comparison.matchType,
        matchScore: (comparison.matchScore * 100).toFixed(1) + '%',
        matchingLoci: `${comparison.matchingLoci}/${comparison.totalLoci}`,
        randomMatchProbability: comparison.randomMatchProbability.toExponential(2),
        likelihoodRatio: comparison.likelihoodRatio.toExponential(2)
      },
      locusDetails: comparison.locusDetails,
      interpretation: this.interpretMatch(comparison),
      disclaimer: 'This comparison is based on the STR profiles provided and standard forensic matching criteria.'
    };
    
    return report;
  }

  /**
   * Interpret match results
   */
  interpretMatch(comparison) {
    if (comparison.matchType === 'exact_match') {
      return 'The profiles match at all compared loci. This is consistent with the profiles originating from the same individual or identical twins.';
    } else if (comparison.matchType === 'probable_match') {
      return 'The profiles show a high degree of concordance. This strongly suggests they originate from the same individual.';
    } else if (comparison.matchType === 'possible_match') {
      return 'The profiles show partial concordance. Further analysis or additional loci may be needed for conclusive matching.';
    } else {
      return 'The profiles do not match. They appear to originate from different individuals.';
    }
  }
}

module.exports = STRProfileMatcher;