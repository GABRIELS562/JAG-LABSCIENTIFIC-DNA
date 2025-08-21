import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  MenuItem,
  useTheme,
  CircularProgress,
  LinearProgress,
  Avatar,
  Badge,
  Fab,
  InputAdornment,
  Switch,
  Slider,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import {
  DragIndicator,
  Clear,
  Download,
  ElectricBolt,
  Group,
  Refresh,
  PlayArrow,
  Pause,
  Stop,
  Schedule,
  Timer,
  Analytics,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Assessment,
  Timeline,
  Science,
  Speed,
  Bolt,
  MonitorHeart
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ElectrophoresisLayout = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [plateData, setPlateData] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  const [controlsToAdd, setControlsToAdd] = useState({
    negativeControl: false,
    positiveControl: false
  });
  const [selectedControl, setSelectedControl] = useState(null);
  const [wellContextMenu, setWellContextMenu] = useState({ open: false, wellId: null, anchorEl: null });
  const [loadPCRDialog, setLoadPCRDialog] = useState(false);
  const [availablePCRBatches, setAvailablePCRBatches] = useState([]);
  const [dragHoverWell, setDragHoverWell] = useState(null);
  const [dragHoverWells, setDragHoverWells] = useState([]);
  
  // Enhanced Electrophoresis-specific state
  const [runParameters, setRunParameters] = useState({
    voltage: 15000,
    runTime: 1800, // seconds
    temperature: 60,
    injectionTime: 5,
    polymer: 'POP-4'
  });
  const [runStatus, setRunStatus] = useState('idle'); // idle, running, paused, completed, error
  const [runProgress, setRunProgress] = useState(0);
  const [estimatedRunTime, setEstimatedRunTime] = useState(null);
  const [qualityMetrics, setQualityMetrics] = useState({
    signalIntensity: Math.random() * 100,
    noiseLevel: Math.random() * 50,
    baselineStability: Math.random() * 100
  });
  const [capillaryStatus, setCapillaryStatus] = useState([]);
  const [runPreviewDialog, setRunPreviewDialog] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const initializeComponent = async () => {
      try {
        // Get selected samples from sessionStorage or localStorage
        const storedSamples = sessionStorage.getItem('selectedSamplesForElectrophoresis');
        if (storedSamples && isMounted) {
          setSelectedSamples(JSON.parse(storedSamples));
        }
        
        // Generate next batch number
        if (isMounted) {
          await generateBatchNumber();
          initializePlate();
        }
      } catch (error) {
        console.error('Error initializing Electrophoresis component:', error);
        if (isMounted) {
          setSnackbar({
            open: true,
            message: 'Failed to initialize component',
            severity: 'error'
          });
        }
      }
    };
    
    initializeComponent();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const generateBatchNumber = async () => {
    try {
      const response = await fetch(`${API_URL}/batches`);
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
    if (controlsToAdd.negativeControl || controlsToAdd.positiveControl) {
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

    }

    setPlateData(newPlateData);
    
    setSnackbar({
      open: true,
      message: `Auto-filled ${selectedSamples.length} samples vertically (A1→H1, then A2→H2...)${controlsToAdd.negativeControl || controlsToAdd.positiveControl ? ' with controls' : ''}`,
      severity: 'success'
    });
  };

  const getWellColor = (well) => {
    if (!well || !well.type) {
      return isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5';
    }
    
    switch (well.type) {
      case 'sample':
        return isDarkMode ? '#00796b' : '#e0f2f1'; // Light teal for electrophoresis samples (darker in dark mode)
      case 'control':
        // Different colors for different control types
        if (well.samples && well.samples.length > 0) {
          const sample = well.samples[0];
          if (sample.lab_number === 'NEG_CTRL') {
            return isDarkMode ? '#c62828' : '#ffcdd2'; // Light red for negative control (darker in dark mode)
          } else if (sample.lab_number === 'POS_CTRL') {
            return isDarkMode ? '#2e7d32' : '#c8e6c9'; // Light green for positive control (darker in dark mode)
          }
        }
        return isDarkMode ? '#66bb6a' : '#81c784'; // Default green for controls (darker in dark mode)
      case 'blank':
        return isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
      default:
        return isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5';
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
      
      const response = await fetch(`${API_URL}/generate-batch`, {
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
      // Loading PCR batches
      const response = await fetch(`${API_URL}/batches`);
      // Response received
      
      if (response.ok) {
        const data = await response.json();
        // Batches loaded successfully
        
        // Filter for completed PCR batches (those with JDS_ prefix)
        const pcrBatches = (data.data || []).filter(batch => 
          batch.batch_number?.startsWith('JDS_') && batch.status !== 'cancelled'
        );
        // PCR batches filtered
        
        setAvailablePCRBatches(pcrBatches);
        setLoadPCRDialog(true);
      } else {
        // Failed to load batches
        setSnackbar({
          open: true,
          message: `Failed to load PCR batches: ${response.status}`,
          severity: 'error'
        });
      }
    } catch (error) {
      // Error loading PCR batches
      setSnackbar({
        open: true,
        message: 'Error loading PCR batches - check connection',
        severity: 'error'
      });
    }
  };

  const loadSamplesFromPCRBatch = useCallback(async (batch) => {
    try {
      // Loading samples from PCR batch
      
      // Get samples from the batch's plate layout
      const samplesFromBatch = [];
      if (batch.plate_layout && typeof batch.plate_layout === 'object') {
        Object.entries(batch.plate_layout).forEach(([wellId, well]) => {
          // Processing well
          
          if (well.samples && well.samples.length > 0) {
            // Well has samples
            
            // Filter out control samples (keep only actual samples)
            const actualSamples = well.samples.filter(sample => {
              // First check if sample has basic required properties
              if (!sample || typeof sample !== 'object') {
                // Invalid sample object
                return false;
              }
              
              // Check if it's a control sample
              const hasControlInLabNumber = sample.lab_number && (
                sample.lab_number.includes('CTRL') || 
                sample.lab_number.includes('NEG_') ||
                sample.lab_number.includes('POS_') ||
                sample.lab_number === 'NEG_CTRL' ||
                sample.lab_number === 'POS_CTRL'
              );
              
              const hasControlInId = sample.id && (
                sample.id === 'neg_control' ||
                sample.id === 'pos_control' ||
                (typeof sample.id === 'string' && (
                  sample.id.includes('control')
                ))
              );
              
              const isControl = hasControlInLabNumber || hasControlInId;
              
              // Processing sample
              
              return !isControl;
            });
            
            // Adding actual samples from well
            samplesFromBatch.push(...actualSamples);
          } else {
            // Well has no samples
          }
        });
      } else {
        // No plate layout available
      }
      
      // Total extracted samples loaded
      
      // If no samples were extracted, try a less restrictive approach
      if (samplesFromBatch.length === 0) {
        // No samples found with filtering, trying without filtering
        const allSamplesFromBatch = [];
        
        Object.entries(batch.plate_layout).forEach(([wellId, well]) => {
          if (well.samples && well.samples.length > 0) {
            // Adding all samples from well
            allSamplesFromBatch.push(...well.samples);
          }
        });
        
        // Total samples without filtering loaded
        
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
      // Error loading samples from PCR batch
      setSnackbar({
        open: true,
        message: 'Error loading samples from PCR batch',
        severity: 'error'
      });
    }
  }, []);

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
      '3500GeneticAnalyzer\tElectrophoresis_1ae27b545c1511deab1400101834f966',
      'Well\tSample Name\tComment\tPriority\tSize Standard\tSnp Set\tUser-Defined 3\tUser-Defined 2\tUser-Defined 1\tPanel\tStudy\tSample Type\tAnalysis Method\tResults Group 1\tInstrument Protocol 1'
    ];

    const wellRows = Object.entries(plateData)
      .filter(([_, well]) => well.samples.length > 0)
      .map(([wellId, well]) => {
        const sample = well.samples[0];
        const sampleName = sample.lab_number || `Sample_${wellId}`;
        return `${wellId}\t${sampleName}\t\t100\tGeneScan_LIZ500\t\t\t\t\tIdentifilerPlus_Panels_v1\t\tSample\tIdentifilerPlus_AnalysisMethod_v1\tFA_Run_36cm_POP4_5s\tGMHID`;
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

  // Calculate run time estimation based on parameters - memoized for performance
  const calculatedRunTime = useMemo(() => {
    const sampleCount = Object.values(plateData).filter(well => well.samples?.length > 0).length;
    const baseRunTime = runParameters.runTime;
    return sampleCount > 0 ? Math.round(baseRunTime + (sampleCount * 2)) : baseRunTime;
  }, [plateData, runParameters]);
  
  useEffect(() => {
    setEstimatedRunTime(calculatedRunTime);
  }, [calculatedRunTime]);

  // Initialize capillary status - memoized to prevent unnecessary re-computation
  const initialCapillaryStatus = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      status: 'ready', // ready, running, blocked, maintenance
      signalQuality: Math.random() * 100,
      lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    }));
  }, []);
  
  useEffect(() => {
    setCapillaryStatus(initialCapillaryStatus);
  }, [initialCapillaryStatus]);

  const getCapillaryStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'success';
      case 'running': return 'primary';
      case 'blocked': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const formatRunTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRunStatusIcon = (status) => {
    switch (status) {
      case 'running': return <PlayArrow />;
      case 'paused': return <Pause />;
      case 'completed': return <CheckCircle />;
      case 'error': return <Error />;
      default: return <Schedule />;
    }
  };

  const getRunStatusColor = (status) => {
    switch (status) {
      case 'running': return 'primary';
      case 'paused': return 'warning';
      case 'completed': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  if (!plateData || Object.keys(plateData).length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: isDarkMode ? 'grey.900' : 'grey.50', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading Electrophoresis System...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isDarkMode ? 'grey.900' : 'grey.50', p: 3 }}>
      {/* Enhanced Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: isDarkMode ? 'grey.800' : 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <ElectricBolt sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: isDarkMode ? 'white' : 'primary.main' }}>
                Electrophoresis Control Center
              </Typography>
              <Typography variant="h6" sx={{ color: isDarkMode ? 'grey.300' : 'text.secondary' }}>
                Batch: {batchNumber} | Status: <Chip 
                  icon={getRunStatusIcon(runStatus)}
                  label={runStatus.toUpperCase()}
                  color={getRunStatusColor(runStatus)}
                  size="small"
                  variant="filled"
                />
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {runStatus === 'running' && (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={runProgress} 
                  size={40}
                  sx={{ color: 'primary.main' }}
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {runProgress}%
                </Typography>
              </Box>
            )}
            <Badge badgeContent={getPlacedSamplesCount()} color="primary">
              <Fab size="medium" color="primary" onClick={() => setRunPreviewDialog(true)}>
                <Analytics />
              </Fab>
            </Badge>
          </Box>
        </Box>
        
        {/* Run Progress Bar */}
        {runStatus === 'running' && (
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Run Progress: {formatRunTime(Math.round((runProgress / 100) * estimatedRunTime))} / {formatRunTime(estimatedRunTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ETA: {formatRunTime(estimatedRunTime - Math.round((runProgress / 100) * estimatedRunTime))}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={runProgress}
              sx={{ 
                height: 8, 
                borderRadius: 4,
                bgcolor: isDarkMode ? 'grey.700' : 'grey.200'
              }}
            />
          </Box>
        )}
      </Paper>
      {/* Control Panel */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Sample Loading */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: isDarkMode ? 'grey.800' : 'white' }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Science color="primary" />
              Sample Management
            </Typography>
            <Stack spacing={2}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Science />}
                onClick={loadPCRBatches}
                sx={{ borderRadius: 2 }}
              >
                Load PCR Batches
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Group />}
                onClick={autoFillSamples}
                disabled={selectedSamples.length === 0}
                sx={{ borderRadius: 2 }}
              >
                Auto Fill ({selectedSamples.length} samples)
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={clearAllWells}
                  sx={{ flexGrow: 1, borderRadius: 2 }}
                >
                  Clear All
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={exportPlateLayout}
                  disabled={getPlacedSamplesCount() === 0}
                  sx={{ flexGrow: 1, borderRadius: 2 }}
                >
                  Export
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        
        {/* Run Parameters */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: isDarkMode ? 'grey.800' : 'white' }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Speed color="secondary" />
              Run Parameters
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Voltage: {runParameters.voltage}V
                </Typography>
                <Slider
                  value={runParameters.voltage}
                  onChange={(_, value) => setRunParameters(prev => ({ ...prev, voltage: value }))}
                  min={10000}
                  max={20000}
                  step={500}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Run Time: {formatRunTime(runParameters.runTime)}
                </Typography>
                <Slider
                  value={runParameters.runTime}
                  onChange={(_, value) => setRunParameters(prev => ({ ...prev, runTime: value }))}
                  min={900}
                  max={3600}
                  step={60}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Temperature: {runParameters.temperature}°C
                </Typography>
                <Slider
                  value={runParameters.temperature}
                  onChange={(_, value) => setRunParameters(prev => ({ ...prev, temperature: value }))}
                  min={50}
                  max={70}
                  step={1}
                  size="small"
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        
        {/* Quality Monitoring */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: isDarkMode ? 'grey.800' : 'white' }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Analytics color="success" />
              Quality Metrics
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Signal Intensity:</Typography>
                <Chip 
                  label={`${Math.round(qualityMetrics.signalIntensity)}%`}
                  color={qualityMetrics.signalIntensity > 80 ? 'success' : qualityMetrics.signalIntensity > 60 ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Noise Level:</Typography>
                <Chip 
                  label={`${Math.round(qualityMetrics.noiseLevel)}%`}
                  color={qualityMetrics.noiseLevel < 20 ? 'success' : qualityMetrics.noiseLevel < 40 ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Estimated Time:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {estimatedRunTime ? formatRunTime(estimatedRunTime) : '--:--:--'}
                </Typography>
              </Box>
              <Button
                variant={runStatus === 'running' ? 'outlined' : 'contained'}
                color={runStatus === 'running' ? 'error' : 'success'}
                startIcon={runStatus === 'running' ? <Stop /> : <PlayArrow />}
                disabled={getPlacedSamplesCount() === 0}
                fullWidth
                sx={{ borderRadius: 2 }}
                onClick={() => {
                  if (runStatus === 'running') {
                    setRunStatus('idle');
                    setRunProgress(0);
                  } else {
                    setRunStatus('running');
                    // Simulate run progress
                    const interval = setInterval(() => {
                      setRunProgress(prev => {
                        if (prev >= 100) {
                          clearInterval(interval);
                          setRunStatus('completed');
                          return 100;
                        }
                        return prev + 1;
                      });
                    }, 100);
                  }
                }}
              >
                {runStatus === 'running' ? 'Stop Run' : 'Start Run'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Sample Selection Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDarkMode ? 'white' : '#00796b',
              fontWeight: 'bold'
            }}>
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
                  bgcolor: '#e0f2f1',
                  '&:hover': { bgcolor: '#b2dfdb' },
                  border: '1px solid #00796b'
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
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#00796b', fontWeight: 'bold' }}>
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


            <Divider sx={{ my: 2 }} />
            
            {/* Controls Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: isDarkMode ? 'white' : '#00796b', fontWeight: 'bold' }}>
                Control Options
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Placed: {getPlacedSamplesCount()} / {selectedSamples.length} samples
            </Typography>
          </Paper>
        </Grid>

        {/* 96-Well Plate */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: 3,
            borderRadius: 3,
            bgcolor: isDarkMode ? 'grey.800' : 'white',
            border: `2px solid ${isDarkMode ? 'primary.main' : 'primary.light'}`,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: isDarkMode ? 'white' : 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ElectricBolt />
                3500 Genetic Analyzer - GeneScan LIZ 500: {batchNumber}
              </Typography>
              <Chip 
                label={`${getPlacedSamplesCount()}/96 Wells`}
                color={getPlacedSamplesCount() > 0 ? 'primary' : 'default'}
                variant="filled"
              />
            </Box>
            
            {/* Enhanced Action Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
              <Button
                variant="contained"
                color="success"
                onClick={() => setFinalizeDialog(true)}
                disabled={getPlacedSamplesCount() === 0}
                startIcon={<CheckCircle />}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Finalize Batch ({getPlacedSamplesCount()} samples)
              </Button>
              <Button
                variant="outlined"
                onClick={() => setRunPreviewDialog(true)}
                disabled={getPlacedSamplesCount() === 0}
                startIcon={<Analytics />}
                sx={{ borderRadius: 2 }}
              >
                Run Preview
              </Button>
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

      {/* Run Preview Dialog */}
      <Dialog 
        open={runPreviewDialog} 
        onClose={() => setRunPreviewDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, bgcolor: isDarkMode ? 'grey.900' : 'white' }
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${isDarkMode ? 'grey.700' : 'grey.200'}` }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <Analytics />
            </Avatar>
            <Box>
              <Typography variant="h6">Run Analysis & Preview</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Batch {batchNumber} - Electrophoresis Parameters
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Run Parameters Summary */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: isDarkMode ? 'grey.800' : 'primary.50' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  Run Parameters
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Voltage:</Typography>
                    <Typography variant="body2" fontWeight="bold">{runParameters.voltage}V</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Run Time:</Typography>
                    <Typography variant="body2" fontWeight="bold">{formatRunTime(runParameters.runTime)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Temperature:</Typography>
                    <Typography variant="body2" fontWeight="bold">{runParameters.temperature}°C</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Polymer:</Typography>
                    <Typography variant="body2" fontWeight="bold">{runParameters.polymer}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Estimated Total Time:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {estimatedRunTime ? formatRunTime(estimatedRunTime) : 'Calculating...'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            
            {/* Quality Predictions */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: isDarkMode ? 'grey.800' : 'success.50' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                  Quality Predictions
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Expected Signal Quality:</Typography>
                      <Typography variant="body2" fontWeight="bold">Excellent</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={92} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Noise Level:</Typography>
                      <Typography variant="body2" fontWeight="bold">Low</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={15} color="warning" sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Peak Resolution:</Typography>
                      <Typography variant="body2" fontWeight="bold">High</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={88} color="success" sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            
            {/* Capillary Status */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Capillary Array Status</Typography>
              <Grid container spacing={1}>
                {capillaryStatus.slice(0, 16).map((cap) => (
                  <Grid item xs={1.5} key={cap.id}>
                    <Paper 
                      sx={{ 
                        p: 1, 
                        textAlign: 'center', 
                        borderRadius: 1,
                        bgcolor: getCapillaryStatusColor(cap.status) === 'success' ? 'success.50' : 
                                getCapillaryStatusColor(cap.status) === 'error' ? 'error.50' : 'warning.50'
                      }}
                    >
                      <Typography variant="caption" fontWeight="bold">
                        #{cap.id}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip 
                          label={cap.status}
                          color={getCapillaryStatusColor(cap.status)}
                          size="small"
                          sx={{ fontSize: '0.6rem', height: 16 }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                        {Math.round(cap.signalQuality)}%
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            {/* ISO 17025 Compliance */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>ISO 17025 Compliance Check:</strong> All parameters within validated ranges. 
                  Quality controls included. Chain of custody maintained.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRunPreviewDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<PlayArrow />}
            onClick={() => {
              setRunPreviewDialog(false);
              if (runStatus !== 'running') {
                setRunStatus('running');
                setRunProgress(0);
                // Simulate run progress
                const interval = setInterval(() => {
                  setRunProgress(prev => {
                    if (prev >= 100) {
                      clearInterval(interval);
                      setRunStatus('completed');
                      return 100;
                    }
                    return prev + 2;
                  });
                }, 200);
              }
            }}
            disabled={runStatus === 'running'}
          >
            Start Electrophoresis Run
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ElectrophoresisLayout;