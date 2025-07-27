import { errorHandler, ApiError, NetworkError } from '../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Unified API client with caching, retry logic, and connection handling
class UnifiedApiClient {
  constructor(baseURL = BASE_URL) {
    this.baseURL = baseURL;
    this.retryCount = 3;
    this.retryDelay = 1000;
    this.connectionListeners = new Set();
    this.isOnline = true;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
    
    console.log('🔧 UnifiedApiClient initialized with baseURL:', this.baseURL);
  }

  // Connection status management
  onConnectionChange(callback) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  notifyConnectionChange(isOnline) {
    if (this.isOnline !== isOnline) {
      this.isOnline = isOnline;
      this.connectionListeners.forEach(callback => callback(isOnline));
    }
  }

  // Cache management
  clearCache() {
    this.cache.clear();
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Enhanced fetch with retry logic, caching, and connection handling
  async enhancedFetch(url, options = {}, useCache = true) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        console.log('🔄 Using cached data for:', url);
        return { json: () => Promise.resolve(cachedData) };
      }
    }
    
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        console.log(`🌐 Fetching (attempt ${attempt + 1}):`, fullUrl);

        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          }
        });

        clearTimeout(timeoutId);
        console.log('📡 Response status:', response.status, 'for', url);

        // If we get here, connection is working
        if (!this.isOnline) {
          this.notifyConnectionChange(true);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApiError(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
            { status: response.status, data: errorData },
            null
          );
        }

        return response;
      } catch (error) {
        // Handle different types of errors
        if (error.name === 'AbortError') {
          console.warn(`⏱️ Request timeout on attempt ${attempt + 1}:`, url);
        } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
          console.warn(`🔌 Network error on attempt ${attempt + 1}:`, error.message);
          this.notifyConnectionChange(false);
        } else {
          console.warn(`❌ API error on attempt ${attempt + 1}:`, error.message);
        }

        // If this was the last attempt, throw a properly formatted error
        if (attempt === this.retryCount) {
          this.notifyConnectionChange(false);
          
          if (error.name === 'AbortError') {
            throw new NetworkError('Request timeout - please try again');
          } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
            throw new NetworkError('Unable to connect to server');
          } else {
            throw new ApiError(error.message || 'API request failed', null, error);
          }
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  // Helper method for JSON responses with caching
  async fetchJson(url, options = {}, useCache = true) {
    try {
      const response = await this.enhancedFetch(url, options, useCache);
      const data = await response.json();
      
      console.log('✅ Success for:', url, 'Data:', data.success ? 'OK' : 'FAIL');
      
      // Cache successful GET responses
      if (useCache && data.success && (!options.method || options.method === 'GET')) {
        const cacheKey = `${url}:${JSON.stringify(options)}`;
        this.setCachedData(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error('❌ API Error for:', url, 'Error:', error.message);
      
      // Log error using centralized error handler
      errorHandler.logError(error, `API Call: ${url}`);
      
      throw error;
    }
  }

  // Health check method
  async checkHealth() {
    try {
      const response = await this.fetchJson('/api/test', {}, false);
      return response.success === true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const apiClient = new UnifiedApiClient();

export const api = {
  // Expose connection and cache management
  onConnectionChange: (callback) => apiClient.onConnectionChange(callback),
  isOnline: () => apiClient.isOnline,
  checkHealth: () => apiClient.checkHealth(),
  clearCache: () => apiClient.clearCache(),

  // Core API methods

  async submitPaternityTest(data) {
    return apiClient.fetchJson('/api/submit-test', {
      method: "POST",
      body: JSON.stringify(data),
    }, false);
  },

  // Enhanced samples API with pagination support
  async getSamples(params = {}) {
    // Support both legacy and new pagination format
    if (params.page || params.limit || params.status || params.search) {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.period) queryParams.append('period', params.period);
      
      const url = `/api/samples${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return apiClient.fetchJson(url);
    } else {
      // Legacy format
      const queryParams = new URLSearchParams();
      if (params.period) queryParams.append('period', params.period);
      if (params.status) queryParams.append('status', params.status);
      
      const url = `/api/samples${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return apiClient.fetchJson(url);
    }
  },

  async getAllSamples() {
    return apiClient.fetchJson('/api/samples/all');
  },

  async searchSamples(query) {
    if (!query || !query.trim()) {
      return { success: true, data: [] };
    }
    return apiClient.fetchJson(`/api/samples/search?q=${encodeURIComponent(query)}`);
  },

  async getSampleCounts() {
    return apiClient.fetchJson('/api/samples/counts');
  },

  async getStatistics(period = 'daily') {
    return apiClient.fetchJson(`/api/statistics?period=${period}`);
  },

  async getLastLabNumber() {
    return apiClient.fetchJson('/api/get-last-lab-number');
  },

  // Batch API methods
  async getBatches() {
    return apiClient.fetchJson('/api/batches');
  },

  async getBatch(batchNumber) {
    return apiClient.fetchJson(`/api/batches/${batchNumber}`);
  },

  async getBatchById(batchId) {
    return apiClient.fetchJson(`/api/batches/${batchId}`);
  },

  // Equipment and Quality Control
  async getEquipment() {
    return apiClient.fetchJson('/api/equipment');
  },

  async getQualityControl(batchId = null) {
    const url = batchId 
      ? `/api/quality-control?batch_id=${batchId}`
      : '/api/quality-control';
    return apiClient.fetchJson(url);
  },

  // Reports operations (enhanced)
  async getReports(params = {}) {
    const searchParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/api/reports?${searchParams}`);
  },

  async getReportStats() {
    return apiClient.fetchJson('/api/reports/stats');
  },

  async getReport(id) {
    return apiClient.fetchJson(`/api/reports/${id}`);
  },

  async downloadReport(id) {
    window.open(`/api/reports/${id}/download`, '_blank');
  },

  async viewReport(id) {
    window.open(`/api/reports/${id}/view`, '_blank');
  },

  async createReport(reportData) {
    return apiClient.fetchJson('/api/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    }, false);
  },

  async updateReportStatus(id, status, notes = null) {
    return apiClient.fetchJson(`/api/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    }, false);
  },

  // Database operations
  async getDbReports() {
    return apiClient.fetchJson('/api/db/reports');
  },

  async refreshDatabase() {
    const result = await apiClient.fetchJson('/api/refresh-database', {
      method: 'POST'
    }, false);
    
    // Clear cache after database refresh
    apiClient.clearCache();
    return result;
  },

  // Sample queue management (optimized methods)
  async getSampleQueueCounts() {
    return apiClient.fetchJson('/api/samples/queue-counts');
  },

  async getSamplesForQueue(queueType) {
    return apiClient.fetchJson(`/api/samples/queue/${queueType}`);
  },

  async updateSampleWorkflowStatus(sampleIds, workflowStatus) {
    return apiClient.fetchJson('/api/samples/workflow-status', {
      method: 'PUT',
      body: JSON.stringify({ sampleIds, workflowStatus })
    }, false);
  }
};

export const batchApi = {
  async generateBatch(batchData) {
    try {
      return await apiClient.fetchJson('/api/generate-batch', {
        method: "POST",
        body: JSON.stringify(batchData),
      }, false);
    } catch (error) {
      console.error("Generate batch error:", error);
      return { success: false, error: error.message };
    }
  },

  async saveBatch(batchData) {
    try {
      return await apiClient.fetchJson('/api/save-batch', {
        method: "POST",
        body: JSON.stringify(batchData),
      }, false);
    } catch (error) {
      console.error("Save batch error:", error);
      return { success: false, error: error.message };
    }
  },

  async getWellAssignments(batchId) {
    return apiClient.fetchJson(`/api/well-assignments/${batchId}`);
  }
};

// Export the client instance for direct access if needed
export { apiClient };

// Export as default
export default api;