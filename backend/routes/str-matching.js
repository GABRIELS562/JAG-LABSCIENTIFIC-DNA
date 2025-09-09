const express = require('express');
const router = express.Router();
const STRProfileMatcher = require('../services/strProfileMatcher');
const { logger } = require('../utils/logger');
const { ResponseHandler } = require('../utils/responseHandler');
const db = require('../services/database');

// Initialize services
const matcher = new STRProfileMatcher();

/**
 * Compare two STR profiles
 * POST /api/str-matching/compare
 */
router.post('/compare', async (req, res) => {
  try {
    const { profile1, profile2, stringency = 'moderate', info1, info2 } = req.body;

    if (!profile1 || !profile2) {
      return ResponseHandler.error(res, 'Two profiles required for comparison', null, 400);
    }

    // Perform comparison
    const comparison = matcher.compareProfiles(profile1, profile2, stringency);
    
    // Generate report if info provided
    let report = null;
    if (info1 && info2) {
      report = matcher.generateMatchReport(comparison, info1, info2);
    }

    // Store comparison result
    try {
      const stmt = db.prepare(`
        INSERT INTO profile_comparisons 
        (comparison_type, match_score, matching_loci, total_loci, 
         likelihood_ratio, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(
        'direct_comparison',
        comparison.matchScore,
        comparison.matchingLoci,
        comparison.totalLoci,
        comparison.likelihoodRatio,
        JSON.stringify(comparison)
      );
    } catch (dbError) {
      logger.warn('Could not store comparison result', { error: dbError.message });
    }

    ResponseHandler.success(res, {
      comparison,
      report
    }, 'Profile comparison completed');

  } catch (error) {
    logger.error('Profile comparison failed', { error: error.message });
    ResponseHandler.error(res, 'Failed to compare profiles', error);
  }
});

/**
 * Kinship analysis between two profiles
 * POST /api/str-matching/kinship
 */
router.post('/kinship', async (req, res) => {
  try {
    const { profile1, profile2, relationship = 'full-sibling' } = req.body;

    if (!profile1 || !profile2) {
      return ResponseHandler.error(res, 'Two profiles required for kinship analysis', null, 400);
    }

    // Perform kinship analysis
    const analysis = matcher.analyzeKinship(profile1, profile2, relationship);

    // Store result
    try {
      const stmt = db.prepare(`
        INSERT INTO profile_comparisons 
        (comparison_type, likelihood_ratio, relationship_probability, 
         details, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(
        `kinship_${relationship}`,
        analysis.combinedLR,
        analysis.interpretation,
        JSON.stringify(analysis)
      );
    } catch (dbError) {
      logger.warn('Could not store kinship analysis', { error: dbError.message });
    }

    ResponseHandler.success(res, analysis, 'Kinship analysis completed');

  } catch (error) {
    logger.error('Kinship analysis failed', { error: error.message });
    ResponseHandler.error(res, 'Failed to analyze kinship', error);
  }
});

/**
 * Analyze DNA mixture
 * POST /api/str-matching/mixture
 */
router.post('/mixture', async (req, res) => {
  try {
    const { mixtureProfile, referenceProfiles = [] } = req.body;

    if (!mixtureProfile) {
      return ResponseHandler.error(res, 'Mixture profile required', null, 400);
    }

    // Analyze mixture
    const analysis = matcher.analyzeMixture(mixtureProfile, referenceProfiles);

    // Store result
    try {
      const stmt = db.prepare(`
        INSERT INTO mixture_analysis 
        (num_contributors, major_profile, minor_profiles, mixture_ratio, 
         interpretation, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(
        analysis.estimatedContributors,
        JSON.stringify(analysis.majorContributor),
        JSON.stringify(analysis.minorContributors),
        analysis.mixtureRatio,
        analysis.interpretation
      );
    } catch (dbError) {
      logger.warn('Could not store mixture analysis', { error: dbError.message });
    }

    ResponseHandler.success(res, analysis, 'Mixture analysis completed');

  } catch (error) {
    logger.error('Mixture analysis failed', { error: error.message });
    ResponseHandler.error(res, 'Failed to analyze mixture', error);
  }
});

/**
 * Search profile database
 * POST /api/str-matching/search
 */
router.post('/search', async (req, res) => {
  try {
    const { queryProfile, stringency = 'moderate' } = req.body;

    if (!queryProfile) {
      return ResponseHandler.error(res, 'Query profile required', null, 400);
    }

    // Search database
    const matches = await matcher.searchDatabase(queryProfile, stringency);

    ResponseHandler.success(res, {
      totalMatches: matches.length,
      matches: matches.slice(0, 100), // Limit to top 100 matches
      searchCriteria: stringency
    }, 'Database search completed');

  } catch (error) {
    logger.error('Database search failed', { error: error.message });
    ResponseHandler.error(res, 'Failed to search database', error);
  }
});

/**
 * Add profile to database
 * POST /api/str-matching/database/add
 */
router.post('/database/add', async (req, res) => {
  try {
    const { profileId, profile, metadata } = req.body;

    if (!profileId || !profile) {
      return ResponseHandler.error(res, 'Profile ID and data required', null, 400);
    }

    const result = matcher.addToDatabase(profileId, profile, metadata);

    if (result.success) {
      ResponseHandler.success(res, result, 'Profile added to database');
    } else {
      ResponseHandler.error(res, 'Failed to add profile', result.error);
    }

  } catch (error) {
    logger.error('Failed to add profile to database', { error: error.message });
    ResponseHandler.error(res, 'Failed to add profile', error);
  }
});

/**
 * Get all kinship relationships
 * GET /api/str-matching/relationships
 */
router.get('/relationships', (req, res) => {
  const relationships = [
    { value: 'parent-child', label: 'Parent-Child', description: 'Biological parent and offspring' },
    { value: 'full-sibling', label: 'Full Siblings', description: 'Share both parents' },
    { value: 'half-sibling', label: 'Half Siblings', description: 'Share one parent' },
    { value: 'grandparent', label: 'Grandparent-Grandchild', description: 'Two generation separation' },
    { value: 'avuncular', label: 'Aunt/Uncle-Niece/Nephew', description: 'Avuncular relationship' },
    { value: 'first-cousin', label: 'First Cousins', description: 'Share grandparents' },
    { value: 'unrelated', label: 'Unrelated', description: 'No biological relationship' }
  ];

  ResponseHandler.success(res, relationships, 'Available relationships');
});

/**
 * Get match stringency levels
 * GET /api/str-matching/stringency-levels
 */
router.get('/stringency-levels', (req, res) => {
  const levels = [
    { 
      value: 'exact', 
      label: 'Exact Match', 
      description: 'Requires perfect match at all loci',
      tolerance: 0,
      requiredLoci: 13
    },
    { 
      value: 'stringent', 
      label: 'Stringent', 
      description: 'High confidence matching with minimal tolerance',
      tolerance: 0.5,
      requiredLoci: 13
    },
    { 
      value: 'moderate', 
      label: 'Moderate', 
      description: 'Standard forensic matching criteria',
      tolerance: 1.0,
      requiredLoci: 10
    },
    { 
      value: 'search', 
      label: 'Database Search', 
      description: 'Relaxed criteria for investigative leads',
      tolerance: 2.0,
      requiredLoci: 8
    }
  ];

  ResponseHandler.success(res, levels, 'Stringency levels');
});

/**
 * Simulate profiles for testing
 * POST /api/str-matching/simulate
 */
router.post('/simulate', (req, res) => {
  try {
    const { relationship = 'unrelated', numLoci = 16 } = req.body;

    // Generate two profiles based on relationship
    const profile1 = generateRandomProfile(numLoci);
    let profile2;

    switch (relationship) {
      case 'identical':
        // Identical profiles
        profile2 = { ...profile1 };
        break;
        
      case 'parent-child':
        // Child inherits one allele from parent at each locus
        profile2 = {};
        for (const locus in profile1) {
          const parentAlleles = [profile1[locus].allele1, profile1[locus].allele2];
          const inherited = parentAlleles[Math.floor(Math.random() * 2)];
          const other = generateRandomAllele(locus);
          profile2[locus] = {
            allele1: inherited,
            allele2: other
          };
        }
        break;
        
      case 'full-sibling':
        // Siblings share 0, 1, or 2 alleles at each locus
        profile2 = {};
        for (const locus in profile1) {
          const sharing = Math.random();
          if (sharing < 0.25) {
            // Share no alleles (IBS=0)
            profile2[locus] = {
              allele1: generateRandomAllele(locus),
              allele2: generateRandomAllele(locus)
            };
          } else if (sharing < 0.75) {
            // Share one allele (IBS=1)
            const shared = profile1[locus].allele1;
            profile2[locus] = {
              allele1: shared,
              allele2: generateRandomAllele(locus)
            };
          } else {
            // Share both alleles (IBS=2)
            profile2[locus] = { ...profile1[locus] };
          }
        }
        break;
        
      default:
        // Unrelated profiles
        profile2 = generateRandomProfile(numLoci);
        break;
    }

    ResponseHandler.success(res, {
      profile1,
      profile2,
      relationship,
      numLoci
    }, 'Profiles simulated successfully');

  } catch (error) {
    logger.error('Profile simulation failed', { error: error.message });
    ResponseHandler.error(res, 'Failed to simulate profiles', error);
  }
});

// Helper function to generate random profile
function generateRandomProfile(numLoci) {
  const profile = {};
  const loci = [
    'D3S1358', 'vWA', 'FGA', 'D8S1179', 'D21S11', 'D18S51',
    'D5S818', 'D13S317', 'D7S820', 'D16S539', 'TH01',
    'TPOX', 'CSF1PO', 'D10S1248', 'D1S1656', 'D2S1338'
  ];

  for (let i = 0; i < Math.min(numLoci, loci.length); i++) {
    const locus = loci[i];
    profile[locus] = {
      allele1: generateRandomAllele(locus),
      allele2: generateRandomAllele(locus)
    };
  }

  return profile;
}

// Helper function to generate random allele
function generateRandomAllele(locus) {
  const alleleRanges = {
    'D3S1358': { min: 12, max: 20 },
    'vWA': { min: 11, max: 24 },
    'FGA': { min: 17, max: 30 },
    'D8S1179': { min: 8, max: 19 },
    'D21S11': { min: 24, max: 38 },
    'D18S51': { min: 7, max: 27 },
    'default': { min: 8, max: 20 }
  };

  const range = alleleRanges[locus] || alleleRanges.default;
  return String(Math.floor(Math.random() * (range.max - range.min + 1)) + range.min);
}

module.exports = router;