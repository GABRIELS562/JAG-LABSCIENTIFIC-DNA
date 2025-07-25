import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import { api as optimizedApi } from '../../services/api';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  Refresh, 
  GetApp, 
  TrendingUp, 
  Assessment, 
  Speed, 
  CheckCircle,
  Schedule,
  Science,
  DateRange,
  Warning,
  FilterList,
  PictureAsPdf,
  TableChart
} from '@mui/icons-material';

export default function Statistics() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: '',
    enabled: false
  });
  const [alertThresholds, setAlertThresholds] = useState({
    processingTime: 7, // days
    completionRate: 80 // percentage
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Enhanced state for comprehensive statistics
  const [dashboardData, setDashboardData] = useState({
    totalSamples: [],
    recentSamples: [],
    batchData: [],
    reportData: [],
    qualityData: [],
    workflowStats: {},
    demographics: {},
    processingTimes: [],
    alerts: []
  });

  const COLORS = ['#0D488F', '#8EC74F', '#022539', '#DBF1FC', '#ff9800', '#f44336'];

  useEffect(() => {
    loadEnhancedStatistics();
  }, [filterPeriod]);

  const loadEnhancedStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load comprehensive data from existing API endpoints
      const [samplesRes, batchesRes, reportsRes] = await Promise.all([
        optimizedApi.getAllSamples(),
        // Note: Add batch and report endpoints when available
        // For now, we'll work with sample data
        Promise.resolve({ data: [] }),
        Promise.resolve({ data: [] })
      ]);
      
      if (samplesRes.success) {
        const samples = samplesRes.data || [];
        
        // Process samples for comprehensive statistics
        const processedData = processStatisticsData(samples, filterPeriod);
        setDashboardData(processedData);
      } else {
        setError('Failed to load samples data');
      }
      
    } catch (error) {
      console.error('Statistics loading error:', error);
      setError('Error loading statistics data');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced data processing function
  const processStatisticsData = (samples, period) => {
    // Filter samples by period or custom date range
    const filteredSamples = customDateRange.enabled 
      ? filterSamplesByCustomRange(samples, customDateRange.startDate, customDateRange.endDate)
      : filterSamplesByPeriod(samples, period);
    
    // Calculate workflow statistics
    const workflowStats = calculateWorkflowStats(filteredSamples);
    
    // Calculate demographics
    const demographics = calculateDemographics(filteredSamples);
    
    // Calculate processing times (using available date fields)
    const processingTimes = calculateProcessingTimes(filteredSamples);
    
    // Get recent samples for trend analysis
    const recentSamples = getRecentSamples(samples, 30); // Last 30 days
    
    // Generate alerts based on thresholds
    const alerts = generateAlerts(filteredSamples, processingTimes, alertThresholds);
    
    return {
      totalSamples: filteredSamples,
      recentSamples,
      workflowStats,
      demographics,
      processingTimes,
      alerts,
      // Placeholder for future data
      batchData: [],
      reportData: [],
      qualityData: []
    };
  };

  // Helper functions for data processing
  const filterSamplesByPeriod = (samples, period) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return samples; // 'all' - return all samples
    }
    
    return samples.filter(sample => {
      const sampleDate = new Date(sample.created_at || sample.collection_date);
      return sampleDate >= startDate;
    });
  };

  const calculateWorkflowStats = (samples) => {
    const stats = {};
    samples.forEach(sample => {
      const status = sample.workflow_status || sample.status || 'unknown';
      stats[status] = (stats[status] || 0) + 1;
    });
    return stats;
  };

  const calculateDemographics = (samples) => {
    const demographics = {
      relations: {},
      genders: {},
      testTypes: {},
      sampleTypes: {}
    };
    
    samples.forEach(sample => {
      // Relation distribution
      const relation = sample.relation || 'Unknown';
      demographics.relations[relation] = (demographics.relations[relation] || 0) + 1;
      
      // Gender distribution
      const gender = sample.gender || 'Not specified';
      demographics.genders[gender] = (demographics.genders[gender] || 0) + 1;
      
      // Sample type distribution
      const sampleType = sample.sample_type || 'Unknown';
      demographics.sampleTypes[sampleType] = (demographics.sampleTypes[sampleType] || 0) + 1;
    });
    
    return demographics;
  };

  const calculateProcessingTimes = (samples) => {
    return samples
      .filter(sample => sample.collection_date && sample.updated_at)
      .map(sample => {
        const collectionDate = new Date(sample.collection_date);
        const updateDate = new Date(sample.updated_at);
        const daysDiff = Math.ceil((updateDate - collectionDate) / (1000 * 60 * 60 * 24));
        
        return {
          sampleId: sample.lab_number,
          processingDays: daysDiff,
          status: sample.workflow_status || sample.status
        };
      });
  };

  const getRecentSamples = (samples, days) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return samples
      .filter(sample => {
        const sampleDate = new Date(sample.created_at || sample.collection_date);
        return sampleDate >= cutoffDate;
      })
      .sort((a, b) => new Date(b.created_at || b.collection_date) - new Date(a.created_at || a.collection_date));
  };

  // Custom date range filtering
  const filterSamplesByCustomRange = (samples, startDate, endDate) => {
    if (!startDate || !endDate) return samples;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date
    
    return samples.filter(sample => {
      const sampleDate = new Date(sample.created_at || sample.collection_date);
      return sampleDate >= start && sampleDate <= end;
    });
  };

  // Alert generation based on thresholds
  const generateAlerts = (samples, processingTimes, thresholds) => {
    const alerts = [];
    
    // Processing time alerts
    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, item) => sum + item.processingDays, 0) / processingTimes.length
      : 0;
    
    if (avgProcessingTime > thresholds.processingTime) {
      alerts.push({
        type: 'warning',
        title: 'High Processing Time',
        message: `Average processing time (${Math.round(avgProcessingTime)} days) exceeds threshold (${thresholds.processingTime} days)`,
        value: Math.round(avgProcessingTime),
        threshold: thresholds.processingTime
      });
    }
    
    // Completion rate alerts
    const completedCount = samples.filter(s => 
      s.workflow_status === 'analysis_completed' || s.status === 'completed'
    ).length;
    const completionRate = samples.length > 0 ? (completedCount / samples.length) * 100 : 0;
    
    if (completionRate < thresholds.completionRate) {
      alerts.push({
        type: 'error',
        title: 'Low Completion Rate',
        message: `Completion rate (${Math.round(completionRate)}%) is below target (${thresholds.completionRate}%)`,
        value: Math.round(completionRate),
        threshold: thresholds.completionRate
      });
    }
    
    // Sample volume alerts (if unusually low)
    const recentSamples = getRecentSamples(samples, 7);
    if (recentSamples.length < 5 && samples.length > 20) {
      alerts.push({
        type: 'info',
        title: 'Low Sample Volume',
        message: `Only ${recentSamples.length} samples received in the last 7 days`,
        value: recentSamples.length,
        threshold: 5
      });
    }
    
    return alerts;
  };

  // Chart data preparation functions
  const getWorkflowChartData = () => {
    if (!dashboardData || !dashboardData.workflowStats) {
      return [];
    }
    const stats = dashboardData.workflowStats;
    return Object.entries(stats).map(([status, count]) => ({
      name: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
      status: status
    }));
  };

  const getRelationChartData = () => {
    if (!dashboardData || !dashboardData.demographics || !dashboardData.demographics.relations) {
      return [];
    }
    const relations = dashboardData.demographics.relations;
    return Object.entries(relations).map(([relation, count]) => ({
      name: relation,
      value: count
    }));
  };

  const getDailyTrendData = () => {
    if (!dashboardData || !dashboardData.recentSamples) {
      return [];
    }
    const samples = dashboardData.recentSamples;
    const dailyData = {};
    
    samples.forEach(sample => {
      const dateKey = new Date(sample.created_at || sample.collection_date).toISOString().split('T')[0];
      dailyData[dateKey] = (dailyData[dateKey] || 0) + 1;
    });
    
    return Object.entries(dailyData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-14) // Last 14 days
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        samples: count
      }));
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handlePeriodChange = (event) => {
    setFilterPeriod(event.target.value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Export functionality
  const exportToCSV = () => {
    const csvData = (dashboardData.totalSamples || []).map(sample => ({
      'Lab Number': sample.lab_number,
      'Name': `${sample.name} ${sample.surname}`,
      'Relation': sample.relation,
      'Gender': sample.gender,
      'Status': sample.workflow_status || sample.status,
      'Collection Date': formatDate(sample.collection_date),
      'Created Date': formatDate(sample.created_at),
      'Case Number': sample.case_number,
      'Sample Type': sample.sample_type
    }));
    
    const csvContent = convertToCSV(csvData);
    downloadCSV(csvContent, `laboratory-statistics-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // For now, we'll create a printable version
    window.print();
  };

  // Calculate key metrics
  const totalSamples = dashboardData.totalSamples?.length || 0;
  const avgProcessingTime = (dashboardData.processingTimes?.length || 0) > 0 
    ? Math.round(dashboardData.processingTimes.reduce((sum, item) => sum + item.processingDays, 0) / dashboardData.processingTimes.length)
    : 0;
  const recentSamplesCount = dashboardData.recentSamples?.length || 0;
  const completedSamples = (dashboardData.totalSamples || []).filter(s => 
    s.workflow_status === 'analysis_completed' || s.status === 'completed'
  ).length;

  const SampleTable = ({ samples, title }) => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Lab Number</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Batch</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {samples.map((sample, index) => (
            <TableRow key={index}>
              <TableCell>{sample.lab_number}</TableCell>
              <TableCell>{sample.name} {sample.surname}</TableCell>
              <TableCell>
                <Chip 
                  label={sample.status} 
                  color={sample.status === 'completed' ? 'success' : 'primary'}
                  size="small"
                />
              </TableCell>
              <TableCell>{formatDate(sample.created_at)}</TableCell>
              <TableCell>{sample.batch_number || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: isMobile ? 2 : 3 }}>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'center', 
          gap: 2,
          mb: 3 
        }}>
          <Box>
            <Typography variant="h4" sx={{ color: '#0D488F', fontWeight: 'bold', mb: 1 }}>
              Laboratory Statistics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive analytics and performance metrics for your LIMS
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Filter Period</InputLabel>
              <Select
                value={filterPeriod}
                label="Filter Period"
                onChange={handlePeriodChange}
                disabled={customDateRange.enabled}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              size="small"
            >
              Filters
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<TableChart />}
              onClick={exportToCSV}
              size="small"
              disabled={!dashboardData.totalSamples?.length}
            >
              Export CSV
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={exportToPDF}
              size="small"
            >
              Print/PDF
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={loadEnhancedStatistics}
              sx={{ bgcolor: '#0D488F', '&:hover': { bgcolor: '#1e4976' } }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', fontWeight: 600 }}>
            Advanced Filters & Settings
          </Typography>
          
          <Grid container spacing={3}>
            {/* Custom Date Range */}
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Custom Date Range
                </Typography>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={customDateRange.enabled}
                        onChange={(e) => setCustomDateRange(prev => ({
                          ...prev,
                          enabled: e.target.checked
                        }))}
                      />
                    }
                    label="Use custom date range"
                  />
                  
                  {customDateRange.enabled && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        type="date"
                        label="Start Date"
                        value={customDateRange.startDate}
                        onChange={(e) => setCustomDateRange(prev => ({
                          ...prev,
                          startDate: e.target.value
                        }))}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                      <TextField
                        type="date"
                        label="End Date"
                        value={customDateRange.endDate}
                        onChange={(e) => setCustomDateRange(prev => ({
                          ...prev,
                          endDate: e.target.value
                        }))}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                    </Box>
                  )}
                </Stack>
              </Box>
            </Grid>
            
            {/* Alert Thresholds */}
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Alert Thresholds
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    type="number"
                    label="Processing Time Alert (days)"
                    value={alertThresholds.processingTime}
                    onChange={(e) => setAlertThresholds(prev => ({
                      ...prev,
                      processingTime: parseInt(e.target.value) || 7
                    }))}
                    size="small"
                    inputProps={{ min: 1, max: 30 }}
                  />
                  <TextField
                    type="number"
                    label="Completion Rate Alert (%)"
                    value={alertThresholds.completionRate}
                    onChange={(e) => setAlertThresholds(prev => ({
                      ...prev,
                      completionRate: parseInt(e.target.value) || 80
                    }))}
                    size="small"
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Stack>
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button
              variant="contained"
              onClick={loadEnhancedStatistics}
              sx={{ bgcolor: '#8EC74F', '&:hover': { bgcolor: '#6BA23A' } }}
            >
              Apply Filters
            </Button>
          </Box>
        </Paper>
      )}

      {/* Alerts Section */}
      {(dashboardData.alerts?.length || 0) > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1 }} />
            System Alerts ({dashboardData.alerts?.length || 0})
          </Typography>
          
          <Grid container spacing={2}>
            {(dashboardData.alerts || []).map((alert, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Alert 
                  severity={alert.type} 
                  sx={{ height: '100%' }}
                  icon={<Warning />}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {alert.title}
                  </Typography>
                  <Typography variant="body2">
                    {alert.message}
                  </Typography>
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Key Performance Indicators */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0D488F 0%, #1e4976 100%)',
            color: 'white'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Science sx={{ fontSize: 40, mr: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {totalSamples}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Total Samples
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
              {filterPeriod === 'all' ? 'All time' : `This ${filterPeriod}`}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #8EC74F 0%, #6BA23A 100%)',
            color: 'white'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <CheckCircle sx={{ fontSize: 40, mr: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {completedSamples}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Completed
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
              {totalSamples > 0 ? Math.round((completedSamples / totalSamples) * 100) : 0}% completion rate
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            color: 'white'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Schedule sx={{ fontSize: 40, mr: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {avgProcessingTime}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Avg Days
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
              Processing time
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            p: 3, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #022539 0%, #032539 100%)',
            color: 'white'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <TrendingUp sx={{ fontSize: 40, mr: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {recentSamplesCount}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Recent (30d)
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
              Last 30 days
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Analytics Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Workflow Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', fontWeight: 600 }}>
              Sample Workflow Status
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getWorkflowChartData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {getWorkflowChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Sample Relations Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', fontWeight: 600 }}>
              Sample Relations
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getRelationChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8EC74F" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Daily Sample Trend */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 350 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', fontWeight: 600 }}>
              Daily Sample Collection Trend (Last 14 Days)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getDailyTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="samples" stroke="#0D488F" fill="#DBF1FC" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Detailed Sample Analysis */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 3, color: '#0D488F', fontWeight: 600 }}>
          Detailed Sample Analysis
        </Typography>
        
        <Grid container spacing={3}>
          {/* Demographics Summary */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Demographics Overview
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sample Relations
                  </Typography>
                  {Object.entries(dashboardData.demographics?.relations || {}).map(([relation, count]) => (
                    <Box key={relation} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">{relation}</Typography>
                      <Chip label={count} size="small" color="primary" />
                    </Box>
                  ))}
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Gender Distribution
                  </Typography>
                  {Object.entries(dashboardData.demographics?.genders || {}).map(([gender, count]) => (
                    <Box key={gender} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">{gender}</Typography>
                      <Chip label={count} size="small" color="secondary" />
                    </Box>
                  ))}
                </Box>
              </Stack>
            </Box>
          </Grid>

          {/* Processing Statistics */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Processing Statistics
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ p: 2, bgcolor: isDarkMode ? 'grey.800' : 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Average Processing Time
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
                    {avgProcessingTime} days
                  </Typography>
                </Box>
                
                <Box sx={{ p: 2, bgcolor: isDarkMode ? 'grey.800' : 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#8EC74F', fontWeight: 'bold' }}>
                    {totalSamples > 0 ? Math.round((completedSamples / totalSamples) * 100) : 0}%
                  </Typography>
                </Box>
                
                <Box sx={{ p: 2, bgcolor: isDarkMode ? 'grey.800' : 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Samples with Processing Time Data
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                    {dashboardData.processingTimes?.length || 0}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Recent Samples Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', fontWeight: 600 }}>
          Recent Samples ({dashboardData.recentSamples?.length || 0} in last 30 days)
        </Typography>
        <SampleTable samples={(dashboardData.recentSamples || []).slice(0, 20)} title="Recent Samples" />
        {(dashboardData.recentSamples?.length || 0) > 20 && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing 20 of {dashboardData.recentSamples?.length || 0} recent samples
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Performance Insights Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', fontWeight: 600 }}>
          Performance Insights
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: isDarkMode ? 'grey.800' : 'grey.50', borderRadius: 2 }}>
              <Speed sx={{ fontSize: 40, color: '#0D488F', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0D488F' }}>
                {totalSamples > 0 ? Math.round((recentSamplesCount / totalSamples) * 100) : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recent Activity Rate
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Samples in last 30 days vs total
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: isDarkMode ? 'grey.800' : 'grey.50', borderRadius: 2 }}>
              <TrendingUp sx={{ fontSize: 40, color: '#8EC74F', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#8EC74F' }}>
                {(dashboardData.processingTimes || []).filter(pt => pt.processingDays <= 5).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fast Processing
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Samples processed ≤ 5 days
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: isDarkMode ? 'grey.800' : 'grey.50', borderRadius: 2 }}>
              <Assessment sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                {Object.keys(dashboardData.workflowStats || {}).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Workflows
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Different processing stages
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        {/* Sample Type Distribution */}
        {Object.keys(dashboardData.demographics?.sampleTypes || {}).length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Sample Type Distribution
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(dashboardData.demographics?.sampleTypes || {}).map(([type, count]) => (
                <Grid item xs={6} sm={4} md={3} key={type}>
                  <Box sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {type || 'Unknown'}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography variant="h6">Error Loading Statistics</Typography>
          <Typography variant="body2">{error}</Typography>
          <Button 
            variant="outlined" 
            onClick={loadEnhancedStatistics} 
            sx={{ mt: 2 }}
            startIcon={<Refresh />}
          >
            Try Again
          </Button>
        </Alert>
      )}
    </Box>
  );
} 