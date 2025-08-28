import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  LinearProgress,
  Chip,
  Paper,
  Alert,
  Button,
  Slider,
  Stack
} from '@mui/material';
import {
  Science,
  Biotech,
  Analytics,
  Speed,
  CheckCircle,
  Error,
  Refresh,
  PlayArrow,
  Stop,
  TrendingUp
} from '@mui/icons-material';
import { api } from '../../services/api';

const ForensicWorkflowDashboard = () => {
  const [simulatorStatus, setSimulatorStatus] = useState(null);
  const [workflowMetrics, setWorkflowMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(10);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Workflow stage configurations
  const workflowStages = [
    { id: 'sample_collected', name: 'Sample Collection', icon: '🧪', color: '#3b82f6' },
    { id: 'dna_extraction', name: 'DNA Extraction', icon: '🧬', color: '#8b5cf6' },
    { id: 'pcr_ready', name: 'PCR Ready', icon: '⏳', color: '#f59e0b' },
    { id: 'pcr_batched', name: 'PCR Batched', icon: '📦', color: '#f97316' },
    { id: 'pcr_completed', name: 'PCR Complete', icon: '✅', color: '#84cc16' },
    { id: 'electro_ready', name: 'Electrophoresis Ready', icon: '⚡', color: '#06b6d4' },
    { id: 'electro_batched', name: 'Electrophoresis Batched', icon: '📊', color: '#0891b2' },
    { id: 'electro_completed', name: 'Electrophoresis Complete', icon: '✔️', color: '#10b981' },
    { id: 'analysis_ready', name: 'STR Analysis Ready', icon: '🔬', color: '#6366f1' },
    { id: 'analysis_completed', name: 'STR Analysis Complete', icon: '📈', color: '#8b5cf6' },
    { id: 'report_ready', name: 'Report Ready', icon: '📄', color: '#ec4899' },
    { id: 'report_sent', name: 'Report Sent', icon: '✉️', color: '#10b981' }
  ];

  const fetchSimulatorStatus = async () => {
    try {
      const response = await api.get('/admin/jobs/status');
      if (response.data?.forensicSimulator) {
        setSimulatorStatus(response.data.forensicSimulator);
        setWorkflowMetrics(response.data.forensicSimulator.metrics || {});
      }
    } catch (error) {
      console.error('Failed to fetch simulator status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeedChange = async (event, newValue) => {
    setSimulationSpeed(newValue);
    try {
      await api.post(`/admin/forensic/speed/${newValue}`);
    } catch (error) {
      console.error('Failed to update simulation speed:', error);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  useEffect(() => {
    fetchSimulatorStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSimulatorStatus, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStageCount = (stageId) => {
    return simulatorStatus?.queueByStage?.[stageId] || 0;
  };

  const getTotalSamplesInProcess = () => {
    if (!simulatorStatus?.queueByStage) return 0;
    return Object.values(simulatorStatus.queueByStage).reduce((sum, count) => sum + count, 0);
  };

  const getSuccessRate = () => {
    const total = workflowMetrics.totalSamplesProcessed || 1;
    const successful = workflowMetrics.successfulCompletions || 0;
    return ((successful / total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading forensic workflow data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
          🧬 Forensic DNA Workflow Monitor
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          Real-time monitoring of DNA paternity testing laboratory operations
        </Typography>
      </Paper>

      {/* Control Panel */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Simulation Control
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography gutterBottom>Speed: {simulationSpeed}x</Typography>
                  <Slider
                    value={simulationSpeed}
                    onChange={handleSpeedChange}
                    min={1}
                    max={100}
                    marks={[
                      { value: 1, label: '1x' },
                      { value: 10, label: '10x' },
                      { value: 50, label: '50x' },
                      { value: 100, label: '100x' }
                    ]}
                  />
                </Box>
                <Button
                  variant={autoRefresh ? "contained" : "outlined"}
                  onClick={toggleAutoRefresh}
                  startIcon={autoRefresh ? <Stop /> : <PlayArrow />}
                >
                  {autoRefresh ? 'Stop Auto-Refresh' : 'Start Auto-Refresh'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lab Capacity
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Extraction Stations
                  </Typography>
                  <Typography variant="h4">
                    {simulatorStatus?.labCapacity?.extractionStations || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Thermal Cyclers
                  </Typography>
                  <Typography variant="h4">
                    {simulatorStatus?.labCapacity?.thermalCyclers || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Genetic Analyzers
                  </Typography>
                  <Typography variant="h4">
                    {simulatorStatus?.labCapacity?.geneticAnalyzers || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Daily Target
                  </Typography>
                  <Typography variant="h4">
                    {simulatorStatus?.labCapacity?.dailySampleTarget || 0}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#f0f9ff' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Science sx={{ color: '#3b82f6', mr: 1 }} />
                <Typography variant="h6">Active Samples</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#3b82f6' }}>
                {getTotalSamplesInProcess()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Currently in workflow
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#f0fdf4' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ color: '#10b981', mr: 1 }} />
                <Typography variant="h6">Success Rate</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#10b981' }}>
                {getSuccessRate()}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {workflowMetrics.successfulCompletions || 0} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#fef3c7' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Speed sx={{ color: '#f59e0b', mr: 1 }} />
                <Typography variant="h6">Avg TAT</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#f59e0b' }}>
                {workflowMetrics.averageTAT ? `${workflowMetrics.averageTAT.toFixed(1)}h` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Turnaround time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#fef2f2' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Refresh sx={{ color: '#ef4444', mr: 1 }} />
                <Typography variant="h6">Reruns</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#ef4444' }}>
                {workflowMetrics.reruns || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Quality issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Workflow Pipeline Visualization */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            DNA Processing Pipeline
          </Typography>
          <Box sx={{ overflowX: 'auto', py: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, minWidth: 1200 }}>
              {workflowStages.map((stage, index) => {
                const count = getStageCount(stage.id);
                const hasBottleneck = workflowMetrics.bottlenecks?.[stage.id];
                
                return (
                  <React.Fragment key={stage.id}>
                    <Paper
                      elevation={count > 0 ? 3 : 1}
                      sx={{
                        p: 2,
                        minWidth: 150,
                        textAlign: 'center',
                        border: hasBottleneck ? '2px solid #ef4444' : 'none',
                        bgcolor: count > 0 ? `${stage.color}10` : 'background.paper',
                        position: 'relative',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Typography variant="h3" sx={{ mb: 1 }}>
                        {stage.icon}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {stage.name}
                      </Typography>
                      {count > 0 && (
                        <Chip
                          label={count}
                          size="small"
                          sx={{
                            bgcolor: stage.color,
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                      {hasBottleneck && (
                        <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                          Bottleneck!
                        </Alert>
                      )}
                    </Paper>
                    {index < workflowStages.length - 1 && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TrendingUp sx={{ color: '#9ca3af' }} />
                      </Box>
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Bottlenecks Alert */}
      {Object.keys(workflowMetrics.bottlenecks || {}).length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Bottlenecks Detected
          </Typography>
          {Object.entries(workflowMetrics.bottlenecks).map(([stage, count]) => (
            <Typography key={stage} variant="body2">
              {stage.replace(/_/g, ' ').toUpperCase()}: {count} samples queued
            </Typography>
          ))}
        </Alert>
      )}

      {/* Status Bar */}
      <Paper sx={{ p: 2, bgcolor: simulatorStatus?.isRunning ? '#f0fdf4' : '#fef2f2' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: simulatorStatus?.isRunning ? '#10b981' : '#ef4444',
                mr: 2,
                animation: simulatorStatus?.isRunning ? 'pulse 2s infinite' : 'none'
              }}
            />
            <Typography variant="body1">
              Forensic Simulator: {simulatorStatus?.isRunning ? 'RUNNING' : 'STOPPED'}
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary">
            Active Processes: {simulatorStatus?.activeProcesses || 0} | 
            Queue Depth: {simulatorStatus?.queueDepth || 0}
          </Typography>
        </Box>
      </Paper>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  );
};

export default ForensicWorkflowDashboard;