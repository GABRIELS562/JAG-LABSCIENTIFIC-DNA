const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = {
  async getReports() {
    const response = await fetch(`${BASE_URL}/api/reports`);
    return response.json();
  },

  async submitPaternityTest(data) {
    const response = await fetch(`${BASE_URL}/api/paternity-test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
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
