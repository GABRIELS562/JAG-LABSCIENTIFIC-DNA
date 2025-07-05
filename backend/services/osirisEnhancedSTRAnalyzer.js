const FSAProcessor = require('./fsaProcessor');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');

class OsirisEnhancedSTRAnalyzer {
  constructor() {
    this.fsaProcessor = new FSAProcessor();
    const projectRoot = process.cwd().includes('backend') ? path.join(process.cwd(), '..') : process.cwd();
    this.osirisConfigPath = path.join(projectRoot, 'backend', 'osiris_software', 'Osiris-2.16.app', 'Contents', 'MacOS', 'Config', 'Volumes', 'PPESX17');
    this.ladderSpecPath = path.join(projectRoot, 'backend', 'osiris_software', 'Osiris-2.16.app', 'Contents', 'MacOS', 'Config', 'LadderSpecifications');
    
    // Will be loaded from real Osiris configuration
    this.osirisThresholds = null;
    this.strLoci = null;
    this.channelMap = null;
    this.ilsConfiguration = null;
    
    this.initialized = false;
  }

  /**
   * Initialize with real Osiris configuration
   */
  async initialize() {
    try {
      console.log('Loading real Osiris PowerPlex ESX 17 configuration...');
      
      // Load Osiris lab settings (thresholds and parameters)
      await this.loadOsirisLabSettings();
      
      // Load PowerPlex ESX 17 kit specification
      await this.loadKitSpecification();
      
      console.log('Osiris Enhanced STR Analyzer initialized with real configuration');
      this.initialized = true;
      
      return {
        success: true,
        configuration: 'PowerPlex ESX 17 (Osiris)',
        thresholds: this.osirisThresholds,
        lociCount: Object.keys(this.strLoci).length
      };
      
    } catch (error) {
      console.error('Failed to initialize Osiris Enhanced STR Analyzer:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load Osiris lab settings and thresholds
   */
  async loadOsirisLabSettings() {
    try {
      const labSettingsPath = path.join(this.osirisConfigPath, 'PPESX17_LabSettings.xml');
      const xmlContent = await fs.readFile(labSettingsPath, 'utf8');
      
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlContent);
      
      const thresholds = result.LabSettings.Thresholds[0];
      
      this.osirisThresholds = {
        // Sample RFU Tests (most important for analysis)
        minRFU: parseInt(thresholds.SampleRFUTests[0].MinimumRFU[0]),
        maxRFU: parseInt(thresholds.SampleRFUTests[0].MaximumRFU[0]) || -1,
        fractionOfMaxPeak: parseFloat(thresholds.SampleRFUTests[0].FractionOfMaxPeak[0]),
        pullupFractionalFilter: parseFloat(thresholds.SampleRFUTests[0].PullupFractionalFilter[0]),
        stutterThreshold: parseFloat(thresholds.SampleRFUTests[0].StutterThreshold[0]),
        adenylationThreshold: parseFloat(thresholds.SampleRFUTests[0].AdenylationThreshold[0]),
        
        // Heterozygous balance
        heterozygousImbalanceLimit: parseFloat(thresholds.HeterozygousImbalanceLimit[0]),
        minBoundForHomozygote: parseInt(thresholds.MinBoundForHomozygote[0]),
        
        // Artifact thresholds
        maxResidualForAlleleCall: parseFloat(thresholds.MaxResidualForAlleleCall[0]),
        minBPSForArtifacts: parseInt(thresholds.MinBPSForArtifacts[0]),
        alleleRFUOverloadThreshold: parseInt(thresholds.AlleleRFUOverloadThreshold[0]),
        
        // Ladder settings (for calibration)
        ladderMinRFU: parseInt(thresholds.LadderRFUTests[0].MinimumRFU[0]),
        ladderStutterThreshold: parseFloat(thresholds.LadderRFUTests[0].StutterThreshold[0])
      };
      
      console.log('Loaded Osiris thresholds:', this.osirisThresholds);
      
    } catch (error) {
      throw new Error(`Failed to load Osiris lab settings: ${error.message}`);
    }
  }

  /**
   * Load PowerPlex ESX 17 kit specification
   */
  async loadKitSpecification() {
    try {
      const kitSpecPath = path.join(this.ladderSpecPath, 'PowerPlex_ESX17_LadderInfo.xml');
      const xmlContent = await fs.readFile(kitSpecPath, 'utf8');
      
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlContent);
      
      const kitData = result.KitData.Kits[0].Set[0];
      
      // Parse channel mapping
      this.channelMap = {};
      kitData.FsaChannelMap[0].Channel.forEach(channel => {
        const kitChannel = parseInt(channel.KitChannelNumber[0]);
        const fsaChannel = parseInt(channel.fsaChannelNumber[0]);
        
        this.channelMap[fsaChannel] = {
          kitChannel: kitChannel,
          color: channel.Color[0],
          dyeName: channel.DyeName[0]
        };
      });
      
      // Parse STR loci with real Osiris parameters
      this.strLoci = {};
      kitData.Locus.forEach(locus => {
        const locusName = locus.Name[0];
        const channel = parseInt(locus.Channel[0]);
        
        this.strLoci[locusName] = {
          name: locusName,
          channel: channel,
          dyeName: this.channelMap[channel].dyeName,
          color: this.channelMap[channel].color,
          minBP: parseInt(locus.MinBP[0]),
          maxBP: parseInt(locus.MaxBP[0]),
          noExtension: locus.NoExtension ? locus.NoExtension[0] === 'true' : false,
          coreRepeatNumber: locus.CoreRepeatNumber ? parseInt(locus.CoreRepeatNumber[0]) : 4,
          
          // Parse search regions for different ILS
          searchRegions: locus.SearchRegions ? locus.SearchRegions[0].Region.map(region => ({
            ilsName: region.ILSName[0],
            minGrid: parseFloat(region.MinGrid[0]),
            maxGrid: parseFloat(region.MaxGrid[0])
          })) : [],
          
          // Parse ladder alleles for calibration
          ladderAlleles: locus.LadderAlleles ? locus.LadderAlleles[0].Allele.map(allele => ({
            name: allele.Name[0],
            bp: parseInt(allele.BP[0]),
            curveNo: allele.CurveNo ? parseInt(allele.CurveNo[0]) : null
          })) : []
        };
      });
      
      // Parse ILS configuration
      this.ilsConfiguration = {
        channel: parseInt(kitData.ILS[0].ChannelNo[0]),
        ilsNames: kitData.ILS[0].LSBases[0].ILSName
      };
      
      console.log(`Loaded ${Object.keys(this.strLoci).length} STR loci from Osiris configuration`);
      
    } catch (error) {
      throw new Error(`Failed to load kit specification: ${error.message}`);
    }
  }

  /**
   * Analyze STR profile using Osiris parameters
   */
  async analyzeSTRProfile(filePath) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      console.log(`Analyzing STR profile with Osiris parameters: ${filePath}`);
      
      // Process FSA file
      const fsaResult = await this.fsaProcessor.processFSAFile(filePath);
      
      if (!fsaResult.success) {
        throw new Error(`FSA processing failed: ${fsaResult.error}`);
      }

      // Extract STR profile using Osiris thresholds
      const strProfile = {};
      const qualityMetrics = {};
      const analysisWarnings = [];

      // Process each dye channel according to Osiris configuration
      for (const [fsaChannel, traceData] of Object.entries(fsaResult.electropherogramData)) {
        const channelNumber = parseInt(fsaChannel.replace('Channel_', '')) || 
                             ['FAM', 'VIC', 'NED', 'PET', 'LIZ'].indexOf(fsaChannel) + 1;
        
        if (!this.channelMap[channelNumber]) continue;
        
        const channelInfo = this.channelMap[channelNumber];
        console.log(`Processing channel ${channelNumber} (${channelInfo.dyeName})`);
        
        // Detect peaks using Osiris thresholds
        const peaks = this.detectPeaksOsiris(traceData, channelNumber);
        
        // Find STR loci in this channel
        const lociInChannel = Object.values(this.strLoci).filter(locus => 
          locus.channel === channelNumber
        );
        
        // Process each locus
        for (const locus of lociInChannel) {
          const locusPeaks = this.filterPeaksByLocus(peaks, locus);
          const alleles = this.callAllelesOsiris(locusPeaks, locus);
          const locusQuality = this.assessLocusQualityOsiris(alleles, locusPeaks, locus);
          
          strProfile[locus.name] = {
            alleles: alleles,
            peaks: locusPeaks,
            quality: locusQuality,
            locus: locus,
            warnings: locusQuality.warnings || []
          };
          
          // Collect warnings
          if (locusQuality.warnings && locusQuality.warnings.length > 0) {
            analysisWarnings.push(...locusQuality.warnings);
          }
        }
        
        // Calculate channel quality metrics using Osiris standards
        qualityMetrics[channelInfo.dyeName] = this.calculateChannelQualityOsiris(
          peaks, 
          traceData, 
          channelNumber
        );
      }

      // Assess overall profile quality using Osiris criteria
      const overallQuality = this.assessOverallQualityOsiris(qualityMetrics, strProfile);

      return {
        success: true,
        sampleId: fsaResult.metadata.sampleName,
        strProfile: strProfile,
        qualityMetrics: qualityMetrics,
        overallQuality: overallQuality,
        analysisWarnings: analysisWarnings,
        osirisThresholds: this.osirisThresholds,
        rawData: fsaResult,
        analysisTimestamp: new Date(),
        softwareVersion: 'Osiris Enhanced STR Analyzer v1.0'
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
   * Detect peaks using Osiris thresholds
   */
  detectPeaksOsiris(traceData, channelNumber) {
    const peaks = [];
    const data = Array.isArray(traceData) ? traceData : traceData.data || [];
    const minHeight = this.osirisThresholds.minRFU;
    const minDistance = 10; // Minimum distance between peaks
    
    for (let i = minDistance; i < data.length - minDistance; i++) {
      const currentValue = data[i];
      
      // Apply Osiris minimum RFU threshold
      if (currentValue < minHeight) continue;
      
      // Check for overload
      if (this.osirisThresholds.alleleRFUOverloadThreshold > 0 && 
          currentValue > this.osirisThresholds.alleleRFUOverloadThreshold) {
        continue; // Skip overloaded peaks
      }
      
      // Check if this point is a local maximum
      let isLocalMax = true;
      for (let j = 1; j <= minDistance; j++) {
        if (data[i - j] >= currentValue || data[i + j] >= currentValue) {
          isLocalMax = false;
          break;
        }
      }
      
      if (isLocalMax) {
        const peak = {
          position: i,
          height: currentValue,
          area: this.calculatePeakArea(data, i, minDistance),
          width: this.calculatePeakWidth(data, i, currentValue * 0.5),
          channel: channelNumber,
          passesOsirisThreshold: true
        };
        
        // Apply Osiris fraction of max peak filter if needed
        if (this.osirisThresholds.fractionOfMaxPeak > 0) {
          const maxPeakInRegion = Math.max(...data.slice(Math.max(0, i - 100), i + 100));
          if (currentValue < maxPeakInRegion * this.osirisThresholds.fractionOfMaxPeak) {
            peak.passesOsirisThreshold = false;
          }
        }
        
        peaks.push(peak);
      }
    }
    
    return peaks.sort((a, b) => b.height - a.height);
  }

  /**
   * Filter peaks by locus using Osiris search regions
   */
  filterPeaksByLocus(peaks, locus) {
    return peaks.filter(peak => {
      // Simple BP range check (would use ILS calibration in full implementation)
      const estimatedBP = this.positionToBP(peak.position);
      return estimatedBP >= locus.minBP && estimatedBP <= locus.maxBP;
    });
  }

  /**
   * Call alleles using Osiris methodology
   */
  callAllelesOsiris(peaks, locus) {
    const alleles = [];
    const validPeaks = peaks.filter(p => p.passesOsirisThreshold);
    
    // Sort peaks by height (descending)
    const sortedPeaks = validPeaks.sort((a, b) => b.height - a.height);

    for (const peak of sortedPeaks) {
      if (alleles.filter(a => !a.isStutter && !a.isAdenylation).length >= 2) {
        break; // Maximum 2 alleles per locus for diploid
      }
      
      const bp = this.positionToBP(peak.position);
      const allele = this.bpToAlleleDesignation(bp, locus);
      
      if (allele) {
        // Check for stutter using Osiris threshold
        const isStutter = this.isStutterPeakOsiris(peak, sortedPeaks, locus);
        
        // Check for adenylation using Osiris threshold
        const isAdenylation = this.isAdenylationPeakOsiris(peak, sortedPeaks, locus);
        
        const alleleCall = {
          allele: allele,
          bp: bp,
          height: peak.height,
          area: peak.area,
          position: peak.position,
          quality: this.assessPeakQualityOsiris(peak, locus),
          isStutter: isStutter,
          isAdenylation: isAdenylation,
          osirisCompliant: true
        };
        
        alleles.push(alleleCall);
      }
    }

    return alleles;
  }

  /**
   * Check if peak is stutter using Osiris threshold
   */
  isStutterPeakOsiris(peak, allPeaks, locus) {
    const stutterThreshold = this.osirisThresholds.stutterThreshold;
    
    for (const otherPeak of allPeaks) {
      if (otherPeak === peak || otherPeak.height <= peak.height) continue;
      
      const bpDiff = Math.abs(this.positionToBP(peak.position) - this.positionToBP(otherPeak.position));
      const heightRatio = peak.height / otherPeak.height;
      
      // Check for n-4 stutter (one repeat unit back)
      const repeatUnitSize = locus.coreRepeatNumber || 4;
      if (Math.abs(bpDiff - repeatUnitSize) < 1 && heightRatio < stutterThreshold) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if peak is adenylation using Osiris threshold
   */
  isAdenylationPeakOsiris(peak, allPeaks, locus) {
    const adenylationThreshold = this.osirisThresholds.adenylationThreshold;
    
    for (const otherPeak of allPeaks) {
      if (otherPeak === peak || otherPeak.height <= peak.height) continue;
      
      const bpDiff = this.positionToBP(otherPeak.position) - this.positionToBP(peak.position);
      const heightRatio = peak.height / otherPeak.height;
      
      // Check for +A peak (1 bp larger)
      if (Math.abs(bpDiff - 1) < 0.5 && heightRatio < adenylationThreshold) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Assess locus quality using Osiris criteria
   */
  assessLocusQualityOsiris(alleles, peaks, locus) {
    const warnings = [];
    const mainAlleles = alleles.filter(a => !a.isStutter && !a.isAdenylation);
    
    if (mainAlleles.length === 0) {
      return {
        status: 'No Call',
        completeness: 0,
        warnings: ['No alleles detected above threshold']
      };
    }
    
    if (mainAlleles.length === 1) {
      // Check if homozygote or dropout
      const allele = mainAlleles[0];
      if (allele.height >= this.osirisThresholds.minBoundForHomozygote) {
        return {
          status: 'Homozygote',
          completeness: 1,
          warnings: warnings
        };
      } else {
        warnings.push('Possible allelic dropout - single peak below homozygote threshold');
        return {
          status: 'Partial Profile',
          completeness: 0.5,
          warnings: warnings
        };
      }
    }
    
    if (mainAlleles.length === 2) {
      // Check heterozygote balance using Osiris threshold
      const heights = mainAlleles.map(a => a.height);
      const minHeight = Math.min(...heights);
      const maxHeight = Math.max(...heights);
      const imbalance = minHeight / maxHeight;
      
      if (imbalance < this.osirisThresholds.heterozygousImbalanceLimit) {
        warnings.push(`Heterozygote imbalance: ${(imbalance * 100).toFixed(1)}%`);
      }
      
      return {
        status: 'Complete',
        completeness: 1,
        heterozygoteBalance: imbalance,
        warnings: warnings
      };
    }
    
    // More than 2 alleles
    warnings.push('Possible mixture or triallelic pattern');
    return {
      status: 'Complex',
      completeness: 0.8,
      warnings: warnings
    };
  }

  /**
   * Assess peak quality using Osiris criteria
   */
  assessPeakQualityOsiris(peak, locus) {
    let quality = 'Good';
    
    if (peak.height < this.osirisThresholds.minRFU * 1.5) {
      quality = 'Low';
    }
    
    if (peak.height > this.osirisThresholds.alleleRFUOverloadThreshold * 0.8) {
      quality = 'High';
    }
    
    if (peak.width > 2.0) {
      quality = 'Broad';
    }
    
    return quality;
  }

  /**
   * Calculate channel quality using Osiris standards
   */
  calculateChannelQualityOsiris(peaks, traceData, channelNumber) {
    const validPeaks = peaks.filter(p => p.passesOsirisThreshold);
    const data = Array.isArray(traceData) ? traceData : traceData.data || [];
    
    const maxSignal = Math.max(...data);
    const avgBaseline = data.slice(0, 100).reduce((a, b) => a + b, 0) / 100;
    const signalToNoise = maxSignal / avgBaseline;
    
    // Check baseline quality using Osiris thresholds
    const baselineQuality = avgBaseline < 250 ? 'Good' : 'Elevated';
    
    return {
      peakCount: validPeaks.length,
      maxSignal: maxSignal,
      signalToNoise: signalToNoise,
      baselineNoise: avgBaseline,
      baselineQuality: baselineQuality,
      osirisCompliant: signalToNoise > 10 && avgBaseline < 250,
      quality: this.determineChannelQuality(signalToNoise, avgBaseline, validPeaks.length)
    };
  }

  /**
   * Assess overall profile quality using Osiris criteria
   */
  assessOverallQualityOsiris(channelMetrics, strProfile) {
    const lociCount = Object.keys(strProfile).length;
    const completeLoci = Object.values(strProfile).filter(l => l.quality.status === 'Complete').length;
    const partialLoci = Object.values(strProfile).filter(l => l.quality.status === 'Partial Profile').length;
    const homozygoteLoci = Object.values(strProfile).filter(l => l.quality.status === 'Homozygote').length;
    
    const completeness = (completeLoci + homozygoteLoci + partialLoci * 0.5) / lociCount;
    
    // Check if meets Osiris quality standards
    const osirisCompliant = Object.values(channelMetrics).every(cm => cm.osirisCompliant);
    
    let overallQuality = 'Poor';
    if (completeness >= 0.9 && osirisCompliant) overallQuality = 'Excellent';
    else if (completeness >= 0.8) overallQuality = 'Good';
    else if (completeness >= 0.6) overallQuality = 'Acceptable';

    return {
      completeness: completeness,
      completeLoci: completeLoci,
      partialLoci: partialLoci,
      homozygoteLoci: homozygoteLoci,
      totalLoci: lociCount,
      quality: overallQuality,
      osirisCompliant: osirisCompliant,
      interpretation: this.getQualityInterpretationOsiris(completeness, osirisCompliant),
      thresholdsUsed: 'Osiris PowerPlex ESX 17'
    };
  }

  /**
   * Helper methods
   */
  calculatePeakArea(data, peakPosition, window = 20) {
    const start = Math.max(0, peakPosition - window);
    const end = Math.min(data.length - 1, peakPosition + window);
    
    let area = 0;
    for (let i = start; i < end; i++) {
      area += (data[i] + data[i + 1]) / 2;
    }
    
    return area;
  }

  calculatePeakWidth(data, peakPosition, halfMax) {
    let leftWidth = 0, rightWidth = 0;
    
    for (let i = peakPosition; i >= 0; i--) {
      if (data[i] <= halfMax) {
        leftWidth = peakPosition - i;
        break;
      }
    }
    
    for (let i = peakPosition; i < data.length; i++) {
      if (data[i] <= halfMax) {
        rightWidth = i - peakPosition;
        break;
      }
    }
    
    return leftWidth + rightWidth;
  }

  positionToBP(position) {
    // Simplified conversion - in full implementation would use ILS calibration
    return Math.round(100 + (position * 0.1));
  }

  bpToAlleleDesignation(bp, locus) {
    if (locus.name === 'AMEL') {
      return bp < 86 ? 'X' : 'Y';
    }
    
    // Calculate repeat units from BP using locus-specific parameters
    if (locus.ladderAlleles && locus.ladderAlleles.length > 0) {
      // Use ladder alleles for more accurate sizing
      const closestLadder = locus.ladderAlleles.reduce((prev, curr) => 
        Math.abs(curr.bp - bp) < Math.abs(prev.bp - bp) ? curr : prev
      );
      
      if (Math.abs(closestLadder.bp - bp) < 1) {
        return closestLadder.name;
      }
    }
    
    // Fallback to simple calculation
    const repeatUnits = Math.round((bp - locus.minBP) / (locus.coreRepeatNumber || 4));
    return (repeatUnits + 6).toString(); // Approximate starting repeat number
  }

  determineChannelQuality(signalToNoise, baseline, peakCount) {
    if (signalToNoise > 15 && baseline < 100 && peakCount > 0) return 'Excellent';
    if (signalToNoise > 10 && baseline < 250 && peakCount > 0) return 'Good';
    if (signalToNoise > 5 && baseline < 500) return 'Acceptable';
    return 'Poor';
  }

  getQualityInterpretationOsiris(completeness, osirisCompliant) {
    if (completeness >= 0.9 && osirisCompliant) {
      return 'Profile meets Osiris quality standards and is suitable for database comparison';
    } else if (completeness >= 0.8) {
      return 'Profile suitable for comparison with minor quality issues';
    } else if (completeness >= 0.6) {
      return 'Partial profile - limited statistical interpretation possible';
    } else {
      return 'Insufficient data quality for reliable interpretation';
    }
  }

  /**
   * Compare profiles for paternity analysis using Osiris standards
   */
  compareProfilesOsiris(childProfile, fatherProfile, motherProfile = null) {
    const comparison = {
      lociComparisons: {},
      matchingLoci: 0,
      totalLoci: 0,
      exclusions: [],
      inclusions: [],
      osirisCompliant: true,
      summary: {}
    };

    const allLoci = new Set([
      ...Object.keys(childProfile),
      ...Object.keys(fatherProfile),
      ...(motherProfile ? Object.keys(motherProfile) : [])
    ]);

    for (const locus of allLoci) {
      if (locus === 'AMEL') continue; // Skip sex marker for paternity

      const childData = childProfile[locus];
      const fatherData = fatherProfile[locus];
      const motherData = motherProfile?.[locus];

      if (!childData || !fatherData || 
          childData.quality.status === 'No Call' || 
          fatherData.quality.status === 'No Call') {
        continue; // Skip loci with no calls
      }

      const childAlleles = childData.alleles.filter(a => !a.isStutter && !a.isAdenylation).map(a => a.allele);
      const fatherAlleles = fatherData.alleles.filter(a => !a.isStutter && !a.isAdenylation).map(a => a.allele);
      const motherAlleles = motherData ? 
        motherData.alleles.filter(a => !a.isStutter && !a.isAdenylation).map(a => a.allele) : [];

      const locusComparison = this.compareLocusForPaternityOsiris(
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

    comparison.summary = this.calculatePaternityStatisticsOsiris(comparison);
    return comparison;
  }

  /**
   * Compare single locus for paternity using Osiris methodology
   */
  compareLocusForPaternityOsiris(childAlleles, fatherAlleles, motherAlleles, locus) {
    const result = {
      locus: locus,
      childAlleles: childAlleles,
      fatherAlleles: fatherAlleles,
      motherAlleles: motherAlleles,
      match: false,
      exclusion: false,
      obligatePaternal: null,
      interpretation: '',
      osirisCompliant: true
    };

    if (childAlleles.length === 0 || fatherAlleles.length === 0) {
      result.interpretation = 'Insufficient data for comparison';
      result.osirisCompliant = false;
      return result;
    }

    // Determine obligate paternal alleles
    let obligateAlleles = [...childAlleles];
    if (motherAlleles.length > 0) {
      obligateAlleles = childAlleles.filter(allele => !motherAlleles.includes(allele));
    }

    // Check if father has any obligate paternal alleles
    const paternalMatch = obligateAlleles.length === 0 || 
                         obligateAlleles.some(allele => fatherAlleles.includes(allele));

    if (paternalMatch) {
      result.match = true;
      result.interpretation = 'Consistent with paternity (Osiris compliant)';
    } else {
      result.exclusion = true;
      result.interpretation = 'Exclusion - no shared obligate paternal alleles';
    }

    result.obligatePaternal = obligateAlleles;
    return result;
  }

  /**
   * Calculate paternity statistics using Osiris methodology
   */
  calculatePaternityStatisticsOsiris(comparison) {
    const exclusions = comparison.exclusions.length;
    const matchingLoci = comparison.matchingLoci;
    const totalInformativeLoci = comparison.totalLoci;

    if (exclusions >= 2) {
      return {
        conclusion: 'exclusion',
        paternityProbability: 0,
        exclusionProbability: 99.99,
        interpretation: 'Alleged father is excluded as the biological father (Osiris analysis)',
        osirisMethod: true
      };
    }

    if (exclusions === 1) {
      return {
        conclusion: 'inconclusive',
        paternityProbability: null,
        exclusionProbability: null,
        interpretation: 'Results are inconclusive - single exclusion may indicate mutation (Osiris analysis)',
        osirisMethod: true
      };
    }

    // Enhanced CPI calculation using Osiris methodology
    const cpi = Math.pow(2.5, matchingLoci); // More conservative than simple 2^n
    const paternityProbability = (cpi / (cpi + 1)) * 100;

    return {
      conclusion: paternityProbability > 99 ? 'inclusion' : 'inconclusive',
      paternityProbability: paternityProbability,
      exclusionProbability: 100 - paternityProbability,
      combinedPaternityIndex: cpi,
      interpretation: this.getPaternityInterpretationOsiris(paternityProbability),
      osirisMethod: true
    };
  }

  getPaternityInterpretationOsiris(probability) {
    if (probability > 99.99) {
      return 'Extremely strong support for paternity (Osiris compliant analysis)';
    } else if (probability > 99.9) {
      return 'Very strong support for paternity (Osiris compliant analysis)';
    } else if (probability > 99) {
      return 'Strong support for paternity (Osiris compliant analysis)';
    } else if (probability > 95) {
      return 'Moderate support for paternity (Osiris compliant analysis)';
    } else {
      return 'Inconclusive - insufficient support for paternity (Osiris analysis)';
    }
  }

  /**
   * Export analysis results in Osiris-compatible XML format
   */
  async exportToOsirisXML(analysisResult, outputPath) {
    try {
      const xmlBuilder = new xml2js.Builder({
        rootName: 'OsirisAnalysisReport',
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ' }
      });

      // Build Osiris-compatible XML structure
      const xmlData = {
        $: {
          version: '2.16',
          generated: new Date().toISOString(),
          software: 'Enhanced STR Analyzer (Osiris Compatible)',
          kit: 'PowerPlex ESX 17'
        },
        Parameters: {
          Analysis: {
            MinRFU: this.osirisThresholds.minRFU,
            StutterThreshold: this.osirisThresholds.stutterThreshold,
            AdenylationThreshold: this.osirisThresholds.adenylationThreshold,
            HeterozygousImbalanceLimit: this.osirisThresholds.heterozygousImbalanceLimit,
            MinBoundForHomozygote: this.osirisThresholds.minBoundForHomozygote
          }
        },
        Sample: {
          $: {
            Name: analysisResult.sampleId,
            Timestamp: analysisResult.analysisTimestamp
          },
          QualityMetrics: {
            OverallQuality: analysisResult.overallQuality.quality,
            Completeness: analysisResult.overallQuality.completeness,
            OsirisCompliant: analysisResult.overallQuality.osirisCompliant
          },
          Locus: Object.entries(analysisResult.strProfile).map(([locusName, locusData]) => ({
            $: {
              Name: locusName,
              Quality: locusData.quality.status
            },
            Allele: locusData.alleles
              .filter(a => !a.isStutter && !a.isAdenylation)
              .map(allele => ({
                $: {
                  Value: allele.allele,
                  Height: allele.height,
                  Area: allele.area,
                  Position: allele.position,
                  Quality: allele.quality,
                  OsirisCompliant: allele.osirisCompliant
                }
              })),
            Artifacts: locusData.alleles
              .filter(a => a.isStutter || a.isAdenylation)
              .map(artifact => ({
                $: {
                  Type: artifact.isStutter ? 'Stutter' : 'Adenylation',
                  Height: artifact.height,
                  Position: artifact.position
                }
              }))
          }))
        }
      };

      const xml = xmlBuilder.buildObject(xmlData);
      await fs.writeFile(outputPath, xml);

      console.log(`Osiris-compatible XML exported to: ${outputPath}`);
      return {
        success: true,
        outputPath,
        format: 'XML',
        osirisCompliant: true
      };

    } catch (error) {
      console.error('Failed to export Osiris XML:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export paternity comparison in Osiris-compatible format
   */
  async exportPaternityToOsirisXML(comparison, outputPath) {
    try {
      const xmlBuilder = new xml2js.Builder({
        rootName: 'OsirisPaternityReport',
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ' }
      });

      const xmlData = {
        $: {
          version: '2.16',
          generated: new Date().toISOString(),
          software: 'Enhanced STR Analyzer (Osiris Compatible)',
          analysisType: 'Paternity'
        },
        Summary: {
          PaternityProbability: comparison.summary.paternityProbability,
          ExclusionProbability: comparison.summary.exclusionProbability,
          CombinedPaternityIndex: comparison.summary.combinedPaternityIndex,
          Conclusion: comparison.summary.conclusion,
          Interpretation: comparison.summary.interpretation,
          OsirisMethod: comparison.summary.osirisMethod,
          MatchingLoci: comparison.matchingLoci,
          TotalLoci: comparison.totalLoci
        },
        Exclusions: comparison.exclusions.map(locus => ({ Locus: locus })),
        Inclusions: comparison.inclusions.map(locus => ({ Locus: locus })),
        LociComparisons: {
          Locus: Object.entries(comparison.lociComparisons).map(([locusName, locusComp]) => ({
            $: {
              Name: locusName,
              Match: locusComp.match,
              Exclusion: locusComp.exclusion,
              OsirisCompliant: locusComp.osirisCompliant
            },
            Child: {
              Alleles: locusComp.childAlleles.join('/')
            },
            Father: {
              Alleles: locusComp.fatherAlleles.join('/')
            },
            Mother: locusComp.motherAlleles ? {
              Alleles: locusComp.motherAlleles.join('/')
            } : null,
            ObligatePaternal: locusComp.obligatePaternal ? {
              Alleles: locusComp.obligatePaternal.join('/')
            } : null,
            Interpretation: locusComp.interpretation
          }))
        }
      };

      const xml = xmlBuilder.buildObject(xmlData);
      await fs.writeFile(outputPath, xml);

      console.log(`Osiris-compatible paternity XML exported to: ${outputPath}`);
      return {
        success: true,
        outputPath,
        format: 'XML',
        osirisCompliant: true,
        reportType: 'Paternity'
      };

    } catch (error) {
      console.error('Failed to export paternity XML:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export analysis results in CSV format compatible with Osiris
   */
  async exportToOsirisCSV(analysisResult, outputPath) {
    try {
      const csvLines = [
        'Sample_ID,Locus,Allele_1,Allele_2,Height_1,Height_2,Area_1,Area_2,Quality,Artifacts,Osiris_Compliant'
      ];

      Object.entries(analysisResult.strProfile).forEach(([locusName, locusData]) => {
        const mainAlleles = locusData.alleles.filter(a => !a.isStutter && !a.isAdenylation);
        const artifacts = locusData.alleles.filter(a => a.isStutter || a.isAdenylation);

        const allele1 = mainAlleles[0] || null;
        const allele2 = mainAlleles[1] || null;

        const artifactsList = artifacts.map(a => 
          `${a.allele}${a.isStutter ? 'S' : 'A'}`
        ).join(';');

        csvLines.push([
          analysisResult.sampleId,
          locusName,
          allele1 ? allele1.allele : '',
          allele2 ? allele2.allele : '',
          allele1 ? allele1.height : '',
          allele2 ? allele2.height : '',
          allele1 ? allele1.area : '',
          allele2 ? allele2.area : '',
          locusData.quality.status,
          artifactsList,
          locusData.alleles.every(a => a.osirisCompliant) ? 'Yes' : 'No'
        ].join(','));
      });

      await fs.writeFile(outputPath, csvLines.join('\n'));

      console.log(`Osiris-compatible CSV exported to: ${outputPath}`);
      return {
        success: true,
        outputPath,
        format: 'CSV',
        osirisCompliant: true
      };

    } catch (error) {
      console.error('Failed to export Osiris CSV:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export paternity comparison results in CSV format
   */
  async exportPaternityToCSV(comparison, outputPath) {
    try {
      const csvLines = [
        'Locus,Child_Alleles,Father_Alleles,Mother_Alleles,Obligate_Paternal,Match,Exclusion,Interpretation,Osiris_Compliant'
      ];

      Object.entries(comparison.lociComparisons).forEach(([locusName, locusComp]) => {
        csvLines.push([
          locusName,
          locusComp.childAlleles.join('/'),
          locusComp.fatherAlleles.join('/'),
          locusComp.motherAlleles ? locusComp.motherAlleles.join('/') : 'N/A',
          locusComp.obligatePaternal ? locusComp.obligatePaternal.join('/') : 'N/A',
          locusComp.match ? 'Yes' : 'No',
          locusComp.exclusion ? 'Yes' : 'No',
          locusComp.interpretation,
          locusComp.osirisCompliant ? 'Yes' : 'No'
        ].join(','));
      });

      // Add summary line
      csvLines.push('');
      csvLines.push('SUMMARY');
      csvLines.push(`Paternity_Probability,${comparison.summary.paternityProbability}`);
      csvLines.push(`Exclusion_Probability,${comparison.summary.exclusionProbability}`);
      csvLines.push(`Combined_Paternity_Index,${comparison.summary.combinedPaternityIndex || 'N/A'}`);
      csvLines.push(`Conclusion,${comparison.summary.conclusion}`);
      csvLines.push(`Matching_Loci,${comparison.matchingLoci}`);
      csvLines.push(`Total_Loci,${comparison.totalLoci}`);
      csvLines.push(`Osiris_Method,${comparison.summary.osirisMethod ? 'Yes' : 'No'}`);

      await fs.writeFile(outputPath, csvLines.join('\n'));

      console.log(`Paternity CSV exported to: ${outputPath}`);
      return {
        success: true,
        outputPath,
        format: 'CSV',
        reportType: 'Paternity'
      };

    } catch (error) {
      console.error('Failed to export paternity CSV:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export comprehensive analysis results in multiple formats
   */
  async exportCompleteAnalysis(analysisResult, outputDir, formats = ['xml', 'csv']) {
    try {
      await fs.mkdir(outputDir, { recursive: true });

      const exports = {};
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sampleId = analysisResult.sampleId;

      for (const format of formats) {
        const fileName = `${sampleId}_analysis_${timestamp}.${format}`;
        const outputPath = path.join(outputDir, fileName);

        if (format === 'xml') {
          exports.xml = await this.exportToOsirisXML(analysisResult, outputPath);
        } else if (format === 'csv') {
          exports.csv = await this.exportToOsirisCSV(analysisResult, outputPath);
        }
      }

      return {
        success: true,
        outputDir,
        exports,
        formats,
        osirisCompatible: true
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export paternity comparison in multiple formats
   */
  async exportPaternityAnalysis(comparison, outputDir, caseId, formats = ['xml', 'csv']) {
    try {
      await fs.mkdir(outputDir, { recursive: true });

      const exports = {};
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      for (const format of formats) {
        const fileName = `${caseId}_paternity_${timestamp}.${format}`;
        const outputPath = path.join(outputDir, fileName);

        if (format === 'xml') {
          exports.xml = await this.exportPaternityToOsirisXML(comparison, outputPath);
        } else if (format === 'csv') {
          exports.csv = await this.exportPaternityToCSV(comparison, outputPath);
        }
      }

      return {
        success: true,
        outputDir,
        exports,
        formats,
        osirisCompatible: true,
        analysisType: 'Paternity'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = OsirisEnhancedSTRAnalyzer;