import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Button,
  Tabs,
  Tab,
  Paper,
  Alert,
  Collapse,
  TextField,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  BugReport,
  Close,
  Refresh,
  Clear,
  Storage,
  Memory,
  Speed,
  NetworkCheck,
  Code,
  ExpandMore,
  ExpandLess,
  ContentCopy,
  Download
} from '@mui/icons-material';

const DebugPanel = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [logs, setLogs] = useState([]);
  const [networkRequests, setNetworkRequests] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [appState, setAppState] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    // Check for debug mode in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    const storedDebug = localStorage.getItem('debugMode');
    
    if (debugParam === 'true' || storedDebug === 'true') {
      setDebugMode(true);
      setOpen(true);
    }

    // Intercept console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    // Intercept network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const request = {
        url: args[0],
        method: args[1]?.method || 'GET',
        timestamp: new Date(),
        status: 'pending'
      };
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        request.status = response.status;
        request.duration = endTime - startTime;
        request.ok = response.ok;
        addNetworkRequest(request);
        return response;
      } catch (error) {
        request.status = 'error';
        request.error = error.message;
        addNetworkRequest(request);
        throw error;
      }
    };

    // Collect performance metrics
    const collectMetrics = () => {
      if (window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0];
        const memory = performance.memory;
        
        setPerformanceMetrics({
          pageLoadTime: navigation?.loadEventEnd - navigation?.fetchStart,
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
          memoryUsed: memory?.usedJSHeapSize ? (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB' : 'N/A',
          memoryTotal: memory?.totalJSHeapSize ? (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB' : 'N/A'
        });
      }
    };

    collectMetrics();
    const metricsInterval = setInterval(collectMetrics, 5000);

    // Keyboard shortcut to toggle debug panel
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      window.fetch = originalFetch;
      clearInterval(metricsInterval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const addLog = (type, args) => {
    const logEntry = {
      type,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      timestamp: new Date(),
      id: Date.now() + Math.random()
    };
    
    setLogs(prev => [...prev.slice(-99), logEntry]);
  };

  const addNetworkRequest = (request) => {
    setNetworkRequests(prev => [...prev.slice(-49), request]);
  };

  const clearLogs = () => setLogs([]);
  const clearNetwork = () => setNetworkRequests([]);

  const exportDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      logs,
      networkRequests,
      performanceMetrics,
      appState,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-export-${Date.now()}.json`;
    a.click();
  };

  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getLogColor = (type) => {
    switch(type) {
      case 'error': return 'error.main';
      case 'warn': return 'warning.main';
      default: return 'text.primary';
    }
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'error';
    return 'default';
  };

  return (
    <>
      {/* Debug Toggle Button */}
      {debugMode && (
        <Tooltip title="Debug Panel (Ctrl+Shift+D)">
          <IconButton
            onClick={() => setOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              backgroundColor: 'error.main',
              color: 'white',
              zIndex: 9999,
              '&:hover': {
                backgroundColor: 'error.dark'
              }
            }}
          >
            <BugReport />
          </IconButton>
        </Tooltip>
      )}

      {/* Debug Panel Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 500,
            maxWidth: '90vw'
          }
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ p: 2, backgroundColor: 'error.main', color: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Debug Panel</Typography>
              <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                <Close />
              </IconButton>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={debugMode}
                  onChange={(e) => {
                    setDebugMode(e.target.checked);
                    localStorage.setItem('debugMode', e.target.checked);
                  }}
                  sx={{ color: 'white' }}
                />
              }
              label="Debug Mode"
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            variant="fullWidth"
          >
            <Tab label="Console" icon={<Code />} />
            <Tab label="Network" icon={<NetworkCheck />} />
            <Tab label="Performance" icon={<Speed />} />
            <Tab label="State" icon={<Storage />} />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {/* Console Tab */}
            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2">Console Logs ({logs.length})</Typography>
                  <Button size="small" startIcon={<Clear />} onClick={clearLogs}>
                    Clear
                  </Button>
                </Box>
                <List dense>
                  {logs.map((log) => (
                    <ListItem key={log.id} sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                          variant="caption"
                          sx={{ color: getLogColor(log.type), fontFamily: 'monospace' }}
                        >
                          [{log.type.toUpperCase()}] {new Date(log.timestamp).toLocaleTimeString()}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => toggleExpanded(log.id)}
                        >
                          {expandedItems[log.id] ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                      <Collapse in={expandedItems[log.id]}>
                        <Paper sx={{ p: 1, mt: 1, backgroundColor: 'grey.100' }}>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                          >
                            {log.message}
                          </Typography>
                        </Paper>
                      </Collapse>
                      {!expandedItems[log.id] && (
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {log.message}
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Network Tab */}
            {activeTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2">Network Requests ({networkRequests.length})</Typography>
                  <Button size="small" startIcon={<Clear />} onClick={clearNetwork}>
                    Clear
                  </Button>
                </Box>
                <List dense>
                  {networkRequests.map((req, idx) => (
                    <ListItem key={idx} sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {req.method} {req.url?.substring(0, 50)}...
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {req.duration && (
                            <Chip
                              label={`${req.duration.toFixed(0)}ms`}
                              size="small"
                              color={req.duration > 1000 ? 'warning' : 'default'}
                            />
                          )}
                          <Chip
                            label={req.status}
                            size="small"
                            color={getStatusColor(req.status)}
                          />
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Performance Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Performance Metrics</Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Page Load Time"
                      secondary={performanceMetrics.pageLoadTime ? `${performanceMetrics.pageLoadTime}ms` : 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="DOM Content Loaded"
                      secondary={performanceMetrics.domContentLoaded ? `${performanceMetrics.domContentLoaded}ms` : 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Memory Used"
                      secondary={performanceMetrics.memoryUsed}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Total Memory"
                      secondary={performanceMetrics.memoryTotal}
                    />
                  </ListItem>
                </List>
              </Box>
            )}

            {/* State Tab */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Application State</Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Connect Redux DevTools or add state management hooks to view application state
                </Alert>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Local Storage Items"
                      secondary={Object.keys(localStorage).length}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Session Storage Items"
                      secondary={Object.keys(sessionStorage).length}
                    />
                  </ListItem>
                </List>
              </Box>
            )}
          </Box>

          {/* Footer Actions */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Download />}
              onClick={exportDebugData}
            >
              Export Debug Data
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default DebugPanel;