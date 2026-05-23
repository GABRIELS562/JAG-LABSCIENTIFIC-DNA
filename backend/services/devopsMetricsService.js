/**
 * DevOps Metrics Service
 * Tracks throughput, efficiency, resource utilization, and SLA compliance
 * PostgreSQL compatible version
 */

const { logger } = require('../utils/logger');
const db = require('./database');

class DevOpsMetricsService {
  constructor() {
    this.db = db;
    this.metricsCache = {
      lastUpdate: null,
      data: null
    };
    this.slaTargets = {
      paternity: 72,
      forensic: 120,
      kinship: 96,
      immigration: 48,
      default: 72
    };
  }

  async initialize() {
    try {
      // Throughput tracking table (PostgreSQL syntax)
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS throughput_metrics (
          id SERIAL PRIMARY KEY,
          hour_timestamp TIMESTAMP NOT NULL,
          samples_processed INTEGER DEFAULT 0,
          samples_generated INTEGER DEFAULT 0,
          samples_completed INTEGER DEFAULT 0,
          samples_failed INTEGER DEFAULT 0,
          avg_processing_time DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Resource utilization table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS resource_utilization (
          id SERIAL PRIMARY KEY,
          resource_type VARCHAR(50) NOT NULL,
          resource_name VARCHAR(100) NOT NULL,
          capacity INTEGER NOT NULL,
          current_usage INTEGER DEFAULT 0,
          utilization_percentage DECIMAL(5,2),
          peak_usage INTEGER DEFAULT 0,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // SLA tracking table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS sla_tracking (
          id SERIAL PRIMARY KEY,
          sample_id INTEGER NOT NULL,
          lab_number VARCHAR(100) NOT NULL,
          case_type VARCHAR(50),
          sla_target_hours INTEGER NOT NULL,
          actual_hours DECIMAL(10,2),
          sla_met BOOLEAN,
          created_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP
        )
      `);

      // Pipeline efficiency table
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS pipeline_efficiency (
          id SERIAL PRIMARY KEY,
          stage VARCHAR(50) NOT NULL,
          samples_entered INTEGER DEFAULT 0,
          samples_exited INTEGER DEFAULT 0,
          avg_duration_seconds INTEGER,
          bottleneck_score DECIMAL(5,2),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('DevOps metrics tables initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize DevOps metrics', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  async calculateThroughput() {
    try {
      // Get samples processed in last hour
      const lastHour = await this.db.get(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE updated_at >= NOW() - INTERVAL '1 hour'
          AND workflow_status != 'sample_collected'
      `) || { count: 0 };

      // Get samples completed in last hour
      const completed = await this.db.get(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE updated_at >= NOW() - INTERVAL '1 hour'
          AND workflow_status = 'report_sent'
      `) || { count: 0 };

      // Get samples generated in last hour
      const generated = await this.db.get(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `) || { count: 0 };

      // Calculate rolling average over last 24 hours
      const last24Hours = await this.db.get(`
        SELECT
          COUNT(*) as total_samples,
          SUM(CASE WHEN workflow_status = 'report_sent' THEN 1 ELSE 0 END) as completed_samples,
          AVG(CASE
            WHEN workflow_status = 'report_sent'
            THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
            ELSE NULL
          END) as avg_completion_hours
        FROM samples
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `) || { total_samples: 0, completed_samples: 0, avg_completion_hours: 0 };

      // Store throughput metrics
      await this.db.run(`
        INSERT INTO throughput_metrics
        (hour_timestamp, samples_processed, samples_generated, samples_completed, avg_processing_time)
        VALUES (NOW(), $1, $2, $3, $4)
      `, [
        parseInt(lastHour.count),
        parseInt(generated.count),
        parseInt(completed.count),
        parseFloat(last24Hours.avg_completion_hours) || 0
      ]);

      return {
        samples_per_hour: parseInt(lastHour.count),
        samples_completed_per_hour: parseInt(completed.count),
        samples_generated_per_hour: parseInt(generated.count),
        last_24_hours: {
          total: parseInt(last24Hours.total_samples),
          completed: parseInt(last24Hours.completed_samples),
          avg_completion_time_hours: last24Hours.avg_completion_hours?.toFixed(1) || 'N/A'
        }
      };
    } catch (error) {
      logger.error('Failed to calculate throughput', { error: error.message });
      return { samples_per_hour: 0, error: error.message };
    }
  }

