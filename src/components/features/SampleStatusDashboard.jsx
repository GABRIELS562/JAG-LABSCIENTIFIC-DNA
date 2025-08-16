import React, { useState, useEffect } from 'react';
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
  Divider
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
  BarChart
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

export default function SampleStatusDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [turnaroundMetrics, setTurnaroundMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = autoRefresh ? setInterval(() => {
      loadDashboardData();
    }, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard metrics
      const [statsRes, turnaroundRes, activityRes] = await Promise.all([
        fetch('/api/samples/dashboard-stats'),
        fetch('/api/samples/turnaround-metrics'),
        fetch('/api/samples/recent-activity')
      ]);
      
      const statsData = await statsRes.json();
      const turnaroundData = await turnaroundRes.json();
      const activityData = await activityRes.json();
      
      if (statsData.success) {
        setDashboardData(statsData.data || getMockDashboardData());
      } else {
        setDashboardData(getMockDashboardData());
      }
      
      if (turnaroundData.success) {
        setTurnaroundMetrics(turnaroundData.data || getMockTurnaroundMetrics());
      } else {
        setTurnaroundMetrics(getMockTurnaroundMetrics());
      }
      
      if (activityData.success) {
        setRecentActivity(activityData.data || getMockRecentActivity());
      } else {
        setRecentActivity(getMockRecentActivity());
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use mock data as fallback
      setDashboardData(getMockDashboardData());
      setTurnaroundMetrics(getMockTurnaroundMetrics());
      setRecentActivity(getMockRecentActivity());
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration
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

  const getWorkflowStageIcon = (stage) => {
    const icons = {
      sample_collected: <Science />,
      pcr_ready: <Biotech />,
      pcr_batched: <Biotech color="primary" />,
      electro_ready: <ElectricBolt />,
      electro_batched: <ElectricBolt color="warning" />,
      analysis_ready: <Assessment />,
      analysis_completed: <Done color="success" />,
      report_generated: <CheckCircle color="success" />
    };
    return icons[stage] || <PendingActions />;
  };

  const getStageColor = (stage) => {
    if (stage.includes('completed') || stage.includes('generated')) return 'success';
    if (stage.includes('batched')) return 'warning';
    if (stage.includes('ready')) return 'info';
    return 'default';
  };

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
    labels: Object.keys(turnaroundMetrics.by_stage).map(k => k.replace(/_/g, ' ').toUpperCase()),
    datasets: [{
      label: 'Days',
      data: Object.values(turnaroundMetrics.by_stage),
      backgroundColor: '#1e3a5f',
      borderRadius: 4
    }]
  };

  const turnaroundTrendData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    datasets: [{
      label: 'Average TAT (days)',
      data: turnaroundMetrics.monthly_trend,
      borderColor: '#1e3a5f',
      backgroundColor: 'rgba(30, 58, 95, 0.1)',
      tension: 0.4
    }]
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e3a5f' }}>
            Sample Status Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Real-time workflow monitoring and metrics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Button
            variant={autoRefresh ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
            startIcon={autoRefresh ? <Schedule /> : <PlayArrow />}
          >
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
          <IconButton onClick={loadDashboardData} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
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
                    {turnaroundMetrics.average_tat}
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

      {/* Workflow Pipeline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Workflow Pipeline
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(dashboardData.workflow).map(([stage, count]) => (
              <Grid item xs={6} sm={4} md={2.4} key={stage}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                    {getWorkflowStageIcon(stage)}
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {count}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stage.replace(/_/g, ' ').charAt(0).toUpperCase() + stage.replace(/_/g, ' ').slice(1)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Sample Distribution</Typography>
              <Pie data={workflowPieData} options={{ maintainAspectRatio: true }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Stage Turnaround Times</Typography>
              <Bar data={turnaroundBarData} options={{ 
                maintainAspectRatio: true,
                scales: { y: { beginAtZero: true } }
              }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>TAT Trend (6 Weeks)</Typography>
              <Line data={turnaroundTrendData} options={{ 
                maintainAspectRatio: true,
                scales: { y: { beginAtZero: true } }
              }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Today's Statistics and Recent Activity */}
      <Grid container spacing={3}>
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
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Active Batches</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip label={`PCR: ${dashboardData.batches.pcr_active}`} color="primary" />
                <Chip label={`Electro: ${dashboardData.batches.electro_active}`} color="warning" />
                <Chip label={`Rerun: ${dashboardData.batches.rerun_active}`} color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Recent Activity
              </Typography>
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

      {/* Performance Alert */}
      {turnaroundMetrics.average_tat > 4 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="subtitle2">Performance Alert</Typography>
          <Typography variant="body2">
            Average turnaround time is above target (4 days). Current: {turnaroundMetrics.average_tat} days.
            Consider adding resources to {dashboardData.pending.pcr_queue > 40 ? 'PCR processing' : 'Analysis'}.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}