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
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';

// Initial form state with matching fields across all sections
const initialFormState = {
  refKitNumber: 'KIT123456',
  submissionDate: new Date().toISOString().split('T')[0],
  motherPresent: 'NO',
  
  // Mother section
  mother: {
    labNo: '2024_001',
    name: 'Jane',
    surname: 'Doe',
    idDob: 'ID123456',
    dateOfBirth: '1990-01-01',
    placeOfBirth: 'Sydney',
    nationality: 'Australian',
    occupation: 'Engineer',
    address: '123 Main St, Sydney',
    phoneNumber: '0400123456',
    email: 'jane.doe@email.com',
    idNumber: 'ID98765',
    idType: 'passport',
    maritalStatus: 'single',
    ethnicity: 'Caucasian',
    collectionDate: new Date().toISOString().split('T')[0],
    additionalNotes: 'Sample mother notes'
  },
  motherNotAvailable: false,

  // Father section
  father: {
    labNo: '2024_002',
    name: 'John',
    surname: 'Smith',
    idDob: 'ID789012',
    dateOfBirth: '1985-06-15',
    placeOfBirth: 'Melbourne',
    nationality: 'Australian',
    occupation: 'Doctor',
    address: '456 High St, Melbourne',
    phoneNumber: '0400789012',
    email: 'john.smith@email.com',
    idNumber: 'ID45678',
    idType: 'nationalId',
    maritalStatus: 'single',
    ethnicity: 'Caucasian',
    collectionDate: new Date().toISOString().split('T')[0],
    additionalNotes: 'Sample father notes'
  },
  fatherNotAvailable: false,

  // Additional Information section
  additionalInfo: {
    labNo: '2024_003',
    name: 'Baby',
    surname: 'Doe',
    idDob: 'ID345678',
    dateOfBirth: '2023-12-25',
    placeOfBirth: 'Brisbane',
    nationality: 'Australian',
    occupation: 'N/A',
    address: '123 Main St, Sydney',
    phoneNumber: '0400123456',
    email: 'guardian@email.com',
    idNumber: 'ID23456',
    idType: 'passport',
    maritalStatus: 'single',
    ethnicity: 'Mixed',
    collectionDate: new Date().toISOString().split('T')[0],
    additionalNotes: 'Sample child notes'
  },
  additionalInfoNotAvailable: false,
  
  // Contact Information
  emailContact: 'contact@email.com',
  addressArea: '789 Contact St, Sydney NSW 2000',
  phoneContact: '0400999888',
  comments: 'Sample test case with dummy data'
};

const sections = [
  'Test Information',
  'Mother Information',
  'Father Information',
  'Additional Information',
  'Contact Information',
  'Review'
];

