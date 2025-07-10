const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const fs = require('fs');

// Import new middleware and utilities
const { globalErrorHandler } = require("./middleware/errorHandler");
const { sanitizeInput } = require("./middleware/validation");
const { requestLogger, logger } = require("./utils/logger");
const { ResponseHandler } = require("./utils/responseHandler");
const { createMonitoringMiddleware, errorMonitoringMiddleware } = require("./middleware/requestMonitoring");
const { performanceMiddleware, performanceMonitor } = require("./middleware/performanceMonitoring");
const { cacheMiddleware, cacheService } = require("./services/cacheService");

// Import routes
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const dbViewerRoutes = require("./routes/database-viewer");
const geneticAnalysisRoutes = require("./routes/genetic-analysis");
const monitoringRoutes = require("./routes/monitoring");

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();

// Trust proxy for accurate client IP
app.set('trust proxy', 1);

// Configure middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add comprehensive monitoring middleware
const monitoringMiddlewares = createMonitoringMiddleware({
  enableRateLimit: process.env.NODE_ENV === 'production',
  enableSlowDown: process.env.NODE_ENV === 'production',
  enableCompression: true,
  enableSecurity: true,
  enableLogging: true
});

monitoringMiddlewares.forEach(middleware => app.use(middleware));

// Add performance monitoring
app.use(performanceMiddleware(performanceMonitor));

// Add input sanitization
app.use(sanitizeInput);

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api/db", dbViewerRoutes);
app.use("/api/genetic-analysis", geneticAnalysisRoutes);
app.use("/monitoring", monitoringRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  ResponseHandler.success(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  }, 'Server is healthy');
});

// Test endpoint
app.get("/test", (req, res) => {
  ResponseHandler.success(res, {
    message: "Server is running",
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Handle 404 errors
app.use('*', (req, res) => {
  ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
});

// Error monitoring middleware
app.use(errorMonitoringMiddleware);

// Global error handler (must be last)
app.use(globalErrorHandler);

const port = process.env.PORT || 3001;

const server = app
  .listen(port, () => {
    logger.info('Server started successfully', {
      port,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid
    });
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.warn('Port in use, trying next port', { port, nextPort: port + 1 });
      server.listen(port + 1);
    } else {
      logger.error('Server startup error', { error: err.message, code: err.code });
      process.exit(1);
    }
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    
    // Cleanup services
    if (performanceMonitor) {
      performanceMonitor.destroy();
    }
    
    if (cacheService) {
      cacheService.destroy();
    }
    
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});
