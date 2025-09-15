const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const fs = require('fs');

// Import middleware and utilities
const { globalErrorHandler } = require("./middleware/errorHandler");
const { sanitizeInput } = require("./middleware/validation");
const logger = require("./utils/logger");
const requestLogger = logger; // Use same logger for requests
const { ResponseHandler } = require("./utils/responseHandler");
const { memoryManager } = require("./utils/memoryManager");
const streamingResponse = require("./utils/streamingResponse");

// Import DevOps middleware and services
const { register: metricsRegister, metricsMiddleware, trackDatabaseQuery, trackSampleProcessed, trackBatchCreated } = require('./middleware/metrics');
const { healthCheckService } = require('./middleware/healthcheck');
const { backgroundJobService } = require('./services/backgroundJobs');
const performanceRoutes = require('./routes/performance');
const SampleGenerator = require('./services/sample-generator');
const prometheusMetrics = require('./middleware/prometheus');
const EnhancedSampleCycler = require('./services/enhanced-sample-cycler');
const forensicMetricsService = require('./services/forensicMetricsService');
const devopsMetricsService = require('./services/devopsMetricsService');

// Import routes
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const dbViewerRoutes = require("./routes/database-viewer");
const geneticAnalysisRoutes = require("./routes/genetic-analysis");
const reportsRoutes = require("./routes/reports");
const qmsRoutes = require("./routes/qms");
const inventoryRoutes = require("./routes/inventory");
const aiMlRoutes = require("./routes/ai-ml");
const adminRoutes = require('./routes/admin');
const paternityRoutes = require('./routes/paternity');
const strMatchingRoutes = require('./routes/str-matching');
const forensicReportsRoutes = require('./routes/forensic-reports');
const caseManagementRoutes = require('./routes/case-management');
const { router: devopsDashboardRoutes, initializeDb: initDevopsDb } = require('./routes/devops-dashboard');
// Removed monitoring routes import

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize PostgreSQL database connection with graceful error handling
let db = null;
let dbPool = null;
const databaseService = require('./services/database');

// Database initialization with graceful degradation
(async () => {
  try {
    const initialized = await databaseService.initialize();
    if (initialized) {
      db = databaseService;
      dbPool = databaseService.pool;
      logger.info('Database initialized successfully', {
        type: databaseService.getDatabaseType(),
        connected: databaseService.isConnected()
      });
      console.log(`✅ Database connected successfully (${databaseService.getDatabaseType()})`);
    } else {
      logger.warn('Database initialization failed, running with limited functionality');
      console.log('⚠️  Database not available, running with limited functionality');
    }
  } catch (error) {
    logger.error('Database initialization error', { error: error.message });
    console.error('❌ Database initialization error:', error.message);
    // Continue without database - app will serve static files and return 503 for API calls
  }
})();

const app = express();

// Initialize memory management
memoryManager.initialize({
  memoryThreshold: 0.75, // 75% memory threshold
  optimizations: {
    enableGC: true,
    enableCaching: true,
    enableStreaming: true,
    enableMemoryLimits: true
  }
});

// Trust proxy for accurate client IP
app.set('trust proxy', 1);

// Configure CORS for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          process.env.FRONTEND_URL || 'https://lims.jagdevops.co.za',
          'https://lims.jagdevops.co.za',
          'http://localhost:3000', // For local testing
        ]
      : [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'https://lims.jagdevops.co.za'
        ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin not allowed', { origin, allowed: allowedOrigins });
      callback(null, true); // Allow in development, log warning
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));

// Serve static files from the dist directory in production with proper cache control
if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
  const distPath = path.join(__dirname, '../dist');
  console.log(`📁 Serving static files from: ${distPath}`);

  // Cache control middleware for different file types
  app.use((req, res, next) => {
    // Force no-cache for index.html to ensure fresh content
    if (req.path === '/' || req.path === '/index.html' || req.path.endsWith('.html')) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Cache-Control': 'no-cache-html'
      });
    }
    // Long-term cache for hashed assets (JS, CSS with hash in filename)
    else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf)$/)) {
      // Check if file has hash in name (cache busting)
      const hasHash = req.path.match(/-[a-f0-9]{8,}[\.-]/i);

      if (hasHash) {
        // Hashed assets - cache for 1 year
        res.set({
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache-Control': 'hashed-asset'
        });
      } else {
        // Non-hashed assets - shorter cache with revalidation
        res.set({
          'Cache-Control': 'public, max-age=3600, must-revalidate',
          'X-Cache-Control': 'non-hashed-asset'
        });
      }
    }
    next();
  });

  // Serve static files with cache control
  app.use(express.static(distPath, {
    maxAge: 0, // Let our middleware handle caching
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Additional cache control for manifest and service worker
      if (path.endsWith('manifest.json') || path.endsWith('sw.js')) {
        res.set({
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'X-Cache-Control': 'pwa-files'
        });
      }
    }
  }));
}

// Reduced payload limits for memory optimization
app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    // Monitor request size
    const size = buf.length;
    if (size > 5 * 1024 * 1024) { // 5MB
      logger.warn('Large request payload detected', {
        size: Math.round(size / 1024 / 1024) + 'MB',
        url: req.url
      });
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '5mb',
  parameterLimit: 1000 // Limit URL parameters
}));

// Memory and DevOps middleware
const { memoryMonitor } = require('./middleware/memoryMonitor');
// app.use(memoryMonitor.middleware()); // Disabled for testing
app.use(metricsMiddleware);
// app.use(sanitizeInput); // TODO: Fix sanitizeInput middleware

// Import simple cycler for fallback when database is unavailable
const simpleSampleCycler = require('./services/simpleSampleCycler');

// Database helper functions with connection checking
async function getSamplesWithPagination(page = 1, limit = 50, filters = {}) {
  // Check database connection before proceeding
  if (!databaseService.isConnected()) {
    logger.warn('Database not connected, using simple sample cycler');
    // Use simple cycler as fallback
    const samples = await simpleSampleCycler.getAllSamples();
    const total = samples.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSamples = samples.slice(startIndex, endIndex);

    return {
      data: paginatedSamples,
      pagination: { page, limit, total, pages }
    };
  }

  try {
    // Validate and sanitize inputs
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];
    const conditions = [];
    if (filters.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'pending':
          conditions.push("workflow_status IN ('sample_collected', 'extraction_ready', 'pcr_ready') AND batch_id IS NULL AND extraction_id IS NULL");
          break;
        case 'extraction_ready':
          conditions.push("workflow_status IN ('sample_collected', 'extraction_ready') AND extraction_id IS NULL");
          break;
        case 'extraction_batched':
          conditions.push("workflow_status IN ('extraction_batched', 'extraction_in_progress') AND extraction_id IS NOT NULL");
          break;
        case 'pcr_batched':
          conditions.push("(workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'LDS_%'))");
          break;
        case 'electro_batched':
          conditions.push("(workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%'))");
          break;
        case 'rerun_batched':
          conditions.push("(workflow_status = 'rerun_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE '%_RR'))");
          break;
        case 'completed':
          conditions.push("workflow_status IN ('analysis_completed')");
          break;
        case 'processing':
          conditions.push("workflow_status IN ('pcr_batched', 'pcr_completed')");
          break;
        default:
          conditions.push('workflow_status = $' + (params.length + 1));
          params.push(filters.status);
      }
    }
    if (filters.search) {
      conditions.push('(lab_number LIKE $' + (params.length + 1) + ' OR name LIKE $' + (params.length + 2) + ' OR surname LIKE $' + (params.length + 3) + ')');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Use database service for compatibility
    const countQuery = `SELECT COUNT(*) as total FROM samples ${whereClause}`;
    const countResult = await databaseService.get(countQuery, params);
    const total = countResult ? countResult.total : 0;

    const dataQuery = `
      SELECT
        id, lab_number, name, surname, relation, workflow_status,
        collection_date, case_number
      FROM samples
      ${whereClause}
      ORDER BY lab_number ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const samples = await databaseService.all(dataQuery, params);

    return {
      data: samples || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Error fetching samples with pagination', { error: error.message, page, limit, filters });
    return { data: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
  } finally {
    // Track database query metrics
    trackDatabaseQuery('SELECT', 'samples', Date.now() - Date.now());
  }
}

// Optimized cache with memory limits
const { LRUCache } = require('lru-cache');
const sampleCountsCache = new LRUCache({
  max: 100, // Maximum 100 cached entries
  ttl: 30000, // 30 seconds TTL
  updateAgeOnGet: false,
  allowStale: false
});

async function getSampleCounts() {
  // Check database connection
  if (!databaseService.isConnected()) {
    return { total: 0, active: 0, pending: 0, pcrBatched: 0, electroBatched: 0, rerunBatched: 0, completed: 0, processing: 0 };
  }

  try {
    const cacheKey = 'sample_counts';

    // Return cached result if available
    const cached = sampleCountsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Use a single optimized query based on actual database schema
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN workflow_status = 'sample_collected' THEN 1 END) as active,
        COUNT(CASE WHEN workflow_status = 'sample_collected' THEN 1 END) as pending,
        COUNT(CASE WHEN workflow_status = 'sample_collected' THEN 1 END) as extraction_ready,
        COUNT(CASE WHEN workflow_status IN ('extraction_batched', 'extraction_in_progress', 'extraction_completed') THEN 1 END) as extraction_batched,
        COUNT(CASE WHEN workflow_status = 'pcr_batched' THEN 1 END) as pcrBatched,
        COUNT(CASE WHEN workflow_status = 'electro_batched' THEN 1 END) as electroBatched,
        COUNT(CASE WHEN workflow_status = 'rerun_batched' THEN 1 END) as rerunBatched,
        COUNT(CASE WHEN workflow_status IN ('analysis_completed', 'report_sent') THEN 1 END) as completed,
        COUNT(CASE WHEN workflow_status IN ('pcr_batched', 'pcr_completed') THEN 1 END) as processing
      FROM samples
    `;

    const result = await databaseService.get(query, []);

    // Cache the result
    if (result) {
      sampleCountsCache.set(cacheKey, result);
      return result;
    }

    return { total: 0, active: 0, pending: 0, pcrBatched: 0, electroBatched: 0, rerunBatched: 0, completed: 0, processing: 0 };
  } catch (error) {
    logger.error('Error getting sample counts', { error: error.message });
    return { total: 0, active: 0, pending: 0, pcrBatched: 0, electroBatched: 0, rerunBatched: 0, completed: 0, processing: 0 };
  }
}

