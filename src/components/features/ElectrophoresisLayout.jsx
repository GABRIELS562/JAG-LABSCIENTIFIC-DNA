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
  ElectricBolt,
  Group,
  Refresh
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || '';

const ElectrophoresisLayout = () => {
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
  const [loadPCRDialog, setLoadPCRDialog] = useState(false);
  const [availablePCRBatches, setAvailablePCRBatches] = useState([]);
  const [dragHoverWell, setDragHoverWell] = useState(null);
  const [dragHoverWells, setDragHoverWells] = useState([]);

  useEffect(() => {
    // Get selected samples from sessionStorage or localStorage
    const storedSamples = sessionStorage.getItem('selectedSamplesForElectrophoresis');
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
        
        // Find the highest ELEC batch number
        let maxNumber = 0;
        existingBatches.forEach(batch => {
          if (batch.batch_number && batch.batch_number.startsWith('ELEC_')) {
            const num = parseInt(batch.batch_number.split('_')[1]);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        });
        
        setBatchNumber(`ELEC_${maxNumber + 1}`);
      } else {
        const timestamp = Date.now().toString().slice(-4);
        setBatchNumber(`ELEC_${timestamp}`);
      }
    } catch (error) {
      const timestamp = Date.now().toString().slice(-4);
      setBatchNumber(`ELEC_${timestamp}`);
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

  const handleDragEnd = (e) => {
    setDraggedItem(null);
    setDragHoverWell(null);
    setDragHoverWells([]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, wellId) => {
    e.preventDefault();
    setDragHoverWell(wellId);
    
    // If dragging a group, show preview of all wells that will be used
    if (draggedItem && draggedItem.samples && Array.isArray(draggedItem.samples)) {
      const samplesCount = draggedItem.samples.length;
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const cols = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      
      const startCol = wellId.slice(1);
      const startRow = wellId[0];
      const startRowIndex = rows.indexOf(startRow);
      
      const previewWells = [];
      for (let i = 0; i < samplesCount; i++) {
        const targetRowIndex = startRowIndex + i;
        if (targetRowIndex < rows.length) {
          const targetWell = `${rows[targetRowIndex]}${startCol}`;
          previewWells.push(targetWell);
        }
      }
      setDragHoverWells(previewWells);
    } else {
      setDragHoverWells([wellId]);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only clear hover if we're actually leaving the well area
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragHoverWell(null);
      setDragHoverWells([]);
    }
  };

  const handleDrop = (e, wellId) => {
    e.preventDefault();
    setDragHoverWell(null);
    setDragHoverWells([]);
    
    if (!draggedItem) return;
    
    if (plateData[wellId].samples.length > 0) {
      setSnackbar({
        open: true,
        message: 'Well is already occupied. Clear it first.',
        severity: 'warning'
      });
      return;
    }
    
    if (draggedItem.samples && Array.isArray(draggedItem.samples)) {
      // Handle group placement
      const samplesCount = draggedItem.samples.length;
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const cols = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      
      const findAvailableWells = (startWell) => {
        const startCol = startWell.slice(1);
        const startRow = startWell[0];
        const colIndex = cols.indexOf(startCol);
        const rowIndex = rows.indexOf(startRow);
        
        const availableWells = [];
        
        for (let i = 0; i < samplesCount; i++) {
          const targetRowIndex = rowIndex + i;
          if (targetRowIndex >= rows.length) break;
          
          const targetWell = `${rows[targetRowIndex]}${startCol}`;
          if (plateData[targetWell].samples.length === 0) {
            availableWells.push(targetWell);
          } else {
            break;
          }
        }
        
        return availableWells.length === samplesCount ? availableWells : null;
      };
      
      const availableWells = findAvailableWells(wellId);
      
      if (!availableWells) {
        setSnackbar({
          open: true,
          message: `No space available for ${samplesCount} consecutive samples. Please clear some wells.`,
          severity: 'error'
        });
        return;
      }
      
      const sortedSamples = [...draggedItem.samples].sort((a, b) => {
        const relationOrder = { 'Child': 0, 'Alleged Father': 1, 'Mother': 2 };
        return (relationOrder[a.relation] || 999) - (relationOrder[b.relation] || 999);
      });
      
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
      // Single sample or control
      const newPlateData = { ...plateData };
      const itemType = draggedItem.controlType ? 'control' : 'sample';
      
      newPlateData[wellId] = {
        ...newPlateData[wellId],
        type: itemType,
        samples: [draggedItem]
      };
      setPlateData(newPlateData);
      
      const itemDescription = draggedItem.controlType 
        ? `${draggedItem.controlType} control` 
        : `sample ${draggedItem.lab_number}`;
      
      setSnackbar({
        open: true,
        message: `Placed ${itemDescription} in well ${wellId}`,
        severity: 'success'
      });
    }
    
    // Clear drag state after successful drop
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

    initializePlate();
    
    const newPlateData = {};
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    
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

    let sampleIndex = 0;
    
    for (let colIndex = 0; colIndex < cols.length && sampleIndex < selectedSamples.length; colIndex++) {
      const col = cols[colIndex];
      
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
      return '#f5f5f5';
    }
    
    switch (well.type) {
      case 'sample':
        return '#f3e5f5'; // Light purple for electrophoresis samples
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
            comment: `Electrophoresis Batch ${batchNumber} - ${wellData.type}`
          };
        }
      });

      const batchData = {
        batchNumber,
        operator,
        wells: transformedWells,
        sampleCount: getPlacedSamplesCount(),
        date: new Date().toISOString().split('T')[0],
        batchType: 'electrophoresis'
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
        sessionStorage.removeItem('selectedSamplesForElectrophoresis');
        setSelectedSamples([]);
        initializePlate();
        await generateBatchNumber();
        setFinalizeDialog(false);
        
        setSnackbar({
          open: true,
          message: `Electrophoresis Batch ${batchNumber} finalized! Redirecting to batch view...`,
          severity: 'success'
        });
        
        // Navigate to electrophoresis batches page after short delay
        setTimeout(() => {
          navigate('/electrophoresis-batches');
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

  const loadPCRBatches = async () => {
    try {
      console.log('🔍 Loading PCR batches...');
      console.log('🌐 API URL:', API_URL);
      const response = await fetch(`${API_URL}/api/batches`);
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 All batches received:', data.data?.length || 0);
        console.log('📊 Raw data:', data);
        
        // Filter for completed PCR batches (those with LDS_ prefix)
        const pcrBatches = (data.data || []).filter(batch => 
          batch.batch_number?.startsWith('LDS_') && batch.status !== 'cancelled'
        );
        console.log('🧪 Filtered PCR batches:', pcrBatches.length);
        console.log('🧪 PCR batches:', pcrBatches);
        
        setAvailablePCRBatches(pcrBatches);
        setLoadPCRDialog(true);
      } else {
        console.error('❌ Failed to load batches:', response.status);
        setSnackbar({
          open: true,
          message: `Failed to load PCR batches: ${response.status}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('❌ Error loading PCR batches:', error);
      console.error('❌ Error details:', error.message);
      setSnackbar({
        open: true,
        message: 'Error loading PCR batches - check connection',
        severity: 'error'
      });
    }
  };

  const loadSamplesFromPCRBatch = async (batch) => {
    try {
      console.log('🔄 Loading samples from PCR batch:', batch.batch_number);
      console.log('📋 Batch plate layout:', batch.plate_layout);
      
      // Get samples from the batch's plate layout
      const samplesFromBatch = [];
      if (batch.plate_layout && typeof batch.plate_layout === 'object') {
        Object.entries(batch.plate_layout).forEach(([wellId, well]) => {
          console.log(`🔍 Processing well ${wellId}:`, well);
          
          if (well.samples && well.samples.length > 0) {
            console.log(`📋 Well ${wellId} has ${well.samples.length} samples:`, well.samples);
            
            // Filter out control samples (keep only actual samples)
            const actualSamples = well.samples.filter(sample => {
              // First check if sample has basic required properties
              if (!sample || typeof sample !== 'object') {
                console.log(`❌ Invalid sample object:`, sample);
                return false;
              }
              
              // Check if it's a control sample
              const hasControlInLabNumber = sample.lab_number && (
                sample.lab_number.includes('CTRL') || 
                sample.lab_number.includes('LADDER') ||
                sample.lab_number.includes('NEG_') ||
                sample.lab_number.includes('POS_') ||
                sample.lab_number === 'NEG_CTRL' ||
                sample.lab_number === 'POS_CTRL' ||
                sample.lab_number === 'ALLELIC_LADDER'
              );
              
              const hasControlInId = sample.id && (
                sample.id === 'neg_control' ||
                sample.id === 'pos_control' ||
                sample.id === 'ladder' ||
                (typeof sample.id === 'string' && (
                  sample.id.includes('control') ||
                  sample.id.includes('ladder')
                ))
              );
              
              const isControl = hasControlInLabNumber || hasControlInId;
              
              console.log(`🧪 Sample ${sample.lab_number || 'NO_LAB_NUMBER'} (id: ${sample.id || 'NO_ID'}) - isControl: ${isControl}`);
              console.log(`   - hasControlInLabNumber: ${hasControlInLabNumber}`);
              console.log(`   - hasControlInId: ${hasControlInId}`);
              console.log(`   - sample object:`, sample);
              
              return !isControl;
            });
            
            console.log(`✅ Adding ${actualSamples.length} actual samples from well ${wellId}`);
            samplesFromBatch.push(...actualSamples);
          } else {
            console.log(`❌ Well ${wellId} has no samples or empty samples array`);
          }
        });
      } else {
        console.log('❌ No plate layout or invalid plate layout structure');
      }
      
      console.log('🧪 Total extracted samples:', samplesFromBatch.length);
      console.log('📝 Sample details:', samplesFromBatch.map(s => ({ id: s.id, lab_number: s.lab_number, name: s.name, surname: s.surname })));
      
      // If no samples were extracted, try a less restrictive approach
      if (samplesFromBatch.length === 0) {
        console.log('⚠️ No samples extracted with filtering, trying without filtering...');
        const allSamplesFromBatch = [];
        
        Object.entries(batch.plate_layout).forEach(([wellId, well]) => {
          if (well.samples && well.samples.length > 0) {
            console.log(`🔄 Adding ALL samples from well ${wellId}:`, well.samples);
            allSamplesFromBatch.push(...well.samples);
          }
        });
        
        console.log('🚨 Total samples without filtering:', allSamplesFromBatch.length);
        
        if (allSamplesFromBatch.length > 0) {
          // Store samples for electrophoresis
          sessionStorage.setItem('selectedSamplesForElectrophoresis', JSON.stringify(allSamplesFromBatch));
          setSelectedSamples(allSamplesFromBatch);
          setLoadPCRDialog(false);
          
          setSnackbar({
            open: true,
            message: `Loaded ${allSamplesFromBatch.length} samples (including controls) from PCR batch ${batch.batch_number}`,
            severity: 'warning'
          });
          return;
        }
      }
      
      // Store samples for electrophoresis
      sessionStorage.setItem('selectedSamplesForElectrophoresis', JSON.stringify(samplesFromBatch));
      setSelectedSamples(samplesFromBatch);
      setLoadPCRDialog(false);
      
      setSnackbar({
        open: true,
        message: `Loaded ${samplesFromBatch.length} samples from PCR batch ${batch.batch_number}`,
        severity: samplesFromBatch.length > 0 ? 'success' : 'warning'
      });
    } catch (error) {
      console.error('❌ Error loading samples from PCR batch:', error);
      setSnackbar({
        open: true,
        message: 'Error loading samples from PCR batch',
        severity: 'error'
      });
    }
  };

  const addControl = (controlType) => {
    // Find the next available well
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    let foundWell = null;
    
    // Start from the end (bottom right) and work backwards to place controls
    outerLoop: for (let colIndex = cols.length - 1; colIndex >= 0; colIndex--) {
      for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex--) {
        const wellId = `${rows[rowIndex]}${cols[colIndex]}`;
        if (plateData[wellId] && plateData[wellId].samples.length === 0) {
          foundWell = wellId;
          break outerLoop;
        }
      }
    }
    
    if (!foundWell) {
      setSnackbar({
        open: true,
        message: 'No empty wells available for controls',
        severity: 'warning'
      });
      return;
    }
    
    let controlSample;
    switch (controlType) {
      case 'negative':
        controlSample = {
          id: `neg_control_${foundWell}`,
          lab_number: 'NEG_CTRL',
          name: 'Negative',
          surname: 'Control',
          relation: 'Control'
        };
        break;
      case 'positive':
        controlSample = {
          id: `pos_control_${foundWell}`,
          lab_number: 'POS_CTRL',
          name: 'Positive',
          surname: 'Control',
          relation: 'Control'
        };
        break;
      case 'ladder':
        controlSample = {
          id: `ladder_${foundWell}`,
          lab_number: 'ALLELIC_LADDER',
          name: 'Allelic',
          surname: 'Ladder',
          relation: 'Control'
        };
        break;
      default:
        return;
    }
    
    const newPlateData = { ...plateData };
    newPlateData[foundWell] = {
      ...newPlateData[foundWell],
      type: 'control',
      samples: [controlSample]
    };
    
    setPlateData(newPlateData);
    
    setSnackbar({
      open: true,
      message: `Added ${controlType} control to well ${foundWell}`,
      severity: 'success'
    });
  };

  const exportPlateLayout = () => {
    const headerRows = [
      'Container Name\tDescription\tContainerType\tAppType\tOwner\tOperator',
      `electrophoresis batch\t${batchNumber}_electro_run\t96-Well\tRegular\tLAB DNA\t${operator}`,
      'AppServer\tAppInstance',
      'ElectrophoresisAnalyzer\tElectrophoresis_1ae27b545c1511deab1400101834f966',
      'Well\tSample Name\tComment\tPriority\tSize Standard\tSnp Set\tUser-Defined 3\tUser-Defined 2\tUser-Defined 1\tPanel\tStudy\tSample Type\tAnalysis Method\tResults Group 1\tInstrument Protocol 1'
    ];

    const wellRows = Object.entries(plateData)
      .filter(([_, well]) => well.samples.length > 0)
      .map(([wellId, well]) => {
        const sample = well.samples[0];
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
      message: 'Electrophoresis plate layout exported successfully',
      severity: 'success'
    });
  };

  const { groups, individual } = groupSamplesByCase(selectedSamples);

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
        <Box>
          <Typography variant="h4" sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>
            ⚡ Electrophoresis Plate Layout
          </Typography>
          <Typography variant="h6" sx={{ color: '#7b1fa2', mt: 1 }}>
            Batch: {batchNumber}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            sx={{ 
              mr: 1,
              bgcolor: '#7b1fa2',
              '&:hover': { bgcolor: '#6a1b9a' }
            }}
            onClick={loadPCRBatches}
          >
            Load PCR Batches
          </Button>
          <Button
            variant="outlined"
            color="info"
            onClick={async () => {
              console.log('🔍 Debug info:');
              console.log('API_URL:', API_URL);
              console.log('Available PCR batches:', availablePCRBatches);
              console.log('Dialog open:', loadPCRDialog);
              console.log('Selected samples:', selectedSamples);
              
              // Test API call
              try {
                const response = await fetch(`${API_URL}/api/batches`);
                const data = await response.json();
                console.log('🧪 Direct API test successful:', data.data?.length || 0);
              } catch (error) {
                console.error('❌ Direct API test failed:', error);
              }
            }}
            sx={{ mr: 1 }}
          >
            Debug Info
          </Button>
          
          {/* Control checkboxes - similar to PCR plate */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mr: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={controlsToAdd.negativeControl}
                  onChange={(e) => setControlsToAdd(prev => ({
                    ...prev,
                    negativeControl: e.target.checked
                  }))}
                  size="small"
                />
              }
              label="Negative Control"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={controlsToAdd.positiveControl}
                  onChange={(e) => setControlsToAdd(prev => ({
                    ...prev,
                    positiveControl: e.target.checked
                  }))}
                  size="small"
                />
              }
              label="Positive Control"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={controlsToAdd.allelicLadder}
                  onChange={(e) => setControlsToAdd(prev => ({
                    ...prev,
                    allelicLadder: e.target.checked
                  }))}
                  size="small"
                />
              }
              label="Allelic Ladder"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
          </Box>
          
          <Button
            variant="contained"
            sx={{ 
              bgcolor: '#7b1fa2',
              '&:hover': { bgcolor: '#6a1b9a' },
              '&:disabled': { bgcolor: '#e0e0e0' }
            }}
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
            sx={{ 
              ml: 1,
              bgcolor: '#388e3c',
              '&:hover': { bgcolor: '#2e7d32' },
              '&:disabled': { bgcolor: '#e0e0e0' }
            }}
            onClick={() => setFinalizeDialog(true)}
            disabled={getPlacedSamplesCount() === 0}
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
              Drag samples or groups to electrophoresis plate positions
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
                onDragEnd={handleDragEnd}
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
                      <Box key={sample.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 0.25 }}>
                        <Chip 
                          label={sample.lab_number} 
                          size="small" 
                          variant="outlined" 
                          sx={{ height: 18, fontSize: '0.65rem' }}
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
                onDragEnd={handleDragEnd}
              >
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                    <DragIndicator sx={{ mr: 0.5, color: 'warning.main', fontSize: 16 }} />
                    <Chip 
                      label={sample.lab_number} 
                      size="small" 
                      variant="outlined" 
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                    <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.7rem' }}>
                      {sample.name} {sample.surname}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Divider sx={{ my: 2 }} />

            {/* Draggable Controls */}
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#7b1fa2', fontWeight: 'bold' }}>
              ⚡ Electrophoresis Controls
            </Typography>
            
            {/* Negative Control */}
            <Card
              sx={{ 
                mb: 0.75, 
                cursor: 'grab',
                bgcolor: '#ffebee',
                '&:hover': { bgcolor: '#ffcdd2' },
                border: '1px solid #f44336'
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, {
                id: 'neg_control_drag',
                lab_number: 'NEG_CTRL',
                name: 'Negative',
                surname: 'Control',
                relation: 'Control',
                controlType: 'negative'
              })}
              onDragEnd={handleDragEnd}
            >
              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                  <DragIndicator sx={{ mr: 0.5, color: 'error.main', fontSize: 16 }} />
                  <Chip 
                    label="NEG_CTRL" 
                    size="small" 
                    variant="outlined" 
                    sx={{ height: 18, fontSize: '0.65rem', borderColor: '#f44336' }}
                  />
                  <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.7rem' }}>
                    Negative Control
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Positive Control */}
            <Card
              sx={{ 
                mb: 0.75, 
                cursor: 'grab',
                bgcolor: '#e8f5e8',
                '&:hover': { bgcolor: '#c8e6c9' },
                border: '1px solid #4caf50'
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, {
                id: 'pos_control_drag',
                lab_number: 'POS_CTRL',
                name: 'Positive',
                surname: 'Control',
                relation: 'Control',
                controlType: 'positive'
              })}
              onDragEnd={handleDragEnd}
            >
              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                  <DragIndicator sx={{ mr: 0.5, color: 'success.main', fontSize: 16 }} />
                  <Chip 
                    label="POS_CTRL" 
                    size="small" 
                    variant="outlined" 
                    sx={{ height: 18, fontSize: '0.65rem', borderColor: '#4caf50' }}
                  />
                  <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.7rem' }}>
                    Positive Control
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Allelic Ladder */}
            <Card
              sx={{ 
                mb: 0.75, 
                cursor: 'grab',
                bgcolor: '#e3f2fd',
                '&:hover': { bgcolor: '#bbdefb' },
                border: '1px solid #2196f3'
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, {
                id: 'ladder_control_drag',
                lab_number: 'ALLELIC_LADDER',
                name: 'Allelic',
                surname: 'Ladder',
                relation: 'Control',
                controlType: 'ladder'
              })}
              onDragEnd={handleDragEnd}
            >
              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                  <DragIndicator sx={{ mr: 0.5, color: 'info.main', fontSize: 16 }} />
                  <Chip 
                    label="LADDER" 
                    size="small" 
                    variant="outlined" 
                    sx={{ height: 18, fontSize: '0.65rem', borderColor: '#2196f3' }}
                  />
                  <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.7rem' }}>
                    Allelic Ladder
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              Placed: {getPlacedSamplesCount()} / {selectedSamples.length} samples
            </Typography>
          </Paper>
        </Grid>

        {/* 96-Well Plate */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: 3,
            border: '3px solid #7b1fa2',
            borderRadius: 2,
            bgcolor: '#fafafa',
            boxShadow: '0 4px 12px rgba(123, 31, 162, 0.2)'
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#7b1fa2', fontWeight: 'bold' }}>
              ⚡ 96-Well Electrophoresis Plate: {batchNumber}
            </Typography>
            
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  {row}
                </Box>
                
                {Array.from({ length: 12 }, (_, i) => {
                  const wellId = `${row}${(i + 1).toString().padStart(2, '0')}`;
                  const well = plateData[wellId];
                  const isHovered = dragHoverWells.includes(wellId);
                  const isValidDrop = isHovered && well.samples.length === 0;
                  
                  return (
                    <Box
                      key={wellId}
                      sx={{
                        position: 'relative',
                        width: 40,
                        height: 40,
                        border: isHovered ? 
                          (isValidDrop ? '3px solid #4caf50' : '3px solid #f44336') : 
                          '2px solid #ddd',
                        borderRadius: '50%',
                        backgroundColor: isHovered ? 
                          (isValidDrop ? '#e8f5e8' : '#ffebee') : 
                          getWellColor(well),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isHovered ? 
                          (isValidDrop ? '0 0 12px rgba(76, 175, 80, 0.6)' : '0 0 12px rgba(244, 67, 54, 0.6)') : 
                          'none',
                        '&:hover': {
                          borderColor: '#1e4976',
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease'
                      }}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, wellId)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, wellId)}
                      onClick={() => clearWell(wellId)}
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

      {/* Load PCR Batches Dialog */}
      <Dialog open={loadPCRDialog} onClose={() => setLoadPCRDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load Samples from PCR Batch</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Select a completed PCR batch to load samples for electrophoresis:
          </Typography>
          
          {/* Debug information */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Debug: Found {availablePCRBatches.length} PCR batches
            </Typography>
          </Alert>
          
          {availablePCRBatches.length === 0 ? (
            <Alert severity="warning">No PCR batches available. Make sure you have created some PCR batches with samples.</Alert>
          ) : (
            <Grid container spacing={2}>
              {availablePCRBatches.map((batch) => (
                <Grid item xs={12} md={6} key={batch.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#f5f5f5' },
                      border: '1px solid #e0e0e0'
                    }} 
                    onClick={() => loadSamplesFromPCRBatch(batch)}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {batch.batch_number}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Operator: {batch.operator || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Samples: {batch.total_samples || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Date: {batch.created_at ? new Date(batch.created_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadPCRDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Finalize Batch Dialog */}
      <Dialog open={finalizeDialog} onClose={() => setFinalizeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Finalize Electrophoresis Batch {batchNumber}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to finalize this electrophoresis batch? This action will:
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="body2">• Create electrophoresis batch {batchNumber} in the system</Typography>
            <Typography variant="body2">• Save {getPlacedSamplesCount()} sample positions</Typography>
            <Typography variant="body2">• Generate export file for the electrophoresis analyzer</Typography>
            <Typography variant="body2">• Clear the current plate layout</Typography>
          </Stack>
          <TextField
            label="Operator Name"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder="Enter operator name"
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Batch Number:</strong> {batchNumber}
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
            disabled={!operator.trim()}
          >
            Finalize Batch
          </Button>
        </DialogActions>
      </Dialog>

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

export default ElectrophoresisLayout;