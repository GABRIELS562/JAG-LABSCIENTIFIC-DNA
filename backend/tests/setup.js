const path = require('path')
const fs = require('fs')

// Setup test environment
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'

// Mock database for tests
const testDbPath = path.join(__dirname, 'test.db')

// Clean up test database before tests
beforeEach(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

// Clean up after all tests
afterAll(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

// Global test utilities
global.testUtils = {
  createMockSample: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    lab_number: `LAB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    case_number: `CASE${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    name: 'John',
    surname: 'Doe',
    workflow_status: 'sample_collected',
    collection_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  createMockUser: (overrides = {}) => ({
    id: Math.floor(Math.random() * 100),
    username: 'testuser',
    role: 'staff',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  createMockBatch: (overrides = {}) => ({
    id: Math.floor(Math.random() * 100),
    batch_number: `BATCH${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    status: 'processing',
    created_at: new Date().toISOString(),
    ...overrides
  })
}

// Suppress console output during tests unless explicitly needed
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})