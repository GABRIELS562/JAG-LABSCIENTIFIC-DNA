/**
 * Tests for STR Import Contract Validation
 *
 * @jest-environment node
 */

'use strict';

const {
  validate,
  isValidAmelAllele,
  isValidAutosomalAllele,
  validateMarker,
  validateSample,
  normalizeSampleName,
  parseSampleName,
  createEmptyPayload,
  STANDARD_LOCI,
  SEX_MARKER,
  AUTOSOMAL_LOCI
} = require('../../services/strImporter/contract');

describe('contract.js', () => {
  describe('Constants', () => {
    test('STANDARD_LOCI contains 23 markers', () => {
      expect(STANDARD_LOCI).toHaveLength(23);
    });

    test('STANDARD_LOCI includes AMEL', () => {
      expect(STANDARD_LOCI).toContain('AMEL');
    });

    test('AUTOSOMAL_LOCI contains 22 markers (excludes AMEL)', () => {
      expect(AUTOSOMAL_LOCI).toHaveLength(22);
      expect(AUTOSOMAL_LOCI).not.toContain('AMEL');
    });

    test('SEX_MARKER is AMEL', () => {
      expect(SEX_MARKER).toBe('AMEL');
    });
  });

  describe('isValidAmelAllele', () => {
    test('accepts X', () => {
      expect(isValidAmelAllele('X')).toBe(true);
    });

    test('accepts Y', () => {
      expect(isValidAmelAllele('Y')).toBe(true);
    });

    test('accepts lowercase x and y', () => {
      expect(isValidAmelAllele('x')).toBe(true);
      expect(isValidAmelAllele('y')).toBe(true);
    });

    test('accepts with whitespace', () => {
      expect(isValidAmelAllele(' X ')).toBe(true);
      expect(isValidAmelAllele(' Y ')).toBe(true);
    });

    test('rejects numbers', () => {
      expect(isValidAmelAllele('15')).toBe(false);
      expect(isValidAmelAllele('9.3')).toBe(false);
    });

    test('rejects other letters', () => {
      expect(isValidAmelAllele('Z')).toBe(false);
      expect(isValidAmelAllele('XY')).toBe(false);
    });

    test('rejects non-strings', () => {
      expect(isValidAmelAllele(null)).toBe(false);
      expect(isValidAmelAllele(undefined)).toBe(false);
      expect(isValidAmelAllele(15)).toBe(false);
    });
  });

  describe('isValidAutosomalAllele', () => {
    test('accepts integers as strings', () => {
      expect(isValidAutosomalAllele('15')).toBe(true);
      expect(isValidAutosomalAllele('9')).toBe(true);
      expect(isValidAutosomalAllele('30')).toBe(true);
    });

    test('accepts decimals with single digit', () => {
      expect(isValidAutosomalAllele('9.3')).toBe(true);
      expect(isValidAutosomalAllele('30.2')).toBe(true);
      expect(isValidAutosomalAllele('15.1')).toBe(true);
    });

    test('rejects decimals with multiple digits', () => {
      expect(isValidAutosomalAllele('9.33')).toBe(false);
      expect(isValidAutosomalAllele('15.12')).toBe(false);
    });

    test('rejects X/Y', () => {
      expect(isValidAutosomalAllele('X')).toBe(false);
      expect(isValidAutosomalAllele('Y')).toBe(false);
    });

    test('rejects non-numeric strings', () => {
      expect(isValidAutosomalAllele('abc')).toBe(false);
      expect(isValidAutosomalAllele('')).toBe(false);
    });

    test('rejects non-strings', () => {
      expect(isValidAutosomalAllele(null)).toBe(false);
      expect(isValidAutosomalAllele(undefined)).toBe(false);
      expect(isValidAutosomalAllele(15)).toBe(false);
    });
  });

  describe('validateMarker', () => {
    test('valid autosomal marker passes', () => {
      const errors = validateMarker('D3S1358', {
        allele1: '15',
        allele2: '17',
        peakHeight1: 1234,
        peakHeight2: 1180
      }, 'TEST_001');
      expect(errors).toHaveLength(0);
    });

    test('valid AMEL marker passes', () => {
      const errors = validateMarker('AMEL', {
        allele1: 'X',
        allele2: 'Y'
      }, 'TEST_001');
      expect(errors).toHaveLength(0);
    });

    test('missing allele1 fails', () => {
      const errors = validateMarker('D3S1358', {
        allele2: '17'
      }, 'TEST_001');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('missing allele1');
    });

    test('missing allele2 fails', () => {
      const errors = validateMarker('D3S1358', {
        allele1: '15'
      }, 'TEST_001');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('missing allele2');
    });

    test('invalid autosomal allele fails', () => {
      const errors = validateMarker('D3S1358', {
        allele1: 'X',
        allele2: '17'
      }, 'TEST_001');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('invalid');
    });

    test('invalid AMEL allele fails', () => {
      const errors = validateMarker('AMEL', {
        allele1: '15',
        allele2: 'Y'
      }, 'TEST_001');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('invalid for AMEL');
    });

    test('negative peak height fails', () => {
      const errors = validateMarker('D3S1358', {
        allele1: '15',
        allele2: '17',
        peakHeight1: -100
      }, 'TEST_001');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('non-negative');
    });

    test('tri-allelic marker accepted', () => {
      const errors = validateMarker('D21S11', {
        allele1: '29',
        allele2: '30',
        allele3: '31'
      }, 'TEST_001');
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateSample', () => {
    test('valid sample passes', () => {
      const sample = {
        sampleName: 'POM26_0001_C_Smith',
        markers: {
          'D3S1358': { allele1: '15', allele2: '17' },
          'AMEL': { allele1: 'X', allele2: 'Y' }
        }
      };
      const errors = validateSample(sample, 0);
      expect(errors).toHaveLength(0);
    });

    test('missing sampleName fails', () => {
      const sample = {
        markers: {
          'D3S1358': { allele1: '15', allele2: '17' }
        }
      };
      const errors = validateSample(sample, 0);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('sampleName');
    });

    test('empty sampleName fails', () => {
      const sample = {
        sampleName: '',
        markers: {
          'D3S1358': { allele1: '15', allele2: '17' }
        }
      };
      const errors = validateSample(sample, 0);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('sampleName');
    });

    test('missing markers fails', () => {
      const sample = {
        sampleName: 'TEST_001'
      };
      const errors = validateSample(sample, 0);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('markers');
    });

    test('empty markers fails', () => {
      const sample = {
        sampleName: 'TEST_001',
        markers: {}
      };
      const errors = validateSample(sample, 0);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('empty');
    });
  });

  describe('validate (full payload)', () => {
    const validPayload = {
      samples: [
        {
          sampleName: 'POM26_0001_C_Smith',
          markers: {
            'D3S1358': { allele1: '15', allele2: '17', peakHeight1: 1234, peakHeight2: 1180 },
            'vWA': { allele1: '16', allele2: '18', peakHeight1: 980, peakHeight2: 1020 },
            'AMEL': { allele1: 'X', allele2: 'Y' }
          }
        }
      ],
      importDate: '2026-05-02T12:00:00Z',
      fileName: 'GAR_synthetic_1234567890.json'
    };

    test('valid payload passes', () => {
      const result = validate(validPayload);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('null payload fails', () => {
      const result = validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Payload must be an object');
    });

    test('missing samples fails', () => {
      const result = validate({
        importDate: '2026-05-02T12:00:00Z',
        fileName: 'test.json'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('samples'))).toBe(true);
    });

    test('empty samples array fails', () => {
      const result = validate({
        samples: [],
        importDate: '2026-05-02T12:00:00Z',
        fileName: 'test.json'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    test('missing importDate fails', () => {
      const result = validate({
        samples: validPayload.samples,
        fileName: 'test.json'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('importDate'))).toBe(true);
    });

    test('invalid importDate fails', () => {
      const result = validate({
        samples: validPayload.samples,
        importDate: 'not-a-date',
        fileName: 'test.json'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ISO 8601'))).toBe(true);
    });

    test('missing fileName fails', () => {
      const result = validate({
        samples: validPayload.samples,
        importDate: '2026-05-02T12:00:00Z'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('fileName'))).toBe(true);
    });

    test('empty fileName fails', () => {
      const result = validate({
        samples: validPayload.samples,
        importDate: '2026-05-02T12:00:00Z',
        fileName: ''
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('fileName'))).toBe(true);
    });

    test('multiple samples validated', () => {
      const payload = {
        samples: [
          {
            sampleName: 'POM26_0001_C_Smith',
            markers: { 'D3S1358': { allele1: '15', allele2: '17' } }
          },
          {
            sampleName: 'POM26_0002_F_Smith',
            markers: { 'D3S1358': { allele1: '15', allele2: '18' } }
          }
        ],
        importDate: '2026-05-02T12:00:00Z',
        fileName: 'test.json'
      };
      const result = validate(payload);
      expect(result.valid).toBe(true);
    });

    test('collects all errors', () => {
      const payload = {
        samples: [
          {
            sampleName: '',
            markers: {}
          },
          {
            sampleName: 'TEST',
            markers: {
              'AMEL': { allele1: '15', allele2: '17' }
            }
          }
        ],
        importDate: 'bad-date',
        fileName: ''
      };
      const result = validate(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('normalizeSampleName', () => {
    test('UPL -> UP normalization', () => {
      expect(normalizeSampleName('UPL26_0001_C_Smith')).toBe('UP26_0001_C_Smith');
    });

    test('leaves UP unchanged', () => {
      expect(normalizeSampleName('UP26_0001_C_Smith')).toBe('UP26_0001_C_Smith');
    });

    test('leaves other prefixes unchanged', () => {
      expect(normalizeSampleName('POM26_0001_C_Smith')).toBe('POM26_0001_C_Smith');
      expect(normalizeSampleName('LT26_0001_M_Jones')).toBe('LT26_0001_M_Jones');
    });

    test('handles null/undefined', () => {
      expect(normalizeSampleName(null)).toBe(null);
      expect(normalizeSampleName(undefined)).toBe(undefined);
    });
  });

  describe('parseSampleName', () => {
    test('parses standard format', () => {
      const result = parseSampleName('POM26_0123_C_Smith');
      expect(result).toEqual({
        prefix: 'POM',
        year: 2026,
        sequence: 123,
        roleCode: 'C',
        role: 'child',
        surname: 'Smith',
        normalized: 'POM26_0123_C_Smith'
      });
    });

    test('parses father role', () => {
      const result = parseSampleName('LT25_0456_F_Jones');
      expect(result.roleCode).toBe('F');
      expect(result.role).toBe('alleged_father');
    });

    test('parses mother role', () => {
      const result = parseSampleName('UP26_0789_M_Brown');
      expect(result.roleCode).toBe('M');
      expect(result.role).toBe('mother');
    });

    test('parses without surname', () => {
      const result = parseSampleName('POM26_0001_C');
      expect(result.prefix).toBe('POM');
      expect(result.surname).toBe(null);
    });

    test('normalizes UPL to UP', () => {
      const result = parseSampleName('UPL26_0001_C_Test');
      expect(result.prefix).toBe('UP');
      expect(result.normalized).toBe('UP26_0001_C_Test');
    });

    test('returns null for invalid format', () => {
      expect(parseSampleName('invalid')).toBe(null);
      expect(parseSampleName('ABC_123')).toBe(null);
      expect(parseSampleName('')).toBe(null);
    });

    test('returns null for null/undefined', () => {
      expect(parseSampleName(null)).toBe(null);
      expect(parseSampleName(undefined)).toBe(null);
    });
  });

  describe('createEmptyPayload', () => {
    test('creates valid empty structure', () => {
      const payload = createEmptyPayload('test');
      expect(payload.samples).toEqual([]);
      expect(payload.importDate).toBeDefined();
      expect(payload.fileName).toContain('GAR_test_');
      expect(payload.fileName.endsWith('.json')).toBe(true);
    });

    test('default sourceTag is unknown', () => {
      const payload = createEmptyPayload();
      expect(payload.fileName).toContain('GAR_unknown_');
    });

    test('importDate is valid ISO string', () => {
      const payload = createEmptyPayload();
      const date = new Date(payload.importDate);
      expect(date.getTime()).not.toBeNaN();
    });
  });
});
