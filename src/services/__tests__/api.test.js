import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, apiClient } from '../api'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.clearCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('UnifiedApiClient', () => {
    describe('enhancedFetch', () => {
      it('makes HTTP requests with correct parameters', async () => {
        const mockResponse = { success: true, data: 'test' }
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await apiClient.enhancedFetch('/test', { method: 'GET' })

        expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          })
        }))
      })

      it('handles API URLs correctly', async () => {
        const mockResponse = { success: true }
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await apiClient.enhancedFetch('/api/samples')
        expect(mockFetch).toHaveBeenCalledWith('/api/samples', expect.any(Object))
      })

      it('retries failed requests', async () => {
        mockFetch
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true })
          })

        await apiClient.enhancedFetch('/test')

        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      it('throws error after max retries', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'))

        await expect(apiClient.enhancedFetch('/test'))
          .rejects.toThrow('Unable to connect to server')

        expect(mockFetch).toHaveBeenCalledTimes(4) // 3 retries + 1 initial
      })

      it('handles HTTP errors correctly', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ error: { message: 'Resource not found' } })
        })

        await expect(apiClient.enhancedFetch('/nonexistent'))
          .rejects.toThrow('Resource not found')
      })

      it('handles timeout correctly', async () => {
        vi.useFakeTimers()
        
        mockFetch.mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 35000))
        )

        const fetchPromise = apiClient.enhancedFetch('/slow', { timeout: 30000 })
        
        // Fast-forward time
        vi.advanceTimersByTime(30000)
        
        await expect(fetchPromise).rejects.toThrow('Request timeout')
        
        vi.useRealTimers()
      })
    })

    describe('Cache Management', () => {
      it('caches GET requests', async () => {
        const mockResponse = { success: true, data: 'cached' }
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        // First call
        await apiClient.fetchJson('/test')
        // Second call should use cache
        await apiClient.fetchJson('/test')

        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      it('does not cache non-GET requests', async () => {
        const mockResponse = { success: true }
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await apiClient.fetchJson('/test', { method: 'POST' })
        await apiClient.fetchJson('/test', { method: 'POST' })

        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      it('clears cache correctly', async () => {
        const mockResponse = { success: true, data: 'test' }
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await apiClient.fetchJson('/test')
        apiClient.clearCache()
        await apiClient.fetchJson('/test')

        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      it('expires cached data after timeout', async () => {
        vi.useFakeTimers()
        
        const mockResponse = { success: true, data: 'test' }
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await apiClient.fetchJson('/test')
        
        // Fast-forward past cache timeout
        vi.advanceTimersByTime(6000) // 6 seconds > 5 second cache timeout
        
        await apiClient.fetchJson('/test')

        expect(mockFetch).toHaveBeenCalledTimes(2)
        
        vi.useRealTimers()
      })
    })

    describe('Connection Management', () => {
      it('tracks online/offline status', async () => {
        const connectionCallback = vi.fn()
        apiClient.onConnectionChange(connectionCallback)

        // Simulate network error
        mockFetch.mockRejectedValue(new Error('Failed to fetch'))
        
        try {
          await apiClient.enhancedFetch('/test')
        } catch (error) {
          // Expected to fail
        }

        expect(connectionCallback).toHaveBeenCalledWith(false)
      })

      it('notifies when connection is restored', async () => {
        const connectionCallback = vi.fn()
        apiClient.onConnectionChange(connectionCallback)

        // First set offline
        apiClient.notifyConnectionChange(false)
        
        // Then simulate successful request
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        })

        await apiClient.enhancedFetch('/test')

        expect(connectionCallback).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('API Methods', () => {
    describe('Sample Operations', () => {
      it('creates sample with correct data', async () => {
        const sampleData = {
          name: 'John',
          surname: 'Doe',
          case_number: 'CASE001'
        }
        const mockResponse = { success: true, data: { id: 1, ...sampleData } }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        const result = await api.createSample(sampleData)

        expect(mockFetch).toHaveBeenCalledWith('/api/samples', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(sampleData)
        }))
        expect(result).toEqual(mockResponse)
      })

      it('gets samples with pagination', async () => {
        const mockResponse = {
          success: true,
          samples: [],
          pagination: { page: 1, limit: 10, total: 0 }
        }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await api.getSamples({ page: 1, limit: 10, status: 'active' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/samples?page=1&limit=10&status=active',
          expect.any(Object)
        )
      })

      it('searches samples correctly', async () => {
        const mockResponse = { success: true, data: [] }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await api.searchSamples('LAB001')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/samples/search?q=LAB001',
          expect.any(Object)
        )
      })

      it('returns empty results for empty search query', async () => {
        const result = await api.searchSamples('')
        
        expect(result).toEqual({ success: true, data: [] })
        expect(mockFetch).not.toHaveBeenCalled()
      })

      it('updates sample workflow status', async () => {
        const mockResponse = { success: true }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await api.updateSampleWorkflowStatus([1, 2, 3], 'pcr_ready')

        expect(mockFetch).toHaveBeenCalledWith('/api/samples/workflow-status', 
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ 
              sampleIds: [1, 2, 3], 
              workflowStatus: 'pcr_ready' 
            })
          })
        )
      })

      it('validates sample workflow status parameters', async () => {
        await expect(api.updateSampleWorkflowStatus([], 'pcr_ready'))
          .rejects.toThrow('Sample IDs must be a non-empty array')

        await expect(api.updateSampleWorkflowStatus([1], ''))
          .rejects.toThrow('Workflow status is required and must be a string')
      })
    })

    describe('Batch Operations', () => {
      it('gets batches correctly', async () => {
        const mockResponse = { success: true, batches: [] }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await api.getBatches()

        expect(mockFetch).toHaveBeenCalledWith('/api/batches', expect.any(Object))
      })

      it('gets specific batch by ID', async () => {
        const mockResponse = { success: true, data: { id: 1 } }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await api.getBatchById(1)

        expect(mockFetch).toHaveBeenCalledWith('/api/batches/1', expect.any(Object))
      })
    })

    describe('Reports Operations', () => {
      it('gets reports with filters', async () => {
        const mockResponse = { success: true, data: [] }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await api.getReports({ status: 'final', date_from: '2023-01-01' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/reports?status=final&date_from=2023-01-01',
          expect.any(Object)
        )
      })

      it('creates report correctly', async () => {
        const reportData = { title: 'Test Report', content: 'Report content' }
        const mockResponse = { success: true, data: { id: 1, ...reportData } }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await api.createReport(reportData)

        expect(mockFetch).toHaveBeenCalledWith('/api/reports',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(reportData)
          })
        )
      })

      it('updates report status', async () => {
        const mockResponse = { success: true }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await api.updateReportStatus(1, 'final', 'Review completed')

        expect(mockFetch).toHaveBeenCalledWith('/api/reports/1/status',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'final', notes: 'Review completed' })
          })
        )
      })
    })

    describe('Database Operations', () => {
      it('refreshes database and clears cache', async () => {
        const mockResponse = { success: true }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        // First populate cache
        await api.getSamples()
        
        // Then refresh database
        await api.refreshDatabase()

        expect(mockFetch).toHaveBeenCalledWith('/api/refresh-database',
          expect.objectContaining({
            method: 'POST'
          })
        )

        // Verify cache was cleared by making another call
        await api.getSamples()
        expect(mockFetch).toHaveBeenCalledTimes(3) // 2 getSamples + 1 refresh
      })
    })

    describe('Health Check', () => {
      it('checks API health', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        })

        const isHealthy = await api.checkHealth()

        expect(isHealthy).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.any(Object))
      })

      it('returns false for unhealthy API', async () => {
        mockFetch.mockRejectedValue(new Error('API down'))

        const isHealthy = await api.checkHealth()

        expect(isHealthy).toBe(false)
      })
    })

    describe('Bulk Operations', () => {
      it('processes bulk updates in batches', async () => {
        const updates = Array.from({ length: 120 }, (_, i) => ({ id: i + 1, status: 'updated' }))
        const mockResponse = { success: true, data: [] }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        const progressCallback = vi.fn()
        await api.bulkUpdateSamples(updates, progressCallback)

        // Should batch into groups of 50
        expect(mockFetch).toHaveBeenCalledTimes(3) // 120 items / 50 batch size = 3 calls
        expect(progressCallback).toHaveBeenCalledWith({
          completed: 50,
          total: 120,
          percentage: 42
        })
      })

      it('handles bulk update errors', async () => {
        const updates = [{ id: 1, status: 'updated' }]
        
        mockFetch.mockRejectedValue(new Error('Batch failed'))

        await expect(api.bulkUpdateSamples(updates))
          .rejects.toThrow('Batch failed')
      })
    })
  })

  describe('Specialized API Modules', () => {
    describe('extractionApi', () => {
      it('gets extraction batches', async () => {
        const { extractionApi } = await import('../api')
        const mockResponse = { success: true, data: [] }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await extractionApi.getBatches()

        expect(mockFetch).toHaveBeenCalledWith('/api/extraction/batches', expect.any(Object))
      })

      it('creates extraction batch', async () => {
        const { extractionApi } = await import('../api')
        const batchData = { name: 'Test Batch', samples: [] }
        const mockResponse = { success: true, data: { id: 1, ...batchData } }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        await extractionApi.createBatch(batchData)

        expect(mockFetch).toHaveBeenCalledWith('/api/extraction/create-batch',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(batchData)
          })
        )
      })
    })

    describe('batchApi', () => {
      it('generates batch correctly', async () => {
        const { batchApi } = await import('../api')
        const batchData = { samples: [1, 2, 3] }
        const mockResponse = { success: true, data: { id: 1 } }
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        })

        const result = await batchApi.generateBatch(batchData)

        expect(mockFetch).toHaveBeenCalledWith('/api/generate-batch',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(batchData)
          })
        )
        expect(result).toEqual(mockResponse)
      })

      it('handles batch generation errors', async () => {
        const { batchApi } = await import('../api')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        mockFetch.mockRejectedValue(new Error('Generation failed'))

        const result = await batchApi.generateBatch({})

        expect(result).toEqual({ success: false, error: 'Generation failed' })
        expect(consoleError).toHaveBeenCalled()
        
        consoleError.mockRestore()
      })
    })
  })

  describe('Error Handling', () => {
    it('logs errors using error handler', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockFetch.mockRejectedValue(new Error('API Error'))

      try {
        await api.getSamples()
      } catch (error) {
        // Expected
      }

      expect(consoleError).toHaveBeenCalledWith(
        '❌ API Error for:', 
        '/samples', 
        'Error:', 
        'Unable to connect to server'
      )
      
      consoleError.mockRestore()
    })

    it('handles JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(api.getSamples())
        .rejects.toThrow('Invalid JSON')
    })
  })
})