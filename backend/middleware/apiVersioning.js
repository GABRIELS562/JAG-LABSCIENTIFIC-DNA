const semver = require('semver');
const logger = require('../utils/logger');

/**
 * API Versioning Middleware
 * Handles API version routing and compatibility
 */
class APIVersioning {
  constructor(options = {}) {
    this.config = {
      defaultVersion: options.defaultVersion || 'v1',
      supportedVersions: options.supportedVersions || ['v1', 'v2'],
      deprecationWarnings: options.deprecationWarnings !== false,
      strictVersioning: options.strictVersioning || false,
      versionHeader: options.versionHeader || 'X-API-Version',
      acceptHeader: options.acceptHeader || 'application/vnd.labscientific-lims',
      deprecatedVersions: options.deprecatedVersions || []
    };

    this.versionMappings = new Map();
    this.deprecationSchedule = new Map();
    this.compatibilityMatrix = new Map();
    
    this.initializeVersionMappings();
  }

  initializeVersionMappings() {
    // Map semantic versions to route versions
    this.versionMappings.set('1.0.0', 'v1');
    this.versionMappings.set('1.1.0', 'v1');
    this.versionMappings.set('2.0.0', 'v2');
    this.versionMappings.set('2.1.0', 'v2');

    // Set up deprecation schedule
    this.deprecationSchedule.set('v1', {
      deprecatedSince: '2025-01-01',
      sunsetDate: '2025-12-31',
      replacementVersion: 'v2',
      migrationGuide: '/docs/migration/v1-to-v2'
    });

    // Define compatibility matrix
    this.compatibilityMatrix.set('v1', {
      supportedFeatures: ['basic_crud', 'reporting', 'batch_processing'],
      limitations: ['no_real_time_notifications', 'limited_export_formats'],
      maxRequestSize: 10 * 1024 * 1024 // 10MB
    });

    this.compatibilityMatrix.set('v2', {
      supportedFeatures: ['all_v1_features', 'real_time_notifications', 'advanced_analytics', 'workflow_automation'],
      limitations: [],
      maxRequestSize: 100 * 1024 * 1024 // 100MB
    });
  }

  // Main middleware function
  middleware() {
    return (req, res, next) => {
      try {
        const version = this.extractVersion(req);
        const resolvedVersion = this.resolveVersion(version);

        // Validate version
        if (!this.isVersionSupported(resolvedVersion)) {
          return this.sendVersionError(res, resolvedVersion, 'UNSUPPORTED_VERSION');
        }

        // Check deprecation
        if (this.isVersionDeprecated(resolvedVersion)) {
          this.addDeprecationWarning(res, resolvedVersion);
        }

        // Set version context
        req.apiVersion = resolvedVersion;
        req.versionInfo = this.getVersionInfo(resolvedVersion);

        // Add version headers to response
        res.set('X-API-Version', resolvedVersion);
        res.set('X-Supported-Versions', this.config.supportedVersions.join(', '));

        next();
      } catch (error) {
        logger.error('API versioning error', error);
        this.sendVersionError(res, null, 'VERSIONING_ERROR', error.message);
      }
    };
  }

