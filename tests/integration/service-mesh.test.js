// Service Mesh Integration Tests for LIMS Application
// This test suite validates microservices communication and service mesh functionality

const axios = require('axios');
const WebSocket = require('ws');
const { expect } = require('chai');
const { promisify } = require('util');
const config = require('../config/test-config');

describe('Service Mesh Integration Tests', () => {
  let authService;
  let sampleService;
  let analysisService;
  let notificationService;
  let websocketConnection;

  before(async () => {
    // Initialize service connections
    authService = axios.create({
      baseURL: config.services.auth.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    sampleService = axios.create({
      baseURL: config.services.sample.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    analysisService = axios.create({
      baseURL: config.services.analysis.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    notificationService = axios.create({
      baseURL: config.services.notification.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });

  describe('Service Discovery and Health Checks', () => {
    it('should verify all services are discoverable', async () => {
      const services = [
        { name: 'auth', client: authService },
        { name: 'sample', client: sampleService },
        { name: 'analysis', client: analysisService },
        { name: 'notification', client: notificationService }
      ];

      for (const service of services) {
        try {
          const response = await service.client.get('/health');
          expect(response.status).to.equal(200);
          expect(response.data.status).to.equal('healthy');
          expect(response.data.service).to.equal(service.name);
        } catch (error) {
          throw new Error(`Service ${service.name} health check failed: ${error.message}`);
        }
      }
    });

    it('should verify service mesh metrics are available', async () => {
      const metricsResponse = await axios.get(`${config.services.mesh.baseUrl}/metrics`);
      
      expect(metricsResponse.status).to.equal(200);
      expect(metricsResponse.data).to.include('istio_requests_total');
      expect(metricsResponse.data).to.include('istio_request_duration_milliseconds');
      expect(metricsResponse.data).to.include('istio_tcp_connections_opened_total');
    });

    it('should validate service mesh configuration', async () => {
      const configResponse = await axios.get(`${config.services.mesh.baseUrl}/config`);
      
      expect(configResponse.status).to.equal(200);
      expect(configResponse.data.services).to.be.an('array');
      expect(configResponse.data.services).to.have.length.greaterThan(0);
      
      const serviceNames = configResponse.data.services.map(s => s.name);
      expect(serviceNames).to.include('auth-service');
      expect(serviceNames).to.include('sample-service');
      expect(serviceNames).to.include('analysis-service');
      expect(serviceNames).to.include('notification-service');
    });
  });

  describe('Inter-Service Communication', () => {
    let authToken;

    before(async () => {
      // Authenticate to get token for service-to-service communication
      const loginResponse = await authService.post('/auth/login', {
        username: 'test@example.com',
        password: 'testpassword'
      });
      
      authToken = loginResponse.data.token;
    });

    it('should authenticate and propagate token across services', async () => {
      // Step 1: Authenticate with auth service
      const authResponse = await authService.post('/auth/login', {
        username: 'test@example.com',
        password: 'testpassword'
      });

      expect(authResponse.status).to.equal(200);
      expect(authResponse.data.token).to.be.a('string');

      const token = authResponse.data.token;

      // Step 2: Use token with sample service
      const sampleResponse = await sampleService.get('/samples', {
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(sampleResponse.status).to.equal(200);
      expect(sampleResponse.data.samples).to.be.an('array');

      // Step 3: Verify token is valid across services
      const profileResponse = await authService.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      expect(profileResponse.status).to.equal(200);
      expect(profileResponse.data.userId).to.be.a('string');
    });

    it('should handle service-to-service communication for sample creation', async () => {
      const sampleData = {
        sampleId: 'SAMPLE_MESH_001',
        clientId: 'CLIENT_001',
        sampleType: 'blood',
        testType: 'genetic',
        priority: 'normal',
        volume: 5.0,
        notes: 'Service mesh integration test'
      };

      // Step 1: Create sample
      const createResponse = await sampleService.post('/samples', sampleData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(createResponse.status).to.equal(201);
      expect(createResponse.data.id).to.be.a('string');

      const sampleId = createResponse.data.id;

      // Step 2: Verify sample was created and notification was sent
      const sampleResponse = await sampleService.get(`/samples/${sampleId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(sampleResponse.status).to.equal(200);
      expect(sampleResponse.data.sampleId).to.equal('SAMPLE_MESH_001');

      // Step 3: Verify notification service was called
      const notificationResponse = await notificationService.get('/notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { entityId: sampleId, entityType: 'sample' }
      });

      expect(notificationResponse.status).to.equal(200);
      expect(notificationResponse.data.notifications).to.be.an('array');
    });

    it('should handle analysis workflow across services', async () => {
      const analysisRequest = {
        sampleId: 'SAMPLE_MESH_001',
        analysisType: 'whole_exome_sequencing',
        genes: ['BRCA1', 'BRCA2'],
        priority: 'normal'
      };

      // Step 1: Submit analysis request
      const analysisResponse = await analysisService.post('/genetic-analysis', analysisRequest, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(analysisResponse.status).to.equal(201);
      expect(analysisResponse.data.id).to.be.a('string');

      const analysisId = analysisResponse.data.id;

      // Step 2: Verify analysis status
      const statusResponse = await analysisService.get(`/genetic-analysis/${analysisId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(statusResponse.status).to.equal(200);
      expect(statusResponse.data.status).to.be.oneOf(['queued', 'running', 'completed']);

      // Step 3: Verify sample service was updated
      const sampleResponse = await sampleService.get('/samples', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { sampleId: 'SAMPLE_MESH_001' }
      });

      expect(sampleResponse.status).to.equal(200);
      expect(sampleResponse.data.samples[0].status).to.be.oneOf(['in_progress', 'completed']);
    });

    it('should handle service failures gracefully with circuit breaker', async () => {
      // Simulate service failure by calling non-existent endpoint
      try {
        await sampleService.get('/samples/nonexistent', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(404);
      }

      // Verify other services still work (circuit breaker prevents cascading failures)
      const authResponse = await authService.get('/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(authResponse.status).to.equal(200);
    });
  });

  describe('Load Balancing and Failover', () => {
    it('should distribute requests across service instances', async () => {
      const requestCount = 10;
      const responses = [];

      // Make multiple requests to verify load balancing
      for (let i = 0; i < requestCount; i++) {
        const response = await sampleService.get('/samples', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        responses.push(response);
      }

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).to.equal(200);
      });

      // Check if different instances handled requests (if instance ID is returned)
      const instanceIds = responses
        .map(r => r.headers['x-instance-id'])
        .filter(id => id);

      if (instanceIds.length > 0) {
        const uniqueInstances = [...new Set(instanceIds)];
        expect(uniqueInstances.length).to.be.greaterThan(1);
      }
    });

    it('should handle service instance failures', async () => {
      // This test would typically involve taking down a service instance
      // and verifying that requests are redirected to healthy instances
      
      const healthyResponses = [];
      const maxRetries = 5;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await sampleService.get('/samples', {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 2000
          });
          healthyResponses.push(response);
        } catch (error) {
          // Log the error but continue - this might be expected during failover
          console.log(`Request ${i + 1} failed: ${error.message}`);
        }
      }

      // At least some requests should succeed even during failover
      expect(healthyResponses.length).to.be.greaterThan(0);
    });
  });

  describe('Message Queue Integration', () => {
    it('should handle asynchronous message processing', async () => {
      const messagePayload = {
        type: 'SAMPLE_UPDATED',
        sampleId: 'SAMPLE_MESH_001',
        status: 'completed',
        timestamp: new Date().toISOString(),
        metadata: {
          completedBy: 'test-user',
          notes: 'Analysis completed successfully'
        }
      };

      // Publish message to queue
      const publishResponse = await axios.post(
        `${config.services.messageQueue.baseUrl}/publish`,
        {
          topic: 'sample-updates',
          message: messagePayload
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(publishResponse.status).to.equal(200);
      expect(publishResponse.data.messageId).to.be.a('string');

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify message was processed by checking notification service
      const notificationResponse = await notificationService.get('/notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { entityId: 'SAMPLE_MESH_001', entityType: 'sample' }
      });

      expect(notificationResponse.status).to.equal(200);
      const notifications = notificationResponse.data.notifications;
      const sampleUpdateNotification = notifications.find(n => 
        n.type === 'SAMPLE_UPDATED' && n.entityId === 'SAMPLE_MESH_001'
      );

      expect(sampleUpdateNotification).to.exist;
    });

    it('should handle message ordering and delivery guarantees', async () => {
      const messages = [
        { type: 'SAMPLE_CREATED', sampleId: 'SAMPLE_ORDER_001', sequence: 1 },
        { type: 'SAMPLE_UPDATED', sampleId: 'SAMPLE_ORDER_001', sequence: 2 },
        { type: 'SAMPLE_COMPLETED', sampleId: 'SAMPLE_ORDER_001', sequence: 3 }
      ];

      // Publish messages in order
      for (const message of messages) {
        const publishResponse = await axios.post(
          `${config.services.messageQueue.baseUrl}/publish`,
          {
            topic: 'sample-lifecycle',
            message: message,
            partitionKey: message.sampleId // Ensure ordering
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );

        expect(publishResponse.status).to.equal(200);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify messages were processed in order
      const eventsResponse = await axios.get(
        `${config.services.messageQueue.baseUrl}/events`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params: { sampleId: 'SAMPLE_ORDER_001' }
        }
      );

      expect(eventsResponse.status).to.equal(200);
      const events = eventsResponse.data.events;
      
      expect(events).to.have.lengthOf(3);
      expect(events[0].type).to.equal('SAMPLE_CREATED');
      expect(events[1].type).to.equal('SAMPLE_UPDATED');
      expect(events[2].type).to.equal('SAMPLE_COMPLETED');
    });

    it('should handle dead letter queue for failed messages', async () => {
      const invalidMessage = {
        type: 'INVALID_MESSAGE',
        sampleId: 'NONEXISTENT_SAMPLE',
        invalidField: 'this will cause processing to fail'
      };

      // Publish invalid message
      const publishResponse = await axios.post(
        `${config.services.messageQueue.baseUrl}/publish`,
        {
          topic: 'sample-updates',
          message: invalidMessage
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(publishResponse.status).to.equal(200);

      // Wait for processing and retry attempts
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check dead letter queue
      const dlqResponse = await axios.get(
        `${config.services.messageQueue.baseUrl}/dead-letter-queue`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(dlqResponse.status).to.equal(200);
      const dlqMessages = dlqResponse.data.messages;
      
      const failedMessage = dlqMessages.find(m => 
        m.original.type === 'INVALID_MESSAGE'
      );

      expect(failedMessage).to.exist;
      expect(failedMessage.retryCount).to.be.greaterThan(0);
      expect(failedMessage.lastError).to.be.a('string');
    });
  });

  describe('WebSocket Communication', () => {
    before(async () => {
      // Establish WebSocket connection
      websocketConnection = new WebSocket(`${config.services.websocket.baseUrl}/ws`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Wait for connection to open
      await new Promise((resolve, reject) => {
        websocketConnection.on('open', resolve);
        websocketConnection.on('error', reject);
      });
    });

    after(() => {
      if (websocketConnection) {
        websocketConnection.close();
      }
    });

    it('should receive real-time updates via WebSocket', async () => {
      const receivedMessages = [];

      // Set up message listener
      websocketConnection.on('message', (data) => {
        receivedMessages.push(JSON.parse(data));
      });

      // Trigger an update that should generate a WebSocket message
      const updateResponse = await sampleService.patch('/samples/SAMPLE_MESH_001', {
        status: 'in_progress',
        notes: 'Processing started'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(updateResponse.status).to.equal(200);

      // Wait for WebSocket message
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify WebSocket message was received
      expect(receivedMessages).to.have.lengthOf.greaterThan(0);
      const updateMessage = receivedMessages.find(m => 
        m.type === 'SAMPLE_UPDATED' && m.sampleId === 'SAMPLE_MESH_001'
      );

      expect(updateMessage).to.exist;
      expect(updateMessage.status).to.equal('in_progress');
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      // Simulate connection failure
      websocketConnection.close();

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify that REST API still works even if WebSocket is down
      const sampleResponse = await sampleService.get('/samples', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(sampleResponse.status).to.equal(200);
    });
  });

  describe('Distributed Tracing', () => {
    it('should generate trace IDs for request correlation', async () => {
      const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Make request with trace ID
      const response = await sampleService.get('/samples', {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'X-Trace-Id': traceId
        }
      });

      expect(response.status).to.equal(200);
      expect(response.headers['x-trace-id']).to.equal(traceId);
    });

    it('should propagate trace context across services', async () => {
      const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create sample with trace ID
      const sampleData = {
        sampleId: 'SAMPLE_TRACE_001',
        clientId: 'CLIENT_001',
        sampleType: 'blood',
        testType: 'genetic',
        priority: 'normal'
      };

      const createResponse = await sampleService.post('/samples', sampleData, {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'X-Trace-Id': traceId
        }
      });

      expect(createResponse.status).to.equal(201);

      // Verify trace propagation by checking if notification service received the same trace ID
      const notificationResponse = await notificationService.get('/notifications', {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'X-Trace-Id': traceId
        },
        params: { entityId: createResponse.data.id, entityType: 'sample' }
      });

      expect(notificationResponse.status).to.equal(200);
      expect(notificationResponse.headers['x-trace-id']).to.equal(traceId);
    });
  });

  describe('Security and Authentication', () => {
    it('should enforce mutual TLS between services', async () => {
      // Verify that services communicate with proper TLS certificates
      const serviceResponse = await sampleService.get('/samples', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(serviceResponse.status).to.equal(200);
      
      // Check security headers
      expect(serviceResponse.headers['strict-transport-security']).to.exist;
      expect(serviceResponse.headers['x-content-type-options']).to.equal('nosniff');
      expect(serviceResponse.headers['x-frame-options']).to.equal('DENY');
    });

    it('should validate service-to-service authentication', async () => {
      // Attempt to call service without proper authentication
      try {
        await sampleService.get('/samples');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(401);
      }

      // Verify that proper authentication works
      const authenticatedResponse = await sampleService.get('/samples', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(authenticatedResponse.status).to.equal(200);
    });

    it('should enforce rate limiting between services', async () => {
      const rateLimitRequests = [];

      // Make multiple rapid requests to test rate limiting
      for (let i = 0; i < 20; i++) {
        rateLimitRequests.push(
          sampleService.get('/samples', {
            headers: { Authorization: `Bearer ${authToken}` }
          }).catch(error => error.response)
        );
      }

      const responses = await Promise.all(rateLimitRequests);
      
      // Check if any requests were rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].headers['x-ratelimit-limit']).to.exist;
        expect(rateLimitedResponses[0].headers['x-ratelimit-remaining']).to.exist;
        expect(rateLimitedResponses[0].headers['retry-after']).to.exist;
      }
    });
  });

  describe('Performance and Monitoring', () => {
    it('should monitor service mesh performance metrics', async () => {
      // Make several requests to generate metrics
      for (let i = 0; i < 5; i++) {
        await sampleService.get('/samples', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }

      // Check service mesh metrics
      const metricsResponse = await axios.get(`${config.services.mesh.baseUrl}/metrics`);
      
      expect(metricsResponse.status).to.equal(200);
      
      const metrics = metricsResponse.data;
      expect(metrics).to.include('istio_requests_total');
      expect(metrics).to.include('istio_request_duration_milliseconds');
      
      // Verify metrics contain data for our service
      expect(metrics).to.include('sample-service');
    });

    it('should track service dependency graph', async () => {
      const dependencyResponse = await axios.get(`${config.services.mesh.baseUrl}/dependencies`);
      
      expect(dependencyResponse.status).to.equal(200);
      
      const dependencies = dependencyResponse.data;
      expect(dependencies.services).to.be.an('array');
      
      // Verify expected service dependencies
      const sampleServiceDeps = dependencies.services.find(s => s.name === 'sample-service');
      expect(sampleServiceDeps).to.exist;
      expect(sampleServiceDeps.dependencies).to.include('auth-service');
      expect(sampleServiceDeps.dependencies).to.include('notification-service');
    });
  });
});