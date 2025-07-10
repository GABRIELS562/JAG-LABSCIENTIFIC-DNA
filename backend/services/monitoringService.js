const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Advanced Monitoring and Alerting Service
 * Provides comprehensive system and application monitoring
 */
class MonitoringService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      intervals: {
        metrics: options.metricsInterval || 30000,    // 30 seconds
        health: options.healthInterval || 60000,      // 1 minute
        alerts: options.alertsInterval || 10000,      // 10 seconds
        cleanup: options.cleanupInterval || 300000    // 5 minutes
      },
      retention: {
        metrics: options.metricsRetention || 24 * 60 * 60 * 1000,  // 24 hours
        alerts: options.alertsRetention || 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      thresholds: {
        cpu: options.cpuThreshold || 80,
        memory: options.memoryThreshold || 85,
        disk: options.diskThreshold || 90,
        responseTime: options.responseTimeThreshold || 2000,
        errorRate: options.errorRateThreshold || 5,
        queueSize: options.queueSizeThreshold || 1000
      },
      alerting: {
        enabled: options.alertingEnabled !== false,
        channels: options.alertChannels || ['console'],
        cooldown: options.alertCooldown || 300000, // 5 minutes
        escalation: options.escalationEnabled || false
      },
      storage: {
        path: options.storagePath || path.join(__dirname, '../temp/monitoring'),
        compress: options.compressLogs !== false
      }
    };

    // Monitoring state
    this.metrics = {
      system: {
        cpu: [],
        memory: [],
        disk: [],
        network: [],
        eventLoop: []
      },
      application: {
        requests: [],
        responses: [],
        errors: [],
        performance: [],
        database: [],
        cache: [],
        queues: []
      },
      custom: new Map()
    };

    this.alerts = {
      active: new Map(),
      history: [],
      cooldowns: new Map(),
      escalations: new Map()
    };

    this.collectors = new Map();
    this.alertHandlers = new Map();
    this.intervals = new Map();
    this.isRunning = false;
    this.startTime = Date.now();

    this.setupDefaultCollectors();
    this.setupDefaultAlertHandlers();
    this.ensureStorageDirectory();
  }

  setupDefaultCollectors() {
    // System metrics collectors
    this.addCollector('system:cpu', () => this.collectCPUMetrics());
    this.addCollector('system:memory', () => this.collectMemoryMetrics());
    this.addCollector('system:disk', () => this.collectDiskMetrics());
    this.addCollector('system:network', () => this.collectNetworkMetrics());
    this.addCollector('system:eventLoop', () => this.collectEventLoopMetrics());

    // Application metrics collectors
    this.addCollector('app:performance', () => this.collectPerformanceMetrics());
    this.addCollector('app:health', () => this.collectHealthMetrics());
  }

  setupDefaultAlertHandlers() {
    // Console alert handler
    this.addAlertHandler('console', (alert) => {
      const level = alert.severity === 'critical' ? 'error' : 
                   alert.severity === 'warning' ? 'warn' : 'info';
      
      logger[level]('ALERT', {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold
      });
    });

    // File alert handler
    this.addAlertHandler('file', (alert) => {
      this.writeAlertToFile(alert);
    });

    // Webhook alert handler
    this.addAlertHandler('webhook', (alert) => {
      this.sendWebhookAlert(alert);
    });
  }

  ensureStorageDirectory() {
    const dir = this.config.storage.path;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  addCollector(name, collectorFunction) {
    this.collectors.set(name, {
      name,
      function: collectorFunction,
      lastRun: 0,
      errors: 0,
      enabled: true
    });
  }

  addAlertHandler(name, handlerFunction) {
    this.alertHandlers.set(name, {
      name,
      function: handlerFunction,
      enabled: true,
      errors: 0
    });
  }

  // System Metrics Collection
  async collectCPUMetrics() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const cpuUsage = 100 - (totalIdle / totalTick * 100);

    const metric = {
      timestamp: Date.now(),
      usage: parseFloat(cpuUsage.toFixed(2)),
      loadAverage: {
        '1m': loadAvg[0],
        '5m': loadAvg[1],
        '15m': loadAvg[2]
      },
      cores: cpus.length
    };

    this.addMetric('system', 'cpu', metric);

    // Check threshold
    if (metric.usage > this.config.thresholds.cpu) {
      this.triggerAlert('system:cpu', 'warning', 
        `High CPU usage: ${metric.usage}%`, metric.usage, this.config.thresholds.cpu);
    }

    return metric;
  }

  async collectMemoryMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;
    
    const processMemory = process.memoryUsage();

    const metric = {
      timestamp: Date.now(),
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: parseFloat(usagePercent.toFixed(2)),
      process: {
        rss: processMemory.rss,
        heapTotal: processMemory.heapTotal,
        heapUsed: processMemory.heapUsed,
        external: processMemory.external,
        arrayBuffers: processMemory.arrayBuffers || 0
      }
    };

    this.addMetric('system', 'memory', metric);

    // Check threshold
    if (metric.usagePercent > this.config.thresholds.memory) {
      this.triggerAlert('system:memory', 'warning',
        `High memory usage: ${metric.usagePercent.toFixed(1)}%`, 
        metric.usagePercent, this.config.thresholds.memory);
    }

    return metric;
  }

  async collectDiskMetrics() {
    try {
      const stats = fs.statSync('.');
      // Note: Getting actual disk usage requires platform-specific commands
      // This is a simplified implementation
      
      const metric = {
        timestamp: Date.now(),
        // Placeholder - would need platform-specific implementation
        usage: 0,
        available: 0,
        total: 0,
        usagePercent: 0
      };

      this.addMetric('system', 'disk', metric);
      return metric;

    } catch (error) {
      logger.warn('Failed to collect disk metrics', error);
      return null;
    }
  }

  async collectNetworkMetrics() {
    const interfaces = os.networkInterfaces();
    const metric = {
      timestamp: Date.now(),
      interfaces: Object.keys(interfaces).length,
      // Network I/O would require platform-specific implementation
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0
    };

    this.addMetric('system', 'network', metric);
    return metric;
  }

  async collectEventLoopMetrics() {
    const start = process.hrtime.bigint();
    
    await new Promise(resolve => setImmediate(resolve));
    
    const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds

    const metric = {
      timestamp: Date.now(),
      lag: parseFloat(lag.toFixed(2)),
      utilization: Math.min(lag / 10, 100) // Rough utilization estimate
    };

    this.addMetric('system', 'eventLoop', metric);

    // Check if event loop is blocked
    if (lag > 100) { // More than 100ms lag
      this.triggerAlert('system:eventLoop', 'warning',
        `Event loop lag detected: ${lag.toFixed(2)}ms`, lag, 100);
    }

    return metric;
  }

  async collectPerformanceMetrics() {
    const metric = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      startTime: this.startTime,
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    };

    this.addMetric('application', 'performance', metric);
    return metric;
  }

  async collectHealthMetrics() {
    const health = {
      timestamp: Date.now(),
      status: 'healthy',
      checks: {},
      uptime: process.uptime()
    };

    // Add health checks results here
    this.addMetric('application', 'health', health);
    return health;
  }

  addMetric(category, type, data) {
    if (!this.metrics[category]) {
      this.metrics[category] = {};
    }
    
    if (!this.metrics[category][type]) {
      this.metrics[category][type] = [];
    }

    this.metrics[category][type].push(data);

    // Emit metric event
    this.emit('metric:collected', { category, type, data });

    // Clean old metrics
    this.cleanOldMetrics(category, type);
  }

  addCustomMetric(name, value, tags = {}) {
    const metric = {
      timestamp: Date.now(),
      value,
      tags
    };

    if (!this.metrics.custom.has(name)) {
      this.metrics.custom.set(name, []);
    }

    this.metrics.custom.get(name).push(metric);
    this.emit('metric:custom', { name, metric });

    // Clean old custom metrics
    const metrics = this.metrics.custom.get(name);
    const cutoff = Date.now() - this.config.retention.metrics;
    
    while (metrics.length > 0 && metrics[0].timestamp < cutoff) {
      metrics.shift();
    }
  }

  cleanOldMetrics(category, type) {
    const metrics = this.metrics[category][type];
    const cutoff = Date.now() - this.config.retention.metrics;
    
    while (metrics.length > 0 && metrics[0].timestamp < cutoff) {
      metrics.shift();
    }
  }

  triggerAlert(type, severity, message, value = null, threshold = null) {
    const alertId = `${type}:${Date.now()}`;
    
    // Check cooldown
    const cooldownKey = `${type}:${severity}`;
    if (this.alerts.cooldowns.has(cooldownKey)) {
      const lastAlert = this.alerts.cooldowns.get(cooldownKey);
      if (Date.now() - lastAlert < this.config.alerting.cooldown) {
        return; // Skip alert due to cooldown
      }
    }

    const alert = {
      id: alertId,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    };

    // Store alert
    this.alerts.active.set(alertId, alert);
    this.alerts.history.push(alert);
    this.alerts.cooldowns.set(cooldownKey, Date.now());

    // Send alert through configured channels
    if (this.config.alerting.enabled) {
      for (const channel of this.config.alerting.channels) {
        const handler = this.alertHandlers.get(channel);
        if (handler && handler.enabled) {
          try {
            handler.function(alert);
          } catch (error) {
            handler.errors++;
            logger.error('Alert handler failed', {
              channel,
              alertId,
              error: error.message
            });
          }
        }
      }
    }

    this.emit('alert:triggered', alert);

    // Handle escalation
    if (this.config.alerting.escalation && severity === 'critical') {
      this.handleEscalation(alert);
    }

    return alert;
  }

  acknowledgeAlert(alertId, acknowledgedBy = 'system') {
    const alert = this.alerts.active.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      
      this.emit('alert:acknowledged', alert);
      return true;
    }
    return false;
  }

  resolveAlert(alertId, resolvedBy = 'system', reason = 'Auto-resolved') {
    const alert = this.alerts.active.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = Date.now();
      alert.resolveReason = reason;
      
      this.alerts.active.delete(alertId);
      this.emit('alert:resolved', alert);
      return true;
    }
    return false;
  }

  handleEscalation(alert) {
    // Implement escalation logic here
    logger.error('Critical alert escalation', {
      alertId: alert.id,
      type: alert.type,
      message: alert.message
    });
  }

  writeAlertToFile(alert) {
    try {
      const alertsFile = path.join(this.config.storage.path, 'alerts.log');
      const logEntry = JSON.stringify(alert) + '\n';
      
      fs.appendFileSync(alertsFile, logEntry);
    } catch (error) {
      logger.error('Failed to write alert to file', error);
    }
  }

  async sendWebhookAlert(alert) {
    // Implement webhook sending logic here
    // This would typically use fetch or axios to send HTTP requests
    logger.info('Webhook alert sent', { alertId: alert.id });
  }

  getMetrics(category = null, type = null, since = null) {
    if (category && type) {
      let metrics = this.metrics[category]?.[type] || [];
      
      if (since) {
        metrics = metrics.filter(m => m.timestamp >= since);
      }
      
      return metrics;
    }
    
    if (category) {
      const categoryMetrics = this.metrics[category] || {};
      
      if (since) {
        const filtered = {};
        for (const [key, metrics] of Object.entries(categoryMetrics)) {
          filtered[key] = metrics.filter(m => m.timestamp >= since);
        }
        return filtered;
      }
      
      return categoryMetrics;
    }

    // Return all metrics
    const allMetrics = { ...this.metrics };
    
    // Convert custom metrics Map to object
    allMetrics.custom = Object.fromEntries(this.metrics.custom);
    
    if (since) {
      // Filter all metrics by timestamp
      const filtered = {};
      for (const [category, types] of Object.entries(allMetrics)) {
        filtered[category] = {};
        for (const [type, metrics] of Object.entries(types)) {
          if (Array.isArray(metrics)) {
            filtered[category][type] = metrics.filter(m => m.timestamp >= since);
          } else {
            filtered[category][type] = metrics;
          }
        }
      }
      return filtered;
    }
    
    return allMetrics;
  }

  getAlerts(active = null) {
    if (active === true) {
      return Array.from(this.alerts.active.values());
    }
    
    if (active === false) {
      return this.alerts.history.filter(alert => alert.resolved);
    }
    
    return {
      active: Array.from(this.alerts.active.values()),
      history: this.alerts.history,
      summary: {
        totalActive: this.alerts.active.size,
        totalHistory: this.alerts.history.length,
        critical: this.alerts.history.filter(a => a.severity === 'critical').length,
        warning: this.alerts.history.filter(a => a.severity === 'warning').length,
        info: this.alerts.history.filter(a => a.severity === 'info').length
      }
    };
  }

  getSystemStatus() {
    const latestMetrics = {};
    
    // Get latest metrics for each category/type
    for (const [category, types] of Object.entries(this.metrics)) {
      if (category === 'custom') continue;
      
      latestMetrics[category] = {};
      for (const [type, metrics] of Object.entries(types)) {
        if (metrics.length > 0) {
          latestMetrics[category][type] = metrics[metrics.length - 1];
        }
      }
    }

    return {
      status: this.alerts.active.size === 0 ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      uptime: process.uptime(),
      activeAlerts: this.alerts.active.size,
      metrics: latestMetrics,
      collectors: {
        total: this.collectors.size,
        enabled: Array.from(this.collectors.values()).filter(c => c.enabled).length,
        errors: Array.from(this.collectors.values()).reduce((sum, c) => sum + c.errors, 0)
      }
    };
  }

  async runCollectors() {
    const promises = [];
    
    for (const [name, collector] of this.collectors) {
      if (!collector.enabled) continue;
      
      promises.push(
        this.runCollector(name, collector).catch(error => {
          collector.errors++;
          logger.error('Collector failed', { name, error: error.message });
        })
      );
    }

    await Promise.allSettled(promises);
  }

  async runCollector(name, collector) {
    const startTime = Date.now();
    
    try {
      await collector.function();
      collector.lastRun = Date.now();
      
      const duration = Date.now() - startTime;
      this.addCustomMetric(`collector:${name}:duration`, duration);
      
    } catch (error) {
      collector.errors++;
      throw error;
    }
  }

  cleanupOldData() {
    const cutoff = Date.now() - this.config.retention.alerts;
    
    // Clean old alerts
    this.alerts.history = this.alerts.history.filter(alert => 
      alert.timestamp >= cutoff
    );

    // Clean cooldowns
    for (const [key, timestamp] of this.alerts.cooldowns) {
      if (timestamp < cutoff) {
        this.alerts.cooldowns.delete(key);
      }
    }

    logger.debug('Monitoring data cleanup completed', {
      alertsRemaining: this.alerts.history.length,
      cooldownsRemaining: this.alerts.cooldowns.size
    });
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start metric collection
    this.intervals.set('metrics', setInterval(() => {
      this.runCollectors();
    }, this.config.intervals.metrics));

    // Start alert checking
    this.intervals.set('alerts', setInterval(() => {
      this.checkAlertConditions();
    }, this.config.intervals.alerts));

    // Start cleanup
    this.intervals.set('cleanup', setInterval(() => {
      this.cleanupOldData();
    }, this.config.intervals.cleanup));

    logger.info('Monitoring service started', {
      metricsInterval: this.config.intervals.metrics,
      alertsInterval: this.config.intervals.alerts,
      collectors: this.collectors.size,
      alertHandlers: this.alertHandlers.size
    });

    this.emit('monitoring:started');
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();

    logger.info('Monitoring service stopped');
    this.emit('monitoring:stopped');
  }

  checkAlertConditions() {
    // Auto-resolve alerts that are no longer valid
    for (const [alertId, alert] of this.alerts.active) {
      if (!alert.resolved && this.shouldAutoResolveAlert(alert)) {
        this.resolveAlert(alertId, 'system', 'Condition no longer met');
      }
    }
  }

  shouldAutoResolveAlert(alert) {
    // Implement logic to check if alert conditions are no longer met
    // This is a simplified implementation
    
    const now = Date.now();
    const alertAge = now - alert.timestamp;
    
    // Auto-resolve alerts older than 1 hour if no recent similar alerts
    if (alertAge > 60 * 60 * 1000) {
      return true;
    }
    
    return false;
  }
}

module.exports = MonitoringService;