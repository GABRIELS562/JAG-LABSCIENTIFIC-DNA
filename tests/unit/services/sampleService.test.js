// Unit Tests for Sample Service
// This file demonstrates comprehensive unit testing patterns for the LIMS application

const { SampleService } = require('../../../backend/services/sampleService');
const { TestFixtures } = require('../../setup/database.setup');
const { ValidationError, NotFoundError } = require('../../../backend/utils/errors');

// Mock dependencies
jest.mock('../../../backend/database/connection');
jest.mock('../../../backend/services/auditService');
jest.mock('../../../backend/services/notificationService');

describe('SampleService', () => {
  let sampleService;
  let mockDatabase;
  let mockAuditService;
  let mockNotificationService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock database
    mockDatabase = {
      query: jest.fn(),
      transaction: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn()
    };
    
    // Mock audit service
    mockAuditService = {
      logAction: jest.fn(),
      logChange: jest.fn()
    };
    
    // Mock notification service
    mockNotificationService = {
      sendNotification: jest.fn(),
      sendEmail: jest.fn()
    };
    
    // Initialize service with mocks
    sampleService = new SampleService({
      database: mockDatabase,
      auditService: mockAuditService,
      notificationService: mockNotificationService
    });
  });

  describe('createSample', () => {
    it('should create a new sample successfully', async () => {
      // Arrange
      const sampleData = TestFixtures.createSample({
        sampleId: 'SAMPLE001',
        patientId: 'PATIENT001',
        sampleType: 'DNA'
      });
      
      const expectedSample = {
        id: 1,
        ...sampleData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockDatabase.query.mockResolvedValueOnce({
        rows: [expectedSample]
      });
      
      // Act
      const result = await sampleService.createSample(sampleData);
      
      // Assert
      expect(result).toEqual(expectedSample);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO samples'),
        expect.arrayContaining([
          sampleData.sampleId,
          sampleData.patientId,
          sampleData.sampleType
        ])
      );
      expect(mockAuditService.logAction).toHaveBeenCalledWith({
        action: 'CREATE_SAMPLE',
        resourceId: expectedSample.id,
        details: sampleData
      });
    });

    it('should throw ValidationError for invalid sample data', async () => {
      // Arrange
      const invalidSampleData = {
        // Missing required fields
        patientId: 'PATIENT001'
      };
      
      // Act & Assert
      await expect(sampleService.createSample(invalidSampleData))
        .rejects
        .toThrow(ValidationError);
      
      expect(mockDatabase.query).not.toHaveBeenCalled();
      expect(mockAuditService.logAction).not.toHaveBeenCalled();
    });

    it('should throw error for duplicate sample ID', async () => {
      // Arrange
      const sampleData = TestFixtures.createSample({
        sampleId: 'SAMPLE001'
      });
      
      mockDatabase.query.mockRejectedValueOnce({
        code: '23505', // PostgreSQL unique violation
        constraint: 'samples_sample_id_unique'
      });
      
      // Act & Assert
      await expect(sampleService.createSample(sampleData))
        .rejects
        .toThrow('Sample ID already exists');
      
      expect(mockDatabase.query).toHaveBeenCalledTimes(1);
      expect(mockAuditService.logAction).not.toHaveBeenCalled();
    });

    it('should handle database transaction rollback on error', async () => {
      // Arrange
      const sampleData = TestFixtures.createSample();
      
      mockDatabase.begin.mockResolvedValueOnce();
      mockDatabase.query.mockRejectedValueOnce(new Error('Database error'));
      mockDatabase.rollback.mockResolvedValueOnce();
      
      // Act & Assert
      await expect(sampleService.createSample(sampleData))
        .rejects
        .toThrow('Database error');
      
      expect(mockDatabase.begin).toHaveBeenCalled();
      expect(mockDatabase.rollback).toHaveBeenCalled();
      expect(mockDatabase.commit).not.toHaveBeenCalled();
    });
  });

  describe('getSample', () => {
    it('should retrieve sample by ID successfully', async () => {
      // Arrange
      const sampleId = 1;
      const expectedSample = {
        id: sampleId,
        sampleId: 'SAMPLE001',
        patientId: 'PATIENT001',
        sampleType: 'DNA',
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockDatabase.query.mockResolvedValueOnce({
        rows: [expectedSample]
      });
      
      // Act
      const result = await sampleService.getSample(sampleId);
      
      // Assert
      expect(result).toEqual(expectedSample);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM samples WHERE id = $1'),
        [sampleId]
      );
    });

    it('should throw NotFoundError for non-existent sample', async () => {
      // Arrange
      const sampleId = 999;
      
      mockDatabase.query.mockResolvedValueOnce({
        rows: []
      });
      
      // Act & Assert
      await expect(sampleService.getSample(sampleId))
        .rejects
        .toThrow(NotFoundError);
      
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM samples WHERE id = $1'),
        [sampleId]
      );
    });

    it('should handle database connection errors', async () => {
      // Arrange
      const sampleId = 1;
      
      mockDatabase.query.mockRejectedValueOnce(new Error('Connection failed'));
      
      // Act & Assert
      await expect(sampleService.getSample(sampleId))
        .rejects
        .toThrow('Connection failed');
    });
  });

  describe('updateSample', () => {
    it('should update sample successfully', async () => {
      // Arrange
      const sampleId = 1;
      const updateData = {
        status: 'processing',
        notes: 'Updated notes'
      };
      
      const existingSample = {
        id: sampleId,
        sampleId: 'SAMPLE001',
        status: 'received',
        notes: 'Original notes'
      };
      
      const updatedSample = {
        ...existingSample,
        ...updateData,
        updatedAt: new Date()
      };
      
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [existingSample] }) // Get existing
        .mockResolvedValueOnce({ rows: [updatedSample] });  // Update
      
      // Act
      const result = await sampleService.updateSample(sampleId, updateData);
      
      // Assert
      expect(result).toEqual(updatedSample);
      expect(mockDatabase.query).toHaveBeenCalledTimes(2);
      expect(mockAuditService.logChange).toHaveBeenCalledWith({
        action: 'UPDATE_SAMPLE',
        resourceId: sampleId,
        oldValues: existingSample,
        newValues: updatedSample
      });
    });

    it('should throw NotFoundError for non-existent sample', async () => {
      // Arrange
      const sampleId = 999;
      const updateData = { status: 'processing' };
      
      mockDatabase.query.mockResolvedValueOnce({ rows: [] });
      
      // Act & Assert
      await expect(sampleService.updateSample(sampleId, updateData))
        .rejects
        .toThrow(NotFoundError);
      
      expect(mockDatabase.query).toHaveBeenCalledTimes(1);
      expect(mockAuditService.logChange).not.toHaveBeenCalled();
    });

    it('should validate update data', async () => {
      // Arrange
      const sampleId = 1;
      const invalidUpdateData = {
        status: 'invalid_status',
        sampleType: '' // Empty string
      };
      
      // Act & Assert
      await expect(sampleService.updateSample(sampleId, invalidUpdateData))
        .rejects
        .toThrow(ValidationError);
      
      expect(mockDatabase.query).not.toHaveBeenCalled();
    });
  });

  describe('deleteSample', () => {
    it('should delete sample successfully', async () => {
      // Arrange
      const sampleId = 1;
      const existingSample = {
        id: sampleId,
        sampleId: 'SAMPLE001',
        status: 'received'
      };
      
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [existingSample] }) // Get existing
        .mockResolvedValueOnce({ rowCount: 1 });            // Delete
      
      // Act
      const result = await sampleService.deleteSample(sampleId);
      
      // Assert
      expect(result).toBe(true);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM samples WHERE id = $1'),
        [sampleId]
      );
      expect(mockAuditService.logAction).toHaveBeenCalledWith({
        action: 'DELETE_SAMPLE',
        resourceId: sampleId,
        details: existingSample
      });
    });

    it('should throw NotFoundError for non-existent sample', async () => {
      // Arrange
      const sampleId = 999;
      
      mockDatabase.query.mockResolvedValueOnce({ rows: [] });
      
      // Act & Assert
      await expect(sampleService.deleteSample(sampleId))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should prevent deletion of samples with active analyses', async () => {
      // Arrange
      const sampleId = 1;
      const existingSample = {
        id: sampleId,
        sampleId: 'SAMPLE001',
        status: 'processing'
      };
      
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [existingSample] }) // Get existing
        .mockRejectedValueOnce({
          code: '23503', // PostgreSQL foreign key violation
          constraint: 'analyses_sample_id_fkey'
        });
      
      // Act & Assert
      await expect(sampleService.deleteSample(sampleId))
        .rejects
        .toThrow('Cannot delete sample with active analyses');
    });
  });

  describe('searchSamples', () => {
    it('should search samples with filters', async () => {
      // Arrange
      const searchCriteria = {
        sampleType: 'DNA',
        status: 'received',
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
        page: 1,
        limit: 10
      };
      
      const expectedSamples = [
        { id: 1, sampleId: 'SAMPLE001', sampleType: 'DNA', status: 'received' },
        { id: 2, sampleId: 'SAMPLE002', sampleType: 'DNA', status: 'received' }
      ];
      
      mockDatabase.query
        .mockResolvedValueOnce({ rows: expectedSamples })     // Search results
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });   // Total count
      
      // Act
      const result = await sampleService.searchSamples(searchCriteria);
      
      // Assert
      expect(result).toEqual({
        samples: expectedSamples,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      
      expect(mockDatabase.query).toHaveBeenCalledTimes(2);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['DNA', 'received'])
      );
    });

    it('should handle empty search results', async () => {
      // Arrange
      const searchCriteria = {
        sampleType: 'RNA',
        status: 'completed'
      };
      
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] })                 // No results
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });  // Zero count
      
      // Act
      const result = await sampleService.searchSamples(searchCriteria);
      
      // Assert
      expect(result).toEqual({
        samples: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });
    });

    it('should validate search criteria', async () => {
      // Arrange
      const invalidCriteria = {
        page: -1,
        limit: 1000, // Too large
        dateFrom: 'invalid-date'
      };
      
      // Act & Assert
      await expect(sampleService.searchSamples(invalidCriteria))
        .rejects
        .toThrow(ValidationError);
      
      expect(mockDatabase.query).not.toHaveBeenCalled();
    });
  });

  describe('updateSampleStatus', () => {
    it('should update sample status and send notifications', async () => {
      // Arrange
      const sampleId = 1;
      const newStatus = 'completed';
      const userId = 123;
      
      const existingSample = {
        id: sampleId,
        sampleId: 'SAMPLE001',
        status: 'processing',
        patientId: 'PATIENT001'
      };
      
      const updatedSample = {
        ...existingSample,
        status: newStatus,
        updatedAt: new Date()
      };
      
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [existingSample] })
        .mockResolvedValueOnce({ rows: [updatedSample] });
      
      // Act
      const result = await sampleService.updateSampleStatus(sampleId, newStatus, userId);
      
      // Assert
      expect(result).toEqual(updatedSample);
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        type: 'SAMPLE_STATUS_UPDATE',
        sampleId: sampleId,
        oldStatus: 'processing',
        newStatus: 'completed',
        userId: userId
      });
    });

    it('should validate status transitions', async () => {
      // Arrange
      const sampleId = 1;
      const invalidStatus = 'invalid_status';
      const userId = 123;
      
      // Act & Assert
      await expect(sampleService.updateSampleStatus(sampleId, invalidStatus, userId))
        .rejects
        .toThrow(ValidationError);
      
      expect(mockDatabase.query).not.toHaveBeenCalled();
      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      // Arrange
      const bulkSamples = Array.from({ length: 100 }, (_, i) => 
        TestFixtures.createSample({ sampleId: `SAMPLE${i + 1}` })
      );
      
      mockDatabase.query.mockResolvedValue({ rows: bulkSamples });
      
      // Act
      const startTime = Date.now();
      await sampleService.createBulkSamples(bulkSamples);
      const endTime = Date.now();
      
      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO samples'),
        expect.any(Array)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database timeouts gracefully', async () => {
      // Arrange
      const sampleId = 1;
      const timeoutError = new Error('Connection timeout');
      timeoutError.code = 'ETIMEDOUT';
      
      mockDatabase.query.mockRejectedValueOnce(timeoutError);
      
      // Act & Assert
      await expect(sampleService.getSample(sampleId))
        .rejects
        .toThrow('Database connection timeout');
    });

    it('should handle concurrent modification conflicts', async () => {
      // Arrange
      const sampleId = 1;
      const updateData = { status: 'processing' };
      
      const concurrencyError = new Error('Concurrent modification');
      concurrencyError.code = '40001'; // PostgreSQL serialization failure
      
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ id: sampleId }] })
        .mockRejectedValueOnce(concurrencyError);
      
      // Act & Assert
      await expect(sampleService.updateSample(sampleId, updateData))
        .rejects
        .toThrow('Sample was modified by another user');
    });
  });
});