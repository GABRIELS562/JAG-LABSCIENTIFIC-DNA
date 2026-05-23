import { errorHandler, ApiError, NetworkError, ValidationError } from '../utils/errorHandler';
import { getApiBaseUrl, getAppConfig, logEnvironmentInfo } from '../utils/environment';

// Get API base URL from environment utilities
const BASE_URL = getApiBaseUrl();
const APP_CONFIG = getAppConfig();

// Log environment info on startup
logEnvironmentInfo();

// Offline storage key for critical data
const OFFLINE_STORAGE_KEY = 'lims_offline_data';
const OFFLINE_TIMESTAMP_KEY = 'lims_offline_timestamp';
const OFFLINE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Unified API client with enhanced production features
class UnifiedApiClient {
  constructor(baseURL = BASE_URL) {
    this.baseURL = baseURL;
    this.retryCount = APP_CONFIG.apiRetries;
    this.retryDelay = 1000;
    this.maxRetryDelay = 10000;
    this.connectionListeners = new Set();
    this.isOnline = navigator.onLine;
    this.cache = new Map();
    this.cacheTimeout = APP_CONFIG.cacheTimeout;
    this.isHealthy = null;
    this.healthCheckInterval = null;
    this.lastHealthCheck = 0;
    this.healthCheckFrequency = 30000; // 30 seconds

    // Initialize connection monitoring
    this.initializeConnectionMonitoring();

    console.log('🔧 UnifiedApiClient initialized with baseURL:', this.baseURL);
    console.log('🌐 Network status:', this.isOnline ? 'Online' : 'Offline');

    // Start health monitoring
    this.startHealthMonitoring();
  }

