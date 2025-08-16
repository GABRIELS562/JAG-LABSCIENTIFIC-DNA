const db = require('../services/database');
const GeneticTestDataGenerator = require('../utils/generateTestData');

async function loadTestData() {
  try {
    const generator = new GeneticTestDataGenerator();
    
    // Generate test cases
    const testCases = [
      generator.generateInclusionCase('PAT-2025-001'),
      generator.generateInclusionCase('PAT-2025-002'), 
      generator.generateExclusionCase('PAT-2025-003'),
      generator.generateInconclusiveCase('PAT-2025-004'),
      generator.generateInclusionCase('PAT-2025-005')
    ];

    // Load test cases into database
    for (const testCase of testCases) {
      // Create genetic case
      const caseResult = db.createGeneticCase({
        caseId: testCase.caseId,
        caseType: 'paternity',
        priority: 'normal',
        notes: `Test case - ${testCase.scenario} scenario`
      });

      // Create samples for each profile
      for (const [sampleType, profile] of Object.entries(testCase.profiles)) {
        const sampleId = `${testCase.caseId}_${sampleType}`;
        const adjustedSampleType = sampleType === 'father' ? 'alleged_father' : sampleType;
        
        // Create genetic sample
        const sampleResult = db.createGeneticSample({
          sampleId,
          caseId: testCase.caseId,
          sampleType: adjustedSampleType,
          filePath: `./test_data/${testCase.caseId}/${sampleId}.json`,
          originalFilename: `${sampleId}.fsa`,
          fileHash: 'test_hash_' + Math.random().toString(36).substr(2, 16),
          qualityScore: 85.0 + Math.random() * 10,
          instrument: 'ABI_3130xl',
          kit: 'PowerPlex_ESX_17'
        });

        `);

        // Create STR profiles
        for (const [locus, data] of Object.entries(profile)) {
          db.createSTRProfile({
            sampleId,
            locus,
            allele1: data.allele1,
            allele2: data.allele2,
            peakHeight1: data.peakHeight1,
            peakHeight2: data.peakHeight2
          });
        }

        .length} loci`);

        // Add file audit
        db.addGeneticFileAudit({
          sampleId,
          action: 'uploaded',
          details: `Test data - ${sampleId}.fsa uploaded`
        });

        // Add QC metrics
        db.addGeneticQCMetric({
          sampleId,
          metricName: 'overall_quality',
          metricValue: 85.0 + Math.random() * 10,
          passStatus: true
        });
      }

      // For inclusion cases, create analysis results
      if (testCase.scenario === 'inclusion') {
        const resultData = {
          caseId: testCase.caseId,
          paternityProbability: testCase.expectedProbability,
          exclusionProbability: 100 - testCase.expectedProbability,
          matchingLoci: 16,
          totalLoci: 16,
          conclusion: 'inclusion',
          osirisOutputPath: `./test_data/${testCase.caseId}/results`,
          qualityScore: 90.0
        };

        const analysisResult = db.createGeneticAnalysisResult(resultData);
        `);

        // Create loci comparisons
        const father = testCase.profiles.father;
        const child = testCase.profiles.child;
        const mother = testCase.profiles.mother;

        for (const locus of Object.keys(father)) {
          db.createLociComparison({
            resultId: analysisResult.lastInsertRowid,
            locus,
            childAllele1: child[locus].allele1,
            childAllele2: child[locus].allele2,
            fatherAllele1: father[locus].allele1,
            fatherAllele2: father[locus].allele2,
            motherAllele1: mother ? mother[locus].allele1 : null,
            motherAllele2: mother ? mother[locus].allele2 : null,
            matchStatus: true // For test data, assuming matches
          });
        }

        // Update case status
        db.updateGeneticCaseStatus(testCase.caseId, 'analysis_complete');
        
        .length} loci comparisons`);
      }

      }

    // Add some cases to Osiris queue for testing
    db.addToOsirisQueue('PAT-2025-004', 5); // Inconclusive case pending
    // Print summary
    const allCases = db.getAllGeneticCases();
    .length}`);
    .length}`);
    .length}`);

  } catch (error) {
    console.error('❌ Error loading test data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  loadTestData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to load test data:', error);
      process.exit(1);
    });
}

module.exports = loadTestData;