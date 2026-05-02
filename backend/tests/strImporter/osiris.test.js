/**
 * Tests for OSIRIS STR Results Adapter
 *
 * @jest-environment node
 */

'use strict';

const osirisAdapter = require('../../services/strImporter/osirisAdapter');
const contract = require('../../services/strImporter/contract');

const { parse, _internals } = osirisAdapter;
const {
  extractTag,
  extractAllTags,
  parseLocus,
  parseSample,
  normalizeLocus,
  extractMetadata,
  parseWithRegex
} = _internals;

// Sample OSIRIS XML content with full structure
const SAMPLE_OSIRIS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OsirisAnalysisReport>
  <Version>2.16</Version>
  <Settings>
    <Kit>PowerPlex ESX 17</Kit>
    <ILS>ABI-LIZ500</ILS>
    <MinRFU>150</MinRFU>
  </Settings>
  <Table>
    <Sample>
      <Name>25_001_Child</Name>
      <File>25_001_Child.fsa</File>
      <Status>Success</Status>
      <Locus>
        <LocusName>D3S1358</LocusName>
        <Allele>
          <Name>15</Name>
          <RFU>2845</RFU>
          <BP>164.21</BP>
        </Allele>
        <Allele>
          <Name>16</Name>
          <RFU>3201</RFU>
          <BP>168.18</BP>
        </Allele>
      </Locus>
      <Locus>
        <LocusName>AMEL</LocusName>
        <Allele>
          <Name>X</Name>
          <RFU>4567</RFU>
          <BP>106.58</BP>
        </Allele>
        <Allele>
          <Name>Y</Name>
          <RFU>4234</RFU>
          <BP>112.65</BP>
        </Allele>
      </Locus>
      <Locus>
        <LocusName>TH01</LocusName>
        <Allele>
          <Name>7</Name>
          <RFU>2789</RFU>
          <BP>198.76</BP>
        </Allele>
        <Allele>
          <Name>9.3</Name>
          <RFU>2567</RFU>
          <BP>214.82</BP>
        </Allele>
      </Locus>
    </Sample>
    <Sample>
      <Name>25_002_Father</Name>
      <File>25_002_Father.fsa</File>
      <Status>Success</Status>
      <Locus>
        <LocusName>D3S1358</LocusName>
        <Allele>
          <Name>14</Name>
          <RFU>2967</RFU>
          <BP>160.24</BP>
        </Allele>
        <Allele>
          <Name>16</Name>
          <RFU>3124</RFU>
          <BP>168.18</BP>
        </Allele>
      </Locus>
      <Locus>
        <LocusName>AMEL</LocusName>
        <Allele>
          <Name>X</Name>
          <RFU>4234</RFU>
          <BP>106.58</BP>
        </Allele>
        <Allele>
          <Name>Y</Name>
          <RFU>4567</RFU>
          <BP>112.65</BP>
        </Allele>
      </Locus>
    </Sample>
    <Sample>
      <Name>Positive_Control</Name>
      <File>Positive_Control.fsa</File>
      <Status>Success</Status>
      <Locus>
        <LocusName>D3S1358</LocusName>
        <Allele>
          <Name>15</Name>
          <RFU>3000</RFU>
          <BP>164.21</BP>
        </Allele>
      </Locus>
    </Sample>
    <Sample>
      <Name>LADDER</Name>
      <File>LADDER.fsa</File>
      <Status>Success</Status>
    </Sample>
  </Table>
  <Analysis>
    <StartTime>2025-01-20T14:30:00Z</StartTime>
    <EndTime>2025-01-20T14:38:42Z</EndTime>
  </Analysis>
</OsirisAnalysisReport>`;

// Simpler XML format (some OSIRIS exports)
const SIMPLE_OSIRIS_XML = `<?xml version="1.0"?>
<OsirisAnalysisReport>
  <Version>2.14</Version>
  <Kit>Identifiler Plus</Kit>
  <Sample>
    <Name>Sample_001</Name>
    <Locus>
      <Name>D3S1358</Name>
      <Allele1>15</Allele1>
      <Allele2>16</Allele2>
      <Height1>2500</Height1>
      <Height2>2600</Height2>
    </Locus>
    <Locus>
      <Name>AMEL</Name>
      <Allele1>X</Allele1>
      <Allele2>Y</Allele2>
    </Locus>
  </Sample>