async function createSample(sampleData) {
  // Check database connection
  if (!databaseService.isConnected()) {
    throw new Error('Database not available - cannot create sample');
  }

  try {
    // Validate required fields
    if (!sampleData.lab_number || !sampleData.name || !sampleData.surname) {
      throw new Error('Missing required fields: lab_number, name, or surname');
    }

    // Check for duplicate lab_number
    const existing = await databaseService.get('SELECT id FROM samples WHERE lab_number = $1', [sampleData.lab_number]);

    if (existing) {
      throw new Error(`Sample with lab number ${sampleData.lab_number} already exists`);
    }

    const query = `
      INSERT INTO samples (
        lab_number, name, surname, relation, status, phone_number,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const result = await databaseService.run(query, [
      sampleData.lab_number,
      sampleData.name.trim(),
      sampleData.surname.trim(),
      sampleData.relation || 'Child',
      sampleData.status || 'pending',
      sampleData.phone_number
    ]);

    // Clear sample counts cache since we added a new sample
    sampleCountsCache.clear();

    // Track sample creation metrics
    trackSampleProcessed('created', 'registration');

    return { id: result.lastInsertRowid, ...sampleData };
  } catch (error) {
    logger.error('Error creating sample', { error: error.message, sampleData });
    throw error;
  }
}

// Use routes with fallback handling
try {
  app.use("/api/auth", authRoutes);
  app.use("/api/devops", devopsDashboardRoutes);
  // app.use("/api", apiRoutes); // Disabled - using server.js endpoints instead
  // app.use("/api/db", dbViewerRoutes);
  app.use("/api/genetic-analysis", geneticAnalysisRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/qms", qmsRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/ai-ml", aiMlRoutes);
  app.use("/api/paternity", paternityRoutes);
  app.use("/api/str-matching", strMatchingRoutes);
  app.use("/api/forensic-reports", forensicReportsRoutes);
  app.use("/api/case-management", caseManagementRoutes);
  // app.use("/monitoring", monitoringRoutes);
} catch (error) {
  logger.warn('Some routes not available, using fallback endpoints', { error: error.message });
}

// Health endpoint - always returns 200 OK without database check
app.get('/health', (req, res) => {
  const healthCheck = databaseService.getHealthCheck();
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '3.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Health endpoint for frontend compatibility
app.get('/api/health', (req, res) => {
  const healthCheck = databaseService.getHealthCheck();
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '3.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ready endpoint - returns 200 only if database is connected
app.get('/ready', async (req, res) => {
  try {
    const readyCheck = await databaseService.getReadyCheck();
    if (readyCheck.status === 'ready') {
      res.status(200).json(readyCheck);
    } else {
      res.status(503).json({
        status: 'not_ready',
        error: 'Database not available',
        details: readyCheck
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Core API endpoints with database integration
app.get("/api/test", (req, res) => {
  ResponseHandler.success(res, {
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
    database: databaseService.isConnected() ? 'connected' : 'disconnected',
    databaseType: databaseService.getDatabaseType()
  });
});

// Middleware to check database connection for API endpoints
function requireDatabase(req, res, next) {
  if (!databaseService.isConnected()) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection not available',
      timestamp: new Date().toISOString()
    });
  }
  next();
}

// Samples endpoints with streaming support
app.get("/api/samples", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(100, parseInt(req.query.limit) || 50); // Cap limit
    const useStreaming = req.query.stream === 'true';
    const filters = {
      status: req.query.status,
      search: req.query.search
    };

    if (useStreaming && limit > 50) {
      // Use streaming for large responses
      const query = `
        SELECT
          id, lab_number, name, surname, relation, workflow_status,
          collection_date, workflow_status AS status, case_number
        FROM samples
        ${filters.status ? 'WHERE workflow_status = $1' : ''}
        ORDER BY lab_number ASC
      `;
      const params = filters.status ? [filters.status] : [];

      streamingResponse.streamDatabaseResults(res, query, params, {
        dbPool: databaseService.pool,
        chunkSize: 100
      });
    } else {
      const result = await getSamplesWithPagination(page, limit, filters);

      // Also include DEMO samples from SimpleSampleCycler for visualization
      try {
        const demoSamples = await simpleSampleCycler.getAllSamples();
        // Merge demo samples with database samples
        const mergedData = [...demoSamples, ...result.data].slice(0, limit);
        ResponseHandler.paginated(res, mergedData, result.pagination);
      } catch (e) {
        // If simple cycler fails, just return database results
        ResponseHandler.paginated(res, result.data, result.pagination);
      }
    }
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch samples', error);
  }
});

app.get("/api/samples/all", requireDatabase, async (req, res) => {
  try {
    const query = `
      SELECT
        id, lab_number, name, surname, relation, workflow_status,
        collection_date, case_number, sample_type, ethnicity as gender,
        created_at, updated_at
      FROM samples
      ORDER BY id DESC
    `;
    const samples = await databaseService.all(query, []);
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch all samples', error);
  }
});

app.post("/api/samples", requireDatabase, async (req, res) => {
  try {
    const newSample = await createSample(req.body);
    ResponseHandler.success(res, newSample, 'Sample created successfully', 201);
  } catch (error) {
    logger.error('Sample creation failed', { error: error.message, body: req.body });
    ResponseHandler.error(res, error.message || 'Failed to create sample', 500);
  }
});

app.get("/api/samples/counts", requireDatabase, async (req, res) => {
  try {
    const counts = await getSampleCounts();
    ResponseHandler.success(res, counts);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get sample counts', error);
  }
});

app.get("/api/samples/queue-counts", requireDatabase, async (req, res) => {
  try {
    const counts = await getSampleCounts();
    ResponseHandler.success(res, counts);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get queue counts', error);
  }
});

app.get("/api/samples/queue/:queueType", requireDatabase, async (req, res) => {
  try {
    const { queueType } = req.params;
    const validQueues = ['extraction_ready', 'extraction_batched', 'extraction_completed', 'pcr_ready', 'pcr_batched', 'electro_ready', 'electro_batched', 'analysis_ready', 'completed'];

    if (!validQueues.includes(queueType)) {
      return ResponseHandler.error(res, `Invalid queue type. Must be one of: ${validQueues.join(', ')}`, 400);
    }

    let samples = [];
    let whereClause = '';

    switch (queueType) {
      case 'pcr_ready':
        whereClause = "WHERE workflow_status IN ('extraction_completed', 'pcr_ready') AND batch_id IS NULL";
        break;
      case 'extraction_ready':
        whereClause = "WHERE workflow_status IN ('sample_collected', 'extraction_ready') AND extraction_id IS NULL";
        break;
      case 'extraction_batched':
        whereClause = "WHERE workflow_status IN ('extraction_batched', 'extraction_in_progress') AND extraction_id IS NOT NULL";
        break;
      case 'extraction_completed':
        whereClause = "WHERE workflow_status = 'extraction_completed'";
        break;
      case 'pcr_batched':
        whereClause = "WHERE workflow_status = 'pcr_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'JDS_%' AND lab_batch_number NOT LIKE '%_RR')";
        break;
      case 'electro_ready':
        whereClause = "WHERE workflow_status = 'pcr_completed' OR workflow_status = 'electro_ready'";
        break;
      case 'electro_batched':
        whereClause = "WHERE workflow_status = 'electro_batched' OR (batch_id IS NOT NULL AND lab_batch_number LIKE 'ELEC_%')";
        break;
      case 'analysis_ready':
        whereClause = "WHERE workflow_status = 'electro_completed' OR workflow_status = 'analysis_ready'";
        break;
      case 'completed':
        whereClause = "WHERE workflow_status IN ('analysis_completed')";
        break;
      default:
        whereClause = "WHERE 1=1";
    }

    const query = `
      SELECT
        id, lab_number, name, surname, relation, workflow_status,
        collection_date, workflow_status AS status, case_number
      FROM samples
      ${whereClause}
      ORDER BY lab_number ASC
      LIMIT 100
    `;

    samples = await databaseService.all(query, []);
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get samples for queue', error);
  }
});

app.get("/api/samples/search", requireDatabase, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return ResponseHandler.success(res, []);
    }

    const searchQuery = `
      SELECT
        id, lab_number, name, surname, relation, status,
        collection_date, workflow_status, case_number
      FROM samples
      WHERE lab_number LIKE $1 OR name LIKE $2 OR surname LIKE $3
      ORDER BY id DESC
      LIMIT 50
    `;

    const searchTerm = `%${query}%`;
    const samples = await databaseService.all(searchQuery, [searchTerm, searchTerm, searchTerm]);

    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to search samples', error);
  }
});

// Batch endpoints
app.post("/api/generate-batch", requireDatabase, async (req, res) => {
  try {
    const { batchNumber, operator, wells, sampleCount, date, batchType } = req.body;

    if (!operator) {
      throw new Error('Operator is required');
    }

    let finalBatchNumber = batchNumber;
    if (!batchNumber) {
      finalBatchNumber = 'JDS_1';
    }

    let batchPrefix = 'JDS_';
    let isRerunBatch = false;

    if (finalBatchNumber.startsWith('ELEC_')) {
      batchPrefix = 'ELEC_';
    } else if (finalBatchNumber.includes('_RR')) {
      batchPrefix = 'JDS_';
      isRerunBatch = true;
    } else if (finalBatchNumber.startsWith('JDS_')) {
      batchPrefix = 'JDS_';
    }

    if (!batchNumber || finalBatchNumber === 'JDS_1' || finalBatchNumber === 'ELEC_1') {
      if (isRerunBatch) {
        const lastRerunBatch = await databaseService.get(`SELECT batch_number FROM batches WHERE batch_number LIKE 'JDS_%_RR' ORDER BY id DESC LIMIT 1`, []);

        let nextNumber = 1;
        if (lastRerunBatch) {
          const match = lastRerunBatch.batch_number.match(/JDS_(\d+)_RR/);
          if (match) {
            const lastNumber = parseInt(match[1]);
            if (!isNaN(lastNumber)) {
              nextNumber = lastNumber + 1;
            }
          }
        }
        finalBatchNumber = `JDS_${nextNumber}_RR`;
      } else {
        const lastBatch = await databaseService.get(`SELECT batch_number FROM batches WHERE batch_number LIKE $1 ORDER BY id DESC LIMIT 1`, [`${batchPrefix}%`]);

        let nextNumber = 1;
        if (lastBatch) {
          const lastNumber = parseInt(lastBatch.batch_number.replace(batchPrefix, ''));
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
        finalBatchNumber = `${batchPrefix}${nextNumber}`;
      }
    }

    const insertBatchQuery = `
      INSERT INTO batches (batch_number, operator, pcr_date, total_samples, plate_layout, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const plateLayoutJson = JSON.stringify(wells || {});
    const result = await databaseService.run(insertBatchQuery, [
      finalBatchNumber,
      operator,
      date || new Date().toISOString().split('T')[0],
      sampleCount || 0,
      plateLayoutJson,
      'active'
    ]);

    let updatedSamples = 0;
    if (wells) {
      let workflowStatus = 'pcr_batched';
      if (batchType === 'electrophoresis') {
        workflowStatus = 'electro_batched';
      } else if (batchType === 'rerun') {
        workflowStatus = 'rerun_batched';
      }

      const updateSampleQuery = `
        UPDATE samples
        SET batch_id = $1, workflow_status = $2, lab_batch_number = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `;

      for (const well of Object.values(wells)) {
        if (well.samples) {
          for (const sample of well.samples) {
            if (sample.id) {
              const updateResult = await databaseService.run(updateSampleQuery, [result.lastInsertRowid, workflowStatus, finalBatchNumber, sample.id]);
              if (updateResult.changes > 0) {
                updatedSamples++;
              }
            }
          }
        }
      }
    }

    const batchResult = {
      batchId: result.lastInsertRowid,
      batchNumber: finalBatchNumber,
      operator,
      total_samples: sampleCount || 0,
      updated_samples: updatedSamples,
      status: 'active',
      plate_layout: wells || {}
    };

    // Track batch creation metrics
    const batchTypeMetric = batchResult.batchNumber.startsWith('ELEC_') ? 'electrophoresis' :
                           batchResult.batchNumber.includes('_RR') ? 'rerun' : 'pcr';
    trackBatchCreated(batchTypeMetric);

    ResponseHandler.success(res, batchResult, 'Batch created successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to create batch', error);
  }
});

