/**
 * Load Generator Stub
 * Minimal implementation for server startup
 */

class LoadGenerator {
  constructor() {
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    return { success: true, message: 'Load generator started' };
  }

  stop() {
    this.isRunning = false;
    return { success: true, message: 'Load generator stopped' };
  }

  getStatus() {
    return {
      running: this.isRunning,
      requestsPerSecond: 0,
      totalRequests: 0
    };
  }
}

module.exports = LoadGenerator;
