const express = require('express');
const router = express.Router();
const db = require('../services/database');

// Database viewer route - shows all tables in a web interface
router.get('/viewer', (req, res) => {
  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Ashley LIMS Database Viewer</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #1e4976; border-bottom: 2px solid #1e4976; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1e4976; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .nav { margin: 20px 0; }
            .nav a { margin-right: 20px; color: #1e4976; text-decoration: none; padding: 5px 10px; border: 1px solid #1e4976; border-radius: 4px; }
            .nav a:hover { background: #1e4976; color: white; }
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat-card { background: #e3f2fd; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #1e4976; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧬 Ashley LIMS Database Viewer</h1>
            
            <div class="nav">
                <a href="/api/db/viewer">Overview</a>
                <a href="/api/db/viewer/samples">Samples</a>
                <a href="/api/db/viewer/batches">Batches</a>
                <a href="/api/db/viewer/quality-control">Quality Control</a>
                <a href="/api/db/viewer/equipment">Equipment</a>
                <a href="/api/db/viewer/test-cases">Test Cases</a>
                <a href="/api/db/viewer/reports">Reports</a>
            </div>

            <h2>📊 Database Statistics</h2>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${db.getAllSamples().length}</div>
                    <div>Total Samples</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${db.getAllBatches().length}</div>
                    <div>Total Batches</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${db.getQualityControlRecords().length}</div>
                    <div>QC Records</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${db.getAllEquipment().length}</div>
                    <div>Equipment Items</div>
                </div>
            </div>

            <h2>📋 Recent Samples</h2>
            <table>
                <tr>
                    <th>Lab Number</th>
                    <th>Name</th>
                    <th>Surname</th>
                    <th>Relation</th>
                    <th>Collection Date</th>
                    <th>Status</th>
                </tr>
                ${db.getAllSamples().slice(0, 10).map(sample => `
                    <tr>
                        <td>${sample.lab_number}</td>
                        <td>${sample.name}</td>
                        <td>${sample.surname}</td>
                        <td>${sample.relation}</td>
                        <td>${sample.collection_date}</td>
                        <td>${sample.status}</td>
                    </tr>
                `).join('')}
            </table>

            <h2>🧪 Recent Batches</h2>
            <table>
                <tr>
                    <th>Batch Number</th>
                    <th>Operator</th>
                    <th>Total Samples</th>
                    <th>Status</th>
                    <th>Created</th>
                </tr>
                ${db.getAllBatches().slice(0, 5).map(batch => `
                    <tr>
                        <td>${batch.batch_number}</td>
                        <td>${batch.operator}</td>
                        <td>${batch.total_samples}</td>
                        <td>${batch.status}</td>
                        <td>${new Date(batch.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </table>

            <p style="margin-top: 30px; color: #666; font-size: 12px;">
                Database location: /Users/user/ashley-lims-v2/backend/database/ashley_lims.db<br>
                Last updated: ${new Date().toLocaleString()}
            </p>
        </div>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get samples data as JSON
router.get('/samples', (req, res) => {
  try {
    const samples = db.getAllSamples();
    res.json({ success: true, data: samples, count: samples.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get batches data as JSON
router.get('/batches', (req, res) => {
  try {
    const batches = db.getAllBatches();
    res.json({ success: true, data: batches, count: batches.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get quality control data as JSON
router.get('/quality-control', (req, res) => {
  try {
    const qcRecords = db.getQualityControlRecords();
    res.json({ success: true, data: qcRecords, count: qcRecords.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get equipment data as JSON
router.get('/equipment', (req, res) => {
  try {
    const equipment = db.getAllEquipment();
    res.json({ success: true, data: equipment, count: equipment.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get test cases data as JSON
router.get('/test-cases', (req, res) => {
  try {
    const testCases = db.getAllTestCases();
    res.json({ success: true, data: testCases, count: testCases.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get reports data as JSON
router.get('/reports', (req, res) => {
  try {
    const reports = db.getAllReports();
    res.json({ success: true, data: reports, count: reports.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to search samples
router.get('/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const results = db.searchSamples(query);
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detailed viewer pages
router.get('/viewer/samples', (req, res) => {
  try {
    const samples = db.getAllSamples();
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Samples - Ashley LIMS Database Viewer</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #1e4976; border-bottom: 2px solid #1e4976; padding-bottom: 10px; }
            .nav { margin: 20px 0; }
            .nav a { margin-right: 20px; color: #1e4976; text-decoration: none; padding: 5px 10px; border: 1px solid #1e4976; border-radius: 4px; }
            .nav a:hover { background: #1e4976; color: white; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #1e4976; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .status { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; }
            .status.pending { background: #fff3cd; color: #856404; }
            .status.processing { background: #d1ecf1; color: #0c5460; }
            .status.completed { background: #d4edda; color: #155724; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧬 Samples Database (${samples.length} records)</h1>
            
            <div class="nav">
                <a href="/api/db/viewer">← Back to Overview</a>
                <a href="/api/db/viewer/batches">Batches</a>
                <a href="/api/db/viewer/quality-control">Quality Control</a>
                <a href="/api/db/viewer/equipment">Equipment</a>
            </div>

            <table>
                <tr>
                    <th>ID</th>
                    <th>Lab Number</th>
                    <th>Name</th>
                    <th>Surname</th>
                    <th>Relation</th>
                    <th>Collection Date</th>
                    <th>Status</th>
                    <th>Case Number</th>
                    <th>Nationality</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Created</th>
                </tr>
                ${samples.map(sample => `
                    <tr>
                        <td>${sample.id}</td>
                        <td><strong>${sample.lab_number}</strong></td>
                        <td>${sample.name}</td>
                        <td>${sample.surname}</td>
                        <td><strong style="color: ${sample.relation === 'Child' ? '#2196f3' : sample.relation === 'Alleged Father' ? '#ff9800' : '#4caf50'}">${sample.relation}</strong></td>
                        <td>${sample.collection_date}</td>
                        <td><span class="status ${sample.status}">${sample.status}</span></td>
                        <td>${sample.case_number || 'N/A'}</td>
                        <td>${sample.nationality || 'N/A'}</td>
                        <td>${sample.email || 'N/A'}</td>
                        <td>${sample.phone_number || 'N/A'}</td>
                        <td>${new Date(sample.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    </body>
    </html>
    `;
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/viewer/batches', (req, res) => {
  try {
    const batches = db.getAllBatches();
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Batches - Ashley LIMS Database Viewer</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #1e4976; border-bottom: 2px solid #1e4976; padding-bottom: 10px; }
            .nav { margin: 20px 0; }
            .nav a { margin-right: 20px; color: #1e4976; text-decoration: none; padding: 5px 10px; border: 1px solid #1e4976; border-radius: 4px; }
            .nav a:hover { background: #1e4976; color: white; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1e4976; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .status { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; }
            .status.active { background: #d4edda; color: #155724; }
            .status.completed { background: #d1ecf1; color: #0c5460; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧪 Batches Database (${batches.length} records)</h1>
            
            <div class="nav">
                <a href="/api/db/viewer">← Back to Overview</a>
                <a href="/api/db/viewer/samples">Samples</a>
                <a href="/api/db/viewer/quality-control">Quality Control</a>
                <a href="/api/db/viewer/equipment">Equipment</a>
            </div>

            <table>
                <tr>
                    <th>ID</th>
                    <th>Batch Number</th>
                    <th>Operator</th>
                    <th>PCR Date</th>
                    <th>Electro Date</th>
                    <th>Settings</th>
                    <th>Total Samples</th>
                    <th>Status</th>
                    <th>Created</th>
                </tr>
                ${batches.map(batch => `
                    <tr>
                        <td>${batch.id}</td>
                        <td><strong>${batch.batch_number}</strong></td>
                        <td>${batch.operator}</td>
                        <td>${batch.pcr_date || 'Not set'}</td>
                        <td>${batch.electro_date || 'Not set'}</td>
                        <td>${batch.settings}</td>
                        <td>${batch.total_samples}</td>
                        <td><span class="status ${batch.status}">${batch.status}</span></td>
                        <td>${new Date(batch.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    </body>
    </html>
    `;
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/viewer/quality-control', (req, res) => {
  try {
    const qcRecords = db.getQualityControlRecords();
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Quality Control - Ashley LIMS Database Viewer</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #1e4976; border-bottom: 2px solid #1e4976; padding-bottom: 10px; }
            .nav { margin: 20px 0; }
            .nav a { margin-right: 20px; color: #1e4976; text-decoration: none; padding: 5px 10px; border: 1px solid #1e4976; border-radius: 4px; }
            .nav a:hover { background: #1e4976; color: white; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1e4976; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .result { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; }
            .result.Passed { background: #d4edda; color: #155724; }
            .result.Failed { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔬 Quality Control Records (${qcRecords.length} records)</h1>
            
            <div class="nav">
                <a href="/api/db/viewer">← Back to Overview</a>
                <a href="/api/db/viewer/samples">Samples</a>
                <a href="/api/db/viewer/batches">Batches</a>
                <a href="/api/db/viewer/equipment">Equipment</a>
            </div>

            <table>
                <tr>
                    <th>ID</th>
                    <th>Batch ID</th>
                    <th>Date</th>
                    <th>Control Type</th>
                    <th>Result</th>
                    <th>Operator</th>
                    <th>Comments</th>
                    <th>Created</th>
                </tr>
                ${qcRecords.map(qc => `
                    <tr>
                        <td>${qc.id}</td>
                        <td>${qc.batch_id || 'N/A'}</td>
                        <td>${qc.date}</td>
                        <td>${qc.control_type}</td>
                        <td><span class="result ${qc.result}">${qc.result}</span></td>
                        <td>${qc.operator}</td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${qc.comments || 'N/A'}</td>
                        <td>${new Date(qc.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    </body>
    </html>
    `;
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/viewer/equipment', (req, res) => {
  try {
    const equipment = db.getAllEquipment();
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Equipment - Ashley LIMS Database Viewer</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #1e4976; border-bottom: 2px solid #1e4976; padding-bottom: 10px; }
            .nav { margin: 20px 0; }
            .nav a { margin-right: 20px; color: #1e4976; text-decoration: none; padding: 5px 10px; border: 1px solid #1e4976; border-radius: 4px; }
            .nav a:hover { background: #1e4976; color: white; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1e4976; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .status { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; }
            .status.active { background: #d4edda; color: #155724; }
            .status.maintenance { background: #fff3cd; color: #856404; }
            .status.retired { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚙️ Equipment Database (${equipment.length} records)</h1>
            
            <div class="nav">
                <a href="/api/db/viewer">← Back to Overview</a>
                <a href="/api/db/viewer/samples">Samples</a>
                <a href="/api/db/viewer/batches">Batches</a>
                <a href="/api/db/viewer/quality-control">Quality Control</a>
            </div>

            <table>
                <tr>
                    <th>ID</th>
                    <th>Equipment ID</th>
                    <th>Type</th>
                    <th>Last Calibration</th>
                    <th>Next Calibration</th>
                    <th>Status</th>
                    <th>Created</th>
                </tr>
                ${equipment.map(eq => `
                    <tr>
                        <td>${eq.id}</td>
                        <td><strong>${eq.equipment_id}</strong></td>
                        <td>${eq.type}</td>
                        <td>${eq.last_calibration || 'N/A'}</td>
                        <td>${eq.next_calibration || 'N/A'}</td>
                        <td><span class="status ${eq.status}">${eq.status}</span></td>
                        <td>${new Date(eq.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    </body>
    </html>
    `;
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;