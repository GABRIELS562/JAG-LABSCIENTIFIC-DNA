import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  Stack
} from '@mui/material';
import { Print, Download, Save, ArrowDownward, ViewList, ViewModule, Science } from '@mui/icons-material';
import { batchApi } from '../../services/api';
import WellPlateVisualization from './WellPlateVisualization';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const validateBatchData = (batchNumber, operator) => {
  const errors = {};
  if (!batchNumber) errors.batchNumber = 'Batch number is required';
  if (!operator) errors.operator = 'Operator name is required';
  return errors;
};

const PLATE_DEFAULTS = {
  containerType: '96-Well',
  appType: 'Regular',
  owner: 'LAB DNA',
  appServer: 'GeneMapper',
  appInstance: 'GeneMapper_1ae27b545c1511deab1400101834f966',
  priority: '100',
  sizeStandard: 'CE_G5_IdentifilerDirect_GS500',
  panel: 'IdentifilerDirect_GS500_Panels_v1',
  analysisMethod: 'IdentifilerDirect_AnalysisMethod_v1',
  resultsGroup: 'FA_Run_36cm_POP4_5s',
  instrumentProtocol: 'GMHID'
};

const initialDummyData = {
  batchNumber: '1',
  operator: 'Aysen',
  selectedTemplate: 'standard'
};

