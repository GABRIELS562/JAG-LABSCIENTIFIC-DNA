/**
 * Tests for GeneMapper STR Results Adapter
 *
 * @jest-environment node
 */

'use strict';

const genemapperAdapter = require('../../services/strImporter/genemapperAdapter');
const contract = require('../../services/strImporter/contract');

const { parse, _internals } = genemapperAdapter;
const {
  parseLine,
  normalizeLocus,
  groupPeaks,
  selectAlleles,
  COLUMNS,
  SIZE_STANDARD_DYES
} = _internals;

// Sample GeneMapper export content
const SAMPLE_EXPORT = `# Applied Biosystems 3130xl Genetic Analyzer Data Export
# Analysis Software: GeneMapper ID v4.1
# Run Name: Test_Run_001
# Kit: PowerPlex ESX 17 System
#
# Sample_Name	Well	Dye	Locus	Allele	Size	Height	Area	Data_Point	Peak_Start	Peak_End	Comment
25_001_Child	A01	FAM	D3S1358	15	164.21	2845	15234	2341	2335	2348
25_001_Child	A01	FAM	D3S1358	16	168.18	3201	17856	2356	2350	2363
25_001_Child	A01	VIC	AMEL	X	106.58	4567	25789	1456	1450	1463
25_001_Child	A01	VIC	AMEL	Y	112.65	4234	23456	1472	1466	1479
25_001_Child	A01	NED	TH01	7	198.76	2789	15678	2456	2450	2463
25_001_Child	A01	NED	TH01	9.3	214.82	2567	14234	2567	2561	2574
25_001_Child	A01	LIZ	ILS-600	100	100.00	14567	85234	1123	1117	1130	Size Standard
25_002_Father	A02	FAM	D3S1358	14	160.24	2967	16234	2323	2317	2330
25_002_Father	A02	FAM	D3S1358	16	168.18	3124	17456	2356	2350	2363
25_002_Father	A02	VIC	AMEL	X	106.58	4234	23456	1456	1450	1463
25_002_Father	A02	VIC	AMEL	Y	112.65	4567	25789	1472	1466	1479
25_002_Father	A02	NED	TH01	6	194.79	2567	14567	2434	2428	2441
25_002_Father	A02	NED	TH01	7	198.76	2789	15678	2456	2450	2463
`;

