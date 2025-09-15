import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Science as ScienceIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Launch as LaunchIcon,
  Folder as FolderIcon,
  Assessment as AssessmentIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const OsirisIntegration = ({ caseData, onAnalysisComplete }) => {
  const { isDarkMode } = useThemeContext();
  
  // Osiris state
  const [osirisStatus, setOsirisStatus] = useState({
    initialized: false,
    version: null,
    path: null,
    workspace: null,
    error: null,
    requiresInstallation: false
  });
  
  // Analysis state
  const [analysisState, setAnalysisState] = useState({
    running: false,
    completed: false,
    error: null,
    progress: 0,
    currentStep: 0,
    results: null,
    outputFiles: []
  });
  
  // UI state
  const [installDialog, setInstallDialog] = useState(false);
  const [guiOpen, setGuiOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const analysisSteps = [
    'Preparing workspace',
    'Copying FSA files',
    'Configuring analysis parameters',
    'Running Osiris analysis',
    'Processing results',
    'Complete'
  ];

  // Initialize Osiris integration
  useEffect(() => {
    if (window.osirisAPI) {
      // Listen for Osiris status updates
      window.osirisAPI.onStatusUpdate((status) => {
        setOsirisStatus(status);
        
        if (status.requiresInstallation) {
          setInstallDialog(true);
        }
      });

      // Listen for analysis results
      window.osirisAPI.onResults((results) => {
        handleAnalysisResults(results);
      });

      // Listen for Osiris logs
      window.osirisAPI.onLog((logData) => {
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString(),
          type: logData.type,
          data: logData.data
        }]);
      });

      // Listen for GUI close events
      window.osirisAPI.onGUIClosed((data) => {
        setGuiOpen(false);
      });

      return () => {
        window.osirisAPI.removeAllListeners('osiris-status');
        window.osirisAPI.removeAllListeners('osiris-results');
        window.osirisAPI.removeAllListeners('osiris-log');
        window.osirisAPI.removeAllListeners('osiris-gui-closed');
      };
    }
  }, []);

  const handleAnalysisResults = useCallback((results) => {
    setAnalysisState(prev => ({
      ...prev,
      completed: true,
      running: false,
      results: results.data,
      outputFiles: results.filePath ? [results.filePath] : prev.outputFiles,
      progress: 100,
      currentStep: analysisSteps.length - 1
    }));

    if (onAnalysisComplete) {
      onAnalysisComplete({
        success: true,
        results: results.data,
        outputFiles: results.filePath ? [results.filePath] : [],
        osirisCompliant: true
      });
    }
  }, [onAnalysisComplete, analysisSteps.length]);

  const handleSelectOsirisInstallation = async () => {
    try {
      const result = await window.osirisAPI.selectInstallation();
      
      if (result.success) {
        setOsirisStatus(prev => ({
          ...prev,
          initialized: true,
          path: result.path,
          error: null,
          requiresInstallation: false
        }));
        setInstallDialog(false);
      } else {
        setOsirisStatus(prev => ({
          ...prev,
          error: result.error
        }));
      }
    } catch (error) {
      setOsirisStatus(prev => ({
        ...prev,
        error: error.message
      }));
    }
  };

  const handleStartAnalysis = async () => {
    if (!caseData || !caseData.fsaFiles || caseData.fsaFiles.length === 0) {
      setAnalysisState(prev => ({
        ...prev,
        error: 'No FSA files available for analysis'
      }));
      return;
    }

    try {
      setAnalysisState({
        running: true,
        completed: false,
        error: null,
        progress: 0,
        currentStep: 0,
        results: null,
        outputFiles: []
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAnalysisState(prev => {
          if (prev.progress < 90) {
            const newProgress = prev.progress + 10;
            const newStep = Math.floor((newProgress / 100) * (analysisSteps.length - 1));
            return {
              ...prev,
              progress: newProgress,
              currentStep: newStep
            };
          }
          return prev;
        });
      }, 1000);

      const result = await window.osirisAPI.analyzeCase({
        caseId: caseData.case_id,
        fsaFiles: caseData.fsaFiles,
        analysisType: 'paternity',
        parameters: {
          kit: 'PowerPlex_ESX_17',
          minRFU: 150,
          stutterThreshold: 0.15
        }
      });

      clearInterval(progressInterval);

      if (result.success) {
        setAnalysisState(prev => ({
          ...prev,
          running: false,
          completed: true,
          progress: 100,
          currentStep: analysisSteps.length - 1,
          outputFiles: result.outputFiles || []
        }));
      } else {
        setAnalysisState(prev => ({
          ...prev,
          running: false,
          error: result.error
        }));
      }
    } catch (error) {
      setAnalysisState(prev => ({
        ...prev,
        running: false,
        error: error.message
      }));
    }
  };

  const handleOpenOsirisGUI = async () => {
    try {
      setGuiOpen(true);
      const result = await window.osirisAPI.openGUI({
        caseId: caseData.case_id,
        workspace: osirisStatus.workspace
      });

      if (!result.success) {
        setGuiOpen(false);
      }
    } catch (error) {
      setGuiOpen(false);
    }
  };

  const getStatusColor = (status) => {
    if (status.initialized) return '#8EC74F';
    if (status.error) return '#ef5350';
    return '#ff9800';
  };

  const getStatusIcon = (status) => {
    if (status.initialized) return <CheckCircleIcon sx={{ color: '#8EC74F' }} />;
    if (status.error) return <ErrorIcon sx={{ color: '#ef5350' }} />;
    return <WarningIcon sx={{ color: '#ff9800' }} />;
  };

  return (
    <Box>
      {/* Osiris Status Card */}
      <Card sx={{ 
        mb: 3,
        border: `2px solid ${getStatusColor(osirisStatus)}`,
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {getStatusIcon(osirisStatus)}
              <Box>
                <Typography variant="h6" sx={{ color: getStatusColor(osirisStatus), fontWeight: 'bold' }}>
                  Osiris 2.16 Integration Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Real-time STR Analysis Platform
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {osirisStatus.initialized && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`v${osirisStatus.version || '2.16'}`}
                  color="success"
                  size="small"
                />
              )}
              
              {guiOpen && (
                <Chip
                  icon={<LaunchIcon />}
                  label="GUI Active"
                  sx={{ backgroundColor: '#0D488F', color: 'white' }}
                  size="small"
                />
              )}
            </Box>
          </Box>

          {osirisStatus.initialized ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Installation Path:</strong> {osirisStatus.path}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Workspace:</strong> {osirisStatus.workspace}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> Ready for analysis
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<ScienceIcon />}
                    onClick={handleStartAnalysis}
                    disabled={analysisState.running || !caseData?.fsaFiles?.length}
                    sx={{ backgroundColor: '#8EC74F', '&:hover': { backgroundColor: '#6BA23A' } }}
                  >
                    {analysisState.running ? 'Analyzing...' : 'Start Osiris Analysis'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<LaunchIcon />}
                    onClick={handleOpenOsirisGUI}
                    disabled={guiOpen}
                    sx={{ borderColor: '#0D488F', color: '#0D488F' }}
                  >
                    {guiOpen ? 'GUI Running' : 'Open Osiris GUI'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Alert severity={osirisStatus.error ? "error" : "warning"} sx={{ mt: 2 }}>
              {osirisStatus.error || "Osiris 2.16 installation not detected"}
              {osirisStatus.requiresInstallation && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setInstallDialog(true)}
                  sx={{ ml: 2 }}
                >
                  Select Installation
                </Button>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {(analysisState.running || analysisState.completed) && (
        <Card sx={{ mb: 3, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#0D488F' }}>
              🔬 Osiris Analysis Progress
            </Typography>
            
            <LinearProgress 
              variant="determinate" 
              value={analysisState.progress} 
              sx={{ 
                mb: 2, 
                height: 8, 
                borderRadius: 4,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: analysisState.completed ? '#8EC74F' : '#0D488F'
                }
              }} 
            />
            
            <Stepper activeStep={analysisState.currentStep} orientation="vertical">
              {analysisSteps.map((step, index) => (
                <Step key={step}>
                  <StepLabel>{step}</StepLabel>
                  {index === analysisState.currentStep && analysisState.running && (
                    <StepContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Processing...</Typography>
                      </Box>
                    </StepContent>
                  )}
                </Step>
              ))}
            </Stepper>

            {analysisState.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Analysis Error: {analysisState.error}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisState.completed && (
        <Card sx={{ mb: 3, backgroundColor: isDarkMode ? 'rgba(142,199,79,0.1)' : 'rgba(142,199,79,0.05)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#8EC74F' }}>
              ✅ Osiris Analysis Complete
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Analysis Status:</strong> Complete
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Output Files:</strong> {analysisState.outputFiles.length}
                </Typography>
                <Typography variant="body2">
                  <strong>Osiris Compliant:</strong> Yes
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<LaunchIcon />}
                    onClick={handleOpenOsirisGUI}
                    sx={{ backgroundColor: '#0D488F', '&:hover': { backgroundColor: '#022539' } }}
                  >
                    View in Osiris
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => setShowLogs(true)}
                    sx={{ borderColor: '#8EC74F', color: '#8EC74F' }}
                  >
                    View Results
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {logs.length > 0 && (
        <Card sx={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#666' }}>
                🔍 Osiris Integration Logs
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? 'Hide' : 'Show'} Logs
              </Button>
            </Box>
            
            {showLogs && (
              <Box sx={{ 
                maxHeight: 200, 
                overflow: 'auto', 
                backgroundColor: isDarkMode ? '#000' : '#f5f5f5',
                p: 1,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.8rem'
              }}>
                {logs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#666' }}>
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span style={{ color: log.type === 'stderr' ? '#ff6b6b' : '#51cf66', marginLeft: '8px' }}>
                      [{log.type}]
                    </span>
                    <span style={{ marginLeft: '8px' }}>
                      {log.data}
                    </span>
                  </div>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Osiris Installation Dialog */}
      <Dialog open={installDialog} onClose={() => setInstallDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          ⚙️ Osiris 2.16 Installation Required
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Osiris 2.16 was not found on this system. Please install Osiris or select an existing installation.
          </Alert>
          
          <Typography variant="h6" sx={{ mb: 2 }}>
            Installation Options:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <FolderIcon sx={{ fontSize: 48, color: '#0D488F', mb: 1 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Select Existing Installation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Browse for an existing Osiris installation on your system
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleSelectOsirisInstallation}
                  sx={{ backgroundColor: '#0D488F' }}
                >
                  Browse for Osiris
                </Button>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <DownloadIcon sx={{ fontSize: 48, color: '#8EC74F', mb: 1 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Download Osiris 2.16
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download the official Osiris 2.16 from NCBI
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => window.electronAPI?.openExternal('https://github.com/ncbi/osiris')}
                  sx={{ backgroundColor: '#8EC74F' }}
                >
                  Download from NCBI
                </Button>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OsirisIntegration;