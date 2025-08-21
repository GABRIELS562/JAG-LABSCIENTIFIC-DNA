import React, { useState, useEffect } from 'react';
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
  Tooltip
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
  FolderOpen as FolderIcon
} from '@mui/icons-material';

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

  useEffect(() => {
    fetchAnalyses();
    fetchQueue();
    fetchBatches();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/genetic-analysis/osiris/analyses');
      const data = await response.json();
      if (data.success) {
        setAnalyses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/genetic-analysis/osiris/queue');
      const data = await response.json();
      if (data.success) {
        setQueue(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/electrophoresis-batches');
      const data = await response.json();
      if (data.success) {
        setBatches(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('fsaFile', selectedFile);
    if (selectedBatch) {
      formData.append('batchId', selectedBatch);
    }

    setLoading(true);
    try {
      const response = await fetch('/api/genetic-analysis/upload-fsa', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('FSA file uploaded successfully');
        setUploadDialogOpen(false);
        setSelectedFile(null);
        fetchQueue();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (error) {
      setError('Error uploading file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    setLoading(true);
    setProcessingStatus('Processing OSIRIS queue...');
    
    try {
      const response = await fetch('/api/genetic-analysis/osiris/process-queue', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Processed ${data.processed} samples successfully`);
        fetchAnalyses();
        fetchQueue();
      } else {
        setError(data.error || 'Processing failed');
      }
    } catch (error) {
      setError('Error processing queue: ' + error.message);
    } finally {
      setLoading(false);
      setProcessingStatus(null);
    }
  };

  const launchOsirisGUI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/genetic-analysis/osiris/launch', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('OSIRIS application launched successfully');
      } else {
        setError(data.error || 'Failed to launch OSIRIS');
      }
    } catch (error) {
      setError('Error launching OSIRIS: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const viewResults = async (analysis) => {
    setSelectedAnalysis(analysis);
    setResultsDialogOpen(true);
    
    // Fetch detailed results
    try {
      const response = await fetch(`/api/genetic-analysis/osiris/analysis/${analysis.analysis_id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedAnalysis(data.data);
      }
    } catch (error) {
      console.error('Error fetching analysis details:', error);
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      completed: { color: 'success', icon: <CheckIcon /> },
      pending: { color: 'warning', icon: <WarningIcon /> },
      processing: { color: 'info', icon: <CircularProgress size={16} /> },
      failed: { color: 'error', icon: <ErrorIcon /> },
      review: { color: 'secondary', icon: <AssessmentIcon /> }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Chip
        label={status?.toUpperCase()}
        color={config.color}
        size="small"
        icon={config.icon}
      />
    );
  };

  const getQualityIndicator = (score) => {
    if (!score) return null;
    
    const percentage = score * 100;
    const color = percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error';
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={color}
          sx={{ width: 60, height: 8, borderRadius: 1 }}
        />
        <Typography variant="caption">{percentage.toFixed(0)}%</Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScienceIcon /> OSIRIS STR Analysis - 3500 Genetic Analyzer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Process FSA files from 3500 Genetic Analyzer using Identifiler Plus kit
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={launchOsirisGUI}
            disabled={loading}
          >
            Launch OSIRIS
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload FSA
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {processingStatus && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {processingStatus}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Analyses
              </Typography>
              <Typography variant="h4">
                {analyses.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                In Queue
              </Typography>
              <Typography variant="h4" color="warning.main">
                {queue.filter(q => q.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {analyses.filter(a => a.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Review Required
              </Typography>
              <Typography variant="h4" color="secondary.main">
                {analyses.filter(a => a.review_required).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Analysis Results" />
          <Tab label="Processing Queue" />
          <Tab label="Sample FSA Files" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Analysis ID</TableCell>
                <TableCell>Sample</TableCell>
                <TableCell>Kit</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Quality</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analyses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No analyses found
                  </TableCell>
                </TableRow>
              ) : (
                analyses.map((analysis) => (
                  <TableRow key={analysis.analysis_id}>
                    <TableCell>#{analysis.analysis_id}</TableCell>
                    <TableCell>{analysis.sample_name || `Sample ${analysis.sample_id}`}</TableCell>
                    <TableCell>{analysis.kit_name || 'Identifiler Plus'}</TableCell>
                    <TableCell>
                      {new Date(analysis.analysis_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusChip(analysis.status)}</TableCell>
                    <TableCell>{getQualityIndicator(analysis.quality_score)}</TableCell>
                    <TableCell>
                      <Tooltip title="View Results">
                        <IconButton onClick={() => viewResults(analysis)} size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download Report">
                        <IconButton size="small">
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={processQueue}
              disabled={loading || queue.filter(q => q.status === 'pending').length === 0}
              color="primary"
            >
              Process Queue
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Queue ID</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Added</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Queue is empty
                    </TableCell>
                  </TableRow>
                ) : (
                  queue.map((item) => (
                    <TableRow key={item.queue_id}>
                      <TableCell>#{item.queue_id}</TableCell>
                      <TableCell>{item.batch_id || '-'}</TableCell>
                      <TableCell>{item.fsa_file_path?.split('/').pop()}</TableCell>
                      <TableCell>{item.priority}</TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Remove from Queue">
                          <IconButton size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Sample FSA files are available for testing OSIRIS integration
          </Alert>
          <Grid container spacing={2}>
            {['PT001', 'PT002', 'PT003'].map((caseId) => (
              <Grid item xs={12} md={4} key={caseId}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {caseId} - Trio Case
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Complete paternity test case with father, mother, and child samples
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip label="Father" size="small" sx={{ mr: 1 }} />
                      <Chip label="Mother" size="small" sx={{ mr: 1 }} />
                      <Chip label="Child" size="small" />
                    </Box>
                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{ mt: 2 }}
                      startIcon={<QueueIcon />}
                      onClick={() => {
                        // Add to queue logic
                        setSuccess(`Added ${caseId} to processing queue`);
                      }}
                    >
                      Add to Queue
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload FSA File</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Batch (Optional)</InputLabel>
              <Select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                label="Select Batch (Optional)"
              >
                <MenuItem value="">None</MenuItem>
                {batches.map((batch) => (
                  <MenuItem key={batch.batch_id} value={batch.batch_id}>
                    {batch.batch_id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<UploadIcon />}
            >
              {selectedFile ? selectedFile.name : 'Choose FSA File'}
              <input
                type="file"
                hidden
                accept=".fsa,.hid"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleFileUpload}
            disabled={!selectedFile || loading}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Results Dialog */}
      <Dialog 
        open={resultsDialogOpen} 
        onClose={() => setResultsDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          Analysis Results - {selectedAnalysis?.sample_name || `Sample ${selectedAnalysis?.sample_id}`}
        </DialogTitle>
        <DialogContent>
          {selectedAnalysis?.genotypes && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Locus</TableCell>
                    <TableCell>Allele 1</TableCell>
                    <TableCell>Allele 2</TableCell>
                    <TableCell>RFU 1</TableCell>
                    <TableCell>RFU 2</TableCell>
                    <TableCell>Quality</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAnalysis.genotypes.map((genotype, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{genotype.locus_name}</TableCell>
                      <TableCell>{genotype.allele_1 || '-'}</TableCell>
                      <TableCell>{genotype.allele_2 || '-'}</TableCell>
                      <TableCell>{genotype.rfu_1 || '-'}</TableCell>
                      <TableCell>{genotype.rfu_2 || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={genotype.quality_flag || 'PASS'} 
                          size="small"
                          color={genotype.quality_flag === 'PASS' ? 'success' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            Export Results
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OsirisAnalysis;