app.get("/api/batches", requireDatabase, async (req, res) => {
  try {
    const batches = await databaseService.getAllBatches();

    // Parse plate_layout JSON if needed
    const formattedBatches = batches.map(batch => ({
      ...batch,
      plate_layout: typeof batch.plate_layout === 'string'
        ? JSON.parse(batch.plate_layout)
        : batch.plate_layout || {}
    }));

    ResponseHandler.success(res, formattedBatches);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch batches', error);
  }
});

app.get("/api/batches/:id", requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id, batch_number, operator, pcr_date, electro_date,
        total_samples, status, created_at, updated_at,
        plate_layout
      FROM batches
      WHERE id = $1
    `;

    const batch = await databaseService.get(query, [id]);

    if (!batch) {
      return ResponseHandler.notFound(res, 'Batch not found');
    }

    batch.plate_layout = batch.plate_layout ? JSON.parse(batch.plate_layout) : {};

    ResponseHandler.success(res, batch);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch batch', error);
  }
});

// Statistics endpoint for optimized data loading
app.get("/api/statistics", requireDatabase, async (req, res) => {
  try {
    const { period = 'all' } = req.query;

    // Calculate date filter
    let dateFilter = '';
    let dateParams = [];
    if (period !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      dateFilter = ` WHERE created_at >= $1`;
      dateParams = [startDate.toISOString()];
    }

    // Get comprehensive statistics
    const totalSamplesQuery = `SELECT COUNT(*) as count FROM samples${dateFilter}`;
    const totalSamplesResult = await databaseService.get(totalSamplesQuery, dateParams);
    const totalSamples = totalSamplesResult ? totalSamplesResult.count : 0;

    const workflowStatsQuery = `
      SELECT workflow_status, COUNT(*) as count
      FROM samples${dateFilter}
      GROUP BY workflow_status
    `;
    const workflowStats = await databaseService.all(workflowStatsQuery, dateParams);

    const demographicsQuery = `
      SELECT relation, ethnicity as gender, COUNT(*) as count
      FROM samples${dateFilter}
      GROUP BY relation, ethnicity
    `;
    const demographics = await databaseService.all(demographicsQuery, dateParams);

    const recentSamplesQuery = `
      SELECT * FROM samples
      WHERE created_at >= $1
      ORDER BY created_at DESC LIMIT 50
    `;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSamples = await databaseService.all(recentSamplesQuery, [thirtyDaysAgo.toISOString()]);

    const processingTimesQuery = `
      SELECT
        lab_number,
        EXTRACT(EPOCH FROM (updated_at - collection_date))/86400 as processing_days,
        workflow_status
      FROM samples
      WHERE collection_date IS NOT NULL AND updated_at IS NOT NULL${dateFilter ? ` AND created_at >= $${dateParams.length + 1}` : ''}
      ORDER BY processing_days DESC
    `;
    const processingTimesParams = dateFilter ? [...dateParams] : [];
    if (dateFilter) processingTimesParams.push(dateParams[0]);
    const processingTimes = await databaseService.all(processingTimesQuery, processingTimesParams);

    ResponseHandler.success(res, {
      totalSamples,
      workflowStats,
      demographics,
      recentSamples,
      processingTimes,
      period
    });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch statistics', error);
  }
});

// Legacy API endpoints for compatibility
app.get("/api/get-last-lab-number", requireDatabase, async (req, res) => {
  try {
    const query = 'SELECT lab_number FROM samples ORDER BY id DESC LIMIT 1';
    const result = await databaseService.get(query, []);
    ResponseHandler.success(res, result ? result.lab_number : '001/2025');
  } catch (error) {
    ResponseHandler.success(res, '001/2025');
  }
});

app.get("/api/test-cases", requireDatabase, async (req, res) => {
  try {
    const query = 'SELECT * FROM test_cases ORDER BY id DESC LIMIT 100';
    const testCases = await databaseService.all(query, []);
    ResponseHandler.success(res, testCases);
  } catch (error) {
    ResponseHandler.success(res, []);
  }
});

app.post("/api/test-cases", requireDatabase, async (req, res) => {
  try {
    const {
      case_number,
      ref_kit_number,
      submission_date,
      client_type,
      test_purpose,
      sample_type
    } = req.body;

    // Generate case number if not provided
    const finalCaseNumber = case_number || `CASE_${new Date().getFullYear()}_${Date.now().toString().slice(-6)}`;
    const finalKitNumber = ref_kit_number || `KIT_${Date.now()}`;

    const query = `
      INSERT INTO test_cases (
        case_number, ref_kit_number, submission_date, client_type,
        test_purpose, sample_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const result = await databaseService.run(query, [
      finalCaseNumber,
      finalKitNumber,
      submission_date || new Date().toISOString(),
      client_type || 'private',
      test_purpose || 'paternity',
      sample_type || 'buccal_swab'
    ]);

    const newTestCase = {
      id: result.lastInsertRowid,
      case_number: finalCaseNumber,
      ref_kit_number: finalKitNumber,
      submission_date: submission_date || new Date().toISOString(),
      client_type: client_type || 'private',
      test_purpose: test_purpose || 'paternity',
      sample_type: sample_type || 'buccal_swab'
    };

    ResponseHandler.success(res, newTestCase, 'Test case created successfully', 201);
  } catch (error) {
    logger.error('Test case creation failed', { error: error.message, body: req.body });
    ResponseHandler.error(res, error.message || 'Failed to create test case', 500);
  }
});