  // Initialize connection monitoring
  initializeConnectionMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Network: Online');
        this.notifyConnectionChange(true);
        this.performHealthCheck(); // Verify backend connectivity
      });

      window.addEventListener('offline', () => {
        console.log('🌐 Network: Offline');
        this.notifyConnectionChange(false);
        this.isHealthy = false;
      });
    }
  }

  // Connection status management
  onConnectionChange(callback) {
    this.connectionListeners.add(callback);
    // Immediately call with current status
    callback({ isOnline: this.isOnline, isHealthy: this.isHealthy });
    return () => this.connectionListeners.delete(callback);
  }

  notifyConnectionChange(isOnline, isHealthy = null) {
    const changed = this.isOnline !== isOnline || (isHealthy !== null && this.isHealthy !== isHealthy);

    if (changed) {
      this.isOnline = isOnline;
      if (isHealthy !== null) {
        this.isHealthy = isHealthy;
      }

      const status = { isOnline: this.isOnline, isHealthy: this.isHealthy };
      this.connectionListeners.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.warn('Connection listener error:', error);
        }
      });
    }
  }

  // Health monitoring
  startHealthMonitoring() {
    this.performHealthCheck(); // Initial check

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      if (this.isOnline) {
        this.performHealthCheck();
      }
    }, this.healthCheckFrequency);
  }

  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async performHealthCheck() {
    try {
      const isHealthy = await this.checkHealth();
      this.notifyConnectionChange(this.isOnline, isHealthy);
      this.lastHealthCheck = Date.now();
      return isHealthy;
    } catch (error) {
      console.warn('Health check failed:', error.message);
      this.notifyConnectionChange(this.isOnline, false);
      return false;
    }
  }

  // Enhanced cache management with offline support
  clearCache() {
    this.cache.clear();
    // Also clear offline storage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
      localStorage.removeItem(OFFLINE_TIMESTAMP_KEY);
    }
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

  // Offline data management
  getOfflineData(key) {
    if (typeof localStorage === 'undefined') return null;

    try {
      const offlineData = localStorage.getItem(OFFLINE_STORAGE_KEY);
      const timestamp = localStorage.getItem(OFFLINE_TIMESTAMP_KEY);

      if (!offlineData || !timestamp) return null;

      const age = Date.now() - parseInt(timestamp);
      if (age > OFFLINE_CACHE_TTL) {
        this.clearOfflineData();
        return null;
      }

      const data = JSON.parse(offlineData);
      return data[key] || null;
    } catch (error) {
      console.warn('Failed to read offline data:', error);
      return null;
    }
  }

  setOfflineData(key, data) {
    if (typeof localStorage === 'undefined') return;

    try {
      const existing = localStorage.getItem(OFFLINE_STORAGE_KEY);
      const offlineData = existing ? JSON.parse(existing) : {};

      offlineData[key] = data;

      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(offlineData));
      localStorage.setItem(OFFLINE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save offline data:', error);
    }
  }

  clearOfflineData() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
      localStorage.removeItem(OFFLINE_TIMESTAMP_KEY);
    }
  }

  // Enhanced fetch with production-ready features
  async enhancedFetch(url, options = {}, useCache = true) {
    // Smart URL construction for different environments
    let fullUrl;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else if (url.startsWith('/api')) {
      fullUrl = this.baseURL === '/api' ? url : `${this.baseURL}${url.substring(4)}`;
    } else {
      fullUrl = `${this.baseURL}${url.startsWith('/') ? url : '/' + url}`;
    }

    const cacheKey = `${url}:${JSON.stringify(options)}`;
    const isGetRequest = !options.method || options.method === 'GET';

    // Try cache first for GET requests
    if (useCache && isGetRequest) {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        console.log('🔄 Using cached data for:', url);
        return { json: () => Promise.resolve(cachedData) };
      }

      // If offline, try offline storage
      if (!this.isOnline || this.isHealthy === false) {
        const offlineData = this.getOfflineData(cacheKey);
        if (offlineData) {
          console.log('📱 Using offline data for:', url);
          return { json: () => Promise.resolve(offlineData) };
        }
      }
    }

    // If offline and no cached data available, throw appropriate error
    if (!this.isOnline) {
      throw new NetworkError('You are offline. Please check your internet connection.');
    }

    let lastError = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      const controller = new AbortController();
      let timeoutId;

      try {
        // Progressive timeout based on attempt and request type
        const baseTimeout = options.method === 'POST' ? 60000 : 30000;
        const timeout = Math.min(baseTimeout * (1 + attempt * 0.5), 120000);
        timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log(`🌐 Fetching (attempt ${attempt + 1}/${this.retryCount + 1}):`, fullUrl);

        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
            ...options.headers,
          }
        });

        clearTimeout(timeoutId);
        console.log('📡 Response status:', response.status, 'for', url);

        // Update connection status on successful response
        if (this.isHealthy !== true) {
          this.notifyConnectionChange(this.isOnline, true);
        }

        if (!response.ok) {
          let errorData;
          const contentType = response.headers.get('content-type');

          try {
            if (contentType && contentType.includes('application/json')) {
              errorData = await response.json();
            } else {
              const text = await response.text();
              errorData = { message: text || `HTTP ${response.status}: ${response.statusText}` };
            }
          } catch (parseError) {
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
          }

          const apiError = new ApiError(
            errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            { status: response.status, data: errorData },
            null
          );

          // Don't retry 4xx errors (except 429 rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw apiError;
          }

          // For 5xx errors or 429 rate limit, throw to trigger retry logic in catch block
          throw apiError;
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        // Handle different types of errors
        if (error.name === 'AbortError') {
          console.warn(`⏱️ Request timeout on attempt ${attempt + 1}:`, url);
        } else if (error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          console.warn(`🔌 Network error on attempt ${attempt + 1}:`, error.message);
          this.notifyConnectionChange(this.isOnline, false);
        } else if (error instanceof ApiError) {
          console.warn(`❌ API error on attempt ${attempt + 1}:`, error.message);
          // Don't retry certain API errors
          if (error.details?.status && error.details.status >= 400 && error.details.status < 500 && error.details.status !== 429) {
            throw error;
          }
        } else {
          console.warn(`❌ Unexpected error on attempt ${attempt + 1}:`, error.message);
        }

        // If this was the last attempt, throw the appropriate error
        if (attempt === this.retryCount) {
          if (error.name === 'AbortError') {
            throw new NetworkError('Request timeout - the server took too long to respond. Please try again.');
          } else if (error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            this.notifyConnectionChange(this.isOnline, false);
            throw new NetworkError('Unable to connect to server. Please check your connection and try again.');
          } else {
            throw error;
          }
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(this.retryDelay * Math.pow(2, attempt), this.maxRetryDelay);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new NetworkError('All retry attempts failed');
  }

  // Helper method for JSON responses with enhanced caching and offline support
  async fetchJson(url, options = {}, useCache = true) {
    const startTime = Date.now();
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    const isGetRequest = !options.method || options.method === 'GET';

    try {
      const response = await this.enhancedFetch(url, options, useCache);
      const data = await response.json();

      const duration = Date.now() - startTime;
      console.log('✅ Success for:', url, `(${duration}ms)`, 'Data:', data.success ? 'OK' : 'FAIL');

      // Cache and offline storage for successful GET responses
      if (useCache && data.success && isGetRequest) {
        this.setCachedData(cacheKey, data);

        // Store critical data offline for resilience
        if (this.isCriticalData(url)) {
          this.setOfflineData(cacheKey, data);
        }
      }

      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ API Error for:', url, `(${duration}ms)`, 'Error:', error.message);

      // Log error using centralized error handler
      errorHandler.logError(error, `API Call: ${url}`, { duration, cacheKey });

      throw error;
    }
  }

  // Determine if data should be stored offline
  isCriticalData(url) {
    const criticalEndpoints = [
      '/samples/counts',
      '/statistics',
      '/samples',
      '/batches',
      '/equipment',
      '/quality-control'
    ];

    return criticalEndpoints.some(endpoint => url.includes(endpoint));
  }

  // Enhanced health check method
  async checkHealth() {
    try {
      // Use a lightweight endpoint for health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy' || data.success === true;
      }

      return false;
    } catch (error) {
      console.warn('Health check failed:', error.message);
      return false;
    }
  }

  // Get detailed connection status
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      baseURL: this.baseURL,
      cacheSize: this.cache.size,
      hasOfflineData: this.hasOfflineData()
    };
  }

  // Check if offline data is available
  hasOfflineData() {
    if (typeof localStorage === 'undefined') return false;

    try {
      const offlineData = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return !!offlineData;
    } catch {
      return false;
    }
  }

  // Cleanup method
  destroy() {
    this.stopHealthMonitoring();
    this.clearCache();
    this.connectionListeners.clear();
  }
}

