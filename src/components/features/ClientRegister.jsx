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

// Backend API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      setError(null);
      // Try multiple endpoints with better error handling
      let samplesData = [];
      let success = false;
      
      const endpoints = ['/api/samples-with-cases', '/api/samples', '/api/samples/all'];
      
      for (const endpoint of endpoints) {
        try {
          const fullUrl = `${API_BASE_URL}${endpoint}`;
          const response = await fetch(fullUrl);
          
          // Check if response is ok
          if (!response.ok) {
            continue;
          }
          
          // Check if response has content
          const text = await response.text();
          if (!text.trim()) {
            continue;
          }
          
          // Try to parse JSON
          let data;
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            continue;
          }
          
          // Extract samples data
          if (data && data.success && Array.isArray(data.data)) {
            samplesData = data.data;
            success = true;
            break;
          } else if (Array.isArray(data)) {
            samplesData = data;
            success = true;
            `);
            break;
          } else {
            }
        } catch (err) {
          continue;
        }
      }
      
      if (success) {
        setSamples(samplesData);
        } else {
        // If all endpoints fail, provide some mock data for demo purposes
        const mockSamples = [
          {
            id: 1,
            lab_number: '25_001(25_002)M',
            name: 'John',
            surname: 'Smith',
            relation: 'child',
            case_number: 'BN-001',
            ref_kit_number: 'BN-001',
            collection_date: new Date().toISOString().split('T')[0],
            workflow_status: 'pending',
            status: 'pending',
            comments: 'Test sample for system demo'
          },
          {
            id: 2,
            lab_number: '25_002',
            name: 'Robert',
            surname: 'Smith',
            relation: 'alleged_father',
            case_number: 'BN-001',
            ref_kit_number: 'BN-001',
            collection_date: new Date().toISOString().split('T')[0],
            workflow_status: 'pending',
            status: 'pending',
            comments: 'Father sample for BN-001'
          },
          {
            id: 3,
            lab_number: '25_003',
            name: 'Mary',
            surname: 'Smith',
            relation: 'mother',
            case_number: 'BN-001',
            ref_kit_number: 'BN-001',
            collection_date: new Date().toISOString().split('T')[0],
            workflow_status: 'pending',
            status: 'pending',
            comments: 'Mother sample for BN-001'
          }
        ];
        
        setSamples(mockSamples);
        setError('Connected to demo mode - showing sample data. Backend may be unavailable.');
        }
      
    } catch (error) {
      console.error('💥 Unexpected error loading samples:', error);
      setError(`Unexpected error: ${error.message}`);
      setSamples([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleStats = async () => {
    try {
      const response = await api.getSampleCounts();
      if (response && response.success && response.data) {
        setStats(response.data);
      } else {
        // Provide default stats if API fails
        setStats({
          total: samples.length,
          pending: samples.filter(s => s.status === 'pending').length,
          processing: samples.filter(s => s.status === 'processing').length,
          completed: samples.filter(s => s.status === 'completed').length
        });
      }
    } catch (error) {
      console.error('Error loading sample stats:', error);
      // Set default stats based on loaded samples
      setStats({
        total: samples.length,
        pending: 0,
        processing: 0,
        completed: 0
      });
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
      setError(null);
      let samplesData = [];
      let success = false;
      
      // Try search endpoint first
      try {
        const response = await fetch(`${API_BASE_URL}/api/samples/search?q=${encodeURIComponent(searchQuery)}`);
        
        if (response.ok) {
          const text = await response.text();
          if (text.trim()) {
            const data = JSON.parse(text);
            if (data && data.success && Array.isArray(data.data)) {
              samplesData = data.data;
              success = true;
              }
          }
        }
      } catch (searchErr) {
        }
      
      // If search failed, try local filtering
      if (!success) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/samples`);
          if (response.ok) {
            const text = await response.text();
            if (text.trim()) {
              const data = JSON.parse(text);
              const allSamples = data.success ? (data.data || []) : (Array.isArray(data) ? data : []);
              
              // Comprehensive text-based filtering
              samplesData = allSamples.filter(sample => {
                const searchLower = searchQuery.toLowerCase();
                return (
                  // Lab number search
                  (sample.lab_number && sample.lab_number.toLowerCase().includes(searchLower)) ||
                  // Name and surname search
                  (sample.name && sample.name.toLowerCase().includes(searchLower)) ||
                  (sample.surname && sample.surname.toLowerCase().includes(searchLower)) ||
                  // Combined full name search
                  (sample.name && sample.surname && `${sample.name} ${sample.surname}`.toLowerCase().includes(searchLower)) ||
                  // Case and kit number search
                  (sample.case_number && sample.case_number.toLowerCase().includes(searchLower)) ||
                  (sample.ref_kit_number && sample.ref_kit_number.toLowerCase().includes(searchLower)) ||
                  (sample.kit_batch_number && sample.kit_batch_number.toLowerCase().includes(searchLower)) ||
                  // Contact information search
                  (sample.phone_number && sample.phone_number.toLowerCase().includes(searchLower)) ||
                  (sample.email && sample.email.toLowerCase().includes(searchLower)) ||
                  // ID and relation search
                  (sample.id_number && sample.id_number.toLowerCase().includes(searchLower)) ||
                  (sample.relation && sample.relation.toLowerCase().includes(searchLower)) ||
                  // Status and comments search
                  (sample.workflow_status && sample.workflow_status.toLowerCase().includes(searchLower)) ||
                  (sample.status && sample.status.toLowerCase().includes(searchLower)) ||
                  (sample.comments && sample.comments.toLowerCase().includes(searchLower)) ||
                  (sample.notes && sample.notes.toLowerCase().includes(searchLower)) ||
                  (sample.additional_notes && sample.additional_notes.toLowerCase().includes(searchLower)) ||
                  // Test purpose search (important for finding urgent samples)
                  (sample.test_purpose && sample.test_purpose.toLowerCase().includes(searchLower))
                );
              });
              
              success = true;
              }
          }
        } catch (filterErr) {
          console.error('❌ Local filtering failed:', filterErr.message);
        }
      }
      
      if (success) {
        setSamples(samplesData);
      } else {
        setError('Search failed. Please try again or check your connection.');
        setSamples([]);
      }
      
    } catch (error) {
      console.error('💥 Unexpected search error:', error);
      setError(`Search error: ${error.message}`);
      setSamples([]);
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
    
    // Store selected samples in sessionStorage for PCR Plate page
    const selectedSampleData = samples.filter(s => selectedSamples.has(s.id));
    sessionStorage.setItem('selectedSamplesForBatch', JSON.stringify(selectedSampleData));
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
      case 'rerun_batched':
        return 'Rerun Batched';
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
      case 'Rerun Batched': return 'error';
      case 'Completed': return 'success';
      default: return 'default';
    }
  };

  // Group samples by case number for display
  const groupSamplesByKit = (samples) => {
    const grouped = {};
    samples.forEach(sample => {
      let kitKey;
      
      // Group by kit number (ref_kit_number) - this is the new BN-#### system
      if (sample.ref_kit_number) {
        kitKey = sample.ref_kit_number;
      }
      // Handle new format with case numbers that are also kit numbers (BN-####)
      else if (sample.case_number && sample.case_number.startsWith('BN-')) {
        kitKey = sample.case_number;
      }
      // Handle legacy case numbers 
      else if (sample.case_number && sample.case_id) {
        kitKey = sample.case_number;
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
            kitKey = `PATERNITY_${fatherLabNumber}`;
          } else {
            kitKey = `INDIVIDUAL_${sample.id}`;
          }
        } else {
          // Individual sample
          kitKey = `INDIVIDUAL_${sample.id}`;
        }
      }
      // Fallback for other cases
      else {
        kitKey = `INDIVIDUAL_${sample.id}`;
      }
      
      if (!grouped[kitKey]) {
        grouped[kitKey] = [];
      }
      grouped[kitKey].push(sample);
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
            placeholder="Search by Lab Number, BN Number, Name, Surname, Case Number, Phone, Email, ID Number, Status, or 'urgent'"
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
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}><strong>Comments</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {samples.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {query ? 'No samples found matching your search criteria' : 'No samples available'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const groupedSamples = groupSamplesByKit(samples);
                    const rows = [];
                    
                    Object.entries(groupedSamples).forEach(([kitNumber, kitSamples]) => {
                      // Check the type of grouping
                      const isBNKit = kitNumber.startsWith('BN-');
                      const isLegacyCase = kitNumber.startsWith('CASE_');
                      const isPaternityGroup = kitNumber.startsWith('PATERNITY_');
                      const isIndividualSample = kitNumber.startsWith('INDIVIDUAL_');
                      
                      // Add kit header row for BN kits, legacy cases and paternity groups with multiple samples  
                      if ((isBNKit || isLegacyCase || isPaternityGroup) && kitSamples.length > 1) {
                        // Get test purpose and client type from first sample in group
                        const firstSample = kitSamples[0];
                        const testPurpose = firstSample.test_purpose;
                        const clientType = firstSample.client_type;
                        const displayKitNumber = firstSample.ref_kit_number || kitNumber;
                        
                        // Create meaningful display name based on test purpose and client type
                        let displayName = 'Unknown Test';
                        let headerIcon = '🧬';
                        
                        if (clientType === 'legal' || clientType === 'lt') {
                          displayName = 'LT Samples';
                          headerIcon = '⚖️';
                        } else if (testPurpose === 'peace_of_mind') {
                          displayName = 'Peace of Mind';
                          headerIcon = '🕊️';
                        } else if (testPurpose === 'legal_proceedings') {
                          displayName = 'Legal Proceedings';
                          headerIcon = '⚖️';
                        } else if (testPurpose === 'immigration') {
                          displayName = 'Immigration';
                          headerIcon = '🌍';
                        } else if (testPurpose === 'inheritance') {
                          displayName = 'Inheritance';
                          headerIcon = '🏛️';
                        } else if (testPurpose === 'custody') {
                          displayName = 'Custody';
                          headerIcon = '👨‍👩‍👧‍👦';
                        }
                        
                        rows.push(
                          <TableRow key={`kit-${kitNumber}`} sx={{ 
                            backgroundColor: 'rgba(13, 72, 143, 0.05)'
                          }}>
                            <TableCell colSpan={9} sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.9rem' }}>
                              {headerIcon} {displayName} - Kit: {kitNumber} ({kitSamples.length} samples)
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      // Add sample rows
                      kitSamples.forEach((sample, index) => {
                        // Apply grouping styles and urgent highlighting
                        const isGrouped = (isBNKit || isPaternityGroup) && kitSamples.length > 1;
                        const groupColor = isBNKit ? '#0D488F' : '#4CAF50';
                        const isUrgent = sample.test_purpose === 'legal_proceedings' || sample.test_purpose === 'urgent' || 
                                       sample.comments?.toLowerCase().includes('urgent') ||
                                       sample.notes?.toLowerCase().includes('urgent') ||
                                       sample.additional_notes?.toLowerCase().includes('urgent');
                        
                        let backgroundColor = 'inherit';
                        let borderLeft = 'none';
                        
                        if (isUrgent) {
                          backgroundColor = 'rgba(255, 87, 34, 0.08)';
                          borderLeft = '4px solid #FF5722';
                        } else if (isGrouped) {
                          backgroundColor = isBNKit ? 'rgba(13, 72, 143, 0.02)' : 'rgba(76, 175, 80, 0.02)';
                          borderLeft = `3px solid ${groupColor}`;
                        }
                        
                        rows.push(
                          <TableRow 
                            key={sample.id} 
                            hover 
                            sx={{ 
                              backgroundColor,
                              borderLeft,
                              fontWeight: isUrgent ? 'bold' : 'normal'
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedSamples.has(sample.id)}
                                onChange={() => handleSampleSelect(sample.id)}
                                color="primary"
                                disabled={sample.workflow_status === 'pcr_batched' || sample.workflow_status === 'electro_batched' || sample.workflow_status === 'completed'}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isUrgent && <Chip label="URGENT" size="small" color="error" sx={{ mr: 1 }} />}
                                {isGrouped && <Box sx={{ width: 12, height: 2, backgroundColor: groupColor, borderRadius: 1 }} />}
                                <Typography variant="body2" sx={{ 
                                  fontWeight: isUrgent ? 'bold' : 'bold', 
                                  color: isUrgent ? 'error.main' : 'primary.main'
                                }}>
                                  {sample.lab_number}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{sample.name}</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{sample.surname}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={sample.relation} 
                                  size="small" 
                                  variant={isGrouped ? "filled" : "outlined"}
                                  color={isBNKit ? "primary" : "success"}
                                />
                                {sample.gender && (
                                  <Chip 
                                    label={sample.gender === 'M' ? '♂' : '♀'}
                                    size="small"
                                    variant="outlined"
                                    color={sample.gender === 'M' ? 'primary' : 'secondary'}
                                    sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                              {isBNKit ? kitNumber : (isPaternityGroup ? `Test ${kitNumber.replace('PATERNITY_', '')}` : '-')}
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                              {formatDate(sample.collection_date)}
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                              <Typography variant="body2" sx={{ 
                                maxWidth: 150, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {sample.comments || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={normalizeStatus(sample.workflow_status || sample.status)}
                                  size="small"
                                  color={getNormalizedStatusColor(normalizeStatus(sample.workflow_status || sample.status))}
                                />
                                {(sample.workflow_status === 'pcr_batched' || sample.workflow_status === 'electro_batched' || sample.workflow_status === 'rerun_batched' || sample.workflow_status === 'completed') && (
                                  <Chip
                                    label={sample.workflow_status === 'rerun_batched' ? 'RERUN BATCH' : 'BATCHED'}
                                    size="small"
                                    variant="outlined"
                                    color={sample.workflow_status === 'rerun_batched' ? 'error' : 'info'}
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                )}
                                {sample.rerun_count > 0 && (
                                  <Chip
                                    label={`RERUN (${sample.rerun_count})`}
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
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