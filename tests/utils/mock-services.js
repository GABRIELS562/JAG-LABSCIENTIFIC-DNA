// Mock Services for Integration Testing
// This file provides mock implementations for external services during testing

const express = require('express');
const { WebSocketServer } = require('ws');
const EventEmitter = require('events');

class MockServiceManager extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.websocketServer = null;
  }

  // Start mock laboratory equipment service
  startLabEquipmentService(port = 3010) {
    const app = express();
    app.use(express.json());

    // Equipment status endpoint
    app.get('/equipment/:equipmentId/status', (req, res) => {
      const { equipmentId } = req.params;
      
      res.json({
        equipmentId,
        status: 'available',
        currentJob: null,
        queueLength: 0,
        maintenanceScheduled: false,
        lastCalibration: '2024-01-15T08:00:00Z',
        nextCalibration: '2024-07-15T08:00:00Z'
      });
    });

    // Equipment submission endpoint
    app.post('/equipment/:equipmentId/submit', (req, res) => {
      const { equipmentId } = req.params;
      const submissionData = req.body;
      
      res.status(201).json({
        submissionId: `SUB_${Date.now()}`,
        status: 'accepted',
        estimatedStartTime: new Date(Date.now() + 30000).toISOString(),
        estimatedCompletionTime: new Date(Date.now() + 7200000).toISOString(),
        queuePosition: Math.floor(Math.random() * 5) + 1
      });
    });

    // Equipment queue endpoint
    app.get('/equipment/:equipmentId/queue', (req, res) => {
      const { equipmentId } = req.params;
      
      res.json({
        equipmentId,
        queueLength: 3,
        currentJob: {
          submissionId: 'SUB_CURRENT',
          sampleId: 'SAMPLE_CURRENT',
          startTime: new Date(Date.now() - 1800000).toISOString(),
          estimatedCompletionTime: new Date(Date.now() + 3600000).toISOString(),
          progress: 45
        },
        upcomingJobs: [
          {
            submissionId: 'SUB_NEXT_1',
            sampleId: 'SAMPLE_NEXT_1',
            priority: 'high',
            estimatedStartTime: new Date(Date.now() + 3600000).toISOString()
          },
          {
            submissionId: 'SUB_NEXT_2',
            sampleId: 'SAMPLE_NEXT_2',
            priority: 'normal',
            estimatedStartTime: new Date(Date.now() + 7200000).toISOString()
          }
        ]
      });
    });

    const server = app.listen(port, () => {
      console.log(`Mock Lab Equipment Service running on port ${port}`);
    });

    this.services.set('labEquipment', server);
    return server;
  }

  // Start mock EMR service
  startEMRService(port = 3011) {
    const app = express();
    app.use(express.json());

    // Patient lookup endpoint
    app.get('/patients/:patientId', (req, res) => {
      const { patientId } = req.params;
      
      res.json({
        patientId,
        mrn: `MRN${patientId.substr(-6)}`,
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
      });
    });

    // Patient search endpoint
    app.get('/patients/search', (req, res) => {
      const { mrn } = req.query;
      
      res.json({
        total: 1,
        patients: [
          {
            patientId: `PAT_${mrn.substr(-6)}`,
            mrn,
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1985-03-15',
            lastVisit: '2024-01-10T14:30:00Z'
          }
        ]
      });
    });

    // Lab order creation endpoint
    app.post('/orders', (req, res) => {
      const orderData = req.body;
      
      res.status(201).json({
        orderId: `ORDER_${Date.now()}`,
        status: 'pending',
        accessionNumber: `ACC${Date.now().toString().substr(-6)}`,
        specimenCollection: {
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          location: 'Outpatient Lab'
        }
      });
    });

    const server = app.listen(port, () => {
      console.log(`Mock EMR Service running on port ${port}`);
    });

    this.services.set('emr', server);
    return server;
  }

  // Start mock cloud storage service
  startCloudStorageService(port = 3012) {
    const app = express();
    app.use(express.json());

    // File upload endpoint
    app.post('/files/upload', (req, res) => {
      const fileData = req.body;
      
      res.json({
        uploadId: `UPLOAD_${Date.now()}`,
        fileId: `FILE_${Date.now()}`,
        uploadUrl: `https://mock-storage.example.com/upload/signed-url-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'ready'
      });
    });

    // File metadata endpoint
    app.get('/files/:fileId', (req, res) => {
      const { fileId } = req.params;
      
      res.json({
        fileId,
        fileName: `genetic_analysis_${fileId}.vcf`,
        contentType: 'text/plain',
        fileSize: 1024576,
        uploadDate: new Date().toISOString(),
        checksum: 'a1b2c3d4e5f6',
        downloadUrl: `https://mock-storage.example.com/download/signed-url-${fileId}`,
        expiresAt: new Date(Date.now() + 21600000).toISOString(),
        metadata: {
          sampleId: 'SAMPLE_000001',
          analysisType: 'whole_exome_sequencing'
        }
      });
    });

    const server = app.listen(port, () => {
      console.log(`Mock Cloud Storage Service running on port ${port}`);
    });

    this.services.set('cloudStorage', server);
    return server;
  }

  // Start mock notification service
  startNotificationService(port = 3013) {
    const app = express();
    app.use(express.json());

    // Send notification endpoint
    app.post('/notifications/send', (req, res) => {
      const notificationData = req.body;
      
      res.json({
        notificationId: `NOTIFY_${Date.now()}`,
        status: 'sent',
        sentAt: new Date().toISOString(),
        deliveryStatus: 'delivered',
        messageId: `MSG_${Date.now()}`
      });
    });

    const server = app.listen(port, () => {
      console.log(`Mock Notification Service running on port ${port}`);
    });

    this.services.set('notification', server);
    return server;
  }

  // Start mock message queue service
  startMessageQueueService(port = 3014) {
    const app = express();
    app.use(express.json());

    const messageStore = new Map();
    const deadLetterQueue = [];

    // Publish message endpoint
    app.post('/publish', (req, res) => {
      const { topic, message, partitionKey } = req.body;
      const messageId = `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      messageStore.set(messageId, {
        id: messageId,
        topic,
        message,
        partitionKey,
        timestamp: new Date().toISOString(),
        processed: false
      });

      // Simulate message processing
      setTimeout(() => {
        const storedMessage = messageStore.get(messageId);
        if (storedMessage) {
          storedMessage.processed = true;
          
          // Simulate processing failure for invalid messages
          if (message.type === 'INVALID_MESSAGE') {
            deadLetterQueue.push({
              original: message,
              messageId,
              retryCount: 3,
              lastError: 'Invalid message format',
              timestamp: new Date().toISOString()
            });
          }
        }
      }, 100);

      res.json({ messageId });
    });

    // Get events endpoint
    app.get('/events', (req, res) => {
      const { sampleId } = req.query;
      
      const events = Array.from(messageStore.values())
        .filter(msg => msg.message.sampleId === sampleId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(msg => msg.message);

      res.json({ events });
    });

    // Dead letter queue endpoint
    app.get('/dead-letter-queue', (req, res) => {
      res.json({ messages: deadLetterQueue });
    });

    const server = app.listen(port, () => {
      console.log(`Mock Message Queue Service running on port ${port}`);
    });

    this.services.set('messageQueue', server);
    return server;
  }

  // Start mock WebSocket service
  startWebSocketService(port = 3015) {
    const server = require('http').createServer();
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
      console.log('WebSocket connection established');

      ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('Received WebSocket message:', message);

        // Echo back acknowledgment
        ws.send(JSON.stringify({
          type: 'ack',
          messageId: message.messageId || Date.now(),
          timestamp: new Date().toISOString()
        }));
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          }));
        } else {
          clearInterval(heartbeat);
        }
      }, 30000);
    });

    server.listen(port, () => {
      console.log(`Mock WebSocket Service running on port ${port}`);
    });

    this.websocketServer = server;
    this.services.set('websocket', server);
    return server;
  }

  // Start mock service mesh
  startServiceMeshService(port = 3016) {
    const app = express();
    app.use(express.json());

    // Service mesh metrics endpoint
    app.get('/metrics', (req, res) => {
      res.type('text/plain');
      res.send(`
# HELP istio_requests_total Total number of requests
# TYPE istio_requests_total counter
istio_requests_total{source_service="sample-service",destination_service="auth-service"} 123
istio_requests_total{source_service="sample-service",destination_service="notification-service"} 456

# HELP istio_request_duration_milliseconds Request duration in milliseconds
# TYPE istio_request_duration_milliseconds histogram
istio_request_duration_milliseconds_bucket{source_service="sample-service",destination_service="auth-service",le="100"} 45
istio_request_duration_milliseconds_bucket{source_service="sample-service",destination_service="auth-service",le="500"} 89
istio_request_duration_milliseconds_bucket{source_service="sample-service",destination_service="auth-service",le="1000"} 120
istio_request_duration_milliseconds_bucket{source_service="sample-service",destination_service="auth-service",le="+Inf"} 123

# HELP istio_tcp_connections_opened_total Total number of TCP connections opened
# TYPE istio_tcp_connections_opened_total counter
istio_tcp_connections_opened_total{source_service="sample-service",destination_service="auth-service"} 15
      `);
    });

    // Service mesh configuration endpoint
    app.get('/config', (req, res) => {
      res.json({
        services: [
          {
            name: 'auth-service',
            namespace: 'lims',
            version: '1.0.0',
            endpoints: ['http://auth-service:3001']
          },
          {
            name: 'sample-service',
            namespace: 'lims',
            version: '1.0.0',
            endpoints: ['http://sample-service:3002']
          },
          {
            name: 'analysis-service',
            namespace: 'lims',
            version: '1.0.0',
            endpoints: ['http://analysis-service:3003']
          },
          {
            name: 'notification-service',
            namespace: 'lims',
            version: '1.0.0',
            endpoints: ['http://notification-service:3004']
          }
        ]
      });
    });

    // Service dependencies endpoint
    app.get('/dependencies', (req, res) => {
      res.json({
        services: [
          {
            name: 'sample-service',
            dependencies: ['auth-service', 'notification-service']
          },
          {
            name: 'analysis-service',
            dependencies: ['auth-service', 'sample-service']
          },
          {
            name: 'notification-service',
            dependencies: ['auth-service']
          }
        ]
      });
    });

    const server = app.listen(port, () => {
      console.log(`Mock Service Mesh Service running on port ${port}`);
    });

    this.services.set('serviceMesh', server);
    return server;
  }

  // Start all mock services
  startAllServices() {
    const ports = {
      labEquipment: 3010,
      emr: 3011,
      cloudStorage: 3012,
      notification: 3013,
      messageQueue: 3014,
      websocket: 3015,
      serviceMesh: 3016
    };

    this.startLabEquipmentService(ports.labEquipment);
    this.startEMRService(ports.emr);
    this.startCloudStorageService(ports.cloudStorage);
    this.startNotificationService(ports.notification);
    this.startMessageQueueService(ports.messageQueue);
    this.startWebSocketService(ports.websocket);
    this.startServiceMeshService(ports.serviceMesh);

    console.log('All mock services started');
    this.emit('allServicesStarted', ports);
  }

  // Stop all services
  stopAllServices() {
    for (const [name, server] of this.services) {
      server.close(() => {
        console.log(`Mock ${name} service stopped`);
      });
    }
    
    this.services.clear();
    this.emit('allServicesStopped');
  }

  // Get service status
  getServiceStatus() {
    const status = {};
    
    for (const [name, server] of this.services) {
      status[name] = {
        running: server.listening,
        address: server.address()
      };
    }
    
    return status;
  }
}

module.exports = MockServiceManager;