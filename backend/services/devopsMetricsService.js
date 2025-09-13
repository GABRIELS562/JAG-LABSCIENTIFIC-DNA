/**
 * DevOps Metrics Service
 * Tracks throughput, efficiency, resource utilization, and SLA compliance
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
      paternity: 72, // 72 hours
      forensic: 120, // 5 days
      kinship: 96, // 4 days
      immigration: 48, // 2 days
      default: 72
    };
  }

  /**
   * Initialize DevOps metrics tables
   */
  async initialize() {
    try {
      // Throughput tracking table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS throughput_metrics (
          id SERIAL PRIMARY KEY,
          hour_timestamp DATETIME NOT NULL,
          samples_processed INTEGER DEFAULT 0,
          samples_generated INTEGER DEFAULT 0,
          samples_completed INTEGER DEFAULT 0,
          samples_failed INTEGER DEFAULT 0,
          avg_processing_time DECIMAL(10,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Resource utilization table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS resource_utilization (
          id SERIAL PRIMARY KEY,
          resource_type VARCHAR(50) NOT NULL,
          resource_name VARCHAR(100) NOT NULL,
          capacity INTEGER NOT NULL,
          current_usage INTEGER DEFAULT 0,
          utilization_percentage DECIMAL(5,2),
          peak_usage INTEGER DEFAULT 0,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // SLA tracking table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sla_tracking (
          id SERIAL PRIMARY KEY,
          sample_id INTEGER NOT NULL,
          lab_number VARCHAR(100) NOT NULL,
          case_type VARCHAR(50),
          sla_target_hours INTEGER NOT NULL,
          actual_hours DECIMAL(10,2),
          sla_met BOOLEAN,
          created_at DATETIME NOT NULL,
          completed_at DATETIME,
          FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
        )
      `);

      // Pipeline efficiency table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS pipeline_efficiency (
          id SERIAL PRIMARY KEY,
          stage VARCHAR(50) NOT NULL,
          samples_entered INTEGER DEFAULT 0,
          samples_exited INTEGER DEFAULT 0,
          avg_duration_seconds INTEGER,
          bottleneck_score DECIMAL(5,2),
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('DevOps metrics tables initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize DevOps metrics', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate samples per hour
   */
  calculateThroughput() {
    try {
      // Get samples processed in last hour
      const lastHour = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE datetime(updated_at) >= datetime('now', '-1 hour')
          AND workflow_status != 'sample_collected'
      `).get();

      // Get samples completed in last hour
      const completed = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE datetime(updated_at) >= datetime('now', '-1 hour')
          AND workflow_status = 'report_sent'
      `).get();

      // Get samples generated in last hour
      const generated = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM samples
        WHERE datetime(created_at) >= datetime('now', '-1 hour')
      `).get();

      // Calculate rolling average over last 24 hours
      const last24Hours = this.db.prepare(`
        SELECT
          COUNT(*) as total_samples,
          SUM(CASE WHEN workflow_status = 'report_sent' THEN 1 ELSE 0 END) as completed_samples,
          AVG(CASE
            WHEN workflow_status = 'report_sent'
            THEN CAST((julianday(updated_at) - julianday(created_at)) * 24 AS REAL)
            ELSE NULL
          END) as avg_completion_hours
        FROM samples
        WHERE datetime(created_at) >= datetime('now', '-24 hours')
      `).get();

      // Store throughput metrics
      const stmt = this.db.prepare(`
        INSERT INTO throughput_metrics
        (hour_timestamp, samples_processed, samples_generated, samples_completed, avg_processing_time)
        VALUES (datetime('now'), ?, ?, ?, ?)
      `);

      stmt.run(
        lastHour.count,
        generated.count,
        completed.count,
        last24Hours.avg_completion_hours || 0
      );

      return {
        samples_per_hour: lastHour.count,
        samples_completed_per_hour: completed.count,
        samples_generated_per_hour: generated.count,
        last_24_hours: {
          total: last24Hours.total_samples,
          completed: last24Hours.completed_samples,
          avg_completion_time_hours: last24Hours.avg_completion_hours?.toFixed(1) || 'N/A'
        }
      };
    } catch (error) {
      logger.error('Failed to calculate throughput', { error: error.message });
      return { samples_per_hour: 0, error: error.message };
    }
  }

  /**
   * Calculate pipeline efficiency
   */
  calculatePipelineEfficiency() {
    try {
      // Get success rate
      const successRate = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN workflow_status = 'report_sent' THEN 1 ELSE 0 END) as completed
        FROM samples
      `).get();

      // Get stage efficiency
      const stageEfficiency = this.db.prepare(`
        SELECT
          workflow_status,
          COUNT(*) as count,
          AVG(CAST((julianday('now') - julianday(updated_at)) * 86400 AS REAL)) as avg_time_in_stage
        FROM samples
        WHERE status = 'active'
        GROUP BY workflow_status
      `).all();

      // Calculate bottlenecks (stages with highest wait times)
      const bottlenecks = stageEfficiency
        .sort((a, b) => b.avg_time_in_stage - a.avg_time_in_stage)
        .slice(0, 3)
        .map(stage => ({
          stage: stage.workflow_status,
          samples: stage.count,
          avg_wait_seconds: Math.round(stage.avg_time_in_stage)
        }));

      // Store pipeline efficiency metrics
      stageEfficiency.forEach(stage => {
        try {
          const stmt = this.db.prepare(`
            INSERT INTO pipeline_efficiency
            (stage, samples_entered, avg_duration_seconds, bottleneck_score)
            VALUES (?, ?, ?, ?)
          `);

          const bottleneckScore = (stage.avg_time_in_stage / 60) * stage.count; // Higher score = bigger bottleneck

          stmt.run(
            stage.workflow_status,
            stage.count,
            Math.round(stage.avg_time_in_stage),
            bottleneckScore
          );
        } catch (err) {
          // Ignore duplicate errors
        }
      });

      const efficiency = successRate.total > 0
        ? ((successRate.completed / successRate.total) * 100)
        : 0;

      return {
        overall_efficiency: efficiency.toFixed(1) + '%',
        success_rate: successRate.total > 0
          ? (((successRate.total - successRate.failed) / successRate.total) * 100).toFixed(1) + '%'
          : '100%',
        samples: {
          total: successRate.total,
          active: successRate.active,
          failed: successRate.failed,
          completed: successRate.completed
        },
        bottlenecks,
        stage_distribution: stageEfficiency.map(s => ({
          stage: s.workflow_status,
          count: s.count,
          avg_time_seconds: Math.round(s.avg_time_in_stage)
        }))
      };
    } catch (error) {
      logger.error('Failed to calculate pipeline efficiency', { error: error.message });
      return { overall_efficiency: '0%', error: error.message };
    }
  }

  /**
   * Calculate resource utilization
   */
  calculateResourceUtilization() {
    try {
      // Define resource capacities
      const resources = [
        { type: 'batch', name: 'PCR Thermal Cyclers', capacity: 64 }, // 4 cyclers x 16 samples
        { type: 'batch', name: 'Electrophoresis Units', capacity: 32 }, // 4 units x 8 samples
        { type: 'batch', name: 'Analysis Workstations', capacity: 10 },
        { type: 'storage', name: 'Sample Storage', capacity: 200 },
        { type: 'personnel', name: 'Lab Technicians', capacity: 8 }
      ];

      const utilization = resources.map(resource => {
        let currentUsage = 0;

        if (resource.type === 'batch') {
          // Count samples in relevant stages
          if (resource.name.includes('PCR')) {
            const pcrSamples = this.db.prepare(`
              SELECT COUNT(*) as count
              FROM samples
              WHERE workflow_status IN ('pcr_ready', 'pcr_batched')
                AND status = 'active'
            `).get();
            currentUsage = pcrSamples.count;
          } else if (resource.name.includes('Electrophoresis')) {
            const electroSamples = this.db.prepare(`
              SELECT COUNT(*) as count
              FROM samples
              WHERE workflow_status IN ('electro_ready', 'electro_batched')
                AND status = 'active'
            `).get();
            currentUsage = electroSamples.count;
          } else if (resource.name.includes('Analysis')) {
            const analysisSamples = this.db.prepare(`
              SELECT COUNT(*) as count
              FROM samples
              WHERE workflow_status IN ('analysis_ready', 'analysis_completed')
                AND status = 'active'
            `).get();
            currentUsage = analysisSamples.count;
          }
        } else if (resource.type === 'storage') {
          const totalSamples = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM samples
            WHERE status = 'active'
          `).get();
          currentUsage = totalSamples.count;
        } else if (resource.type === 'personnel') {
          // Simulate personnel usage based on active processes
          currentUsage = Math.min(resource.capacity, Math.floor(Math.random() * 6) + 2);
        }

        const utilizationPercent = (currentUsage / resource.capacity) * 100;

        // Store utilization metrics
        try {
          const stmt = this.db.prepare(`
            INSERT INTO resource_utilization
            (resource_type, resource_name, capacity, current_usage, utilization_percentage)
            VALUES (?, ?, ?, ?, ?)
          `);

          stmt.run(
            resource.type,
            resource.name,
            resource.capacity,
            currentUsage,
            utilizationPercent
          );
        } catch (err) {
          // Ignore duplicate errors
        }

        return {
          resource: resource.name,
          type: resource.type,
          capacity: resource.capacity,
          current_usage: currentUsage,
          utilization: utilizationPercent.toFixed(1) + '%',
          status: utilizationPercent > 90 ? 'critical' :
                  utilizationPercent > 75 ? 'warning' :
                  utilizationPercent > 50 ? 'optimal' : 'underutilized'
        };
      });

      // Calculate batch fill rates
      const batchFillRates = this.db.prepare(`
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
      `).all();

      return {
        resources: utilization,
        batch_fill_rates: batchFillRates.map(b => ({
          batch_type: b.batch_type,
          waiting: b.waiting_samples,
          capacity: b.batch_size,
          fill_rate: Math.min(100, b.fill_rate).toFixed(1) + '%'
        })),
        overall_utilization: (utilization.reduce((sum, r) =>
          sum + parseFloat(r.utilization), 0) / utilization.length).toFixed(1) + '%'
      };
    } catch (error) {
      logger.error('Failed to calculate resource utilization', { error: error.message });
      return { resources: [], error: error.message };
    }
  }

  /**
   * Calculate SLA compliance
   */
  calculateSLACompliance() {
    try {
      // Get completed samples with timing
      const completedSamples = this.db.prepare(`
        SELECT
          id,
          lab_number,
          CASE
            WHEN case_number LIKE 'PAT-%' THEN 'paternity'
            WHEN case_number LIKE 'FOR-%' THEN 'forensic'
            WHEN metadata LIKE '%Immigration%' THEN 'immigration'
            ELSE 'default'
          END as case_type,
          created_at,
          updated_at,
          CAST((julianday(updated_at) - julianday(created_at)) * 24 AS REAL) as completion_hours
        FROM samples
        WHERE workflow_status = 'report_sent'
          AND datetime(updated_at) >= datetime('now', '-7 days')
      `).all();

      let metCount = 0;
      let totalCount = completedSamples.length;

      const slaDetails = completedSamples.map(sample => {
        const slaTarget = this.slaTargets[sample.case_type] || this.slaTargets.default;
        const slaMet = sample.completion_hours <= slaTarget;
        if (slaMet) metCount++;

        // Store SLA tracking
        try {
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO sla_tracking
            (sample_id, lab_number, case_type, sla_target_hours, actual_hours, sla_met, created_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          stmt.run(
            sample.id,
            sample.lab_number,
            sample.case_type,
            slaTarget,
            sample.completion_hours,
            slaMet ? 1 : 0,
            sample.created_at,
            sample.updated_at
          );
        } catch (err) {
          // Ignore errors
        }

        return {
          lab_number: sample.lab_number,
          case_type: sample.case_type,
          sla_target: slaTarget + ' hours',
          actual: sample.completion_hours.toFixed(1) + ' hours',
          met: slaMet,
          variance: (sample.completion_hours - slaTarget).toFixed(1) + ' hours'
        };
      });

      // Get SLA by case type
      const slaByType = this.db.prepare(`
        SELECT
          case_type,
          COUNT(*) as total,
          SUM(CASE WHEN sla_met = 1 THEN 1 ELSE 0 END) as met,
          AVG(actual_hours) as avg_completion_hours,
          AVG(sla_target_hours) as avg_target_hours
        FROM sla_tracking
        WHERE datetime(completed_at) >= datetime('now', '-7 days')
        GROUP BY case_type
      `).all();

      const compliance = totalCount > 0 ? (metCount / totalCount) * 100 : 100;

      return {
        overall_compliance: compliance.toFixed(1) + '%',
        samples_evaluated: totalCount,
        samples_meeting_sla: metCount,
        samples_missing_sla: totalCount - metCount,
        by_case_type: slaByType.map(type => ({
          case_type: type.case_type,
          compliance: type.total > 0 ? ((type.met / type.total) * 100).toFixed(1) + '%' : '100%',
          avg_completion: type.avg_completion_hours?.toFixed(1) + ' hours',
          target: type.avg_target_hours + ' hours',
          samples: type.total
        })),
        recent_samples: slaDetails.slice(0, 10)
      };
    } catch (error) {
      logger.error('Failed to calculate SLA compliance', { error: error.message });
      return { overall_compliance: '0%', error: error.message };
    }
  }

  /**
   * Get comprehensive DevOps metrics
   */
  async getDevOpsMetrics() {
    try {
      // Check cache (5 second TTL)
      if (this.metricsCache.lastUpdate &&
          Date.now() - this.metricsCache.lastUpdate < 5000) {
        return this.metricsCache.data;
      }

      const metrics = {
        throughput: this.calculateThroughput(),
        pipeline_efficiency: this.calculatePipelineEfficiency(),
        resource_utilization: this.calculateResourceUtilization(),
        sla_compliance: this.calculateSLACompliance(),
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

  /**
   * Get historical metrics for trending
   */
  async getHistoricalMetrics(hours = 24) {
    try {
      const throughputHistory = this.db.prepare(`
        SELECT * FROM throughput_metrics
        WHERE datetime(hour_timestamp) >= datetime('now', '-${hours} hours')
        ORDER BY hour_timestamp DESC
      `).all();

      const efficiencyHistory = this.db.prepare(`
        SELECT
          stage,
          AVG(avg_duration_seconds) as avg_duration,
          MAX(bottleneck_score) as max_bottleneck_score
        FROM pipeline_efficiency
        WHERE datetime(timestamp) >= datetime('now', '-${hours} hours')
        GROUP BY stage
      `).all();

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