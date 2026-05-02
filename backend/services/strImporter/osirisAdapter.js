/**
 * OSIRIS STR Results Adapter
 *
 * Parses .oar (OSIRIS Analysis Report) XML files from NCBI's OSIRIS software.
 * OSIRIS is public-domain STR analysis software available at https://www.ncbi.nlm.nih.gov/osiris/
 *
 * Expected XML structure:
 *   <OsirisAnalysisReport>
 *     <Settings>...</Settings>
 *     <Table>
 *       <Sample>
 *         <Name>25_001_Child</Name>
 *         <Locus>
 *           <LocusName>D3S1358</LocusName>
 *           <Allele>
 *             <Name>15</Name>
 *             <RFU>2845</RFU>
 *             <BP>164.21</BP>
 *           </Allele>
 *         </Locus>
 *       </Sample>
 *     </Table>
 *   </OsirisAnalysisReport>
 *
 * @module strImporter/osirisAdapter
 */

'use strict';

const contract = require('./contract');

// Optional: use xml2js if available, otherwise use simple regex parsing
let xml2js = null;
try {
  xml2js = require('xml2js');
} catch (e) {
  // Will use regex-based parsing
}

/**
 * Extract text content from an XML element
 * @param {string} xml - XML string
 * @param {string} tag - Tag name to extract
 * @returns {string|null} Text content or null
 */
function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract all matches of a repeating element
 * @param {string} xml - XML string
 * @param {string} tag - Tag name to extract
 * @returns {string[]} Array of element contents
 */
