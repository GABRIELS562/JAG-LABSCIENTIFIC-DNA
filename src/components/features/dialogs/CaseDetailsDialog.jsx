import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as DownloadIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Help as HelpIcon,
  Visibility as VisibilityIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../../contexts/ThemeContext';
import OsirisEmbeddedView from './OsirisEmbeddedView';
import OsirisIntegration from '../OsirisIntegration';

const CaseDetailsDialog = ({ open, onClose, caseData, onStartAnalysis }) => {
  const { isDarkMode } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [caseDetails, setCaseDetails] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [osirisViewOpen, setOsirisViewOpen] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);

  useEffect(() => {
    if (open && caseData) {
      fetchCaseDetails();
    }
  }, [open, caseData]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/genetic-analysis/cases/${caseData.case_id}/results`);
      const data = await response.json();
      
      if (data.success) {
        setCaseDetails(data);
      } else {
        setError(data.error || 'Failed to fetch case details');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/genetic-analysis/cases/${caseData.case_id}/analyze`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchCaseDetails(); // Refresh case details
        if (onStartAnalysis) {
          onStartAnalysis(data);
        }
      } else {
        setError(data.error || 'Failed to start analysis');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportType = 'full') => {
    setReportGenerating(true);
    
    try {
      const response = await fetch(`/api/genetic-analysis/cases/${caseData.case_id}/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reportType })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Download the report
        window.open(data.downloadUrl, '_blank');
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setReportGenerating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'analysis_complete':
        return '#8EC74F';
      case 'in_progress':
      case 'running':
        return '#0D488F';
      case 'failed':
        return '#ef5350';
      case 'pending':
      case 'queued':
        return '#ff9800';
      default:
        return '#666';
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

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  if (!caseData) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
          backdropFilter: 'blur(10px)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ScienceIcon sx={{ color: '#8EC74F' }} />
            <Typography variant="h6" sx={{ color: isDarkMode ? 'white' : '#0D488F' }}>
              Case Details: {caseData.case_id}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={caseData.status}
              sx={{
                backgroundColor: getStatusColor(caseData.status),
                color: 'white',
                textTransform: 'capitalize'
              }}
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading && !caseDetails ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Loading case details...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : caseDetails ? (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="fullWidth"
              >
                <Tab label="Overview" icon={<AssessmentIcon />} />
                <Tab label="Samples" icon={<PersonAddIcon />} />
                <Tab label="STR Analysis" icon={<ScienceIcon />} />
                <Tab label="Timeline" icon={<TimelineIcon />} />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {/* Overview Tab */}
              <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                  {/* Case Information */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      border: '1px solid rgba(13,72,143,0.1)'
                    }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, color: '#0D488F' }}>
                          Case Information
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Case ID:</strong> {caseDetails.case.case_id}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Type:</strong> {caseDetails.case.case_type}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Priority:</strong> {caseDetails.case.priority}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Created:</strong> {new Date(caseDetails.case.created_date).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Status:</strong> {caseDetails.case.status}
                        </Typography>
                        {caseDetails.case.notes && (
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            <strong>Notes:</strong> {caseDetails.case.notes}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Sample Summary */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      border: '1px solid rgba(142,199,79,0.1)'
                    }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, color: '#8EC74F' }}>
                          Sample Summary
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Total Samples:</strong> {caseDetails.samples.length}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                          {caseDetails.samples.reduce((acc, sample) => {
                            acc[sample.sample_type] = (acc[sample.sample_type] || 0) + 1;
                            return acc;
                          }, {}) && Object.entries(
                            caseDetails.samples.reduce((acc, sample) => {
                              acc[sample.sample_type] = (acc[sample.sample_type] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([type, count]) => (
                            <Chip
                              key={type}
                              label={`${type.replace('_', ' ')}: ${count}`}
                              size="small"
                              sx={{
                                backgroundColor: type === 'child' ? '#8EC74F' : 
                                               type === 'alleged_father' ? '#0D488F' : '#ff9800',
                                color: 'white',
                                textTransform: 'capitalize'
                              }}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Analysis Results */}
                  {caseDetails.analysisResults && (
                    <Grid item xs={12}>
                      <Card sx={{ 
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        border: '2px solid rgba(142,199,79,0.2)'
                      }}>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 3, color: '#8EC74F' }}>
                            Analysis Results
                          </Typography>
                          
                          <Grid container spacing={3}>
                            <Grid item xs={12} md={3}>
                              <Box sx={{ textAlign: 'center', p: 2 }}>
                                <Typography variant="h3" sx={{ 
                                  color: getConclusionColor(caseDetails.analysisResults.conclusion),
                                  fontWeight: 'bold'
                                }}>
                                  {formatProbability(caseDetails.analysisResults.paternity_probability)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Paternity Probability
                                </Typography>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={3}>
                              <Box sx={{ textAlign: 'center', p: 2 }}>
                                <Typography variant="h3" sx={{ 
                                  color: '#0D488F',
                                  fontWeight: 'bold'
                                }}>
                                  {caseDetails.analysisResults.matching_loci || 0}/{caseDetails.analysisResults.total_loci || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Matching Loci
                                </Typography>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={3}>
                              <Box sx={{ textAlign: 'center', p: 2 }}>
                                <Chip
                                  label={caseDetails.analysisResults.conclusion || 'Pending'}
                                  size="large"
                                  sx={{
                                    backgroundColor: getConclusionColor(caseDetails.analysisResults.conclusion),
                                    color: 'white',
                                    textTransform: 'capitalize',
                                    fontSize: '1.1rem',
                                    p: 2
                                  }}
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  Conclusion
                                </Typography>
                              </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={3}>
                              <Box sx={{ textAlign: 'center', p: 2 }}>
                                <Typography variant="h3" sx={{ 
                                  color: '#0D488F',
                                  fontWeight: 'bold'
                                }}>
                                  {caseDetails.analysisResults.quality_score || 0}/100
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Quality Score
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {/* Analysis Queue Status */}
                  {caseDetails.queueStatus && (
                    <Grid item xs={12}>
                      <Alert 
                        severity={
                          caseDetails.queueStatus.status === 'completed' ? 'success' :
                          caseDetails.queueStatus.status === 'failed' ? 'error' :
                          caseDetails.queueStatus.status === 'running' ? 'info' : 'warning'
                        }
                        sx={{ mb: 2 }}
                      >
                        <Typography variant="body2">
                          <strong>Analysis Status:</strong> {caseDetails.queueStatus.status}
                          {caseDetails.queueStatus.error_message && (
                            <><br /><strong>Error:</strong> {caseDetails.queueStatus.error_message}</>
                          )}
                        </Typography>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              {/* Samples Tab */}
              <TabPanel value={activeTab} index={1}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: isDarkMode ? 'rgba(13,72,143,0.1)' : 'rgba(13,72,143,0.05)' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Sample ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Filename</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Quality</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Received</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {caseDetails.samples.map((sample) => (
                        <TableRow key={sample.sample_id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0D488F' }}>
                              {sample.sample_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={sample.sample_type.replace('_', ' ')}
                              size="small"
                              sx={{
                                backgroundColor: sample.sample_type === 'child' ? '#8EC74F' : 
                                               sample.sample_type === 'alleged_father' ? '#0D488F' : '#ff9800',
                                color: 'white',
                                textTransform: 'capitalize'
                              }}
                            />
                          </TableCell>
                          <TableCell>{sample.original_filename}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={sample.quality_score || 0}
                                sx={{ width: 60, height: 8, borderRadius: 4 }}
                                color={sample.quality_score > 80 ? 'success' : sample.quality_score > 60 ? 'warning' : 'error'}
                              />
                              <Typography variant="body2">
                                {sample.quality_score || 0}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={sample.status}
                              size="small"
                              color={sample.status === 'processed' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(sample.received_date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* STR Analysis Tab */}
              <TabPanel value={activeTab} index={2}>
                {/* Real Osiris Integration */}
                <OsirisIntegration
                  caseData={{
                    ...caseDetails.case,
                    fsaFiles: caseDetails.samples.map(sample => ({
                      path: sample.file_path || '/mock/path/' + sample.original_filename,
                      name: sample.original_filename,
                      sampleId: sample.sample_id,
                      sampleType: sample.sample_type
                    }))
                  }}
                  onAnalysisComplete={(results) => {
                    // Refresh case details with new results
                    fetchCaseDetails();
                  }}
                />
                
                {caseDetails.analysisResults && (
                  <Box sx={{ mt: 4 }}>

                    {/* Loci Comparison Table */}
                    {caseDetails.lociComparisons && caseDetails.lociComparisons.length > 0 && (
                      <Box sx={{ mt: 4 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: '#0D488F' }}>
                          STR Loci Comparison
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: isDarkMode ? 'rgba(13,72,143,0.1)' : 'rgba(13,72,143,0.05)' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Locus</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Child</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Father</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Mother</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Match</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {caseDetails.lociComparisons.map((locus) => (
                                <TableRow key={locus.locus}>
                                  <TableCell sx={{ fontWeight: 'bold' }}>{locus.locus}</TableCell>
                                  <TableCell>
                                    {locus.child_allele_1}, {locus.child_allele_2}
                                  </TableCell>
                                  <TableCell>
                                    {locus.father_allele_1}, {locus.father_allele_2}
                                  </TableCell>
                                  <TableCell>
                                    {locus.mother_allele_1 ? `${locus.mother_allele_1}, ${locus.mother_allele_2}` : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {locus.match_status ? (
                                      <CheckCircleIcon sx={{ color: '#8EC74F' }} />
                                    ) : (
                                      <CancelIcon sx={{ color: '#ef5350' }} />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </Box>
                )}
                
                {!caseDetails.analysisResults && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Upload FSA files and use the Osiris integration above to perform real STR analysis.
                  </Alert>
                )}
              </TabPanel>

              {/* Timeline Tab */}
              <TabPanel value={activeTab} index={3}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon sx={{ color: '#8EC74F' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Case Created"
                      secondary={new Date(caseDetails.case.created_date).toLocaleString()}
                    />
                  </ListItem>
                  
                  {caseDetails.samples.length > 0 && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon sx={{ color: '#8EC74F' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${caseDetails.samples.length} Samples Uploaded`}
                        secondary={new Date(caseDetails.samples[0].received_date).toLocaleString()}
                      />
                    </ListItem>
                  )}
                  
                  {caseDetails.queueStatus && (
                    <ListItem>
                      <ListItemIcon>
                        {caseDetails.queueStatus.status === 'completed' ? (
                          <CheckCircleIcon sx={{ color: '#8EC74F' }} />
                        ) : caseDetails.queueStatus.status === 'failed' ? (
                          <CancelIcon sx={{ color: '#ef5350' }} />
                        ) : (
                          <HelpIcon sx={{ color: '#ff9800' }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={`Analysis ${caseDetails.queueStatus.status}`}
                        secondary={
                          caseDetails.queueStatus.completed_date ? 
                          new Date(caseDetails.queueStatus.completed_date).toLocaleString() :
                          caseDetails.queueStatus.started_date ?
                          `Started: ${new Date(caseDetails.queueStatus.started_date).toLocaleString()}` :
                          `Queued: ${new Date(caseDetails.queueStatus.submitted_date).toLocaleString()}`
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </TabPanel>
            </Box>
          </>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button 
          onClick={onClose}
          startIcon={<CloseIcon />}
          sx={{ color: isDarkMode ? 'white' : 'inherit' }}
        >
          Close
        </Button>
        
        {caseDetails?.samples?.length > 0 && caseData.status === 'pending' && (
          <Button
            variant="contained"
            onClick={handleStartAnalysis}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <ScienceIcon />}
            sx={{
              backgroundColor: '#8EC74F',
              '&:hover': { backgroundColor: '#6BA23A' }
            }}
          >
            {loading ? 'Starting...' : 'Start Analysis'}
          </Button>
        )}
        
        {caseDetails?.analysisResults && (
          <>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => setOsirisViewOpen(true)}
              sx={{
                borderColor: '#0D488F',
                color: '#0D488F',
                '&:hover': { 
                  borderColor: '#022539',
                  backgroundColor: 'rgba(13,72,143,0.1)'
                }
              }}
            >
              View Osiris Analysis
            </Button>
            
            <Button
              variant="contained"
              startIcon={reportGenerating ? <CircularProgress size={20} /> : <DescriptionIcon />}
              onClick={() => handleGenerateReport('full')}
              disabled={reportGenerating}
              sx={{
                backgroundColor: '#8EC74F',
                '&:hover': { backgroundColor: '#6BA23A' }
              }}
            >
              {reportGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
            
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleGenerateReport('certificate')}
              disabled={reportGenerating}
              sx={{
                backgroundColor: '#0D488F',
                '&:hover': { backgroundColor: '#022539' }
              }}
            >
              Download Certificate
            </Button>
          </>
        )}
      </DialogActions>

      {/* Osiris Embedded View Dialog */}
      <OsirisEmbeddedView
        open={osirisViewOpen}
        onClose={() => setOsirisViewOpen(false)}
        caseData={caseData}
        analysisResults={caseDetails}
      />
    </Dialog>
  );
};

export default CaseDetailsDialog;