const express = require('express');
const { logger } = require('../utils/logger');
const { ResponseHandler } = require('../utils/responseHandler');
const { backgroundJobService } = require('../services/backgroundJobs');
const LoadGenerator = require('../scripts/loadGenerator');
const router = express.Router();

// Admin dashboard HTML
const adminDashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LIMS DevOps Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .status-healthy { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    </style>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">🚀 LIMS DevOps Dashboard</h1>
            <p class="text-gray-600">Monitor system health, performance, and manage DevOps demonstrations</p>
        </div>

        <!-- System Status -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">System Health</p>
                        <p id="system-health" class="text-2xl font-semibold status-healthy">Healthy</p>
                    </div>
                    <div class="text-3xl">❤️</div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Background Jobs</p>
                        <p id="job-status" class="text-2xl font-semibold status-healthy">Running</p>
                    </div>
                    <div class="text-3xl">⚙️</div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Memory Usage</p>
                        <p id="memory-usage" class="text-2xl font-semibold text-blue-600">Loading...</p>
                    </div>
                    <div class="text-3xl">💾</div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Load Test</p>
                        <p id="load-test-status" class="text-2xl font-semibold text-gray-400">Idle</p>
                    </div>
                    <div class="text-3xl">📊</div>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">🔧 Performance Testing</h3>
                <div class="space-y-3">
                    <button onclick="triggerSlowEndpoint()" class="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors">Trigger Slow Endpoint (3-5s)</button>
                    <button onclick="triggerUnreliableEndpoint()" class="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">Test Unreliable Endpoint (10% Error)</button>
                    <button onclick="triggerMemoryLeak()" class="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors">Simulate Memory Leak</button>
                    <button onclick="triggerCpuLoad()" class="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors">Generate CPU Load</button>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">📈 Load Testing</h3>
                <div class="space-y-3">
                    <div class="flex gap-2">
                        <input type="number" id="concurrency" placeholder="Concurrency (3)" value="3" class="flex-1 px-3 py-2 border rounded">
                        <input type="number" id="duration" placeholder="Duration (60s)" value="60" class="flex-1 px-3 py-2 border rounded">
                    </div>
                    <button onclick="startLoadTest()" class="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">Start Load Test</button>
                    <button onclick="stopLoadTest()" class="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">Stop Load Test</button>
                    <div id="load-test-results" class="mt-4 p-3 bg-gray-50 rounded text-sm hidden">
                        <div class="grid grid-cols-2 gap-2">
                            <div>Requests: <span id="total-requests">0</span></div>
                            <div>Success Rate: <span id="success-rate">0%</span></div>
                            <div>Avg Response: <span id="avg-response">0ms</span></div>
                            <div>RPS: <span id="rps">0</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Links -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">🔗 DevOps Endpoints</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <a href="/metrics" target="_blank" class="bg-blue-500 text-white px-4 py-2 rounded text-center hover:bg-blue-600 transition-colors">Metrics</a>
                <a href="/health" target="_blank" class="bg-green-500 text-white px-4 py-2 rounded text-center hover:bg-green-600 transition-colors">Health Check</a>
                <a href="/health/ready" target="_blank" class="bg-cyan-500 text-white px-4 py-2 rounded text-center hover:bg-cyan-600 transition-colors">Readiness</a>
                <a href="/performance/memory-status" target="_blank" class="bg-purple-500 text-white px-4 py-2 rounded text-center hover:bg-purple-600 transition-colors">Memory Status</a>
            </div>
        </div>

        <!-- Logs -->
        <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">📝 Activity Log</h3>
            <div id="activity-log" class="bg-gray-50 p-4 rounded h-64 overflow-y-auto text-sm font-mono">
                <div class="text-gray-500">Activity log will appear here...</div>
            </div>
            <button onclick="clearLog()" class="mt-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors">Clear Log</button>
        </div>
    </div>

    <script>
        let logEntries = [];
        let updateInterval;
        
        function log(message, level = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const entry = \`[\${timestamp}] \${level.toUpperCase()}: \${message}\`;
            logEntries.push(entry);
            if (logEntries.length > 100) logEntries.shift();
            
            const logDiv = document.getElementById('activity-log');
            logDiv.innerHTML = logEntries.join('\\n');
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        function clearLog() {
            logEntries = [];
            document.getElementById('activity-log').innerHTML = '<div class="text-gray-500">Activity log cleared...</div>';
        }
        
        async function apiCall(url, options = {}) {
            try {
                const response = await fetch(url, {
                    headers: { 'Content-Type': 'application/json' },
                    ...options
                });
                const data = await response.json();
                return { success: response.ok, data, status: response.status };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        
        async function triggerSlowEndpoint() {
            log('Triggering slow endpoint...');
            const start = Date.now();
            const result = await apiCall('/performance/slow');
            const duration = Date.now() - start;
            log(\`Slow endpoint completed in \${duration}ms - Status: \${result.status}\`, result.success ? 'info' : 'error');
        }
        
        async function triggerUnreliableEndpoint() {
            log('Testing unreliable endpoint...');
            const result = await apiCall('/performance/unreliable');
            log(\`Unreliable endpoint - Status: \${result.status}\`, result.success ? 'info' : 'warn');
        }
        
        async function triggerMemoryLeak() {
            log('Simulating memory leak...');
            const result = await apiCall('/performance/memory-leak', {
                method: 'POST',
                body: JSON.stringify({ size: 1000, iterations: 10 })
            });
            log(\`Memory leak simulation - Status: \${result.status}\`, result.success ? 'warn' : 'error');
        }
        
        async function triggerCpuLoad() {
            log('Generating CPU load...');
            const result = await apiCall('/performance/cpu-intensive', {
                method: 'POST',
                body: JSON.stringify({ duration: 5000, complexity: 500000 })
            });
            log(\`CPU load test - Status: \${result.status}\`, result.success ? 'info' : 'error');
        }
        
        async function startLoadTest() {
            const concurrency = document.getElementById('concurrency').value || 3;
            const duration = document.getElementById('duration').value || 60;
            
            log(\`Starting load test - Concurrency: \${concurrency}, Duration: \${duration}s\`);
            
            const result = await apiCall('/admin/load-test/start', {
                method: 'POST',
                body: JSON.stringify({ concurrency: parseInt(concurrency), duration: parseInt(duration) })
            });
            
            if (result.success) {
                log('Load test started successfully');
                document.getElementById('load-test-status').textContent = 'Running';
                document.getElementById('load-test-status').className = 'text-2xl font-semibold status-warning pulse';
                document.getElementById('load-test-results').classList.remove('hidden');
                startLoadTestMonitoring();
            } else {
                log(\`Failed to start load test: \${result.error || result.data?.message}\`, 'error');
            }
        }
        
        async function stopLoadTest() {
            log('Stopping load test...');
            const result = await apiCall('/admin/load-test/stop', { method: 'POST' });
            
            if (result.success) {
                log('Load test stopped');
                document.getElementById('load-test-status').textContent = 'Idle';
                document.getElementById('load-test-status').className = 'text-2xl font-semibold text-gray-400';
                clearInterval(updateInterval);
                
                // Show final results
                if (result.data) {
                    document.getElementById('total-requests').textContent = result.data.totalRequests;
                    document.getElementById('success-rate').textContent = \`\${result.data.successRate.toFixed(1)}%\`;
                    document.getElementById('avg-response').textContent = \`\${result.data.averageResponseTime}ms\`;
                    document.getElementById('rps').textContent = result.data.requestsPerSecond;
                }
            } else {
                log(\`Failed to stop load test: \${result.error || result.data?.message}\`, 'error');
            }
        }
        
        function startLoadTestMonitoring() {
            updateInterval = setInterval(async () => {
                const result = await apiCall('/admin/load-test/status');
                if (result.success && result.data.isRunning) {
                    document.getElementById('total-requests').textContent = result.data.totalRequests;
                    document.getElementById('success-rate').textContent = \`\${result.data.successRate.toFixed(1)}%\`;
                    document.getElementById('avg-response').textContent = \`\${result.data.averageResponseTime}ms\`;
                    document.getElementById('rps').textContent = result.data.requestsPerSecond;
                } else {
                    clearInterval(updateInterval);
                    document.getElementById('load-test-status').textContent = 'Idle';
                    document.getElementById('load-test-status').className = 'text-2xl font-semibold text-gray-400';
                }
            }, 2000);
        }
        
        async function updateSystemStatus() {
            // Update health status
            const health = await apiCall('/health');
            if (health.success) {
                const status = health.data.data?.status || 'unknown';
                const healthElement = document.getElementById('system-health');
                healthElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                healthElement.className = \`text-2xl font-semibold \${status === 'healthy' ? 'status-healthy' : status === 'warning' ? 'status-warning' : 'status-error'}\`;
            }
            
            // Update memory status
            const memory = await apiCall('/performance/memory-status');
            if (memory.success && memory.data.data) {
                document.getElementById('memory-usage').textContent = memory.data.data.memoryUsage.heapUsed;
            }
            
            // Update job status
            const jobs = await apiCall('/admin/jobs/status');
            if (jobs.success) {
                const isRunning = jobs.data.data?.isRunning;
                const jobElement = document.getElementById('job-status');
                jobElement.textContent = isRunning ? 'Running' : 'Stopped';
                jobElement.className = \`text-2xl font-semibold \${isRunning ? 'status-healthy' : 'status-error'}\`;
            }
        }
        
        // Initialize dashboard
        log('DevOps Dashboard initialized');
        updateSystemStatus();
        setInterval(updateSystemStatus, 10000); // Update every 10 seconds
    </script>
</body>
</html>
`;

// Serve admin dashboard
router.get('/', (req, res) => {
  res.send(adminDashboardHTML);
});

// System status endpoint
router.get('/status', async (req, res) => {
  try {
    const jobStatus = backgroundJobService.getStatus();
    const memUsage = process.memoryUsage();
    
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
      },
      backgroundJobs: jobStatus,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid
    };
    
    ResponseHandler.success(res, status, 'System status retrieved');
  } catch (error) {
    logger.error('Failed to get system status', { error: error.message });
    ResponseHandler.error(res, 'Failed to get system status', error);
  }
});

