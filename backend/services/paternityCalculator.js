/**
 * Paternity Probability Calculator
 * Implements forensic DNA paternity testing calculations
 * Based on AABB standards and Butler's Forensic DNA Typing principles
 */

class PaternityCalculator {
  constructor() {
    // PowerPlex ESX 17 STR loci used in paternity testing
    this.strLoci = [
      'D3S1358', 'TH01', 'D21S11', 'D18S51', 'D10S1248',
      'D1S1656', 'D2S1338', 'D16S539', 'D22S1045', 'vWA',
      'D8S1179', 'FGA', 'D2S441', 'D12S391', 'D19S433',
      'SE33'
    ];

    // Allele frequency database (simplified - in production, use population-specific databases)
    // These are example frequencies for Caucasian population
    this.alleleFrequencies = {
      'D3S1358': {
        '14': 0.134, '15': 0.254, '16': 0.229, '17': 0.181, '18': 0.166,
        '19': 0.029, '20': 0.006, 'default': 0.001
      },
      'TH01': {
        '6': 0.231, '7': 0.190, '8': 0.089, '9': 0.113, '9.3': 0.314,
        '10': 0.059, '11': 0.003, 'default': 0.001
      },
      'D21S11': {
        '28': 0.159, '29': 0.183, '30': 0.253, '30.2': 0.014, '31': 0.115,
        '31.2': 0.109, '32': 0.058, '32.2': 0.088, '33': 0.012,
        '33.2': 0.007, '34': 0.001, 'default': 0.001
      },
      'D18S51': {
        '10': 0.011, '11': 0.013, '12': 0.136, '13': 0.128, '14': 0.134,
        '15': 0.117, '16': 0.115, '17': 0.117, '18': 0.089, '19': 0.063,
        '20': 0.039, '21': 0.020, '22': 0.011, '23': 0.005, 'default': 0.001
      },
      'vWA': {
        '14': 0.085, '15': 0.104, '16': 0.186, '17': 0.258, '18': 0.225,
        '19': 0.096, '20': 0.038, '21': 0.006, 'default': 0.001
      },
      'FGA': {
        '18': 0.015, '19': 0.061, '20': 0.125, '21': 0.179, '22': 0.173,
        '23': 0.133, '24': 0.131, '25': 0.097, '26': 0.050, '27': 0.025,
        '28': 0.008, '29': 0.002, 'default': 0.001
      }
    };

    // Set default frequencies for loci not in the database
    this.strLoci.forEach(locus => {
      if (!this.alleleFrequencies[locus]) {
        this.alleleFrequencies[locus] = { 'default': 0.01 };
      }
    });

    // Mutation rates per locus (simplified - typically 0.001-0.002)
    this.mutationRates = {
      'default': 0.002,
      'FGA': 0.003,  // Higher for tetranucleotide repeats
      'SE33': 0.0065 // Highest mutation rate
    };

    // Prior probability (typically 0.5 for random man)
    this.priorProbability = 0.5;
  }

  /**
   * Calculate paternity index for a single locus
   * @param {Object} child - Child's genotype {allele1, allele2}
   * @param {Object} mother - Mother's genotype {allele1, allele2}
   * @param {Object} allegedFather - Alleged father's genotype {allele1, allele2}
   * @param {String} locus - STR locus name
   * @returns {Object} Paternity index and details
   */
  calculateLocusPI(child, mother, allegedFather, locus) {
    try {
      const childAlleles = [child.allele1, child.allele2];
      const motherAlleles = [mother.allele1, mother.allele2];
      const fatherAlleles = [allegedFather.allele1, allegedFather.allele2];

      // Determine obligate paternal allele(s)
      const paternalAlleles = this.determinePaternal(childAlleles, motherAlleles);
      
      if (paternalAlleles.length === 0) {
        // Mutation or null allele scenario
        return {
          locus,
          pi: this.mutationRates[locus] || this.mutationRates.default,
          scenario: 'mutation',
          details: 'Possible mutation detected'
        };
      }

      // Check if alleged father could contribute the paternal allele
      let numerator = 0;
      let denominator = 0;
      let scenario = '';

      for (const paternalAllele of paternalAlleles) {
        const canContribute = fatherAlleles.includes(paternalAllele);
        
        if (canContribute) {
          // Calculate probability that alleged father transmitted this allele
          if (fatherAlleles[0] === fatherAlleles[1]) {
            // Homozygous father
            numerator = 1.0;
            scenario = 'homozygous_match';
          } else {
            // Heterozygous father
            numerator = 0.5;
            scenario = 'heterozygous_match';
          }
          
          // Probability that random man would transmit this allele
          const freq = this.getAlleleFrequency(locus, paternalAllele);
          denominator = freq;
          
          break;
        }
      }

      if (numerator === 0) {
        // Exclusion scenario
        return {
          locus,
          pi: 0,
          scenario: 'exclusion',
          details: `Alleged father lacks paternal allele ${paternalAlleles.join(' or ')}`
        };
      }

      const pi = numerator / denominator;
      
      return {
        locus,
        pi: pi,
        scenario,
        details: `PI = ${numerator.toFixed(3)} / ${denominator.toFixed(3)}`,
        paternalAllele: paternalAlleles[0],
        childGenotype: childAlleles.join('/'),
        motherGenotype: motherAlleles.join('/'),
        fatherGenotype: fatherAlleles.join('/')
      };

    } catch (error) {
      console.error(`Error calculating PI for locus ${locus}:`, error);
      return {
        locus,
        pi: 1,
        scenario: 'error',
        details: error.message
      };
    }
  }

