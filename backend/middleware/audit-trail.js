const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuditTrail {
  constructor() {
    this.auditDir = path.join(__dirname, '../logs/audit');
    this.ensureAuditDirectory();
    this.initializeChain();
  }

  ensureAuditDirectory() {
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }
  }

  initializeChain() {
    this.chainFile = path.join(this.auditDir, 'audit-chain.json');
    if (!fs.existsSync(this.chainFile)) {
      const genesisBlock = {
        id: 0,
        timestamp: new Date().toISOString(),
        event: 'CHAIN_GENESIS',
        data: { message: 'FDA 21 CFR Part 11 audit chain initialized' },
        previousHash: '0',
        hash: this.calculateHash('0', 'CHAIN_GENESIS', {})
      };
      fs.writeFileSync(this.chainFile, JSON.stringify([genesisBlock], null, 2));
    }
  }

  calculateHash(previousHash, event, data) {
    const content = `${previousHash}${event}${JSON.stringify(data)}${Date.now()}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async addAuditEntry(event, data, userId = 'system', ipAddress = 'unknown') {
    try {
      const auditChain = JSON.parse(fs.readFileSync(this.chainFile, 'utf8'));
      const lastEntry = auditChain[auditChain.length - 1];
      
      const auditEntry = {
        id: lastEntry.id + 1,
        timestamp: new Date().toISOString(),
        event,
        data: {
          ...data,
          userId,
          ipAddress,
          userAgent: data.userAgent || 'unknown'
        },
        previousHash: lastEntry.hash,
        hash: null
      };

      auditEntry.hash = this.calculateHash(auditEntry.previousHash, event, auditEntry.data);
      
      auditChain.push(auditEntry);
      
      // Write atomically
      const tempFile = `${this.chainFile}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(auditChain, null, 2));
      fs.renameSync(tempFile, this.chainFile);
      
      // Also write to daily audit log
      await this.writeDailyAuditLog(auditEntry);
      
      logger.info('Audit entry added', { 
        id: auditEntry.id, 
        event, 
        userId,
        hash: auditEntry.hash.substring(0, 8) 
      });
      
      return auditEntry;
    } catch (error) {
      logger.error('Failed to add audit entry', { error: error.message, event, userId });
      throw error;
    }
  }

  async writeDailyAuditLog(entry) {
    const date = new Date().toISOString().split('T')[0];
    const dailyLogFile = path.join(this.auditDir, `audit-${date}.json`);
    
    let dailyLog = [];
    if (fs.existsSync(dailyLogFile)) {
      dailyLog = JSON.parse(fs.readFileSync(dailyLogFile, 'utf8'));
    }
    
    dailyLog.push(entry);
    fs.writeFileSync(dailyLogFile, JSON.stringify(dailyLog, null, 2));
  }

  async verifyChainIntegrity() {
    try {
      const auditChain = JSON.parse(fs.readFileSync(this.chainFile, 'utf8'));
      
      for (let i = 1; i < auditChain.length; i++) {
        const current = auditChain[i];
        const previous = auditChain[i - 1];
        
        // Verify hash chain
        if (current.previousHash !== previous.hash) {
          return {
            valid: false,
            error: `Hash chain broken at entry ${current.id}`,
            entryId: current.id
          };
        }
        
        // Verify hash calculation
        const calculatedHash = this.calculateHash(current.previousHash, current.event, current.data);
        if (current.hash !== calculatedHash) {
          return {
            valid: false,
            error: `Hash verification failed at entry ${current.id}`,
            entryId: current.id
          };
        }
      }
      
      return { valid: true, totalEntries: auditChain.length };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async getAuditTrail(startDate, endDate, userId, eventType) {
    try {
      const auditChain = JSON.parse(fs.readFileSync(this.chainFile, 'utf8'));
      
      let filtered = auditChain.filter(entry => {
        if (startDate && new Date(entry.timestamp) < new Date(startDate)) return false;
        if (endDate && new Date(entry.timestamp) > new Date(endDate)) return false;
        if (userId && entry.data.userId !== userId) return false;
        if (eventType && entry.event !== eventType) return false;
        return true;
      });
      
      return {
        entries: filtered,
        totalCount: filtered.length,
        integrity: await this.verifyChainIntegrity()
      };
    } catch (error) {
      logger.error('Failed to get audit trail', { error: error.message });
      throw error;
    }
  }

  // FDA-specific audit events
  async auditSampleCreation(sampleId, sampleData, userId, ipAddress) {
    return this.addAuditEntry('SAMPLE_CREATED', {
      sampleId,
      sampleData: {
        sampleName: sampleData.sampleName,
        caseNumber: sampleData.caseNumber,
        workflow: sampleData.selectedWorkflow
      },
      fdaCompliance: true
    }, userId, ipAddress);
  }

  async auditSampleModification(sampleId, changes, userId, ipAddress) {
    return this.addAuditEntry('SAMPLE_MODIFIED', {
      sampleId,
      changes,
      fdaCompliance: true,
      reason: 'FDA 21 CFR Part 11 tracked change'
    }, userId, ipAddress);
  }

  async auditUserLogin(userId, ipAddress, success) {
    return this.addAuditEntry('USER_LOGIN', {
      loginSuccess: success,
      securityEvent: true,
      fdaCompliance: true
    }, userId, ipAddress);
  }

  async auditSystemEvent(event, details) {
    return this.addAuditEntry('SYSTEM_EVENT', {
      event,
      details,
      systemGenerated: true,
      fdaCompliance: true
    }, 'system', 'localhost');
  }

  async auditDataExport(exportType, dataScope, userId, ipAddress) {
    return this.addAuditEntry('DATA_EXPORT', {
      exportType,
      dataScope,
      fdaCompliance: true,
      dataIntegrityCheck: true
    }, userId, ipAddress);
  }

  // Middleware for Express
  createMiddleware() {
    return (req, res, next) => {
      // Store original end function
      const originalEnd = res.end;
      
      res.end = async function(...args) {
        // Only audit significant operations
        const shouldAudit = ['POST', 'PUT', 'DELETE'].includes(req.method) ||
                           req.path.includes('/api/samples') ||
                           req.path.includes('/api/reports') ||
                           req.path.includes('/api/auth');
        
        if (shouldAudit && res.statusCode < 400) {
          try {
            await req.auditTrail.addAuditEntry('API_CALL', {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              userAgent: req.get('User-Agent') || 'unknown'
            }, req.user?.id || 'anonymous', req.ip);
          } catch (error) {
            logger.error('Audit middleware error:', error);
          }
        }
        
        originalEnd.apply(this, args);
      };
      
      // Attach audit trail to request
      req.auditTrail = this;
      next();
    };
  }

  // Generate FDA compliance report
  async generateComplianceReport(startDate, endDate) {
    try {
      const auditData = await this.getAuditTrail(startDate, endDate);
      const integrity = await this.verifyChainIntegrity();
      
      const report = {
        reportGenerated: new Date().toISOString(),
        compliance: {
          standard: 'FDA 21 CFR Part 11',
          integrityVerified: integrity.valid,
          totalAuditEntries: auditData.totalCount
        },
        period: {
          startDate,
          endDate
        },
        summary: {
          userLogins: auditData.entries.filter(e => e.event === 'USER_LOGIN').length,
          samplesCreated: auditData.entries.filter(e => e.event === 'SAMPLE_CREATED').length,
          samplesModified: auditData.entries.filter(e => e.event === 'SAMPLE_MODIFIED').length,
          dataExports: auditData.entries.filter(e => e.event === 'DATA_EXPORT').length,
          systemEvents: auditData.entries.filter(e => e.event === 'SYSTEM_EVENT').length
        },
        auditTrail: auditData.entries,
        integrityDetails: integrity
      };
      
      // Save report
      const reportFile = path.join(this.auditDir, `compliance-report-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      return report;
    } catch (error) {
      logger.error('Failed to generate compliance report', { error: error.message });
      throw error;
    }
  }
}

// Singleton instance
const auditTrail = new AuditTrail();

module.exports = {
  auditTrail,
  AuditTrail
};