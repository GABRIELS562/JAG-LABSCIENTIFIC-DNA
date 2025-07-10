const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Audit Trail and Compliance Logging Service
 * Provides tamper-proof audit logging for regulatory compliance
 */
class AuditService {
  constructor(options = {}) {
    this.config = {
      // Storage options
      storage: {
        type: options.storageType || 'file', // 'file', 'database', 'elasticsearch'
        path: options.storagePath || path.join(__dirname, '../logs/audit'),
        retention: options.retentionDays || 2555, // 7 years default
        compression: options.compression !== false,
        encryption: options.encryption || false
      },
      
      // Integrity options
      integrity: {
        enabled: options.integrityEnabled !== false,
        algorithm: options.hashAlgorithm || 'sha256',
        chainValidation: options.chainValidation !== false,
        digitalSignature: options.digitalSignature || false
      },
      
      // Compliance standards
      compliance: {
        standard: options.complianceStandard || 'ISO17025', // ISO17025, FDA21CFR11, HIPAA
        requireUserSignature: options.requireUserSignature || false,
        requireReasonForChange: options.requireReasonForChange || true,
        trackFieldLevelChanges: options.trackFieldLevelChanges !== false
      },
      
      // Performance options
      performance: {
        batchSize: options.batchSize || 100,
        flushInterval: options.flushInterval || 5000, // 5 seconds
        asyncWrite: options.asyncWrite !== false
      }
    };

    this.auditQueue = [];
    this.lastHash = null;
    this.chainStartHash = null;
    this.encryptionKey = options.encryptionKey || process.env.AUDIT_ENCRYPTION_KEY;
    this.signingKey = options.signingKey || process.env.AUDIT_SIGNING_KEY;
    
    this.metrics = {
      totalEntries: 0,
      entriesPerHour: {},
      failedWrites: 0,
      integrityViolations: 0,
      lastFlush: Date.now()
    };

    this.ensureStorageDirectory();
    this.initializeChain();
    this.startFlushInterval();
  }

  ensureStorageDirectory() {
    if (this.config.storage.type === 'file' && !fs.existsSync(this.config.storage.path)) {
      fs.mkdirSync(this.config.storage.path, { recursive: true });
    }
  }

  async initializeChain() {
    try {
      // Load the last hash from the chain to continue integrity validation
      const chainFile = path.join(this.config.storage.path, '.audit_chain');
      
      if (fs.existsSync(chainFile)) {
        const chainData = JSON.parse(fs.readFileSync(chainFile, 'utf8'));
        this.lastHash = chainData.lastHash;
        this.chainStartHash = chainData.startHash;
        this.metrics.totalEntries = chainData.totalEntries || 0;
      } else {
        // Initialize new chain
        this.chainStartHash = this.generateHash('AUDIT_CHAIN_START_' + Date.now());
        this.lastHash = this.chainStartHash;
        await this.saveChainState();
      }

      logger.info('Audit chain initialized', {
        startHash: this.chainStartHash,
        lastHash: this.lastHash,
        totalEntries: this.metrics.totalEntries
      });

    } catch (error) {
      logger.error('Failed to initialize audit chain', error);
      throw error;
    }
  }

