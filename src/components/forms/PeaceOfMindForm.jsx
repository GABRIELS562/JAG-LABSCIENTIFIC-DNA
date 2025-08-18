import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Grid,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  Snackbar
} from '@mui/material';
import { Save, NavigateNext, NavigateBefore } from '@mui/icons-material';
import api from '../../services/api';

const PeaceOfMindForm = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastLabNumber, setLastLabNumber] = useState(null);

  // Form data state matching your exact requirements
  const [formData, setFormData] = useState({
    // Step 1: Test Information
    refKitNumber: 'BN-', // Will be BN-XXX (3 digits only)
    submissionDate: new Date().toISOString().split('T')[0], // Auto-populated
    
    // Step 2: Mother Information
    motherNotAvailable: false,
    mother: {
      name: '',
      surname: '',
      idNumber: '',
      dateOfBirth: '',
      collectionDate: new Date().toISOString().split('T')[0]
    },
    
    // Step 3: Father Information  
    father: {
      labNo: '',
      name: '',
      surname: '',
      idNumber: '',
      dateOfBirth: '',
      collectionDate: new Date().toISOString().split('T')[0]
    },
    
    // Step 4: Child Information
    child: {
      labNo: '', // Will be auto-generated as 25_XXX(father_lab_no)M/F
      name: '',
      surname: '',
      idNumber: '',
      dateOfBirth: '',
      gender: 'M', // M or F
      collectionDate: new Date().toISOString().split('T')[0]
    },
    
    // Step 5: Test Purpose (auto-populated)
    testPurpose: 'peace_of_mind',
    
    // Step 6: Legal Declarations
    signedOnInventoryForm: false,
    legalDeclarations: '',
    
    // Contact Information
    emailContact: 'info@labdna.co.za',
    phoneContact: '0762042306',
    addressArea: 'Tyger Waterfront',
    comments: ''
  });

  const steps = [
    'Test Information',
    'Mother Information',
    'Father Information', 
    'Child Information',
    'Test Purpose',
    'Legal Declarations'
  ];

  // Fetch last lab number on mount
  useEffect(() => {
    fetchLastLabNumber();
  }, []);

  const fetchLastLabNumber = async () => {
    try {
      const response = await api.getLastLabNumber();
      if (response?.success && response.lastLabNumber) {
        // Extract number and increment
        const match = response.lastLabNumber.match(/25_(\d+)/);
        if (match) {
          const nextNumber = parseInt(match[1]) + 1;
          setLastLabNumber(nextNumber);
        } else {
          setLastLabNumber(1);
        }
      } else {
        setLastLabNumber(1);
      }
    } catch (error) {
      console.error('Error fetching last lab number:', error);
      setLastLabNumber(1);
    }
  };

  // Auto-generate lab numbers
  useEffect(() => {
    if (lastLabNumber) {
      // Father gets the next number
      const fatherLabNo = `25_${String(lastLabNumber).padStart(3, '0')}`;
      // Child references father and adds gender
      const childLabNo = `25_${String(lastLabNumber - 1).padStart(3, '0')}(${fatherLabNo})${formData.child.gender}`;
      
      setFormData(prev => ({
        ...prev,
        father: { ...prev.father, labNo: fatherLabNo },
        child: { ...prev.child, labNo: childLabNo }
      }));
    }
  }, [lastLabNumber, formData.child.gender]);

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 0: // Test Information - Only validate kit number format
        const kitNumber = formData.refKitNumber.replace('BN-', '');
        if (!kitNumber || !/^\d{3}$/.test(kitNumber)) {
          newErrors.refKitNumber = 'Kit number must be exactly 3 digits (e.g., BN-123)';
        }
        break;
        
      case 1: // Mother Information - NO mandatory fields
        // No validation required
        break;
        
      case 2: // Father Information - NO mandatory fields
        // No validation required
        break;
        
      case 3: // Child Information - NO mandatory fields
        // No validation required
        break;
        
      case 4: // Test Purpose - Auto-populated, no validation
        // No validation required
        break;
        
      case 5: // Legal Declarations
        if (!formData.signedOnInventoryForm && !formData.legalDeclarations) {
          newErrors.legalDeclarations = 'Please confirm inventory form signature or provide declarations';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      return;
    }

    try {
      // Format the data for submission
      const submissionData = {
        // Test Information
        ref_kit_number: formData.refKitNumber,
        submission_date: formData.submissionDate,
        client_type: 'paternity',
        test_purpose: 'peace_of_mind',
        
        // Mother (if available)
        mother_present: formData.motherNotAvailable ? 'NO' : 'YES',
        mother: formData.motherNotAvailable ? null : formData.mother,
        
        // Father
        father: {
          ...formData.father,
          relation: 'alleged_father'
        },
        
        // Child
        child: {
          ...formData.child,
          relation: `child(${formData.father.labNo}) ${formData.child.gender}`
        },
        
        // Contact
        email_contact: formData.emailContact,
        phone_contact: formData.phoneContact,
        address_area: formData.addressArea,
        comments: formData.comments,
        
        // Legal
        signed_inventory_form: formData.signedOnInventoryForm,
        legal_declarations: formData.legalDeclarations
      };

      const response = await api.submitPaternityTest(submissionData);
      
      if (response?.success) {
        setSuccessMessage('✅ Samples saved successfully!');
        // Reset form after successful submission
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setErrorMessage('❌ Failed to save samples. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setErrorMessage(`❌ Error: ${error.message}`);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Step 1: Test Information
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F' }}>
              Step 1: Peace of Mind Test Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reference Kit Number"
                  value={formData.refKitNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow BN- followed by up to 3 digits
                    if (value.startsWith('BN-')) {
                      const numbers = value.slice(3);
                      if (/^\d{0,3}$/.test(numbers)) {
                        setFormData({ ...formData, refKitNumber: value });
                      }
                    }
                  }}
                  error={!!errors.refKitNumber}
                  helperText={errors.refKitNumber || 'Format: BN-XXX (3 digits only)'}
                  placeholder="BN-123"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Submission Date"
                  type="date"
                  value={formData.submissionDate}
                  InputProps={{ readOnly: true }}
                  helperText="Auto-populated with today's date"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Step 2: Mother Information
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', display: 'flex', alignItems: 'center' }}>
              👩 Mother Information
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.motherNotAvailable}
                  onChange={(e) => setFormData({ ...formData, motherNotAvailable: e.target.checked })}
                  sx={{ color: '#0D488F' }}
                />
              }
              label="Mother Not Available"
              sx={{ mb: 3 }}
            />
            
            {!formData.motherNotAvailable && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={formData.mother.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      mother: { ...formData.mother, name: e.target.value }
                    })}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Surname"
                    value={formData.mother.surname}
                    onChange={(e) => setFormData({
                      ...formData,
                      mother: { ...formData.mother, surname: e.target.value }
                    })}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="ID Number"
                    value={formData.mother.idNumber}
                    onChange={(e) => setFormData({
                      ...formData,
                      mother: { ...formData.mother, idNumber: e.target.value }
                    })}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    value={formData.mother.dateOfBirth}
                    onChange={(e) => setFormData({
                      ...formData,
                      mother: { ...formData.mother, dateOfBirth: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Collection Date"
                    type="date"
                    value={formData.mother.collectionDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      mother: { ...formData.mother, collectionDate: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            )}
            
            <Alert severity="info" sx={{ mt: 2 }}>
              No fields are mandatory on this page
            </Alert>
          </Box>
        );

      case 2: // Step 3: Father Information
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', display: 'flex', alignItems: 'center' }}>
              👨 Father Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Lab Number"
                  value={formData.father.labNo}
                  InputProps={{ readOnly: true }}
                  helperText="Auto-generated"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.father.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    father: { ...formData.father, name: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Surname"
                  value={formData.father.surname}
                  onChange={(e) => setFormData({
                    ...formData,
                    father: { ...formData.father, surname: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID Number"
                  value={formData.father.idNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    father: { ...formData.father, idNumber: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={formData.father.dateOfBirth}
                  onChange={(e) => setFormData({
                    ...formData,
                    father: { ...formData.father, dateOfBirth: e.target.value }
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Collection Date"
                  type="date"
                  value={formData.father.collectionDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    father: { ...formData.father, collectionDate: e.target.value }
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              No fields are mandatory on this page
            </Alert>
          </Box>
        );

      case 3: // Step 4: Child Information
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F', display: 'flex', alignItems: 'center' }}>
              👶 Child Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Lab Number"
                  value={formData.child.labNo}
                  InputProps={{ readOnly: true }}
                  helperText="Auto-generated with father reference"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.child.gender === 'M'}
                      onChange={(e) => setFormData({
                        ...formData,
                        child: { ...formData.child, gender: e.target.checked ? 'M' : 'F' }
                      })}
                    />
                  }
                  label="Male (unchecked = Female)"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.child.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    child: { ...formData.child, name: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Surname"
                  value={formData.child.surname}
                  onChange={(e) => setFormData({
                    ...formData,
                    child: { ...formData.child, surname: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID Number / Date of Birth"
                  value={formData.child.idNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    child: { ...formData.child, idNumber: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={formData.child.dateOfBirth}
                  onChange={(e) => setFormData({
                    ...formData,
                    child: { ...formData.child, dateOfBirth: e.target.value }
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Collection Date"
                  type="date"
                  value={formData.child.collectionDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    child: { ...formData.child, collectionDate: e.target.value }
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              No fields are mandatory on this page
            </Alert>
          </Box>
        );

      case 4: // Step 5: Test Purpose
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F' }}>
              Step 5: Test Purpose
            </Typography>
            
            <Card sx={{ bgcolor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  Peace of Mind
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  This test is automatically set to "Peace of Mind" as you are in the Peace of Mind registration page.
                </Typography>
              </CardContent>
            </Card>
            
            <Alert severity="success" sx={{ mt: 3 }}>
              Test purpose has been auto-populated to Peace of Mind
            </Alert>
          </Box>
        );

      case 5: // Step 6: Legal Declarations
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: '#0D488F' }}>
              Step 6: Legal Declarations
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.signedOnInventoryForm}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    signedOnInventoryForm: e.target.checked,
                    legalDeclarations: e.target.checked ? 'Signed on inventory form' : ''
                  })}
                  sx={{ color: '#0D488F' }}
                />
              }
              label="Clients have signed on the inventory form"
              sx={{ mb: 3, p: 2, border: '2px solid #0D488F', borderRadius: 1 }}
            />
            
            {formData.signedOnInventoryForm && (
              <Alert severity="success" sx={{ mb: 3 }}>
                ✓ Legal declaration requirement satisfied - Inventory form signed
              </Alert>
            )}
            
            {!formData.signedOnInventoryForm && (
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Legal Declarations"
                value={formData.legalDeclarations}
                onChange={(e) => setFormData({ ...formData, legalDeclarations: e.target.value })}
                error={!!errors.legalDeclarations}
                helperText={errors.legalDeclarations || 'Required if inventory form is not signed'}
              />
            )}
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" sx={{ mb: 2 }}>Contact Information</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Contact"
                  value={formData.emailContact}
                  onChange={(e) => setFormData({ ...formData, emailContact: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Contact"
                  value={formData.phoneContact}
                  onChange={(e) => setFormData({ ...formData, phoneContact: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Address Area"
                  value={formData.addressArea}
                  onChange={(e) => setFormData({ ...formData, addressArea: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, color: '#0D488F', fontWeight: 'bold' }}>
          Peace of Mind Paternity Test Registration
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box sx={{ minHeight: 400 }}>
          {renderStepContent()}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<NavigateBefore />}
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              startIcon={<Save />}
              sx={{ bgcolor: '#0D488F' }}
            >
              Submit
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<NavigateNext />}
              sx={{ bgcolor: '#0D488F' }}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
      >
        <Alert severity="error" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PeaceOfMindForm;