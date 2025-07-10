const express = require("express");
const cors = require("cors");
const Database = require('better-sqlite3');
const path = require('path');

const app = express();

// Database connection
const dbPath = path.join(__dirname, 'database', 'ashley_lims.db');
const db = new Database(dbPath);
console.log('✅ Database connected successfully');

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Test server working" });
});

// Samples endpoint
app.get("/api/samples", (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM samples ORDER BY id DESC LIMIT 10');
    const samples = stmt.all();
    res.json({ success: true, data: samples });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sample counts
app.get("/api/samples/counts", (req, res) => {
  try {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM samples');
    const result = totalStmt.get();
    res.json({ success: true, data: { total: result.count } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const port = 3002;
app.listen(port, () => {
  console.log(`✅ Test server running on http://localhost:${port}`);
});