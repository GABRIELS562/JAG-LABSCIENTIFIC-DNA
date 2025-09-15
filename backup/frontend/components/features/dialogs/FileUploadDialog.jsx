import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  LinearProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../../contexts/ThemeContext';

const FileUploadDialog = ({ open, onClose, selectedCase, onUploadComplete }) => {
  const { isDarkMode } = useThemeContext();
  const [files, setFiles] = useState([]);
  const [sampleTypes, setSampleTypes] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelection(droppedFiles);
  }, []);

  const handleFileSelection = (newFiles) => {
    const fsaFiles = newFiles.filter(file => 
      file.name.toLowerCase().endsWith('.fsa')
    );

    if (fsaFiles.length !== newFiles.length) {
      setError('Only .fsa files are allowed for genetic analysis');
      return;
    }

    const validFiles = fsaFiles.filter(file => file.size <= 100 * 1024 * 1024); // 100MB limit

    if (validFiles.length !== fsaFiles.length) {
      setError('Some files exceed the 100MB size limit');
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    setError('');

    // Initialize sample types for new files
    const newSampleTypes = { ...sampleTypes };
    validFiles.forEach(file => {
      if (!newSampleTypes[file.name]) {
        newSampleTypes[file.name] = 'child'; // Default to child
      }
    });
    setSampleTypes(newSampleTypes);
  };

  const handleFileInputChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    handleFileSelection(selectedFiles);
  };

  const handleSampleTypeChange = (fileName, sampleType) => {
    setSampleTypes(prev => ({
      ...prev,
      [fileName]: sampleType
    }));
  };

  const removeFile = (index) => {
    const removedFile = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSampleTypes(prev => {
      const updated = { ...prev };
      delete updated[removedFile.name];
      return updated;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one .fsa file');
      return;
    }

    // Validate that we have required sample types
    const types = Object.values(sampleTypes);
    const hasChild = types.includes('child');
    const hasFather = types.includes('alleged_father');

    if (!hasChild || !hasFather) {
      setError('Paternity testing requires at least one child and one alleged father sample');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('fsaFiles', file);
      });
      
      formData.append('sampleTypes', JSON.stringify(sampleTypes));

      const response = await fetch(`/api/genetic-analysis/cases/${selectedCase.case_id}/samples`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onUploadComplete(data);
        handleClose();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setSampleTypes({});
    setUploadProgress({});
    setError('');
    setUploading(false);
    onClose();
  };

  const getSampleTypeColor = (type) => {
    switch (type) {
      case 'child': return '#8EC74F';
      case 'alleged_father': return '#0D488F';
      case 'mother': return '#ff9800';
      default: return '#666';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: isDarkMode ? 'white' : '#0D488F' }}>
            Upload FSA Files - {selectedCase?.case_id}
          </Typography>
          <Chip 
            label={`${files.length} files selected`}
            color="primary"
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Drag and Drop Zone */}
        <Box
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          sx={{
            border: '2px dashed',
            borderColor: dragOver ? '#8EC74F' : isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
            borderRadius: 2,
            p: 4,
            mb: 3,
            textAlign: 'center',
            backgroundColor: dragOver ? 'rgba(142,199,79,0.1)' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => document.getElementById('file-input').click()}
        >
          <UploadIcon sx={{ fontSize: 48, color: '#8EC74F', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1, color: isDarkMode ? 'white' : 'inherit' }}>
            Drop FSA files here or click to browse
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports: .fsa files from ABI genetic analyzers (max 100MB per file)
          </Typography>
          
          <input
            id="file-input"
            type="file"
            multiple
            accept=".fsa"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </Box>

        {/* File List */}
        {files.length > 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Selected Files ({files.length})
            </Typography>
            
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {files.map((file, index) => (
                <ListItem
                  key={index}
                  sx={{
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                  }}
                >
                  <ListItemIcon>
                    <FileIcon sx={{ color: '#0D488F' }} />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={file.name}
                    secondary={`Size: ${formatFileSize(file.size)}`}
                  />
                  
                  <Box sx={{ mx: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Sample Type</InputLabel>
                      <Select
                        value={sampleTypes[file.name] || 'child'}
                        onChange={(e) => handleSampleTypeChange(file.name, e.target.value)}
                        label="Sample Type"
                      >
                        <MenuItem value="child">Child</MenuItem>
                        <MenuItem value="alleged_father">Alleged Father</MenuItem>
                        <MenuItem value="mother">Mother</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            {/* Sample Type Summary */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Sample Type Summary:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.values(sampleTypes).reduce((acc, type) => {
                  acc[type] = (acc[type] || 0) + 1;
                  return acc;
                }, {}) && Object.entries(
                  Object.values(sampleTypes).reduce((acc, type) => {
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <Chip
                    key={type}
                    label={`${type.replace('_', ' ')}: ${count}`}
                    size="small"
                    sx={{
                      backgroundColor: getSampleTypeColor(type),
                      color: 'white',
                      textTransform: 'capitalize'
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* Upload Progress */}
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Uploading and processing files...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={uploading}
          sx={{ color: isDarkMode ? 'white' : 'inherit' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          startIcon={uploading ? <LinearProgress size={20} /> : <UploadIcon />}
          sx={{
            backgroundColor: '#8EC74F',
            '&:hover': { backgroundColor: '#6BA23A' },
            minWidth: 120
          }}
        >
          {uploading ? 'Uploading...' : `Upload ${files.length} Files`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileUploadDialog;