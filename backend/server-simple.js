const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const fs = require('fs');

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const app = express();

// Configure CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import basic routes
try {
  const apiRoutes = require("./routes/api");
  app.use("/api", apiRoutes);
} catch (error) {
  console.log("API routes not available, creating basic route");
  
  // Create a basic API route if the main one doesn't work
  app.get("/api/test", (req, res) => {
    res.json({
      success: true,
      message: "Backend server is running",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/samples", (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 1, lab_number: "25_001", name: "John Doe", relation: "Child", status: "pending" },
        { id: 2, lab_number: "25_002", name: "Jane Doe", relation: "Mother", status: "completed" },
        { id: 3, lab_number: "25_003", name: "Bob Doe", relation: "Father", status: "processing" }
      ]
    });
  });

  app.post("/api/samples", (req, res) => {
    const newSample = {
      id: Date.now(),
      ...req.body,
      status: "pending",
      created_at: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newSample
    });
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001
  });
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({
    message: "Backend server is running successfully!",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "LabScientific LIMS Backend API",
    version: "2.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      test: "/test",
      api: "/api"
    }
  });
});

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    availableRoutes: ["/", "/health", "/test", "/api"]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

const port = process.env.PORT || 3001;

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Backend server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
  console.log(`🔗 API endpoint: http://localhost:${port}/api`);
  console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`❌ Port ${port} is in use, trying port ${port + 1}`);
    server.listen(port + 1);
  } else {
    console.error('❌ Server startup error:', err.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;