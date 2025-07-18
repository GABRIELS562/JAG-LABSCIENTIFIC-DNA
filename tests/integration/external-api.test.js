// External API Integration Tests for LIMS Application
// This test suite validates integration with external laboratory and healthcare systems

const axios = require('axios');
const nock = require('nock');
const { expect } = require('chai');
const config = require('../config/test-config');

describe('External API Integration Tests', () => {
  let mockLabEquipment;
  let mockEMRSystem;
  let mockCloudStorage;
  let mockNotificationService;

  beforeEach(() => {
    // Setup mocks for external services
    mockLabEquipment = nock(config.externalServices.labEquipment.baseUrl)
      .defaultReplyHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      });

    mockEMRSystem = nock(config.externalServices.emr.baseUrl)
      .defaultReplyHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      });

    mockCloudStorage = nock(config.externalServices.cloudStorage.baseUrl)
      .defaultReplyHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      });

    mockNotificationService = nock(config.externalServices.notifications.baseUrl)
      .defaultReplyHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Laboratory Equipment Integration', () => {
    it('should successfully retrieve equipment status', async () => {
      const mockEquipmentData = {
        equipmentId: 'SEQUENCER_001',
        status: 'available',
        currentJob: null,
        queueLength: 0,
        maintenanceScheduled: false,
        lastCalibration: '2024-01-15T08:00:00Z',
        nextCalibration: '2024-07-15T08:00:00Z'
      };

      mockLabEquipment
        .get('/equipment/SEQUENCER_001/status')
        .reply(200, mockEquipmentData);

      const response = await axios.get(
        `${config.externalServices.labEquipment.baseUrl}/equipment/SEQUENCER_001/status`,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.labEquipment.apiKey}`
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.equipmentId).to.equal('SEQUENCER_001');
      expect(response.data.status).to.equal('available');
      expect(response.data).to.have.property('lastCalibration');
      expect(response.data).to.have.property('nextCalibration');
    });

    it('should handle equipment submission request', async () => {
      const sampleSubmission = {
        sampleId: 'SAMPLE_000001',
        analysisType: 'whole_exome_sequencing',
        priority: 'normal',
        expectedCompletionDate: '2024-01-20T00:00:00Z',
        specialInstructions: 'Handle with care - oncology sample'
      };

      const mockSubmissionResponse = {
        submissionId: 'SUB_001',
        status: 'accepted',
        estimatedStartTime: '2024-01-18T10:00:00Z',
        estimatedCompletionTime: '2024-01-20T14:00:00Z',
        queuePosition: 3
      };

      mockLabEquipment
        .post('/equipment/SEQUENCER_001/submit', sampleSubmission)
        .reply(201, mockSubmissionResponse);

      const response = await axios.post(
        `${config.externalServices.labEquipment.baseUrl}/equipment/SEQUENCER_001/submit`,
        sampleSubmission,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.labEquipment.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data.submissionId).to.equal('SUB_001');
      expect(response.data.status).to.equal('accepted');
      expect(response.data).to.have.property('estimatedStartTime');
      expect(response.data).to.have.property('queuePosition');
    });

    it('should handle equipment error conditions', async () => {
      mockLabEquipment
        .get('/equipment/SEQUENCER_001/status')
        .reply(503, {
          error: 'Service Unavailable',
          message: 'Equipment is currently offline for maintenance',
          retryAfter: 3600
        });

      try {
        await axios.get(
          `${config.externalServices.labEquipment.baseUrl}/equipment/SEQUENCER_001/status`,
          {
            headers: {
              'Authorization': `Bearer ${config.externalServices.labEquipment.apiKey}`
            }
          }
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(503);
        expect(error.response.data.error).to.equal('Service Unavailable');
        expect(error.response.data).to.have.property('retryAfter');
      }
    });

    it('should handle equipment queue management', async () => {
      const mockQueueData = {
        equipmentId: 'SEQUENCER_001',
        queueLength: 5,
        currentJob: {
          submissionId: 'SUB_005',
          sampleId: 'SAMPLE_000045',
          startTime: '2024-01-17T09:00:00Z',
          estimatedCompletionTime: '2024-01-17T15:00:00Z',
          progress: 45
        },
        upcomingJobs: [
          {
            submissionId: 'SUB_006',
            sampleId: 'SAMPLE_000046',
            priority: 'high',
            estimatedStartTime: '2024-01-17T15:00:00Z'
          },
          {
            submissionId: 'SUB_007',
            sampleId: 'SAMPLE_000047',
            priority: 'normal',
            estimatedStartTime: '2024-01-17T21:00:00Z'
          }
        ]
      };

      mockLabEquipment
        .get('/equipment/SEQUENCER_001/queue')
        .reply(200, mockQueueData);

      const response = await axios.get(
        `${config.externalServices.labEquipment.baseUrl}/equipment/SEQUENCER_001/queue`,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.labEquipment.apiKey}`
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.queueLength).to.equal(5);
      expect(response.data.currentJob).to.have.property('progress');
      expect(response.data.upcomingJobs).to.be.an('array');
      expect(response.data.upcomingJobs).to.have.lengthOf(2);
    });
  });

  describe('EMR System Integration', () => {
    it('should successfully retrieve patient information', async () => {
      const mockPatientData = {
        patientId: 'PAT_001',
        mrn: 'MRN123456',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1985-03-15',
        gender: 'male',
        contactInfo: {
          phone: '+1-555-0123',
          email: 'john.doe@example.com',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345'
          }
        },
        insurance: {
          primary: {
            provider: 'Blue Cross',
            policyNumber: 'BC123456789',
            groupNumber: 'GRP001'
          }
        },
        allergies: ['Penicillin', 'Shellfish'],
        medications: [
          {
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'once daily'
          }
        ]
      };

      mockEMRSystem
        .get('/patients/PAT_001')
        .reply(200, mockPatientData);

      const response = await axios.get(
        `${config.externalServices.emr.baseUrl}/patients/PAT_001`,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.emr.apiKey}`,
            'X-Facility-ID': 'FACILITY_001'
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.patientId).to.equal('PAT_001');
      expect(response.data.mrn).to.equal('MRN123456');
      expect(response.data.contactInfo).to.have.property('phone');
      expect(response.data.insurance).to.have.property('primary');
      expect(response.data.allergies).to.be.an('array');
      expect(response.data.medications).to.be.an('array');
    });

    it('should handle patient lookup by MRN', async () => {
      const mockSearchResults = {
        total: 1,
        patients: [
          {
            patientId: 'PAT_001',
            mrn: 'MRN123456',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1985-03-15',
            lastVisit: '2024-01-10T14:30:00Z'
          }
        ]
      };

      mockEMRSystem
        .get('/patients/search?mrn=MRN123456')
        .reply(200, mockSearchResults);

      const response = await axios.get(
        `${config.externalServices.emr.baseUrl}/patients/search`,
        {
          params: { mrn: 'MRN123456' },
          headers: {
            'Authorization': `Bearer ${config.externalServices.emr.apiKey}`,
            'X-Facility-ID': 'FACILITY_001'
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.total).to.equal(1);
      expect(response.data.patients).to.be.an('array');
      expect(response.data.patients[0].mrn).to.equal('MRN123456');
    });

    it('should create lab order in EMR system', async () => {
      const labOrder = {
        patientId: 'PAT_001',
        orderingPhysician: 'DR_SMITH',
        tests: [
          {
            testCode: 'GENETIC_PANEL',
            testName: 'Comprehensive Genetic Panel',
            priority: 'routine',
            specimenType: 'blood'
          }
        ],
        clinicalIndication: 'Family history of breast cancer',
        orderDate: '2024-01-17T10:00:00Z'
      };

      const mockOrderResponse = {
        orderId: 'ORDER_001',
        status: 'pending',
        accessionNumber: 'ACC123456',
        specimenCollection: {
          scheduledDate: '2024-01-18T09:00:00Z',
          location: 'Outpatient Lab'
        }
      };

      mockEMRSystem
        .post('/orders', labOrder)
        .reply(201, mockOrderResponse);

      const response = await axios.post(
        `${config.externalServices.emr.baseUrl}/orders`,
        labOrder,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.emr.apiKey}`,
            'Content-Type': 'application/json',
            'X-Facility-ID': 'FACILITY_001'
          }
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data.orderId).to.equal('ORDER_001');
      expect(response.data.status).to.equal('pending');
      expect(response.data).to.have.property('accessionNumber');
      expect(response.data.specimenCollection).to.have.property('scheduledDate');
    });

    it('should handle EMR authentication errors', async () => {
      mockEMRSystem
        .get('/patients/PAT_001')
        .reply(401, {
          error: 'Unauthorized',
          message: 'Invalid or expired authentication token'
        });

      try {
        await axios.get(
          `${config.externalServices.emr.baseUrl}/patients/PAT_001`,
          {
            headers: {
              'Authorization': `Bearer invalid_token`,
              'X-Facility-ID': 'FACILITY_001'
            }
          }
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(401);
        expect(error.response.data.error).to.equal('Unauthorized');
      }
    });
  });

  describe('Cloud Storage Integration', () => {
    it('should successfully upload analysis results', async () => {
      const fileUpload = {
        fileName: 'genetic_analysis_SAMPLE_000001.vcf',
        contentType: 'text/plain',
        fileSize: 1024576,
        checksum: 'a1b2c3d4e5f6',
        metadata: {
          sampleId: 'SAMPLE_000001',
          analysisType: 'whole_exome_sequencing',
          timestamp: '2024-01-17T12:00:00Z'
        }
      };

      const mockUploadResponse = {
        uploadId: 'UPLOAD_001',
        fileId: 'FILE_001',
        uploadUrl: 'https://storage.example.com/upload/signed-url',
        expiresAt: '2024-01-17T13:00:00Z',
        status: 'ready'
      };

      mockCloudStorage
        .post('/files/upload', fileUpload)
        .reply(200, mockUploadResponse);

      const response = await axios.post(
        `${config.externalServices.cloudStorage.baseUrl}/files/upload`,
        fileUpload,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.cloudStorage.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.uploadId).to.equal('UPLOAD_001');
      expect(response.data.fileId).to.equal('FILE_001');
      expect(response.data).to.have.property('uploadUrl');
      expect(response.data).to.have.property('expiresAt');
    });

    it('should retrieve file metadata', async () => {
      const mockFileMetadata = {
        fileId: 'FILE_001',
        fileName: 'genetic_analysis_SAMPLE_000001.vcf',
        contentType: 'text/plain',
        fileSize: 1024576,
        uploadDate: '2024-01-17T12:00:00Z',
        checksum: 'a1b2c3d4e5f6',
        downloadUrl: 'https://storage.example.com/download/signed-url',
        expiresAt: '2024-01-17T18:00:00Z',
        metadata: {
          sampleId: 'SAMPLE_000001',
          analysisType: 'whole_exome_sequencing'
        }
      };

      mockCloudStorage
        .get('/files/FILE_001')
        .reply(200, mockFileMetadata);

      const response = await axios.get(
        `${config.externalServices.cloudStorage.baseUrl}/files/FILE_001`,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.cloudStorage.apiKey}`
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.fileId).to.equal('FILE_001');
      expect(response.data.fileName).to.equal('genetic_analysis_SAMPLE_000001.vcf');
      expect(response.data).to.have.property('downloadUrl');
      expect(response.data).to.have.property('checksum');
      expect(response.data.metadata).to.have.property('sampleId');
    });

    it('should handle file access permissions', async () => {
      mockCloudStorage
        .get('/files/FILE_001')
        .reply(403, {
          error: 'Forbidden',
          message: 'Insufficient permissions to access this file'
        });

      try {
        await axios.get(
          `${config.externalServices.cloudStorage.baseUrl}/files/FILE_001`,
          {
            headers: {
              'Authorization': `Bearer ${config.externalServices.cloudStorage.apiKey}`
            }
          }
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(403);
        expect(error.response.data.error).to.equal('Forbidden');
      }
    });
  });

  describe('Notification Service Integration', () => {
    it('should send email notification', async () => {
      const emailNotification = {
        type: 'email',
        recipient: 'patient@example.com',
        subject: 'Lab Results Available',
        template: 'lab_results_ready',
        variables: {
          patientName: 'John Doe',
          testName: 'Genetic Panel',
          resultsUrl: 'https://portal.example.com/results/123'
        },
        priority: 'normal'
      };

      const mockNotificationResponse = {
        notificationId: 'NOTIFY_001',
        status: 'sent',
        sentAt: '2024-01-17T14:30:00Z',
        deliveryStatus: 'delivered',
        messageId: 'MSG_001'
      };

      mockNotificationService
        .post('/notifications/send', emailNotification)
        .reply(200, mockNotificationResponse);

      const response = await axios.post(
        `${config.externalServices.notifications.baseUrl}/notifications/send`,
        emailNotification,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.notifications.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.notificationId).to.equal('NOTIFY_001');
      expect(response.data.status).to.equal('sent');
      expect(response.data).to.have.property('sentAt');
      expect(response.data).to.have.property('messageId');
    });

    it('should send SMS notification', async () => {
      const smsNotification = {
        type: 'sms',
        recipient: '+1-555-0123',
        message: 'Your lab results are ready. Visit https://portal.example.com/results/123',
        priority: 'high'
      };

      const mockSMSResponse = {
        notificationId: 'NOTIFY_002',
        status: 'sent',
        sentAt: '2024-01-17T14:35:00Z',
        deliveryStatus: 'delivered',
        messageId: 'SMS_001'
      };

      mockNotificationService
        .post('/notifications/send', smsNotification)
        .reply(200, mockSMSResponse);

      const response = await axios.post(
        `${config.externalServices.notifications.baseUrl}/notifications/send`,
        smsNotification,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.notifications.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.notificationId).to.equal('NOTIFY_002');
      expect(response.data.status).to.equal('sent');
      expect(response.data).to.have.property('deliveryStatus');
    });

    it('should handle notification delivery failures', async () => {
      const failedNotification = {
        type: 'email',
        recipient: 'invalid-email',
        subject: 'Test Subject',
        template: 'test_template',
        variables: {}
      };

      mockNotificationService
        .post('/notifications/send', failedNotification)
        .reply(400, {
          error: 'Bad Request',
          message: 'Invalid email address format',
          details: {
            field: 'recipient',
            value: 'invalid-email'
          }
        });

      try {
        await axios.post(
          `${config.externalServices.notifications.baseUrl}/notifications/send`,
          failedNotification,
          {
            headers: {
              'Authorization': `Bearer ${config.externalServices.notifications.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.equal('Bad Request');
        expect(error.response.data.details).to.have.property('field');
      }
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should complete full sample processing workflow', async () => {
      // Step 1: Submit sample to equipment
      const sampleSubmission = {
        sampleId: 'SAMPLE_000001',
        analysisType: 'whole_exome_sequencing',
        priority: 'normal'
      };

      mockLabEquipment
        .post('/equipment/SEQUENCER_001/submit', sampleSubmission)
        .reply(201, {
          submissionId: 'SUB_001',
          status: 'accepted',
          queuePosition: 1
        });

      // Step 2: Upload results to cloud storage
      const fileUpload = {
        fileName: 'results_SAMPLE_000001.vcf',
        contentType: 'text/plain',
        fileSize: 1024576
      };

      mockCloudStorage
        .post('/files/upload', fileUpload)
        .reply(200, {
          uploadId: 'UPLOAD_001',
          fileId: 'FILE_001',
          uploadUrl: 'https://storage.example.com/upload/signed-url'
        });

      // Step 3: Send notification
      const notification = {
        type: 'email',
        recipient: 'patient@example.com',
        subject: 'Lab Results Available',
        template: 'lab_results_ready'
      };

      mockNotificationService
        .post('/notifications/send', notification)
        .reply(200, {
          notificationId: 'NOTIFY_001',
          status: 'sent'
        });

      // Execute workflow
      const submissionResponse = await axios.post(
        `${config.externalServices.labEquipment.baseUrl}/equipment/SEQUENCER_001/submit`,
        sampleSubmission,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.labEquipment.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const uploadResponse = await axios.post(
        `${config.externalServices.cloudStorage.baseUrl}/files/upload`,
        fileUpload,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.cloudStorage.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const notificationResponse = await axios.post(
        `${config.externalServices.notifications.baseUrl}/notifications/send`,
        notification,
        {
          headers: {
            'Authorization': `Bearer ${config.externalServices.notifications.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Verify all steps completed successfully
      expect(submissionResponse.status).to.equal(201);
      expect(uploadResponse.status).to.equal(200);
      expect(notificationResponse.status).to.equal(200);
      
      expect(submissionResponse.data.submissionId).to.equal('SUB_001');
      expect(uploadResponse.data.fileId).to.equal('FILE_001');
      expect(notificationResponse.data.notificationId).to.equal('NOTIFY_001');
    });

    it('should handle cascading failures gracefully', async () => {
      // Simulate equipment failure
      mockLabEquipment
        .post('/equipment/SEQUENCER_001/submit')
        .reply(503, {
          error: 'Service Unavailable',
          message: 'Equipment is offline for maintenance'
        });

      // Verify proper error handling
      try {
        await axios.post(
          `${config.externalServices.labEquipment.baseUrl}/equipment/SEQUENCER_001/submit`,
          { sampleId: 'SAMPLE_000001' },
          {
            headers: {
              'Authorization': `Bearer ${config.externalServices.labEquipment.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(503);
        expect(error.response.data.error).to.equal('Service Unavailable');
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = [];

      // Setup multiple identical responses
      for (let i = 0; i < concurrentRequests; i++) {
        mockLabEquipment
          .get('/equipment/SEQUENCER_001/status')
          .reply(200, {
            equipmentId: 'SEQUENCER_001',
            status: 'available',
            requestId: i
          });
      }

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          axios.get(
            `${config.externalServices.labEquipment.baseUrl}/equipment/SEQUENCER_001/status`,
            {
              headers: {
                'Authorization': `Bearer ${config.externalServices.labEquipment.apiKey}`
              }
            }
          )
        );
      }

      // Execute all requests concurrently
      const responses = await Promise.all(requests);

      // Verify all requests completed successfully
      responses.forEach((response, index) => {
        expect(response.status).to.equal(200);
        expect(response.data.equipmentId).to.equal('SEQUENCER_001');
        expect(response.data.requestId).to.equal(index);
      });
    });

    it('should implement retry logic for transient failures', async () => {
      let attemptCount = 0;

      mockLabEquipment
        .get('/equipment/SEQUENCER_001/status')
        .reply(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return [500, { error: 'Internal Server Error' }];
          }
          return [200, { equipmentId: 'SEQUENCER_001', status: 'available' }];
        })
        .persist();

      const maxRetries = 3;
      let lastError;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await axios.get(
            `${config.externalServices.labEquipment.baseUrl}/equipment/SEQUENCER_001/status`,
            {
              headers: {
                'Authorization': `Bearer ${config.externalServices.labEquipment.apiKey}`
              }
            }
          );

          if (response.status === 200) {
            expect(response.data.equipmentId).to.equal('SEQUENCER_001');
            expect(attemptCount).to.equal(3);
            return;
          }
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait before retry
          }
        }
      }

      if (lastError) {
        throw lastError;
      }
    });
  });
});