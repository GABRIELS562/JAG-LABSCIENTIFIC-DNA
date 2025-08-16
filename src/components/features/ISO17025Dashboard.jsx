import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Badge
} from '@mui/material';
import {
  Description,
  Warning,
  Build,
  Timeline,
  CheckCircle,
  Error,
  Schedule,
  Add,
  Visibility,
  Edit,
  Assessment,
  VerifiedUser,
  Assignment,
  Delete,
  Download,
  Upload,
  Save,
  Cancel
} from '@mui/icons-material';
import api from '../../services/api';

export default function ISO17025Dashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [nonConformances, setNonConformances] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [ncDialog, setNcDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [equipmentDialog, setEquipmentDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newNC, setNewNC] = useState({
    detected_by_name: '',
    source: '',
    category: '',
    severity: '',
    description: ''
  });
  const [newDocument, setNewDocument] = useState({
    document_number: '',
    document_type: 'SOP',
    title: '',
    description: '',
    version: '1.0',
    effective_date: new Date().toISOString().split('T')[0],
    review_date: '',
    owner_name: '',
    approved_by_name: '',
    department: ''
  });
  const [newEquipment, setNewEquipment] = useState({
    equipment_id: '',
    name: '',
    category: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    location: '',
    critical_equipment: false,
    responsible_person: ''
  });

  useEffect(() => {
    loadDashboardStats();
    loadInitialData();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/iso17025/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load documents
      const docsResponse = await fetch('/api/iso17025/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const docsData = await docsResponse.json();
      if (docsData.success) {
        setDocuments(docsData.data);
      }

      // Load non-conformances
      const ncResponse = await fetch('/api/iso17025/non-conformances', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const ncData = await ncResponse.json();
      if (ncData.success) {
        setNonConformances(ncData.data);
      }

      // Load equipment
      const equipResponse = await fetch('/api/iso17025/equipment', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const equipData = await equipResponse.json();
      if (equipData.success) {
        setEquipment(equipData.data);
      }

      // Load recent audit logs
      const auditResponse = await fetch('/api/iso17025/audit-logs?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const auditData = await auditResponse.json();
      if (auditData.success) {
        setAuditLogs(auditData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNC = async () => {
    try {
      const response = await fetch('/api/iso17025/non-conformances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newNC)
      });
      const data = await response.json();
      if (data.success) {
        setNcDialog(false);
        loadInitialData();
        setNewNC({
          detected_by_name: '',
          source: '',
          category: '',
          severity: '',
          description: ''
        });
      }
    } catch (error) {
      console.error('Error creating non-conformance:', error);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      Object.keys(newDocument).forEach(key => {
        formData.append(key, newDocument[key]);
      });

      const response = await fetch('/api/iso17025/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setDocumentDialog(false);
        setSelectedFile(null);
        loadInitialData();
        setNewDocument({
          document_number: '',
          document_type: 'SOP',
          title: '',
          description: '',
          version: '1.0',
          effective_date: new Date().toISOString().split('T')[0],
          review_date: '',
          owner_name: '',
          approved_by_name: '',
          department: ''
        });
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const handleCreateEquipment = async () => {
    try {
      const response = await fetch('/api/iso17025/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newEquipment)
      });
      
      const data = await response.json();
      if (data.success) {
        setEquipmentDialog(false);
        loadInitialData();
        setNewEquipment({
          equipment_id: '',
          name: '',
          category: '',
          manufacturer: '',
          model: '',
          serial_number: '',
          location: '',
          critical_equipment: false,
          responsible_person: ''
        });
      }
    } catch (error) {
      console.error('Error creating equipment:', error);
    }
  };

  const handleDownloadDocument = async (docId) => {
    try {
      const response = await fetch(`/api/iso17025/documents/${docId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'document';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'error';
      case 'Major': return 'warning';
      case 'Minor': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Draft': return 'default';
      case 'Under Review': return 'warning';
      case 'Obsolete': return 'error';
      case 'Open': return 'error';
      case 'Closed': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#1e3a5f', fontWeight: 'bold' }}>
        ISO 17025 Compliance Dashboard
      </Typography>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #1e3a5f' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Quality Documents
                    </Typography>
                    <Typography variant="h4">
                      {stats.documents.active}/{stats.documents.total}
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      {stats.documents.review_due} due for review
                    </Typography>
                  </Box>
                  <Description sx={{ fontSize: 40, color: '#1e3a5f' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #dc2626' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Non-Conformances
                    </Typography>
                    <Typography variant="h4">
                      {stats.nonConformances.open}
                    </Typography>
                    <Typography variant="body2" color="error">
                      {stats.nonConformances.critical} critical
                    </Typography>
                  </Box>
                  <Warning sx={{ fontSize: 40, color: '#dc2626' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #2d6987' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Equipment
                    </Typography>
                    <Typography variant="h4">
                      {stats.equipment.total}
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      {stats.equipment.calibration_due} calibration due
                    </Typography>
                  </Box>
                  <Build sx={{ fontSize: 40, color: '#2d6987' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #48a868' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Proficiency Tests
                    </Typography>
                    <Typography variant="h4">
                      {stats.proficiency.satisfactory}
                    </Typography>
                    <Typography variant="body2" color="info.main">
                      {stats.proficiency.scheduled} scheduled
                    </Typography>
                  </Box>
                  <VerifiedUser sx={{ fontSize: 40, color: '#48a868' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs for different sections */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Documents" icon={<Description />} />
          <Tab label="Non-Conformances" icon={<Warning />} />
          <Tab label="Equipment" icon={<Build />} />
          <Tab label="Audit Trail" icon={<Timeline />} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* Documents Tab */}
          {tabValue === 0 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<Upload />}
                  onClick={() => setDocumentDialog(true)}
                  sx={{ bgcolor: '#1e3a5f' }}
                >
                  Upload Document
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Document Number</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Review Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>{doc.document_number}</TableCell>
                        <TableCell>{doc.title}</TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>{doc.version}</TableCell>
                        <TableCell>
                          <Chip label={doc.status} size="small" color={getStatusColor(doc.status)} />
                        </TableCell>
                        <TableCell>{new Date(doc.review_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {doc.file_path && (
                            <IconButton size="small" onClick={() => handleDownloadDocument(doc.id)}>
                              <Download fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton size="small">
                            <Edit fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Non-Conformances Tab */}
          {tabValue === 1 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setNcDialog(true)}
                  sx={{ bgcolor: '#1e3a5f' }}
                >
                  Report Non-Conformance
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>NC Number</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {nonConformances.map((nc) => (
                      <TableRow key={nc.id}>
                        <TableCell>{nc.nc_number}</TableCell>
                        <TableCell>{new Date(nc.detected_date).toLocaleDateString()}</TableCell>
                        <TableCell>{nc.category}</TableCell>
                        <TableCell>
                          <Chip label={nc.severity} size="small" color={getSeverityColor(nc.severity)} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nc.description}
                        </TableCell>
                        <TableCell>
                          <Chip label={nc.status} size="small" color={getStatusColor(nc.status)} />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small">
                            <Edit fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Equipment Tab */}
          {tabValue === 2 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setEquipmentDialog(true)}
                  sx={{ bgcolor: '#1e3a5f' }}
                >
                  Add Equipment
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Equipment ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Calibration Status</TableCell>
                      <TableCell>Next Calibration</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {equipment.map((eq) => (
                      <TableRow key={eq.id}>
                        <TableCell>{eq.equipment_id}</TableCell>
                        <TableCell>{eq.name || eq.type}</TableCell>
                        <TableCell>{eq.category || '-'}</TableCell>
                        <TableCell>{eq.location || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={eq.status} 
                            size="small" 
                            color={eq.status === 'active' ? 'success' : 'default'} 
                          />
                        </TableCell>
                        <TableCell>
                          {eq.calibration_status && (
                            <Chip 
                              label={eq.calibration_status} 
                              size="small" 
                              color={
                                eq.calibration_status === 'Current' ? 'success' : 
                                eq.calibration_status === 'Due Soon' ? 'warning' : 'error'
                              } 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {eq.next_calibration_date ? 
                            new Date(eq.next_calibration_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small">
                            <Edit fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Audit Trail Tab */}
          {tabValue === 3 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Entity Type</TableCell>
                    <TableCell>Entity ID</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{log.username}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entity_type || '-'}</TableCell>
                      <TableCell>{log.entity_id || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.status} 
                          size="small" 
                          color={log.status === 'success' ? 'success' : 'error'} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Non-Conformance Dialog */}
      <Dialog open={ncDialog} onClose={() => setNcDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Report Non-Conformance</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Detected By"
            margin="normal"
            value={newNC.detected_by_name}
            onChange={(e) => setNewNC({ ...newNC, detected_by_name: e.target.value })}
          />
          <TextField
            fullWidth
            select
            label="Source"
            margin="normal"
            value={newNC.source}
            onChange={(e) => setNewNC({ ...newNC, source: e.target.value })}
          >
            <MenuItem value="Internal Audit">Internal Audit</MenuItem>
            <MenuItem value="External Audit">External Audit</MenuItem>
            <MenuItem value="Customer Complaint">Customer Complaint</MenuItem>
            <MenuItem value="Quality Control">Quality Control</MenuItem>
            <MenuItem value="Staff Observation">Staff Observation</MenuItem>
          </TextField>
          <TextField
            fullWidth
            select
            label="Category"
            margin="normal"
            value={newNC.category}
            onChange={(e) => setNewNC({ ...newNC, category: e.target.value })}
          >
            <MenuItem value="Documentation">Documentation</MenuItem>
            <MenuItem value="Process">Process</MenuItem>
            <MenuItem value="Equipment">Equipment</MenuItem>
            <MenuItem value="Personnel">Personnel</MenuItem>
            <MenuItem value="Sample">Sample</MenuItem>
            <MenuItem value="Result">Result</MenuItem>
          </TextField>
          <TextField
            fullWidth
            select
            label="Severity"
            margin="normal"
            value={newNC.severity}
            onChange={(e) => setNewNC({ ...newNC, severity: e.target.value })}
          >
            <MenuItem value="Critical">Critical</MenuItem>
            <MenuItem value="Major">Major</MenuItem>
            <MenuItem value="Minor">Minor</MenuItem>
            <MenuItem value="Observation">Observation</MenuItem>
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            margin="normal"
            value={newNC.description}
            onChange={(e) => setNewNC({ ...newNC, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNcDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateNC} variant="contained" sx={{ bgcolor: '#1e3a5f' }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={documentDialog} onClose={() => setDocumentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Document Number"
                margin="normal"
                value={newDocument.document_number}
                onChange={(e) => setNewDocument({ ...newDocument, document_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Document Type"
                margin="normal"
                value={newDocument.document_type}
                onChange={(e) => setNewDocument({ ...newDocument, document_type: e.target.value })}
              >
                <MenuItem value="SOP">SOP - Standard Operating Procedure</MenuItem>
                <MenuItem value="WI">WI - Work Instruction</MenuItem>
                <MenuItem value="QM">QM - Quality Manual</MenuItem>
                <MenuItem value="FORM">Form</MenuItem>
                <MenuItem value="POLICY">Policy</MenuItem>
                <MenuItem value="PROCEDURE">Procedure</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                margin="normal"
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                margin="normal"
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Version"
                margin="normal"
                value={newDocument.version}
                onChange={(e) => setNewDocument({ ...newDocument, version: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Effective Date"
                margin="normal"
                InputLabelProps={{ shrink: true }}
                value={newDocument.effective_date}
                onChange={(e) => setNewDocument({ ...newDocument, effective_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Review Date"
                margin="normal"
                InputLabelProps={{ shrink: true }}
                value={newDocument.review_date}
                onChange={(e) => setNewDocument({ ...newDocument, review_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Document Owner"
                margin="normal"
                value={newDocument.owner_name}
                onChange={(e) => setNewDocument({ ...newDocument, owner_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Approved By"
                margin="normal"
                value={newDocument.approved_by_name}
                onChange={(e) => setNewDocument({ ...newDocument, approved_by_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Department"
                margin="normal"
                value={newDocument.department}
                onChange={(e) => setNewDocument({ ...newDocument, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{ margin: '10px 0' }}
                />
                {selectedFile && (
                  <Typography variant="body2" color="textSecondary">
                    Selected: {selectedFile.name}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentDialog(false)} startIcon={<Cancel />}>Cancel</Button>
          <Button 
            onClick={handleUploadDocument} 
            variant="contained" 
            startIcon={<Save />}
            sx={{ bgcolor: '#1e3a5f' }}
            disabled={!selectedFile}
          >
            Upload Document
          </Button>
        </DialogActions>
      </Dialog>

      {/* Equipment Dialog */}
      <Dialog open={equipmentDialog} onClose={() => setEquipmentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Equipment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Equipment ID"
                margin="normal"
                value={newEquipment.equipment_id}
                onChange={(e) => setNewEquipment({ ...newEquipment, equipment_id: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Equipment Name"
                margin="normal"
                value={newEquipment.name}
                onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Category"
                margin="normal"
                value={newEquipment.category}
                onChange={(e) => setNewEquipment({ ...newEquipment, category: e.target.value })}
              >
                <MenuItem value="PCR Equipment">PCR Equipment</MenuItem>
                <MenuItem value="Electrophoresis">Electrophoresis</MenuItem>
                <MenuItem value="Centrifuge">Centrifuge</MenuItem>
                <MenuItem value="Balance">Balance</MenuItem>
                <MenuItem value="Thermometer">Thermometer</MenuItem>
                <MenuItem value="pH Meter">pH Meter</MenuItem>
                <MenuItem value="Freezer">Freezer</MenuItem>
                <MenuItem value="Incubator">Incubator</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Manufacturer"
                margin="normal"
                value={newEquipment.manufacturer}
                onChange={(e) => setNewEquipment({ ...newEquipment, manufacturer: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Model"
                margin="normal"
                value={newEquipment.model}
                onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Serial Number"
                margin="normal"
                value={newEquipment.serial_number}
                onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                margin="normal"
                value={newEquipment.location}
                onChange={(e) => setNewEquipment({ ...newEquipment, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Responsible Person"
                margin="normal"
                value={newEquipment.responsible_person}
                onChange={(e) => setNewEquipment({ ...newEquipment, responsible_person: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <input
                  type="checkbox"
                  id="critical-equipment"
                  checked={newEquipment.critical_equipment}
                  onChange={(e) => setNewEquipment({ ...newEquipment, critical_equipment: e.target.checked })}
                />
                <label htmlFor="critical-equipment" style={{ marginLeft: '8px' }}>
                  Critical Equipment (requires regular calibration)
                </label>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEquipmentDialog(false)} startIcon={<Cancel />}>Cancel</Button>
          <Button 
            onClick={handleCreateEquipment} 
            variant="contained" 
            startIcon={<Save />}
            sx={{ bgcolor: '#1e3a5f' }}
          >
            Add Equipment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}