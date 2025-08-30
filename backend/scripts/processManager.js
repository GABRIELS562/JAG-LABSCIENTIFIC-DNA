#!/usr/bin/env node

/**
 * Process Manager Script
 * Manages server process with memory limits and automatic restarts
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class ProcessManager {
  constructor() {
    this.serverProcess = null;
    this.isRunning = false;
    this.restartCount = 0;
    this.maxRestarts = 5;
    this.memoryThreshold = 0.8; // 80%
    this.monitoringInterval = null;
    this.processLogFile = path.join(__dirname, '../logs/process-manager.log');
    this.config = {
      maxMemory: 512, // MB
      checkInterval: 30000, // 30 seconds
      gracefulTimeout: 10000, // 10 seconds
      forceKillTimeout: 5000, // 5 seconds
      autoRestart: true,
      enableGC: true
    };
  }

  /**
   * Start the server with memory management
   */
  async start(options = {}) {
    this.config = { ...this.config, ...options };
    
    console.log('🚀 Starting JAG DNA Scientific LIMS Backend with Process Management');
    console.log(`📊 Memory limit: ${this.config.maxMemory}MB`);
    console.log(`⏱️  Monitoring interval: ${this.config.checkInterval / 1000}s`);
    
    await this.ensureLogDirectory();
    await this.startServerProcess();
    this.startMonitoring();
    
    // Handle process signals
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('uncaughtException', (error) => this.handleError('Uncaught Exception', error));
    process.on('unhandledRejection', (reason) => this.handleError('Unhandled Rejection', reason));
  }

  /**
   * Start the server process
   */
  async startServerProcess() {
    if (this.serverProcess) {
      console.log('⚠️  Server process already running');
      return;
    }

    const nodeArgs = [
      '--expose-gc',
      `--max-old-space-size=${this.config.maxMemory}`,
      '--optimize-for-size',
      path.join(__dirname, '../server.js')
    ];

    const env = {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
      ENABLE_MEMORY_MONITORING: 'true'
    };

    try {
      this.serverProcess = spawn('node', nodeArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        detached: false
      });

      this.isRunning = true;
      const startTime = new Date().toISOString();
      
      await this.log(`Server process started with PID: ${this.serverProcess.pid} at ${startTime}`);
      
      // Handle process output
      this.serverProcess.stdout.on('data', (data) => {
        console.log(data.toString().trim());
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error(data.toString().trim());
      });

      // Handle process exit
      this.serverProcess.on('exit', (code, signal) => {
        this.handleProcessExit(code, signal);
      });

      this.serverProcess.on('error', (error) => {
        this.handleError('Server Process Error', error);
      });

      console.log(`✅ Server process started with PID: ${this.serverProcess.pid}`);

    } catch (error) {
      await this.log(`Failed to start server process: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start monitoring the server process
   */
  startMonitoring() {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(async () => {
      if (this.serverProcess && this.isRunning) {
        await this.checkProcessHealth();
      }
    }, this.config.checkInterval);

    console.log('🔍 Process monitoring started');
  }

  /**
   * Check process health and memory usage
   */
  async checkProcessHealth() {
    try {
      const pid = this.serverProcess.pid;
      const memoryInfo = await this.getProcessMemoryInfo(pid);
      
      if (memoryInfo) {
        const memoryUsageMB = memoryInfo.rss / 1024 / 1024;
        const memoryPercent = (memoryUsageMB / this.config.maxMemory);

        // Log memory usage periodically
        if (Math.random() < 0.1) { // 10% chance to log
          await this.log(`Memory usage: ${memoryUsageMB.toFixed(1)}MB (${(memoryPercent * 100).toFixed(1)}%)`);
        }

        // Check if memory usage is too high
        if (memoryPercent > this.memoryThreshold) {
          await this.log(`High memory usage detected: ${memoryUsageMB.toFixed(1)}MB (${(memoryPercent * 100).toFixed(1)}%)`);
          
          if (memoryPercent > 0.95) { // 95% of limit
            console.log('🚨 Critical memory usage - restarting server');
            await this.restartServer('High memory usage');
          } else {
            // Try to trigger garbage collection
            await this.triggerGarbageCollection();
          }
        }

        // Check if process is responsive (basic check)
        const isResponsive = await this.checkProcessResponsiveness(pid);
        if (!isResponsive) {
          console.log('⚠️  Server process appears unresponsive - restarting');
          await this.restartServer('Process unresponsive');
        }
      }

    } catch (error) {
      console.error('❌ Error checking process health:', error.message);
    }
  }

  /**
   * Get process memory information
   */
  async getProcessMemoryInfo(pid) {
    return new Promise((resolve) => {
      exec(`ps -p ${pid} -o pid,rss,vsz,%mem --no-headers`, (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }

        const parts = stdout.trim().split(/\s+/);
        if (parts.length >= 4) {
          resolve({
            pid: parseInt(parts[0]),
            rss: parseInt(parts[1]) * 1024, // Convert KB to bytes
            vsz: parseInt(parts[2]) * 1024,
            memPercent: parseFloat(parts[3])
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Check if process is responsive
   */
  async checkProcessResponsiveness(pid) {
    return new Promise((resolve) => {
      // Simple check - see if process exists and is in running state
      exec(`ps -p ${pid} -o state --no-headers`, (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }

        const state = stdout.trim();
        // R = Running, S = Sleeping (interruptible), D = Waiting (uninterruptible)
        resolve(['R', 'S'].includes(state));
      });
    });
  }

  /**
   * Trigger garbage collection in the server process
   */
  async triggerGarbageCollection() {
    try {
      // Send signal to trigger GC (if server is listening for it)
      if (this.serverProcess && this.config.enableGC) {
        console.log('🗑️  Triggering garbage collection');
        // Could implement custom signal handling in server.js
        // For now, just log the attempt
        await this.log('Garbage collection triggered');
      }
    } catch (error) {
      console.error('Failed to trigger garbage collection:', error.message);
    }
  }

  /**
   * Restart the server process
   */
  async restartServer(reason) {
    if (this.restartCount >= this.maxRestarts) {
      console.error(`❌ Maximum restart attempts (${this.maxRestarts}) reached. Stopping.`);
      await this.log(`Maximum restart attempts reached. Reason: ${reason}`);
      process.exit(1);
    }

    this.restartCount++;
    console.log(`🔄 Restarting server (attempt ${this.restartCount}/${this.maxRestarts}): ${reason}`);
    await this.log(`Restart ${this.restartCount}: ${reason}`);

    await this.stopServerProcess();
    
    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.startServerProcess();
  }

  /**
   * Stop the server process gracefully
   */
  async stopServerProcess() {
    if (!this.serverProcess) return;

    console.log('🛑 Stopping server process...');
    
    return new Promise((resolve) => {
      let forcedKill = false;
      
      // Set up force kill timeout
      const forceKillTimeout = setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          console.log('⚡ Force killing server process');
          this.serverProcess.kill('SIGKILL');
          forcedKill = true;
        }
      }, this.config.forceKillTimeout);

      // Listen for process exit
      const onExit = () => {
        clearTimeout(forceKillTimeout);
        this.serverProcess = null;
        this.isRunning = false;
        console.log(forcedKill ? '💀 Server process force killed' : '✅ Server process stopped gracefully');
        resolve();
      };

      if (this.serverProcess.killed) {
        onExit();
        return;
      }

      this.serverProcess.once('exit', onExit);

      // Send graceful shutdown signal
      try {
        this.serverProcess.kill('SIGTERM');
        
        // Set up graceful timeout
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            console.log('⏰ Graceful shutdown timeout, sending SIGINT');
            this.serverProcess.kill('SIGINT');
          }
        }, this.config.gracefulTimeout);
        
      } catch (error) {
        console.error('Error sending shutdown signal:', error.message);
        onExit();
      }
    });
  }

  /**
   * Handle process exit
   */
  async handleProcessExit(code, signal) {
    this.isRunning = false;
    const exitReason = signal ? `Signal: ${signal}` : `Exit code: ${code}`;
    
    console.log(`🔚 Server process exited: ${exitReason}`);
    await this.log(`Process exited: ${exitReason}`);

    if (this.config.autoRestart && this.restartCount < this.maxRestarts) {
      if (code !== 0) {
        console.log('💥 Unexpected exit detected, restarting...');
        await this.restartServer(`Unexpected exit: ${exitReason}`);
      }
    } else {
      console.log('🏁 Process manager shutting down');
      this.cleanup();
    }
  }

  /**
   * Handle errors
   */
  async handleError(type, error) {
    console.error(`❌ ${type}:`, error);
    await this.log(`${type}: ${error.message}`);
    
    if (this.config.autoRestart) {
      await this.restartServer(`${type}: ${error.message}`);
    }
  }

  /**
   * Handle shutdown signals
   */
  async handleShutdown(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down process manager...`);
    await this.log(`Received ${signal}, shutting down`);
    
    this.config.autoRestart = false; // Prevent restart during shutdown
    await this.stopServerProcess();
    this.cleanup();
    process.exit(0);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(path.dirname(this.processLogFile), { recursive: true });
    } catch (error) {
      console.warn('Could not create log directory:', error.message);
    }
  }

  /**
   * Log message with timestamp
   */
  async log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`;
    
    try {
      await fs.appendFile(this.processLogFile, logEntry);
    } catch (error) {
      console.warn('Could not write to log file:', error.message);
    }
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pid: this.serverProcess ? this.serverProcess.pid : null,
      restartCount: this.restartCount,
      maxRestarts: this.maxRestarts,
      config: this.config,
      uptime: this.isRunning ? process.uptime() : 0
    };
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const manager = new ProcessManager();
  
  switch (command) {
    case 'start':
      const memoryLimit = parseInt(args[1]) || 512;
      manager.start({ maxMemory: memoryLimit }).catch(console.error);
      break;
      
    case 'start-low-memory':
      manager.start({ maxMemory: 256, checkInterval: 20000 }).catch(console.error);
      break;
      
    case 'start-production':
      manager.start({ 
        maxMemory: 1024, 
        checkInterval: 60000,
        maxRestarts: 10 
      }).catch(console.error);
      break;
      
    default:
      console.log('Usage:');
      console.log('  node processManager.js start [memory-limit-mb]');
      console.log('  node processManager.js start-low-memory');
      console.log('  node processManager.js start-production');
      console.log('');
      console.log('Examples:');
      console.log('  node processManager.js start 512    # Start with 512MB limit');
      console.log('  node processManager.js start-low-memory  # Start with 256MB limit');
      console.log('  node processManager.js start-production  # Start with 1GB limit');
  }
}

module.exports = ProcessManager;