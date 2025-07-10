const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const archiver = require('archiver');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Data Archival and Retention Service
 * Manages automated data lifecycle with compliance-aware archival and retention policies
 */
class ArchivalService {
  constructor(options = {}) {
    this.config = {
      // Storage options
      storage: {
        archivePath: options.archivePath || path.join(__dirname, '../archives'),
        tempPath: options.tempPath || path.join(__dirname, '../temp/archival'),
        compression: options.compression !== false,
        encryption: options.encryption || false,
        compressionLevel: options.compressionLevel || 6,
        chunkSize: options.chunkSize || 1024 * 1024 // 1MB chunks
      },

      // Retention policies
      retention: {
        // Default retention periods in days
        samples: options.sampleRetention || 2555, // 7 years
        testCases: options.testCaseRetention || 2555, // 7 years
        reports: options.reportRetention || 2555, // 7 years
        auditLogs: options.auditRetention || 2555, // 7 years
        systemLogs: options.systemLogRetention || 365, // 1 year
        exports: options.exportRetention || 90, // 3 months
        tempFiles: options.tempFileRetention || 7, // 1 week
        // Legal hold overrides
        legalHoldRetention: options.legalHoldRetention || 3650 // 10 years
      },

      // Archival triggers
      triggers: {
        sizeThreshold: options.sizeThreshold || 10 * 1024 * 1024 * 1024, // 10GB
        ageThreshold: options.ageThreshold || 365, // 1 year
        recordCount: options.recordCount || 100000,
        automatedSchedule: options.automatedSchedule || '0 2 * * 0' // Weekly at 2 AM Sunday
      },

      // Compliance settings
      compliance: {
        standard: options.complianceStandard || 'ISO17025',
        requireSignedArchives: options.requireSignedArchives !== false,
        integrityChecks: options.integrityChecks !== false,
        accessLogging: options.accessLogging !== false,
        immutableArchives: options.immutableArchives !== false
      },

      // Performance settings
      performance: {
        maxConcurrentJobs: options.maxConcurrentJobs || 3,
        batchSize: options.batchSize || 1000,
        progressUpdateInterval: options.progressUpdateInterval || 5000,
        memoryLimit: options.memoryLimit || 512 * 1024 * 1024 // 512MB
      }
    };

    // Service state
    this.activeJobs = new Map();
    this.retentionPolicies = new Map();
    this.archiveIndex = new Map();
    this.encryptionKey = options.encryptionKey || process.env.ARCHIVE_ENCRYPTION_KEY;
    this.signingKey = options.signingKey || process.env.ARCHIVE_SIGNING_KEY;

    // Metrics
    this.metrics = {
      archival: {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        totalSizeArchived: 0,
        totalRecordsArchived: 0,
        avgCompressionRatio: 0
      },
      retention: {
        recordsDeleted: 0,
        spaceReclaimed: 0,
        policiesEnforced: 0,
        legalHoldsActive: 0
      },
      storage: {
        totalArchives: 0,
        totalArchiveSize: 0,
        oldestArchive: null,
        newestArchive: null
      }
    };

    this.initializeService();
  }

  async initializeService() {
    try {
      // Create necessary directories
      this.ensureDirectories();

      // Load existing archive index
      await this.loadArchiveIndex();

      // Initialize default retention policies
      this.initializeRetentionPolicies();

      // Start scheduled archival if enabled
      if (this.config.triggers.automatedSchedule) {
        this.scheduleAutomatedArchival();
      }

      // Start retention policy enforcement
      this.startRetentionEnforcement();

      logger.info('Archival service initialized', {
        archivePath: this.config.storage.archivePath,
        encryption: this.config.storage.encryption,
        compliance: this.config.compliance.standard
      });

    } catch (error) {
      logger.error('Failed to initialize archival service', error);
      throw error;
    }
  }

