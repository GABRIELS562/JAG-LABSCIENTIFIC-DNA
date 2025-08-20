import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Switch,
  FormControlLabel,
  Slider,
  Tooltip
} from '@mui/material';
import {
  PsychologyOutlined as AI,
  Timeline,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  BuildCircle,
  Analytics,
  TrendingUp,
  Speed,
  Memory,
  Insights,
  AutoAwesome,
  Refresh,
  Settings,
  Visibility,
  PlayArrow,
  Schedule,
  Assessment,
  BugReport,
  Lightbulb,
  TrendingDown,
  Science
} from '@mui/icons-material';

const AIMachineLearning = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Predictive Maintenance State
  const [sensors, setSensors] = useState([]);
  const [maintenancePredictions, setMaintenancePredictions] = useState([]);
  const [sensorReadings, setSensorReadings] = useState([]);
  
  // Anomaly Detection State
  const [qcAnomalies, setQcAnomalies] = useState([]);
  const [anomalyPatterns, setAnomalyPatterns] = useState([]);
  const [scanningInProgress, setScanningInProgress] = useState(false);
  
  // Workflow Optimization State
  const [optimizationSuggestions, setOptimizationSuggestions] = useState([]);
  const [workflowMetrics, setWorkflowMetrics] = useState({});
  
  // Demand Forecasting State
  const [demandForecasts, setDemandForecasts] = useState([]);
  const [forecastSettings, setForecastSettings] = useState({ months_ahead: 3, forecast_type: 'all' });
  
  // AI Dashboard State
  const [dashboardStats, setDashboardStats] = useState({});

  useEffect(() => {
    loadData();
  }, [tabValue]);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (tabValue) {
        case 0: // Predictive Maintenance
          await loadPredictiveMaintenanceData();
          break;
        case 1: // Anomaly Detection
          await loadAnomalyDetectionData();
          break;
        case 2: // Workflow Optimization
          await loadWorkflowOptimizationData();
          break;
        case 3: // Demand Forecasting
          await loadDemandForecastingData();
          break;
      }
    } catch (error) {
      showSnackbar('Failed to load data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    // Mock dashboard stats
    const mockStats = {
      predictive_maintenance: {
        total_predictions: 15,
        pending_predictions: 8,
        high_risk_predictions: 3,
        avg_confidence: 0.78
      },
      anomaly_detection: {
        total_anomalies: 42,
        unreviewed_anomalies: 12,
        critical_anomalies: 2,
        false_positives: 8
      },
      workflow_optimization: {
        total_suggestions: 18,
        pending_suggestions: 10,
        implemented_suggestions: 5,
        avg_confidence: 0.72
      },
      demand_forecasting: {
        total_forecasts: 24,
        pending_forecasts: 12,
        avg_accuracy: 0.84,
        next_month_forecasts: 8
      }
    };
    setDashboardStats(mockStats);
  };

  const loadPredictiveMaintenanceData = async () => {
    // Mock predictive maintenance data
    const mockSensors = [
      {
        id: 1,
        sensor_name: 'Temperature',
        equipment_name: 'PCR Thermocycler #1',
        latest_reading: 25.3,
        normal_range_min: 20.0,
        normal_range_max: 30.0,
        alerts_24h: 2,
        equipment_status: 'active'
      },
      {
        id: 2,
        sensor_name: 'Voltage',
        equipment_name: 'Genetic Analyzer',
        latest_reading: 220.1,
        normal_range_min: 210.0,
        normal_range_max: 240.0,
        alerts_24h: 0,
        equipment_status: 'active'
      }
    ];

    const mockPredictions = [
      {
        id: 1,
        equipment_name: 'PCR Thermocycler #1',
        prediction_type: 'maintenance_due',
        predicted_date: '2025-09-15',
        confidence_score: 0.87,
        risk_level: 'medium',
        recommendation: 'Schedule maintenance inspection within 2 weeks',
        acknowledged: false,
        days_until_predicted: 26
      },
      {
        id: 2,
        equipment_name: 'Centrifuge #1',
        prediction_type: 'calibration_due',
        predicted_date: '2025-09-01',
        confidence_score: 0.92,
        risk_level: 'high',
        recommendation: 'Immediate inspection required',
        acknowledged: false,
        days_until_predicted: 12
      }
    ];

    setSensors(mockSensors);
    setMaintenancePredictions(mockPredictions);
  };

  const loadAnomalyDetectionData = async () => {
    // Mock anomaly detection data
    const mockAnomalies = [
      {
        id: 1,
        batch_number: 'LDS_045',
        metric_type: 'peak_height',
        anomaly_type: 'outlier',
        severity: 'high',
        confidence_score: 0.89,
        detected_value: 1250.5,
        expected_value: 1000.0,
        detection_date: '2025-08-19T14:30:00Z',
        reviewed: false,
        pattern_name: 'Peak Height Outlier'
      },
      {
        id: 2,
        batch_number: 'LDS_044',
        metric_type: 'contamination_signal',
        anomaly_type: 'spike',
        severity: 'critical',
        confidence_score: 0.95,
        detected_value: 85.2,
        expected_value: 5.0,
        detection_date: '2025-08-18T10:15:00Z',
        reviewed: true,
        pattern_name: 'Contamination Signal'
      }
    ];

    const mockPatterns = [
      { id: 1, pattern_name: 'Peak Height Outlier', pattern_type: 'outlier', active: true, sensitivity: 0.95 },
      { id: 2, pattern_name: 'Contamination Signal', pattern_type: 'spike', active: true, sensitivity: 0.98 },
      { id: 3, pattern_name: 'Quality Score Drift', pattern_type: 'trend', active: true, sensitivity: 0.85 }
    ];

    setQcAnomalies(mockAnomalies);
    setAnomalyPatterns(mockPatterns);
  };

  const loadWorkflowOptimizationData = async () => {
    // Mock workflow optimization data
    const mockSuggestions = [
      {
        id: 1,
        suggestion_type: 'bottleneck_removal',
        title: 'Optimize DNA Extraction Performance',
        description: 'The DNA Extraction step is taking 135 minutes on average, which is 35% longer than estimated. Consider reviewing protocols or equipment.',
        confidence_score: 0.82,
        implementation_effort: 'medium',
        status: 'pending',
        impact_estimate: { time_savings_minutes: 25, efficiency_improvement: 15 }
      },
      {
        id: 2,
        suggestion_type: 'resource_allocation',
        title: 'Optimize Operator Assignment',
        description: 'Analysis shows significant performance variations between operators. Consider cross-training and optimized task assignment.',
        confidence_score: 0.75,
        implementation_effort: 'medium',
        status: 'reviewed',
        impact_estimate: { efficiency_improvement: 15, quality_improvement: 10 }
      }
    ];

    const mockMetrics = {
      avgEfficiency: 78.5,
      bottlenecks: 3,
      totalSteps: 10,
      avgDuration: 285
    };

    setOptimizationSuggestions(mockSuggestions);
    setWorkflowMetrics(mockMetrics);
  };

  const loadDemandForecastingData = async () => {
    // Mock demand forecasting data
    const mockForecasts = [
      {
        id: 1,
        item_name: 'Taq DNA Polymerase',
        forecast_date: '2025-09-01',
        predicted_value: 45,
        confidence_interval_lower: 38,
        confidence_interval_upper: 52,
        forecast_type: 'item_demand',
        model_accuracy: 0.87
      },
      {
        id: 2,
        forecast_date: '2025-09-01',
        predicted_value: 125,
        confidence_interval_lower: 110,
        confidence_interval_upper: 140,
        forecast_type: 'test_volume',
        model_accuracy: 0.82
      }
    ];

    setDemandForecasts(mockForecasts);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleGeneratePredictions = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSnackbar('Maintenance predictions generated successfully');
      loadPredictiveMaintenanceData();
    } catch (error) {
      showSnackbar('Failed to generate predictions: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnomalyScan = async () => {
    setScanningInProgress(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      showSnackbar('Anomaly detection scan completed');
      loadAnomalyDetectionData();
    } catch (error) {
      showSnackbar('Failed to run anomaly scan: ' + error.message, 'error');
    } finally {
      setScanningInProgress(false);
    }
  };

  const handleGenerateOptimizations = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSnackbar('Optimization suggestions generated successfully');
      loadWorkflowOptimizationData();
    } catch (error) {
      showSnackbar('Failed to generate optimizations: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecasts = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSnackbar('Demand forecasts generated successfully');
      loadDemandForecastingData();
    } catch (error) {
      showSnackbar('Failed to generate forecasts: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRiskChip = (risk) => {
    const riskConfig = {
      low: { color: 'success', label: 'Low Risk' },
      medium: { color: 'warning', label: 'Medium Risk' },
      high: { color: 'error', label: 'High Risk' }
    };

    const config = riskConfig[risk] || riskConfig.medium;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getSeverityChip = (severity) => {
    const severityConfig = {
      low: { color: 'info', icon: <CheckCircle /> },
      medium: { color: 'warning', icon: <Warning /> },
      high: { color: 'error', icon: <Warning /> },
      critical: { color: 'error', icon: <ErrorIcon /> }
    };

    const config = severityConfig[severity] || severityConfig.medium;
    return (
      <Chip
        icon={config.icon}
        label={severity.toUpperCase()}
        color={config.color}
        size="small"
        variant="filled"
      />
    );
  };

  const renderPredictiveMaintenance = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Predictive Maintenance</Typography>
        <Button
          variant="contained"
          startIcon={<AutoAwesome />}
          onClick={handleGeneratePredictions}
          disabled={loading}
        >
          Generate Predictions
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Equipment Sensors Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box display="flex" alignItems="center">
                  <Memory sx={{ mr: 1 }} />
                  Equipment Sensors
                </Box>
              </Typography>
              <List>
                {sensors.map((sensor) => (
                  <ListItem key={sensor.id}>
                    <ListItemIcon>
                      <BuildCircle 
                        color={sensor.alerts_24h > 0 ? 'warning' : 'success'} 
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${sensor.equipment_name} - ${sensor.sensor_name}`}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Current: {sensor.latest_reading} 
                            (Range: {sensor.normal_range_min}-{sensor.normal_range_max})
                          </Typography>
                          {sensor.alerts_24h > 0 && (
                            <Typography variant="body2" color="warning.main">
                              {sensor.alerts_24h} alerts in last 24h
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Maintenance Predictions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box display="flex" alignItems="center">
                  <Timeline sx={{ mr: 1 }} />
                  Maintenance Predictions
                </Box>
              </Typography>
              <List>
                {maintenancePredictions.map((prediction) => (
                  <ListItem key={prediction.id}>
                    <ListItemIcon>
                      <Schedule color={prediction.risk_level === 'high' ? 'error' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={prediction.equipment_name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {prediction.prediction_type.replace('_', ' ')} - {prediction.days_until_predicted} days
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {prediction.recommendation}
                          </Typography>
                          <Box display="flex" gap={1} alignItems="center">
                            {getRiskChip(prediction.risk_level)}
                            <Chip 
                              label={`${(prediction.confidence_score * 100).toFixed(0)}% confidence`} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                    />
                    {!prediction.acknowledged && (
                      <Button size="small" variant="outlined">
                        Acknowledge
                      </Button>
                    )}
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderAnomalyDetection = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Quality Control Anomaly Detection</Typography>
        <Button
          variant="contained"
          startIcon={scanningInProgress ? <CircularProgress size={20} /> : <BugReport />}
          onClick={handleRunAnomalyScan}
          disabled={scanningInProgress}
        >
          {scanningInProgress ? 'Scanning...' : 'Run Anomaly Scan'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Recent Anomalies */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Anomalies</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Batch</TableCell>
                      <TableCell>Metric Type</TableCell>
                      <TableCell>Anomaly Type</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Confidence</TableCell>
                      <TableCell>Detected</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {qcAnomalies.map((anomaly) => (
                      <TableRow key={anomaly.id}>
                        <TableCell>{anomaly.batch_number}</TableCell>
                        <TableCell>{anomaly.metric_type}</TableCell>
                        <TableCell>
                          <Chip label={anomaly.anomaly_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{getSeverityChip(anomaly.severity)}</TableCell>
                        <TableCell>{(anomaly.confidence_score * 100).toFixed(0)}%</TableCell>
                        <TableCell>
                          {new Date(anomaly.detection_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={anomaly.reviewed ? 'Reviewed' : 'Pending'}
                            color={anomaly.reviewed ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Detection Patterns */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Detection Patterns</Typography>
              <List>
                {anomalyPatterns.map((pattern) => (
                  <ListItem key={pattern.id}>
                    <ListItemText
                      primary={pattern.pattern_name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Type: {pattern.pattern_type}
                          </Typography>
                          <Box display="flex" alignItems="center" mt={1}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              Sensitivity: {(pattern.sensitivity * 100).toFixed(0)}%
                            </Typography>
                            <Switch
                              size="small"
                              checked={pattern.active}
                              onChange={(e) => {
                                // Handle pattern toggle
                                console.log('Toggle pattern:', pattern.id, e.target.checked);
                              }}
                            />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderWorkflowOptimization = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Workflow Optimization</Typography>
        <Button
          variant="contained"
          startIcon={<Insights />}
          onClick={handleGenerateOptimizations}
          disabled={loading}
        >
          Generate Suggestions
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Current Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Current Metrics</Typography>
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Average Efficiency
                </Typography>
                <Box display="flex" alignItems="center">
                  <Typography variant="h4" color="primary">
                    {workflowMetrics.avgEfficiency}%
                  </Typography>
                  <TrendingUp sx={{ ml: 1, color: theme.palette.success.main }} />
                </Box>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Bottlenecks Identified
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {workflowMetrics.bottlenecks}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Average Duration (min)
                </Typography>
                <Typography variant="h4">
                  {workflowMetrics.avgDuration}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Optimization Suggestions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Optimization Suggestions</Typography>
              <List>
                {optimizationSuggestions.map((suggestion) => (
                  <ListItem key={suggestion.id} alignItems="flex-start">
                    <ListItemIcon>
                      <Lightbulb color={suggestion.confidence_score > 0.8 ? 'warning' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={suggestion.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" paragraph>
                            {suggestion.description}
                          </Typography>
                          <Box display="flex" gap={1} alignItems="center" mb={1}>
                            <Chip 
                              label={suggestion.suggestion_type.replace('_', ' ')} 
                              size="small" 
                              variant="outlined"
                            />
                            <Chip 
                              label={`${(suggestion.confidence_score * 100).toFixed(0)}% confidence`} 
                              size="small" 
                              color="primary"
                            />
                            <Chip 
                              label={`${suggestion.implementation_effort} effort`} 
                              size="small" 
                              color="info"
                            />
                          </Box>
                          <Typography variant="body2" color="success.main">
                            Potential Impact: {suggestion.impact_estimate.time_savings_minutes && 
                              `${suggestion.impact_estimate.time_savings_minutes} min savings, `}
                            {suggestion.impact_estimate.efficiency_improvement}% efficiency improvement
                          </Typography>
                        </Box>
                      }
                    />
                    <Box>
                      <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                        Review
                      </Button>
                      <Button size="small" variant="contained" color="success">
                        Implement
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderDemandForecasting = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Demand Forecasting</Typography>
        <Button
          variant="contained"
          startIcon={<TrendingUp />}
          onClick={handleGenerateForecasts}
          disabled={loading}
        >
          Generate Forecasts
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Forecast Settings */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Forecast Settings</Typography>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>
                  Months Ahead: {forecastSettings.months_ahead}
                </Typography>
                <Slider
                  value={forecastSettings.months_ahead}
                  onChange={(e, value) => setForecastSettings(prev => ({ ...prev, months_ahead: value }))}
                  min={1}
                  max={12}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
              
              <TextField
                fullWidth
                select
                label="Forecast Type"
                value={forecastSettings.forecast_type}
                onChange={(e) => setForecastSettings(prev => ({ ...prev, forecast_type: e.target.value }))}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="item_demand">Item Demand</MenuItem>
                <MenuItem value="test_volume">Test Volume</MenuItem>
                <MenuItem value="resource_utilization">Resource Utilization</MenuItem>
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        {/* Forecasts */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Demand Forecasts</Typography>
              <List>
                {demandForecasts.map((forecast) => (
                  <ListItem key={forecast.id} alignItems="flex-start">
                    <ListItemIcon>
                      {forecast.forecast_type === 'item_demand' ? <Science /> : <Assessment />}
                    </ListItemIcon>
                    <ListItemText
                      primary={forecast.item_name || `${forecast.forecast_type.replace('_', ' ')} Forecast`}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Forecast for: {new Date(forecast.forecast_date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            Predicted: {forecast.predicted_value} units
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Range: {forecast.confidence_interval_lower} - {forecast.confidence_interval_upper} units
                          </Typography>
                          <Box mt={1}>
                            <LinearProgress
                              variant="determinate"
                              value={forecast.model_accuracy * 100}
                              sx={{ mr: 1, width: '100px', display: 'inline-block' }}
                            />
                            <Typography variant="body2" component="span">
                              {(forecast.model_accuracy * 100).toFixed(0)}% accuracy
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        <Box display="flex" alignItems="center">
          <AI sx={{ mr: 2, fontSize: 40 }} />
          AI & Machine Learning
        </Box>
      </Typography>

      {/* Dashboard Summary */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                  <BuildCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {dashboardStats.predictive_maintenance?.pending_predictions || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Maintenance Alerts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.error.main, mr: 2 }}>
                  <BugReport />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {dashboardStats.anomaly_detection?.unreviewed_anomalies || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Unreviewed Anomalies
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.warning.main, mr: 2 }}>
                  <Lightbulb />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {dashboardStats.workflow_optimization?.pending_suggestions || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Optimization Ideas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: theme.palette.success.main, mr: 2 }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {((dashboardStats.demand_forecasting?.avg_accuracy || 0) * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Forecast Accuracy
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
          >
            <Tab icon={<BuildCircle />} label="Predictive Maintenance" />
            <Tab icon={<BugReport />} label="Anomaly Detection" />
            <Tab icon={<Insights />} label="Workflow Optimization" />
            <Tab icon={<TrendingUp />} label="Demand Forecasting" />
          </Tabs>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Box mt={2}>
        {tabValue === 0 && renderPredictiveMaintenance()}
        {tabValue === 1 && renderAnomalyDetection()}
        {tabValue === 2 && renderWorkflowOptimization()}
        {tabValue === 3 && renderDemandForecasting()}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AIMachineLearning;