// Create singleton instance
const apiClient = new UnifiedApiClient();

export const api = {
  // Enhanced connection and status management
  onConnectionChange: (callback) => apiClient.onConnectionChange(callback),
  isOnline: () => apiClient.isOnline,
  isHealthy: () => apiClient.isHealthy,
  checkHealth: () => apiClient.checkHealth(),
  getConnectionStatus: () => apiClient.getConnectionStatus(),
  clearCache: () => apiClient.clearCache(),
  clearOfflineData: () => apiClient.clearOfflineData(),
  hasOfflineData: () => apiClient.hasOfflineData(),

  // Expose fetchJson for direct API calls
  fetchJson: (url, options = {}, useCache = true) => apiClient.fetchJson(url, options, useCache),

  // Core API methods

  async submitPaternityTest(data) {
    return apiClient.fetchJson('/samples', {
      method: "POST",
      body: JSON.stringify(data),
    }, false);
  },
  
  async createSample(data) {
    return apiClient.fetchJson('/samples', {
      method: "POST",
      body: JSON.stringify(data),
    }, false);
  },

  // Enhanced samples API with pagination support
  async getSamples(params = {}) {
    // Support both legacy and new pagination format
    if (params.page || params.limit || params.status || params.search || params._t) {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.period) queryParams.append('period', params.period);
      if (params._t) queryParams.append('_t', params._t.toString()); // Add timestamp to bypass cache
      
      const url = `/samples${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      // Don't use cache when timestamp is provided
      return apiClient.fetchJson(url, {}, !params._t);
    } else {
      // Legacy format
      const queryParams = new URLSearchParams();
      if (params.period) queryParams.append('period', params.period);
      if (params.status) queryParams.append('status', params.status);
      
      const url = `/samples${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return apiClient.fetchJson(url);
    }
  },

  async getAllSamples() {
    return apiClient.fetchJson('/samples/all');
  },

  async searchSamples(query) {
    if (!query || !query.trim()) {
      return { success: true, data: [] };
    }
    return apiClient.fetchJson(`/samples/search?q=${encodeURIComponent(query)}`);
  },

  async getSampleCounts() {
    return apiClient.fetchJson('/samples/counts');
  },

  async getStatistics(period = 'daily') {
    return apiClient.fetchJson(`/statistics?period=${period}`);
  },

  async getLastLabNumber() {
    return apiClient.fetchJson('/get-last-lab-number');
  },

  // Batch API methods
  async getBatches() {
    return apiClient.fetchJson('/batches');
  },

  async getBatch(batchNumber) {
    return apiClient.fetchJson(`/batches/${batchNumber}`);
  },

  async getBatchById(batchId) {
    return apiClient.fetchJson(`/batches/${batchId}`);
  },

  // Equipment and Quality Control
  async getEquipment() {
    return apiClient.fetchJson('/equipment');
  },

  async getQualityControl(batchId = null) {
    const url = batchId 
      ? `/quality-control?batch_id=${batchId}`
      : '/quality-control';
    return apiClient.fetchJson(url);
  },

  // Reports operations (enhanced)
  async getReports(params = {}) {
    const searchParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/reports?${searchParams}`);
  },

  async getReportStats() {
    return apiClient.fetchJson('/reports/stats');
  },

  async getReport(id) {
    return apiClient.fetchJson(`/reports/${id}`);
  },

  async downloadReport(id) {
    window.open(`${BASE_URL}/reports/${id}/download`, '_blank');
  },

  async viewReport(id) {
    window.open(`${BASE_URL}/reports/${id}/view`, '_blank');
  },

  async createReport(reportData) {
    return apiClient.fetchJson('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    }, false);
  },

  async updateReportStatus(id, status, notes = null) {
    return apiClient.fetchJson(`/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    }, false);
  },

  // Database operations
  async getDbReports() {
    return apiClient.fetchJson('/db/reports');
  },

  async refreshDatabase() {
    const result = await apiClient.fetchJson('/refresh-database', {
      method: 'POST'
    }, false);
    
    // Clear cache after database refresh
    apiClient.clearCache();
    return result;
  },

  // Sample queue management (optimized methods)
  async getSampleQueueCounts() {
    return apiClient.fetchJson('/samples/queue-counts');
  },

  async getSamplesForQueue(queueType) {
    return apiClient.fetchJson(`/samples/queue/${queueType}`);
  },

  async updateSampleWorkflowStatus(sampleIds, workflowStatus) {
    if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
      throw new ValidationError('Sample IDs must be a non-empty array');
    }
    
    if (!workflowStatus || typeof workflowStatus !== 'string') {
      throw new ValidationError('Workflow status is required and must be a string');
    }
    
    return apiClient.fetchJson('/samples/workflow-status', {
      method: 'PUT',
      body: JSON.stringify({ sampleIds, workflowStatus })
    }, false);
  },

  // Bulk operations with progress tracking
  async bulkUpdateSamples(updates, onProgress) {
    const batchSize = 50; // Process in batches to avoid overwhelming the server
    const results = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        const result = await apiClient.fetchJson('/samples/bulk-update', {
          method: 'PUT',
          body: JSON.stringify({ updates: batch })
        }, false);
        
        results.push(...(result.data || []));
        
        if (onProgress) {
          onProgress({
            completed: i + batch.length,
            total: updates.length,
            percentage: Math.round(((i + batch.length) / updates.length) * 100)
          });
        }
      } catch (error) {
        console.error(`Batch update failed for batch starting at index ${i}:`, error);
        throw error;
      }
    }
    
    return { success: true, data: results };
  },

  // Extraction API methods
  async createExtractionBatch(batchData) {
    return extractionApi.createBatch(batchData);
  },

  async addQuantificationResult(resultData) {
    return extractionApi.addQuantificationResult(resultData);
  },

  async completeExtractionBatch(params) {
    return extractionApi.completeBatch(params.batchId, params.qualityControlPassed, params.notes);
  }
};

