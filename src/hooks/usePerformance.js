import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

// Hook for memoizing expensive calculations
export const useMemoizedValue = (computeValue, dependencies) => {
  return useMemo(computeValue, dependencies);
};

// Hook for memoizing callbacks to prevent unnecessary re-renders
export const useStableCallback = (callback, dependencies) => {
  return useCallback(callback, dependencies);
};

// Hook for debouncing values (useful for search inputs)
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttling function calls
export const useThrottle = (callback, delay) => {
  const lastCall = useRef(0);
  
  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    }
  }, [callback, delay]);
};

// Hook for measuring component render performance
export const useRenderCount = (componentName) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    if (process.env.NODE_ENV === 'development') {
      }
  });
  
  return renderCount.current;
};

// Hook for measuring component mount/unmount times
export const useComponentLifetime = (componentName) => {
  const mountTime = useRef(null);
  
  useEffect(() => {
    mountTime.current = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      }
    
    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTime.current;
      
      if (process.env.NODE_ENV === 'development') {
        }ms`);
      }
    };
  }, [componentName]);
};

// Hook for optimizing large lists with windowing/virtualization
export const useVirtualList = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 1, items.length);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll
  };
};

// Hook for lazy loading images
export const useLazyImage = (src, options = {}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef();
  
  const { threshold = 0.1, rootMargin = '0px' } = options;
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src, threshold, rootMargin]);
  
  const onLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
  }, []);
  
  const onError = useCallback(() => {
    setIsError(true);
    setIsLoaded(false);
  }, []);
  
  return {
    imgRef,
    imageSrc,
    isLoaded,
    isError,
    onLoad,
    onError
  };
};

// Hook for optimizing re-renders in form components
export const useFormPerformance = (initialValues) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);
  
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);
  
  const clearFieldError = useCallback((name) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);
  
  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldError,
    clearFieldError,
    reset
  };
};

// Hook for batching state updates
export const useBatchedUpdates = () => {
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const timeoutRef = useRef();
  
  const batchUpdate = useCallback((updateFn) => {
    setPendingUpdates(prev => [...prev, updateFn]);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setPendingUpdates(updates => {
        // Apply all updates
        updates.forEach(update => update());
        return [];
      });
    }, 0);
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return batchUpdate;
};

// Hook for preventing unnecessary API calls
export const useApiThrottle = (apiCall, delay = 1000) => {
  const lastCallTime = useRef(0);
  const timeoutRef = useRef();
  
  return useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime.current;
    
    if (timeSinceLastCall >= delay) {
      lastCallTime.current = now;
      return apiCall(...args);
    } else {
      // Schedule the call for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      return new Promise((resolve, reject) => {
        timeoutRef.current = setTimeout(() => {
          lastCallTime.current = Date.now();
          apiCall(...args).then(resolve).catch(reject);
        }, delay - timeSinceLastCall);
      });
    }
  }, [apiCall, delay]);
};

export default {
  useMemoizedValue,
  useStableCallback,
  useDebounce,
  useThrottle,
  useRenderCount,
  useComponentLifetime,
  useVirtualList,
  useLazyImage,
  useFormPerformance,
  useBatchedUpdates,
  useApiThrottle
};