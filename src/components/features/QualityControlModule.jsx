import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Science,
  CheckCircle,
  Warning,
  Error,
  Add,
  Edit,
  Visibility,
  TrendingUp,
  Assessment,
  Calculate,
  VerifiedUser,
  Biotech,
  Rule,
  Speed,
  Upload,
  Download,
  Delete,
  Schedule,
  Flag
} from '@mui/icons-material';

export default function QualityControlModule() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [controlSamples, setControlSamples] = useState([]);
  const [proficiencyTests, setProficiencyTests] = useState([]);
  const [methodValidations, setMethodValidations] = useState([]);
  const [uncertaintyData, setUncertaintyData] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [stats, setStats] = useState(null);

  // Form states
  const [controlForm, setControlForm] = useState({
    control_id: '',
    control_type: 'positive',
    batch_number: '',
    expected_result: '',
    actual_result: '',
    pass_fail: 'pass',
    tested_by: '',
    test_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [proficiencyForm, setProficiencyForm] = useState({
    test_id: '',
    provider: '',
    test_name: '',
    test_date: new Date().toISOString().split('T')[0],
    submission_date: '',
    result_date: '',
    score: '',
    status: 'pending',
    certificate_number: '',
    notes: ''
  });

  const [validationForm, setValidationForm] = useState({
    method_name: '',
    validation_type: 'initial',
    parameters_tested: '',
    acceptance_criteria: '',
    results: '',
    conclusion: 'acceptable',
    validated_by: '',
    validation_date: new Date().toISOString().split('T')[0],
    next_review: '',
    documentation: ''
  });

  const [uncertaintyForm, setUncertaintyForm] = useState({
    parameter: '',
    method: '',
    uncertainty_type: 'measurement',
    value: '',
    unit: '%',
    confidence_level: '95',
    calculated_by: '',
    calculation_date: new Date().toISOString().split('T')[0],
    formula: '',
    components: ''
  });

  useEffect(() => {
    loadQCData();
  }, []);

  const loadQCData = async () => {
    setLoading(true);
    try {
      // Load all QC data
      const [controlsRes, proficiencyRes, validationsRes, uncertaintyRes, statsRes] = await Promise.all([
        fetch('/api/qc/control-samples'),
        fetch('/api/qc/proficiency-tests'),
        fetch('/api/qc/method-validations'),
        fetch('/api/qc/uncertainty'),
        fetch('/api/qc/stats')
      ]);

      // Use mock data for now
      setControlSamples(getMockControlSamples());
      setProficiencyTests(getMockProficiencyTests());
      setMethodValidations(getMockMethodValidations());
      setUncertaintyData(getMockUncertaintyData());
      setStats(getMockQCStats());
    } catch (error) {
      console.error('Error loading QC data:', error);
      // Use mock data as fallback
      setControlSamples(getMockControlSamples());
      setProficiencyTests(getMockProficiencyTests());
      setMethodValidations(getMockMethodValidations());
      setUncertaintyData(getMockUncertaintyData());
      setStats(getMockQCStats());
    } finally {
      setLoading(false);
    }
  };

  // Mock data functions
  const getMockControlSamples = () => [
    { id: 1, control_id: 'PC-001', control_type: 'positive', batch_number: 'LDS_234', expected_result: 'Detected', actual_result: 'Detected', pass_fail: 'pass', tested_by: 'John Doe', test_date: '2024-03-15', status: 'passed' },
    { id: 2, control_id: 'NC-001', control_type: 'negative', batch_number: 'LDS_234', expected_result: 'Not Detected', actual_result: 'Not Detected', pass_fail: 'pass', tested_by: 'John Doe', test_date: '2024-03-15', status: 'passed' },
    { id: 3, control_id: 'PC-002', control_type: 'positive', batch_number: 'LDS_235', expected_result: 'Detected', actual_result: 'Weak Signal', pass_fail: 'fail', tested_by: 'Jane Smith', test_date: '2024-03-16', status: 'failed', notes: 'Repeat required' },
    { id: 4, control_id: 'STD-001', control_type: 'standard', batch_number: 'ELEC_122', expected_result: '100bp ladder', actual_result: '100bp ladder', pass_fail: 'pass', tested_by: 'Lab Tech', test_date: '2024-03-16', status: 'passed' }
  ];

  const getMockProficiencyTests = () => [
    { id: 1, test_id: 'PT-2024-001', provider: 'CAP', test_name: 'Paternity Testing PT', test_date: '2024-01-15', submission_date: '2024-01-20', result_date: '2024-02-15', score: '100%', status: 'passed', certificate_number: 'CAP-2024-12345' },
    { id: 2, test_id: 'PT-2024-002', provider: 'AABB', test_name: 'Relationship Testing', test_date: '2024-02-10', submission_date: '2024-02-15', result_date: '2024-03-10', score: '98%', status: 'passed', certificate_number: 'AABB-2024-67890' },
    { id: 3, test_id: 'PT-2024-003', provider: 'CAP', test_name: 'STR Analysis PT', test_date: '2024-03-01', submission_date: '2024-03-05', result_date: '', score: '', status: 'pending', certificate_number: '' },
    { id: 4, test_id: 'PT-2023-004', provider: 'AABB', test_name: 'Paternity Testing PT', test_date: '2023-10-15', submission_date: '2023-10-20', result_date: '2023-11-15', score: '95%', status: 'passed', certificate_number: 'AABB-2023-54321' }
  ];

  const getMockMethodValidations = () => [
    { id: 1, method_name: 'STR Amplification', validation_type: 'initial', parameters_tested: 'Sensitivity, Specificity, Reproducibility', acceptance_criteria: '>95% concordance', results: '98.5% concordance achieved', conclusion: 'acceptable', validated_by: 'Dr. Smith', validation_date: '2024-01-10', next_review: '2025-01-10' },
    { id: 2, method_name: 'DNA Extraction', validation_type: 'revalidation', parameters_tested: 'Yield, Purity, Integrity', acceptance_criteria: 'A260/280: 1.8-2.0', results: 'A260/280: 1.85±0.05', conclusion: 'acceptable', validated_by: 'Dr. Johnson', validation_date: '2024-02-15', next_review: '2025-02-15' },
    { id: 3, method_name: 'Capillary Electrophoresis', validation_type: 'verification', parameters_tested: 'Resolution, Sizing Precision', acceptance_criteria: '±0.5bp precision', results: '±0.3bp achieved', conclusion: 'acceptable', validated_by: 'Lab Manager', validation_date: '2024-03-01', next_review: '2025-03-01' }
  ];

  const getMockUncertaintyData = () => [
    { id: 1, parameter: 'Allele Calling', method: 'STR Analysis', uncertainty_type: 'measurement', value: '0.3', unit: 'bp', confidence_level: '95', calculated_by: 'Dr. Smith', calculation_date: '2024-01-15', formula: 'u = √(Σui²)' },
    { id: 2, parameter: 'DNA Quantification', method: 'qPCR', uncertainty_type: 'measurement', value: '5.2', unit: '%', confidence_level: '95', calculated_by: 'Dr. Johnson', calculation_date: '2024-02-01', formula: 'Combined standard uncertainty' },
    { id: 3, parameter: 'Paternity Index', method: 'Statistical Analysis', uncertainty_type: 'calculation', value: '0.01', unit: '%', confidence_level: '99', calculated_by: 'Statistician', calculation_date: '2024-02-20', formula: 'Bayesian probability' },
    { id: 4, parameter: 'Fragment Sizing', method: 'CE', uncertainty_type: 'measurement', value: '0.5', unit: 'bp', confidence_level: '95', calculated_by: 'Lab Tech', calculation_date: '2024-03-05', formula: 'Standard deviation based' }
  ];

  const getMockQCStats = () => ({
    control_pass_rate: 95.8,
    proficiency_pass_rate: 100,
    validations_current: 12,
    validations_due: 2,
    uncertainty_reviewed: 8,
    uncertainty_pending: 1,
    recent_failures: 2,
    upcoming_pt: 3
  });

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);
    setDialogOpen(true);
    
    // Pre-fill form if editing
    if (item) {
      switch (type) {
        case 'control':
          setControlForm(item);
          break;
        case 'proficiency':
          setProficiencyForm(item);
          break;
        case 'validation':
          setValidationForm(item);
          break;
        case 'uncertainty':
          setUncertaintyForm(item);
          break;
      }
    }
  };

  const handleSave = async () => {
    try {
      // API call would go here
      });
      
      // Reload data
      await loadQCData();
      setDialogOpen(false);
      resetForms();
    } catch (error) {
      console.error('Error saving QC data:', error);
    }
  };

  const getFormData = () => {
    switch (dialogType) {
      case 'control': return controlForm;
      case 'proficiency': return proficiencyForm;
      case 'validation': return validationForm;
      case 'uncertainty': return uncertaintyForm;
      default: return {};
    }
  };

  const resetForms = () => {
    setControlForm({
      control_id: '',
      control_type: 'positive',
      batch_number: '',
      expected_result: '',
      actual_result: '',
      pass_fail: 'pass',
      tested_by: '',
      test_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    // Reset other forms similarly
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
      case 'acceptable':
        return 'success';
      case 'failed':
      case 'unacceptable':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e3a5f' }}>
          Quality Control Module
        </Typography>
        <Typography variant="body2" color="textSecondary">
          ISO 17025 compliance monitoring and quality assurance
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #10b981' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4">{stats.control_pass_rate}%</Typography>
                    <Typography variant="body2" color="textSecondary">Control Pass Rate</Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 40, color: '#10b981' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #3b82f6' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4">{stats.proficiency_pass_rate}%</Typography>
                    <Typography variant="body2" color="textSecondary">PT Pass Rate</Typography>
                  </Box>
                  <VerifiedUser sx={{ fontSize: 40, color: '#3b82f6' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #8b5cf6' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4">{stats.validations_current}</Typography>
                    <Typography variant="body2" color="textSecondary">Current Validations</Typography>
                  </Box>
                  <Rule sx={{ fontSize: 40, color: '#8b5cf6' }} />
                </Box>
                {stats.validations_due > 0 && (
                  <Chip label={`${stats.validations_due} due`} size="small" color="warning" sx={{ mt: 1 }} />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #f59e0b' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h4">{stats.recent_failures}</Typography>
                    <Typography variant="body2" color="textSecondary">Recent Failures</Typography>
                  </Box>
                  <Warning sx={{ fontSize: 40, color: '#f59e0b' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Control Samples" icon={<Science />} />
          <Tab label="Proficiency Tests" icon={<VerifiedUser />} />
          <Tab label="Method Validations" icon={<Rule />} />
          <Tab label="Measurement Uncertainty" icon={<Calculate />} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* Control Samples Tab */}
          {tabValue === 0 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Control Sample Tracking</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog('control')}
                  sx={{ bgcolor: '#1e3a5f' }}
                >
                  Add Control Result
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Control ID</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Batch</TableCell>
                      <TableCell>Expected</TableCell>
                      <TableCell>Actual</TableCell>
                      <TableCell>Result</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Tested By</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {controlSamples.map((control) => (
                      <TableRow key={control.id}>
                        <TableCell>{control.control_id}</TableCell>
                        <TableCell>
                          <Chip
                            label={control.control_type}
                            size="small"
                            color={control.control_type === 'positive' ? 'primary' : control.control_type === 'negative' ? 'default' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>{control.batch_number}</TableCell>
                        <TableCell>{control.expected_result}</TableCell>
                        <TableCell>{control.actual_result}</TableCell>
                        <TableCell>
                          <Chip
                            label={control.pass_fail}
                            size="small"
                            color={control.pass_fail === 'pass' ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{control.test_date}</TableCell>
                        <TableCell>{control.tested_by}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog('control', control)}>
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

          {/* Proficiency Tests Tab */}
          {tabValue === 1 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Proficiency Testing</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog('proficiency')}
                  sx={{ bgcolor: '#1e3a5f' }}
                >
                  Add PT Result
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Test ID</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Test Name</TableCell>
                      <TableCell>Test Date</TableCell>
                      <TableCell>Result Date</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Certificate</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {proficiencyTests.map((pt) => (
                      <TableRow key={pt.id}>
                        <TableCell>{pt.test_id}</TableCell>
                        <TableCell>{pt.provider}</TableCell>
                        <TableCell>{pt.test_name}</TableCell>
                        <TableCell>{pt.test_date}</TableCell>
                        <TableCell>{pt.result_date || '-'}</TableCell>
                        <TableCell>
                          {pt.score ? (
                            <Badge badgeContent={pt.score} color={pt.score.includes('100') ? 'success' : 'primary'}>
                              <Assessment />
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pt.status}
                            size="small"
                            color={getStatusColor(pt.status)}
                          />
                        </TableCell>
                        <TableCell>{pt.certificate_number || '-'}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog('proficiency', pt)}>
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

          {/* Method Validations Tab */}
          {tabValue === 2 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Method Validation Records</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog('validation')}
                  sx={{ bgcolor: '#1e3a5f' }}
                >
                  Add Validation
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Method</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Parameters</TableCell>
                      <TableCell>Criteria</TableCell>
                      <TableCell>Results</TableCell>
                      <TableCell>Conclusion</TableCell>
                      <TableCell>Validated By</TableCell>
                      <TableCell>Next Review</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {methodValidations.map((validation) => (
                      <TableRow key={validation.id}>
                        <TableCell>{validation.method_name}</TableCell>
                        <TableCell>
                          <Chip label={validation.validation_type} size="small" />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Tooltip title={validation.parameters_tested}>
                            <Typography variant="body2" noWrap>
                              {validation.parameters_tested}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{validation.acceptance_criteria}</TableCell>
                        <TableCell>{validation.results}</TableCell>
                        <TableCell>
                          <Chip
                            label={validation.conclusion}
                            size="small"
                            color={getStatusColor(validation.conclusion)}
                          />
                        </TableCell>
                        <TableCell>{validation.validated_by}</TableCell>
                        <TableCell>
                          {validation.next_review}
                          {new Date(validation.next_review) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                            <Chip label="Due Soon" size="small" color="warning" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog('validation', validation)}>
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

          {/* Measurement Uncertainty Tab */}
          {tabValue === 3 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Measurement Uncertainty Calculations</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog('uncertainty')}
                  sx={{ bgcolor: '#1e3a5f' }}
                >
                  Add Calculation
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Parameter</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Confidence Level</TableCell>
                      <TableCell>Calculated By</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Formula</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uncertaintyData.map((uncertainty) => (
                      <TableRow key={uncertainty.id}>
                        <TableCell>{uncertainty.parameter}</TableCell>
                        <TableCell>{uncertainty.method}</TableCell>
                        <TableCell>{uncertainty.uncertainty_type}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            ±{uncertainty.value} {uncertainty.unit}
                          </Typography>
                        </TableCell>
                        <TableCell>{uncertainty.confidence_level}%</TableCell>
                        <TableCell>{uncertainty.calculated_by}</TableCell>
                        <TableCell>{uncertainty.calculation_date}</TableCell>
                        <TableCell>
                          <Tooltip title={uncertainty.formula}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }} noWrap>
                              {uncertainty.formula}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenDialog('uncertainty', uncertainty)}>
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
        </Box>
      </Paper>

      {/* Dialog for Adding/Editing */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem ? 'Edit' : 'Add'} {dialogType === 'control' ? 'Control Sample' : dialogType === 'proficiency' ? 'Proficiency Test' : dialogType === 'validation' ? 'Method Validation' : 'Uncertainty Calculation'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'control' && (
            <>
              <TextField
                fullWidth
                label="Control ID"
                margin="normal"
                value={controlForm.control_id}
                onChange={(e) => setControlForm({ ...controlForm, control_id: e.target.value })}
              />
              <TextField
                fullWidth
                select
                label="Control Type"
                margin="normal"
                value={controlForm.control_type}
                onChange={(e) => setControlForm({ ...controlForm, control_type: e.target.value })}
              >
                <MenuItem value="positive">Positive Control</MenuItem>
                <MenuItem value="negative">Negative Control</MenuItem>
                <MenuItem value="standard">Standard/Ladder</MenuItem>
                <MenuItem value="blank">Blank</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="Batch Number"
                margin="normal"
                value={controlForm.batch_number}
                onChange={(e) => setControlForm({ ...controlForm, batch_number: e.target.value })}
              />
              <TextField
                fullWidth
                label="Expected Result"
                margin="normal"
                value={controlForm.expected_result}
                onChange={(e) => setControlForm({ ...controlForm, expected_result: e.target.value })}
              />
              <TextField
                fullWidth
                label="Actual Result"
                margin="normal"
                value={controlForm.actual_result}
                onChange={(e) => setControlForm({ ...controlForm, actual_result: e.target.value })}
              />
              <TextField
                fullWidth
                select
                label="Pass/Fail"
                margin="normal"
                value={controlForm.pass_fail}
                onChange={(e) => setControlForm({ ...controlForm, pass_fail: e.target.value })}
              >
                <MenuItem value="pass">Pass</MenuItem>
                <MenuItem value="fail">Fail</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="Tested By"
                margin="normal"
                value={controlForm.tested_by}
                onChange={(e) => setControlForm({ ...controlForm, tested_by: e.target.value })}
              />
              <TextField
                fullWidth
                type="date"
                label="Test Date"
                margin="normal"
                InputLabelProps={{ shrink: true }}
                value={controlForm.test_date}
                onChange={(e) => setControlForm({ ...controlForm, test_date: e.target.value })}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                margin="normal"
                value={controlForm.notes}
                onChange={(e) => setControlForm({ ...controlForm, notes: e.target.value })}
              />
            </>
          )}
          {/* Add similar form fields for other dialog types */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#1e3a5f' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quality Alerts */}
      {stats && stats.recent_failures > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="subtitle2">Quality Alert</Typography>
          <Typography variant="body2">
            {stats.recent_failures} control failures detected in the last 7 days. Review and implement corrective actions.
          </Typography>
        </Alert>
      )}

      {stats && stats.validations_due > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Validation Review Required</Typography>
          <Typography variant="body2">
            {stats.validations_due} method validations are due for review within the next 30 days.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}