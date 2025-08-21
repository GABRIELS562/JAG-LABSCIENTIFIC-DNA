import React, { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  CircularProgress,
  Container,
  Checkbox,
  Tooltip,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Science,
  Add,
  Refresh,
  CheckCircle,
  Warning,
  Error,
  ExpandMore,
  Visibility,
  Assignment,
  Biotech,
  PlayArrow,
  Stop,
  Save,
  Print,
  Timeline,
  Analytics,
  Schedule
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const DNAExtraction = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [pendingSamples, setPendingSamples] = useState([]);
  const [extractionBatches, setExtractionBatches] = useState([]);
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  const [quantificationOpen, setQuantificationOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [error, setError] = useState(null);

  // Batch creation form state
  const [batchForm, setBatchForm] = useState({
    operator: '',
    extractionMethod: 'QIAamp',
    kitLotNumber: '',
    kitExpiryDate: '',
    lysisTime: 60,
    lysisTemperature: 56.0,
    incubationTime: 30,
    centrifugeSpeed: 14000,
    centrifugeTime: 3,
    elutionVolume: 200,
    notes: ''
  });

  // Plate layout state
  const [plateLayout, setPlateLayout] = useState({});
  const [activeBatch, setActiveBatch] = useState(null);

  // Quantification state
  const [quantificationData, setQuantificationData] = useState({
    sampleId: '',
    wellPosition: '',
    dnaConcentration: '',
    purity260280: '',
    purity260230: '',
    volumeRecovered: '',
    qualityAssessment: 'Good',
    quantificationMethod: 'NanoDrop',
    extractionEfficiency: '',
    inhibitionDetected: false,
    reextractionRequired: false,
    notes: ''
  });

  // Extraction methods configuration
  const extractionMethods = {
    'QIAamp': {
      name: 'QIAamp DNA Mini Kit',
      lysisTime: 60,
      lysisTemperature: 56.0,
      incubationTime: 30,
      elutionVolume: 200,
      description: 'Silica-based DNA extraction for high-quality genomic DNA'
    },
    'Chelex': {
      name: 'Chelex 100 Resin',
      lysisTime: 30,
      lysisTemperature: 99.0,
      incubationTime: 8,
      elutionVolume: 100,
      description: 'Simple, fast extraction for PCR-ready DNA'
    },
    'PrepFiler': {
      name: 'PrepFiler Express BTA Kit',
      lysisTime: 45,
      lysisTemperature: 70.0,
      incubationTime: 60,
      elutionVolume: 50,
      description: 'Automated extraction for forensic samples'
    },
    'Organic': {
      name: 'Organic Extraction (Phenol-Chloroform)',
      lysisTime: 120,
      lysisTemperature: 37.0,
      incubationTime: 60,
      elutionVolume: 100,
      description: 'Traditional method for high molecular weight DNA'
    },
    'Magnetic Bead': {
      name: 'Magnetic Bead Extraction',
      lysisTime: 30,
      lysisTemperature: 65.0,
      incubationTime: 15,
      elutionVolume: 100,
      description: 'Automated magnetic bead-based purification'
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadPendingSamples();
    loadExtractionBatches();
  }, []);

  const loadPendingSamples = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/extraction/samples-ready`);
      if (response.ok) {
        const data = await response.json();
        setPendingSamples(data.data || []);
      }
    } catch (error) {
      console.error('Error loading pending samples:', error);
      setError('Failed to load pending samples');
    } finally {
      setLoading(false);
    }
  };

  const loadExtractionBatches = async () => {
    try {
      const response = await fetch(`${API_URL}/extraction/batches`);
      if (response.ok) {
        const data = await response.json();
        setExtractionBatches(data.data || []);
      }
    } catch (error) {
      console.error('Error loading extraction batches:', error);
    }
  };

  const refreshData = async () => {
    await Promise.all([loadPendingSamples(), loadExtractionBatches()]);
  };

  // Sample selection handlers
  const handleSampleSelection = (sample, isSelected) => {
    if (isSelected) {
      setSelectedSamples(prev => [...prev, sample]);
    } else {
      setSelectedSamples(prev => prev.filter(s => s.id !== sample.id));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedSamples([...pendingSamples]);
    } else {
      setSelectedSamples([]);
    }
  };

  // Plate layout generation
  const generatePlateLayout = useCallback(() => {
    const wells = {};
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
    
    let sampleIndex = 0;
    
    // Fill samples first
    for (let row of rows) {
      for (let col of cols) {
        const wellId = `${row}${col}`;
        if (sampleIndex < selectedSamples.length) {
          wells[wellId] = {
            wellType: 'Sample',
            samples: [selectedSamples[sampleIndex]],
            position: wellId
          };
          sampleIndex++;
        } else {
          wells[wellId] = {
            wellType: 'Empty',
            samples: [],
            position: wellId
          };
        }
      }
    }

    // Add controls (replace some empty wells)
    if (wells['H01']) wells['H01'] = { wellType: 'Positive Control', samples: [], position: 'H01' };
    if (wells['H02']) wells['H02'] = { wellType: 'Negative Control', samples: [], position: 'H02' };
    if (wells['H03']) wells['H03'] = { wellType: 'Extraction Blank', samples: [], position: 'H03' };

    return wells;
  }, [selectedSamples]);

  // Form handlers
  const handleMethodChange = (method) => {
    const config = extractionMethods[method];
    setBatchForm(prev => ({
      ...prev,
      extractionMethod: method,
      lysisTime: config.lysisTime,
      lysisTemperature: config.lysisTemperature,
      incubationTime: config.incubationTime,
      elutionVolume: config.elutionVolume
    }));
  };

  const createExtractionBatch = async () => {
    if (selectedSamples.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select at least one sample',
        severity: 'warning'
      });
      return;
    }

    if (!batchForm.operator || !batchForm.kitLotNumber) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const wells = generatePlateLayout();
      
      const response = await fetch(`${API_URL}/extraction/create-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operator: batchForm.operator,
          extractionMethod: batchForm.extractionMethod,
          kitLotNumber: batchForm.kitLotNumber,
          kitExpiryDate: batchForm.kitExpiryDate,
          wells: wells,
          sampleCount: selectedSamples.length,
          lysisTime: batchForm.lysisTime,
          lysisTemperature: batchForm.lysisTemperature,
          incubationTime: batchForm.incubationTime,
          centrifugeSpeed: batchForm.centrifugeSpeed,
          centrifugeTime: batchForm.centrifugeTime,
          elutionVolume: batchForm.elutionVolume,
          notes: batchForm.notes
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSnackbar({
          open: true,
          message: `Extraction batch ${data.data.batchNumber} created successfully`,
          severity: 'success'
        });
        setCreateBatchOpen(false);
        setSelectedSamples([]);
        await refreshData();
      } else {
        throw new Error('Failed to create extraction batch');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to create extraction batch',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const addQuantificationResult = async () => {
    try {
      const response = await fetch(`${API_URL}/extraction/quantification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extractionBatchId: activeBatch.id,
          ...quantificationData
        })
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Quantification result added successfully',
          severity: 'success'
        });
        setQuantificationOpen(false);
        setQuantificationData({
          sampleId: '',
          wellPosition: '',
          dnaConcentration: '',
          purity260280: '',
          purity260230: '',
          volumeRecovered: '',
          qualityAssessment: 'Good',
          quantificationMethod: 'NanoDrop',
          extractionEfficiency: '',
          inhibitionDetected: false,
          reextractionRequired: false,
          notes: ''
        });
        await refreshData();
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to add quantification result',
        severity: 'error'
      });
    }
  };

  const completeExtractionBatch = async (batch) => {
    try {
      const response = await fetch(`${API_URL}/extraction/complete-batch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchId: batch.id,
          qualityControlPassed: true,
          notes: 'Batch completed successfully'
        })
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `Extraction batch ${batch.batch_number} completed successfully`,
          severity: 'success'
        });
        await refreshData();
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to complete extraction batch',
        severity: 'error'
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'active': 'warning',
      'lysis': 'info',
      'incubation': 'primary',
      'centrifuge': 'secondary',
      'elution': 'success',
      'quantification': 'default',
      'completed': 'success',
      'failed': 'error'
    };
    return statusColors[status] || 'default';
  };

  const getQualityColor = (quality) => {
    const qualityColors = {
      'Good': 'success',
      'Degraded': 'warning',
      'Failed': 'error',
      'Inhibited': 'warning'
    };
    return qualityColors[quality] || 'default';
  };

  const isSelected = (sampleId) => {
    return selectedSamples.some(s => s.id === sampleId);
  };

  const allSamplesSelected = pendingSamples.length > 0 && selectedSamples.length === pendingSamples.length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <Science sx={{ mr: 2, verticalAlign: 'middle' }} />
            DNA Extraction
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Extract and purify DNA from collected samples
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedSamples.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => setCreateBatchOpen(true)}
              disabled={loading}
            >
              Create Extraction Batch ({selectedSamples.length})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={refreshData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardContent>
          <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab 
              label={
                <Badge badgeContent={pendingSamples.length} color="primary">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule />
                    Pending Samples
                  </Box>
                </Badge>
              }
            />
            <Tab 
              label={
                <Badge badgeContent={extractionBatches.filter(b => b.status === 'active').length} color="warning">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Science />
                    Active Batches
                  </Box>
                </Badge>
              }
            />
            <Tab 
              label={
                <Badge badgeContent={extractionBatches.filter(b => b.status === 'completed').length} color="success">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle />
                    Completed Batches
                  </Box>
                </Badge>
              }
            />
          </Tabs>

          {/* Pending Samples Tab */}
          {activeTab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Samples Ready for Extraction ({pendingSamples.length})
                </Typography>
                {pendingSamples.length > 0 && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={allSamplesSelected}
                        indeterminate={selectedSamples.length > 0 && selectedSamples.length < pendingSamples.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    }
                    label="Select All"
                  />
                )}
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={allSamplesSelected}
                            indeterminate={selectedSamples.length > 0 && selectedSamples.length < pendingSamples.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            disabled={pendingSamples.length === 0}
                          />
                        </TableCell>
                        <TableCell>Lab Number</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Case Number</TableCell>
                        <TableCell>Collection Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Sample Type</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingSamples.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                            <Typography color="text.secondary">
                              No samples ready for extraction
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingSamples.map((sample) => (
                          <TableRow key={sample.id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected(sample.id)}
                                onChange={(e) => handleSampleSelection(sample, e.target.checked)}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'medium' }}>
                              {sample.lab_number}
                            </TableCell>
                            <TableCell>{sample.name} {sample.surname}</TableCell>
                            <TableCell>{sample.case_number || 'N/A'}</TableCell>
                            <TableCell>{formatDate(sample.collection_date)}</TableCell>
                            <TableCell>
                              <Chip
                                label={sample.workflow_status?.replace(/_/g, ' ').toUpperCase()}
                                color="default"
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{sample.sample_type || 'Buccal Swab'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Active Batches Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Active Extraction Batches ({extractionBatches.filter(b => b.status === 'active').length})
              </Typography>
              
              {extractionBatches.filter(b => b.status === 'active').map((batch) => (
                <Accordion key={batch.id} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                      <Box>
                        <Typography variant="h6">{batch.batch_number}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {batch.extraction_method} • {batch.operator} • {formatDate(batch.extraction_date)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={batch.status}
                          color={getStatusColor(batch.status)}
                          size="small"
                        />
                        <Chip
                          label={`${batch.total_samples} samples`}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>Extraction Parameters</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="body2">Method: {batch.extraction_method}</Typography>
                          <Typography variant="body2">Kit Lot: {batch.kit_lot_number}</Typography>
                          <Typography variant="body2">Lysis Time: {batch.lysis_time} min @ {batch.lysis_temperature}°C</Typography>
                          <Typography variant="body2">Centrifuge: {batch.centrifuge_speed} rpm for {batch.centrifuge_time} min</Typography>
                          <Typography variant="body2">Elution Volume: {batch.elution_volume} μL</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>Actions</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            startIcon={<Analytics />}
                            onClick={() => {
                              setActiveBatch(batch);
                              setQuantificationOpen(true);
                            }}
                          >
                            Add Results
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => window.open(`#/extraction-batch/${batch.id}`, '_blank')}
                          >
                            View Details
                          </Button>
                          <Button
                            size="small"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={() => completeExtractionBatch(batch)}
                          >
                            Complete
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                    {batch.notes && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Notes</Typography>
                        <Typography variant="body2">{batch.notes}</Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}

              {extractionBatches.filter(b => b.status === 'active').length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    No active extraction batches
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Completed Batches Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Completed Extraction Batches ({extractionBatches.filter(b => b.status === 'completed').length})
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Batch Number</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Operator</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Samples</TableCell>
                      <TableCell>QC Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {extractionBatches.filter(b => b.status === 'completed').map((batch) => (
                      <TableRow key={batch.id} hover>
                        <TableCell sx={{ fontWeight: 'medium' }}>
                          {batch.batch_number}
                        </TableCell>
                        <TableCell>{batch.extraction_method}</TableCell>
                        <TableCell>{batch.operator}</TableCell>
                        <TableCell>{formatDate(batch.extraction_date)}</TableCell>
                        <TableCell>{batch.total_samples}</TableCell>
                        <TableCell>
                          <Chip
                            label={batch.quality_control_passed ? 'Passed' : 'Pending'}
                            color={batch.quality_control_passed ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => window.open(`#/extraction-batch/${batch.id}`, '_blank')}
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton size="small">
                              <Print />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {extractionBatches.filter(b => b.status === 'completed').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No completed extraction batches
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Batch Dialog */}
      <Dialog
        open={createBatchOpen}
        onClose={() => setCreateBatchOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create DNA Extraction Batch
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Operator"
                value={batchForm.operator}
                onChange={(e) => setBatchForm(prev => ({ ...prev, operator: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Extraction Method</InputLabel>
                <Select
                  value={batchForm.extractionMethod}
                  onChange={(e) => handleMethodChange(e.target.value)}
                  label="Extraction Method"
                >
                  {Object.entries(extractionMethods).map(([key, method]) => (
                    <MenuItem key={key} value={key}>
                      {method.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Kit Lot Number"
                value={batchForm.kitLotNumber}
                onChange={(e) => setBatchForm(prev => ({ ...prev, kitLotNumber: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Kit Expiry Date"
                type="date"
                value={batchForm.kitExpiryDate}
                onChange={(e) => setBatchForm(prev => ({ ...prev, kitExpiryDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Extraction Parameters
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Lysis Time (min)"
                type="number"
                value={batchForm.lysisTime}
                onChange={(e) => setBatchForm(prev => ({ ...prev, lysisTime: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Lysis Temperature (°C)"
                type="number"
                step="0.1"
                value={batchForm.lysisTemperature}
                onChange={(e) => setBatchForm(prev => ({ ...prev, lysisTemperature: parseFloat(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Incubation Time (min)"
                type="number"
                value={batchForm.incubationTime}
                onChange={(e) => setBatchForm(prev => ({ ...prev, incubationTime: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Centrifuge Speed (rpm)"
                type="number"
                value={batchForm.centrifugeSpeed}
                onChange={(e) => setBatchForm(prev => ({ ...prev, centrifugeSpeed: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Centrifuge Time (min)"
                type="number"
                value={batchForm.centrifugeTime}
                onChange={(e) => setBatchForm(prev => ({ ...prev, centrifugeTime: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Elution Volume (μL)"
                type="number"
                value={batchForm.elutionVolume}
                onChange={(e) => setBatchForm(prev => ({ ...prev, elutionVolume: parseInt(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={batchForm.notes}
                onChange={(e) => setBatchForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>

          {selectedSamples.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Selected Samples ({selectedSamples.length})
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {selectedSamples.map((sample, index) => (
                  <Chip
                    key={sample.id}
                    label={`${sample.lab_number} - ${sample.name} ${sample.surname}`}
                    sx={{ m: 0.5 }}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateBatchOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createExtractionBatch}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Add />}
          >
            Create Batch
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quantification Dialog */}
      <Dialog
        open={quantificationOpen}
        onClose={() => setQuantificationOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add DNA Quantification Results</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Well Position"
                value={quantificationData.wellPosition}
                onChange={(e) => setQuantificationData(prev => ({ ...prev, wellPosition: e.target.value }))}
                placeholder="e.g., A01"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="DNA Concentration (ng/μL)"
                type="number"
                step="0.1"
                value={quantificationData.dnaConcentration}
                onChange={(e) => setQuantificationData(prev => ({ ...prev, dnaConcentration: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="260/280 Purity Ratio"
                type="number"
                step="0.01"
                value={quantificationData.purity260280}
                onChange={(e) => setQuantificationData(prev => ({ ...prev, purity260280: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="260/230 Purity Ratio"
                type="number"
                step="0.01"
                value={quantificationData.purity260230}
                onChange={(e) => setQuantificationData(prev => ({ ...prev, purity260230: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Volume Recovered (μL)"
                type="number"
                value={quantificationData.volumeRecovered}
                onChange={(e) => setQuantificationData(prev => ({ ...prev, volumeRecovered: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Quality Assessment</InputLabel>
                <Select
                  value={quantificationData.qualityAssessment}
                  onChange={(e) => setQuantificationData(prev => ({ ...prev, qualityAssessment: e.target.value }))}
                  label="Quality Assessment"
                >
                  <MenuItem value="Good">Good</MenuItem>
                  <MenuItem value="Degraded">Degraded</MenuItem>
                  <MenuItem value="Failed">Failed</MenuItem>
                  <MenuItem value="Inhibited">Inhibited</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Quantification Method</InputLabel>
                <Select
                  value={quantificationData.quantificationMethod}
                  onChange={(e) => setQuantificationData(prev => ({ ...prev, quantificationMethod: e.target.value }))}
                  label="Quantification Method"
                >
                  <MenuItem value="NanoDrop">NanoDrop</MenuItem>
                  <MenuItem value="Qubit">Qubit</MenuItem>
                  <MenuItem value="PicoGreen">PicoGreen</MenuItem>
                  <MenuItem value="Agarose Gel">Agarose Gel</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Extraction Efficiency (%)"
                type="number"
                step="0.1"
                value={quantificationData.extractionEfficiency}
                onChange={(e) => setQuantificationData(prev => ({ ...prev, extractionEfficiency: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={quantificationData.inhibitionDetected}
                    onChange={(e) => setQuantificationData(prev => ({ ...prev, inhibitionDetected: e.target.checked }))}
                  />
                }
                label="Inhibition Detected"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={quantificationData.reextractionRequired}
                    onChange={(e) => setQuantificationData(prev => ({ ...prev, reextractionRequired: e.target.checked }))}
                  />
                }
                label="Re-extraction Required"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={quantificationData.notes}
                onChange={(e) => setQuantificationData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuantificationOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={addQuantificationResult}
            startIcon={<Save />}
          >
            Save Results
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DNAExtraction;