  async saveChainState() {
    const chainFile = path.join(this.config.storage.path, '.audit_chain');
    const chainData = {
      startHash: this.chainStartHash,
      lastHash: this.lastHash,
      totalEntries: this.metrics.totalEntries,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(chainFile, JSON.stringify(chainData, null, 2));
  }

  /**
   * Log an audit event
   */
  async log(event) {
    try {
      const auditEntry = await this.createAuditEntry(event);
      
      if (this.config.performance.asyncWrite) {
        this.auditQueue.push(auditEntry);
      } else {
        await this.writeAuditEntry(auditEntry);
      }

      this.updateMetrics();
      return auditEntry.id;

    } catch (error) {
      this.metrics.failedWrites++;
      logger.error('Failed to log audit event', { event, error: error.message });
      throw error;
    }
  }

  async createAuditEntry(event) {
    const timestamp = new Date().toISOString();
    const id = this.generateAuditId();

    // Create base audit entry
    const auditEntry = {
      id,
      timestamp,
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      userId: event.userId,
      userRole: event.userRole,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      action: event.action,
      outcome: event.outcome || 'success',
      details: event.details || {},
      
      // Compliance fields
      reasonForChange: event.reasonForChange,
      businessJustification: event.businessJustification,
      supervisorApproval: event.supervisorApproval,
      
      // Technical fields
      version: '1.0',
      source: 'LabScientific-LIMS',
      environment: process.env.NODE_ENV || 'development'
    };

    // Add field-level changes if tracking is enabled
    if (this.config.compliance.trackFieldLevelChanges && event.changes) {
      auditEntry.fieldChanges = this.processFieldChanges(event.changes);
    }

    // Add digital signature if required
    if (this.config.compliance.requireUserSignature && event.userSignature) {
      auditEntry.userSignature = event.userSignature;
      auditEntry.signatureTimestamp = timestamp;
    }

    // Calculate content hash for integrity
    if (this.config.integrity.enabled) {
      auditEntry.contentHash = this.generateContentHash(auditEntry);
      auditEntry.previousHash = this.lastHash;
      auditEntry.chainHash = this.generateChainHash(auditEntry);
      this.lastHash = auditEntry.chainHash;
    }

    // Encrypt sensitive data if encryption is enabled
    if (this.config.storage.encryption && this.encryptionKey) {
      auditEntry.encryptedData = this.encryptSensitiveData(auditEntry);
    }

    return auditEntry;
  }

  processFieldChanges(changes) {
    return changes.map(change => ({
      fieldName: change.field,
      oldValue: this.sanitizeValue(change.oldValue),
      newValue: this.sanitizeValue(change.newValue),
      changeType: this.determineChangeType(change.oldValue, change.newValue),
      timestamp: new Date().toISOString()
    }));
  }

  sanitizeValue(value) {
    // Remove or mask sensitive information
    if (typeof value === 'string') {
      // Mask potential PII patterns
      return value
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****') // SSN
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***') // Email
        .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '****-****-****-****'); // Credit card
    }
    return value;
  }

  determineChangeType(oldValue, newValue) {
    if (oldValue === null || oldValue === undefined) return 'CREATE';
    if (newValue === null || newValue === undefined) return 'DELETE';
    return 'UPDATE';
  }

