const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const OsirisEnhancedSTRAnalyzer = require('./osirisEnhancedSTRAnalyzer');

class OsirisIntegration {
  constructor() {
    // Path to the actual Osiris executable - use absolute path from project root
    const projectRoot = process.cwd().includes('backend') ? path.join(process.cwd(), '..') : process.cwd();
    this.osirisAppPath = path.join(projectRoot, 'backend', 'osiris_software', 'Osiris-2.16.app');
    this.osirisExecutable = path.join(this.osirisAppPath, 'Contents', 'MacOS', 'osiris');
    this.osirisConfigDir = path.join(this.osirisAppPath, 'Contents', 'MacOS', 'Config');
    
    // Our workspace directories
    this.workingDir = path.join(projectRoot, 'backend', 'osiris_workspace');
    this.configDir = path.join(this.workingDir, 'config');
    this.outputDir = path.join(this.workingDir, 'output');
    this.tempDir = path.join(this.workingDir, 'temp');
    this.inputDir = path.join(this.workingDir, 'input');
    
    // Enhanced STR analyzer using real Osiris configurations (lazy initialization)
    this.strAnalyzer = null;
    
    // PowerPlex ESX 17 configuration
    this.kitConfig = {
      name: 'PPESX17',
      volumePath: path.join(this.osirisConfigDir, 'Volumes', 'PPESX17'),
      ladderPath: path.join(this.osirisConfigDir, 'LadderSpecifications'),
      description: 'PowerPlex ESX 17 STR Kit'
    };
  }

