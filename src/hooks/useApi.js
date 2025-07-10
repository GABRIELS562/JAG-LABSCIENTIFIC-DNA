import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Custom hook for API calls with loading, error, and retry logic
export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef(null);
  
  const {
    immediate = true,
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    transform,
    dependencies = []
  } = options;

  const execute = useCallback(async (overrideUrl = null, overrideOptions = {}) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const requestUrl = overrideUrl || `${API_URL}${url}`;
      const requestOptions = {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        ...overrideOptions
      };

      const response = await fetch(requestUrl, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      let finalData = result.data || result;
      
      // Apply transform function if provided
      if (transform) {
        finalData = transform(finalData);
      }

      setData(finalData);
      setRetryCount(0);
      
      if (onSuccess) {
        onSuccess(finalData);
      }

      return finalData;
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled
      }

      setError(err.message);
      
      if (onError) {
        onError(err);
      }

      // Auto-retry logic
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          execute(overrideUrl, overrideOptions);
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, retryCount, maxRetries, retryDelay, onSuccess, onError, transform]);

  const retry = useCallback(() => {
    setRetryCount(0);
    execute();
  }, [execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setRetryCount(0);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useEffect(() => {
    if (immediate && url) {
      execute();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate, ...dependencies]);

  return {
    data,
    loading,
    error,
    execute,
    retry,
    reset,
    retryCount
  };
};

// Hook for POST/PUT/DELETE operations
export const useMutation = (options = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const {
    onSuccess,
    onError,
    transform
  } = options;

  const mutate = useCallback(async (url, requestOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const requestUrl = `${API_URL}${url}`;
      const finalOptions = {
        headers: {
          'Content-Type': 'application/json',
        },
        ...requestOptions
      };

      if (finalOptions.body && typeof finalOptions.body === 'object') {
        finalOptions.body = JSON.stringify(finalOptions.body);
      }

      const response = await fetch(requestUrl, finalOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      let finalData = result.data || result;
      
      if (transform) {
        finalData = transform(finalData);
      }

      setData(finalData);
      
      if (onSuccess) {
        onSuccess(finalData);
      }

      return finalData;
    } catch (err) {
      setError(err.message);
      
      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError, transform]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    loading,
    error,
    data,
    reset
  };
};

// Hook for paginated data
export const usePaginatedApi = (baseUrl, options = {}) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(options.defaultLimit || 20);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const url = `${baseUrl}?page=${page}&limit=${limit}`;
  
  const {
    data,
    loading,
    error,
    execute,
    retry,
    reset
  } = useApi(url, {
    ...options,
    transform: (result) => {
      if (result.meta?.pagination) {
        setTotalPages(result.meta.pagination.totalPages);
        setTotal(result.meta.pagination.total);
      }
      return result.data || result;
    },
    dependencies: [page, limit]
  });

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const changeLimit = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    retry,
    reset,
    page,
    limit,
    totalPages,
    total,
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

// Hook for real-time data with polling
export const usePolling = (url, interval = 30000, options = {}) => {
  const intervalRef = useRef(null);
  const [isPolling, setIsPolling] = useState(false);

  const apiHook = useApi(url, {
    immediate: options.immediate !== false,
    ...options
  });

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);
    intervalRef.current = setInterval(() => {
      apiHook.execute();
    }, interval);
  }, [interval, apiHook.execute]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (options.autoStart !== false) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, []);

  return {
    ...apiHook,
    isPolling,
    startPolling,
    stopPolling
  };
};

export default useApi;