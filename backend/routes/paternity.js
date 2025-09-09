const express = require('express');
const router = express.Router();
const PaternityCalculator = require('../services/paternityCalculator');
const { logger } = require('../utils/logger');
const { ResponseHandler } = require('../utils/responseHandler');
const db = require('../services/database');

// Initialize paternity calculator
const paternityCalc = new PaternityCalculator();

/**
 * Calculate paternity probability for a case
 * POST /api/paternity/calculate
 */
router.post('/calculate', async (req, res) => {
  try {
    const { caseId, profiles, caseInfo } = req.body;

    if (!profiles || profiles.length === 0) {
      return ResponseHandler.error(res, 'No genetic profiles provided', null, 400);
    }

    // Calculate CPI and probability
    const results = paternityCalc.calculateCPI(profiles);
    
    // Generate report
    const report = paternityCalc.generateReport(
      caseInfo || { caseNumber: caseId },
      profiles,
      results
    );

    // Store results in database
    if (caseId) {
      try {
        await db.run(`
          INSERT INTO paternity_calculations 
          (case_id, cpi, probability, conclusion, report_data, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
          caseId,
          results.cpi,
          results.probabilityOfPaternity,
          results.conclusion,
          JSON.stringify(report)
        );
      } catch (dbError) {
        // Table might not exist, create it
        await db.exec(`
          CREATE TABLE IF NOT EXISTS paternity_calculations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id INTEGER,
            cpi REAL,
            probability REAL,
            conclusion TEXT,
            report_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (case_id) REFERENCES test_cases(id)
          )
        `);
        
        // Retry insert
        await db.run(`
          INSERT INTO paternity_calculations 
          (case_id, cpi, probability, conclusion, report_data, created_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
          caseId,
          results.cpi,
          results.probabilityOfPaternity,
          results.conclusion,
          JSON.stringify(report)
        );
      }
    }

    logger.info('Paternity calculation completed', {
      caseId,
      cpi: results.cpi,
      probability: results.probabilityPercentage,
      conclusion: results.conclusion
    });

    ResponseHandler.success(res, {
      results,
      report
    }, 'Paternity calculation completed successfully');

  } catch (error) {
    logger.error('Paternity calculation failed', { error: error.message });
    ResponseHandler.error(res, 'Failed to calculate paternity', error);
  }
});

/**
 * Get genetic profiles for a case
 * GET /api/paternity/case/:caseId/profiles
 */
