import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  Upload as UploadIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  GetApp as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  People as FamilyIcon,
  Refresh as RefreshIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Description as FileIcon,
  Tune as TuneIcon,
  Psychology as BioTechIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';
import NewCaseDialog from './dialogs/NewCaseDialog';
import FileUploadDialog from './dialogs/FileUploadDialog';
import CaseDetailsDialog from './dialogs/CaseDetailsDialog';
import AnalysisProgressTracker from './AnalysisProgressTracker';

const GeneticAnalysis = () => {
  const { isDarkMode } = useThemeContext();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [newCaseDialog, setNewCaseDialog] = useState(false);
  const [caseDetailsDialog, setCaseDetailsDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [osirisStatus, setOsirisStatus] = useState({ initialized: false, version: null });

  useEffect(() => {
    fetchCases();
    checkOsirisStatus();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/genetic-analysis/cases');
      const data = await response.json();
      
      if (data.success) {
        setCases(data.cases);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const checkOsirisStatus = async () => {
    try {
      showSnackbar('🔄 Checking Osiris status...', 'info');
      
      const response = await fetch('/api/genetic-analysis/initialize-osiris', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setOsirisStatus({
          initialized: true,
          version: data.osirisVersion,
          kitConfiguration: data.kitConfiguration
        });
        showSnackbar('✅ Osiris launched successfully!', 'success');
      } else {
        showSnackbar(`❌ Failed to launch Osiris: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      setOsirisStatus({ initialized: false, error: error.message });
      showSnackbar('❌ Network error launching Osiris', 'error');
    }
  };
  
  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/genetic-analysis/batches');
      const data = await response.json();
      
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (error) {
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#8EC74F';
      case 'analysis_complete': return '#8EC74F';
      case 'in_progress': return '#0D488F';
      case 'failed': return '#ef5350';
      case 'pending': return '#ff9800';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'analysis_complete':
        return <CheckCircleIcon sx={{ color: '#8EC74F' }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: '#ef5350' }} />;
      case 'in_progress':
        return <ScheduleIcon sx={{ color: '#0D488F' }} />;
      default:
        return <ScheduleIcon sx={{ color: '#ff9800' }} />;
    }
  };

  const getConclusionColor = (conclusion) => {
    switch (conclusion) {
      case 'inclusion': return '#8EC74F';
      case 'exclusion': return '#ef5350';
      case 'inconclusive': return '#ff9800';
      default: return '#666';
    }
  };

  const formatProbability = (probability) => {
    if (probability === null || probability === undefined) return 'N/A';
    return `${probability.toFixed(2)}%`;
  };

  const getOsirisComplianceIcon = (caseItem) => {
    if (caseItem.osiris_compliant === true) {
      return (
        <Tooltip title="Osiris Compliant Analysis">
          <VerifiedIcon sx={{ color: '#8EC74F', fontSize: 16 }} />
        </Tooltip>
      );
    } else if (caseItem.osiris_compliant === false) {
      return (
        <Tooltip title="Non-Osiris Analysis">
          <WarningIcon sx={{ color: '#ff9800', fontSize: 16 }} />
        </Tooltip>
      );
    }
    return null;
  };

  const handleExportResults = async (caseItem, format) => {
    try {
      const response = await fetch(`/api/genetic-analysis/cases/${caseItem.case_id}/export/${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${caseItem.case_id}_results.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showSnackbar(`${format.toUpperCase()} export completed`, 'success');
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      showSnackbar(`Export failed: ${error.message}`, 'error');
    }
  };


  const handleCaseCreated = (newCase) => {
    setCases(prev => [newCase, ...prev]);
    showSnackbar('Case created successfully', 'success');
  };

  const handleUploadComplete = (result) => {
    fetchCases(); // Refresh cases list
    showSnackbar(`${result.samplesProcessed} samples uploaded successfully`, 'success');
  };

  const handleStartAnalysis = (result) => {
    fetchCases(); // Refresh cases list
    showSnackbar('Analysis started successfully', 'success');
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleLoadInOsiris = async (caseItem) => {
    try {
      showSnackbar('🚀 Loading case in Osiris...', 'info');
      
      const response = await fetch('/api/genetic-analysis/launch-osiris', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          caseId: caseItem.case_id,
          filePath: null // Could be enhanced to pass specific FSA files
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSnackbar('✅ Osiris GUI launched successfully!', 'success');
      } else {
        showSnackbar(`❌ Failed to launch Osiris: ${data.error}`, 'error');
      }
    } catch (error) {
      showSnackbar('❌ Network error launching Osiris', 'error');
    }
  };

  const handleViewCase = (caseItem) => {
    setSelectedCase(caseItem);
    setCaseDetailsDialog(true);
  };

  const handleUploadSamples = (caseItem) => {
    setSelectedCase(caseItem);
    setUploadDialog(true);
  };

  const handleStartAnalysisForCase = async (caseItem) => {
    try {
      showSnackbar('🔬 Starting Osiris STR Analysis...', 'info');
      
      const response = await fetch(`/api/genetic-analysis/cases/${caseItem.case_id}/analyze`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSnackbar('✅ Osiris Analysis Complete! Opening results...', 'success');
        fetchCases(); // Refresh to show updated status
        
        // Auto-navigate to case details to show results
        setTimeout(() => {
          setSelectedCase({ ...caseItem, status: 'analysis_complete' });
          setCaseDetailsDialog(true);
        }, 1500);
      } else {
        showSnackbar(`Failed to start analysis: ${data.error}`, 'error');
      }
    } catch (error) {
      showSnackbar(`Network error: ${error.message}`, 'error');
    }
  };

  const handleDownloadReport = async (caseItem) => {
    try {
      showSnackbar('📄 Generating PDF report...', 'info');
      
      const response = await fetch(`/api/genetic-analysis/cases/${caseItem.case_id}/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reportType: 'full' })
      });
      
      if (response.ok) {
        // Check if response is actually a PDF
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/pdf')) {
          // The backend now returns a PDF blob directly
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          // Open the PDF in a new tab
          const newWindow = window.open(url, '_blank');
          if (!newWindow) {
            // Fallback if popup is blocked - download the file
            const a = document.createElement('a');
            a.href = url;
            a.download = `${caseItem.case_id}_paternity_report.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }
          
          showSnackbar('✅ Report generated successfully! Opening reports page...', 'success');
          
          // Navigate to reports page after a short delay
          setTimeout(() => {
            window.location.href = '/reports';
          }, 2000);
        } else {
          // Response is not a PDF, try to parse as JSON error
          const errorText = await response.text();
          showSnackbar(`Report generation failed: ${errorText.substring(0, 100)}...`, 'error');
        }
      } else {
        // Try to parse as JSON, fallback to text if it fails
        let errorMessage = 'Unknown error';
        try {
          const error = await response.json();
          errorMessage = error.error || 'Failed to generate report';
        } catch (parseError) {
          const text = await response.text();
          errorMessage = `Server error: ${text.substring(0, 100)}...`;
        }
        showSnackbar(`Failed to generate report: ${errorMessage}`, 'error');
      }
    } catch (error) {
      showSnackbar(`Network error: ${error.message}`, 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              color: isDarkMode ? 'white' : '#0D488F',
              fontWeight: 'bold',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            🧬 Genetic Analysis & STR Profiling
            {osirisStatus.initialized && (
              <Chip
                icon={<VerifiedIcon />}
                label={`Osiris ${osirisStatus.version || '2.16'}`}
                color="success"
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary',
              mb: 1
            }}
          >
            Enhanced STR Analysis with Real Osiris 2.16 Integration (PowerPlex ESX 17)
          </Typography>
          {osirisStatus.initialized && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<BioTechIcon />}
                label={`Kit: ${osirisStatus.kitConfiguration || 'PPESX17'}`}
                variant="outlined"
                size="small"
                sx={{ 
                  borderColor: '#8EC74F',
                  color: '#8EC74F'
                }}
              />
              <Chip
                icon={<CheckCircleIcon />}
                label="Compliant Analysis"
                variant="outlined"
                size="small"
                sx={{ 
                  borderColor: '#8EC74F',
                  color: '#8EC74F'
                }}
              />
            </Box>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchCases}
            disabled={loading}
            sx={{
              borderColor: '#0D488F',
              color: '#0D488F',
              '&:hover': { 
                borderColor: '#022539',
                backgroundColor: 'rgba(13,72,143,0.1)'
              }
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<ScienceIcon />}
            onClick={() => setNewCaseDialog(true)}
            sx={{
              backgroundColor: '#8EC74F',
              '&:hover': { backgroundColor: '#6BA23A' }
            }}
          >
            New Paternity Case
          </Button>
          <Button
            variant="outlined"
            startIcon={<LaunchIcon />}
            onClick={checkOsirisStatus}
            sx={{
              borderColor: '#0D488F',
              color: '#0D488F',
              '&:hover': { 
                borderColor: '#022539',
                backgroundColor: 'rgba(13,72,143,0.1)'
              }
            }}
          >
            {osirisStatus.initialized ? 'Launch Osiris' : 'Initialize Osiris'}
          </Button>
        </Box>
      </Box>

      {/* Analysis Progress Tracker */}
      <Box sx={{ mb: 4 }}>
        <AnalysisProgressTracker />
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            border: '1px solid rgba(13,72,143,0.1)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <FamilyIcon sx={{ fontSize: 40, color: '#0D488F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
                {cases.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Cases
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            border: '1px solid rgba(142,199,79,0.1)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: '#8EC74F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#8EC74F', fontWeight: 'bold' }}>
                {cases.filter(c => c.status === 'analysis_complete').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            border: '1px solid rgba(255,152,0,0.1)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                {cases.filter(c => c.status === 'pending' || c.status === 'in_progress').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            border: '1px solid rgba(142,199,79,0.1)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 40, color: '#8EC74F', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#8EC74F', fontWeight: 'bold' }}>
                {cases.filter(c => c.conclusion === 'inclusion').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inclusions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cases Table */}
      <Paper sx={{ 
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
        overflow: 'hidden'
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <Typography variant="h6" sx={{ color: isDarkMode ? 'white' : '#0D488F' }}>
            Paternity Testing Cases
          </Typography>
        </Box>
        
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography>Loading cases...</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: isDarkMode ? 'rgba(13,72,143,0.1)' : 'rgba(13,72,143,0.05)' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Osiris</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Samples</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Paternity %</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Conclusion</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow 
                    key={caseItem.case_id}
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' 
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0D488F' }}>
                        {caseItem.case_id}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(caseItem.status)}
                        <Chip
                          label={caseItem.status.replace('_', ' ')}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(caseItem.status),
                            color: 'white',
                            textTransform: 'capitalize'
                          }}
                        />
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getOsirisComplianceIcon(caseItem)}
                        {caseItem.osiris_compliant === true && (
                          <Typography variant="caption" sx={{ color: '#8EC74F', fontWeight: 'bold' }}>
                            v2.16
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {caseItem.father_samples > 0 && (
                          <Chip label={`F: ${caseItem.father_samples}`} size="small" color="primary" />
                        )}
                        {caseItem.child_samples > 0 && (
                          <Chip label={`C: ${caseItem.child_samples}`} size="small" color="secondary" />
                        )}
                        {caseItem.mother_samples > 0 && (
                          <Chip label={`M: ${caseItem.mother_samples}`} size="small" color="default" />
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(caseItem.created_date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(caseItem.created_date).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: caseItem.paternity_probability ? getConclusionColor(caseItem.conclusion) : 'text.secondary'
                        }}
                      >
                        {formatProbability(caseItem.paternity_probability)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      {caseItem.conclusion ? (
                        <Chip
                          label={caseItem.conclusion}
                          size="small"
                          sx={{
                            backgroundColor: getConclusionColor(caseItem.conclusion),
                            color: 'white',
                            textTransform: 'capitalize'
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Pending
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewCase(caseItem)}
                            sx={{ color: '#0D488F' }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        
                        {caseItem.status === 'pending' && (
                          <Tooltip title="Upload Samples">
                            <IconButton 
                              size="small"
                              onClick={() => handleUploadSamples(caseItem)}
                              sx={{ color: '#8EC74F' }}
                            >
                              <UploadIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        {caseItem.status === 'samples_uploaded' && (
                          <Tooltip title="Start STR Analysis">
                            <IconButton 
                              size="small"
                              onClick={() => handleStartAnalysisForCase(caseItem)}
                              sx={{ color: '#0D488F' }}
                            >
                              <AssessmentIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="Load in Osiris">
                          <IconButton 
                            size="small"
                            onClick={() => handleLoadInOsiris(caseItem)}
                            sx={{ color: '#FF6B35' }}
                          >
                            <LaunchIcon />
                          </IconButton>
                        </Tooltip>

                        {caseItem.status === 'analysis_complete' && (
                          <>
                            <Tooltip title="Download PDF Report">
                              <IconButton 
                                size="small"
                                onClick={() => handleDownloadReport(caseItem)}
                                sx={{ color: '#0D488F' }}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            {caseItem.osiris_compliant && (
                              <Tooltip title="Export Osiris XML">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleExportResults(caseItem, 'xml')}
                                  sx={{ color: '#8EC74F' }}
                                >
                                  <FileIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {!loading && cases.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <ScienceIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No Genetic Analysis Cases
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start by creating a new paternity testing case
            </Typography>
            <Button
              variant="contained"
              startIcon={<ScienceIcon />}
              onClick={() => setNewCaseDialog(true)}
              sx={{
                backgroundColor: '#8EC74F',
                '&:hover': { backgroundColor: '#6BA23A' }
              }}
            >
              Create First Case
            </Button>
          </Box>
        )}
      </Paper>

      {/* Dialogs */}
      <NewCaseDialog
        open={newCaseDialog}
        onClose={() => setNewCaseDialog(false)}
        onCaseCreated={handleCaseCreated}
      />

      <FileUploadDialog
        open={uploadDialog}
        onClose={() => setUploadDialog(false)}
        selectedCase={selectedCase}
        onUploadComplete={handleUploadComplete}
      />

      <CaseDetailsDialog
        open={caseDetailsDialog}
        onClose={() => {
          setCaseDetailsDialog(false);
          setSelectedCase(null);
        }}
        caseData={selectedCase}
        onStartAnalysis={handleStartAnalysis}
      />


      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GeneticAnalysis;