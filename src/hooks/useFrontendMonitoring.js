import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Performance metrics collector
export const useFrontendMonitoring = (componentName) => {
  const [performanceData, setPerformanceData] = useLocalStorage('frontend-performance', []);
  const [errorLogs, setErrorLogs] = useLocalStorage('frontend-errors', []);
  const mountTime = useRef(null);
  const renderCount = useRef(0);
  const lastRender = useRef(null);

  useEffect(() => {
    mountTime.current = performance.now();
    lastRender.current = performance.now();
    
    return () => {
      if (mountTime.current) {
        const lifetime = performance.now() - mountTime.current;
        recordMetric('component-lifetime', {
          componentName,
          lifetime,
          renderCount: renderCount.current
        });
      }
    };
  }, [componentName]);

  useEffect(() => {
    renderCount.current++;
    const renderTime = performance.now();
    
    if (lastRender.current) {
      const timeSinceLastRender = renderTime - lastRender.current;
      recordMetric('render-time', {
        componentName,
        timeSinceLastRender,
        renderCount: renderCount.current
      });
    }
    
    lastRender.current = renderTime;
  });

  const recordMetric = useCallback((metricType, data) => {
    const metric = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      metricType,
      data,
      url: window.location.pathname,
      userAgent: navigator.userAgent
    };

    setPerformanceData(prev => {
      const updated = [...prev, metric];
      // Keep only last 100 metrics
      return updated.slice(-100);
    });
  }, [setPerformanceData]);

  const recordError = useCallback((error, errorInfo = {}) => {
    const errorLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo,
      componentName,
      url: window.location.pathname,
      userAgent: navigator.userAgent
    };

    setErrorLogs(prev => {
      const updated = [...prev, errorLog];
      // Keep only last 50 errors
      return updated.slice(-50);
    });
  }, [setErrorLogs, componentName]);

  const recordUserAction = useCallback((action, details = {}) => {
    recordMetric('user-action', {
      action,
      details,
      componentName
    });
  }, [recordMetric, componentName]);

  const recordApiCall = useCallback((url, method, duration, success, statusCode) => {
    recordMetric('api-call', {
      url,
      method,
      duration,
      success,
      statusCode,
      componentName
    });
  }, [recordMetric, componentName]);

  const getMetrics = useCallback(() => {
    return {
      performance: performanceData,
      errors: errorLogs
    };
  }, [performanceData, errorLogs]);

  const clearMetrics = useCallback(() => {
    setPerformanceData([]);
    setErrorLogs([]);
  }, [setPerformanceData, setErrorLogs]);

  return {
    recordMetric,
    recordError,
    recordUserAction,
    recordApiCall,
    getMetrics,
    clearMetrics,
    renderCount: renderCount.current
  };
};

// Web Vitals monitoring
export const useWebVitals = () => {
  const [vitals, setVitals] = useState({});
  const [vitalsHistory, setVitalsHistory] = useLocalStorage('web-vitals', []);

  useEffect(() => {
    // Import web-vitals dynamically to avoid bundle size impact
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      const recordVital = (metric) => {
        setVitals(prev => ({
          ...prev,
          [metric.name]: metric.value
        }));

        const vitalRecord = {
          ...metric,
          timestamp: new Date().toISOString(),
          url: window.location.pathname
        };

        setVitalsHistory(prev => {
          const updated = [...prev, vitalRecord];
          return updated.slice(-50); // Keep last 50 measurements
        });
      };

      onCLS(recordVital);
      onFID(recordVital);
      onFCP(recordVital);
      onLCP(recordVital);
      onTTFB(recordVital);
    }).catch(() => {
      // Web vitals not available
    });
  }, [setVitalsHistory]);

  return { vitals, vitalsHistory };
};

// Network monitoring
export const useNetworkMonitoring = () => {
  const [networkInfo, setNetworkInfo] = useState({});
  const [connectionHistory, setConnectionHistory] = useLocalStorage('network-history', []);

  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection;
        const info = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: new Date().toISOString()
        };
        
        setNetworkInfo(info);
        setConnectionHistory(prev => {
          const updated = [...prev, info];
          return updated.slice(-20); // Keep last 20 measurements
        });
      }
    };

    updateNetworkInfo();

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateNetworkInfo);
      
      return () => {
        navigator.connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, [setConnectionHistory]);

  return { networkInfo, connectionHistory };
};

// Resource timing monitoring
export const useResourceTiming = () => {
  const [resourceMetrics, setResourceMetrics] = useLocalStorage('resource-timing', []);

  const measureResourceTiming = useCallback(() => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource');
      const recentResources = resources.slice(-10); // Last 10 resources
      
      const metrics = recentResources.map(resource => ({
        name: resource.name,
        duration: resource.duration,
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        decodedBodySize: resource.decodedBodySize,
        type: resource.initiatorType,
        timestamp: new Date().toISOString()
      }));

      setResourceMetrics(prev => {
        const updated = [...prev, ...metrics];
        return updated.slice(-100); // Keep last 100 resource metrics
      });
    }
  }, [setResourceMetrics]);

  useEffect(() => {
    // Measure on mount
    measureResourceTiming();
    
    // Set up periodic measurement
    const interval = setInterval(measureResourceTiming, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [measureResourceTiming]);

  return { resourceMetrics, measureResourceTiming };
};

// Memory usage monitoring
export const useMemoryMonitoring = () => {
  const [memoryUsage, setMemoryUsage] = useState({});
  const [memoryHistory, setMemoryHistory] = useLocalStorage('memory-usage', []);

  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        timestamp: new Date().toISOString()
      };

      setMemoryUsage(memory);
      setMemoryHistory(prev => {
        const updated = [...prev, memory];
        return updated.slice(-50); // Keep last 50 measurements
      });
    }
  }, [setMemoryHistory]);

  useEffect(() => {
    measureMemory();
    
    const interval = setInterval(measureMemory, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [measureMemory]);

  return { memoryUsage, memoryHistory, measureMemory };
};

// Combined monitoring hook
export const useComprehensiveMonitoring = (componentName) => {
  const frontendMonitoring = useFrontendMonitoring(componentName);
  const webVitals = useWebVitals();
  const networkMonitoring = useNetworkMonitoring();
  const resourceTiming = useResourceTiming();
  const memoryMonitoring = useMemoryMonitoring();

  const getAllMetrics = useCallback(() => {
    return {
      frontend: frontendMonitoring.getMetrics(),
      webVitals: webVitals.vitals,
      webVitalsHistory: webVitals.vitalsHistory,
      network: networkMonitoring.networkInfo,
      networkHistory: networkMonitoring.connectionHistory,
      resources: resourceTiming.resourceMetrics,
      memory: memoryMonitoring.memoryUsage,
      memoryHistory: memoryMonitoring.memoryHistory
    };
  }, [
    frontendMonitoring,
    webVitals,
    networkMonitoring,
    resourceTiming,
    memoryMonitoring
  ]);

  const sendMetricsToServer = useCallback(async () => {
    try {
      const metrics = getAllMetrics();
      
      await fetch('/monitoring/frontend-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          componentName,
          metrics,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send metrics to server:', error);
    }
  }, [getAllMetrics, componentName]);

  return {
    ...frontendMonitoring,
    webVitals,
    networkMonitoring,
    resourceTiming,
    memoryMonitoring,
    getAllMetrics,
    sendMetricsToServer
  };
};

export default useFrontendMonitoring;