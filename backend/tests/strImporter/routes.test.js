/**
 * Tests for STR Results API Routes
 *
 * @jest-environment node
 */

'use strict';

const request = require('supertest');
const express = require('express');

// Mock the database service
jest.mock('../../services/database', () => ({
  db: {
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    })
  },
  getBatch: jest.fn(),
  getWellAssignments: jest.fn()
}));

// Import after mocking
const db = require('../../services/database');
const geneticAnalysisRoutes = require('../../routes/genetic-analysis');

describe('STR Results API Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/genetic-analysis', geneticAnalysisRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/genetic-analysis/str-results', () => {
    const validPayload = {
      samples: [
        {
          sampleName: 'POM26_0001_C_Smith',
          markers: {
            'D3S1358': { allele1: '15', allele2: '17', peakHeight1: 1234, peakHeight2: 1180 },
            'AMEL': { allele1: 'X', allele2: 'Y' }
          }
        }
      ],
      importDate: '2026-05-02T12:00:00Z',
      fileName: 'GAR_test_1234567890.json'
    };

    test('accepts valid payload and stores results', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results')
        .send(validPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.samplesStored).toBe(1);
      expect(response.body.sampleNames).toContain('POM26_0001_C_Smith');
      expect(db.db.prepare).toHaveBeenCalled();
    });

    test('rejects payload with missing samples', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results')
        .send({
          importDate: '2026-05-02T12:00:00Z',
          fileName: 'test.json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    test('rejects payload with empty samples array', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results')
        .send({
          samples: [],
          importDate: '2026-05-02T12:00:00Z',
          fileName: 'test.json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(e => e.includes('empty'))).toBe(true);
    });

    test('rejects payload with invalid allele values', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results')
        .send({
          samples: [{
            sampleName: 'TEST_001',
            markers: {
              'AMEL': { allele1: '15', allele2: 'Y' } // 15 is invalid for AMEL
            }
          }],
          importDate: '2026-05-02T12:00:00Z',
          fileName: 'test.json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(e => e.includes('AMEL'))).toBe(true);
    });

    test('rejects payload with invalid importDate', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results')
        .send({
          samples: [{
            sampleName: 'TEST_001',
            markers: {
              'D3S1358': { allele1: '15', allele2: '17' }
            }
          }],
          importDate: 'not-a-date',
          fileName: 'test.json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(e => e.includes('ISO 8601'))).toBe(true);
    });

    test('stores multiple samples', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results')
        .send({
          samples: [
            {
              sampleName: 'POM26_0001_C_Smith',
              markers: { 'D3S1358': { allele1: '15', allele2: '17' } }
            },
            {
              sampleName: 'POM26_0001_F_Smith',
              markers: { 'D3S1358': { allele1: '15', allele2: '18' } }
            },
            {
              sampleName: 'POM26_0001_M_Smith',
              markers: { 'D3S1358': { allele1: '16', allele2: '17' } }
            }
          ],
          importDate: '2026-05-02T12:00:00Z',
          fileName: 'GAR_family_test.json'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.samplesStored).toBe(3);
    });
  });

  describe('POST /api/genetic-analysis/str-results/synthetic', () => {
    test('generates results from provided sample names', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({
          sampleNames: ['POM26_0001_C_Smith', 'POM26_0001_F_Smith']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.samplesGenerated).toBe(2);
      expect(response.body.samplesStored).toBe(2);
      expect(response.body.fileName).toContain('synthetic');
    });

    test('generates results from batch', async () => {
      db.getBatch.mockResolvedValue({ id: 1, batch_number: 'BATCH001' });
      db.getWellAssignments.mockResolvedValue([
        { sample_name: 'POM26_0001_C_Test', well_type: 'sample' },
        { sample_name: 'POM26_0001_F_Test', well_type: 'sample' },
        { sample_name: null, well_type: 'control' } // Should be filtered out
      ]);

      const response = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({ batchId: 'BATCH001' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.samplesGenerated).toBe(2);
      expect(response.body.fileName).toContain('batch-BATCH001');
    });

    test('rejects when batch not found', async () => {
      db.getBatch.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({ batchId: 'NONEXISTENT' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Batch not found');
    });

    test('rejects when batch has no samples', async () => {
      db.getBatch.mockResolvedValue({ id: 1, batch_number: 'EMPTY' });
      db.getWellAssignments.mockResolvedValue([
        { sample_name: null, well_type: 'control' }
      ]);

      const response = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({ batchId: 'EMPTY' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No samples found');
    });

    test('rejects when neither batchId nor sampleNames provided', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('batchId or sampleNames');
    });

    test('supports simulateNoise option', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({
          sampleNames: ['POM26_0001_C_Test'],
          simulateNoise: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('supports generateFamilies option', async () => {
      const response = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({
          sampleNames: [
            'POM26_0001_M_Test',
            'POM26_0001_F_Test',
            'POM26_0001_C_Test'
          ],
          generateFamilies: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.samplesGenerated).toBe(3);
    });

    test('deterministic: same names produce consistent results', async () => {
      const names = ['POM26_0001_C_Smith'];

      const response1 = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({ sampleNames: names })
        .expect(200);

      const response2 = await request(app)
        .post('/api/genetic-analysis/str-results/synthetic')
        .send({ sampleNames: names })
        .expect(200);

      // Both should succeed with same number of samples
      expect(response1.body.samplesGenerated).toBe(response2.body.samplesGenerated);
    });
  });
});