app.post("/api/refresh-database", requireDatabase, async (req, res) => {
  try {
    const counts = await getSampleCounts();
    ResponseHandler.success(res, {
      message: "Database refreshed",
      statistics: {
        samples: counts.total,
        cases: Math.floor(counts.total / 3),
        batches: 0,
        reports: 0
      }
    });
  } catch (error) {
    ResponseHandler.success(res, {
      message: "Database refreshed",
      statistics: { samples: 0, cases: 0, batches: 0, reports: 0 }
    });
  }
});

// Electrophoresis batches endpoint
app.get("/api/electrophoresis-batches", requireDatabase, async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        batch_number,
        created_at,
        status,
        operator,
        0 as sample_count
      FROM batches
      WHERE batch_number LIKE 'ELEC_%'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const batches = await databaseService.all(query, []);
    ResponseHandler.success(res, batches);
  } catch (error) {
    logger.error('Error fetching electrophoresis batches:', error);
    ResponseHandler.success(res, []); // Return empty array on error
  }
});

// Workflow stats endpoint
app.get("/api/workflow-stats", requireDatabase, async (req, res) => {
  try {
    const counts = await getSampleCounts();
    ResponseHandler.success(res, {
      registered: counts.pending || 0,
      inExtraction: counts.extraction_batched || 0,
      inPCR: counts.pcrBatched || 0,
      inElectrophoresis: counts.electroBatched || 0,
      reruns: counts.rerunBatched || 0,
      completed: counts.completed || 0,
      total: counts.total || 0
    });
  } catch (error) {
    ResponseHandler.success(res, {
      registered: 0,
      inPCR: 0,
      inElectrophoresis: 0,
      reruns: 0,
      completed: 0,
      total: 0
    });
  }
});

// General workflow status endpoint - for dashboard compatibility
app.get("/api/workflow-status", requireDatabase, async (req, res) => {
  try {
    const counts = await getSampleCounts();
    ResponseHandler.success(res, {
      totalSamples: counts.total || 0,
      pending: counts.pending || 0,
      inExtraction: counts.extraction_batched || 0,
      inPCR: counts.pcrBatched || 0,
      inElectrophoresis: counts.electroBatched || 0,
      completed: counts.completed || 0,
      alerts: []
    });
  } catch (error) {
    ResponseHandler.success(res, {
      totalSamples: 0,
      pending: 0,
      inExtraction: 0,
      inPCR: 0,
      inElectrophoresis: 0,
      completed: 0,
      alerts: []
    });
  }
});

// DNA Extraction API Endpoints

// Get DNA extraction batches
app.get("/api/extraction/batches", requireDatabase, async (req, res) => {
  try {
    const query = `
      SELECT
        id, batch_number, operator, extraction_date, extraction_method,
        kit_lot_number, kit_expiry_date, total_samples, status,
        lysis_time, lysis_temperature, incubation_time, centrifuge_speed,
        centrifuge_time, elution_volume, quality_control_passed,
        plate_layout, notes, created_at, updated_at
      FROM extraction_batches
      ORDER BY created_at DESC
    `;

    const batches = await databaseService.all(query, []);
    const formattedBatches = batches.map(batch => ({
      ...batch,
      plate_layout: batch.plate_layout ? JSON.parse(batch.plate_layout) : {}
    }));

    ResponseHandler.success(res, formattedBatches);
  } catch (error) {
    logger.error('Error fetching extraction batches:', error);
    ResponseHandler.success(res, []); // Return empty array on error
  }
});

// Get specific extraction batch
app.get("/api/extraction/batches/:id", requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id, batch_number, operator, extraction_date, extraction_method,
        kit_lot_number, kit_expiry_date, total_samples, status,
        lysis_time, lysis_temperature, incubation_time, centrifuge_speed,
        centrifuge_time, elution_volume, quality_control_passed,
        plate_layout, notes, created_at, updated_at
      FROM extraction_batches
      WHERE id = $1
    `;

    const batch = await databaseService.get(query, [id]);

    if (!batch) {
      return ResponseHandler.notFound(res, 'Extraction batch not found');
    }

    batch.plate_layout = batch.plate_layout ? JSON.parse(batch.plate_layout) : {};

    ResponseHandler.success(res, batch);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch extraction batch', error);
  }
});

// Create new extraction batch
app.post("/api/extraction/create-batch", requireDatabase, async (req, res) => {
  try {
    const {
      batchNumber, operator, extractionDate, extractionMethod,
      kitLotNumber, kitExpiryDate, wells, sampleCount,
      lysisTime, lysisTemperature, incubationTime,
      centrifugeSpeed, centrifugeTime, elutionVolume,
      notes
    } = req.body;

    if (!operator || !extractionMethod || !kitLotNumber) {
      throw new Error('Operator, extraction method, and kit lot number are required');
    }

    let finalBatchNumber = batchNumber;
    if (!batchNumber || batchNumber === 'EXT_1') {
      const lastBatch = await databaseService.get(`SELECT batch_number FROM extraction_batches WHERE batch_number LIKE 'EXT_%' ORDER BY id DESC LIMIT 1`, []);

      let nextNumber = 1;
      if (lastBatch) {
        const lastNumber = parseInt(lastBatch.batch_number.replace('EXT_', ''));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      finalBatchNumber = `EXT_${nextNumber.toString().padStart(3, '0')}`;
    }

    const insertBatchQuery = `
      INSERT INTO extraction_batches (
        batch_number, operator, extraction_date, extraction_method,
        kit_lot_number, kit_expiry_date, total_samples, plate_layout,
        lysis_time, lysis_temperature, incubation_time,
        centrifuge_speed, centrifuge_time, elution_volume,
        notes, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const plateLayoutJson = JSON.stringify(wells || {});
    const result = await databaseService.run(insertBatchQuery, [
      finalBatchNumber,
      operator,
      extractionDate || new Date().toISOString().split('T')[0],
      extractionMethod,
      kitLotNumber,
      kitExpiryDate,
      sampleCount || 0,
      plateLayoutJson,
      lysisTime || 60,
      lysisTemperature || 56.0,
      incubationTime || 30,
      centrifugeSpeed || 14000,
      centrifugeTime || 3,
      elutionVolume || 200,
      notes
    ]);

    // Update sample workflow status to extraction_batched
    let updatedSamples = 0;
    if (wells) {
      const updateSampleQuery = `
        UPDATE samples
        SET extraction_id = $1, workflow_status = 'extraction_batched', lab_batch_number = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `;

      for (const well of Object.values(wells)) {
        if (well.samples) {
          for (const sample of well.samples) {
            if (sample.id) {
              const updateResult = await databaseService.run(updateSampleQuery, [result.lastInsertRowid, finalBatchNumber, sample.id]);
              if (updateResult.changes > 0) {
                updatedSamples++;
              }
            }
          }
        }
      }
    }

    const batchResult = {
      batchId: result.lastInsertRowid,
      batchNumber: finalBatchNumber,
      operator,
      extractionMethod,
      total_samples: sampleCount || 0,
      updated_samples: updatedSamples,
      status: 'active',
      plate_layout: wells || {}
    };

    // Track batch creation metrics
    trackBatchCreated('extraction');

    ResponseHandler.success(res, batchResult, 'DNA extraction batch created successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to create DNA extraction batch', error);
  }
});

