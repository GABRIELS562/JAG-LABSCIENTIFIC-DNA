import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Card,
  CardContent,
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
  Save,
  Download,
  Science,
  Group,
  Refresh
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PCRPlate = () => {
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [plateData, setPlateData] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [operator, setOperator] = useState('Lab Technician');
  const [saveDialog, setSaveDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  const [controlsToAdd, setControlsToAdd] = useState({
    negativeControl: false,
    positiveControl: false,
    allelicLadder: false
  });
  const [selectedControl, setSelectedControl] = useState(null); // 'negative', 'positive', 'ladder', or null
  const [wellContextMenu, setWellContextMenu] = useState({ open: false, wellId: null, anchorEl: null });

  useEffect(() => {
    // Get selected samples from sessionStorage or localStorage
    const storedSamples = sessionStorage.getItem('selectedSamplesForBatch');
    if (storedSamples) {
      setSelectedSamples(JSON.parse(storedSamples));
    }
    
    // Generate next batch number
    generateBatchNumber();
    initializePlate();
  }, []);

  const generateBatchNumber = async () => {
    try {
      // Try to get the next batch number from the server
      const response = await fetch(`${API_URL}/api/batches`);
      if (response.ok) {
        const data = await response.json();
        const existingBatches = data.data || [];
        
        // Find the highest LDS batch number
        let maxNumber = 0;
        existingBatches.forEach(batch => {
          if (batch.batch_number && batch.batch_number.startsWith('LDS_')) {
            const num = parseInt(batch.batch_number.split('_')[1]);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        });
        
        setBatchNumber(`LDS_${maxNumber + 1}`);
      } else {
        // Fallback to timestamp if API fails
        const timestamp = Date.now().toString().slice(-4);
        setBatchNumber(`LDS_${timestamp}`);
      }
    } catch (error) {
      console.error('Error generating batch number:', error);
      // Fallback to timestamp
      const timestamp = Date.now().toString().slice(-4);
      setBatchNumber(`LDS_${timestamp}`);
    }
  };

  const initializePlate = () => {
    const plate = {};
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    
    rows.forEach(row => {
      cols.forEach(col => {
        const wellId = `${row}${col}`;
        plate[wellId] = {
          id: wellId,
          type: 'empty',
          samples: []
        };
      });
    });
    
    setPlateData(plate);
  };

  const groupSamplesByCase = (samples) => {
    const groups = {};
    const individual = [];
    
    samples.forEach(sample => {
      if (sample.case_number) {
        if (!groups[sample.case_number]) {
          groups[sample.case_number] = {
            caseNumber: sample.case_number,
            samples: []
          };
        }
        groups[sample.case_number].samples.push(sample);
      } else {
        individual.push(sample);
      }
    });
    
    // Sort samples within each group by relation order (Child, Father, Mother)
    const groupsWithSortedSamples = Object.values(groups).map(group => ({
      ...group,
      samples: [...group.samples].sort((a, b) => {
        const relationOrder = { 'Child': 0, 'Alleged Father': 1, 'Mother': 2 };
        return (relationOrder[a.relation] || 999) - (relationOrder[b.relation] || 999);
      })
    }));
    
    return { groups: groupsWithSortedSamples, individual };
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, wellId) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    // Check if well is already occupied
    if (plateData[wellId].samples.length > 0) {
      setSnackbar({
        open: true,
        message: 'Well is already occupied. Clear it first.',
        severity: 'warning'
      });
      return;
    }
    
    // If it's a group (case), check if there are enough consecutive wells vertically
    if (draggedItem.samples && Array.isArray(draggedItem.samples)) {
      const samplesCount = draggedItem.samples.length;
      const startRow = wellId[0];
      const col = wellId.slice(1);
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const startRowIndex = rows.indexOf(startRow);
      
      // Check if we have enough consecutive wells vertically (down the column)
      let availableWells = [];
      for (let i = 0; i < samplesCount; i++) {
        const rowIndex = startRowIndex + i;
        if (rowIndex >= rows.length) {
          setSnackbar({
            open: true,
            message: `Not enough consecutive wells in column ${col} for ${samplesCount} samples.`,
            severity: 'error'
          });
          return;
        }
        
        const checkWellId = `${rows[rowIndex]}${col}`;
        if (plateData[checkWellId].samples.length > 0) {
          setSnackbar({
            open: true,
            message: `Well ${checkWellId} is already occupied.`,
            severity: 'error'
          });
          return;
        }
        availableWells.push(checkWellId);
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
        message: `Placed ${samplesCount} samples from case ${draggedItem.caseNumber} vertically starting at ${wellId}`,
        severity: 'success'
      });
    } else {
      // Single sample
      const newPlateData = { ...plateData };
      newPlateData[wellId] = {
        ...newPlateData[wellId],
        type: 'sample',
        samples: [draggedItem]
      };
      setPlateData(newPlateData);
      
      setSnackbar({
        open: true,
        message: `Placed sample ${draggedItem.lab_number} in well ${wellId}`,
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
          id: `neg_control_${wellId}`,
          lab_number: 'NEG_CTRL',
          name: 'Negative',
          surname: 'Control',
          relation: 'Control'
        };
        break;
      case 'positive':
        controlData = {
          id: `pos_control_${wellId}`,
          lab_number: 'POS_CTRL',
          name: 'Positive',
          surname: 'Control',
          relation: 'Control'
        };
        break;
      case 'ladder':
        controlData = {
          id: `ladder_${wellId}`,
          lab_number: 'ALLELIC_LADDER',
          name: 'Allelic',
          surname: 'Ladder',
          relation: 'Control'
        };
        break;
      default:
        return;
    }

    newPlateData[wellId] = {
      id: wellId,
      type: 'control',
      samples: [controlData]
    };

    setPlateData(newPlateData);
    setSelectedControl(null);
    
    setSnackbar({
      open: true,
      message: `${controlType === 'ladder' ? 'Allelic ladder' : controlType === 'negative' ? 'Negative' : 'Positive'} control added to well ${wellId}`,
      severity: 'success'
    });
  };

  const handleWellClick = (wellId) => {
    if (selectedControl) {
      // If a control is selected, add it to the well
      if (plateData[wellId].samples.length > 0) {
        setSnackbar({
          open: true,
          message: 'Well is occupied. Clear it first.',
          severity: 'warning'
        });
        return;
      }
      addControlToWell(wellId, selectedControl);
    } else {
      // Normal well clearing
      if (plateData[wellId].samples.length > 0) {
        clearWell(wellId);
      }
    }
  };

  const handleWellRightClick = (e, wellId) => {
    e.preventDefault();
    setWellContextMenu({
      open: true,
      wellId: wellId,
      anchorEl: e.currentTarget
    });
  };

  const clearAllWells = () => {
    initializePlate();
    setSnackbar({
      open: true,
      message: 'All wells cleared',
      severity: 'info'
    });
  };

  const autoFillSamples = () => {
    if (selectedSamples.length === 0) {
      setSnackbar({
        open: true,
        message: 'No samples to fill',
        severity: 'warning'
      });
      return;
    }

    // Clear the plate first
    initializePlate();
    
    const newPlateData = {};
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    
    // Initialize empty plate
    rows.forEach(row => {
      cols.forEach(col => {
        const wellId = `${row}${col}`;
        newPlateData[wellId] = {
          id: wellId,
          type: 'empty',
          samples: []
        };
      });
    });

    // Fill samples vertically (A1, B1, C1, D1, E1, F1, G1, H1, then A2, B2, C2, D2, ...)
    let sampleIndex = 0;
    
    // Fill column by column, row by row within each column
    for (let colIndex = 0; colIndex < cols.length && sampleIndex < selectedSamples.length; colIndex++) {
      const col = cols[colIndex];
      
      // Fill down each column: A01, B01, C01, D01, E01, F01, G01, H01
      for (let rowIndex = 0; rowIndex < rows.length && sampleIndex < selectedSamples.length; rowIndex++) {
        const row = rows[rowIndex];
        const wellId = `${row}${col}`;
        
        
        newPlateData[wellId] = {
          id: wellId,
          type: 'sample',
          samples: [selectedSamples[sampleIndex]]
        };
        
        sampleIndex++;
      }
    }

    // Add controls in the next available column
    if (controlsToAdd.negativeControl || controlsToAdd.positiveControl || controlsToAdd.allelicLadder) {
      const nextColIndex = Math.ceil(selectedSamples.length / 8); // Next available column
      const controlCol = cols[nextColIndex] || cols[11]; // Use last column if needed
      let controlRowIndex = 0;
      
      if (controlsToAdd.negativeControl) {
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

      if (controlsToAdd.positiveControl) {
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

      if (controlsToAdd.allelicLadder) {
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
    }

    setPlateData(newPlateData);
    
    setSnackbar({
      open: true,
      message: `Auto-filled ${selectedSamples.length} samples vertically (A1→H1, then A2→H2...)${controlsToAdd.negativeControl || controlsToAdd.positiveControl || controlsToAdd.allelicLadder ? ' with controls' : ''}`,
      severity: 'success'
    });
  };

  const getWellColor = (well) => {
    if (!well || !well.type) {
      return '#f5f5f5'; // Light gray for empty/undefined wells
    }
    
    switch (well.type) {
      case 'sample':
        return '#ffb74d'; // Orange for samples
      case 'control':
        return '#81c784'; // Green for controls
      case 'blank':
        return '#ffffff'; // White for blanks
      default:
        return '#f5f5f5'; // Light gray for empty
    }
  };

  const getPlacedSamplesCount = () => {
    if (!plateData || Object.keys(plateData).length === 0) return 0;
    return Object.values(plateData).reduce((count, well) => {
      return count + (well && well.samples ? well.samples.length : 0);
    }, 0);
  };

  const handleSavePlate = async () => {
    try {
      const plateLayout = {
        batchNumber,
        operator,
        plateName: 'pcr batch',
        wells: Object.entries(plateData)
          .filter(([_, well]) => well.samples.length > 0)
          .map(([wellId, well]) => ({
            wellId,
            samples: well.samples.map(s => s.id),
            type: well.type
          }))
      };
      
      // Here you would normally save to your API
      console.log('Saving plate layout:', plateLayout);
      
      setSnackbar({
        open: true,
        message: 'Plate layout saved successfully',
        severity: 'success'
      });
      
      setSaveDialog(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error saving plate layout',
        severity: 'error'
      });
    }
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

      const batchData = {
        batchNumber,
        operator,
        wells: plateData,
        sampleCount: getPlacedSamplesCount(),
        date: new Date().toISOString().split('T')[0]
      };

      // Call the API to generate the batch
      const response = await fetch(`${API_URL}/api/generate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(batchData)
      });

      if (response.ok) {
        const result = await response.json();
        
        setSnackbar({
          open: true,
          message: `Batch ${batchNumber} finalized successfully!`,
          severity: 'success'
        });
        
        // Clear the selected samples from sessionStorage
        sessionStorage.removeItem('selectedSamplesForBatch');
        
        // Generate new batch number for next use
        await generateBatchNumber();
        
        setFinalizeDialog(false);
      } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: `Error finalizing batch: ${error.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Finalize batch error:', error);
      setSnackbar({
        open: true,
        message: 'Error finalizing batch - check connection',
        severity: 'error'
      });
    }
  };

  const exportPlateLayout = () => {
    // Create export data similar to GenerateBatch component
    const headerRows = [
      'Container Name\tDescription\tContainerType\tAppType\tOwner\tOperator',
      `pcr batch\t${batchNumber}_10ul_28cycle30m_5s\t96-Well\tRegular\tLAB DNA\t${operator}`,
      'AppServer\tAppInstance',
      'GeneMapper\tGeneMapper_1ae27b545c1511deab1400101834f966',
      'Well\tSample Name\tComment\tPriority\tSize Standard\tSnp Set\tUser-Defined 3\tUser-Defined 2\tUser-Defined 1\tPanel\tStudy\tSample Type\tAnalysis Method\tResults Group 1\tInstrument Protocol 1'
    ];

    const wellRows = Object.entries(plateData)
      .filter(([_, well]) => well.samples.length > 0)
      .map(([wellId, well]) => {
        const sample = well.samples[0]; // Get first sample in well
        const sampleName = sample.lab_number || `Sample_${wellId}`;
        return `${wellId}\t${sampleName}\t\t100\tCE_G5_IdentifilerDirect_GS500\t\t\t\t\tIdentifilerDirect_GS500_Panels_v1\t\tSample\tIdentifilerDirect_AnalysisMethod_v1\tFA_Run_36cm_POP4_5s\tGMHID`;
      });

    const fileContent = [...headerRows, ...wellRows].join('\n');
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${batchNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: 'Plate layout exported successfully',
      severity: 'success'
    });
  };

  const { groups, individual } = groupSamplesByCase(selectedSamples);

  // Ensure plateData is initialized before rendering
  if (!plateData || Object.keys(plateData).length === 0) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>Loading plate...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
          PCR Plate Layout
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={autoFillSamples}
            disabled={selectedSamples.length === 0}
          >
            Auto Fill Vertically
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={clearAllWells}
          >
            Clear All
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportPlateLayout}
            disabled={getPlacedSamplesCount() === 0}
          >
            Export Layout
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={() => setSaveDialog(true)}
            sx={{ bgcolor: '#1e4976' }}
            disabled={getPlacedSamplesCount() === 0}
          >
            Save Plate
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => setFinalizeDialog(true)}
            disabled={getPlacedSamplesCount() === 0}
            sx={{ ml: 1 }}
          >
            Finalize Batch
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Sample Selection Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1e4976' }}>
              Selected Samples ({selectedSamples.length})
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Drag samples or groups to plate positions
              <br />
              <Typography variant="caption" color="text.secondary">
                Tip: Hold Alt while dragging to move individual samples from groups
              </Typography>
            </Typography>

            {/* Grouped Samples (Cases) */}
            {groups.map((group, index) => (
              <Card
                key={index}
                sx={{ 
                  mb: 1.5, 
                  cursor: 'grab',
                  bgcolor: '#e3f2fd',
                  '&:hover': { bgcolor: '#bbdefb' },
                  border: '1px solid #2196f3'
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, group)}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <DragIndicator sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                      Case: {group.caseNumber} ({group.samples.length})
                    </Typography>
                  </Box>
                  <Stack spacing={0.25}>
                    {group.samples.map(sample => (
                      <Box 
                        key={sample.id} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          p: 0.25,
                          borderRadius: 0.5,
                          cursor: 'grab',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                          minHeight: 24
                        }}
                        draggable
                        onDragStart={(e) => {
                          // Allow individual sample drag only if Alt key is held
                          if (e.altKey) {
                            e.stopPropagation(); // Prevent group drag
                            handleDragStart(e, sample);
                          } else {
                            // Otherwise, drag the entire group
                            handleDragStart(e, group);
                          }
                        }}
                      >
                        <DragIndicator sx={{ fontSize: 12, color: 'primary.main', opacity: 0.7 }} />
                        <Chip 
                          label={sample.lab_number} 
                          size="small" 
                          variant="outlined" 
                          sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
                        />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {sample.name} {sample.surname} ({sample.relation})
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ))}

            {/* Individual Samples */}
            {individual.map(sample => (
              <Card
                key={sample.id}
                sx={{ 
                  mb: 0.75, 
                  cursor: 'grab',
                  bgcolor: '#fff3e0',
                  '&:hover': { bgcolor: '#ffe0b2' },
                  border: '1px solid #ff9800'
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, sample)}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                    <DragIndicator sx={{ mr: 0.5, color: 'warning.main', fontSize: 16 }} />
                    <Chip 
                      label={sample.lab_number} 
                      size="small" 
                      variant="outlined" 
                      sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
                    />
                    <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.7rem' }}>
                      {sample.name} {sample.surname}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Divider sx={{ my: 2 }} />
            
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              Placed: {getPlacedSamplesCount()} / {selectedSamples.length} samples
            </Typography>
          </Paper>
        </Grid>

        {/* 96-Well Plate */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1e4976' }}>
              96-Well Plate: {batchNumber}
            </Typography>
            
            {/* Controls Section */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: '#1e4976', fontWeight: 'bold' }}>
                Controls
              </Typography>
              
              {/* Auto-fill controls */}
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Auto-fill with controls:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={controlsToAdd.negativeControl}
                      onChange={(e) => setControlsToAdd(prev => ({
                        ...prev,
                        negativeControl: e.target.checked
                      }))}
                    />
                  }
                  label="Include Negative Control"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={controlsToAdd.positiveControl}
                      onChange={(e) => setControlsToAdd(prev => ({
                        ...prev,
                        positiveControl: e.target.checked
                      }))}
                    />
                  }
                  label="Include Positive Control"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={controlsToAdd.allelicLadder}
                      onChange={(e) => setControlsToAdd(prev => ({
                        ...prev,
                        allelicLadder: e.target.checked
                      }))}
                    />
                  }
                  label="Include Allelic Ladder"
                />
              </Box>
              
              {/* Manual control placement */}
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Manual control placement:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Button
                  variant={selectedControl === 'negative' ? 'contained' : 'outlined'}
                  color="success"
                  size="small"
                  onClick={() => setSelectedControl(selectedControl === 'negative' ? null : 'negative')}
                >
                  {selectedControl === 'negative' ? 'Cancel' : 'Place Negative'}
                </Button>
                <Button
                  variant={selectedControl === 'positive' ? 'contained' : 'outlined'}
                  color="error"
                  size="small"
                  onClick={() => setSelectedControl(selectedControl === 'positive' ? null : 'positive')}
                >
                  {selectedControl === 'positive' ? 'Cancel' : 'Place Positive'}
                </Button>
                <Button
                  variant={selectedControl === 'ladder' ? 'contained' : 'outlined'}
                  color="warning"
                  size="small"
                  onClick={() => setSelectedControl(selectedControl === 'ladder' ? null : 'ladder')}
                >
                  {selectedControl === 'ladder' ? 'Cancel' : 'Place Ladder'}
                </Button>
              </Box>
              
              {selectedControl && (
                <Alert severity="info" sx={{ mb: 0 }}>
                  Click on an empty well to place {selectedControl} control
                </Alert>
              )}
            </Box>
            
            {/* Column headers */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '40px repeat(12, 1fr)', gap: 1, mb: 1 }}>
              <Box></Box>
              {Array.from({ length: 12 }, (_, i) => (
                <Box key={i} sx={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {(i + 1).toString().padStart(2, '0')}
                </Box>
              ))}
            </Box>

            {/* Plate rows */}
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(row => (
              <Box key={row} sx={{ display: 'grid', gridTemplateColumns: '40px repeat(12, 1fr)', gap: 1, mb: 1 }}>
                {/* Row label */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  {row}
                </Box>
                
                {/* Wells */}
                {Array.from({ length: 12 }, (_, i) => {
                  const wellId = `${row}${(i + 1).toString().padStart(2, '0')}`;
                  const well = plateData[wellId];
                  return (
                    <Box
                      key={wellId}
                      sx={{
                        position: 'relative',
                        width: 40,
                        height: 40,
                        border: selectedControl && well.samples.length === 0 ? 
                          `2px dashed ${selectedControl === 'negative' ? '#f44336' : selectedControl === 'positive' ? '#4caf50' : '#ff9800'}` : 
                          '2px solid #ddd',
                        borderRadius: '50%',
                        backgroundColor: getWellColor(well),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: selectedControl ? 'crosshair' : 'pointer',
                        '&:hover': {
                          borderColor: selectedControl ? (selectedControl === 'negative' ? '#f44336' : selectedControl === 'positive' ? '#4caf50' : '#ff9800') : '#1e4976',
                          transform: 'scale(1.1)',
                          boxShadow: selectedControl ? '0 0 8px rgba(0,0,0,0.3)' : 'none'
                        },
                        transition: 'all 0.2s ease'
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, wellId)}
                      onClick={() => handleWellClick(wellId)}
                      onContextMenu={(e) => handleWellRightClick(e, wellId)}
                    >
                      {well.samples.length > 0 && (
                        <Tooltip title={`${well.samples[0].lab_number} - Click to clear`}>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
                            {well.samples[0].lab_number?.slice(-3) || 'S'}
                          </Typography>
                        </Tooltip>
                      )}
                      
                      {well.samples.length > 0 && (
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 16,
                            height: 16,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            clearWell(wellId);
                          }}
                        >
                          <Clear sx={{ fontSize: 10 }} />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Save Dialog */}
      <Dialog open={saveDialog} onClose={() => setSaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save PCR Plate Layout</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Batch Number"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Operator"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            This will save the plate layout with {getPlacedSamplesCount()} samples positioned on the plate.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog(false)}>Cancel</Button>
          <Button onClick={handleSavePlate} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Finalize Batch Dialog */}
      <Dialog open={finalizeDialog} onClose={() => setFinalizeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Finalize Batch {batchNumber}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to finalize this batch? This action will:
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="body2">• Create batch {batchNumber} in the system</Typography>
            <Typography variant="body2">• Save {getPlacedSamplesCount()} sample positions</Typography>
            <Typography variant="body2">• Generate export file for the sequencer</Typography>
            <Typography variant="body2">• Clear the current plate layout</Typography>
          </Stack>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Operator: {operator}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalizeDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleFinalizeBatch} 
            variant="contained" 
            color="success"
            autoFocus
          >
            Finalize Batch
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu for Wells */}
      <Menu
        open={wellContextMenu.open}
        onClose={() => setWellContextMenu({ open: false, wellId: null, anchorEl: null })}
        anchorEl={wellContextMenu.anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <MenuItem 
          onClick={() => {
            addControlToWell(wellContextMenu.wellId, 'negative');
            setWellContextMenu({ open: false, wellId: null, anchorEl: null });
          }}
          disabled={plateData[wellContextMenu.wellId]?.samples.length > 0}
        >
          Add Negative Control
        </MenuItem>
        <MenuItem 
          onClick={() => {
            addControlToWell(wellContextMenu.wellId, 'positive');
            setWellContextMenu({ open: false, wellId: null, anchorEl: null });
          }}
          disabled={plateData[wellContextMenu.wellId]?.samples.length > 0}
        >
          Add Positive Control
        </MenuItem>
        <MenuItem 
          onClick={() => {
            addControlToWell(wellContextMenu.wellId, 'ladder');
            setWellContextMenu({ open: false, wellId: null, anchorEl: null });
          }}
          disabled={plateData[wellContextMenu.wellId]?.samples.length > 0}
        >
          Add Allelic Ladder
        </MenuItem>
        <MenuItem 
          onClick={() => {
            clearWell(wellContextMenu.wellId);
            setWellContextMenu({ open: false, wellId: null, anchorEl: null });
          }}
          disabled={plateData[wellContextMenu.wellId]?.samples.length === 0}
        >
          Clear Well
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
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

export default PCRPlate;