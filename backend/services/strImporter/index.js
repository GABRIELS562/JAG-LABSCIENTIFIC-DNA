/**
 * STR Results Importer Factory
 *
 * Provides a unified interface for importing STR analysis results from
 * multiple sources: synthetic (demo), Osiris (open-source), GeneMapper (commercial).
 *
 * Mode selection:
 * 1. Explicit mode argument to getImporter()
 * 2. IMPORTER_MODE environment variable
 * 3. Default: 'synthetic'
 *
 * Usage:
 *   const { getImporter } = require('./strImporter');
 *   const importer = getImporter('synthetic');
 *   const payload = importer.generate({ sampleNames: [...] });
 *
 *   // Or for file-based importers:
 *   const osirisImporter = getImporter('osiris');
 *   const payload = await osirisImporter.parse(fileBuffer);
 *
 * @module strImporter
 */

'use strict';

const contract = require('./contract');
const syntheticAdapter = require('./syntheticAdapter');

// Lazy-load file-based adapters to avoid startup overhead
let osirisAdapter = null;
let genemapperAdapter = null;

/**
 * Valid importer modes
 */
const MODES = {
  SYNTHETIC: 'synthetic',
  OSIRIS: 'osiris',
  GENEMAPPER: 'genemapper'
};

/**
 * Default mode when none specified
 */
const DEFAULT_MODE = MODES.SYNTHETIC;

/**
 * Get the importer mode from environment or use default
 * @returns {string} The importer mode
 */
function getDefaultMode() {
  const envMode = process.env.IMPORTER_MODE;
  if (envMode && Object.values(MODES).includes(envMode.toLowerCase())) {
    return envMode.toLowerCase();
  }
  return DEFAULT_MODE;
}

/**
 * Load the Osiris adapter (lazy)
 * @returns {Object} Osiris adapter module
 */
function loadOsirisAdapter() {
  if (!osirisAdapter) {
    osirisAdapter = require('./osirisAdapter');
  }
  return osirisAdapter;
}

/**
 * Load the GeneMapper adapter (lazy)
 * @returns {Object} GeneMapper adapter module
 */
function loadGenemapperAdapter() {
  if (!genemapperAdapter) {
    genemapperAdapter = require('./genemapperAdapter');
  }
  return genemapperAdapter;
}

/**
 * Importer interface wrapper
 * Provides consistent interface regardless of underlying adapter
 */
class ImporterInterface {
  /**
   * @param {string} mode - The importer mode
   * @param {Object} adapter - The underlying adapter module
   */
  constructor(mode, adapter) {
    this.mode = mode;
    this.adapter = adapter;
  }

  /**
   * Generate STR results (synthetic mode only)
   * @param {Object} opts - Generation options
   * @param {string[]} opts.sampleNames - Sample names to generate
   * @param {string} [opts.sourceTag] - Source tag for fileName
   * @param {boolean} [opts.simulateNoise] - Add stutter/dropout
   * @param {boolean} [opts.generateFamilies] - Generate related profiles
   * @returns {Object} Contract-shaped import payload
   * @throws {Error} If not supported by this adapter
   */
  generate(opts) {
    if (typeof this.adapter.generate !== 'function') {
      throw new Error(`generate() not supported by ${this.mode} adapter - use parse() instead`);
    }
    return this.adapter.generate(opts);
  }

  /**
   * Parse STR results from external file (osiris/genemapper modes)
   * @param {string|Buffer} input - File path or buffer content
   * @param {Object} [opts] - Parse options
   * @returns {Promise<Object>} Contract-shaped import payload
   * @throws {Error} If not supported by this adapter
   */
  async parse(input, opts = {}) {
    if (typeof this.adapter.parse !== 'function') {
      throw new Error(`parse() not supported by ${this.mode} adapter - use generate() instead`);
    }
    return this.adapter.parse(input, opts);
  }

  /**
   * Check if this importer supports generation
   * @returns {boolean}
   */
  canGenerate() {
    return typeof this.adapter.generate === 'function' &&
           this.adapter.generate !== syntheticAdapter.parse; // parse throws
  }

  /**
   * Check if this importer supports parsing
   * @returns {boolean}
   */
  canParse() {
    return typeof this.adapter.parse === 'function' &&
           this.mode !== MODES.SYNTHETIC; // synthetic.parse throws
  }
}

/**
 * Get an importer instance for the specified mode
 * @param {string} [mode] - Importer mode ('synthetic', 'osiris', 'genemapper')
 *                          If not specified, uses IMPORTER_MODE env var or default
 * @returns {ImporterInterface} Importer instance with generate/parse methods
 * @throws {Error} If mode is invalid
 */
function getImporter(mode) {
  const resolvedMode = mode ? mode.toLowerCase() : getDefaultMode();

  switch (resolvedMode) {
    case MODES.SYNTHETIC:
      return new ImporterInterface(MODES.SYNTHETIC, syntheticAdapter);

    case MODES.OSIRIS:
      return new ImporterInterface(MODES.OSIRIS, loadOsirisAdapter());

    case MODES.GENEMAPPER:
      return new ImporterInterface(MODES.GENEMAPPER, loadGenemapperAdapter());

    default:
      throw new Error(
        `Invalid importer mode: "${resolvedMode}". ` +
        `Valid modes: ${Object.values(MODES).join(', ')}`
      );
  }
}

/**
 * Validate an import payload
 * Delegates to contract.validate()
 * @param {Object} payload - The payload to validate
 * @returns {Object} Validation result { valid: boolean, errors?: string[] }
 */
function validate(payload) {
  return contract.validate(payload);
}

module.exports = {
  getImporter,
  validate,
  MODES,
  DEFAULT_MODE,

  // Re-export contract utilities
  contract,

  // Re-export adapters for direct access if needed
  syntheticAdapter
};
