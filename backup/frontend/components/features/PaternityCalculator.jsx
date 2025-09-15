import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  Grid,
  LinearProgress,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Calculate,
  Science,
  CheckCircle,
  Cancel,
  Warning,
  Download,
  Refresh,
  Info,
  Assessment,
  Gavel
} from '@mui/icons-material';
import { api } from '../../services/api';

const PaternityCalculator = () => {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [profiles, setProfiles] = useState(null);
  const [calculationResult, setCalculationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await api.get('/api/test-cases');
      setCases(response.data || []);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    }
  };

  const fetchProfiles = async (caseId) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/paternity/case/${caseId}/profiles`);
      setProfiles(response.data);
    } catch (err) {
      setError('Failed to fetch genetic profiles for this case');
      setProfiles(null);
    } finally {
      setLoading(false);
    }
  };

  const calculatePaternity = async () => {
    if (!profiles) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/api/paternity/calculate', {
        caseId: selectedCase,
        profiles: profiles.profiles,
        caseInfo: {
          caseNumber: profiles.caseNumber,
          childName: profiles.participants.child,
          motherName: profiles.participants.mother,
          allegedFatherName: profiles.participants.allegedFather
        }
      });
      setCalculationResult(response.data);
    } catch (err) {
      setError('Failed to calculate paternity probability');
    } finally {
      setLoading(false);
    }
  };

  const simulatePaternity = async (isPaternity) => {
    if (!selectedCase) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.post(`/api/paternity/simulate/${selectedCase}`, {
        isPaternity
      });
      setCalculationResult(response.data);
    } catch (err) {
      setError('Failed to simulate paternity test');
    } finally {
      setLoading(false);
    }
  };

  const getConclusi

Color = (conclusion) => {
    switch (conclusion) {
      case 'NOT EXCLUDED':
        return 'success';
      case 'EXCLUDED':
        return 'error';
      case 'INCONCLUSIVE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatProbability = (value) => {
    if (value > 0.9999) return '>99.99%';
    if (value < 0.0001) return '<0.01%';
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
          <Science sx={{ mr: 1, verticalAlign: 'middle' }} />
          Paternity Probability Calculator
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          DNA paternity testing using STR analysis and statistical calculations
        </Typography>
      </Paper>

      {/* Case Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select Case for Analysis
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Case</InputLabel>
                <Select
                  value={selectedCase}
                  onChange={(e) => {
                    setSelectedCase(e.target.value);
                    setCalculationResult(null);
                    fetchProfiles(e.target.value);
                  }}
                  label="Select Case"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {cases.map((caseItem) => (
                    <MenuItem key={caseItem.id} value={caseItem.id}>
                      {caseItem.case_number} - {caseItem.test_purpose}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<Calculate />}
                  onClick={calculatePaternity}
                  disabled={!profiles || loading}
                >
                  Calculate Paternity
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => simulatePaternity(true)}
                  disabled={!selectedCase || loading}
                >
                  Simulate Match
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => simulatePaternity(false)}
                  disabled={!selectedCase || loading}
                >
                  Simulate Exclusion
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Profiles Display */}
      {profiles && !calculationResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Case Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">Case Number</Typography>
                <Typography variant="body1">{profiles.caseNumber}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">Loci Analyzed</Typography>
                <Typography variant="body1">{profiles.locusCount}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">Participants</Typography>
                <Stack direction="row" spacing={1}>
                  {profiles.participants.child && <Chip label="Child" size="small" />}
                  {profiles.participants.mother && <Chip label="Mother" size="small" />}
                  {profiles.participants.allegedFather && <Chip label="Alleged Father" size="small" />}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Calculation Results */}
      {calculationResult && (
        <>
          {/* Summary Card */}
          <Card sx={{ mb: 3, border: 2, borderColor: getColor(calculationResult.results.conclusion) }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <Gavel sx={{ mr: 1, verticalAlign: 'middle' }} />
                Paternity Test Results
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Conclusion
                    </Typography>
                    <Chip
                      label={calculationResult.results.conclusion}
                      color={getConclusionColor(calculationResult.results.conclusion)}
                      sx={{ mt: 1, fontWeight: 'bold' }}
                    />
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Probability of Paternity
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                      {calculationResult.results.probabilityPercentage}%
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Combined Paternity Index
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                      {parseFloat(calculationResult.results.cpi).toExponential(2)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Interpretation:</strong> {calculationResult.results.likelihood}
                </Typography>
              </Alert>
            </CardContent>
          </Card>

          {/* Locus Details Table */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                STR Locus Analysis
              </Typography>
              
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Locus</TableCell>
                      <TableCell>Child</TableCell>
                      <TableCell>Mother</TableCell>
                      <TableCell>Alleged Father</TableCell>
                      <TableCell align="right">Paternity Index</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {calculationResult.results.locusResults.map((locus) => (
                      <TableRow key={locus.locus}>
                        <TableCell sx={{ fontWeight: 'bold' }}>{locus.locus}</TableCell>
                        <TableCell>{locus.childGenotype}</TableCell>
                        <TableCell>{locus.motherGenotype}</TableCell>
                        <TableCell>{locus.fatherGenotype}</TableCell>
                        <TableCell align="right">
                          {locus.pi === 0 ? (
                            <Chip label="0" size="small" color="error" />
                          ) : (
                            locus.pi.toFixed(3)
                          )}
                        </TableCell>
                        <TableCell>
                          {locus.scenario === 'exclusion' && (
                            <Cancel color="error" fontSize="small" />
                          )}
                          {locus.scenario === 'mutation' && (
                            <Warning color="warning" fontSize="small" />
                          )}
                          {locus.scenario.includes('match') && (
                            <CheckCircle color="success" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Exclusions and Mutations */}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                {calculationResult.results.exclusions.length > 0 && (
                  <Alert severity="error">
                    <strong>Exclusions:</strong> {calculationResult.results.exclusions.join(', ')}
                  </Alert>
                )}
                {calculationResult.results.mutations.length > 0 && (
                  <Alert severity="warning">
                    <strong>Possible Mutations:</strong> {calculationResult.results.mutations.join(', ')}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Statistical Power */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistical Power
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="textSecondary">
                    Combined Exclusion Power
                  </Typography>
                  <Typography variant="h6">
                    {calculationResult.results.statisticalPower?.combinedExclusionPower || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="textSecondary">
                    Random Match Probability
                  </Typography>
                  <Typography variant="h6">
                    {calculationResult.results.statisticalPower?.randomMatchProbability || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    fullWidth
                    onClick={() => {
                      // Download report functionality
                      const report = JSON.stringify(calculationResult.report, null, 2);
                      const blob = new Blob([report], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `paternity-report-${calculationResult.report.header.caseNumber}.json`;
                      a.click();
                    }}
                  >
                    Download Report
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default PaternityCalculator;