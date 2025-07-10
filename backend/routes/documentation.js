const express = require('express');
const router = express.Router();
const SwaggerDocumentation = require('../docs/swagger');
const APIVersioning = require('../middleware/apiVersioning');
const logger = require('../utils/logger');

// Initialize documentation and versioning
const swagger = new SwaggerDocumentation({
  title: 'LabScientific LIMS API',
  description: 'Comprehensive Laboratory Information Management System API with advanced features for DNA testing laboratories',
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  contactEmail: 'support@labscientific-lims.com'
});

const apiVersioning = new APIVersioning({
  supportedVersions: ['v1', 'v2'],
  defaultVersion: 'v2',
  deprecatedVersions: ['v1']
});

/**
 * API Documentation Index
 * GET /docs
 */
router.get('/', (req, res) => {
  try {
    const docIndex = swagger.generateDocumentationIndex();
    
    res.render('documentation-index', {
      title: 'API Documentation',
      ...docIndex,
      currentYear: new Date().getFullYear()
    });
  } catch (error) {
    logger.error('Failed to generate documentation index', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load documentation'
    });
  }
});

/**
 * Swagger UI for V1 API
 * GET /docs/v1
 */
router.use('/v1', swagger.createSwaggerMiddleware('v1'));

/**
 * Swagger UI for V2 API (Current)
 * GET /docs/v2
 */
router.use('/v2', swagger.createSwaggerMiddleware('v2'));

/**
 * API Version Information
 * GET /docs/versions
 */
router.get('/versions', (req, res) => {
  try {
    const versionMetrics = apiVersioning.getVersionMetrics();
    
    const versions = {
      supported: apiVersioning.config.supportedVersions,
      default: apiVersioning.config.defaultVersion,
      deprecated: apiVersioning.config.deprecatedVersions,
      details: {
        v1: apiVersioning.getVersionDocs('v1'),
        v2: apiVersioning.getVersionDocs('v2')
      },
      metrics: versionMetrics
    };

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    logger.error('Failed to get version information', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve version information'
    });
  }
});

/**
 * OpenAPI Specification Download
 * GET /docs/openapi/:version
 */
router.get('/openapi/:version', (req, res) => {
  try {
    const { version } = req.params;
    const spec = swagger.getSpec(version);
    
    if (!spec) {
      return res.status(404).json({
        success: false,
        error: `OpenAPI specification not found for version ${version}`
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="openapi-${version}.json"`);
    res.json(spec);
  } catch (error) {
    logger.error('Failed to get OpenAPI specification', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve OpenAPI specification'
    });
  }
});

/**
 * Postman Collection Download
 * GET /docs/postman/:version?
 */
router.get('/postman/:version?', (req, res) => {
  try {
    const version = req.params.version || 'v2';
    const collection = swagger.generatePostmanCollection(version);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="labscientific-lims-${version}.postman_collection.json"`);
    res.json(collection);
  } catch (error) {
    logger.error('Failed to generate Postman collection', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Postman collection'
    });
  }
});

/**
 * Authentication Guide
 * GET /docs/authentication
 */
router.get('/authentication', (req, res) => {
  const authGuide = {
    overview: 'LabScientific LIMS API supports multiple authentication methods',
    methods: {
      bearer_token: {
        description: 'JWT Bearer token authentication',
        header: 'Authorization: Bearer <token>',
        example: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiration: '24 hours',
        refresh: 'Use refresh token endpoint to obtain new tokens'
      },
      api_key: {
        description: 'API Key authentication for service-to-service calls',
        header: 'X-API-Key: <key>',
        example: 'X-API-Key: lims_api_key_abc123xyz789',
        expiration: 'No expiration (can be rotated)',
        permissions: 'Based on key configuration'
      },
      oauth2: {
        description: 'OAuth 2.0 for third-party integrations',
        authorization_url: '/oauth/authorize',
        token_url: '/oauth/token',
        scopes: {
          'read:samples': 'Read sample data',
          'write:samples': 'Create and modify samples',
          'read:reports': 'Access reports and analytics',
          'admin': 'Full administrative access'
        }
      }
    },
    examples: {
      login: {
        url: 'POST /auth/login',
        request: {
          email: 'user@lab.com',
          password: 'secure_password'
        },
        response: {
          success: true,
          data: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'rt_abc123xyz789...',
            expires_in: 86400,
            token_type: 'Bearer'
          }
        }
      },
      refresh: {
        url: 'POST /auth/refresh',
        request: {
          refresh_token: 'rt_abc123xyz789...'
        },
        response: {
          success: true,
          data: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            expires_in: 86400
          }
        }
      }
    },
    security_considerations: [
      'Always use HTTPS in production',
      'Store tokens securely on client side',
      'Implement proper token refresh logic',
      'Rotate API keys regularly',
      'Use appropriate scopes for OAuth2 applications'
    ]
  };

  res.json({
    success: true,
    data: authGuide
  });
});