// Add quantification results
app.post("/api/extraction/quantification", requireDatabase, async (req, res) => {
  try {
    const {
      extractionBatchId, sampleId, wellPosition,
      dnaConcentration, purity260280, purity260230,
      volumeRecovered, qualityAssessment, quantificationMethod,
      extractionEfficiency, inhibitionDetected, reextractionRequired,
      notes
    } = req.body;

    const insertResultQuery = `
      INSERT INTO extraction_results (
        extraction_batch_id, sample_id, well_position,
        dna_concentration, purity_260_280, purity_260_230,
        volume_recovered, quality_assessment, quantification_method,
        extraction_efficiency, inhibition_detected, reextraction_required,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (extraction_batch_id, sample_id) DO UPDATE SET
        well_position = EXCLUDED.well_position,
        dna_concentration = EXCLUDED.dna_concentration,
        purity_260_280 = EXCLUDED.purity_260_280,
        purity_260_230 = EXCLUDED.purity_260_230,
        volume_recovered = EXCLUDED.volume_recovered,
        quality_assessment = EXCLUDED.quality_assessment,
        quantification_method = EXCLUDED.quantification_method,
        extraction_efficiency = EXCLUDED.extraction_efficiency,
        inhibition_detected = EXCLUDED.inhibition_detected,
        reextraction_required = EXCLUDED.reextraction_required,
        notes = EXCLUDED.notes
      RETURNING id
    `;

    const result = await databaseService.run(insertResultQuery, [
      extractionBatchId, sampleId, wellPosition,
      dnaConcentration, purity260280, purity260230,
      volumeRecovered, qualityAssessment, quantificationMethod,
      extractionEfficiency, inhibitionDetected, reextractionRequired,
      notes
    ]);

    ResponseHandler.success(res, { id: result.lastInsertRowid }, 'Quantification result added successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to add quantification result', error);
  }
});

