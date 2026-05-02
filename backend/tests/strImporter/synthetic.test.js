/**
 * Tests for Synthetic STR Results Adapter
 *
 * @jest-environment node
 */

'use strict';

const syntheticAdapter = require('../../services/strImporter/syntheticAdapter');
const contract = require('../../services/strImporter/contract');

const { generate, _internals } = syntheticAdapter;
const {
  mulberry32,
  stringToSeed,
  pickAllele,
  generatePeakHeight,
  generateProfile,
  LOCUS_RANGES
} = _internals;

describe('syntheticAdapter.js', () => {
  describe('mulberry32 (seeded RNG)', () => {
    test('produces deterministic sequence from same seed', () => {
      const rand1 = mulberry32(12345);
      const rand2 = mulberry32(12345);

      const seq1 = [rand1(), rand1(), rand1()];
      const seq2 = [rand2(), rand2(), rand2()];

      expect(seq1).toEqual(seq2);
    });

    test('different seeds produce different sequences', () => {
      const rand1 = mulberry32(12345);
      const rand2 = mulberry32(54321);

      expect(rand1()).not.toBe(rand2());
    });

    test('produces values in [0, 1)', () => {
      const rand = mulberry32(42);
      for (let i = 0; i < 100; i++) {
        const val = rand();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('stringToSeed', () => {
    test('same string produces same seed', () => {
      expect(stringToSeed('POM26_0001_C_Smith')).toBe(stringToSeed('POM26_0001_C_Smith'));
    });

    test('different strings produce different seeds', () => {
      expect(stringToSeed('POM26_0001_C_Smith')).not.toBe(stringToSeed('POM26_0002_F_Smith'));
    });

    test('produces 32-bit unsigned integer', () => {
      const seed = stringToSeed('test');
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(4294967296);
    });
  });

  describe('pickAllele', () => {
    test('AMEL returns X or Y', () => {
      const rand = mulberry32(42);
      const alleles = new Set();
      for (let i = 0; i < 100; i++) {
        alleles.add(pickAllele('AMEL', mulberry32(i)));
      }
      expect(alleles.has('X')).toBe(true);
      expect(alleles.has('Y')).toBe(true);
      expect(alleles.size).toBe(2);
    });

    test('autosomal loci return valid values', () => {
      const rand = mulberry32(42);
      const allele = pickAllele('D3S1358', rand);
      expect(contract.isValidAutosomalAllele(allele)).toBe(true);
    });

    test('TH01 can produce decimal variants', () => {
      const alleles = new Set();
      for (let i = 0; i < 500; i++) {
        alleles.add(pickAllele('TH01', mulberry32(i)));
      }
      // Should have at least one decimal variant given enough samples
      const hasDecimal = [...alleles].some(a => a.includes('.'));
      expect(hasDecimal).toBe(true);
    });

    test('values are within locus range', () => {
      const range = LOCUS_RANGES['D3S1358'];
      for (let i = 0; i < 100; i++) {
        const allele = pickAllele('D3S1358', mulberry32(i));
        const numVal = parseFloat(allele);
        expect(numVal).toBeGreaterThanOrEqual(range.min);
        expect(numVal).toBeLessThanOrEqual(range.max + 0.9); // Allow .2/.3 variants
      }
    });
  });

  describe('generatePeakHeight', () => {
    test('produces values in realistic range', () => {
      const rand = mulberry32(42);
      for (let i = 0; i < 100; i++) {
        const height = generatePeakHeight(mulberry32(i));
        expect(height).toBeGreaterThanOrEqual(200);
        expect(height).toBeLessThanOrEqual(4000);
      }
    });

    test('second allele has balance ratio applied', () => {
      const rand = mulberry32(42);
      const baseHeight = 2000;
      const heights = [];
      for (let i = 0; i < 100; i++) {
        heights.push(generatePeakHeight(mulberry32(i), baseHeight, true));
      }
      // All should be between 60% and 100% of base
      heights.forEach(h => {
        expect(h).toBeGreaterThanOrEqual(baseHeight * 0.6);
        expect(h).toBeLessThanOrEqual(baseHeight);
      });
    });
  });

  describe('generateProfile', () => {
    test('produces all 23 loci by default', () => {
      const markers = generateProfile('TEST_001');
      expect(Object.keys(markers)).toHaveLength(23);
    });

    test('same sample name produces same profile (deterministic)', () => {
      const profile1 = generateProfile('POM26_0001_C_Smith');
      const profile2 = generateProfile('POM26_0001_C_Smith');
      expect(profile1).toEqual(profile2);
    });

    test('different sample names produce different profiles', () => {
      const profile1 = generateProfile('POM26_0001_C_Smith');
      const profile2 = generateProfile('POM26_0002_F_Smith');
      expect(profile1).not.toEqual(profile2);
    });

    test('all markers have required fields', () => {
      const markers = generateProfile('TEST_001');
      for (const [locus, data] of Object.entries(markers)) {
        expect(data).toHaveProperty('allele1');
        expect(data).toHaveProperty('allele2');
        expect(data).toHaveProperty('peakHeight1');
        expect(data).toHaveProperty('peakHeight2');
      }
    });

    test('AMEL has X/Y alleles', () => {
      const markers = generateProfile('TEST_001');
      expect(['X', 'Y']).toContain(markers.AMEL.allele1);
      expect(['X', 'Y']).toContain(markers.AMEL.allele2);
    });

    test('can generate with noise simulation', () => {
      // Run many times to hit the noise paths
      let hasStutter = false;
      let hasDropout = false;
      for (let i = 0; i < 100; i++) {
        const markers = generateProfile(`TEST_${i}`, { simulateNoise: true });
        for (const data of Object.values(markers)) {
          if (data.hasStutter) hasStutter = true;
          if (data.dropout) hasDropout = true;
        }
      }
      // Should hit at least one noise case in 100 samples
      expect(hasStutter || hasDropout).toBe(true);
    });
  });

  describe('generate', () => {
    test('returns valid contract payload', () => {
      const payload = generate({
        sampleNames: ['POM26_0001_C_Smith', 'POM26_0002_F_Smith'],
        sourceTag: 'test'
      });

      const validation = contract.validate(payload);
      expect(validation.valid).toBe(true);
    });

    test('empty sampleNames returns empty payload', () => {
      const payload = generate({ sampleNames: [] });
      expect(payload.samples).toEqual([]);
    });

    test('missing sampleNames returns empty payload', () => {
      const payload = generate({});
      expect(payload.samples).toEqual([]);
    });

    test('includes all requested samples', () => {
      const names = ['A', 'B', 'C'];
      const payload = generate({ sampleNames: names });
      expect(payload.samples).toHaveLength(3);
      expect(payload.samples.map(s => s.sampleName)).toEqual(names);
    });

    test('sourceTag appears in fileName', () => {
      const payload = generate({
        sampleNames: ['TEST'],
        sourceTag: 'mytest'
      });
      expect(payload.fileName).toContain('mytest');
    });

    test('normalizes UPL to UP in sample names', () => {
      const payload = generate({
        sampleNames: ['UPL26_0001_C_Test']
      });
      expect(payload.samples[0].sampleName).toBe('UP26_0001_C_Test');
    });

    test('deterministic: same input produces same output', () => {
      const opts = { sampleNames: ['A', 'B'], sourceTag: 'x' };
      const payload1 = generate(opts);
      const payload2 = generate(opts);

      // Samples should be identical (fileName differs due to timestamp)
      expect(payload1.samples).toEqual(payload2.samples);
    });

    test('peak heights are in valid range', () => {
      const payload = generate({ sampleNames: ['TEST'] });
      for (const sample of payload.samples) {
        for (const data of Object.values(sample.markers)) {
          expect(data.peakHeight1).toBeGreaterThanOrEqual(200);
          expect(data.peakHeight1).toBeLessThanOrEqual(4000);
          expect(data.peakHeight2).toBeGreaterThanOrEqual(100);
          expect(data.peakHeight2).toBeLessThanOrEqual(4000);
        }
      }
    });
  });

  describe('parse', () => {
    test('throws error (not supported)', async () => {
      await expect(syntheticAdapter.parse()).rejects.toThrow('not supported');
    });
  });

  describe('family relationships', () => {
    test('child can share alleles with parents when families generated', () => {
      // Generate a family: mother, father, then child
      const payload = generate({
        sampleNames: [
          'POM26_0001_M_Test',  // Mother
          'POM26_0001_F_Test',  // Father
          'POM26_0001_C_Test'   // Child
        ],
        generateFamilies: true
      });

      expect(payload.samples).toHaveLength(3);

      const mother = payload.samples[0].markers;
      const father = payload.samples[1].markers;
      const child = payload.samples[2].markers;

      // For each locus, child should have one allele from each parent
      for (const locus of contract.AUTOSOMAL_LOCI) {
        const childAlleles = [child[locus].allele1, child[locus].allele2];
        const motherAlleles = [mother[locus].allele1, mother[locus].allele2];
        const fatherAlleles = [father[locus].allele1, father[locus].allele2];

        // At least one child allele should be in mother's alleles
        const fromMother = childAlleles.some(a => motherAlleles.includes(a));
        // At least one child allele should be in father's alleles
        const fromFather = childAlleles.some(a => fatherAlleles.includes(a));

        expect(fromMother).toBe(true);
        expect(fromFather).toBe(true);
      }
    });
  });
});
