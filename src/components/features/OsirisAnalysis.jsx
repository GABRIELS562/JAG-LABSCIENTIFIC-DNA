import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Upload as UploadIcon,
  Science as ScienceIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  QueuePlayNext as QueueIcon,
  FolderOpen as FolderIcon,
  Biotech as BiotechIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { 
  generateOsirisResults, 
  generateBatchResults, 
  simulateOsirisQueue,
  POWERPLEX_ESX17_LOCI 
} from '../../services/osirisSimulation';

const OsirisAnalysis = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [analyses, setAnalyses] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [batches, setBatches] = useState([]);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState(null);
  const dialogRef = useRef(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once to prevent double mounting issues
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeData();
    }
    // Temporarily disable auto-update to debug dialog issue
    // const interval = setInterval(() => {
    //   updateProcessingStatus();
    // }, 5000);
    // return () => clearInterval(interval);
  }, []);

  const initializeData = () => {
    console.log('initializeData called!');
    // Generate initial queue
    const initialQueue = simulateOsirisQueue();
    setQueue(initialQueue);
    
    // Generate some completed analyses
    const completedAnalyses = [];
    for (let i = 1; i <= 3; i++) {
      const batchResults = generateBatchResults(`BATCH-2024-${String(i).padStart(3, '0')}`, 96);
      completedAnalyses.push({
        id: batchResults.batchId,
        ...batchResults,
        status: 'completed'
      });
    }
    console.log('Initial analyses loaded:', completedAnalyses);
    setAnalyses(completedAnalyses);
    
    // Generate available batches from electrophoresis
    const availableBatches = [
      { id: 'EP-2024-001', name: 'Batch EP-2024-001', samples: 96, date: '2024-01-15' },
      { id: 'EP-2024-002', name: 'Batch EP-2024-002', samples: 96, date: '2024-01-16' },
      { id: 'EP-2024-003', name: 'Batch EP-2024-003', samples: 48, date: '2024-01-17' }
    ];
    setBatches(availableBatches);
  };

  const updateProcessingStatus = () => {
    setQueue(prevQueue => {
      return prevQueue.map(item => {
        if (item.status === 'processing') {
          // Simulate progress
          const progress = (item.progress || 0) + Math.random() * 20;
          if (progress >= 100) {
            // Move to completed
            const batchResults = generateBatchResults(item.batchId, item.samples);
            setAnalyses(prev => [...prev, { id: item.batchId, ...batchResults, status: 'completed' }]);
            return { ...item, status: 'completed', progress: 100 };
          }
          return { ...item, progress };
        }
        return item;
      });
    });
  };

  const handleUploadFSA = () => {
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setSuccess(`Selected: ${file.name}`);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedBatch && !selectedFile) {
      setError('Please select a batch or upload FSA files');
      return;
    }

    setLoading(true);
    setProcessingStatus({ stage: 'initializing', progress: 0 });

    // Simulate OSIRIS processing stages
    const stages = [
      { name: 'Loading FSA files', duration: 1000 },
      { name: 'Size calling with LIZ 500', duration: 2000 },
      { name: 'Allele calling', duration: 3000 },
      { name: 'Artifact detection', duration: 1500 },
      { name: 'Quality metrics calculation', duration: 1000 },
      { name: 'Report generation', duration: 500 }
    ];

    for (const [index, stage] of stages.entries()) {
      setProcessingStatus({
        stage: stage.name,
        progress: ((index + 1) / stages.length) * 100
      });
      await new Promise(resolve => setTimeout(resolve, stage.duration));
    }

    // Generate results
    const batchId = selectedBatch || `BATCH-${Date.now()}`;
    const results = generateBatchResults(batchId, 96);
    
    setAnalyses(prev => [...prev, { id: batchId, ...results, status: 'completed' }]);
    setSuccess('OSIRIS analysis completed successfully!');
    setLoading(false);
    setProcessingStatus(null);
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setSelectedBatch('');
  };

  const handleViewResults = (analysis) => {
    console.log('View Results clicked for:', analysis);
    setSelectedAnalysis(analysis);
    setResultsDialogOpen(true);
    dialogRef.current = true;
  };

  const handleExportResults = (analysis) => {
    // Generate OSIRIS CMF export format
    const exportData = {
      version: '2.17',
      kit: 'PowerPlex ESX 17',
      standard: 'LIZ 500',
      batch: analysis.batchId,
      samples: analysis.samples,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OSIRIS_${analysis.batchId}.cmf`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Results exported successfully');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'failed': return 'error';
      case 'review': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" gutterBottom>
                    OSIRIS STR Analysis System
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open Source Independent Review and Interpretation System v2.17
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      label="PowerPlex ESX 17" 
                      size="small" 
                      color="primary" 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label="LIZ 500 Size Standard" 
                      size="small" 
                      color="secondary" 
                      sx={{ mr: 1 }} 
                    />
                    <Chip 
                      label="3500 Genetic Analyzer" 
                      size="small" 
                      color="info" 
                    />
                  </Box>
                </Box>
                <Box>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<UploadIcon />}
                    onClick={handleUploadFSA}
                    sx={{ mr: 2 }}
                  >
                    Import FSA Files
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={initializeData}
                  >
                    Refresh
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Cards */}
        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active Queue
                  </Typography>
                  <Typography variant="h4">
                    {queue.filter(q => q.status === 'processing').length}
                  </Typography>
                </Box>
                <QueueIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Completed Today
                  </Typography>
                  <Typography variant="h4">
                    {analyses.filter(a => a.status === 'completed').length}
                  </Typography>
                </Box>
                <CheckIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Pending Review
                  </Typography>
                  <Typography variant="h4">
                    {queue.filter(q => q.status === 'review').length}
                  </Typography>
                </Box>
                <WarningIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Success Rate
                  </Typography>
                  <Typography variant="h4">
                    98.5%
                  </Typography>
                </Box>
                <BarChartIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab label="Analysis Queue" icon={<QueueIcon />} />
                <Tab label="Completed Analyses" icon={<CheckIcon />} />
                <Tab label="STR Profiles" icon={<BiotechIcon />} />
                <Tab label="Quality Metrics" icon={<TimelineIcon />} />
              </Tabs>

              <Box sx={{ mt: 3 }}>
                {activeTab === 0 && (
                  <TableContainer component={Paper} elevation={0}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Batch ID</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Priority</TableCell>
                          <TableCell>Samples</TableCell>
                          <TableCell>Progress</TableCell>
                          <TableCell>Submitted</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {queue.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.batchId}</TableCell>
                            <TableCell>
                              <Chip
                                label={item.status}
                                size="small"
                                color={getStatusColor(item.status)}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`P${item.priority}`}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{item.samples}</TableCell>
                            <TableCell>
                              {item.status === 'processing' && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: '100%', mr: 1 }}>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={item.progress || 0} 
                                    />
                                  </Box>
                                  <Box sx={{ minWidth: 35 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      {`${Math.round(item.progress || 0)}%`}
                                    </Typography>
                                  </Box>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(item.submittedAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" color="primary">
                                <ViewIcon />
                              </IconButton>
                              {item.status === 'pending' && (
                                <IconButton size="small" color="success">
                                  <PlayIcon />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {activeTab === 1 && (
                  <TableContainer component={Paper} elevation={0}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Batch ID</TableCell>
                          <TableCell>Samples</TableCell>
                          <TableCell>Success Rate</TableCell>
                          <TableCell>Processing Time</TableCell>
                          <TableCell>Completed</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analyses.map((analysis) => {
                          console.log('Rendering analysis row:', analysis);
                          return (
                          <TableRow key={analysis.id}>
                            <TableCell>{analysis.batchId}</TableCell>
                            <TableCell>{analysis.totalSamples}</TableCell>
                            <TableCell>
                              <Chip
                                label={`${analysis.runMetrics?.successRate || '98.5'}%`}
                                size="small"
                                color="success"
                              />
                            </TableCell>
                            <TableCell>{analysis.processingTime}</TableCell>
                            <TableCell>
                              {new Date(analysis.completedAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="View Results">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Eye icon clicked!');
                                    handleViewResults(analysis);
                                  }}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Export CMF">
                                <IconButton 
                                  size="small" 
                                  color="secondary"
                                  onClick={() => handleExportResults(analysis)}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        )})}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {activeTab === 2 && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      STR profiles analyzed using PowerPlex ESX 17 kit with 17 STR loci plus Amelogenin
                    </Alert>
                    <Grid container spacing={2}>
                      {Object.entries(POWERPLEX_ESX17_LOCI).slice(0, 6).map(([locus, config]) => (
                        <Grid item xs={6} key={locus}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                {locus}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Channel: {config.channel}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Range: {config.range[0]}-{config.range[1]} bp
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                {config.alleles.slice(0, 5).map(allele => (
                                  <Chip
                                    key={allele}
                                    label={allele}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                                {config.alleles.length > 5 && (
                                  <Chip
                                    label={`+${config.alleles.length - 5} more`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {activeTab === 3 && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      All quality metrics within acceptable ranges for forensic analysis
                    </Alert>
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary="RFU Threshold"
                              secondary="Min: 150, Max: 8000, Average: 2500"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary="Peak Height Ratio"
                              secondary="0.65 (Within acceptable range)"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary="Stutter Ratio"
                              secondary="< 0.10 (Pass)"
                            />
                          </ListItem>
                        </List>
                      </Grid>
                      <Grid item xs={6}>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary="Pull-Up Detection"
                              secondary="2.3% (Acceptable)"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary="Resolution Score"
                              secondary="0.95 (Excellent)"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <CheckIcon color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary="Sizing Quality"
                              secondary="All ladder peaks detected"
                            />
                          </ListItem>
                        </List>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import FSA Files for OSIRIS Analysis</DialogTitle>
        <DialogContent>
          {processingStatus ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" gutterBottom>
                {processingStatus.stage}
              </Typography>
              <LinearProgress variant="determinate" value={processingStatus.progress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {Math.round(processingStatus.progress)}% complete
              </Typography>
            </Box>
          ) : (
            <Box>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Electrophoresis Batch</InputLabel>
                <Select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  label="Select Electrophoresis Batch"
                >
                  {batches.map(batch => (
                    <MenuItem key={batch.id} value={batch.id}>
                      {batch.name} - {batch.samples} samples ({batch.date})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  OR
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<FolderIcon />}
                >
                  Browse FSA Files
                  <input
                    type="file"
                    hidden
                    multiple
                    accept=".fsa,.hid"
                    onChange={handleFileSelect}
                  />
                </Button>
                {selectedFile && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Selected: {selectedFile.name}
                  </Alert>
                )}
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                OSIRIS will automatically detect PowerPlex ESX 17 kit and LIZ 500 size standard
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleStartAnalysis} 
            variant="contained" 
            disabled={loading || (!selectedBatch && !selectedFile)}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayIcon />}
          >
            {loading ? 'Processing...' : 'Start OSIRIS Analysis'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Results Dialog - Simple Test */}
      {console.log('Dialog state - open:', resultsDialogOpen, 'analysis:', selectedAnalysis)}
      {resultsDialogOpen && (
        <Box sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          maxWidth: '800px',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          zIndex: 9999,
          border: '2px solid #000',
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          <Typography variant="h5" component="h2">
            OSIRIS Analysis Results - {selectedAnalysis?.batchId}
          </Typography>
          <Button 
            onClick={() => {
              console.log('Close button clicked');
              setResultsDialogOpen(false);
              dialogRef.current = false;
            }}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            X Close
          </Button>
          <Box sx={{ mt: 2 }}>
          {selectedAnalysis && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Total Samples</Typography>
                  <Typography variant="h6">{selectedAnalysis.totalSamples}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Success Rate</Typography>
                  <Typography variant="h6">{selectedAnalysis.runMetrics?.successRate}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Processing Time</Typography>
                  <Typography variant="h6">{selectedAnalysis.processingTime}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Average Resolution</Typography>
                  <Typography variant="h6">{selectedAnalysis.runMetrics?.averageResolution}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>Sample Results</Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Well</TableCell>
                      <TableCell>Sample ID</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>CPI</TableCell>
                      <TableCell>Conclusion</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedAnalysis.samples?.slice(0, 10).map((sample) => (
                      <TableRow key={sample.sampleId}>
                        <TableCell>{sample.wellPosition}</TableCell>
                        <TableCell>{sample.sampleId}</TableCell>
                        <TableCell>{sample.sampleType}</TableCell>
                        <TableCell>
                          <Chip 
                            label={sample.status} 
                            size="small" 
                            color={sample.status === 'completed' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {sample.results?.results?.cpi || '-'}
                        </TableCell>
                        <TableCell>
                          {sample.results?.results?.conclusion && (
                            <Chip
                              label={sample.results.results.conclusion}
                              size="small"
                              color={sample.results.results.conclusion === 'INCLUSION' ? 'success' : 'error'}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              onClick={() => handleExportResults(selectedAnalysis)}
            >
              Export CMF
            </Button>
          </Box>
        </Box>
      )}

      {/* Status Messages */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default OsirisAnalysis;