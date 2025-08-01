import React, { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
  Button,
  InputAdornment,
  IconButton,
  Tooltip,
  Checkbox,
  Badge,
  Fab
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
  Clear as ClearAllIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { getStatusColor, formatDate } from '../../utils/statusHelpers';

export default function ClientRegister() {
  const [query, setQuery] = useState('');
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedSamples, setSelectedSamples] = useState(new Set());

  // Load all samples on component mount
  useEffect(() => {
    loadAllSamples();
    loadSampleStats();
  }, []);

  const loadAllSamples = async () => {
    try {
      setLoading(true);
      // Use the new samples-with-cases endpoint to get grouping info
      const response = await fetch('/api/samples-with-cases');
      const data = await response.json();
      if (data.success) {
        setSamples(data.data || []);
      } else {
        setError('Failed to load samples');
      }
    } catch (error) {
      setError('Error loading samples');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleStats = async () => {
    try {
      const response = await api.getSampleCounts();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading sample stats:', error);
    }
  };

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      loadAllSamples();
      return;
    }

    try {
      setLoading(true);
      // Use enhanced search endpoint directly
      const response = await fetch(`/api/samples/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data.success) {
        setSamples(data.data || []);
      } else {
        setError('Failed to search samples');
      }
    } catch (error) {
      setError('Error searching samples');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    loadAllSamples();
  };

  const handleRefresh = async () => {
    await Promise.all([loadAllSamples(), loadSampleStats()]);
  };

  // Sample selection handlers
  const handleSampleSelect = (sampleId) => {
    setSelectedSamples(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(sampleId)) {
        newSelected.delete(sampleId);
      } else {
        newSelected.add(sampleId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedSamples.size === samples.length) {
      setSelectedSamples(new Set());
    } else {
      setSelectedSamples(new Set(samples.map(s => s.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedSamples(new Set());
  };

  const handleAddToPCRPlate = () => {
    if (selectedSamples.size === 0) {
      setError('Please select samples to add to PCR plate');
      return;
    }
    
    // Store selected samples in localStorage for PCR Plate page
    const selectedSampleData = samples.filter(s => selectedSamples.has(s.id));
    localStorage.setItem('selectedSamplesForPCR', JSON.stringify(selectedSampleData));
    
    // Navigate to PCR Plate page
    window.location.href = '/pcr-plate';
  };

  // Normalize status to one of 4 main categories
  const normalizeStatus = (status) => {
    if (!status) return 'Pending';
    
    switch (status.toLowerCase()) {
      case 'pending':
      case 'sample_collected':
        return 'Pending';
      case 'pcr_batched':
      case 'pcr_ready':
      case 'pcr_completed':
        return 'PCR Batched';
      case 'electro_batched':
      case 'electro_ready': 
      case 'electro_completed':
        return 'Electro Batched';
      case 'completed':
      case 'analysis_completed':
      case 'report_sent':
        return 'Completed';
      default:
        return 'Pending';
    }
  };

  // Get color for normalized status
  const getNormalizedStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'PCR Batched': return 'info';
      case 'Electro Batched': return 'primary';
      case 'Completed': return 'success';
      default: return 'default';
    }
  };

  // Group samples by case number for display
  const groupSamplesByCase = (samples) => {
    const grouped = {};
    samples.forEach(sample => {
      let caseKey;
      
      // Handle new format with explicit case numbers
      if (sample.case_number && sample.case_id) {
        caseKey = sample.case_number;
      }
      // Handle dummy data grouping by paternity test patterns
      else if (sample.case_id === null && sample.case_number === null) {
        // Look for paternity test patterns in surname and relation
        if (sample.surname && (
          sample.surname.includes('dad') || 
          sample.surname.includes('mother') || 
          sample.relation.includes('(') ||
          sample.relation === 'alleged_father' ||
          sample.relation === 'mother' ||
          sample.relation.includes('child')
        )) {
          // Extract father's lab number from child's relation or use current lab number if father/mother
          let fatherLabNumber = null;
          
          if (sample.relation.includes('(')) {
            // Child sample - extract father's lab number from relation like "child(25_245)M"
            const match = sample.relation.match(/\(([^)]+)\)/);
            if (match) {
              fatherLabNumber = match[1];
            }
          } else if (sample.surname.includes('dad') || sample.relation === 'alleged_father') {
            // Father sample - use his lab number
            fatherLabNumber = sample.lab_number;
          } else if (sample.surname.includes('mother') || sample.relation === 'mother') {
            // Mother sample - find corresponding father by looking for similar lab number pattern
            const labPrefix = sample.lab_number.replace(/\d+$/, ''); // Get "25_" part
            const labNumber = parseInt(sample.lab_number.match(/\d+$/)[0]); // Get number part
            // Assume father's lab number is typically +1 from mother (based on the pattern seen)
            fatherLabNumber = `${labPrefix}${labNumber + 1}`;
          }
          
          if (fatherLabNumber) {
            caseKey = `PATERNITY_${fatherLabNumber}`;
          } else {
            caseKey = `INDIVIDUAL_${sample.id}`;
          }
        } else {
          // Individual sample
          caseKey = `INDIVIDUAL_${sample.id}`;
        }
      }
      // Fallback for other cases
      else {
        caseKey = `INDIVIDUAL_${sample.id}`;
      }
      
      if (!grouped[caseKey]) {
        grouped[caseKey] = [];
      }
      grouped[caseKey].push(sample);
    });
    return grouped;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4" component="h1">
            📋 Samples
          </Typography>
          {selectedSamples.size > 0 && (
            <Badge badgeContent={selectedSamples.size} color="primary">
              <Chip 
                label={`${selectedSamples.size} selected`}
                color="primary" 
                size="small"
              />
            </Badge>
          )}
        </Box>
        <Box display="flex" gap={1}>
          {selectedSamples.size > 0 && (
            <>
              <Button
                variant="outlined"
                startIcon={<ClearAllIcon />}
                onClick={handleClearSelection}
                size="small"
              >
                Clear
              </Button>
              <Button
                variant="contained"
                startIcon={<PlaylistAddIcon />}
                onClick={handleAddToPCRPlate}
                color="primary"
              >
                Add to PCR Plate ({selectedSamples.size})
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #0D488F 0%, #1e4976 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(13, 72, 143, 0.3)'
              }
            }}>
              <PeopleIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.total || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Samples
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)'
              }
            }}>
              <AssessmentIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.pending || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Pending
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
              }
            }}>
              <ScienceIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.processing || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Processing
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(22, 163, 74, 0.3)'
              }
            }}>
              <TrendingUpIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.completed || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Completed
              </Typography>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Search Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by Lab Number, Name, Surname, Case Number, ID Number, or Phone Number"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <Tooltip title="Clear search">
                    <IconButton onClick={handleClearSearch} edge="end">
                      <ClearIcon />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
          
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body2" color="text.secondary">
                {loading ? 'Searching...' : `Found ${samples.length} sample${samples.length !== 1 ? 's' : ''}`}
                {query && ` matching "${query}"`}
              </Typography>
              {samples.length > 0 && (
                <Button
                  variant="text"
                  startIcon={<SelectAllIcon />}
                  onClick={handleSelectAll}
                  size="small"
                  sx={{ minWidth: 'auto' }}
                >
                  {selectedSamples.size === samples.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </Box>
            
            {loading && <CircularProgress size={20} />}
          </Box>
        </CardContent>
      </Card>

      {/* Results Table with Case Grouping */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedSamples.size > 0 && selectedSamples.size < samples.length}
                      checked={samples.length > 0 && selectedSamples.size === samples.length}
                      onChange={handleSelectAll}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell><strong>Lab Number</strong></TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>Name</strong></TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><strong>Surname</strong></TableCell>
                  <TableCell><strong>Relation</strong></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><strong>Case Number</strong></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><strong>Collection Date</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {samples.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {query ? 'No samples found matching your search criteria' : 'No samples available'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const groupedSamples = groupSamplesByCase(samples);
                    const rows = [];
                    
                    Object.entries(groupedSamples).forEach(([caseNumber, caseSamples]) => {
                      // Check the type of grouping
                      const isRealCase = caseNumber.startsWith('CASE_');
                      const isPaternityGroup = caseNumber.startsWith('PATERNITY_');
                      const isIndividualSample = caseNumber.startsWith('INDIVIDUAL_');
                      
                      // Add case header row for real cases and paternity groups with multiple samples
                      if ((isRealCase || isPaternityGroup) && caseSamples.length > 1) {
                        const headerIcon = isRealCase ? '📁' : '🧬';
                        const headerLabel = isRealCase ? 'Case' : 'Paternity Test';
                        const displayName = isRealCase ? caseNumber : `Test ${caseNumber.replace('PATERNITY_', '')}`;
                        
                        rows.push(
                          <TableRow key={`case-${caseNumber}`} sx={{ 
                            backgroundColor: isRealCase ? 'rgba(13, 72, 143, 0.05)' : 'rgba(76, 175, 80, 0.05)' 
                          }}>
                            <TableCell colSpan={8} sx={{ fontWeight: 'bold', color: isRealCase ? 'primary.main' : 'success.main', fontSize: '0.9rem' }}>
                              {headerIcon} {headerLabel}: {displayName} ({caseSamples.length} samples)
                              {caseSamples[0]?.ref_kit_number && ` - Kit: ${caseSamples[0].ref_kit_number}`}
                              {caseSamples[0]?.test_purpose && ` - ${caseSamples[0].test_purpose.replace('_', ' ')}`}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      // Add sample rows
                      caseSamples.forEach((sample, index) => {
                        // Apply grouping styles to both real cases and paternity groups
                        const isGrouped = (isRealCase || isPaternityGroup) && caseSamples.length > 1;
                        const groupColor = isRealCase ? '#0D488F' : '#4CAF50';
                        rows.push(
                          <TableRow 
                            key={sample.id} 
                            hover 
                            sx={{ 
                              backgroundColor: isGrouped ? (isRealCase ? 'rgba(13, 72, 143, 0.02)' : 'rgba(76, 175, 80, 0.02)') : 'inherit',
                              borderLeft: isGrouped ? `3px solid ${groupColor}` : 'none'
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedSamples.has(sample.id)}
                                onChange={() => handleSampleSelect(sample.id)}
                                color="primary"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isGrouped && <Box sx={{ width: 12, height: 2, backgroundColor: groupColor, borderRadius: 1 }} />}
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                  {sample.lab_number}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{sample.name}</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{sample.surname}</TableCell>
                            <TableCell>
                              <Chip 
                                label={sample.relation} 
                                size="small" 
                                variant={isGrouped ? "filled" : "outlined"}
                                color={isRealCase ? "primary" : "success"}
                              />
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                              {isRealCase ? caseNumber : (isPaternityGroup ? `Test ${caseNumber.replace('PATERNITY_', '')}` : '-')}
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                              {formatDate(sample.collection_date)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={normalizeStatus(sample.workflow_status || sample.status)}
                                size="small"
                                color={getNormalizedStatusColor(normalizeStatus(sample.workflow_status || sample.status))}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      });
                    });
                    
                    return rows;
                  })()
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}