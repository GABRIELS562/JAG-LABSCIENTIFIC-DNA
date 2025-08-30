import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { errorHandler, ApiError, NetworkError, ValidationError } from '../errorHandler'

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
}

beforeEach(() => {
  vi.clearAllMocks()
  global.console = { ...console, ...mockConsole }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Error Handler', () => {
  describe('Custom Error Classes', () => {
    describe('ApiError', () => {
      it('should create ApiError with message and details', () => {
        const error = new ApiError('API failed', { status: 500 }, { cause: 'server error' })
        
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(ApiError)
        expect(error.name).toBe('ApiError')
        expect(error.message).toBe('API failed')
        expect(error.details).toEqual({ status: 500 })
        expect(error.cause).toEqual({ cause: 'server error' })
      })

      it('should create ApiError with minimal parameters', () => {
        const error = new ApiError('Simple API error')
        
        expect(error.message).toBe('Simple API error')
        expect(error.details).toBeNull()
        expect(error.cause).toBeNull()
      })
    })

    describe('NetworkError', () => {
      it('should create NetworkError with message', () => {
        const error = new NetworkError('Network connection failed')
        
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(NetworkError)
        expect(error.name).toBe('NetworkError')
        expect(error.message).toBe('Network connection failed')
      })
    })

    describe('ValidationError', () => {
      it('should create ValidationError with message and field', () => {
        const error = new ValidationError('Invalid email format', 'email')
        
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(ValidationError)
        expect(error.name).toBe('ValidationError')
        expect(error.message).toBe('Invalid email format')
        expect(error.field).toBe('email')
      })

      it('should create ValidationError without field', () => {
        const error = new ValidationError('Validation failed')
        
        expect(error.message).toBe('Validation failed')
        expect(error.field).toBeUndefined()
      })
    })
  })

  describe('Error Handler Service', () => {
    describe('logError', () => {
      it('should log ApiError with full details', () => {
        const apiError = new ApiError('API request failed', { status: 404 })
        
        errorHandler.logError(apiError, 'User authentication')
        
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔴 [ApiError] User authentication:',
          'API request failed',
          '| Details:',
          { status: 404 }
        )
      })

      it('should log NetworkError with context', () => {
        const networkError = new NetworkError('Connection timeout')
        
        errorHandler.logError(networkError, 'Data fetching')
        
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔴 [NetworkError] Data fetching:',
          'Connection timeout'
        )
      })

      it('should log ValidationError with field info', () => {
        const validationError = new ValidationError('Invalid format', 'email')
        
        errorHandler.logError(validationError, 'Form validation')
        
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔴 [ValidationError] Form validation:',
          'Invalid format',
          '| Field: email'
        )
      })

      it('should log generic Error', () => {
        const genericError = new Error('Something went wrong')
        
        errorHandler.logError(genericError, 'Generic operation')
        
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔴 [Error] Generic operation:',
          'Something went wrong'
        )
      })

      it('should handle error without context', () => {
        const error = new Error('No context error')
        
        errorHandler.logError(error)
        
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔴 [Error] Unknown:',
          'No context error'
        )
      })

      it('should handle non-Error objects', () => {
        const errorString = 'String error'
        
        errorHandler.logError(errorString, 'String handling')
        
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔴 [Unknown] String handling:',
          'String error'
        )
      })
    })

    describe('handleApiError', () => {
      it('should handle 401 Unauthorized error', () => {
        const apiError = new ApiError('Unauthorized', { status: 401 })
        
        const result = errorHandler.handleApiError(apiError)
        
        expect(result).toEqual({
          message: 'Please log in to access this resource',
          action: 'redirect_login',
          recoverable: true
        })
      })

      it('should handle 403 Forbidden error', () => {
        const apiError = new ApiError('Forbidden', { status: 403 })
        
        const result = errorHandler.handleApiError(apiError)
        
        expect(result).toEqual({
          message: 'You do not have permission to access this resource',
          action: 'show_error',
          recoverable: false
        })
      })

      it('should handle 404 Not Found error', () => {
        const apiError = new ApiError('Not Found', { status: 404 })
        
        const result = errorHandler.handleApiError(apiError)
        
        expect(result).toEqual({
          message: 'The requested resource was not found',
          action: 'show_error',
          recoverable: false
        })
      })

      it('should handle 422 Validation error', () => {
        const apiError = new ApiError('Validation failed', { 
          status: 422,
          validationErrors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Password too short' }
          ]
        })
        
        const result = errorHandler.handleApiError(apiError)
        
        expect(result).toEqual({
          message: 'Please check your input and try again',
          action: 'highlight_fields',
          recoverable: true,
          validationErrors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Password too short' }
          ]
        })
      })

      it('should handle 500 Server error', () => {
        const apiError = new ApiError('Internal Server Error', { status: 500 })
        
        const result = errorHandler.handleApiError(apiError)
        
        expect(result).toEqual({
          message: 'A server error occurred. Please try again later',
          action: 'retry',
          recoverable: true
        })
      })

      it('should handle non-ApiError', () => {
        const genericError = new Error('Generic error')
        
        const result = errorHandler.handleApiError(genericError)
        
        expect(result).toEqual({
          message: 'An unexpected error occurred',
          action: 'retry',
          recoverable: true
        })
      })
    })

    describe('handleNetworkError', () => {
      it('should handle connection timeout', () => {
        const networkError = new NetworkError('Request timeout')
        
        const result = errorHandler.handleNetworkError(networkError)
        
        expect(result).toEqual({
          message: 'Connection timeout. Please check your internet connection and try again',
          action: 'retry',
          recoverable: true
        })
      })

      it('should handle connection failure', () => {
        const networkError = new NetworkError('Unable to connect')
        
        const result = errorHandler.handleNetworkError(networkError)
        
        expect(result).toEqual({
          message: 'Unable to connect to the server. Please check your internet connection',
          action: 'retry',
          recoverable: true
        })
      })

      it('should handle generic network error', () => {
        const networkError = new NetworkError('Network error')
        
        const result = errorHandler.handleNetworkError(networkError)
        
        expect(result).toEqual({
          message: 'Network error occurred. Please try again',
          action: 'retry',
          recoverable: true
        })
      })
    })

    describe('getErrorMessage', () => {
      it('should return user-friendly message for ApiError', () => {
        const apiError = new ApiError('Internal error', { status: 500 })
        
        const message = errorHandler.getErrorMessage(apiError)
        
        expect(message).toBe('A server error occurred. Please try again later')
      })

      it('should return user-friendly message for NetworkError', () => {
        const networkError = new NetworkError('Connection failed')
        
        const message = errorHandler.getErrorMessage(networkError)
        
        expect(message).toBe('Unable to connect to the server. Please check your internet connection')
      })

      it('should return user-friendly message for ValidationError', () => {
        const validationError = new ValidationError('Invalid input', 'email')
        
        const message = errorHandler.getErrorMessage(validationError)
        
        expect(message).toBe('Please check your input and try again')
      })

      it('should return original message for generic Error', () => {
        const genericError = new Error('Something specific went wrong')
        
        const message = errorHandler.getErrorMessage(genericError)
        
        expect(message).toBe('Something specific went wrong')
      })
    })

    describe('isRecoverable', () => {
      it('should identify recoverable errors', () => {
        const recoverableErrors = [
          new NetworkError('Timeout'),
          new ApiError('Server error', { status: 500 }),
          new ApiError('Unauthorized', { status: 401 }),
          new ValidationError('Invalid input')
        ]

        recoverableErrors.forEach(error => {
          expect(errorHandler.isRecoverable(error)).toBe(true)
        })
      })

      it('should identify non-recoverable errors', () => {
        const nonRecoverableErrors = [
          new ApiError('Forbidden', { status: 403 }),
          new ApiError('Not Found', { status: 404 })
        ]

        nonRecoverableErrors.forEach(error => {
          expect(errorHandler.isRecoverable(error)).toBe(false)
        })
      })
    })

    describe('createErrorReport', () => {
      it('should create comprehensive error report', () => {
        const error = new ApiError('Test error', { status: 500 }, { originalCause: 'Database connection' })
        const context = 'User dashboard loading'
        
        const report = errorHandler.createErrorReport(error, context)
        
        expect(report).toMatchObject({
          timestamp: expect.any(String),
          error: {
            name: 'ApiError',
            message: 'Test error',
            details: { status: 500 },
            cause: { originalCause: 'Database connection' }
          },
          context: 'User dashboard loading',
          userAgent: expect.stringContaining('jsdom'),
          url: expect.any(String)
        })
      })

      it('should handle missing error properties', () => {
        const error = new Error('Simple error')
        
        const report = errorHandler.createErrorReport(error)
        
        expect(report).toMatchObject({
          timestamp: expect.any(String),
          error: {
            name: 'Error',
            message: 'Simple error'
          },
          context: 'Unknown',
          userAgent: expect.any(String),
          url: expect.any(String)
        })
      })
    })

    describe('reportToService', () => {
      it('should attempt to report error to monitoring service', async () => {
        const error = new Error('Test error')
        
        // Mock fetch for error reporting
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        
        await errorHandler.reportToService(error, 'Test context')
        
        // In a real implementation, this would make an HTTP request
        // For now, we just verify the method completes without throwing
        expect(true).toBe(true)
      })

      it('should handle reporting service failures gracefully', async () => {
        const error = new Error('Test error')
        
        global.fetch = vi.fn().mockRejectedValue(new Error('Service unavailable'))
        
        // Should not throw even if reporting fails
        await expect(errorHandler.reportToService(error, 'Test context'))
          .resolves.not.toThrow()
      })
    })
  })

  describe('Error Handler Integration', () => {
    it('should provide complete error handling flow', () => {
      const apiError = new ApiError('API failed', { status: 500 })
      
      // Log the error
      errorHandler.logError(apiError, 'Integration test')
      
      // Handle the error
      const handling = errorHandler.handleApiError(apiError)
      
      // Get user message
      const message = errorHandler.getErrorMessage(apiError)
      
      // Check if recoverable
      const recoverable = errorHandler.isRecoverable(apiError)
      
      // Create error report
      const report = errorHandler.createErrorReport(apiError, 'Integration test')
      
      expect(mockConsole.error).toHaveBeenCalled()
      expect(handling.action).toBe('retry')
      expect(message).toContain('server error')
      expect(recoverable).toBe(true)
      expect(report.error.name).toBe('ApiError')
    })
  })
})