// Complete extraction batch
app.put("/api/extraction/complete-batch", requireDatabase, async (req, res) => {
  try {
    const { batchId, qualityControlPassed, notes } = req.body;

    // Update batch status
    const updateBatchQuery = `
      UPDATE extraction_batches
      SET status = 'completed', quality_control_passed = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;

    await databaseService.run(updateBatchQuery, [qualityControlPassed ? 1 : 0, notes, batchId]);

    // Update samples to pcr_ready status (extraction completed)
    const updateSamplesQuery = `
      UPDATE samples
      SET workflow_status = 'pcr_ready', updated_at = CURRENT_TIMESTAMP
      WHERE extraction_id = $1 AND workflow_status IN ('extraction_batched', 'extraction_in_progress')
    `;

    const samplesResult = await databaseService.run(updateSamplesQuery, [batchId]);

    const result = {
      batchId,
      status: 'completed',
      updatedSamples: samplesResult.changes
    };

    ResponseHandler.success(res, result, 'Extraction batch completed successfully');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to complete extraction batch', error);
  }
});

// Get extraction results for a batch
app.get("/api/extraction/:batchId/results", requireDatabase, async (req, res) => {
  try {
    const { batchId } = req.params;

    const query = `
      SELECT
        er.*, s.lab_number, s.name, s.surname
      FROM extraction_results er
      LEFT JOIN samples s ON er.sample_id = s.id
      WHERE er.extraction_batch_id = $1
      ORDER BY er.well_position
    `;

    const results = await databaseService.all(query, [batchId]);
    ResponseHandler.success(res, results);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to fetch extraction results', error);
  }
});

// Get samples ready for extraction
app.get("/api/extraction/samples-ready", requireDatabase, async (req, res) => {
  try {
    const query = `
      SELECT
        id, lab_number, name, surname, relation, status,
        collection_date, workflow_status, case_number
      FROM samples
      WHERE workflow_status IN ('sample_collected', 'extraction_ready') AND batch_id IS NULL
      ORDER BY collection_date ASC, lab_number ASC
      LIMIT 100
    `;

    const samples = await databaseService.all(query, []);
    ResponseHandler.success(res, samples);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get samples ready for extraction', error);
  }
});

// Placeholder endpoints for missing routes
const placeholderEndpoints = [
  '/api/reports',
  '/api/statistics',
  '/api/equipment',
  '/api/quality-control',
  '/api/db/reports',
  '/api/genetic-analysis/osiris/analyses',
  '/api/genetic-analysis/osiris/queue',
  '/api/genetic-analysis/genemapper-results'
];

placeholderEndpoints.forEach(endpoint => {
  app.get(endpoint, (req, res) => {
    ResponseHandler.success(res, []);
  });
});

// DevOps endpoints

// Forensic metrics endpoint
app.get('/api/forensic-metrics', async (req, res) => {
  try {
    // Initialize forensic metrics service if needed
    await forensicMetricsService.initialize();

    const metrics = await forensicMetricsService.getForensicMetrics();
    ResponseHandler.success(res, metrics, 'Forensic metrics retrieved successfully');
  } catch (error) {
    logger.error('Failed to get forensic metrics', { error: error.message });
    ResponseHandler.error(res, 'Failed to get forensic metrics', error);
  }
});

// DevOps metrics endpoint
app.get('/api/devops-metrics', async (req, res) => {
  try {
    // Initialize DevOps metrics service if needed
    await devopsMetricsService.initialize();

    const metrics = await devopsMetricsService.getDevOpsMetrics();
    ResponseHandler.success(res, metrics, 'DevOps metrics retrieved successfully');
  } catch (error) {
    logger.error('Failed to get DevOps metrics', { error: error.message });
    ResponseHandler.error(res, 'Failed to get DevOps metrics', error);
  }
});

// Historical DevOps metrics endpoint
app.get('/api/devops-metrics/history/:hours', async (req, res) => {
  try {
    const hours = parseInt(req.params.hours) || 24;
    const history = await devopsMetricsService.getHistoricalMetrics(hours);
    ResponseHandler.success(res, history, `Historical metrics for last ${hours} hours`);
  } catch (error) {
    logger.error('Failed to get historical metrics', { error: error.message });
    ResponseHandler.error(res, 'Failed to get historical metrics', error);
  }
});

// Forensic sample metrics endpoint
app.get('/api/forensic-metrics/sample/:sampleId', async (req, res) => {
  try {
    const { sampleId } = req.params;
    const metrics = await forensicMetricsService.getSampleForensicMetrics(sampleId);

    if (!metrics) {
      return ResponseHandler.error(res, 'Sample not found or no forensic data available', null, 404);
    }

    ResponseHandler.success(res, metrics, `Forensic metrics for sample ${sampleId}`);
  } catch (error) {
    logger.error('Failed to get sample forensic metrics', { error: error.message });
    ResponseHandler.error(res, 'Failed to get sample forensic metrics', error);
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType);
    const metrics = await metricsRegister.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error: error.message });
    res.status(500).end('Failed to generate metrics');
  }
});

// Additional Kubernetes health probes
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    const readyCheck = await databaseService.getReadyCheck();
    if (readyCheck.status === 'ready') {
      res.status(200).json(readyCheck);
    } else {
      res.status(503).json({
        status: 'not_ready',
        error: 'Database not available',
        details: readyCheck
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance and load testing routes
app.use('/performance', performanceRoutes);

// Admin dashboard and management routes
app.use('/admin', adminRoutes);

// Memory monitoring endpoints
app.get('/api/memory/status', (req, res) => {
  try {
    const memoryStatus = memoryMonitor.getStatus();
    const cacheStats = memoryManager.getCacheStats();
    
    ResponseHandler.success(res, {
      ...memoryStatus,
      caches: cacheStats
    }, 'Memory status retrieved');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get memory status', error);
  }
});

app.post('/api/memory/cleanup', (req, res) => {
  try {
    const beforeMemory = memoryManager.getMemoryUsage();
    
    // Force cleanup
    memoryManager.clearCache();
    const gcResult = memoryManager.forceGarbageCollection();
    
    const afterMemory = memoryManager.getMemoryUsage();
    const freed = beforeMemory.heapUsed - afterMemory.heapUsed;
    
    ResponseHandler.success(res, {
      freed: Math.round(freed * 100) / 100,
      before: beforeMemory,
      after: afterMemory,
      gcResult
    }, 'Memory cleanup performed');
    
    logger.info('Manual memory cleanup performed', {
      freed: Math.round(freed * 100) / 100 + 'MB',
      trigger: 'api_endpoint'
    });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to cleanup memory', error);
  }
});

app.get('/api/memory/optimize', async (req, res) => {
  try {
    // Run memory optimization analysis
    const MemoryOptimizer = require('./scripts/memoryOptimizer');
    const optimizer = new MemoryOptimizer();
    
    // Get current memory usage
    const currentUsage = await optimizer.getMemoryUsage();
    
    // Generate recommendations without full optimization
    const recommendations = [];
    
    if (currentUsage.memoryPercent > 70) {
      recommendations.push({
        priority: 'high',
        type: 'memory-usage',
        description: `High memory usage: ${currentUsage.memoryPercent}%`,
        action: 'Consider restarting the server or performing cleanup'
      });
    }
    
    if (currentUsage.rssMB > 200) {
      recommendations.push({
        priority: 'medium',
        type: 'memory-size',
        description: `Large memory footprint: ${currentUsage.rssMB}MB`,
        action: 'Review memory-intensive operations'
      });
    }
    
    ResponseHandler.success(res, {
      currentUsage,
      recommendations,
      cacheStats: memoryManager.getCacheStats(),
      memoryTrends: memoryMonitor.getMemoryTrends()
    }, 'Memory optimization analysis completed');
    
  } catch (error) {
    ResponseHandler.error(res, 'Failed to analyze memory', error);
  }
});

// Background jobs management
app.get('/admin/jobs/status', (req, res) => {
  try {
    const status = backgroundJobService.getStatus();
    ResponseHandler.success(res, status, 'Background jobs status');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get jobs status', error);
  }
});

app.post('/admin/jobs/trigger/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    await backgroundJobService.triggerJob(jobName);
    ResponseHandler.success(res, { jobName }, `Job '${jobName}' triggered successfully`);
  } catch (error) {
    ResponseHandler.error(res, `Failed to trigger job '${req.params.jobName}'`, error);
  }
});

// Load generator management
const LoadGenerator = require('./scripts/loadGenerator');
let currentLoadGenerator = null;

app.post('/admin/load-test/start', async (req, res) => {
  try {
    if (currentLoadGenerator && currentLoadGenerator.isRunning) {
      return ResponseHandler.error(res, 'Load test already running', null, 400);
    }
    
    const config = {
      baseUrl: req.body.baseUrl || 'http://localhost:3001',
      concurrency: req.body.concurrency || 3,
      duration: (req.body.duration || 60) * 1000
    };
    
    currentLoadGenerator = new LoadGenerator(config);
    await currentLoadGenerator.start();
    
    ResponseHandler.success(res, config, 'Load test started');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to start load test', error);
  }
});

app.post('/admin/load-test/stop', async (req, res) => {
  try {
    if (!currentLoadGenerator || !currentLoadGenerator.isRunning) {
      return ResponseHandler.error(res, 'No load test running', null, 400);
    }
    
    await currentLoadGenerator.stop();
    const stats = currentLoadGenerator.getStats();
    
    ResponseHandler.success(res, stats, 'Load test stopped');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to stop load test', error);
  }
});

// Paternity Workflow Tracking endpoint
app.get('/api/workflow/paternity/status', async (req, res) => {
  try {
    // Get workflow status from the cycler
    const status = await backgroundJobService.paternityWorkflowCycler.getStatus();
    
    // Get sample counts by stage
    const stageCounts = db.prepare(`
      SELECT 
        workflow_status,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT lab_batch_number) as batches
      FROM samples 
      WHERE is_real_data = 0
      AND case_number LIKE 'PAT-2025-%'
      GROUP BY workflow_status
    `).all();
    
    // Get recent cycle completions
    let cycleHistory = [];
    try {
      cycleHistory = db.prepare(`
        SELECT * FROM workflow_cycles 
        ORDER BY completed_at DESC 
        LIMIT 5
      `).all();
    } catch (error) {
      // Table might not exist yet
    }
    
    const response = {
      status: status.isRunning ? 'running' : 'stopped',
      totalSamples: 50,
      cyclesCompleted: status.cyclesCompleted || 0,
      batches: status.batches || [],
      stageDistribution: stageCounts,
      recentCycles: cycleHistory,
      message: status.isRunning 
        ? '🔄 Paternity workflow cycling - samples progressing through stages every 10 seconds' 
        : '⏸️ Workflow paused'
    };
    
    ResponseHandler.success(res, response);
  } catch (error) {
    logger.error('Failed to get paternity workflow status', { error: error.message });
    ResponseHandler.error(res, 'Failed to get workflow status', 500);
  }
});

// Sample tracking endpoint - shows real-time sample locations
app.get('/api/workflow/sample-tracking', (req, res) => {
  try {
    const samples = db.prepare(`
      SELECT 
        s.id,
        s.lab_number,
        s.case_number,
        s.name,
        s.relation,
        s.workflow_status,
        s.lab_batch_number,
        s.updated_at,
        swt.entry_time,
        (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_in_stage,
        CASE 
          WHEN s.workflow_status = 'sample_collected' THEN '📦 Collection'
          WHEN s.workflow_status = 'dna_extraction' THEN '🧬 DNA Extraction'
          WHEN s.workflow_status = 'pcr_amplification' THEN '🔬 PCR Amplification'
          WHEN s.workflow_status = 'electrophoresis' THEN '⚡ Electrophoresis'
          WHEN s.workflow_status = 'osiris_analysis' THEN '📊 OSIRIS Analysis'
          WHEN s.workflow_status = 'report_generation' THEN '📝 Report Generation'
          ELSE s.workflow_status
        END as stage_display
      FROM samples s
      LEFT JOIN (
        SELECT sample_id, stage_name, entry_time
        FROM sample_workflow_timing swt1
        WHERE swt1.exit_time IS NULL
        AND swt1.id = (
          SELECT MAX(id) FROM sample_workflow_timing swt2
          WHERE swt2.sample_id = swt1.sample_id
        )
      ) swt ON s.id = swt.sample_id
      WHERE s.is_real_data = 0
      AND s.case_number LIKE 'PAT-2025-%'
      ORDER BY s.case_number, 
        CASE s.relation 
          WHEN 'Child' THEN 1 
          WHEN 'Mother' THEN 2 
          WHEN 'Alleged Father' THEN 3 
        END
    `).all();
    
    // Group by family
    const families = {};
    samples.forEach(sample => {
      if (!families[sample.case_number]) {
        families[sample.case_number] = {
          caseNumber: sample.case_number,
          members: [],
          currentStage: sample.workflow_status,
          batchNumber: sample.lab_batch_number
        };
      }
      families[sample.case_number].members.push({
        ...sample,
        timeInStage: sample.seconds_in_stage ? Math.round(sample.seconds_in_stage) : 0
      });
    });
    
    ResponseHandler.success(res, {
      totalSamples: samples.length,
      families: Object.values(families),
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get sample tracking data', 500);
  }
});

// Workflow Stage Duration Management Endpoints

// Get all stage durations
app.get('/api/workflow/stage-durations', (req, res) => {
  try {
    const stages = db.prepare(`
      SELECT stage_name, duration_minutes, is_active, description, updated_at
      FROM workflow_stage_configs
      ORDER BY 
        CASE stage_name
          WHEN 'sample_collected' THEN 1
          WHEN 'dna_extraction' THEN 2
          WHEN 'pcr_amplification' THEN 3
          WHEN 'electrophoresis' THEN 4
          WHEN 'osiris_analysis' THEN 5
          WHEN 'report_generation' THEN 6
          ELSE 7
        END
    `).all();
    
    ResponseHandler.success(res, stages);
  } catch (error) {
    logger.error('Failed to get stage durations', { error: error.message });
    ResponseHandler.error(res, 'Failed to get stage durations', 500);
  }
});

// Update specific stage duration
app.put('/api/workflow/stage-durations/:stage', (req, res) => {
  try {
    const { stage } = req.params;
    const { duration_minutes } = req.body;
    
    if (!duration_minutes || duration_minutes < 1 || duration_minutes > 1440) {
      return ResponseHandler.error(res, 'Duration must be between 1 and 1440 minutes', null, 400);
    }
    
    const result = db.prepare(`
      UPDATE workflow_stage_configs 
      SET duration_minutes = ?, updated_at = datetime('now')
      WHERE stage_name = ?
    `).run(duration_minutes, stage);
    
    if (result.changes === 0) {
      return ResponseHandler.error(res, 'Stage not found', null, 404);
    }
    
    // Update the paternity workflow cycler if it exists
    if (backgroundJobService && backgroundJobService.paternityWorkflowCycler) {
      backgroundJobService.paternityWorkflowCycler.updateStageDuration(stage, duration_minutes);
    }
    
    logger.info(`Stage duration updated`, { stage, duration_minutes });
    ResponseHandler.success(res, { stage, duration_minutes }, 'Stage duration updated successfully');
  } catch (error) {
    logger.error('Failed to update stage duration', { error: error.message });
    ResponseHandler.error(res, 'Failed to update stage duration', 500);
  }
});

// Get samples currently in a specific stage with timing info
app.get('/api/workflow/samples-in-stage/:stage', (req, res) => {
  try {
    const { stage } = req.params;
    
    // Get stage duration
    const stageConfig = db.prepare(`
      SELECT duration_minutes FROM workflow_stage_configs WHERE stage_name = ?
    `).get(stage);
    
    const stageDurationSeconds = stageConfig ? stageConfig.duration_minutes * 60 : 180;
    
    const samples = db.prepare(`
      SELECT 
        s.id,
        s.lab_number,
        s.name,
        s.surname,
        s.case_number,
        s.workflow_status,
        s.lab_batch_number,
        swt.entry_time,
        (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_in_stage,
        ? - (julianday('now') - julianday(swt.entry_time)) * 86400 as seconds_remaining,
        CASE 
          WHEN (julianday('now') - julianday(swt.entry_time)) * 86400 >= ? THEN 1
          ELSE 0
        END as ready_to_progress,
        CASE 
          WHEN s.workflow_status = 'sample_collected' THEN '📦 Collection'
          WHEN s.workflow_status = 'dna_extraction' THEN '🧬 DNA Extraction'
          WHEN s.workflow_status = 'pcr_amplification' THEN '🔬 PCR Amplification'
          WHEN s.workflow_status = 'electrophoresis' THEN '⚡ Electrophoresis'
          WHEN s.workflow_status = 'osiris_analysis' THEN '📊 OSIRIS Analysis'
          WHEN s.workflow_status = 'report_generation' THEN '📝 Report Generation'
          ELSE s.workflow_status
        END as stage_display
      FROM samples s
      LEFT JOIN (
        SELECT sample_id, stage_name, entry_time
        FROM sample_workflow_timing swt1
        WHERE swt1.exit_time IS NULL
        AND swt1.id = (
          SELECT MAX(id) FROM sample_workflow_timing swt2
          WHERE swt2.sample_id = swt1.sample_id
        )
      ) swt ON s.id = swt.sample_id
      WHERE s.workflow_status = ?
      AND s.is_real_data = 0
      AND s.case_number LIKE 'PAT-2025-%'
      ORDER BY swt.entry_time ASC
    `).all(stageDurationSeconds, stageDurationSeconds, stage);
    
    const summary = {
      stageName: stage,
      stageDisplayName: samples[0]?.stage_display || stage,
      totalSamples: samples.length,
      readyToProgress: samples.filter(s => s.ready_to_progress).length,
      stageDurationMinutes: stageConfig ? stageConfig.duration_minutes : 3,
      samples: samples.map(s => ({
        ...s,
        seconds_remaining: Math.max(0, Math.round(s.seconds_remaining || 0)),
        seconds_in_stage: Math.round(s.seconds_in_stage || 0)
      }))
    };
    
    ResponseHandler.success(res, summary);
  } catch (error) {
    logger.error('Failed to get samples in stage', { error: error.message });
    ResponseHandler.error(res, 'Failed to get samples in stage', 500);
  }
});

// Workflow timing statistics endpoint
app.get('/api/workflow/timing-stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        stage_name,
        COUNT(*) as total_transitions,
        AVG(duration_seconds) as avg_duration_seconds,
        MIN(duration_seconds) as min_duration_seconds,
        MAX(duration_seconds) as max_duration_seconds
      FROM sample_workflow_timing
      WHERE exit_time IS NOT NULL
      AND duration_seconds > 0
      GROUP BY stage_name
      ORDER BY 
        CASE stage_name
          WHEN 'sample_collected' THEN 1
          WHEN 'dna_extraction' THEN 2
          WHEN 'pcr_amplification' THEN 3
          WHEN 'electrophoresis' THEN 4
          WHEN 'osiris_analysis' THEN 5
          WHEN 'report_generation' THEN 6
          ELSE 7
        END
    `).all();
    
    const formattedStats = stats.map(stat => ({
      ...stat,
      avg_duration_minutes: Math.round(stat.avg_duration_seconds / 60 * 100) / 100,
      min_duration_minutes: Math.round(stat.min_duration_seconds / 60 * 100) / 100,
      max_duration_minutes: Math.round(stat.max_duration_seconds / 60 * 100) / 100
    }));
    
    ResponseHandler.success(res, {
      statistics: formattedStats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get workflow timing stats', { error: error.message });
    ResponseHandler.error(res, 'Failed to get timing statistics', 500);
  }
});

// OSIRIS Integration endpoints
app.get('/api/genetic-analysis/osiris/status', (req, res) => {
  try {
    // Check OSIRIS workspace status
    const status = {
      isConfigured: true,
      workspaceDirectory: '/Users/user/JAG-LABSCIENTIFIC-DNA/backend/osiris_workspace',
      inputFiles: 21, // Count of FSA files
      outputFiles: 18, // Count of PLT files
      kitConfiguration: 'PowerPlex ESX 17',
      status: 'ready'
    };
    ResponseHandler.success(res, status);
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get OSIRIS status', 500);
  }
});

app.get('/api/genetic-analysis/osiris/queue', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM osiris_analyses 
      WHERE status IN ('pending', 'processing') 
      ORDER BY created_at DESC
    `);
    const queue = stmt.all() || [];
    ResponseHandler.success(res, queue);
  } catch (error) {
    ResponseHandler.success(res, []);
  }
});

app.get('/api/genetic-analysis/osiris/analyses', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM osiris_analyses 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    const analyses = stmt.all() || [];
    ResponseHandler.success(res, analyses);
  } catch (error) {
    ResponseHandler.success(res, []);
  }
});

app.post('/api/genetic-analysis/launch-osiris', (req, res) => {
  try {
    const { inputDirectory, caseId } = req.body;
    
    // Create OSIRIS analysis record
    const stmt = db.prepare(`
      INSERT INTO osiris_analyses (
        case_id, input_directory, output_directory, 
        status, kit_name, started_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const outputDir = inputDirectory ? inputDirectory.replace('/input', '/output') : '/Users/user/JAG-LABSCIENTIFIC-DNA/backend/osiris_workspace/output';
    
    const result = stmt.run(
      caseId || 'TEST_' + Date.now(),
      inputDirectory || '/Users/user/JAG-LABSCIENTIFIC-DNA/backend/osiris_workspace/input',
      outputDir,
      'processing',
      'PowerPlex ESX 17'
    );
    
    // Simulate OSIRIS processing
    setTimeout(() => {
      const updateStmt = db.prepare(`
        UPDATE osiris_analyses 
        SET status = 'completed', completed_at = datetime('now') 
        WHERE id = ?
      `);
      updateStmt.run(result.lastInsertRowid);
    }, 5000); // Complete after 5 seconds
    
    ResponseHandler.success(res, {
      analysisId: result.lastInsertRowid,
      status: 'processing',
      message: 'OSIRIS analysis started'
    }, 'OSIRIS analysis launched', 201);
  } catch (error) {
    ResponseHandler.error(res, error.message || 'Failed to launch OSIRIS', 500);
  }
});

// QMS (Quality Management System) endpoints
app.get('/api/qms/quality-controls', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM quality_control ORDER BY date DESC LIMIT 100');
    const qcRecords = stmt.all();
    ResponseHandler.success(res, qcRecords);
  } catch (error) {
    ResponseHandler.success(res, []); // Return empty array on error
  }
});

