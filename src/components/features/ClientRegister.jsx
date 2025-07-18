import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  Snackbar,
  Skeleton,
  LinearProgress,
  Pagination,
  FormGroup,
  useTheme
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  GetApp,
  Assignment,
  Science,
  PlaylistAdd,
  Group,
  Refresh,
  CloudOff,
  CloudDone,
  Warning
} from '@mui/icons-material';

import { api as optimizedApi } from '../../services/api';

export default function ClientRegister() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  
  // Dialog state
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [newBatchNumber, setNewBatchNumber] = useState('');
  
  // Status counts
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    pending: 0,
    pcrBatched: 0,
    electroBatched: 0,
    rerunBatched: 0,
    completed: 0,
    active: 0,
    // Legacy for backward compatibility
    processing: 0
  });

  useEffect(() => {
    fetchSamples();
    fetchStatusCounts();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }, 300); // 300ms debounce for search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        status: statusFilter,
        search: searchTerm
      };
      
      const data = await optimizedApi.getSamples(currentPage, pageSize, filters);
      
      if (data.success) {
        const samplesData = data.data || [];
        setSamples(samplesData);
        
        // Update pagination info
        if (data.pagination) {
          setTotalPages(data.pagination.pages);
          setTotalSamples(data.pagination.total);
        }
        
        setConnectionStatus(true);
        
        if (currentPage === 1) {
          setSnackbar({
            open: true,
            message: `Loaded ${samplesData.length} of ${data.pagination?.total || 0} Peace of Mind samples`,
            severity: 'success'
          });
        }
      } else {
        setError('Failed to fetch samples: ' + (data.error || 'Unknown error'));
        setConnectionStatus(false);
      }
    } catch (error) {
      setError('Error connecting to server: ' + error.message);
      setConnectionStatus(false);
      setSnackbar({
        open: true,
        message: 'Failed to load samples. Check connection.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, searchTerm]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const data = await optimizedApi.getSampleCounts();
      if (data.success) {
        setStatusCounts(data.data);
      }
    } catch (error) {
      console.warn('Failed to fetch status counts:', error);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    optimizedApi.clearCache(); // Clear cache to force fresh data
    await fetchSamples();
    await fetchStatusCounts();
    setIsRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'active':
        return 'primary';
      case 'processing':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getBatchStatus = (sample) => {
    if (sample.lab_batch_number?.includes('_RR')) {
      return { label: '🔄 Rerun Batched', color: 'error' };
    } else if (sample.lab_batch_number?.startsWith('LDS_')) {
      return { label: '🧬 PCR Batched', color: 'info' };
    } else if (sample.lab_batch_number?.startsWith('ELEC_')) {
      return { label: '⚡ Electro Batched', color: 'secondary' };
    } else if (sample.workflow_status === 'analysis_completed') {
      return { label: '✅ Completed', color: 'success' };
    } else if (sample.workflow_status === 'rerun_batched') {
      return { label: '🔄 Rerun Batched', color: 'error' };
    } else if (sample.batch_id || sample.workflow_status === 'pcr_batched') {
      return { label: '🧬 PCR Batched', color: 'info' };
    } else if (sample.workflow_status === 'electro_batched') {
      return { label: '⚡ Electro Batched', color: 'secondary' };
    } else if (sample.workflow_status === 'sample_collected' || sample.workflow_status === 'pcr_ready') {
      return { label: '📋 Pending', color: 'warning' };
    } else {
      return { label: 'N/A', color: 'default' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatLabNumber = (labNumber) => {
    if (!labNumber) return 'N/A';
    // Highlight the relation pattern
    return labNumber;
  };


  // Helper function to get samples from the same case in priority order
  const getCaseSamples = (caseNumber) => {
    if (!caseNumber) return [];
    
    const caseSamples = samples.filter(s => s.case_number === caseNumber);
    
    // Sort by relation priority: child first, then alleged_father, then mother
    const getRelationPriority = (relation) => {
      if (relation.startsWith('child')) return 1; // child(25_002)F -> 1
      if (relation === 'alleged_father') return 2;
      if (relation === 'mother') return 3;
      return 999; // unknown relations last
    };
    
    return caseSamples.sort((a, b) => {
      const aPriority = getRelationPriority(a.relation);
      const bPriority = getRelationPriority(b.relation);
      return aPriority - bPriority;
    });
  };

  const handleSampleSelect = (sample) => {
    setSelectedSamples(prev => {
      const isSelected = prev.some(s => s.id === sample.id);
      
      if (isSelected) {
        // If deselecting, remove all samples from this case
        if (sample.case_number) {
          return prev.filter(s => s.case_number !== sample.case_number);
        } else {
          // If no case number, just remove this sample
          return prev.filter(s => s.id !== sample.id);
        }
      } else {
        // If selecting, add all samples from this case in priority order
        if (sample.case_number) {
          const caseSamples = getCaseSamples(sample.case_number);
          // Remove any existing samples from this case first
          const withoutCase = prev.filter(s => s.case_number !== sample.case_number);
          // Add all case samples in priority order
          return [...withoutCase, ...caseSamples];
        } else {
          // If no case number, just add this sample
          return [...prev, sample];
        }
      }
    });
  };

  const handleSelectAll = () => {
    const availableSamples = samples.filter(s => 
      (s.status === 'pending' || s.status === 'active') && 
      !s.batch_id &&
      (s.workflow_status === 'sample_collected' || s.workflow_status === 'pcr_ready')
    );
    setSelectedSamples(availableSamples);
  };

  const handleDeselectAll = () => {
    setSelectedSamples([]);
  };

  const handleCreateBatch = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (selectedSamples.length === 0) {
      setError('Please select samples before creating a batch');
      return;
    }
    
    try {
      
      // Store selected samples in sessionStorage for the PCR Plate page
      sessionStorage.setItem('selectedSamplesForBatch', JSON.stringify(selectedSamples));
      
      
      // Navigate to PCR Plate page
      navigate('/pcr-plate', { replace: true });
      
    } catch (error) {
      setError('Error navigating to PCR plate: ' + error.message);
    }
  };

  const handleBatchAssignment = async () => {
    try {
      // In a real app, this would call the API to assign samples to batch
      const response = await fetch(`${optimizedApi.baseURL}/api/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchNumber: newBatchNumber,
          sampleIds: selectedSamples.map(s => s.id),
          plateName: `pcr batch`,
          operator: 'Current User'
        }),
      });

      if (response.ok) {
        // Update local state
        setSamples(prev => prev.map(sample => {
          if (selectedSamples.some(s => s.id === sample.id)) {
            return { ...sample, batch_id: newBatchNumber, status: 'processing' };
          }
          return sample;
        }));
        
        setSelectedSamples([]);
        setBatchDialogOpen(false);
        setNewBatchNumber('');
      } else {
        throw new Error('Failed to create batch');
      }
    } catch (error) {
      setError('Error assigning samples to batch');
    }
  };

  const getPendingSamples = () => {
    return samples.filter(s => 
      (s.status === 'pending' || s.status === 'active') && 
      !s.batch_id &&
      (s.workflow_status === 'sample_collected' || s.workflow_status === 'pcr_ready')
    );
  };


  // Render samples table without case grouping
  const renderSamplesTable = () => (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox"></TableCell>
            <TableCell>Lab Number</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Surname</TableCell>
            <TableCell>Relation</TableCell>
            <TableCell>Batch Status</TableCell>
            <TableCell>Batch Number</TableCell>
            <TableCell>Collection Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {samples.map(sample => {
            // Check if this sample or any sample from its case is selected
            const isSelected = sample.case_number 
              ? selectedSamples.some(s => s.case_number === sample.case_number)
              : selectedSamples.some(s => s.id === sample.id);
            return (
              <TableRow
                key={sample.id}
                hover
                selected={isSelected}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: '#e3f2fd',
                    '&:hover': { backgroundColor: '#bbdefb' },
                  },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleSampleSelect(sample)}
                    sx={{
                      color: '#1976d2',
                      '&.Mui-checked': { color: '#1976d2' },
                    }}
                  />
                </TableCell>
                <TableCell>{formatLabNumber(sample.lab_number)}</TableCell>
                <TableCell>{sample.name}</TableCell>
                <TableCell>{sample.surname}</TableCell>
                <TableCell>{sample.relation}</TableCell>
                <TableCell>
                  <Chip 
                    label={getBatchStatus(sample).label} 
                    color={getBatchStatus(sample).color} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {sample.lab_batch_number || '-'}
                  </Typography>
                </TableCell>
                <TableCell>{formatDate(sample.collection_date)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderPagination = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalSamples)} of {totalSamples} samples
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small">
          <InputLabel>Per Page</InputLabel>
          <Select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            label="Per Page"
            sx={{ minWidth: 80 }}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={(event, page) => setCurrentPage(page)}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>Loading samples...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Connection Status Bar */}
      {!connectionStatus && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          icon={<CloudOff />}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Retrying...' : 'Retry'}
            </Button>
          }
        >
          Server connection lost. Some features may not work properly.
        </Alert>
      )}

      {/* Loading Progress Bar */}
      {(loading || isRefreshing) && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Header with Status Counts */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ 
              color: isDarkMode ? 'white' : '#0D488F', 
              fontWeight: 'bold' 
            }}>
              Peace of Mind Samples
            </Typography>
            {connectionStatus ? (
              <CloudDone sx={{ color: 'success.main' }} />
            ) : (
              <CloudOff sx={{ color: 'warning.main' }} />
            )}
          </Box>
          
          <Button
            variant="outlined"
            startIcon={isRefreshing ? <CircularProgress size={20} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={isRefreshing}
            sx={{ minWidth: 120 }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {/* Status Count Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={2.4}>
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
              cursor: 'pointer',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              '&:hover': { 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
              }
            }} onClick={() => setStatusFilter('all')}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" sx={{ 
                  fontWeight: 'bold', 
                  color: isDarkMode ? 'white' : '#1a1a1a', 
                  mb: 0.5 
                }}>
                  {statusCounts.total}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                  fontWeight: 500 
                }}>
                  📊 Total Samples
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={2.4}>
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
              cursor: 'pointer',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              borderLeft: '4px solid #ffa726',
              '&:hover': { 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
              }
            }} onClick={() => setStatusFilter('pending')}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" sx={{ 
                  fontWeight: 'bold', 
                  color: isDarkMode ? 'white' : '#1a1a1a', 
                  mb: 0.5 
                }}>
                  {statusCounts.pending}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                  fontWeight: 500 
                }}>
                  📋 Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={2.4}>
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
              cursor: 'pointer',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              borderLeft: '4px solid #42a5f5',
              '&:hover': { 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
              }
            }} onClick={() => setStatusFilter('pcr_batched')}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" sx={{ 
                  fontWeight: 'bold', 
                  color: isDarkMode ? 'white' : '#1a1a1a', 
                  mb: 0.5 
                }}>
                  {statusCounts.pcrBatched}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                  fontWeight: 500 
                }}>
                  🧬 PCR Batched
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={2.4}>
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
              cursor: 'pointer',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              borderLeft: '4px solid #ab47bc',
              '&:hover': { 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
              }
            }} onClick={() => setStatusFilter('electro_batched')}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" sx={{ 
                  fontWeight: 'bold', 
                  color: isDarkMode ? 'white' : '#1a1a1a', 
                  mb: 0.5 
                }}>
                  {statusCounts.electroBatched}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                  fontWeight: 500 
                }}>
                  ⚡ Electro Batched
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={2.4}>
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white', 
              cursor: 'pointer',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              borderLeft: '4px solid #ef5350',
              '&:hover': { 
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f8f9fa',
                boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)' 
              }
            }} onClick={() => setStatusFilter('rerun_batched')}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" sx={{ 
                  fontWeight: 'bold', 
                  color: isDarkMode ? 'white' : '#1a1a1a', 
                  mb: 0.5 
                }}>
                  {statusCounts.rerunBatched}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666666', 
                  fontWeight: 500 
                }}>
                  🔄 Rerun Batched
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Filter Controls Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Group />}
            onClick={handleSelectAll}
            disabled={samples.length === 0}
          >
            Select All Pending
          </Button>
        </Box>
      </Box>

      {selectedSamples.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
          <Chip 
            label={`${selectedSamples.length} selected`} 
            color="primary" 
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            💡 Family groups selected together
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlaylistAdd />}
            onClick={handleCreateBatch}
            sx={{ bgcolor: '#0D488F' }}
            disabled={selectedSamples.length === 0}
          >
            Create PCR Batch ({selectedSamples.length} selected)
          </Button>
          <Button
            variant="outlined"
            onClick={handleDeselectAll}
          >
            Deselect All
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              navigate('/pcr-plate');
            }}
            sx={{ ml: 1 }}
          >
            Test Navigation
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}


      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              placeholder="Search by lab number, name, or case number..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Stack spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                onClick={fetchSamples}
                startIcon={<FilterList />}
              >
                Refresh
              </Button>
              {getPendingSamples().length > 0 && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSelectAll}
                  startIcon={<Group />}
                  sx={{ bgcolor: '#0D488F', fontSize: '0.75rem' }}
                >
                  Select All Pending
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Samples Table */}
      {renderSamplesTable()}
      {renderPagination()}

      {/* Summary */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {samples.length} of {totalSamples} total samples
        </Typography>
      </Box>

      {/* Batch Creation Dialog */}
      <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Create PCR Batch
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Batch Number"
              value={newBatchNumber}
              onChange={(e) => setNewBatchNumber(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Format: LDS_[number]"
            />
            
            <Typography variant="h6" sx={{ mb: 2 }}>
              Selected Samples ({selectedSamples.length})
            </Typography>
            
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {selectedSamples.map(sample => (
                <Box key={sample.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip 
                    label={sample.lab_number} 
                    size="small" 
                    variant="outlined"
                  />
                  <Typography variant="body2">
                    {sample.name} {sample.surname} ({sample.relation})
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              • Samples with the same case number will be kept together
              • Plate will be named "pcr batch"
              • Batch format: {newBatchNumber}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleBatchAssignment}
            disabled={!newBatchNumber.trim()}
          >
            Create Batch
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
    </Box>
  );
}