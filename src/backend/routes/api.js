const express = require("express");
const router = express.Router();
const { sheets } = require("../services/spreadsheets");

// Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working",
  });
});

// Submit test data
router.post("/submit-test", async (req, res) => {
  try {
    const { childRow, fatherRow } = req.body;
    // Your existing submission logic here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get last lab number
router.get("/get-last-lab-number", async (req, res) => {
  try {
    // Your existing lab number logic here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add these routes to your api.js
router.post("/generate-batch", async (req, res) => {
  try {
    // Your batch generation logic
    res.json({ success: true, data: req.body });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/save-batch", async (req, res) => {
  try {
    // Your batch saving logic
    res.json({ success: true, data: req.body });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