/**
 * Rate Limiting Guide
 * GET /docs/rate-limiting
 */
router.get('/rate-limiting', (req, res) => {
  const rateLimitGuide = {
    overview: 'API requests are rate limited to ensure fair usage and system stability',
    limits: {
      v1: {
        requests_per_minute: 100,
        requests_per_hour: 1000,
        burst_limit: 10
      },
      v2: {
        requests_per_minute: 200,
        requests_per_hour: 5000,
        burst_limit: 20
      }
    },
    headers: {
      'X-RateLimit-Limit': 'Maximum requests allowed in time window',
      'X-RateLimit-Remaining': 'Remaining requests in current window',
      'X-RateLimit-Reset': 'Unix timestamp when rate limit resets',
      'Retry-After': 'Seconds to wait before making another request (when rate limited)'
    },
    exemptions: [
      'Webhook endpoints are not rate limited',
      'Health check endpoints have separate limits',
      'Admin users have increased limits'
    ],
    best_practices: [
      'Implement exponential backoff for retries',
      'Cache responses when possible',
      'Use webhooks instead of polling',
      'Batch operations when supported',
      'Monitor rate limit headers'
    ],
    examples: {
      rate_limited_response: {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1642694400',
          'Retry-After': '60'
        },
        body: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded. Please try again later.',
            retry_after: 60
          }
        }
      }
    }
  };

  res.json({
    success: true,
    data: rateLimitGuide
  });
});

/**
 * Webhooks Documentation
 * GET /docs/webhooks
 */
router.get('/webhooks', (req, res) => {
  const webhookGuide = {
    overview: 'Webhooks allow real-time notifications when events occur in the LIMS system',
    configuration: {
      url: 'POST /webhooks',
      required_fields: ['url', 'events'],
      optional_fields: ['secret', 'active', 'content_type']
    },
    events: {
      'sample.created': 'Triggered when a new sample is created',
      'sample.updated': 'Triggered when a sample is updated',
      'sample.completed': 'Triggered when sample processing is completed',
      'batch.completed': 'Triggered when a batch finishes processing',
      'alert.triggered': 'Triggered when a system alert is raised',
      'workflow.completed': 'Triggered when a workflow execution completes',
      'export.completed': 'Triggered when a data export job finishes'
    },
    payload_format: {
      event: 'sample.created',
      timestamp: '2025-01-15T10:30:00Z',
      data: {
        id: 123,
        sampleId: '25_001',
        name: 'John Doe',
        status: 'pending'
      },
      metadata: {
        version: 'v2',
        source: 'lims_api',
        delivery_id: 'wh_abc123'
      }
    },
    security: {
      signature_header: 'X-LIMS-Signature',
      algorithm: 'HMAC-SHA256',
      verification: 'Compare computed signature with received signature'
    },
    retry_policy: {
      max_attempts: 3,
      backoff_strategy: 'exponential',
      timeout: '30 seconds',
      retry_codes: [500, 502, 503, 504, 408]
    },
    testing: {
      ping_event: 'Send test webhook to verify endpoint',
      url: 'POST /webhooks/:id/ping',
      response_validation: 'Endpoint should return 2xx status code'
    }
  };

  res.json({
    success: true,
    data: webhookGuide
  });
});

