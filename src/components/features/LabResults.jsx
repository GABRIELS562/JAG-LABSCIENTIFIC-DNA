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
  Divider,
  Tabs,
  Tab,
  styled
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
  Storage as DataIcon,
  Upload as UploadIcon,
  Analytics as AnalyticsIcon,
  GetApp as GetAppIcon
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
  
  // GeneMapper parser states
  const [geneMapperData, setGeneMapperData] = useState(null);
  const [transformedData, setTransformedData] = useState(null);
  const [paternityReport, setPaternityReport] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [parserTab, setParserTab] = useState(0);

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

  // GeneMapper data processing functions
  const parseGeneMapperFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          const data = [];
          
          // Skip header line and process data
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
              const columns = line.split('\t');
              if (columns.length >= 7) {
                data.push({
                  sample: columns[0],
                  marker: columns[1],
                  dye: columns[2],
                  allele1: columns[3],
                  allele2: columns[4],
                  height1: columns[5],
                  height2: columns[6],
                  area1: columns[7] || '',
                  area2: columns[8] || ''
                });
              }
            }
          }
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const transformGeneMapperData = (rawData) => {
    // Group by sample
    const sampleGroups = {};
    
    rawData.forEach(row => {
      if (!sampleGroups[row.sample]) {
        sampleGroups[row.sample] = [];
      }
      sampleGroups[row.sample].push(row);
    });

    // Sort markers alphabetically for each sample
    Object.keys(sampleGroups).forEach(sample => {
      sampleGroups[sample].sort((a, b) => a.marker.localeCompare(b.marker));
    });

    return sampleGroups;
  };

  const generatePaternityReport = (transformedData) => {
    const sampleNames = Object.keys(transformedData);
    
    // Find child and father samples
    const childSample = sampleNames.find(name => 
      name.toLowerCase().includes('child') || 
      name.toLowerCase().includes('ch') ||
      name.match(/\d+[CF]$/)
    );
    
    const fatherSample = sampleNames.find(name => 
      name.toLowerCase().includes('father') || 
      name.toLowerCase().includes('af') ||
      name.toLowerCase().includes('dad') ||
      name.match(/\d+[AF]$/)
    );

    if (!childSample || !fatherSample) {
      return {
        error: 'Could not identify child and father samples automatically',
        samples: sampleNames
      };
    }

    const childData = transformedData[childSample];
    const fatherData = transformedData[fatherSample];

    // Calculate paternity analysis
    const analysis = [];
    let totalPI = 1;
    let matchingLoci = 0;
    let totalLoci = 0;

    // Get common markers
    const childMarkers = new Set(childData.map(d => d.marker));
    const fatherMarkers = new Set(fatherData.map(d => d.marker));
    const commonMarkers = [...childMarkers].filter(m => fatherMarkers.has(m)).sort();

    commonMarkers.forEach(marker => {
      const childAlleles = childData.find(d => d.marker === marker);
      const fatherAlleles = fatherData.find(d => d.marker === marker);
      
      if (childAlleles && fatherAlleles) {
        totalLoci++;
        
        const childSet = new Set([childAlleles.allele1, childAlleles.allele2].filter(a => a && a !== ''));
        const fatherSet = new Set([fatherAlleles.allele1, fatherAlleles.allele2].filter(a => a && a !== ''));
        
        // Check for allele sharing
        const sharedAlleles = [...childSet].filter(allele => fatherSet.has(allele));
        const isCompatible = sharedAlleles.length > 0;
        
        if (isCompatible) {
          matchingLoci++;
        }

        // Simple PI calculation (would need population frequencies for accuracy)
        let pi = isCompatible ? 2.0 : 0.01;
        totalPI *= pi;

        analysis.push({
          marker,
          childAlleles: Array.from(childSet).join('/'),
          fatherAlleles: Array.from(fatherSet).join('/'),
          sharedAlleles: sharedAlleles.join('/') || 'None',
          compatible: isCompatible,
          pi: pi
        });
      }
    });

    const cpi = totalPI;
    const probabilityOfPaternity = (cpi / (cpi + 1)) * 100;

    let conclusion = '';
    if (probabilityOfPaternity >= 99.9) {
      conclusion = 'The alleged father is not excluded as the biological father';
    } else if (probabilityOfPaternity < 0.1) {
      conclusion = 'The alleged father is excluded as the biological father';
    } else {
      conclusion = 'Results are inconclusive';
    }

    return {
      childSample,
      fatherSample,
      analysis,
      summary: {
        totalLoci,
        matchingLoci,
        exclusions: totalLoci - matchingLoci,
        cpi: cpi.toExponential(2),
        probabilityOfPaternity: probabilityOfPaternity.toFixed(2),
        conclusion
      }
    };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      const rawData = await parseGeneMapperFile(file);
      setGeneMapperData(rawData);
      
      const transformed = transformGeneMapperData(rawData);
      setTransformedData(transformed);
      
      const report = generatePaternityReport(transformed);
      setPaternityReport(report);
      
      setParserTab(1); // Switch to results tab
    } catch (error) {
      setError('Error parsing GeneMapper file: ' + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadTransformedData = () => {
    if (!transformedData) return;
    
    let csvContent = 'Sample,Marker,Allele1,Allele2,Height1,Height2\n';
    
    Object.entries(transformedData).forEach(([sample, data]) => {
      data.forEach(row => {
        csvContent += `${sample},${row.marker},${row.allele1},${row.allele2},${row.height1},${row.height2}\n`;
      });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transformed_genemapper_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPaternityReport = () => {
    if (!paternityReport) return;
    
    let reportContent = `PATERNITY ANALYSIS REPORT\n`;
    reportContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    reportContent += `Child Sample: ${paternityReport.childSample}\n`;
    reportContent += `Father Sample: ${paternityReport.fatherSample}\n\n`;
    reportContent += `SUMMARY:\n`;
    reportContent += `Total Loci: ${paternityReport.summary.totalLoci}\n`;
    reportContent += `Matching Loci: ${paternityReport.summary.matchingLoci}\n`;
    reportContent += `Exclusions: ${paternityReport.summary.exclusions}\n`;
    reportContent += `Combined Paternity Index: ${paternityReport.summary.cpi}\n`;
    reportContent += `Probability of Paternity: ${paternityReport.summary.probabilityOfPaternity}%\n`;
    reportContent += `Conclusion: ${paternityReport.summary.conclusion}\n\n`;
    reportContent += `DETAILED ANALYSIS:\n`;
    reportContent += `Marker\tChild\tFather\tShared\tCompatible\tPI\n`;
    
    paternityReport.analysis.forEach(row => {
      reportContent += `${row.marker}\t${row.childAlleles}\t${row.fatherAlleles}\t${row.sharedAlleles}\t${row.compatible ? 'Yes' : 'No'}\t${row.pi}\n`;
    });
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paternity_report.txt';
    a.click();
    URL.revokeObjectURL(url);
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

      {/* GeneMapper Results Parser */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="genemapper-content"
          id="genemapper-header"
        >
          <Box display="flex" alignItems="center" gap={2}>
            <AnalyticsIcon color="primary" />
            <Typography variant="h6">
              GeneMapper Results Parser & Analyzer
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ width: '100%' }}>
            <Tabs 
              value={parserTab} 
              onChange={(e, newValue) => setParserTab(newValue)}
              aria-label="GeneMapper parser tabs"
            >
              <Tab label="Upload Data" />
              <Tab label="Results" disabled={!geneMapperData} />
              <Tab label="Paternity Report" disabled={!paternityReport} />
            </Tabs>
            
            {/* Upload Tab */}
            {parserTab === 0 && (
              <Box sx={{ mt: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Upload GeneMapper Allele Report
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Upload a tab-delimited file from GeneMapper containing allele report data. 
                      The file should include columns for Sample, Marker, Dye, Allele1, Allele2, Height1, Height2.
                    </Typography>
                    
                    <Box sx={{ 
                      border: '2px dashed #ccc', 
                      borderRadius: 2, 
                      p: 4, 
                      textAlign: 'center',
                      backgroundColor: '#fafafa'
                    }}>
                      <input
                        accept=".txt,.tsv,.csv"
                        style={{ display: 'none' }}
                        id="genemapper-file-input"
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploadLoading}
                      />
                      <label htmlFor="genemapper-file-input">
                        <Button
                          variant="contained"
                          component="span"
                          startIcon={uploadLoading ? <CircularProgress size={20} /> : <UploadIcon />}
                          disabled={uploadLoading}
                          size="large"
                        >
                          {uploadLoading ? 'Processing...' : 'Select GeneMapper File'}
                        </Button>
                      </label>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Supported formats: .txt, .tsv, .csv
                      </Typography>
                    </Box>

                    {geneMapperData && (
                      <Alert severity="success" sx={{ mt: 3 }}>
                        Successfully parsed {geneMapperData.length} data rows from GeneMapper file.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Results Tab */}
            {parserTab === 1 && transformedData && (
              <Box sx={{ mt: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h6">
                        Transformed Data by Sample
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<GetAppIcon />}
                        onClick={downloadTransformedData}
                      >
                        Download CSV
                      </Button>
                    </Box>

                    {Object.entries(transformedData).map(([sample, data]) => (
                      <Accordion key={sample} sx={{ mb: 2 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {sample} ({data.length} markers)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Marker</TableCell>
                                  <TableCell>Dye</TableCell>
                                  <TableCell>Allele 1</TableCell>
                                  <TableCell>Allele 2</TableCell>
                                  <TableCell>Height 1</TableCell>
                                  <TableCell>Height 2</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {data.map((row, index) => (
                                  <TableRow key={index}>
                                    <TableCell fontWeight="bold">{row.marker}</TableCell>
                                    <TableCell>{row.dye}</TableCell>
                                    <TableCell>{row.allele1}</TableCell>
                                    <TableCell>{row.allele2}</TableCell>
                                    <TableCell>{row.height1}</TableCell>
                                    <TableCell>{row.height2}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Paternity Report Tab */}
            {parserTab === 2 && paternityReport && (
              <Box sx={{ mt: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h6">
                        Paternity Analysis Report
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<GetAppIcon />}
                        onClick={downloadPaternityReport}
                      >
                        Download Report
                      </Button>
                    </Box>

                    {paternityReport.error ? (
                      <Alert severity="warning" sx={{ mb: 3 }}>
                        {paternityReport.error}
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Available samples: {paternityReport.samples?.join(', ')}
                        </Typography>
                      </Alert>
                    ) : (
                      <>
                        {/* Summary */}
                        <Box sx={{ mb: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                          <Typography variant="h6" gutterBottom>Summary</Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2" color="text.secondary">Child Sample</Typography>
                              <Typography variant="body1" fontWeight="bold">{paternityReport.childSample}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2" color="text.secondary">Father Sample</Typography>
                              <Typography variant="body1" fontWeight="bold">{paternityReport.fatherSample}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2" color="text.secondary">Probability of Paternity</Typography>
                              <Typography variant="h5" color="primary" fontWeight="bold">
                                {paternityReport.summary.probabilityOfPaternity}%
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2" color="text.secondary">Combined PI</Typography>
                              <Typography variant="body1" fontWeight="bold">{paternityReport.summary.cpi}</Typography>
                            </Grid>
                          </Grid>
                          
                          <Alert 
                            severity={
                              parseFloat(paternityReport.summary.probabilityOfPaternity) >= 99.9 ? 'success' :
                              parseFloat(paternityReport.summary.probabilityOfPaternity) < 0.1 ? 'error' : 'warning'
                            } 
                            sx={{ mt: 2 }}
                          >
                            <Typography variant="body1" fontWeight="bold">
                              {paternityReport.summary.conclusion}
                            </Typography>
                          </Alert>
                        </Box>

                        {/* Detailed Analysis */}
                        <Typography variant="h6" gutterBottom>Detailed Marker Analysis</Typography>
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Marker</TableCell>
                                <TableCell>Child Alleles</TableCell>
                                <TableCell>Father Alleles</TableCell>
                                <TableCell>Shared Alleles</TableCell>
                                <TableCell>Compatible</TableCell>
                                <TableCell>PI</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {paternityReport.analysis.map((row, index) => (
                                <TableRow key={index}>
                                  <TableCell fontWeight="bold">{row.marker}</TableCell>
                                  <TableCell>{row.childAlleles}</TableCell>
                                  <TableCell>{row.fatherAlleles}</TableCell>
                                  <TableCell>{row.sharedAlleles}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={row.compatible ? 'Yes' : 'No'}
                                      color={row.compatible ? 'success' : 'error'}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>{row.pi}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

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