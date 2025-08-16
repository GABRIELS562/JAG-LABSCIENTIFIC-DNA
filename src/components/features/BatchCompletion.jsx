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
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Science,
  FlashOn
} from '@mui/icons-material';

const API_BASE_URL = '';

export default function BatchCompletion() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [completionDialog, setCompletionDialog] = useState(false);
  const [completionStatus, setCompletionStatus] = useState('completed');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadActiveBatches();
  }, []);

  const loadActiveBatches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/batches/active`);
      if (response.ok) {
        const data = await response.json();
        setBatches(data.data || []);
      }
    } catch (error) {
      console.error('Error loading batches:', error);
      setMessage({ type: 'error', text: 'Failed to load batches' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteBatch = (batch) => {
    setSelectedBatch(batch);
    setCompletionDialog(true);
    setCompletionStatus('completed');
  };

  const confirmCompletion = async () => {
    if (!selectedBatch) return;

    try {
      // Determine batch type from batch number prefix
      const batchType = selectedBatch.batch_number.startsWith('PCR') ? 'pcr' : 
                       selectedBatch.batch_number.startsWith('ELEC') ? 'electrophoresis' : 
                       'analysis';

      const response = await fetch(`${API_BASE_URL}/api/batches/${selectedBatch.batch_number}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchType,
          completionStatus
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Batch ${selectedBatch.batch_number} completed. ${result.updatedSamples} samples progressed to ${result.newStatus}` 
        });
        setCompletionDialog(false);
        loadActiveBatches(); // Reload batches
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to complete batch' });
      }
    } catch (error) {
      console.error('Error completing batch:', error);
      setMessage({ type: 'error', text: 'Failed to complete batch' });
    }
  };

  const getBatchIcon = (batchNumber) => {
    if (batchNumber.startsWith('PCR')) return <Science color="primary" />;
    if (batchNumber.startsWith('ELEC')) return <FlashOn color="secondary" />;
    return <Science />;
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      'active': { color: 'primary', icon: <Warning /> },
      'completed': { color: 'success', icon: <CheckCircle /> },
      'failed': { color: 'error', icon: <ErrorIcon /> }
    };

    const config = statusConfig[status] || statusConfig['active'];
    
    return (
      <Chip 
        label={status} 
        color={config.color} 
        size="small" 
        icon={config.icon}
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Batch Completion
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Active Batches
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : batches.length === 0 ? (
            <Alert severity="info">No active batches found</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Batch Number</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Total Samples</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Operator</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getBatchIcon(batch.batch_number)}
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {batch.batch_number}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {batch.batch_number.startsWith('PCR') ? 'PCR' : 
                         batch.batch_number.startsWith('ELEC') ? 'Electrophoresis' : 
                         'Analysis'}
                      </TableCell>
                      <TableCell>{batch.total_samples}</TableCell>
                      <TableCell>{getStatusChip(batch.status)}</TableCell>
                      <TableCell>
                        {new Date(batch.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{batch.operator}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => handleCompleteBatch(batch)}
                          disabled={batch.status === 'completed'}
                        >
                          Complete Batch
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Completion Dialog */}
      <Dialog open={completionDialog} onClose={() => setCompletionDialog(false)}>
        <DialogTitle>Complete Batch</DialogTitle>
        <DialogContent>
          {selectedBatch && (
            <Box sx={{ minWidth: 400, pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Completing batch <strong>{selectedBatch.batch_number}</strong> with {selectedBatch.total_samples} samples
              </Alert>
              
              <FormControl fullWidth>
                <InputLabel>Completion Status</InputLabel>
                <Select
                  value={completionStatus}
                  onChange={(e) => setCompletionStatus(e.target.value)}
                  label="Completion Status"
                >
                  <MenuItem value="completed">Successfully Completed</MenuItem>
                  <MenuItem value="failed">Failed - Requires Rerun</MenuItem>
                  <MenuItem value="partial">Partially Completed</MenuItem>
                </Select>
              </FormControl>

              <Alert severity="warning" sx={{ mt: 2 }}>
                This will update all samples in the batch and progress them to the next workflow stage.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompletionDialog(false)}>Cancel</Button>
          <Button 
            onClick={confirmCompletion} 
            variant="contained" 
            color="primary"
          >
            Confirm Completion
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}