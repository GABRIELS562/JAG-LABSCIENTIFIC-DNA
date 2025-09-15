import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Alert,
  Tooltip,
  Badge,
  Card,
  CardContent,
  LinearProgress,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  Edit,
  Update,
  PersonAdd,
  Science,
  ElectricBolt,
  Analytics,
  Description,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  AccessTime,
  LocalShipping,
  Refresh,
  Download,
  Print,
  QrCode,
  Timeline as TimelineIcon,
  Assignment,
  VerifiedUser,
  Biotech,
  Flag
} from '@mui/icons-material';
import { format } from 'date-fns';

const SampleTracking = () => {
  const [samples, setSamples] = useState([]);
  const [filteredSamples, setFilteredSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  // Sample workflow stages
  const workflowStages = {
    'registered': { label: 'Registered', color: 'default', icon: <PersonAdd /> },
    'sample_collected': { label: 'Sample Collected', color: 'info', icon: <Assignment /> },
    'in_pcr': { label: 'PCR Processing', color: 'primary', icon: <Biotech /> },
    'pcr_completed': { label: 'PCR Completed', color: 'success', icon: <CheckCircle /> },
    'in_electrophoresis': { label: 'Electrophoresis', color: 'secondary', icon: <ElectricBolt /> },
    'electro_completed': { label: 'Electro Completed', color: 'success', icon: <CheckCircle /> },
    'in_analysis': { label: 'OSIRIS Analysis', color: 'warning', icon: <Analytics /> },
    'analysis_completed': { label: 'Analysis Done', color: 'success', icon: <CheckCircle /> },
    'report_generated': { label: 'Report Ready', color: 'success', icon: <Description /> },
    'delivered': { label: 'Delivered', color: 'default', icon: <LocalShipping /> },
    'failed': { label: 'Failed', color: 'error', icon: <ErrorIcon /> },
    'rerun': { label: 'Rerun Required', color: 'warning', icon: <Warning /> }
  };

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    registered: 0,
    inProcess: 0,
    completed: 0,
    failed: 0,
    urgent: 0,
    avgTurnaround: 0
  });

  useEffect(() => {
    loadSamples();
  }, []);

  useEffect(() => {
    filterSamples();
    calculateStats();
  }, [samples, searchTerm, statusFilter, priorityFilter]);

  const loadSamples = async () => {
    setLoading(true);
    try {
      // Fetch real data from API
      const response = await fetch('/api/samples/tracking');
      if (response.ok) {
        const data = await response.json();
        setSamples(data.samples || generateMockSamples());
      } else {
        // Use mock data if API fails
        setSamples(generateMockSamples());
      }
    } catch (error) {
      console.error('Error loading samples:', error);
      setSamples(generateMockSamples());
    } finally {
      setLoading(false);
    }
  };

  const generateMockSamples = () => {
    const statuses = Object.keys(workflowStages);
    const priorities = ['normal', 'urgent', 'critical'];
    const mockSamples = [];

    for (let i = 1; i <= 50; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      mockSamples.push({
        id: `S${String(i).padStart(3, '0')}`,
        lab_number: `25_${String(i).padStart(3, '0')}`,
        barcode: `LDS${String(i).padStart(6, '0')}`,
        case_number: `BN-${String(Math.floor(i/3) + 1).padStart(3, '0')}`,
        kit_number: `PT${String(Math.floor(i/3) + 1).padStart(3, '0')}`,
        name: ['John Doe', 'Jane Smith', 'Child'][i % 3],
        relation: ['father', 'mother', 'child'][i % 3],
        sample_type: ['Buccal Swab', 'Blood', 'Saliva'][Math.floor(Math.random() * 3)],
        status: status,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        registered_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        last_updated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        pcr_batch: status !== 'registered' ? `LDS_${Math.floor(i/5) + 135}` : null,
        electro_batch: ['in_electrophoresis', 'electro_completed', 'in_analysis', 'analysis_completed', 'report_generated'].includes(status) 
          ? `LDS_${Math.floor(i/5) + 135}-ELECTRO` : null,
        quality_score: status === 'analysis_completed' ? Math.random() * 0.3 + 0.7 : null,
        turnaround_days: status === 'delivered' ? Math.floor(Math.random() * 10) + 3 : null,
        chain_of_custody: [
          {
            stage: 'registered',
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            user: 'lab_tech_01',
            notes: 'Sample registered in system'
          },
          {
            stage: 'sample_collected',
            date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
            user: 'nurse_01',
            notes: 'Buccal swab collected'
          }
        ]
      });
    }
    return mockSamples;
  };

  const filterSamples = () => {
    let filtered = [...samples];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sample =>
        sample.lab_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sample => sample.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(sample => sample.priority === priorityFilter);
    }

    setFilteredSamples(filtered);
  };

  const calculateStats = () => {
    const total = samples.length;
    const registered = samples.filter(s => s.status === 'registered').length;
    const inProcess = samples.filter(s => 
      ['in_pcr', 'in_electrophoresis', 'in_analysis'].includes(s.status)
    ).length;
    const completed = samples.filter(s => 
      ['report_generated', 'delivered'].includes(s.status)
    ).length;
    const failed = samples.filter(s => s.status === 'failed').length;
    const urgent = samples.filter(s => s.priority === 'urgent' || s.priority === 'critical').length;
    
    const turnaroundSamples = samples.filter(s => s.turnaround_days);
    const avgTurnaround = turnaroundSamples.length > 0 
      ? turnaroundSamples.reduce((acc, s) => acc + s.turnaround_days, 0) / turnaroundSamples.length
      : 0;

    setStats({
      total,
      registered,
      inProcess,
      completed,
      failed,
      urgent,
      avgTurnaround: avgTurnaround.toFixed(1)
    });
  };

  const handleUpdateStatus = async () => {
    if (!selectedSample || !updateStatus) return;

    try {
      // Update sample status
      const updatedSamples = samples.map(sample => {
        if (sample.id === selectedSample.id) {
          return {
            ...sample,
            status: updateStatus,
            last_updated: new Date(),
            chain_of_custody: [
              ...sample.chain_of_custody,
              {
                stage: updateStatus,
                date: new Date(),
                user: 'current_user',
                notes: updateNotes
              }
            ]
          };
        }
        return sample;
      });

      setSamples(updatedSamples);
      setUpdateOpen(false);
      setUpdateStatus('');
      setUpdateNotes('');
    } catch (error) {
      console.error('Error updating sample:', error);
    }
  };

  const getPriorityChip = (priority) => {
    const colors = {
      normal: 'default',
      urgent: 'warning',
      critical: 'error'
    };
    return (
      <Chip 
        label={priority.toUpperCase()} 
        color={colors[priority] || 'default'} 
        size="small"
        icon={priority === 'critical' ? <Flag /> : undefined}
      />
    );
  };

  const getStatusChip = (status) => {
    const stage = workflowStages[status];
    if (!stage) return null;
    
    return (
      <Chip 
        label={stage.label} 
        color={stage.color}
        size="small"
        icon={stage.icon}
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Sample Tracking & Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track samples through the complete testing workflow
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {/* Export functionality */}}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={loadSamples}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Samples
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                In Process
              </Typography>
              <Typography variant="h4" color="primary">{stats.inProcess}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">{stats.completed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Failed/Rerun
              </Typography>
              <Typography variant="h4" color="error">{stats.failed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Urgent/Critical
              </Typography>
              <Typography variant="h4" color="warning.main">{stats.urgent}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Avg. Turnaround
              </Typography>
              <Typography variant="h4">{stats.avgTurnaround}d</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search samples"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              placeholder="Lab number, barcode, case number, name..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {Object.entries(workflowStages).map(([key, stage]) => (
                  <MenuItem key={key} value={key}>{stage.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority Filter</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                label="Priority Filter"
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Samples Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lab Number</TableCell>
              <TableCell>Case/Kit</TableCell>
              <TableCell>Sample Info</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Current Batch</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : filteredSamples.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No samples found
                </TableCell>
              </TableRow>
            ) : (
              filteredSamples
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((sample) => (
                  <TableRow key={sample.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {sample.lab_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sample.barcode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{sample.case_number}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sample.kit_number}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{sample.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sample.relation} - {sample.sample_type}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{getStatusChip(sample.status)}</TableCell>
                    <TableCell>{getPriorityChip(sample.priority)}</TableCell>
                    <TableCell>
                      {sample.electro_batch || sample.pcr_batch || '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {format(new Date(sample.last_updated), 'MMM dd, HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedSample(sample);
                            setDetailsOpen(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Update Status">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedSample(sample);
                            setUpdateOpen(true);
                          }}
                        >
                          <Update />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Print Barcode">
                        <IconButton size="small">
                          <Print />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredSamples.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Sample Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Sample Details - {selectedSample?.lab_number}
        </DialogTitle>
        <DialogContent>
          {selectedSample && (
            <Box>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="General Info" />
                <Tab label="Chain of Custody" />
                <Tab label="Quality Metrics" />
              </Tabs>

              {activeTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Lab Number</Typography>
                    <Typography variant="body1">{selectedSample.lab_number}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Barcode</Typography>
                    <Typography variant="body1">{selectedSample.barcode}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Case Number</Typography>
                    <Typography variant="body1">{selectedSample.case_number}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Kit Number</Typography>
                    <Typography variant="body1">{selectedSample.kit_number}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{selectedSample.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Relation</Typography>
                    <Typography variant="body1">{selectedSample.relation}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Sample Type</Typography>
                    <Typography variant="body1">{selectedSample.sample_type}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Current Status</Typography>
                    <Box sx={{ mt: 1 }}>{getStatusChip(selectedSample.status)}</Box>
                  </Grid>
                </Grid>
              )}

              {activeTab === 1 && (
                <Timeline>
                  {selectedSample.chain_of_custody.map((event, index) => (
                    <TimelineItem key={index}>
                      <TimelineOppositeContent color="text.secondary">
                        {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color={index === 0 ? 'primary' : 'grey'}>
                          {workflowStages[event.stage]?.icon}
                        </TimelineDot>
                        {index < selectedSample.chain_of_custody.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="subtitle2">
                          {workflowStages[event.stage]?.label || event.stage}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          By: {event.user}
                        </Typography>
                        {event.notes && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {event.notes}
                          </Typography>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}

              {activeTab === 2 && (
                <Box>
                  {selectedSample.quality_score ? (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Quality Score
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={selectedSample.quality_score * 100}
                        color={selectedSample.quality_score > 0.8 ? 'success' : 'warning'}
                        sx={{ height: 10, borderRadius: 1, mb: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {(selectedSample.quality_score * 100).toFixed(1)}% - 
                        {selectedSample.quality_score > 0.8 ? ' Excellent' : ' Good'}
                      </Typography>
                    </Box>
                  ) : (
                    <Alert severity="info">
                      Quality metrics will be available after OSIRIS analysis
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog 
        open={updateOpen} 
        onClose={() => setUpdateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Sample Status - {selectedSample?.lab_number}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value)}
                label="New Status"
              >
                {Object.entries(workflowStages).map(([key, stage]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {stage.icon}
                      {stage.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="Add any relevant notes about this status update..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateStatus}
            disabled={!updateStatus}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SampleTracking;