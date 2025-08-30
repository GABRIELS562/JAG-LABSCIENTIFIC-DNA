// Mock Load Generator for development
class LoadGenerator {
  constructor(config = {}) {
    this.config = config;
    this.isRunning = false;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0
    };
  }

  async start() {
    this.isRunning = true;
    console.log('Mock Load Generator started with config:', this.config);
    return { success: true, message: 'Load test started (mock mode)' };
  }

  async stop() {
    this.isRunning = false;
    console.log('Mock Load Generator stopped');
    return { success: true, message: 'Load test stopped (mock mode)' };
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      ...this.stats,
      config: this.config
    };
  }
}

module.exports = LoadGenerator;