  async calculatePipelineEfficiency() {
    try {
      // Get success rate
      const successRate = await this.db.get(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN workflow_status = 'report_sent' THEN 1 ELSE 0 END) as completed
        FROM samples
      `) || { total: 0, active: 0, failed: 0, completed: 0 };

      // Get stage efficiency
      const stageEfficiency = await this.db.all(`
        SELECT
          workflow_status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (NOW() - updated_at))) as avg_time_in_stage
        FROM samples
        WHERE status = 'active'
        GROUP BY workflow_status
      `) || [];

      // Calculate bottlenecks
      const bottlenecks = stageEfficiency
        .filter(s => s.avg_time_in_stage !== null)
        .sort((a, b) => parseFloat(b.avg_time_in_stage) - parseFloat(a.avg_time_in_stage))
        .slice(0, 3)
        .map(stage => ({
          stage: stage.workflow_status,
          samples: parseInt(stage.count),
          avg_wait_seconds: Math.round(parseFloat(stage.avg_time_in_stage))
        }));

      // Store pipeline efficiency metrics
      for (const stage of stageEfficiency) {
        try {
          const bottleneckScore = (parseFloat(stage.avg_time_in_stage) / 60) * parseInt(stage.count);
          await this.db.run(`
            INSERT INTO pipeline_efficiency
            (stage, samples_entered, avg_duration_seconds, bottleneck_score)
            VALUES ($1, $2, $3, $4)
          `, [
            stage.workflow_status,
            parseInt(stage.count),
            Math.round(parseFloat(stage.avg_time_in_stage) || 0),
            bottleneckScore || 0
          ]);
        } catch (err) {
          // Ignore errors
        }
      }

      const total = parseInt(successRate.total) || 1;
      const completedCount = parseInt(successRate.completed) || 0;
      const failedCount = parseInt(successRate.failed) || 0;
      const efficiency = (completedCount / total) * 100;

      return {
        overall_efficiency: efficiency.toFixed(1) + '%',
        success_rate: (((total - failedCount) / total) * 100).toFixed(1) + '%',
        samples: {
          total: parseInt(successRate.total),
          active: parseInt(successRate.active),
          failed: failedCount,
          completed: completedCount
        },
        bottlenecks,
        stage_distribution: stageEfficiency.map(s => ({
          stage: s.workflow_status,
          count: parseInt(s.count),
          avg_time_seconds: Math.round(parseFloat(s.avg_time_in_stage) || 0)
        }))
      };
    } catch (error) {
      logger.error('Failed to calculate pipeline efficiency', { error: error.message });
      return { overall_efficiency: '0%', error: error.message };
    }
  }

  async calculateResourceUtilization() {
    try {
      const resources = [
        { type: 'batch', name: 'PCR Thermal Cyclers', capacity: 64 },
        { type: 'batch', name: 'Electrophoresis Units', capacity: 32 },
        { type: 'batch', name: 'Analysis Workstations', capacity: 10 },
        { type: 'storage', name: 'Sample Storage', capacity: 200 },
        { type: 'personnel', name: 'Lab Technicians', capacity: 8 }
      ];

      const utilization = [];

      for (const resource of resources) {
        let currentUsage = 0;

        if (resource.type === 'batch') {
          if (resource.name.includes('PCR')) {
            const pcrSamples = await this.db.get(`
              SELECT COUNT(*) as count
              FROM samples
              WHERE workflow_status IN ('pcr_ready', 'pcr_batched')
                AND status = 'active'
            `);
            currentUsage = parseInt(pcrSamples?.count) || 0;
          } else if (resource.name.includes('Electrophoresis')) {
            const electroSamples = await this.db.get(`
              SELECT COUNT(*) as count
              FROM samples
              WHERE workflow_status IN ('electro_ready', 'electro_batched')
                AND status = 'active'
            `);
            currentUsage = parseInt(electroSamples?.count) || 0;
          } else if (resource.name.includes('Analysis')) {
            const analysisSamples = await this.db.get(`
              SELECT COUNT(*) as count
              FROM samples
              WHERE workflow_status IN ('analysis_ready', 'analysis_completed')
                AND status = 'active'
            `);
            currentUsage = parseInt(analysisSamples?.count) || 0;
          }
        } else if (resource.type === 'storage') {
          const totalSamples = await this.db.get(`
            SELECT COUNT(*) as count
            FROM samples
            WHERE status = 'active'
          `);
          currentUsage = parseInt(totalSamples?.count) || 0;
        } else if (resource.type === 'personnel') {
          currentUsage = Math.min(resource.capacity, Math.floor(Math.random() * 6) + 2);
        }

        const utilizationPercent = (currentUsage / resource.capacity) * 100;

        try {
          await this.db.run(`
            INSERT INTO resource_utilization
            (resource_type, resource_name, capacity, current_usage, utilization_percentage)
            VALUES ($1, $2, $3, $4, $5)
          `, [resource.type, resource.name, resource.capacity, currentUsage, utilizationPercent]);
        } catch (err) {
          // Ignore errors
        }

        utilization.push({
          resource: resource.name,
          type: resource.type,
          capacity: resource.capacity,
          current_usage: currentUsage,
          utilization: utilizationPercent.toFixed(1) + '%',
          status: utilizationPercent > 90 ? 'critical' :
                  utilizationPercent > 75 ? 'warning' :
                  utilizationPercent > 50 ? 'optimal' : 'underutilized'
        });
      }

      // Calculate batch fill rates
      const batchFillRates = await this.db.all(`
        SELECT
          'PCR' as batch_type,
          COUNT(*) as waiting_samples,
          16 as batch_size,
          CAST(COUNT(*) AS REAL) / 16 * 100 as fill_rate
        FROM samples
        WHERE workflow_status = 'pcr_ready' AND status = 'active'
        UNION ALL
        SELECT
          'Electrophoresis' as batch_type,
          COUNT(*) as waiting_samples,
          8 as batch_size,
          CAST(COUNT(*) AS REAL) / 8 * 100 as fill_rate
        FROM samples
        WHERE workflow_status = 'electro_ready' AND status = 'active'
      `) || [];

      return {
        resources: utilization,
        batch_fill_rates: batchFillRates.map(b => ({
          batch_type: b.batch_type,
          waiting: parseInt(b.waiting_samples),
          capacity: parseInt(b.batch_size),
          fill_rate: Math.min(100, parseFloat(b.fill_rate)).toFixed(1) + '%'
        })),
        overall_utilization: (utilization.reduce((sum, r) =>
          sum + parseFloat(r.utilization), 0) / utilization.length).toFixed(1) + '%'
      };
    } catch (error) {
      logger.error('Failed to calculate resource utilization', { error: error.message });
      return { resources: [], error: error.message };
    }
  }

  async calculateSLACompliance() {
    try {
      // Get completed samples with timing
      const completedSamples = await this.db.all(`
        SELECT
          id,
          lab_number,
          CASE
            WHEN case_number LIKE 'PAT-%' THEN 'paternity'
            WHEN case_number LIKE 'FOR-%' THEN 'forensic'
            ELSE 'default'
          END as case_type,
          created_at,
          updated_at,
          EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 as completion_hours
        FROM samples
        WHERE workflow_status = 'report_sent'
          AND updated_at >= NOW() - INTERVAL '7 days'
      `) || [];

      let metCount = 0;
      let totalCount = completedSamples.length;

      const slaDetails = completedSamples.map(sample => {
        const slaTarget = this.slaTargets[sample.case_type] || this.slaTargets.default;
        const completionHours = parseFloat(sample.completion_hours) || 0;
        const slaMet = completionHours <= slaTarget;
        if (slaMet) metCount++;

        return {
          lab_number: sample.lab_number,
          case_type: sample.case_type,
          sla_target: slaTarget + ' hours',
          actual: completionHours.toFixed(1) + ' hours',
          met: slaMet,
          variance: (completionHours - slaTarget).toFixed(1) + ' hours'
        };
      });

      // Get SLA by case type
      const slaByType = await this.db.all(`
        SELECT
          case_type,
          COUNT(*) as total,
          SUM(CASE WHEN sla_met = true THEN 1 ELSE 0 END) as met,
          AVG(actual_hours) as avg_completion_hours,
          AVG(sla_target_hours) as avg_target_hours
        FROM sla_tracking
        WHERE completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY case_type
      `) || [];

      const compliance = totalCount > 0 ? (metCount / totalCount) * 100 : 100;

      return {
        overall_compliance: compliance.toFixed(1) + '%',
        samples_evaluated: totalCount,
        samples_meeting_sla: metCount,
        samples_missing_sla: totalCount - metCount,
        by_case_type: slaByType.map(type => ({
          case_type: type.case_type,
          compliance: parseInt(type.total) > 0 ? ((parseInt(type.met) / parseInt(type.total)) * 100).toFixed(1) + '%' : '100%',
          avg_completion: parseFloat(type.avg_completion_hours)?.toFixed(1) + ' hours',
          target: type.avg_target_hours + ' hours',
          samples: parseInt(type.total)
        })),
        recent_samples: slaDetails.slice(0, 10)
      };
    } catch (error) {
      logger.error('Failed to calculate SLA compliance', { error: error.message });
      return { overall_compliance: '0%', error: error.message };
    }
  }

  async getDevOpsMetrics() {
    try {
      // Check cache (5 second TTL)
      if (this.metricsCache.lastUpdate &&
          Date.now() - this.metricsCache.lastUpdate < 5000) {
        return this.metricsCache.data;
      }

      const metrics = {
        throughput: await this.calculateThroughput(),
        pipeline_efficiency: await this.calculatePipelineEfficiency(),
        resource_utilization: await this.calculateResourceUtilization(),
        sla_compliance: await this.calculateSLACompliance(),
        timestamp: new Date().toISOString()
      };

      // Update cache
      this.metricsCache = {
        lastUpdate: Date.now(),
        data: metrics
      };

      return metrics;
    } catch (error) {
      logger.error('Failed to get DevOps metrics', { error: error.message });
      return { error: error.message };
    }
  }

  async getHistoricalMetrics(hours = 24) {
    try {
      const throughputHistory = await this.db.all(`
        SELECT * FROM throughput_metrics
        WHERE hour_timestamp >= NOW() - INTERVAL '${hours} hours'
        ORDER BY hour_timestamp DESC
      `) || [];

      const efficiencyHistory = await this.db.all(`
        SELECT
          stage,
          AVG(avg_duration_seconds) as avg_duration,
          MAX(bottleneck_score) as max_bottleneck_score
        FROM pipeline_efficiency
        WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
        GROUP BY stage
      `) || [];

      return {
        throughput_trend: throughputHistory,
        efficiency_trend: efficiencyHistory,
        period_hours: hours
      };
    } catch (error) {
      logger.error('Failed to get historical metrics', { error: error.message });
      return { error: error.message };
    }
  }
}

module.exports = new DevOpsMetricsService();
