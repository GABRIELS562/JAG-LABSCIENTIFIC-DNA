const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const logger = require('../utils/logger');

/**
 * Advanced Reporting and Analytics Service
 * Generates comprehensive reports with charts and statistical analysis
 */
class ReportingService {
  constructor(options = {}) {
    this.config = {
      // Output options
      output: {
        directory: options.outputDir || path.join(__dirname, '../temp/reports'),
        formats: options.formats || ['pdf', 'xlsx', 'html'],
        compression: options.compression !== false,
        watermark: options.watermark !== false
      },
      
      // Chart options
      charts: {
        width: options.chartWidth || 800,
        height: options.chartHeight || 400,
        backgroundColor: options.chartBgColor || 'white',
        defaultColors: options.chartColors || [
          '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
          '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
        ]
      },
      
      // Performance options
      performance: {
        cacheResults: options.cacheResults !== false,
        cacheDuration: options.cacheDuration || 3600000, // 1 hour
        maxConcurrentReports: options.maxConcurrent || 5,
        timeoutMs: options.timeoutMs || 300000 // 5 minutes
      },
      
      // Scheduling options
      scheduling: {
        enabled: options.schedulingEnabled || false,
        timezone: options.timezone || 'UTC',
        maxScheduledReports: options.maxScheduled || 50
      }
    };

    this.reportQueue = [];
    this.activeReports = new Map();
    this.scheduledReports = new Map();
    this.reportCache = new Map();
    this.chartCanvas = new ChartJSNodeCanvas({
      width: this.config.charts.width,
      height: this.config.charts.height,
      backgroundColor: this.config.charts.backgroundColor
    });
    
    this.metrics = {
      reportsGenerated: 0,
      totalProcessingTime: 0,
      avgProcessingTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      reportTypes: {},
      popularReports: new Map()
    };

    this.ensureOutputDirectory();
    this.initializeReportTemplates();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.config.output.directory)) {
      fs.mkdirSync(this.config.output.directory, { recursive: true });
    }
  }

  initializeReportTemplates() {
    this.reportTemplates = {
      // Laboratory Performance Dashboard
      'lab_performance': {
        name: 'Laboratory Performance Dashboard',
        description: 'Comprehensive overview of laboratory operations',
        sections: ['overview', 'sample_metrics', 'batch_metrics', 'quality_metrics', 'efficiency_metrics'],
        charts: ['sample_trends', 'batch_completion', 'quality_indicators', 'turnaround_times'],
        dataQueries: ['sample_stats', 'batch_stats', 'quality_stats', 'performance_stats']
      },
      
      // Sample Processing Report
      'sample_processing': {
        name: 'Sample Processing Report',
        description: 'Detailed analysis of sample processing workflow',
        sections: ['sample_overview', 'workflow_analysis', 'bottlenecks', 'recommendations'],
        charts: ['workflow_stages', 'processing_times', 'failure_rates'],
        dataQueries: ['sample_workflow', 'processing_metrics', 'failure_analysis']
      },
      
      // Quality Control Report
      'quality_control': {
        name: 'Quality Control Report',
        description: 'Quality metrics and compliance analysis',
        sections: ['qc_overview', 'control_results', 'trend_analysis', 'compliance_status'],
        charts: ['control_trends', 'failure_distribution', 'compliance_scores'],
        dataQueries: ['qc_results', 'control_data', 'compliance_metrics']
      },
      
      // Productivity Report
      'productivity': {
        name: 'Productivity Report',
        description: 'Staff and equipment productivity analysis',
        sections: ['staff_productivity', 'equipment_utilization', 'efficiency_trends'],
        charts: ['productivity_trends', 'utilization_rates', 'efficiency_metrics'],
        dataQueries: ['staff_metrics', 'equipment_metrics', 'productivity_data']
      },
      
      // Compliance Report
      'compliance': {
        name: 'Compliance Report',
        description: 'Regulatory compliance and audit trail',
        sections: ['compliance_overview', 'audit_findings', 'corrective_actions'],
        charts: ['compliance_trends', 'audit_results', 'action_status'],
        dataQueries: ['audit_data', 'compliance_metrics', 'corrective_actions']
      }
    };
  }

  // Report Generation Methods
  async generateReport(reportType, options = {}) {
    const reportId = this.generateReportId();
    const startTime = Date.now();

    try {
      logger.info('Starting report generation', { reportId, reportType, options });

      // Check cache first
      const cacheKey = this.generateCacheKey(reportType, options);
      if (this.config.performance.cacheResults) {
        const cached = this.getCachedReport(cacheKey);
        if (cached) {
          this.metrics.cacheHits++;
          return cached;
        }
        this.metrics.cacheMisses++;
      }

      // Validate report type
      const template = this.reportTemplates[reportType];
      if (!template) {
        throw new Error(`Unknown report type: ${reportType}`);
      }

      // Create report job
      const job = {
        id: reportId,
        type: reportType,
        template,
        options,
        status: 'started',
        startTime,
        progress: 0,
        sections: [],
        errors: []
      };

      this.activeReports.set(reportId, job);

      // Generate report data
      const reportData = await this.collectReportData(template, options, job);
      
      // Generate charts
      const charts = await this.generateCharts(template, reportData, options, job);
      
      // Generate report in requested formats
      const outputs = await this.generateReportOutputs(template, reportData, charts, options, job);

      // Complete job
      job.status = 'completed';
      job.endTime = Date.now();
      job.processingTime = job.endTime - job.startTime;
      job.outputs = outputs;

      // Update metrics
      this.updateMetrics(job);

      // Cache result
      if (this.config.performance.cacheResults) {
        this.cacheReport(cacheKey, outputs);
      }

      // Cleanup
      this.activeReports.delete(reportId);

      logger.info('Report generation completed', {
        reportId,
        reportType,
        processingTime: job.processingTime,
        formats: Object.keys(outputs)
      });

      return {
        reportId,
        type: reportType,
        outputs,
        processingTime: job.processingTime,
        generatedAt: new Date(job.endTime).toISOString()
      };

    } catch (error) {
      const job = this.activeReports.get(reportId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.endTime = Date.now();
        this.activeReports.delete(reportId);
      }

      this.metrics.errorCount++;
      logger.error('Report generation failed', { reportId, reportType, error: error.message });
      throw error;
    }
  }

  async collectReportData(template, options, job) {
    const reportData = {};
    const { startDate, endDate, filters = {} } = options;

    job.progress = 10;

    // Execute data queries for each required dataset
    for (const queryName of template.dataQueries) {
      try {
        job.progress += 30 / template.dataQueries.length;
        
        const query = this.buildDataQuery(queryName, { startDate, endDate, filters });
        const data = await this.executeQuery(query);
        
        reportData[queryName] = data;
        
        logger.debug('Data collected for report', {
          reportId: job.id,
          queryName,
          recordCount: data.length
        });

      } catch (error) {
        job.errors.push({
          section: queryName,
          error: error.message
        });
        logger.warn('Failed to collect data for report section', {
          reportId: job.id,
          queryName,
          error: error.message
        });
      }
    }

    // Process and analyze data
    const processedData = await this.processReportData(reportData, template, options);
    
    job.progress = 40;
    return processedData;
  }

  buildDataQuery(queryName, options) {
    const { startDate, endDate, filters } = options;
    
    const queries = {
      sample_stats: {
        sql: `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_samples,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_samples,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_samples,
            AVG(CASE WHEN workflow_status = 'completed' 
                THEN julianday(updated_at) - julianday(created_at) END) as avg_turnaround_days
          FROM samples 
          WHERE created_at BETWEEN ? AND ?
          GROUP BY DATE(created_at)
          ORDER BY date
        `,
        params: [startDate || '2023-01-01', endDate || new Date().toISOString()]
      },
      
      batch_stats: {
        sql: `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as total_batches,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_batches,
            AVG(total_samples) as avg_batch_size,
            AVG(CASE WHEN status = 'completed' 
                THEN julianday(updated_at) - julianday(created_at) END) as avg_processing_days
          FROM batches 
          WHERE created_at BETWEEN ? AND ?
          GROUP BY DATE(created_at)
          ORDER BY date
        `,
        params: [startDate || '2023-01-01', endDate || new Date().toISOString()]
      },
      
      quality_stats: {
        sql: `
          SELECT 
            qc_type,
            result,
            COUNT(*) as count,
            DATE(created_at) as date
          FROM quality_control 
          WHERE created_at BETWEEN ? AND ?
          GROUP BY qc_type, result, DATE(created_at)
          ORDER BY date, qc_type
        `,
        params: [startDate || '2023-01-01', endDate || new Date().toISOString()]
      },
      
      performance_stats: {
        sql: `
          SELECT 
            operator,
            COUNT(*) as batches_processed,
            AVG(total_samples) as avg_samples_per_batch,
            AVG(CASE WHEN status = 'completed' 
                THEN julianday(updated_at) - julianday(created_at) END) as avg_processing_time
          FROM batches 
          WHERE created_at BETWEEN ? AND ? AND operator IS NOT NULL
          GROUP BY operator
          ORDER BY batches_processed DESC
        `,
        params: [startDate || '2023-01-01', endDate || new Date().toISOString()]
      }
    };

    return queries[queryName] || { sql: 'SELECT 1', params: [] };
  }

  async executeQuery(query) {
    // This would use your database service
    // For now, return mock data
    const mockData = this.generateMockData(query.sql);
    return mockData;
  }

  generateMockData(sql) {
    // Generate appropriate mock data based on query type
    if (sql.includes('sample_stats')) {
      return this.generateSampleStatsData();
    } else if (sql.includes('batch_stats')) {
      return this.generateBatchStatsData();
    } else if (sql.includes('quality_stats')) {
      return this.generateQualityStatsData();
    } else if (sql.includes('performance_stats')) {
      return this.generatePerformanceStatsData();
    }
    
    return [];
  }

  generateSampleStatsData() {
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        total_samples: Math.floor(Math.random() * 50) + 10,
        completed_samples: Math.floor(Math.random() * 40) + 8,
        failed_samples: Math.floor(Math.random() * 3),
        avg_turnaround_days: Math.random() * 3 + 1
      });
    }
    
    return data;
  }

  generateBatchStatsData() {
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        total_batches: Math.floor(Math.random() * 10) + 1,
        completed_batches: Math.floor(Math.random() * 8) + 1,
        avg_batch_size: Math.floor(Math.random() * 20) + 5,
        avg_processing_days: Math.random() * 2 + 0.5
      });
    }
    
    return data;
  }

  generateQualityStatsData() {
    const data = [];
    const qcTypes = ['Positive Control', 'Negative Control', 'Blank', 'Standard'];
    const results = ['Pass', 'Fail', 'Warning'];
    
    for (let i = 0; i < 20; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      for (const qcType of qcTypes) {
        for (const result of results) {
          data.push({
            qc_type: qcType,
            result: result,
            count: Math.floor(Math.random() * 10) + 1,
            date: date.toISOString().split('T')[0]
          });
        }
      }
    }
    
    return data;
  }

  generatePerformanceStatsData() {
    const operators = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson'];
    const data = [];
    
    for (const operator of operators) {
      data.push({
        operator,
        batches_processed: Math.floor(Math.random() * 50) + 10,
        avg_samples_per_batch: Math.floor(Math.random() * 20) + 5,
        avg_processing_time: Math.random() * 2 + 1
      });
    }
    
    return data;
  }

  async processReportData(rawData, template, options) {
    const processedData = {
      summary: {},
      trends: {},
      analysis: {},
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          startDate: options.startDate,
          endDate: options.endDate
        },
        reportType: template.name
      }
    };

    // Process sample statistics
    if (rawData.sample_stats) {
      const sampleData = rawData.sample_stats;
      processedData.summary.samples = {
        total: sampleData.reduce((sum, row) => sum + row.total_samples, 0),
        completed: sampleData.reduce((sum, row) => sum + row.completed_samples, 0),
        failed: sampleData.reduce((sum, row) => sum + row.failed_samples, 0),
        avgTurnaroundTime: this.calculateAverage(sampleData, 'avg_turnaround_days')
      };
      
      processedData.trends.samples = this.calculateTrends(sampleData, 'total_samples');
    }

    // Process batch statistics
    if (rawData.batch_stats) {
      const batchData = rawData.batch_stats;
      processedData.summary.batches = {
        total: batchData.reduce((sum, row) => sum + row.total_batches, 0),
        completed: batchData.reduce((sum, row) => sum + row.completed_batches, 0),
        avgSize: this.calculateAverage(batchData, 'avg_batch_size'),
        avgProcessingTime: this.calculateAverage(batchData, 'avg_processing_days')
      };
      
      processedData.trends.batches = this.calculateTrends(batchData, 'total_batches');
    }

    // Process quality statistics
    if (rawData.quality_stats) {
      processedData.summary.quality = this.processQualityData(rawData.quality_stats);
    }

    // Process performance statistics
    if (rawData.performance_stats) {
      processedData.summary.performance = this.processPerformanceData(rawData.performance_stats);
    }

    return processedData;
  }

  calculateAverage(data, field) {
    const values = data.map(row => row[field]).filter(val => val !== null && val !== undefined);
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  calculateTrends(data, field) {
    if (data.length < 2) return { direction: 'stable', change: 0 };
    
    const firstValue = data[0][field];
    const lastValue = data[data.length - 1][field];
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      change: Math.round(change * 100) / 100,
      firstValue,
      lastValue
    };
  }

  processQualityData(qualityData) {
    const summary = {
      totalTests: 0,
      passRate: 0,
      failRate: 0,
      byType: {}
    };

    const grouped = qualityData.reduce((acc, row) => {
      const key = `${row.qc_type}_${row.result}`;
      acc[key] = (acc[key] || 0) + row.count;
      return acc;
    }, {});

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [key, count] of Object.entries(grouped)) {
      const [type, result] = key.split('_');
      
      if (!summary.byType[type]) {
        summary.byType[type] = { pass: 0, fail: 0, warning: 0 };
      }
      
      summary.byType[type][result.toLowerCase()] = count;
      summary.totalTests += count;
      
      if (result === 'Pass') totalPassed += count;
      if (result === 'Fail') totalFailed += count;
    }

    summary.passRate = summary.totalTests > 0 ? (totalPassed / summary.totalTests) * 100 : 0;
    summary.failRate = summary.totalTests > 0 ? (totalFailed / summary.totalTests) * 100 : 0;

    return summary;
  }

  processPerformanceData(performanceData) {
    const summary = {
      totalOperators: performanceData.length,
      topPerformer: null,
      avgBatchesPerOperator: 0,
      avgSamplesPerBatch: 0,
      operators: performanceData
    };

    if (performanceData.length > 0) {
      summary.topPerformer = performanceData[0]; // Already sorted by batches_processed
      summary.avgBatchesPerOperator = this.calculateAverage(performanceData, 'batches_processed');
      summary.avgSamplesPerBatch = this.calculateAverage(performanceData, 'avg_samples_per_batch');
    }

    return summary;
  }

  // Chart Generation Methods
  async generateCharts(template, reportData, options, job) {
    const charts = {};
    
    job.progress = 50;

    for (const chartType of template.charts) {
      try {
        const chartConfig = this.getChartConfig(chartType, reportData, options);
        const chartBuffer = await this.chartCanvas.renderToBuffer(chartConfig);
        
        charts[chartType] = {
          type: chartType,
          buffer: chartBuffer,
          config: chartConfig
        };

        job.progress += 20 / template.charts.length;

      } catch (error) {
        job.errors.push({
          section: 'charts',
          chart: chartType,
          error: error.message
        });
        logger.warn('Failed to generate chart', {
          reportId: job.id,
          chartType,
          error: error.message
        });
      }
    }

    return charts;
  }

  getChartConfig(chartType, reportData, options) {
    switch (chartType) {
      case 'sample_trends':
        return this.createSampleTrendsChart(reportData);
      case 'batch_completion':
        return this.createBatchCompletionChart(reportData);
      case 'quality_indicators':
        return this.createQualityIndicatorsChart(reportData);
      case 'turnaround_times':
        return this.createTurnaroundTimesChart(reportData);
      case 'workflow_stages':
        return this.createWorkflowStagesChart(reportData);
      case 'processing_times':
        return this.createProcessingTimesChart(reportData);
      case 'failure_rates':
        return this.createFailureRatesChart(reportData);
      default:
        throw new Error(`Unknown chart type: ${chartType}`);
    }
  }

  createSampleTrendsChart(reportData) {
    const sampleStats = reportData.sample_stats || [];
    
    return {
      type: 'line',
      data: {
        labels: sampleStats.map(row => row.date),
        datasets: [
          {
            label: 'Total Samples',
            data: sampleStats.map(row => row.total_samples),
            borderColor: this.config.charts.defaultColors[0],
            backgroundColor: this.config.charts.defaultColors[0] + '20',
            tension: 0.4
          },
          {
            label: 'Completed Samples',
            data: sampleStats.map(row => row.completed_samples),
            borderColor: this.config.charts.defaultColors[1],
            backgroundColor: this.config.charts.defaultColors[1] + '20',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Sample Processing Trends'
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Samples'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    };
  }

  createBatchCompletionChart(reportData) {
    const batchStats = reportData.batch_stats || [];
    
    return {
      type: 'bar',
      data: {
        labels: batchStats.map(row => row.date),
        datasets: [
          {
            label: 'Total Batches',
            data: batchStats.map(row => row.total_batches),
            backgroundColor: this.config.charts.defaultColors[0] + '80'
          },
          {
            label: 'Completed Batches',
            data: batchStats.map(row => row.completed_batches),
            backgroundColor: this.config.charts.defaultColors[1] + '80'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Batch Completion Status'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Batches'
            }
          }
        }
      }
    };
  }

  createQualityIndicatorsChart(reportData) {
    const qualityData = reportData.summary?.quality || {};
    
    return {
      type: 'doughnut',
      data: {
        labels: ['Pass', 'Fail', 'Warning'],
        datasets: [{
          data: [
            qualityData.passRate || 0,
            qualityData.failRate || 0,
            100 - (qualityData.passRate || 0) - (qualityData.failRate || 0)
          ],
          backgroundColor: [
            this.config.charts.defaultColors[2],
            this.config.charts.defaultColors[1],
            this.config.charts.defaultColors[3]
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Quality Control Results'
          },
          legend: {
            position: 'right'
          }
        }
      }
    };
  }

  createTurnaroundTimesChart(reportData) {
    const sampleStats = reportData.sample_stats || [];
    
    return {
      type: 'line',
      data: {
        labels: sampleStats.map(row => row.date),
        datasets: [{
          label: 'Average Turnaround Time (days)',
          data: sampleStats.map(row => row.avg_turnaround_days),
          borderColor: this.config.charts.defaultColors[4],
          backgroundColor: this.config.charts.defaultColors[4] + '20',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Sample Turnaround Times'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Days'
            }
          }
        }
      }
    };
  }

  createWorkflowStagesChart(reportData) {
    // Mock workflow stage data
    const stages = ['Collection', 'Processing', 'Analysis', 'Review', 'Complete'];
    const counts = [100, 85, 70, 60, 55];
    
    return {
      type: 'bar',
      data: {
        labels: stages,
        datasets: [{
          label: 'Samples in Stage',
          data: counts,
          backgroundColor: this.config.charts.defaultColors.slice(0, stages.length)
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Workflow Stage Distribution'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Samples'
            }
          }
        }
      }
    };
  }

  createProcessingTimesChart(reportData) {
    const performanceData = reportData.performance_stats || [];
    
    return {
      type: 'bar',
      data: {
        labels: performanceData.map(row => row.operator),
        datasets: [{
          label: 'Average Processing Time (days)',
          data: performanceData.map(row => row.avg_processing_time),
          backgroundColor: this.config.charts.defaultColors[0] + '80'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Processing Times by Operator'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Days'
            }
          }
        }
      }
    };
  }

  createFailureRatesChart(reportData) {
    const sampleStats = reportData.sample_stats || [];
    
    return {
      type: 'line',
      data: {
        labels: sampleStats.map(row => row.date),
        datasets: [{
          label: 'Failure Rate (%)',
          data: sampleStats.map(row => {
            const total = row.total_samples || 1;
            return ((row.failed_samples || 0) / total) * 100;
          }),
          borderColor: this.config.charts.defaultColors[1],
          backgroundColor: this.config.charts.defaultColors[1] + '20',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Sample Failure Rate Trends'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Failure Rate (%)'
            }
          }
        }
      }
    };
  }

  // Output Generation Methods
  async generateReportOutputs(template, reportData, charts, options, job) {
    const outputs = {};
    const formats = options.formats || this.config.output.formats;
    
    job.progress = 70;

    for (const format of formats) {
      try {
        const output = await this.generateReportOutput(format, template, reportData, charts, options);
        outputs[format] = output;
        
        job.progress += 20 / formats.length;

      } catch (error) {
        job.errors.push({
          section: 'output',
          format,
          error: error.message
        });
        logger.warn('Failed to generate report output', {
          reportId: job.id,
          format,
          error: error.message
        });
      }
    }

    return outputs;
  }

  async generateReportOutput(format, template, reportData, charts, options) {
    switch (format) {
      case 'pdf':
        return await this.generatePDFReport(template, reportData, charts, options);
      case 'xlsx':
        return await this.generateExcelReport(template, reportData, charts, options);
      case 'html':
        return await this.generateHTMLReport(template, reportData, charts, options);
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }
  }

  async generatePDFReport(template, reportData, charts, options) {
    const fileName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(this.config.output.directory, fileName);
    
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    doc.pipe(fs.createWriteStream(filePath));

    // Title page
    doc.fontSize(20).text(template.name, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${reportData.metadata.generatedAt}`, { align: 'center' });
    doc.moveDown(2);

    // Executive Summary
    doc.fontSize(16).text('Executive Summary', { underline: true });
    doc.moveDown();
    
    if (reportData.summary.samples) {
      const samples = reportData.summary.samples;
      doc.fontSize(12)
         .text(`Total Samples Processed: ${samples.total}`)
         .text(`Completion Rate: ${((samples.completed / samples.total) * 100).toFixed(1)}%`)
         .text(`Average Turnaround Time: ${samples.avgTurnaroundTime.toFixed(1)} days`);
      doc.moveDown();
    }

    // Add charts
    for (const [chartType, chartData] of Object.entries(charts)) {
      doc.addPage();
      doc.fontSize(14).text(chartType.replace(/_/g, ' ').toUpperCase(), { underline: true });
      doc.moveDown();
      
      // Add chart image
      doc.image(chartData.buffer, {
        fit: [500, 300],
        align: 'center'
      });
      doc.moveDown();
    }

    // Data tables
    if (reportData.summary.performance) {
      doc.addPage();
      doc.fontSize(14).text('Performance Summary', { underline: true });
      doc.moveDown();
      
      const performance = reportData.summary.performance;
      doc.fontSize(10);
      
      // Table headers
      const headers = ['Operator', 'Batches', 'Avg Samples/Batch', 'Avg Processing Time'];
      let yPos = doc.y;
      const colWidth = 100;
      
      headers.forEach((header, index) => {
        doc.text(header, 50 + (index * colWidth), yPos, { width: colWidth });
      });
      
      doc.moveDown();
      
      // Table data
      performance.operators.forEach(operator => {
        yPos = doc.y;
        const values = [
          operator.operator,
          operator.batches_processed.toString(),
          operator.avg_samples_per_batch.toFixed(1),
          operator.avg_processing_time.toFixed(1) + ' days'
        ];
        
        values.forEach((value, index) => {
          doc.text(value, 50 + (index * colWidth), yPos, { width: colWidth });
        });
        
        doc.moveDown(0.5);
      });
    }

    // Add watermark if enabled
    if (this.config.output.watermark) {
      this.addPDFWatermark(doc);
    }

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });

    const stats = fs.statSync(filePath);
    return {
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType: 'application/pdf'
    };
  }

  async generateExcelReport(template, reportData, charts, options) {
    const fileName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
    const filePath = path.join(this.config.output.directory, fileName);
    
    const workbook = new ExcelJS.Workbook();
    
    // Summary worksheet
    const summaryWs = workbook.addWorksheet('Summary');
    
    summaryWs.addRow([template.name]);
    summaryWs.addRow(['Generated:', reportData.metadata.generatedAt]);
    summaryWs.addRow([]); // Empty row
    
    // Add summary data
    if (reportData.summary.samples) {
      const samples = reportData.summary.samples;
      summaryWs.addRow(['Sample Summary']);
      summaryWs.addRow(['Total Samples:', samples.total]);
      summaryWs.addRow(['Completed Samples:', samples.completed]);
      summaryWs.addRow(['Failed Samples:', samples.failed]);
      summaryWs.addRow(['Completion Rate:', `${((samples.completed / samples.total) * 100).toFixed(1)}%`]);
      summaryWs.addRow(['Average Turnaround Time:', `${samples.avgTurnaroundTime.toFixed(1)} days`]);
      summaryWs.addRow([]);
    }

    // Raw data worksheets
    if (reportData.sample_stats) {
      const dataWs = workbook.addWorksheet('Sample Data');
      const sampleData = reportData.sample_stats;
      
      // Headers
      dataWs.addRow(['Date', 'Total Samples', 'Completed Samples', 'Failed Samples', 'Avg Turnaround Days']);
      
      // Data rows
      sampleData.forEach(row => {
        dataWs.addRow([row.date, row.total_samples, row.completed_samples, row.failed_samples, row.avg_turnaround_days]);
      });
      
      // Style headers
      const headerRow = dataWs.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // Performance data
    if (reportData.performance_stats) {
      const perfWs = workbook.addWorksheet('Performance Data');
      const perfData = reportData.performance_stats;
      
      perfWs.addRow(['Operator', 'Batches Processed', 'Avg Samples per Batch', 'Avg Processing Time']);
      
      perfData.forEach(row => {
        perfWs.addRow([row.operator, row.batches_processed, row.avg_samples_per_batch, row.avg_processing_time]);
      });
      
      // Style headers
      const headerRow = perfWs.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // Auto-fit columns
    workbook.worksheets.forEach(worksheet => {
      worksheet.columns.forEach(column => {
        column.width = Math.max(column.width || 10, 15);
      });
    });

    await workbook.xlsx.writeFile(filePath);
    
    const stats = fs.statSync(filePath);
    return {
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  async generateHTMLReport(template, reportData, charts, options) {
    const fileName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.html`;
    const filePath = path.join(this.config.output.directory, fileName);
    
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .chart { text-align: center; margin: 30px 0; }
        .chart img { max-width: 100%; height: auto; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metric { display: inline-block; margin: 10px 20px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .metric-label { font-size: 14px; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${template.name}</h1>
        <p>Generated: ${reportData.metadata.generatedAt}</p>
    </div>
`;

    // Executive Summary
    if (reportData.summary.samples) {
      const samples = reportData.summary.samples;
      html += `
    <div class="summary">
        <h2>Executive Summary</h2>
        <div class="metric">
            <div class="metric-value">${samples.total}</div>
            <div class="metric-label">Total Samples</div>
        </div>
        <div class="metric">
            <div class="metric-value">${((samples.completed / samples.total) * 100).toFixed(1)}%</div>
            <div class="metric-label">Completion Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${samples.avgTurnaroundTime.toFixed(1)}</div>
            <div class="metric-label">Avg Turnaround (days)</div>
        </div>
    </div>
`;
    }

    // Charts
    for (const [chartType, chartData] of Object.entries(charts)) {
      const base64Image = chartData.buffer.toString('base64');
      html += `
    <div class="chart">
        <h3>${chartType.replace(/_/g, ' ').toUpperCase()}</h3>
        <img src="data:image/png;base64,${base64Image}" alt="${chartType}">
    </div>
`;
    }

    // Performance table
    if (reportData.summary.performance) {
      const performance = reportData.summary.performance;
      html += `
    <h3>Performance Summary</h3>
    <table>
        <thead>
            <tr>
                <th>Operator</th>
                <th>Batches Processed</th>
                <th>Avg Samples/Batch</th>
                <th>Avg Processing Time</th>
            </tr>
        </thead>
        <tbody>
`;
      
      performance.operators.forEach(operator => {
        html += `
            <tr>
                <td>${operator.operator}</td>
                <td>${operator.batches_processed}</td>
                <td>${operator.avg_samples_per_batch.toFixed(1)}</td>
                <td>${operator.avg_processing_time.toFixed(1)} days</td>
            </tr>
`;
      });
      
      html += `
        </tbody>
    </table>
`;
    }

    html += `
</body>
</html>
`;

    fs.writeFileSync(filePath, html);
    
    const stats = fs.statSync(filePath);
    return {
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType: 'text/html'
    };
  }

  addPDFWatermark(doc) {
    doc.save()
       .rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] })
       .fontSize(50)
       .fillColor('gray', 0.1)
       .text('CONFIDENTIAL', doc.page.width / 2 - 100, doc.page.height / 2, {
         align: 'center'
       })
       .restore();
  }

  // Utility Methods
  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  generateCacheKey(reportType, options) {
    const keyData = {
      type: reportType,
      startDate: options.startDate,
      endDate: options.endDate,
      filters: options.filters
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  getCachedReport(cacheKey) {
    const cached = this.reportCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.performance.cacheDuration) {
      return cached.data;
    }
    
    if (cached) {
      this.reportCache.delete(cacheKey);
    }
    
    return null;
  }

  cacheReport(cacheKey, data) {
    this.reportCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  updateMetrics(job) {
    this.metrics.reportsGenerated++;
    this.metrics.totalProcessingTime += job.processingTime;
    this.metrics.avgProcessingTime = this.metrics.totalProcessingTime / this.metrics.reportsGenerated;
    
    const reportType = job.type;
    this.metrics.reportTypes[reportType] = (this.metrics.reportTypes[reportType] || 0) + 1;
    
    // Update popular reports
    const currentCount = this.metrics.popularReports.get(reportType) || 0;
    this.metrics.popularReports.set(reportType, currentCount + 1);
  }

  // Management Methods
  getReportStatus(reportId) {
    return this.activeReports.get(reportId) || null;
  }

  getActiveReports() {
    return Array.from(this.activeReports.values());
  }

  getAvailableReportTypes() {
    return Object.keys(this.reportTemplates).map(key => ({
      type: key,
      ...this.reportTemplates[key]
    }));
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeReports: this.activeReports.size,
      cacheSize: this.reportCache.size,
      popularReports: Object.fromEntries(this.metrics.popularReports),
      timestamp: new Date().toISOString()
    };
  }

  async cleanup(olderThanDays = 7) {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Clean up old report files
    const files = fs.readdirSync(this.config.output.directory);
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(this.config.output.directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    // Clean up cache
    for (const [key, cached] of this.reportCache) {
      if (cached.timestamp < cutoffTime) {
        this.reportCache.delete(key);
      }
    }
    
    logger.info('Reporting service cleanup completed', {
      deletedFiles: deletedCount,
      cacheSize: this.reportCache.size
    });
  }
}

module.exports = ReportingService;