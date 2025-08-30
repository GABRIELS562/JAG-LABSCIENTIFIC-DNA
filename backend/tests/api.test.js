const request = require('supertest')
const express = require('express')
const apiRoutes = require('../routes/api')

// Mock the database service
jest.mock('../services/database', () => ({
  db: {
    exec: jest.fn(),
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    })
  },
  createTables: jest.fn(),
  getAllSamples: jest.fn(),
  createSample: jest.fn(),
  updateSample: jest.fn(),
  deleteSample: jest.fn(),
  getSampleByLabNumber: jest.fn(),
  getSampleById: jest.fn(),
  searchSamples: jest.fn(),
  getWorkflowCounts: jest.fn(),
  getAllBatches: jest.fn(),
  createBatch: jest.fn(),
  getBatchById: jest.fn(),
  getBatchSamples: jest.fn(),
  updateBatchStatus: jest.fn(),
  getSamplesForQueue: jest.fn(),
  updateSampleWorkflowStatus: jest.fn(),
  bulkUpdateSamples: jest.fn(),
  getLabNumber: jest.fn(),
  getReports: jest.fn(),
  createReport: jest.fn(),
  updateReportStatus: jest.fn()
}))

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, role: 'staff', username: 'testuser' }
    next()
  },
  requireStaff: (req, res, next) => next()
}))

const db = require('../services/database')

