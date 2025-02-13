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
  Switch,
  Divider,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';

// Initial form state with matching fields across all sections
const initialFormState = {
  refKitNumber: '',
  submissionDate: new Date().toISOString().split('T')[0],
  motherPresent: 'NO',
  
  // Mother section
  mother: {
    labNo: '',
    name: '',
    surname: '',
    idDob: '',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: '',
    occupation: '',
    address: '',
    phoneNumber: '',
    email: '',
    idNumber: '',
    idType: '',
    maritalStatus: '',
    ethnicity: '',
    collectionDate: '',
    additionalNotes: ''
  },
  motherNotAvailable: false,

  // Father section
  father: {
    labNo: '',
    name: '',
    surname: '',
    idDob: '',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: '',
    occupation: '',
    address: '',
    phoneNumber: '',
    email: '',
    idNumber: '',
    idType: '',
    maritalStatus: '',
    ethnicity: '',
    collectionDate: '',
    additionalNotes: ''
  },
  fatherNotTested: false,

  // Additional Information section
  additionalInfo: {
    labNo: '',
    name: '',
    surname: '',
    idDob: '',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: '',
    occupation: '',
    address: '',
    phoneNumber: '',
    email: '',
    idNumber: '',
    idType: '',
    maritalStatus: '',
    ethnicity: '',
    collectionDate: '',
    additionalNotes: ''
  },
  additionalInfoNotAvailable: false,
  
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

  const handleChange = (section, field, value) => {
    setFormData(prevState => ({
      ...prevState,
      [section]: {
        ...prevState[section],
        [field]: value
      }
    }));
    
    if (errors[`${section}.${field}`]) {
      setErrors(prevState => ({
        ...prevState,
        [`${section}.${field}`]: ''
      }));
    }
  };

  const handleTopLevelChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prevState => ({
        ...prevState,
        [name]: ''
      }));
    }
  };

  // Handle section availability toggles
  const handleSectionToggle = (section) => {
    setFormData(prevState => ({
      ...prevState,
      [`${section}NotAvailable`]: !prevState[`${section}NotAvailable`],
      [section]: prevState[`${section}NotAvailable`] ? 
        { ...initialFormState[section] } : 
        { ...prevState[section], name: '', surname: '', idDob: '', dateOfBirth: '', collectionDate: '' }
    }));
  };

  // Handle father not tested switch (keeping original functionality)
  const handleFatherNotTestedChange = () => {
    setFormData(prevState => ({
      ...prevState,
      fatherNotTested: !prevState.fatherNotTested,
      father: prevState.fatherNotTested ? 
        { ...initialFormState.father } : 
        { ...prevState.father, name: '', surname: '', idDob: '', dateOfBirth: '', collectionDate: '' }
    }));
  };

  const generateLabNumbers = async () => {
    try {
      const year = new Date().getFullYear();
      return {
        motherLabNo: `${year}_001`,
        fatherLabNo: `${year}_002`,
        additionalInfoLabNo: `${year}_003`
      };
    } catch (error) {
      console.error('Error generating lab numbers:', error);
      return {
        motherLabNo: `${new Date().getFullYear()}_ERR`,
        fatherLabNo: `${new Date().getFullYear()}_ERR`,
        additionalInfoLabNo: `${new Date().getFullYear()}_ERR`
      };
    }
  };

  useEffect(() => {
    const initializeLabNumbers = async () => {
      try {
        const { motherLabNo, fatherLabNo, additionalInfoLabNo } = await generateLabNumbers();
        setFormData(prevState => ({
          ...prevState,
          mother: { ...prevState.mother, labNo: motherLabNo },
          father: { ...prevState.father, labNo: fatherLabNo },
          additionalInfo: { ...prevState.additionalInfo, labNo: additionalInfoLabNo }
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

  const renderSection = (title, section, disabled = false) => {
    return (
      <>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#1e4976', mb: 2, mt: 2 }}>
              {title}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`]}
                  onChange={() => section === 'father' ? handleFatherNotTestedChange() : handleSectionToggle(section)}
                  name={`${section}NotAvailable`}
                />
              }
              label={section === 'father' ? "NOT TESTED" : "NOT AVAILABLE"}
            />
          </Box>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Lab No"
            value={formData[section].labNo}
            disabled
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Name"
            value={formData[section].name}
            onChange={(e) => handleChange(section, 'name', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
            required
          />
        </Grid>

        {/* Continue with all other fields, adding the disabled check */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Surname"
            value={formData[section].surname}
            onChange={(e) => handleChange(section, 'surname', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="ID/DOB"
            value={formData[section].idDob}
            onChange={(e) => handleChange(section, 'idDob', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Date of Birth"
            type="date"
            value={formData[section].dateOfBirth}
            onChange={(e) => handleChange(section, 'dateOfBirth', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Place of Birth"
            value={formData[section].placeOfBirth}
            onChange={(e) => handleChange(section, 'placeOfBirth', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Nationality"
            value={formData[section].nationality}
            onChange={(e) => handleChange(section, 'nationality', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Occupation"
            value={formData[section].occupation}
            onChange={(e) => handleChange(section, 'occupation', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Address"
            value={formData[section].address}
            onChange={(e) => handleChange(section, 'address', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            value={formData[section].phoneNumber}
            onChange={(e) => handleChange(section, 'phoneNumber', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData[section].email}
            onChange={(e) => handleChange(section, 'email', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="ID Number"
            value={formData[section].idNumber}
            onChange={(e) => handleChange(section, 'idNumber', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="ID Type"
            value={formData[section].idType}
            onChange={(e) => handleChange(section, 'idType', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
            select
            SelectProps={{ native: true }}
          >
            <option value="">Select ID Type</option>
            <option value="passport">Passport</option>
            <option value="nationalId">National ID</option>
            <option value="driversLicense">Driver's License</option>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Marital Status"
            value={formData[section].maritalStatus}
            onChange={(e) => handleChange(section, 'maritalStatus', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
            select
            SelectProps={{ native: true }}
          >
            <option value="">Select Marital Status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Ethnicity"
            value={formData[section].ethnicity}
            onChange={(e) => handleChange(section, 'ethnicity', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Collection Date"
            type="date"
            value={formData[section].collectionDate}
            onChange={(e) => handleChange(section, 'collectionDate', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Additional Notes"
            value={formData[section].additionalNotes}
            onChange={(e) => handleChange(section, 'additionalNotes', e.target.value)}
            disabled={disabled || (section === 'father' ? formData.fatherNotTested : formData[`${section}NotAvailable`])}
            multiline
            rows={2}
          />
        </Grid>
      </>
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('Form data:', formData);
      
      setSnackbar({
        open: true,
        message: 'Form submitted successfully!',
        severity: 'success'
      });
      
      handleReset();
    } catch (error) {
      console.error('Submission error:', error);
      setSnackbar({
        open: true,
        message: 'Error submitting form',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }};

    const handleReset = async () => {
      try {
        const { motherLabNo, fatherLabNo, additionalInfoLabNo } = await generateLabNumbers();
        setFormData({
          ...initialFormState,
          mother: { ...initialFormState.mother, labNo: motherLabNo },
          father: { ...initialFormState.father, labNo: fatherLabNo },
          additionalInfo: { ...initialFormState.additionalInfo, labNo: additionalInfoLabNo },
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
  
    const handleCloseSnackbar = () => {
      setSnackbar(prevState => ({
        ...prevState,
        open: false
      }));
    };
  
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 4, color: '#1e4976', fontWeight: 'bold' }}>
            Paternity Test Registration
          </Typography>
  
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Test Information Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ color: '#1e4976', mb: 2 }}>
                  Test Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
  
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reference Kit Number"
                  name="refKitNumber"
                  value={formData.refKitNumber}
                  onChange={handleTopLevelChange}
                  required
                />
              </Grid>
  
              {/* Mother Section */}
              {renderSection('Mother Information', 'mother')}
  
              {/* Father Section */}
              {renderSection('Alleged Father Information', 'father')}
  
              {/* Additional Information Section */}
              {renderSection('Additional Information', 'additionalInfo')}
  
              {/* Contact Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ color: '#1e4976', mb: 2, mt: 2 }}>
                  Contact Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
  
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Contact"
                  name="emailContact"
                  value={formData.emailContact}
                  onChange={handleTopLevelChange}
                  type="email"
                />
              </Grid>
  
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Contact"
                  name="phoneContact"
                  value={formData.phoneContact}
                  onChange={handleTopLevelChange}
                  required
                />
              </Grid>
  
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Submission Date"
                  name="submissionDate"
                  type="date"
                  value={formData.submissionDate}
                  onChange={handleTopLevelChange}
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
                    onChange={handleTopLevelChange}
                  >
                    <FormControlLabel value="YES" control={<Radio />} label="Yes" />
                    <FormControlLabel value="NO" control={<Radio />} label="No" />
                  </RadioGroup>
                </FormControl>
              </Grid>
  
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Area"
                  name="addressArea"
                  value={formData.addressArea}
                  onChange={handleTopLevelChange}
                  multiline
                  rows={2}
                />
              </Grid>
  
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Comments"
                  name="comments"
                  value={formData.comments}
                  onChange={handleTopLevelChange}
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
                >
                  {isSubmitting ? (
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