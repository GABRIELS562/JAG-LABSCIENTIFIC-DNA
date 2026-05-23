/**
 * Main API Router
 * Aggregates sample routes and other core API endpoints
 */

const express = require('express');
const router = express.Router();
const samplesRouter = require('./samples');

// Mount samples routes
router.use('/samples', samplesRouter);

// Batch management routes
router.get('/batches', async (req, res) => {
  const db = require('../services/database');
  try {
    if (!db.isConnected()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }
    const batches = await db.all('SELECT * FROM batches ORDER BY created_at DESC LIMIT 100', []);
    res.json({ success: true, data: batches || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/batches', async (req, res) => {
  const db = require('../services/database');
  try {
    if (!db.isConnected()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }
    const { type, sample_ids } = req.body;
    const batch = await db.get(
      `INSERT INTO batches (type, sample_ids, status, created_at)
       VALUES ($1, $2, 'pending', NOW()) RETURNING *`,
      [type, JSON.stringify(sample_ids)]
    );
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
