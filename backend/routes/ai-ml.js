const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { ResponseHandler } = require('../utils/responseHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get database connection
const dbPath = path.join(__dirname, '..', 'database', 'ashley_lims.db');
const db = new Database(dbPath);

// Predictive Maintenance endpoints

// Get equipment sensors and their current status
router.get('/predictive-maintenance/sensors', async (req, res) => {
  try {
    const { equipment_id } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (equipment_id) {
      whereClause = 'WHERE es.equipment_id = ?';
      params.push(equipment_id);
    }

    const query = `
      SELECT 
        es.*,
        e.equipment_name,
        e.status as equipment_status,
        (
          SELECT sr.reading_value
          FROM sensor_readings sr
          WHERE sr.sensor_id = es.id
          ORDER BY sr.reading_timestamp DESC
          LIMIT 1
        ) as latest_reading,
        (
          SELECT sr.reading_timestamp
          FROM sensor_readings sr
          WHERE sr.sensor_id = es.id
          ORDER BY sr.reading_timestamp DESC
          LIMIT 1
        ) as latest_reading_time,
        (
          SELECT COUNT(*)
          FROM sensor_readings sr
          WHERE sr.sensor_id = es.id
            AND sr.reading_timestamp >= datetime('now', '-24 hours')
            AND sr.status != 'normal'
        ) as alerts_24h
      FROM equipment_sensors es
      JOIN equipment e ON es.equipment_id = e.id
      ${whereClause}
      AND es.active = TRUE
      ORDER BY e.equipment_name, es.sensor_name
    `;

    const sensors = db.prepare(query).all(...params);
    ResponseHandler.success(res, sensors);
  } catch (error) {
    logger.error('Error fetching sensors', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch sensors', error);
  }
});

// Add sensor readings (bulk upload)
router.post('/predictive-maintenance/readings', async (req, res) => {
  try {
    const { readings } = req.body;
    
    if (!Array.isArray(readings) || readings.length === 0) {
      return ResponseHandler.error(res, 'Readings array is required', null, 400);
    }

    const transaction = db.transaction(() => {
      const insertQuery = `
        INSERT INTO sensor_readings (sensor_id, reading_value, reading_timestamp, batch_id, status)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const insertStmt = db.prepare(insertQuery);
      const results = [];

      for (const reading of readings) {
        const { sensor_id, reading_value, reading_timestamp, batch_id } = reading;
        
        // Get sensor thresholds to determine status
        const sensor = db.prepare('SELECT * FROM equipment_sensors WHERE id = ?').get(sensor_id);
        if (!sensor) {
          continue; // Skip invalid sensor IDs
        }

        let status = 'normal';
        if (sensor.critical_threshold_min !== null && reading_value < sensor.critical_threshold_min) {
          status = 'critical';
        } else if (sensor.critical_threshold_max !== null && reading_value > sensor.critical_threshold_max) {
          status = 'critical';
        } else if (sensor.warning_threshold_min !== null && reading_value < sensor.warning_threshold_min) {
          status = 'warning';
        } else if (sensor.warning_threshold_max !== null && reading_value > sensor.warning_threshold_max) {
          status = 'warning';
        }

        const result = insertStmt.run(
          sensor_id, reading_value, reading_timestamp || new Date().toISOString(),
          batch_id, status
        );
        
        results.push({ id: result.lastInsertRowid, sensor_id, status });
      }

      return results;
    });

    const insertedReadings = transaction();

    logger.info('Sensor readings added', { count: insertedReadings.length });
    ResponseHandler.success(res, insertedReadings, 'Sensor readings added successfully', 201);
  } catch (error) {
    logger.error('Error adding sensor readings', { error: error.message });
    ResponseHandler.error(res, 'Failed to add sensor readings', error);
  }
});

// Get maintenance predictions
router.get('/predictive-maintenance/predictions', async (req, res) => {
  try {
    const { equipment_id, days_ahead = 90, acknowledged = 'false' } = req.query;
    
    let whereClause = 'WHERE mp.predicted_date >= date("now")';
    const params = [];

    if (equipment_id) {
      whereClause += ' AND mp.equipment_id = ?';
      params.push(equipment_id);
    }

    if (days_ahead) {
      whereClause += ' AND mp.predicted_date <= date("now", "+' + parseInt(days_ahead) + ' days")';
    }

    if (acknowledged === 'false') {
      whereClause += ' AND mp.acknowledged = FALSE';
    }

    const query = `
      SELECT 
        mp.*,
        e.equipment_name,
        e.equipment_id as equipment_code,
        e.location,
        julianday(mp.predicted_date) - julianday('now') as days_until_predicted
      FROM maintenance_predictions mp
      JOIN equipment e ON mp.equipment_id = e.id
      ${whereClause}
      ORDER BY mp.predicted_date ASC, mp.risk_level DESC
    `;

    const predictions = db.prepare(query).all(...params);
    ResponseHandler.success(res, predictions);
  } catch (error) {
    logger.error('Error fetching maintenance predictions', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch maintenance predictions', error);
  }
});

// Generate maintenance predictions (AI simulation)
router.post('/predictive-maintenance/generate-predictions', async (req, res) => {
  try {
    const { equipment_id, prediction_type = 'maintenance_due' } = req.body;
    
    // This is a simplified AI simulation - in production, this would involve actual ML models
    const predictions = [];
    
    // Get equipment that needs predictions
    let equipmentQuery = 'SELECT * FROM equipment WHERE status = "active"';
    const params = [];
    
    if (equipment_id) {
      equipmentQuery += ' AND id = ?';
      params.push(equipment_id);
    }
    
    const equipment = db.prepare(equipmentQuery).all(...params);

    const transaction = db.transaction(() => {
      for (const equip of equipment) {
        // Simulate AI prediction based on recent sensor data and historical patterns
        const sensorData = db.prepare(`
          SELECT 
            AVG(reading_value) as avg_reading,
            COUNT(CASE WHEN status != 'normal' THEN 1 END) as alert_count,
            COUNT(*) as total_readings
          FROM sensor_readings sr
          JOIN equipment_sensors es ON sr.sensor_id = es.id
          WHERE es.equipment_id = ?
            AND sr.reading_timestamp >= datetime('now', '-30 days')
        `).get(equip.id);

        if (sensorData && sensorData.total_readings > 0) {
          // Simple risk calculation based on alert frequency
          const alertRate = sensorData.alert_count / sensorData.total_readings;
          let riskLevel = 'low';
          let daysAhead = 90;
          let confidence = 0.7;

          if (alertRate > 0.1) {
            riskLevel = 'high';
            daysAhead = 14;
            confidence = 0.9;
          } else if (alertRate > 0.05) {
            riskLevel = 'medium';
            daysAhead = 30;
            confidence = 0.8;
          }

          const predictedDate = new Date();
          predictedDate.setDate(predictedDate.getDate() + daysAhead);

          const recommendation = generateMaintenanceRecommendation(equip, riskLevel, alertRate);

          const insertQuery = `
            INSERT INTO maintenance_predictions (
              equipment_id, prediction_type, predicted_date, confidence_score,
              risk_level, recommendation, model_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

          const result = db.prepare(insertQuery).run(
            equip.id, prediction_type, predictedDate.toISOString().split('T')[0],
            confidence, riskLevel, recommendation, 'v1.0-simulation'
          );

          predictions.push({
            id: result.lastInsertRowid,
            equipment_name: equip.equipment_name,
            predicted_date: predictedDate.toISOString().split('T')[0],
            risk_level: riskLevel,
            confidence_score: confidence
          });
        }
      }
    });

    transaction();

    logger.info('Maintenance predictions generated', { count: predictions.length });
    ResponseHandler.success(res, predictions, 'Maintenance predictions generated successfully', 201);
  } catch (error) {
    logger.error('Error generating maintenance predictions', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate maintenance predictions', error);
  }
});

// Acknowledge maintenance prediction
router.patch('/predictive-maintenance/predictions/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledged_by, notes } = req.body;

    if (!acknowledged_by) {
      return ResponseHandler.error(res, 'acknowledged_by is required', null, 400);
    }

    const query = `
      UPDATE maintenance_predictions 
      SET acknowledged = TRUE, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = db.prepare(query).run(acknowledged_by, id);

    if (result.changes === 0) {
      return ResponseHandler.notFound(res, 'Maintenance prediction not found');
    }

    const updatedPrediction = db.prepare('SELECT * FROM maintenance_predictions WHERE id = ?').get(id);

    logger.info('Maintenance prediction acknowledged', { id, acknowledgedBy: acknowledged_by });
    ResponseHandler.success(res, updatedPrediction, 'Prediction acknowledged successfully');
  } catch (error) {
    logger.error('Error acknowledging prediction', { error: error.message });
    ResponseHandler.error(res, 'Failed to acknowledge prediction', error);
  }
});

// Quality Control Anomaly Detection endpoints

// Get QC anomalies
router.get('/anomaly-detection/qc-anomalies', async (req, res) => {
  try {
    const { batch_id, severity, reviewed = 'all', days = 30 } = req.query;
    
    let whereClause = 'WHERE qa.detection_date >= date("now", "-' + parseInt(days) + ' days")';
    const params = [];

    if (batch_id) {
      whereClause += ' AND qa.batch_id = ?';
      params.push(batch_id);
    }

    if (severity && severity !== 'all') {
      whereClause += ' AND qa.severity = ?';
      params.push(severity);
    }

    if (reviewed === 'false') {
      whereClause += ' AND qa.reviewed = FALSE';
    } else if (reviewed === 'true') {
      whereClause += ' AND qa.reviewed = TRUE';
    }

    const query = `
      SELECT 
        qa.*,
        qp.pattern_name,
        qp.description as pattern_description,
        b.batch_number,
        s.lab_number as sample_lab_number
      FROM qc_anomalies qa
      LEFT JOIN qc_patterns qp ON qa.pattern_id = qp.id
      LEFT JOIN batches b ON qa.batch_id = b.id
      LEFT JOIN samples s ON qa.sample_id = s.id
      ${whereClause}
      ORDER BY qa.detection_date DESC, qa.severity DESC
    `;

    const anomalies = db.prepare(query).all(...params);
    ResponseHandler.success(res, anomalies);
  } catch (error) {
    logger.error('Error fetching QC anomalies', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch QC anomalies', error);
  }
});

// Run anomaly detection on recent data
router.post('/anomaly-detection/scan', async (req, res) => {
  try {
    const { batch_ids, pattern_ids } = req.body;
    
    // This is a simulation of anomaly detection - in production, this would use actual ML algorithms
    const detectedAnomalies = [];
    
    // Get active QC patterns
    let patternsQuery = 'SELECT * FROM qc_patterns WHERE active = TRUE';
    const patternParams = [];
    
    if (pattern_ids && pattern_ids.length > 0) {
      patternsQuery += ' AND id IN (' + pattern_ids.map(() => '?').join(',') + ')';
      patternParams.push(...pattern_ids);
    }
    
    const patterns = db.prepare(patternsQuery).all(...patternParams);
    
    // Get recent batches to analyze
    let batchQuery = 'SELECT * FROM batches WHERE created_at >= date("now", "-7 days")';
    const batchParams = [];
    
    if (batch_ids && batch_ids.length > 0) {
      batchQuery += ' AND id IN (' + batch_ids.map(() => '?').join(',') + ')';
      batchParams.push(...batch_ids);
    }
    
    const batches = db.prepare(batchQuery).all(...batchParams);

    const transaction = db.transaction(() => {
      for (const batch of batches) {
        for (const pattern of patterns) {
          // Simulate anomaly detection based on pattern type
          const anomaly = simulateAnomalyDetection(batch, pattern);
          
          if (anomaly.detected) {
            const insertQuery = `
              INSERT INTO qc_anomalies (
                batch_id, metric_type, anomaly_type, severity, confidence_score,
                detected_value, expected_value, threshold_value, pattern_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = db.prepare(insertQuery).run(
              batch.id, anomaly.metric_type, pattern.pattern_type, anomaly.severity,
              anomaly.confidence_score, anomaly.detected_value, anomaly.expected_value,
              anomaly.threshold_value, pattern.id
            );

            detectedAnomalies.push({
              id: result.lastInsertRowid,
              batch_id: batch.id,
              batch_number: batch.batch_number,
              pattern_name: pattern.pattern_name,
              severity: anomaly.severity,
              confidence_score: anomaly.confidence_score
            });
          }
        }
      }
    });

    transaction();

    logger.info('Anomaly detection scan completed', { 
      batchesScanned: batches.length,
      patternsUsed: patterns.length,
      anomaliesDetected: detectedAnomalies.length 
    });

    ResponseHandler.success(res, detectedAnomalies, 'Anomaly detection completed successfully');
  } catch (error) {
    logger.error('Error running anomaly detection', { error: error.message });
    ResponseHandler.error(res, 'Failed to run anomaly detection', error);
  }
});

