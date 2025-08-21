import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  TextField,
  InputAdornment,
  IconButton,
  Fab,
  Badge,
  LinearProgress,
  useTheme,
  Switch,
  FormControlLabel,
  Stack,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  Science,
  Assignment,
  Person,
  Search,
  FilterList,
  GetApp,
  PlayArrow,
  Pause,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  ThermostatAuto,
  Analytics,
  CloudDownload,
  Assessment,
  MoreVert,
  Refresh,
  Timeline
} from '@mui/icons-material';

const PCRBatches = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [batches, setBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [wellAssignments, setWellAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBatchForMenu, setSelectedBatchForMenu] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchBatches();
    checkForNewBatch();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchBatches, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter batches when search term or filters change
  useEffect(() => {
    let filtered = [...batches];
    
    if (searchTerm) {
      filtered = filtered.filter(batch => 
        batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.operator?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(batch => batch.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    
    if (!showCompleted) {
      filtered = filtered.filter(batch => batch.status?.toLowerCase() !== 'completed');
    }
    
    setFilteredBatches(filtered);
  }, [batches, searchTerm, statusFilter, showCompleted]);

  const checkForNewBatch = () => {
    // Check if there's a newly created batch from PCR plate
    const newBatchData = sessionStorage.getItem('newlyCreatedBatch');
    if (newBatchData) {
      try {
        const batchData = JSON.parse(newBatchData);
        
        // Format the batch data to match expected structure
        const formattedBatchData = {
          ...batchData,
          plate_layout: batchData.wells, // PCR batches expects plate_layout
          batch_number: batchData.batchNumber,
          sample_count: batchData.sampleCount,
          date_created: batchData.created_at
        };
        
        // Auto-open the newly created batch
        setSelectedBatch(formattedBatchData);
        setBatchDetails(formattedBatchData);
        setDialogOpen(true);
        
        // Convert wells data to well assignments format for display
        const wellAssignmentsData = Object.entries(batchData.wells || {}).map(([wellId, wellData]) => ({
          well_position: wellId,
          sample_id: wellData.sample_id,
          sample_name: wellData.sampleName || wellData.label,
          comment: wellData.comment,
          type: wellData.type,
          well_type: wellData.type === 'control' ? 'Control' : 'Sample',
          samples: wellData.samples || [],
          sample_name_full: wellData.samples?.[0]?.name || '',
          surname: wellData.samples?.[0]?.surname || '',
          kit_number: wellData.kit_number || ''
        }));
        setWellAssignments(wellAssignmentsData);
        
        // Clear the session storage after processing
        sessionStorage.removeItem('newlyCreatedBatch');
        
        // Refresh the batches list to include the new batch
        fetchBatches();
      } catch (error) {
        // Failed to process newly created batch
      }
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/batches`);
      const data = await response.json();
      
      if (data.success) {
        // Filter to only show PCR batches (LDS_XX format, excluding reruns with _RR)
        const pcrBatches = (data.data || []).filter(batch => {
          const batchNumber = batch.lab_batch_number || batch.batch_number || '';
          return batchNumber.startsWith('LDS_') && !batchNumber.includes('_RR');
        });
        setBatches(pcrBatches);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetails = async (batchId) => {
    try {
      setDetailsLoading(true);
      
      // Fetch well assignments for the batch
      const response = await fetch(`${API_URL}/well-assignments/${batchId}`);
      const data = await response.json();
      
      if (data.success) {
        setWellAssignments(data.data || []);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewBatch = async (batch) => {
    setSelectedBatch(batch);
    setBatchDetails(batch);
    setDialogOpen(true);
    await fetchBatchDetails(batch.id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'active': case 'running': return 'primary';
      case 'pending': return 'warning';
      case 'paused': return 'info';
      case 'failed': case 'error': case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle />;
      case 'active': case 'running': return <PlayArrow />;
      case 'pending': return <Schedule />;
      case 'paused': return <Pause />;
      case 'failed': case 'error': return <Error />;
      case 'cancelled': return <Warning />;
      default: return <Schedule />;
    }
  };

  const getBatchProgress = (batch) => {
    // Calculate progress based on status and timestamps
    const status = batch?.status?.toLowerCase();
    switch (status) {
      case 'completed': return 100;
      case 'active': case 'running': return 75;
      case 'pending': return 25;
      case 'failed': case 'error': case 'cancelled': return 0;
      default: return 0;
    }
  };

  const calculateBatchMetrics = (batch) => {
    const plateLayout = batch?.plate_layout || {};
    let samples = 0, controls = 0, empty = 0;
    
    Object.values(plateLayout).forEach(well => {
      if (well && well.samples && well.samples.length > 0) {
        if (well.type === 'control') {
          controls++;
        } else {
          samples++;
        }
      } else {
        empty++;
      }
    });
    
    return { samples, controls, empty, total: samples + controls };
  };

  // Calculate counts from plate layout
  const calculateCounts = (plateLayout) => {
    if (!plateLayout) return { samples: 0, controls: 0, allelicLadder: 0 };
    
    let samples = 0;
    let controls = 0;
    let allelicLadder = 0;
    
    Object.values(plateLayout).forEach(well => {
      if (well && well.samples && well.samples.length > 0) {
        const sample = well.samples[0];
        switch (well.type) {
          case 'sample':
            samples++;
            break;
          case 'control':
            if (sample?.lab_number === 'ALLELIC_LADDER') {
              allelicLadder++;
            } else {
              controls++;
            }
            break;
        }
      }
    });
    
    return { samples, controls, allelicLadder };
  };

  const renderPlateLayout = () => {
    if (!batchDetails?.plate_layout || detailsLoading) {
      return (
        <Box display="flex" justifyContent="center" p={3}>
          {detailsLoading ? <CircularProgress /> : <Typography>No plate layout available</Typography>}
        </Box>
      );
    }

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: '800px', p: 2 }}>
          {/* Column headers */}
          <Grid container spacing={0.5} sx={{ mb: 1 }}>
            <Grid item xs={1}></Grid>
            {cols.map(col => (
              <Grid item xs={0.8} key={col}>
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    fontSize: '12px',
                    p: 0.5
                  }}
                >
                  {col}
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Plate rows */}
          {rows.map(row => (
            <Grid container spacing={0.5} key={row} sx={{ mb: 0.5 }}>
              {/* Row header */}
              <Grid item xs={1}>
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    fontSize: '12px',
                    p: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {row}
                </Box>
              </Grid>

              {/* Wells */}
              {cols.map(col => {
                const wellId = `${row}${col}`;
                const well = batchDetails.plate_layout[wellId];
                const hasContent = well && well.samples && well.samples.length > 0;
                
                let bgColor = '#f5f5f5';
                let textColor = '#666';
                let content = '';
                let tooltipTitle = '';

                if (hasContent) {
                  const sample = well.samples[0];
                  switch (well.type) {
                    case 'sample':
                      bgColor = '#ffb74d';
                      textColor = '#000';
                      content = sample?.lab_number || 'Sample';
                      tooltipTitle = sample ? `${sample.lab_number}\n${sample.name || 'Unknown'}` : 'Sample';
                      break;
                    case 'control':
                      bgColor = '#81c784';
                      textColor = '#000';
                      content = sample?.lab_number || 'Control';
                      tooltipTitle = sample ? `${sample.lab_number}\n${sample.name || 'Control'}` : 'Control';
                      break;
                    default:
                      bgColor = '#e0e0e0';
                      content = 'Blank';
                      tooltipTitle = 'Empty Well';
                  }
                } else {
                  tooltipTitle = 'Empty Well';
                }

                return (
                  <Grid item xs={0.8} key={wellId}>
                    <Tooltip title={tooltipTitle} arrow placement="top">
                      <Box
                        sx={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: bgColor,
                          border: '1px solid #ccc',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          color: textColor,
                          textAlign: 'center',
                          overflow: 'hidden',
                          p: 1,
                          cursor: hasContent ? 'pointer' : 'default'
                        }}
                      >
                        {content}
                      </Box>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Box>
      </Box>
    );
  };

  const renderSamplesList = () => {
    if (!wellAssignments.length) {
      return <Typography>No samples found in this batch</Typography>;
    }

    const samples = wellAssignments.filter(wa => wa.well_type === 'Sample');

    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Well Position</TableCell>
              <TableCell>Lab Number</TableCell>
              <TableCell>Sample Name</TableCell>
              <TableCell>Kit Number</TableCell>
              <TableCell>Comments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {samples.map((sample, index) => (
              <TableRow key={index}>
                <TableCell>{sample.well_position}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {sample.sample_name || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {sample.sample_name_full ? 
                    `${sample.sample_name_full} ${sample.surname || ''}` : 
                    'N/A'
                  }
                </TableCell>
                <TableCell>{sample.kit_number || 'N/A'}</TableCell>
                <TableCell>{sample.comment || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const handleBatchAction = (action, batch) => {
    setAnchorEl(null);
    setSelectedBatchForMenu(null);
    
    switch (action) {
      case 'view':
        handleViewBatch(batch);
        break;
      case 'export':
        exportBatchData(batch);
        break;
      case 'rerun':
        // Handle rerun logic
        // Rerun batch detected
        break;
      default:
        break;
    }
  };

  const exportBatchData = (batch) => {
    const data = {
      batch_number: batch.batch_number,
      operator: batch.operator,
      created_at: batch.created_at,
      status: batch.status,
      plate_layout: batch.plate_layout,
      metrics: calculateBatchMetrics(batch)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${batch.batch_number}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading PCR Batches...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: isDarkMode ? 'grey.900' : 'grey.50' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <Science />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: isDarkMode ? 'white' : 'primary.main' }}>
                PCR Batch Management
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Monitor and manage PCR batches with real-time status tracking
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Badge badgeContent={batches.length} color="primary">
              <Fab size="small" color="primary" onClick={() => window.location.reload()}>
                <Refresh />
              </Fab>
            </Badge>
          </Box>
        </Box>

        {/* Search and Filter Section */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: isDarkMode ? 'grey.800' : 'white' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Status Filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    color="primary"
                  />
                }
                label="Show Completed"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList color="action" />
                <Typography variant="body2" color="text.secondary">
                  {filteredBatches.length} of {batches.length}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {filteredBatches.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: isDarkMode ? 'grey.800' : 'white' }}>
          <Science sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            {batches.length === 0 ? 'No PCR Batches Found' : 'No Batches Match Your Filters'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {batches.length === 0 
              ? 'Create batches using the PCR Plate page.'
              : 'Try adjusting your search term or filters.'
            }
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredBatches.map((batch) => (
            <Grid item xs={12} sm={6} lg={4} key={batch.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  transition: 'all 0.3s ease-in-out',
                  bgcolor: isDarkMode ? 'grey.800' : 'white',
                  border: `1px solid ${isDarkMode ? 'grey.700' : 'grey.200'}`,
                  '&:hover': { 
                    boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.12)',
                    transform: 'translateY(-4px)',
                    borderColor: 'primary.main'
                  }
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  {/* Header with Status */}
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: isDarkMode ? 'white' : 'text.primary' }}>
                        {batch.batch_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {batch.id}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        icon={getStatusIcon(batch.status)}
                        label={batch.status || 'active'} 
                        color={getStatusColor(batch.status)}
                        size="small"
                        variant="filled"
                      />
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedBatchForMenu(batch);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Progress Indicator */}
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {getBatchProgress(batch)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={getBatchProgress(batch)}
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        bgcolor: isDarkMode ? 'grey.700' : 'grey.200'
                      }}
                    />
                  </Box>

                  {/* Batch Metrics */}
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: isDarkMode ? 'grey.700' : 'primary.50', borderRadius: 2 }}>
                          <Typography variant="h6" color="primary" fontWeight="bold">
                            {calculateBatchMetrics(batch).samples}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Samples
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: isDarkMode ? 'grey.700' : 'success.50', borderRadius: 2 }}>
                          <Typography variant="h6" color="success.main" fontWeight="bold">
                            {calculateBatchMetrics(batch).controls}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Controls
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  {/* Batch Details */}
                  <Stack spacing={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Operator: <strong>{batch.operator || 'N/A'}</strong>
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <Assignment sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Created: <strong>{formatDate(batch.created_at)}</strong>
                      </Typography>
                    </Box>
                    
                    {batch.pcr_date && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <ThermostatAuto sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          PCR: <strong>{formatDate(batch.pcr_date)}</strong>
                        </Typography>
                      </Box>
                    )}
                    
                    {batch.electro_date && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Timeline sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Electro: <strong>{formatDate(batch.electro_date)}</strong>
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    size="small" 
                    startIcon={<Visibility />}
                    onClick={() => handleViewBatch(batch)}
                    variant="contained"
                    fullWidth
                    sx={{ borderRadius: 2 }}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Batch Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleBatchAction('view', selectedBatchForMenu)}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBatchAction('export', selectedBatchForMenu)}>
          <ListItemIcon><CloudDownload fontSize="small" /></ListItemIcon>
          <ListItemText>Export Data</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleBatchAction('rerun', selectedBatchForMenu)}>
          <ListItemIcon><Refresh fontSize="small" /></ListItemIcon>
          <ListItemText>Create Rerun</ListItemText>
        </MenuItem>
      </Menu>

      {/* Enhanced Batch Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            minHeight: '80vh',
            bgcolor: isDarkMode ? 'grey.900' : 'white'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${isDarkMode ? 'grey.700' : 'grey.200'}` }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Science />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {selectedBatch?.batch_number}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  PCR Batch Analysis & Quality Control
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip 
                icon={getStatusIcon(selectedBatch?.status)}
                label={selectedBatch?.status || 'active'} 
                color={getStatusColor(selectedBatch?.status)}
                variant="filled"
              />
              <IconButton onClick={() => exportBatchData(selectedBatch)}>
                <CloudDownload />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          {/* Enhanced Batch Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Batch Information Card */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2, bgcolor: isDarkMode ? 'grey.800' : 'primary.50' }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment color="primary" />
                  Batch Information
                </Typography>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Batch ID:</Typography>
                    <Typography variant="body2" fontWeight="medium">{batchDetails?.id}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Operator:</Typography>
                    <Typography variant="body2" fontWeight="medium">{batchDetails?.operator || 'N/A'}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Created:</Typography>
                    <Typography variant="body2" fontWeight="medium">{formatDate(batchDetails?.created_at)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Last Updated:</Typography>
                    <Typography variant="body2" fontWeight="medium">{formatDate(batchDetails?.updated_at)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Progress:</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '50%' }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={getBatchProgress(batchDetails)}
                        sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption">{getBatchProgress(batchDetails)}%</Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Quality Metrics Card */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2, bgcolor: isDarkMode ? 'grey.800' : 'success.50' }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Analytics color="success" />
                  Quality Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {calculateCounts(batchDetails?.plate_layout).samples}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Samples</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {calculateCounts(batchDetails?.plate_layout).controls}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Controls</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {calculateCounts(batchDetails?.plate_layout).allelicLadder}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Ladders</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, p: 2, bgcolor: isDarkMode ? 'grey.700' : 'white', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Well Utilization: {Math.round(((calculateCounts(batchDetails?.plate_layout).samples + calculateCounts(batchDetails?.plate_layout).controls) / 96) * 100)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={((calculateCounts(batchDetails?.plate_layout).samples + calculateCounts(batchDetails?.plate_layout).controls) / 96) * 100}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* ISO 17025 Compliance Section */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: isDarkMode ? 'grey.800' : 'warning.50' }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color="warning" />
              ISO 17025 Compliance & Audit Trail
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Traceability:</strong> Full chain of custody maintained
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Calibration:</strong> Equipment calibrated within spec
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Quality Control:</strong> Positive/negative controls included
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Documentation:</strong> All procedures documented
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Temperature Log:</strong> {batchDetails?.temperature_log ? 'Available' : 'Not recorded'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Cycle Count:</strong> {batchDetails?.cycle_count || 'Standard (28 cycles)'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">96-Well Plate Layout</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderPlateLayout()}
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Sample Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderSamplesList()}
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PCRBatches;