import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Upload as UploadIcon,
  CheckCircle,
  Error as ErrorIcon,
  Science,
  Assessment,
  Description
} from '@mui/icons-material';

const API_BASE_URL = '';

export default function GeneMapperImport() {
  const [activeStep, setActiveStep] = useState(0);
  const [fileContent, setFileContent] = useState('');
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCase, setSelectedCase] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [reportDialog, setReportDialog] = useState(false);

  const steps = [
    'Select Batch/Case',
    'Import GeneMapper Data',
    'Run Paternity Analysis',
    'Generate Report'
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleTextPaste = (event) => {
    setFileContent(event.target.value);
  };

  const handleImport = async () => {
    if (!fileContent) {
      setError('Please provide GeneMapper data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/import-genemapper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent,
          batchId: batchId || null
        })
      });

      const result = await response.json();

      if (result.success) {
        setImportResult(result);
        setActiveStep(2);
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import GeneMapper data');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysis = async () => {
    if (!selectedCase) {
      setError('Please select a case number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/paternity/${selectedCase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result.data);
        setActiveStep(3);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to run paternity analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedCase) {
      setError('Please select a case number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/generate/${selectedCase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setReportDialog(true);
        // Could also trigger download here
        if (result.data.downloadUrl) {
          window.open(result.data.downloadUrl, '_blank');
        }
      } else {
        setError(result.error || 'Report generation failed');
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Batch ID (Optional)"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g., PCR_BATCH_001"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Case Number"
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
              placeholder="e.g., BN-0001"
              required
            />
            <Button
              variant="contained"
              onClick={() => setActiveStep(1)}
              sx={{ mt: 2 }}
              disabled={!selectedCase}
            >
              Next
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload a GeneMapper ID export file (tab-delimited text) or paste the data directly
            </Alert>
            
            <Box sx={{ mb: 2 }}>
              <input
                type="file"
                accept=".txt,.tsv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  fullWidth
                >
                  Upload GeneMapper File
                </Button>
              </label>
            </Box>

            <Typography variant="body2" sx={{ textAlign: 'center', my: 1 }}>
              OR
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={10}
              placeholder="Paste GeneMapper data here..."
              value={fileContent}
              onChange={handleTextPaste}
              sx={{ fontFamily: 'monospace' }}
            />

            {fileContent && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Data loaded: {fileContent.split('\n').length} lines
              </Alert>
            )}

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button onClick={() => setActiveStep(0)}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={!fileContent || loading}
                startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
              >
                Import Data
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            {importResult && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully imported {importResult.data.samplesProcessed} samples
              </Alert>
            )}

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analysis Parameters
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Case Number"
                      secondary={selectedCase}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Samples Imported"
                      secondary={importResult?.data?.samplesProcessed || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Analysis Type"
                      secondary="Paternity Testing (STR Analysis)"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Button
              variant="contained"
              color="primary"
              onClick={handleAnalysis}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Science />}
              fullWidth
            >
              Run Paternity Analysis
            </Button>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            {analysisResult && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Analysis Results
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h4" color="primary">
                      {analysisResult.probability?.toFixed(2)}%
                    </Typography>
                    <Typography variant="body1">
                      Probability of Paternity
                    </Typography>
                  </Box>
                  <Chip 
                    label={analysisResult.conclusion}
                    color={analysisResult.conclusion === 'EXCLUDED' ? 'error' : 'success'}
                    icon={analysisResult.conclusion === 'EXCLUDED' ? <ErrorIcon /> : <CheckCircle />}
                  />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Combined Paternity Index: {analysisResult.CPI?.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    Exclusions: {analysisResult.exclusions}
                  </Typography>
                </CardContent>
              </Card>
            )}

            <Button
              variant="contained"
              color="success"
              onClick={handleGenerateReport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Description />}
              fullWidth
            >
              Generate Report
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        GeneMapper Data Import & Analysis
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: activeStep >= index ? 'primary.main' : 'grey.300',
                      color: 'white'
                    }}
                  >
                    {activeStep > index ? <CheckCircle /> : index + 1}
                  </Box>
                )}
              >
                {label}
              </StepLabel>
              <StepContent>
                {getStepContent(index)}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Report Generation Success Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Report Generated Successfully
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            The paternity test report has been generated successfully for case {selectedCase}.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            The report includes:
          </Typography>
          <List dense>
            <ListItem>• STR analysis results</ListItem>
            <ListItem>• Paternity probability calculations</ListItem>
            <ListItem>• Loci comparison table</ListItem>
            <ListItem>• Statistical analysis</ListItem>
            <ListItem>• Professional conclusions</ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setReportDialog(false);
              setActiveStep(0);
              setFileContent('');
              setImportResult(null);
              setAnalysisResult(null);
            }}
          >
            Start New Analysis
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}