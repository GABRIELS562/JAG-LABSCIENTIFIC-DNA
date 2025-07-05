const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = {
  async getReports() {
    const response = await fetch(`${BASE_URL}/api/reports`);
    return response.json();
  },

  async submitPaternityTest(data) {
    const response = await fetch(`${BASE_URL}/api/submit-test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getSamples(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.period) queryParams.append('period', params.period);
    if (params.status) queryParams.append('status', params.status);
    
    const url = `${BASE_URL}/api/samples${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);
    return response.json();
  },

  async searchSamples(query) {
    const response = await fetch(`${BASE_URL}/api/samples/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  async getStatistics(period = 'daily') {
    const response = await fetch(`${BASE_URL}/api/statistics?period=${period}`);
    return response.json();
  },

  async getLastLabNumber() {
    const response = await fetch(`${BASE_URL}/api/get-last-lab-number`);
    return response.json();
  },

  async getBatches() {
    const response = await fetch(`${BASE_URL}/api/batches`);
    return response.json();
  },

  async getBatch(batchNumber) {
    const response = await fetch(`${BASE_URL}/api/batches/${batchNumber}`);
    return response.json();
  },

  async getEquipment() {
    const response = await fetch(`${BASE_URL}/api/equipment`);
    return response.json();
  },

  async getQualityControl(batchId = null) {
    const url = batchId 
      ? `${BASE_URL}/api/quality-control?batch_id=${batchId}`
      : `${BASE_URL}/api/quality-control`;
    const response = await fetch(url);
    return response.json();
  },

  async getReports() {
    const response = await fetch(`${BASE_URL}/api/db/reports`);
    return response.json();
  },

  async refreshDatabase() {
    const response = await fetch(`${BASE_URL}/api/refresh-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response.json();
  }
};

export const batchApi = {
  async generateBatch(batchData) {
    try {
      const response = await fetch(`${BASE_URL}/api/generate-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchData),
      });
      return response.json();
    } catch (error) {
      console.error("Generate batch error:", error);
      return { success: false, error: error.message };
    }
  },

  async saveBatch(batchData) {
    try {
      const response = await fetch(`${BASE_URL}/api/save-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchData),
      });
      return response.json();
    } catch (error) {
      console.error("Save batch error:", error);
      return { success: false, error: error.message };
    }
  },
};
