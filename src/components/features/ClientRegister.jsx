import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  GetApp,
  Assignment,
  Science,
  PlaylistAdd,
  Group
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ClientRegister() {
  const navigate = useNavigate();
  const [samples, setSamples] = useState([]);
  const [filteredSamples, setFilteredSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [sampleGroups, setSampleGroups] = useState([]);

  useEffect(() => {
    fetchSamples();
  }, []);

  useEffect(() => {
    filterSamples();
  }, [samples, searchTerm, statusFilter, batchFilter]);

  const fetchSamples = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/samples`);
      const data = await response.json();
      
      if (data.success) {
        setSamples(data.data || []);
      } else {
        setError('Failed to fetch samples');
      }
    } catch (error) {
      console.error('Error fetching samples:', error);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const filterSamples = () => {
    let filtered = [...samples];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sample =>
        sample.lab_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.case_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sample => sample.status === statusFilter);
    }

    // Batch filter
    if (batchFilter === 'to_be_batched') {
      filtered = filtered.filter(sample => sample.status === 'pending' && !sample.batch_id);
    } else if (batchFilter === 'batched') {
      filtered = filtered.filter(sample => sample.batch_id);
    }

    setFilteredSamples(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
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
    if (sample.batch_id) {
      return { label: 'Batched', color: 'success' };
    } else if (sample.status === 'pending') {
      return { label: 'To be Batched', color: 'warning' };
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

  const groupSamplesByCase = (samples) => {
    const groups = {};
    samples.forEach(sample => {
      if (sample.case_number) {
        if (!groups[sample.case_number]) {
          groups[sample.case_number] = [];
        }
        groups[sample.case_number].push(sample);
      }
    });
    return groups;
  };

  const handleSampleSelect = (sample) => {
    const caseNumber = sample.case_number;
    if (!caseNumber) {
      // Individual sample selection
      setSelectedSamples(prev => {
        const isSelected = prev.some(s => s.id === sample.id);
        if (isSelected) {
          return prev.filter(s => s.id !== sample.id);
        } else {
          return [...prev, sample];
        }
      });
    } else {
      // Group selection by case
      const caseGroup = filteredSamples.filter(s => s.case_number === caseNumber);
      const isGroupSelected = caseGroup.every(s => selectedSamples.some(selected => selected.id === s.id));
      
      setSelectedSamples(prev => {
        if (isGroupSelected) {
          // Remove all samples from this case
          return prev.filter(s => s.case_number !== caseNumber);
        } else {
          // Add all samples from this case
          const nonCaseSelected = prev.filter(s => s.case_number !== caseNumber);
          return [...nonCaseSelected, ...caseGroup];
        }
      });
    }
  };

  const handleSelectAll = () => {
    const pendingSamples = filteredSamples.filter(s => s.status === 'pending' && !s.batch_id);
    setSelectedSamples(pendingSamples);
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
      console.log('Creating batch with samples:', selectedSamples.length);
      console.log('Selected samples:', selectedSamples);
      
      // Store selected samples in sessionStorage for the PCR Plate page
      sessionStorage.setItem('selectedSamplesForBatch', JSON.stringify(selectedSamples));
      
      console.log('Stored in sessionStorage, now navigating...');
      
      // Navigate to PCR Plate page
      navigate('/pcr-plate', { replace: true });
      
      console.log('Navigate command executed');
    } catch (error) {
      console.error('Navigation error:', error);
      setError('Error navigating to PCR plate: ' + error.message);
    }
  };

  const handleBatchAssignment = async () => {
    try {
      // In a real app, this would call the API to assign samples to batch
      const response = await fetch(`${API_URL}/api/batches`, {
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
    return filteredSamples.filter(s => s.status === 'pending' && !s.batch_id);
  };

  const stats = {
    total: samples.length,
    pending: samples.filter(s => s.status === 'pending').length,
    processing: samples.filter(s => s.status === 'processing').length,
    completed: samples.filter(s => s.status === 'completed').length,
    toBeBatched: samples.filter(s => s.status === 'pending' && !s.batch_id).length,
    batched: samples.filter(s => s.batch_id).length
  };

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
          Samples
        </Typography>
        
        {selectedSamples.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip 
              label={`${selectedSamples.length} selected`} 
              color="primary" 
              variant="outlined"
            />
            <Button
              variant="contained"
              startIcon={<PlaylistAdd />}
              onClick={handleCreateBatch}
              sx={{ bgcolor: '#1e4976' }}
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
                console.log('Test navigation button clicked');
                navigate('/pcr-plate');
              }}
              sx={{ ml: 1 }}
            >
              Test Navigation
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total Samples</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
              <Typography variant="body2" color="text.secondary">Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">{stats.processing}</Typography>
              <Typography variant="body2" color="text.secondary">Processing</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{stats.completed}</Typography>
              <Typography variant="body2" color="text.secondary">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">{stats.toBeBatched}</Typography>
              <Typography variant="body2" color="text.secondary">To be Batched</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">{stats.batched}</Typography>
              <Typography variant="body2" color="text.secondary">Batched</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Batch Status</InputLabel>
              <Select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                label="Batch Status"
              >
                <MenuItem value="all">All Samples</MenuItem>
                <MenuItem value="to_be_batched">To be Batched</MenuItem>
                <MenuItem value="batched">Batched</MenuItem>
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
                  sx={{ bgcolor: '#1e4976', fontSize: '0.75rem' }}
                >
                  Select All Pending
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Samples Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedSamples.length > 0 && selectedSamples.length < getPendingSamples().length}
                  checked={getPendingSamples().length > 0 && selectedSamples.length === getPendingSamples().length}
                  onChange={selectedSamples.length === getPendingSamples().length ? handleDeselectAll : handleSelectAll}
                />
              </TableCell>
              <TableCell><strong>Lab Number</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Relation</strong></TableCell>
              <TableCell><strong>Collection Date</strong></TableCell>
              <TableCell><strong>Submission Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Batch Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSamples.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No samples found matching your criteria
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSamples.map((sample) => {
                const batchStatus = getBatchStatus(sample);
                const isSelected = selectedSamples.some(s => s.id === sample.id);
                const isPending = sample.status === 'pending' && !sample.batch_id;
                return (
                  <TableRow key={sample.id} hover selected={isSelected}>
                    <TableCell padding="checkbox">
                      {isPending && (
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSampleSelect(sample)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {formatLabNumber(sample.lab_number)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {sample.name} {sample.surname}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {sample.relation || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(sample.collection_date)}</TableCell>
                    <TableCell>{formatDate(sample.submission_date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={sample.status || 'Unknown'}
                        color={getStatusColor(sample.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={batchStatus.label}
                        color={batchStatus.color}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" color="primary">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        {sample.status === 'pending' && !sample.batch_id && (
                          <Tooltip title="Add to Batch">
                            <IconButton size="small" color="secondary">
                              <Assignment />
                            </IconButton>
                          </Tooltip>
                        )}
                        {sample.status === 'completed' && (
                          <Tooltip title="Download Report">
                            <IconButton size="small" color="success">
                              <GetApp />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredSamples.length} of {samples.length} total samples
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
              {Object.entries(groupSamplesByCase(selectedSamples)).map(([caseNumber, caseSamples]) => (
                <Paper key={caseNumber} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                    Case: {caseNumber}
                  </Typography>
                  <Grid container spacing={1}>
                    {caseSamples.map(sample => (
                      <Grid item xs={12} sm={6} key={sample.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={sample.lab_number} 
                            size="small" 
                            variant="outlined"
                          />
                          <Typography variant="body2">
                            {sample.name} {sample.surname} ({sample.relation})
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              ))}
              
              {/* Individual samples without case numbers */}
              {selectedSamples.filter(s => !s.case_number).map(sample => (
                <Box key={sample.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip 
                    label={sample.lab_number} 
                    size="small" 
                    variant="outlined"
                  />
                  <Typography variant="body2">
                    {sample.name} {sample.surname}
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
    </Box>
  );
}