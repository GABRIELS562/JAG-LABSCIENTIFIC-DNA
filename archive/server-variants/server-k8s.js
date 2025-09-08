const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const fs = require('fs');

// Import middleware and utilities
const { globalErrorHandler } = require("./middleware/errorHandler");
const { sanitizeInput } = require("./middleware/validation");
const { requestLogger, logger } = require("./utils/logger");
const { ResponseHandler } = require("./utils/responseHandler");
const { memoryManager } = require("./utils/memoryManager");
const streamingResponse = require("./utils/streamingResponse");

// Import DevOps middleware and services
const { register: metricsRegister, metricsMiddleware, trackDatabaseQuery, trackSampleProcessed, trackBatchCreated } = require('./middleware/metrics');
const { healthCheckService } = require('./middleware/healthcheck');
const { backgroundJobService } = require('./services/backgroundJobs');
const performanceRoutes = require('./routes/performance');

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

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(requestLogger);
app.use(sanitizeInput);

// Metrics middleware
app.use(metricsMiddleware);

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: 'kubernetes',
    database: 'in-memory'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: 'kubernetes',
    database: 'in-memory'
  });
});

// API Routes
app.use("/api", apiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/db-viewer", dbViewerRoutes);
app.use("/api/genetic-analysis", geneticAnalysisRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/qms", qmsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/ai-ml", aiMlRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/paternity", paternityRoutes);
app.use("/api/str-matching", strMatchingRoutes);
app.use("/api/forensic-reports", forensicReportsRoutes);
app.use("/api/case-management", caseManagementRoutes);
app.use("/api/performance", performanceRoutes);

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', metricsRegister.contentType);
  res.end(metricsRegister.metrics());
});

// Serve static files from dist directory (built frontend)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Fallback to index.html for client-side routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
  console.log('✅ Serving frontend from:', distPath);
} else {
  console.log('⚠️ Frontend dist directory not found at:', distPath);
}

// Global error handler
app.use(globalErrorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ JAG DNA Scientific LIMS (K8s) running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend: ${fs.existsSync(distPath) ? 'Available' : 'Not found'}`);
  
  // Start background services
  if (backgroundJobService) {
    backgroundJobService.start();
    console.log('🔄 Background jobs started');
  }
  
  // Initialize health check service
  if (healthCheckService) {
    healthCheckService.start();
    console.log('💓 Health monitoring started');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (backgroundJobService) backgroundJobService.stop();
  if (healthCheckService) healthCheckService.stop();
  process.exit(0);
});