  generateAuditId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `AUDIT_${timestamp}_${random}`;
  }

  generateContentHash(entry) {
    const contentString = JSON.stringify({
      eventType: entry.eventType,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      userId: entry.userId,
      action: entry.action,
      timestamp: entry.timestamp,
      details: entry.details
    });
    
    return this.generateHash(contentString);
  }

  generateChainHash(entry) {
    const chainString = entry.contentHash + (entry.previousHash || '');
    return this.generateHash(chainString);
  }

  generateHash(data) {
    return crypto
      .createHash(this.config.integrity.algorithm)
      .update(data)
      .digest('hex');
  }

  encryptSensitiveData(entry) {
    if (!this.encryptionKey) return null;

    const sensitiveFields = ['details', 'fieldChanges'];
    const sensitiveData = {};

    for (const field of sensitiveFields) {
      if (entry[field]) {
        sensitiveData[field] = entry[field];
        delete entry[field]; // Remove from main entry
      }
    }

    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(sensitiveData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }

  decryptSensitiveData(encryptedData) {
    if (!this.encryptionKey || !encryptedData) return {};

    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt audit data', error);
      return {};
    }
  }

  async writeAuditEntry(entry) {
    try {
      switch (this.config.storage.type) {
        case 'file':
          await this.writeToFile(entry);
          break;
        case 'database':
          await this.writeToDatabase(entry);
          break;
        case 'elasticsearch':
          await this.writeToElasticsearch(entry);
          break;
        default:
          throw new Error(`Unsupported storage type: ${this.config.storage.type}`);
      }

      this.metrics.totalEntries++;
      await this.saveChainState();

    } catch (error) {
      this.metrics.failedWrites++;
      throw error;
    }
  }

  async writeToFile(entry) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `audit_${date}.jsonl`;
    const filepath = path.join(this.config.storage.path, filename);
    
    const logLine = JSON.stringify(entry) + '\n';
    
    // Append to daily audit file
    fs.appendFileSync(filepath, logLine);
  }

  async writeToDatabase(entry) {
    // Implementation for database storage
    // This would use the connection pool service
    const query = `
      INSERT INTO audit_log (
        id, timestamp, event_type, resource_type, resource_id,
        user_id, action, outcome, details, content_hash, chain_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      entry.id,
      entry.timestamp,
      entry.eventType,
      entry.resourceType,
      entry.resourceId,
      entry.userId,
      entry.action,
      entry.outcome,
      JSON.stringify(entry.details),
      entry.contentHash,
      entry.chainHash
    ];

    // This would use the database service
    // await this.database.execute(query, params);
  }

  async writeToElasticsearch(entry) {
    // Implementation for Elasticsearch storage
    // This would use an Elasticsearch client
    const index = `audit-${new Date().toISOString().split('T')[0]}`;
    
    // await this.elasticsearchClient.index({
    //   index,
    //   id: entry.id,
    //   body: entry
    // });
  }

  startFlushInterval() {
    if (this.config.performance.asyncWrite) {
      setInterval(async () => {
        await this.flushQueue();
      }, this.config.performance.flushInterval);
    }
  }

  async flushQueue() {
    if (this.auditQueue.length === 0) return;

    const entries = this.auditQueue.splice(0, this.config.performance.batchSize);
    
    try {
      for (const entry of entries) {
        await this.writeAuditEntry(entry);
      }
      
      this.metrics.lastFlush = Date.now();
      
    } catch (error) {
      // Re-queue failed entries
      this.auditQueue.unshift(...entries);
      logger.error('Failed to flush audit queue', error);
    }
  }

  updateMetrics() {
    const hour = new Date().getHours();
    if (!this.metrics.entriesPerHour[hour]) {
      this.metrics.entriesPerHour[hour] = 0;
    }
    this.metrics.entriesPerHour[hour]++;
  }

  // Query and search methods
  async searchAuditLogs(criteria = {}) {
    const {
      startDate,
      endDate,
      userId,
      resourceType,
      resourceId,
      eventType,
      action,
      outcome,
      limit = 1000,
      offset = 0
    } = criteria;

    try {
      switch (this.config.storage.type) {
        case 'file':
          return await this.searchInFiles(criteria);
        case 'database':
          return await this.searchInDatabase(criteria);
        case 'elasticsearch':
          return await this.searchInElasticsearch(criteria);
        default:
          throw new Error(`Search not supported for storage type: ${this.config.storage.type}`);
      }
    } catch (error) {
      logger.error('Audit search failed', { criteria, error: error.message });
      throw error;
    }
  }

  async searchInFiles(criteria) {
    const results = [];
    const files = fs.readdirSync(this.config.storage.path)
      .filter(file => file.startsWith('audit_') && file.endsWith('.jsonl'));

    for (const file of files) {
      const filepath = path.join(this.config.storage.path, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          
          if (this.matchesCriteria(entry, criteria)) {
            // Decrypt sensitive data if needed
            if (entry.encryptedData) {
              const decryptedData = this.decryptSensitiveData(entry.encryptedData);
              Object.assign(entry, decryptedData);
              delete entry.encryptedData;
            }
            
            results.push(entry);
          }
        } catch (error) {
          logger.warn('Failed to parse audit log line', { file, error: error.message });
        }
      }
    }

    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return {
      results: results.slice(criteria.offset || 0, (criteria.offset || 0) + (criteria.limit || 1000)),
      total: results.length
    };
  }

  matchesCriteria(entry, criteria) {
    if (criteria.startDate && new Date(entry.timestamp) < new Date(criteria.startDate)) return false;
    if (criteria.endDate && new Date(entry.timestamp) > new Date(criteria.endDate)) return false;
    if (criteria.userId && entry.userId !== criteria.userId) return false;
    if (criteria.resourceType && entry.resourceType !== criteria.resourceType) return false;
    if (criteria.resourceId && entry.resourceId !== criteria.resourceId) return false;
    if (criteria.eventType && entry.eventType !== criteria.eventType) return false;
    if (criteria.action && entry.action !== criteria.action) return false;
    if (criteria.outcome && entry.outcome !== criteria.outcome) return false;

    return true;
  }

  // Integrity validation methods
  async validateChainIntegrity(startDate, endDate) {
    try {
      const auditLogs = await this.searchAuditLogs({ startDate, endDate });
      const entries = auditLogs.results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      let previousHash = entries.length > 0 ? entries[0].previousHash : this.chainStartHash;
      const violations = [];

      for (const entry of entries) {
        // Validate content hash
        const expectedContentHash = this.generateContentHash(entry);
        if (entry.contentHash !== expectedContentHash) {
          violations.push({
            type: 'content_hash_mismatch',
            entryId: entry.id,
            expected: expectedContentHash,
            actual: entry.contentHash
          });
        }

        // Validate chain hash
        const expectedChainHash = this.generateChainHash({
          ...entry,
          previousHash
        });
        if (entry.chainHash !== expectedChainHash) {
          violations.push({
            type: 'chain_hash_mismatch',
            entryId: entry.id,
            expected: expectedChainHash,
            actual: entry.chainHash
          });
        }

        // Validate previous hash linkage
        if (entry.previousHash !== previousHash) {
          violations.push({
            type: 'chain_linkage_broken',
            entryId: entry.id,
            expectedPrevious: previousHash,
            actualPrevious: entry.previousHash
          });
        }

        previousHash = entry.chainHash;
      }

      this.metrics.integrityViolations += violations.length;

      return {
        isValid: violations.length === 0,
        violations,
        entriesChecked: entries.length,
        checkedPeriod: { startDate, endDate }
      };

    } catch (error) {
      logger.error('Chain integrity validation failed', error);
      throw error;
    }
  }

  // Compliance reporting methods
  async generateComplianceReport(period = 'monthly') {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default:
        throw new Error(`Unsupported period: ${period}`);
    }

    const auditLogs = await this.searchAuditLogs({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const integrity = await this.validateChainIntegrity(
      startDate.toISOString(),
      endDate.toISOString()
    );

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalEntries: auditLogs.total,
        uniqueUsers: new Set(auditLogs.results.map(e => e.userId)).size,
        eventTypes: this.groupBy(auditLogs.results, 'eventType'),
        actions: this.groupBy(auditLogs.results, 'action'),
        outcomes: this.groupBy(auditLogs.results, 'outcome'),
        resourceTypes: this.groupBy(auditLogs.results, 'resourceType')
      },
      integrity: {
        isValid: integrity.isValid,
        violations: integrity.violations.length,
        violationTypes: this.groupBy(integrity.violations, 'type')
      },
      compliance: {
        standard: this.config.compliance.standard,
        retentionPeriod: this.config.storage.retention,
        encryptionEnabled: this.config.storage.encryption,
        integrityEnabled: this.config.integrity.enabled
      },
      generatedAt: new Date().toISOString(),
      generatedBy: 'AuditService'
    };
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.auditQueue.length,
      chainHashes: {
        start: this.chainStartHash,
        current: this.lastHash
      },
      configuration: {
        storage: this.config.storage.type,
        retention: this.config.storage.retention,
        encryption: this.config.storage.encryption,
        integrity: this.config.integrity.enabled,
        compliance: this.config.compliance.standard
      }
    };
  }

  async cleanup() {
    // Flush any remaining entries
    await this.flushQueue();
    
    // Archive old audit files if needed
    await this.archiveOldLogs();
    
    logger.info('Audit service cleanup completed');
  }

  async archiveOldLogs() {
    if (this.config.storage.type !== 'file') return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.storage.retention);

    const files = fs.readdirSync(this.config.storage.path)
      .filter(file => file.startsWith('audit_') && file.endsWith('.jsonl'));

    for (const file of files) {
      const fileDate = file.match(/audit_(\d{4}-\d{2}-\d{2})\.jsonl/);
      if (fileDate && new Date(fileDate[1]) < cutoffDate) {
        const filepath = path.join(this.config.storage.path, file);
        
        if (this.config.storage.compression) {
          // Compress old file
          const zlib = require('zlib');
          const readStream = fs.createReadStream(filepath);
          const writeStream = fs.createWriteStream(filepath + '.gz');
          const gzip = zlib.createGzip();
          
          readStream.pipe(gzip).pipe(writeStream);
          
          writeStream.on('finish', () => {
            fs.unlinkSync(filepath); // Delete original
          });
        }
      }
    }
  }
}

module.exports = AuditService;