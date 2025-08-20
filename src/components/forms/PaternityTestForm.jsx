import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Grid,
  Button,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  FormHelperText,
  Stack,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import { PhotoCamera, CloudUpload, Close, CameraAlt, AutoFixHigh } from '@mui/icons-material';
import { createWorker } from 'tesseract.js';
import SignaturePad from '../ui/SignaturePad';
import WitnessSection from '../ui/WitnessSection';
import PhotoCapture from '../features/PhotoCapture';

// Initial form state with matching fields across all sections
const initialFormState = {
  refKitNumber: 'BN123456',
  submissionDate: new Date().toISOString().split('T')[0],
  motherPresent: 'NO',
  
  // Client type selection
  clientType: {
    paternity: false,
    lt: false,
    urgent: false
  },
  
  // File uploads for LT samples
  ltDocuments: {
    fatherIdCopy: null,
    childIdCopy: null,
    motherIdCopy: null
  },
  
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
  comments: 'Sample test case with dummy data',
  
  // Legal and Consent Information
  consentType: 'paternity', // 'paternity' or 'legal'
  testPurpose: '',
  sampleType: 'buccal_swab',
  authorizedCollector: '',
  
  // Signatures
  signatures: {
    mother: null,
    father: null,
    child: null,
    guardian: null
  },
  
  // Witness Information (for legal testing)
  witness: {
    name: '',
    idNumber: '',
    idType: '',
    contactNumber: '',
    relationship: '',
    witnessDate: new Date().toISOString().split('T')[0],
    address: '',
    signature: null
  },
  
  // Legal Declarations
  legalDeclarations: {
    consentGiven: false,
    dataProtectionAgreed: false,
    resultNotificationAgreed: false,
    legalProceedingsUnderstood: false
  }
};

const sections = [
  'Test Information',
  'Mother Information',
  'Father Information',
  'Additional Information',
  'Contact Information',
  'Signatures & Consent',
  'Witness Information',
  'Review'
];

const FormProgress = ({ currentSection, sections }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        {sections.map((section, index) => (
          <Box 
            key={index} 
            sx={{ 
              flex: 1,
              height: 8,
              backgroundColor: index <= currentSection ? '#8EC74F' : '#e0e0e0',
              borderRadius: 1
            }}
          />
        ))}
      </Box>
      <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
        Step {currentSection + 1} of {sections.length}: {sections[currentSection]}
      </Typography>
    </Box>
  );
};

