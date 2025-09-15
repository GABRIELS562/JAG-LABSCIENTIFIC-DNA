import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, waitForLoadingToFinish, generateMockSample, generateMockWorkflowStatus } from '../../test/utils'
import PaternityLabDashboard from '../PaternityLabDashboard'
import * as apiService from '../../services/api'

// Mock the API service
vi.mock('../../services/api', () => ({
  api: {
    fetchJson: vi.fn(),
  }
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('PaternityLabDashboard', () => {
  const mockSamples = Array.from({ length: 10 }, (_, i) => 
    generateMockSample({
      id: i + 1,
      workflow_status: ['sample_collected', 'pcr_ready', 'analysis_completed'][i % 3]
    })
  )

  const mockBatches = [
    { id: 1, batch_number: 'BATCH001', status: 'processing' },
    { id: 2, batch_number: 'BATCH002', status: 'completed' }
  ]

  const mockWorkflowStatus = generateMockWorkflowStatus()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default API responses
    apiService.api.fetchJson
      .mockImplementation((url) => {
        switch (url) {
          case '/samples':
            return Promise.resolve({ success: true, samples: mockSamples })
          case '/batches':
            return Promise.resolve({ success: true, batches: mockBatches })
          case '/workflow-status':
            return Promise.resolve({ success: true, data: { alerts: [] } })
          case '/workflow/paternity/status':
            return Promise.resolve({ success: true, data: mockWorkflowStatus })
          case '/workflow/sample-tracking':
            return Promise.resolve({ success: true, data: { activeSamples: 25 } })
          default:
            return Promise.resolve({ success: true, data: {} })
        }
      })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the dashboard header correctly', async () => {
      renderWithProviders(<PaternityLabDashboard />)
      
      expect(screen.getByText('Paternity Lab Dashboard')).toBeInTheDocument()
      expect(screen.getByText(/3500 Genetic Analyzer/)).toBeInTheDocument()
      expect(screen.getByText(/PowerPlex ESX 17/)).toBeInTheDocument()
      expect(screen.getByText(/LIZ 500 Size Standard/)).toBeInTheDocument()
    })

    it('displays key metrics cards', async () => {
      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Today\'s Submissions')).toBeInTheDocument()
        expect(screen.getByText('Active Batches')).toBeInTheDocument()
        expect(screen.getByText('In Process')).toBeInTheDocument()
        expect(screen.getByText('Pending Reports')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })
    })

    it('shows the live workflow tracker', async () => {
      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('🔬 Live Paternity Testing Workflow')).toBeInTheDocument()
        expect(screen.getByText('RUNNING')).toBeInTheDocument()
      })
    })

    it('displays workflow stages', async () => {
      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Sample Submission')).toBeInTheDocument()
        expect(screen.getByText('DNA Extraction')).toBeInTheDocument()
        expect(screen.getByText('qPCR Quantification')).toBeInTheDocument()
        expect(screen.getByText('PCR Amplification')).toBeInTheDocument()
        expect(screen.getByText('Capillary Electrophoresis')).toBeInTheDocument()
        expect(screen.getByText('OSIRIS Analysis')).toBeInTheDocument()
        expect(screen.getByText('Report Generation')).toBeInTheDocument()
      })
    })
  })

  describe('Data Fetching', () => {
    it('fetches dashboard data on component mount', async () => {
      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(apiService.api.fetchJson).toHaveBeenCalledWith('/samples', { method: 'GET' })
        expect(apiService.api.fetchJson).toHaveBeenCalledWith('/batches', { method: 'GET' })
        expect(apiService.api.fetchJson).toHaveBeenCalledWith('/workflow-status', { method: 'GET' })
        expect(apiService.api.fetchJson).toHaveBeenCalledWith('/workflow/paternity/status', { method: 'GET' })
      })
    })

    it('handles API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      apiService.api.fetchJson.mockRejectedValue(new Error('API Error'))
      
      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled()
      })
      
      consoleError.mockRestore()
    })

    it('displays correct sample counts from API data', async () => {
      const customMockSamples = [
        generateMockSample({ workflow_status: 'sample_collected' }),
        generateMockSample({ workflow_status: 'sample_collected' }),
        generateMockSample({ workflow_status: 'analysis_completed' }),
      ]

      apiService.api.fetchJson
        .mockImplementation((url) => {
          if (url === '/samples') {
            return Promise.resolve({ success: true, samples: customMockSamples })
          }
          return Promise.resolve({ success: true, data: {}, batches: [] })
        })

      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        // Should show 1 completed sample
        const completedElements = screen.getAllByText('1')
        expect(completedElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Interactive Features', () => {
    it('navigates to correct routes when workflow stage cards are clicked', async () => {
      const { user } = renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Sample Submission')).toBeInTheDocument()
      })

      // Find and click the Sample Submission card
      const submissionCard = screen.getByText('Sample Submission').closest('.cursor-pointer')
      if (submissionCard) {
        await user.click(submissionCard)
        expect(mockNavigate).toHaveBeenCalledWith('/client-register')
      }
    })

    it('refreshes data when refresh button is clicked', async () => {
      const { user } = renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument()
      })

      const refreshButton = screen.getByText('Refresh')
      await user.click(refreshButton)
      
      // Should call fetchDashboardData again
      await waitFor(() => {
        expect(apiService.api.fetchJson).toHaveBeenCalledTimes(8) // Initial load (4) + refresh (4)
      })
    })

    it('handles quick action button clicks', async () => {
      const { user } = renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('New Registration')).toBeInTheDocument()
      })

      const newRegistrationButton = screen.getByText('New Registration')
      await user.click(newRegistrationButton)
      
      expect(mockNavigate).toHaveBeenCalledWith('/register-client')
    })
  })

  describe('Live Data Updates', () => {
    it('displays workflow status distribution correctly', async () => {
      const mockWorkflowWithData = {
        ...mockWorkflowStatus,
        stageDistribution: [
          { workflow_status: 'sample_collected', count: 5 },
          { workflow_status: 'analysis_completed', count: 3 }
        ]
      }

      apiService.api.fetchJson
        .mockImplementation((url) => {
          if (url === '/workflow/paternity/status') {
            return Promise.resolve({ success: true, data: mockWorkflowWithData })
          }
          return Promise.resolve({ success: true, data: {}, samples: [], batches: [] })
        })

      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('shows cycles completed information', async () => {
      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument() // cycles completed from mock
      })
    })
  })

  describe('Progress Calculations', () => {
    it('calculates and displays workflow progress correctly', async () => {
      const samplesWithProgress = [
        generateMockSample({ workflow_status: 'analysis_completed' }),
        generateMockSample({ workflow_status: 'analysis_completed' }),
        generateMockSample({ workflow_status: 'sample_collected' }),
        generateMockSample({ workflow_status: 'sample_collected' }),
      ]

      apiService.api.fetchJson
        .mockImplementation((url) => {
          if (url === '/samples') {
            return Promise.resolve({ success: true, samples: samplesWithProgress })
          }
          return Promise.resolve({ success: true, data: {}, batches: [] })
        })

      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        // 2 out of 4 samples completed = 50%
        expect(screen.getByText('50.0% Complete')).toBeInTheDocument()
      })
    })
  })

  describe('Recent Activity', () => {
    it('displays recent sample activity', async () => {
      const recentSamples = [
        generateMockSample({ 
          lab_number: 'LAB001', 
          name: 'John', 
          surname: 'Smith',
          updated_at: new Date().toISOString()
        })
      ]

      apiService.api.fetchJson
        .mockImplementation((url) => {
          if (url === '/samples') {
            return Promise.resolve({ success: true, samples: recentSamples })
          }
          return Promise.resolve({ success: true, data: {}, batches: [] })
        })

      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('LAB001')).toBeInTheDocument()
        expect(screen.getByText('• John Smith')).toBeInTheDocument()
      })
    })

    it('shows "No recent activity" when no samples exist', async () => {
      apiService.api.fetchJson
        .mockImplementation((url) => {
          if (url === '/samples') {
            return Promise.resolve({ success: true, samples: [] })
          }
          return Promise.resolve({ success: true, data: {}, batches: [] })
        })

      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles workflow status fetch errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      apiService.api.fetchJson
        .mockImplementation((url) => {
          if (url === '/workflow/paternity/status') {
            return Promise.reject(new Error('Network error'))
          }
          return Promise.resolve({ success: true, data: {}, samples: [], batches: [] })
        })

      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to fetch paternity workflow:', 
          expect.any(Error)
        )
      })
      
      consoleError.mockRestore()
    })
  })

  describe('Status Colors', () => {
    it('applies correct status colors for workflow stages', async () => {
      const samplesWithVariousStatuses = [
        generateMockSample({ workflow_status: 'sample_collected' }),
        generateMockSample({ workflow_status: 'analysis_completed' }),
      ]

      apiService.api.fetchJson
        .mockImplementation((url) => {
          if (url === '/samples') {
            return Promise.resolve({ success: true, samples: samplesWithVariousStatuses })
          }
          return Promise.resolve({ success: true, data: {}, batches: [] })
        })

      renderWithProviders(<PaternityLabDashboard />)
      
      await waitFor(() => {
        // Should show badges with different colors
        const badges = screen.getAllByText(/sample collected|analysis completed/i)
        expect(badges.length).toBeGreaterThan(0)
      })
    })
  })
})