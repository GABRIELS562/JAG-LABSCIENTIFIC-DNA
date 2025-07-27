import React, { useState, useEffect } from 'react';
import { getStatusColor, formatDate } from '../../utils/statusHelpers';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Science as ScienceIcon,
  Biotech as BiotechIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  FileDownload as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Storage as DataIcon
} from '@mui/icons-material';
import api from '../../services/api';

export default function LabResults() {
  const [analyses, setAnalyses] = useState([]);
  const [strProfiles, setStrProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCase, setSelectedCase] = useState('all');
  const [selectedSample, setSelectedSample] = useState('all');
  const [viewDialog, setViewDialog] = useState({ open: false, data: null });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadAnalysisData();
    loadAnalysisStats();
  }, [selectedCase, selectedSample]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for genetic analysis results
      const mockAnalyses = [
        {
          id: 1,
          case_id: 'PAT-2025-001',
          sample_id: 'PAT-2025-001-AF',
          sample_type: 'Alleged Father',
          analysis_date: new Date().toISOString(),
          status: 'completed',
          instrument: 'ABI 3500xl',
          kit: 'AmpFlSTR Identifiler Plus',
          quality_score: 98.5,
          total_loci: 16,
          complete_loci: 16,
          analyst: 'Dr. Smith',
          reviewer: 'Dr. Johnson'
        },
        {
          id: 2,
          case_id: 'PAT-2025-001',
          sample_id: 'PAT-2025-001-CH',
          sample_type: 'Child',
          analysis_date: new Date(Date.now() - 3600000).toISOString(),
          status: 'completed',
          instrument: 'ABI 3500xl',
          kit: 'AmpFlSTR Identifiler Plus',
          quality_score: 96.2,
          total_loci: 16,
          complete_loci: 15,
          analyst: 'Dr. Smith',
          reviewer: 'Dr. Johnson'
        },
        {
          id: 3,
          case_id: 'PAT-2025-002',
          sample_id: 'PAT-2025-002-AF',
          sample_type: 'Alleged Father',
          analysis_date: new Date(Date.now() - 7200000).toISOString(),
          status: 'processing',
          instrument: 'ABI 3500xl',
          kit: 'AmpFlSTR Identifiler Plus',
          quality_score: null,
          total_loci: 16,
          complete_loci: null,
          analyst: 'Dr. Wilson',
          reviewer: null
        }
      ];

      const mockStrData = [
        {
          sample_id: 'PAT-2025-001-AF',
          locus: 'D8S1179',
          allele_1: '12',
          allele_2: '14',
          peak_height_1: 2450,
          peak_height_2: 2890,
          quality_flags: 'PASS'
        },
        {
          sample_id: 'PAT-2025-001-AF',
          locus: 'D21S11',
          allele_1: '28',
          allele_2: '30',
          peak_height_1: 3120,
          peak_height_2: 2975,
          quality_flags: 'PASS'
        },
        {
          sample_id: 'PAT-2025-001-CH',
          locus: 'D8S1179',
          allele_1: '12',
          allele_2: '15',
          peak_height_1: 2245,
          peak_height_2: 2687,
          quality_flags: 'PASS'
        },
        {
          sample_id: 'PAT-2025-001-CH',
          locus: 'D21S11',
          allele_1: '28',
          allele_2: '29',
          peak_height_1: 2890,
          peak_height_2: 3045,
          quality_flags: 'LOW_PEAK'
        }
      ];

      // Filter based on selections
      let filteredAnalyses = mockAnalyses;
      if (selectedCase !== 'all') {
        filteredAnalyses = filteredAnalyses.filter(a => a.case_id === selectedCase);
      }
      if (selectedSample !== 'all') {
        filteredAnalyses = filteredAnalyses.filter(a => a.sample_id === selectedSample);
      }

      setAnalyses(filteredAnalyses);
      setStrProfiles(mockStrData);
    } catch (error) {
      setError('Error loading analysis data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisStats = async () => {
    try {
      const mockStats = {
        total_analyses: 15,
        completed: 12,
        processing: 2,
        pending_review: 1,
        avg_quality: 97.3,
        total_loci_analyzed: 240,
        success_rate: 98.7
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewStrProfile = (analysis) => {
    const sampleStrData = strProfiles.filter(str => str.sample_id === analysis.sample_id);
    setViewDialog({
      open: true,
      data: {
        analysis,
        strData: sampleStrData
      }
    });
  };

  const getQualityColor = (score) => {
    if (!score) return 'default';
    if (score >= 95) return 'success';
    if (score >= 85) return 'warning';
    return 'error';
  };

  const getQualityIcon = (score) => {
    if (!score) return <InfoIcon color="disabled" />;
    if (score >= 95) return <CheckCircleIcon color="success" />;
    if (score >= 85) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'processing':
        return <ScienceIcon color="warning" />;
      case 'pending_review':
        return <AssessmentIcon color="info" />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          🧬 Lab Results & Analysis Data
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            loadAnalysisData();
            loadAnalysisStats();
          }}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
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
              <ScienceIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.total_analyses || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Analyses
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
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
              <CheckCircleIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.completed || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Completed
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)'
              }
            }}>
              <BiotechIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.processing || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Processing
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
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
              <AssessmentIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.avg_quality || 0}%
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Avg Quality
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3)'
              }
            }}>
              <DataIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.total_loci_analyzed || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Loci Analyzed
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(66, 165, 245, 0.3)'
              }
            }}>
              <TimelineIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.success_rate || 0}%
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Success Rate
              </Typography>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Case ID</InputLabel>
                <Select
                  value={selectedCase}
                  onChange={(e) => setSelectedCase(e.target.value)}
                  label="Case ID"
                >
                  <MenuItem value="all">All Cases</MenuItem>
                  <MenuItem value="PAT-2025-001">PAT-2025-001</MenuItem>
                  <MenuItem value="PAT-2025-002">PAT-2025-002</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Sample ID</InputLabel>
                <Select
                  value={selectedSample}
                  onChange={(e) => setSelectedSample(e.target.value)}
                  label="Sample ID"
                >
                  <MenuItem value="all">All Samples</MenuItem>
                  <MenuItem value="PAT-2025-001-AF">PAT-2025-001-AF</MenuItem>
                  <MenuItem value="PAT-2025-001-CH">PAT-2025-001-CH</MenuItem>
                  <MenuItem value="PAT-2025-002-AF">PAT-2025-002-AF</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                {analyses.length} analysis results found
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analysis Results Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Sample</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                    <TableCell>Analysis Date</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Instrument</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Loci</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Analyst</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No analysis results found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    analyses.map((analysis) => (
                      <TableRow key={analysis.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {analysis.sample_id}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {analysis.case_id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Chip
                            label={analysis.sample_type}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(analysis.analysis_date)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="body2" fontFamily="monospace">
                            {analysis.instrument}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getQualityIcon(analysis.quality_score)}
                            <Chip
                              label={analysis.quality_score ? `${analysis.quality_score}%` : 'Pending'}
                              size="small"
                              color={getQualityColor(analysis.quality_score)}
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {analysis.complete_loci || 0}/{analysis.total_loci}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getStatusIcon(analysis.status)}
                            <Chip
                              label={analysis.status}
                              size="small"
                              color={getStatusColor(analysis.status)}
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          <Typography variant="body2">
                            {analysis.analyst}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View STR Profile">
                            <IconButton
                              size="small"
                              onClick={() => handleViewStrProfile(analysis)}
                              disabled={analysis.status !== 'completed'}
                            >
                              <ViewIcon />
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
        </CardContent>
      </Card>

      {/* STR Profile Dialog */}
      <Dialog 
        open={viewDialog.open} 
        onClose={() => setViewDialog({ open: false, data: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          STR Profile - {viewDialog.data?.analysis?.sample_id}
        </DialogTitle>
        <DialogContent>
          {viewDialog.data && (
            <Box>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Sample Type</Typography>
                    <Typography variant="body1" fontWeight="bold">{viewDialog.data.analysis.sample_type}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Kit Used</Typography>
                    <Typography variant="body1" fontWeight="bold">{viewDialog.data.analysis.kit}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Quality Score</Typography>
                    <Typography variant="body1" fontWeight="bold">{viewDialog.data.analysis.quality_score}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Instrument</Typography>
                    <Typography variant="body1" fontWeight="bold">{viewDialog.data.analysis.instrument}</Typography>
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="h6" sx={{ mb: 2 }}>STR Loci Data</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Locus</TableCell>
                      <TableCell>Allele 1</TableCell>
                      <TableCell>Allele 2</TableCell>
                      <TableCell>Peak Height 1</TableCell>
                      <TableCell>Peak Height 2</TableCell>
                      <TableCell>Quality</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewDialog.data.strData.map((str, index) => (
                      <TableRow key={index}>
                        <TableCell fontWeight="bold">{str.locus}</TableCell>
                        <TableCell>{str.allele_1}</TableCell>
                        <TableCell>{str.allele_2}</TableCell>
                        <TableCell>{str.peak_height_1}</TableCell>
                        <TableCell>{str.peak_height_2}</TableCell>
                        <TableCell>
                          <Chip 
                            label={str.quality_flags} 
                            size="small"
                            color={str.quality_flags === 'PASS' ? 'success' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, data: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}