/**
 * Migration Guide
 * GET /docs/migration/:from/:to
 */
router.get('/migration/:from/:to', (req, res) => {
  const { from, to } = req.params;
  
  const migrationGuides = {
    'v1-v2': {
      overview: 'Migration from API v1 to v2 includes breaking changes and new features',
      breaking_changes: [
        {
          change: 'Field naming convention',
          old: 'snake_case (sample_id, test_case_id)',
          new: 'camelCase (sampleId, testCaseId)',
          impact: 'All request/response field names'
        },
        {
          change: 'Error response format',
          old: '{ success: false, error: "message" }',
          new: '{ success: false, error: { code: "ERROR_CODE", message: "message", details: {} } }',
          impact: 'Error handling logic'
        },
        {
          change: 'Pagination format',
          old: '{ data: [], total: 100 }',
          new: '{ data: { items: [], pagination: { total: 100, hasMore: true } } }',
          impact: 'List endpoint response handling'
        }
      ],
      new_features: [
        'Real-time WebSocket notifications',
        'Advanced workflow automation',
        'Enhanced data export/import',
        'Comprehensive alerting system',
        'HATEOAS links in responses',
        'Metadata support for all entities'
      ],
      migration_steps: [
        {
          step: 1,
          title: 'Update field names',
          description: 'Convert all snake_case fields to camelCase',
          code_example: {
            before: '{ sample_id: "25_001", test_case_id: 123 }',
            after: '{ sampleId: "25_001", testCaseId: 123 }'
          }
        },
        {
          step: 2,
          title: 'Update error handling',
          description: 'Handle new error response format',
          code_example: {
            before: 'if (!response.success) { alert(response.error); }',
            after: 'if (!response.success) { alert(response.error.message); }'
          }
        },
        {
          step: 3,
          title: 'Update pagination handling',
          description: 'Handle new pagination format',
          code_example: {
            before: 'const items = response.data; const total = response.total;',
            after: 'const items = response.data.items; const total = response.data.pagination.total;'
          }
        },
        {
          step: 4,
          title: 'Add metadata handling',
          description: 'Take advantage of new metadata fields',
          code_example: {
            before: '// No metadata support',
            after: 'const priority = sample.metadata?.priority || "standard";'
          }
        }
      ],
      compatibility_mode: {
        available: true,
        description: 'Use compatibility headers to ease transition',
        headers: {
          'X-API-Compatibility': 'v1',
          'X-Response-Format': 'legacy'
        }
      },
      testing_strategy: [
        'Run both versions in parallel during migration',
        'Use feature flags to toggle between versions',
        'Implement comprehensive integration tests',
        'Monitor error rates and performance metrics'
      ]
    }
  };

  const guide = migrationGuides[`${from}-${to}`];
  
  if (!guide) {
    return res.status(404).json({
      success: false,
      error: `Migration guide not found for ${from} to ${to}`
    });
  }

  res.json({
    success: true,
    data: {
      from,
      to,
      ...guide
    }
  });
});

/**
 * SDK Documentation
 * GET /docs/sdks
 */