function extractAllTags(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Parse a single locus element from OSIRIS XML
 * @param {string} locusXml - XML content for a locus
 * @returns {Object|null} Parsed locus data
 */
function parseLocus(locusXml) {
  const locusName = extractTag(locusXml, 'LocusName') ||
                    extractTag(locusXml, 'Name') ||
                    extractTag(locusXml, 'Locus');

  if (!locusName) return null;

  // Extract alleles
  const alleleElements = extractAllTags(locusXml, 'Allele');
  const alleles = [];

  for (const alleleXml of alleleElements) {
    const name = extractTag(alleleXml, 'Name') ||
                 extractTag(alleleXml, 'AlleleValue') ||
                 extractTag(alleleXml, 'Call');
    const rfu = parseInt(extractTag(alleleXml, 'RFU') ||
                         extractTag(alleleXml, 'Height') ||
                         extractTag(alleleXml, 'PeakHeight') || '0', 10);
    const bp = parseFloat(extractTag(alleleXml, 'BP') ||
                          extractTag(alleleXml, 'Size') ||
                          extractTag(alleleXml, 'BasePairs') || '0');

    if (name) {
      alleles.push({
        name: String(name).trim(),
        height: rfu,
        size: bp
      });
    }
  }

  // Also try to extract directly embedded allele values (older OSIRIS format)
  if (alleles.length === 0) {
    const allele1 = extractTag(locusXml, 'Allele1');
    const allele2 = extractTag(locusXml, 'Allele2');
    const height1 = parseInt(extractTag(locusXml, 'Height1') || extractTag(locusXml, 'RFU1') || '0', 10);
    const height2 = parseInt(extractTag(locusXml, 'Height2') || extractTag(locusXml, 'RFU2') || '0', 10);

    if (allele1) alleles.push({ name: allele1, height: height1, size: 0 });
    if (allele2) alleles.push({ name: allele2, height: height2, size: 0 });
  }

  if (alleles.length === 0) return null;

  return {
    locusName: normalizeLocus(locusName),
    alleles
  };
}

/**
 * Parse a sample element from OSIRIS XML
 * @param {string} sampleXml - XML content for a sample
 * @returns {Object|null} Parsed sample data
 */
function parseSample(sampleXml) {
  const sampleName = extractTag(sampleXml, 'Name') ||
                     extractTag(sampleXml, 'SampleName') ||
                     extractTag(sampleXml, 'ID');

  if (!sampleName) return null;

  // Skip controls and ladders
  const lowerName = sampleName.toLowerCase();
  if (lowerName.includes('ladder') ||
      lowerName.includes('control') ||
      lowerName.includes('ils') ||
      lowerName.includes('liz')) {
    return null;
  }

  // Parse loci
  const lociElements = extractAllTags(sampleXml, 'Locus');
  const markers = {};

  for (const locusXml of lociElements) {
    const locusData = parseLocus(locusXml);
    if (!locusData || locusData.alleles.length === 0) continue;

    // Sort alleles by height descending
    const sorted = locusData.alleles.sort((a, b) => b.height - a.height);

    // Take top 2-3 alleles
    const markerData = {
      allele1: sorted[0].name,
      allele2: sorted.length > 1 ? sorted[1].name : sorted[0].name,
      peakHeight1: sorted[0].height,
      peakHeight2: sorted.length > 1 ? sorted[1].height : sorted[0].height
    };

    // Add third allele for tri-allelic
    if (sorted.length >= 3 && sorted[2].height > 0) {
      markerData.allele3 = sorted[2].name;
      markerData.peakHeight3 = sorted[2].height;
    }

    markers[locusData.locusName] = markerData;
  }

  if (Object.keys(markers).length === 0) return null;

  return {
    sampleName: contract.normalizeSampleName(sampleName),
    markers
  };
}

/**
 * Normalize locus name to match contract standard
 * @param {string} locus - Raw locus name
 * @returns {string} Normalized locus name
 */
function normalizeLocus(locus) {
  if (!locus) return locus;

  const upper = locus.toUpperCase().trim();

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

  for (const standardLocus of contract.STANDARD_LOCI) {
    if (upper === standardLocus.toUpperCase()) {
      return standardLocus;
    }
  }

  return locus.trim();
}

/**
 * Extract metadata from OSIRIS XML settings
 * @param {string} xml - Full XML content
 * @returns {Object} Metadata object
 */
function extractMetadata(xml) {
  const metadata = {
    source: 'osiris'
  };

  const version = extractTag(xml, 'Version');
  if (version) metadata.version = version;

  const kit = extractTag(xml, 'Kit') || extractTag(xml, 'KitName');
  if (kit) metadata.kit = kit;

  const ils = extractTag(xml, 'ILS');
  if (ils) metadata.ils = ils;

  const minRfu = extractTag(xml, 'MinRFU');
  if (minRfu) metadata.minRfu = parseInt(minRfu, 10);

  const runDate = extractTag(xml, 'RunDate') ||
                  extractTag(xml, 'StartTime') ||
                  extractTag(xml, 'AnalysisDate');
  if (runDate) metadata.runDate = runDate;

  return metadata;
}

/**
 * Parse OSIRIS .oar XML content using xml2js (if available)
 * @param {string} content - XML content
 * @returns {Promise<Object[]>} Array of sample objects
 */
async function parseWithXml2js(content) {
  const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
  const result = await parser.parseStringPromise(content);

  const samples = [];

  // Navigate common OSIRIS XML structures
  const root = result.OsirisAnalysisReport || result.AnalysisReport || result;

  // Try Table > Sample structure first, then direct Sample
  let sampleElements;
  if (root.Table && (root.Table.Sample || root.Table.sample)) {
    sampleElements = root.Table.Sample || root.Table.sample;
  } else if (root.table && (root.table.Sample || root.table.sample)) {
    sampleElements = root.table.Sample || root.table.sample;
  } else {
    // Direct Sample elements (no Table wrapper)
    sampleElements = root.Sample || root.sample || [];
  }

  const sampleArray = Array.isArray(sampleElements) ? sampleElements : (sampleElements ? [sampleElements] : []);

  for (const sample of sampleArray) {
    if (!sample) continue;

    const sampleName = sample.Name || sample.SampleName || sample.ID;
    if (!sampleName) continue;

    // Skip controls
    const lowerName = String(sampleName).toLowerCase();
    if (lowerName.includes('ladder') ||
        lowerName.includes('control') ||
        lowerName.includes('ils')) {
      continue;
    }

    const markers = {};
    const loci = sample.Locus || sample.locus || [];
    const lociArray = Array.isArray(loci) ? loci : [loci];

    for (const locus of lociArray) {
      if (!locus) continue;

      const locusName = normalizeLocus(locus.LocusName || locus.Name || locus.Locus);
      if (!locusName) continue;

      // First try nested Allele elements
      const alleles = locus.Allele || locus.allele || [];
      const alleleArray = Array.isArray(alleles) ? alleles : (alleles ? [alleles] : []);

      const parsedAlleles = alleleArray
        .filter(a => a)
        .map(a => ({
          name: String(a.Name || a.AlleleValue || a.Call || a).trim(),
          height: parseInt(a.RFU || a.Height || a.PeakHeight || '0', 10)
        }))
        .filter(a => a.name && a.name !== '[object Object]')
        .sort((a, b) => b.height - a.height);

      if (parsedAlleles.length > 0) {
        markers[locusName] = {
          allele1: parsedAlleles[0].name,
          allele2: parsedAlleles.length > 1 ? parsedAlleles[1].name : parsedAlleles[0].name,
          peakHeight1: parsedAlleles[0].height,
          peakHeight2: parsedAlleles.length > 1 ? parsedAlleles[1].height : parsedAlleles[0].height
        };

        if (parsedAlleles.length >= 3 && parsedAlleles[2].height > 0) {
          markers[locusName].allele3 = parsedAlleles[2].name;
          markers[locusName].peakHeight3 = parsedAlleles[2].height;
        }
        continue;
      }

      // Try embedded format (Allele1/Allele2/Height1/Height2)
      const allele1 = locus.Allele1;
      const allele2 = locus.Allele2;

      if (allele1) {
        const height1 = parseInt(locus.Height1 || locus.RFU1 || '0', 10);
        const height2 = parseInt(locus.Height2 || locus.RFU2 || '0', 10);

        markers[locusName] = {
          allele1: String(allele1),
          allele2: allele2 ? String(allele2) : String(allele1),
          peakHeight1: height1,
          peakHeight2: allele2 ? height2 : height1
        };
      }
    }

    if (Object.keys(markers).length > 0) {
      samples.push({
        sampleName: contract.normalizeSampleName(sampleName),
        markers
      });
    }
  }

  return samples;
}

/**
 * Parse a sample with embedded allele format (Allele1/Allele2/Height1/Height2)
 * @param {string} sampleXml - XML content for a sample
 * @returns {Object|null} Parsed sample data
 */
function parseSampleEmbedded(sampleXml) {
  const sampleName = extractTag(sampleXml, 'Name') ||
                     extractTag(sampleXml, 'SampleName') ||
                     extractTag(sampleXml, 'ID');

  if (!sampleName) return null;

  // Skip controls and ladders
  const lowerName = sampleName.toLowerCase();
  if (lowerName.includes('ladder') ||
      lowerName.includes('control') ||
      lowerName.includes('ils') ||
      lowerName.includes('liz')) {
    return null;
  }

  const markers = {};
  const lociElements = extractAllTags(sampleXml, 'Locus');

  for (const locusXml of lociElements) {
    const locusName = extractTag(locusXml, 'LocusName') ||
                      extractTag(locusXml, 'Name') ||
                      extractTag(locusXml, 'Locus');

    if (!locusName) continue;

    // First try standard allele elements
    const alleleElements = extractAllTags(locusXml, 'Allele');

    if (alleleElements.length > 0) {
      const alleles = [];
      for (const alleleXml of alleleElements) {
        const name = extractTag(alleleXml, 'Name') ||
                     extractTag(alleleXml, 'AlleleValue') ||
                     extractTag(alleleXml, 'Call');
        const rfu = parseInt(extractTag(alleleXml, 'RFU') ||
                             extractTag(alleleXml, 'Height') ||
                             extractTag(alleleXml, 'PeakHeight') || '0', 10);

        if (name) {
          alleles.push({ name: String(name).trim(), height: rfu });
        }
      }

      if (alleles.length > 0) {
        const sorted = alleles.sort((a, b) => b.height - a.height);
        markers[normalizeLocus(locusName)] = {
          allele1: sorted[0].name,
          allele2: sorted.length > 1 ? sorted[1].name : sorted[0].name,
          peakHeight1: sorted[0].height,
          peakHeight2: sorted.length > 1 ? sorted[1].height : sorted[0].height
        };
        continue;
      }
    }

    // Try embedded format (Allele1/Allele2)
    const allele1 = extractTag(locusXml, 'Allele1');
    const allele2 = extractTag(locusXml, 'Allele2');

    if (allele1) {
      const height1 = parseInt(extractTag(locusXml, 'Height1') ||
                               extractTag(locusXml, 'RFU1') || '0', 10);
      const height2 = parseInt(extractTag(locusXml, 'Height2') ||
                               extractTag(locusXml, 'RFU2') || '0', 10);

      markers[normalizeLocus(locusName)] = {
        allele1: allele1,
        allele2: allele2 || allele1,
        peakHeight1: height1,
        peakHeight2: allele2 ? height2 : height1
      };
    }
  }

  if (Object.keys(markers).length === 0) return null;

  return {
    sampleName: contract.normalizeSampleName(sampleName),
    markers
  };
}

/**
 * Parse OSIRIS .oar XML content using regex (fallback)
 * @param {string} content - XML content
 * @returns {Object[]} Array of sample objects
 */
function parseWithRegex(content) {
  const samples = [];
  const sampleElements = extractAllTags(content, 'Sample');

  for (const sampleXml of sampleElements) {
    // Try embedded format first (simpler OSIRIS exports)
    let sample = parseSampleEmbedded(sampleXml);

    // Fall back to standard nested format
    if (!sample) {
      sample = parseSample(sampleXml);
    }

    if (sample) {
      samples.push(sample);
    }
  }

  return samples;
}

/**
 * Parse OSIRIS .oar file content
 * @param {string|Buffer} input - File content as string or Buffer
 * @param {Object} [opts] - Parse options
 * @param {string} [opts.fileName] - Original filename for metadata
 * @returns {Promise<Object>} Contract-shaped import payload
 */
async function parse(input, opts = {}) {
  const content = typeof input === 'string' ? input : input.toString('utf8');

  // Extract metadata
  const metadata = extractMetadata(content);

  // Parse samples
  let samples;
  try {
    if (xml2js) {
      samples = await parseWithXml2js(content);
    } else {
      samples = parseWithRegex(content);
    }
  } catch (error) {
    // Fallback to regex parsing on error
    samples = parseWithRegex(content);
  }

  if (samples.length === 0) {
    return contract.createEmptyPayload('osiris');
  }

  // Build filename
  const runName = metadata.runDate ? metadata.runDate.replace(/[:\s]/g, '_') : 'import';
  const fileName = opts.fileName ||
    `GAR_osiris_${runName}_${Date.now()}.json`;

  return {
    samples,
    importDate: new Date().toISOString(),
    fileName,
    metadata
  };
}

/**
 * Generate method stub - OSIRIS adapter only parses
 * @throws {Error} Always throws - use syntheticAdapter for generation
 */
function generate() {
  throw new Error('OsirisAdapter.generate() not supported - use parse() instead');
}

module.exports = {
  parse,
  generate,

  // Export internals for testing
  _internals: {
    extractTag,
    extractAllTags,
    parseLocus,
    parseSample,
    normalizeLocus,
    extractMetadata,
    parseWithRegex
  }
};