router.get('/case/:caseId/profiles', async (req, res) => {
  try {
    const { caseId } = req.params;

    // Get all samples for the case
    const samples = await db.all(`
      SELECT 
        s.id,
        s.lab_number,
        s.relation,
        s.name,
        s.surname,
        tc.case_number
      FROM samples s
      JOIN test_cases tc ON s.case_id = tc.id
      WHERE s.case_id = ?
    `, caseId);

    if (samples.length === 0) {
      return ResponseHandler.error(res, 'No samples found for this case', null, 404);
    }

    // Get genetic profiles for each sample
    const sampleProfiles = {};
    
    for (const sample of samples) {
      const profiles = await db.all(`
        SELECT 
          sample_id,
          locus,
          allele1,
          allele2,
          quality_score
        FROM genetic_profiles
        WHERE sample_id = ?
        ORDER BY locus
      `, sample.id);
      sampleProfiles[sample.relation] = {
        sampleId: sample.id,
        labNumber: sample.lab_number,
        name: `${sample.name} ${sample.surname}`,
        relation: sample.relation,
        profiles: profiles
      };
    }

    // Structure data for paternity calculation
    const child = sampleProfiles['child'];
    const mother = sampleProfiles['mother'];
    const father = sampleProfiles['alleged_father'] || sampleProfiles['father'];

    if (!child || !father) {
      return ResponseHandler.error(res, 'Missing required profiles (child and alleged father)', null, 400);
    }

    // Format profiles for calculation
    const formattedProfiles = [];
    const loci = [...new Set(child.profiles.map(p => p.locus))];

    for (const locus of loci) {
      const childProfile = child.profiles.find(p => p.locus === locus);
      const motherProfile = mother ? mother.profiles.find(p => p.locus === locus) : null;
      const fatherProfile = father.profiles.find(p => p.locus === locus);

      if (childProfile && fatherProfile) {
        formattedProfiles.push({
          locus,
          child: {
            allele1: childProfile.allele1,
            allele2: childProfile.allele2
          },
          mother: motherProfile ? {
            allele1: motherProfile.allele1,
            allele2: motherProfile.allele2
          } : {
            allele1: '0',
            allele2: '0'
          },
          allegedFather: {
            allele1: fatherProfile.allele1,
            allele2: fatherProfile.allele2
          }
        });
      }
    }

    ResponseHandler.success(res, {
      caseNumber: samples[0].case_number,
      participants: {
        child: child ? child.name : null,
        mother: mother ? mother.name : null,
        allegedFather: father ? father.name : null
      },
      profiles: formattedProfiles,
      locusCount: formattedProfiles.length
    }, 'Genetic profiles retrieved successfully');

  } catch (error) {
    logger.error('Failed to retrieve genetic profiles', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve genetic profiles', error);
  }
});

/**
 * Validate trio relationship
 * POST /api/paternity/validate-trio
 */
router.post('/validate-trio', async (req, res) => {
  try {
    const { profiles } = req.body;

    if (!profiles || profiles.length === 0) {
      return ResponseHandler.error(res, 'No profiles provided for validation', null, 400);
    }

    const validation = paternityCalc.validateTrio(profiles);

    ResponseHandler.success(res, validation, 'Trio validation completed');

  } catch (error) {
    logger.error('Trio validation failed', { error: error.message });
    ResponseHandler.error(res, 'Failed to validate trio', error);
  }
});

/**
 * Get allele frequencies for a locus
 * GET /api/paternity/frequencies/:locus
 */
router.get('/frequencies/:locus', (req, res) => {
  try {
    const { locus } = req.params;
    const frequencies = paternityCalc.alleleFrequencies[locus];

    if (!frequencies) {
      return ResponseHandler.error(res, 'Locus not found in frequency database', null, 404);
    }

    ResponseHandler.success(res, {
      locus,
      frequencies,
      population: 'Caucasian (Example)',
      source: 'Butler Forensic DNA Typing'
    }, 'Allele frequencies retrieved');

  } catch (error) {
    logger.error('Failed to retrieve allele frequencies', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve frequencies', error);
  }
});

/**
 * Get previous calculations for a case
 * GET /api/paternity/case/:caseId/calculations
 */
router.get('/case/:caseId/calculations', async (req, res) => {
  try {
    const { caseId } = req.params;

    const calculations = await db.all(`
      SELECT 
        id,
        cpi,
        probability,
        conclusion,
        report_data,
        created_at
      FROM paternity_calculations
      WHERE case_id = ?
      ORDER BY created_at DESC
    `, caseId);

    ResponseHandler.success(res, calculations.map(calc => ({
      ...calc,
      report_data: JSON.parse(calc.report_data || '{}')
    })), 'Calculations retrieved successfully');

  } catch (error) {
    logger.error('Failed to retrieve calculations', { error: error.message });
    ResponseHandler.error(res, 'Failed to retrieve calculations', error);
  }
});

/**
 * Simulate paternity test for a case (for demo purposes)
 * POST /api/paternity/simulate/:caseId
 */
router.post('/simulate/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { isPaternity = true } = req.body; // Simulate true or false paternity

    // Get case info
    const caseInfo = await db.get(`
      SELECT case_number, ref_kit_number
      FROM test_cases
      WHERE id = ?
    `, caseId);

    if (!caseInfo) {
      return ResponseHandler.error(res, 'Case not found', null, 404);
    }

    // Generate simulated profiles
    const loci = paternityCalc.strLoci;
    const profiles = [];

    for (const locus of loci) {
      const motherAlleles = generateRandomAlleles(locus);
      const fatherAlleles = generateRandomAlleles(locus);
      
      // Generate child alleles based on inheritance
      let childAlleles;
      if (isPaternity) {
        // True paternity - child inherits from both parents
        childAlleles = [
          motherAlleles[Math.floor(Math.random() * 2)],
          fatherAlleles[Math.floor(Math.random() * 2)]
        ];
      } else {
        // Not the father - random alleles with one from mother
        childAlleles = [
          motherAlleles[Math.floor(Math.random() * 2)],
          generateRandomAlleles(locus)[0]
        ];
      }

      profiles.push({
        locus,
        child: {
          allele1: childAlleles[0],
          allele2: childAlleles[1]
        },
        mother: {
          allele1: motherAlleles[0],
          allele2: motherAlleles[1]
        },
        allegedFather: {
          allele1: fatherAlleles[0],
          allele2: fatherAlleles[1]
        }
      });
    }

    // Calculate paternity
    const results = paternityCalc.calculateCPI(profiles);
    
    // Generate report
    const report = paternityCalc.generateReport(
      {
        caseNumber: caseInfo.case_number,
        childName: 'Child Sample',
        motherName: 'Mother Sample',
        allegedFatherName: 'Alleged Father Sample'
      },
      profiles,
      results
    );

    logger.info('Simulated paternity test completed', {
      caseId,
      isPaternity,
      conclusion: results.conclusion
    });

    ResponseHandler.success(res, {
      simulation: true,
      designedOutcome: isPaternity ? 'paternity' : 'exclusion',
      results,
      report
    }, 'Paternity simulation completed');

  } catch (error) {
    logger.error('Paternity simulation failed', { error: error.message });
    ResponseHandler.error(res, 'Failed to simulate paternity test', error);
  }
});

// Helper function to generate random alleles for simulation
function generateRandomAlleles(locus) {
  const commonAlleles = {
    'D3S1358': ['14', '15', '16', '17', '18'],
    'TH01': ['6', '7', '8', '9', '9.3'],
    'D21S11': ['28', '29', '30', '31', '32.2'],
    'vWA': ['14', '16', '17', '18', '19'],
    'FGA': ['20', '21', '22', '23', '24'],
    'default': ['10', '11', '12', '13', '14', '15']
  };

  const alleles = commonAlleles[locus] || commonAlleles.default;
  const allele1 = alleles[Math.floor(Math.random() * alleles.length)];
  const allele2 = alleles[Math.floor(Math.random() * alleles.length)];
  
  return [allele1, allele2];
}

module.exports = router;