// DNA Extraction API Methods
export const extractionApi = {
  // Get all extraction batches
  async getBatches() {
    return apiClient.fetchJson('/extraction/batches');
  },

  // Get specific extraction batch
  async getBatch(batchId) {
    return apiClient.fetchJson(`/extraction/batches/${batchId}`);
  },

  // Create new extraction batch
  async createBatch(batchData) {
    return apiClient.fetchJson('/extraction/create-batch', {
      method: 'POST',
      body: JSON.stringify(batchData)
    }, false);
  },

  // Add quantification results
  async addQuantificationResult(resultData) {
    return apiClient.fetchJson('/extraction/quantification', {
      method: 'POST',
      body: JSON.stringify(resultData)
    }, false);
  },

  // Complete extraction batch
  async completeBatch(batchId, qualityControlPassed, notes = '') {
    return apiClient.fetchJson('/extraction/complete-batch', {
      method: 'PUT',
      body: JSON.stringify({ batchId, qualityControlPassed, notes })
    }, false);
  },

  // Get extraction results for a batch
  async getBatchResults(batchId) {
    return apiClient.fetchJson(`/extraction/${batchId}/results`);
  },

  // Get samples ready for extraction
  async getSamplesReadyForExtraction() {
    return apiClient.fetchJson('/extraction/samples-ready');
  }
};

