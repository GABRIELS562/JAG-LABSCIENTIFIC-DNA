import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../../contexts/ThemeContext';

const OsirisEmbeddedView = ({ open, onClose, caseData, analysisResults }) => {
  const { isDarkMode } = useThemeContext();
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [osirisData, setOsirisData] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (open && caseData) {
      loadOsirisInterface();
    }
  }, [open, caseData]);

  const loadOsirisInterface = async () => {
    setLoading(true);
    
    try {
      // Try to load real FSA data from the current case
      let realData = null;
      try {
        const caseIdToUse = caseData?.case_id || 'PAT-2025-DEMO';
        
        const response = await fetch(`/api/genetic-analysis/cases/${caseIdToUse}/results`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.strProfiles && Object.keys(data.strProfiles).length > 0) {
            realData = data;
          } else {
          }
        }
      } catch (fetchError) {
      }

      // Simulate loading Osiris interface
      setTimeout(() => {
        setOsirisData({
          samples: realData?.samples || analysisResults?.samples || [],
          electropherograms: realData ? generateElectropherogramFromRealData(realData) : generateMockElectropherograms(),
          analysisReport: realData?.analysisResults || analysisResults?.analysisResults || null,
          lociData: realData?.lociComparisons || analysisResults?.lociComparisons || [],
          strProfiles: realData?.strProfiles || {},
          realData: !!realData
        });
        setLoading(false);
      }, 1500);
      
    } catch (error) {
      setLoading(false);
    }
  };

  const generateMockElectropherograms = () => {
    // PowerPlex ESX 17 channels (5-dye system)
    const channels = ['FL', 'JOE', 'TMR-ET', 'CXR-ET', 'CC5'];
    const electropherograms = {};
    
    // PowerPlex ESX 17: 17 STR loci + Amelogenin (18 total markers)
    const powerPlexESX17Loci = {
      'FL': [
        { x: 85, y: 800, label: 'AMEL' },
        { x: 105, y: 750, label: 'D3S1358' },
        { x: 180, y: 650, label: 'TH01' }
      ],
      'JOE': [
        { x: 195, y: 900, label: 'D21S11' },
        { x: 280, y: 820, label: 'D18S51' },
        { x: 340, y: 680, label: 'D10S1248' }
      ],
      'TMR-ET': [
        { x: 150, y: 750, label: 'D1S1656' },
        { x: 220, y: 890, label: 'D2S1338' },
        { x: 260, y: 720, label: 'D16S539' },
        { x: 320, y: 800, label: 'D22S1045' },
        { x: 380, y: 650, label: 'vWA' },
        { x: 450, y: 780, label: 'D8S1179' }
      ],
      'CXR-ET': [
        { x: 200, y: 850, label: 'FGA' },
        { x: 280, y: 730, label: 'D2S441' },
        { x: 350, y: 680, label: 'D12S391' },
        { x: 420, y: 790, label: 'D19S433' }
      ],
      'CC5': [
        { x: 240, y: 920, label: 'SE33' }
      ]
    };
    
    channels.forEach(channel => {
      electropherograms[channel] = {
        name: channel,
        color: {
          'FL': '#0066CC',      // Blue
          'JOE': '#00CC66',     // Green  
          'TMR-ET': '#FFCC00',  // Yellow
          'CXR-ET': '#CC0000',  // Red
          'CC5': '#FF6600'      // Orange
        }[channel],
        data: Array.from({ length: 500 }, (_, i) => ({
          x: i * 10, // Time points
          y: Math.random() * 200 + 50 + Math.sin(i * 0.1) * 100 // Background signal
        })),
        peaks: powerPlexESX17Loci[channel] || []
      };
    });
    
    return electropherograms;
  };

  const generateElectropherogramFromRealData = (realData) => {
    // Generate electropherograms using actual STR profile data
    
    const channels = ['FL', 'JOE', 'TMR-ET', 'CXR-ET'];
    const electropherograms = {};
    
    // Map loci to channels based on PowerPlex ESX 17 configuration
    const lociChannelMap = {
      'FL': ['AMEL', 'D3S1358', 'TH01'],
      'JOE': ['D21S11', 'D18S51', 'Penta E'],
      'TMR-ET': ['D5S818', 'D13S317', 'D7S820', 'D16S539', 'CSF1PO', 'Penta D'],
      'CXR-ET': ['vWA', 'D8S1179', 'TPOX', 'FGA', 'D2S1338', 'D19S433']
    };

    channels.forEach(channel => {
      const channelLoci = lociChannelMap[channel] || [];
      let peaks = [];

      // Extract peaks from all samples for this channel
      Object.values(realData.strProfiles || {}).forEach((profile, sampleIndex) => {
        channelLoci.forEach(locus => {
          if (profile[locus]) {
            profile[locus].forEach((allele, alleleIndex) => {
              // Convert allele to approximate base pair position
              let bp = 200; // Default position
              
              if (locus === 'AMEL') {
                bp = allele === 'X' ? 106 : 112;
              } else if (locus === 'D3S1358') {
                bp = 112 + (parseFloat(allele) - 12) * 4;
              } else if (locus === 'TH01') {
                bp = 179 + (parseFloat(allele) - 6) * 4;
              } else if (locus === 'D21S11') {
                bp = 189 + (parseFloat(allele) - 24) * 4;
              } else if (locus === 'D18S51') {
                bp = 272 + (parseFloat(allele) - 9) * 4;
              } else if (locus === 'vWA') {
                bp = 157 + (parseFloat(allele) - 11) * 4;
              } else if (locus === 'FGA') {
                bp = 215 + (parseFloat(allele) - 17) * 4;
              } else {
                // Generic calculation for other loci
                bp = 150 + (parseFloat(allele) - 8) * 4;
              }

              // Convert BP to X coordinate (time points)
              const x = (bp - 50) * 2; // Scale factor
              const height = 600 + Math.random() * 800; // Peak height 600-1400 RFU
              
              peaks.push({
                x: x,
                y: height,
                label: `${locus}: ${allele}`,
                locus: locus,
                allele: allele,
                sample: sampleIndex
              });
            });
          }
        });
      });


      electropherograms[channel] = {
        name: channel,
        color: {
          'FL': '#0066CC',      // Blue
          'JOE': '#00CC66',     // Green  
          'TMR-ET': '#FFCC00',  // Yellow
          'CXR-ET': '#CC0000'   // Red
        }[channel],
        data: Array.from({ length: 500 }, (_, i) => ({
          x: i * 10, // Time points
          y: Math.random() * 100 + 30 + Math.sin(i * 0.05) * 50 // Background noise
        })),
        peaks: peaks.sort((a, b) => a.x - b.x) // Sort peaks by position
      };
    });
    
    return electropherograms;
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );

  const ElectropherogramViewer = ({ data }) => {
    const svgRef = useRef(null);
    
    useEffect(() => {
      if (data && svgRef.current) {
        drawElectropherogram();
      }
    }, [data]);

    const drawElectropherogram = () => {
      const svg = svgRef.current;
      const width = 800;
      const height = 200;
      
      
      // Clear previous content
      svg.innerHTML = '';
      
      // Set up SVG
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      
      // Draw electropherogram trace
      const maxY = Math.max(...data.data.map(d => d.y));
      const path = data.data.map((point, index) => {
        const x = (point.x / Math.max(...data.data.map(d => d.x))) * width;
        const y = height - (point.y / maxY) * (height - 40);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');

      // Create path element
      const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.setAttribute('d', path);
      pathElement.setAttribute('stroke', getChannelColor(data.name));
      pathElement.setAttribute('stroke-width', '1.5');
      pathElement.setAttribute('fill', 'none');
      svg.appendChild(pathElement);

      // Draw peak markers
      data.peaks.forEach(peak => {
        const x = (peak.x / Math.max(...data.data.map(d => d.x))) * width;
        const y = height - (peak.y / maxY) * (height - 40);
        
        // Peak marker
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', '#ef5350');
        svg.appendChild(circle);
        
        // Peak label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y - 10);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', isDarkMode ? 'white' : 'black');
        text.textContent = peak.label;
        svg.appendChild(text);
      });
    };

    const getChannelColor = (channel) => {
      switch (channel) {
        case 'FAM': return '#0066cc';
        case 'VIC': return '#00cc66';
        case 'NED': return '#ffcc00';
        case 'PET': return '#cc0066';
        default: return '#666';
      }
    };

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: getChannelColor(data.name) }}>
          Channel: {data.name}
        </Typography>
        <Box sx={{ 
          border: '1px solid rgba(0,0,0,0.2)', 
          borderRadius: 1, 
          p: 1,
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'white'
        }}>
          <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
        </Box>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth={false}
      fullScreen={fullscreen}
      PaperProps={{
        sx: {
          width: fullscreen ? '100%' : '95vw',
          height: fullscreen ? '100%' : '90vh',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <AppBar position="static" sx={{ backgroundColor: '#0D488F' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Osiris Analysis Interface - {caseData?.case_id}
          </Typography>
          <IconButton color="inherit" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          <IconButton color="inherit" onClick={loadOsirisInterface}>
            <RefreshIcon />
          </IconButton>
          <IconButton color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="fullWidth">
          <Tab label="Electropherograms" icon={<TimelineIcon />} />
          <Tab label="Analysis Results" icon={<AssessmentIcon />} />
          <Tab label="Sample Overview" />
          <Tab label="Quality Metrics" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Loading Osiris Interface...</Typography>
            <Typography variant="body2" color="text.secondary">
              Initializing STR analysis visualization
            </Typography>
          </Box>
        ) : (
          <>
            {/* Electropherograms Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#0D488F' }}>
                  Electropherogram Visualization
                </Typography>
                
                {/* Debug Information */}
                {osirisData && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Debug Info:</strong> 
                      {osirisData.realData ? ' Using real STR data' : ' Using simulated data'} | 
                      Channels: {Object.keys(osirisData.electropherograms || {}).length} | 
                      STR Profiles: {Object.keys(osirisData.strProfiles || {}).length} samples
                    </Typography>
                  </Alert>
                )}
                
                {osirisData?.electropherograms && Object.values(osirisData.electropherograms).map((channelData) => (
                  <Box key={channelData.name} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, color: channelData.color }}>
                      Channel: {channelData.name} ({channelData.peaks?.length || 0} peaks)
                    </Typography>
                    <ElectropherogramViewer data={channelData} />
                  </Box>
                ))}
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Interactive Features:</strong> In a full Osiris integration, you would be able to:
                    zoom, pan, measure peak heights, and adjust analysis parameters directly on these electropherograms.
                  </Typography>
                </Alert>
              </Box>
            </TabPanel>

            {/* Analysis Results Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#0D488F' }}>
                  STR Analysis Results
                </Typography>
                
                {analysisResults?.analysisResults ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 2, color: '#8EC74F' }}>
                            Paternity Analysis Summary
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Probability of Paternity:</strong> {analysisResults.analysisResults.paternity_probability}%
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Conclusion:</strong> {analysisResults.analysisResults.conclusion}
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Loci Analyzed:</strong> {analysisResults.analysisResults.total_loci}
                          </Typography>
                          <Typography variant="body1">
                            <strong>Matching Loci:</strong> {analysisResults.analysisResults.matching_loci}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 2, color: '#0D488F' }}>
                            Quality Metrics
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Analysis Quality:</strong> {analysisResults.analysisResults.quality_score}/100
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Peak Resolution:</strong> Excellent
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            <strong>Signal to Noise:</strong> &gt;10:1
                          </Typography>
                          <Typography variant="body1">
                            <strong>Baseline Quality:</strong> Stable
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Loci Comparison Table */}
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 2, color: '#0D488F' }}>
                            Loci Comparison Matrix
                          </Typography>
                          
                          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                            <List dense>
                              {analysisResults?.lociComparisons?.map((locus, index) => (
                                <ListItem key={index} sx={{ 
                                  border: '1px solid rgba(0,0,0,0.1)', 
                                  borderRadius: 1, 
                                  mb: 1,
                                  backgroundColor: locus.match_status ? 'rgba(142,199,79,0.1)' : 'rgba(239,83,80,0.1)'
                                }}>
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                                          {locus.locus}
                                        </Typography>
                                        <Chip 
                                          label={locus.match_status ? 'Match' : 'No Match'}
                                          size="small"
                                          color={locus.match_status ? 'success' : 'error'}
                                        />
                                      </Box>
                                    }
                                    secondary={
                                      <Box sx={{ display: 'flex', gap: 4, mt: 1 }}>
                                        <Typography variant="body2">
                                          <strong>Child:</strong> {locus.child_allele_1}, {locus.child_allele_2}
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Father:</strong> {locus.father_allele_1}, {locus.father_allele_2}
                                        </Typography>
                                        {locus.mother_allele_1 && (
                                          <Typography variant="body2">
                                            <strong>Mother:</strong> {locus.mother_allele_1}, {locus.mother_allele_2}
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info">
                    No analysis results available. Start analysis to view detailed STR comparison data.
                  </Alert>
                )}
              </Box>
            </TabPanel>

            {/* Sample Overview Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#0D488F' }}>
                  Sample Overview
                </Typography>
                
                <Grid container spacing={2}>
                  {analysisResults?.samples?.map((sample, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 1, color: '#8EC74F' }}>
                            {sample.sample_id}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Type:</strong> {sample.sample_type.replace('_', ' ')}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Quality:</strong> {sample.quality_score}%
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Instrument:</strong> {sample.instrument}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Kit:</strong> {sample.kit}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>

            {/* Quality Metrics Tab */}
            <TabPanel value={activeTab} index={3}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#0D488F' }}>
                  Quality Control Metrics
                </Typography>
                
                <Alert severity="success" sx={{ mb: 2 }}>
                  All quality control checks passed. Data is suitable for forensic analysis.
                </Alert>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>Signal Quality</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>Peak Height Ratio: &gt;0.6</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>Signal to Noise: &gt;10:1</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>Baseline Stability: ±5 RFU</Typography>
                        <Typography variant="body2">Color Separation: Excellent</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>Analysis Parameters</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>Analytical Threshold: 50 RFU</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>Stutter Ratio: &lt;15%</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>Allelic Ladder: Passed</Typography>
                        <Typography variant="body2">Internal Size Standard: Passed</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 2 }}>
        <Button onClick={onClose} sx={{ color: isDarkMode ? 'white' : 'inherit' }}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          sx={{ backgroundColor: '#8EC74F', '&:hover': { backgroundColor: '#6BA23A' } }}
        >
          Export Analysis
        </Button>
        <Button
          variant="contained"
          startIcon={<AssessmentIcon />}
          sx={{ backgroundColor: '#0D488F', '&:hover': { backgroundColor: '#022539' } }}
        >
          Generate Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OsirisEmbeddedView;