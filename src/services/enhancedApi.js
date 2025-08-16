import { showError, createError } from '../components/common/ErrorHandler';
import webSocketService from './websocketService';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Enhanced API service with better error handling, retry logic, and real-time integration
 */
class EnhancedApiService {
  constructor(baseURL = BASE_URL) {
    this.baseURL = baseURL;
    this.retryCount = 3;
    this.retryDelay = 1000;
    this.timeout = 30000;
    this.cache = new Map();
    this.cacheTimeout = 30000;
    this.pendingRequests = new Map();
    
    // Setup request interceptors
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Monitor connection status
    window.addEventListener('online', () => {
      this.handleConnectionChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleConnectionChange(false);
    });
  }

  handleConnectionChange(isOnline) {
    if (isOnline) {
      showError(createError('Connection restored', {
        code: 'CONNECTION_RESTORED',
        severity: 'info'
      }));
    } else {
      showError(createError('Connection lost', {
        code: 'CONNECTION_LOST',
        severity: 'warning'
      }));
    }
  }

  // Generic request method with enhanced error handling
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body,
      headers = {},
      useCache = false,
      timeout = this.timeout,
      retries = this.retryCount,
      showErrorToUser = true,
      ...fetchOptions
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${method}:${url}:${JSON.stringify(body)}`;

    // Check cache for GET requests
    if (method === 'GET' && useCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check for pending identical requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this.executeRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
      ...fetchOptions
    }, retries, showErrorToUser);

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache successful GET requests
      if (method === 'GET' && useCache) {
        this.setCachedData(cacheKey, result);
      }

      return result;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey);
    }
  }

  async executeRequest(url, options, retries, showErrorToUser) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          throw await this.createApiError(response);
        }

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        return {
          data,
          status: response.status,
          headers: response.headers,
          ok: true
        };

      } catch (error) {
        lastError = error;

        // Don't retry for certain types of errors
        if (
          error.name === 'AbortError' ||
          error.code === 'UNAUTHORIZED' ||
          error.code === 'FORBIDDEN' ||
          error.code === 'NOT_FOUND' ||
          error.code === 'VALIDATION_ERROR'
        ) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // Handle final error
    if (showErrorToUser) {
      const errorId = showError(this.enhanceError(lastError, {
        retry: retries > 0 ? () => this.executeRequest(url, options, retries, showErrorToUser) : null
      }));
    }

    throw lastError;
  }

  async createApiError(response) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const errorMap = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      408: 'TIMEOUT',
      429: 'RATE_LIMITED',
      500: 'SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };

    return createError(errorData.message || `HTTP ${response.status}`, {
      code: errorMap[response.status] || 'HTTP_ERROR',
      context: {
        status: response.status,
        url: response.url,
        data: errorData
      }
    });
  }

  enhanceError(error, options = {}) {
    if (error.name === 'AbortError') {
      return createError('Request timed out', {
        code: 'TIMEOUT',
        ...options
      });
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return createError('Unable to connect to server', {
        code: 'NETWORK_ERROR',
        ...options
      });
    }

    return {
      ...error,
      ...options
    };
  }

  // Cache management
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET', useCache: true });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: data });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: data });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body: data });
  }

  // Specific API methods with real-time integration
  async getSamples(filters = {}) {
    try {
      const response = await this.get('/api/samples', {
        body: filters,
        useCache: false // Always get fresh data for samples
      });

      // Subscribe to real-time updates for samples
      webSocketService.on('sample_updated', (data) => {
        this.clearCache(); // Invalidate cache on updates
      });

      return response.data;
    } catch (error) {
      showError(createError('Failed to load samples', {
        code: 'SAMPLES_LOAD_ERROR',
        context: { filters },
        retry: () => this.getSamples(filters)
      }));
      throw error;
    }
  }

  async createSample(sampleData) {
    try {
      const response = await this.post('/api/samples', sampleData);
      
      // Clear relevant caches
      this.clearCache();
      
      // Show success notification
      showError(createError('Sample created successfully', {
        code: 'SAMPLE_CREATED',
        severity: 'info'
      }));

      return response.data;
    } catch (error) {
      showError(createError('Failed to create sample', {
        code: 'SAMPLE_CREATE_ERROR',
        context: { sampleData },
        retry: () => this.createSample(sampleData)
      }));
      throw error;
    }
  }

  async updateSample(id, sampleData) {
    try {
      const response = await this.put(`/api/samples/${id}`, sampleData);
      
      // Clear relevant caches
      this.clearCache();
      
      showError(createError('Sample updated successfully', {
        code: 'SAMPLE_UPDATED',
        severity: 'info'
      }));

      return response.data;
    } catch (error) {
      showError(createError('Failed to update sample', {
        code: 'SAMPLE_UPDATE_ERROR',
        context: { id, sampleData },
        retry: () => this.updateSample(id, sampleData)
      }));
      throw error;
    }
  }

  async getBatches() {
    try {
      const response = await this.get('/api/batches', {
        useCache: false
      });

      // Subscribe to real-time batch updates
      webSocketService.on('batch_updated', (data) => {
        this.clearCache();
      });

      return response.data;
    } catch (error) {
      showError(createError('Failed to load batches', {
        code: 'BATCHES_LOAD_ERROR',
        retry: () => this.getBatches()
      }));
      throw error;
    }
  }

  async createBatch(batchData) {
    try {
      const response = await this.post('/api/batches', batchData);
      
      this.clearCache();
      
      showError(createError('Batch created successfully', {
        code: 'BATCH_CREATED',
        severity: 'info'
      }));

      return response.data;
    } catch (error) {
      showError(createError('Failed to create batch', {
        code: 'BATCH_CREATE_ERROR',
        context: { batchData },
        retry: () => this.createBatch(batchData)
      }));
      throw error;
    }
  }

  // Upload with progress tracking
  async uploadFile(endpoint, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(createError(`Upload failed: ${xhr.statusText}`, {
            code: 'UPLOAD_ERROR',
            context: { status: xhr.status, file: file.name }
          }));
        }
      });

      xhr.addEventListener('error', () => {
        reject(createError('Upload failed due to network error', {
          code: 'UPLOAD_NETWORK_ERROR',
          context: { file: file.name }
        }));
      });

      xhr.addEventListener('timeout', () => {
        reject(createError('Upload timed out', {
          code: 'UPLOAD_TIMEOUT',
          context: { file: file.name }
        }));
      });

      xhr.open('POST', `${this.baseURL}${endpoint}`);
      xhr.timeout = 300000; // 5 minute timeout for uploads
      xhr.send(formData);
    });
  }
}

// Singleton instance
const enhancedApi = new EnhancedApiService();

export default enhancedApi;