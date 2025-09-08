/**
 * DevOps Dashboard API
 * Real-time stats for monitoring and showcase
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

let db = null;

// Initialize database connection
const initializeDb = (database) => {
  db = database;
};

// Dashboard stats endpoint
router.get('/stats', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    // Workflow stages stats
    const stages = [
      'sample_collected',
      'dna_extraction',
      'pcr_ready',
      'pcr_batched', 
      'pcr_completed',
      'electro_ready',
      'electro_batched',
      'electro_completed',
      'analysis_ready',
      'analysis_completed',
      'report_ready',
      'report_sent'
    ];

    const workflowStats = {};
    for (const stage of stages) {
      const result = await db.query('SELECT COUNT(*) as count FROM samples WHERE workflow_status = $1', [stage]);
      workflowStats[stage] = parseInt(result.rows[0]?.count) || 0;
    }

    // Total samples
    const totalResult = await db.query('SELECT COUNT(*) as count FROM samples');
    const totalSamples = parseInt(totalResult.rows[0].count);
    
    // Active samples (not completed)
    const activeResult = await db.query('SELECT COUNT(*) as count FROM samples WHERE workflow_status != $1', ['report_sent']);
    const activeSamples = parseInt(activeResult.rows[0].count);
    
    // Recent activity (last hour)
    const recentResult = await db.query(`
      SELECT COUNT(*) as count FROM samples 
      WHERE updated_at > NOW() - INTERVAL '1 hour'
    `);
    const recentActivity = parseInt(recentResult.rows[0].count);

    // Today's samples
    const todaysResult = await db.query(`
      SELECT COUNT(*) as count FROM samples 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todaysSamples = parseInt(todaysResult.rows[0].count);

    // System health metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const stats = {
      timestamp: new Date().toISOString(),
      samples: {
        total: totalSamples,
        active: activeSamples,
        completed: totalSamples - activeSamples,
        todaysCount: todaysSamples,
        recentActivity: recentActivity
      },
      workflow: workflowStats,
      system: {
        uptime: Math.floor(uptime),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        pid: process.pid
      },
      devops: {
        environment: process.env.NODE_ENV || 'development',
        generatorActive: process.env.ENABLE_DEVOPS_FEATURES === 'true',
        workflowAutomation: process.env.ENABLE_WORKFLOW_AUTOMATION === 'true'
      }
    };

    res.json(stats);

  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Real-time activity feed
router.get('/activity', (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const limit = parseInt(req.query.limit) || 50;
    
    const activities = db.prepare(`
      SELECT 
        lab_number,
        name,
        surname,
        workflow_status,
        updated_at,
        created_at
      FROM samples 
      ORDER BY updated_at DESC 
      LIMIT ?
    `).all(limit);

    res.json({
      timestamp: new Date().toISOString(),
      activities: activities.map(activity => ({
        id: activity.lab_number,
        type: 'workflow_update',
        message: `${activity.name} ${activity.surname} (${activity.lab_number}) moved to ${activity.workflow_status}`,
        timestamp: activity.updated_at,
        details: {
          sampleId: activity.lab_number,
          stage: activity.workflow_status,
          participant: `${activity.name} ${activity.surname}`
        }
      }))
    });

  } catch (error) {
    logger.error('Activity feed error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// Workflow throughput metrics
router.get('/throughput', (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    // Hourly throughput for last 24 hours
    const hourlyThroughput = db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00', updated_at) as hour,
        COUNT(*) as count,
        workflow_status
      FROM samples 
      WHERE updated_at > datetime('now', '-24 hours')
      GROUP BY strftime('%Y-%m-%d %H:00', updated_at), workflow_status
      ORDER BY hour DESC
    `).all();

    // Stage completion times (simulated)
    const stages = [
      { name: 'dna_extraction', avg_time: 45 },
      { name: 'pcr_amplification', avg_time: 180 },
      { name: 'electrophoresis', avg_time: 120 },
      { name: 'analysis', avg_time: 60 }
    ];

    res.json({
      timestamp: new Date().toISOString(),
      hourly: hourlyThroughput,
      averageCompletionTimes: stages
    });

  } catch (error) {
    logger.error('Throughput metrics error:', error);
    res.status(500).json({ error: 'Failed to get throughput metrics' });
  }
});

module.exports = { router, initializeDb };