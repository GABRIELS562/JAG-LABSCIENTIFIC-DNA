const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Optimized API client focused on performance
class OptimizedApiClient {
  constructor(baseURL = BASE_URL) {
    this.baseURL = baseURL;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
    console.log('🔧 OptimizedApiClient initialized with baseURL:', this.baseURL);
  }

  // Simple fetch with caching
  async fetchWithCache(url, options = {}, cacheKey = null) {
    const key = cacheKey || url;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('🔄 Using cached data for:', url);
      return cached.data;
    }

    try {
      const fullUrl = `${this.baseURL}${url}`;
      console.log('🌐 Fetching:', fullUrl);
      
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        }
      });

      console.log('📡 Response status:', response.status, 'for', url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Success for:', url, 'Data:', data.success ? 'OK' : 'FAIL');
      
      // Cache successful responses
      if (data.success) {
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (error) {
      console.error('❌ API Error for:', url, 'Error:', error.message);
      console.error('🔍 Full error:', error);
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get samples with pagination
  async getSamples(page = 1, limit = 50, filters = {}) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    return this.fetchWithCache(`/api/samples?${params.toString()}`);
  }

  // Get all samples (for legacy compatibility)
  async getAllSamples() {
    return this.fetchWithCache('/api/samples/all');
  }

  // Get sample counts
  async getSampleCounts() {
    return this.fetchWithCache('/api/samples/counts', {}, 'counts');
  }

  // Search samples
  async searchSamples(query) {
    if (!query.trim()) {
      return { success: true, data: [] };
    }
    return this.fetchWithCache(`/api/samples/search?q=${encodeURIComponent(query)}`);
  }

  // Health check
  async checkHealth() {
    try {
      const response = await this.fetchWithCache('/api/test');
      return response.success === true;
    } catch (error) {
      return false;
    }
  }

  // Refresh database
  async refreshDatabase() {
    try {
      const response = await fetch(`${this.baseURL}/api/refresh-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.clearCache(); // Clear cache after refresh
      return data;
    } catch (error) {
      console.error('Refresh Database Error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const optimizedApi = new OptimizedApiClient();

export { optimizedApi };
export default optimizedApi;