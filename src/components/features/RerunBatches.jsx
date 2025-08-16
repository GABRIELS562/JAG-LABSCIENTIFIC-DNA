import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Stack
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  Science,
  Assignment,
  Person,
  Replay
} from '@mui/icons-material';

const RerunBatches = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchRerunBatches();
    checkForNewBatch();
  }, []);

  const checkForNewBatch = () => {
    // Check if there's a newly created batch from Reruns page
    const newBatchData = sessionStorage.getItem('newlyCreatedRerunBatch');
    if (newBatchData) {
      try {
        const batchData = JSON.parse(newBatchData);
        
        // Format the batch data to match expected structure
        const formattedBatchData = {
          ...batchData,
          plate_layout: batchData.wells,
          batch_number: batchData.batchNumber,
          sample_count: batchData.sampleCount,
          date_created: batchData.created_at
        };
        
        // Auto-open the newly created batch
        setSelectedBatch(formattedBatchData);
        setBatchDetails(formattedBatchData);
        setDialogOpen(true);
        
        // Clear the session storage after processing
        sessionStorage.removeItem('newlyCreatedRerunBatch');
        
        // Refresh the batches list to include the new batch
        fetchRerunBatches();
      } catch (error) {
        }
    }
  };

  const fetchRerunBatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/batches`);
      const data = await response.json();
      
      if (data.success) {
        // Filter for rerun batches only (by batch number containing _RR or batch_type)
        const rerunBatches = (data.data || []).filter(batch => 
          batch.batch_number?.includes('_RR') || batch.batch_type === 'rerun'
        );
        setBatches(rerunBatches);
      }
    } catch (error) {
      console.error('❌ Error fetching rerun batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBatch = async (batch) => {
    setSelectedBatch(batch);
    setBatchDetails(batch);
    setDialogOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'active': return 'primary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const renderPlateLayout = () => {
    if (!batchDetails?.plate_layout || detailsLoading) {
      return (
        <Box display="flex" justifyContent="center" p={3}>
          {detailsLoading ? <CircularProgress /> : <Typography>No plate layout available</Typography>}
        </Box>
      );
    }

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    
    );
    :', rows.slice(0,2).flatMap(row => cols.slice(0,3).map(col => `${row}${col}`)));

    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: '800px', p: 2 }}>
          {/* Column headers */}
          <Grid container spacing={0.5} sx={{ mb: 1 }}>
            <Grid item xs={1}></Grid>
            {cols.map(col => (
              <Grid item xs={0.8} key={col}>
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    fontSize: '12px',
                    p: 0.5
                  }}
                >
                  {col}
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Plate rows */}
          {rows.map(row => (
            <Grid container spacing={0.5} key={row} sx={{ mb: 0.5 }}>
              {/* Row header */}
              <Grid item xs={1}>
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    fontSize: '12px',
                    p: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {row}
                </Box>
              </Grid>

              {/* Wells */}
              {cols.map(col => {
                const wellIdPadded = `${row}${col}`; // A01, A02, etc.
                const wellIdSimple = `${row}${parseInt(col)}`; // A1, A2, etc. - This is what the API uses
                const well = batchDetails.plate_layout[wellIdSimple] || batchDetails.plate_layout[wellIdPadded];
                const hasContent = well && ((well.samples && well.samples.length > 0) || well.type !== 'empty');
                
                let bgColor = '#f5f5f5';
                let textColor = '#666';
                let content = '';
                let tooltipTitle = '';

                if (hasContent) {
                  const sample = well.samples?.[0];
                  switch (well.type) {
                    case 'sample':
                      bgColor = '#fff3e0'; // Light orange for rerun samples
                      textColor = '#000';
                      content = sample?.lab_number || 'Sample';
                      tooltipTitle = sample ? `${sample.lab_number}\\n${sample.name || 'Unknown'} (RERUN)` : 'Sample (RERUN)';
                      break;
                    case 'control':
                      // Check control type based on lab_number
                      if (sample?.lab_number === 'NEG_CTRL') {
                        bgColor = '#ffcdd2'; // Light red for negative control
                        textColor = '#000';
                        content = 'NEG';
                        tooltipTitle = 'Negative Control';
                      } else if (sample?.lab_number === 'POS_CTRL') {
                        bgColor = '#c8e6c9'; // Light green for positive control
                        textColor = '#000';
                        content = 'POS';
                        tooltipTitle = 'Positive Control';
                      } else if (sample?.lab_number === 'ALLELIC_LADDER') {
                        bgColor = '#e1bee7'; // Light purple for allelic ladder
                        textColor = '#000';
                        content = 'LADDER';
                        tooltipTitle = 'Allelic Ladder';
                      } else {
                        bgColor = '#81c784';
                        textColor = '#000';
                        content = sample?.lab_number || 'Control';
                        tooltipTitle = sample ? `${sample.lab_number}\\n${sample.name || 'Control'}` : 'Control';
                      }
                      break;
                    default:
                      bgColor = '#e0e0e0';
                      content = well.label || 'Empty';
                      tooltipTitle = 'Empty Well';
                  }
                }

                return (
                  <Grid item xs={0.8} key={wellIdPadded}>
                    <Tooltip title={tooltipTitle} arrow>
                      <Box
                        sx={{
                          width: '100%',
                          height: '40px',
                          backgroundColor: bgColor,
                          color: textColor,
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: hasContent ? 'bold' : 'normal',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: hasContent ? 'pointer' : 'default',
                          '&:hover': hasContent ? {
                            opacity: 0.8,
                            transform: 'scale(1.05)'
                          } : {}
                        }}
                      >
                        {content}
                      </Box>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Box>
      </Box>
    );
  };

  const renderBatchSummary = () => {
    if (!batchDetails) return null;

    const plateLayout = batchDetails.plate_layout || {};
    const sampleWells = Object.values(plateLayout).filter(well => well.type === 'sample');
    const controlWells = Object.values(plateLayout).filter(well => 
      well.type === 'control' || ['Allelic Ladder', 'Positive Control', 'Negative Control'].includes(well.type)
    );

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Batch Information
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Batch Number:</Typography>
                <Typography variant="body2" fontWeight="medium">{batchDetails.batch_number}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Analyst:</Typography>
                <Typography variant="body2" fontWeight="medium">{batchDetails.operator || 'N/A'}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Batch Type:</Typography>
                <Chip label="RERUN" color="warning" size="small" />
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Date Created:</Typography>
                <Typography variant="body2" fontWeight="medium">{formatDate(batchDetails.created_at || batchDetails.created_date)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Status:</Typography>
                <Chip 
                  label={batchDetails.status || 'Unknown'} 
                  color={getStatusColor(batchDetails.status)}
                  size="small"
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Sample Statistics
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Rerun Samples:</Typography>
                <Typography variant="body2" fontWeight="medium">{sampleWells.length}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Controls:</Typography>
                <Typography variant="body2" fontWeight="medium">{controlWells.length}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Total Wells Used:</Typography>
                <Typography variant="body2" fontWeight="medium">{sampleWells.length + controlWells.length}/96</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading rerun batches...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Replay sx={{ color: '#ef5350', mr: 1, fontSize: 32 }} />
        <Typography variant="h4" sx={{ color: '#ef5350', fontWeight: 'bold' }}>
          LDS Rerun Batches
        </Typography>
      </Box>

      {batches.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Replay sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Rerun Batches Found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Completed rerun batches will appear here once they are finalized.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {batches.map((batch) => (
            <Grid item xs={12} sm={6} md={4} key={batch.id || batch.batch_number}>
              <Card 
                sx={{ 
                  height: '100%', 
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Replay sx={{ color: '#ef5350', mr: 1 }} />
                    <Typography variant="h6" component="h2" sx={{ color: '#ef5350' }}>
                      {batch.batch_number}
                    </Typography>
                    <Chip 
                      label="RERUN" 
                      size="small" 
                      color="warning" 
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Person sx={{ fontSize: 16, color: '#666' }} />
                        <Typography variant="body2" color="textSecondary">
                          Analyst: {batch.operator || 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Assignment sx={{ fontSize: 16, color: '#666' }} />
                        <Typography variant="body2" color="textSecondary">
                          Rerun Samples: {batch.total_samples || 0}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Created: {formatDate(batch.created_at || batch.created_date)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Chip 
                        label={batch.status || 'Unknown'} 
                        color={getStatusColor(batch.status)}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => handleViewBatch(batch)}
                    sx={{ 
                      borderColor: '#ef5350',
                      color: '#ef5350',
                      '&:hover': {
                        borderColor: '#d32f2f',
                        backgroundColor: 'rgba(239, 83, 80, 0.04)'
                      }
                    }}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Batch Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Replay sx={{ color: '#ef5350' }} />
            <Typography variant="h6">
              Rerun Batch Details: {selectedBatch?.batch_number}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {renderBatchSummary()}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            96-Well Plate Layout
          </Typography>
          
          {renderPlateLayout()}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RerunBatches;