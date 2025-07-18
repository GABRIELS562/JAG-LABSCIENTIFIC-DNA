// Contract Testing for LIMS Application Services
// This test suite validates API contracts between microservices using Pact

const { Pact } = require('@pact-foundation/pact');
const { like, eachLike, term } = require('@pact-foundation/pact').Matchers;
const axios = require('axios');
const path = require('path');
const { expect } = require('chai');

describe('Contract Testing - LIMS Services', () => {
  let provider;
  let providerUrl;

  // Sample Service Provider Contract
  describe('Sample Service Provider', () => {
    beforeEach(() => {
      provider = new Pact({
        consumer: 'analysis-service',
        provider: 'sample-service',
        port: 1234,
        log: path.resolve(process.cwd(), 'tests/logs', 'pact.log'),
        dir: path.resolve(process.cwd(), 'tests/pacts'),
        logLevel: 'INFO',
        spec: 2
      });

      providerUrl = `http://localhost:${provider.opts.port}`;
    });

    afterEach(() => provider.finalize());

    describe('GET /samples/:id', () => {
      beforeEach(() => {
        const sampleInteraction = {
          state: 'sample exists',
          uponReceiving: 'a request for sample details',
          withRequest: {
            method: 'GET',
            path: '/samples/123e4567-e89b-12d3-a456-426614174000',
            headers: {
              'Authorization': like('Bearer token123'),
              'Accept': 'application/json'
            }
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              sampleId: like('SAMPLE_000001'),
              clientId: like('CLIENT_001'),
              sampleType: term({
                matcher: '^(blood|saliva|tissue|urine|swab)$',
                generate: 'blood'
              }),
              testType: term({
                matcher: '^(genetic|chemical|biological|pathology)$',
                generate: 'genetic'
              }),
              priority: term({
                matcher: '^(low|normal|high|urgent)$',
                generate: 'normal'
              }),
              status: term({
                matcher: '^(pending|in_progress|completed|failed|cancelled)$',
                generate: 'pending'
              }),
              volume: like(5.0),
              unit: like('mL'),
              collectionDate: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}$',
                generate: '2024-01-17'
              }),
              createdAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:00:00Z'
              }),
              updatedAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:00:00Z'
              }),
              notes: like('Test sample for contract testing')
            }
          }
        };

        return provider.addInteraction(sampleInteraction);
      });

      it('should return sample details', async () => {
        const response = await axios.get(`${providerUrl}/samples/123e4567-e89b-12d3-a456-426614174000`, {
          headers: {
            'Authorization': 'Bearer token123',
            'Accept': 'application/json'
          }
        });

        expect(response.status).to.equal(200);
        expect(response.data.id).to.equal('123e4567-e89b-12d3-a456-426614174000');
        expect(response.data.sampleId).to.match(/^SAMPLE_/);
        expect(response.data.sampleType).to.be.oneOf(['blood', 'saliva', 'tissue', 'urine', 'swab']);
        expect(response.data.testType).to.be.oneOf(['genetic', 'chemical', 'biological', 'pathology']);
        expect(response.data.priority).to.be.oneOf(['low', 'normal', 'high', 'urgent']);
        expect(response.data.status).to.be.oneOf(['pending', 'in_progress', 'completed', 'failed', 'cancelled']);
        expect(response.data.volume).to.be.a('number');
        expect(response.data.createdAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      });
    });

    describe('GET /samples', () => {
      beforeEach(() => {
        const samplesListInteraction = {
          state: 'samples exist',
          uponReceiving: 'a request for sample list',
          withRequest: {
            method: 'GET',
            path: '/samples',
            query: {
              page: '1',
              limit: '10'
            },
            headers: {
              'Authorization': like('Bearer token123'),
              'Accept': 'application/json'
            }
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              samples: eachLike({
                id: like('123e4567-e89b-12d3-a456-426614174000'),
                sampleId: like('SAMPLE_000001'),
                clientId: like('CLIENT_001'),
                sampleType: term({
                  matcher: '^(blood|saliva|tissue|urine|swab)$',
                  generate: 'blood'
                }),
                testType: term({
                  matcher: '^(genetic|chemical|biological|pathology)$',
                  generate: 'genetic'
                }),
                status: term({
                  matcher: '^(pending|in_progress|completed|failed|cancelled)$',
                  generate: 'pending'
                }),
                createdAt: term({
                  matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                  generate: '2024-01-17T10:00:00Z'
                })
              }, { min: 1 }),
              pagination: {
                page: like(1),
                limit: like(10),
                total: like(100),
                pages: like(10)
              }
            }
          }
        };

        return provider.addInteraction(samplesListInteraction);
      });

      it('should return paginated list of samples', async () => {
        const response = await axios.get(`${providerUrl}/samples`, {
          params: {
            page: 1,
            limit: 10
          },
          headers: {
            'Authorization': 'Bearer token123',
            'Accept': 'application/json'
          }
        });

        expect(response.status).to.equal(200);
        expect(response.data.samples).to.be.an('array');
        expect(response.data.samples.length).to.be.greaterThan(0);
        expect(response.data.pagination).to.exist;
        expect(response.data.pagination.page).to.equal(1);
        expect(response.data.pagination.limit).to.equal(10);
        expect(response.data.pagination.total).to.be.a('number');
        expect(response.data.pagination.pages).to.be.a('number');
      });
    });

    describe('POST /samples', () => {
      beforeEach(() => {
        const createSampleInteraction = {
          state: 'client exists',
          uponReceiving: 'a request to create a sample',
          withRequest: {
            method: 'POST',
            path: '/samples',
            headers: {
              'Authorization': like('Bearer token123'),
              'Content-Type': 'application/json'
            },
            body: {
              sampleId: like('SAMPLE_000002'),
              clientId: like('CLIENT_001'),
              sampleType: term({
                matcher: '^(blood|saliva|tissue|urine|swab)$',
                generate: 'blood'
              }),
              testType: term({
                matcher: '^(genetic|chemical|biological|pathology)$',
                generate: 'genetic'
              }),
              priority: term({
                matcher: '^(low|normal|high|urgent)$',
                generate: 'normal'
              }),
              volume: like(5.0),
              unit: like('mL'),
              collectionDate: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}$',
                generate: '2024-01-17'
              }),
              notes: like('Contract test sample')
            }
          },
          willRespondWith: {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
              'Location': like('/samples/123e4567-e89b-12d3-a456-426614174001')
            },
            body: {
              id: like('123e4567-e89b-12d3-a456-426614174001'),
              sampleId: like('SAMPLE_000002'),
              clientId: like('CLIENT_001'),
              sampleType: 'blood',
              testType: 'genetic',
              priority: 'normal',
              status: 'pending',
              volume: 5.0,
              unit: 'mL',
              collectionDate: '2024-01-17',
              createdAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:00:00Z'
              }),
              updatedAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:00:00Z'
              }),
              notes: like('Contract test sample')
            }
          }
        };

        return provider.addInteraction(createSampleInteraction);
      });

      it('should create a new sample', async () => {
        const sampleData = {
          sampleId: 'SAMPLE_000002',
          clientId: 'CLIENT_001',
          sampleType: 'blood',
          testType: 'genetic',
          priority: 'normal',
          volume: 5.0,
          unit: 'mL',
          collectionDate: '2024-01-17',
          notes: 'Contract test sample'
        };

        const response = await axios.post(`${providerUrl}/samples`, sampleData, {
          headers: {
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json'
          }
        });

        expect(response.status).to.equal(201);
        expect(response.headers.location).to.match(/\/samples\/[\w-]+/);
        expect(response.data.id).to.be.a('string');
        expect(response.data.sampleId).to.equal('SAMPLE_000002');
        expect(response.data.status).to.equal('pending');
        expect(response.data.createdAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      });
    });

    describe('PATCH /samples/:id', () => {
      beforeEach(() => {
        const updateSampleInteraction = {
          state: 'sample exists',
          uponReceiving: 'a request to update sample status',
          withRequest: {
            method: 'PATCH',
            path: '/samples/123e4567-e89b-12d3-a456-426614174000',
            headers: {
              'Authorization': like('Bearer token123'),
              'Content-Type': 'application/json'
            },
            body: {
              status: term({
                matcher: '^(pending|in_progress|completed|failed|cancelled)$',
                generate: 'in_progress'
              }),
              notes: like('Updated status via contract test')
            }
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              sampleId: like('SAMPLE_000001'),
              clientId: like('CLIENT_001'),
              sampleType: 'blood',
              testType: 'genetic',
              priority: 'normal',
              status: 'in_progress',
              volume: 5.0,
              unit: 'mL',
              collectionDate: '2024-01-17',
              createdAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:00:00Z'
              }),
              updatedAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:05:00Z'
              }),
              notes: like('Updated status via contract test')
            }
          }
        };

        return provider.addInteraction(updateSampleInteraction);
      });

      it('should update sample status', async () => {
        const updateData = {
          status: 'in_progress',
          notes: 'Updated status via contract test'
        };

        const response = await axios.patch(`${providerUrl}/samples/123e4567-e89b-12d3-a456-426614174000`, updateData, {
          headers: {
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json'
          }
        });

        expect(response.status).to.equal(200);
        expect(response.data.id).to.equal('123e4567-e89b-12d3-a456-426614174000');
        expect(response.data.status).to.equal('in_progress');
        expect(response.data.notes).to.equal('Updated status via contract test');
        expect(response.data.updatedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        const notFoundInteraction = {
          state: 'sample does not exist',
          uponReceiving: 'a request for non-existent sample',
          withRequest: {
            method: 'GET',
            path: '/samples/00000000-0000-0000-0000-000000000000',
            headers: {
              'Authorization': like('Bearer token123'),
              'Accept': 'application/json'
            }
          },
          willRespondWith: {
            status: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              error: 'Not Found',
              message: 'Sample not found',
              details: {
                sampleId: '00000000-0000-0000-0000-000000000000'
              }
            }
          }
        };

        return provider.addInteraction(notFoundInteraction);
      });

      it('should return 404 for non-existent sample', async () => {
        try {
          await axios.get(`${providerUrl}/samples/00000000-0000-0000-0000-000000000000`, {
            headers: {
              'Authorization': 'Bearer token123',
              'Accept': 'application/json'
            }
          });
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.response.status).to.equal(404);
          expect(error.response.data.error).to.equal('Not Found');
          expect(error.response.data.message).to.equal('Sample not found');
          expect(error.response.data.details.sampleId).to.equal('00000000-0000-0000-0000-000000000000');
        }
      });
    });
  });

  // Analysis Service Provider Contract
  describe('Analysis Service Provider', () => {
    beforeEach(() => {
      provider = new Pact({
        consumer: 'sample-service',
        provider: 'analysis-service',
        port: 1235,
        log: path.resolve(process.cwd(), 'tests/logs', 'pact.log'),
        dir: path.resolve(process.cwd(), 'tests/pacts'),
        logLevel: 'INFO',
        spec: 2
      });

      providerUrl = `http://localhost:${provider.opts.port}`;
    });

    afterEach(() => provider.finalize());

    describe('POST /genetic-analysis', () => {
      beforeEach(() => {
        const createAnalysisInteraction = {
          state: 'sample exists',
          uponReceiving: 'a request to create genetic analysis',
          withRequest: {
            method: 'POST',
            path: '/genetic-analysis',
            headers: {
              'Authorization': like('Bearer token123'),
              'Content-Type': 'application/json'
            },
            body: {
              sampleId: like('123e4567-e89b-12d3-a456-426614174000'),
              analysisType: term({
                matcher: '^(targeted_sequencing|whole_exome|whole_genome|pharmacogenomics|rna_sequencing)$',
                generate: 'whole_exome'
              }),
              genes: eachLike(like('BRCA1'), { min: 1 }),
              priority: term({
                matcher: '^(low|normal|high|urgent)$',
                generate: 'normal'
              }),
              sequencingPlatform: like('Illumina NovaSeq 6000'),
              readDepth: like(100),
              coverageThreshold: like(90.0)
            }
          },
          willRespondWith: {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
              'Location': like('/genetic-analysis/456e7890-e89b-12d3-a456-426614174000')
            },
            body: {
              id: like('456e7890-e89b-12d3-a456-426614174000'),
              sampleId: like('123e4567-e89b-12d3-a456-426614174000'),
              analysisType: 'whole_exome',
              genes: eachLike(like('BRCA1'), { min: 1 }),
              priority: 'normal',
              status: 'queued',
              sequencingPlatform: like('Illumina NovaSeq 6000'),
              readDepth: 100,
              coverageThreshold: 90.0,
              createdAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:00:00Z'
              }),
              updatedAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:00:00Z'
              })
            }
          }
        };

        return provider.addInteraction(createAnalysisInteraction);
      });

      it('should create genetic analysis', async () => {
        const analysisData = {
          sampleId: '123e4567-e89b-12d3-a456-426614174000',
          analysisType: 'whole_exome',
          genes: ['BRCA1', 'BRCA2', 'TP53'],
          priority: 'normal',
          sequencingPlatform: 'Illumina NovaSeq 6000',
          readDepth: 100,
          coverageThreshold: 90.0
        };

        const response = await axios.post(`${providerUrl}/genetic-analysis`, analysisData, {
          headers: {
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json'
          }
        });

        expect(response.status).to.equal(201);
        expect(response.headers.location).to.match(/\/genetic-analysis\/[\w-]+/);
        expect(response.data.id).to.be.a('string');
        expect(response.data.sampleId).to.equal('123e4567-e89b-12d3-a456-426614174000');
        expect(response.data.analysisType).to.equal('whole_exome');
        expect(response.data.status).to.equal('queued');
        expect(response.data.genes).to.be.an('array');
        expect(response.data.genes.length).to.be.greaterThan(0);
      });
    });

    describe('GET /genetic-analysis/:id/status', () => {
      beforeEach(() => {
        const analysisStatusInteraction = {
          state: 'analysis exists',
          uponReceiving: 'a request for analysis status',
          withRequest: {
            method: 'GET',
            path: '/genetic-analysis/456e7890-e89b-12d3-a456-426614174000/status',
            headers: {
              'Authorization': like('Bearer token123'),
              'Accept': 'application/json'
            }
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              id: '456e7890-e89b-12d3-a456-426614174000',
              status: term({
                matcher: '^(queued|running|completed|failed|cancelled)$',
                generate: 'running'
              }),
              progress: like(45),
              startedAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:30:00Z'
              }),
              estimatedCompletionTime: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T16:00:00Z'
              }),
              queuePosition: like(0),
              processingNode: like('analysis-node-01')
            }
          }
        };

        return provider.addInteraction(analysisStatusInteraction);
      });

      it('should return analysis status', async () => {
        const response = await axios.get(`${providerUrl}/genetic-analysis/456e7890-e89b-12d3-a456-426614174000/status`, {
          headers: {
            'Authorization': 'Bearer token123',
            'Accept': 'application/json'
          }
        });

        expect(response.status).to.equal(200);
        expect(response.data.id).to.equal('456e7890-e89b-12d3-a456-426614174000');
        expect(response.data.status).to.be.oneOf(['queued', 'running', 'completed', 'failed', 'cancelled']);
        expect(response.data.progress).to.be.a('number');
        expect(response.data.startedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(response.data.estimatedCompletionTime).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(response.data.queuePosition).to.be.a('number');
        expect(response.data.processingNode).to.be.a('string');
      });
    });

    describe('GET /genetic-analysis/:id/results', () => {
      beforeEach(() => {
        const analysisResultsInteraction = {
          state: 'analysis completed',
          uponReceiving: 'a request for analysis results',
          withRequest: {
            method: 'GET',
            path: '/genetic-analysis/456e7890-e89b-12d3-a456-426614174000/results',
            headers: {
              'Authorization': like('Bearer token123'),
              'Accept': 'application/json'
            }
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              id: '456e7890-e89b-12d3-a456-426614174000',
              sampleId: like('123e4567-e89b-12d3-a456-426614174000'),
              status: 'completed',
              completedAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T15:45:00Z'
              }),
              results: {
                variantsFound: like(1245),
                pathogenicVariants: like(3),
                variantsOfUncertainSignificance: like(12),
                benignVariants: like(1230),
                novelVariants: like(5)
              },
              qualityMetrics: {
                meanCoverage: like(87.5),
                percent20x: like(95.2),
                q30Bases: like(94.8),
                mappingRate: like(98.7)
              },
              rawDataLocation: like('/data/raw/456e7890-e89b-12d3-a456-426614174000/'),
              processedDataLocation: like('/data/processed/456e7890-e89b-12d3-a456-426614174000/'),
              reportUrl: like('https://reports.example.com/456e7890-e89b-12d3-a456-426614174000')
            }
          }
        };

        return provider.addInteraction(analysisResultsInteraction);
      });

      it('should return analysis results', async () => {
        const response = await axios.get(`${providerUrl}/genetic-analysis/456e7890-e89b-12d3-a456-426614174000/results`, {
          headers: {
            'Authorization': 'Bearer token123',
            'Accept': 'application/json'
          }
        });

        expect(response.status).to.equal(200);
        expect(response.data.id).to.equal('456e7890-e89b-12d3-a456-426614174000');
        expect(response.data.status).to.equal('completed');
        expect(response.data.completedAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(response.data.results).to.be.an('object');
        expect(response.data.results.variantsFound).to.be.a('number');
        expect(response.data.results.pathogenicVariants).to.be.a('number');
        expect(response.data.qualityMetrics).to.be.an('object');
        expect(response.data.qualityMetrics.meanCoverage).to.be.a('number');
        expect(response.data.rawDataLocation).to.be.a('string');
        expect(response.data.processedDataLocation).to.be.a('string');
        expect(response.data.reportUrl).to.be.a('string');
      });
    });
  });

  // Notification Service Provider Contract
  describe('Notification Service Provider', () => {
    beforeEach(() => {
      provider = new Pact({
        consumer: 'sample-service',
        provider: 'notification-service',
        port: 1236,
        log: path.resolve(process.cwd(), 'tests/logs', 'pact.log'),
        dir: path.resolve(process.cwd(), 'tests/pacts'),
        logLevel: 'INFO',
        spec: 2
      });

      providerUrl = `http://localhost:${provider.opts.port}`;
    });

    afterEach(() => provider.finalize());

    describe('POST /notifications', () => {
      beforeEach(() => {
        const sendNotificationInteraction = {
          state: 'recipient exists',
          uponReceiving: 'a request to send notification',
          withRequest: {
            method: 'POST',
            path: '/notifications',
            headers: {
              'Authorization': like('Bearer token123'),
              'Content-Type': 'application/json'
            },
            body: {
              recipientId: like('123e4567-e89b-12d3-a456-426614174000'),
              type: term({
                matcher: '^(email|sms|push|in_app)$',
                generate: 'email'
              }),
              priority: term({
                matcher: '^(low|normal|high|urgent)$',
                generate: 'normal'
              }),
              subject: like('Sample Status Update'),
              message: like('Your sample SAMPLE_000001 has been updated'),
              template: like('sample_status_update'),
              variables: {
                sampleId: like('SAMPLE_000001'),
                status: like('in_progress'),
                updatedAt: term({
                  matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                  generate: '2024-01-17T10:00:00Z'
                })
              },
              metadata: {
                entityType: like('sample'),
                entityId: like('123e4567-e89b-12d3-a456-426614174000'),
                source: like('sample-service')
              }
            }
          },
          willRespondWith: {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
              'Location': like('/notifications/789e0123-e89b-12d3-a456-426614174000')
            },
            body: {
              id: like('789e0123-e89b-12d3-a456-426614174000'),
              status: 'sent',
              sentAt: term({
                matcher: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$',
                generate: '2024-01-17T10:01:00Z'
              }),
              deliveryStatus: like('delivered'),
              externalMessageId: like('MSG_123456')
            }
          }
        };

        return provider.addInteraction(sendNotificationInteraction);
      });

      it('should send notification', async () => {
        const notificationData = {
          recipientId: '123e4567-e89b-12d3-a456-426614174000',
          type: 'email',
          priority: 'normal',
          subject: 'Sample Status Update',
          message: 'Your sample SAMPLE_000001 has been updated',
          template: 'sample_status_update',
          variables: {
            sampleId: 'SAMPLE_000001',
            status: 'in_progress',
            updatedAt: '2024-01-17T10:00:00Z'
          },
          metadata: {
            entityType: 'sample',
            entityId: '123e4567-e89b-12d3-a456-426614174000',
            source: 'sample-service'
          }
        };

        const response = await axios.post(`${providerUrl}/notifications`, notificationData, {
          headers: {
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json'
          }
        });

        expect(response.status).to.equal(201);
        expect(response.headers.location).to.match(/\/notifications\/[\w-]+/);
        expect(response.data.id).to.be.a('string');
        expect(response.data.status).to.equal('sent');
        expect(response.data.sentAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(response.data.deliveryStatus).to.be.a('string');
        expect(response.data.externalMessageId).to.be.a('string');
      });
    });
  });
});