  /**
   * Initialize Osiris workspace and configuration
   */
  async initialize() {
    try {
      // Create workspace directories
      await this.createDirectories();
      
      // Verify Osiris installation
      await this.verifyOsirisInstallation();
      
      // Verify PowerPlex ESX 17 configuration
      await this.verifyKitConfiguration();
      
      // Initialize enhanced STR analyzer with real Osiris configurations
      if (!this.strAnalyzer) {
        this.strAnalyzer = new OsirisEnhancedSTRAnalyzer();
      }
      const analyzerInit = await this.strAnalyzer.initialize();
      if (!analyzerInit.success) {
        throw new Error(`Failed to initialize enhanced STR analyzer: ${analyzerInit.error}`);
      }
      
      // Setup workspace configuration for paternity testing
      await this.setupPaternityConfig();
      
      // Copy necessary configuration files
      await this.copyOsirisConfigurations();
      
      return { 
        success: true, 
        osirisVersion: await this.getOsirisVersion(),
        kitConfiguration: this.kitConfig.name,
        workspaceDir: this.workingDir
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const dirs = [
      this.workingDir, 
      this.configDir, 
      this.outputDir, 
      this.tempDir, 
      this.inputDir,
      path.join(this.workingDir, 'reports'),
      path.join(this.workingDir, 'logs')
    ];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Verify Osiris installation
   */
  async verifyOsirisInstallation() {
    try {
      // Check if Osiris executable exists
      await fs.access(this.osirisExecutable);
      
      // Check if it's executable
      const stats = await fs.stat(this.osirisExecutable);
      if (!(stats.mode & 0o111)) {
        // Make executable if not already
        await fs.chmod(this.osirisExecutable, 0o755);
      }
      
      // Check if configuration directory exists
      await fs.access(this.osirisConfigDir);
      
      return true;
    } catch (error) {
      throw new Error(`Osiris installation verification failed: ${error.message}`);
    }
  }

  /**
   * Verify PowerPlex ESX 17 kit configuration
   */
  async verifyKitConfiguration() {
    try {
      await fs.access(this.kitConfig.volumePath);
      
      // Check for required configuration files
      const requiredFiles = [
        'PPESX17_LabSettings.xml',
        'PPESX17_StdSettings.xml',
        'PPESX17_MessageBookV4.0.xml'
      ];
      
      for (const file of requiredFiles) {
        const filePath = path.join(this.kitConfig.volumePath, file);
        await fs.access(filePath);
      }
      
      return true;
    } catch (error) {
      throw new Error(`PowerPlex ESX 17 configuration verification failed: ${error.message}`);
    }
  }

  /**
   * Get Osiris version information
   */
  async getOsirisVersion() {
    try {
      // Read version from Info.plist
      const infoPlistPath = path.join(this.osirisAppPath, 'Contents', 'Info.plist');
      const plistContent = await fs.readFile(infoPlistPath, 'utf8');
      
      // Extract version using regex (simple approach)
      const versionMatch = plistContent.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
      const version = versionMatch ? versionMatch[1] : '2.16';
      
      return `Osiris ${version}`;
    } catch (error) {
      return 'Osiris 2.16 (version detection failed)';
    }
  }

  /**
   * Copy necessary Osiris configurations to workspace
   */
  async copyOsirisConfigurations() {
    try {
      // Copy PowerPlex ESX 17 configuration to workspace
      const workspaceKitDir = path.join(this.configDir, 'PPESX17');
      await fs.mkdir(workspaceKitDir, { recursive: true });
      
      // Copy kit configuration files
      const configFiles = await fs.readdir(this.kitConfig.volumePath);
      for (const file of configFiles) {
        if (file.endsWith('.xml') || file.endsWith('.txt')) {
          const sourcePath = path.join(this.kitConfig.volumePath, file);
          const destPath = path.join(workspaceKitDir, file);
          await fs.copyFile(sourcePath, destPath);
        }
      }
      
      // Copy ladder specifications
      const ladderDestDir = path.join(this.configDir, 'LadderSpecifications');
      await fs.mkdir(ladderDestDir, { recursive: true });
      
      // Copy relevant ladder files for PowerPlex ESX 17
      const ladderFiles = await fs.readdir(this.kitConfig.ladderPath);
      const relevantLadders = ladderFiles.filter(file => 
        file.includes('PPESX17') || file.includes('PowerPlex') || file.includes('ESX')
      );
      
      for (const file of relevantLadders) {
        const sourcePath = path.join(this.kitConfig.ladderPath, file);
        const destPath = path.join(ladderDestDir, file);
        try {
          await fs.copyFile(sourcePath, destPath);
        } catch (error) {
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Setup configuration for paternity testing
   */
  async setupPaternityConfig() {
    const config = {
      analysis: {
        type: 'paternity',
        kit: 'PowerPlex_ESX_17',
        population: 'South_African',
        thresholds: {
          minPeakHeight: 50,
          minPeakArea: 100,
          stutterRatio: 0.15,
          adenylationRatio: 0.3
        }
      },
      reporting: {
        generateXML: true,
        generatePDF: true,
        includePlots: true
      }
    };

    const configPath = path.join(this.configDir, 'paternity_config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Analyze paternity case using enhanced STR analysis
   */
  async analyzePaternityCase(caseData) {
    try {
      
      // Process each FSA file using enhanced STR analyzer
      const strProfiles = {};
      const qualityMetrics = {};
      
      for (const sample of caseData.samples) {
        
        const analysisResult = await this.strAnalyzer.analyzeSTRProfile(sample.filePath);
        
        if (analysisResult.success) {
          // Export individual sample results in Osiris-compatible formats
          const sampleExportDir = path.join(this.outputDir, caseData.caseId, 'sample_exports', sample.sampleId);
          const sampleExportResult = await this.strAnalyzer.exportCompleteAnalysis(
            analysisResult, 
            sampleExportDir, 
            ['xml', 'csv']
          );

          strProfiles[sample.sampleId] = {
            sampleId: sample.sampleId,
            sampleType: sample.sampleType,
            strProfile: analysisResult.strProfile,
            qualityMetrics: analysisResult.qualityMetrics,
            overallQuality: analysisResult.overallQuality,
            osirisExports: sampleExportResult
          };
          
          qualityMetrics[sample.sampleId] = analysisResult.qualityMetrics;
        } else {
          throw new Error(`FSA processing failed for ${sample.sampleId}: ${analysisResult.error}`);
        }
      }
      
      // Perform paternity comparison
      const paternityStats = await this.performPaternityComparison(strProfiles, caseData);
      
      // Generate comprehensive output
      const outputPath = await this.generateAnalysisOutput(caseData.caseId, strProfiles, paternityStats);
      
      return {
        success: true,
        caseId: caseData.caseId,
        strProfiles,
        qualityMetrics,
        paternityStats,
        outputPath,
        analysisTimestamp: new Date()
      };
      
    } catch (error) {
      return {
        success: false,
        caseId: caseData.caseId,
        error: error.message
      };
    }
  }

  /**
   * Perform paternity comparison using STR profiles
   */
  async performPaternityComparison(strProfiles, caseData) {
    try {
      // Find required samples
      const childSample = caseData.samples.find(s => s.sampleType === 'child');
      const fatherSample = caseData.samples.find(s => s.sampleType === 'alleged_father');
      const motherSample = caseData.samples.find(s => s.sampleType === 'mother');
      
      if (!childSample || !fatherSample) {
        throw new Error('Missing required samples for paternity analysis');
      }
      
      const childProfile = strProfiles[childSample.sampleId]?.strProfile;
      const fatherProfile = strProfiles[fatherSample.sampleId]?.strProfile;
      const motherProfile = motherSample ? strProfiles[motherSample.sampleId]?.strProfile : null;
      
      if (!childProfile || !fatherProfile) {
        throw new Error('Failed to extract STR profiles from required samples');
      }
      
      // Perform comparison using enhanced Osiris STR analyzer
      const comparison = this.strAnalyzer.compareProfilesOsiris(childProfile, fatherProfile, motherProfile);
      
      // Export results in Osiris-compatible formats
      const exportDir = path.join(this.outputDir, caseData.caseId, 'osiris_exports');
      const exportResult = await this.strAnalyzer.exportPaternityAnalysis(
        comparison, 
        exportDir, 
        caseData.caseId, 
        ['xml', 'csv']
      );
      
      return {
        paternityProbability: comparison.summary.paternityProbability,
        exclusionProbability: comparison.summary.exclusionProbability,
        matchingLoci: comparison.matchingLoci,
        totalLoci: comparison.totalLoci,
        conclusion: comparison.summary.conclusion,
        interpretation: comparison.summary.interpretation,
        lociComparison: comparison.lociComparisons,
        combinedPaternityIndex: comparison.summary.combinedPaternityIndex || null,
        exclusions: comparison.exclusions,
        inclusions: comparison.inclusions,
        osirisExports: exportResult
      };
      
    } catch (error) {
      throw new Error(`Paternity comparison failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive analysis output
   */
  async generateAnalysisOutput(caseId, strProfiles, paternityStats) {
    try {
      const outputPath = path.join(this.outputDir, caseId);
      await fs.mkdir(outputPath, { recursive: true });
      
      // Generate JSON report
      const jsonReport = {
        caseId,
        analysisTimestamp: new Date(),
        strProfiles,
        paternityAnalysis: paternityStats,
        softwareVersion: 'Enhanced STR Analyzer v1.0',
        qualitySummary: this.generateQualitySummary(strProfiles)
      };
      
      const jsonPath = path.join(outputPath, `${caseId}_analysis_report.json`);
      await fs.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2));
      
      // Generate CSV summary
      const csvPath = path.join(outputPath, `${caseId}_loci_comparison.csv`);
      await this.generateCSVReport(paternityStats.lociComparison, csvPath);
      
      return outputPath;
      
    } catch (error) {
      throw new Error(`Failed to generate analysis output: ${error.message}`);
    }
  }

  /**
   * Generate quality summary
   */
  generateQualitySummary(strProfiles) {
    const summary = {
      totalSamples: Object.keys(strProfiles).length,
      qualityDistribution: { excellent: 0, good: 0, acceptable: 0, poor: 0 },
      averageCompleteness: 0
    };
    
    let totalCompleteness = 0;
    
    Object.values(strProfiles).forEach(profile => {
      const quality = profile.overallQuality.quality.toLowerCase();
      if (summary.qualityDistribution[quality] !== undefined) {
        summary.qualityDistribution[quality]++;
      }
      totalCompleteness += profile.overallQuality.completeness;
    });
    
    summary.averageCompleteness = totalCompleteness / summary.totalSamples;
    
    return summary;
  }

  /**
   * Generate CSV report for loci comparison
   */
  async generateCSVReport(lociComparison, csvPath) {
    const csvLines = ['Locus,Child_Alleles,Father_Alleles,Mother_Alleles,Match,Interpretation'];
    
    Object.entries(lociComparison).forEach(([locus, comparison]) => {
      const childAlleles = comparison.childAlleles.join('/');
      const fatherAlleles = comparison.fatherAlleles.join('/');
      const motherAlleles = comparison.motherAlleles ? comparison.motherAlleles.join('/') : 'N/A';
      const match = comparison.match ? 'Yes' : 'No';
      const interpretation = comparison.interpretation;
      
      csvLines.push(`${locus},${childAlleles},${fatherAlleles},${motherAlleles},${match},${interpretation}`);
    });
    
    await fs.writeFile(csvPath, csvLines.join('\n'));
  }

  /**
   * Prepare input files for Osiris analysis
   */
  async prepareInputFiles(caseData) {
    const caseDir = path.join(this.tempDir, caseData.caseId);
    await fs.mkdir(caseDir, { recursive: true });

    // Copy FSA files to case directory
    for (const sample of caseData.samples) {
      const destPath = path.join(caseDir, path.basename(sample.filePath));
      await fs.copyFile(sample.filePath, destPath);
    }

    return caseDir;
  }

  /**
   * Create case-specific configuration
   */
  async createCaseConfig(caseData) {
    const config = {
      input: {
        directory: path.join(this.tempDir, caseData.caseId),
        filePattern: '*.fsa'
      },
      output: {
        directory: path.join(this.outputDir, caseData.caseId),
        format: ['xml', 'csv', 'pdf']
      },
      analysis: {
        type: 'paternity',
        samples: caseData.samples.map(sample => ({
          id: sample.sampleId,
          type: sample.sampleType,
          file: path.basename(sample.filePath)
        }))
      }
    };

    const configPath = path.join(this.configDir, `${caseData.caseId}_config.json`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    return configPath;
  }

  /**
   * Execute real Osiris analysis using command line interface
   */
  async executeOsirisAnalysis(inputDir, caseId) {
    return new Promise(async (resolve, reject) => {
      try {
        const outputPath = path.join(this.outputDir, caseId);
        await fs.mkdir(outputPath, { recursive: true });
        
        // Create Osiris input file list
        const inputListFile = path.join(this.tempDir, `${caseId}_input.txt`);
        await this.createOsirisInputFile(inputDir, inputListFile);
        
        // Use TestAnalysisDirectoryLC for command line analysis
        const testAnalysisExecutable = path.join(this.osirisAppPath, 'Contents', 'MacOS', 'TestAnalysisDirectoryLC');
        
        const args = [
          '-i', inputDir,           // Input directory
          '-o', outputPath,         // Output directory  
          '-l', inputListFile,      // Input file list
          '-k', this.kitConfig.name, // Kit name (PPESX17)
          '-L'                      // Use lab settings
        ];


        const osirisProcess = spawn(testAnalysisExecutable, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            'OSIRIS_BASE_DIRECTORY': this.osirisAppPath,
            'OSIRIS_SITE_DIRECTORY': this.configDir
          }
        });

        let stdout = '';
        let stderr = '';

        osirisProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        osirisProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        osirisProcess.on('close', (code) => {
          
          if (code === 0) {
            resolve({
              success: true,
              outputPath,
              stdout,
              stderr,
              exitCode: code
            });
          } else {
            // Even if exit code is non-zero, check if we got output files
            this.checkForOutputFiles(outputPath).then(hasOutput => {
              if (hasOutput) {
                resolve({
                  success: true,
                  outputPath,
                  stdout,
                  stderr,
                  exitCode: code,
                  hasWarnings: true
                });
              } else {
                reject(new Error(`Osiris analysis failed with code ${code}: ${stderr}`));
              }
            });
          }
        });

        osirisProcess.on('error', (error) => {
          reject(new Error(`Failed to start Osiris: ${error.message}`));
        });

        // Set timeout for long-running analyses
        setTimeout(() => {
          if (!osirisProcess.killed) {
            osirisProcess.kill('SIGTERM');
            reject(new Error('Osiris analysis timed out after 10 minutes'));
          }
        }, 600000); // 10 minutes

      } catch (error) {
        reject(new Error(`Osiris execution setup failed: ${error.message}`));
      }
    });
  }

  /**
   * Create Osiris input file list
   */
  async createOsirisInputFile(inputDir, inputListFile) {
    try {
      const files = await fs.readdir(inputDir);
      const fsaFiles = files.filter(file => file.toLowerCase().endsWith('.fsa'));
      
      const fileList = fsaFiles.map(file => path.join(inputDir, file)).join('\n');
      await fs.writeFile(inputListFile, fileList);
      
      return fsaFiles.length;
    } catch (error) {
      throw new Error(`Failed to create input file list: ${error.message}`);
    }
  }

  /**
   * Check if Osiris produced output files
   */
  async checkForOutputFiles(outputPath) {
    try {
      const files = await fs.readdir(outputPath);
      const outputFiles = files.filter(file => 
        file.endsWith('.xml') || 
        file.endsWith('.osr') || 
        file.endsWith('.plt') ||
        file.endsWith('.tab')
      );
      
      return outputFiles.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse Osiris XML results
   */
  async parseOsirisResults(outputPath) {
    try {
      const xmlFiles = await fs.readdir(outputPath);
      const resultsFile = xmlFiles.find(file => file.endsWith('.xml') && file.includes('results'));
      
      if (!resultsFile) {
        throw new Error('No results XML file found');
      }

      const xmlPath = path.join(outputPath, resultsFile);
      const xmlContent = await fs.readFile(xmlPath, 'utf8');
      
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlContent);
      
      return this.extractSTRProfiles(result);
      
    } catch (error) {
      throw new Error(`Failed to parse Osiris results: ${error.message}`);
    }
  }

  /**
   * Extract STR profiles from parsed XML
   */
  extractSTRProfiles(xmlData) {
    const profiles = {};
    
    // This would parse the actual Osiris XML structure
    // Placeholder implementation
    if (xmlData.OsirisAnalysisReport && xmlData.OsirisAnalysisReport.Sample) {
      const samples = Array.isArray(xmlData.OsirisAnalysisReport.Sample) 
        ? xmlData.OsirisAnalysisReport.Sample 
        : [xmlData.OsirisAnalysisReport.Sample];

      samples.forEach(sample => {
        const sampleId = sample.$.Name;
        profiles[sampleId] = {
          sampleId,
          loci: this.extractLoci(sample)
        };
      });
    }
    
    return profiles;
  }

  /**
   * Extract loci data from sample
   */
  extractLoci(sample) {
    const loci = {};
    
    // Parse loci information from XML structure
    // Placeholder implementation
    if (sample.Locus) {
      const lociArray = Array.isArray(sample.Locus) ? sample.Locus : [sample.Locus];
      
      lociArray.forEach(locus => {
        const locusName = locus.$.Name;
        loci[locusName] = {
          allele1: locus.Allele && locus.Allele[0] ? locus.Allele[0].$.Value : null,
          allele2: locus.Allele && locus.Allele[1] ? locus.Allele[1].$.Value : null,
          peakHeight1: locus.Allele && locus.Allele[0] ? locus.Allele[0].$.Height : null,
          peakHeight2: locus.Allele && locus.Allele[1] ? locus.Allele[1].$.Height : null
        };
      });
    }
    
    return loci;
  }

  /**
   * Calculate paternity probability
   */
  async calculatePaternityProbability(profiles, caseData) {
    try {
      const father = profiles[caseData.samples.find(s => s.sampleType === 'alleged_father').sampleId];
      const child = profiles[caseData.samples.find(s => s.sampleType === 'child').sampleId];
      const mother = caseData.samples.find(s => s.sampleType === 'mother');
      const motherProfile = mother ? profiles[mother.sampleId] : null;

      let matchingLoci = 0;
      let totalLoci = 0;
      const lociComparison = {};

      // Compare each locus
      Object.keys(child.loci).forEach(locus => {
        if (father.loci[locus]) {
          totalLoci++;
          const childAlleles = [child.loci[locus].allele1, child.loci[locus].allele2];
          const fatherAlleles = [father.loci[locus].allele1, father.loci[locus].allele2];
          
          // Check if child has at least one allele matching father
          const hasMatch = childAlleles.some(childAllele => 
            fatherAlleles.includes(childAllele)
          );

          if (hasMatch) {
            matchingLoci++;
          }

          lociComparison[locus] = {
            child: childAlleles,
            father: fatherAlleles,
            mother: motherProfile ? [motherProfile.loci[locus]?.allele1, motherProfile.loci[locus]?.allele2] : null,
            match: hasMatch
          };
        }
      });

      // Calculate basic paternity probability
      // This is a simplified calculation - real forensic calculation is more complex
      const matchRatio = matchingLoci / totalLoci;
      let paternityProbability;
      
      if (matchRatio === 1.0) {
        paternityProbability = 99.99; // Inclusion
      } else if (matchRatio < 0.8) {
        paternityProbability = 0.01; // Exclusion
      } else {
        paternityProbability = matchRatio * 95; // Inconclusive
      }

      return {
        paternityProbability,
        exclusionProbability: 100 - paternityProbability,
        matchingLoci,
        totalLoci,
        lociComparison,
        conclusion: paternityProbability > 99 ? 'inclusion' : 
                   paternityProbability < 1 ? 'exclusion' : 'inconclusive'
      };

    } catch (error) {
      throw new Error(`Failed to calculate paternity probability: ${error.message}`);
    }
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus(caseId) {
    const outputPath = path.join(this.outputDir, caseId);
    
    try {
      const files = await fs.readdir(outputPath);
      const hasResults = files.some(file => file.includes('results') && file.endsWith('.xml'));
      
      return {
        status: hasResults ? 'completed' : 'in_progress',
        outputFiles: files,
        outputPath
      };
    } catch (error) {
      return {
        status: 'not_found',
        error: error.message
      };
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(caseId) {
    const tempPath = path.join(this.tempDir, caseId);
    
    try {
      await fs.rmdir(tempPath, { recursive: true });
    } catch (error) {
    }
  }
}

module.exports = OsirisIntegration;