describe('genemapperAdapter.js', () => {
  describe('parseLine', () => {
    test('parses valid data line', () => {
      const line = '25_001_Child\tA01\tFAM\tD3S1358\t15\t164.21\t2845\t15234\t2341\t2335\t2348\t';
      const result = parseLine(line);

      expect(result).toEqual({
        sampleName: '25_001_Child',
        well: 'A01',
        dye: 'FAM',
        locus: 'D3S1358',
        allele: '15',
        size: 164.21,
        height: 2845,
        area: 15234,
        comment: ''
      });
    });

    test('filters out LIZ size standard', () => {
      const line = '25_001_Child\tA01\tLIZ\tILS-600\t100\t100.00\t14567\t85234\t1123\t1117\t1130\tSize Standard';
      const result = parseLine(line);
      expect(result).toBeNull();
    });

    test('filters out other size standard dyes', () => {
      for (const dye of SIZE_STANDARD_DYES) {
        const line = `Sample\tA01\t${dye}\tLocus\t15\t100.00\t1000\t5000\t100\t95\t105`;
        expect(parseLine(line)).toBeNull();
      }
    });

    test('returns null for lines with missing essential data', () => {
      expect(parseLine('')).toBeNull();
      expect(parseLine('\t\t\t\t\t\t')).toBeNull();
      expect(parseLine('Sample\tA01')).toBeNull();
    });

    test('parses decimal alleles correctly', () => {
      const line = '25_001_Child\tA01\tNED\tTH01\t9.3\t214.82\t2567\t14234\t2567\t2561\t2574\t';
      const result = parseLine(line);

      expect(result.allele).toBe('9.3');
      expect(result.locus).toBe('TH01');
    });

    test('parses AMEL alleles', () => {
      const lineX = '25_001_Child\tA01\tVIC\tAMEL\tX\t106.58\t4567\t25789\t1456\t1450\t1463\t';
      const lineY = '25_001_Child\tA01\tVIC\tAMEL\tY\t112.65\t4234\t23456\t1472\t1466\t1479\t';

      expect(parseLine(lineX).allele).toBe('X');
      expect(parseLine(lineY).allele).toBe('Y');
    });
  });

  describe('normalizeLocus', () => {
    test('normalizes AMELOGENIN to AMEL', () => {
      expect(normalizeLocus('AMELOGENIN')).toBe('AMEL');
      expect(normalizeLocus('amelogenin')).toBe('AMEL');
    });

    test('normalizes vWA variations', () => {
      expect(normalizeLocus('VWA')).toBe('vWA');
      expect(normalizeLocus('vwa')).toBe('vWA');
    });

    test('normalizes Penta loci', () => {
      expect(normalizeLocus('PENTA E')).toBe('Penta_E');
      expect(normalizeLocus('PENTAE')).toBe('Penta_E');
      expect(normalizeLocus('PENTA D')).toBe('Penta_D');
    });

    test('preserves standard locus names', () => {
      expect(normalizeLocus('D3S1358')).toBe('D3S1358');
      expect(normalizeLocus('TH01')).toBe('TH01');
      expect(normalizeLocus('FGA')).toBe('FGA');
    });

    test('handles null/undefined', () => {
      expect(normalizeLocus(null)).toBe(null);
      expect(normalizeLocus(undefined)).toBe(undefined);
    });
  });

  describe('groupPeaks', () => {
    test('groups peaks by sample and locus', () => {
      const peaks = [
        { sampleName: 'Sample1', locus: 'D3S1358', allele: '15', height: 2000, size: 164 },
        { sampleName: 'Sample1', locus: 'D3S1358', allele: '16', height: 2100, size: 168 },
        { sampleName: 'Sample1', locus: 'AMEL', allele: 'X', height: 3000, size: 106 },
        { sampleName: 'Sample2', locus: 'D3S1358', allele: '14', height: 1900, size: 160 }
      ];

      const grouped = groupPeaks(peaks);

      expect(grouped.size).toBe(2);
      expect(grouped.get('Sample1').size).toBe(2);
      expect(grouped.get('Sample1').get('D3S1358')).toHaveLength(2);
      expect(grouped.get('Sample1').get('AMEL')).toHaveLength(1);
      expect(grouped.get('Sample2').get('D3S1358')).toHaveLength(1);
    });
  });

  describe('selectAlleles', () => {
    test('selects top 2 alleles by height', () => {
      const alleleData = [
        { allele: '15', height: 2000, size: 164 },
        { allele: '16', height: 2500, size: 168 },
        { allele: '14', height: 500, size: 160 }  // Low stutter peak
      ];

      const result = selectAlleles(alleleData);

      expect(result.allele1).toBe('16');  // Highest
      expect(result.allele2).toBe('15');  // Second highest
      expect(result.peakHeight1).toBe(2500);
      expect(result.peakHeight2).toBe(2000);
    });

    test('handles homozygous (single allele)', () => {
      const alleleData = [
        { allele: '15', height: 4000, size: 164 }
      ];

      const result = selectAlleles(alleleData);

      expect(result.allele1).toBe('15');
      expect(result.allele2).toBe('15');
      expect(result.peakHeight1).toBe(4000);
      expect(result.peakHeight2).toBe(4000);
    });

    test('includes third allele for tri-allelic', () => {
      const alleleData = [
        { allele: '15', height: 2000, size: 164 },
        { allele: '16', height: 2100, size: 168 },
        { allele: '17', height: 1900, size: 172 }
      ];

      const result = selectAlleles(alleleData);

      expect(result.allele1).toBe('16');
      expect(result.allele2).toBe('15');
      expect(result.allele3).toBe('17');
      expect(result.peakHeight3).toBe(1900);
    });

    test('returns null for empty input', () => {
      expect(selectAlleles([])).toBeNull();
    });
  });

  describe('parse', () => {
    test('parses sample export to contract format', async () => {
      const payload = await parse(SAMPLE_EXPORT);

      expect(payload.samples).toHaveLength(2);
      expect(payload.samples[0].sampleName).toBe('25_001_Child');
      expect(payload.samples[1].sampleName).toBe('25_002_Father');
    });

    test('extracts markers correctly', async () => {
      const payload = await parse(SAMPLE_EXPORT);
      const child = payload.samples.find(s => s.sampleName === '25_001_Child');

      expect(child.markers).toHaveProperty('D3S1358');
      expect(child.markers).toHaveProperty('AMEL');
      expect(child.markers).toHaveProperty('TH01');

      // D3S1358 should have alleles 15 and 16
      expect(['15', '16']).toContain(child.markers.D3S1358.allele1);
      expect(['15', '16']).toContain(child.markers.D3S1358.allele2);

      // AMEL should have X and Y
      expect(['X', 'Y']).toContain(child.markers.AMEL.allele1);
      expect(['X', 'Y']).toContain(child.markers.AMEL.allele2);
    });

    test('filters out size standard data', async () => {
      const payload = await parse(SAMPLE_EXPORT);
      const child = payload.samples.find(s => s.sampleName === '25_001_Child');

      // Should not have ILS-600
      expect(child.markers).not.toHaveProperty('ILS-600');
    });

    test('includes import metadata', async () => {
      const payload = await parse(SAMPLE_EXPORT);

      expect(payload.importDate).toBeDefined();
      expect(payload.fileName).toContain('genemapper');
      expect(payload.metadata).toBeDefined();
      expect(payload.metadata.source).toBe('genemapper');
      expect(payload.metadata.run_name).toBe('Test_Run_001');
    });

    test('validates against contract', async () => {
      const payload = await parse(SAMPLE_EXPORT);
      const validation = contract.validate(payload);

      expect(validation.valid).toBe(true);
    });

    test('handles Buffer input', async () => {
      const buffer = Buffer.from(SAMPLE_EXPORT, 'utf8');
      const payload = await parse(buffer);

      expect(payload.samples).toHaveLength(2);
    });

    test('returns empty payload for empty content', async () => {
      const payload = await parse('');

      expect(payload.samples).toEqual([]);
    });

    test('returns empty payload for header-only content', async () => {
      const headerOnly = `# Comment line
# Another comment
# Sample_Name	Well	Dye	Locus	Allele	Size	Height
`;
      const payload = await parse(headerOnly);

      expect(payload.samples).toEqual([]);
    });

    test('uses custom fileName when provided', async () => {
      const payload = await parse(SAMPLE_EXPORT, { fileName: 'custom_import.json' });

      expect(payload.fileName).toBe('custom_import.json');
    });

    test('normalizes sample names (UPL -> UP)', async () => {
      const content = `# Sample_Name	Well	Dye	Locus	Allele	Size	Height	Area
UPL26_0001_C_Test	A01	FAM	D3S1358	15	164.21	2845	15234
UPL26_0001_C_Test	A01	FAM	D3S1358	16	168.18	3201	17856
`;
      const payload = await parse(content);

      expect(payload.samples[0].sampleName).toBe('UP26_0001_C_Test');
    });
  });

  describe('generate', () => {
    test('throws error (not supported)', () => {
      expect(() => genemapperAdapter.generate()).toThrow('not supported');
    });
  });

  describe('integration with contract', () => {
    test('all parsed markers have valid allele values', async () => {
      const payload = await parse(SAMPLE_EXPORT);

      for (const sample of payload.samples) {
        for (const [locus, data] of Object.entries(sample.markers)) {
          const errors = contract.validateMarker(locus, data, sample.sampleName);
          expect(errors).toHaveLength(0);
        }
      }
    });
  });
});
