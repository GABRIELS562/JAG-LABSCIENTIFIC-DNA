const FSAProcessor = require('./fsaProcessor');

class STRAnalyzer {
  constructor() {
    this.fsaProcessor = new FSAProcessor();
    this.strLoci = this.initializeSTRLoci();
    this.qualityThresholds = {
      minPeakHeight: 150,
      maxPeakHeight: 5000,
      minPeakHeightRatio: 0.6,
      maxStutterRatio: 0.15,
      minInterpretableData: 0.8
    };
  }

  /**
   * Initialize STR loci definitions for PowerPlex ESX 17 kit
   */
  initializeSTRLoci() {
    return {
      'D3S1358': {
        dye: 'FAM',
        range: [114, 142],
        repeat: 4,
        commonAlleles: ['12', '13', '14', '15', '16', '17', '18', '19']
      },
      'vWA': {
        dye: 'FAM', 
        range: [157, 197],
        repeat: 4,
        commonAlleles: ['14', '15', '16', '17', '18', '19', '20', '21']
      },
      'D16S539': {
        dye: 'FAM',
        range: [250, 286],
        repeat: 4,
        commonAlleles: ['8', '9', '10', '11', '12', '13', '14', '15']
      },
      'CSF1PO': {
        dye: 'FAM',
        range: [305, 341],
        repeat: 4,
        commonAlleles: ['10', '11', '12', '13', '14', '15']
      },
      'TPOX': {
        dye: 'VIC',
        range: [224, 252],
        repeat: 4,
        commonAlleles: ['6', '8', '9', '10', '11', '12', '13']
      },
      'D8S1179': {
        dye: 'VIC',
        range: [128, 172],
        repeat: 4,
        commonAlleles: ['10', '11', '12', '13', '14', '15', '16', '17']
      },
      'D21S11': {
        dye: 'VIC',
        range: [189, 243],
        repeat: 4,
        commonAlleles: ['24.2', '25', '26', '27', '28', '29', '30', '31', '32', '33']
      },
      'D18S51': {
        dye: 'VIC',
        range: [273, 341],
        repeat: 4,
        commonAlleles: ['10.2', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']
      },
      'D2S441': {
        dye: 'NED',
        range: [310, 350],
        repeat: 4,
        commonAlleles: ['8', '10', '11', '12', '13', '14', '15', '16']
      },
      'D19S433': {
        dye: 'NED',
        range: [103, 147],
        repeat: 4,
        commonAlleles: ['12', '13', '14', '15', '16', '17']
      },
      'TH01': {
        dye: 'NED',
        range: [179, 203],
        repeat: 4,
        commonAlleles: ['6', '7', '8', '9', '9.3', '10']
      },
      'FGA': {
        dye: 'NED',
        range: [219, 267],
        repeat: 4,
        commonAlleles: ['18', '19', '20', '21', '22', '23', '24', '25', '26', '27']
      },
      'Amelogenin': {
        dye: 'PET',
        range: [106, 112],
        repeat: null,
        commonAlleles: ['X', 'Y']
      },
      'D5S818': {
        dye: 'PET',
        range: [135, 171],
        repeat: 4,
        commonAlleles: ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16']
      },
      'D13S317': {
        dye: 'PET',
        range: [214, 242],
        repeat: 4,
        commonAlleles: ['8', '9', '10', '11', '12', '13', '14', '15']
      },
      'D7S820': {
        dye: 'PET',
        range: [258, 294],
        repeat: 4,
        commonAlleles: ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15']
      },
      'SE33': {
        dye: 'PET',
        range: [330, 430],
        repeat: 4,
        commonAlleles: ['12.2', '14.2', '15.2', '16.2', '17.2', '18.2', '19.2', '20.2']
      }
    };
  }

  /**
   * Analyze FSA file and extract STR profiles
   */
  async analyzeSTRProfile(filePath) {
    try {
      // Process FSA file
      const fsaResult = await this.fsaProcessor.processFSAFile(filePath);
      
      if (!fsaResult.success) {
        throw new Error(`FSA processing failed: ${fsaResult.error}`);
      }

      // Extract STR profile for each dye channel
      const strProfile = {};
      const qualityMetrics = {};

      for (const [dye, traceData] of Object.entries(fsaResult.electropherogramData)) {
        // Detect peaks in this channel
        const peaks = this.fsaProcessor.detectPeaks(traceData, this.qualityThresholds.minPeakHeight);
        
        // Identify STR loci in this dye channel
        const lociInChannel = this.getLociByDye(dye);
        const channelProfile = {};

        for (const locus of lociInChannel) {
          const locusData = this.strLoci[locus];
          const locusPeaks = this.filterPeaksBySize(peaks, locusData.range);
          const alleles = this.callAlleles(locusPeaks, locus);
          
          channelProfile[locus] = {
            alleles: alleles,
            peaks: locusPeaks,
            quality: this.assessLocusQuality(alleles, locusPeaks)
          };
        }

        strProfile[dye] = channelProfile;
        qualityMetrics[dye] = this.calculateChannelQuality(peaks, traceData);
      }

      // Compile final STR profile
      const compiledProfile = this.compileSTRProfile(strProfile);
      const overallQuality = this.assessOverallQuality(qualityMetrics, compiledProfile);

      return {
        success: true,
        sampleId: fsaResult.metadata.sampleName,
        strProfile: compiledProfile,
        qualityMetrics: qualityMetrics,
        overallQuality: overallQuality,
        rawData: fsaResult,
        analysisTimestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Get STR loci by dye channel
   */
  getLociByDye(dye) {
    return Object.keys(this.strLoci).filter(locus => 
      this.strLoci[locus].dye === dye
    );
  }

  /**
   * Filter peaks by expected size range for locus
   */
  filterPeaksBySize(peaks, sizeRange) {
    return peaks.filter(peak => {
      // Convert peak position to size (simplified)
      const estimatedSize = this.positionToSize(peak.position);
      return estimatedSize >= sizeRange[0] && estimatedSize <= sizeRange[1];
    });
  }

  /**
   * Convert peak position to fragment size (simplified)
   */
  positionToSize(position) {
    // Simplified linear conversion - in practice would use size standard calibration
    return Math.round(100 + (position * 0.1));
  }

  /**
   * Call STR alleles from peaks
   */
  callAlleles(peaks, locus) {
    const locusData = this.strLoci[locus];
    const alleles = [];

    // Sort peaks by height (descending)
    const sortedPeaks = peaks.sort((a, b) => b.height - a.height);

    for (const peak of sortedPeaks) {
      if (peak.height < this.qualityThresholds.minPeakHeight) continue;
      if (peak.height > this.qualityThresholds.maxPeakHeight) continue;

      const size = this.positionToSize(peak.position);
      const allele = this.sizeToAlleleDesignation(size, locus);

      if (allele && this.isValidAllele(allele, locus)) {
        // Check for stutter peak
        const isStutter = this.isStutterPeak(peak, sortedPeaks, locusData.repeat);
        
        if (!isStutter || alleles.length < 2) {
          alleles.push({
            allele: allele,
            size: size,
            height: peak.height,
            area: peak.area,
            quality: peak.quality,
            isStutter: isStutter
          });
        }
      }

      // Maximum 2 alleles per locus for diploid organisms
      if (alleles.filter(a => !a.isStutter).length >= 2) break;
    }

    return alleles;
  }

  /**
   * Convert fragment size to allele designation
   */
  sizeToAlleleDesignation(size, locus) {
    const locusData = this.strLoci[locus];
    
    if (locus === 'Amelogenin') {
      return size < 110 ? 'X' : 'Y';
    }

    // Calculate repeat units from size
    const repeatUnits = (size - locusData.range[0]) / locusData.repeat;
    const roundedRepeats = Math.round(repeatUnits);
    
    // Handle partial repeats (e.g., 9.3, 12.2)
    const decimal = Math.round((repeatUnits - roundedRepeats) * 10) / 10;
    
    if (Math.abs(decimal) < 0.1) {
      return roundedRepeats.toString();
    } else {
      return `${roundedRepeats}${decimal > 0 ? '.' + Math.round(decimal * 10) : ''}`;
    }
  }

  /**
   * Check if allele is valid for the locus
   */
  isValidAllele(allele, locus) {
    const locusData = this.strLoci[locus];
    return locusData.commonAlleles.includes(allele) || 
           this.isRareButValidAllele(allele, locus);
  }

  /**
   * Check if this is a rare but potentially valid allele
   */
  isRareButValidAllele(allele, locus) {
    // Accept alleles within reasonable range even if not common
    const numericAllele = parseFloat(allele);
    return numericAllele >= 6 && numericAllele <= 35;
  }

  /**
   * Check if peak is likely a stutter artifact
   */
  isStutterPeak(peak, allPeaks, repeatUnit) {
    for (const otherPeak of allPeaks) {
      if (otherPeak === peak) continue;
      
      const sizeDiff = Math.abs(this.positionToSize(peak.position) - this.positionToSize(otherPeak.position));
      const heightRatio = peak.height / otherPeak.height;
      
      // Check for n-4 stutter
      if (Math.abs(sizeDiff - repeatUnit) < 1 && heightRatio < this.qualityThresholds.maxStutterRatio) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Assess quality of locus typing
   */
  assessLocusQuality(alleles, peaks) {
    if (alleles.length === 0) return 'No Call';
    if (alleles.length === 1) return 'Partial Profile';
    
    const mainAlleles = alleles.filter(a => !a.isStutter);
    if (mainAlleles.length === 2) {
      const heightRatio = Math.min(...mainAlleles.map(a => a.height)) / Math.max(...mainAlleles.map(a => a.height));
      return heightRatio >= this.qualityThresholds.minPeakHeightRatio ? 'Complete' : 'Imbalanced';
    }
    
    return 'Complex';
  }

  /**
   * Calculate channel quality metrics
   */
  calculateChannelQuality(peaks, traceData) {
    const validPeaks = peaks.filter(p => p.height >= this.qualityThresholds.minPeakHeight);
    const maxSignal = Math.max(...traceData);
    const avgBaseline = traceData.slice(0, 100).reduce((a, b) => a + b, 0) / 100;
    const signalToNoise = maxSignal / avgBaseline;

    return {
      peakCount: validPeaks.length,
      maxSignal: maxSignal,
      signalToNoise: signalToNoise,
      baselineNoise: avgBaseline,
      quality: signalToNoise > 10 ? 'Good' : signalToNoise > 5 ? 'Acceptable' : 'Poor'
    };
  }

  /**
   * Compile final STR profile from all channels
   */
  compileSTRProfile(channelProfiles) {
    const finalProfile = {};

    for (const [dye, dyeProfile] of Object.entries(channelProfiles)) {
      for (const [locus, locusData] of Object.entries(dyeProfile)) {
        finalProfile[locus] = {
          alleles: locusData.alleles.filter(a => !a.isStutter).map(a => a.allele),
          peaks: locusData.alleles,
          quality: locusData.quality
        };
      }
    }

    return finalProfile;
  }

  /**
   * Assess overall profile quality
   */
  assessOverallQuality(channelMetrics, strProfile) {
    const lociCount = Object.keys(strProfile).length;
    const completeLoci = Object.values(strProfile).filter(l => l.quality === 'Complete').length;
    const partialLoci = Object.values(strProfile).filter(l => l.quality === 'Partial Profile').length;
    
    const completeness = (completeLoci + partialLoci * 0.5) / lociCount;
    
    let overallQuality = 'Poor';
    if (completeness >= 0.9) overallQuality = 'Excellent';
    else if (completeness >= 0.8) overallQuality = 'Good';
    else if (completeness >= 0.6) overallQuality = 'Acceptable';

    return {
      completeness: completeness,
      completeLoci: completeLoci,
      partialLoci: partialLoci,
      totalLoci: lociCount,
      quality: overallQuality,
      interpretation: this.getQualityInterpretation(completeness)
    };
  }

  /**
   * Get quality interpretation
   */
  getQualityInterpretation(completeness) {
    if (completeness >= 0.9) {
      return 'Profile suitable for database comparison and statistical interpretation';
    } else if (completeness >= 0.8) {
      return 'Profile suitable for comparison with some limitations';
    } else if (completeness >= 0.6) {
      return 'Partial profile - limited statistical interpretation possible';
    } else {
      return 'Insufficient data for reliable interpretation';
    }
  }

  /**
   * Compare two STR profiles for paternity analysis
   */
  compareProfiles(childProfile, fatherProfile, motherProfile = null) {
    const comparison = {
      lociComparisons: {},
      matchingLoci: 0,
      totalLoci: 0,
      exclusions: [],
      inclusions: [],
      summary: {}
    };

    const allLoci = new Set([
      ...Object.keys(childProfile),
      ...Object.keys(fatherProfile),
      ...(motherProfile ? Object.keys(motherProfile) : [])
    ]);

    for (const locus of allLoci) {
      if (locus === 'Amelogenin') continue; // Skip sex marker for paternity

      const childAlleles = childProfile[locus]?.alleles || [];
      const fatherAlleles = fatherProfile[locus]?.alleles || [];
      const motherAlleles = motherProfile?.[locus]?.alleles || [];

      const locusComparison = this.compareLocusForPaternity(
        childAlleles, 
        fatherAlleles, 
        motherAlleles, 
        locus
      );

      comparison.lociComparisons[locus] = locusComparison;
      comparison.totalLoci++;

      if (locusComparison.match) {
        comparison.matchingLoci++;
        comparison.inclusions.push(locus);
      } else if (locusComparison.exclusion) {
        comparison.exclusions.push(locus);
      }
    }

    comparison.summary = this.calculatePaternityStatistics(comparison);
    return comparison;
  }

  /**
   * Compare single locus for paternity
   */
  compareLocusForPaternity(childAlleles, fatherAlleles, motherAlleles, locus) {
    const result = {
      locus: locus,
      childAlleles: childAlleles,
      fatherAlleles: fatherAlleles,
      motherAlleles: motherAlleles,
      match: false,
      exclusion: false,
      obligatePaternal: null,
      interpretation: ''
    };

    if (childAlleles.length === 0 || fatherAlleles.length === 0) {
      result.interpretation = 'Insufficient data';
      return result;
    }

    // Determine obligate paternal allele
    let obligateAlleles = [...childAlleles];
    if (motherAlleles.length > 0) {
      obligateAlleles = childAlleles.filter(allele => !motherAlleles.includes(allele));
    }

    // Check if father has any obligate paternal alleles
    const paternalMatch = obligateAlleles.some(allele => fatherAlleles.includes(allele));

    if (paternalMatch || obligateAlleles.length === 0) {
      result.match = true;
      result.interpretation = 'Consistent with paternity';
    } else {
      result.exclusion = true;
      result.interpretation = 'Exclusion - no shared alleles';
    }

    result.obligatePaternal = obligateAlleles;
    return result;
  }

  /**
   * Calculate paternity statistics
   */
  calculatePaternityStatistics(comparison) {
    const exclusions = comparison.exclusions.length;
    const matchingLoci = comparison.matchingLoci;
    const totalInformativeLoci = comparison.totalLoci;

    if (exclusions >= 2) {
      return {
        conclusion: 'exclusion',
        paternityProbability: 0,
        exclusionProbability: 99.99,
        interpretation: 'Alleged father is excluded as the biological father'
      };
    }

    if (exclusions === 1) {
      return {
        conclusion: 'inconclusive',
        paternityProbability: null,
        exclusionProbability: null,
        interpretation: 'Results are inconclusive - single exclusion may indicate mutation'
      };
    }

    // Calculate combined paternity index (simplified)
    const cpi = Math.pow(2, matchingLoci); // Simplified calculation
    const paternityProbability = (cpi / (cpi + 1)) * 100;

    return {
      conclusion: paternityProbability > 99 ? 'inclusion' : 'inconclusive',
      paternityProbability: paternityProbability,
      exclusionProbability: 100 - paternityProbability,
      combinedPaternityIndex: cpi,
      interpretation: this.getPaternityInterpretation(paternityProbability)
    };
  }

  /**
   * Get paternity interpretation
   */
  getPaternityInterpretation(probability) {
    if (probability > 99.99) {
      return 'Extremely strong support for paternity';
    } else if (probability > 99.9) {
      return 'Very strong support for paternity';
    } else if (probability > 99) {
      return 'Strong support for paternity';
    } else if (probability > 95) {
      return 'Moderate support for paternity';
    } else {
      return 'Inconclusive - insufficient support for paternity';
    }
  }
}

module.exports = STRAnalyzer;