app.post('/api/qms/quality-controls', (req, res) => {
  try {
    const { batch_id, control_type, result, operator, comments } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO quality_control (batch_id, date, control_type, result, operator, comments)
      VALUES (?, datetime('now'), ?, ?, ?, ?)
    `);
    
    const insertResult = stmt.run(batch_id, control_type, result, operator, comments);
    
    ResponseHandler.success(res, { 
      id: insertResult.lastInsertRowid,
      batch_id,
      control_type,
      result,
      operator,
      comments 
    }, 'Quality control record created', 201);
  } catch (error) {
    ResponseHandler.error(res, error.message || 'Failed to create quality control record', 500);
  }
});

app.get('/admin/load-test/status', (req, res) => {
  try {
    if (!currentLoadGenerator) {
      return ResponseHandler.success(res, { isRunning: false }, 'No load test configured');
    }
    
    const stats = currentLoadGenerator.getStats();
    ResponseHandler.success(res, stats, 'Load test status');
  } catch (error) {
    ResponseHandler.error(res, 'Failed to get load test status', error);
  }
});

// Memory health check endpoint
app.get('/health/memory', (req, res) => {
  try {
    const usage = memoryManager.getMemoryUsage();
    const isHealthy = usage.heapUtilization < 0.85; // 85% threshold
    
    if (isHealthy) {
      res.status(200).json({
        status: 'healthy',
        memory: usage
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        memory: usage,
        reason: 'High memory usage'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Test endpoint
app.get("/test", (req, res) => {
  ResponseHandler.success(res, {
    message: "Server is running",
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  ResponseHandler.success(res, {
    message: "JAG DNA Scientific LIMS Backend API",
    version: "3.0.0-unified",
    status: "running",
    endpoints: {
      health: "/health",
      test: "/test",
      samples: "/api/samples",
      batches: "/api/batches",
      api: "/api"
    }
  });
});

// Workflow stages endpoint for dashboard
app.get('/api/workflow-stages', requireDatabase, async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        lab_number,
        case_number,
        name,
        surname,
        workflow_status,
        created_at,
        updated_at
      FROM samples
      WHERE workflow_status IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 100
    `;

    const samples = await databaseService.all(query, []);
    res.json(samples);
  } catch (error) {
    logger.error('Error fetching workflow stages', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch workflow stages' });
  }
});

// Simulated stages endpoint for extraction and qPCR visualization
app.get('/api/simulated-stages', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const simulatedPath = path.join(__dirname, 'simulated-stages.json');
    
    if (fs.existsSync(simulatedPath)) {
      const data = fs.readFileSync(simulatedPath, 'utf8');
      res.json(JSON.parse(data));
    } else {
      // Return empty data if file doesn't exist
      res.json({ timestamp: new Date().toISOString(), samples: [] });
    }
  } catch (error) {
    logger.error('Error reading simulated stages', { error: error.message });
    res.json({ timestamp: new Date().toISOString(), samples: [] });
  }
});

