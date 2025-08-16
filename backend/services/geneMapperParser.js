const db = require('./database');
const { logger } = require('../utils/logger');

/**
 * GeneMapper ID Parser Service
 * Parses genetic analysis results from Applied Biosystems GeneMapper ID software
 * Handles STR (Short Tandem Repeat) profiles for paternity testing
 */
class GeneMapperParser {
  constructor() {
    // Standard STR loci used in paternity testing
    this.standardLoci = [
      'D3S1358', 'D1S1656', 'D2S441', 'D10S1248', 'D13S317', 'Penta_E',
      'D16S539', 'D18S51', 'D2S1338', 'CSF1PO', 'Penta_D', 'TH01',
      'vWA', 'D21S11', 'D7S820', 'D5S818', 'TPOX', 'D8S1179',
      'D12S391', 'D19S433', 'FGA', 'D22S1045', 'AMEL' // Amelogenin for sex determination
    ];

    // Allele frequency database (simplified - in production, use full database)
    this.alleleFrequencies = {
      'D3S1358': { '14': 0.134, '15': 0.254, '16': 0.234, '17': 0.195, '18': 0.142 },
      'vWA': { '14': 0.089, '15': 0.102, '16': 0.186, '17': 0.262, '18': 0.189, '19': 0.099 },
      'FGA': { '19': 0.055, '20': 0.125, '21': 0.165, '22': 0.184, '23': 0.133, '24': 0.140, '25': 0.095 },
      'D8S1179': { '10': 0.007, '11': 0.015, '12': 0.107, '13': 0.335, '14': 0.233, '15': 0.162 },
      'D21S11': { '28': 0.024, '29': 0.159, '30': 0.235, '31': 0.106, '31.2': 0.086, '32.2': 0.112 },
      'D18S51': { '12': 0.138, '13': 0.102, '14': 0.154, '15': 0.136, '16': 0.116, '17': 0.118 },
      'D5S818': { '9': 0.004, '10': 0.032, '11': 0.355, '12': 0.364, '13': 0.189 },
      'D13S317': { '8': 0.092, '9': 0.055, '10': 0.074, '11': 0.321, '12': 0.285, '13': 0.113 },
      'D7S820': { '7': 0.004, '8': 0.164, '9': 0.104, '10': 0.286, '11': 0.239, '12': 0.160 },
      'D16S539': { '8': 0.015, '9': 0.113, '10': 0.062, '11': 0.323, '12': 0.238, '13': 0.194 },
      'TH01': { '6': 0.231, '7': 0.189, '8': 0.095, '9': 0.113, '9.3': 0.364 },
      'TPOX': { '6': 0.002, '7': 0.002, '8': 0.537, '9': 0.089, '10': 0.046, '11': 0.265, '12': 0.043 },
      'CSF1PO': { '9': 0.012, '10': 0.213, '11': 0.316, '12': 0.368, '13': 0.075 }
    };
  }

  /**
   * Parse GeneMapper export file (tab-delimited text format)
   */
  async parseGeneMapperFile(fileContent, batchId) {
    try {
      const lines = fileContent.split('\n').filter(line => line.trim());
      const results = [];
      let headers = [];
      let dataStartIndex = 0;

      // Find data start (skip metadata lines)
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Sample Name') || lines[i].includes('Sample File')) {
          headers = lines[i].split('\t').map(h => h.trim());
          dataStartIndex = i + 1;
          break;
        }
      }

      // Parse each sample line
      for (let i = dataStartIndex; i < lines.length; i++) {
        const fields = lines[i].split('\t');
        if (fields.length < 3) continue;

        const sampleData = this.parseSampleLine(fields, headers);
        if (sampleData) {
          results.push(sampleData);
        }
      }

      // Group results by sample
      const groupedResults = this.groupBySample(results);
      
      // Store in database
      await this.storeResults(groupedResults, batchId);

