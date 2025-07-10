const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Enhanced API client with connection handling and retry logic
class ApiClient {
  constructor(baseURL = BASE_URL) {
    this.baseURL = baseURL;
    this.retryCount = 3;
    this.retryDelay = 1000;
    this.connectionListeners = new Set();
    this.isOnline = true;
  }

  // Add connection status listener
  onConnectionChange(callback) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  // Notify connection listeners
  notifyConnectionChange(isOnline) {
    this.isOnline = isOnline;
    this.connectionListeners.forEach(callback => callback(isOnline));
  }

  // Enhanced fetch with retry logic and connection handling
  async enhancedFetch(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          }
        });

        clearTimeout(timeoutId);

        // If we get here, connection is working
        if (!this.isOnline) {
          this.notifyConnectionChange(true);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        // Handle different types of errors
        if (error.name === 'AbortError') {
          console.warn(`Request timeout on attempt ${attempt + 1}:`, url);
        } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
          console.warn(`Network error on attempt ${attempt + 1}:`, error.message);
          this.notifyConnectionChange(false);
        } else {
          console.warn(`API error on attempt ${attempt + 1}:`, error.message);
        }

        // If this was the last attempt, throw the error
        if (attempt === this.retryCount) {
          this.notifyConnectionChange(false);
          throw error;
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  // Helper method for JSON responses
  async fetchJson(url, options = {}) {
    const response = await this.enhancedFetch(url, options);
    return response.json();
  }

  // Health check method
  async checkHealth() {
    try {
      const response = await this.enhancedFetch('/api/test');
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export const api = {
  // Expose connection handling
  onConnectionChange: (callback) => apiClient.onConnectionChange(callback),
  isOnline: () => apiClient.isOnline,
  checkHealth: () => apiClient.checkHealth(),

  async getReports() {
    return apiClient.fetchJson('/api/reports');
  },

  async submitPaternityTest(data) {
    return apiClient.fetchJson('/api/submit-test', {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getSamples(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    if (params.status) queryParams.append('status', params.status);
    
    const url = `/api/samples${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiClient.fetchJson(url);
  },

  async searchSamples(query) {
    return apiClient.fetchJson(`/api/samples/search?q=${encodeURIComponent(query)}`);
  },

  async getStatistics(period = 'daily') {
    return apiClient.fetchJson(`/api/statistics?period=${period}`);
  },

  async getLastLabNumber() {
    return apiClient.fetchJson('/api/get-last-lab-number');
  },

  async getBatches() {
    return apiClient.fetchJson('/api/batches');
  },

  async getBatch(batchNumber) {
    return apiClient.fetchJson(`/api/batches/${batchNumber}`);
  },

  async getEquipment() {
    return apiClient.fetchJson('/api/equipment');
  },

  async getQualityControl(batchId = null) {
    const url = batchId 
      ? `/api/quality-control?batch_id=${batchId}`
      : '/api/quality-control';
    return apiClient.fetchJson(url);
  },

  async getDbReports() {
    return apiClient.fetchJson('/api/db/reports');
  },

  async refreshDatabase() {
    return apiClient.fetchJson('/api/refresh-database', {
      method: 'POST'
    });
  },

  // New optimized sample methods with caching
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
    });
  }
};

export const batchApi = {
  async generateBatch(batchData) {
    try {
      return await apiClient.fetchJson('/api/generate-batch', {
        method: "POST",
        body: JSON.stringify(batchData),
      });
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
      });
    } catch (error) {
      console.error("Save batch error:", error);
      return { success: false, error: error.message };
    }
  },
};

// Export the client instance for direct access if needed
export { apiClient };
