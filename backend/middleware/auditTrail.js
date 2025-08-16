// ISO 17025 Compliance - Audit Trail Middleware
// Tracks all critical actions for regulatory compliance

const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../utils/logger');

// Initialize audit database connection
const auditDbPath = path.join(__dirname, '../database/audit_trail.db');
let auditDb;

try {
  auditDb = new Database(auditDbPath);
  
  // Create audit trail table if it doesn't exist
  auditDb.exec(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      status TEXT CHECK (status IN ('success', 'failure', 'warning')),
      error_message TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_trail(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_trail(action);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_trail(entity_type, entity_id);
  `);
  
  logger.info('Audit trail database initialized');
} catch (error) {
  logger.error('Failed to initialize audit trail database:', error);
}

// Audit trail middleware
const auditTrail = (action, entityType = null) => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    const startTime = Date.now();
    
    // Capture request data
    const auditData = {
      timestamp: new Date().toISOString(),
      user_id: req.user?.id || null,
      username: req.user?.username || 'anonymous',
      action: action,
      entity_type: entityType,
      entity_id: req.params?.id || req.body?.id || null,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('user-agent'),
      session_id: req.session?.id || null,
      metadata: JSON.stringify({
        method: req.method,
        path: req.path,
        query: req.query,
        body: sanitizeBody(req.body)
      })
    };
    
    // Override res.json to capture response
    res.json = function(body) {
      const responseTime = Date.now() - startTime;
      
      // Determine status based on response
      let status = 'success';
      if (res.statusCode >= 400) {
        status = 'failure';
      } else if (res.statusCode >= 300) {
        status = 'warning';
      }
      
      // Complete audit data
      auditData.status = status;
      if (body?.error) {
        auditData.error_message = body.error;
      }
      
      // Add response time to metadata
      const metadata = JSON.parse(auditData.metadata);
      metadata.response_time_ms = responseTime;
      metadata.status_code = res.statusCode;
      auditData.metadata = JSON.stringify(metadata);
      
      // Log to audit trail
      logAuditEvent(auditData);
      
      // Call original json method
      return originalJson.call(this, body);
    };
    
    next();
  };
};

// Function to log audit events
function logAuditEvent(auditData) {
  try {
    const stmt = auditDb.prepare(`
      INSERT INTO audit_trail (
        timestamp, user_id, username, action, entity_type, entity_id,
        old_value, new_value, ip_address, user_agent, session_id,
        status, error_message, metadata
      ) VALUES (
        @timestamp, @user_id, @username, @action, @entity_type, @entity_id,
        @old_value, @new_value, @ip_address, @user_agent, @session_id,
        @status, @error_message, @metadata
      )
    `);
    
    stmt.run(auditData);
  } catch (error) {
    logger.error('Failed to log audit event:', error);
    // Don't throw - we don't want audit failures to break the app
  }
}

// Function to log data changes
function logDataChange(entityType, entityId, oldValue, newValue, userId, username, ipAddress = null) {
  try {
    const auditData = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      username: username || 'system',
      action: 'DATA_CHANGE',
      entity_type: entityType,
      entity_id: entityId,
      old_value: JSON.stringify(oldValue),
      new_value: JSON.stringify(newValue),
      ip_address: ipAddress,
      status: 'success'
    };
    
    logAuditEvent(auditData);
  } catch (error) {
    logger.error('Failed to log data change:', error);
  }
}

// Function to log sample workflow changes with detailed tracking
function logSampleWorkflowChange(sampleIds, oldStatus, newStatus, userId, username, ipAddress, batchNumber = null) {
  try {
    sampleIds.forEach(sampleId => {
      const auditData = {
        timestamp: new Date().toISOString(),
        user_id: userId,
        username: username || 'system',
        action: CRITICAL_ACTIONS.SAMPLE_STATUS_CHANGE,
        entity_type: 'samples',
        entity_id: sampleId.toString(),
        old_value: JSON.stringify({ workflow_status: oldStatus, batch_number: null }),
        new_value: JSON.stringify({ workflow_status: newStatus, batch_number: batchNumber }),
        ip_address: ipAddress,
        status: 'success',
        metadata: JSON.stringify({
          samples_affected: sampleIds.length,
          batch_operation: !!batchNumber,
          batch_number: batchNumber
        })
      };
      
      logAuditEvent(auditData);
    });
  } catch (error) {
    logger.error('Failed to log sample workflow change:', error);
  }
}

// Function to log sample creation with full details
function logSampleCreation(sampleData, userId, username, ipAddress) {
  try {
    const auditData = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      username: username || 'system',
      action: CRITICAL_ACTIONS.SAMPLE_CREATE,
      entity_type: 'samples',
      entity_id: sampleData.id ? sampleData.id.toString() : 'pending',
      old_value: null,
      new_value: JSON.stringify({
        lab_number: sampleData.lab_number,
        name: sampleData.name,
        surname: sampleData.surname,
        relation: sampleData.relation,
        case_id: sampleData.case_id,
        workflow_status: sampleData.workflow_status || 'sample_collected'
      }),
      ip_address: ipAddress,
      status: 'success',
      metadata: JSON.stringify({
        operation: 'sample_registration',
        lab_number: sampleData.lab_number,
        case_number: sampleData.case_number
      })
    };
    
    logAuditEvent(auditData);
  } catch (error) {
    logger.error('Failed to log sample creation:', error);
  }
}

// Function to retrieve audit logs
function getAuditLogs(filters = {}) {
  try {
    let query = 'SELECT * FROM audit_trail WHERE 1=1';
    const params = {};
    
    if (filters.user_id) {
      query += ' AND user_id = @user_id';
      params.user_id = filters.user_id;
    }
    
    if (filters.action) {
      query += ' AND action = @action';
      params.action = filters.action;
    }
    
    if (filters.entity_type) {
      query += ' AND entity_type = @entity_type';
      params.entity_type = filters.entity_type;
    }
    
    if (filters.entity_id) {
      query += ' AND entity_id = @entity_id';
      params.entity_id = filters.entity_id;
    }
    
    if (filters.start_date) {
      query += ' AND timestamp >= @start_date';
      params.start_date = filters.start_date;
    }
    
    if (filters.end_date) {
      query += ' AND timestamp <= @end_date';
      params.end_date = filters.end_date;
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 1000';
    
    const stmt = auditDb.prepare(query);
    return stmt.all(params);
  } catch (error) {
    logger.error('Failed to retrieve audit logs:', error);
    return [];
  }
}

// Sanitize sensitive data from request body
function sanitizeBody(body) {
  if (!body) return {};
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Critical actions that must be audited for ISO 17025
const CRITICAL_ACTIONS = {
  // Authentication
  LOGIN: 'User Login',
  LOGOUT: 'User Logout',
  LOGIN_FAILED: 'Failed Login Attempt',
  
  // Sample Management
  SAMPLE_CREATE: 'Sample Created',
  SAMPLE_UPDATE: 'Sample Updated',
  SAMPLE_DELETE: 'Sample Deleted',
  SAMPLE_STATUS_CHANGE: 'Sample Status Changed',
  
  // Batch Operations
  BATCH_CREATE: 'Batch Created',
  BATCH_UPDATE: 'Batch Updated',
  BATCH_COMPLETE: 'Batch Completed',
  
  // Results
  RESULT_ENTRY: 'Result Entered',
  RESULT_UPDATE: 'Result Updated',
  RESULT_APPROVE: 'Result Approved',
  RESULT_REJECT: 'Result Rejected',
  
  // Reports
  REPORT_GENERATE: 'Report Generated',
  REPORT_SEND: 'Report Sent',
  REPORT_VIEW: 'Report Viewed',
  
  // Quality Control
  QC_PASS: 'QC Passed',
  QC_FAIL: 'QC Failed',
  QC_OVERRIDE: 'QC Override',
  
  // System
  CONFIG_CHANGE: 'Configuration Changed',
  USER_CREATE: 'User Created',
  USER_UPDATE: 'User Updated',
  USER_DELETE: 'User Deleted',
  BACKUP_CREATE: 'Backup Created',
  BACKUP_RESTORE: 'Backup Restored',
  
  // Additional Sample Actions
  SAMPLE_RERUN_INCREMENT: 'Sample Rerun Count Incremented',
  TEST_CASE_CREATE: 'Test Case Created',
  SAMPLE_BATCH_ASSIGN: 'Sample Assigned to Batch'
};

module.exports = {
  auditTrail,
  logAuditEvent,
  logDataChange,
  logSampleWorkflowChange,
  logSampleCreation,
  getAuditLogs,
  CRITICAL_ACTIONS,
  auditDb
};