// Trigger specific background job
router.post('/trigger-job/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    await backgroundJobService.triggerJob(jobName);
    
    logger.info('Background job triggered manually', {
      jobName,
      triggeredBy: 'admin-dashboard',
      timestamp: new Date().toISOString()
    });
    
    ResponseHandler.success(res, { jobName }, `Job '${jobName}' triggered successfully`);
  } catch (error) {
    logger.error('Failed to trigger background job', {
      jobName: req.params.jobName,
      error: error.message
    });
    ResponseHandler.error(res, `Failed to trigger job '${req.params.jobName}'`, error);
  }
});

// Get performance metrics summary
router.get('/metrics-summary', async (req, res) => {
  try {
    // This would normally come from your metrics system
    // For demo purposes, we'll return mock data
    const summary = {
      timestamp: new Date().toISOString(),
      httpRequests: {
        total: Math.floor(Math.random() * 10000) + 5000,
        successRate: (95 + Math.random() * 4).toFixed(2) + '%',
        averageResponseTime: (150 + Math.random() * 100).toFixed(0) + 'ms'
      },
      samples: {
        processed: Math.floor(Math.random() * 500) + 1000,
        pending: Math.floor(Math.random() * 50) + 10,
        completed: Math.floor(Math.random() * 450) + 950
      },
      batches: {
        created: Math.floor(Math.random() * 50) + 100,
        active: Math.floor(Math.random() * 10) + 5,
        completed: Math.floor(Math.random() * 40) + 95
      },
      system: {
        uptime: Math.floor(process.uptime()),
        memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        activeUsers: Math.floor(Math.random() * 20) + 5
      }
    };
    
    ResponseHandler.success(res, summary, 'Metrics summary retrieved');
  } catch (error) {
    logger.error('Failed to get metrics summary', { error: error.message });
    ResponseHandler.error(res, 'Failed to get metrics summary', error);
  }
});

// Force garbage collection (if available)
router.post('/gc', (req, res) => {
  try {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      logger.info('Garbage collection triggered', {
        memoryBefore: {
          heapUsed: `${Math.round(before.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(before.heapTotal / 1024 / 1024)}MB`
        },
        memoryAfter: {
          heapUsed: `${Math.round(after.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(after.heapTotal / 1024 / 1024)}MB`
        },
        freed: `${Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024)}MB`
      });
      
      ResponseHandler.success(res, {
        before: {
          heapUsed: `${Math.round(before.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(before.heapTotal / 1024 / 1024)}MB`
        },
        after: {
          heapUsed: `${Math.round(after.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(after.heapTotal / 1024 / 1024)}MB`
        },
        freed: `${Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024)}MB`
      }, 'Garbage collection completed');
    } else {
      ResponseHandler.error(res, 'Garbage collection not available (run with --expose-gc)', null, 400);
    }
  } catch (error) {
    logger.error('Garbage collection failed', { error: error.message });
    ResponseHandler.error(res, 'Garbage collection failed', error);
  }
});

module.exports = router;