  ensureDirectories() {
    const dirs = [
      this.config.storage.archivePath,
      this.config.storage.tempPath,
      path.join(this.config.storage.archivePath, 'samples'),
      path.join(this.config.storage.archivePath, 'test_cases'),
      path.join(this.config.storage.archivePath, 'reports'),
      path.join(this.config.storage.archivePath, 'audit_logs'),
      path.join(this.config.storage.archivePath, 'system_logs')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async loadArchiveIndex() {
    const indexFile = path.join(this.config.storage.archivePath, '.archive_index.json');
    
    if (fs.existsSync(indexFile)) {
      try {
        const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        
        for (const [key, value] of Object.entries(indexData.archives || {})) {
          this.archiveIndex.set(key, value);
        }

        this.metrics.storage = {
          ...this.metrics.storage,
          ...indexData.metrics
        };

        logger.debug('Archive index loaded', { 
          archives: this.archiveIndex.size,
          totalSize: indexData.metrics?.totalArchiveSize || 0
        });

      } catch (error) {
        logger.warn('Failed to load archive index', error);
      }
    }
  }

  async saveArchiveIndex() {
    const indexFile = path.join(this.config.storage.archivePath, '.archive_index.json');
    
    const indexData = {
      archives: Object.fromEntries(this.archiveIndex),
      metrics: this.metrics.storage,
      lastUpdated: new Date().toISOString()
    };

    try {
      fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
    } catch (error) {
      logger.error('Failed to save archive index', error);
    }
  }

  initializeRetentionPolicies() {
    // Sample retention policy
    this.retentionPolicies.set('samples', {
      entityType: 'samples',
      retentionDays: this.config.retention.samples,
      archiveAfterDays: 365, // Archive after 1 year
      deleteAfterDays: this.config.retention.samples,
      legalHoldOverride: true,
      conditions: {
        status: ['completed', 'cancelled'],
        exclude_priority: ['legal_hold', 'investigation']
      }
    });

    // Test case retention policy
    this.retentionPolicies.set('test_cases', {
      entityType: 'test_cases',
      retentionDays: this.config.retention.testCases,
      archiveAfterDays: 730, // Archive after 2 years
      deleteAfterDays: this.config.retention.testCases,
      legalHoldOverride: true,
      conditions: {
        status: ['completed', 'cancelled']
      }
    });

    // Report retention policy
    this.retentionPolicies.set('reports', {
      entityType: 'reports',
      retentionDays: this.config.retention.reports,
      archiveAfterDays: 365,
      deleteAfterDays: this.config.retention.reports,
      legalHoldOverride: true,
      conditions: {
        type: ['standard', 'qc', 'compliance']
      }
    });

    // Audit log retention policy
    this.retentionPolicies.set('audit_logs', {
      entityType: 'audit_logs',
      retentionDays: this.config.retention.auditLogs,
      archiveAfterDays: 365,
      deleteAfterDays: this.config.retention.auditLogs,
      legalHoldOverride: false, // Audit logs cannot be deleted even with legal hold
      immutable: true
    });

    // System log retention policy
    this.retentionPolicies.set('system_logs', {
      entityType: 'system_logs',
      retentionDays: this.config.retention.systemLogs,
      archiveAfterDays: 90,
      deleteAfterDays: this.config.retention.systemLogs,
      legalHoldOverride: false
    });

    // Temporary file cleanup policy
    this.retentionPolicies.set('temp_files', {
      entityType: 'temp_files',
      retentionDays: this.config.retention.tempFiles,
      archiveAfterDays: null, // Don't archive temp files
      deleteAfterDays: this.config.retention.tempFiles,
      legalHoldOverride: false
    });

    logger.debug('Retention policies initialized', { 
      policies: this.retentionPolicies.size 
    });
  }

  // Archival Methods
  async createArchive(options) {
    const jobId = this.generateJobId('archive');
    const startTime = Date.now();

    try {
      const job = {
        id: jobId,
        type: 'archive',
        status: 'started',
        startTime,
        options,
        progress: 0,
        recordsProcessed: 0,
        totalRecords: 0,
        archiveSize: 0,
        errors: []
      };

      this.activeJobs.set(jobId, job);

      // Validate archival request
      await this.validateArchivalRequest(options);

      // Get data to archive
      const data = await this.fetchArchivalData(options, job);
      job.totalRecords = data.length;

      // Create archive package
      const archiveInfo = await this.createArchivePackage(data, options, job);

      // Update job completion
      job.status = 'completed';
      job.endTime = Date.now();
      job.duration = job.endTime - job.startTime;
      job.archiveFile = archiveInfo.filePath;
      job.archiveSize = archiveInfo.size;
      job.checksum = archiveInfo.checksum;

      // Update index and metrics
      await this.updateArchiveIndex(archiveInfo);
      this.updateArchivalMetrics(job);

      // Compliance logging
      if (this.config.compliance.accessLogging) {
        await this.logArchivalEvent(job, 'ARCHIVE_CREATED');
      }

      logger.info('Archive created successfully', {
        jobId,
        recordCount: job.totalRecords,
        archiveSize: job.archiveSize,
        duration: job.duration
      });

      return {
        jobId,
        archiveId: archiveInfo.id,
        filePath: archiveInfo.filePath,
        size: archiveInfo.size,
        recordCount: job.totalRecords,
        checksum: archiveInfo.checksum,
        duration: job.duration
      };

    } catch (error) {
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.endTime = Date.now();
      }

      this.metrics.archival.failedJobs++;
      logger.error('Archive creation failed', { jobId, error: error.message });
      throw error;
    }
  }

  async validateArchivalRequest(options) {
    const { entityType, filters, retentionOverride } = options;

    // Validate entity type
    const validTypes = ['samples', 'test_cases', 'reports', 'audit_logs', 'system_logs'];
    if (!validTypes.includes(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    // Check permissions
    if (retentionOverride && !options.adminOverride) {
      throw new Error('Admin override required for retention policy changes');
    }

    // Validate filters
    if (filters && typeof filters !== 'object') {
      throw new Error('Filters must be an object');
    }
  }

  async fetchArchivalData(options, job) {
    const { entityType, filters, limit } = options;

    // Build query for archival candidates
    const query = this.buildArchivalQuery(entityType, filters);
    
    // Execute query with batching
    const data = [];
    const batchSize = this.config.performance.batchSize;
    let offset = 0;
    let batch;

    do {
      batch = await this.executeArchivalQuery(query, offset, batchSize);
      data.push(...batch);
      
      offset += batchSize;
      job.progress = Math.min((data.length / (limit || data.length + batchSize)) * 50, 50);
      job.recordsProcessed = data.length;

      // Memory management
      if (data.length * 1000 > this.config.performance.memoryLimit) {
        break; // Prevent memory overflow
      }

    } while (batch.length === batchSize && (!limit || data.length < limit));

    return data;
  }

  buildArchivalQuery(entityType, filters = {}) {
    const baseQuery = {
      entityType,
      conditions: [],
      orderBy: 'created_at ASC'
    };

    // Add retention policy conditions
    const policy = this.retentionPolicies.get(entityType);
    if (policy && policy.conditions) {
      for (const [field, value] of Object.entries(policy.conditions)) {
        if (field.startsWith('exclude_')) {
          const actualField = field.replace('exclude_', '');
          baseQuery.conditions.push({
            field: actualField,
            operator: 'NOT IN',
            value: Array.isArray(value) ? value : [value]
          });
        } else {
          baseQuery.conditions.push({
            field,
            operator: Array.isArray(value) ? 'IN' : '=',
            value
          });
        }
      }
    }

    // Add age-based filtering
    if (policy && policy.archiveAfterDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.archiveAfterDays);
      
      baseQuery.conditions.push({
        field: 'created_at',
        operator: '<',
        value: cutoffDate.toISOString()
      });
    }

    // Add custom filters
    for (const [field, value] of Object.entries(filters)) {
      baseQuery.conditions.push({
        field,
        operator: Array.isArray(value) ? 'IN' : '=',
        value
      });
    }

    return baseQuery;
  }

  async executeArchivalQuery(query, offset = 0, limit = 1000) {
    // Mock implementation - replace with actual database query
    const mockData = [];
    
    for (let i = 0; i < Math.min(limit, 100); i++) {
      mockData.push({
        id: offset + i + 1,
        entityType: query.entityType,
        data: {
          sample_id: `25_${String(offset + i + 1).padStart(3, '0')}`,
          name: `Sample ${offset + i + 1}`,
          status: 'completed',
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        metadata: {
          archived: false,
          legal_hold: false
        }
      });
    }

    return mockData;
  }

  async createArchivePackage(data, options, job) {
    const archiveId = this.generateArchiveId(options.entityType);
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${options.entityType}_archive_${timestamp}_${archiveId}.tar.gz`;
    const filePath = path.join(this.config.storage.archivePath, options.entityType, fileName);

    // Create archive stream
    const output = fs.createWriteStream(filePath);
    const archive = archiver('tar', {
      gzip: true,
      gzipOptions: { level: this.config.storage.compressionLevel }
    });

    return new Promise((resolve, reject) => {
      let totalSize = 0;
      const startSize = data.length;

      output.on('close', async () => {
        try {
          const stats = fs.statSync(filePath);
          const checksum = await this.calculateFileChecksum(filePath);
          
          // Apply encryption if enabled
          let finalPath = filePath;
          if (this.config.storage.encryption && this.encryptionKey) {
            finalPath = await this.encryptArchive(filePath);
          }

          // Apply digital signature if required
          let signature = null;
          if (this.config.compliance.requireSignedArchives && this.signingKey) {
            signature = await this.signArchive(finalPath);
          }

          const archiveInfo = {
            id: archiveId,
            entityType: options.entityType,
            filePath: finalPath,
            originalPath: filePath,
            size: stats.size,
            recordCount: data.length,
            checksum,
            signature,
            encrypted: this.config.storage.encryption,
            compressionRatio: totalSize > 0 ? stats.size / totalSize : 0,
            createdAt: new Date().toISOString(),
            retentionUntil: this.calculateRetentionDate(options.entityType),
            metadata: {
              entityType: options.entityType,
              originalRecordCount: data.length,
              filters: options.filters,
              compliance: this.config.compliance.standard
            }
          };

          resolve(archiveInfo);

        } catch (error) {
          reject(error);
        }
      });

      output.on('error', reject);
      archive.on('error', reject);

      archive.on('progress', (progress) => {
        job.progress = 50 + (progress.entries.processed / data.length) * 50;
        totalSize = progress.fs.totalBytes;
      });

      archive.pipe(output);

      // Add archive metadata
      const manifest = {
        archiveId,
        entityType: options.entityType,
        recordCount: data.length,
        createdAt: new Date().toISOString(),
        compliance: this.config.compliance.standard,
        retentionPolicy: this.retentionPolicies.get(options.entityType),
        creator: options.userId || 'system'
      };

      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

      // Add data in batches
      const batchSize = 1000;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchFileName = `data_batch_${Math.floor(i / batchSize) + 1}.jsonl`;
        const batchData = batch.map(record => JSON.stringify(record)).join('\n');
        
        archive.append(batchData, { name: batchFileName });
        
        job.recordsProcessed = Math.min(i + batchSize, data.length);
      }

      // Add integrity information
      const integrityInfo = {
        totalRecords: data.length,
        checksum: this.calculateDataChecksum(data),
        createdAt: new Date().toISOString()
      };

      archive.append(JSON.stringify(integrityInfo, null, 2), { name: 'integrity.json' });

      archive.finalize();
    });
  }

  async encryptArchive(filePath) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not provided');
    }

    const encryptedPath = filePath + '.enc';
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(encryptedPath);

    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output)
        .on('finish', () => {
          // Remove unencrypted file
          fs.unlinkSync(filePath);
          resolve(encryptedPath);
        })
        .on('error', reject);
    });
  }

  async signArchive(filePath) {
    if (!this.signingKey) {
      return null;
    }

    const fileData = fs.readFileSync(filePath);
    const sign = crypto.createSign('SHA256');
    sign.update(fileData);
    
    return sign.sign(this.signingKey, 'hex');
  }

  calculateRetentionDate(entityType) {
    const policy = this.retentionPolicies.get(entityType);
    if (!policy) return null;

    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + policy.retentionDays);
    
    return retentionDate.toISOString();
  }

  calculateDataChecksum(data) {
    const dataString = JSON.stringify(data.map(record => record.id).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  async calculateFileChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async updateArchiveIndex(archiveInfo) {
    this.archiveIndex.set(archiveInfo.id, archiveInfo);
    
    // Update storage metrics
    this.metrics.storage.totalArchives++;
    this.metrics.storage.totalArchiveSize += archiveInfo.size;
    
    if (!this.metrics.storage.oldestArchive || 
        archiveInfo.createdAt < this.metrics.storage.oldestArchive) {
      this.metrics.storage.oldestArchive = archiveInfo.createdAt;
    }
    
    if (!this.metrics.storage.newestArchive || 
        archiveInfo.createdAt > this.metrics.storage.newestArchive) {
      this.metrics.storage.newestArchive = archiveInfo.createdAt;
    }

    await this.saveArchiveIndex();
  }

  updateArchivalMetrics(job) {
    this.metrics.archival.totalJobs++;
    this.metrics.archival.completedJobs++;
    this.metrics.archival.totalSizeArchived += job.archiveSize;
    this.metrics.archival.totalRecordsArchived += job.totalRecords;

    // Update compression ratio
    const totalJobs = this.metrics.archival.completedJobs;
    const currentAvg = this.metrics.archival.avgCompressionRatio;
    const jobRatio = job.archiveSize / (job.totalRecords * 1000); // Estimated original size
    
    this.metrics.archival.avgCompressionRatio = 
      (currentAvg * (totalJobs - 1) + jobRatio) / totalJobs;
  }

  // Retention Management
  async enforceRetentionPolicies() {
    logger.info('Starting retention policy enforcement');

    for (const [policyId, policy] of this.retentionPolicies) {
      try {
        await this.enforceRetentionPolicy(policy);
      } catch (error) {
        logger.error('Failed to enforce retention policy', { 
          policyId, 
          error: error.message 
        });
      }
    }

    logger.info('Retention policy enforcement completed');
  }

  async enforceRetentionPolicy(policy) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.deleteAfterDays);

    // Find records to delete
    const expiredRecords = await this.findExpiredRecords(policy, cutoffDate);
    
    if (expiredRecords.length === 0) {
      return;
    }

    logger.info('Enforcing retention policy', {
      entityType: policy.entityType,
      expiredRecords: expiredRecords.length,
      cutoffDate: cutoffDate.toISOString()
    });

    // Check for legal holds
    const recordsToDelete = await this.filterLegalHolds(expiredRecords, policy);

    // Delete expired records
    let deletedCount = 0;
    let reclaimedSpace = 0;

    for (const record of recordsToDelete) {
      try {
        const deletionResult = await this.deleteRecord(record, policy);
        deletedCount++;
        reclaimedSpace += deletionResult.spaceReclaimed || 0;

        // Log deletion for compliance
        if (this.config.compliance.accessLogging) {
          await this.logRetentionEvent(record, policy, 'RECORD_DELETED');
        }

      } catch (error) {
        logger.error('Failed to delete record', {
          recordId: record.id,
          entityType: policy.entityType,
          error: error.message
        });
      }
    }

    // Update metrics
    this.metrics.retention.recordsDeleted += deletedCount;
    this.metrics.retention.spaceReclaimed += reclaimedSpace;
    this.metrics.retention.policiesEnforced++;

    logger.info('Retention policy enforced', {
      entityType: policy.entityType,
      deletedRecords: deletedCount,
      reclaimedSpace: reclaimedSpace
    });
  }

  async findExpiredRecords(policy, cutoffDate) {
    // Mock implementation - replace with actual database query
    const mockRecords = [];
    
    for (let i = 1; i <= 50; i++) {
      const recordDate = new Date(cutoffDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      mockRecords.push({
        id: i,
        entityType: policy.entityType,
        createdAt: recordDate.toISOString(),
        status: 'completed',
        legalHold: Math.random() < 0.1, // 10% chance of legal hold
        size: Math.floor(Math.random() * 10000) + 1000
      });
    }

    return mockRecords.filter(record => 
      new Date(record.createdAt) < cutoffDate
    );
  }

  async filterLegalHolds(records, policy) {
    if (!policy.legalHoldOverride) {
      // Never delete if policy doesn't allow legal hold override
      return records.filter(record => !record.legalHold);
    }

    // Check each record for active legal holds
    const filteredRecords = [];
    
    for (const record of records) {
      const hasLegalHold = await this.checkLegalHold(record);
      
      if (!hasLegalHold) {
        filteredRecords.push(record);
      } else {
        this.metrics.retention.legalHoldsActive++;
        logger.debug('Record skipped due to legal hold', {
          recordId: record.id,
          entityType: record.entityType
        });
      }
    }

    return filteredRecords;
  }

  async checkLegalHold(record) {
    // Mock implementation - replace with actual legal hold check
    return record.legalHold || Math.random() < 0.05; // 5% random legal hold
  }

  async deleteRecord(record, policy) {
    // Mock implementation - replace with actual record deletion
    logger.debug('Deleting record', {
      recordId: record.id,
      entityType: record.entityType,
      policy: policy.entityType
    });

    // Simulate space reclamation
    const spaceReclaimed = record.size || Math.floor(Math.random() * 10000) + 1000;

    return {
      recordId: record.id,
      spaceReclaimed,
      deletedAt: new Date().toISOString()
    };
  }

  // Archive Retrieval
  async retrieveArchive(archiveId, options = {}) {
    const archiveInfo = this.archiveIndex.get(archiveId);
    
    if (!archiveInfo) {
      throw new Error(`Archive not found: ${archiveId}`);
    }

    // Check access permissions
    if (options.userId && !this.checkArchiveAccess(archiveInfo, options.userId)) {
      throw new Error('Insufficient permissions to access archive');
    }

    // Log access for compliance
    if (this.config.compliance.accessLogging) {
      await this.logArchivalEvent(archiveInfo, 'ARCHIVE_ACCESSED', options.userId);
    }

    try {
      let filePath = archiveInfo.filePath;

      // Decrypt if necessary
      if (archiveInfo.encrypted && this.encryptionKey) {
        filePath = await this.decryptArchive(archiveInfo.filePath);
      }

      // Verify integrity
      if (this.config.compliance.integrityChecks) {
        await this.verifyArchiveIntegrity(archiveInfo, filePath);
      }

      // Extract archive contents
      const extractedData = await this.extractArchiveContents(filePath, options);

      return {
        archiveId,
        data: extractedData,
        metadata: archiveInfo.metadata,
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to retrieve archive', {
        archiveId,
        error: error.message
      });
      throw error;
    }
  }

  async decryptArchive(encryptedPath) {
    if (!this.encryptionKey) {
      throw new Error('Decryption key not available');
    }

    const decryptedPath = encryptedPath.replace('.enc', '.decrypted');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    
    const input = fs.createReadStream(encryptedPath);
    const output = fs.createWriteStream(decryptedPath);

    return new Promise((resolve, reject) => {
      input.pipe(decipher).pipe(output)
        .on('finish', () => resolve(decryptedPath))
        .on('error', reject);
    });
  }

  async verifyArchiveIntegrity(archiveInfo, filePath) {
    const currentChecksum = await this.calculateFileChecksum(filePath);
    
    if (currentChecksum !== archiveInfo.checksum) {
      throw new Error(`Archive integrity check failed for ${archiveInfo.id}`);
    }

    // Verify digital signature if present
    if (archiveInfo.signature && this.signingKey) {
      const fileData = fs.readFileSync(filePath);
      const verify = crypto.createVerify('SHA256');
      verify.update(fileData);
      
      const isValid = verify.verify(this.signingKey, archiveInfo.signature, 'hex');
      if (!isValid) {
        throw new Error(`Archive signature verification failed for ${archiveInfo.id}`);
      }
    }

    logger.debug('Archive integrity verified', { archiveId: archiveInfo.id });
  }

  async extractArchiveContents(filePath, options = {}) {
    // Mock implementation - replace with actual archive extraction
    return {
      recordCount: Math.floor(Math.random() * 1000) + 100,
      extractedRecords: options.limit || 'all',
      manifest: {
        archiveId: 'mock_archive_id',
        entityType: 'samples',
        createdAt: new Date().toISOString()
      }
    };
  }

  checkArchiveAccess(archiveInfo, userId) {
    // Mock implementation - replace with actual access control
    return true; // Allow access for demo
  }

  // Utility Methods
  generateJobId(type) {
    return `${type}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  generateArchiveId(entityType) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${entityType}_${timestamp}_${random}`;
  }

  scheduleAutomatedArchival() {
    // Mock scheduling - replace with actual cron job or scheduler
    setInterval(async () => {
      try {
        await this.runAutomatedArchival();
      } catch (error) {
        logger.error('Automated archival failed', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  async runAutomatedArchival() {
    logger.info('Running automated archival');

    for (const [entityType] of this.retentionPolicies) {
      try {
        // Check if archival is needed based on triggers
        const needsArchival = await this.checkArchivalTriggers(entityType);
        
        if (needsArchival) {
          await this.createArchive({
            entityType,
            automated: true,
            userId: 'system'
          });
        }
      } catch (error) {
        logger.error('Automated archival failed for entity type', {
          entityType,
          error: error.message
        });
      }
    }
  }

  async checkArchivalTriggers(entityType) {
    // Mock implementation - replace with actual trigger checks
    return Math.random() < 0.3; // 30% chance of needing archival
  }

  startRetentionEnforcement() {
    // Run retention policy enforcement daily
    setInterval(async () => {
      try {
        await this.enforceRetentionPolicies();
      } catch (error) {
        logger.error('Retention enforcement failed', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  async logArchivalEvent(archiveInfo, eventType, userId = 'system') {
    // Mock implementation - integrate with audit service
    logger.info('Archival event logged', {
      eventType,
      archiveId: archiveInfo.id || archiveInfo.archiveId,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  async logRetentionEvent(record, policy, eventType) {
    // Mock implementation - integrate with audit service
    logger.info('Retention event logged', {
      eventType,
      recordId: record.id,
      entityType: policy.entityType,
      timestamp: new Date().toISOString()
    });
  }

  // Management Methods
  getActiveJobs() {
    return Array.from(this.activeJobs.values());
  }

  getArchiveIndex() {
    return Array.from(this.archiveIndex.values());
  }

  getRetentionPolicies() {
    return Array.from(this.retentionPolicies.values());
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeJobs: this.activeJobs.size,
      totalArchives: this.archiveIndex.size,
      retentionPolicies: this.retentionPolicies.size,
      timestamp: new Date().toISOString()
    };
  }

  async cleanup() {
    logger.info('Starting archival service cleanup');

    // Complete any active jobs
    const activeJobs = Array.from(this.activeJobs.values());
    for (const job of activeJobs) {
      if (job.status === 'started') {
        logger.warn('Terminating active archival job', { jobId: job.id });
        job.status = 'terminated';
        job.endTime = Date.now();
      }
    }

    // Save final state
    await this.saveArchiveIndex();

    logger.info('Archival service cleanup completed');
  }
}

module.exports = ArchivalService;