import { errorHandler, ApiError, NetworkError } from '../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

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
      const controller = new AbortController();
      let timeoutId;
      
      try {
        // Configurable timeout based on request type
        const timeout = options.timeout || (options.method === 'POST' ? 60000 : 30000);
        timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log(`🌐 Fetching (attempt ${attempt + 1}):`, fullUrl);

        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
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
          let errorData;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            try {
              errorData = await response.json();
            } catch {
              errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
          } else {
            const text = await response.text();
            errorData = { message: text || `HTTP ${response.status}: ${response.statusText}` };
          }
          
          throw new ApiError(
            errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            { status: response.status, data: errorData },
            null
          );
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle different types of errors
        if (error.name === 'AbortError') {
          console.warn(`⏱️ Request timeout on attempt ${attempt + 1}:`, url);
        } else if (error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
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
          } else if (error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            throw new NetworkError('Unable to connect to server');
          } else {
            throw new ApiError(error.message || 'API request failed', null, error);
          }
        }

        // Wait before retrying with exponential backoff and jitter
        const baseDelay = this.retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
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
      const response = await this.fetchJson('/test', {}, false);
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
  
  // Expose fetchJson for direct API calls
  fetchJson: (url, options = {}, useCache = true) => apiClient.fetchJson(url, options, useCache),

  // Core API methods

  async submitPaternityTest(data) {
    return apiClient.fetchJson('/submit-test', {
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
      
      const url = `/samples${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return apiClient.fetchJson(url);
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