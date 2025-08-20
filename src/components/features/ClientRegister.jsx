import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  Snackbar,
  Skeleton,
  LinearProgress,
  Pagination,
  FormGroup,
  useTheme,
  useMediaQuery,
  CardActions,
  Backdrop,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  GetApp,
  Assignment,
  Science,
  PlaylistAdd,
  Group,
  Refresh,
  CloudOff,
  CloudDone,
  Warning,
  Speed,
  TrendingUp,
  Assessment,
  People,
  PhotoCamera,
  Upload,
  CameraAlt,
  Scanner as DocumentScanner,
  AutoFixHigh,
  CheckCircle,
  Error as ErrorIcon,
  ExpandMore,
  Edit,
  Save,
  Cancel
} from '@mui/icons-material';

import { api as optimizedApi } from '../../services/api';

export default function ClientRegister() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isMobile = false; // Temporarily disabled
  const isTablet = false; // Temporarily disabled
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  
  // Dialog state
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [newBatchNumber, setNewBatchNumber] = useState('');
  
  // OCR and Photo Upload state
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('idle'); // idle, processing, completed, error
  const [extractedData, setExtractedData] = useState({});
  const [ocrText, setOcrText] = useState('');
  const [newClientDialogOpen, setNewClientDialogOpen] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    clientName: '',
    contactNumber: '',
    emailAddress: '',
    address: '',
    idNumber: '',
    sampleType: 'buccal_swab',
    relationship: '',
    dateOfBirth: '',
    gender: '',
    additionalNotes: ''
  });
  
  // Workflow status update dialog
  const [statusUpdateDialog, setStatusUpdateDialog] = useState({ open: false, sample: null });
  const [selectedWorkflowStatus, setSelectedWorkflowStatus] = useState('');
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  // Status counts
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    pending: 0,
    pcrBatched: 0,
    electroBatched: 0,
    rerunBatched: 0,
    completed: 0,
    active: 0,
    // Legacy for backward compatibility
    processing: 0
  });

  useEffect(() => {
    fetchSamples();
    fetchStatusCounts();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }, 300); // 300ms debounce for search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        status: statusFilter,
        search: searchTerm
      };
      
      const data = await optimizedApi.getSamples(currentPage, pageSize, filters);
      
      if (data.success) {
        const samplesData = data.data || [];
        setSamples(samplesData);
        
        // Update pagination info
        if (data.meta?.pagination) {
          setTotalPages(data.meta.pagination.totalPages);
          setTotalSamples(data.meta.pagination.total);
        }
        
        setConnectionStatus(true);
        
        if (currentPage === 1) {
          setSnackbar({
            open: true,
            message: `Loaded ${samplesData.length} of ${data.pagination?.total || 0} Peace of Mind samples`,
            severity: 'success'
          });
        }
      } else {
        setError('Failed to fetch samples: ' + (data.error || 'Unknown error'));
        setConnectionStatus(false);
      }
    } catch (error) {
      setError('Error connecting to server: ' + error.message);
      setConnectionStatus(false);
      setSnackbar({
        open: true,
        message: 'Failed to load samples. Check connection.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, searchTerm]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const data = await optimizedApi.getSampleCounts();
      if (data.success) {
        setStatusCounts(data.data);
      }
    } catch (error) {
      console.warn('Failed to fetch status counts:', error);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    optimizedApi.clearCache(); // Clear cache to force fresh data
    await fetchSamples();
    await fetchStatusCounts();
    setIsRefreshing(false);
  };
  
  // OCR and Image Processing Functions
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        setOcrDialogOpen(true);
        processImageWithOCR(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSnackbar({
        open: true,
        message: 'Please select a valid image file',
        severity: 'error'
      });
    }
  };
  
  const processImageWithOCR = async (imageData) => {
    try {
      setOcrStatus('processing');
      setOcrProgress(0);
      
      const result = await Tesseract.recognize(
        imageData,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );
      
      const extractedText = result.data.text;
      setOcrText(extractedText);
      
      // Parse extracted text for form fields
      const parsedData = parseHandwrittenForm(extractedText);
      setExtractedData(parsedData);
      
      setOcrStatus('completed');
      setOcrProgress(100);
      
      setSnackbar({
        open: true,
        message: 'Handwriting successfully recognized! Review and confirm the extracted information.',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('OCR Error:', error);
      setOcrStatus('error');
      setSnackbar({
        open: true,
        message: 'Failed to process handwriting. Please try again with a clearer image.',
        severity: 'error'
      });
    }
  };
  
  const parseHandwrittenForm = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsedData = {};
    
    // Define patterns for different field types
    const patterns = {
      name: /(?:name|client|patient)[:\s]*([a-zA-Z\s]+)/i,
      phone: /(?:phone|contact|tel|mobile)[:\s]*([\d\s\-\(\)\+]+)/i,
      email: /(?:email|e-mail)[:\s]*([\w\.-]+@[\w\.-]+\.\w+)/i,
      address: /(?:address|addr)[:\s]*([^\n]+)/i,
      id: /(?:id|identification|identity)[:\s]*([\d\s\-]+)/i,
      dob: /(?:dob|date of birth|birth)[:\s]*([\d\/\-\.\s]+)/i,
      gender: /(?:gender|sex)[:\s]*(male|female|m|f)/i,
      relationship: /(?:relationship|relation)[:\s]*([a-zA-Z\s]+)/i
    };
    
    // Process each line to extract information
    lines.forEach(line => {
      const cleanLine = line.trim();
      
      // Try to match each pattern
      Object.entries(patterns).forEach(([field, pattern]) => {
        const match = cleanLine.match(pattern);
        if (match && match[1]) {
          let value = match[1].trim();
          
          // Clean up specific field types
          switch (field) {
            case 'phone':
              value = value.replace(/[^\d]/g, ''); // Keep only digits
              if (value.length >= 10) {
                parsedData.contactNumber = value;
              }
              break;
            case 'email':
              if (value.includes('@')) {
                parsedData.emailAddress = value.toLowerCase();
              }
              break;
            case 'name':
              if (value.length > 2) {
                parsedData.clientName = value;
              }
              break;
            case 'id':
              value = value.replace(/[^\d]/g, '');
              if (value.length >= 6) {
                parsedData.idNumber = value;
              }
              break;
            case 'dob':
              // Try to parse date formats
              if (value.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/)) {
                parsedData.dateOfBirth = value;
              }
              break;
            case 'gender':
              if (value.toLowerCase().includes('m') || value.toLowerCase().includes('male')) {
                parsedData.gender = 'male';
              } else if (value.toLowerCase().includes('f') || value.toLowerCase().includes('female')) {
                parsedData.gender = 'female';
              }
              break;
            case 'address':
              if (value.length > 5) {
                parsedData.address = value;
              }
              break;
            case 'relationship':
              if (value.length > 2) {
                parsedData.relationship = value;
              }
              break;
          }
        }
      });
    });
    
    return parsedData;
  };
  
  const applyExtractedData = () => {
    setClientFormData(prev => ({
      ...prev,
      ...extractedData
    }));
    
    setOcrDialogOpen(false);
    setNewClientDialogOpen(true);
    
    setSnackbar({
      open: true,
      message: 'Information applied to form. Please review and submit.',
      severity: 'success'
    });
  };
  
  const handleSubmitNewClient = async () => {
    try {
      // Validate required fields
      if (!clientFormData.clientName || !clientFormData.contactNumber) {
        setSnackbar({
          open: true,
          message: 'Client name and contact number are required',
          severity: 'error'
        });
        return;
      }
      
      // Submit to API
      const response = await optimizedApi.createSample({
        ...clientFormData,
        status: 'pending',
        dateCreated: new Date().toISOString(),
        createdBy: 'OCR_System'
      });
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Client registered successfully!',
          severity: 'success'
        });
        
        setNewClientDialogOpen(false);
        setClientFormData({
          clientName: '',
          contactNumber: '',
          emailAddress: '',
          address: '',
          idNumber: '',
          sampleType: 'buccal_swab',
          relationship: '',
          dateOfBirth: '',
          gender: '',
          additionalNotes: ''
        });
        
        // Refresh the samples list
        await fetchSamples();
        await fetchStatusCounts();
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to register client: ' + error.message,
        severity: 'error'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'active':
        return 'primary';
      case 'processing':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getBatchStatus = (sample) => {
    if (sample.lab_batch_number?.includes('_RR')) {
      return { label: '🔄 Rerun Batched', color: 'error' };
    } else if (sample.lab_batch_number?.startsWith('LDS_')) {
      return { label: '🧬 PCR Batched', color: 'info' };
    } else if (sample.lab_batch_number?.startsWith('ELEC_')) {
      return { label: '⚡ Electro Batched', color: 'secondary' };
    } else if (sample.workflow_status === 'analysis_completed') {
      return { label: '✅ Completed', color: 'success' };
    } else if (sample.workflow_status === 'rerun_batched') {
      return { label: '🔄 Rerun Batched', color: 'error' };
    } else if (sample.batch_id || sample.workflow_status === 'pcr_batched') {
      return { label: '🧬 PCR Batched', color: 'info' };
    } else if (sample.workflow_status === 'electro_batched') {
      return { label: '⚡ Electro Batched', color: 'secondary' };
    } else if (sample.workflow_status === 'sample_collected' || sample.workflow_status === 'pcr_ready') {
      return { label: '📋 Pending', color: 'warning' };
    } else if (sample.workflow_status === 'pcr_completed') {
      return { label: '✓ PCR Complete', color: 'info' };
    } else if (sample.workflow_status === 'electro_ready') {
      return { label: '🗘 Electro Ready', color: 'info' };
    } else if (sample.workflow_status === 'electro_completed') {
      return { label: '⚡ Electro Complete', color: 'secondary' };
    } else if (sample.workflow_status === 'analysis_ready') {
      return { label: '📊 Analysis Ready', color: 'secondary' };
    } else if (sample.workflow_status === 'report_ready') {
      return { label: '📄 Report Ready', color: 'success' };
    } else {
      return { label: 'N/A', color: 'default' };
    }
  };
  
  const getWorkflowSteps = () => [
    { value: 'sample_collected', label: 'Sample Collected', description: 'Initial sample registration' },
    { value: 'pcr_ready', label: 'PCR Ready', description: 'Ready for PCR processing' },
    { value: 'pcr_batched', label: 'PCR Batched', description: 'Assigned to PCR batch' },
    { value: 'pcr_completed', label: 'PCR Completed', description: 'PCR amplification finished' },
    { value: 'electro_ready', label: 'Electrophoresis Ready', description: 'Ready for electrophoresis' },
    { value: 'electro_batched', label: 'Electrophoresis Batched', description: 'Assigned to electrophoresis batch' },
    { value: 'electro_completed', label: 'Electrophoresis Completed', description: 'Fragment separation finished' },
    { value: 'analysis_ready', label: 'Analysis Ready', description: 'Ready for data analysis' },
    { value: 'analysis_completed', label: 'Analysis Completed', description: 'Genetic analysis finished' },
    { value: 'report_ready', label: 'Report Ready', description: 'Ready for report generation' },
    { value: 'rerun_required', label: 'Rerun Required', description: 'Sample needs to be reprocessed' },
    { value: 'rerun_batched', label: 'Rerun Batched', description: 'Assigned to rerun batch' }
  ];
  
  const handleUpdateSampleStatus = (sample) => {
    setStatusUpdateDialog({ open: true, sample });
    setSelectedWorkflowStatus(sample.workflow_status || 'sample_collected');
    setStatusUpdateNotes('');
  };
  
  const handleStatusUpdateSubmit = async () => {
    try {
      const response = await optimizedApi.updateSampleWorkflowStatus(
        [statusUpdateDialog.sample.id], 
        selectedWorkflowStatus,
        statusUpdateNotes
      );
      
      if (response.success) {
        setSamples(prev => prev.map(s => 
          s.id === statusUpdateDialog.sample.id 
            ? { ...s, workflow_status: selectedWorkflowStatus }
            : s
        ));
        
        setSnackbar({
          open: true,
          message: `Status updated to ${getWorkflowSteps().find(step => step.value === selectedWorkflowStatus)?.label}`,
          severity: 'success'
        });
      }
      
      setStatusUpdateDialog({ open: false, sample: null });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update sample status: ' + error.message,
        severity: 'error'
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatLabNumber = (labNumber) => {
    if (!labNumber) return 'N/A';
    // Highlight the relation pattern
    return labNumber;
  };


  // Helper function to get samples from the same case in priority order
  const getCaseSamples = (caseNumber) => {
    if (!caseNumber) return [];
    
    const caseSamples = samples.filter(s => s.case_number === caseNumber);
    
    // Sort by relation priority: child first, then alleged_father, then mother
    const getRelationPriority = (relation) => {
      if (relation.startsWith('child')) return 1; // child(25_002)F -> 1
      if (relation === 'alleged_father') return 2;
      if (relation === 'mother') return 3;
      return 999; // unknown relations last
    };
    
    return caseSamples.sort((a, b) => {
      const aPriority = getRelationPriority(a.relation);
      const bPriority = getRelationPriority(b.relation);
      return aPriority - bPriority;
    });
  };

  const handleSampleSelect = (sample) => {
    setSelectedSamples(prev => {
      const isSelected = prev.some(s => s.id === sample.id);
      
      if (isSelected) {
        // If deselecting, remove all samples from this case
        if (sample.case_number) {
          return prev.filter(s => s.case_number !== sample.case_number);
        } else {
          // If no case number, just remove this sample
          return prev.filter(s => s.id !== sample.id);
        }
      } else {
        // If selecting, add all samples from this case in priority order
        if (sample.case_number) {
          const caseSamples = getCaseSamples(sample.case_number);
          // Remove any existing samples from this case first
          const withoutCase = prev.filter(s => s.case_number !== sample.case_number);
          // Add all case samples in priority order
          return [...withoutCase, ...caseSamples];
        } else {
          // If no case number, just add this sample
          return [...prev, sample];
        }
      }
    });
  };

  const handleSelectAll = () => {
    const availableSamples = samples.filter(s => 
      (s.status === 'pending' || s.status === 'active') && 
      !s.batch_id &&
      (s.workflow_status === 'sample_collected' || s.workflow_status === 'pcr_ready')
    );
    setSelectedSamples(availableSamples);
  };

  const handleDeselectAll = () => {
    setSelectedSamples([]);
  };

  const handleCreateBatch = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    if (selectedSamples.length === 0) {
      setError('Please select samples before creating a batch');
      return;
    }
    
    try {
      
      // Store selected samples in sessionStorage for the PCR Plate page
      sessionStorage.setItem('selectedSamplesForBatch', JSON.stringify(selectedSamples));
      
      
      // Navigate to PCR Plate page
      navigate('/pcr-plate', { replace: true });
      
    } catch (error) {
      setError('Error navigating to PCR plate: ' + error.message);
    }
  };

  const handleBatchAssignment = async () => {
    try {
      // In a real app, this would call the API to assign samples to batch
      const response = await fetch(`${optimizedApi.baseURL}/api/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchNumber: newBatchNumber,
          sampleIds: selectedSamples.map(s => s.id),
          plateName: `pcr batch`,
          operator: 'Current User'
        }),
      });

      if (response.ok) {
        // Update local state
        setSamples(prev => prev.map(sample => {
          if (selectedSamples.some(s => s.id === sample.id)) {
            return { ...sample, batch_id: newBatchNumber, status: 'processing' };
          }
          return sample;
        }));
        
        setSelectedSamples([]);
        setBatchDialogOpen(false);
        setNewBatchNumber('');
      } else {
        throw new Error('Failed to create batch');
      }
    } catch (error) {
      setError('Error assigning samples to batch');
    }
  };

  const getPendingSamples = () => {
    return samples.filter(s => 
      (s.status === 'pending' || s.status === 'active') && 
      !s.batch_id &&
      (s.workflow_status === 'sample_collected' || s.workflow_status === 'pcr_ready')
    );
  };


  // Render samples table without case grouping
  // Mobile-friendly card layout for samples
  const renderMobileSampleCards = () => (
    <Stack spacing={2} sx={{ mt: 3 }}>
      {samples.map(sample => {
        const isSelected = sample.case_number 
          ? selectedSamples.some(s => s.case_number === sample.case_number)
          : selectedSamples.some(s => s.id === sample.id);
        
        return (
          <Card 
            key={sample.id}
            sx={{
              border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
              backgroundColor: isSelected ? '#e3f2fd' : 'inherit',
              '&:hover': {
                boxShadow: 2,
                backgroundColor: isSelected ? '#bbdefb' : '#f5f5f5'
              },
              cursor: 'pointer'
            }}
            onClick={() => handleSampleSelect(sample)}
          >
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {formatLabNumber(sample.lab_number)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {sample.name} {sample.surname}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSampleSelect(sample);
                    }}
                    sx={{
                      color: '#1976d2',
                      '&.Mui-checked': { color: '#1976d2' },
                      p: 0.5
                    }}
                  />
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Relation
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {sample.relation}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Collection Date
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(sample.collection_date)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Status
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                    <Chip 
                      label={getBatchStatus(sample).label} 
                      color={getBatchStatus(sample).color} 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateSampleStatus(sample);
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateSampleStatus(sample);
                      }}
                      sx={{ color: 'primary.main', p: 0.5 }}
                    >
                      <Edit sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Batch Number
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {sample.lab_batch_number || '-'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );

  const renderSamplesTable = () => (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox"></TableCell>
            <TableCell>Lab Number</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Surname</TableCell>
            <TableCell>Relation</TableCell>
            <TableCell>Workflow Status</TableCell>
            <TableCell>Batch Number</TableCell>
            <TableCell>Collection Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {samples.map(sample => {
            // Check if this sample or any sample from its case is selected
            const isSelected = sample.case_number 
              ? selectedSamples.some(s => s.case_number === sample.case_number)
              : selectedSamples.some(s => s.id === sample.id);
            return (
              <TableRow
                key={sample.id}
                hover
                selected={isSelected}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: '#e3f2fd',
                    '&:hover': { backgroundColor: '#bbdefb' },
                  },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleSampleSelect(sample)}
                    sx={{
                      color: '#1976d2',
                      '&.Mui-checked': { color: '#1976d2' },
                    }}
                  />
                </TableCell>
                <TableCell>{formatLabNumber(sample.lab_number)}</TableCell>
                <TableCell>{sample.name}</TableCell>
                <TableCell>{sample.surname}</TableCell>
                <TableCell>{sample.relation}</TableCell>
                <TableCell>
                  <Chip 
                    label={getBatchStatus(sample).label} 
                    color={getBatchStatus(sample).color} 
                    size="small" 
                    onClick={() => handleUpdateSampleStatus(sample)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {sample.lab_batch_number || '-'}
                  </Typography>
                </TableCell>
                <TableCell>{formatDate(sample.collection_date)}</TableCell>
                <TableCell>
                  <Tooltip title="Update Status">
                    <IconButton 
                      size="small" 
                      onClick={() => handleUpdateSampleStatus(sample)}
                      sx={{ color: 'primary.main' }}
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderPagination = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between', 
      alignItems: isMobile ? 'stretch' : 'center', 
      mt: 2, 
      p: 2,
      gap: isMobile ? 2 : 0
    }}>
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ 
          textAlign: isMobile ? 'center' : 'left',
          order: isMobile ? 1 : 0
        }}
      >
        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalSamples)} of {totalSamples} samples
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center', 
        gap: 2,
        order: isMobile ? 0 : 1
      }}>
        <FormControl size="small" fullWidth={isMobile}>
          <InputLabel>Per Page</InputLabel>
          <Select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            label="Per Page"
            sx={{ minWidth: isMobile ? 'auto' : 80 }}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: isMobile ? '100%' : 'auto' }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(event, page) => setCurrentPage(page)}
            color="primary"
            showFirstButton={!isMobile}
            showLastButton={!isMobile}
            size={isMobile ? "small" : "medium"}
            siblingCount={isMobile ? 0 : 1}
            boundaryCount={isMobile ? 1 : 1}
          />
        </Box>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>Loading samples...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Connection Status Bar */}
      {!connectionStatus && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          icon={<CloudOff />}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Retrying...' : 'Retry'}
            </Button>
          }
        >
          Server connection lost. Some features may not work properly.
        </Alert>
      )}

      {/* Loading Progress Bar */}
      {(loading || isRefreshing) && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Header with Status Counts */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ 
              color: isDarkMode ? 'white' : '#0D488F', 
              fontWeight: 'bold' 
            }}>
              Sample Management System
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ISO 17025 Compliant Laboratory Information Management
            </Typography>
            {connectionStatus ? (
              <CloudDone sx={{ color: 'success.main' }} />
            ) : (
              <CloudOff sx={{ color: 'warning.main' }} />
            )}
          </Box>
          
          <Button
            variant="outlined"
            startIcon={isRefreshing ? <CircularProgress size={20} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={isRefreshing}
            sx={{ minWidth: 120 }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {/* Bold Metric Blocks */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #0D488F 0%, #1e4976 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(13, 72, 143, 0.3)'
              },
              transition: 'all 0.3s ease'
            }} onClick={() => setStatusFilter('all')}>
              <People sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {statusCounts.total}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Samples
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(255, 152, 0, 0.3)'
              },
              transition: 'all 0.3s ease'
            }} onClick={() => setStatusFilter('pending')}>
              <Speed sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {statusCounts.pending}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Pending Samples
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(66, 165, 245, 0.3)'
              },
              transition: 'all 0.3s ease'
            }} onClick={() => setStatusFilter('pcr_batched')}>
              <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {statusCounts.pcrBatched || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                PCR Batched
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ 
              textAlign: 'center', 
              p: 3, 
              background: 'linear-gradient(135deg, #8EC74F 0%, #6BA23A 100%)',
              color: 'white',
              borderRadius: 2, 
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(142, 199, 79, 0.3)'
              },
              transition: 'all 0.3s ease'
            }} onClick={() => setStatusFilter('completed')}>
              <Assessment sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {statusCounts.completed || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Completed
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Filter Controls Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Group />}
            onClick={handleSelectAll}
            disabled={samples.length === 0}
          >
            Select All Pending
          </Button>
        </Box>
      </Box>

      {selectedSamples.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1.5 : 2, 
          alignItems: isMobile ? 'stretch' : 'center', 
          flexWrap: isMobile ? 'nowrap' : 'wrap', 
          mb: 3,
          p: isMobile ? 2 : 0,
          backgroundColor: isMobile ? (isDarkMode ? '#1e1e1e' : '#f5f5f5') : 'transparent',
          borderRadius: isMobile ? 2 : 0
        }}>
          {!isMobile && (
            <Chip 
              label={`${selectedSamples.length} selected`} 
              color="primary" 
              variant="outlined"
            />
          )}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontStyle: 'italic',
              textAlign: isMobile ? 'center' : 'left',
              order: isMobile ? -1 : 0
            }}
          >
            💡 Family groups selected together
          </Typography>
          <Button
            variant="contained"
            startIcon={!isMobile && <PlaylistAdd />}
            onClick={handleCreateBatch}
            sx={{ 
              bgcolor: '#0D488F',
              minHeight: isMobile ? 48 : 'auto',
              fontSize: isMobile ? '0.875rem' : 'inherit'
            }}
            disabled={selectedSamples.length === 0}
            fullWidth={isMobile}
          >
            {isMobile ? 
              `Create Batch (${selectedSamples.length})` : 
              `Create PCR Batch (${selectedSamples.length} selected)`
            }
          </Button>
          <Button
            variant="outlined"
            onClick={handleDeselectAll}
            sx={{ 
              minHeight: isMobile ? 48 : 'auto'
            }}
            fullWidth={isMobile}
          >
            Deselect All
          </Button>
          {!isMobile && (
            <Button
              variant="outlined"
              onClick={() => {
                navigate('/pcr-plate');
              }}
              sx={{ ml: 1 }}
            >
              Test Navigation
            </Button>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}


      {/* OCR Photo Upload Section */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DocumentScanner sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                📝 Smart Form Recognition
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload a photo of handwritten forms to automatically extract client information
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              ref={cameraInputRef}
            />
            
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' }}
            >
              Upload Photo
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CameraAlt />}
              onClick={() => cameraInputRef.current?.click()}
              sx={{ borderColor: 'primary.main', color: 'primary.main' }}
            >
              Take Photo
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<PlaylistAdd />}
              onClick={() => setNewClientDialogOpen(true)}
              sx={{ borderColor: 'secondary.main', color: 'secondary.main' }}
            >
              Manual Entry
            </Button>
          </Box>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              💡 <strong>Tip:</strong> Ensure handwriting is clear and well-lit. The system can recognize:
              Name, Phone, Email, Address, ID Number, Date of Birth, Gender, and Relationship.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Filters */}
      <Paper sx={{ p: isMobile ? 2 : 3, mb: 3 }}>
        <Grid container spacing={isMobile ? 2 : 3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              placeholder="Search by lab number, name, or case number..."
              size={isMobile ? "small" : "medium"}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {!isMobile && (
            <Grid item xs={12} md={2}>
              <Stack spacing={1}>
                {/* Removed duplicate Refresh and Select All buttons */}
              </Stack>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Samples Display - Responsive */}
      {isMobile ? renderMobileSampleCards() : renderSamplesTable()}
      {renderPagination()}

      {/* Summary */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {samples.length} of {totalSamples} total samples
        </Typography>
      </Box>

      {/* Batch Creation Dialog */}
      <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Create PCR Batch
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Batch Number"
              value={newBatchNumber}
              onChange={(e) => setNewBatchNumber(e.target.value)}
              sx={{ mb: 3 }}
              helperText="Format: LDS_[number]"
            />
            
            <Typography variant="h6" sx={{ mb: 2 }}>
              Selected Samples ({selectedSamples.length})
            </Typography>
            
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {selectedSamples.map(sample => (
                <Box key={sample.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip 
                    label={sample.lab_number} 
                    size="small" 
                    variant="outlined"
                  />
                  <Typography variant="body2">
                    {sample.name} {sample.surname} ({sample.relation})
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              • Samples with the same case number will be kept together
              • Plate will be named "pcr batch"
              • Batch format: {newBatchNumber}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleBatchAssignment}
            disabled={!newBatchNumber.trim()}
          >
            Create Batch
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog 
        open={statusUpdateDialog.open} 
        onClose={() => setStatusUpdateDialog({ open: false, sample: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Update Sample Status - {statusUpdateDialog.sample?.lab_number}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Current: <strong>{statusUpdateDialog.sample?.name} {statusUpdateDialog.sample?.surname}</strong> ({statusUpdateDialog.sample?.relation})
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Workflow Status</InputLabel>
              <Select
                value={selectedWorkflowStatus}
                onChange={(e) => setSelectedWorkflowStatus(e.target.value)}
                label="Workflow Status"
              >
                {getWorkflowSteps().map((step) => (
                  <MenuItem key={step.value} value={step.value}>
                    <Box>
                      <Typography variant="body1">{step.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (Optional)"
              value={statusUpdateNotes}
              onChange={(e) => setStatusUpdateNotes(e.target.value)}
              placeholder="Add any notes about this status change..."
              helperText="These notes will be recorded in the audit trail"
            />
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>ISO 17025 Compliance:</strong> All status changes are logged with timestamp and operator information for full traceability.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateDialog({ open: false, sample: null })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleStatusUpdateSubmit}
            startIcon={<Save />}
          >
            Update Status
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
}