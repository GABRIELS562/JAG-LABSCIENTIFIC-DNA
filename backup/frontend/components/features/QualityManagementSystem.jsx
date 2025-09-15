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
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  LinearProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Assignment,
  Build,
  Description,
  School,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Visibility,
  CalendarToday,
  Timeline,
  Assessment
} from '@mui/icons-material';

const QualityManagementSystem = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // CAPA Management State
  const [capaActions, setCapaActions] = useState([]);
  const [capaDialog, setCapaDialog] = useState({ open: false, action: null, data: {} });
  
  // Equipment Management State
  const [equipment, setEquipment] = useState([]);
  const [calibrationSchedule, setCalibrationSchedule] = useState([]);
  
  // Document Control State
  const [documents, setDocuments] = useState([]);
  const [documentCategories, setDocumentCategories] = useState([]);
  
  // Training Management State
  const [trainingPrograms, setTrainingPrograms] = useState([]);
  const [trainingRecords, setTrainingRecords] = useState([]);

  useEffect(() => {
    loadData();
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (tabValue) {
        case 0: // CAPA
          await loadCapaData();
          break;
        case 1: // Equipment
          await loadEquipmentData();
          break;
        case 2: // Documents
          await loadDocumentData();
          break;
        case 3: // Training
          await loadTrainingData();
          break;
      }
    } catch (error) {
      showSnackbar('Failed to load data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCapaData = async () => {
    // Mock data for now - replace with actual API calls when backend is ready
    const mockCapaData = [
      {
        id: 1,
        capa_number: 'CAPA-2025-001',
        title: 'Temperature Deviation in PCR Room',
        type: 'corrective',
        priority: 'high',
        status: 'in_progress',
        responsible_person: 'Lab Manager',
        due_date: '2025-09-15',
        created_at: '2025-08-15T10:00:00Z'
      },
      {
        id: 2,
        capa_number: 'CAPA-2025-002',
        title: 'Update DNA Extraction Procedure',
        type: 'preventive',
        priority: 'medium',
        status: 'pending_verification',
        responsible_person: 'Quality Officer',
        due_date: '2025-09-30',
        created_at: '2025-08-18T14:30:00Z'
      }
    ];
    setCapaActions(mockCapaData);
  };

  const loadEquipmentData = async () => {
    const mockEquipment = [
      {
        id: 1,
        equipment_name: 'PCR Thermocycler #1',
        equipment_id: 'PCR-001',
        status: 'active',
        location: 'Lab Room 1',
        category: 'thermocycler',
        next_calibration_date: '2025-09-01',
        last_calibration_status: 'passed'
      },
      {
        id: 2,
        equipment_name: 'Genetic Analyzer',
        equipment_id: 'GA-001',
        status: 'active',
        location: 'Lab Room 2',
        category: 'sequencer',
        next_calibration_date: '2025-08-25',
        last_calibration_status: 'passed'
      }
    ];

    const mockCalibrationSchedule = [
      {
        equipment_name: 'Genetic Analyzer',
        next_calibration_date: '2025-08-25',
        urgency: 'urgent',
        days_until_predicted: 5
      },
      {
        equipment_name: 'Centrifuge #1',
        next_calibration_date: '2025-09-01',
        urgency: 'upcoming',
        days_until_predicted: 12
      }
    ];

    setEquipment(mockEquipment);
    setCalibrationSchedule(mockCalibrationSchedule);
  };

  const loadDocumentData = async () => {
    const mockDocuments = [
      {
        id: 1,
        document_number: 'SOP-001',
        title: 'DNA Extraction Standard Operating Procedure',
        document_type: 'sop',
        version: '2.1',
        status: 'active',
        effective_date: '2025-01-01',
        next_review_date: '2026-01-01',
        author: 'Lab Manager'
      },
      {
        id: 2,
        document_number: 'QM-001',
        title: 'Quality Manual',
        document_type: 'manual',
        version: '1.3',
        status: 'active',
        effective_date: '2024-12-01',
        next_review_date: '2025-12-01',
        author: 'Quality Manager'
      }
    ];

    const mockCategories = [
      { id: 1, name: 'Standard Operating Procedures' },
      { id: 2, name: 'Quality Manual' },
      { id: 3, name: 'Forms and Templates' }
    ];

    setDocuments(mockDocuments);
    setDocumentCategories(mockCategories);
  };

  const loadTrainingData = async () => {
    const mockPrograms = [
      {
        id: 1,
        program_name: 'Laboratory Safety',
        category: 'Safety',
        type: 'mandatory',
        duration_hours: 4,
        validity_period_days: 365,
        enrolled_count: 15,
        completed_count: 12
      },
      {
        id: 2,
        program_name: 'DNA Extraction Techniques',
        category: 'Technical',
        type: 'mandatory',
        duration_hours: 6,
        validity_period_days: 365,
        enrolled_count: 8,
        completed_count: 8
      }
    ];

    setTrainingPrograms(mockPrograms);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCapaSubmit = async (capaData) => {
    try {
      // Mock submission - replace with actual API call
      console.log('Submitting CAPA:', capaData);
      showSnackbar('CAPA action saved successfully');
      setCapaDialog({ open: false, action: null, data: {} });
      loadCapaData();
    } catch (error) {
      showSnackbar('Failed to save CAPA action: ' + error.message, 'error');
    }
  };

  const getStatusChip = (status, type = 'default') => {
    const statusConfig = {
      open: { color: 'info', icon: <Assignment /> },
      in_progress: { color: 'warning', icon: <Timeline /> },
      pending_verification: { color: 'warning', icon: <CheckCircle /> },
      completed: { color: 'success', icon: <CheckCircle /> },
      closed: { color: 'default', icon: <CheckCircle /> },
      active: { color: 'success', icon: <CheckCircle /> },
      inactive: { color: 'default', icon: <ErrorIcon /> },
      overdue: { color: 'error', icon: <ErrorIcon /> },
      urgent: { color: 'warning', icon: <Warning /> },
      upcoming: { color: 'info', icon: <CalendarToday /> }
    };

    const config = statusConfig[status] || { color: 'default', icon: null };
    
    return (
      <Chip
        label={status.replace('_', ' ').toUpperCase()}
        color={config.color}
        size="small"
        icon={config.icon}
        variant="outlined"
      />
    );
  };

  const getPriorityChip = (priority) => {
    const priorityColors = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      critical: 'error'
    };

    return (
      <Chip
        label={priority.toUpperCase()}
        color={priorityColors[priority] || 'default'}
        size="small"
        variant="filled"
      />
    );
  };

  const renderCapaManagement = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">CAPA Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCapaDialog({ open: true, action: 'create', data: {} })}
        >
          New CAPA
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>CAPA Number</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Responsible Person</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {capaActions.map((capa) => (
              <TableRow key={capa.id}>
                <TableCell>{capa.capa_number}</TableCell>
                <TableCell>{capa.title}</TableCell>
                <TableCell>
                  <Chip label={capa.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{getPriorityChip(capa.priority)}</TableCell>
                <TableCell>{getStatusChip(capa.status)}</TableCell>
                <TableCell>{capa.responsible_person}</TableCell>
                <TableCell>{new Date(capa.due_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => setCapaDialog({ open: true, action: 'view', data: capa })}>
                    <Visibility />
                  </IconButton>
                  <IconButton size="small" onClick={() => setCapaDialog({ open: true, action: 'edit', data: capa })}>
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderEquipmentManagement = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Equipment List</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Equipment Name</TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Next Calibration</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {equipment.map((equip) => (
                      <TableRow key={equip.id}>
                        <TableCell>{equip.equipment_name}</TableCell>
                        <TableCell>{equip.equipment_id}</TableCell>
                        <TableCell>{equip.location}</TableCell>
                        <TableCell>{getStatusChip(equip.status)}</TableCell>
                        <TableCell>
                          {new Date(equip.next_calibration_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Build />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Calibration Schedule</Typography>
              {calibrationSchedule.map((item, index) => (
                <Box key={index} mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
                  <Typography variant="subtitle2">{item.equipment_name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Due: {new Date(item.next_calibration_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {item.days_until_predicted} days remaining
                  </Typography>
                  {getStatusChip(item.urgency)}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderDocumentControl = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Document Control</Typography>
        <Button variant="contained" startIcon={<Add />}>
          New Document
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Document Number</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Next Review</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.document_number}</TableCell>
                <TableCell>{doc.title}</TableCell>
                <TableCell>
                  <Chip label={doc.document_type.toUpperCase()} size="small" />
                </TableCell>
                <TableCell>{doc.version}</TableCell>
                <TableCell>{getStatusChip(doc.status)}</TableCell>
                <TableCell>
                  {new Date(doc.next_review_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <Visibility />
                  </IconButton>
                  <IconButton size="small">
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderTrainingManagement = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Training Programs</Typography>
      
      <Grid container spacing={3}>
        {trainingPrograms.map((program) => (
          <Grid item xs={12} md={6} lg={4} key={program.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{program.program_name}</Typography>
                <Typography color="textSecondary" gutterBottom>
                  {program.category} • {program.type}
                </Typography>
                <Typography variant="body2" paragraph>
                  Duration: {program.duration_hours} hours
                </Typography>
                <Typography variant="body2" paragraph>
                  Valid for: {Math.floor(program.validity_period_days / 365)} year(s)
                </Typography>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2">
                      Completed: {program.completed_count}/{program.enrolled_count}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(program.completed_count / program.enrolled_count) * 100}
                      sx={{ mt: 1, width: '100px' }}
                    />
                  </Box>
                  <Button size="small" startIcon={<School />}>
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Quality Management System
      </Typography>

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
            <Tab icon={<Assignment />} label="CAPA Management" />
            <Tab icon={<Build />} label="Equipment & Calibration" />
            <Tab icon={<Description />} label="Document Control" />
            <Tab icon={<School />} label="Training Management" />
          </Tabs>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Box mt={2}>
        {tabValue === 0 && renderCapaManagement()}
        {tabValue === 1 && renderEquipmentManagement()}
        {tabValue === 2 && renderDocumentControl()}
        {tabValue === 3 && renderTrainingManagement()}
      </Box>

      {/* CAPA Dialog */}
      <Dialog open={capaDialog.open} onClose={() => setCapaDialog({ open: false, action: null, data: {} })} maxWidth="md" fullWidth>
        <DialogTitle>
          {capaDialog.action === 'create' ? 'Create New CAPA' : 
           capaDialog.action === 'edit' ? 'Edit CAPA' : 'View CAPA'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Title"
                value={capaDialog.data.title || ''}
                onChange={(e) => setCapaDialog(prev => ({ 
                  ...prev, 
                  data: { ...prev.data, title: e.target.value } 
                }))}
                disabled={capaDialog.action === 'view'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Type"
                value={capaDialog.data.type || 'corrective'}
                onChange={(e) => setCapaDialog(prev => ({ 
                  ...prev, 
                  data: { ...prev.data, type: e.target.value } 
                }))}
                disabled={capaDialog.action === 'view'}
              >
                <MenuItem value="corrective">Corrective</MenuItem>
                <MenuItem value="preventive">Preventive</MenuItem>
                <MenuItem value="improvement">Improvement</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Priority"
                value={capaDialog.data.priority || 'medium'}
                onChange={(e) => setCapaDialog(prev => ({ 
                  ...prev, 
                  data: { ...prev.data, priority: e.target.value } 
                }))}
                disabled={capaDialog.action === 'view'}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Responsible Person"
                value={capaDialog.data.responsible_person || ''}
                onChange={(e) => setCapaDialog(prev => ({ 
                  ...prev, 
                  data: { ...prev.data, responsible_person: e.target.value } 
                }))}
                disabled={capaDialog.action === 'view'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={capaDialog.data.description || ''}
                onChange={(e) => setCapaDialog(prev => ({ 
                  ...prev, 
                  data: { ...prev.data, description: e.target.value } 
                }))}
                disabled={capaDialog.action === 'view'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCapaDialog({ open: false, action: null, data: {} })}>
            Cancel
          </Button>
          {capaDialog.action !== 'view' && (
            <Button 
              variant="contained" 
              onClick={() => handleCapaSubmit(capaDialog.data)}
            >
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

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

export default QualityManagementSystem;