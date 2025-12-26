/**
 * Structured Logger Utility
 * Replaces console.log with proper logging
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.logDir = path.join(__dirname, '../logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    });
  }

  writeToFile(level, message, meta) {
    const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = this.formatMessage(level, message, meta) + '\n';
    
    fs.appendFile(logFile, logEntry, (err) => {
      if (err && this.isDevelopment) {
        console.error('Failed to write log:', err);
      }
    });
  }

  info(message, meta = {}) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, meta);
    }
    this.writeToFile('info', message, meta);
  }

  error(message, meta = {}) {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, meta);
    }
    this.writeToFile('error', message, meta);
  }

  warn(message, meta = {}) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, meta);
    }
    this.writeToFile('warn', message, meta);
  }

  debug(message, meta = {}) {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, meta);
    }
    this.writeToFile('debug', message, meta);
  }

  // Silent logger for production
  silent() {
    // No-op for production logs we want to suppress
  }
}

// Export singleton instance - both as default and named export for compatibility
const loggerInstance = new Logger();
module.exports = loggerInstance;
module.exports.logger = loggerInstance;