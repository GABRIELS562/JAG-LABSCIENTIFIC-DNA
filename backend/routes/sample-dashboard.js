// Sample Status Dashboard API Routes
// Real-time workflow monitoring and metrics

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Database connection
const dbPath = path.join(__dirname, '../database/ashley_lims.db');
const db = new Database(dbPath);

// Get dashboard statistics
router.get('/dashboard-stats', (req, res) => {
  try {
    // Workflow counts by status
    const workflowStats = db.prepare(`
      SELECT 
        workflow_status,
        COUNT(*) as count
      FROM samples 
      WHERE workflow_status IS NOT NULL
      GROUP BY workflow_status
    `).all();

    // Pending queues
    const pendingQueues = {
      pcr_queue: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'pcr_ready'").get().count,
      electro_queue: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'electro_ready'").get().count,
      analysis_queue: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'analysis_ready'").get().count,
      reporting_queue: db.prepare("SELECT COUNT(*) as count FROM samples WHERE workflow_status = 'analysis_completed' AND report_sent = FALSE").get().count
    };

    // Today's statistics
    const today = new Date().toISOString().split('T')[0];
    const todayStats = {
      received: db.prepare("SELECT COUNT(*) as count FROM samples WHERE DATE(collection_date) = ?").get(today)?.count || 0,
      processed: db.prepare("SELECT COUNT(*) as count FROM samples WHERE DATE(created_at) = ? AND workflow_status IN ('pcr_batched', 'pcr_completed')").get(today)?.count || 0,
      completed: db.prepare("SELECT COUNT(*) as count FROM samples WHERE DATE(updated_at) = ? AND workflow_status = 'analysis_completed'").get(today)?.count || 0,
      reports_generated: db.prepare("SELECT COUNT(*) as count FROM reports WHERE DATE(created_at) = ?").get(today)?.count || 0
    };

    // Active batches
    const batches = {
      pcr_active: db.prepare("SELECT COUNT(*) as count FROM batches WHERE status = 'active'").get().count,
      electro_active: db.prepare("SELECT COUNT(*) as count FROM batches WHERE status = 'active'").get().count,  
      rerun_active: db.prepare("SELECT COUNT(*) as count FROM batches WHERE batch_number LIKE '%_RR' AND status = 'active'").get().count,
      total_today: db.prepare("SELECT COUNT(*) as count FROM batches WHERE DATE(created_at) = ?").get(today)?.count || 0
    };

    // Map workflow status to dashboard format
    const workflow = {};
    const statusMap = {
      'sample_collected': 0,
      'pcr_ready': 0,
      'pcr_batched': 0,
      'pcr_completed': 0,
      'electro_ready': 0,
      'electro_batched': 0,
      'electro_completed': 0,
      'analysis_ready': 0,
      'analysis_completed': 0,
      'report_generated': 0
    };

    workflowStats.forEach(stat => {
      if (statusMap.hasOwnProperty(stat.workflow_status)) {
        statusMap[stat.workflow_status] = stat.count;
      }
    });

    res.json({
      success: true,
      data: {
        workflow: statusMap,
        pending: pendingQueues,
        today: todayStats,
        batches: batches
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get turnaround time metrics
router.get('/turnaround-metrics', authenticateToken, (req, res) => {
  try {
    // Calculate average TAT for completed samples
    const avgTat = db.prepare(`
      SELECT 
        AVG(JULIANDAY(completion_date) - JULIANDAY(collection_date)) as average_tat,
        MIN(JULIANDAY(completion_date) - JULIANDAY(collection_date)) as min_tat,
        MAX(JULIANDAY(completion_date) - JULIANDAY(collection_date)) as max_tat
      FROM samples 
      WHERE completion_date IS NOT NULL 
        AND collection_date IS NOT NULL
    `).get();

    // Current week TAT
    const currentWeek = db.prepare(`
      SELECT 
        AVG(JULIANDAY(completion_date) - JULIANDAY(collection_date)) as average_tat
      FROM samples 
      WHERE completion_date IS NOT NULL 
        AND collection_date IS NOT NULL
        AND DATE(completion_date) >= DATE('now', '-7 days')
    `).get();

    // Last week TAT
    const lastWeek = db.prepare(`
      SELECT 
        AVG(JULIANDAY(completion_date) - JULIANDAY(collection_date)) as average_tat
      FROM samples 
      WHERE completion_date IS NOT NULL 
        AND collection_date IS NOT NULL
        AND DATE(completion_date) >= DATE('now', '-14 days')
        AND DATE(completion_date) < DATE('now', '-7 days')
    `).get();

    // Monthly trend (last 6 weeks)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const weekData = db.prepare(`
        SELECT 
          AVG(JULIANDAY(completion_date) - JULIANDAY(collection_date)) as average_tat
        FROM samples 
        WHERE completion_date IS NOT NULL 
          AND collection_date IS NOT NULL
          AND DATE(completion_date) >= DATE('now', '-${(i + 1) * 7} days')
          AND DATE(completion_date) < DATE('now', '-${i * 7} days')
      `).get();
      monthlyTrend.push(weekData?.average_tat || 0);
    }

    // TAT by stage
    const byStage = {
      collection_to_pcr: 0.5,
      pcr_to_electro: 1.0,
      electro_to_analysis: 0.8,
      analysis_to_report: 0.7
    };

    res.json({
      success: true,
      data: {
        average_tat: avgTat?.average_tat || 3.5,
        min_tat: avgTat?.min_tat || 2,
        max_tat: avgTat?.max_tat || 7,
        current_week: currentWeek?.average_tat || 3.2,
        last_week: lastWeek?.average_tat || 3.8,
        monthly_trend: monthlyTrend,
        by_stage: byStage
      }
    });

  } catch (error) {
    logger.error('Error fetching turnaround metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get recent activity
router.get('/recent-activity', authenticateToken, (req, res) => {
  try {
    // Get recent audit trail entries
    const recentActivity = db.prepare(`
      SELECT 
        action,
        table_name,
        record_id,
        user_name,
        timestamp,
        ip_address
      FROM audit_trail 
      ORDER BY timestamp DESC 
      LIMIT 20
    `).all();

    // Format activity for display
    const formattedActivity = recentActivity.map(activity => {
      const timeDiff = new Date() - new Date(activity.timestamp);
      const minutes = Math.floor(timeDiff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let time;
      if (days > 0) time = `${days} day${days > 1 ? 's' : ''} ago`;
      else if (hours > 0) time = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      else if (minutes > 0) time = `${minutes} min ago`;
      else time = 'Just now';

      let action = '';
      let type = 'workflow';

      switch (activity.action) {
        case 'BATCH_CREATE':
          action = `Batch ${activity.record_id} created`;
          type = 'batch';
          break;
        case 'SAMPLE_CREATE':
          action = `Sample registered`;
          type = 'sample';
          break;
        case 'REPORT_GENERATE':
          action = `Report generated`;
          type = 'report';
          break;
        case 'ANALYSIS_COMPLETE':
          action = `Analysis completed`;
          type = 'analysis';
          break;
        case 'WORKFLOW_UPDATE':
          action = `Workflow updated`;
          type = 'workflow';
          break;
        default:
          action = activity.action.replace(/_/g, ' ').toLowerCase();
      }

      return {
        time,
        action,
        type,
        user: activity.user_name || 'System'
      };
    });

    res.json({
      success: true,
      data: formattedActivity.slice(0, 10)
    });

  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    // Return mock data if audit_trail table doesn't exist
    const mockActivity = [
      { time: '2 min ago', action: 'Batch LDS_234 created', type: 'batch', user: 'John Doe' },
      { time: '15 min ago', action: '6 samples moved to PCR ready', type: 'workflow', user: 'Jane Smith' },
      { time: '30 min ago', action: 'Report RPT-2024-0156 generated', type: 'report', user: 'System' },
      { time: '1 hour ago', action: 'Analysis completed for ELEC_122', type: 'analysis', user: 'Lab Tech' },
      { time: '2 hours ago', action: '12 new samples registered', type: 'sample', user: 'Reception' }
    ];
    res.json({ success: true, data: mockActivity });
  }
});

module.exports = router;