const fs = require('fs').promises;
const path = require('path');

/**
 * Generate realistic test data for genetic analysis
 */
class GeneticTestDataGenerator {
  constructor() {
    // Standard STR loci for paternity testing
    this.strLoci = [
      'D3S1358', 'vWA', 'D16S539', 'CSF1PO', 'TPOX',
      'D8S1179', 'D21S11', 'D18S51', 'D2S441', 'D19S433',
      'TH01', 'FGA', 'D22S1045', 'D5S818', 'D13S317',
      'D7S820', 'SE33', 'D10S1248', 'D1S1656', 'D12S391'
    ];

    // Common allele ranges for each locus
    this.alleleRanges = {
      'D3S1358': ['12', '13', '14', '15', '16', '17', '18', '19'],
      'vWA': ['11', '14', '15', '16', '17', '18', '19', '20', '21'],
      'D16S539': ['5', '8', '9', '10', '11', '12', '13', '14', '15'],
      'CSF1PO': ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15'],
      'TPOX': ['6', '7', '8', '9', '10', '11', '12', '13'],
      'D8S1179': ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17'],
      'D21S11': ['24.2', '25', '26', '27', '28', '29', '30', '31', '32', '33'],
      'D18S51': ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
      'D2S441': ['8', '9', '10', '11', '12', '13', '14', '15', '16'],
      'D19S433': ['9', '10', '11', '12', '13', '14', '15', '16', '17'],
      'TH01': ['4', '5', '6', '7', '8', '9', '9.3', '10'],
      'FGA': ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26'],
      'D22S1045': ['8', '9', '10', '11', '12', '13', '14', '15', '16'],
      'D5S818': ['7', '8', '9', '10', '11', '12', '13', '14', '15'],
      'D13S317': ['8', '9', '10', '11', '12', '13', '14', '15'],
      'D7S820': ['6', '7', '8', '9', '10', '11', '12', '13', '14'],
      'SE33': ['6.3', '9', '10', '11', '12', '13', '14', '15', '16'],
      'D10S1248': ['8', '9', '10', '11', '12', '13', '14', '15', '16'],
      'D1S1656': ['9', '10', '11', '12', '13', '14', '15', '16', '17'],
      'D12S391': ['15', '16', '17', '18', '19', '20', '21', '22', '23']
    };
  }

  /**
   * Generate a random STR profile
   */
  generateSTRProfile(inheritFrom = null, mutationRate = 0.01) {
    const profile = {};

    for (const locus of this.strLoci) {
      const possibleAlleles = this.alleleRanges[locus];
      
      if (inheritFrom && Math.random() > mutationRate) {
        // Inherit one allele from parent (for child profiles)
        const parentProfile = inheritFrom[locus];
        const inheritedAllele = Math.random() < 0.5 ? parentProfile.allele1 : parentProfile.allele2;
        const randomAllele = possibleAlleles[Math.floor(Math.random() * possibleAlleles.length)];
        
        profile[locus] = {
          allele1: inheritedAllele,
          allele2: randomAllele,
          peakHeight1: Math.floor(Math.random() * 3000) + 500,
          peakHeight2: Math.floor(Math.random() * 3000) + 500
        };
      } else {
        // Generate random profile
        const allele1 = possibleAlleles[Math.floor(Math.random() * possibleAlleles.length)];
        const allele2 = possibleAlleles[Math.floor(Math.random() * possibleAlleles.length)];
        
        profile[locus] = {
          allele1,
          allele2,
          peakHeight1: Math.floor(Math.random() * 3000) + 500,
          peakHeight2: Math.floor(Math.random() * 3000) + 500
        };
      }
    }

    return profile;
  }

  /**
   * Generate paternity case with inclusion scenario
   */
  generateInclusionCase(caseId) {
    // Generate father profile
    const fatherProfile = this.generateSTRProfile();
    
    // Generate mother profile
    const motherProfile = this.generateSTRProfile();
    
    // Generate child profile inheriting from father
    const childProfile = this.generateSTRProfile(fatherProfile, 0.005); // Low mutation rate
    
    // Ensure child also inherits from mother for some loci
    for (const locus of this.strLoci.slice(0, 10)) {
      if (Math.random() < 0.5) {
        const motherAllele = Math.random() < 0.5 ? 
          motherProfile[locus].allele1 : motherProfile[locus].allele2;
        childProfile[locus].allele2 = motherAllele;
      }
    }

    return {
      caseId,
      scenario: 'inclusion',
      expectedProbability: 99.99,
      profiles: {
        father: fatherProfile,
        mother: motherProfile,
        child: childProfile
      }
    };
  }

  /**
   * Generate paternity case with exclusion scenario
   */
  generateExclusionCase(caseId) {
    // Generate completely unrelated profiles
    const fatherProfile = this.generateSTRProfile();
    const motherProfile = this.generateSTRProfile();
    const childProfile = this.generateSTRProfile();

    return {
      caseId,
      scenario: 'exclusion',
      expectedProbability: 0.01,
      profiles: {
        father: fatherProfile,
        mother: motherProfile,
        child: childProfile
      }
    };
  }

