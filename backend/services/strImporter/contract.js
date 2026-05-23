/**
 * STR Results Import Contract
 *
 * Defines the canonical JSON shape for importing STR analysis results into the LIMS.
 * All adapters (synthetic, osiris, genemapper) produce this format.
 * The route handler validates incoming payloads against this contract before storage.
 *
 * @module strImporter/contract
 */

'use strict';

/**
 * The 23-locus standard set for this LIMS
 * Verified against production dump and PowerPlex ESX 17 / Identifiler Plus kits
 */
const STANDARD_LOCI = [
  'D3S1358', 'D1S1656', 'D2S441', 'D10S1248', 'D13S317', 'Penta_E', 'D16S539',
  'D18S51', 'D2S1338', 'CSF1PO', 'Penta_D', 'TH01', 'vWA', 'D21S11', 'D7S820',
  'D5S818', 'TPOX', 'D8S1179', 'D12S391', 'D19S433', 'FGA', 'D22S1045', 'AMEL'
];

/**
 * Sex marker - special handling for X/Y alleles
 */
const SEX_MARKER = 'AMEL';

/**
 * Autosomal loci (all except AMEL)
 */
const AUTOSOMAL_LOCI = STANDARD_LOCI.filter(l => l !== SEX_MARKER);

/**
 * Sample name prefixes used in this lab
 * UPL is normalized to UP during parsing
 */
const SAMPLE_PREFIXES = ['POM', 'LT', 'UP', 'UPL', 'MAT', 'IND', 'SIB'];

/**
 * Roles encoded in sample names
 */
const SAMPLE_ROLES = {
  'C': 'child',
  'F': 'alleged_father',
  'M': 'mother'
};

/**
 * @typedef {Object} MarkerData
 * @property {string} allele1 - First allele value
 * @property {string} allele2 - Second allele value
 * @property {number} [peakHeight1] - Peak height for allele1 in RFU
 * @property {number} [peakHeight2] - Peak height for allele2 in RFU
 * @property {string} [allele3] - Optional third allele (tri-allelic)
 * @property {number} [peakHeight3] - Peak height for allele3
 */

/**
 * @typedef {Object} SampleResult
 * @property {string} sampleName - Sample identifier (format: PREFIX YY_NNNN_ROLE_surname)
 * @property {Object.<string, MarkerData>} markers - Marker name to allele data mapping
 */

/**
 * @typedef {Object} ImportPayload
 * @property {SampleResult[]} samples - Array of sample results
 * @property {string} importDate - ISO 8601 timestamp of import
 * @property {string} fileName - Source file name (format: GAR_<source>_<timestamp>.json)
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the payload is valid
 * @property {string[]} [errors] - Array of validation error messages (only if invalid)
 */

/**
 * Validates an AMEL (amelogenin) allele value
 * @param {string} allele - The allele value to validate
 * @returns {boolean} True if valid (X or Y)
 */
function isValidAmelAllele(allele) {
  if (typeof allele !== 'string') return false;
  const normalized = allele.toUpperCase().trim();
  return normalized === 'X' || normalized === 'Y';
}

/**
 * Validates an autosomal STR allele value
 * Must be a number or number with single decimal (e.g., "15", "9.3", "30.2")
 * @param {string} allele - The allele value to validate
 * @returns {boolean} True if valid
 */
function isValidAutosomalAllele(allele) {
  if (typeof allele !== 'string') return false;
  const trimmed = allele.trim();
  // Match integer or decimal with one digit after point (e.g., 9, 15, 9.3, 30.2)
  return /^\d+(\.\d)?$/.test(trimmed);
}

/**
 * Validates a marker data object
 * @param {string} locus - The locus name
 * @param {MarkerData} data - The marker data
 * @param {string} sampleName - Sample name for error context
 * @returns {string[]} Array of validation errors (empty if valid)
 */
function validateMarker(locus, data, sampleName) {
  const errors = [];
  const prefix = `Sample "${sampleName}", locus "${locus}"`;

  if (!data || typeof data !== 'object') {
    errors.push(`${prefix}: marker data must be an object`);
    return errors;
  }

  // Check required alleles
  if (data.allele1 === undefined || data.allele1 === null) {
    errors.push(`${prefix}: missing allele1`);
  }
  if (data.allele2 === undefined || data.allele2 === null) {
    errors.push(`${prefix}: missing allele2`);
  }

  // Validate allele values if present
  if (data.allele1 !== undefined && data.allele1 !== null) {
    const allele1Str = String(data.allele1);
    if (locus === SEX_MARKER) {
      if (!isValidAmelAllele(allele1Str)) {
        errors.push(`${prefix}: allele1 "${allele1Str}" invalid for AMEL (must be X or Y)`);
      }
    } else {
      if (!isValidAutosomalAllele(allele1Str)) {
        errors.push(`${prefix}: allele1 "${allele1Str}" invalid (must be number or number.digit)`);
      }
    }
  }

  if (data.allele2 !== undefined && data.allele2 !== null) {
    const allele2Str = String(data.allele2);
    if (locus === SEX_MARKER) {
      if (!isValidAmelAllele(allele2Str)) {
        errors.push(`${prefix}: allele2 "${allele2Str}" invalid for AMEL (must be X or Y)`);
      }
    } else {
      if (!isValidAutosomalAllele(allele2Str)) {
        errors.push(`${prefix}: allele2 "${allele2Str}" invalid (must be number or number.digit)`);
      }
    }
  }

  // Validate optional peak heights if present
  if (data.peakHeight1 !== undefined && data.peakHeight1 !== null) {
    if (typeof data.peakHeight1 !== 'number' || data.peakHeight1 < 0) {
      errors.push(`${prefix}: peakHeight1 must be a non-negative number`);
    }
  }

  if (data.peakHeight2 !== undefined && data.peakHeight2 !== null) {
    if (typeof data.peakHeight2 !== 'number' || data.peakHeight2 < 0) {
      errors.push(`${prefix}: peakHeight2 must be a non-negative number`);
    }
  }

  // Validate optional third allele (tri-allelic)
  if (data.allele3 !== undefined && data.allele3 !== null) {
    const allele3Str = String(data.allele3);
    if (locus === SEX_MARKER) {
      // AMEL shouldn't have 3 alleles, but don't reject
      if (!isValidAmelAllele(allele3Str)) {
        errors.push(`${prefix}: allele3 "${allele3Str}" invalid for AMEL (must be X or Y)`);
      }
    } else {
      if (!isValidAutosomalAllele(allele3Str)) {
        errors.push(`${prefix}: allele3 "${allele3Str}" invalid (must be number or number.digit)`);
      }
    }
  }

  return errors;
}

/**
 * Validates a sample result object
 * @param {SampleResult} sample - The sample to validate
 * @param {number} index - Sample index for error context
 * @returns {string[]} Array of validation errors (empty if valid)
 */
function validateSample(sample, index) {
  const errors = [];
  const prefix = `samples[${index}]`;

  if (!sample || typeof sample !== 'object') {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  // Check sampleName
  if (!sample.sampleName || typeof sample.sampleName !== 'string') {
    errors.push(`${prefix}: missing or invalid sampleName`);
  } else if (sample.sampleName.trim().length === 0) {
    errors.push(`${prefix}: sampleName cannot be empty`);
  }

  // Check markers
  if (!sample.markers || typeof sample.markers !== 'object') {
    errors.push(`${prefix} ("${sample.sampleName || 'unknown'}"): missing or invalid markers object`);
    return errors;
  }

  const markerNames = Object.keys(sample.markers);
  if (markerNames.length === 0) {
    errors.push(`${prefix} ("${sample.sampleName}"): markers object is empty`);
    return errors;
  }

  // Validate each marker
  for (const locus of markerNames) {
    const markerErrors = validateMarker(locus, sample.markers[locus], sample.sampleName);
    errors.push(...markerErrors);
  }

  return errors;
}

/**
 * Validates an import payload against the contract
 * @param {ImportPayload} payload - The payload to validate
 * @returns {ValidationResult} Validation result with errors if invalid
 */
function validate(payload) {
  const errors = [];

  // Check top-level structure
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  // Check samples array
  if (!Array.isArray(payload.samples)) {
    errors.push('samples must be an array');
  } else if (payload.samples.length === 0) {
    errors.push('samples array must not be empty');
  } else {
    // Validate each sample
    for (let i = 0; i < payload.samples.length; i++) {
      const sampleErrors = validateSample(payload.samples[i], i);
      errors.push(...sampleErrors);
    }
  }

  // Check importDate (required, must be ISO 8601)
  if (!payload.importDate || typeof payload.importDate !== 'string') {
    errors.push('importDate is required and must be a string');
  } else {
    const date = new Date(payload.importDate);
    if (isNaN(date.getTime())) {
      errors.push('importDate must be a valid ISO 8601 date string');
    }
  }

  // Check fileName (required)
  if (!payload.fileName || typeof payload.fileName !== 'string') {
    errors.push('fileName is required and must be a string');
  } else if (payload.fileName.trim().length === 0) {
    errors.push('fileName cannot be empty');
  }

  return errors.length === 0
    ? { valid: true }
    : { valid: false, errors };
}

/**
 * Normalizes a sample name (handles UPL -> UP conversion)
 * @param {string} name - The sample name to normalize
 * @returns {string} Normalized sample name
 */
function normalizeSampleName(name) {
  if (!name || typeof name !== 'string') return name;
  // UPL -> UP normalization
  return name.replace(/^UPL(\d)/, 'UP$1');
}

/**
 * Parses a sample name into its components
 * Format: <PREFIX><YY>_<NNNN>_<ROLE>_<surname>
 * @param {string} name - The sample name to parse
 * @returns {Object|null} Parsed components or null if invalid format
 */
function parseSampleName(name) {
  if (!name || typeof name !== 'string') return null;

  const normalized = normalizeSampleName(name);
  // Match: PREFIX (2-3 chars) + YY (2 digits) + _ + NNNN (4 digits) + _ + ROLE (1 char) + optional _surname
  const match = normalized.match(/^([A-Z]{2,3})(\d{2})_(\d{4})_([CFM])(?:_(.+))?$/i);

  if (!match) return null;

  return {
    prefix: match[1].toUpperCase(),
    year: parseInt('20' + match[2], 10),
    sequence: parseInt(match[3], 10),
    roleCode: match[4].toUpperCase(),
    role: SAMPLE_ROLES[match[4].toUpperCase()] || 'unknown',
    surname: match[5] || null,
    normalized
  };
}

/**
 * Creates an empty contract-shaped payload
 * @param {string} [sourceTag='unknown'] - Source identifier for fileName
 * @returns {ImportPayload} Empty payload structure
 */
function createEmptyPayload(sourceTag = 'unknown') {
  return {
    samples: [],
    importDate: new Date().toISOString(),
    fileName: `GAR_${sourceTag}_${Date.now()}.json`
  };
}

module.exports = {
  // Constants
  STANDARD_LOCI,
  SEX_MARKER,
  AUTOSOMAL_LOCI,
  SAMPLE_PREFIXES,
  SAMPLE_ROLES,

  // Validation
  validate,
  isValidAmelAllele,
  isValidAutosomalAllele,
  validateMarker,
  validateSample,

  // Utilities
  normalizeSampleName,
  parseSampleName,
  createEmptyPayload
};