  extractVersion(req) {
    // Check header first
    let version = req.headers[this.config.versionHeader.toLowerCase()];
    
    if (!version) {
      // Check Accept header
      const acceptHeader = req.headers.accept || '';
      const versionMatch = acceptHeader.match(/version=([^,;]+)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    }

    if (!version) {
      // Check URL path
      const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
      if (pathMatch) {
        version = pathMatch[1];
      }
    }

    if (!version) {
      // Check query parameter
      version = req.query.version;
    }

    return version || this.config.defaultVersion;
  }

  resolveVersion(requestedVersion) {
    // Handle semantic version resolution
    if (semver.valid(requestedVersion)) {
      for (const [semVer, routeVer] of this.versionMappings) {
        if (semver.satisfies(semVer, `~${requestedVersion}`)) {
          return routeVer;
        }
      }
    }

    // Handle direct version matching
    if (this.config.supportedVersions.includes(requestedVersion)) {
      return requestedVersion;
    }

    // Handle version ranges
    if (requestedVersion.includes('.x') || requestedVersion.includes('*')) {
      const pattern = requestedVersion.replace(/[.x*]/g, '\\d+');
      const regex = new RegExp(`^${pattern}$`);
      
      for (const version of this.config.supportedVersions) {
        if (regex.test(version)) {
          return version;
        }
      }
    }

    return requestedVersion;
  }

  isVersionSupported(version) {
    return this.config.supportedVersions.includes(version);
  }

  isVersionDeprecated(version) {
    return this.config.deprecatedVersions.includes(version) || 
           this.deprecationSchedule.has(version);
  }

  getVersionInfo(version) {
    const compatibility = this.compatibilityMatrix.get(version);
    const deprecation = this.deprecationSchedule.get(version);

    return {
      version,
      isDeprecated: this.isVersionDeprecated(version),
      deprecation,
      compatibility,
      documentation: `/docs/api/${version}`,
      changelog: `/docs/changelog#${version}`
    };
  }

  addDeprecationWarning(res, version) {
    if (!this.config.deprecationWarnings) return;

    const deprecation = this.deprecationSchedule.get(version);
    if (deprecation) {
      res.set('Warning', `299 - "API version ${version} is deprecated. ` +
              `Sunset date: ${deprecation.sunsetDate}. ` +
              `Please migrate to ${deprecation.replacementVersion}. ` +
              `Migration guide: ${deprecation.migrationGuide}"`);
    }
  }

  sendVersionError(res, version, errorType, details = null) {
    const errors = {
      UNSUPPORTED_VERSION: {
        status: 400,
        code: 'UNSUPPORTED_API_VERSION',
        message: `API version '${version}' is not supported`,
        supportedVersions: this.config.supportedVersions
      },
      VERSIONING_ERROR: {
        status: 500,
        code: 'API_VERSIONING_ERROR',
        message: 'Internal versioning error',
        details
      }
    };

    const error = errors[errorType] || errors.VERSIONING_ERROR;

    res.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        version: version,
        supportedVersions: error.supportedVersions,
        details: error.details,
        documentation: '/docs/api-versioning'
      }
    });
  }

  // Version-specific route handler
  versionedRoute(routes) {
    return (req, res, next) => {
      const version = req.apiVersion;
      const handler = routes[version];

      if (!handler) {
        return this.sendVersionError(res, version, 'UNSUPPORTED_VERSION');
      }

      handler(req, res, next);
    };
  }

  // Feature availability check
  hasFeature(version, feature) {
    const compatibility = this.compatibilityMatrix.get(version);
    return compatibility && compatibility.supportedFeatures.includes(feature);
  }

  // Request size validation based on version
  validateRequestSize() {
    return (req, res, next) => {
      const version = req.apiVersion;
      const compatibility = this.compatibilityMatrix.get(version);
      
      if (compatibility && compatibility.maxRequestSize) {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        
        if (contentLength > compatibility.maxRequestSize) {
          return res.status(413).json({
            success: false,
            error: {
              code: 'REQUEST_TOO_LARGE',
              message: `Request size exceeds limit for API version ${version}`,
              maxSize: compatibility.maxRequestSize,
              actualSize: contentLength
            }
          });
        }
      }

      next();
    };
  }

  // Compatibility layer for breaking changes
  compatibilityTransform() {
    return (req, res, next) => {
      const version = req.apiVersion;

      // Transform v1 requests to v2 format
      if (version === 'v1') {
        this.transformV1ToV2(req);
      }

      // Override res.json to transform responses back
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        const transformedData = this.transformResponseForVersion(data, version);
        return originalJson(transformedData);
      };

      next();
    };
  }

  transformV1ToV2(req) {
    // Example: Transform old field names to new ones
    if (req.body) {
      if (req.body.sample_id) {
        req.body.sampleId = req.body.sample_id;
        delete req.body.sample_id;
      }
      
      if (req.body.test_case_id) {
        req.body.testCaseId = req.body.test_case_id;
        delete req.body.test_case_id;
      }
    }

    // Transform query parameters
    if (req.query.sample_id) {
      req.query.sampleId = req.query.sample_id;
      delete req.query.sample_id;
    }
  }

  transformResponseForVersion(data, version) {
    if (version === 'v1' && data) {
      // Transform v2 response format back to v1
      return this.transformV2ToV1Response(data);
    }
    return data;
  }

  transformV2ToV1Response(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.transformV2ToV1Response(item));
    }

    if (typeof data === 'object' && data !== null) {
      const transformed = { ...data };

      // Transform field names back to v1 format
      if (transformed.sampleId) {
        transformed.sample_id = transformed.sampleId;
        delete transformed.sampleId;
      }

      if (transformed.testCaseId) {
        transformed.test_case_id = transformed.testCaseId;
        delete transformed.testCaseId;
      }

      // Remove v2-only fields for v1 clients
      delete transformed.realTimeUpdates;
      delete transformed.workflowStatus;
      delete transformed.metadata;

      return transformed;
    }

    return data;
  }

  // Content negotiation based on version
  negotiateContent() {
    return (req, res, next) => {
      const version = req.apiVersion;
      const acceptHeader = req.headers.accept || '';

      // Set appropriate content type based on version
      if (version === 'v1') {
        res.set('Content-Type', 'application/json; version=1.0');
      } else if (version === 'v2') {
        res.set('Content-Type', 'application/json; version=2.0');
      }

      // Handle specific content type requests
      if (acceptHeader.includes('application/hal+json') && version === 'v2') {
        req.preferredFormat = 'hal';
      } else if (acceptHeader.includes('application/vnd.api+json')) {
        req.preferredFormat = 'jsonapi';
      } else {
        req.preferredFormat = 'standard';
      }

      next();
    };
  }

  // Rate limiting based on version
  versionBasedRateLimit() {
    const rateLimits = {
      v1: { windowMs: 60000, max: 100 }, // 100 requests per minute
      v2: { windowMs: 60000, max: 200 }  // 200 requests per minute
    };

    return (req, res, next) => {
      const version = req.apiVersion;
      const limits = rateLimits[version] || rateLimits.v1;

      // Store rate limit info for use by rate limiting middleware
      req.rateLimits = limits;
      next();
    };
  }

  // Generate API documentation endpoints
  getVersionDocs(version) {
    const versionInfo = this.getVersionInfo(version);
    const compatibility = this.compatibilityMatrix.get(version);

    return {
      version,
      status: versionInfo.isDeprecated ? 'deprecated' : 'supported',
      deprecation: versionInfo.deprecation,
      features: compatibility?.supportedFeatures || [],
      limitations: compatibility?.limitations || [],
      endpoints: this.getEndpointsForVersion(version),
      examples: this.getExamplesForVersion(version),
      migrationGuides: this.getMigrationGuides(version)
    };
  }

  getEndpointsForVersion(version) {
    // This would be populated with actual endpoint definitions
    const baseEndpoints = [
      { path: '/api/samples', methods: ['GET', 'POST'] },
      { path: '/api/samples/:id', methods: ['GET', 'PUT', 'DELETE'] },
      { path: '/api/test-cases', methods: ['GET', 'POST'] },
      { path: '/api/batches', methods: ['GET', 'POST'] },
      { path: '/api/reports', methods: ['GET', 'POST'] }
    ];

    if (version === 'v2') {
      baseEndpoints.push(
        { path: '/api/workflows', methods: ['GET', 'POST'] },
        { path: '/api/notifications', methods: ['GET', 'POST'] },
        { path: '/api/alerts', methods: ['GET', 'POST'] },
        { path: '/api/exports', methods: ['POST'] },
        { path: '/api/imports', methods: ['POST'] }
      );
    }

    return baseEndpoints;
  }

  getExamplesForVersion(version) {
    const examples = {
      v1: {
        createSample: {
          request: {
            sample_id: "25_001",
            name: "John Doe",
            relation: "Child"
          },
          response: {
            id: 1,
            sample_id: "25_001",
            name: "John Doe",
            relation: "Child",
            status: "pending"
          }
        }
      },
      v2: {
        createSample: {
          request: {
            sampleId: "25_001",
            name: "John Doe",
            relation: "Child",
            metadata: {
              priority: "standard",
              source: "api"
            }
          },
          response: {
            id: 1,
            sampleId: "25_001",
            name: "John Doe",
            relation: "Child",
            status: "pending",
            metadata: {
              priority: "standard",
              source: "api"
            },
            realTimeUpdates: true,
            _links: {
              self: "/api/v2/samples/1",
              testCase: "/api/v2/test-cases/1"
            }
          }
        }
      }
    };

    return examples[version] || {};
  }

  getMigrationGuides(version) {
    const guides = {
      v1: {
        toV2: {
          breaking_changes: [
            "Field names changed from snake_case to camelCase",
            "Added required metadata field",
            "Removed deprecated status values"
          ],
          migration_steps: [
            "Update field names in request/response handling",
            "Add metadata handling",
            "Update status value mappings"
          ]
        }
      }
    };

    return guides[version] || {};
  }

  // Metrics collection
  getVersionMetrics() {
    // This would collect actual metrics in a real implementation
    return {
      usage: {
        v1: { requests: 1500, users: 45 },
        v2: { requests: 3200, users: 78 }
      },
      deprecation: {
        v1: {
          warningsSent: 450,
          migrationProgress: "67%"
        }
      },
      errors: {
        v1: { versionErrors: 12, compatibilityIssues: 3 },
        v2: { versionErrors: 2, compatibilityIssues: 0 }
      }
    };
  }
}

module.exports = APIVersioning;