const FormProgress = ({ currentSection, sections }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Stepper activeStep={currentSection}>
        {sections.map((section, index) => (
          <Step key={index}>
            <StepLabel>{section}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

const FormSummary = ({ formData, onEdit }) => {
  const renderPersonSection = (title, section, notAvailable) => {
    if (notAvailable) {
      return (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            {title}
          </Typography>
          <Typography color="text.secondary">Not Available</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" color="primary">
            {title}
          </Typography>
          <Button 
            size="small" 
            onClick={() => onEdit(sections.indexOf(title))}
            sx={{ color: '#1e4976' }}
          >
            Edit
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Lab No</Typography>
            <Typography>{formData[section].labNo}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Name</Typography>
            <Typography>{formData[section].name}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Surname</Typography>
            <Typography>{formData[section].surname}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">ID/DOB</Typography>
            <Typography>{formData[section].idDob}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
            <Typography>{formData[section].dateOfBirth}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Collection Date</Typography>
            <Typography>{formData[section].collectionDate}</Typography>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Box>
      {/* Test Information */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" color="primary">
            Test Information
          </Typography>
          <Button 
            size="small" 
            onClick={() => onEdit(0)}
            sx={{ color: '#1e4976' }}
          >
            Edit
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Reference Kit Number</Typography>
            <Typography>{formData.refKitNumber}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Submission Date</Typography>
            <Typography>{formData.submissionDate}</Typography>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Mother Information */}
      {renderPersonSection('Mother Information', 'mother', formData.motherNotAvailable)}

      <Divider sx={{ my: 2 }} />

      {/* Father Information */}
      {renderPersonSection('Father Information', 'father', formData.fatherNotAvailable)}

      <Divider sx={{ my: 2 }} />

      {/* Additional Information */}
      {renderPersonSection('Additional Information', 'additionalInfo', formData.additionalInfoNotAvailable)}

      <Divider sx={{ my: 2 }} />

      {/* Contact Information */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" color="primary">
            Contact Information
          </Typography>
          <Button 
            size="small" 
            onClick={() => onEdit(4)}
            sx={{ color: '#1e4976' }}
          >
            Edit
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Email Contact</Typography>
            <Typography>{formData.emailContact}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">Phone Contact</Typography>
            <Typography>{formData.phoneContact}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">Address Area</Typography>
            <Typography>{formData.addressArea}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">Comments</Typography>
            <Typography>{formData.comments}</Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaternityTestForm = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [currentSection, setCurrentSection] = useState(0);

  const handleChange = (section, field, value) => {
    setFormData(prevState => ({
      ...prevState,
      [section]: {
        ...prevState[section],
        [field]: value
      }
    }));
    
    if (errors[`${section}.${field}`]) {
      setErrors(prevState => {
        const newErrors = { ...prevState };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      });
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

  const handleSectionToggle = (section) => {
    setFormData(prevState => {
      const newState = { ...prevState };
      newState[`${section}NotAvailable`] = !prevState[`${section}NotAvailable`];
      
      if (newState[`${section}NotAvailable`]) {
        newState[section] = {
          ...initialFormState[section],
          labNo: prevState[section].labNo
        };
      }
      
      return newState;
    });
  };

  const handleFatherNotTestedChange = () => {
    setFormData(prevState => ({
      ...prevState,
      fatherNotAvailable: !prevState.fatherNotAvailable,
      father: prevState.fatherNotAvailable ? 
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

  useEffect(() => {
    const savedForm = localStorage.getItem('paternityFormData');
    if (savedForm) {
      try {
        const parsedForm = JSON.parse(savedForm);
        setFormData(prevState => ({
          ...prevState,
          ...parsedForm
        }));
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('paternityFormData', JSON.stringify(formData));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }, [formData]);

  const renderSection = (title, section, disabled = false) => {
    const isNotAvailable = formData[`${section}NotAvailable`];
    
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
                  checked={isNotAvailable}
                  onChange={() => handleSectionToggle(section)}
                  name={`${section}NotAvailable`}
                />
              }
              label="NOT AVAILABLE"
            />
          </Box>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        {!isNotAvailable && (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lab No"
                value={formData[section].labNo || ''}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData[section].name || ''}
                onChange={(e) => handleChange(section, 'name', e.target.value)}
                disabled={disabled}
                required
                error={!!errors[`${section}.name`]}
                helperText={errors[`${section}.name`]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Surname"
                value={formData[section].surname || ''}
                onChange={(e) => handleChange(section, 'surname', e.target.value)}
                disabled={disabled}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID/DOB"
                value={formData[section].idDob || ''}
                onChange={(e) => handleChange(section, 'idDob', e.target.value)}
                disabled={disabled}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={formData[section].dateOfBirth || ''}
                onChange={(e) => handleChange(section, 'dateOfBirth', e.target.value)}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Place of Birth"
                value={formData[section].placeOfBirth || ''}
                onChange={(e) => handleChange(section, 'placeOfBirth', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nationality"
                value={formData[section].nationality || ''}
                onChange={(e) => handleChange(section, 'nationality', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Occupation"
                value={formData[section].occupation || ''}
                onChange={(e) => handleChange(section, 'occupation', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Address"
                value={formData[section].address || ''}
                onChange={(e) => handleChange(section, 'address', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData[section].phoneNumber || ''}
                onChange={(e) => handleChange(section, 'phoneNumber', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData[section].email || ''}
                onChange={(e) => handleChange(section, 'email', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID Number"
                value={formData[section].idNumber || ''}
                onChange={(e) => handleChange(section, 'idNumber', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID Type"
                value={formData[section].idType || ''}
                onChange={(e) => handleChange(section, 'idType', e.target.value)}
                disabled={disabled}
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
                value={formData[section].maritalStatus || ''}
                onChange={(e) => handleChange(section, 'maritalStatus', e.target.value)}
                disabled={disabled}
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
                value={formData[section].ethnicity || ''}
                onChange={(e) => handleChange(section, 'ethnicity', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Collection Date"
                type="date"
                value={formData[section].collectionDate || ''}
                onChange={(e) => handleChange(section, 'collectionDate', e.target.value)}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                value={formData[section].additionalNotes || ''}
                onChange={(e) => handleChange(section, 'additionalNotes', e.target.value)}
                disabled={disabled}
                multiline
                rows={2}
              />
            </Grid>
          </>
        )}
      </>
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Format data for spreadsheet
      const childRow = {
        labNo: formData.additionalInfo.labNo,
        name: formData.additionalInfo.name,
        surname: formData.additionalInfo.surname,
        idDob: formData.additionalInfo.idDob,
        relation: 'Child',
        collectionDate: formData.additionalInfo.collectionDate,
        submissionDate: formData.submissionDate,
        motherPresent: formData.motherPresent,
        emailContact: formData.emailContact,
        addressArea: formData.addressArea,
        phoneContact: formData.phoneContact,
        comments: formData.comments
      };

      const fatherRow = {
        labNo: formData.father.labNo,
        name: formData.father.name,
        surname: formData.father.surname,
        idDob: formData.father.idDob,
        relation: 'Alleged Father',
        collectionDate: formData.father.collectionDate,
        submissionDate: formData.submissionDate,
        motherPresent: formData.motherPresent,
        emailContact: formData.emailContact,
        addressArea: formData.addressArea,
        phoneContact: formData.phoneContact,
        comments: formData.comments
      };

      const response = await fetch(`${API_URL}/api/submit-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ childRow, fatherRow }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: 'Form submitted successfully!',
          severity: 'success'
        });
        
        await handleReset();
      } else {
        throw new Error(data.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error submitting form',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    // Generate new lab numbers
    generateLabNumbers().then(numbers => {
      const resetData = {
        ...initialFormState,
        mother: { ...initialFormState.mother, labNo: numbers.motherLabNo },
        father: { ...initialFormState.father, labNo: numbers.fatherLabNo },
        additionalInfo: { ...initialFormState.additionalInfo, labNo: numbers.additionalInfoLabNo }
      };
      setFormData(resetData);
      setCurrentSection(0);
      setErrors({});
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prevState => ({
      ...prevState,
      open: false
    }));
  };

  const handleNext = () => {
    const sectionErrors = validateSection(currentSection);
    if (Object.keys(sectionErrors).length === 0) {
      setCurrentSection(prev => Math.min(prev + 1, sections.length - 1));
    } else {
      setErrors(sectionErrors);
    }
  };

  const handleBack = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
  };

  const validateSection = (sectionIndex) => {
    const errors = {};
    
    switch (sectionIndex) {
      case 0: // Test Information
        if (!formData.refKitNumber.trim()) {
          errors.refKitNumber = 'Reference Kit Number is required';
        }
        break;
        
      case 1: // Mother Information
        if (!formData.motherNotAvailable) {
          if (!formData.mother.name.trim()) errors['mother.name'] = 'Name is required';
          if (!formData.mother.dateOfBirth) errors['mother.dateOfBirth'] = 'Date of Birth is required';
        }
        break;
        
      // ... add validation for other sections
    }
    
    return errors;
  };

  const renderFormContent = () => {
    if (currentSection === sections.length - 1) {
      return <FormSummary formData={formData} onEdit={setCurrentSection} />;
    }

    return (
      <Grid container spacing={3}>
        {currentSection === 0 && (
          // Test Information
          <>
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
                error={!!errors.refKitNumber}
                helperText={errors.refKitNumber}
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
          </>
        )}

        {currentSection === 1 && renderSection('Mother Information', 'mother')}
        {currentSection === 2 && renderSection('Father Information', 'father')}
        {currentSection === 3 && renderSection('Additional Information', 'additionalInfo')}
        
        {currentSection === 4 && (
          // Contact Information
          <>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#1e4976', mb: 2 }}>
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
                error={!!errors.emailContact}
                helperText={errors.emailContact}
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
                error={!!errors.phoneContact}
                helperText={errors.phoneContact}
              />
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
          </>
        )}
      </Grid>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 4, color: '#1e4976', fontWeight: 'bold' }}>
          Paternity Test Registration
        </Typography>

        <FormProgress currentSection={currentSection} sections={sections} />

        <form onSubmit={handleSubmit}>
          {renderFormContent()}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={currentSection === 0}
              sx={{ color: '#1e4976', borderColor: '#1e4976' }}
            >
              Back
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={isSubmitting}
                sx={{
                  color: '#1e4976',
                  borderColor: '#1e4976'
                }}
              >
                Clear Form
              </Button>

              {currentSection === sections.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    bgcolor: '#1e4976',
                    '&:hover': { bgcolor: '#16365b' }
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Submit Registration'
                  )}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{
                    bgcolor: '#1e4976',
                    '&:hover': { bgcolor: '#16365b' }
                  }}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </form>

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
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
};

export default PaternityTestForm;