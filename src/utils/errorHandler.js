// Centralized error handling utilities for the frontend

/**
 * Standard error response format
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * API Error - for errors from API calls
 */
export class ApiError extends AppError {
  constructor(message, response = null, originalError = null) {
    const statusCode = response?.status || 500;
    const code = response?.data?.code || 'API_ERROR';
    
    super(message, code, statusCode, {
      response: response?.data,
      url: response?.config?.url,
      method: response?.config?.method,
      originalError: originalError?.message
    });
    
    this.name = 'ApiError';
  }
}

/**
 * Validation Error - for form and input validation
 */
export class ValidationError extends AppError {
  constructor(message, fieldErrors = {}) {
    super(message, 'VALIDATION_ERROR', 400, { fieldErrors });
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Network Error - for connection issues
 */
export class NetworkError extends AppError {
  constructor(message = 'Network connection failed', originalError = null) {
    super(message, 'NETWORK_ERROR', 0, { originalError: originalError?.message });
    this.name = 'NetworkError';
  }
}

/**
 * Error handler utility functions
 */
export const errorHandler = {
  /**
   * Handle API response errors
   */
  handleApiError(error, context = '') {
    console.error(`API Error ${context}:`, error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new NetworkError('Unable to connect to server. Please check your internet connection.');
    }
    
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || `HTTP ${status} Error`;
      return new ApiError(message, error.response, error);
    }
    
    if (error.request) {
      return new NetworkError('No response received from server', error);
    }
    
    return new AppError(error.message || 'An unexpected error occurred', 'UNKNOWN_ERROR', 500, error);
  },

  /**
   * Handle validation errors
   */
  handleValidationError(errors, message = 'Validation failed') {
    return new ValidationError(message, errors);
  },

  /**
   * Get user-friendly error message
   */
  getUserMessage(error) {
    if (error instanceof NetworkError) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    if (error instanceof ValidationError) {
      return error.message;
    }
    
    if (error instanceof ApiError) {
      switch (error.statusCode) {
        case 400:
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Please log in to continue.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return error.message || 'An error occurred while processing your request.';
      }
    }
    
    return error.message || 'An unexpected error occurred.';
  },

  /**
   * Log error for debugging
   */
  logError(error, context = '', additionalData = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof AppError ? error.toJSON() : {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      additionalData,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('Error logged:', errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureError(errorInfo);
    }
    
    return errorInfo;
  },

  /**
   * Handle errors in async operations
   */
  async handleAsync(asyncFunction, context = '') {
    try {
      return await asyncFunction();
    } catch (error) {
      const handledError = this.handleApiError(error, context);
      this.logError(handledError, context);
      throw handledError;
    }
  },

  /**
   * Create error boundary handler
   */
  createErrorBoundaryHandler(fallbackComponent = null) {
    return (error, errorInfo) => {
      this.logError(error, 'React Error Boundary', errorInfo);
      
      // You could also trigger a notification here
      if (window.showErrorNotification) {
        window.showErrorNotification(this.getUserMessage(error));
      }
      
      return fallbackComponent;
    };
  }
};

/**
 * Higher-order function to wrap API calls with error handling
 */
export function withErrorHandling(apiFunction, context = '') {
  return async (...args) => {
    try {
      const response = await apiFunction(...args);
      
      // Check if response indicates an error
      if (response && !response.success && response.error) {
        throw new ApiError(response.error, { data: response });
      }
      
      return response;
    } catch (error) {
      const handledError = errorHandler.handleApiError(error, context);
      errorHandler.logError(handledError, context);
      throw handledError;
    }
  };
}

/**
 * Utility to check if error is a specific type
 */
export function isErrorType(error, errorClass) {
  return error instanceof errorClass;
}

/**
 * Utility to extract field errors for forms
 */
export function getFieldErrors(error) {
  if (error instanceof ValidationError) {
    return error.fieldErrors || {};
  }
  
  if (error instanceof ApiError && error.details?.response?.fieldErrors) {
    return error.details.response.fieldErrors;
  }
  
  return {};
}

/**
 * Create standardized error response
 */
export function createErrorResponse(error, success = false) {
  return {
    success,
    error: errorHandler.getUserMessage(error),
    code: error.code || 'UNKNOWN_ERROR',
    details: error.details || null,
    timestamp: new Date().toISOString()
  };
}

export default errorHandler;