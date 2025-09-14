import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { errorHandler, NetworkError, ApiError } from '../utils/errorHandler';

/**
 * Enhanced hook for handling API calls with loading states, error handling, and retry logic
 */
export const useApiHandler = (options = {}) => {
  const {
    showErrorNotification = true,
    retryAttempts = 0,
    cacheResults = true,
    optimisticUpdates = false
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const abortControllerRef = useRef(null);

  // Clear previous error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cancel ongoing request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Execute API call with enhanced error handling
  const execute = useCallback(async (apiCall, ...args) => {
    // Cancel any ongoing request
    cancel();

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    let attempts = 0;
    const maxAttempts = retryAttempts + 1;

    while (attempts < maxAttempts) {
      try {
        // Check if request was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Request cancelled');
        }

        const result = await apiCall(...args);

        // Check if request was cancelled during execution
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        setData(result);
        setLoading(false);
        setError(null);
        return result;

      } catch (err) {
        attempts++;

        // Don't retry if request was cancelled
        if (abortControllerRef.current?.signal.aborted || err.message === 'Request cancelled') {
          setLoading(false);
          return null;
        }

        // Don't retry certain types of errors
        const shouldRetry = attempts < maxAttempts &&
          !(err instanceof ApiError && err.details?.status >= 400 && err.details?.status < 500);

        if (!shouldRetry) {
          const handledError = errorHandler.handleApiError(err, `API Handler`);

          setError(handledError);
          setLoading(false);

          if (showErrorNotification) {
            // Trigger global error notification if available
            if (window.showErrorNotification) {
              window.showErrorNotification(errorHandler.getUserMessage(handledError));
            }
          }

          throw handledError;
        }

        // Wait before retry
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [retryAttempts, showErrorNotification, cancel]);

  // Execute with optimistic update
  const executeOptimistic = useCallback(async (apiCall, optimisticData, ...args) => {
    if (optimisticUpdates && optimisticData) {
      setData(optimisticData);
    }

    try {
      return await execute(apiCall, ...args);
    } catch (error) {
      // Revert optimistic update on error
      if (optimisticUpdates) {
        setData(null);
      }
      throw error;
    }
  }, [execute, optimisticUpdates]);

  // Reset all state
  const reset = useCallback(() => {
    cancel();
    setLoading(false);
    setError(null);
    setData(null);
  }, [cancel]);

  return {
    loading,
    error,
    data,
    execute,
    executeOptimistic,
    clearError,
    cancel,
    reset,
    // Utility methods
    isError: !!error,
    isLoading: loading,
    isSuccess: !loading && !error && data !== null,
    isEmpty: !loading && !error && (data === null || (Array.isArray(data) && data.length === 0))
  };
};

/**
 * Hook for managing multiple API states (useful for components with multiple endpoints)
 */
export const useMultipleApiHandler = () => {
  const [states, setStates] = useState({});

  const getState = useCallback((key) => {
    return states[key] || {
      loading: false,
      error: null,
      data: null,
      isError: false,
      isLoading: false,
      isSuccess: false,
      isEmpty: false
    };
  }, [states]);

  const setState = useCallback((key, updates) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...updates,
        isError: !!updates.error,
        isLoading: updates.loading || false,
        isSuccess: !updates.loading && !updates.error && updates.data !== null,
        isEmpty: !updates.loading && !updates.error &&
          (updates.data === null || (Array.isArray(updates.data) && updates.data.length === 0))
      }
    }));
  }, []);

  const execute = useCallback(async (key, apiCall, ...args) => {
    setState(key, { loading: true, error: null });

    try {
      const result = await apiCall(...args);
      setState(key, { loading: false, data: result, error: null });
      return result;
    } catch (error) {
      const handledError = errorHandler.handleApiError(error, `API Handler: ${key}`);
      setState(key, { loading: false, error: handledError });
      throw handledError;
    }
  }, [setState]);

  const reset = useCallback((key) => {
    if (key) {
      setState(key, { loading: false, error: null, data: null });
    } else {
      setStates({});
    }
  }, [setState]);

  return {
    getState,
    execute,
    reset,
    states
  };
};

/**
 * Hook specifically for handling connection status
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    isHealthy: null,
    lastCheck: null
  });

  useState(() => {
    const unsubscribe = api.onConnectionChange((connectionStatus) => {
      setStatus({
        isOnline: connectionStatus.isOnline,
        isHealthy: connectionStatus.isHealthy,
        lastCheck: Date.now()
      });
    });

    return unsubscribe;
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const isHealthy = await api.checkHealth();
      setStatus(prev => ({
        ...prev,
        isHealthy,
        lastCheck: Date.now()
      }));
      return isHealthy;
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isHealthy: false,
        lastCheck: Date.now()
      }));
      return false;
    }
  }, []);

  return {
    ...status,
    checkHealth,
    canMakeRequests: status.isOnline && status.isHealthy !== false,
    hasOfflineData: api.hasOfflineData(),
    connectionStatus: api.getConnectionStatus()
  };
};

export default useApiHandler;