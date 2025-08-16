import React, { useState, useEffect, Fragment } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Button,
  InputAdornment,
  IconButton,
  Tooltip,
  Checkbox,
  Badge,
  Fab,
  Tabs,
  Tab,
  Snackbar,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  People as PeopleIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  PlaylistAdd as PlaylistAddIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearAllIcon,
  FlashOn,
  BarChart,
  CheckCircle,
  Schedule,
  Warning,
  Storage,
  ExpandMore,
  ExpandLess,
  FolderOpen,
  Folder,
  GroupWork,
  Upload as UploadIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { getStatusColor, formatDate } from '../../utils/statusHelpers';

// Backend API URL - Using relative URL to leverage Vite proxy
const API_BASE_URL = '';

export default function SampleManagement() {
  // Database view states (from ClientRegister)
  const [query, setQuery] = useState('');
  const [samples, setSamples] = useState([]);
  const [filteredSamples, setFilteredSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedSamples, setSelectedSamples] = useState(new Set());
  const [sampleTotals, setSampleTotals] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0
  });
  const [groupByKit, setGroupByKit] = useState(true); // Group by kit by default
  const [expandedKits, setExpandedKits] = useState(new Set()); // Track which kits are expanded
  
  // Filter states
  const [filters, setFilters] = useState({
    submissionDate: '',
    collectionDate: '',
    kitNumber: '',
    labNumber: '',
    workflowStatus: '',
    clientType: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Queue view states (from SampleQueues)
  const [activeTab, setActiveTab] = useState(0);
  const [queueCounts, setQueueCounts] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // View mode: 'database' or 'queues'
  const [viewMode, setViewMode] = useState('database');
  
  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState('');

  const queueTypes = [
    { id: 'all', label: 'All Samples', icon: BarChart, color: '#2196f3' },
    { id: 'pcr_ready', label: 'PCR Ready', icon: ScienceIcon, color: '#ff9800' },
    { id: 'pcr_batched', label: 'PCR Batched', icon: Schedule, color: '#ffeb3b' },
    { id: 'electro_ready', label: 'Electrophoresis Ready', icon: FlashOn, color: '#9c27b0' },
    { id: 'electro_batched', label: 'Electrophoresis Batched', icon: Warning, color: '#3f51b5' },
    { id: 'analysis_ready', label: 'Analysis Ready', icon: BarChart, color: '#e91e63' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: '#4caf50' }
  ];

  useEffect(() => {
    loadData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [viewMode, activeTab]);

  const loadData = async () => {
    if (viewMode === 'database') {
      await loadAllSamples();
    } else {
      await loadQueueData();
    }
  };

  // Database view functions
  const loadAllSamples = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = query ? `/api/samples/search?q=${encodeURIComponent(query)}` : '/api/samples?limit=200';
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        const samplesData = data.data || [];
        setSamples(samplesData);
        setFilteredSamples(samplesData); // Initially show all samples
        
        // Calculate totals
        const totals = {
          total: samplesData.length,
          pending: 0,
          processing: 0,
          completed: 0
        };
        
        samplesData.forEach(sample => {
          if (sample.workflow_status === 'sample_collected' || sample.workflow_status === 'pcr_ready') {
            totals.pending++;
          } else if (sample.workflow_status && sample.workflow_status.includes('batched')) {
            totals.processing++;
          } else if (sample.workflow_status === 'analysis_completed') {
            totals.completed++;
          }
        });
        
        setSampleTotals(totals);
      } else {
        setError(data.error || 'Failed to load samples');
      }
    } catch (err) {
      console.error('Error loading samples:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Queue view functions
  const loadQueueData = async () => {
    setLoading(true);
    try {
      // Load queue counts
      const countsResponse = await fetch(`${API_BASE_URL}/api/samples/queue-counts`);
      if (countsResponse.ok) {
        const countsData = await countsResponse.json();
        if (countsData.success) {
          setQueueCounts(countsData.data || {});
        }
      }

      // Load samples for active queue
      const queueType = queueTypes[activeTab].id;
      const endpoint = queueType === 'all' 
        ? '/api/samples' 
        : `/api/samples/queue/${queueType}`;
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSamples(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadAllSamples();
  };
  
  // Apply filters whenever filters or samples change
  useEffect(() => {
    let filtered = [...samples];
    
    // Apply submission date filter
    if (filters.submissionDate) {
      filtered = filtered.filter(sample => 
        sample.submission_date && sample.submission_date.startsWith(filters.submissionDate)
      );
    }
    
    // Apply collection date filter
    if (filters.collectionDate) {
      filtered = filtered.filter(sample => 
        sample.collection_date && sample.collection_date.startsWith(filters.collectionDate)
      );
    }
    
    // Apply kit number filter
    if (filters.kitNumber) {
      filtered = filtered.filter(sample => 
        sample.ref_kit_number && sample.ref_kit_number.toLowerCase().includes(filters.kitNumber.toLowerCase())
      );
    }
    
    // Apply lab number filter
    if (filters.labNumber) {
      filtered = filtered.filter(sample => 
        sample.lab_number && sample.lab_number.toLowerCase().includes(filters.labNumber.toLowerCase())
      );
    }
    
    // Apply workflow status filter
    if (filters.workflowStatus) {
      filtered = filtered.filter(sample => 
        sample.workflow_status === filters.workflowStatus
      );
    }
    
    // Apply client type filter
    if (filters.clientType) {
      filtered = filtered.filter(sample => 
        sample.client_type === filters.clientType
      );
    }
    
    setFilteredSamples(filtered);
  }, [filters, samples]);
  
  const clearFilters = () => {
    setFilters({
      submissionDate: '',
      collectionDate: '',
      kitNumber: '',
      labNumber: '',
      workflowStatus: '',
      clientType: ''
    });
  };

  const handleClearSearch = () => {
    setQuery('');
    loadAllSamples();
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    // Show success feedback
    setSnackbar({ 
      open: true, 
      message: 'Database refreshed successfully', 
      severity: 'success' 
    });
  };

  const handleSelectSample = (sampleLabNumber) => {
    const newSelected = new Set(selectedSamples);
    if (newSelected.has(sampleLabNumber)) {
      newSelected.delete(sampleLabNumber);
    } else {
      newSelected.add(sampleLabNumber);
    }
    setSelectedSamples(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSamples.size === samples.length) {
      setSelectedSamples(new Set());
    } else {
      setSelectedSamples(new Set(samples.map(s => s.lab_number)));
    }
  };

  const handleAddToPCRPlate = () => {
    if (selectedSamples.size === 0) {
      setSnackbar({
        open: true,
        message: 'Please select samples to add to PCR plate',
        severity: 'warning'
      });
      return;
    }

    // Store selected samples in sessionStorage for PCR Plate component
    const selectedSampleData = samples.filter(s => selectedSamples.has(s.lab_number));
    sessionStorage.setItem('selectedForPCR', JSON.stringify(selectedSampleData));
    
    setSnackbar({
      open: true,
      message: `${selectedSamples.size} samples ready for PCR plate. Navigate to PCR Plate to continue.`,
      severity: 'success'
    });
    
    // Clear selection
    setSelectedSamples(new Set());
  };

  const getWorkflowBadge = (status) => {
    const statusMap = {
      'sample_collected': { label: 'Collected', color: 'default' },
      'pcr_ready': { label: 'PCR Ready', color: 'warning' },
      'pcr_batched': { label: 'PCR Batched', color: 'info' },
      'pcr_completed': { label: 'PCR Done', color: 'primary' },
      'electro_ready': { label: 'Electro Ready', color: 'warning' },
      'electro_batched': { label: 'Electro Batched', color: 'info' },
      'electro_completed': { label: 'Electro Done', color: 'primary' },
      'analysis_ready': { label: 'Analysis Ready', color: 'warning' },
      'analysis_completed': { label: 'Completed', color: 'success' }
    };
    
    const config = statusMap[status] || { label: status || 'Unknown', color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // Group samples by kit/case number
  const groupSamplesByKit = (samplesList) => {
    const grouped = {};
    samplesList.forEach(sample => {
      const kitNumber = sample.case_number || 'NO_KIT';
      if (!grouped[kitNumber]) {
        grouped[kitNumber] = [];
      }
      grouped[kitNumber].push(sample);
    });
    return grouped;
  };

  // Toggle kit expansion
  const toggleKitExpansion = (kitNumber) => {
    const newExpanded = new Set(expandedKits);
    if (newExpanded.has(kitNumber)) {
      newExpanded.delete(kitNumber);
    } else {
      newExpanded.add(kitNumber);
    }
    setExpandedKits(newExpanded);
  };

  // Expand/collapse all kits
  const toggleAllKits = (expand) => {
    if (expand) {
      const allKits = Object.keys(groupSamplesByKit(samples));
      setExpandedKits(new Set(allKits));
    } else {
      setExpandedKits(new Set());
    }
  };

  // Select all samples in a kit
  const selectKitSamples = (kitSamples, select) => {
    const newSelected = new Set(selectedSamples);
    kitSamples.forEach(sample => {
      if (select) {
        newSelected.add(sample.lab_number);
      } else {
        newSelected.delete(sample.lab_number);
      }
    });
    setSelectedSamples(newSelected);
  };

  // Handle sample import
  const handleImport = async () => {
    if (!importData.trim()) {
      setSnackbar({
        open: true,
        message: 'Please paste sample data to import',
        severity: 'warning'
      });
      return;
    }

    try {
      const response = await fetch('/api/samples/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textData: importData })
      });

      const result = await response.json();
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Successfully imported ${result.data.successful} samples`,
          severity: 'success'
        });
        setImportDialogOpen(false);
        setImportData('');
        loadData(); // Reload samples
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Import failed',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setSnackbar({
        open: true,
        message: 'Failed to import samples',
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e3a5f', mb: 1 }}>
          Sample Management
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Comprehensive sample database and workflow queue management
        </Typography>
      </Box>

      {/* View Mode Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={viewMode}
          onChange={(e, newValue) => setViewMode(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            label="Sample Database" 
            value="database" 
            icon={<Storage />} 
            iconPosition="start"
          />
          <Tab 
            label="Workflow Queues" 
            value="queues" 
            icon={<TrendingUpIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Database View */}
      {viewMode === 'database' && (
        <>
          {/* Search and Stats Bar */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <form onSubmit={handleSearch}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Search by case number, name, lab number..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: query && (
                          <InputAdornment position="end">
                            <IconButton onClick={handleClearSearch} edge="end">
                              <ClearIcon />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </form>
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleRefresh}
                      startIcon={<RefreshIcon />}
                      disabled={loading}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setShowFilters(!showFilters)}
                      startIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
                    >
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Card sx={{ bgcolor: '#1e3a5f', color: 'white' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="h5" align="center">{sampleTotals.total}</Typography>
                      <Typography variant="caption" align="center" display="block">Total</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={3}>
                  <Card sx={{ bgcolor: '#f59e0b', color: 'white' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="h5" align="center">{sampleTotals.pending}</Typography>
                      <Typography variant="caption" align="center" display="block">Pending</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={3}>
                  <Card sx={{ bgcolor: '#3b82f6', color: 'white' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="h5" align="center">{sampleTotals.processing}</Typography>
                      <Typography variant="caption" align="center" display="block">Processing</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={3}>
                  <Card sx={{ bgcolor: '#10b981', color: 'white' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="h5" align="center">{sampleTotals.completed}</Typography>
                      <Typography variant="caption" align="center" display="block">Completed</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Advanced Filters */}
          {showFilters && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Advanced Filters</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Submission Date"
                      type="date"
                      value={filters.submissionDate}
                      onChange={(e) => setFilters({...filters, submissionDate: e.target.value})}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton 
                              edge="end" 
                              size="small"
                              onClick={(e) => {
                                const input = e.currentTarget.parentElement.parentElement.querySelector('input');
                                if (input && input.showPicker) {
                                  input.showPicker();
                                }
                              }}
                            >
                              <CalendarIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                        inputProps: {
                          style: { cursor: 'pointer' },
                          onClick: (e) => e.target.showPicker && e.target.showPicker()
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Collection Date"
                      type="date"
                      value={filters.collectionDate}
                      onChange={(e) => setFilters({...filters, collectionDate: e.target.value})}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton 
                              edge="end" 
                              size="small"
                              onClick={(e) => {
                                const input = e.currentTarget.parentElement.parentElement.querySelector('input');
                                if (input && input.showPicker) {
                                  input.showPicker();
                                }
                              }}
                            >
                              <CalendarIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                        inputProps: {
                          style: { cursor: 'pointer' },
                          onClick: (e) => e.target.showPicker && e.target.showPicker()
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Kit Number"
                      value={filters.kitNumber}
                      onChange={(e) => setFilters({...filters, kitNumber: e.target.value})}
                      placeholder="e.g. BN-001"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Lab Number"
                      value={filters.labNumber}
                      onChange={(e) => setFilters({...filters, labNumber: e.target.value})}
                      placeholder="e.g. 25_001"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Workflow Status"
                      select
                      value={filters.workflowStatus}
                      onChange={(e) => setFilters({...filters, workflowStatus: e.target.value})}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="sample_collected">Sample Collected</MenuItem>
                      <MenuItem value="pcr_ready">PCR Ready</MenuItem>
                      <MenuItem value="pcr_batched">PCR Batched</MenuItem>
                      <MenuItem value="pcr_completed">PCR Completed</MenuItem>
                      <MenuItem value="electro_ready">Electro Ready</MenuItem>
                      <MenuItem value="electro_batched">Electro Batched</MenuItem>
                      <MenuItem value="electro_completed">Electro Completed</MenuItem>
                      <MenuItem value="analysis_ready">Analysis Ready</MenuItem>
                      <MenuItem value="analysis_completed">Analysis Completed</MenuItem>
                      <MenuItem value="report_generated">Report Generated</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Client Type"
                      select
                      value={filters.clientType}
                      onChange={(e) => setFilters({...filters, clientType: e.target.value})}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="peace_of_mind">Peace of Mind</MenuItem>
                      <MenuItem value="legal">Legal</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={clearFilters}
                      startIcon={<ClearIcon />}
                    >
                      Clear All Filters
                    </Button>
                    {Object.values(filters).some(f => f) && (
                      <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                        Showing {filteredSamples.length} of {samples.length} samples
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setImportDialogOpen(true)}
              color="success"
            >
              Import Samples
            </Button>
            <Button
              variant={groupByKit ? "contained" : "outlined"}
              startIcon={<GroupWork />}
              onClick={() => setGroupByKit(!groupByKit)}
              color="primary"
            >
              {groupByKit ? "Grouped by Kit" : "Group by Kit"}
            </Button>
            {groupByKit && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FolderOpen />}
                  onClick={() => toggleAllKits(true)}
                >
                  Expand All
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Folder />}
                  onClick={() => toggleAllKits(false)}
                >
                  Collapse All
                </Button>
              </>
            )}
            {selectedSamples.size > 0 && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlaylistAddIcon />}
                  onClick={handleAddToPCRPlate}
                >
                  Add {selectedSamples.size} to PCR Plate
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearAllIcon />}
                  onClick={() => setSelectedSamples(new Set())}
                >
                  Clear Selection
                </Button>
              </>
            )}
          </Box>

          {/* Debug info */}
          {samples.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Loaded {samples.length} samples in {Object.keys(groupSamplesByKit(samples)).length} kits
            </Alert>
          )}
          
          {/* Samples Table */}
          <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedSamples.size > 0 && selectedSamples.size < samples.length}
                      checked={samples.length > 0 && selectedSamples.size === samples.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Lab Number</TableCell>
                  <TableCell>Case Number</TableCell>
                  <TableCell>Client Name</TableCell>
                  <TableCell>Relation</TableCell>
                  <TableCell>Collection Date</TableCell>
                  <TableCell>Workflow Status</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Priority</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : samples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {query ? 'No samples found matching your search' : 'No samples in database'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : groupByKit ? (
                  // Grouped view
                  Object.entries(groupSamplesByKit(filteredSamples)).map(([kitNumber, kitSamples]) => {
                    const isExpanded = expandedKits.has(kitNumber);
                    const allSelected = kitSamples.every(s => selectedSamples.has(s.lab_number));
                    const someSelected = kitSamples.some(s => selectedSamples.has(s.lab_number));
                    
                    return (
                      <React.Fragment key={kitNumber}>
                        {/* Kit header row */}
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={someSelected && !allSelected}
                              checked={allSelected}
                              onChange={() => selectKitSamples(kitSamples, !allSelected)}
                            />
                          </TableCell>
                          <TableCell colSpan={8}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => toggleKitExpansion(kitNumber)}
                              >
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                              <Chip
                                icon={<ScienceIcon />}
                                label={`Kit: ${kitNumber}`}
                                color="primary"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Chip
                                label={`${kitSamples.length} samples`}
                                size="small"
                                variant="outlined"
                              />
                              {kitSamples[0]?.test_purpose && (
                                <Chip
                                  label={kitSamples[0].test_purpose}
                                  size="small"
                                  color="secondary"
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                        
                        {/* Individual samples in kit */}
                        {isExpanded && kitSamples.map((sample, index) => (
                          <TableRow 
                            key={sample.lab_number || `${kitNumber}-${index}`} 
                            hover
                            selected={selectedSamples.has(sample.lab_number)}
                            sx={{ pl: 4 }}
                          >
                            <TableCell padding="checkbox" sx={{ pl: 4 }}>
                              <Checkbox
                                checked={selectedSamples.has(sample.lab_number)}
                                onChange={() => handleSelectSample(sample.lab_number)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {sample.lab_number}
                              </Typography>
                            </TableCell>
                            <TableCell>{sample.case_number || '-'}</TableCell>
                            <TableCell>{`${sample.name} ${sample.surname}`}</TableCell>
                            <TableCell>
                              <Chip 
                                label={sample.relation || 'Unknown'} 
                                size="small" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{formatDate(sample.collection_date)}</TableCell>
                            <TableCell>{getWorkflowBadge(sample.workflow_status)}</TableCell>
                            <TableCell>
                              {sample.lab_batch_number ? (
                                <Chip 
                                  label={sample.lab_batch_number} 
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                />
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {sample.priority === 'urgent' && (
                                <Chip label="URGENT" color="error" size="small" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })
                ) : (
                  // Ungrouped view
                  filteredSamples.map((sample, index) => (
                    <TableRow 
                      key={sample.lab_number || `sample-${index}`} 
                      hover
                      selected={selectedSamples.has(sample.lab_number)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedSamples.has(sample.lab_number)}
                          onChange={() => handleSelectSample(sample.lab_number)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {sample.lab_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{sample.case_number || '-'}</TableCell>
                      <TableCell>{`${sample.name} ${sample.surname}`}</TableCell>
                      <TableCell>
                        <Chip 
                          label={sample.relation || 'Unknown'} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{formatDate(sample.collection_date)}</TableCell>
                      <TableCell>{getWorkflowBadge(sample.workflow_status)}</TableCell>
                      <TableCell>
                        {sample.lab_batch_number ? (
                          <Chip 
                            label={sample.lab_batch_number} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {sample.priority === 'urgent' && (
                          <Chip label="URGENT" color="error" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Queue View */}
      {viewMode === 'queues' && (
        <>
          {/* Queue Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {queueTypes.map((queue, index) => (
                <Tab
                  key={queue.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {queue.label}
                      {queueCounts[queue.id] !== undefined && (
                        <Chip 
                          label={queueCounts[queue.id] || 0} 
                          size="small" 
                          color={queueCounts[queue.id] > 0 ? 'primary' : 'default'}
                        />
                      )}
                    </Box>
                  }
                  icon={<queue.icon />}
                  iconPosition="start"
                />
              ))}
            </Tabs>
          </Paper>

          {/* Queue Actions */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh Queue
            </Button>
            {selectedSamples.size > 0 && activeTab === 1 && ( // PCR Ready tab
              <Button
                variant="contained"
                color="success"
                startIcon={<PlaylistAddIcon />}
                onClick={handleAddToPCRPlate}
              >
                Add {selectedSamples.size} to PCR Plate
              </Button>
            )}
          </Box>

          {/* Queue Table */}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {activeTab === 1 && ( // Only show checkbox for PCR Ready
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedSamples.size > 0 && selectedSamples.size < samples.length}
                        checked={samples.length > 0 && selectedSamples.size === samples.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                  )}
                  <TableCell>Lab Number</TableCell>
                  <TableCell>Case Number</TableCell>
                  <TableCell>Client Name</TableCell>
                  <TableCell>Days in Queue</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Current Status</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : samples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No samples in this queue
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  samples.map((sample) => {
                    const daysInQueue = sample.collection_date ? 
                      Math.floor((new Date() - new Date(sample.collection_date)) / (1000 * 60 * 60 * 24)) : 0;
                    
                    return (
                      <TableRow 
                        key={sample.id} 
                        hover
                        selected={selectedSamples.has(sample.id)}
                      >
                        {activeTab === 1 && (
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedSamples.has(sample.id)}
                              onChange={() => handleSelectSample(sample.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {sample.lab_number}
                          </Typography>
                        </TableCell>
                        <TableCell>{sample.case_number || '-'}</TableCell>
                        <TableCell>{`${sample.name} ${sample.surname}`}</TableCell>
                        <TableCell>
                          <Chip 
                            label={`${daysInQueue} days`}
                            size="small"
                            color={daysInQueue > 5 ? 'error' : daysInQueue > 3 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {sample.priority === 'urgent' && (
                            <Chip label="URGENT" color="error" size="small" />
                          )}
                        </TableCell>
                        <TableCell>{getWorkflowBadge(sample.workflow_status)}</TableCell>
                        <TableCell>{sample.notes || '-'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Import Dialog */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Samples</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Paste tab-delimited sample data from your spreadsheet. Format should include:
            Lab Number, Name, Surname, Relation, Collection Date, etc.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={10}
            placeholder="Paste your sample data here..."
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleImport} variant="contained" color="primary">
            Import
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}