  /**
   * Generate inconclusive case with mutations
   */
  generateInconclusiveCase(caseId) {
    const fatherProfile = this.generateSTRProfile();
    const motherProfile = this.generateSTRProfile();
    
    // Generate child with higher mutation rate
    const childProfile = this.generateSTRProfile(fatherProfile, 0.15);

    return {
      caseId,
      scenario: 'inconclusive',
      expectedProbability: 85.5,
      profiles: {
        father: fatherProfile,
        mother: motherProfile,
        child: childProfile
      }
    };
  }

  /**
   * Generate mock FSA file content
   */
  generateMockFSAContent(profile, sampleName) {
    // This would generate actual FSA binary content
    // For now, return metadata structure
    return {
      sampleName,
      instrument: 'ABI_3130xl',
      kit: 'PowerPlex_ESX_17',
      runDate: new Date().toISOString(),
      profile,
      traces: this.generateMockTraceData()
    };
  }

  /**
   * Generate mock electropherogram trace data
   */
  generateMockTraceData() {
    const traces = {};
    const channels = ['FAM', 'VIC', 'NED', 'PET'];
    const dataPoints = 5000;

    channels.forEach(channel => {
      const trace = [];
      let baseline = 50 + Math.random() * 50;
      
      for (let i = 0; i < dataPoints; i++) {
        let value = baseline + (Math.random() - 0.5) * 20;
        
        // Add peaks for STR alleles
        if (Math.random() < 0.002) {
          value += Math.random() * 2000 + 500; // Peak
        }
        
        trace.push(Math.max(0, Math.floor(value)));
      }
      
      traces[channel] = trace;
    });

    return traces;
  }

  /**
   * Create test dataset
   */
  async createTestDataset(outputDir = './test_data') {
    try {
      await fs.mkdir(outputDir, { recursive: true });

      const testCases = [
        this.generateInclusionCase('PAT-2025-001'),
        this.generateInclusionCase('PAT-2025-002'),
        this.generateExclusionCase('PAT-2025-003'),
        this.generateInconclusiveCase('PAT-2025-004'),
        this.generateInclusionCase('PAT-2025-005')
      ];

      for (const testCase of testCases) {
        const caseDir = path.join(outputDir, testCase.caseId);
        await fs.mkdir(caseDir, { recursive: true });

        // Generate sample files
        for (const [sampleType, profile] of Object.entries(testCase.profiles)) {
          const sampleName = `${testCase.caseId}_${sampleType}`;
          const fsaContent = this.generateMockFSAContent(profile, sampleName);
          
          // Save as JSON for testing (real implementation would create binary FSA)
          const filePath = path.join(caseDir, `${sampleName}.json`);
          await fs.writeFile(filePath, JSON.stringify(fsaContent, null, 2));
        }

        // Save case metadata
        const metadataPath = path.join(caseDir, 'case_metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify({
          caseId: testCase.caseId,
          scenario: testCase.scenario,
          expectedProbability: testCase.expectedProbability,
          created: new Date().toISOString(),
          description: `Test case for ${testCase.scenario} scenario`
        }, null, 2));
      }

      return testCases;

    } catch (error) {
      console.error('Failed to create test dataset:', error);
      throw error;
    }
  }

  /**
   * Generate SQL insert statements for test data
   */
  generateTestDataSQL(testCases) {
    let sql = '-- Test data for genetic analysis\n\n';

    for (const testCase of testCases) {
      // Insert case
      sql += `INSERT INTO genetic_cases (case_id, case_type, status, notes) VALUES ('${testCase.caseId}', 'paternity', 'pending', 'Test case - ${testCase.scenario}');\n`;

      // Insert samples
      Object.keys(testCase.profiles).forEach(sampleType => {
        const sampleId = `${testCase.caseId}_${sampleType}`;
        sql += `INSERT INTO genetic_samples (sample_id, case_id, sample_type, file_path, quality_score, instrument, kit) VALUES ('${sampleId}', '${testCase.caseId}', '${sampleType === 'father' ? 'alleged_father' : sampleType}', './test_data/${testCase.caseId}/${sampleId}.json', 85.0, 'ABI_3130xl', 'PowerPlex_ESX_17');\n`;

        // Insert STR profiles
        const profile = testCase.profiles[sampleType];
        Object.entries(profile).forEach(([locus, data]) => {
          sql += `INSERT INTO str_profiles (sample_id, locus, allele_1, allele_2, peak_height_1, peak_height_2) VALUES ('${sampleId}', '${locus}', '${data.allele1}', '${data.allele2}', ${data.peakHeight1}, ${data.peakHeight2});\n`;
        });
      });

      sql += '\n';
    }

    return sql;
  }
}

// If run directly, generate test data
if (require.main === module) {
  const generator = new GeneticTestDataGenerator();
  
  generator.createTestDataset().then(testCases => {
    // Generate SQL
    const sql = generator.generateTestDataSQL(testCases);
    return fs.writeFile('./test_data/insert_test_data.sql', sql);
  }).then(() => {
    }).catch(error => {
    console.error('Error generating test data:', error);
  });
}

module.exports = GeneticTestDataGenerator;