const FormSummary = ({ formData, onEdit }) => {
  const renderPersonSection = (title, section, notAvailable) => {
    if (notAvailable) {
      return (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>{title}</Typography>
          <Typography variant="body2" color="text.secondary">Not Available</Typography>
        </Paper>
      );
    }

    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          <Button 
            size="small" 
            onClick={() => onEdit(sections.indexOf(title))}
            sx={{ color: '#8EC74F' }}
          >
            Edit
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Lab No</Typography>
            <Typography variant="body1">{formData[section].labNo}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Name</Typography>
            <Typography variant="body1">{formData[section].name}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Surname</Typography>
            <Typography variant="body1">{formData[section].surname}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">ID/DOB</Typography>
            <Typography variant="body1">{formData[section].idDob}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
            <Typography variant="body1">{formData[section].dateOfBirth}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Collection Date</Typography>
            <Typography variant="body1">{formData[section].collectionDate}</Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  return (
    <Box>
      {/* Test Information */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Test Information
          </Typography>
          <Button 
            size="small" 
            onClick={() => onEdit(0)}
            sx={{ color: '#8EC74F' }}
          >
            Edit
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Reference Kit Number</Typography>
            <Typography variant="body1">{formData.refKitNumber}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Submission Date</Typography>
            <Typography variant="body1">{formData.submissionDate}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Mother Information */}
      {renderPersonSection('Mother Information', 'mother', formData.motherNotAvailable)}

      {/* Father Information */}
      {renderPersonSection('Father Information', 'father', formData.fatherNotAvailable)}

      {/* Additional Information */}
      {renderPersonSection('Additional Information', 'additionalInfo', formData.additionalInfoNotAvailable)}

      {/* Contact Information */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Contact Information
          </Typography>
          <Button 
            size="small" 
            onClick={() => onEdit(4)}
            sx={{ color: '#8EC74F' }}
          >
            Edit
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Email Contact</Typography>
            <Typography variant="body1">{formData.emailContact}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Phone Contact</Typography>
            <Typography variant="body1">{formData.phoneContact}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Address Area</Typography>
            <Typography variant="body1">{formData.addressArea}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Comments</Typography>
            <Typography variant="body1">{formData.comments}</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function PaternityTestForm() {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [currentSection, setCurrentSection] = useState(0);

  // OCR states
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrWorker, setOcrWorker] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  
  // Photo capture states
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState('paternity');

  // Handle extracted photo data
  const handlePhotoDataExtracted = (extractedData) => {
    if (!extractedData) return;

    // Auto-populate fields based on extracted data
    const updates = {};

    // Map extracted data to form fields
    if (extractedData.detectedNames && extractedData.detectedNames.length > 0) {
      // Try to assign names to appropriate sections
      const names = extractedData.detectedNames;
      if (names[0]) {
        updates.child = { ...formData.child, name: names[0].split(' ')[0], surname: names[0].split(' ').slice(1).join(' ') };
      }
      if (names[1]) {
        updates.father = { ...formData.father, name: names[1].split(' ')[0], surname: names[1].split(' ').slice(1).join(' ') };
      }
      if (names[2]) {
        updates.mother = { ...formData.mother, name: names[2].split(' ')[0], surname: names[2].split(' ').slice(1).join(' ') };
      }
    }

    if (extractedData.phoneContact) {
      updates.phoneContact = extractedData.phoneContact;
    }

    if (extractedData.emailContact) {
      updates.emailContact = extractedData.emailContact;
    }

    if (extractedData.addressArea) {
      updates.addressArea = extractedData.addressArea;
    }

    if (extractedData.collectionDate) {
      // Try to parse and format the date
      const date = new Date(extractedData.collectionDate);
      if (!isNaN(date.getTime())) {
        updates.submissionDate = date.toISOString().split('T')[0];
      }
    }

    // Apply updates to form
    setFormData(prevState => ({
      ...prevState,
      ...updates
    }));

    // Show success message
    setSnackbar({
      open: true,
      message: `Auto-populated form with ${extractedData.confidence}% confidence. Please review and verify all information.`,
      severity: extractedData.confidence > 70 ? 'success' : 'warning'
    });
  };

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

  // OCR Functions
  const initializeOCRWorker = async () => {
    if (!ocrWorker) {
      const worker = await createWorker('eng');
      setOcrWorker(worker);
      return worker;
    }
    return ocrWorker;
  };

  const parseFormData = (ocrText) => {
    const extractedData = {};
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Enhanced patterns for consent forms
    const patterns = {
      // Personal Information
      name: /(?:name|first\s*name|given\s*name)[:\s]*([a-zA-Z\s]+)/i,
      surname: /(?:surname|last\s*name|family\s*name)[:\s]*([a-zA-Z\s]+)/i,
      idNumber: /(?:id\s*num|id\s*number|passport\s*num|identification)[:\s]*([a-zA-Z0-9\s]+)/i,
      dateOfBirth: /(?:date\s*of\s*birth|dob|birth\s*date)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      phoneNumber: /(?:phone|mobile|tel|cell)[:\s]*([0-9\s\-\+\(\)]+)/i,
      email: /(?:email|e-mail)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      address: /(?:address|street)[:\s]*([a-zA-Z0-9\s,.-]+)/i,
      nationality: /(?:nationality|country)[:\s]*([a-zA-Z\s]+)/i,
      occupation: /(?:occupation|job|profession)[:\s]*([a-zA-Z\s]+)/i,
      placeOfBirth: /(?:place\s*of\s*birth|birth\s*place)[:\s]*([a-zA-Z\s,]+)/i,
      maritalStatus: /(?:marital\s*status|status)[:\s]*([a-zA-Z\s]+)/i,
      
      // Consent form specific patterns
      witnessName: /(?:witness\s*name|witness)[:\s]*([a-zA-Z\s]+)/i,
      witnessId: /(?:witness\s*id|witness\s*identification)[:\s]*([a-zA-Z0-9\s]+)/i,
      collectionDate: /(?:collection\s*date|date\s*collected)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      authorizedCollector: /(?:collected\s*by|collector|authorized\s*collector)[:\s]*([a-zA-Z\s]+)/i,
      
      // Relationship patterns
      relationship: /(?:relationship|relation)[:\s]*([a-zA-Z\s]+)/i,
      
      // Test type patterns
      testType: /(?:test\s*type|type\s*of\s*test)[:\s]*([a-zA-Z\s]+)/i,
      testPurpose: /(?:purpose|reason\s*for\s*test)[:\s]*([a-zA-Z\s]+)/i
    };

    // Ethnicity checkbox detection
    const ethnicityPatterns = {
      black: /black.*[x✓✔]/i,
      coloured: /coloured.*[x✓✔]/i,
      white: /white.*[x✓✔]/i,
      indian: /indian.*[x✓✔]/i,
      other: /other.*[x✓✔]/i
    };

    // Extract data using patterns
    const fullText = ocrText.toLowerCase();
    
    Object.entries(patterns).forEach(([field, pattern]) => {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        extractedData[field] = match[1].trim();
      }
    });

    // Check for ethnicity checkboxes
    Object.entries(ethnicityPatterns).forEach(([ethnicity, pattern]) => {
      if (pattern.test(fullText)) {
        extractedData.ethnicity = ethnicity;
      }
    });

    // Detect form type based on content
    if (fullText.includes('legal') || fullText.includes('court') || fullText.includes('proceedings')) {
      extractedData.formType = 'legal';
    } else if (fullText.includes('peace of mind') || fullText.includes('paternity')) {
      extractedData.formType = 'paternity';
    }

    // Detect if this is a consent form
    if (fullText.includes('consent') || fullText.includes('authorization') || fullText.includes('agreement')) {
      extractedData.isConsentForm = true;
    }

    // Clean up extracted data
    if (extractedData.dateOfBirth) {
      extractedData.dateOfBirth = formatDate(extractedData.dateOfBirth);
    }
    
    if (extractedData.collectionDate) {
      extractedData.collectionDate = formatDate(extractedData.collectionDate);
    }

    if (extractedData.phoneNumber) {
      // Clean phone number
      extractedData.phoneNumber = extractedData.phoneNumber.replace(/[^\d\+]/g, '');
    }

    return extractedData;
  };

  const formatDate = (dateStr) => {
    const dateFormats = [
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/
    ];
    
    for (const format of dateFormats) {
      const match = dateStr.match(format);
      if (match) {
        let [, day, month, year] = match;
        if (year.length === 2) {
          year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const applyExtractedData = (extractedData, targetSection = 'mother') => {
    setFormData(prevState => {
      const newState = { ...prevState };
      
      // Map extracted data to form fields
      if (extractedData.name) {
        newState[targetSection].name = extractedData.name;
      }
      if (extractedData.surname) {
        newState[targetSection].surname = extractedData.surname;
      }
      if (extractedData.idNumber) {
        newState[targetSection].idNumber = extractedData.idNumber;
        newState[targetSection].idDob = extractedData.idNumber; // Also populate ID/DOB field
      }
      if (extractedData.dateOfBirth) {
        newState[targetSection].dateOfBirth = extractedData.dateOfBirth;
      }
      if (extractedData.phoneNumber) {
        newState[targetSection].phoneNumber = extractedData.phoneNumber;
      }
      if (extractedData.email) {
        newState[targetSection].email = extractedData.email;
      }
      if (extractedData.address) {
        newState[targetSection].address = extractedData.address;
      }
      if (extractedData.nationality) {
        newState[targetSection].nationality = extractedData.nationality;
      }
      if (extractedData.occupation) {
        newState[targetSection].occupation = extractedData.occupation;
      }
      if (extractedData.placeOfBirth) {
        newState[targetSection].placeOfBirth = extractedData.placeOfBirth;
      }
      if (extractedData.ethnicity) {
        newState[targetSection].ethnicity = extractedData.ethnicity;
      }
      if (extractedData.maritalStatus) {
        newState[targetSection].maritalStatus = extractedData.maritalStatus;
      }
      if (extractedData.collectionDate) {
        newState[targetSection].collectionDate = extractedData.collectionDate;
      }

      // Apply global form data if detected
      if (extractedData.formType === 'legal') {
        newState.clientType.lt = true;
        newState.clientType.paternity = false;
      } else if (extractedData.formType === 'paternity') {
        newState.clientType.paternity = true;
        newState.clientType.lt = false;
      }

      if (extractedData.testPurpose) {
        const purposeMap = {
          'legal': 'legal_proceedings',
          'court': 'legal_proceedings',
          'immigration': 'immigration',
          'custody': 'custody',
          'inheritance': 'inheritance',
          'peace': 'peace_of_mind'
        };
        
        const purpose = Object.keys(purposeMap).find(key => 
          extractedData.testPurpose.toLowerCase().includes(key)
        );
        if (purpose) {
          newState.testPurpose = purposeMap[purpose];
        }
      }

      if (extractedData.authorizedCollector) {
        newState.authorizedCollector = extractedData.authorizedCollector;
      }

      // Apply witness information if detected
      if (extractedData.witnessName) {
        newState.witness.name = extractedData.witnessName;
      }
      if (extractedData.witnessId) {
        newState.witness.idNumber = extractedData.witnessId;
      }

      return newState;
    });
  };

  const processImageOCR = async (file) => {
    setIsProcessingOCR(true);
    
    try {
      const worker = await initializeOCRWorker();
      
      // Create image preview
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      
      const { data: { text } } = await worker.recognize(file);
      
      const extractedData = parseFormData(text);
      
      // Determine which section to populate based on current section
      let targetSection = 'mother';
      if (currentSection === 2) targetSection = 'father';
      if (currentSection === 3) targetSection = 'additionalInfo';
      
      applyExtractedData(extractedData, targetSection);
      
      setSnackbar({
        open: true,
        message: `OCR processing complete! Extracted data has been populated in the ${targetSection} section.`,
        severity: 'success'
      });
      
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error processing image. Please try again or enter data manually.',
        severity: 'error'
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setSnackbar({
          open: true,
          message: 'Image size too large. Please use an image smaller than 10MB.',
          severity: 'error'
        });
        return;
      }
      
      processImageOCR(file);
    }
  };

  const clearUploadedImage = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
      setUploadedImage(null);
    }
  };

  const generateLabNumbers = async (clientType = 'paternity') => {
    try {
      // Lab numbers will be generated by the backend during submission
      // These are just placeholder values for the form
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = clientType === 'legal' ? 'LT' : '';
      
      return {
        motherLabNo: `${prefix}${year}_TBD`,
        fatherLabNo: `${prefix}${year}_TBD`,
        additionalInfoLabNo: `${prefix}${year}_TBD`
      };
    } catch (error) {
      return {
        motherLabNo: 'ERR_TBD',
        fatherLabNo: 'ERR_TBD',
        additionalInfoLabNo: 'ERR_TBD'
      };
    }
  };

  useEffect(() => {
    const initializeLabNumbers = async () => {
      try {
        const clientType = formData.clientType.lt ? 'legal' : 'paternity';
        const { motherLabNo, fatherLabNo, additionalInfoLabNo } = await generateLabNumbers(clientType);
        setFormData(prevState => ({
          ...prevState,
          mother: { ...prevState.mother, labNo: motherLabNo },
          father: { ...prevState.father, labNo: fatherLabNo },
          additionalInfo: { ...prevState.additionalInfo, labNo: additionalInfoLabNo }
        }));
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Error generating lab numbers',
          severity: 'error'
        });
      }
    };

    initializeLabNumbers();
  }, [formData.clientType.lt]);

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
        // Handle error silently
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('paternityFormData', JSON.stringify(formData));
    } catch (error) {
      // Handle error silently
    }
  }, [formData]);

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      if (ocrWorker) {
        ocrWorker.terminate();
      }
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage);
      }
    };
  }, []);

  const PhotoUploadComponent = ({ sectionTitle }) => {
    if (currentSection < 1 || currentSection > 3) return null; // Only show for person sections (Mother, Father, Additional Info)
    
    return (
      <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#0D488F', display: 'flex', alignItems: 'center' }}>
              <PhotoCamera sx={{ mr: 1 }} />
              Auto-Fill from Photo
            </Typography>
            {uploadedImage && (
              <IconButton onClick={clearUploadedImage} size="small">
                <Close />
              </IconButton>
            )}
          </Box>
          
          {!uploadedImage ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Take a photo of the completed {sectionTitle.toLowerCase()} form to automatically populate the fields below.
              </Typography>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload-input"
                type="file"
                capture="environment"
                onChange={handleImageUpload}
                disabled={isProcessingOCR}
              />
              <label htmlFor="photo-upload-input">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={isProcessingOCR ? <CircularProgress size={20} color="inherit" /> : <PhotoCamera />}
                  disabled={isProcessingOCR}
                  sx={{
                    bgcolor: '#0D488F',
                    '&:hover': { bgcolor: '#022539' },
                    mr: 1
                  }}
                >
                  {isProcessingOCR ? 'Processing...' : 'Take Photo'}
                </Button>
              </label>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="file-upload-input"
                type="file"
                onChange={handleImageUpload}
                disabled={isProcessingOCR}
              />
              <label htmlFor="file-upload-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  disabled={isProcessingOCR}
                >
                  Upload File
                </Button>
              </label>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                ✓ Image processed successfully
              </Typography>
              <Box
                component="img"
                src={uploadedImage}
                alt="Uploaded form"
                sx={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  objectFit: 'contain',
                  border: '1px solid #ddd',
                  borderRadius: 1
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSection = (title, section, disabled = false) => {
    const isNotAvailable = formData[`${section}NotAvailable`];
    
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
            {title}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={isNotAvailable}
                onChange={() => handleSectionToggle(section)}
                name={`${section}NotAvailable`}
              />
            }
            label={`${title} NOT AVAILABLE`}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', color: 'text.secondary' } }}
          />
        </Box>

        <PhotoUploadComponent sectionTitle={title} />

        {!isNotAvailable && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lab No"
                name="labNo"
                value={formData[section].labNo || ''}
                onChange={(e) => handleChange(section, 'labNo', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData[section].name || ''}
                onChange={(e) => handleChange(section, 'name', e.target.value)}
                disabled={disabled}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Surname"
                name="surname"
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
                name="idDob"
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
                name="dateOfBirth"
                type="date"
                value={formData[section].dateOfBirth || ''}
                onChange={(e) => handleChange(section, 'dateOfBirth', e.target.value)}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Place of Birth"
                name="placeOfBirth"
                value={formData[section].placeOfBirth || ''}
                onChange={(e) => handleChange(section, 'placeOfBirth', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nationality"
                name="nationality"
                value={formData[section].nationality || ''}
                onChange={(e) => handleChange(section, 'nationality', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Occupation"
                name="occupation"
                value={formData[section].occupation || ''}
                onChange={(e) => handleChange(section, 'occupation', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData[section].address || ''}
                onChange={(e) => handleChange(section, 'address', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={formData[section].phoneNumber || ''}
                onChange={(e) => handleChange(section, 'phoneNumber', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
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
                name="idNumber"
                value={formData[section].idNumber || ''}
                onChange={(e) => handleChange(section, 'idNumber', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={disabled}>
                <InputLabel>ID Type</InputLabel>
                <Select
                  name="idType"
                  value={formData[section].idType || ''}
                  onChange={(e) => handleChange(section, 'idType', e.target.value)}
                  label="ID Type"
                >
                  <MenuItem value="">Select ID Type</MenuItem>
                  <MenuItem value="passport">Passport</MenuItem>
                  <MenuItem value="nationalId">National ID</MenuItem>
                  <MenuItem value="driversLicense">Driver's License</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={disabled}>
                <InputLabel>Marital Status</InputLabel>
                <Select
                  name="maritalStatus"
                  value={formData[section].maritalStatus || ''}
                  onChange={(e) => handleChange(section, 'maritalStatus', e.target.value)}
                  label="Marital Status"
                >
                  <MenuItem value="">Select Marital Status</MenuItem>
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="married">Married</MenuItem>
                  <MenuItem value="divorced">Divorced</MenuItem>
                  <MenuItem value="widowed">Widowed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={disabled}>
                <InputLabel>Ethnicity</InputLabel>
                <Select
                  name="ethnicity"
                  value={formData[section].ethnicity || ''}
                  onChange={(e) => handleChange(section, 'ethnicity', e.target.value)}
                  label="Ethnicity"
                >
                  <MenuItem value="">Select Ethnicity</MenuItem>
                  <MenuItem value="black">Black</MenuItem>
                  <MenuItem value="coloured">Coloured</MenuItem>
                  <MenuItem value="white">White</MenuItem>
                  <MenuItem value="indian">Indian</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Collection Date"
                name="collectionDate"
                type="date"
                value={formData[section].collectionDate || ''}
                onChange={(e) => handleChange(section, 'collectionDate', e.target.value)}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                name="additionalNotes"
                multiline
                rows={3}
                value={formData[section].additionalNotes || ''}
                onChange={(e) => handleChange(section, 'additionalNotes', e.target.value)}
                disabled={disabled}
              />
            </Grid>
          </Grid>
        )}

        {/* Add signature pad for each person */}
        {!isNotAvailable && (
          <SignaturePad
            person={title.replace(' Information', '')}
            onSignatureChange={(signature) => {
              const signatureKey = section === 'additionalInfo' ? 'child' : section;
              setFormData(prev => ({
                ...prev,
                signatures: {
                  ...prev.signatures,
                  [signatureKey]: signature
                }
              }));
            }}
            value={formData.signatures?.[section === 'additionalInfo' ? 'child' : section]}
            required={formData.clientType.lt}
            legalBinding={formData.clientType.lt}
            disabled={disabled}
          />
        )}
      </Box>
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Determine client type
      let clientType = 'paternity';
      if (formData.clientType.lt) {
        clientType = 'legal';
      }

      // Format data for backend including new fields
      const childRow = {
        ...formData.additionalInfo,
        refKitNumber: formData.refKitNumber,
        submissionDate: formData.submissionDate,
        emailContact: formData.emailContact,
        addressArea: formData.addressArea,
        phoneContact: formData.phoneContact,
        comments: formData.comments,
        testPurpose: formData.testPurpose,
        sampleType: formData.sampleType,
        authorizedCollector: formData.authorizedCollector
      };

      const fatherRow = {
        ...formData.father
      };

      const motherRow = !formData.motherNotAvailable ? {
        ...formData.mother
      } : null;

      // Include signature and witness data
      const enhancedData = {
        childRow, 
        fatherRow, 
        motherRow,
        clientType,
        signatures: formData.signatures,
        witness: formData.clientType.lt ? formData.witness : null,
        legalDeclarations: formData.legalDeclarations,
        consentType: formData.clientType.lt ? 'legal' : 'paternity'
      };


      const response = await fetch(`${API_URL}/submit-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedData),
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
      <Box sx={{ py: 2 }}>
        {currentSection === 0 && (
          // Test Information
          <Box>
            <Typography variant="h6" sx={{ color: '#0D488F', fontWeight: 'bold', mb: 3 }}>
              Test Information
            </Typography>
            
            {/* Client Type Selection */}
            <Box sx={{ mb: 4, p: 3, border: '2px solid #e0e0e0', borderRadius: 2, bgcolor: '#f8f9fa' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#0D488F' }}>
                Client Type
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.clientType.paternity}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          clientType: { ...prev.clientType, paternity: e.target.checked }
                        }))}
                        sx={{ color: '#0D488F', '&.Mui-checked': { color: '#0D488F' } }}
                      />
                    }
                    label="Peace of Mind Samples"
                    sx={{ '& .MuiFormControlLabel-label': { fontWeight: 500 } }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.clientType.lt}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          clientType: { ...prev.clientType, lt: e.target.checked }
                        }))}
                        sx={{ color: '#0D488F', '&.Mui-checked': { color: '#0D488F' } }}
                      />
                    }
                    label="LT (Legal - requires ID copies)"
                    sx={{ '& .MuiFormControlLabel-label': { fontWeight: 500 } }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.clientType.urgent}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          clientType: { ...prev.clientType, urgent: e.target.checked }
                        }))}
                        sx={{ color: '#0D488F', '&.Mui-checked': { color: '#0D488F' } }}
                      />
                    }
                    label="Urgent Samples"
                    sx={{ '& .MuiFormControlLabel-label': { fontWeight: 500 } }}
                  />
                </Grid>
              </Grid>
            </Box>
            
            {/* ID Upload Section for LT samples */}
            {formData.clientType.lt && (
              <Box sx={{ mb: 4, p: 3, border: '2px solid #ff9800', borderRadius: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#f57c00', display: 'flex', alignItems: 'center' }}>
                  <CloudUpload sx={{ mr: 1 }} />
                  ID Document Uploads (Required for Legal Testing)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  For legal testing, please upload clear copies of ID documents for all parties.
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2 }}>Father ID Copy</Typography>
                      <input
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        id="father-id-upload"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setFormData(prev => ({
                              ...prev,
                              ltDocuments: { ...prev.ltDocuments, fatherIdCopy: file.name }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="father-id-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<CloudUpload />}
                          size="small"
                          sx={{ mb: 1 }}
                        >
                          Upload
                        </Button>
                      </label>
                      {formData.ltDocuments.fatherIdCopy && (
                        <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                          ✓ {formData.ltDocuments.fatherIdCopy}
                        </Typography>
                      )}
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2 }}>Child ID Copy</Typography>
                      <input
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        id="child-id-upload"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setFormData(prev => ({
                              ...prev,
                              ltDocuments: { ...prev.ltDocuments, childIdCopy: file.name }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="child-id-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<CloudUpload />}
                          size="small"
                          sx={{ mb: 1 }}
                        >
                          Upload
                        </Button>
                      </label>
                      {formData.ltDocuments.childIdCopy && (
                        <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                          ✓ {formData.ltDocuments.childIdCopy}
                        </Typography>
                      )}
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#fafafa' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2 }}>Mother ID Copy (if applicable)</Typography>
                      <input
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        id="mother-id-upload"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setFormData(prev => ({
                              ...prev,
                              ltDocuments: { ...prev.ltDocuments, motherIdCopy: file.name }
                            }));
                          }
                        }}
                      />
                      <label htmlFor="mother-id-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<CloudUpload />}
                          size="small"
                          sx={{ mb: 1 }}
                        >
                          Upload
                        </Button>
                      </label>
                      {formData.ltDocuments.motherIdCopy && (
                        <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                          ✓ {formData.ltDocuments.motherIdCopy}
                        </Typography>
                      )}
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reference Kit Number"
                  name="refKitNumber"
                  value={formData.refKitNumber || ''}
                  onChange={handleTopLevelChange}
                  placeholder="Reference Kit Number"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Submission Date"
                  name="submissionDate"
                  type="date"
                  value={formData.submissionDate || ''}
                  onChange={handleTopLevelChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {currentSection === 1 && renderSection('Mother Information', 'mother')}
        {currentSection === 2 && renderSection('Father Information', 'father')}
        {currentSection === 3 && renderSection('Additional Information', 'additionalInfo')}
        
        {currentSection === 4 && (
          // Contact Information
          <Box>
            <Typography variant="h6" sx={{ color: '#0D488F', fontWeight: 'bold', mb: 3 }}>
              Contact Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Contact"
                  name="emailContact"
                  type="email"
                  value={formData.emailContact || ''}
                  onChange={handleTopLevelChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Contact"
                  name="phoneContact"
                  value={formData.phoneContact || ''}
                  onChange={handleTopLevelChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Area"
                  name="addressArea"
                  multiline
                  rows={3}
                  value={formData.addressArea || ''}
                  onChange={handleTopLevelChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Test Purpose</InputLabel>
                  <Select
                    name="testPurpose"
                    value={formData.testPurpose || ''}
                    onChange={handleTopLevelChange}
                    label="Test Purpose"
                  >
                    <MenuItem value="">Select Purpose</MenuItem>
                    <MenuItem value="peace_of_mind">Peace of Mind</MenuItem>
                    <MenuItem value="legal_proceedings">Legal Proceedings</MenuItem>
                    <MenuItem value="immigration">Immigration</MenuItem>
                    <MenuItem value="inheritance">Inheritance</MenuItem>
                    <MenuItem value="custody">Child Custody</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Sample Type</InputLabel>
                  <Select
                    name="sampleType"
                    value={formData.sampleType || ''}
                    onChange={handleTopLevelChange}
                    label="Sample Type"
                  >
                    <MenuItem value="buccal_swab">Buccal Swab</MenuItem>
                    <MenuItem value="blood">Blood Sample</MenuItem>
                    <MenuItem value="saliva">Saliva</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Authorized Collector"
                  name="authorizedCollector"
                  value={formData.authorizedCollector || ''}
                  onChange={handleTopLevelChange}
                  placeholder="Name of person collecting samples"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Comments"
                  name="comments"
                  multiline
                  rows={3}
                  value={formData.comments || ''}
                  onChange={handleTopLevelChange}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {currentSection === 5 && (
          // Signatures & Consent
          <Box>
            <Typography variant="h6" sx={{ color: '#0D488F', fontWeight: 'bold', mb: 3 }}>
              Signatures & Legal Consent
            </Typography>
            
            {/* Legal Declarations */}
            <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#0D488F' }}>
                Legal Declarations
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.legalDeclarations.consentGiven}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          legalDeclarations: {
                            ...prev.legalDeclarations,
                            consentGiven: e.target.checked
                          }
                        }))}
                        required
                      />
                    }
                    label="I hereby consent to the DNA paternity testing and confirm that I am happy with the limitations listed."
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.legalDeclarations.dataProtectionAgreed}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          legalDeclarations: {
                            ...prev.legalDeclarations,
                            dataProtectionAgreed: e.target.checked
                          }
                        }))}
                        required
                      />
                    }
                    label="I understand that the data provided and information generated from analysis will remain confidential according to the Data Protection Act."
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.legalDeclarations.resultNotificationAgreed}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          legalDeclarations: {
                            ...prev.legalDeclarations,
                            resultNotificationAgreed: e.target.checked
                          }
                        }))}
                        required
                      />
                    }
                    label="I agree to be notified of the test results via the contact information provided."
                  />
                </Grid>
                {formData.clientType.lt && (
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.legalDeclarations.legalProceedingsUnderstood}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            legalDeclarations: {
                              ...prev.legalDeclarations,
                              legalProceedingsUnderstood: e.target.checked
                            }
                          }))}
                          required
                        />
                      }
                      label="I understand that this test is for legal proceedings and may be used in court."
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Signature Summary */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Review the signatures collected in previous sections. All parties must sign for the test to proceed.
            </Typography>
            
            <Grid container spacing={2}>
              {!formData.motherNotAvailable && (
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Mother Signature</Typography>
                    {formData.signatures.mother ? (
                      <Typography color="success.main">✓ Signed</Typography>
                    ) : (
                      <Typography color="error.main">✗ Not Signed</Typography>
                    )}
                  </Paper>
                </Grid>
              )}
              {!formData.fatherNotAvailable && (
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Father Signature</Typography>
                    {formData.signatures.father ? (
                      <Typography color="success.main">✓ Signed</Typography>
                    ) : (
                      <Typography color="error.main">✗ Not Signed</Typography>
                    )}
                  </Paper>
                </Grid>
              )}
              {!formData.additionalInfoNotAvailable && (
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Child/Guardian Signature</Typography>
                    {formData.signatures.child ? (
                      <Typography color="success.main">✓ Signed</Typography>
                    ) : (
                      <Typography color="error.main">✗ Not Signed</Typography>
                    )}
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {currentSection === 6 && (
          // Witness Information (only for legal testing)
          <Box>
            {formData.clientType.lt ? (
              <WitnessSection
                witnessData={formData.witness}
                onWitnessChange={(witnessData) => setFormData(prev => ({
                  ...prev,
                  witness: witnessData
                }))}
                required={true}
              />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  Witness information is only required for legal testing
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Skip this section for peace of mind testing
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
            Paternity Test Registration
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<CameraAlt />}
              onClick={() => {
                setSelectedFormType('paternity');
                setPhotoCaptureOpen(true);
              }}
              sx={{ 
                borderColor: '#0D488F',
                color: '#0D488F',
                '&:hover': {
                  borderColor: '#1e4976',
                  bgcolor: 'rgba(13, 72, 143, 0.04)'
                }
              }}
            >
              Capture Form
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CameraAlt />}
              onClick={() => {
                setSelectedFormType('legal');
                setPhotoCaptureOpen(true);
              }}
              sx={{ 
                borderColor: '#ff9800',
                color: '#ff9800',
                '&:hover': {
                  borderColor: '#f57c00',
                  bgcolor: 'rgba(255, 152, 0, 0.04)'
                }
              }}
            >
              LT Legal Form
            </Button>
          </Box>
        </Box>

        <FormProgress currentSection={currentSection} sections={sections} />

        <form onSubmit={handleSubmit}>
          {renderFormContent()}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={currentSection === 0}
            >
              Back
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Clear Form
              </Button>

              {currentSection === sections.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    bgcolor: '#0D488F',
                    '&:hover': {
                      bgcolor: '#022539'
                    }
                  }}
                >
                  {isSubmitting ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                      Submitting...
                    </Box>
                  ) : (
                    'Submit Registration'
                  )}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{
                    bgcolor: '#0D488F',
                    '&:hover': {
                      bgcolor: '#022539'
                    }
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
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Photo Capture Dialog */}
        <PhotoCapture
          open={photoCaptureOpen}
          onClose={() => setPhotoCaptureOpen(false)}
          onDataExtracted={handlePhotoDataExtracted}
          formType={selectedFormType}
        />
      </Paper>
    </Box>
  );
}