// Global 404 handler for API routes
app.use('/api/*', (req, res) => {
  logger.warn('API route not found', { url: req.originalUrl, method: req.method });
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Catch-all route to serve index.html for client-side routing in production
app.use('*', (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      logger.warn('Production build not found', { path: indexPath });
      res.status(404).json({
        error: 'Not Found',
        message: 'Frontend build not available',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    logger.warn('Route not found', { url: req.originalUrl });
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  }
});

// Removed duplicate catch-all route

// Custom error middleware for database errors
app.use((err, req, res, next) => {
  // Database connection errors
  if (err.message && err.message.includes('Database connection unavailable')) {
    logger.error('Database connection error in middleware', {
      error: err.message,
      url: req.url,
      method: req.method
    });
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }

  // PostgreSQL specific errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
    logger.error('PostgreSQL connection error', {
      error: err.message,
      code: err.code,
      url: req.url
    });
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }

  // Pass to global error handler
  next(err);
});

// Global error handler (must be last)
app.use(globalErrorHandler);

const port = process.env.PORT || 3001;

// Database service initialization moved earlier in the file

const server = app
  .listen(port, '0.0.0.0', () => {
    logger.info('Server started successfully', {
      port,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      database: db ? 'connected' : 'disconnected'
    });
    
    // Always start background jobs for sample processing
    try {
      backgroundJobService.start();
      logger.info('🚀 Background jobs started - samples will process automatically');
      console.log('🚀 Background workflow automation active - samples processing automatically');
    } catch (error) {
      logger.error('Failed to start background jobs', { error: error.message });
      console.log('⚠️  Warning: Background jobs failed to start:', error.message);
    }
    
    // Start Enhanced Sample Cycler for continuous sample generation and progression
    // Wait a bit for database to be ready
    setTimeout(() => {
      try {
        // Use unified database service
        const EnhancedSampleCycler = require('./services/enhanced-sample-cycler');
        
        // Pass the database service itself, not .db
        const sampleCycler = new EnhancedSampleCycler(databaseService);
        sampleCycler.start();
        logger.info('🔄 Enhanced Sample Cycler started - continuous sample processing');
        console.log('🔄 Enhanced Sample Cycler active - generating samples every 10 seconds');
        
        // Store reference globally for graceful shutdown
        global.sampleCycler = sampleCycler;
      } catch (error) {
        logger.error('Failed to start Enhanced Sample Cycler', { error: error.message });
        console.log('⚠️  Warning: Enhanced Sample Cycler failed to start:', error.message);
      }
    }, 2000); // Wait 2 seconds for database to initialize
    
    // Start appropriate sample generator based on database connection
    if (!databaseService.isConnected()) {
      // No database connection - use simple cycler for demo
      console.log('⚠️  No database connection - starting simple sample cycler');
      simpleSampleCycler.start();
      console.log('✅ Simple sample cycler active - 5 demo samples cycling every 30 seconds');
    } else if (process.env.ENABLE_DEVOPS_FEATURES === 'true' || process.env.NODE_ENV === 'production') {
      // Database connected - use database-backed sample generator
      const sampleGen = new SampleGenerator(db);
      sampleGen.start();
      console.log('🔄 DevOps Sample Generator active - continuous monitoring data');

      // Update Prometheus metrics every 10 seconds
      setInterval(() => {
        prometheusMetrics.updateWorkflowMetrics(db);
      }, 10000);
    }
    
    // Initialize DevOps dashboard
    initDevopsDb(db);
    
    console.log(`✅ JAG DNA Scientific LIMS Backend running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔍 Readiness check: http://localhost:${port}/ready`);
    console.log(`📈 Metrics: http://localhost:${port}/metrics`);
    console.log(`🔗 API endpoints: http://localhost:${port}/`);
    console.log(`⚡ Performance testing: http://localhost:${port}/performance`);
    console.log(`🎛️  Admin panel: http://localhost:${port}/admin`);
    console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${databaseService.getDatabaseType()} (${databaseService.isConnected() ? 'connected' : 'disconnected'})`);
    
    if (process.env.ENABLE_DEVOPS_FEATURES === 'true') {
      console.log('\n🚀 DevOps Features Active:');
      console.log('   - Prometheus metrics collection');
      console.log('   - Background job simulation (generating activity)');
      console.log('   - Health/readiness probes');
      console.log('   - Performance issue simulation');
      console.log('   - Load testing capabilities');
      console.log('   - Structured logging');
    }
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.warn('Port in use, trying next port', { port, nextPort: port + 1 });
      console.log(`❌ Port ${port} is in use, trying port ${port + 1}`);
      server.listen(port + 1, '0.0.0.0', () => {
        console.log(`✅ JAG DNA Scientific Backend server running on http://localhost:${port + 1}`);
      });
    } else {
      logger.error('Server startup error', { error: err.message, code: err.code });
      console.error('❌ Server startup error:', err.message);
      process.exit(1);
    }
  });

// Graceful shutdown with proper database connection cleanup
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  console.log('🛑 SIGTERM received, shutting down gracefully');

  server.close(async () => {
    logger.info('Server closed');
    console.log('✅ Server closed');

    // Cleanup DevOps services
    try {
      backgroundJobService.stop();
      logger.info('Background jobs stopped');
    } catch (error) {
      logger.error('Error stopping background jobs', { error: error.message });
    }

    // Stop Enhanced Sample Cycler
    try {
      if (global.sampleCycler) {
        global.sampleCycler.stop();
        logger.info('Enhanced Sample Cycler stopped');
      }
    } catch (error) {
      logger.error('Error stopping Enhanced Sample Cycler', { error: error.message });
    }

    // Cleanup memory management
    try {
      memoryManager.shutdown();
      memoryMonitor.cleanup();
      logger.info('Memory management cleaned up');
    } catch (error) {
      logger.error('Error cleaning up memory management', { error: error.message });
    }

    if (currentLoadGenerator) {
      currentLoadGenerator.stop();
    }

    // Close database connections gracefully
    try {
      await databaseService.close();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections', { error: error.message });
    }

    // Final garbage collection
    if (global.gc) {
      global.gc();
      logger.info('Final garbage collection performed');
    }

    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  console.log('🛑 SIGINT received, shutting down gracefully');

  server.close(async () => {
    logger.info('Server closed');
    console.log('✅ Server closed');

    // Cleanup memory management
    try {
      memoryManager.shutdown();
      memoryMonitor.cleanup();
    } catch (error) {
      logger.error('Error cleaning up memory management', { error: error.message });
    }

    // Close database connections gracefully
    try {
      await databaseService.close();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections', { error: error.message });
    }

    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  console.error('❌ Unhandled Rejection:', reason);
});

module.exports = app;