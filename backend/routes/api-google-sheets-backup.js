const express = require("express");
const router = express.Router();
const { sheets, appendRows, SHEETS } = require("../services/spreadsheets");

// Test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working",
  });
});

// Submit test endpoint
router.post("/submit-test", async (req, res) => {
  try {
    const { childRow, fatherRow } = req.body;

    const childData = [
      childRow.labNo,
      childRow.name,
      childRow.surname,
      childRow.idDob,
      childRow.relation,
      childRow.collectionDate,
      childRow.submissionDate,
      childRow.motherPresent,
      childRow.emailContact,
      childRow.addressArea,
      childRow.phoneContact,
      "", // Kit BN
      "", // Lab Batch No
      "", // Report No
      "", // Report Sent
      childRow.comments,
    ];

    const fatherData = [
      fatherRow.labNo,
      fatherRow.name,
      fatherRow.surname,
      fatherRow.idDob,
      fatherRow.relation,
      fatherRow.collectionDate,
      fatherRow.submissionDate,
      fatherRow.motherPresent,
      fatherRow.emailContact,
      fatherRow.addressArea,
      fatherRow.phoneContact,
      "", // Kit BN
      "", // Lab Batch No
      "", // Report No
      "", // Report Sent
      fatherRow.comments,
    ];

    await appendRows("MAIN", SHEETS.MAIN_DATA.name, [childData, fatherData]);
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
