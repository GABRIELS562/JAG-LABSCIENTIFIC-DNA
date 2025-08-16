const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Swagger/OpenAPI Documentation Configuration
 * Generates comprehensive API documentation with versioning support
 */
class SwaggerDocumentation {
  constructor(options = {}) {
    this.config = {
      title: options.title || 'LabScientific LIMS API',
      description: options.description || 'Laboratory Information Management System API',
      version: options.version || '2.0.0',
      baseUrl: options.baseUrl || 'http://localhost:3000',
      contactEmail: options.contactEmail || 'support@labscientific-lims.com',
      license: options.license || 'MIT',
      termsOfService: options.termsOfService || '/terms'
    };

    this.specs = new Map();
    this.initializeSpecs();
  }

  initializeSpecs() {
    // V1 API Specification
    this.specs.set('v1', this.createV1Spec());
    
    // V2 API Specification
    this.specs.set('v2', this.createV2Spec());
  }

  createV1Spec() {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: `${this.config.title} v1`,
          version: '1.0.0',
          description: `${this.config.description} - Legacy API version`,
          contact: {
            email: this.config.contactEmail
          },
          license: {
            name: this.config.license
          },
          termsOfService: this.config.termsOfService
        },
        servers: [
          {
            url: `${this.config.baseUrl}/api/v1`,
            description: 'Version 1 API Server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          },
          schemas: {
            Sample: {
              type: 'object',
              required: ['sample_id', 'name', 'relation'],
              properties: {
                id: {
                  type: 'integer',
                  description: 'Unique identifier',
                  example: 1
                },
                sample_id: {
                  type: 'string',
                  description: 'Laboratory sample identifier',
                  pattern: '^\\d{2}_\\d+$',
                  example: '25_001'
                },
                name: {
                  type: 'string',
                  description: 'Sample name or identifier',
                  example: 'John Doe'
                },
                relation: {
                  type: 'string',
                  enum: ['Child', 'Mother', 'Father'],
                  description: 'Sample relation type',
                  example: 'Child'
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'processing', 'completed', 'failed'],
                  description: 'Current processing status',
                  example: 'pending'
                },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Creation timestamp'
                },
                updated_at: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Last update timestamp'
                }
              }
            },
            TestCase: {
              type: 'object',
              required: ['case_number', 'submission_date'],
              properties: {
                id: {
                  type: 'integer',
                  example: 1
                },
                case_number: {
                  type: 'string',
                  pattern: '^CASE_\\d{4}_\\d+$',
                  example: 'CASE_2025_001'
                },
                submission_date: {
                  type: 'string',
                  format: 'date',
                  example: '2025-01-15'
                },
                status: {
                  type: 'string',
                  enum: ['submitted', 'in_progress', 'completed', 'cancelled'],
                  example: 'submitted'
                }
              }
            },
            Error: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false
                },
                error: {
                  type: 'string',
                  description: 'Error message',
                  example: 'Sample not found'
                },
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'SAMPLE_NOT_FOUND'
                }
              }
            }
          }
        },
        security: [
          { bearerAuth: [] },
          { apiKey: [] }
        ],
        paths: {
          '/samples': {
            get: {
              summary: 'List samples',
              tags: ['Samples'],
              parameters: [
                {
                  name: 'status',
                  in: 'query',
                  schema: { type: 'string' },
                  description: 'Filter by status'
                },
                {
                  name: 'limit',
                  in: 'query',
                  schema: { type: 'integer', minimum: 1, maximum: 100 },
                  description: 'Number of results to return'
                }
              ],
              responses: {
                '200': {
                  description: 'List of samples',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean', example: true },
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Sample' }
                          }
                        }
                      }
                    }
                  }
                },
                '400': {
                  description: 'Bad request',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                }
              }
            },
            post: {
              summary: 'Create sample',
              tags: ['Samples'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['sample_id', 'name', 'relation'],
                      properties: {
                        sample_id: { type: 'string', example: '25_002' },
                        name: { type: 'string', example: 'Jane Doe' },
                        relation: { type: 'string', enum: ['Child', 'Mother', 'Father'] }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Sample created',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean', example: true },
                          data: { $ref: '#/components/schemas/Sample' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/samples/{id}': {
            get: {
              summary: 'Get sample by ID',
              tags: ['Samples'],
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'integer' },
                  description: 'Sample ID'
                }
              ],
              responses: {
                '200': {
                  description: 'Sample details',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean', example: true },
                          data: { $ref: '#/components/schemas/Sample' }
                        }
                      }
                    }
                  }
                },
                '404': {
                  description: 'Sample not found',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Error' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      apis: ['./routes/v1/*.js'] // Path to the API files for v1
    };

    return swaggerJSDoc(options);
  }

  createV2Spec() {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: `${this.config.title} v2`,
          version: '2.0.0',
          description: `${this.config.description} - Current API version with advanced features`,
          contact: {
            email: this.config.contactEmail
          },
          license: {
            name: this.config.license
          },
          termsOfService: this.config.termsOfService
        },
        servers: [
          {
            url: `${this.config.baseUrl}/api/v2`,
            description: 'Version 2 API Server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            },
            oauth2: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: `${this.config.baseUrl}/oauth/authorize`,
                  tokenUrl: `${this.config.baseUrl}/oauth/token`,
                  scopes: {
                    'read:samples': 'Read sample data',
                    'write:samples': 'Create and modify samples',
                    'read:reports': 'Access reports',
                    'admin': 'Full administrative access'
                  }
                }
              }
            }
          },
          schemas: {
            Sample: {
              type: 'object',
              required: ['sampleId', 'name', 'relation'],
              properties: {
                id: {
                  type: 'integer',
                  description: 'Unique identifier',
                  example: 1
                },
                sampleId: {
                  type: 'string',
                  description: 'Laboratory sample identifier',
                  pattern: '^\\d{2}_\\d+$',
                  example: '25_001'
                },
                name: {
                  type: 'string',
                  description: 'Sample name or identifier',
                  example: 'John Doe'
                },
                relation: {
                  type: 'string',
                  enum: ['Child', 'Mother', 'Father'],
                  description: 'Sample relation type',
                  example: 'Child'
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'processing', 'completed', 'failed', 'on_hold'],
                  description: 'Current processing status',
                  example: 'pending'
                },
                metadata: {
                  type: 'object',
                  properties: {
                    priority: {
                      type: 'string',
                      enum: ['low', 'standard', 'high', 'urgent'],
                      example: 'standard'
                    },
                    source: {
                      type: 'string',
                      example: 'api'
                    },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['paternity', 'urgent']
                    }
                  }
                },
                workflowStatus: {
                  type: 'object',
                  properties: {
                    currentStep: { type: 'string', example: 'dna_extraction' },
                    progress: { type: 'number', example: 45.5 },
                    estimatedCompletion: { type: 'string', format: 'date-time' }
                  }
                },
                realTimeUpdates: {
                  type: 'boolean',
                  description: 'Whether real-time updates are enabled',
                  example: true
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Creation timestamp'
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Last update timestamp'
                },
                _links: {
                  type: 'object',
                  description: 'HATEOAS links',
                  properties: {
                    self: { type: 'string', format: 'uri' },
                    testCase: { type: 'string', format: 'uri' },
                    batch: { type: 'string', format: 'uri' }
                  }
                }
              }
            },
            Workflow: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'sample_processing' },
                name: { type: 'string', example: 'Sample Processing Workflow' },
                status: { type: 'string', enum: ['active', 'completed', 'failed', 'cancelled'] },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      status: { type: 'string' },
                      startTime: { type: 'string', format: 'date-time' },
                      endTime: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            Alert: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'alert_12345' },
                type: { type: 'string', example: 'high_cpu_usage' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                category: { type: 'string', enum: ['system', 'business', 'quality', 'compliance'] },
                message: { type: 'string', example: 'High CPU usage detected: 85%' },
                status: { type: 'string', enum: ['active', 'resolved', 'suppressed'] },
                triggeredAt: { type: 'string', format: 'date-time' },
                resolvedAt: { type: 'string', format: 'date-time' }
              }
            },
            ExportJob: {
              type: 'object',
              properties: {
                jobId: { type: 'string', example: 'export_12345' },
                status: { type: 'string', enum: ['started', 'processing', 'completed', 'failed'] },
                format: { type: 'string', enum: ['csv', 'xlsx', 'json', 'pdf'] },
                entityType: { type: 'string', example: 'samples' },
                progress: { type: 'number', example: 75.5 },
                recordCount: { type: 'integer', example: 1500 },
                filePath: { type: 'string', example: '/exports/samples_export_2025-01-15.xlsx' }
              }
            },
            PaginatedResponse: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    items: { type: 'array' },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        hasMore: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            },
            Error: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'SAMPLE_NOT_FOUND' },
                    message: { type: 'string', example: 'Sample not found' },
                    details: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                    requestId: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        security: [
          { bearerAuth: [] },
          { oauth2: ['read:samples'] }
        ],
        paths: {
          '/samples': {
            get: {
              summary: 'List samples with advanced filtering',
              tags: ['Samples'],
              parameters: [
                {
                  name: 'status',
                  in: 'query',
                  schema: { type: 'string' },
                  description: 'Filter by status'
                },
                {
                  name: 'priority',
                  in: 'query',
                  schema: { type: 'string', enum: ['low', 'standard', 'high', 'urgent'] },
                  description: 'Filter by priority'
                },
                {
                  name: 'tags',
                  in: 'query',
                  schema: { type: 'string' },
                  description: 'Filter by tags (comma-separated)'
                },
                {
                  name: 'limit',
                  in: 'query',
                  schema: { type: 'integer', minimum: 1, maximum: 1000 },
                  description: 'Number of results to return'
                },
                {
                  name: 'offset',
                  in: 'query',
                  schema: { type: 'integer', minimum: 0 },
                  description: 'Number of results to skip'
                },
                {
                  name: 'sort',
                  in: 'query',
                  schema: { type: 'string' },
                  description: 'Sort field and direction (e.g., createdAt:desc)'
                },
                {
                  name: 'include',
                  in: 'query',
                  schema: { type: 'string' },
                  description: 'Related resources to include (comma-separated)'
                }
              ],
              responses: {
                '200': {
                  description: 'Paginated list of samples',
                  content: {
                    'application/json': {
                      schema: {
                        allOf: [
                          { $ref: '#/components/schemas/PaginatedResponse' },
                          {
                            type: 'object',
                            properties: {
                              data: {
                                type: 'object',
                                properties: {
                                  items: {
                                    type: 'array',
                                    items: { $ref: '#/components/schemas/Sample' }
                                  }
                                }
                              }
                            }
                          }
                        ]
                      }
                    }
                  },
                  headers: {
                    'X-Total-Count': {
                      schema: { type: 'integer' },
                      description: 'Total number of samples'
                    },
                    'X-Rate-Limit-Remaining': {
                      schema: { type: 'integer' },
                      description: 'Remaining requests in current window'
                    }
                  }
                }
              }
            }
          },
          '/workflows': {
            get: {
              summary: 'List workflow executions',
              tags: ['Workflows'],
              security: [{ bearerAuth: [] }],
              responses: {
                '200': {
                  description: 'List of workflows',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean' },
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Workflow' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/alerts': {
            get: {
              summary: 'List system alerts',
              tags: ['Alerts'],
              security: [{ bearerAuth: [], oauth2: ['admin'] }],
              responses: {
                '200': {
                  description: 'List of alerts',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean' },
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Alert' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/exports': {
            post: {
              summary: 'Create data export job',
              tags: ['Data Export'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['entityType', 'format'],
                      properties: {
                        entityType: { type: 'string', enum: ['samples', 'test_cases', 'batches'] },
                        format: { type: 'string', enum: ['csv', 'xlsx', 'json', 'pdf'] },
                        filters: { type: 'object' },
                        columns: { type: 'array', items: { type: 'string' } }
                      }
                    }
                  }
                }
              },
              responses: {
                '202': {
                  description: 'Export job created',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean' },
                          data: { $ref: '#/components/schemas/ExportJob' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/websocket': {
            get: {
              summary: 'WebSocket connection for real-time updates',
              tags: ['Real-time'],
              description: 'Upgrade to WebSocket for real-time notifications and updates',
              responses: {
                '101': {
                  description: 'Switching Protocols - WebSocket connection established'
                }
              }
            }
          }
        }
      },
      apis: ['./routes/v2/*.js', './routes/*.js'] // Path to the API files for v2
    };

    return swaggerJSDoc(options);
  }

  // Get specification for a specific version
  getSpec(version = 'v2') {
    return this.specs.get(version);
  }

  // Create Swagger UI middleware for a specific version
  createSwaggerMiddleware(version = 'v2') {
    const spec = this.getSpec(version);
    
    if (!spec) {
      throw new Error(`No specification found for version ${version}`);
    }

    const options = {
      customCss: this.getCustomCSS(),
      customSiteTitle: `${this.config.title} ${version.toUpperCase()} API Documentation`,
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        requestInterceptor: this.getRequestInterceptor(),
        responseInterceptor: this.getResponseInterceptor()
      }
    };

    return [
      swaggerUi.serve,
      swaggerUi.setup(spec, options)
    ];
  }

  getCustomCSS() {
    return `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .scheme-container { background: #f8f9fa; }
      .swagger-ui .btn.authorize { 
        background-color: #007bff; 
        border-color: #007bff; 
      }
      .swagger-ui .btn.try-out__btn {
        background-color: #28a745;
        border-color: #28a745;
      }
      .swagger-ui .response-col_status {
        font-weight: bold;
      }
    `;
  }

  getRequestInterceptor() {
    return `
      (request) => {
        // Add custom headers
        request.headers['X-Documentation'] = 'swagger-ui';
        
        // Add timestamp for request tracking
        request.headers['X-Request-Time'] = new Date().toISOString();
        
        return request;
      }
    `;
  }

  getResponseInterceptor() {
    return `
      (response) => {
        // Log response for debugging
        return response;
      }
    `;
  }

  // Generate API documentation index
  generateDocumentationIndex() {
    return {
      title: this.config.title,
      description: this.config.description,
      versions: {
        v1: {
          status: 'deprecated',
          url: '/docs/v1',
          description: 'Legacy API version - will be sunset on 2025-12-31'
        },
        v2: {
          status: 'current',
          url: '/docs/v2',
          description: 'Current API version with full feature support'
        }
      },
      resources: {
        'Getting Started': '/docs/getting-started',
        'Authentication': '/docs/authentication',
        'Rate Limiting': '/docs/rate-limiting',
        'Webhooks': '/docs/webhooks',
        'SDKs': '/docs/sdks',
        'Changelog': '/docs/changelog',
        'Migration Guides': '/docs/migration'
      },
      support: {
        email: this.config.contactEmail,
        documentation: '/docs',
        issues: 'https://github.com/labscientific/lims/issues'
      }
    };
  }

  // Generate Postman collection
  generatePostmanCollection(version = 'v2') {
    const spec = this.getSpec(version);
    
    return {
      info: {
        name: `${this.config.title} ${version.toUpperCase()}`,
        description: spec.info.description,
        version: spec.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{auth_token}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'baseUrl',
          value: spec.servers[0].url,
          type: 'string'
        },
        {
          key: 'auth_token',
          value: '',
          type: 'string'
        }
      ],
      item: this.convertOpenAPIToPostman(spec)
    };
  }

  convertOpenAPIToPostman(spec) {
    const items = [];
    
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (typeof operation !== 'object' || !operation.summary) continue;
        
        items.push({
          name: operation.summary,
          request: {
            method: method.toUpperCase(),
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
                type: 'text'
              }
            ],
            url: {
              raw: `{{baseUrl}}${path}`,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter(Boolean)
            },
            description: operation.description || operation.summary
          }
        });
      }
    }
    
    return items;
  }

  // Health check for documentation
  healthCheck() {
    return {
      status: 'healthy',
      versions: Array.from(this.specs.keys()),
      endpoints: {
        v1: `/docs/v1`,
        v2: `/docs/v2`,
        postman: `/docs/postman`
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = SwaggerDocumentation;