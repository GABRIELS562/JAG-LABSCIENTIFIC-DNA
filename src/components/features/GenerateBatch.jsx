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
import { Print, Download, Save, ArrowDownward, ViewList, ViewModule } from '@mui/icons-material';
import { batchApi } from '../../services/api';
import WellPlateVisualization from './WellPlateVisualization';

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

const GenerateBatch = () => {
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
    setBatchData(prev => {
      const row = wellId[0];
      
      if (selectedWellType === 'Blank') {
        return {
          ...prev,
          [wellId]: {
            ...prev[wellId],
            type: 'Blank',
            label: row // Use row letter for blanks
          }
        };
      }

      if (selectedWellType === 'Sample') {
        // Calculate sample number based on column-first order
        const col = parseInt(wellId.slice(1));
        const rowIndex = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].indexOf(row);
        const sampleNumber = rowIndex + 1 + ((col - 1) * 8);

        return {
          ...prev,
          [wellId]: {
            ...prev[wellId],
            type: 'Sample',
            label: `S${sampleNumber}`
          }
        };
      }

      // For other types (controls)
      return {
        ...prev,
        [wellId]: {
          ...prev[wellId],
          type: selectedWellType,
          label: selectedWellType.charAt(0)
        }
      };
    });
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

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const newBatchData = {};
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
      const totalWells = parseInt(sampleCount) || 96;
      let currentSampleNumber = 1;

      // First, initialize all wells as blank
      for (let row of rows) {
        for (let col of cols) {
          const wellId = `${row}${col}`;
          newBatchData[wellId] = {
            type: 'Blank',
            label: row, // Use row letter as label for blanks
            well: wellId
          };
        }
      }

      // Then fill samples if needed
      if (totalWells > 0) {
        // Start from column 1 and fill down
        for (let col of cols) {
          for (let row of rows) {
            if (currentSampleNumber <= totalWells) {
              const wellId = `${row}${col}`;
              newBatchData[wellId] = {
                type: 'Sample',
                label: `S${currentSampleNumber}`,
                well: wellId
              };
              currentSampleNumber++;
            }
          }
        }
      }

      setBatchData(newBatchData);
      setIsGenerating(false);
    } catch (error) {
      console.error('Error generating batch:', error);
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
      console.error('Export error:', error);
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
      console.error('Template download error:', error);
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
    handleGenerate();
  }, []);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" sx={{ color: '#1e4976', fontWeight: 'bold' }}>
            Generate Batch
          </Typography>
          <Box>
            <Button
              variant="contained"
              onClick={() => exportToPlateFile(batchData, batchNumber)}
              disabled={!batchData}
              startIcon={<Download />}
              sx={{ mr: 1 }}
            >
              Export Plate File
            </Button>
            <IconButton title="Print Layout" disabled={!batchData}>
              <Print />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <PreviewModeToggle />
          <Box>
            <Button
              size="small"
              onClick={() => setPreviewMode(!previewMode)}
              startIcon={previewMode ? <ViewList /> : <ViewModule />}
            >
              {previewMode ? 'Show Details' : 'Show Preview'}
            </Button>
          </Box>
        </Box>

        <TemplateSelector
          selectedTemplate={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
        />

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Batch Number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              error={!!validationErrors.batchNumber}
              helperText={validationErrors.batchNumber || "Enter batch number"}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              error={!!validationErrors.operator}
              helperText={validationErrors.operator}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
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
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={isGenerating}
              sx={{
                bgcolor: '#1e4976',
                '&:hover': {
                  bgcolor: '#16365b'
                }
              }}
            >
              {isGenerating ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Generate Plate Layout'
              )}
            </Button>
          </Grid>
        </Grid>

        {/* Plate Layout */}
        {Object.keys(batchData).length > 0 && (
          <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Plate Layout
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
                disabled={Object.keys(batchData).length === 0}
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
                selectedWells={[]}
              />
            </Box>
          </Paper>
        )}

        {/* Improved Batch Summary */}
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
                        {Object.values(batchData).filter(well => well.type === 'Sample').length}
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
                            .join(', ') || 'None'}
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
      </Paper>
    </Box>
  );
};

export default GenerateBatch;