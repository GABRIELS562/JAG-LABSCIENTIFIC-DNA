import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
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
  Stack
} from '@mui/material';
import { Refresh, GetApp } from '@mui/icons-material';

export default function Statistics() {
  const { colors, isDarkMode } = useTheme();
  const [view, setView] = useState('daily');
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [totalSamples, setTotalSamples] = useState([]);
  const [pcrBatchSamples, setPcrBatchSamples] = useState([]);
  const [electrophoresisBatchSamples, setElectrophoresisBatchSamples] = useState([]);
  const [completedElectrophoresisSamples, setCompletedElectrophoresisSamples] = useState([]);
  const [completedSamples, setCompletedSamples] = useState([]);

  const COLORS = [colors.warning, colors.info, colors.success];

  useEffect(() => {
    loadStatistics(view);
    loadSampleData(filterPeriod);
  }, [view, filterPeriod]);

  const loadStatistics = async (period) => {
    try {
      setLoading(true);
      const response = await api.getStatistics(period);
      if (response.success) {
        setStatistics(response.data);
      } else {
        setError('Failed to load statistics');
      }
    } catch (error) {
      setError('Error loading statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = async (period = 'all') => {
    try {
      setLoading(true);
      
      // Load different sample categories
      const [totalRes, pcrRes, electroRes, completedElectroRes, completedRes] = await Promise.all([
        api.getSamples({ period, status: 'all' }),
        api.getSamples({ period, status: 'pcr_batch' }),
        api.getSamples({ period, status: 'electrophoresis_batch' }),
        api.getSamples({ period, status: 'completed_electrophoresis' }),
        api.getSamples({ period, status: 'completed' })
      ]);
      
      setTotalSamples(totalRes.data || []);
      setPcrBatchSamples(pcrRes.data || []);
      setElectrophoresisBatchSamples(electroRes.data || []);
      setCompletedElectrophoresisSamples(completedElectroRes.data || []);
      setCompletedSamples(completedRes.data || []);
      
    } catch (error) {
      setError('Error loading sample data');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!statistics) return [];
    
    const { total_counts } = statistics;
    return [
      { name: 'Pending', value: total_counts.pending || 0 },
      { name: 'Processing', value: total_counts.processing || 0 },
      { name: 'Completed', value: total_counts.completed || 0 },
    ].filter(item => item.value > 0);
  };

  const data = getChartData();

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: `Sample Status Distribution (${view === 'daily' ? 'Today' : 'This Month'})`
      }
    }
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

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
            Samples Overview
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter Period</InputLabel>
              <Select
                value={filterPeriod}
                label="Filter Period"
                onChange={handlePeriodChange}
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
              startIcon={<Refresh />}
              onClick={() => loadSampleData(filterPeriod)}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Statistics Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={2.4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
              <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                {totalSamples.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Samples
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
              <Typography variant="h4" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                {pcrBatchSamples.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                PCR Batch
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
              <Typography variant="h4" sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>
                {electrophoresisBatchSamples.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Electrophoresis Batch
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e8' }}>
              <Typography variant="h4" sx={{ color: '#388e3c', fontWeight: 'bold' }}>
                {completedElectrophoresisSamples.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Electrophoresis
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e0f2f1' }}>
              <Typography variant="h4" sx={{ color: '#00695c', fontWeight: 'bold' }}>
                {completedSamples.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Samples
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs for different sample categories */}
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label="sample categories">
              <Tab label="Total Samples" />
              <Tab label="PCR Batch" />
              <Tab label="Electrophoresis Plate Setup" />
              <Tab label="Completed Electrophoresis" />
              <Tab label="Completed Samples" />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <Box sx={{ mt: 2 }}>
            {currentTab === 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1e4976' }}>
                  Total Samples ({totalSamples.length})
                </Typography>
                <SampleTable samples={totalSamples} title="Total Samples" />
              </Box>
            )}
            {currentTab === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1e4976' }}>
                  PCR Batch Samples ({pcrBatchSamples.length})
                </Typography>
                <SampleTable samples={pcrBatchSamples} title="PCR Batch Samples" />
              </Box>
            )}
            {currentTab === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1e4976' }}>
                  Electrophoresis Plate Setup ({electrophoresisBatchSamples.length})
                </Typography>
                <SampleTable samples={electrophoresisBatchSamples} title="Electrophoresis Batch Samples" />
              </Box>
            )}
            {currentTab === 3 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1e4976' }}>
                  Completed Electrophoresis Samples ({completedElectrophoresisSamples.length})
                </Typography>
                <SampleTable samples={completedElectrophoresisSamples} title="Completed Electrophoresis Samples" />
              </Box>
            )}
            {currentTab === 4 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1e4976' }}>
                  Completed Samples ({completedSamples.length})
                </Typography>
                <SampleTable samples={completedSamples} title="Completed Samples" />
              </Box>
            )}
          </Box>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Loading sample data...</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1, mt: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
} 