</OsirisAnalysisReport>`;

describe('osirisAdapter.js', () => {
  describe('extractTag', () => {
    test('extracts simple tag content', () => {
      const xml = '<Name>TestValue</Name>';
      expect(extractTag(xml, 'Name')).toBe('TestValue');
    });

    test('extracts tag with whitespace', () => {
      const xml = '<Name>  Test Value  </Name>';
      expect(extractTag(xml, 'Name')).toBe('Test Value');
    });

    test('returns null for missing tag', () => {
      const xml = '<Name>Test</Name>';
      expect(extractTag(xml, 'Other')).toBeNull();
    });

    test('handles case-insensitive matching', () => {
      const xml = '<NAME>Test</NAME>';
      expect(extractTag(xml, 'name')).toBe('Test');
    });
  });

  describe('extractAllTags', () => {
    test('extracts multiple occurrences', () => {
      const xml = '<Allele><Name>15</Name></Allele><Allele><Name>16</Name></Allele>';
      const results = extractAllTags(xml, 'Allele');
      expect(results).toHaveLength(2);
    });

    test('handles nested content', () => {
      const xml = '<Locus><Name>D3S1358</Name><Allele>15</Allele></Locus>';
      const results = extractAllTags(xml, 'Locus');
      expect(results).toHaveLength(1);
      expect(results[0]).toContain('D3S1358');
    });

    test('returns empty array for no matches', () => {
      const xml = '<Other>Test</Other>';
      expect(extractAllTags(xml, 'Allele')).toEqual([]);
    });
  });

  describe('parseLocus', () => {
    test('parses locus with alleles', () => {
      const locusXml = `
        <Locus>
          <LocusName>D3S1358</LocusName>
          <Allele>
            <Name>15</Name>
            <RFU>2500</RFU>
            <BP>164.21</BP>
          </Allele>
          <Allele>
            <Name>16</Name>
            <RFU>2600</RFU>
            <BP>168.18</BP>
          </Allele>
        </Locus>
      `;

      const result = parseLocus(locusXml);

      expect(result).not.toBeNull();
      expect(result.locusName).toBe('D3S1358');
      expect(result.alleles).toHaveLength(2);
      expect(result.alleles[0].name).toBe('15');
      expect(result.alleles[0].height).toBe(2500);
    });

    test('parses embedded allele format', () => {
      const locusXml = `
        <Locus>
          <Name>AMEL</Name>
          <Allele1>X</Allele1>
          <Allele2>Y</Allele2>
          <Height1>4000</Height1>
          <Height2>3800</Height2>
        </Locus>
      `;

      const result = parseLocus(locusXml);

      expect(result).not.toBeNull();
      expect(result.locusName).toBe('AMEL');
      expect(result.alleles).toHaveLength(2);
    });

    test('returns null for empty locus', () => {
      expect(parseLocus('<Locus></Locus>')).toBeNull();
    });
  });

  describe('parseSample', () => {
    test('parses sample with loci', () => {
      const sampleXml = `
        <Sample>
          <Name>25_001_Child</Name>
          <Locus>
            <LocusName>D3S1358</LocusName>
            <Allele><Name>15</Name><RFU>2500</RFU></Allele>
            <Allele><Name>16</Name><RFU>2600</RFU></Allele>
          </Locus>
        </Sample>
      `;

      const result = parseSample(sampleXml);

      expect(result).not.toBeNull();
      expect(result.sampleName).toBe('25_001_Child');
      expect(result.markers).toHaveProperty('D3S1358');
    });

    test('skips controls', () => {
      expect(parseSample('<Sample><Name>Positive_Control</Name></Sample>')).toBeNull();
      expect(parseSample('<Sample><Name>Negative_Control</Name></Sample>')).toBeNull();
      expect(parseSample('<Sample><Name>LADDER</Name></Sample>')).toBeNull();
    });

    test('normalizes sample names', () => {
      const sampleXml = `
        <Sample>
          <Name>UPL26_0001_C_Test</Name>
          <Locus>
            <LocusName>AMEL</LocusName>
            <Allele><Name>X</Name><RFU>4000</RFU></Allele>
          </Locus>
        </Sample>
      `;

      const result = parseSample(sampleXml);
      expect(result.sampleName).toBe('UP26_0001_C_Test');
    });
  });

  describe('normalizeLocus', () => {
    test('normalizes AMELOGENIN to AMEL', () => {
      expect(normalizeLocus('AMELOGENIN')).toBe('AMEL');
    });

    test('normalizes vWA', () => {
      expect(normalizeLocus('VWA')).toBe('vWA');
      expect(normalizeLocus('vwa')).toBe('vWA');
    });

    test('normalizes Penta loci', () => {
      expect(normalizeLocus('PENTA E')).toBe('Penta_E');
      expect(normalizeLocus('PENTA D')).toBe('Penta_D');
    });

    test('preserves standard names', () => {
      expect(normalizeLocus('D3S1358')).toBe('D3S1358');
      expect(normalizeLocus('TH01')).toBe('TH01');
    });
  });

  describe('extractMetadata', () => {
    test('extracts version', () => {
      const xml = '<OsirisAnalysisReport><Version>2.16</Version></OsirisAnalysisReport>';
      const meta = extractMetadata(xml);
      expect(meta.version).toBe('2.16');
    });

    test('extracts kit', () => {
      const xml = '<Settings><Kit>PowerPlex ESX 17</Kit></Settings>';
      const meta = extractMetadata(xml);
      expect(meta.kit).toBe('PowerPlex ESX 17');
    });

    test('extracts minRFU as number', () => {
      const xml = '<Settings><MinRFU>150</MinRFU></Settings>';
      const meta = extractMetadata(xml);
      expect(meta.minRfu).toBe(150);
    });

    test('always includes source', () => {
      const meta = extractMetadata('');
      expect(meta.source).toBe('osiris');
    });
  });

  describe('parse', () => {
    test('parses full OSIRIS XML', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML);

      expect(payload.samples).toHaveLength(2); // Excludes controls
      expect(payload.samples[0].sampleName).toBe('25_001_Child');
      expect(payload.samples[1].sampleName).toBe('25_002_Father');
    });

    test('extracts markers correctly', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML);
      const child = payload.samples.find(s => s.sampleName === '25_001_Child');

      expect(child.markers).toHaveProperty('D3S1358');
      expect(child.markers).toHaveProperty('AMEL');
      expect(child.markers).toHaveProperty('TH01');
    });

    test('sorts alleles by height', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML);
      const child = payload.samples.find(s => s.sampleName === '25_001_Child');

      // D3S1358: allele 16 has height 3201, allele 15 has 2845
      expect(child.markers.D3S1358.allele1).toBe('16');
      expect(child.markers.D3S1358.allele2).toBe('15');
      expect(child.markers.D3S1358.peakHeight1).toBe(3201);
    });

    test('validates against contract', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML);
      const validation = contract.validate(payload);

      expect(validation.valid).toBe(true);
    });

    test('includes metadata', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML);

      expect(payload.metadata).toBeDefined();
      expect(payload.metadata.source).toBe('osiris');
      expect(payload.metadata.version).toBe('2.16');
      expect(payload.metadata.kit).toBe('PowerPlex ESX 17');
    });

    test('handles Buffer input', async () => {
      const buffer = Buffer.from(SAMPLE_OSIRIS_XML, 'utf8');
      const payload = await parse(buffer);

      expect(payload.samples).toHaveLength(2);
    });

    test('returns empty payload for empty content', async () => {
      const payload = await parse('');
      expect(payload.samples).toEqual([]);
    });

    test('returns empty payload for XML with only controls', async () => {
      const xml = `<?xml version="1.0"?>
        <OsirisAnalysisReport>
          <Sample><Name>LADDER</Name></Sample>
          <Sample><Name>Positive_Control</Name></Sample>
        </OsirisAnalysisReport>`;

      const payload = await parse(xml);
      expect(payload.samples).toEqual([]);
    });

    test('uses custom fileName when provided', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML, { fileName: 'custom.json' });
      expect(payload.fileName).toBe('custom.json');
    });

    test('generates fileName with osiris prefix', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML);
      expect(payload.fileName).toContain('osiris');
    });

    test('parses simpler XML format', async () => {
      const payload = await parse(SIMPLE_OSIRIS_XML);

      expect(payload.samples).toHaveLength(1);
      expect(payload.samples[0].sampleName).toBe('Sample_001');
      expect(payload.samples[0].markers).toHaveProperty('D3S1358');
      expect(payload.samples[0].markers).toHaveProperty('AMEL');
    });

    test('handles decimal alleles', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML);
      const child = payload.samples.find(s => s.sampleName === '25_001_Child');

      // TH01 should have 9.3 allele
      expect(['7', '9.3']).toContain(child.markers.TH01.allele1);
      expect(['7', '9.3']).toContain(child.markers.TH01.allele2);
    });
  });

  describe('generate', () => {
    test('throws error (not supported)', () => {
      expect(() => osirisAdapter.generate()).toThrow('not supported');
    });
  });

  describe('integration with contract', () => {
    test('all parsed markers have valid allele values', async () => {
      const payload = await parse(SAMPLE_OSIRIS_XML);

      for (const sample of payload.samples) {
        for (const [locus, data] of Object.entries(sample.markers)) {
          const errors = contract.validateMarker(locus, data, sample.sampleName);
          expect(errors).toHaveLength(0);
        }
      }
    });
  });
});
