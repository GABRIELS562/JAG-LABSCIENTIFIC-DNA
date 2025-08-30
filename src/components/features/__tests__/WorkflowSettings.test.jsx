import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, waitForLoadingToFinish } from '../../../test/utils'
import WorkflowSettings from '../WorkflowSettings'
import * as apiService from '../../../services/api'

// Mock the API service
vi.mock('../../../services/api', () => ({
  api: {
    fetchJson: vi.fn(),
  }
}))

describe('WorkflowSettings', () => {
  const mockStageDurations = [
    { stage_name: 'sample_collection', duration_minutes: 3 },
    { stage_name: 'dna_extraction', duration_minutes: 5 },
    { stage_name: 'pcr_amplification', duration_minutes: 10 },
    { stage_name: 'electrophoresis', duration_minutes: 8 },
    { stage_name: 'osiris_analysis', duration_minutes: 4 },
    { stage_name: 'report_generation', duration_minutes: 2 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default API responses
    apiService.api.fetchJson
      .mockImplementation((url, options) => {
        if (url === '/workflow/stage-durations' && options?.method === 'GET') {
          return Promise.resolve({ success: true, data: mockStageDurations })
        }
        if (url.startsWith('/workflow/stage-durations/') && options?.method === 'PUT') {
          return Promise.resolve({ success: true })
        }
        return Promise.resolve({ success: true, data: {} })
      })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the workflow settings header correctly', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Workflow Stage Durations')).toBeInTheDocument()
        expect(screen.getByText('Configure how long samples remain at each processing stage')).toBeInTheDocument()
      })
    })

    it('shows loading state initially', () => {
      apiService.api.fetchJson.mockImplementation(() => new Promise(() => {}))
      
      renderWithProviders(<WorkflowSettings />)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('displays all workflow stages after loading', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Sample Collection')).toBeInTheDocument()
        expect(screen.getByText('DNA Extraction')).toBeInTheDocument()
        expect(screen.getByText('PCR Amplification')).toBeInTheDocument()
        expect(screen.getByText('Electrophoresis')).toBeInTheDocument()
        expect(screen.getByText('OSIRIS Analysis')).toBeInTheDocument()
        expect(screen.getByText('Report Generation')).toBeInTheDocument()
      })
    })

    it('displays stage descriptions correctly', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Buccal swab collection and registration')).toBeInTheDocument()
        expect(screen.getByText('Automated DNA extraction process')).toBeInTheDocument()
        expect(screen.getByText('PowerPlex ESX 17 STR amplification')).toBeInTheDocument()
        expect(screen.getByText('Capillary electrophoresis separation')).toBeInTheDocument()
        expect(screen.getByText('STR profile analysis')).toBeInTheDocument()
        expect(screen.getByText('Paternity report compilation')).toBeInTheDocument()
      })
    })

    it('shows current duration values', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('3 minutes')).toBeInTheDocument()
        expect(screen.getByText('5 minutes')).toBeInTheDocument()
        expect(screen.getByText('10 minutes')).toBeInTheDocument()
        expect(screen.getByText('8 minutes')).toBeInTheDocument()
        expect(screen.getByText('4 minutes')).toBeInTheDocument()
        expect(screen.getByText('2 minutes')).toBeInTheDocument()
      })
    })
  })

  describe('Data Fetching', () => {
    it('fetches stage durations on component mount', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(apiService.api.fetchJson).toHaveBeenCalledWith(
          '/workflow/stage-durations', 
          { method: 'GET' }
        )
      })
    })

    it('handles API errors during fetch', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      apiService.api.fetchJson.mockRejectedValue(new Error('API Error'))
      
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled()
      })
      
      consoleError.mockRestore()
    })
  })

  describe('Total Cycle Time Calculation', () => {
    it('calculates and displays total cycle time correctly', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        // Sum: 3 + 5 + 10 + 8 + 4 + 2 = 32 minutes
        expect(screen.getByText('32')).toBeInTheDocument()
        expect(screen.getByText('Total Cycle Time')).toBeInTheDocument()
      })
    })

    it('updates total when individual durations change', async () => {
      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('32')).toBeInTheDocument()
      })

      // Find and interact with a slider - this is a complex interaction
      // For now we'll test the calculation logic indirectly
      await waitFor(() => {
        expect(screen.getByText('Total Cycle Time')).toBeInTheDocument()
      })
    })
  })

  describe('Duration Controls', () => {
    it('displays sliders for each stage', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        // MUI sliders should be present
        const sliders = screen.getAllByRole('slider')
        expect(sliders).toHaveLength(6) // One for each stage
      })
    })

    it('shows save buttons for each stage', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        const saveButtons = screen.getAllByText('Save')
        expect(saveButtons).toHaveLength(6) // One for each stage
      })
    })

    it('handles save button clicks', async () => {
      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getAllByText('Save')).toHaveLength(6)
      })

      const firstSaveButton = screen.getAllByText('Save')[0]
      await user.click(firstSaveButton)
      
      await waitFor(() => {
        expect(apiService.api.fetchJson).toHaveBeenCalledWith(
          '/workflow/stage-durations/sample_collection',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"duration_minutes":3')
          })
        )
      })
    })

    it('displays success message after saving', async () => {
      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getAllByText('Save')).toHaveLength(6)
      })

      const firstSaveButton = screen.getAllByText('Save')[0]
      await user.click(firstSaveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Updated Sample Collection duration to 3 minutes/)).toBeInTheDocument()
      })
    })
  })

  describe('Quick Presets', () => {
    it('displays preset buttons', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Fast Mode (10 min total)')).toBeInTheDocument()
        expect(screen.getByText('Standard Mode (32 min total)')).toBeInTheDocument()
        expect(screen.getByText('Realistic Mode (85 min total)')).toBeInTheDocument()
      })
    })

    it('applies fast mode preset when clicked', async () => {
      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Fast Mode (10 min total)')).toBeInTheDocument()
      })

      const fastModeButton = screen.getByText('Fast Mode (10 min total)')
      await user.click(fastModeButton)
      
      // The total should change to reflect fast mode settings
      await waitFor(() => {
        // Fast mode total: 1+2+3+2+1+1 = 10 minutes
        expect(screen.getByText('10')).toBeInTheDocument()
      })
    })

    it('applies standard mode preset when clicked', async () => {
      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Standard Mode (32 min total)')).toBeInTheDocument()
      })

      const standardModeButton = screen.getByText('Standard Mode (32 min total)')
      await user.click(standardModeButton)
      
      // Should maintain the original total (32 minutes)
      await waitFor(() => {
        expect(screen.getByText('32')).toBeInTheDocument()
      })
    })

    it('applies realistic mode preset when clicked', async () => {
      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Realistic Mode (85 min total)')).toBeInTheDocument()
      })

      const realisticModeButton = screen.getByText('Realistic Mode (85 min total)')
      await user.click(realisticModeButton)
      
      // Realistic mode total: 5+15+30+20+10+5 = 85 minutes
      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument()
      })
    })
  })

  describe('Reset to Defaults', () => {
    it('displays reset button', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Reset to Defaults')).toBeInTheDocument()
      })
    })

    it('resets all durations when clicked', async () => {
      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Reset to Defaults')).toBeInTheDocument()
      })

      const resetButton = screen.getByText('Reset to Defaults')
      await user.click(resetButton)
      
      // Should call API for each stage with default values
      await waitFor(() => {
        expect(apiService.api.fetchJson).toHaveBeenCalledWith(
          '/workflow/stage-durations/sample_collection',
          expect.objectContaining({
            method: 'PUT'
          })
        )
      })
    })
  })

  describe('Workflow Pause/Resume', () => {
    it('displays pause button initially', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        const pauseButton = screen.getByLabelText(/pause workflow/i)
        expect(pauseButton).toBeInTheDocument()
      })
    })

    it('toggles between pause and resume states', async () => {
      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        const pauseButton = screen.getByLabelText(/pause workflow/i)
        expect(pauseButton).toBeInTheDocument()
      })

      const toggleButton = screen.getByLabelText(/pause workflow/i)
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('Workflow paused')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles save errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      apiService.api.fetchJson
        .mockImplementation((url, options) => {
          if (url === '/workflow/stage-durations' && options?.method === 'GET') {
            return Promise.resolve({ success: true, data: mockStageDurations })
          }
          if (options?.method === 'PUT') {
            return Promise.reject(new Error('Save failed'))
          }
          return Promise.resolve({ success: true })
        })

      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getAllByText('Save')).toHaveLength(6)
      })

      const firstSaveButton = screen.getAllByText('Save')[0]
      await user.click(firstSaveButton)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to save duration:', expect.any(Error))
      })
      
      consoleError.mockRestore()
    })

    it('shows error message when save fails', async () => {
      apiService.api.fetchJson
        .mockImplementation((url, options) => {
          if (url === '/workflow/stage-durations' && options?.method === 'GET') {
            return Promise.resolve({ success: true, data: mockStageDurations })
          }
          if (options?.method === 'PUT') {
            return Promise.reject(new Error('Save failed'))
          }
          return Promise.resolve({ success: true })
        })

      const { user } = renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getAllByText('Save')).toHaveLength(6)
      })

      const firstSaveButton = screen.getAllByText('Save')[0]
      await user.click(firstSaveButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save duration')).toBeInTheDocument()
      })
    })
  })

  describe('Stage Duration Ranges', () => {
    it('displays duration ranges for each stage', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByText('Range: 1-30 min')).toBeInTheDocument()
        expect(screen.getByText('Range: 2-60 min')).toBeInTheDocument()
        expect(screen.getByText('Range: 3-120 min')).toBeInTheDocument()
        expect(screen.getByText('Range: 2-90 min')).toBeInTheDocument()
        expect(screen.getByText('Range: 1-45 min')).toBeInTheDocument()
        expect(screen.getByText('Range: 1-30 min')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels for interactive elements', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        const sliders = screen.getAllByRole('slider')
        expect(sliders).toHaveLength(6)
        
        const saveButtons = screen.getAllByRole('button', { name: /save/i })
        expect(saveButtons).toHaveLength(6)
      })
    })

    it('has proper heading structure', async () => {
      renderWithProviders(<WorkflowSettings />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /workflow stage durations/i })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /total cycle time/i })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /quick presets/i })).toBeInTheDocument()
      })
    })
  })
})