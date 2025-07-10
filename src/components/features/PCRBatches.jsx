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
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  Visibility,
  Science,
  Assignment,
  Person
} from '@mui/icons-material';

const PCRBatches = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [wellAssignments, setWellAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchBatches();
    checkForNewBatch();
  }, []);

  const checkForNewBatch = () => {
    // Check if there's a newly created batch from PCR plate
    const newBatchData = sessionStorage.getItem('newlyCreatedBatch');
    if (newBatchData) {
      try {
        const batchData = JSON.parse(newBatchData);
        
        // Format the batch data to match expected structure
        const formattedBatchData = {
          ...batchData,
          plate_layout: batchData.wells, // PCR batches expects plate_layout
          batch_number: batchData.batchNumber,
          sample_count: batchData.sampleCount,
          date_created: batchData.created_at
        };
        
        // Auto-open the newly created batch
        setSelectedBatch(formattedBatchData);
        setBatchDetails(formattedBatchData);
        setDialogOpen(true);
        
        // Convert wells data to well assignments format for display
        const wellAssignmentsData = Object.entries(batchData.wells || {}).map(([wellId, wellData]) => ({
          well_position: wellId,
          sample_id: wellData.sample_id,
          sample_name: wellData.sampleName || wellData.label,
          comment: wellData.comment,
          type: wellData.type,
          well_type: wellData.type === 'control' ? 'Control' : 'Sample',
          samples: wellData.samples || [],
          sample_name_full: wellData.samples?.[0]?.name || '',
          surname: wellData.samples?.[0]?.surname || '',
          kit_number: wellData.kit_number || ''
        }));
        setWellAssignments(wellAssignmentsData);
        
        // Clear the session storage after processing
        sessionStorage.removeItem('newlyCreatedBatch');
        
        // Refresh the batches list to include the new batch
        fetchBatches();
      } catch (error) {
        console.warn('Failed to process newly created batch:', error);
      }
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/batches`);
      const data = await response.json();
      
      if (data.success) {
        setBatches(data.data || []);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetails = async (batchId) => {
    try {
      setDetailsLoading(true);
      
      // Fetch well assignments for the batch
      const response = await fetch(`${API_URL}/api/well-assignments/${batchId}`);
      const data = await response.json();
      
      if (data.success) {
        setWellAssignments(data.data || []);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewBatch = async (batch) => {
    setSelectedBatch(batch);
    setBatchDetails(batch);
    setDialogOpen(true);
    await fetchBatchDetails(batch.id);
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

  // Calculate counts from plate layout
  const calculateCounts = (plateLayout) => {
    if (!plateLayout) return { samples: 0, controls: 0, allelicLadder: 0 };
    
    let samples = 0;
    let controls = 0;
    let allelicLadder = 0;
    
    Object.values(plateLayout).forEach(well => {
      if (well && well.samples && well.samples.length > 0) {
        const sample = well.samples[0];
        switch (well.type) {
          case 'sample':
            samples++;
            break;
          case 'control':
            if (sample?.lab_number === 'ALLELIC_LADDER') {
              allelicLadder++;
            } else {
              controls++;
            }
            break;
        }
      }
    });
    
    return { samples, controls, allelicLadder };
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
                const hasContent = well && well.samples && well.samples.length > 0;
                
                let bgColor = '#f5f5f5';
                let textColor = '#666';
                let content = '';
                let tooltipTitle = '';

                if (hasContent) {
                  const sample = well.samples[0];
                  switch (well.type) {
                    case 'sample':
                      bgColor = '#ffb74d';
                      textColor = '#000';
                      content = sample?.lab_number || 'Sample';
                      tooltipTitle = sample ? `${sample.lab_number}\n${sample.name || 'Unknown'}` : 'Sample';
                      break;
                    case 'control':
                      bgColor = '#81c784';
                      textColor = '#000';
                      content = sample?.lab_number || 'Control';
                      tooltipTitle = sample ? `${sample.lab_number}\n${sample.name || 'Control'}` : 'Control';
                      break;
                    default:
                      bgColor = '#e0e0e0';
                      content = 'Blank';
                      tooltipTitle = 'Empty Well';
                  }
                } else {
                  tooltipTitle = 'Empty Well';
                }

                return (
                  <Grid item xs={0.8} key={wellId}>
                    <Tooltip title={tooltipTitle} arrow placement="top">
                      <Box
                        sx={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: bgColor,
                          border: '1px solid #ccc',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          color: textColor,
                          textAlign: 'center',
                          overflow: 'hidden',
                          p: 1,
                          cursor: hasContent ? 'pointer' : 'default'
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

  const renderSamplesList = () => {
    if (!wellAssignments.length) {
      return <Typography>No samples found in this batch</Typography>;
    }

    const samples = wellAssignments.filter(wa => wa.well_type === 'Sample');

    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Well Position</TableCell>
              <TableCell>Lab Number</TableCell>
              <TableCell>Sample Name</TableCell>
              <TableCell>Kit Number</TableCell>
              <TableCell>Comments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {samples.map((sample, index) => (
              <TableRow key={index}>
                <TableCell>{sample.well_position}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {sample.sample_name || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {sample.sample_name_full ? 
                    `${sample.sample_name_full} ${sample.surname || ''}` : 
                    'N/A'
                  }
                </TableCell>
                <TableCell>{sample.kit_number || 'N/A'}</TableCell>
                <TableCell>{sample.comment || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        LDS PCR Batches
      </Typography>

      {batches.length === 0 ? (
        <Alert severity="info">
          No PCR batches found. Create batches using the PCR Plate page.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {batches.map((batch) => (
            <Grid item xs={12} md={6} lg={4} key={batch.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  '&:hover': { 
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      {batch.batch_number}
                    </Typography>
                    <Chip 
                      label={batch.status || 'active'} 
                      color={getStatusColor(batch.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <Person sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      Operator: {batch.operator || 'N/A'}
                    </Typography>
                    
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <Science sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      Samples: {batch.total_samples || 0}
                    </Typography>
                    
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <Assignment sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      Created: {formatDate(batch.created_at)}
                    </Typography>
                  </Box>

                  {batch.pcr_date && (
                    <Typography variant="body2" color="textSecondary">
                      PCR Date: {formatDate(batch.pcr_date)}
                    </Typography>
                  )}
                  
                  {batch.electro_date && (
                    <Typography variant="body2" color="textSecondary">
                      Electro Date: {formatDate(batch.electro_date)}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<Visibility />}
                    onClick={() => handleViewBatch(batch)}
                    variant="outlined"
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
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Batch Details: {selectedBatch?.batch_number}
            </Typography>
            <Chip 
              label={selectedBatch?.status || 'active'} 
              color={getStatusColor(selectedBatch?.status)}
            />
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Operator:</strong> {batchDetails?.operator || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Created:</strong> {formatDate(batchDetails?.created_at)}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Total Samples:</strong> {calculateCounts(batchDetails?.plate_layout).samples}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Total Controls:</strong> {calculateCounts(batchDetails?.plate_layout).controls}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Allelic Ladder:</strong> {calculateCounts(batchDetails?.plate_layout).allelicLadder}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">96-Well Plate Layout</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderPlateLayout()}
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Sample Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderSamplesList()}
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PCRBatches;