// Review QC anomaly
router.patch('/anomaly-detection/anomalies/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by, action_taken, false_positive = false } = req.body;

    if (!reviewed_by) {
      return ResponseHandler.error(res, 'reviewed_by is required', null, 400);
    }

    const query = `
      UPDATE qc_anomalies 
      SET reviewed = TRUE, reviewed_by = ?, review_date = CURRENT_TIMESTAMP,
          action_taken = ?, false_positive = ?
      WHERE id = ?
    `;

    const result = db.prepare(query).run(reviewed_by, action_taken, false_positive, id);

    if (result.changes === 0) {
      return ResponseHandler.notFound(res, 'QC anomaly not found');
    }

    const updatedAnomaly = db.prepare('SELECT * FROM qc_anomalies WHERE id = ?').get(id);

    logger.info('QC anomaly reviewed', { id, reviewedBy: reviewed_by, falsePositive: false_positive });
    ResponseHandler.success(res, updatedAnomaly, 'Anomaly reviewed successfully');
  } catch (error) {
    logger.error('Error reviewing QC anomaly', { error: error.message });
    ResponseHandler.error(res, 'Failed to review anomaly', error);
  }
});

// Workflow Optimization endpoints

// Get workflow optimization suggestions
router.get('/workflow-optimization/suggestions', async (req, res) => {
  try {
    const { status = 'pending', suggestion_type } = req.query;
    
    let whereClause = '';
    const params = [];
    const conditions = [];

    if (status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (suggestion_type) {
      conditions.push('suggestion_type = ?');
      params.push(suggestion_type);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `
      SELECT 
        os.*,
        CASE 
          WHEN os.status = 'pending' AND os.confidence_score >= 0.8 THEN 'high_priority'
          WHEN os.status = 'pending' AND os.confidence_score >= 0.6 THEN 'medium_priority'
          WHEN os.status = 'pending' THEN 'low_priority'
          ELSE 'processed'
        END as priority_level
      FROM optimization_suggestions os
      ${whereClause}
      ORDER BY 
        CASE os.status WHEN 'pending' THEN 1 WHEN 'reviewed' THEN 2 ELSE 3 END,
        os.confidence_score DESC,
        os.created_at DESC
    `;

    const suggestions = db.prepare(query).all(...params);
    ResponseHandler.success(res, suggestions);
  } catch (error) {
    logger.error('Error fetching optimization suggestions', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch optimization suggestions', error);
  }
});

// Generate workflow optimization suggestions
router.post('/workflow-optimization/generate-suggestions', async (req, res) => {
  try {
    // Analyze recent workflow executions to identify optimization opportunities
    const suggestions = [];

    // Analyze bottlenecks
    const bottleneckAnalysis = db.prepare(`
      SELECT 
        ws.step_name,
        AVG(we.duration_minutes) as avg_duration,
        ws.estimated_duration_minutes,
        COUNT(*) as execution_count,
        AVG(we.efficiency_score) as avg_efficiency
      FROM workflow_executions we
      JOIN workflow_steps ws ON we.step_id = ws.id
      WHERE we.end_time >= datetime('now', '-30 days')
        AND we.status = 'completed'
      GROUP BY ws.id, ws.step_name
      HAVING execution_count >= 5
        AND (avg_duration > ws.estimated_duration_minutes * 1.2 OR avg_efficiency < 80)
      ORDER BY (avg_duration / ws.estimated_duration_minutes) DESC
    `).all();

    const transaction = db.transaction(() => {
      // Generate bottleneck removal suggestions
      for (const bottleneck of bottleneckAnalysis) {
        const impactEstimate = {
          time_savings_minutes: Math.max(0, bottleneck.avg_duration - bottleneck.estimated_duration_minutes),
          efficiency_improvement: Math.max(0, 85 - bottleneck.avg_efficiency),
          affected_executions_monthly: bottleneck.execution_count
        };

        const confidence = Math.min(0.9, Math.max(0.5, 
          (bottleneck.execution_count / 20) * 
          (Math.min(2, bottleneck.avg_duration / bottleneck.estimated_duration_minutes) - 1)
        ));

        const insertQuery = `
          INSERT INTO optimization_suggestions (
            suggestion_type, title, description, impact_estimate,
            implementation_effort, confidence_score, affected_steps
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const result = db.prepare(insertQuery).run(
          'bottleneck_removal',
          `Optimize ${bottleneck.step_name} Performance`,
          `The ${bottleneck.step_name} step is taking ${Math.round(bottleneck.avg_duration)} minutes on average, ` +
          `which is ${Math.round((bottleneck.avg_duration / bottleneck.estimated_duration_minutes - 1) * 100)}% longer than estimated. ` +
          `Consider reviewing protocols, training, or equipment for this step.`,
          JSON.stringify(impactEstimate),
          confidence > 0.8 ? 'medium' : 'low',
          confidence,
          JSON.stringify([bottleneck.step_name])
        );

        suggestions.push({
          id: result.lastInsertRowid,
          type: 'bottleneck_removal',
          title: `Optimize ${bottleneck.step_name} Performance`,
          confidence_score: confidence
        });
      }

      // Generate resource allocation suggestions
      const resourceAnalysis = db.prepare(`
        SELECT 
          we.operator,
          ws.step_name,
          AVG(we.duration_minutes) as avg_duration,
          AVG(we.efficiency_score) as avg_efficiency,
          COUNT(*) as execution_count
        FROM workflow_executions we
        JOIN workflow_steps ws ON we.step_id = ws.id
        WHERE we.end_time >= datetime('now', '-30 days')
          AND we.status = 'completed'
          AND we.operator IS NOT NULL
        GROUP BY we.operator, ws.id
        HAVING execution_count >= 3
        ORDER BY avg_efficiency DESC
      `).all();

      if (resourceAnalysis.length > 0) {
        // Find operators with high efficiency in specific steps
        const topPerformers = resourceAnalysis.filter(r => r.avg_efficiency > 90);
        
        if (topPerformers.length > 0) {
          const impactEstimate = {
            efficiency_improvement: 15,
            quality_improvement: 10,
            training_opportunities: topPerformers.length
          };

          const result = db.prepare(insertQuery).run(
            'resource_allocation',
            'Optimize Operator Assignment',
            'Analysis shows significant performance variations between operators in specific workflow steps. ' +
            'Consider cross-training and optimized task assignment based on individual strengths.',
            JSON.stringify(impactEstimate),
            'medium',
            0.75,
            JSON.stringify([...new Set(topPerformers.map(tp => tp.step_name))])
          );

          suggestions.push({
            id: result.lastInsertRowid,
            type: 'resource_allocation',
            title: 'Optimize Operator Assignment',
            confidence_score: 0.75
          });
        }
      }
    });

    transaction();

    logger.info('Workflow optimization suggestions generated', { count: suggestions.length });
    ResponseHandler.success(res, suggestions, 'Optimization suggestions generated successfully');
  } catch (error) {
    logger.error('Error generating optimization suggestions', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate optimization suggestions', error);
  }
});

// Demand Forecasting endpoints

// Get demand forecasts
router.get('/demand-forecasting/forecasts', async (req, res) => {
  try {
    const { forecast_type, item_id, test_type_id, period = 'monthly', days_ahead = 90 } = req.query;
    
    let whereClause = 'WHERE df.forecast_date >= date("now") AND df.forecast_date <= date("now", "+' + parseInt(days_ahead) + ' days")';
    const params = [];

    if (forecast_type) {
      whereClause += ' AND df.forecast_type = ?';
      params.push(forecast_type);
    }

    if (item_id) {
      whereClause += ' AND df.item_id = ?';
      params.push(item_id);
    }

    if (test_type_id) {
      whereClause += ' AND df.test_type_id = ?';
      params.push(test_type_id);
    }

    if (period !== 'all') {
      whereClause += ' AND df.forecast_period = ?';
      params.push(period);
    }

    const query = `
      SELECT 
        df.*,
        ii.name as item_name,
        ii.item_code,
        tt.test_name,
        ABS(df.predicted_value - COALESCE(df.actual_value, df.predicted_value)) as prediction_error,
        CASE 
          WHEN df.actual_value IS NULL THEN 'pending'
          WHEN ABS(df.predicted_value - df.actual_value) / df.predicted_value <= 0.1 THEN 'accurate'
          WHEN ABS(df.predicted_value - df.actual_value) / df.predicted_value <= 0.2 THEN 'acceptable'
          ELSE 'inaccurate'
        END as accuracy_level
      FROM demand_forecasts df
      LEFT JOIN inventory_items ii ON df.item_id = ii.id
      LEFT JOIN test_types tt ON df.test_type_id = tt.id
      ${whereClause}
      ORDER BY df.forecast_date ASC
    `;

    const forecasts = db.prepare(query).all(...params);
    ResponseHandler.success(res, forecasts);
  } catch (error) {
    logger.error('Error fetching demand forecasts', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch demand forecasts', error);
  }
});

// Generate demand forecasts
router.post('/demand-forecasting/generate', async (req, res) => {
  try {
    const { forecast_type = 'item_demand', forecast_period = 'monthly', months_ahead = 3 } = req.body;
    
    const forecasts = [];

    const transaction = db.transaction(() => {
      if (forecast_type === 'item_demand' || forecast_type === 'all') {
        // Generate item demand forecasts based on historical usage
        const itemUsageQuery = `
          SELECT 
            il.item_id,
            ii.name as item_name,
            ii.reorder_level,
            SUM(ABS(it.quantity)) as total_usage,
            COUNT(DISTINCT date(it.transaction_date, 'start of month')) as months_with_usage,
            AVG(ABS(it.quantity)) as avg_monthly_usage
          FROM inventory_transactions it
          JOIN inventory_lots il ON it.lot_id = il.id
          JOIN inventory_items ii ON il.item_id = ii.id
          WHERE it.transaction_type = 'usage'
            AND it.transaction_date >= date('now', '-12 months')
          GROUP BY il.item_id
          HAVING months_with_usage >= 3
        `;

        const itemUsage = db.prepare(itemUsageQuery).all();

        for (const usage of itemUsage) {
          for (let month = 1; month <= months_ahead; month++) {
            const forecastDate = new Date();
            forecastDate.setMonth(forecastDate.getMonth() + month);
            forecastDate.setDate(1); // First day of the month

            // Simple trend-based forecast with seasonal adjustment
            const trendFactor = 1 + (Math.random() - 0.5) * 0.2; // +/- 10% random variation
            const seasonalFactor = 1 + Math.sin((forecastDate.getMonth() + 1) / 12 * 2 * Math.PI) * 0.1; // Seasonal pattern
            
            const predictedValue = Math.round(usage.avg_monthly_usage * trendFactor * seasonalFactor);
            const confidence = Math.max(0.6, Math.min(0.9, usage.months_with_usage / 12));

            const insertQuery = `
              INSERT INTO demand_forecasts (
                item_id, forecast_type, forecast_period, forecast_date,
                predicted_value, confidence_interval_lower, confidence_interval_upper,
                model_name, model_accuracy
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = db.prepare(insertQuery).run(
              usage.item_id, 'item_demand', forecast_period, forecastDate.toISOString().split('T')[0],
              predictedValue, Math.round(predictedValue * 0.8), Math.round(predictedValue * 1.2),
              'trend_seasonal_v1', confidence
            );

            forecasts.push({
              id: result.lastInsertRowid,
              item_name: usage.item_name,
              forecast_date: forecastDate.toISOString().split('T')[0],
              predicted_value: predictedValue,
              forecast_type: 'item_demand'
            });
          }
        }
      }

      if (forecast_type === 'test_volume' || forecast_type === 'all') {
        // Generate test volume forecasts based on historical sample processing
        const testVolumeQuery = `
          SELECT 
            COUNT(*) as total_samples,
            COUNT(*) / 12.0 as avg_monthly_samples
          FROM samples
          WHERE created_at >= date('now', '-12 months')
        `;

        const testVolume = db.prepare(testVolumeQuery).get();

        if (testVolume.total_samples > 0) {
          for (let month = 1; month <= months_ahead; month++) {
            const forecastDate = new Date();
            forecastDate.setMonth(forecastDate.getMonth() + month);
            forecastDate.setDate(1);

            const trendFactor = 1 + (Math.random() - 0.5) * 0.15; // +/- 7.5% variation
            const predictedValue = Math.round(testVolume.avg_monthly_samples * trendFactor);

            const insertQuery = `
              INSERT INTO demand_forecasts (
                forecast_type, forecast_period, forecast_date,
                predicted_value, confidence_interval_lower, confidence_interval_upper,
                model_name, model_accuracy
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = db.prepare(insertQuery).run(
              'test_volume', forecast_period, forecastDate.toISOString().split('T')[0],
              predictedValue, Math.round(predictedValue * 0.85), Math.round(predictedValue * 1.15),
              'trend_based_v1', 0.75
            );

            forecasts.push({
              id: result.lastInsertRowid,
              forecast_date: forecastDate.toISOString().split('T')[0],
              predicted_value: predictedValue,
              forecast_type: 'test_volume'
            });
          }
        }
      }
    });

    transaction();

    logger.info('Demand forecasts generated', { 
      type: forecast_type,
      period: forecast_period,
      count: forecasts.length 
    });

    ResponseHandler.success(res, forecasts, 'Demand forecasts generated successfully');
  } catch (error) {
    logger.error('Error generating demand forecasts', { error: error.message });
    ResponseHandler.error(res, 'Failed to generate demand forecasts', error);
  }
});

// AI/ML Analytics Dashboard endpoint
router.get('/analytics/dashboard', async (req, res) => {
  try {
    // Get summary statistics for the AI/ML dashboard
    const stats = {
      predictive_maintenance: {},
      anomaly_detection: {},
      workflow_optimization: {},
      demand_forecasting: {}
    };

    // Predictive maintenance stats
    const maintenanceStats = db.prepare(`
      SELECT 
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN acknowledged = FALSE THEN 1 END) as pending_predictions,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_predictions,
        AVG(confidence_score) as avg_confidence
      FROM maintenance_predictions
      WHERE predicted_date >= date('now')
    `).get();

    stats.predictive_maintenance = maintenanceStats;

    // Anomaly detection stats
    const anomalyStats = db.prepare(`
      SELECT 
        COUNT(*) as total_anomalies,
        COUNT(CASE WHEN reviewed = FALSE THEN 1 END) as unreviewed_anomalies,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_anomalies,
        COUNT(CASE WHEN false_positive = TRUE THEN 1 END) as false_positives
      FROM qc_anomalies
      WHERE detection_date >= date('now', '-30 days')
    `).get();

    stats.anomaly_detection = anomalyStats;

    // Workflow optimization stats
    const optimizationStats = db.prepare(`
      SELECT 
        COUNT(*) as total_suggestions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_suggestions,
        COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implemented_suggestions,
        AVG(confidence_score) as avg_confidence
      FROM optimization_suggestions
    `).get();

    stats.workflow_optimization = optimizationStats;

    // Demand forecasting stats
    const forecastStats = db.prepare(`
      SELECT 
        COUNT(*) as total_forecasts,
        COUNT(CASE WHEN actual_value IS NULL THEN 1 END) as pending_forecasts,
        AVG(CASE WHEN actual_value IS NOT NULL THEN model_accuracy END) as avg_accuracy,
        COUNT(CASE WHEN forecast_date = date('now', '+1 month') THEN 1 END) as next_month_forecasts
      FROM demand_forecasts
      WHERE forecast_date >= date('now')
    `).get();

    stats.demand_forecasting = forecastStats;

    ResponseHandler.success(res, stats);
  } catch (error) {
    logger.error('Error fetching AI/ML analytics', { error: error.message });
    ResponseHandler.error(res, 'Failed to fetch AI/ML analytics', error);
  }
});

// Helper functions for AI simulations

function generateMaintenanceRecommendation(equipment, riskLevel, alertRate) {
  const recommendations = {
    low: [
      'Continue regular monitoring',
      'Schedule routine maintenance as planned',
      'Consider preventive maintenance optimization'
    ],
    medium: [
      'Increase monitoring frequency',
      'Schedule maintenance inspection within 2 weeks',
      'Check sensor calibration',
      'Review recent operational parameters'
    ],
    high: [
      'Immediate inspection required',
      'Consider temporary operational restrictions',
      'Schedule urgent maintenance within 48 hours',
      'Document all operational anomalies'
    ]
  };

  const baseRecommendations = recommendations[riskLevel] || recommendations.medium;
  const specificRecommendation = baseRecommendations[Math.floor(Math.random() * baseRecommendations.length)];
  
  return `${specificRecommendation}. Alert rate: ${(alertRate * 100).toFixed(1)}% over the last 30 days.`;
}

function simulateAnomalyDetection(batch, pattern) {
  // Simulate anomaly detection based on pattern type
  const random = Math.random();
  
  // Base detection probability based on pattern sensitivity
  const detectionProbability = pattern.sensitivity || 0.05;
  
  if (random < detectionProbability) {
    const anomalyTypes = {
      'outlier': {
        metric_types: ['peak_height', 'allele_ratio', 'quality_score'],
        severities: ['low', 'medium', 'high'],
        confidence_range: [0.7, 0.95]
      },
      'trend': {
        metric_types: ['quality_score', 'efficiency', 'contamination_index'],
        severities: ['medium', 'high'],
        confidence_range: [0.6, 0.9]
      },
      'spike': {
        metric_types: ['contamination_signal', 'peak_height', 'background_noise'],
        severities: ['high', 'critical'],
        confidence_range: [0.8, 0.98]
      }
    };

    const anomalyConfig = anomalyTypes[pattern.pattern_type] || anomalyTypes.outlier;
    
    return {
      detected: true,
      metric_type: anomalyConfig.metric_types[Math.floor(Math.random() * anomalyConfig.metric_types.length)],
      severity: anomalyConfig.severities[Math.floor(Math.random() * anomalyConfig.severities.length)],
      confidence_score: anomalyConfig.confidence_range[0] + Math.random() * (anomalyConfig.confidence_range[1] - anomalyConfig.confidence_range[0]),
      detected_value: 100 + (Math.random() - 0.5) * 50,
      expected_value: 100,
      threshold_value: pattern.sensitivity * 100
    };
  }
  
  return { detected: false };
}

module.exports = router;