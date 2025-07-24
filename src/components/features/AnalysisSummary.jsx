import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Science as ScienceIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const AnalysisSummary = () => {
  const { isDarkMode } = useThemeContext();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalysisResults = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching analysis results...');
      
      // Try to fetch both Osiris and GeneMapper results
      const [osirisResponse, geneMapperResponse] = await Promise.allSettled([
        fetch('/api/genetic-analysis/results'),
        fetch('/api/genetic-analysis/genemapper-results')
      ]);
      
      let analysisData = null;
      
      // Check Osiris results first
      if (osirisResponse.status === 'fulfilled' && osirisResponse.value.ok) {
        const osirisData = await osirisResponse.value.json();
        if (osirisData.success) {
          analysisData = { ...osirisData, softwareType: 'Osiris' };
          console.log(`📊 Osiris data loaded: ${osirisData.source} (Real data: ${osirisData.isRealData})`);
        }
      }
      
      // Check GeneMapper results if no Osiris data
      if (!analysisData && geneMapperResponse.status === 'fulfilled' && geneMapperResponse.value.ok) {
        const geneMapperData = await geneMapperResponse.value.json();
        if (geneMapperData.success) {
          analysisData = { ...geneMapperData, softwareType: 'GeneMapper' };
          console.log(`📊 GeneMapper data loaded: ${geneMapperData.source}`);
        }
      }
      
      // Check localStorage for GeneMapper results as fallback
      if (!analysisData) {
        const storedGeneMapperResults = localStorage.getItem('genemapper_results');
        if (storedGeneMapperResults) {
          const geneMapperData = JSON.parse(storedGeneMapperResults);
          analysisData = {
            ...geneMapperData,
            softwareType: 'GeneMapper',
            success: true,
            source: 'GeneMapper Local Storage'
          };
          console.log('📊 Using stored GeneMapper results');
        }
      }
      
      if (analysisData) {
        setSummaryData(analysisData);
      } else {
        console.log('❌ No analysis results found from any source');
      }
    } catch (error) {
      console.error('❌ Error fetching analysis results:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysisResults();
  }, [fetchAnalysisResults]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning'; 
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <ScienceIcon />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Typography variant="h6">Loading Analysis Summary...</Typography>
          <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
        </Box>
      </Container>
    );
  }

  if (!summaryData) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="info" icon={<ScienceIcon />}>
          <Typography variant="h6">No Analysis Data Available</Typography>
          <Typography variant="body2">
            Run a genetic analysis first to see summary results here.
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🧬 Analysis Summary
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="subtitle1" color="text.secondary">
              Quick overview of genetic analysis results
            </Typography>
            {summaryData?.softwareType && (
              <Chip
                label={`${summaryData.softwareType} Software`}
                color={summaryData.softwareType === 'Osiris' ? 'primary' : 'secondary'}
                icon={<ScienceIcon />}
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        <Tooltip title="Refresh Data">
          <IconButton onClick={fetchAnalysisResults}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <AssessmentIcon color="primary" />
                <Typography variant="h6">{summaryData.totalSamples}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Samples
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">{summaryData.successfulAnalyses}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Successful
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon color="warning" />
                <Typography variant="h6">{summaryData.requiresReview}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Needs Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <AnalyticsIcon color="info" />
                <Typography variant="h6">{summaryData.analysisTime}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Analysis Time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Sample Results */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader 
              title="Sample Analysis Results"
              subheader={`${summaryData.kit} • ${summaryData.runDate}`}
            />
            <CardContent>
              <List>
                {summaryData.samples.map((sample, index) => (
                  <React.Fragment key={sample.name}>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(sample.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="subtitle1" sx={{ minWidth: 200 }}>
                              {sample.name}
                            </Typography>
                            <Chip 
                              label={`${sample.confidence}%`}
                              color={sample.confidence > 95 ? 'success' : sample.confidence > 85 ? 'warning' : 'error'}
                              size="small"
                            />
                            <Chip 
                              label={`${sample.lociDetected}/16 loci`}
                              variant="outlined"
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          sample.issues.length > 0 ? (
                            <Box sx={{ mt: 1 }}>
                              {sample.issues.map((issue, idx) => (
                                <Chip 
                                  key={idx}
                                  label={issue}
                                  color="warning"
                                  size="small"
                                  sx={{ mr: 1, mb: 0.5 }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="success.main">
                              All parameters within normal range
                            </Typography>
                          )
                        }
                      />
                    </ListItem>
                    {index < summaryData.samples.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quality Metrics */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader title="Quality Metrics" />
            <CardContent>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average RFU
                  </Typography>
                  <Typography variant="h6">
                    {summaryData.qualityMetrics.averageRFU}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Peak Balance
                  </Typography>
                  <Chip 
                    label={summaryData.qualityMetrics.peakBalance}
                    color="success"
                    size="small"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Stutter Ratio
                  </Typography>
                  <Typography variant="body1">
                    {summaryData.qualityMetrics.stutterRatio}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Noise Level
                  </Typography>
                  <Chip 
                    label={summaryData.qualityMetrics.noiseLevel}
                    color="success"
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card sx={{ mt: 2 }}>
            <CardHeader title="Quick Actions" />
            <CardContent>
              <Alert severity="info" icon={<VisibilityIcon />}>
                <Typography variant="body2">
                  <strong>Review Required:</strong> Sample "Negative_Control_ID" shows potential contamination. 
                  Verify results in full Osiris report.
                </Typography>
              </Alert>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Next Steps:
                </Typography>
                <Typography variant="body2">
                  • Review flagged samples in detail
                  • Generate paternity reports for completed cases
                  • Consider rerun for contaminated controls
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* STR Comparison Table */}
      {summaryData?.strComparison && (
        <Card sx={{ mt: 3 }}>
          <CardHeader 
            title="🧬 STR Loci Comparison - Paternity Analysis"
            subheader={`${summaryData.strComparison.motherName} vs ${summaryData.strComparison.childName} vs ${summaryData.strComparison.allegedFatherName}`}
          />
          <CardContent>
            {/* Data Source Indicator */}
            <Box sx={{ mb: 2 }}>
              <Alert 
                severity={summaryData.isRealData ? "success" : "info"}
                icon={summaryData.isRealData ? <ScienceIcon /> : <AssessmentIcon />}
              >
                <Typography variant="body2">
                  <strong>Data Source:</strong> {summaryData.source} 
                  {summaryData.softwareType && ` (${summaryData.softwareType} Software)`}
                  {summaryData.isRealData !== undefined && (
                    summaryData.isRealData ? ' - Real Analysis Results' : ' - Demonstration Data'
                  )}
                </Typography>
              </Alert>
            </Box>

            {/* STR Table */}
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>STR MARKERS</strong></TableCell>
                    <TableCell align="center"><strong>MOTHER</strong><br/><small>{summaryData.strComparison.motherName}</small></TableCell>
                    <TableCell align="center"><strong>CHILD</strong><br/><small>{summaryData.strComparison.childName}</small></TableCell>
                    <TableCell align="center"><strong>ALLEGED FATHER</strong><br/><small>{summaryData.strComparison.allegedFatherName}</small></TableCell>
                    <TableCell align="center"><strong>RESULT</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaryData.strComparison.loci.map((locus, index) => (
                    <TableRow key={locus.locus} sx={{ '&:nth-of-type(odd)': { backgroundColor: isDarkMode ? '#2A2A2A' : '#f5f5f5' } }}>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        {locus.locus}
                      </TableCell>
                      <TableCell align="center">{locus.mother}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {locus.child}
                      </TableCell>
                      <TableCell align="center">{locus.allegedFather}</TableCell>
                      <TableCell align="center">
                        {locus.result === '✓' ? (
                          <CheckIcon color="success" />
                        ) : locus.result === '✗' ? (
                          <CloseIcon color="error" />
                        ) : (
                          <HelpIcon color="warning" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Overall Conclusion */}
            <Box sx={{ mt: 3 }}>
              <Alert 
                severity={
                  summaryData.strComparison.overallConclusion.conclusion === 'INCLUSION' ? 'success' :
                  summaryData.strComparison.overallConclusion.conclusion === 'EXCLUSION' ? 'error' : 'warning'
                }
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">
                  <strong>Conclusion: {summaryData.strComparison.overallConclusion.conclusion}</strong>
                </Typography>
                <Typography variant="body2">
                  {summaryData.strComparison.overallConclusion.interpretation}
                </Typography>
                {summaryData.strComparison.overallConclusion.probability !== 'N/A' && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Probability of Paternity: {summaryData.strComparison.overallConclusion.probability}</strong>
                  </Typography>
                )}
              </Alert>

              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon color="success" />
                  <Typography variant="body2">Not Excluded</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CloseIcon color="error" />
                  <Typography variant="body2">Excluded</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HelpIcon color="warning" />
                  <Typography variant="body2">Inconclusive</Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default AnalysisSummary;