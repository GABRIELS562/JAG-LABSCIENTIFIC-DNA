import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Container
} from '@mui/material';
import {
  Refresh,
  Science,
  FlashOn,
  BarChart,
  CheckCircle,
  Schedule,
  Warning
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SampleQueues = () => {
  const [activeQueue, setActiveQueue] = useState(0); // Use index for Material-UI tabs
  const [queueCounts, setQueueCounts] = useState({});
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const queueTypes = [
    { id: 'all', label: 'All Samples', icon: BarChart, color: '#2196f3' },
    { id: 'pcr_ready', label: 'PCR Ready', icon: Science, color: '#ff9800' },
    { id: 'pcr_batched', label: 'PCR Batched', icon: Schedule, color: '#ffeb3b' },
    { id: 'electro_ready', label: 'Electrophoresis Ready', icon: FlashOn, color: '#9c27b0' },
    { id: 'electro_batched', label: 'Electrophoresis Batched', icon: Warning, color: '#3f51b5' },
    { id: 'analysis_ready', label: 'Analysis Ready', icon: BarChart, color: '#e91e63' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: '#4caf50' }
  ];

  useEffect(() => {
    loadQueueCounts();
    loadSamples();
  }, []);

  useEffect(() => {
    loadSamples();
  }, [activeQueue]);

  const loadQueueCounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/samples/queue-counts`);
      if (response.ok) {
        const data = await response.json();
        setQueueCounts(data.data || {});
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const loadSamples = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentQueue = queueTypes[activeQueue];
      let url = `${API_URL}/api/samples`;
      if (currentQueue.id !== 'all') {
        url = `${API_URL}/api/samples/queue/${currentQueue.id}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSamples(data.data || []);
      } else {
        setError('Failed to load samples');
      }
    } catch (error) {
      setError('Error loading samples');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await Promise.all([loadQueueCounts(), loadSamples()]);
  };

  const getWorkflowStatusChip = (workflowStatus) => {
    const statusConfig = {
      sample_collected: { label: 'Sample Collected', color: 'default' },
      pcr_ready: { label: 'PCR Ready', color: 'warning' },
      pcr_batched: { label: 'PCR Batched', color: 'info' },
      pcr_completed: { label: 'PCR Completed', color: 'primary' },
      electro_ready: { label: 'Electrophoresis Ready', color: 'secondary' },
      electro_batched: { label: 'Electrophoresis Batched', color: 'secondary' },
      electro_completed: { label: 'Electrophoresis Completed', color: 'primary' },
      analysis_ready: { label: 'Analysis Ready', color: 'info' },
      analysis_completed: { label: 'Analysis Completed', color: 'success' },
      report_ready: { label: 'Report Ready', color: 'success' },
      report_sent: { label: 'Report Sent', color: 'success' }
    };

    const config = statusConfig[workflowStatus] || { label: workflowStatus, color: 'default' };
    return (
      <Chip 
        label={config.label} 
        color={config.color}
        size="small"
      />
    );
  };

  const getQueueCount = (queueType) => {
    if (queueType === 'all') {
      return queueCounts.total_samples || 0;
    }
    
    const countMapping = {
      pcr_ready: (queueCounts.sample_collected || 0) + (queueCounts.pcr_ready || 0),
      pcr_batched: queueCounts.pcr_batched || 0,
      electro_ready: (queueCounts.pcr_completed || 0) + (queueCounts.electro_ready || 0),
      electro_batched: queueCounts.electro_batched || 0,
      analysis_ready: (queueCounts.electro_completed || 0) + (queueCounts.analysis_ready || 0),
      completed: (queueCounts.analysis_completed || 0) + (queueCounts.report_ready || 0) + (queueCounts.report_sent || 0)
    };
    
    return countMapping[queueType] || 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleTabChange = (event, newValue) => {
    setActiveQueue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Sample Queues
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track samples through laboratory workflow stages
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={refreshData}
          sx={{ bgcolor: '#1e4976', '&:hover': { bgcolor: '#2c5a8e' } }}
        >
          Refresh
        </Button>
      </Box>

      {/* Queue Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {queueTypes.map((queue, index) => {
          const count = getQueueCount(queue.id);
          const Icon = queue.icon;
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={1.7} key={queue.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: activeQueue === index ? 2 : 1,
                  borderColor: activeQueue === index ? queue.color : 'divider',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: 3 
                  }
                }}
                onClick={() => setActiveQueue(index)}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Icon sx={{ color: queue.color, fontSize: 24 }} />
                    <Typography variant="h5" component="div" fontWeight="bold">
                      {count}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {queue.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Main Content */}
      <Card>
        <CardContent>
          {/* Tabs */}
          <Tabs 
            value={activeQueue} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            {queueTypes.map((queue, index) => (
              <Tab 
                key={queue.id}
                label={`${queue.label} (${getQueueCount(queue.id)})`}
                sx={{ textTransform: 'none' }}
              />
            ))}
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading samples...</Typography>
            </Box>
          )}

          {/* Samples Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lab Number</TableCell>
                  <TableCell>Case Number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Relation</TableCell>
                  <TableCell>Collection Date</TableCell>
                  <TableCell>Workflow Status</TableCell>
                  <TableCell>Batch Number</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {samples.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {activeQueue === 0 ? 'No samples available' : `No samples in ${queueTypes[activeQueue]?.label || 'this queue'}`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  samples.map((sample) => (
                    <TableRow key={sample.id} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>{sample.lab_number}</TableCell>
                      <TableCell>{sample.case_number || 'N/A'}</TableCell>
                      <TableCell>{sample.name} {sample.surname}</TableCell>
                      <TableCell>{sample.relation}</TableCell>
                      <TableCell>{formatDate(sample.collection_date)}</TableCell>
                      <TableCell>{getWorkflowStatusChip(sample.workflow_status)}</TableCell>
                      <TableCell>{sample.batch_number || 'Not batched'}</TableCell>
                      <TableCell>
                        <Chip
                          label={sample.status}
                          color={
                            sample.status === 'completed' ? 'success' :
                            sample.status === 'processing' ? 'warning' :
                            'default'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Workflow Status Legend */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Workflow Status Guide
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Sample Collection
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: 'grey.500', borderRadius: '50%' }} />
                <Typography variant="body2">Sample Collected</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                PCR Stage
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'warning.main', borderRadius: '50%' }} />
                  <Typography variant="body2">PCR Ready</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'info.main', borderRadius: '50%' }} />
                  <Typography variant="body2">PCR Batched</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: '50%' }} />
                  <Typography variant="body2">PCR Completed</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Electrophoresis Stage
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'secondary.main', borderRadius: '50%' }} />
                  <Typography variant="body2">Electro Ready</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'secondary.main', borderRadius: '50%' }} />
                  <Typography variant="body2">Electro Batched</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: '50%' }} />
                  <Typography variant="body2">Electro Completed</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Analysis & Reporting
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'info.main', borderRadius: '50%' }} />
                  <Typography variant="body2">Analysis Ready</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%' }} />
                  <Typography variant="body2">Analysis Completed</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%' }} />
                  <Typography variant="body2">Report Sent</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SampleQueues;