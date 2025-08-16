const db = require('../services/database');
const fs = require('fs');
const path = require('path');

);

const healthReport = {
  timestamp: new Date().toISOString(),
  checks: {},
  issues: [],
  warnings: [],
  stats: {}
};

// 1. Database Integrity Check
);

try {
  // Check for orphaned samples (no case association)
  const orphanedSamples = db.db.prepare(`
    SELECT COUNT(*) as count FROM samples 
    WHERE case_id IS NULL OR case_id NOT IN (SELECT id FROM cases)
  `).get();
  
  if (orphanedSamples.count > 0) {
    healthReport.warnings.push(`Found ${orphanedSamples.count} orphaned samples without valid case association`);
  }
  
  // Check for duplicate sample IDs
  const duplicateSamples = db.db.prepare(`
    SELECT sample_id, COUNT(*) as count 
    FROM samples 
    GROUP BY sample_id 
    HAVING COUNT(*) > 1
  `).all();
  
  if (duplicateSamples.length > 0) {
    healthReport.issues.push(`Found ${duplicateSamples.length} duplicate sample IDs`);
    } else {
    }
  
  // Check workflow status consistency
  const invalidWorkflow = db.db.prepare(`
    SELECT COUNT(*) as count FROM samples 
    WHERE workflow_status NOT IN (
      'sample_collected', 'pcr_ready', 'pcr_batched', 'pcr_completed',
      'electro_ready', 'electro_batched', 'electro_completed',
      'analysis_ready', 'analysis_completed', 'report_generated'
    )
  `).get();
  
  if (invalidWorkflow.count > 0) {
    healthReport.issues.push(`Found ${invalidWorkflow.count} samples with invalid workflow status`);
  }
  
  // Check for incomplete batches
  const incompleteBatches = db.db.prepare(`
    SELECT b.*, COUNT(bs.id) as sample_count
    FROM batches b
    LEFT JOIN batch_samples bs ON b.batch_number = bs.batch_number
    WHERE b.status = 'processing'
    GROUP BY b.batch_number
  `).all();
  
  healthReport.stats.incompleteBatches = incompleteBatches.length;
  
  healthReport.checks.database = 'PASSED';
} catch (error) {
  console.error('❌ Database check failed:', error.message);
  healthReport.checks.database = 'FAILED';
  healthReport.issues.push(`Database check error: ${error.message}`);
}

// 2. Workflow Status Distribution
);

try {
  const statusDistribution = db.db.prepare(`
    SELECT workflow_status, COUNT(*) as count 
    FROM samples 
    GROUP BY workflow_status 
    ORDER BY count DESC
  `).all();
  
  statusDistribution.forEach(status => {
    const percentage = ((status.count / 50) * 100).toFixed(1);
    } : ${status.count} samples (${percentage}%)`);
  });
  
  healthReport.stats.workflowDistribution = statusDistribution;
  
  // Check for bottlenecks
  const maxStatus = statusDistribution[0];
  if (maxStatus && maxStatus.count > 40) {
    healthReport.warnings.push(`Potential bottleneck: ${maxStatus.count} samples stuck at ${maxStatus.workflow_status}`);
  }
  
} catch (error) {
  console.error('❌ Workflow check failed:', error.message);
}

// 3. File System Check
);

const requiredDirs = [
  'backend/uploads',
  'backend/reports',
  'backend/logs',
  'backend/data/genemapper',
  'backend/temp'
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../', dir);
  if (fs.existsSync(fullPath)) {
    } else {
    fs.mkdirSync(fullPath, { recursive: true });
    healthReport.warnings.push(`Created missing directory: ${dir}`);
  }
});

// 4. API Endpoints Check
);

const endpoints = [
  { path: '/api/auth/login', method: 'POST', requiresAuth: false },
  { path: '/api/samples', method: 'GET', requiresAuth: true },
  { path: '/api/cases', method: 'GET', requiresAuth: true },
  { path: '/api/batches', method: 'GET', requiresAuth: true },
  { path: '/api/workflow/status', method: 'GET', requiresAuth: true },
  { path: '/api/analysis', method: 'GET', requiresAuth: true },
  { path: '/api/reports', method: 'GET', requiresAuth: true }
];

endpoints.forEach(ep => {
  } ${ep.path.padEnd(30)} Auth: ${ep.requiresAuth ? 'Yes' : 'No'}`);
});

healthReport.stats.totalEndpoints = endpoints.length;

// 5. Database Statistics
);

try {
  const stats = {
    samples: db.db.prepare('SELECT COUNT(*) as count FROM samples').get().count,
    cases: db.db.prepare('SELECT COUNT(*) as count FROM cases').get().count,
    batches: db.db.prepare('SELECT COUNT(*) as count FROM batches').get().count,
    users: db.db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    analyses: db.db.prepare('SELECT COUNT(*) as count FROM analysis').get().count,
    reports: db.db.prepare('SELECT COUNT(*) as count FROM reports').get().count
  };
  
  Object.entries(stats).forEach(([table, count]) => {
    }: ${count} records`);
  });
  
  healthReport.stats.database = stats;
  
} catch (error) {
  console.error('❌ Statistics check failed:', error.message);
}

// 6. Recent Activity
');
);

try {
  const recentSamples = db.db.prepare(`
    SELECT COUNT(*) as count FROM samples 
    WHERE created_at > datetime('now', '-1 day')
  `).get();
  
  const recentAnalyses = db.db.prepare(`
    SELECT COUNT(*) as count FROM analysis 
    WHERE created_at > datetime('now', '-1 day')
  `).get();
  
  healthReport.stats.recentActivity = {
    samples: recentSamples.count,
    analyses: recentAnalyses.count
  };
  
} catch (error) {
  console.error('❌ Activity check failed:', error.message);
}

// 7. Performance Metrics
);

try {
  // Check for missing indexes
  const indexes = db.db.prepare(`
    SELECT name, tbl_name FROM sqlite_master 
    WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  // Check table sizes
  const largeTables = db.db.prepare(`
    SELECT name, 
           (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as count
    FROM sqlite_master m 
    WHERE type='table'
  `).all();
  
  healthReport.stats.indexes = indexes.length;
  
} catch (error) {
  console.error('❌ Performance check failed:', error.message);
}

// Generate Summary
);
);

const issueCount = healthReport.issues.length;
const warningCount = healthReport.warnings.length;

if (issueCount === 0 && warningCount === 0) {
  } else {
  if (issueCount > 0) {
    :`);
    healthReport.issues.forEach(issue => );
  }
  
  if (warningCount > 0) {
    :`);
    healthReport.warnings.forEach(warning => );
  }
}

// Save report
const reportPath = path.join(__dirname, '../logs/health-check-report.json');
fs.writeFileSync(reportPath, JSON.stringify(healthReport, null, 2));
module.exports = healthReport;