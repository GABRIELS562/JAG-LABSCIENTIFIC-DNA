import React, { useState } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack
} from '@mui/material';
import {
  Assessment,
  Warning,
  CheckCircle,
  PendingActions,
  Download,
  Print
} from '@mui/icons-material';

const QualityControl = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedEquipment, setSelectedEquipment] = useState('');

  const qualityMetrics = {
    batchControls: [
      {
        id: 'AL1',
        type: 'Allelic Ladder',
        criteria: 'All expected alleles present and correctly sized',
        frequency: 'Every batch',
        status: 'Pass',
        lastChecked: '2024-02-20',
        operator: 'John Doe'
      },
      {
        id: 'PC1',
        type: 'Positive Control',
        criteria: 'Expected genotype matches reference',
        frequency: 'Every batch',
        status: 'Pass',
        lastChecked: '2024-02-20',
        operator: 'John Doe'
      }
    ],
    calibrationChecks: [
      {
        id: 'CAL1',
        equipment: 'Thermal Cycler 1',
        lastCheck: '2024-02-15',
        nextDue: '2024-05-15',
        status: 'Current',
        temperature: '98.6°C',
        tolerance: '±0.5°C'
      }
    ],
    documents: [
      {
        id: 'DOC1',
        title: 'SOP-QC-001',
        description: 'Quality Control Procedures',
        lastUpdated: '2024-01-01',
        status: 'Active',
        version: '2.1'
      }
    ],
    equipmentList: [
      {
        id: 'EQ1',
        name: 'Thermal Cycler 1',
        model: 'ProFlex™ PCR',
        serialNumber: 'TC123456',
        calibrationDue: '2024-05-15',
        maintenanceSchedule: 'Monthly',
        status: 'Operational'
      },
      {
        id: 'EQ2',
        name: 'Genetic Analyzer',
        model: '3500xL',
        serialNumber: 'GA789012',
        calibrationDue: '2024-04-20',
        maintenanceSchedule: 'Weekly',
        status: 'Maintenance Due'
      }
    ],
    standardsList: [
      {
        id: 'STD1',
        name: 'Allelic Ladder',
        lotNumber: 'AL202401',
        expiryDate: '2025-01-01',
        status: 'In Use'
      },
      {
        id: 'STD2',
        name: 'Size Standard',
        lotNumber: 'SS202402',
        expiryDate: '2025-02-01',
        status: 'In Use'
      }
    ],
    auditTrail: [
      {
        id: 'AUD1',
        date: '2024-02-20',
        user: 'John Doe',
        action: 'Equipment Calibration',
        details: 'Thermal Cycler 1 calibration completed'
      },
      {
        id: 'AUD2',
        date: '2024-02-19',
        user: 'Jane Smith',
        action: 'Standard Verification',
        details: 'New Allelic Ladder lot verified'
      }
    ]
  };

  const renderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          2 calibrations due within 30 days
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Quality Metrics
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Overall Quality Score
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={98} 
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                98% - Excellent
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Latest Batch Controls
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Control</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualityMetrics.batchControls.map((control) => (
                    <TableRow key={control.id}>
                      <TableCell>{control.type}</TableCell>
                      <TableCell>
                        <Chip 
                          label={control.status}
                          color={control.status === 'Pass' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{control.lastChecked}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderEquipmentTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Equipment Management</Typography>
              <Button variant="contained" color="primary">
                Add New Equipment
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Equipment Name</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>Serial Number</TableCell>
                    <TableCell>Calibration Due</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualityMetrics.equipmentList.map((equipment) => (
                    <TableRow key={equipment.id}>
                      <TableCell>{equipment.name}</TableCell>
                      <TableCell>{equipment.model}</TableCell>
                      <TableCell>{equipment.serialNumber}</TableCell>
                      <TableCell>{equipment.calibrationDue}</TableCell>
                      <TableCell>
                        <Chip 
                          label={equipment.status}
                          color={equipment.status === 'Operational' ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small">View Log</Button>
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
  );

  const renderStandardsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Standards and Controls</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Standard Name</TableCell>
                    <TableCell>Lot Number</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualityMetrics.standardsList.map((standard) => (
                    <TableRow key={standard.id}>
                      <TableCell>{standard.name}</TableCell>
                      <TableCell>{standard.lotNumber}</TableCell>
                      <TableCell>{standard.expiryDate}</TableCell>
                      <TableCell>
                        <Chip label={standard.status} color="primary" />
                      </TableCell>
                      <TableCell>
                        <Button size="small">View History</Button>
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
  );

  const renderAuditTrail = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Audit Trail</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualityMetrics.auditTrail.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>{audit.date}</TableCell>
                      <TableCell>{audit.user}</TableCell>
                      <TableCell>{audit.action}</TableCell>
                      <TableCell>{audit.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderBatchControls = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Batch Control Management</Typography>
              <Button variant="contained" color="primary">
                Add New Control
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Control ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Criteria</TableCell>
                    <TableCell>Last Checked</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualityMetrics.batchControls.map((control) => (
                    <TableRow key={control.id}>
                      <TableCell>{control.id}</TableCell>
                      <TableCell>{control.type}</TableCell>
                      <TableCell>{control.criteria}</TableCell>
                      <TableCell>{control.lastChecked}</TableCell>
                      <TableCell>{control.operator}</TableCell>
                      <TableCell>
                        <Chip 
                          label={control.status}
                          color={control.status === 'Pass' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined">
                            View Details
                          </Button>
                          <Button size="small" variant="outlined" color="primary">
                            Log Check
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Control History Section */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Control History
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Control</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Comments</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>2024-02-20</TableCell>
                    <TableCell>Allelic Ladder</TableCell>
                    <TableCell>
                      <Chip label="Pass" color="success" size="small" />
                    </TableCell>
                    <TableCell>John Doe</TableCell>
                    <TableCell>All peaks within expected range</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2024-02-20</TableCell>
                    <TableCell>Positive Control</TableCell>
                    <TableCell>
                      <Chip label="Pass" color="success" size="small" />
                    </TableCell>
                    <TableCell>John Doe</TableCell>
                    <TableCell>Expected genotype confirmed</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
            Quality Management System
          </Typography>
          <Box>
            <IconButton title="Download Report">
              <Download />
            </IconButton>
            <IconButton title="Print Report">
              <Print />
            </IconButton>
          </Box>
        </Box>

        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Dashboard" />
          <Tab label="Equipment" />
          <Tab label="Standards" />
          <Tab label="Batch Controls" />
          <Tab label="Audit Trail" />
        </Tabs>

        {activeTab === 0 && renderDashboard()}
        {activeTab === 1 && renderEquipmentTab()}
        {activeTab === 2 && renderStandardsTab()}
        {activeTab === 3 && renderBatchControls()}
        {activeTab === 4 && renderAuditTrail()}
      </Paper>
    </Box>
  );
};

export default QualityControl; 