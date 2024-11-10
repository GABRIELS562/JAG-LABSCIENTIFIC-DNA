import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  Typography,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { validateForm } from '../utils/validationUtils';

// Initial form state
const initialFormState = {
  childLabNo: '',
  childName: '',
  childSurname: '',
  childIdDob: '',
  childCollectionDate: '',
  fatherLabNo: '',
  fatherName: '',
  fatherSurname: '',
  fatherIdDob: '',
  fatherCollectionDate: '',
  submissionDate: new Date().toISOString().split('T')[0],
  motherPresent: 'NO',
  emailContact: '',
  addressArea: '',
  phoneContact: '',
  comments: ''
};

const PaternityTestForm = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Handle form field changes
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prevState => ({
        ...prevState,
        [name]: ''
      }));
    }
  };

  // Generate lab numbers
  const generateLabNumbers = async () => {
    try {
      console.log('Fetching last lab number...');
      const response = await fetch('http://localhost:3001/api/get-last-lab-number');
      console.log('Lab number response:', response.status);
      
      const data = await response.json();
      console.log('Lab number data:', data);
      
      const year = new Date().getFullYear();
      const lastNumber = data.lastNumber || 0;
      const nextNumber = lastNumber + 1;
      
      return {
        childLabNo: `${year}_${nextNumber}`,
        fatherLabNo: `${year}_${nextNumber + 1}`
      };
    } catch (error) {
      console.error('Error generating lab numbers:', error);
      return {
        childLabNo: `${new Date().getFullYear()}_ERR`,
        fatherLabNo: `${new Date().getFullYear()}_ERR`
      };
    }
  };

  // Initialize lab numbers on component mount
  useEffect(() => {
    const initializeLabNumbers = async () => {
      try {
        const { childLabNo, fatherLabNo } = await generateLabNumbers();
        setFormData(prevState => ({
          ...prevState,
          childLabNo,
          fatherLabNo
        }));
      } catch (error) {
        console.error('Error initializing lab numbers:', error);
        setSnackbar({
          open: true,
          message: 'Error generating lab numbers',
          severity: 'error'
        });
      }
    };

    initializeLabNumbers();
  }, []);

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      const { isValid, errors: validationErrors } = validateForm(formData);
      if (!isValid) {
        setErrors(validationErrors);
        setSnackbar({
          open: true,
          message: 'Please correct all errors before submitting',
          severity: 'error'
        });
        return;
      }

      // Prepare request data
      const requestData = {
        childRow: {
          labNo: formData.childLabNo,
          name: formData.childName,
          surname: formData.childSurname,
          idDob: formData.childIdDob,
          relation: 'Child',
          collectionDate: formData.childCollectionDate,
          submissionDate: formData.submissionDate,
          motherPresent: formData.motherPresent,
          emailContact: formData.emailContact,
          addressArea: formData.addressArea,
          phoneContact: formData.phoneContact,
          comments: formData.comments
        },
        fatherRow: {
          labNo: formData.fatherLabNo,
          name: formData.fatherName,
          surname: formData.fatherSurname,
          idDob: formData.fatherIdDob,
          relation: 'Alleged Father',
          collectionDate: formData.fatherCollectionDate,
          submissionDate: formData.submissionDate,
          motherPresent: formData.motherPresent,
          emailContact: formData.emailContact,
          addressArea: formData.addressArea,
          phoneContact: formData.phoneContact,
          comments: formData.comments
        }
      };

      console.log('Submitting data:', JSON.stringify(requestData, null, 2));

      // Submit data
      const response = await fetch('http://localhost:3001/api/submit-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      // Get response text first
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(result.error || 'Server error occurred');
      }

      // Handle success
      if (result.success) {
        // Get new lab numbers
        const newLabNumbers = await generateLabNumbers();
        
        // Reset form with new lab numbers
        setFormData({
          ...initialFormState,
          childLabNo: newLabNumbers.childLabNo,
          fatherLabNo: newLabNumbers.fatherLabNo,
          submissionDate: new Date().toISOString().split('T')[0]
        });

        setSnackbar({
          open: true,
          message: 'Registration submitted successfully!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar(prevState => ({
      ...prevState,
      open: false
    }));
  };

  // Handle form reset
  const handleReset = async () => {
    try {
      const newLabNumbers = await generateLabNumbers();
      setFormData({
        ...initialFormState,
        childLabNo: newLabNumbers.childLabNo,
        fatherLabNo: newLabNumbers.fatherLabNo,
        submissionDate: new Date().toISOString().split('T')[0]
      });
      
      setErrors({});
      setSnackbar({
        open: true,
        message: 'Form has been reset',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error resetting form:', error);
      setSnackbar({
        open: true,
        message: 'Error resetting form',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, color: '#1e4976', fontWeight: 'bold' }}>
          Paternity Test Registration
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Child Details Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#1e4976', mb: 2 }}>
                Child Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Lab No"
                value={formData.childLabNo}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={4.5}>
              <TextField
                fullWidth
                label="Name"
                name="childName"
                value={formData.childName}
                onChange={handleChange}
                error={!!errors.childName}
                helperText={errors.childName}
                required
              />
            </Grid>

            <Grid item xs={12} md={4.5}>
              <TextField
                fullWidth
                label="Surname"
                name="childSurname"
                value={formData.childSurname}
                onChange={handleChange}
                error={!!errors.childSurname}
                helperText={errors.childSurname}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID/DOB"
                name="childIdDob"
                value={formData.childIdDob}
                onChange={handleChange}
                error={!!errors.childIdDob}
                helperText={errors.childIdDob}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Collection Date"
                name="childCollectionDate"
                type="date"
                value={formData.childCollectionDate}
                onChange={handleChange}
                error={!!errors.childCollectionDate}
                helperText={errors.childCollectionDate}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            {/* Father Details Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#1e4976', mb: 2, mt: 2 }}>
                Alleged Father Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Lab No"
                value={formData.fatherLabNo}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={4.5}>
              <TextField
                fullWidth
                label="Name"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                error={!!errors.fatherName}
                helperText={errors.fatherName}
                required
              />
            </Grid>

            <Grid item xs={12} md={4.5}>
              <TextField
                fullWidth
                label="Surname"
                name="fatherSurname"
                value={formData.fatherSurname}
                onChange={handleChange}
                error={!!errors.fatherSurname}
                helperText={errors.fatherSurname}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID/DOB"
                name="fatherIdDob"
                value={formData.fatherIdDob}
                onChange={handleChange}
                error={!!errors.fatherIdDob}
                helperText={errors.fatherIdDob}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Collection Date"
                name="fatherCollectionDate"
                type="date"
                value={formData.fatherCollectionDate}
                onChange={handleChange}
                error={!!errors.fatherCollectionDate}
                helperText={errors.fatherCollectionDate}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            {/* Common Details Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#1e4976', mb: 2, mt: 2 }}>
                Additional Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Submission Date"
                name="submissionDate"
                type="date"
                value={formData.submissionDate}
                onChange={handleChange}
                error={!!errors.submissionDate}
                helperText={errors.submissionDate}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl component="fieldset">
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Mother Present
                </Typography>
                <RadioGroup
                  row
                  name="motherPresent"
                  value={formData.motherPresent}
                  onChange={handleChange}
                >
                  <FormControlLabel value="YES" control={<Radio />} label="Yes" />
                  <FormControlLabel value="NO" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Contact"
                name="emailContact"
                value={formData.emailContact}
                onChange={handleChange}
                error={!!errors.emailContact}
                helperText={errors.emailContact}
                type="email"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Contact"
                name="phoneContact"
                value={formData.phoneContact}
                onChange={handleChange}
                error={!!errors.phoneContact}
                helperText={errors.phoneContact}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Area"
                name="addressArea"
                value={formData.addressArea}
                onChange={handleChange}
                error={!!errors.addressArea}
                helperText={errors.addressArea}
                multiline
                rows={2}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Comments"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>

            {/* Submit Buttons */}
            <Grid item xs={12} sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={isSubmitting}
                sx={{
                  color: '#1e4976',
                  borderColor: '#1e4976',
                  '&:hover': {
                    borderColor: '#16365b',
                    backgroundColor: 'rgba(30, 73, 118, 0.04)',
                  }
                }}
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{
                  bgcolor: '#1e4976',
                  '&:hover': {
                    bgcolor: '#16365b'
                  },
                  minWidth: 120
                }}
              >{isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Submit Registration'
              )}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>

    {/* Success/Error Snackbar */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={6000}
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={handleCloseSnackbar}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  </Box>
);
};

export default PaternityTestForm;