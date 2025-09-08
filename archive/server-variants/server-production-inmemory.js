// Production server with in-memory database for DNA LIMS
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require('fs');

const app = express();

// Configure CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for frontend
const distPath = path.join(__dirname, '../dist');
console.log('Serving frontend from:', distPath);

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('✅ Frontend files available');
} else {
  console.log('❌ Frontend dist directory not found');
}

// In-memory data store
let samples = [];
let batches = [];
let testCases = [];

// Initialize sample data
const sampleData = [
  {
    id: 1,
    lab_number: "25_001",
    name: "Alice",
    surname: "Johnson",
    relation: "Child",
    status: "active",
    workflow_status: "sample_collected",
    case_number: "PAT-2025-001",
    collection_date: "2025-01-15",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    lab_number: "25_002",
    name: "Bob",
    surname: "Johnson",
    relation: "Alleged Father",
    status: "active",
    workflow_status: "dna_extraction",
    case_number: "PAT-2025-001",
    collection_date: "2025-01-15",
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    lab_number: "25_003",
    name: "Carol",
    surname: "Johnson",
    relation: "Mother",
    status: "active",
    workflow_status: "pcr_amplification",
    case_number: "PAT-2025-001",
    collection_date: "2025-01-15",
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    lab_number: "25_004",
    name: "David",
    surname: "Smith",
    relation: "Child",
    status: "active",
    workflow_status: "analysis_completed",
    case_number: "PAT-2025-002",
    collection_date: "2025-01-16",
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    lab_number: "25_005",
    name: "Eva",
    surname: "Smith",
    relation: "Mother",
    status: "active",
    workflow_status: "report_generation",
    case_number: "PAT-2025-002",
    collection_date: "2025-01-16",
    created_at: new Date().toISOString()
  }
];

// Initialize data
samples = [...sampleData];
testCases = [
  {
    id: 1,
    case_number: "PAT-2025-001",
    ref_kit_number: "KIT_001",
    client_type: "private",
    test_purpose: "paternity",
    sample_type: "buccal_swab",
    submission_date: "2025-01-15",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    case_number: "PAT-2025-002", 
    ref_kit_number: "KIT_002",
    client_type: "legal",
    test_purpose: "paternity",
    sample_type: "blood",
    submission_date: "2025-01-16",
    created_at: new Date().toISOString()
  }
];

// Helper functions
function getSampleCounts() {
  const total = samples.length;
  const active = samples.filter(s => s.status === 'active').length;
  const pending = samples.filter(s => s.workflow_status === 'sample_collected').length;
  const completed = samples.filter(s => s.workflow_status === 'analysis_completed').length;
  const processing = samples.filter(s => ['dna_extraction', 'pcr_amplification', 'electrophoresis'].includes(s.workflow_status)).length;
  
  return {
    total,
    active,
    pending,
    pcrBatched: samples.filter(s => s.workflow_status === 'pcr_amplification').length,
    electroBatched: samples.filter(s => s.workflow_status === 'electrophoresis').length,
    rerunBatched: 0,
    completed,
    processing
  };
}

function getSamplesWithPagination(page = 1, limit = 50, filters = {}) {
  let filteredSamples = [...samples];
  
  if (filters.status && filters.status !== 'all') {
    filteredSamples = filteredSamples.filter(s => s.status === filters.status);
  }
  
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredSamples = filteredSamples.filter(s => 
      s.lab_number.toLowerCase().includes(searchTerm) ||
      s.name.toLowerCase().includes(searchTerm) ||
      s.surname.toLowerCase().includes(searchTerm)
    );
  }
  
  const total = filteredSamples.length;
  const offset = (page - 1) * limit;
  const paginatedSamples = filteredSamples.slice(offset, offset + limit);
  
  return {
    data: paginatedSamples,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// Core API endpoints
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend server is running (in-memory mode)",
    timestamp: new Date().toISOString(),
    database: "in-memory"
  });
});

app.get("/api/samples", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const filters = {
      status: req.query.status,
      search: req.query.search
    };
    
    const result = getSamplesWithPagination(page, limit, filters);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch samples',
      message: error.message
    });
  }
});

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

app.post("/api/samples", (req, res) => {
  try {
    const newSample = {
      id: samples.length + 1,
      lab_number: req.body.lab_number || `25_${String(samples.length + 1).padStart(3, '0')}`,
      name: req.body.name,
      surname: req.body.surname,
      relation: req.body.relation || 'Child',
      status: req.body.status || 'active',
      workflow_status: req.body.workflow_status || 'sample_collected',
      case_number: req.body.case_number,
      collection_date: req.body.collection_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    
    samples.push(newSample);
    
    res.status(201).json({
      success: true,
      data: newSample,
      message: 'Sample created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create sample',
      message: error.message
    });
  }
});

app.get("/api/test-cases", (req, res) => {
  res.json({
    success: true,
    data: testCases
  });
});

app.post("/api/test-cases", (req, res) => {
  try {
    const newTestCase = {
      id: testCases.length + 1,
      case_number: req.body.case_number || `CASE_${new Date().getFullYear()}_${String(testCases.length + 1).padStart(3, '0')}`,
      ref_kit_number: req.body.ref_kit_number || `KIT_${testCases.length + 1}`,
      client_type: req.body.client_type || 'private',
      test_purpose: req.body.test_purpose || 'paternity',
      sample_type: req.body.sample_type || 'buccal_swab',
      submission_date: req.body.submission_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    
    testCases.push(newTestCase);
    
    res.status(201).json({
      success: true,
      data: newTestCase,
      message: 'Test case created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create test case',
      message: error.message
    });
  }
});

// Health endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'in-memory',
    samples: samples.length
  });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const counts = getSampleCounts();
  const metrics = `
# HELP samples_total Total number of samples
# TYPE samples_total counter
samples_total ${counts.total}

# HELP samples_active Active samples
# TYPE samples_active gauge
samples_active ${counts.active}

# HELP samples_completed Completed samples  
# TYPE samples_completed counter
samples_completed ${counts.completed}
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      message: 'Frontend not found',
      error: 'Frontend build files are missing'
    });
  }
});

const port = process.env.PORT || 3001;

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ JAG DNA Scientific LIMS (In-Memory) running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📁 Loaded ${samples.length} sample records`);
  console.log(`🌐 Frontend: ${fs.existsSync(distPath) ? 'Available' : 'Missing'}`);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;