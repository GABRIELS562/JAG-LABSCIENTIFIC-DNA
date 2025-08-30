import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { PaternityFormProvider } from '../../contexts/PaternityFormContext'
import userEvent from '@testing-library/user-event'

// Enhanced render function with all providers
export function renderWithProviders(
  ui,
  {
    initialEntries = ['/'],
    user = null,
    ...renderOptions
  } = {}
) {
  // Mock user for authenticated tests
  const mockUser = user || {
    id: 1,
    username: 'testuser',
    role: 'staff',
    name: 'Test User'
  }

  // Wrapper component with all necessary providers
  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <PaternityFormProvider>
              {children}
            </PaternityFormProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    )
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Render with authenticated user context
export function renderWithAuth(ui, options = {}) {
  return renderWithProviders(ui, {
    user: {
      id: 1,
      username: 'testuser',
      role: 'staff',
      name: 'Test User',
      token: 'mock-jwt-token'
    },
    ...options
  })
}

// Helper to wait for loading states to resolve
export async function waitForLoadingToFinish() {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
}

// Mock API responses helper
export function mockApiResponse(data, success = true) {
  return {
    success,
    data,
    ...(success ? {} : { error: { message: 'Mock error' } })
  }
}

// Generate mock sample data
export function generateMockSample(overrides = {}) {
  return {
    id: Math.floor(Math.random() * 1000),
    lab_number: `LAB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    case_number: `CASE${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    name: 'John',
    surname: 'Doe',
    workflow_status: 'sample_collected',
    collection_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    report_generated: false,
    ...overrides,
  }
}

// Generate mock batch data
export function generateMockBatch(overrides = {}) {
  return {
    id: Math.floor(Math.random() * 100),
    batch_number: `BATCH${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    status: 'processing',
    created_at: new Date().toISOString(),
    samples: [],
    ...overrides,
  }
}

// Generate mock workflow status
export function generateMockWorkflowStatus(overrides = {}) {
  return {
    stageDistribution: [
      { workflow_status: 'sample_collected', count: 5 },
      { workflow_status: 'pcr_ready', count: 3 },
      { workflow_status: 'analysis_completed', count: 2 }
    ],
    totalSamples: 10,
    cyclesCompleted: 5,
    isRunning: true,
    ...overrides
  }
}

// Mock localStorage for tests
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock implementation for fetch
export function mockFetch(mockResponse, ok = true) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 400,
      json: () => Promise.resolve(mockResponse),
    })
  )
}

// Helper for testing async components
export async function waitForElement(getElement) {
  let element
  await waitFor(() => {
    element = getElement()
    expect(element).toBeInTheDocument()
  })
  return element
}

// Custom matchers for better test assertions
export const customMatchers = {
  toHaveWorkflowStatus: (element, expectedStatus) => {
    const hasStatus = element.textContent.includes(expectedStatus.replace(/_/g, ' '))
    return {
      pass: hasStatus,
      message: () => `Expected element to have workflow status "${expectedStatus}"`
    }
  }
}

// Mock API client for direct testing
export const mockApiClient = {
  fetchJson: vi.fn(),
  getSamples: vi.fn(),
  createSample: vi.fn(),
  getBatches: vi.fn(),
  updateWorkflowStatus: vi.fn(),
}

// Mock toast notifications
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

// Mock navigate function for router tests
export const mockNavigate = vi.fn()

// Mock console methods for cleaner test output
export function mockConsole() {
  const originalConsole = { ...console }
  
  beforeEach(() => {
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
  })
  
  afterEach(() => {
    Object.assign(console, originalConsole)
  })
}

// Helper to test error boundaries
export function ErrorThrowingComponent({ shouldThrow = false }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

export * from '@testing-library/react'
export { userEvent }