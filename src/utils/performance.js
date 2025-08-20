// Performance monitoring and optimization utilities

/**
 * Performance monitoring utilities for the LIMS application
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isSupported = 'performance' in window && 'PerformanceObserver' in window;
  }

  /**
   * Measure function execution time
   */
  measureFunction(name, fn) {
    return async (...args) => {
      const start = performance.now();
      let result;
      let error = null;

      try {
        result = await fn(...args);
      } catch (err) {
        error = err;
        throw err;
      } finally {
        const duration = performance.now() - start;
        this.recordMetric(name, duration, !error);
        
        if (duration > 1000) { // Warn if function takes more than 1 second
          console.warn(`Slow function detected: ${name} took ${duration.toFixed(2)}ms`);
        }
      }

      return result;
    };
  }

  /**
   * Measure component render time
   */
  measureRender(componentName) {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(`${componentName}_render`, duration, true);
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, duration, success = true) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        successCount: 0,
        errorCount: 0
      });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    
    if (success) {
      metric.successCount++;
    } else {
      metric.errorCount++;
    }
  }

  /**
   * Start monitoring Core Web Vitals
   */
  startCoreWebVitalsMonitoring() {
    if (!this.isSupported) return;

    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime, true);
        }
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
    this.observers.set('fcp', fcpObserver);

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime, true);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.set('lcp', lcpObserver);

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('FID', entry.processingStart - entry.startTime, true);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    this.observers.set('fid', fidObserver);

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue, true);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('cls', clsObserver);
  }

  /**
   * Monitor memory usage
   */
  getMemoryInfo() {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usedPercentage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)
      };
    }
    return null;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    const metricsObject = {};
    for (const [name, metric] of this.metrics) {
      metricsObject[name] = { ...metric };
    }
    return metricsObject;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const metrics = this.getMetrics();
    const memory = this.getMemoryInfo();
    
    return {
      metrics,
      memory,
      timestamp: new Date().toISOString(),
      coreWebVitals: {
        FCP: metrics.FCP?.averageDuration || null,
        LCP: metrics.LCP?.averageDuration || null,
        FID: metrics.FID?.averageDuration || null,
        CLS: metrics.CLS?.averageDuration || null
      }
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
  }

  /**
   * Stop all observers
   */
  disconnect() {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}

/**
 * React Hook for performance monitoring
 */
export function usePerformanceMonitor(componentName) {
  const monitor = new PerformanceMonitor();
  
  React.useEffect(() => {
    const endMeasure = monitor.measureRender(componentName);
    return endMeasure;
  }, []);

  return monitor;
}

/**
 * Higher-order component for performance monitoring
 */
export function withPerformanceMonitoring(WrappedComponent, componentName) {
  return function PerformanceMonitoredComponent(props) {
    const monitor = usePerformanceMonitor(componentName || WrappedComponent.name);
    
    return React.createElement(WrappedComponent, props);
  };
}

/**
 * Debounce utility for performance optimization
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

/**
 * Throttle utility for performance optimization
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoization utility for expensive computations
 */
export function memoize(fn, getKey = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  
  return function memoized(...args) {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
}

/**
 * Lazy loading utility for components
 */
export function createLazyComponent(importFunc, fallback = null) {
  return React.lazy(() => 
    importFunc().catch(error => {
      console.error('Error loading component:', error);
      return { default: () => fallback || React.createElement('div', null, 'Error loading component') };
    })
  );
}

/**
 * Virtual scrolling utility for large lists
 */
export function useVirtualScroll({ itemCount, itemHeight, containerHeight }) {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight) + 1, itemCount);
  
  const visibleItems = React.useMemo(() => {
    const items = [];
    for (let i = startIndex; i < endIndex; i++) {
      items.push(i);
    }
    return items;
  }, [startIndex, endIndex]);
  
  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight: itemCount * itemHeight,
    offsetY: startIndex * itemHeight,
    onScroll: (e) => setScrollTop(e.target.scrollTop)
  };
}

/**
 * Resource preloader
 */
export function preloadResource(href, type = 'script') {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = type;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

/**
 * Bundle size analyzer (development only)
 */
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const scripts = Array.from(document.scripts);
  let totalSize = 0;
  
  scripts.forEach(script => {
    if (script.src) {
      fetch(script.src, { method: 'HEAD' })
        .then(response => {
          const size = response.headers.get('content-length');
          if (size) {
            totalSize += parseInt(size);
            console.log(`Script: ${script.src} - Size: ${(parseInt(size) / 1024).toFixed(2)} KB`);
          }
        })
        .catch(console.error);
    }
  });
  
  setTimeout(() => {
    console.log(`Total bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
  }, 1000);
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();

// Initialize monitoring on app start
if (typeof window !== 'undefined') {
  globalPerformanceMonitor.startCoreWebVitalsMonitoring();
  
  // Log performance summary every 30 seconds in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      console.log('Performance Summary:', globalPerformanceMonitor.getSummary());
    }, 30000);
  }
}