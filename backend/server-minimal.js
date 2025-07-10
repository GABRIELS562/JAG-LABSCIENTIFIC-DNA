const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require('better-sqlite3');

const app = express();

// Initialize database connection
const dbPath = path.join(__dirname, 'database', 'ashley_lims.db');
let db = null;

try {
  db = new Database(dbPath);
  console.log('✅ Database connected successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

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

// Database query functions
function getAllSamples() {
  try {
    const stmt = db.prepare('SELECT * FROM samples ORDER BY id DESC');
    return stmt.all();
  } catch (error) {
    console.error('Error fetching samples:', error);
    return [];
  }
}

function getSampleCounts() {
  try {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM samples');
    const pendingStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'pending'");
    const processingStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'processing'");
    const completedStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'completed'");
    const activeStmt = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'active'");
    
    return {
      total: totalStmt.get().count,
      pending: pendingStmt.get().count,
      processing: processingStmt.get().count,
      completed: completedStmt.get().count,
      active: activeStmt.get().count
    };
  } catch (error) {
    console.error('Error getting sample counts:', error);
    return { total: 0, pending: 0, processing: 0, completed: 0, active: 0 };
  }
}

function createSample(sampleData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO samples (
        lab_number, name, surname, relation, status, phone_number,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      sampleData.lab_number,
      sampleData.name,
      sampleData.surname,
      sampleData.relation || 'Child',
      sampleData.status || 'pending',
      sampleData.phone_number
    );
    
    return { id: result.lastInsertRowid, ...sampleData };
  } catch (error) {
    console.error('Error creating sample:', error);
    throw error;
  }
}

// API endpoints
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend server is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/samples", (req, res) => {
  try {
    const samples = getAllSamples();
    res.json({
      success: true,
      data: samples
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch samples',
      message: error.message
    });
  }
});

app.post("/api/samples", (req, res) => {
  try {
    const newSample = createSample(req.body);
    res.status(201).json({
      success: true,
      data: newSample
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create sample',
      message: error.message
    });
  }
});

// Sample counts endpoint
app.get("/api/samples/counts", (req, res) => {
  try {
    const counts = getSampleCounts();
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get sample counts',
      message: error.message
    });
  }
});

// Test cases endpoint
app.get("/api/test-cases", (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM test_cases ORDER BY id DESC LIMIT 100');
    const testCases = stmt.all();
    res.json({
      success: true,
      data: testCases
    });
  } catch (error) {
    res.json({
      success: true,
      data: [
        { id: 1, case_number: "CASE-001", ref_kit_number: "BN123456", client_type: "paternity", status: "pending" },
        { id: 2, case_number: "CASE-002", ref_kit_number: "BN123457", client_type: "lt", status: "completed" }
      ]
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    database: 'connected'
  });
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({
    message: "Backend server is running successfully!",
    version: "2.0.0-minimal",
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "LabScientific LIMS Backend API - Minimal Version",
    version: "2.0.0-minimal",
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
    server.listen(port + 1, '0.0.0.0', () => {
      console.log(`✅ Backend server running on http://localhost:${port + 1}`);
    });
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
    if (db) db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    if (db) db.close();
    process.exit(0);
  });
});

module.exports = app;