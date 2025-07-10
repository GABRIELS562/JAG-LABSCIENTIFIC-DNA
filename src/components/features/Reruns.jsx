import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Card,
  CardContent,
  CardActions,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Menu,
  MenuItem
} from '@mui/material';
import {
  DragIndicator,
  Clear,
  Download,
  Replay,
  Group,
  Refresh,
  ElectricBolt
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Sample Selection Dialog Component
const SampleSelectionDialog = ({ open, onClose, samples, batchInfo, onSelectionComplete }) => {
  const [selectedSamples, setSelectedSamples] = useState([]);

  const handleSampleToggle = (sample) => {
    setSelectedSamples(prev => {
      const isSelected = prev.some(s => s.id === sample.id);
      if (isSelected) {
        return prev.filter(s => s.id !== sample.id);
      } else {
        return [...prev, sample];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedSamples([...samples]);
  };

  const handleDeselectAll = () => {
    setSelectedSamples([]);
  };

  const handleConfirm = () => {
    onSelectionComplete(selectedSamples);
    setSelectedSamples([]);
  };

  const handleCancel = () => {
    setSelectedSamples([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        Select Samples for Rerun from {batchInfo?.batch_number}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleSelectAll}>
            Select All ({samples.length})
          </Button>
          <Button variant="outlined" size="small" onClick={handleDeselectAll}>
            Deselect All
          </Button>
          <Typography variant="body2" sx={{ ml: 'auto', alignSelf: 'center' }}>
            {selectedSamples.length} of {samples.length} selected
          </Typography>
        </Box>
        
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {samples.map(sample => (
            <Card 
              key={sample.id} 
              sx={{ 
                mb: 1, 
                border: selectedSamples.some(s => s.id === sample.id) ? '2px solid #e91e63' : '1px solid #ddd',
                cursor: 'pointer',
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => handleSampleToggle(sample)}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {sample.lab_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sample.name} {sample.surname} - {sample.relation}
                    </Typography>
                    {sample.case_number && (
                      <Typography variant="caption" color="text.secondary">
                        Case: {sample.case_number}
                      </Typography>
                    )}
                  </Box>
                  <Checkbox
                    checked={selectedSamples.some(s => s.id === sample.id)}
                    onChange={() => handleSampleToggle(sample)}
                    sx={{ color: '#e91e63', '&.Mui-checked': { color: '#e91e63' } }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleConfirm} 
          disabled={selectedSamples.length === 0}
          sx={{ bgcolor: '#e91e63' }}
        >
          Add {selectedSamples.length} Samples for Rerun
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Reruns = () => {
  const navigate = useNavigate();
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [plateData, setPlateData] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  const [controlsToAdd, setControlsToAdd] = useState({
    negativeControl: false,
    positiveControl: false,
    allelicLadder: false
  });
  const [selectedControl, setSelectedControl] = useState(null);
  const [wellContextMenu, setWellContextMenu] = useState({ open: false, wellId: null, anchorEl: null });
  const [loadElectroDialog, setLoadElectroDialog] = useState(false);
  const [availableElectroBatches, setAvailableElectroBatches] = useState([]);
  const [sampleSelectionDialog, setSampleSelectionDialog] = useState(false);
  const [availableSamples, setAvailableSamples] = useState([]);
  const [selectedBatchForSamples, setSelectedBatchForSamples] = useState(null);
  const [dragHoverWell, setDragHoverWell] = useState(null);
  const [dragHoverWells, setDragHoverWells] = useState([]);

  useEffect(() => {
    // Get selected samples from sessionStorage
    const storedSamples = sessionStorage.getItem('selectedSamplesForReruns');
    if (storedSamples) {
      setSelectedSamples(JSON.parse(storedSamples));
    }
    
    // Generate next batch number
    generateBatchNumber();
    initializePlate();
  }, []);

  const generateBatchNumber = async () => {
    try {
      const response = await fetch(`${API_URL}/api/batches`);
      if (response.ok) {
        const data = await response.json();
        const existingBatches = data.data || [];
        
        // Find the highest rerun batch number (LDS_X_RR format)
        let maxNumber = 0;
        existingBatches.forEach(batch => {
          if (batch.batch_number && batch.batch_number.includes('_RR')) {
            // Extract the number from LDS_X_RR format
            const match = batch.batch_number.match(/LDS_(\d+)_RR/);
            if (match) {
              const num = parseInt(match[1]);
              if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
              }
            }
          }
        });
        
        setBatchNumber(`LDS_${maxNumber + 1}_RR`);
      } else {
        const timestamp = Date.now().toString().slice(-4);
        setBatchNumber(`LDS_${timestamp}_RR`);
      }
    } catch (error) {
      const timestamp = Date.now().toString().slice(-4);
      setBatchNumber(`LDS_${timestamp}_RR`);
    }
  };

  const initializePlate = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => i + 1);
    
    const initialData = {};
    rows.forEach(row => {
      cols.forEach(col => {
        const wellId = `${row}${col}`;
        initialData[wellId] = {
          id: wellId,
          type: 'empty',
          samples: []
        };
      });
    });
    
    setPlateData(initialData);
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, wellId) => {
    e.preventDefault();
    setDragHoverWell(wellId);
    
    // If dragging a family group, calculate hover wells
    if (draggedItem && draggedItem.samples && draggedItem.samples.length > 1) {
      const neededWells = draggedItem.samples.length;
      const hoverWells = calculateConsecutiveWells(wellId, neededWells);
      setDragHoverWells(hoverWells);
    } else {
      setDragHoverWells([wellId]);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear hover if we're leaving the plate area
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragHoverWell(null);
      setDragHoverWells([]);
    }
  };

  const handleDragEnd = () => {
    setDragHoverWell(null);
    setDragHoverWells([]);
  };

  const calculateConsecutiveWells = (startWellId, count) => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => i + 1);
    
    const startRow = startWellId[0];
    const startCol = parseInt(startWellId.slice(1));
    const startRowIndex = rows.indexOf(startRow);
    
    const wells = [];
    let currentRowIndex = startRowIndex;
    let currentCol = startCol;
    
    for (let i = 0; i < count; i++) {
      if (currentRowIndex < rows.length) {
        const wellId = `${rows[currentRowIndex]}${currentCol}`;
        wells.push(wellId);
        currentRowIndex++;
        
        // Move to next column if we've filled the current column
        if (currentRowIndex >= rows.length) {
          currentRowIndex = 0;
          currentCol++;
          if (currentCol > 12) break; // Exceeded plate boundaries
        }
      }
    }
    
    return wells;
  };

  const handleDrop = (e, wellId) => {
    e.preventDefault();
    setDragHoverWell(null);
    setDragHoverWells([]);
    
    if (!draggedItem) return;

    // Check if well is already occupied
    if (plateData[wellId] && plateData[wellId].samples && plateData[wellId].samples.length > 0) {
      setSnackbar({
        open: true,
        message: `Well ${wellId} is already occupied`,
        severity: 'error'
      });
      return;
    }

    // Handle control items (they don't need electro batch validation)
    if (draggedItem.id && (draggedItem.id === 'neg_control' || draggedItem.id === 'pos_control' || draggedItem.id === 'allelic_ladder')) {
      const newPlateData = { ...plateData };
      newPlateData[wellId] = {
        ...newPlateData[wellId],
        type: 'control',
        samples: [draggedItem]
      };
      setPlateData(newPlateData);
      
      setSnackbar({
        open: true,
        message: `Placed ${draggedItem.lab_number} in well ${wellId}`,
        severity: 'success'
      });
      setDraggedItem(null);
      return;
    }

    // Check if the sample is from an electro batch (only for actual samples)
    if (draggedItem.samples) {
      // Family group - check all samples
      const allFromElectroBatch = draggedItem.samples.every(sample => 
        sample.workflow_status === 'electro_batched' || 
        (sample.lab_batch_number && sample.lab_batch_number.startsWith('ELEC_')) ||
        selectedSamples.some(s => s.id === sample.id) // Allow if it's in our selected samples list
      );
      
      if (!allFromElectroBatch) {
        console.log('Validation failed for family group:', draggedItem.samples);
        setSnackbar({
          open: true,
          message: 'Only samples from electrophoresis batches can be placed on rerun plates',
          severity: 'error'
        });
        return;
      }
    } else {
      // Single sample - check if it's from electro batch or loaded from selectedSamples
      const isFromElectroBatch = 
        draggedItem.workflow_status === 'electro_batched' || 
        (draggedItem.lab_batch_number && draggedItem.lab_batch_number.startsWith('ELEC_')) ||
        selectedSamples.some(s => s.id === draggedItem.id); // Allow if it's in our selected samples list
      
      if (!isFromElectroBatch) {
        console.log('Validation failed for sample:', draggedItem);
        setSnackbar({
          open: true,
          message: 'Only samples from electrophoresis batches can be placed on rerun plates',
          severity: 'error'
        });
        return;
      }
    }

    if (draggedItem.samples && draggedItem.samples.length > 1) {
      // Handle family group placement
      const samplesCount = draggedItem.samples.length;
      const availableWells = calculateConsecutiveWells(wellId, samplesCount);
      
      if (availableWells.length < samplesCount) {
        setSnackbar({
          open: true,
          message: `Not enough space for ${samplesCount} samples starting at ${wellId}`,
          severity: 'error'
        });
        return;
      }
      
      // Check if any of the target wells are already occupied
      const occupiedWells = availableWells.filter(well => 
        plateData[well] && plateData[well].samples && plateData[well].samples.length > 0
      );
      
      if (occupiedWells.length > 0) {
        setSnackbar({
          open: true,
          message: `Wells ${occupiedWells.join(', ')} are already occupied`,
          severity: 'error'
        });
        return;
      }
      
      // Sort samples by relation (child first, then father, then mother)
      const sortedSamples = [...draggedItem.samples].sort((a, b) => {
        const relationOrder = { 'Child': 0, 'Alleged Father': 1, 'Mother': 2 };
        return (relationOrder[a.relation] || 999) - (relationOrder[b.relation] || 999);
      });
      
      // Place all samples in consecutive wells vertically
      const newPlateData = { ...plateData };
      sortedSamples.forEach((sample, index) => {
        const targetWell = availableWells[index];
        newPlateData[targetWell] = {
          ...newPlateData[targetWell],
          type: 'sample',
          samples: [sample]
        };
      });
      
      setPlateData(newPlateData);
      
      setSnackbar({
        open: true,
        message: `Placed ${samplesCount} samples from case ${draggedItem.caseNumber} for rerun starting at ${wellId}`,
        severity: 'success'
      });
    } else {
      // Single sample or control
      const newPlateData = { ...plateData };
      newPlateData[wellId] = {
        ...newPlateData[wellId],
        type: draggedItem.relation === 'Control' ? 'control' : 'sample',
        samples: [draggedItem]
      };
      setPlateData(newPlateData);
      
      setSnackbar({
        open: true,
        message: `Placed ${draggedItem.lab_number || draggedItem.name} for rerun in well ${wellId}`,
        severity: 'success'
      });
    }
    
    setDraggedItem(null);
  };

  const clearWell = (wellId) => {
    const newPlateData = { ...plateData };
    newPlateData[wellId] = {
      ...newPlateData[wellId],
      type: 'empty',
      samples: []
    };
    setPlateData(newPlateData);
  };

  const addControlToWell = (wellId, controlType) => {
    const newPlateData = { ...plateData };
    let controlData;
    
    switch (controlType) {
      case 'negative':
        controlData = {
          id: 'neg_control',
          lab_number: 'NEG_CTRL',
          name: 'Negative',
          surname: 'Control',
          relation: 'Control'
        };
        break;
      case 'positive':
        controlData = {
          id: 'pos_control',
          lab_number: 'POS_CTRL',
          name: 'Positive',
          surname: 'Control',
          relation: 'Control'
        };
        break;
      case 'ladder':
        controlData = {
          id: 'allelic_ladder',
          lab_number: 'ALLELIC_LADDER',
          name: 'Allelic',
          surname: 'Ladder',
          relation: 'Control'
        };
        break;
    }
    
    newPlateData[wellId] = {
      ...newPlateData[wellId],
      type: 'control',
      samples: [controlData]
    };
    setPlateData(newPlateData);
    setSelectedControl(null);
  };

  const handleAutoFill = () => {
    if (selectedSamples.length === 0) {
      setSnackbar({
        open: true,
        message: 'No samples selected for auto-fill',
        severity: 'warning'
      });
      return;
    }

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => i + 1);
    
    const newPlateData = { ...plateData };
    let sampleIndex = 0;
    
    // Fill vertically (A1, B1, C1, etc.)
    for (let colIndex = 0; colIndex < cols.length && sampleIndex < selectedSamples.length; colIndex++) {
      const col = cols[colIndex];
      
      for (let rowIndex = 0; rowIndex < rows.length && sampleIndex < selectedSamples.length; rowIndex++) {
        const row = rows[rowIndex];
        const wellId = `${row}${col}`;
        
        // Skip if well is already filled
        if (newPlateData[wellId].samples.length > 0) continue;
        
        const sample = selectedSamples[sampleIndex];
        newPlateData[wellId] = {
          ...newPlateData[wellId],
          type: 'sample',
          samples: [sample]
        };
        sampleIndex++;
      }
    }

    // Auto-add controls in the last column if requested
    const controlCol = 12;
    let controlRowIndex = 0;
    
    if (controlsToAdd.negativeControl && controlRowIndex < rows.length) {
      const negControlWell = `${rows[controlRowIndex]}${controlCol}`;
      if (newPlateData[negControlWell] && newPlateData[negControlWell].type === 'empty') {
        newPlateData[negControlWell] = {
          id: negControlWell,
          type: 'control',
          samples: [{
            id: 'neg_control',
            lab_number: 'NEG_CTRL',
            name: 'Negative',
            surname: 'Control',
            relation: 'Control'
          }]
        };
      }
      controlRowIndex++;
    }

    if (controlsToAdd.positiveControl && controlRowIndex < rows.length) {
      const posControlWell = `${rows[controlRowIndex]}${controlCol}`;
      if (newPlateData[posControlWell] && newPlateData[posControlWell].type === 'empty') {
        newPlateData[posControlWell] = {
          id: posControlWell,
          type: 'control',
          samples: [{
            id: 'pos_control',
            lab_number: 'POS_CTRL',
            name: 'Positive',
            surname: 'Control',
            relation: 'Control'
          }]
        };
      }
      controlRowIndex++;
    }

    if (controlsToAdd.allelicLadder && controlRowIndex < rows.length) {
      const ladderWell = `${rows[controlRowIndex]}${controlCol}`;
      if (newPlateData[ladderWell] && newPlateData[ladderWell].type === 'empty') {
        newPlateData[ladderWell] = {
          id: ladderWell,
          type: 'control',
          samples: [{
            id: 'allelic_ladder',
            lab_number: 'ALLELIC_LADDER',
            name: 'Allelic',
            surname: 'Ladder',
            relation: 'Control'
          }]
        };
      }
    }

    setPlateData(newPlateData);
    
    setSnackbar({
      open: true,
      message: `Auto-filled ${selectedSamples.length} samples for rerun vertically (A1→H1, then A2→H2...)${controlsToAdd.negativeControl || controlsToAdd.positiveControl || controlsToAdd.allelicLadder ? ' with controls' : ''}`,
      severity: 'success'
    });
  };

  const getWellColor = (well) => {
    if (!well || !well.type) {
      return '#f5f5f5';
    }
    
    switch (well.type) {
      case 'sample':
        return '#fce4ec'; // Light pink for rerun samples
      case 'control':
        // Different colors for different control types
        if (well.samples && well.samples.length > 0) {
          const sample = well.samples[0];
          if (sample.lab_number === 'NEG_CTRL') {
            return '#ffcdd2'; // Light red for negative control
          } else if (sample.lab_number === 'POS_CTRL') {
            return '#c8e6c9'; // Light green for positive control
          } else if (sample.lab_number === 'ALLELIC_LADDER') {
            return '#bbdefb'; // Light blue for allelic ladder
          }
        }
        return '#81c784'; // Default green for controls
      case 'blank':
        return '#ffffff';
      default:
        return '#f5f5f5';
    }
  };

  const getPlacedSamplesCount = () => {
    if (!plateData || Object.keys(plateData).length === 0) return 0;
    return Object.values(plateData).reduce((count, well) => {
      return count + (well && well.samples ? well.samples.length : 0);
    }, 0);
  };

  const handleFinalizeBatch = async () => {
    try {
      const filledWells = Object.entries(plateData).filter(([_, well]) => well.samples.length > 0);
      
      if (filledWells.length === 0) {
        setSnackbar({
          open: true,
          message: 'No samples on plate to finalize',
          severity: 'warning'
        });
        return;
      }

      const transformedWells = {};
      Object.entries(plateData).forEach(([wellId, wellData]) => {
        if (wellData.samples && wellData.samples.length > 0) {
          const sample = wellData.samples[0];
          transformedWells[wellId] = {
            type: wellData.type,
            samples: wellData.samples,
            sample_id: sample.id || null,
            sampleName: sample.lab_number || sample.name || `Sample_${wellId}`,
            label: sample.lab_number || `Sample_${wellId}`,
            comment: `Rerun Batch ${batchNumber} - ${wellData.type}`
          };
        }
      });

      const batchData = {
        batchNumber,
        operator,
        wells: transformedWells,
        sampleCount: getPlacedSamplesCount(),
        date: new Date().toISOString().split('T')[0],
        batchType: 'rerun'
      };

      const authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${API_URL}/api/generate-batch`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(batchData)
      });

      if (response.ok) {
        sessionStorage.removeItem('selectedSamplesForReruns');
        setSelectedSamples([]);
        initializePlate();
        await generateBatchNumber();
        setFinalizeDialog(false);
        
        setSnackbar({
          open: true,
          message: `Rerun Batch ${batchNumber} finalized! Redirecting to batch view...`,
          severity: 'success'
        });
        
        // Navigate to batches page after short delay
        setTimeout(() => {
          navigate('/pcr-batches');
        }, 2000);
      } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: `Error finalizing batch: ${error.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error finalizing batch - check connection',
        severity: 'error'
      });
    }
  };

  const loadElectroBatches = async () => {
    try {
      const response = await fetch(`${API_URL}/api/batches`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Filter for completed electrophoresis batches (those with ELEC_ prefix)
        const electroBatches = (data.data || []).filter(batch => 
          batch.batch_number?.startsWith('ELEC_') && batch.status !== 'cancelled'
        );
        
        setAvailableElectroBatches(electroBatches);
        setLoadElectroDialog(true);
      } else {
        setSnackbar({
          open: true,
          message: `Failed to load electrophoresis batches: ${response.status}`,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error loading electrophoresis batches - check connection',
        severity: 'error'
      });
    }
  };

  const loadSamplesFromElectroBatch = async (batch) => {
    try {
      const response = await fetch(`${API_URL}/api/well-assignments/${batch.id}`);
      
      if (response.ok) {
        const data = await response.json();
        const wellAssignments = data.data || [];
        
        // Extract samples from well assignments
        const samples = [];
        wellAssignments.forEach(assignment => {
          if (assignment.samples && assignment.samples.length > 0) {
            samples.push(...assignment.samples);
          }
        });
        
        // Filter only actual samples (not controls)
        const actualSamples = samples.filter(sample => 
          sample.lab_number && 
          !sample.lab_number.includes('CTRL') && 
          !sample.lab_number.includes('LADDER')
        );
        
        // Set up for sample selection dialog
        setAvailableSamples(actualSamples);
        setSelectedBatchForSamples(batch);
        setLoadElectroDialog(false);
        setSampleSelectionDialog(true);
        
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to load samples from batch',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error loading samples from batch',
        severity: 'error'
      });
    }
  };

  const handleSampleSelectionComplete = (selectedSamplesList) => {
    setSelectedSamples([...selectedSamples, ...selectedSamplesList]);
    setSampleSelectionDialog(false);
    
    setSnackbar({
      open: true,
      message: `Added ${selectedSamplesList.length} samples from batch ${selectedBatchForSamples.batch_number} for rerun`,
      severity: 'success'
    });
  };

  const renderPlate = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
      <Paper 
        sx={{ 
          p: 3, 
          mt: 2, 
          border: '3px solid #e91e63', // Pink border for rerun plates
          borderRadius: 2,
          backgroundColor: '#fafafa'
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, color: '#e91e63', fontWeight: 'bold' }}>
          🔄 Rerun Plate Layout - {batchNumber}
        </Typography>
        
        <Box sx={{ display: 'flex', mb: 2 }}>
          <Box sx={{ mr: 2 }}>
            <Typography variant="body2" color="text.secondary">Columns</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {cols.map(col => (
                <Typography key={col} variant="body2" sx={{ width: 40, textAlign: 'center' }}>
                  {col}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>

        {rows.map(row => (
          <Box key={row} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ width: 20, mr: 1, fontWeight: 'bold' }}>
              {row}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {cols.map(col => {
                const wellId = `${row}${col}`;
                const well = plateData[wellId];
                const isHovered = dragHoverWells.includes(wellId);
                const isValidDrop = draggedItem && (
                  !draggedItem.samples || 
                  draggedItem.samples.every(s => 
                    s.workflow_status === 'electro_batched' || 
                    (s.lab_batch_number && s.lab_batch_number.startsWith('ELEC_'))
                  )
                );

                return (
                  <Box
                    key={wellId}
                    sx={{
                      width: 40,
                      height: 40,
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      backgroundColor: isHovered 
                        ? (isValidDrop ? '#c8e6c9' : '#ffcdd2')
                        : getWellColor(well),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }
                    }}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, wellId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, wellId)}
                    onClick={() => {
                      if (selectedControl) {
                        addControlToWell(wellId, selectedControl);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setWellContextMenu({ open: true, wellId, anchorEl: e.currentTarget });
                    }}
                  >
                    {well && well.samples && well.samples.length > 0 ? (
                      <Tooltip title={`${well.samples[0].lab_number || ''} - ${well.samples[0].name || ''}`}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', textAlign: 'center' }}>
                          {well.samples[0].lab_number?.slice(-3) || well.samples[0].name?.slice(0, 3) || 'S'}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                        {wellId}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </Paper>
    );
  };

  const renderSamplesPanel = () => (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#e91e63' }}>
        🔄 Samples for Rerun
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          onClick={loadElectroBatches}
          startIcon={<ElectricBolt />}
          sx={{ mr: 1 }}
        >
          Load from Electro Batch
        </Button>
        <Button
          variant="contained"
          onClick={handleAutoFill}
          startIcon={<Group />}
          disabled={selectedSamples.length === 0}
          sx={{ bgcolor: '#e91e63' }}
        >
          Auto Fill
        </Button>
      </Box>

      {/* Controls Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Controls</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={controlsToAdd.negativeControl}
                onChange={(e) => setControlsToAdd(prev => ({ ...prev, negativeControl: e.target.checked }))}
              />
            }
            label="Negative Control"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={controlsToAdd.positiveControl}
                onChange={(e) => setControlsToAdd(prev => ({ ...prev, positiveControl: e.target.checked }))}
              />
            }
            label="Positive Control"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={controlsToAdd.allelicLadder}
                onChange={(e) => setControlsToAdd(prev => ({ ...prev, allelicLadder: e.target.checked }))}
              />
            }
            label="Allelic Ladder"
          />
        </Box>
        
        {/* Draggable control items */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Card
            sx={{ 
              p: 1, 
              cursor: 'grab', 
              bgcolor: '#ffcdd2',
              '&:hover': { bgcolor: '#ef9a9a' }
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, {
              id: 'neg_control',
              lab_number: 'NEG_CTRL',
              name: 'Negative',
              surname: 'Control',
              relation: 'Control'
            })}
          >
            <Typography variant="caption">Negative Control</Typography>
          </Card>
          
          <Card
            sx={{ 
              p: 1, 
              cursor: 'grab', 
              bgcolor: '#c8e6c9',
              '&:hover': { bgcolor: '#a5d6a7' }
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, {
              id: 'pos_control',
              lab_number: 'POS_CTRL',
              name: 'Positive',
              surname: 'Control',
              relation: 'Control'
            })}
          >
            <Typography variant="caption">Positive Control</Typography>
          </Card>
          
          <Card
            sx={{ 
              p: 1, 
              cursor: 'grab', 
              bgcolor: '#bbdefb',
              '&:hover': { bgcolor: '#90caf9' }
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, {
              id: 'allelic_ladder',
              lab_number: 'ALLELIC_LADDER',
              name: 'Allelic',
              surname: 'Ladder',
              relation: 'Control'
            })}
          >
            <Typography variant="caption">Allelic Ladder</Typography>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2">
          Selected Samples ({selectedSamples.length})
        </Typography>
        {selectedSamples.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => setSelectedSamples([])}
          >
            Clear All
          </Button>
        )}
      </Box>
      
      <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
        {selectedSamples.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No samples selected. Load samples from an electrophoresis batch.
          </Typography>
        ) : (
          selectedSamples.map(sample => (
            <Card
              key={sample.id}
              sx={{
                mb: 1,
                cursor: 'grab',
                bgcolor: '#fce4ec',
                '&:hover': { bgcolor: '#f8bbd9' },
                position: 'relative'
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, sample)}
            >
              <CardContent sx={{ p: 1, pr: 5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {sample.lab_number}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sample.name} {sample.surname} - {sample.relation}
                </Typography>
                {sample.lab_batch_number && (
                  <Typography variant="caption" sx={{ display: 'block', color: '#e91e63' }}>
                    From: {sample.lab_batch_number}
                  </Typography>
                )}
              </CardContent>
              <IconButton
                size="small"
                sx={{ 
                  position: 'absolute', 
                  top: 4, 
                  right: 4,
                  color: '#d32f2f',
                  '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.1)' }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSamples(prev => prev.filter(s => s.id !== sample.id));
                }}
              >
                <Clear fontSize="small" />
              </IconButton>
            </Card>
          ))
        )}
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#e91e63', fontWeight: 'bold' }}>
        🔄 Rerun Plate Layout
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {renderPlate()}
          
          {/* Batch Info and Actions */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Batch Number"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Operator"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => setFinalizeDialog(true)}
                    disabled={!operator || getPlacedSamplesCount() === 0}
                    sx={{ bgcolor: '#e91e63' }}
                  >
                    Finalize Batch
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      initializePlate();
                      setSnackbar({
                        open: true,
                        message: 'Plate cleared',
                        severity: 'info'
                      });
                    }}
                  >
                    Clear Plate
                  </Button>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Samples on plate: {getPlacedSamplesCount()} | 
                Batch: {batchNumber} | 
                Operator: {operator || 'Not set'}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          {renderSamplesPanel()}
        </Grid>
      </Grid>

      {/* Load Electro Batch Dialog */}
      <Dialog open={loadElectroDialog} onClose={() => setLoadElectroDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load Samples from Electrophoresis Batch</DialogTitle>
        <DialogContent>
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {availableElectroBatches.length === 0 ? (
              <Typography>No electrophoresis batches available</Typography>
            ) : (
              availableElectroBatches.map(batch => (
                <Card
                  key={batch.id}
                  sx={{
                    mb: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                  onClick={() => loadSamplesFromElectroBatch(batch)}
                >
                  <CardContent>
                    <Typography variant="h6">{batch.batch_number}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Operator: {batch.operator} | Date: {batch.pcr_date || batch.electro_date}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Samples: {batch.total_samples}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadElectroDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Sample Selection Dialog */}
      <SampleSelectionDialog 
        open={sampleSelectionDialog}
        onClose={() => setSampleSelectionDialog(false)}
        samples={availableSamples}
        batchInfo={selectedBatchForSamples}
        onSelectionComplete={handleSampleSelectionComplete}
      />

      {/* Finalize Dialog */}
      <Dialog open={finalizeDialog} onClose={() => setFinalizeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Finalize Rerun Batch</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to finalize this rerun batch?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Batch: {batchNumber}<br />
            Operator: {operator}<br />
            Samples: {getPlacedSamplesCount()}<br />
            Date: {new Date().toLocaleDateString()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalizeDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleFinalizeBatch} sx={{ bgcolor: '#e91e63' }}>
            Finalize
          </Button>
        </DialogActions>
      </Dialog>

      {/* Well Context Menu */}
      <Menu
        open={wellContextMenu.open}
        anchorEl={wellContextMenu.anchorEl}
        onClose={() => setWellContextMenu({ open: false, wellId: null, anchorEl: null })}
      >
        <MenuItem onClick={() => {
          clearWell(wellContextMenu.wellId);
          setWellContextMenu({ open: false, wellId: null, anchorEl: null });
        }}>
          Clear Well
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Reruns;