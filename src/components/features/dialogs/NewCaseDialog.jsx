import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  Box,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Science as ScienceIcon } from '@mui/icons-material';
import { useThemeContext } from '../../../contexts/ThemeContext';

const NewCaseDialog = ({ open, onClose, onCaseCreated }) => {
  const { isDarkMode } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [formData, setFormData] = useState({
    caseType: 'paternity',
    priority: 'normal',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async () => {
    if (!formData.caseType) {
      setError('Case type is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/genetic-analysis/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onCaseCreated(data.case);
        handleClose();
      } else {
        const errorMessage = typeof data.error === 'object' 
          ? data.error.message || 'Failed to create case'
          : data.error || 'Failed to create case';
        setError(errorMessage);
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      caseType: 'paternity',
      priority: 'normal',
      notes: ''
    });
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ScienceIcon sx={{ color: '#8EC74F' }} />
          <Typography variant="h6" sx={{ color: isDarkMode ? 'white' : '#0D488F' }}>
            Create New Genetic Analysis Case
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Case Type</InputLabel>
              <Select
                value={formData.caseType}
                onChange={handleInputChange('caseType')}
                label="Case Type"
                sx={{ minHeight: isMobile ? 56 : 'auto' }}
              >
                <MenuItem value="paternity">Paternity Testing</MenuItem>
                <MenuItem value="maternity">Maternity Testing</MenuItem>
                <MenuItem value="siblingship">Siblingship Analysis</MenuItem>
                <MenuItem value="kinship">Kinship Analysis</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={handleInputChange('priority')}
                label="Priority"
                sx={{ minHeight: isMobile ? 56 : 'auto' }}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Case Notes"
              multiline
              rows={4}
              value={formData.notes}
              onChange={handleInputChange('notes')}
              placeholder="Enter any additional information about this case..."
              variant="outlined"
            />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
          size={isMobile ? 'large' : 'medium'}
          sx={{ 
            color: isDarkMode ? 'white' : 'inherit',
            minHeight: isMobile ? 48 : 'auto',
            px: isMobile ? 3 : 'auto'
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          size={isMobile ? 'large' : 'medium'}
          startIcon={loading ? <CircularProgress size={20} /> : <ScienceIcon />}
          sx={{
            backgroundColor: '#8EC74F',
            '&:hover': { backgroundColor: '#6BA23A' },
            minWidth: isMobile ? 140 : 120,
            minHeight: isMobile ? 48 : 'auto',
            px: isMobile ? 3 : 'auto'
          }}
        >
          {loading ? 'Creating...' : 'Create Case'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewCaseDialog;