/**
 * GeneMapper STR Results Adapter
 *
 * Parses tab-delimited export files from Applied Biosystems GeneMapper ID software.
 * Tested with GeneMapper ID v3.2 and v4.1 output from 3130xl/3500 analyzers.
 *
 * Input format (tab-delimited):
 *   Sample_Name  Well  Dye  Locus  Allele  Size  Height  Area  Data_Point  Peak_Start  Peak_End  Comment
 *   25_001_Child A01  FAM  D3S1358  15  164.21  2845  15234  2341  2335  2348
 *
 * @module strImporter/genemapperAdapter
 */

'use strict';

const contract = require('./contract');

/**
 * Column indices in GeneMapper export (0-based)
 */
const COLUMNS = {
  SAMPLE_NAME: 0,
  WELL: 1,
  DYE: 2,
  LOCUS: 3,
  ALLELE: 4,
  SIZE: 5,
  HEIGHT: 6,
  AREA: 7,
  DATA_POINT: 8,
  PEAK_START: 9,
  PEAK_END: 10,
  COMMENT: 11
};

/**
 * Dyes to ignore (size standard markers)
 */
const SIZE_STANDARD_DYES = ['LIZ', 'ROX', 'ORANGE', 'CC5'];

/**
 * Loci to ignore (internal controls, size standards)
 */
const IGNORED_LOCI = ['ILS-600', 'ILS-500', 'GS500', 'GS600', 'SIZE_STANDARD'];

/**
 * Parse a single line from the GeneMapper export
 * @param {string} line - Tab-delimited line
 * @returns {Object|null} Parsed peak data or null if invalid/ignored
 */
function parseLine(line) {
  const fields = line.split('\t');

  // Need at least the essential columns
  if (fields.length < 7) return null;

  const dye = fields[COLUMNS.DYE]?.trim().toUpperCase();
  const locus = fields[COLUMNS.LOCUS]?.trim();

  // Skip size standard dyes
  if (SIZE_STANDARD_DYES.includes(dye)) return null;

  // Skip ignored loci
  if (IGNORED_LOCI.some(ignored => locus?.toUpperCase().includes(ignored))) return null;

  const sampleName = fields[COLUMNS.SAMPLE_NAME]?.trim();
  const allele = fields[COLUMNS.ALLELE]?.trim();
  const height = parseInt(fields[COLUMNS.HEIGHT], 10);

  // Skip if essential data is missing
  if (!sampleName || !locus || !allele) return null;

  return {
    sampleName,
    well: fields[COLUMNS.WELL]?.trim(),
    dye,
    locus: normalizeLocus(locus),
    allele: allele,
    size: parseFloat(fields[COLUMNS.SIZE]) || 0,
    height: isNaN(height) ? 0 : height,
    area: parseInt(fields[COLUMNS.AREA], 10) || 0,
    comment: fields[COLUMNS.COMMENT]?.trim() || ''
  };
}

/**
 * Normalize locus name to match contract standard
 * @param {string} locus - Raw locus name
 * @returns {string} Normalized locus name
 */
function normalizeLocus(locus) {
  if (!locus) return locus;

  // Handle common variations
  const upper = locus.toUpperCase().trim();

  // Map common aliases
  const aliases = {
    'AMELOGENIN': 'AMEL',
    'AM': 'AMEL',
    'PENTA E': 'Penta_E',
    'PENTAE': 'Penta_E',
    'PENTA D': 'Penta_D',
    'PENTAD': 'Penta_D',
    'VWA': 'vWA',
    'THO1': 'TH01',
    'TH0I': 'TH01'
  };

  if (aliases[upper]) return aliases[upper];

  // Check if it matches a standard locus (case-insensitive)
  for (const standardLocus of contract.STANDARD_LOCI) {
    if (upper === standardLocus.toUpperCase()) {
      return standardLocus;
    }
  }

  // Return original with preserved case
  return locus.trim();
}

/**
 * Group peaks by sample and locus, selecting top 2-3 peaks per locus
 * @param {Object[]} peaks - Array of parsed peak objects
 * @returns {Map} Map of sampleName -> { locus -> alleleData[] }
 */
function groupPeaks(peaks) {
  const samples = new Map();

  for (const peak of peaks) {
    if (!samples.has(peak.sampleName)) {
      samples.set(peak.sampleName, new Map());
    }

    const sampleLoci = samples.get(peak.sampleName);

    if (!sampleLoci.has(peak.locus)) {
      sampleLoci.set(peak.locus, []);
    }

    sampleLoci.get(peak.locus).push({
      allele: peak.allele,
      height: peak.height,
      size: peak.size
    });
  }

  return samples;
}

/**
 * Select the best alleles for a locus (top 2-3 by height)
 * @param {Object[]} alleleData - Array of allele data for a locus
 * @returns {Object} Marker data in contract format
 */
function selectAlleles(alleleData) {
  // Sort by peak height descending
  const sorted = [...alleleData].sort((a, b) => b.height - a.height);

  // Take top 2-3 alleles
  const maxAlleles = 3;
  const selected = sorted.slice(0, maxAlleles);

  if (selected.length === 0) {
    return null;
  }

  // If only one allele, it's homozygous
  if (selected.length === 1) {
    return {
      allele1: selected[0].allele,
      allele2: selected[0].allele,
      peakHeight1: selected[0].height,
      peakHeight2: selected[0].height
    };
  }

  // Build marker data
  const marker = {
    allele1: selected[0].allele,
    allele2: selected[1].allele,
    peakHeight1: selected[0].height,
    peakHeight2: selected[1].height
  };

  // Add third allele if present (tri-allelic)
  if (selected.length >= 3 && selected[2].height > 0) {
    marker.allele3 = selected[2].allele;
    marker.peakHeight3 = selected[2].height;
  }

  return marker;
}

/**
 * Parse GeneMapper export file content
 * @param {string|Buffer} input - File content as string or Buffer
 * @param {Object} [opts] - Parse options
 * @param {string} [opts.fileName] - Original filename for metadata
 * @returns {Promise<Object>} Contract-shaped import payload
 */
async function parse(input, opts = {}) {
  const content = typeof input === 'string' ? input : input.toString('utf8');
  const lines = content.split(/\r?\n/);

  const peaks = [];
  let headerFound = false;
  let sourceInfo = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Parse header comments for metadata
    if (trimmed.startsWith('#')) {
      // Extract metadata from comments
      const match = trimmed.match(/^#\s*([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_');
        sourceInfo[key] = match[2].trim();
      }

      // Check for column header
      if (trimmed.includes('Sample_Name') && trimmed.includes('Locus')) {
        headerFound = true;
      }
      continue;
    }

    // Skip column header line
    if (!headerFound && trimmed.toLowerCase().includes('sample_name')) {
      headerFound = true;
      continue;
    }

    // Parse data line
    const peak = parseLine(trimmed);
    if (peak) {
      peaks.push(peak);
    }
  }

  if (peaks.length === 0) {
    return contract.createEmptyPayload('genemapper');
  }

  // Group peaks by sample and locus
  const groupedSamples = groupPeaks(peaks);

  // Convert to contract format
  const samples = [];

  for (const [sampleName, lociMap] of groupedSamples) {
    const markers = {};

    for (const [locus, alleleData] of lociMap) {
      const markerData = selectAlleles(alleleData);
      if (markerData) {
        markers[locus] = markerData;
      }
    }

    if (Object.keys(markers).length > 0) {
      samples.push({
        sampleName: contract.normalizeSampleName(sampleName),
        markers
      });
    }
  }

  // Build filename
  const fileName = opts.fileName ||
    `GAR_genemapper_${sourceInfo.run_name || 'import'}_${Date.now()}.json`;

  return {
    samples,
    importDate: new Date().toISOString(),
    fileName,
    metadata: {
      source: 'genemapper',
      ...sourceInfo
    }
  };
}

/**
 * Generate method stub - GeneMapper adapter only parses
 * @throws {Error} Always throws - use syntheticAdapter for generation
 */
function generate() {
  throw new Error('GenemapperAdapter.generate() not supported - use parse() instead');
}

module.exports = {
  parse,
  generate,

  // Export internals for testing
  _internals: {
    parseLine,
    normalizeLocus,
    groupPeaks,
    selectAlleles,
    COLUMNS,
    SIZE_STANDARD_DYES,
    IGNORED_LOCI
  }
};