router.get('/sdks', (req, res) => {
  const sdkGuide = {
    overview: 'Official and community SDKs for LabScientific LIMS API',
    official_sdks: {
      javascript: {
        name: '@labscientific/lims-js',
        version: '2.1.0',
        installation: 'npm install @labscientific/lims-js',
        documentation: 'https://docs.labscientific-lims.com/sdk/javascript',
        example: `
const LIMS = require('@labscientific/lims-js');
const client = new LIMS({ apiKey: 'your-api-key' });

const sample = await client.samples.create({
  sampleId: '25_001',
  name: 'John Doe',
  relation: 'Child'
});
        `.trim()
      },
      python: {
        name: 'labscientific-lims',
        version: '2.0.1',
        installation: 'pip install labscientific-lims',
        documentation: 'https://docs.labscientific-lims.com/sdk/python',
        example: `
from labscientific_lims import LIMSClient

client = LIMSClient(api_key='your-api-key')

sample = client.samples.create(
    sample_id='25_001',
    name='John Doe',
    relation='Child'
)
        `.trim()
      },
      csharp: {
        name: 'LabScientific.LIMS.SDK',
        version: '2.0.0',
        installation: 'Install-Package LabScientific.LIMS.SDK',
        documentation: 'https://docs.labscientific-lims.com/sdk/csharp',
        example: `
using LabScientific.LIMS.SDK;

var client = new LIMSClient("your-api-key");

var sample = await client.Samples.CreateAsync(new CreateSampleRequest
{
    SampleId = "25_001",
    Name = "John Doe",
    Relation = "Child"
});
        `.trim()
      }
    },
    community_sdks: {
      php: {
        name: 'labscientific/lims-php',
        maintainer: 'Community',
        repository: 'https://github.com/community/lims-php'
      },
      ruby: {
        name: 'labscientific-lims-ruby',
        maintainer: 'Community',
        repository: 'https://github.com/community/lims-ruby'
      }
    },
    features: [
      'Automatic authentication handling',
      'Built-in retry logic with exponential backoff',
      'Response pagination handling',
      'WebSocket support for real-time updates',
      'Type-safe request/response models',
      'Comprehensive error handling'
    ],
    support: {
      documentation: 'https://docs.labscientific-lims.com/sdks',
      issues: 'https://github.com/labscientific/lims-sdks/issues',
      discussions: 'https://github.com/labscientific/lims-sdks/discussions'
    }
  };

  res.json({
    success: true,
    data: sdkGuide
  });
});

/**
 * Changelog
 * GET /docs/changelog
 */
router.get('/changelog', (req, res) => {
  const changelog = {
    versions: [
      {
        version: '2.1.0',
        date: '2025-01-15',
        type: 'minor',
        changes: {
          added: [
            'Real-time WebSocket notifications',
            'Advanced workflow automation engine',
            'Comprehensive alerting system',
            'Data export/import with multiple formats'
          ],
          improved: [
            'API response times reduced by 40%',
            'Enhanced error messages with detailed codes',
            'Better pagination handling',
            'Improved documentation'
          ],
          fixed: [
            'Fixed race condition in batch processing',
            'Resolved memory leak in long-running workflows',
            'Fixed timezone handling in date filters'
          ]
        }
      },
      {
        version: '2.0.0',
        date: '2025-01-01',
        type: 'major',
        changes: {
          added: [
            'New API v2 with breaking changes',
            'camelCase field naming convention',
            'Enhanced error response format',
            'HATEOAS links in responses',
            'Metadata support for all entities'
          ],
          breaking: [
            'Changed field naming from snake_case to camelCase',
            'Updated error response format',
            'Modified pagination structure',
            'Removed deprecated endpoints'
          ],
          deprecated: [
            'API v1 marked as deprecated (sunset: 2025-12-31)'
          ]
        }
      },
      {
        version: '1.2.0',
        date: '2024-12-01',
        type: 'minor',
        changes: {
          added: [
            'Batch processing capabilities',
            'Advanced reporting features',
            'Sample relationship tracking'
          ],
          improved: [
            'Database query optimization',
            'Enhanced security measures',
            'Better error logging'
          ]
        }
      }
    ]
  };

  res.json({
    success: true,
    data: changelog
  });
});

/**
 * Documentation Health Check
 * GET /docs/health
 */
router.get('/health', (req, res) => {
  try {
    const health = swagger.healthCheck();
    const versionMetrics = apiVersioning.getVersionMetrics();
    
    res.json({
      success: true,
      data: {
        documentation: health,
        versioning: {
          supportedVersions: apiVersioning.config.supportedVersions,
          metrics: versionMetrics
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Documentation health check failed', error);
    res.status(500).json({
      success: false,
      error: 'Documentation health check failed'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('Documentation API error', {
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'DOCUMENTATION_ERROR',
      message: 'Internal documentation error',
      details: error.message
    }
  });
});

module.exports = router;