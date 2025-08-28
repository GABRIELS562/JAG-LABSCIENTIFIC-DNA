import { toast } from '../hooks/use-toast';
import axios from 'axios';

// Configure axios interceptors for global error handling
export const setupAxiosInterceptors = () => {
  // Request interceptor
  axios.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axios.interceptors.response.use(
    (response) => {
      // Handle successful responses
      if (response.data?.message && response.config.method !== 'get') {
        // Show success message for mutations
        toast.success(response.data.message);
      }
      return response;
    },
    (error) => {
      handleApiError(error);
      return Promise.reject(error);
    }
  );
};

// Central error handler
export const handleApiError = (error) => {
  console.error('API Error:', error);

  let errorMessage = 'An unexpected error occurred';
  let errorDescription = '';

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        errorMessage = 'Invalid Request';
        errorDescription = data?.message || 'Please check your input and try again';
        break;
      case 401:
        errorMessage = 'Authentication Required';
        errorDescription = 'Please log in to continue';
        // Redirect to login if needed
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
        break;
      case 403:
        errorMessage = 'Access Denied';
        errorDescription = 'You do not have permission to perform this action';
        break;
      case 404:
        errorMessage = 'Not Found';
        errorDescription = data?.message || 'The requested resource was not found';
        break;
      case 409:
        errorMessage = 'Conflict';
        errorDescription = data?.message || 'This operation conflicts with existing data';
        break;
      case 422:
        errorMessage = 'Validation Error';
        errorDescription = data?.message || 'Please check your input data';
        break;
      case 500:
        errorMessage = 'Server Error';
        errorDescription = 'Something went wrong on our end. Please try again later';
        break;
      case 502:
      case 503:
      case 504:
        errorMessage = 'Service Unavailable';
        errorDescription = 'The server is temporarily unavailable. Please try again';
        break;
      default:
        errorMessage = `Error ${status}`;
        errorDescription = data?.message || 'An error occurred while processing your request';
    }
  } else if (error.request) {
    // Request made but no response
    errorMessage = 'Network Error';
    errorDescription = 'Unable to connect to the server. Please check your connection';
  } else {
    // Error in request setup
    errorMessage = 'Request Failed';
    errorDescription = error.message || 'Failed to send request';
  }

  // Show error toast
  toast.error(errorMessage, errorDescription);
};

// Form validation error handler
export const handleValidationError = (errors) => {
  const errorMessages = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('\n');
  
  toast.error('Validation Failed', errorMessages);
};

// Generic error boundary handler
export const handleComponentError = (error, errorInfo) => {
  console.error('Component Error:', error, errorInfo);
  
  toast.error(
    'Application Error',
    'An error occurred in the application. Please refresh the page.'
  );
};

// Success handler
export const handleSuccess = (message, description) => {
  toast.success(message, description);
};

// Warning handler
export const handleWarning = (message, description) => {
  toast.warning(message, description);
};

// Info handler
export const handleInfo = (message, description) => {
  toast.info(message, description);
};

// Batch operation error handler
export const handleBatchErrors = (errors) => {
  const failedCount = errors.length;
  const errorSummary = errors.slice(0, 3).map(e => e.message).join(', ');
  
  toast.error(
    `${failedCount} operations failed`,
    failedCount > 3 ? `${errorSummary}... and ${failedCount - 3} more` : errorSummary
  );
};

// File upload error handler
export const handleFileError = (error) => {
  let message = 'File upload failed';
  let description = '';
  
  if (error.code === 'FILE_TOO_LARGE') {
    description = 'File size exceeds the maximum allowed size';
  } else if (error.code === 'INVALID_FILE_TYPE') {
    description = 'File type is not supported';
  } else if (error.code === 'UPLOAD_FAILED') {
    description = 'Failed to upload file. Please try again';
  } else {
    description = error.message || 'An error occurred during file upload';
  }
  
  toast.error(message, description);
};

// Export default error handler
export default {
  setupAxiosInterceptors,
  handleApiError,
  handleValidationError,
  handleComponentError,
  handleSuccess,
  handleWarning,
  handleInfo,
  handleBatchErrors,
  handleFileError
};