      return {
        success: true,
        samplesProcessed: Object.keys(groupedResults).length,
        results: groupedResults
      };
    } catch (error) {
      logger.error('Error parsing GeneMapper file:', error);
      throw error;
    }
  }

  /**
   * Parse individual sample line from GeneMapper export
   */
  parseSampleLine(fields, headers) {
    const sampleNameIndex = headers.findIndex(h => h.includes('Sample'));
    const markerIndex = headers.findIndex(h => h.includes('Marker'));
    const allele1Index = headers.findIndex(h => h.includes('Allele 1'));
    const allele2Index = headers.findIndex(h => h.includes('Allele 2'));
    const heightIndex = headers.findIndex(h => h.includes('Height') || h.includes('Peak'));

    if (sampleNameIndex === -1 || markerIndex === -1) {
      return null;
    }

    return {
      sampleName: fields[sampleNameIndex],
      marker: fields[markerIndex],
      allele1: fields[allele1Index] || null,
      allele2: fields[allele2Index] || null,
      peakHeight: fields[heightIndex] || null
    };
  }

  /**
   * Group results by sample
   */
  groupBySample(results) {
    const grouped = {};
    
    for (const result of results) {
      if (!grouped[result.sampleName]) {
        grouped[result.sampleName] = {
          sampleName: result.sampleName,
          profile: {}
        };
      }
      
      grouped[result.sampleName].profile[result.marker] = {
        allele1: result.allele1,
        allele2: result.allele2,
        peakHeight: result.peakHeight
      };
    }

    return grouped;
  }

  /**
   * Calculate paternity index for a single locus
   */
  calculateLocusPI(childAlleles, motherAlleles, allegedFatherAlleles, locus) {
    try {
      const frequencies = this.alleleFrequencies[locus];
      if (!frequencies) {
        // Use default frequency if locus not in database
        return 1.0;
      }

      const [childA1, childA2] = childAlleles;
      const [motherA1, motherA2] = motherAlleles || [null, null];
      const [fatherA1, fatherA2] = allegedFatherAlleles;

      // Determine which allele child inherited from father
      let paternalAllele = null;
      if (motherA1 && childA1 !== motherA1 && childA1 !== motherA2) {
        paternalAllele = childA1;
      } else if (motherA2 && childA2 !== motherA1 && childA2 !== motherA2) {
        paternalAllele = childA2;
      } else {
        // Ambiguous case - use the less common allele
        const freq1 = frequencies[childA1] || 0.01;
        const freq2 = frequencies[childA2] || 0.01;
        paternalAllele = freq1 < freq2 ? childA1 : childA2;
      }

      // Calculate probability alleged father could transmit this allele
      let probTransmit = 0;
      if (fatherA1 === paternalAllele || fatherA2 === paternalAllele) {
        probTransmit = fatherA1 === fatherA2 ? 1.0 : 0.5;
      } else {
        return 0; // Exclusion - alleged father doesn't have the required allele
      }

      // Population frequency of the paternal allele
      const popFrequency = frequencies[paternalAllele] || 0.01;

      // Paternity Index = P(child inherits from AF) / P(child inherits from random man)
      const PI = probTransmit / popFrequency;

      return PI;
    } catch (error) {
      logger.error(`Error calculating PI for locus ${locus}:`, error);
      return 1.0;
    }
  }

  /**
   * Calculate Combined Paternity Index (CPI) and probability
   */
  calculatePaternityProbability(childProfile, motherProfile, allegedFatherProfile) {
    let combinedPI = 1.0;
    const locusResults = [];
    let exclusions = 0;

    for (const locus of this.standardLoci) {
      if (locus === 'AMEL') continue; // Skip sex determination marker

      const childData = childProfile[locus];
      const motherData = motherProfile ? motherProfile[locus] : null;
      const fatherData = allegedFatherProfile[locus];

      if (!childData || !fatherData) continue;

      const childAlleles = [childData.allele1, childData.allele2];
      const motherAlleles = motherData ? [motherData.allele1, motherData.allele2] : null;
      const fatherAlleles = [fatherData.allele1, fatherData.allele2];

      const locusPI = this.calculateLocusPI(childAlleles, motherAlleles, fatherAlleles, locus);
      
      if (locusPI === 0) {
        exclusions++;
      }

      combinedPI *= locusPI;
      
      locusResults.push({
        locus,
        childAlleles,
        motherAlleles,
        fatherAlleles,
        PI: locusPI,
        excluded: locusPI === 0
      });
    }

    // Calculate probability of paternity
    // Using prior probability of 0.5 (50%)
    const priorProb = 0.5;
    const probability = (combinedPI * priorProb) / ((combinedPI * priorProb) + (1 - priorProb));

    return {
      CPI: combinedPI,
      probability: probability * 100, // Convert to percentage
      exclusions,
      locusResults,
      conclusion: exclusions > 0 ? 'EXCLUDED' : 
                  probability > 99.99 ? 'NOT EXCLUDED (>99.99%)' :
                  probability > 99.9 ? 'NOT EXCLUDED (>99.9%)' :
                  probability > 99.0 ? 'NOT EXCLUDED (>99.0%)' :
                  'INCONCLUSIVE'
    };
  }

  /**
   * Store parsed results in database
   */
  async storeResults(groupedResults, batchId) {
    const transaction = db.db.transaction(() => {
      for (const [sampleName, data] of Object.entries(groupedResults)) {
        // Find sample by lab number
        const sample = db.db.prepare(
          'SELECT id, case_number FROM samples WHERE lab_number = ?'
        ).get(sampleName);

        if (!sample) {
          logger.warn(`Sample ${sampleName} not found in database`);
          continue;
        }

        // Store STR profile
        for (const [locus, alleles] of Object.entries(data.profile)) {
          if (locus === 'AMEL') {
            // Store sex determination separately
            const sex = alleles.allele1 === 'X' && alleles.allele2 === 'Y' ? 'M' : 'F';
            db.db.prepare(
              'UPDATE samples SET gender = ? WHERE id = ?'
            ).run(sex, sample.id);
            continue;
          }

          const insertSTR = db.db.prepare(`
            INSERT INTO str_profiles (
              sample_id, case_number, locus, allele1, allele2, 
              peak_height, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `);

          insertSTR.run(
            sample.id,
            sample.case_number,
            locus,
            alleles.allele1,
            alleles.allele2,
            alleles.peakHeight
          );
        }

        // Update sample status
        db.db.prepare(
          'UPDATE samples SET workflow_status = ? WHERE id = ?'
        ).run('analysis_completed', sample.id);

        // Create genetic analysis result
        const insertResult = db.db.prepare(`
          INSERT INTO genetic_analysis_results (
            sample_id, analysis_type, result_data, status, 
            analyzed_by, created_at
          ) VALUES (?, 'STR_PROFILE', ?, 'completed', 'GeneMapper', CURRENT_TIMESTAMP)
        `);

        insertResult.run(sample.id, JSON.stringify(data.profile));
      }
    });

    try {
      transaction();
      logger.info(`Stored GeneMapper results for ${Object.keys(groupedResults).length} samples`);
      return true;
    } catch (error) {
      logger.error('Error storing GeneMapper results:', error);
      throw error;
    }
  }

  /**
   * Perform paternity analysis for a case
   */
  async analyzePaternityCase(caseNumber) {
    try {
      // Get all samples for this case
      const samples = db.db.prepare(`
        SELECT s.*, 
               (SELECT GROUP_CONCAT(
                  json_object('locus', locus, 'allele1', allele1, 'allele2', allele2)
               ) FROM str_profiles WHERE sample_id = s.id) as str_data
        FROM samples s
        WHERE s.case_number = ?
      `).all(caseNumber);

      if (samples.length < 2) {
        return { error: 'Insufficient samples for paternity analysis' };
      }

      // Parse STR profiles
      const profiles = {};
      for (const sample of samples) {
        if (sample.str_data) {
          const strArray = sample.str_data.split(',').map(s => JSON.parse(s));
          const profile = {};
          for (const str of strArray) {
            profile[str.locus] = {
              allele1: str.allele1,
              allele2: str.allele2
            };
          }
          profiles[sample.relation] = profile;
        }
      }

      // Find child, mother, and alleged father
      const childProfile = profiles['child'] || profiles['Child'];
      const motherProfile = profiles['mother'] || profiles['Mother'];
      const fatherProfile = profiles['alleged_father'] || profiles['Alleged Father'] || profiles['Father'];

      if (!childProfile || !fatherProfile) {
        return { error: 'Missing required profiles (child and alleged father)' };
      }

      // Calculate paternity
      const result = this.calculatePaternityProbability(childProfile, motherProfile, fatherProfile);

      // Store result
      const insertAnalysis = db.db.prepare(`
        INSERT INTO genetic_cases (
          case_number, analysis_type, result, probability, 
          exclusions, status, created_at
        ) VALUES (?, 'PATERNITY', ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
      `);

      insertAnalysis.run(
        caseNumber,
        result.conclusion,
        result.probability,
        result.exclusions
      );

      return result;
    } catch (error) {
      logger.error('Error analyzing paternity case:', error);
      throw error;
    }
  }
}

module.exports = new GeneMapperParser();