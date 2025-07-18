import { useState, useEffect, useCallback } from 'react';
import { errorHandler } from '../utils/errorHandler';

/**
 * Custom hook for managing API data fetching with loading, error, and caching support
 * @param {Function} apiCall - The API function to call
 * @param {Array} dependencies - Dependencies that trigger refetch when changed
 * @param {Object} options - Configuration options
 * @returns {Object} { data, loading, error, refetch, setData }
 */
export function useApiData(apiCall, dependencies = [], options = {}) {
  const {
    initialData = null,
    onSuccess = null,
    onError = null,
    immediate = true,
    transform = null
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall(...args);
      
      if (response && response.success) {
        const transformedData = transform ? transform(response.data) : response.data;
        setData(transformedData);
        
        if (onSuccess) {
          onSuccess(transformedData, response);
        }
      } else {
        const errorMessage = response?.error || 'API call failed';
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage, response);
        }
      }
    } catch (err) {
      const errorMessage = errorHandler.getUserMessage(err);
      setError(errorMessage);
      
      // Log error for debugging
      errorHandler.logError(err, 'useApiData');
      
      if (onError) {
        onError(errorMessage, err);
      }
    } finally {
      setLoading(false);
    }
  }, [apiCall, onSuccess, onError, transform]);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData
  };
}

/**
 * Custom hook for API calls that require parameters
 * @param {Function} apiCall - The API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} { data, loading, error, execute, reset }
 */
export function useApiCall(apiCall, options = {}) {
  const {
    onSuccess = null,
    onError = null,
    transform = null
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall(...args);
      
      if (response && response.success) {
        const transformedData = transform ? transform(response.data) : response.data;
        setData(transformedData);
        
        if (onSuccess) {
          onSuccess(transformedData, response);
        }
        
        return { success: true, data: transformedData };
      } else {
        const errorMessage = response?.error || 'API call failed';
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage, response);
        }
        
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = errorHandler.getUserMessage(err);
      setError(errorMessage);
      
      // Log error for debugging
      errorHandler.logError(err, 'useApiData');
      
      if (onError) {
        onError(errorMessage, err);
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [apiCall, onSuccess, onError, transform]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
}

/**
 * Custom hook for managing multiple API calls in parallel
 * @param {Array} apiCalls - Array of API functions
 * @param {Array} dependencies - Dependencies that trigger refetch
 * @param {Object} options - Configuration options
 * @returns {Object} { data, loading, error, refetch }
 */
export function useApiMultiple(apiCalls, dependencies = [], options = {}) {
  const {
    onSuccess = null,
    onError = null,
    immediate = true
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const responses = await Promise.all(apiCalls.map(call => call()));
      const results = responses.map(response => ({
        success: response && response.success,
        data: response?.data || null,
        error: response?.error || null
      }));
      
      setData(results);
      
      if (onSuccess) {
        onSuccess(results);
      }
    } catch (err) {
      const errorMessage = err.message || 'One or more API calls failed';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage, err);
      }
    } finally {
      setLoading(false);
    }
  }, [apiCalls, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

export default useApiData;