export const batchApi = {
  async generateBatch(batchData) {
    try {
      return await apiClient.fetchJson('/generate-batch', {
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
      return await apiClient.fetchJson('/save-batch', {
        method: "POST",
        body: JSON.stringify(batchData),
      }, false);
    } catch (error) {
      console.error("Save batch error:", error);
      return { success: false, error: error.message };
    }
  },

  async getWellAssignments(batchId) {
    return apiClient.fetchJson(`/well-assignments/${batchId}`);
  }
};

// QMS API Methods
export const qmsApi = {
  // CAPA Management
  async getCapaActions(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/qms/capa?${queryParams}`);
  },

  async getCapaAction(id) {
    return apiClient.fetchJson(`/qms/capa/${id}`);
  },

  async createCapaAction(capaData) {
    return apiClient.fetchJson('/qms/capa', {
      method: 'POST',
      body: JSON.stringify(capaData)
    }, false);
  },

  // Equipment Management
  async getEquipment(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/qms/equipment?${queryParams}`);
  },

  async getCalibrationSchedule(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/qms/equipment/calibration-schedule?${queryParams}`);
  },

  // Document Control
  async getDocuments(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/qms/documents?${queryParams}`);
  },

  async getDocumentCategories() {
    return apiClient.fetchJson('/qms/documents/categories');
  },

  // Training Management
  async getTrainingPrograms() {
    return apiClient.fetchJson('/qms/training/programs');
  },

  async getTrainingRecords(employeeId) {
    return apiClient.fetchJson(`/qms/training/records/${employeeId}`);
  }
};

// Inventory API Methods
export const inventoryApi = {
  // Items
  async getItems(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/inventory/items?${queryParams}`);
  },

  async getItem(id) {
    return apiClient.fetchJson(`/inventory/items/${id}`);
  },

  // Reports
  async getLowStockReport() {
    return apiClient.fetchJson('/inventory/reports/low-stock');
  },

  async getExpiryReport(daysAhead = 30) {
    return apiClient.fetchJson(`/inventory/reports/expiry?days_ahead=${daysAhead}`);
  },

  // Categories and Suppliers
  async getCategories() {
    return apiClient.fetchJson('/inventory/categories');
  },

  async getSuppliers(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/inventory/suppliers?${queryParams}`);
  }
};

// AI/ML API Methods
export const aiMlApi = {
  // Predictive Maintenance
  async getSensors(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/ai-ml/predictive-maintenance/sensors?${queryParams}`);
  },

  async getMaintenancePredictions(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/ai-ml/predictive-maintenance/predictions?${queryParams}`);
  },

  // Anomaly Detection
  async getQcAnomalies(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/ai-ml/anomaly-detection/qc-anomalies?${queryParams}`);
  },

  // Workflow Optimization
  async getOptimizationSuggestions(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/ai-ml/workflow-optimization/suggestions?${queryParams}`);
  },

  // Demand Forecasting
  async getDemandForecasts(params = {}) {
    const queryParams = new URLSearchParams(params);
    return apiClient.fetchJson(`/ai-ml/demand-forecasting/forecasts?${queryParams}`);
  },

  // Analytics Dashboard
  async getDashboardStats() {
    return apiClient.fetchJson('/ai-ml/analytics/dashboard');
  }
};

// Export the client instance for direct access if needed
export { apiClient };

// Export as default
export default api;