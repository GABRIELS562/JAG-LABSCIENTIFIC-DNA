/**
 * Synthetic STR Results Adapter
 *
 * Generates deterministic, realistic STR profiles for demo/testing purposes.
 * Uses seeded random number generation so the same sample name always produces
 * the same profile - critical for testing parent/child relationships.
 *
 * This is the DEFAULT mode for the LIMS demo and load testing.
 *
 * @module strImporter/syntheticAdapter
 */

'use strict';

const contract = require('./contract');

/**
 * Seeded random number generator (Mulberry32)
 * Produces deterministic sequence from a 32-bit seed
 * @param {number} seed - 32-bit seed value
 * @returns {function(): number} - Returns next random float [0, 1)
 */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a seed from a string (FNV-1a hash)
 * @param {string} str - Input string
 * @returns {number} 32-bit hash
 */
function stringToSeed(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Realistic allele ranges for each locus
 * Based on published population data and kit specifications
 */
const LOCUS_RANGES = {
  'D3S1358': { min: 12, max: 20, common: [14, 15, 16, 17, 18] },
  'D1S1656': { min: 11, max: 22, common: [14, 15, 16, 17, 18] },
  'D2S441': { min: 9, max: 16, common: [10, 11, 12, 14] },
  'D10S1248': { min: 11, max: 18, common: [13, 14, 15, 16] },
  'D13S317': { min: 7, max: 15, common: [11, 12, 13, 14] },
  'Penta_E': { min: 5, max: 26, common: [10, 11, 12, 13, 14, 16, 18] },
  'D16S539': { min: 8, max: 15, common: [9, 10, 11, 12, 13] },
  'D18S51': { min: 9, max: 26, common: [12, 13, 14, 15, 16, 17, 18] },
  'D2S1338': { min: 15, max: 28, common: [17, 19, 20, 23, 24, 25] },
  'CSF1PO': { min: 7, max: 15, common: [10, 11, 12, 13] },
  'Penta_D': { min: 2, max: 17, common: [9, 10, 11, 12, 13] },
  'TH01': { min: 5, max: 11, common: [6, 7, 8, 9, '9.3'], hasDecimal: true },
  'vWA': { min: 11, max: 21, common: [14, 15, 16, 17, 18, 19] },
  'D21S11': { min: 24, max: 38, common: [28, 29, 30, '30.2', 31, '31.2', 32], hasDecimal: true },
  'D7S820': { min: 6, max: 14, common: [8, 9, 10, 11, 12] },
  'D5S818': { min: 7, max: 16, common: [10, 11, 12, 13] },
  'TPOX': { min: 6, max: 13, common: [8, 9, 10, 11, 12] },
  'D8S1179': { min: 8, max: 18, common: [10, 11, 12, 13, 14, 15, 16] },
  'D12S391': { min: 15, max: 27, common: [17, 18, 19, 20, 21, 22, 23] },
  'D19S433': { min: 9, max: 17, common: [12, 13, 14, '14.2', 15, '15.2'], hasDecimal: true },
  'FGA': { min: 18, max: 32, common: [20, 21, 22, 23, 24, 25, 26] },
  'D22S1045': { min: 8, max: 19, common: [11, 14, 15, 16, 17] },
  'AMEL': { alleles: ['X', 'Y'] }
};

/**
 * Pick a random allele from the locus range
 * Weighted towards common alleles
 * @param {string} locus - Locus name
 * @param {function} rand - Seeded random function
 * @returns {string} Allele value
 */
function pickAllele(locus, rand) {
  const range = LOCUS_RANGES[locus];
  if (!range) {
    // Unknown locus - return generic value
    return String(Math.floor(rand() * 20) + 8);
  }

  if (locus === 'AMEL') {
    return range.alleles[rand() < 0.5 ? 0 : 1];
  }

  // 70% chance to pick from common alleles
  if (rand() < 0.7 && range.common.length > 0) {
    const allele = range.common[Math.floor(rand() * range.common.length)];
    return String(allele);
  }

  // 30% chance for any allele in range (including rare variants)
  let value = range.min + Math.floor(rand() * (range.max - range.min + 1));

  // Small chance of .2 or .3 variant for loci that have them
  if (range.hasDecimal && rand() < 0.15) {
    const decimal = rand() < 0.7 ? '.2' : '.3';
    return String(value) + decimal;
  }

  return String(value);
}

/**
 * Generate realistic peak height
 * @param {function} rand - Seeded random function
 * @param {number} [baseHeight] - Optional base height for balance calculation
 * @param {boolean} [isSecondAllele] - Whether this is the second allele (for balance)
 * @returns {number} Peak height in RFU
 */
function generatePeakHeight(rand, baseHeight = null, isSecondAllele = false) {
  if (!baseHeight || !isSecondAllele) {
    // Base height: 500-3000 RFU with normal-ish distribution
    const mean = 1500;
    const stdDev = 500;
    // Box-Muller transform for normal distribution
    const u1 = rand();
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    let height = mean + z * stdDev;
    return Math.max(200, Math.min(4000, Math.round(height)));
  }

  // Second allele: apply heterozygote balance (0.6-1.0)
  const balance = 0.6 + rand() * 0.4;
  return Math.round(baseHeight * balance);
}

/**
 * Apply stutter artifact (typically -1 repeat unit)
 * @param {string} allele - Original allele value
 * @param {function} rand - Seeded random function
 * @returns {Object|null} Stutter peak data or null
 */
function generateStutter(allele, rand) {
  // 8-15% of main peak height
  const stutterRatio = 0.08 + rand() * 0.07;
  const mainHeight = 1500; // Approximate
  const stutterHeight = Math.round(mainHeight * stutterRatio);

  const numericAllele = parseFloat(allele);
  if (isNaN(numericAllele)) return null;

  // Stutter is typically -1 repeat
  const stutterAllele = numericAllele - 1;
  if (stutterAllele < 5) return null;

  return {
    allele: String(stutterAllele),
    height: stutterHeight,
    isStutter: true
  };
}

/**
 * Generate a complete STR profile for a sample
 * @param {string} sampleName - Sample identifier (used as seed)
 * @param {Object} options - Generation options
 * @param {boolean} [options.simulateNoise=false] - Add stutter/dropout
 * @param {string[]} [options.loci] - Specific loci to include (default: all 23)
 * @returns {Object} Markers object for contract
 */
function generateProfile(sampleName, options = {}) {
  const {
    simulateNoise = false,
    loci = contract.STANDARD_LOCI
  } = options;

  const seed = stringToSeed(sampleName);
  const rand = mulberry32(seed);

  const markers = {};

  for (const locus of loci) {
    // Pick two alleles (may be homozygous)
    const allele1 = pickAllele(locus, rand);
    let allele2 = pickAllele(locus, rand);

    // 30% chance of homozygous for autosomal loci
    if (locus !== 'AMEL' && rand() < 0.3) {
      allele2 = allele1;
    }

    // Generate peak heights
    const height1 = generatePeakHeight(rand);
    const isHomozygous = allele1 === allele2;
    const height2 = isHomozygous ? height1 : generatePeakHeight(rand, height1, true);

    const markerData = {
      allele1,
      allele2,
      peakHeight1: height1,
      peakHeight2: isHomozygous ? height1 : height2
    };

    // Simulate noise if requested
    if (simulateNoise && locus !== 'AMEL') {
      // 5% dropout chance per allele (very low)
      if (rand() < 0.05) {
        markerData.dropout = true;
        if (rand() < 0.5) {
          markerData.peakHeight1 = Math.round(markerData.peakHeight1 * 0.3);
        } else {
          markerData.peakHeight2 = Math.round(markerData.peakHeight2 * 0.3);
        }
      }

      // Add stutter artifacts (not stored in main alleles, just flagged)
      if (rand() < 0.3) {
        const stutter = generateStutter(allele1, rand);
        if (stutter) {
          markerData.hasStutter = true;
        }
      }
    }

    markers[locus] = markerData;
  }

  return markers;
}

/**
 * Generate related profile (child inherits from parents)
 * @param {string} childName - Child sample name
 * @param {string} parent1Name - First parent sample name
 * @param {string} parent2Name - Second parent sample name
 * @param {Object} parent1Profile - First parent's markers
 * @param {Object} parent2Profile - Second parent's markers
 * @param {function} rand - Seeded random function
 * @returns {Object} Child markers
 */
function generateChildProfile(childName, parent1Name, parent2Name, parent1Profile, parent2Profile, rand) {
  const markers = {};

  for (const locus of contract.STANDARD_LOCI) {
    const p1 = parent1Profile[locus];
    const p2 = parent2Profile[locus];

    if (!p1 || !p2) continue;

    // Child inherits one allele from each parent
    const fromP1 = rand() < 0.5 ? p1.allele1 : p1.allele2;
    const fromP2 = rand() < 0.5 ? p2.allele1 : p2.allele2;

    // Generate independent peak heights
    const height1 = generatePeakHeight(rand);
    const isHomozygous = fromP1 === fromP2;
    const height2 = isHomozygous ? height1 : generatePeakHeight(rand, height1, true);

    markers[locus] = {
      allele1: fromP1,
      allele2: fromP2,
      peakHeight1: height1,
      peakHeight2: isHomozygous ? height1 : height2
    };
  }

  return markers;
}

/**
 * Generate STR results payload
 * @param {Object} opts - Options
 * @param {string[]} opts.sampleNames - Array of sample names to generate
 * @param {string} [opts.sourceTag='synthetic'] - Source tag for fileName
 * @param {boolean} [opts.simulateNoise=false] - Add stutter/dropout artifacts
 * @param {boolean} [opts.generateFamilies=false] - Auto-detect families and generate related profiles
 * @returns {Object} Contract-shaped import payload
 */
function generate(opts) {
  const {
    sampleNames = [],
    sourceTag = 'synthetic',
    simulateNoise = false,
    generateFamilies = false
  } = opts;

  if (!Array.isArray(sampleNames) || sampleNames.length === 0) {
    return contract.createEmptyPayload(sourceTag);
  }

  const samples = [];
  const familyProfiles = {}; // Track parent profiles for family generation

  for (const sampleName of sampleNames) {
    const parsed = contract.parseSampleName(sampleName);
    let markers;

    if (generateFamilies && parsed) {
      // Try to generate related profile if we have parents
      const familyKey = `${parsed.prefix}${parsed.year}_${String(parsed.sequence).padStart(4, '0')}`;

      if (parsed.role === 'child') {
        // Look for parents
        const motherKey = `${familyKey}_mother`;
        const fatherKey = `${familyKey}_father`;

        if (familyProfiles[motherKey] && familyProfiles[fatherKey]) {
          // Generate child profile from parents
          const seed = stringToSeed(sampleName);
          const rand = mulberry32(seed);
          markers = generateChildProfile(
            sampleName,
            motherKey,
            fatherKey,
            familyProfiles[motherKey],
            familyProfiles[fatherKey],
            rand
          );
        } else {
          markers = generateProfile(sampleName, { simulateNoise });
        }
      } else {
        // Parent profile
        markers = generateProfile(sampleName, { simulateNoise });
        const roleKey = parsed.role === 'mother' ? '_mother' : '_father';
        familyProfiles[familyKey + roleKey] = markers;
      }
    } else {
      markers = generateProfile(sampleName, { simulateNoise });
    }

    samples.push({
      sampleName: contract.normalizeSampleName(sampleName),
      markers
    });
  }

  return {
    samples,
    importDate: new Date().toISOString(),
    fileName: `GAR_${sourceTag}_${Date.now()}.json`
  };
}

/**
 * Parse method stub - synthetic adapter doesn't parse external data
 * @throws {Error} Always throws - synthetic adapter only generates
 */
async function parse() {
  throw new Error('SyntheticAdapter.parse() not supported - use generate() instead');
}

module.exports = {
  generate,
  parse,

  // Export internals for testing
  _internals: {
    mulberry32,
    stringToSeed,
    pickAllele,
    generatePeakHeight,
    generateProfile,
    generateChildProfile,
    LOCUS_RANGES
  }
};
