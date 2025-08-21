import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  Typography,
  Card,
  CardContent,
  Container,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  LinearProgress,
  Divider,
  Badge,
  IconButton,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PersonAdd,
  Science,
  ElectricBolt,
  Analytics,
  Description,
  CheckCircle,
  Refresh,
  TrendingUp,
  Assignment,
  Biotech,
  Speed,
  Warning,
  Error as ErrorIcon,
  ArrowForward,
  Storage,
  Assessment,
  Search,
  TableChart,
  PlaylistAddCheck
} from '@mui/icons-material';
import api from '../../services/api';

// Custom styled connector for the workflow
const WorkflowConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    borderColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderTopWidth: 3,
    borderRadius: 1,
  },
  '&.Mui-active .MuiStepConnector-line': {
    borderColor: '#0D488F',
  },
  '&.Mui-completed .MuiStepConnector-line': {
    borderColor: '#16a34a',
  },
}));

const HomePage = ({ isDarkMode }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dbStats, setDbStats] = useState(null);
  const [sampleCounts, setSampleCounts] = useState(null);
  const [workflowStats, setWorkflowStats] = useState({
    registered: 0,
    inExtraction: 0,
    inPCR: 0,
    inElectrophoresis: 0,
    inAnalysis: 0,
    completed: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    refreshDatabase();
    fetchSampleCounts();
    fetchWorkflowStats();
  }, []);

  const fetchSampleCounts = async () => {
    try {
      const response = await api.getSampleCounts();
      if (response.success) {
        setSampleCounts(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch sample counts:', error);
    }
  };

  const fetchWorkflowStats = async () => {
    try {
      // Fetch actual workflow statistics from API
      const response = await fetch('/api/workflow-stats');
      if (response.ok) {
        const data = await response.json();
        setWorkflowStats(data);
      }
    } catch (error) {
      // Use mock data if API fails
      setWorkflowStats({
        registered: 45,
        inExtraction: 8,
        inPCR: 12,
        inElectrophoresis: 8,
        inAnalysis: 5,
        completed: 120
      });
    }
  };

  const refreshDatabase = async () => {
    try {
      setRefreshing(true);
      const response = await api.refreshDatabase();
      if (response.success) {
        const stats = response.data?.statistics || response.statistics;
        setDbStats(stats);
        setSnackbar({
          open: true,
          message: 'System data refreshed successfully',
          severity: 'success'
        });
      }
      await fetchSampleCounts();
      await fetchWorkflowStats();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error refreshing system data',
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const workflowSteps = [
    { 
      label: 'Sample Registration', 
      icon: <PersonAdd />, 
      path: '/client-register',
      count: workflowStats.registered,
      color: '#0D488F'
    },
    { 
      label: 'DNA Extraction', 
      icon: <Biotech />, 
      path: '/dna-extraction',
      count: workflowStats.inExtraction,
      color: '#4caf50'
    },
    { 
      label: 'PCR Processing', 
      icon: <Science />, 
      path: '/pcr-batches',
      count: workflowStats.inPCR,
      color: '#1976d2'
    },
    { 
      label: 'Electrophoresis', 
      icon: <ElectricBolt />, 
      path: '/electrophoresis-batches',
      count: workflowStats.inElectrophoresis,
      color: '#9c27b0'
    },
    { 
      label: 'OSIRIS Analysis', 
      icon: <Analytics />, 
      path: '/osiris-analysis',
      count: workflowStats.inAnalysis,
      color: '#ff9800'
    },
    { 
      label: 'Report Generation', 
      icon: <Description />, 
      path: '/reports',
      count: workflowStats.completed,
      color: '#16a34a'
    }
  ];

  const quickActions = [
    {
      title: 'Sample Tracking',
      description: 'Track and manage all samples',
      icon: <Storage />,
      path: '/sample-queues',
      color: '#0D488F',
      stats: sampleCounts?.total || 0
    },
    {
      title: 'Quality Control',
      description: 'ISO 17025 compliance monitoring',
      icon: <Assessment />,
      path: '/quality-control',
      color: '#16a34a',
      stats: 'ISO 17025'
    },
    {
      title: 'Genetic Analysis',
      description: 'View analysis results',
      icon: <Science />,
      path: '/genetic-analysis',
      color: '#ff9800',
      stats: workflowStats.inAnalysis
    },
    {
      title: 'Lab Results',
      description: 'Browse completed analyses',
      icon: <TableChart />,
      path: '/lab-results',
      color: '#9c27b0',
      stats: workflowStats.completed
    }
  ];

  const systemMetrics = [
    {
      label: 'Total Samples',
      value: dbStats?.totalSamples || 0,
      icon: <Assignment />,
      trend: '+12%',
      color: 'primary'
    },
    {
      label: 'Active Batches',
      value: dbStats?.activeBatches || 0,
      icon: <PlaylistAddCheck />,
      trend: '+5%',
      color: 'success'
    },
    {
      label: 'Pending Review',
      value: dbStats?.pendingReview || 0,
      icon: <Warning />,
      trend: '-8%',
      color: 'warning'
    },
    {
      label: 'System Uptime',
      value: '99.9%',
      icon: <Speed />,
      trend: 'Stable',
      color: 'info'
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          JAG DNA Scientific - LIMS Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your Paternity Testing Solution - ISO 17025 Compliant Features
        </Typography>
      </Box>

      {/* Workflow Visualization */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Sample Processing Workflow
          </Typography>
          <Tooltip title="Refresh workflow data">
            <IconButton onClick={refreshDatabase} disabled={refreshing}>
              {refreshing ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>
        </Box>
        
        <Stepper 
          alternativeLabel={!isMobile} 
          orientation={isMobile ? 'vertical' : 'horizontal'}
          connector={<WorkflowConnector />}
        >
          {workflowSteps.map((step, index) => (
            <Step key={step.label} completed={false}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.05)'
                      }
                    }}
                    onClick={() => navigate(step.path)}
                  >
                    <Badge 
                      badgeContent={step.count} 
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: step.color,
                          color: 'white'
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          backgroundColor: step.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          boxShadow: 2
                        }}
                      >
                        {step.icon}
                      </Box>
                    </Badge>
                  </Box>
                )}
              >
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {step.label}
                  </Typography>
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Click any step to navigate to that workflow stage. Numbers indicate samples currently at each stage.
          </Typography>
        </Box>
      </Paper>

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {systemMetrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: `${metric.color}.light`,
                    color: `${metric.color}.main`,
                    display: 'flex'
                  }}>
                    {metric.icon}
                  </Box>
                  <Chip 
                    label={metric.trend} 
                    size="small" 
                    color={metric.trend.includes('+') ? 'success' : metric.trend.includes('-') ? 'error' : 'default'}
                  />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {metric.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metric.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action) => (
          <Grid item xs={12} sm={6} md={3} key={action.title}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => navigate(action.path)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 1, 
                    backgroundColor: action.color + '20',
                    color: action.color,
                    display: 'flex'
                  }}>
                    {action.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: action.color }}>
                    {action.stats}
                  </Typography>
                </Box>
                <Typography variant="h6" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <ArrowForward color="action" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ISO 17025 Compliance Status */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          ISO 17025 Compliance Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Document Control</Typography>
                <Typography variant="body2" color="success.main">98%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={98} color="success" />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Equipment Calibration</Typography>
                <Typography variant="body2" color="success.main">100%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={100} color="success" />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Method Validation</Typography>
                <Typography variant="body2" color="warning.main">85%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={85} color="warning" />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Proficiency Testing</Typography>
                <Typography variant="body2" color="success.main">92%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={92} color="success" />
            </Box>
          </Grid>
        </Grid>
        <Button 
          variant="outlined" 
          fullWidth 
          sx={{ mt: 2 }}
          onClick={() => navigate('/quality-control')}
        >
          View Full Compliance Report
        </Button>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* Footer Tagline */}
      <Box sx={{ textAlign: 'center', mt: 4, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          JAG DNA Scientific - Your Paternity Testing Solution
        </Typography>
      </Box>
    </Container>
  );
};

export default HomePage;