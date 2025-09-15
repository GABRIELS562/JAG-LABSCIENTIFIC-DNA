import React from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert
} from '@mui/material';
import { Gavel } from '@mui/icons-material';
import SignaturePad from './SignaturePad';

const WitnessSection = ({ 
  witnessData, 
  onWitnessChange, 
  required = false,
  disabled = false 
}) => {
  const handleFieldChange = (field, value) => {
    if (onWitnessChange) {
      onWitnessChange({
        ...witnessData,
        [field]: value
      });
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa', border: '2px solid #ffc107' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Gavel sx={{ mr: 2, color: '#f57c00' }} />
        <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
          Witness Information {required && <span style={{ color: 'red' }}>*</span>}
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          For legal testing, a witness must be present during sample collection and must sign this form. 
          The witness cannot be related to any party being tested.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Witness Full Name"
            value={witnessData?.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            disabled={disabled}
            required={required}
            placeholder="Enter witness full name"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Witness ID Number"
            value={witnessData?.idNumber || ''}
            onChange={(e) => handleFieldChange('idNumber', e.target.value)}
            disabled={disabled}
            required={required}
            placeholder="ID/Passport number"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel>ID Type</InputLabel>
            <Select
              value={witnessData?.idType || ''}
              onChange={(e) => handleFieldChange('idType', e.target.value)}
              label="ID Type"
              required={required}
            >
              <MenuItem value="">Select ID Type</MenuItem>
              <MenuItem value="nationalId">National ID</MenuItem>
              <MenuItem value="passport">Passport</MenuItem>
              <MenuItem value="driversLicense">Driver's License</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Contact Number"
            value={witnessData?.contactNumber || ''}
            onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
            disabled={disabled}
            placeholder="Phone number"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Relationship to Case"
            value={witnessData?.relationship || ''}
            onChange={(e) => handleFieldChange('relationship', e.target.value)}
            disabled={disabled}
            placeholder="e.g., Independent witness, Lab staff, etc."
            helperText="Witness must be independent (not related to any party)"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Witness Date"
            type="date"
            value={witnessData?.witnessDate || new Date().toISOString().split('T')[0]}
            onChange={(e) => handleFieldChange('witnessDate', e.target.value)}
            disabled={disabled}
            required={required}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address"
            multiline
            rows={2}
            value={witnessData?.address || ''}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            disabled={disabled}
            placeholder="Witness address"
          />
        </Grid>
      </Grid>

      {/* Witness Declaration */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Witness Declaration:
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
          "I hereby certify that I witnessed the collection of DNA samples from the above-mentioned individuals. 
          The sample collection was conducted in accordance with proper procedures, and the identity of each 
          participant was verified through photographic identification. I am not related to any of the parties 
          being tested and have no vested interest in the outcome of this test."
        </Typography>
      </Box>

      {/* Witness Signature */}
      <SignaturePad
        person="Witness"
        onSignatureChange={(signature) => handleFieldChange('signature', signature)}
        value={witnessData?.signature}
        required={required}
        legalBinding={true}
        disabled={disabled}
      />
    </Paper>
  );
};

export default WitnessSection;