  /**
   * Determine which allele(s) must come from the father
   */
  determinePaternal(childAlleles, motherAlleles) {
    const paternalAlleles = [];
    
    for (const childAllele of childAlleles) {
      // Check if this allele could come from mother
      const fromMother = motherAlleles.includes(childAllele);
      
      if (!fromMother) {
        // Must be paternal
        if (!paternalAlleles.includes(childAllele)) {
          paternalAlleles.push(childAllele);
        }
      } else {
        // Could be from either parent
        // Need to check the other allele
        const otherChildAllele = childAlleles.find(a => a !== childAllele);
        const otherFromMother = motherAlleles.includes(otherChildAllele);
        
        if (!otherFromMother) {
          // The other allele is definitely paternal
          continue;
        } else {
          // Both alleles could be from mother, at least one must be paternal
          if (paternalAlleles.length === 0) {
            paternalAlleles.push(childAllele);
          }
        }
      }
    }

    // If child is homozygous and mother has the allele, one copy is paternal
    if (paternalAlleles.length === 0 && childAlleles[0] === childAlleles[1]) {
      paternalAlleles.push(childAlleles[0]);
    }

    return paternalAlleles;
  }

  /**
   * Get allele frequency from database
   */
  getAlleleFrequency(locus, allele) {
    const locusFreqs = this.alleleFrequencies[locus];
    if (!locusFreqs) return 0.01; // Default rare allele frequency
    
    return locusFreqs[allele] || locusFreqs['default'] || 0.01;
  }

  /**
   * Calculate Combined Paternity Index (CPI) across all loci
   * @param {Array} profiles - Array of {child, mother, allegedFather, locus} objects
   * @returns {Object} CPI and detailed results
   */
  calculateCPI(profiles) {
    const results = {
      locusResults: [],
      cpi: 1.0,
      exclusions: [],
      mutations: [],
      probabilityOfPaternity: 0,
      likelihood: '',
      conclusion: ''
    };

    // Calculate PI for each locus
    for (const profile of profiles) {
      const locusResult = this.calculateLocusPI(
        profile.child,
        profile.mother,
        profile.allegedFather,
        profile.locus
      );

      results.locusResults.push(locusResult);

      if (locusResult.scenario === 'exclusion') {
        results.exclusions.push(locusResult.locus);
      } else if (locusResult.scenario === 'mutation') {
        results.mutations.push(locusResult.locus);
      }

      // Multiply PIs to get CPI
      results.cpi *= locusResult.pi;
    }

    // Calculate probability of paternity using Bayes' theorem
    // P(paternity|DNA) = (Prior × CPI) / (Prior × CPI + (1-Prior))
    const prior = this.priorProbability;
    results.probabilityOfPaternity = (prior * results.cpi) / (prior * results.cpi + (1 - prior));
    
    // Convert to percentage
    results.probabilityPercentage = (results.probabilityOfPaternity * 100).toFixed(4);

    // Interpret results based on AABB standards
    if (results.exclusions.length >= 2) {
      results.conclusion = 'EXCLUDED';
      results.likelihood = 'The alleged father is excluded as the biological father';
    } else if (results.exclusions.length === 1) {
      results.conclusion = 'INCONCLUSIVE';
      results.likelihood = 'Results are inconclusive due to possible mutation';
    } else if (results.cpi > 10000) {
      results.conclusion = 'NOT EXCLUDED';
      results.likelihood = 'The alleged father is not excluded as the biological father (Extremely Strong Support)';
    } else if (results.cpi > 1000) {
      results.conclusion = 'NOT EXCLUDED';
      results.likelihood = 'The alleged father is not excluded as the biological father (Very Strong Support)';
    } else if (results.cpi > 100) {
      results.conclusion = 'NOT EXCLUDED';
      results.likelihood = 'The alleged father is not excluded as the biological father (Strong Support)';
    } else if (results.cpi > 10) {
      results.conclusion = 'NOT EXCLUDED';
      results.likelihood = 'The alleged father is not excluded as the biological father (Moderate Support)';
    } else if (results.cpi > 1) {
      results.conclusion = 'NOT EXCLUDED';
      results.likelihood = 'The alleged father is not excluded as the biological father (Limited Support)';
    } else {
      results.conclusion = 'INCONCLUSIVE';
      results.likelihood = 'Results are inconclusive';
    }

    // Add statistical power
    results.statisticalPower = this.calculateStatisticalPower(profiles.length);

    return results;
  }

  /**
   * Calculate statistical power of the test
   */
  calculateStatisticalPower(numLoci) {
    // Simplified calculation - in practice, use population-specific values
    const avgExclusionPower = 0.632; // Per locus average
    const combinedExclusionPower = 1 - Math.pow(1 - avgExclusionPower, numLoci);
    return {
      combinedExclusionPower: (combinedExclusionPower * 100).toFixed(2) + '%',
      averagePaternityIndex: Math.pow(10, numLoci * 0.3), // Rough estimate
      randomMatchProbability: Math.pow(0.1, numLoci).toExponential(2)
    };
  }

  /**
   * Generate a detailed paternity report
   */
  generateReport(caseInfo, profiles, results) {
    const report = {
      header: {
        caseNumber: caseInfo.caseNumber,
        testDate: new Date().toISOString(),
        laboratory: 'JAG DNA Scientific Laboratory',
        accreditation: 'ISO 17025:2017',
        testType: 'DNA Paternity Testing',
        methodology: 'STR Analysis using PowerPlex ESX 17'
      },
      participants: {
        child: caseInfo.childName,
        mother: caseInfo.motherName,
        allegedFather: caseInfo.allegedFatherName
      },
      results: {
        conclusion: results.conclusion,
        probabilityOfPaternity: results.probabilityPercentage + '%',
        combinedPaternityIndex: results.cpi.toExponential(2),
        interpretation: results.likelihood,
        exclusions: results.exclusions,
        mutations: results.mutations
      },
      locusDetails: results.locusResults.map(lr => ({
        locus: lr.locus,
        child: lr.childGenotype,
        mother: lr.motherGenotype,
        allegedFather: lr.fatherGenotype,
        paternityIndex: lr.pi.toFixed(3),
        status: lr.scenario
      })),
      statistics: results.statisticalPower,
      certification: {
        analyst: 'System Generated',
        reviewer: 'Pending Review',
        date: new Date().toISOString(),
        disclaimer: 'This report is based on the DNA profiles provided and assumes correct sample identification.'
      }
    };

    return report;
  }

  /**
   * Validate trio relationship (mother-child-father)
   */
  validateTrio(profiles) {
    const validation = {
      motherChildConsistent: true,
      fatherChildConsistent: true,
      issues: []
    };

    for (const profile of profiles) {
      // Check mother-child consistency
      const motherAlleles = [profile.mother.allele1, profile.mother.allele2];
      const childAlleles = [profile.child.allele1, profile.child.allele2];
      
      let hasMotherAllele = false;
      for (const childAllele of childAlleles) {
        if (motherAlleles.includes(childAllele)) {
          hasMotherAllele = true;
          break;
        }
      }

      if (!hasMotherAllele) {
        validation.motherChildConsistent = false;
        validation.issues.push(`Mother-child inconsistency at ${profile.locus}`);
      }
    }

    return validation;
  }
}

module.exports = PaternityCalculator;