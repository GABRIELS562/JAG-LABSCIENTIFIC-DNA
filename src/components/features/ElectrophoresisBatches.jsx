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
  ElectricBolt
} from '@mui/icons-material';

const ElectrophoresisBatches = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchElectrophoresisBatches();
  }, []);

  const fetchElectrophoresisBatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/batches`);
      const data = await response.json();
      
      if (data.success) {
        // Filter for electrophoresis batches only (by batch number starting with ELEC_)
        const electroBatches = (data.data || []).filter(batch => 
          batch.batch_number?.startsWith('ELEC_')
        );
        setBatches(electroBatches);
      }
    } catch (error) {
      // Handle error silently - UI already shows loading state
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
                const wellId = `${row}${col}`;
                const well = batchDetails.plate_layout[wellId];
                const hasContent = well && ((well.samples && well.samples.length > 0) || well.type !== 'empty');
                
                let bgColor = '#f5f5f5';
                let textColor = '#666';
                let content = '';
                let tooltipTitle = '';

                if (hasContent) {
                  switch (well.type) {
                    case 'sample':
                      bgColor = '#ffb74d';
                      textColor = '#000';
                      content = well.label || (well.samples?.[0]?.lab_number) || 'Sample';
                      tooltipTitle = well.samples?.[0] ? 
                        `${well.samples[0].lab_number}\n${well.samples[0].name || 'Sample'}` : 
                        'Sample';
                      break;
                    case 'Allelic Ladder':
                      bgColor = '#90caf9';
                      textColor = '#000';
                      content = 'AL';
                      tooltipTitle = 'Allelic Ladder';
                      break;
                    case 'Positive Control':
                      bgColor = '#81c784';
                      textColor = '#000';
                      content = 'PC';
                      tooltipTitle = 'Positive Control';
                      break;
                    case 'Negative Control':
                      bgColor = '#ef5350';
                      textColor = '#fff';
                      content = 'NC';
                      tooltipTitle = 'Negative Control';
                      break;
                    default:
                      bgColor = '#e0e0e0';
                      content = well.label || 'Empty';
                      tooltipTitle = 'Empty Well';
                  }
                }

                return (
                  <Grid item xs={0.8} key={wellId}>
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
      ['Allelic Ladder', 'Positive Control', 'Negative Control'].includes(well.type)
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
                <Typography variant="body2" color="textSecondary">Operator:</Typography>
                <Typography variant="body2" fontWeight="medium">{batchDetails.operator || 'N/A'}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Source PCR Batch:</Typography>
                <Typography variant="body2" fontWeight="medium">{batchDetails.source_pcr_batch || 'N/A'}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">Date Created:</Typography>
                <Typography variant="body2" fontWeight="medium">{formatDate(batchDetails.created_date)}</Typography>
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
                <Typography variant="body2" color="textSecondary">Total Samples:</Typography>
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
        <Typography sx={{ ml: 2 }}>Loading electrophoresis batches...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ElectricBolt sx={{ color: '#1e4976', mr: 1, fontSize: 32 }} />
        <Typography variant="h4" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
          LDS Electrophoresis Batches
        </Typography>
      </Box>

      {batches.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ElectricBolt sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Electrophoresis Batches Found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Complete electrophoresis batches will appear here once they are finalized.
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
                    <ElectricBolt sx={{ color: '#1e4976', mr: 1 }} />
                    <Typography variant="h6" component="h2" sx={{ color: '#1e4976' }}>
                      {batch.batch_number}
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Person sx={{ fontSize: 16, color: '#666' }} />
                        <Typography variant="body2" color="textSecondary">
                          Operator: {batch.operator || 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Science sx={{ fontSize: 16, color: '#666' }} />
                        <Typography variant="body2" color="textSecondary">
                          Source: {batch.source_pcr_batch || 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Assignment sx={{ fontSize: 16, color: '#666' }} />
                        <Typography variant="body2" color="textSecondary">
                          Samples: {batch.total_samples || 0}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Created: {formatDate(batch.created_date)}
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
                      borderColor: '#1e4976',
                      color: '#1e4976',
                      '&:hover': {
                        borderColor: '#2c5a8e',
                        backgroundColor: 'rgba(30, 73, 118, 0.04)'
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
            <ElectricBolt sx={{ color: '#1e4976' }} />
            <Typography variant="h6">
              Electrophoresis Batch Details: {selectedBatch?.batch_number}
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

export default ElectrophoresisBatches;