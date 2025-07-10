const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * Intelligent Alert Management Service
 * Monitors system health, detects anomalies, and triggers smart alerts
 */
class AlertService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // Monitoring settings
      monitoring: {
        enabled: options.monitoringEnabled !== false,
        interval: options.monitoringInterval || 30000, // 30 seconds
        healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
        metricsRetention: options.metricsRetention || 24 * 60 * 60 * 1000 // 24 hours
      },

      // Alert thresholds
      thresholds: {
        system: {
          cpuUsage: options.cpuThreshold || 80,
          memoryUsage: options.memoryThreshold || 85,
          diskUsage: options.diskThreshold || 90,
          responseTime: options.responseTimeThreshold || 5000, // 5 seconds
          errorRate: options.errorRateThreshold || 5, // 5%
          queueSize: options.queueThreshold || 1000
        },
        business: {
          processingDelay: options.processingDelayThreshold || 60 * 60 * 1000, // 1 hour
          failureRate: options.failureRateThreshold || 10, // 10%
          sampleBacklog: options.sampleBacklogThreshold || 500,
          batchTimeout: options.batchTimeoutThreshold || 24 * 60 * 60 * 1000, // 24 hours
          complianceViolations: options.complianceThreshold || 1
        },
        quality: {
          qcFailureRate: options.qcFailureRateThreshold || 15, // 15%
          repeatRate: options.repeatRateThreshold || 20, // 20%
          contaminationRate: options.contaminationThreshold || 2, // 2%
          instrumentDowntime: options.instrumentDowntimeThreshold || 30 * 60 * 1000 // 30 minutes
        }
      },

      // Alert management
      alerts: {
        suppressionWindow: options.suppressionWindow || 5 * 60 * 1000, // 5 minutes
        maxAlertsPerHour: options.maxAlertsPerHour || 50,
        priorityEscalation: options.priorityEscalation !== false,
        autoResolve: options.autoResolve !== false,
        correlationEnabled: options.correlationEnabled !== false
      },

      // Anomaly detection
      anomalyDetection: {
        enabled: options.anomalyDetectionEnabled !== false,
        sensitivity: options.anomalySensitivity || 'medium', // low, medium, high
        learningPeriod: options.learningPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
        minDataPoints: options.minDataPoints || 100
      }
    };

    // Service state
    this.activeAlerts = new Map();
    this.suppressedAlerts = new Map();
    this.alertHistory = [];
    this.systemMetrics = new Map();
    this.businessMetrics = new Map();
    this.qualityMetrics = new Map();
    this.anomalyBaselines = new Map();
    this.alertRules = new Map();
    this.healthChecks = new Map();

    // Metrics
    this.metrics = {
      alerts: {
        total: 0,
        active: 0,
        resolved: 0,
        suppressed: 0,
        escalated: 0
      },
      severity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      categories: {
        system: 0,
        business: 0,
        quality: 0,
        security: 0,
        compliance: 0
      },
      anomalies: {
        detected: 0,
        falsePositives: 0,
        accuracy: 0
      }
    };

    this.initializeService();
  }

  async initializeService() {
    try {
      // Setup default alert rules
      this.setupDefaultAlertRules();

      // Setup health checks
      this.setupHealthChecks();

      // Start monitoring
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }

      // Initialize anomaly detection
      if (this.config.anomalyDetection.enabled) {
        this.initializeAnomalyDetection();
      }

      logger.info('Alert service initialized', {
        monitoring: this.config.monitoring.enabled,
        anomalyDetection: this.config.anomalyDetection.enabled,
        alertRules: this.alertRules.size
      });

    } catch (error) {
      logger.error('Failed to initialize alert service', error);
      throw error;
    }
  }

  setupDefaultAlertRules() {
    // System alert rules
    this.registerAlertRule('high_cpu_usage', {
      category: 'system',
      severity: 'high',
      condition: (metrics) => metrics.cpu_usage > this.config.thresholds.system.cpuUsage,
      message: 'High CPU usage detected: {{value}}%',
      escalationTime: 10 * 60 * 1000, // 10 minutes
      autoResolve: true,
      actions: ['notify_ops_team', 'scale_resources']
    });

    this.registerAlertRule('high_memory_usage', {
      category: 'system',
      severity: 'high',
      condition: (metrics) => metrics.memory_usage > this.config.thresholds.system.memoryUsage,
      message: 'High memory usage detected: {{value}}%',
      escalationTime: 15 * 60 * 1000,
      autoResolve: true,
      actions: ['notify_ops_team', 'restart_services']
    });

    this.registerAlertRule('disk_space_low', {
      category: 'system',
      severity: 'critical',
      condition: (metrics) => metrics.disk_usage > this.config.thresholds.system.diskUsage,
      message: 'Low disk space: {{value}}% used',
      escalationTime: 5 * 60 * 1000,
      autoResolve: false,
      actions: ['notify_ops_team', 'cleanup_temp_files']
    });

    this.registerAlertRule('high_response_time', {
      category: 'system',
      severity: 'medium',
      condition: (metrics) => metrics.avg_response_time > this.config.thresholds.system.responseTime,
      message: 'High response time detected: {{value}}ms',
      escalationTime: 20 * 60 * 1000,
      autoResolve: true,
      actions: ['notify_dev_team', 'check_performance']
    });

    this.registerAlertRule('high_error_rate', {
      category: 'system',
      severity: 'high',
      condition: (metrics) => metrics.error_rate > this.config.thresholds.system.errorRate,
      message: 'High error rate detected: {{value}}%',
      escalationTime: 5 * 60 * 1000,
      autoResolve: false,
      actions: ['notify_dev_team', 'check_logs']
    });

    // Business alert rules
    this.registerAlertRule('sample_processing_delay', {
      category: 'business',
      severity: 'medium',
      condition: (metrics) => metrics.avg_processing_time > this.config.thresholds.business.processingDelay,
      message: 'Sample processing delay detected: {{value}}ms average',
      escalationTime: 30 * 60 * 1000,
      autoResolve: true,
      actions: ['notify_lab_manager', 'check_workflow']
    });

    this.registerAlertRule('high_failure_rate', {
      category: 'business',
      severity: 'high',
      condition: (metrics) => metrics.failure_rate > this.config.thresholds.business.failureRate,
      message: 'High failure rate detected: {{value}}%',
      escalationTime: 15 * 60 * 1000,
      autoResolve: false,
      actions: ['notify_lab_manager', 'investigate_failures']
    });

    this.registerAlertRule('sample_backlog', {
      category: 'business',
      severity: 'medium',
      condition: (metrics) => metrics.pending_samples > this.config.thresholds.business.sampleBacklog,
      message: 'Large sample backlog: {{value}} pending samples',
      escalationTime: 60 * 60 * 1000,
      autoResolve: true,
      actions: ['notify_lab_manager', 'allocate_resources']
    });

    this.registerAlertRule('batch_timeout', {
      category: 'business',
      severity: 'high',
      condition: (metrics) => metrics.oldest_batch_age > this.config.thresholds.business.batchTimeout,
      message: 'Batch timeout: batch has been processing for {{value}}ms',
      escalationTime: 30 * 60 * 1000,
      autoResolve: false,
      actions: ['notify_lab_manager', 'investigate_batch']
    });

    // Quality alert rules
    this.registerAlertRule('high_qc_failure_rate', {
      category: 'quality',
      severity: 'high',
      condition: (metrics) => metrics.qc_failure_rate > this.config.thresholds.quality.qcFailureRate,
      message: 'High QC failure rate: {{value}}%',
      escalationTime: 15 * 60 * 1000,
      autoResolve: false,
      actions: ['notify_quality_manager', 'review_qc_procedures']
    });

    this.registerAlertRule('high_repeat_rate', {
      category: 'quality',
      severity: 'medium',
      condition: (metrics) => metrics.repeat_rate > this.config.thresholds.quality.repeatRate,
      message: 'High repeat testing rate: {{value}}%',
      escalationTime: 60 * 60 * 1000,
      autoResolve: true,
      actions: ['notify_quality_manager', 'check_procedures']
    });

    this.registerAlertRule('contamination_detected', {
      category: 'quality',
      severity: 'critical',
      condition: (metrics) => metrics.contamination_rate > this.config.thresholds.quality.contaminationRate,
      message: 'Contamination detected: {{value}}% of samples',
      escalationTime: 0, // Immediate escalation
      autoResolve: false,
      actions: ['notify_quality_manager', 'quarantine_batch', 'investigate_contamination']
    });

    // Compliance alert rules
    this.registerAlertRule('compliance_violation', {
      category: 'compliance',
      severity: 'critical',
      condition: (metrics) => metrics.compliance_violations > this.config.thresholds.business.complianceViolations,
      message: 'Compliance violations detected: {{value}} violations',
      escalationTime: 0,
      autoResolve: false,
      actions: ['notify_compliance_officer', 'freeze_operations']
    });

    this.registerAlertRule('audit_integrity_violation', {
      category: 'compliance',
      severity: 'critical',
      condition: (metrics) => metrics.audit_integrity_violations > 0,
      message: 'Audit trail integrity violation detected',
      escalationTime: 0,
      autoResolve: false,
      actions: ['notify_compliance_officer', 'investigate_audit_trail']
    });

    logger.debug('Default alert rules configured', { count: this.alertRules.size });
  }

  setupHealthChecks() {
    // Database connectivity check
    this.registerHealthCheck('database', async () => {
      try {
        // Mock database health check
        return { status: 'healthy', responseTime: 50 };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });

    // External services check
    this.registerHealthCheck('external_services', async () => {
      try {
        // Mock external service check
        return { status: 'healthy', services: ['osiris', 'notification'] };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });

    // File system check
    this.registerHealthCheck('filesystem', async () => {
      try {
        const fs = require('fs');
        const path = require('path');
        const testFile = path.join(__dirname, '../temp/.health_check');
        
        fs.writeFileSync(testFile, 'health_check_test');
        fs.unlinkSync(testFile);
        
        return { status: 'healthy' };
      } catch (error) {
        return { status: 'unhealthy', error: error.message };
      }
    });

    logger.debug('Health checks configured', { count: this.healthChecks.size });
  }

  registerAlertRule(id, rule) {
    this.alertRules.set(id, {
      id,
      ...rule,
      createdAt: new Date().toISOString()
    });
  }

  registerHealthCheck(id, checkFunction) {
    this.healthChecks.set(id, {
      id,
      check: checkFunction,
      lastRun: null,
      lastResult: null
    });
  }

  startMonitoring() {
    // Start metrics collection
    setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.interval);

    // Start health checks
    setInterval(() => {
      this.runHealthChecks();
    }, this.config.monitoring.healthCheckInterval);

    // Start alert evaluation
    setInterval(() => {
      this.evaluateAlerts();
    }, this.config.monitoring.interval);

    logger.info('Monitoring started', {
      metricsInterval: this.config.monitoring.interval,
      healthCheckInterval: this.config.monitoring.healthCheckInterval
    });
  }

  async collectMetrics() {
    try {
      const timestamp = Date.now();

      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      this.systemMetrics.set(timestamp, systemMetrics);

      // Collect business metrics
      const businessMetrics = await this.collectBusinessMetrics();
      this.businessMetrics.set(timestamp, businessMetrics);

      // Collect quality metrics
      const qualityMetrics = await this.collectQualityMetrics();
      this.qualityMetrics.set(timestamp, qualityMetrics);

      // Clean old metrics
      this.cleanOldMetrics();

      // Detect anomalies
      if (this.config.anomalyDetection.enabled) {
        this.detectAnomalies(timestamp, {
          ...systemMetrics,
          ...businessMetrics,
          ...qualityMetrics
        });
      }

    } catch (error) {
      logger.error('Failed to collect metrics', error);
    }
  }

  async collectSystemMetrics() {
    const os = require('os');
    const process = require('process');

    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = (1 - (os.freemem() / os.totalmem())) * 100;
    const diskUsage = await this.getDiskUsage();
    const responseTime = await this.getAverageResponseTime();
    const errorRate = await this.getErrorRate();

    return {
      cpu_usage: cpuUsage,
      memory_usage: memoryUsage,
      disk_usage: diskUsage,
      avg_response_time: responseTime,
      error_rate: errorRate,
      uptime: process.uptime(),
      load_average: os.loadavg()[0]
    };
  }

  async collectBusinessMetrics() {
    // Mock business metrics collection
    return {
      pending_samples: Math.floor(Math.random() * 200),
      processing_samples: Math.floor(Math.random() * 100),
      completed_samples: Math.floor(Math.random() * 500),
      active_batches: Math.floor(Math.random() * 20),
      avg_processing_time: Math.floor(Math.random() * 3600000), // Random up to 1 hour
      failure_rate: Math.random() * 15, // Random up to 15%
      oldest_batch_age: Math.floor(Math.random() * 86400000), // Random up to 24 hours
      throughput: Math.floor(Math.random() * 100)
    };
  }

  async collectQualityMetrics() {
    // Mock quality metrics collection
    return {
      qc_failure_rate: Math.random() * 20, // Random up to 20%
      repeat_rate: Math.random() * 25, // Random up to 25%
      contamination_rate: Math.random() * 5, // Random up to 5%
      instrument_uptime: 95 + Math.random() * 5, // Random 95-100%
      compliance_violations: Math.floor(Math.random() * 3),
      audit_integrity_violations: Math.floor(Math.random() * 2)
    };
  }

  async getCPUUsage() {
    // Mock CPU usage calculation
    return Math.random() * 100;
  }

  async getDiskUsage() {
    // Mock disk usage calculation
    return Math.random() * 100;
  }

  async getAverageResponseTime() {
    // Mock response time calculation
    return Math.random() * 10000; // Random up to 10 seconds
  }

  async getErrorRate() {
    // Mock error rate calculation
    return Math.random() * 10; // Random up to 10%
  }

  cleanOldMetrics() {
    const cutoff = Date.now() - this.config.monitoring.metricsRetention;

    // Clean system metrics
    for (const [timestamp] of this.systemMetrics) {
      if (timestamp < cutoff) {
        this.systemMetrics.delete(timestamp);
      }
    }

    // Clean business metrics
    for (const [timestamp] of this.businessMetrics) {
      if (timestamp < cutoff) {
        this.businessMetrics.delete(timestamp);
      }
    }

    // Clean quality metrics
    for (const [timestamp] of this.qualityMetrics) {
      if (timestamp < cutoff) {
        this.qualityMetrics.delete(timestamp);
      }
    }
  }

  async runHealthChecks() {
    for (const [id, healthCheck] of this.healthChecks) {
      try {
        const startTime = Date.now();
        const result = await healthCheck.check();
        const duration = Date.now() - startTime;

        healthCheck.lastRun = new Date().toISOString();
        healthCheck.lastResult = {
          ...result,
          duration,
          timestamp: healthCheck.lastRun
        };

        if (result.status === 'unhealthy') {
          await this.triggerAlert({
            type: 'health_check_failed',
            category: 'system',
            severity: 'high',
            message: `Health check failed: ${id}`,
            data: {
              healthCheckId: id,
              error: result.error,
              duration
            }
          });
        }

      } catch (error) {
        logger.error('Health check failed', { id, error: error.message });
        
        healthCheck.lastResult = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  async evaluateAlerts() {
    const currentMetrics = this.getCurrentMetrics();

    for (const [ruleId, rule] of this.alertRules) {
      try {
        if (rule.condition(currentMetrics)) {
          await this.triggerAlert({
            ruleId,
            type: ruleId,
            category: rule.category,
            severity: rule.severity,
            message: this.interpolateMessage(rule.message, currentMetrics),
            data: currentMetrics,
            escalationTime: rule.escalationTime,
            autoResolve: rule.autoResolve,
            actions: rule.actions
          });
        } else if (rule.autoResolve) {
          // Check if we should auto-resolve an existing alert
          this.resolveAlert(ruleId, 'Condition no longer met');
        }
      } catch (error) {
        logger.error('Failed to evaluate alert rule', { ruleId, error: error.message });
      }
    }
  }

  getCurrentMetrics() {
    const latest = {
      system: Array.from(this.systemMetrics.values()).pop() || {},
      business: Array.from(this.businessMetrics.values()).pop() || {},
      quality: Array.from(this.qualityMetrics.values()).pop() || {}
    };

    return {
      ...latest.system,
      ...latest.business,
      ...latest.quality
    };
  }

  interpolateMessage(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return value || match;
    });
  }

  async triggerAlert(alertData) {
    const alertId = alertData.ruleId || this.generateAlertId();
    
    // Check if alert is suppressed
    if (this.isAlertSuppressed(alertId)) {
      this.metrics.alerts.suppressed++;
      return null;
    }

    // Check if alert already exists
    if (this.activeAlerts.has(alertId)) {
      const existingAlert = this.activeAlerts.get(alertId);
      existingAlert.count++;
      existingAlert.lastTriggered = new Date().toISOString();
      return existingAlert;
    }

    // Create new alert
    const alert = {
      id: alertId,
      ...alertData,
      status: 'active',
      count: 1,
      triggeredAt: new Date().toISOString(),
      lastTriggered: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolvedReason: null
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Update metrics
    this.metrics.alerts.total++;
    this.metrics.alerts.active++;
    this.metrics.severity[alert.severity]++;
    this.metrics.categories[alert.category]++;

    // Emit alert event
    this.emit('alert:triggered', alert);

    // Schedule escalation if configured
    if (alert.escalationTime && alert.escalationTime > 0) {
      setTimeout(() => {
        this.escalateAlert(alertId);
      }, alert.escalationTime);
    }

    // Execute actions
    if (alert.actions) {
      this.executeAlertActions(alert);
    }

    logger.warn('Alert triggered', {
      id: alertId,
      type: alert.type,
      severity: alert.severity,
      category: alert.category
    });

    return alert;
  }

  isAlertSuppressed(alertId) {
    const suppression = this.suppressedAlerts.get(alertId);
    if (!suppression) return false;

    const now = Date.now();
    if (now > suppression.expiresAt) {
      this.suppressedAlerts.delete(alertId);
      return false;
    }

    return true;
  }

  async resolveAlert(alertId, reason = 'Manual resolution', resolvedBy = 'system') {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return null;

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = resolvedBy;
    alert.resolvedReason = reason;

    this.activeAlerts.delete(alertId);

    // Update metrics
    this.metrics.alerts.active--;
    this.metrics.alerts.resolved++;

    // Emit resolution event
    this.emit('alert:resolved', alert);

    logger.info('Alert resolved', {
      id: alertId,
      reason,
      resolvedBy,
      duration: Date.now() - new Date(alert.triggeredAt).getTime()
    });

    return alert;
  }

  async escalateAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'active') return;

    alert.severity = this.getNextSeverityLevel(alert.severity);
    alert.escalatedAt = new Date().toISOString();

    this.metrics.alerts.escalated++;

    // Emit escalation event
    this.emit('alert:escalated', alert);

    logger.warn('Alert escalated', {
      id: alertId,
      newSeverity: alert.severity
    });
  }

  getNextSeverityLevel(currentSeverity) {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(currentSeverity);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  async executeAlertActions(alert) {
    for (const action of alert.actions) {
      try {
        await this.executeAction(action, alert);
      } catch (error) {
        logger.error('Failed to execute alert action', {
          alertId: alert.id,
          action,
          error: error.message
        });
      }
    }
  }

  async executeAction(action, alert) {
    switch (action) {
      case 'notify_ops_team':
        // Implementation would send notification to ops team
        logger.info('Notifying ops team', { alertId: alert.id });
        break;
      case 'notify_dev_team':
        logger.info('Notifying dev team', { alertId: alert.id });
        break;
      case 'notify_lab_manager':
        logger.info('Notifying lab manager', { alertId: alert.id });
        break;
      case 'notify_quality_manager':
        logger.info('Notifying quality manager', { alertId: alert.id });
        break;
      case 'notify_compliance_officer':
        logger.info('Notifying compliance officer', { alertId: alert.id });
        break;
      case 'scale_resources':
        logger.info('Scaling resources', { alertId: alert.id });
        break;
      case 'restart_services':
        logger.info('Restarting services', { alertId: alert.id });
        break;
      case 'cleanup_temp_files':
        logger.info('Cleaning up temp files', { alertId: alert.id });
        break;
      default:
        logger.warn('Unknown alert action', { action, alertId: alert.id });
    }
  }

  suppressAlert(alertId, durationMs = null) {
    const duration = durationMs || this.config.alerts.suppressionWindow;
    const expiresAt = Date.now() + duration;

    this.suppressedAlerts.set(alertId, {
      suppressedAt: Date.now(),
      expiresAt,
      duration
    });

    logger.info('Alert suppressed', { alertId, duration });
  }

  // Anomaly detection methods
  initializeAnomalyDetection() {
    // Initialize baselines for anomaly detection
    const metrics = ['cpu_usage', 'memory_usage', 'response_time', 'throughput'];
    
    for (const metric of metrics) {
      this.anomalyBaselines.set(metric, {
        mean: 0,
        stdDev: 0,
        dataPoints: [],
        isLearning: true,
        lastUpdated: Date.now()
      });
    }

    logger.info('Anomaly detection initialized');
  }

  detectAnomalies(timestamp, metrics) {
    for (const [metricName, value] of Object.entries(metrics)) {
      if (typeof value !== 'number') continue;

      const baseline = this.anomalyBaselines.get(metricName);
      if (!baseline) continue;

      if (baseline.isLearning) {
        this.updateBaseline(metricName, value);
      } else {
        const isAnomaly = this.isAnomalous(metricName, value);
        if (isAnomaly) {
          this.handleAnomaly(metricName, value, baseline);
        }
      }
    }
  }

  updateBaseline(metricName, value) {
    const baseline = this.anomalyBaselines.get(metricName);
    baseline.dataPoints.push(value);

    if (baseline.dataPoints.length >= this.config.anomalyDetection.minDataPoints) {
      baseline.mean = this.calculateMean(baseline.dataPoints);
      baseline.stdDev = this.calculateStdDev(baseline.dataPoints, baseline.mean);
      baseline.isLearning = false;
      baseline.lastUpdated = Date.now();

      logger.debug('Baseline established for metric', {
        metric: metricName,
        mean: baseline.mean,
        stdDev: baseline.stdDev,
        dataPoints: baseline.dataPoints.length
      });
    }
  }

  isAnomalous(metricName, value) {
    const baseline = this.anomalyBaselines.get(metricName);
    if (!baseline || baseline.isLearning) return false;

    const threshold = this.getAnomalyThreshold();
    const zScore = Math.abs((value - baseline.mean) / baseline.stdDev);

    return zScore > threshold;
  }

  getAnomalyThreshold() {
    switch (this.config.anomalyDetection.sensitivity) {
      case 'low': return 3.0;    // 99.7% confidence
      case 'medium': return 2.5; // 98.8% confidence
      case 'high': return 2.0;   // 95.4% confidence
      default: return 2.5;
    }
  }

  async handleAnomaly(metricName, value, baseline) {
    this.metrics.anomalies.detected++;

    await this.triggerAlert({
      type: 'anomaly_detected',
      category: 'system',
      severity: 'medium',
      message: `Anomaly detected in ${metricName}: {{value}}`,
      data: {
        metric: metricName,
        value,
        baseline: baseline.mean,
        stdDev: baseline.stdDev,
        threshold: this.getAnomalyThreshold()
      }
    });

    logger.warn('Anomaly detected', {
      metric: metricName,
      value,
      baseline: baseline.mean,
      deviation: Math.abs(value - baseline.mean)
    });
  }

  calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateStdDev(values, mean) {
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  // Utility methods
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Management methods
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  getHealthStatus() {
    const checks = {};
    for (const [id, healthCheck] of this.healthChecks) {
      checks[id] = healthCheck.lastResult;
    }
    return checks;
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeAlerts: this.activeAlerts.size,
      suppressedAlerts: this.suppressedAlerts.size,
      alertRules: this.alertRules.size,
      healthChecks: this.healthChecks.size,
      anomalyBaselines: Array.from(this.anomalyBaselines.entries()).map(([metric, baseline]) => ({
        metric,
        isLearning: baseline.isLearning,
        dataPoints: baseline.dataPoints.length
      })),
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    logger.info('Shutting down alert service');

    // Stop all monitoring intervals
    // (In real implementation, store interval IDs and clear them)

    // Resolve all active alerts
    for (const [alertId] of this.activeAlerts) {
      await this.resolveAlert(alertId, 'Service shutdown');
    }

    logger.info('Alert service shutdown complete');
  }
}

module.exports = AlertService;