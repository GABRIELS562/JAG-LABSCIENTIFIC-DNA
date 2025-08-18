import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Button,
  Divider,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Science,
  Schedule,
  CheckCircle,
  Warning,
  TrendingUp,
  AccessTime,
  PlayArrow,
  Refresh,
  Assessment,
  Speed,
  PendingActions,
  Biotech,
  ElectricBolt,
  Done,
  Replay,
  BarChart,
  ViewModule,
  Search,
  Assignment,
  Storage,
  TableChart,
  Group,
  People,
  Dashboard,
  ArrowForward
} from '@mui/icons-material';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import api from '../../services/api';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

export default function IntegratedHomePage({ isDarkMode }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [turnaroundMetrics, setTurnaroundMetrics] = useState({
    average_tat: 0,
    min_tat: 0,
    max_tat: 0,
    current_week: 0,
    last_week: 0,
    monthly_trend: [],
    by_stage: {}
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dbStats, setDbStats] = useState(null);
  const [sampleCounts, setSampleCounts] = useState(null);

  useEffect(() => {
    loadAllData();
    
    // Auto-refresh every 30 seconds
    const interval = autoRefresh ? setInterval(() => {
      loadAllData();
    }, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard data with timeout and error handling
      const loadPromises = [
        loadDashboardData().catch(err => console.error('Dashboard load error:', err)),
        fetchSampleCounts().catch(err => console.error('Sample count error:', err))
        // Removed refreshDatabase() as it might be causing delays
      ];
      
      // Add timeout to prevent hanging
      await Promise.race([
        Promise.all(loadPromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Load timeout')), 5000))
      ]).catch(err => {
        // Load mock data on error
        setDashboardData(getMockDashboardData());
        setSampleCounts({
          total: 6,
          pending: 6,
          pcr_ready: 0,
          analysis_ready: 0,
          completed: 0
        });
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Get auth token if available
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Fetch dashboard metrics with timeout
      const fetchWithTimeout = (url, timeout = 3000) => {
        return Promise.race([
          fetch(url, { headers }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout))
        ]);
      };
      
      const [statsRes, turnaroundRes, activityRes] = await Promise.all([
        fetchWithTimeout('/api/samples/dashboard-stats').catch(() => null),
        fetchWithTimeout('/api/samples/turnaround-metrics').catch(() => null),
        fetchWithTimeout('/api/samples/recent-activity').catch(() => null)
      ]);
      
      const statsData = statsRes ? await statsRes.json() : null;
      const turnaroundData = turnaroundRes ? await turnaroundRes.json() : null;
      const activityData = activityRes ? await activityRes.json() : null;
      
      if (statsData && statsData.success) {
        setDashboardData(statsData.data || getMockDashboardData());
      } else {
        setDashboardData(getMockDashboardData());
      }
      
      if (turnaroundData && turnaroundData.success) {
        setTurnaroundMetrics(turnaroundData.data || getMockTurnaroundMetrics());
      } else {
        setTurnaroundMetrics(getMockTurnaroundMetrics());
      }
      
      if (activityData && activityData.success) {
        setRecentActivity(activityData.data || getMockRecentActivity());
      } else {
        setRecentActivity(getMockRecentActivity());
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use mock data as fallback
      setDashboardData(getMockDashboardData());
      setTurnaroundMetrics(getMockTurnaroundMetrics());
      setRecentActivity(getMockRecentActivity());
    }
  };

  const fetchSampleCounts = async () => {
    try {
      const response = await api.getSampleCounts();
      if (response.success) {
        setSampleCounts(response.data);
      }
    } catch (error) {
      }
  };

  const refreshDatabase = async () => {
    try {
      const response = await api.refreshDatabase();
      if (response.success) {
        const stats = response.data?.statistics || response.statistics;
        setDbStats(stats);
      }
    } catch (error) {
      console.error('Error refreshing database:', error);
    }
  };

  // Mock data functions
  const getMockDashboardData = () => ({
    workflow: {
      sample_collected: 45,
      pcr_ready: 32,
      pcr_batched: 28,
      pcr_completed: 24,
      electro_ready: 24,
      electro_batched: 20,
      electro_completed: 18,
      analysis_ready: 18,
      analysis_completed: 156,
      report_generated: 142
    },
    pending: {
      pcr_queue: 32,
      electro_queue: 24,
      analysis_queue: 18,
      reporting_queue: 14
    },
    today: {
      received: 12,
      processed: 8,
      completed: 6,
      reports_generated: 5
    },
    batches: {
      pcr_active: 3,
      electro_active: 2,
      rerun_active: 1,
      total_today: 6
    }
  });

  const getMockTurnaroundMetrics = () => ({
    average_tat: 3.5, // days
    min_tat: 2,
    max_tat: 7,
    current_week: 3.2,
    last_week: 3.8,
    monthly_trend: [3.5, 3.7, 3.4, 3.2, 3.1, 3.2],
    by_stage: {
      collection_to_pcr: 0.5,
      pcr_to_electro: 1.0,
      electro_to_analysis: 0.8,
      analysis_to_report: 0.7
    }
  });

  const getMockRecentActivity = () => ([
    { time: '2 min ago', action: 'Batch LDS_234 created', type: 'batch', user: 'John Doe' },
    { time: '15 min ago', action: '6 samples moved to PCR ready', type: 'workflow', user: 'Jane Smith' },
    { time: '30 min ago', action: 'Report RPT-2024-0156 generated', type: 'report', user: 'System' },
    { time: '1 hour ago', action: 'Analysis completed for ELEC_122', type: 'analysis', user: 'Lab Tech' },
    { time: '2 hours ago', action: '12 new samples registered', type: 'sample', user: 'Reception' }
  ]);

  const quickAccessButtons = [
    {
      title: 'Register Client',
      icon: <Assignment />,
      color: '#0D488F',
      path: '/register-client'
    },
    {
      title: 'PCR Plate',
      icon: <Science />,
      color: '#022539',
      path: '/pcr-plate'
    },
    {
      title: 'Electrophoresis',
      icon: <ElectricBolt />,
      color: '#6BA23A',
      path: '/electrophoresis-layout'
    },
    {
      title: 'Lab Results',
      icon: <Assessment />,
      color: '#8EC74F',
      path: '/lab-results'
    }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Prepare chart data
  const workflowPieData = {
    labels: ['Collection', 'PCR Processing', 'Electrophoresis', 'Analysis', 'Completed'],
    datasets: [{
      data: [
        dashboardData.workflow.sample_collected,
        dashboardData.workflow.pcr_batched,
        dashboardData.workflow.electro_batched,
        dashboardData.workflow.analysis_ready,
        dashboardData.workflow.analysis_completed
      ],
      backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#059669'],
      borderWidth: 0
    }]
  };

  const turnaroundBarData = {
    labels: turnaroundMetrics?.by_stage ? Object.keys(turnaroundMetrics.by_stage).map(k => k.replace(/_/g, ' ').toUpperCase()) : [],
    datasets: [{
      label: 'Days',
      data: turnaroundMetrics?.by_stage ? Object.values(turnaroundMetrics.by_stage) : [],
      backgroundColor: '#1e3a5f',
      borderRadius: 4
    }]
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header with refresh controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: isDarkMode ? 'white' : '#1e3a5f' }}>
            Laboratory Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Real-time operational overview • Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant={autoRefresh ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
            startIcon={autoRefresh ? <Schedule /> : <PlayArrow />}
          >
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
          <IconButton onClick={loadAllData} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Key Metrics Cards - Primary Dashboard */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {dashboardData.pending.pcr_queue}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pending PCR
                  </Typography>
                </Box>
                <Biotech sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {dashboardData.pending.electro_queue}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Awaiting Electro
                  </Typography>
                </Box>
                <ElectricBolt sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {dashboardData.pending.reporting_queue}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Ready for Reports
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {turnaroundMetrics?.average_tat || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Avg TAT (days)
                  </Typography>
                </Box>
                <Speed sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Access Buttons */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {quickAccessButtons.map((button, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Paper
              sx={{
                p: 2,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  backgroundColor: button.color,
                  color: 'white',
                  '& .MuiSvgIcon-root': {
                    color: 'white'
                  }
                }
              }}
              onClick={() => navigate(button.path)}
            >
              {React.cloneElement(button.icon, { 
                sx: { fontSize: 32, color: button.color, mb: 1 } 
              })}
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {button.title}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Charts and Activity Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Workflow Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Sample Distribution</Typography>
              <Pie data={workflowPieData} options={{ 
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      padding: 10,
                      font: {
                        size: 11
                      }
                    }
                  }
                }
              }} />
            </CardContent>
          </Card>
        </Grid>

        {/* Turnaround Times */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Stage Turnaround</Typography>
              <Bar data={turnaroundBarData} options={{ 
                maintainAspectRatio: true,
                scales: { y: { beginAtZero: true } }
              }} />
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', maxHeight: 400, overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Recent Activity</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {recentActivity.map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ borderBottom: 'none', py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {activity.type === 'batch' && <Science fontSize="small" color="primary" />}
                            {activity.type === 'workflow' && <TrendingUp fontSize="small" color="info" />}
                            {activity.type === 'report' && <Assessment fontSize="small" color="success" />}
                            {activity.type === 'analysis' && <CheckCircle fontSize="small" color="success" />}
                            {activity.type === 'sample' && <PendingActions fontSize="small" />}
                            <Box>
                              <Typography variant="body2">{activity.action}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                {activity.time} • {activity.user}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Today's Statistics and Batch Status */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Today's Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                    <Typography variant="h4" color="primary">{dashboardData.today.received}</Typography>
                    <Typography variant="body2" color="textSecondary">Samples Received</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 1 }}>
                    <Typography variant="h4" color="warning.main">{dashboardData.today.processed}</Typography>
                    <Typography variant="body2" color="textSecondary">In Processing</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: '#d1fae5', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.main">{dashboardData.today.completed}</Typography>
                    <Typography variant="body2" color="textSecondary">Completed</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: '#ede9fe', borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ color: '#7c3aed' }}>{dashboardData.today.reports_generated}</Typography>
                    <Typography variant="body2" color="textSecondary">Reports Generated</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Workflow Pipeline Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Sample Collection</Typography>
                  <Chip label={dashboardData.workflow.sample_collected} size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">PCR Processing</Typography>
                  <Chip label={dashboardData.workflow.pcr_batched} size="small" color="primary" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Electrophoresis</Typography>
                  <Chip label={dashboardData.workflow.electro_batched} size="small" color="warning" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Analysis Ready</Typography>
                  <Chip label={dashboardData.workflow.analysis_ready} size="small" color="info" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Completed</Typography>
                  <Chip label={dashboardData.workflow.analysis_completed} size="small" color="success" />
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip label={`PCR: ${dashboardData.batches.pcr_active} active`} color="primary" size="small" />
                <Chip label={`Electro: ${dashboardData.batches.electro_active} active`} color="warning" size="small" />
                <Chip label={`Rerun: ${dashboardData.batches.rerun_active} active`} color="error" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Alert */}
      {turnaroundMetrics?.average_tat > 4 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Performance Alert</Typography>
          <Typography variant="body2">
            Average turnaround time is above target (4 days). Current: {turnaroundMetrics?.average_tat || 0} days.
            Consider adding resources to {dashboardData.pending.pcr_queue > 40 ? 'PCR processing' : 'Analysis'}.
          </Typography>
        </Alert>
      )}

      {/* Quick Links Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Quick Links
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Dashboard />}
                onClick={() => navigate('/sample-status')}
              >
                Full Dashboard
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Biotech />}
                onClick={() => navigate('/quality-control')}
              >
                Quality Control
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Assessment />}
                onClick={() => navigate('/reports')}
              >
                Reports
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Storage />}
                onClick={() => navigate('/iso17025')}
              >
                ISO Compliance
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}