describe('API Routes', () => {
  let app

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api', apiRoutes)
    jest.clearAllMocks()
  })

  describe('GET /api/test', () => {
    it('should return API status', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('API is working'),
        database: 'SQLite'
      })
    })
  })

  describe('POST /api/refresh-database', () => {
    it('should refresh database successfully', async () => {
      db.db.exec.mockImplementation(() => {})

      const response = await request(app)
        .post('/api/refresh-database')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Database refreshed')
      })

      expect(db.db.exec).toHaveBeenCalledWith('VACUUM')
      expect(db.db.exec).toHaveBeenCalledWith('ANALYZE')
    })

    it('should handle database refresh errors gracefully', async () => {
      db.db.exec.mockImplementation(() => {
        throw new Error('Database locked')
      })

      const response = await request(app)
        .post('/api/refresh-database')
        .expect(200) // Should still return success but with warning

      expect(response.body.success).toBe(true)
    })

    it('should force rebuild tables when requested', async () => {
      db.createTables.mockImplementation(() => {})

      await request(app)
        .post('/api/refresh-database')
        .send({ forceRebuild: true })
        .expect(200)

      expect(db.createTables).toHaveBeenCalled()
    })
  })

  describe('Sample Endpoints', () => {
    describe('GET /api/samples', () => {
      it('should return all samples with pagination', async () => {
        const mockSamples = [
          testUtils.createMockSample({ id: 1 }),
          testUtils.createMockSample({ id: 2 })
        ]

        db.getAllSamples.mockResolvedValue(mockSamples)

        const response = await request(app)
          .get('/api/samples')
          .query({ page: 1, limit: 10 })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          samples: expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 })
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 2
          })
        })

        expect(db.getAllSamples).toHaveBeenCalled()
      })

      it('should filter samples by status', async () => {
        const mockSamples = [
          testUtils.createMockSample({ workflow_status: 'sample_collected' })
        ]

        db.getAllSamples.mockResolvedValue(mockSamples)

        const response = await request(app)
          .get('/api/samples')
          .query({ status: 'sample_collected' })
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.samples).toHaveLength(1)
        expect(response.body.samples[0].workflow_status).toBe('sample_collected')
      })

      it('should handle database errors', async () => {
        db.getAllSamples.mockRejectedValue(new Error('Database error'))

        const response = await request(app)
          .get('/api/samples')
          .expect(500)

        expect(response.body.success).toBe(false)
        expect(response.body.error).toBe('Failed to fetch samples')
      })
    })

    describe('POST /api/samples', () => {
      it('should create new sample successfully', async () => {
        const newSample = testUtils.createMockSample({
          name: 'John',
          surname: 'Doe',
          case_number: 'CASE001'
        })

        db.createSample.mockResolvedValue({ id: 1, ...newSample })

        const response = await request(app)
          .post('/api/samples')
          .send(newSample)
          .expect(201)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: 1,
            name: 'John',
            surname: 'Doe',
            case_number: 'CASE001'
          })
        })

        expect(db.createSample).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'John',
            surname: 'Doe',
            case_number: 'CASE001'
          })
        )
      })

      it('should validate required fields', async () => {
        const invalidSample = { name: 'John' } // Missing required fields

        const response = await request(app)
          .post('/api/samples')
          .send(invalidSample)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error).toContain('required')
      })

      it('should handle duplicate lab numbers', async () => {
        const sample = testUtils.createMockSample()
        db.createSample.mockRejectedValue(new Error('UNIQUE constraint failed: samples.lab_number'))

        const response = await request(app)
          .post('/api/samples')
          .send(sample)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error).toContain('Lab number already exists')
      })
    })

    describe('GET /api/samples/search', () => {
      it('should search samples by query', async () => {
        const mockSamples = [
          testUtils.createMockSample({ lab_number: 'LAB001', name: 'John' })
        ]

        db.searchSamples.mockResolvedValue(mockSamples)

        const response = await request(app)
          .get('/api/samples/search')
          .query({ q: 'LAB001' })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ lab_number: 'LAB001' })
          ])
        })

        expect(db.searchSamples).toHaveBeenCalledWith('LAB001')
      })

      it('should return empty results for empty query', async () => {
        const response = await request(app)
          .get('/api/samples/search')
          .query({ q: '' })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: []
        })

        expect(db.searchSamples).not.toHaveBeenCalled()
      })
    })

    describe('PUT /api/samples/workflow-status', () => {
      it('should update sample workflow status', async () => {
        db.updateSampleWorkflowStatus.mockResolvedValue({
          changes: 3,
          updated: [1, 2, 3]
        })

        const response = await request(app)
          .put('/api/samples/workflow-status')
          .send({
            sampleIds: [1, 2, 3],
            workflowStatus: 'pcr_ready'
          })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          message: 'Updated 3 samples to pcr_ready',
          data: {
            updated: [1, 2, 3]
          }
        })

        expect(db.updateSampleWorkflowStatus).toHaveBeenCalledWith([1, 2, 3], 'pcr_ready')
      })

      it('should validate input parameters', async () => {
        const response = await request(app)
          .put('/api/samples/workflow-status')
          .send({
            sampleIds: [],
            workflowStatus: 'pcr_ready'
          })
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error).toContain('Sample IDs are required')
      })
    })
  })

  describe('Batch Endpoints', () => {
    describe('GET /api/batches', () => {
      it('should return all batches', async () => {
        const mockBatches = [
          testUtils.createMockBatch({ id: 1, status: 'processing' }),
          testUtils.createMockBatch({ id: 2, status: 'completed' })
        ]

        db.getAllBatches.mockResolvedValue(mockBatches)

        const response = await request(app)
          .get('/api/batches')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          batches: expect.arrayContaining([
            expect.objectContaining({ id: 1, status: 'processing' }),
            expect.objectContaining({ id: 2, status: 'completed' })
          ])
        })
      })
    })

    describe('POST /api/batches', () => {
      it('should create new batch', async () => {
        const newBatch = testUtils.createMockBatch({
          batch_number: 'BATCH001',
          samples: [1, 2, 3]
        })

        db.createBatch.mockResolvedValue({ id: 1, ...newBatch })

        const response = await request(app)
          .post('/api/batches')
          .send(newBatch)
          .expect(201)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: 1,
            batch_number: 'BATCH001'
          })
        })

        expect(db.createBatch).toHaveBeenCalledWith(
          expect.objectContaining({
            batch_number: 'BATCH001',
            samples: [1, 2, 3]
          })
        )
      })
    })

    describe('GET /api/batches/:id', () => {
      it('should return specific batch', async () => {
        const mockBatch = testUtils.createMockBatch({ id: 1 })

        db.getBatchById.mockResolvedValue(mockBatch)

        const response = await request(app)
          .get('/api/batches/1')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({ id: 1 })
        })

        expect(db.getBatchById).toHaveBeenCalledWith('1')
      })

      it('should return 404 for non-existent batch', async () => {
        db.getBatchById.mockResolvedValue(null)

        const response = await request(app)
          .get('/api/batches/999')
          .expect(404)

        expect(response.body.success).toBe(false)
        expect(response.body.error).toBe('Batch not found')
      })
    })
  })

  describe('Queue Management', () => {
    describe('GET /api/samples/queue/:queueType', () => {
      it('should return samples for specific queue', async () => {
        const mockSamples = [
          testUtils.createMockSample({ workflow_status: 'extraction_ready' })
        ]

        db.getSamplesForQueue.mockResolvedValue(mockSamples)

        const response = await request(app)
          .get('/api/samples/queue/extraction')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ workflow_status: 'extraction_ready' })
          ])
        })

        expect(db.getSamplesForQueue).toHaveBeenCalledWith('extraction')
      })
    })

    describe('GET /api/samples/queue-counts', () => {
      it('should return queue counts', async () => {
        const mockCounts = {
          extraction: 5,
          pcr: 3,
          electrophoresis: 2,
          analysis: 1
        }

        db.getWorkflowCounts.mockResolvedValue(mockCounts)

        const response = await request(app)
          .get('/api/samples/queue-counts')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: mockCounts
        })
      })
    })
  })

  describe('Statistics', () => {
    describe('GET /api/statistics', () => {
      it('should return daily statistics by default', async () => {
        const mockStats = {
          total_samples: 100,
          completed_today: 10,
          pending: 20,
          average_processing_time: 45
        }

        // Mock database query for statistics
        db.db.prepare.mockReturnValue({
          all: jest.fn().mockReturnValue([
            { status: 'completed', count: 10 },
            { status: 'pending', count: 20 }
          ]),
          get: jest.fn().mockReturnValue({ total: 100 })
        })

        const response = await request(app)
          .get('/api/statistics')
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data).toBeDefined()
      })

      it('should support different time periods', async () => {
        db.db.prepare.mockReturnValue({
          all: jest.fn().mockReturnValue([]),
          get: jest.fn().mockReturnValue({ total: 0 })
        })

        const response = await request(app)
          .get('/api/statistics')
          .query({ period: 'weekly' })
          .expect(200)

        expect(response.body.success).toBe(true)
      })
    })
  })

  describe('Lab Number Management', () => {
    describe('GET /api/get-last-lab-number', () => {
      it('should return next available lab number', async () => {
        db.getLabNumber.mockResolvedValue('LAB2024001')

        const response = await request(app)
          .get('/api/get-last-lab-number')
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          labNumber: 'LAB2024001'
        })
      })

      it('should handle database errors', async () => {
        db.getLabNumber.mockRejectedValue(new Error('Database error'))

        const response = await request(app)
          .get('/api/get-last-lab-number')
          .expect(500)

        expect(response.body.success).toBe(false)
      })
    })
  })

  describe('Report Management', () => {
    describe('GET /api/reports', () => {
      it('should return reports with filters', async () => {
        const mockReports = [
          { id: 1, title: 'Report 1', status: 'draft' },
          { id: 2, title: 'Report 2', status: 'final' }
        ]

        db.getReports.mockResolvedValue(mockReports)

        const response = await request(app)
          .get('/api/reports')
          .query({ status: 'final' })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array)
        })

        expect(db.getReports).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'final' })
        )
      })
    })

    describe('POST /api/reports', () => {
      it('should create new report', async () => {
        const reportData = {
          title: 'Test Report',
          content: 'Report content',
          sample_ids: [1, 2, 3]
        }

        const createdReport = { id: 1, ...reportData }
        db.createReport.mockResolvedValue(createdReport)

        const response = await request(app)
          .post('/api/reports')
          .send(reportData)
          .expect(201)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: 1,
            title: 'Test Report'
          })
        })
      })
    })
  })

  describe('Bulk Operations', () => {
    describe('PUT /api/samples/bulk-update', () => {
      it('should handle bulk sample updates', async () => {
        const updates = [
          { id: 1, workflow_status: 'pcr_ready' },
          { id: 2, workflow_status: 'pcr_ready' },
          { id: 3, workflow_status: 'pcr_ready' }
        ]

        db.bulkUpdateSamples.mockResolvedValue({
          updated: 3,
          failed: 0,
          results: updates.map(u => ({ ...u, success: true }))
        })

        const response = await request(app)
          .put('/api/samples/bulk-update')
          .send({ updates })
          .expect(200)

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            updated: 3,
            failed: 0
          })
        })

        expect(db.bulkUpdateSamples).toHaveBeenCalledWith(updates)
      })

      it('should validate bulk update input', async () => {
        const response = await request(app)
          .put('/api/samples/bulk-update')
          .send({ updates: [] })
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error).toContain('Updates array cannot be empty')
      })
    })
  })

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('API is working')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/samples')
        .send('invalid json')
        .type('application/json')
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/samples')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('required')
    })

    it('should handle database connection errors', async () => {
      db.getAllSamples.mockRejectedValue(new Error('SQLITE_BUSY: database is locked'))

      const response = await request(app)
        .get('/api/samples')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('database')
    })
  })
})