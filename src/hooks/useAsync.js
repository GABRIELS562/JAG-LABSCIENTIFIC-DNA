import { useState, useEffect, useCallback, useRef } from 'react';

// Generic hook for async operations
export const useAsync = (asyncFunction, immediate = true, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const isMountedRef = useRef(true);
  const promiseRef = useRef(null);

  const execute = useCallback(async (...args) => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const promise = asyncFunction(...args);
      promiseRef.current = promise;

      const result = await promise;
      
      if (isMountedRef.current && promiseRef.current === promise) {
        setData(result);
      }

      return result;
    } catch (err) {
      if (isMountedRef.current && promiseRef.current === promise) {
        setError(err);
      }
      throw err;
    } finally {
      if (isMountedRef.current && promiseRef.current === promise) {
        setLoading(false);
      }
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setData(null);
    setError(null);
    setLoading(false);
    promiseRef.current = null;
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [immediate, ...dependencies]);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
};

// Hook for debounced async operations
export const useDebouncedAsync = (asyncFunction, delay = 500, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const execute = useCallback(async (...args) => {
    if (!isMountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await asyncFunction(...args);
        
        if (isMountedRef.current) {
          setData(result);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }, delay);
  }, [asyncFunction, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
  }, [cancel]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    cancel,
    reset
  };
};

// Hook for retry logic
export const useRetry = (asyncFunction, maxRetries = 3, retryDelay = 1000) => {
  const [retryCount, setRetryCount] = useState(0);
  
  const { data, loading, error, execute: baseExecute, reset } = useAsync(asyncFunction, false);

  const execute = useCallback(async (...args) => {
    setRetryCount(0);
    
    const attemptExecution = async (attempt) => {
      try {
        return await baseExecute(...args);
      } catch (err) {
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return attemptExecution(attempt + 1);
        } else {
          throw err;
        }
      }
    };

    return attemptExecution(0);
  }, [baseExecute, maxRetries, retryDelay]);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    execute,
    retry,
    reset,
    retryCount,
    maxRetries
  };
};

export default useAsync;