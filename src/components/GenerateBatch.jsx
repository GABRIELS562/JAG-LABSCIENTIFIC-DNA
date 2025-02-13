import React, { useState } from 'react';
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
  InputLabel
} from '@mui/material';
import { Print, Download, Save, ArrowDownward } from '@mui/icons-material';

const GenerateBatch = () => {
  const [sampleCount, setSampleCount] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [batchData, setBatchData] = useState(null);
  const [selectedWellType, setSelectedWellType] = useState('Sample');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);

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

  const handleWellClick = (position) => {
    setSelectedPosition(position);
    setAnchorEl(event.currentTarget);
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

  const generatePlateLayout = () => {
    const wells = [];
    let sampleIndex = 1;
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    
    const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
    const batchPrefix = `LDS_${batchNumber || '1'}`;

    for (let col of cols) {
      for (let row of rows) {
        const position = `${row}${col}`;
        const kitNumber = generateKitNumber(sampleIndex);
        
        wells.push({
          well: position,
          index: sampleIndex,
          containerName: batchPrefix,
          description: `Full Plate Universal CE setup ${currentDate}`,
          containerType: defaultValues.containerType,
          appType: defaultValues.appType,
          owner: 'LabDNA',
          operator: operator || 'Unknown',
          appServer: 'GeneMapper',
          appInstance: 'GeneMapper_Generic_Instance',
          priority: defaultValues.priority,
          analysisMethod: defaultValues.analysisMethod,
          panel: defaultValues.panel,
          sizeStandard: defaultValues.sizeStandard,
          resultsGroup: defaultValues.resultsGroup,
          instrumentProtocol: defaultValues.instrumentProtocol,
          sampleName: generateSampleName(
            batchPrefix, 
            sampleIndex, 
            position, 
            'Sample', 
            kitNumber
          ),
          sampleType: 'Sample',
          kitNumber: kitNumber,
          userDefined3: '',
          comment: ''
        });
        sampleIndex++;
      }
    }

    return wells;
  };

  const handleGenerate = () => {
    const wells = generatePlateLayout();
    setBatchData(wells);
  };

  const WellPlateVisualization = ({ data }) => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cols = Array.from({ length: 12 }, (_, i) => (i + 1));

    return (
      <Box sx={{ mt: 4, overflow: 'auto' }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Well Type</InputLabel>
            <Select
              value={selectedWellType}
              onChange={(e) => setSelectedWellType(e.target.value)}
              label="Well Type"
            >
              {Object.keys(wellTypes).map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TableContainer component={Paper} elevation={3}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                {cols.map(col => (
                  <TableCell key={col} align="center">
                    {col}
                    <IconButton
                      size="small"
                      onClick={() => handleFillColumn(col)}
                      title={`Fill column ${col} with ${selectedWellType}`}
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row}>
                  <TableCell component="th" scope="row">{row}</TableCell>
                  {cols.map(col => {
                    const position = `${row}${col.toString().padStart(2, '0')}`;
                    const well = data.find(w => w.well === position);
                    return (
                      <TableCell 
                        key={`${row}${col}`}
                        onClick={() => handleWellClick(position)}
                        sx={{ 
                          width: 60, 
                          height: 60,
                          backgroundColor: wellTypes[well?.sampleType || 'Blank'],
                          border: '1px solid rgba(224, 224, 224, 1)',
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                      >
                        <Tooltip title={well ? `${well.sampleName}\n${well.sampleType}` : 'Empty'}>
                          <Box sx={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '0.75rem'
                          }}>
                            {position}
                          </Box>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {Object.keys(wellTypes).map(type => (
            <MenuItem key={type} onClick={() => handleWellTypeSelect(type)}>
              {type}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  };

  // Export functions remain the same
  const exportToStx = (data) => {
    if (!data || data.length === 0) return;

    const headerContent = [
      'Container Name\tDescription\tContainerType\tAppType\tOwner\tOperator',
      `${data[0].containerName}\t${data[0].description}\t${data[0].containerType}\t${data[0].appType}\t${data[0].owner}\t${data[0].operator}`,
      '',
      'AppServer\tAppInstance',
      'GeneMapper\tGeneMapper_Generic_Instance',
      '',
      'Well\tSample Name\tComment\tPriority\tSample Type\tSnp Set\tAnalysis Method\tPanel\tUser-Defined 3\tSize Standard\tUser-Defined 2\tUser-Defined 1\tResults Group 1\tInstrument Protocol 1'
    ].join('\n');

    const wellContent = data
      .filter(well => well.sampleType !== 'Blank')
      .map(well => {
        return [
          well.well,
          well.sampleName,
          well.comment || '',
          well.priority,
          well.sampleType,
          '',  // Snp Set
          well.analysisMethod,
          well.panel,
          well.userDefined3 || '',
          well.sizeStandard,
          '',  // User-Defined 2
          '',  // User-Defined 1
          well.resultsGroup,
          well.instrumentProtocol
        ].join('\t');
      })
      .join('\n');

    const fileContent = `${headerContent}\n${wellContent}`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${data[0].containerName}.stx`);
  };

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
              onClick={() => exportToStx(batchData)}
              disabled={!batchData}
              startIcon={<Save />}
              sx={{ mr: 1 }}
            >
              Export STX
            </Button>
            <IconButton title="Print Layout" disabled={!batchData}>
              <Print />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Batch Number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              helperText="Enter batch number"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              sx={{
                bgcolor: '#1e4976',
                '&:hover': {
                  bgcolor: '#16365b'
                }
              }}
            >
              Generate Plate Layout
            </Button>
          </Grid>
        </Grid>

        {batchData && (
          <>
            <WellPlateVisualization data={batchData} />
            
            <Box sx={{ mt: 4 }}>
              <TableContainer component={Paper} elevation={3}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Well</TableCell>
                      <TableCell>Sample Name</TableCell>
                      <TableCell>Sample Type</TableCell>
                      <TableCell>Kit Number</TableCell>
                      <TableCell>Analysis Method</TableCell>
                      <TableCell>Panel</TableCell>
                      <TableCell>Size Standard</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batchData
                      .filter(well => well.sampleType !== 'Blank')
                      .map((well) => (
                        <TableRow key={well.well}>
                          <TableCell>{well.well}</TableCell>
                          <TableCell>{well.sampleName}</TableCell>
                          <TableCell>{well.sampleType}</TableCell>
                          <TableCell>{well.kitNumber}</TableCell>
                          <TableCell>{well.analysisMethod}</TableCell>
                          <TableCell>{well.panel}</TableCell>
                          <TableCell>{well.sizeStandard}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default GenerateBatch;