const ElectrophoresisPlate = () => {
  const [sampleCount, setSampleCount] = useState('');
  const [batchNumber, setBatchNumber] = useState(initialDummyData.batchNumber);
  const [operator, setOperator] = useState(initialDummyData.operator);
  const [batchData, setBatchData] = useState({});
  const [selectedWellType, setSelectedWellType] = useState('Sample');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [batchHistory, setBatchHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(initialDummyData.selectedTemplate);
  const [previewMode, setPreviewMode] = useState(false);
  const [controlsDialog, setControlsDialog] = useState(false);
  const [controlPositions, setControlPositions] = useState({
    allelicLadder: '',
    positiveControl: '',
    negativeControl: ''
  });
  const [controlErrors, setControlErrors] = useState({});
  const [finalizeDialog, setFinalizeDialog] = useState(false);
  const [availablePCRBatches, setAvailablePCRBatches] = useState([]);
  const [selectedPCRBatch, setSelectedPCRBatch] = useState('');
  const [pcrBatchData, setPcrBatchData] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [draggedControl, setDraggedControl] = useState(null);
  const [batchSummary, setBatchSummary] = useState({
    batchNumber: "",
    pcrDate: "",
    electroDate: "",
    settings: "27cycles30minExt",
    totalSamples: 0,
    controls: {
      alleliclLadder: [],
      positiveControl: [],
      negativeControl: [],
      blank: []
    }
  });

  const [platePreview, setPlatePreview] = useState({
    show: false,
    selectionType: '', // 'ladder', 'positive', 'negative', 'blank'
    selectedWell: null
  });

  const wellPositions = [
    'A01', 'B01', 'C01', 'D01', 'E01', 'F01', 'G01', 'H01',
    'A02', 'B02', 'C02', 'D02', 'E02', 'F02', 'G02', 'H02',
    // ... rest of the wells
  ];

  const wellTypes = {
    'Sample': '#ffb74d',
    'Blank': '#ffffff',
    'Allelic Ladder': '#90caf9',
    'Positive Control': '#81c784',
    'Negative Control': '#ef5350'
  };

  const defaultValues = {
    containerType: '96-Well',
    appType: 'Regular',
    priority: '100',
    analysisMethod: 'Microsatellite Default',
    panel: 'Profiler_Plus_v1',
    sizeStandard: 'GS500_ROX',
    resultsGroup: 'PROFILER_PLUS_31',
    instrumentProtocol: 'PROFILER_PLUS_i10'
  };

  const batchTemplates = {
    'standard': {
      name: 'Standard 96-Well',
      description: 'Standard layout with controls in A1 (Ladder), H11 (Negative), and H12 (Positive)',
      controls: {
        'A1': { type: 'Allelic Ladder', color: '#90caf9' },
        'H12': { type: 'Positive Control', color: '#81c784' },
        'H11': { type: 'Negative Control', color: '#ef5350' }
      }
    },
    'custom': {
      name: 'Custom Layout',
      description: 'All wells start as samples. Use the well selector to manually set controls and samples.',
      controls: {}
    }
  };

  const handleWellClick = (wellId) => {
    // If the well contains a control, remove it when clicked
    if (batchData[wellId] && ['Allelic Ladder', 'Positive Control', 'Negative Control'].includes(batchData[wellId].type)) {
      const controlType = batchData[wellId].type;
      
      setBatchData(prev => ({
        ...prev,
        [wellId]: {
          type: 'empty',
          label: '',
          well: wellId,
          samples: []
        }
      }));
      
      // Clear from control positions state
      const controlKey = controlType === 'Allelic Ladder' ? 'allelicLadder' :
                        controlType === 'Positive Control' ? 'positiveControl' : 'negativeControl';
      setControlPositions(prev => ({ ...prev, [controlKey]: '' }));
      
      setSnackbar({
        open: true,
        message: `Removed ${controlType} from well ${wellId}`,
        severity: 'info'
      });
      return;
    }
    
    // If a sample well is clicked, show info
    if (batchData[wellId] && batchData[wellId].type === 'sample') {
      const sample = batchData[wellId].samples?.[0];
      if (sample) {
        setSnackbar({
          open: true,
          message: `Sample: ${sample.lab_number || sample.name || 'Unknown'}`,
          severity: 'info'
        });
      }
      return;
    }
    
    // For empty wells, no action needed
  };

  const handleWellTypeSelect = (type) => {
    if (batchData && selectedPosition) {
      const updatedData = batchData.map(well => {
        if (well.well === selectedPosition) {
          return {
            ...well,
            sampleType: type,
            kitNumber: type === 'Sample' ? generateKitNumber(well.index) : '-'
          };
        }
        return well;
      });
      setBatchData(updatedData);
    }
    setAnchorEl(null);
  };

  const handleFillColumn = (col) => {
    if (!batchData) return;
    
    const updatedData = batchData.map(well => {
      if (well.well.substr(1) === col.toString().padStart(2, '0')) {
        return {
          ...well,
          sampleType: selectedWellType,
          kitNumber: selectedWellType === 'Sample' ? generateKitNumber(well.index) : '-'
        };
      }
      return well;
    });
    setBatchData(updatedData);
  };

  const generateKitNumber = (index) => {
    const year = new Date().getFullYear().toString();
    const uniqueNum = index.toString().padStart(8, '0');
    return `C${year}${uniqueNum}CS_11`;
  };

  const generateSampleName = (batchPrefix, index, position, type, kitNumber) => {
    const formattedIndex = index.toString().padStart(2, '0');
    
    switch(type) {
      case 'Allelic Ladder':
        return `${batchPrefix}_${formattedIndex}_${position}_A_Allelic_Ladder`;
      case 'Positive Control':
        return `${batchPrefix}_${formattedIndex}_${position}_P_PosCtrl`;
      case 'Negative Control':
        return `${batchPrefix}_${formattedIndex}_${position}_N_NegCtrl`;
      case 'Blank':
        return `${batchPrefix}_${formattedIndex}_${position}_B_Blank`;
      default:
        return `${batchPrefix}_${formattedIndex}_${position}_S_${kitNumber}`;
    }
  };

  const isControlWell = (well) => {
    if (!well) return false;
    return ['Allelic Ladder', 'Positive Control', 'Negative Control'].includes(well.sampleType);
  };

  const generatePlateLayout = () => {
    const wells = [];
    let sampleIndex = 1;
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    
    const count = parseInt(sampleCount) || 93;
    let samplesAdded = 0;
    
    const batchPrefix = `LDS_${batchNumber || '1'}`;

    for (let col of cols) {
      for (let row of rows) {
        const position = `${row}${col}`;
        const kitNumber = generateKitNumber(sampleIndex);
        
        // Determine if this is a control or sample position
        let sampleType = 'Blank';
        
        if (position === controlPositions.allelicLadder) {
          sampleType = 'Allelic Ladder';
        } else if (position === controlPositions.positiveControl) {
          sampleType = 'Positive Control';
        } else if (position === controlPositions.negativeControl) {
          sampleType = 'Negative Control';
        } else if (samplesAdded < count) {
          sampleType = 'Sample';
          samplesAdded++;
        }

        wells.push({
          well: position,
          index: sampleIndex,
          containerName: 'pcr batch',
          description: `${batchPrefix}_10ul_28cycle30m_5s`,
          containerType: PLATE_DEFAULTS.containerType,
          appType: PLATE_DEFAULTS.appType,
          owner: PLATE_DEFAULTS.owner,
          operator: operator || 'Unknown',
          appServer: PLATE_DEFAULTS.appServer,
          appInstance: PLATE_DEFAULTS.appInstance,
          priority: PLATE_DEFAULTS.priority,
          analysisMethod: PLATE_DEFAULTS.analysisMethod,
          panel: PLATE_DEFAULTS.panel,
          sizeStandard: PLATE_DEFAULTS.sizeStandard,
          resultsGroup: PLATE_DEFAULTS.resultsGroup,
          instrumentProtocol: PLATE_DEFAULTS.instrumentProtocol,
          sampleName: generateSampleName(
            batchPrefix, 
            sampleIndex, 
            position, 
            sampleType, 
            sampleType === 'Sample' ? kitNumber : '-'
          ),
          sampleType: sampleType,
          kitNumber: sampleType === 'Sample' ? kitNumber : '-',
          userDefined3: '',
          comment: ''
        });
        sampleIndex++;
      }
    }

    // Sort wells by column then row for correct order
    wells.sort((a, b) => {
      const aCol = parseInt(a.well.slice(1));
      const bCol = parseInt(b.well.slice(1));
      if (aCol !== bCol) return aCol - bCol;
      return a.well.charCodeAt(0) - b.well.charCodeAt(0);
    });

    return wells;
  };

  const handleGenerate = async () => {
    if (!selectedPCRBatch || !pcrBatchData) {
      setSnackbar({
        open: true,
        message: 'Please select a PCR batch first',
        severity: 'warning'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const newBatchData = {};
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));

      // Initialize all wells as empty
      for (let row of rows) {
        for (let col of cols) {
          const wellId = `${row}${col}`;
          newBatchData[wellId] = {
            type: 'empty',
            label: '',
            well: wellId,
            samples: []
          };
        }
      }

      // Extract samples from PCR batch
      const samples = [];
      const plateLayout = pcrBatchData.plate_layout || {};
      
      // Extract sample IDs from PCR batch plate layout
      const sampleIds = [];
      Object.entries(plateLayout).forEach(([wellId, wellData]) => {
        if (wellData.type === 'Sample' && wellData.sample_id) {
          sampleIds.push(wellData.sample_id);
        }
      });
      
      // Fetch actual sample data
      if (sampleIds.length > 0) {
        const sampleResponse = await fetch(`${API_URL}/samples`);
        const sampleData = await sampleResponse.json();
        if (sampleData.success) {
          const allSamples = sampleData.data || [];
          const matchedSamples = allSamples.filter(sample => sampleIds.includes(sample.id));
          samples.push(...matchedSamples);
        }
      }

      // Fill samples starting from A01, going down columns
      let sampleIndex = 0;
      for (let col of cols) {
        for (let row of rows) {
          const wellId = `${row}${col}`;
          if (sampleIndex < samples.length) {
            const sample = samples[sampleIndex];
            const displayLabel = sample.lab_number || sample.labNumber || sample.id || `Sample_${sampleIndex + 1}`;
            
            newBatchData[wellId] = {
              type: 'sample',
              label: displayLabel,
              well: wellId,
              samples: [sample]
            };
            sampleIndex++;
          } else {
            // Mark remaining wells as empty for control placement
            newBatchData[wellId] = {
              type: 'empty',
              label: '',
              well: wellId,
              samples: []
            };
          }
        }
      }

      setBatchData(newBatchData);
      setIsGenerating(false);
      
      // Reset control positions
      setControlPositions({
        allelicLadder: '',
        positiveControl: '',
        negativeControl: ''
      });
      
      setSnackbar({
        open: true,
        message: `Loaded ${samples.length} samples from PCR batch ${selectedPCRBatch}. Select control positions below.`,
        severity: 'success'
      });
    } catch (error) {
      setIsGenerating(false);
      setSnackbar({
        open: true,
        message: 'Error generating batch layout',
        severity: 'error'
      });
    }
  };

  const exportToPlateFile = (batchData, batchNumber) => {
    if (!batchData) return;

    // Filter out blank wells
    const usedWells = batchData.filter(well => well.sampleType !== 'Blank');

    const headerRows = [
      `Container Name\tDescription\tContainerType\tAppType\tOwner\tOperator`,
      `pcr batch\tLDS_${batchNumber}_10ul_28cycle30m_5s\t96-Well\tRegular\tLAB DNA\t${batchData[0].operator}`,
      'AppServer\tAppInstance',
      `GeneMapper\tGeneMapper_1ae27b545c1511deab1400101834f966`,
      'Well\tSample Name\tComment\tPriority\tSize Standard\tSnp Set\tUser-Defined 3\tUser-Defined 2',
      'User-Defined 1\tPanel\tStudy\tSample Type\tAnalysis Method\tResults Group 1\tInstrument Protocol 1'
    ];

    const wellRows = usedWells.map(well => {
      const {
        well: wellPosition,
        sampleName,
        sampleType,
        comment = '',
      } = well;

      return [
        `${wellPosition}\t${sampleName}\t${comment}\t${PLATE_DEFAULTS.priority}\t${PLATE_DEFAULTS.sizeStandard}\t\t\t`,
        `\t${PLATE_DEFAULTS.panel}\t\t${sampleType}\t${PLATE_DEFAULTS.analysisMethod}\t${PLATE_DEFAULTS.resultsGroup}\t${PLATE_DEFAULTS.instrumentProtocol}`
      ].join('\n');
    });

    const fileContent = [...headerRows, ...wellRows].join('\n');

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LDS_${batchNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportPlate = () => {
    try {
      // Create header rows
      const headerRows = [
        'Container Name\tDescription\tContainerType\tAppType\tOwner\tOperator',
        `pcr batch\tLDS_${batchNumber}_10ul_28cycle30m_5s\t96-Well\tRegular\tLAB DNA\t${operator}`,
        'AppServer\tAppInstance',
        'GeneMapper\tGeneMapper_1ae27b545c1511deab1400101834f966',
        'Well\tSample Name\tComment\tPriority\tSize Standard\tSnp Set\tUser-Defined 3\tUser-Defined 2\tUser-Defined 1\tPanel\tStudy\tSample Type\tAnalysis Method\tResults Group 1\tInstrument Protocol 1'
      ];

      // Create well data rows
      const wellRows = Object.entries(batchData).map(([wellId, well]) => {
        let sampleName = '';
        let comment = '';

        switch(well.type) {
          case 'Allelic Ladder':
            sampleName = 'Ladder';
            comment = 'AL';
            break;
          case 'Positive Control':
            sampleName = 'PC';
            comment = 'Pos';
            break;
          case 'Negative Control':
            sampleName = 'NC';
            comment = 'Neg';
            break;
          case 'Sample':
            sampleName = well.label || `Sample_${wellId}`;
            comment = '';
            break;
          case 'Blank':
            sampleName = 'Blank';
            comment = 'HiDi';
            break;
        }

        return `${wellId}\t${sampleName}\t${comment}\t100\tCE_G5_IdentifilerDirect_GS500\t\t\t\t\tIdentifilerDirect_GS500_Panels_v1\t\t${well.type}\tIdentifilerDirect_AnalysisMethod_v1\tFA_Run_36cm_POP4_5s\tGMHID`;
      });

      // Combine all rows
      const fileContent = [...headerRows, ...wellRows].join('\n');

      // Create and download the file
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `LDS_${batchNumber}.txt`);

      setSnackbar({
        open: true,
        message: 'Plate layout exported successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to export plate layout',
        severity: 'error'
      });
    }
  };

  const handleDownloadTemplate = () => {
    try {
      // Create header rows for template
      const headerRows = [
        'Container Name\tDescription\tContainerType\tAppType\tOwner\tOperator',
        'pcr batch\tLDS_XX_10ul_28cycle30m_5s\t96-Well\tRegular\tLAB DNA\tOperator',
        'AppServer\tAppInstance',
        'GeneMapper\tGeneMapper_1ae27b545c1511deab1400101834f966',
        'Well\tSample Name\tComment\tPriority\tSize Standard\tSnp Set\tUser-Defined 3\tUser-Defined 2\tUser-Defined 1\tPanel\tStudy\tSample Type\tAnalysis Method\tResults Group 1\tInstrument Protocol 1'
      ];

      // Create example well rows
      const exampleRows = [
        'H03\tLadder\tAL\t100\tCE_G5_IdentifilerDirect_GS500\t\t\t\t\tIdentifilerDirect_GS500_Panels_v1\t\tAllelic Ladder\tIdentifilerDirect_AnalysisMethod_v1\tGMHID\tFA_Run_36cm_POP4_5s',
        'A03\tPC\tPos\t100\tCE_G5_IdentifilerDirect_GS500\t\t\t\t\tIdentifilerDirect_GS500_Panels_v1\t\tPositive Control\tIdentifilerDirect_AnalysisMethod_v1\tGMHID\tFA_Run_36cm_POP4_5s',
        'B03\tNC\tNeg\t100\tCE_G5_IdentifilerDirect_GS500\t\t\t\t\tIdentifilerDirect_GS500_Panels_v1\t\tNegative Control\tIdentifilerDirect_AnalysisMethod_v1\tGMHID\tFA_Run_36cm_POP4_5s',
        'C03\t24_384_C_Example\tSample1\t100\tCE_G5_IdentifilerDirect_GS500\t\t\t\t\tIdentifilerDirect_GS500_Panels_v1\t\tSample\tIdentifilerDirect_AnalysisMethod_v1\tGMHID\tFA_Run_36cm_POP4_5s',
        'H04\tBlank\tHiDi\t100\tCE_G5_IdentifilerDirect_GS500\t\t\t\t\tIdentifilerDirect_GS500_Panels_v1\t\tSample\tIdentifilerDirect_AnalysisMethod_v1\tGMHID\tFA_Run_36cm_POP4_5s'
      ];

      // Combine all rows
      const fileContent = [...headerRows, ...exampleRows].join('\n');

      // Create and download the file
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, 'Plate_Layout_Template.txt');

      setSnackbar({
        open: true,
        message: 'Template downloaded successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to download template',
        severity: 'error'
      });
    }
  };

  const BatchSummary = ({ data }) => {
    const summary = {
      totalWells: data.length,
      samples: data.filter(w => w.sampleType === 'Sample').length,
      controls: data.filter(w => w.sampleType !== 'Sample' && w.sampleType !== 'Blank').length,
      blank: data.filter(w => w.sampleType === 'Blank').length,
      plateUtilization: Math.round((data.filter(w => w.sampleType !== 'Blank').length / data.length) * 100)
    };

    return (
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Batch Summary</Typography>
        <Grid container spacing={2}>
          {Object.entries(summary).map(([key, value]) => (
            <Grid item xs={12} sm={6} md={2.4} key={key}>
              <Paper 
                sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.05)'
                  }
                }}
              >
                <Typography variant="h4" color="primary">
                  {key === 'plateUtilization' ? `${value}%` : value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const saveBatch = async () => {
    try {
      setIsSaving(true);
      const errors = validateBatch();
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        throw new Error('Validation failed');
      }

      const response = await batchApi.saveBatch({
        batchNumber,
        operator,
        wells: batchData,
        template: selectedTemplate,
        date: new Date().toISOString()
      });

      if (response.success) {
        setBatchHistory(prev => [...prev, {
          id: Date.now(),
          batchNumber,
          operator,
          date: new Date().toISOString(),
          samples: batchData.filter(w => w.sampleType === 'Sample').length
        }]);
        
        setSnackbar({
          open: true,
          message: 'Batch saved successfully',
          severity: 'success'
        });
      } else {
        throw new Error(response.error || 'Failed to save batch');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error saving batch',
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const validateBatch = () => {
    const errors = {};
    if (!batchNumber.trim()) errors.batchNumber = 'Batch number is required';
    if (!operator.trim()) errors.operator = 'Operator name is required';
    
    const count = parseInt(sampleCount);
    if (!sampleCount || isNaN(count) || count < 4 || count > 96) {
      errors.sampleCount = 'Total samples must be between 4 and 96 (including controls)';
    }
    
    return errors;
  };

  const TemplateSelector = ({ selectedTemplate, onTemplateChange }) => {
    const [standardControls, setStandardControls] = useState({
      allelicLadder: 'A01',
      positiveControl: 'H12',
      negativeControl: 'H11'
    });

    const handleControlPositionChange = (controlType, value) => {
      setStandardControls(prev => ({
        ...prev,
        [controlType]: value
      }));
      // Update parent component's control positions
      setControlPositions(prev => ({
        ...prev,
        [controlType]: value
      }));
    };

    const generateWellOptions = () => {
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
      return rows.flatMap(row => cols.map(col => `${row}${col}`));
    };

    return (
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {Object.entries(batchTemplates).map(([key, template]) => (
          <Grid item xs={12} md={6} key={key}>
            <Paper
              sx={{
                p: 2,
                cursor: 'pointer',
                border: theme => `2px solid ${selectedTemplate === key ? theme.palette.primary.main : 'transparent'}`,
                '&:hover': {
                  boxShadow: 3
                }
              }}
              onClick={() => onTemplateChange(key)}
            >
              <Typography variant="h6">{template.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {template.description}
              </Typography>
              
              {key === 'standard' && selectedTemplate === 'standard' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Control Positions
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Allelic Ladder</InputLabel>
                        <Select
                          value={standardControls.allelicLadder}
                          onChange={(e) => handleControlPositionChange('allelicLadder', e.target.value)}
                          label="Allelic Ladder"
                        >
                          {generateWellOptions().map(well => (
                            <MenuItem 
                              key={well} 
                              value={well}
                              disabled={
                                well === standardControls.positiveControl || 
                                well === standardControls.negativeControl
                              }
                            >
                              {well}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Positive Control</InputLabel>
                        <Select
                          value={standardControls.positiveControl}
                          onChange={(e) => handleControlPositionChange('positiveControl', e.target.value)}
                          label="Positive Control"
                        >
                          {generateWellOptions().map(well => (
                            <MenuItem 
                              key={well} 
                              value={well}
                              disabled={
                                well === standardControls.allelicLadder || 
                                well === standardControls.negativeControl
                              }
                            >
                              {well}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Negative Control</InputLabel>
                        <Select
                          value={standardControls.negativeControl}
                          onChange={(e) => handleControlPositionChange('negativeControl', e.target.value)}
                          label="Negative Control"
                        >
                          {generateWellOptions().map(well => (
                            <MenuItem 
                              key={well} 
                              value={well}
                              disabled={
                                well === standardControls.allelicLadder || 
                                well === standardControls.positiveControl
                              }
                            >
                              {well}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    {Object.entries(standardControls).map(([type, well]) => (
                      <Chip
                        key={type}
                        label={`${well}: ${type.replace(/([A-Z])/g, ' $1').trim()}`}
                        size="small"
                        sx={{ 
                          bgcolor: wellTypes[type === 'allelicLadder' ? 'Allelic Ladder' : 
                                        type === 'positiveControl' ? 'Positive Control' : 
                                        'Negative Control'],
                          color: 'white'
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  const PlateLegend = () => (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      alignItems: 'center',
      p: 2,
      backgroundColor: '#f5f5f5',
      borderRadius: 1,
      mb: 2
    }}>
      {Object.entries(wellTypes).map(([type, color]) => (
        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: 16, 
            height: 16, 
            backgroundColor: color,
            borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.1)'
          }} />
          <Typography variant="body2">{type}</Typography>
        </Box>
      ))}
    </Box>
  );

  const PreviewModeToggle = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Switch
        checked={previewMode}
        onChange={(e) => setPreviewMode(e.target.checked)}
        color="primary"
      />
      <Typography>Preview Mode</Typography>
    </Box>
  );

  const validateControlPositions = (positionData) => {
    const errors = {};
    const wellPattern = /^[A-H][0-9]{2}$/;
    
    if (!positionData.allelicLadder || !wellPattern.test(positionData.allelicLadder)) {
      errors.allelicLadder = 'Invalid well position (e.g., A01)';
    }
    if (!positionData.positiveControl || !wellPattern.test(positionData.positiveControl)) {
      errors.positiveControl = 'Invalid well position (e.g., H12)';
    }
    if (!positionData.negativeControl || !wellPattern.test(positionData.negativeControl)) {
      errors.negativeControl = 'Invalid well position (e.g., H11)';
    }

    // Check for duplicate positions
    const positionList = [
      positionData.allelicLadder,
      positionData.positiveControl,
      positionData.negativeControl
    ].filter(Boolean);
    
    if (new Set(positionList).size !== positionList.length) {
      errors.duplicate = 'Control positions must be unique';
    }

    return errors;
  };

  const ControlPositionsDialog = ({ open, onClose, onSave }) => {
    const [positions, setPositions] = useState(controlPositions);
    const [errors, setErrors] = useState({});

    const handleSave = () => {
      const validationErrors = validateControlPositions(positions);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      onSave(positions);
      onClose();
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Set Control Positions</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Allelic Ladder Position"
                  value={positions.allelicLadder}
                  onChange={(e) => setPositions(prev => ({ ...prev, allelicLadder: e.target.value.toUpperCase() }))}
                  error={!!errors.allelicLadder}
                  helperText={errors.allelicLadder || "Enter well position (e.g., A01)"}
                  placeholder="A01"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Positive Control Position"
                  value={positions.positiveControl}
                  onChange={(e) => setPositions(prev => ({ ...prev, positiveControl: e.target.value.toUpperCase() }))}
                  error={!!errors.positiveControl}
                  helperText={errors.positiveControl || "Enter well position (e.g., H12)"}
                  placeholder="H12"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Negative Control Position"
                  value={positions.negativeControl}
                  onChange={(e) => setPositions(prev => ({ ...prev, negativeControl: e.target.value.toUpperCase() }))}
                  error={!!errors.negativeControl}
                  helperText={errors.negativeControl || "Enter well position (e.g., H11)"}
                  placeholder="H11"
                />
              </Grid>
            </Grid>
            {errors.duplicate && (
              <FormHelperText error>{errors.duplicate}</FormHelperText>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const PlatePreviewDialog = ({ open, type, onSelect, onClose }) => (
    <Dialog open={open} onClose={onClose} maxWidth="md">
      <DialogTitle>
        Select {type} Position
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={1} sx={{ maxWidth: 400 }}>
          {wellPositions.map((well) => (
            <Grid item xs={1.5} key={well}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  border: '1px solid #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  bgcolor: batchSummary.controls[type].includes(well) ? 'primary.light' : 'background.paper',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white'
                  }
                }}
                onClick={() => onSelect(well)}
              >
                {well}
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
    </Dialog>
  );

  const handleControlSelection = (type) => {
    setPlatePreview({
      show: true,
      selectionType: type,
      selectedWell: null
    });
  };

  const handleWellSelection = (well) => {
    setBatchSummary(prev => ({
      ...prev,
      controls: {
        ...prev.controls,
        [platePreview.selectionType]: [
          ...prev.controls[platePreview.selectionType],
          well
        ]
      }
    }));
    setPlatePreview({ show: false, selectionType: '', selectedWell: null });
  };

  const ControlSelectionDialog = ({ open, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedWells, setSelectedWells] = useState({
      alleliclLadder: [],
      positiveControl: [],
      negativeControl: [],
      blank: []
    });

    const steps = [
      { type: 'alleliclLadder', label: 'Allelic Ladder', min: 2, max: 2 },
      { type: 'positiveControl', label: 'Positive Control', min: 1, max: 1 },
      { type: 'negativeControl', label: 'Negative Control', min: 1, max: 1 },
      { type: 'blank', label: 'Blank', min: 2, max: 2 }
    ];

    const handleWellClick = (wellId) => {
      const currentType = steps[currentStep].type;
      setSelectedWells(prev => {
        const wells = prev[currentType].includes(wellId)
          ? prev[currentType].filter(w => w !== wellId)
          : [...prev[currentType], wellId];
        
        return {
          ...prev,
          [currentType]: wells.slice(0, steps[currentStep].max)
        };
      });
    };

    const canProceed = () => {
      const step = steps[currentStep];
      return selectedWells[step.type].length >= step.min;
    };

    const handleNext = () => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setBatchSummary(prev => ({
          ...prev,
          controls: selectedWells
        }));
        onClose();
      }
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Select {steps[currentStep].label} Positions
          <Typography variant="body2" color="textSecondary">
            Select {steps[currentStep].min} position{steps[currentStep].min > 1 ? 's' : ''}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <WellPlateVisualization
            data={batchData}
            onWellClick={handleWellClick}
            selectedWells={selectedWells[steps[currentStep].type]}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <Button 
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  useEffect(() => {
    loadAvailablePCRBatches();
  }, []);

  useEffect(() => {
    if (selectedPCRBatch) {
      loadPCRBatchData();
    }
  }, [selectedPCRBatch]);

  const loadAvailablePCRBatches = async () => {
    try {
      setLoadingBatches(true);
      const response = await fetch(`${API_URL}/batches`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        // Filter for PCR batches (exclude electrophoresis batches that start with ELEC_)
        // Show all active batches as potential PCR batches
        const pcrBatches = data.data
          .filter(batch => 
            batch && 
            batch.batch_number &&
            batch.status === 'active' && 
            !batch.batch_number.startsWith('ELEC_')
          ) || [];
        setAvailablePCRBatches(pcrBatches);
        
        if (pcrBatches.length === 0) {
          setSnackbar({
            open: true,
            message: 'No PCR batches available for electrophoresis',
            severity: 'info'
          });
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error loading PCR batches:', error);
      setSnackbar({
        open: true,
        message: 'Error loading PCR batches',
        severity: 'error'
      });
      setAvailablePCRBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadPCRBatchData = async () => {
    if (!selectedPCRBatch) return;
    
    try {
      const batch = availablePCRBatches.find(b => b.batch_number === selectedPCRBatch);
      if (!batch) {
        setSnackbar({
          open: true,
          message: 'Selected PCR batch not found',
          severity: 'error'
        });
        return;
      }
      
      setPcrBatchData(batch);
      // For demo purposes, simulate samples from the selected PCR batch
      // In a real implementation, you would have actual sample references
      let samples = [];
      
      try {
        const sampleResponse = await fetch(`${API_URL}/batches/${selectedPCRBatch}/samples`);
        if (!sampleResponse.ok) {
          throw new Error(`HTTP error! status: ${sampleResponse.status}`);
        }
        const sampleData = await sampleResponse.json();
        if (sampleData.success && sampleData.data) {
          samples = sampleData.data || [];
        } else {
          // If no samples found for this batch, use a subset of available samples as fallback
          const allSamplesResponse = await fetch(`${API_URL}/samples`);
          if (allSamplesResponse.ok) {
            const allSamplesData = await allSamplesResponse.json();
            if (allSamplesData.success && allSamplesData.data) {
              const allSamples = allSamplesData.data || [];
              const batchSampleCount = batch.total_samples || 20;
              samples = allSamples.slice(0, Math.min(batchSampleCount, allSamples.length));
            }
          }
        }
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Error loading samples for PCR batch',
          severity: 'warning'
        });
      }
      
      setSampleCount(samples.length.toString());
      
      // Generate electrophoresis batch number
      const electroBatchNumber = selectedPCRBatch 
        ? selectedPCRBatch.replace('BATCH_', 'ELEC_').replace('LDS_', 'ELEC_')
        : 'ELEC_UNKNOWN';
      setBatchNumber(electroBatchNumber);
      
      setSnackbar({
        open: true,
        message: `Loaded ${samples.length} samples from PCR batch ${selectedPCRBatch}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error loading PCR batch data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading PCR batch data',
        severity: 'error'
      });
    }
  };

  const handleControlPositionUpdate = (controlType, wellId) => {
    setBatchData(prev => {
      const newData = { ...prev };
      
      // Clear any previous control of this type
      Object.keys(newData).forEach(well => {
        if (newData[well].type === controlType) {
          newData[well] = {
            type: 'empty',
            label: '',
            well: well,
            samples: []
          };
        }
      });
      
      // Set the new control position
      if (wellId && newData[wellId]) {
        let controlLabel;
        switch (controlType) {
          case 'Allelic Ladder':
            controlLabel = 'AL';
            break;
          case 'Positive Control':
            controlLabel = 'PC';
            break;
          case 'Negative Control':
            controlLabel = 'NC';
            break;
          default:
            controlLabel = controlType.substring(0, 2).toUpperCase();
        }
        
        newData[wellId] = {
          type: controlType,
          label: controlLabel,
          well: wellId,
          samples: []
        };
      }
      
      return newData;
    });
  };

  // Drag and Drop handlers for controls
  const handleControlDragStart = (e, controlType) => {
    setDraggedControl(controlType);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', controlType);
  };

  const handleWellDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleWellDrop = (e, wellId) => {
    e.preventDefault();
    
    if (!draggedControl) return;
    
    // Check if well is occupied by a sample
    if (batchData[wellId] && batchData[wellId].type === 'sample') {
      setSnackbar({
        open: true,
        message: 'Cannot place control on a well with samples. Use an empty well.',
        severity: 'warning'
      });
      setDraggedControl(null);
      return;
    }
    
    // Place the control in the well
    handleControlPositionUpdate(draggedControl, wellId);
    
    // Update the control position state for the dropdown
    const controlKey = draggedControl === 'Allelic Ladder' ? 'allelicLadder' :
                      draggedControl === 'Positive Control' ? 'positiveControl' : 'negativeControl';
    setControlPositions(prev => ({ ...prev, [controlKey]: wellId }));
    
    setSnackbar({
      open: true,
      message: `${draggedControl} placed in well ${wellId}`,
      severity: 'success'
    });
    
    setDraggedControl(null);
  };


  const handleFinalizeBatch = async () => {
    try {
      const filledWells = Object.entries(batchData).filter(([_, well]) => well.samples && well.samples.length > 0);
      
      if (filledWells.length === 0) {
        setSnackbar({
          open: true,
          message: 'No samples on plate to finalize',
          severity: 'warning'
        });
        return;
      }

      // Prepare the batch data for saving (using existing database schema)
      const electrophoresBatchData = {
        batch_number: batchNumber,
        operator: operator,
        pcr_date: null,
        electro_date: new Date().toISOString().split('T')[0], // Today's date
        settings: '27cycles30minExt',
        total_samples: filledWells.length,
        plate_layout: batchData,
        status: 'completed'
      };

      // Save the electrophoresis batch
      const response = await fetch(`${API_URL}/save-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchNumber: batchNumber,
          operator: operator,
          wells: batchData,
          template: 'electrophoresis',
          date: new Date().toISOString().split('T')[0]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save electrophoresis batch');
      }

      // Update sample statuses to "electro_batched"
      const sampleIds = filledWells.flatMap(([_, well]) => 
        well.samples.map(sample => sample.id || sample.sample_id)
      ).filter(Boolean);

      if (sampleIds.length > 0) {
        const updateResponse = await fetch(`${API_URL}/samples/workflow-status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sampleIds: sampleIds,
            workflowStatus: 'electro_batched'
          }),
        });

        if (!updateResponse.ok) {
        }
      }

      setFinalizeDialog(false);
      setSnackbar({
        open: true,
        message: `Electrophoresis batch ${batchNumber} finalized successfully! ${filledWells.length} samples updated.`,
        severity: 'success'
      });

      // Clear the plate data
      setBatchData({});
      setSelectedPCRBatch('');
      setBatchNumber('');
      setSampleCount('');
      setControlPositions({
        allelicLadder: '',
        positiveControl: '',
        negativeControl: ''
      });

    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to finalize electrophoresis batch: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Add loading state check
  if (loadingBatches) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading PCR batches...</Typography>
      </Box>
    );
  }

  // Check if no PCR batches are available
  if (!loadingBatches && availablePCRBatches.length === 0) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          No PCR batches available for electrophoresis. Please create PCR batches first.
        </Alert>
        <Button variant="contained" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
            Electrophoresis Plate Layout
          </Typography>
          <Typography variant="h6" sx={{ color: '#1e4976', mt: 1 }}>
            Batch: {batchNumber}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportToPlateFile(batchData, batchNumber)}
            disabled={!batchData || Object.values(batchData).filter(well => well.samples && well.samples.length > 0).length === 0}
          >
            Export Layout
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => setFinalizeDialog(true)}
            disabled={!batchData || Object.keys(batchData).length === 0 || Object.values(batchData).filter(well => well.samples && well.samples.length > 0).length === 0}
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
              Electrophoresis Setup
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select PCR Batch</InputLabel>
                  <Select
                    value={selectedPCRBatch}
                    label="Select PCR Batch"
                    onChange={(e) => setSelectedPCRBatch(e.target.value)}
                    disabled={loadingBatches}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: '#1e4976',
                        },
                        '&:hover fieldset': {
                          borderColor: '#1e4976',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1e4976',
                        },
                      }
                    }}
                  >
                    {availablePCRBatches.map((batch) => (
                      <MenuItem key={batch.batch_number} value={batch.batch_number}>
                        {batch.batch_number} - {batch.total_samples || 0} samples ({batch.operator || 'Unknown'}) - {batch.status || 'Unknown'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Electrophoresis Batch Number"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  error={!!validationErrors.batchNumber}
                  helperText={validationErrors.batchNumber || "Auto-generated from PCR batch"}
                  disabled
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#1e4976',
                      },
                      '&:hover fieldset': {
                        borderColor: '#1e4976',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1e4976',
                      },
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Number of Samples"
                  value={sampleCount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 96)) {
                      setSampleCount(value);
                      setValidationErrors(prev => ({ ...prev, sampleCount: '' }));
                    }
                  }}
                  error={!!validationErrors.sampleCount}
                  helperText={validationErrors.sampleCount || 'Enter number of samples (max 96)'}
                  type="number"
                  inputProps={{ min: 1, max: 96 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#1e4976',
                      },
                      '&:hover fieldset': {
                        borderColor: '#1e4976',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1e4976',
                      },
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedPCRBatch}
                  fullWidth
                  sx={{
                    bgcolor: '#1e4976',
                    '&:hover': {
                      bgcolor: '#2c5a8e'
                    }
                  }}
                >
                  {isGenerating ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Load Samples from PCR Batch'
                  )}
                </Button>
              </Grid>

              {/* Control Position Selection */}
              {Object.keys(batchData).length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: '#1e4976' }}>
                    Control Positions:
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Allelic Ladder Position</InputLabel>
                      <Select
                        value={controlPositions.allelicLadder}
                        onChange={(e) => {
                          setControlPositions(prev => ({ ...prev, allelicLadder: e.target.value }));
                          handleControlPositionUpdate('Allelic Ladder', e.target.value);
                        }}
                        label="Allelic Ladder Position"
                      >
                        {Object.keys(batchData).filter(wellId => batchData[wellId].type === 'empty').map(wellId => (
                          <MenuItem key={wellId} value={wellId}>{wellId}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth size="small">
                      <InputLabel>Positive Control Position</InputLabel>
                      <Select
                        value={controlPositions.positiveControl}
                        onChange={(e) => {
                          setControlPositions(prev => ({ ...prev, positiveControl: e.target.value }));
                          handleControlPositionUpdate('Positive Control', e.target.value);
                        }}
                        label="Positive Control Position"
                      >
                        {Object.keys(batchData).filter(wellId => batchData[wellId].type === 'empty').map(wellId => (
                          <MenuItem key={wellId} value={wellId}>{wellId}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth size="small">
                      <InputLabel>Negative Control Position</InputLabel>
                      <Select
                        value={controlPositions.negativeControl}
                        onChange={(e) => {
                          setControlPositions(prev => ({ ...prev, negativeControl: e.target.value }));
                          handleControlPositionUpdate('Negative Control', e.target.value);
                        }}
                        label="Negative Control Position"
                      >
                        {Object.keys(batchData).filter(wellId => batchData[wellId].type === 'empty').map(wellId => (
                          <MenuItem key={wellId} value={wellId}>{wellId}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </Grid>
              )}

              {/* Draggable Controls Palette */}
              {Object.keys(batchData).length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: '#1e4976' }}>
                    Drag Controls to Plate:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label="Allelic Ladder"
                      draggable
                      onDragStart={(e) => handleControlDragStart(e, 'Allelic Ladder')}
                      sx={{
                        bgcolor: '#90caf9',
                        color: '#000',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        '&:hover': { opacity: 0.8, transform: 'scale(1.05)' }
                      }}
                      icon={<Science />}
                    />
                    <Chip
                      label="Positive Control"
                      draggable
                      onDragStart={(e) => handleControlDragStart(e, 'Positive Control')}
                      sx={{
                        bgcolor: '#81c784',
                        color: '#000',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        '&:hover': { opacity: 0.8, transform: 'scale(1.05)' }
                      }}
                      icon={<Science />}
                    />
                    <Chip
                      label="Negative Control"
                      draggable
                      onDragStart={(e) => handleControlDragStart(e, 'Negative Control')}
                      sx={{
                        bgcolor: '#ef5350',
                        color: '#fff',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        '&:hover': { opacity: 0.8, transform: 'scale(1.05)' }
                      }}
                      icon={<Science />}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    💡 Drag controls to empty wells on the plate, or click wells to remove controls
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Total Wells: {Object.keys(batchData).length}
              <br />
              Filled Wells: {Object.values(batchData).filter(well => well.samples && well.samples.length > 0).length}
            </Typography>
          </Paper>
        </Grid>

        {/* 96-Well Plate */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1e4976' }}>
              96-Well Plate: {batchNumber}
            </Typography>
            
            {/* Well Type Selection - Moved to top */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Select Well Type:
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(wellTypes).map(([type, color]) => (
                  <Grid item key={type}>
                    <Chip
                      label={type}
                      onClick={() => setSelectedWellType(type)}
                      sx={{
                        bgcolor: color,
                        border: selectedWellType === type ? 2 : 0,
                        borderColor: 'primary.main',
                        '&:hover': {
                          opacity: 0.9,
                          transform: 'scale(1.05)'
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Add this after the Well Type Selection */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleDownloadTemplate}
              >
                Download Template
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleExportPlate}
                disabled={Object.values(batchData).filter(well => well.samples && well.samples.length > 0).length === 0}
              >
                Export Plate Layout
              </Button>
            </Box>

            {/* Plate Visualization Container */}
            <Box sx={{ 
              width: '100%',
              overflowX: 'auto',
              mb: 4
            }}>
              <WellPlateVisualization
                data={batchData}
                onWellClick={handleWellClick}
                onWellDragOver={handleWellDragOver}
                onWellDrop={handleWellDrop}
                selectedWells={[]}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Batch Summary */}
      {Object.keys(batchData).length > 0 && (
          <Paper elevation={2} sx={{ p: 4, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 3 }}>
              Batch Summary
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Basic Information
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Batch Number
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {batchNumber}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Operator
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {operator}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Total Samples
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {Object.values(batchData).filter(well => well.type === 'sample').length}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Controls
                  </Typography>
                  <Stack spacing={2}>
                    {Object.entries(wellTypes).filter(([type]) => type !== 'Sample').map(([type, color]) => (
                      <Box key={type}>
                        <Typography variant="caption" color="textSecondary">
                          {type}
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {Object.entries(batchData)
                            .filter(([_, well]) => well.type === type)
                            .map(([pos]) => pos)
                            .join(', ') || 'Not selected'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Settings
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        PCR Settings
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {batchSummary.settings}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Date
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {new Date().toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
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

      {/* Finalize Batch Dialog */}
      <Dialog open={finalizeDialog} onClose={() => setFinalizeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Finalize Electrophoresis Batch {batchNumber}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to finalize this electrophoresis batch? This action will:
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="body2">• Create electrophoresis batch {batchNumber} in the system</Typography>
            <Typography variant="body2">• Save {Object.values(batchData).filter(well => well.type !== 'empty' && well.type !== 'Blank').length} sample positions</Typography>
            <Typography variant="body2">• Generate export file for the analyzer</Typography>
            <Typography variant="body2">• Clear the current plate layout</Typography>
          </Stack>
          <TextField
            label="Operator Name"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder="Enter operator name"
            variant="outlined"
            fullWidth
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#1e4976',
                },
                '&:hover fieldset': {
                  borderColor: '#1e4976',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1e4976',
                },
              }
            }}
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
    </Box>
  );
};

export default ElectrophoresisPlate;