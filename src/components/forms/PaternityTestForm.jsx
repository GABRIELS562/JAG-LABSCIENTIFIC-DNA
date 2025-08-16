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
  IconButton,
  RadioGroup,
  Radio
} from '@mui/material';
import { PhotoCamera, CloudUpload, Close, CameraAlt, AutoFixHigh } from '@mui/icons-material';
import { createWorker } from 'tesseract.js';
import SignaturePad from '../ui/SignaturePad';
import WitnessSection from '../ui/WitnessSection';
import PhotoCapture from '../features/PhotoCapture';
import DateDropdown from '../ui/DateDropdown';

// Countries list for dropdowns
const countries = [
  'South Africa', 'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 
  'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 
  'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 
  'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 
  'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 
  'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 
  'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 
  'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 
  'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 
  'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

// ID Types for dropdown
const idTypes = [
  { value: 'passport', label: 'Passport' },
  { value: 'permit', label: 'Permit' },
  { value: 'nationalId', label: 'National ID' },
  { value: 'driversLicense', label: "Driver's License" }
];

// Initial form state with matching fields across all sections
const initialFormState = {
  refKitNumber: 'BN-',
  submissionDate: new Date().toISOString().split('T')[0],
  motherPresent: 'NO',
  numberOfChildren: 1,
  
  // Client type selection - single selection only
  clientType: 'peace_of_mind', // peace_of_mind, legal, or urgent
  
  // File uploads for LT samples
  ltDocuments: {
    fatherIdCopy: null,
    childIdCopy: null,
    motherIdCopy: null
  },
  
  // Mother section
  mother: {
    labNo: '',
    name: '',
    surname: '',
    dateOfBirth: '',
    placeOfBirth: 'South Africa',
    nationality: 'South Africa',
    address: '',
    phoneNumber: '',
    email: '',
    idNumber: '',
    idType: '',
    ethnicity: '',
    collectionDate: new Date().toISOString().split('T')[0],
    additionalNotes: '',
    cannotSign: false,
    signedOnInventoryForm: false
  },
  motherNotAvailable: false,

  // Father section
  father: {
    labNo: '',
    name: '',
    surname: '',
    dateOfBirth: '',
    placeOfBirth: 'South Africa',
    nationality: 'South Africa',
    address: '',
    phoneNumber: '',
    email: '',
    idNumber: '',
    idType: '',
    ethnicity: '',
    collectionDate: new Date().toISOString().split('T')[0],
    additionalNotes: '',
    cannotSign: false,
    signedOnInventoryForm: false
  },
  fatherNotAvailable: false,

  // Children Information sections
  children: [{
    labNo: '',
    name: '',
    surname: '',
    idDob: '',
    dateOfBirth: '',
    placeOfBirth: 'South Africa',
    nationality: 'South Africa',
    occupation: '',
    address: '',
    phoneNumber: '',
    email: '',
    idNumber: '',
    idType: '',
    maritalStatus: '',
    ethnicity: '',
    collectionDate: new Date().toISOString().split('T')[0],
    additionalNotes: ''
  }],
  
  // Contact Information
  emailContact: 'info@labdna.co.za',
  addressArea: 'Tyger Waterfront',
  phoneContact: '0762042306',
  comments: '',
  
  // Legal and Consent Information
  consentType: 'paternity', // 'paternity' or 'legal'
  testPurpose: '',
  sampleType: 'buccal_swab', // Default to buccal swab
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

const getSections = (numberOfChildren = 1) => {
  const sections = [
    'Test Information',
    '👩 Mother Information',
    '👨 Father Information',
  ];
  
  // Add sections for each child
  for (let i = 1; i <= numberOfChildren; i++) {
    if (numberOfChildren === 1) {
      sections.push('👶 Child Information');
    } else {
      sections.push(`👶 Child ${i} Information`);
    }
  }
  
  sections.push(
    'Contact Information',
    'Signatures & Consent',
    'Witness Information',
    'Review'
  );
  
  return sections;
};

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
  const sections = getSections(formData.numberOfChildren);
  
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
            <Typography variant="body1">{formData[section]?.labNo || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Name</Typography>
            <Typography variant="body1">{formData[section]?.name || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Surname</Typography>
            <Typography variant="body1">{formData[section]?.surname || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">ID Number</Typography>
            <Typography variant="body1">{formData[section]?.idNumber || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
            <Typography variant="body1">{formData[section]?.dateOfBirth || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Collection Date</Typography>
            <Typography variant="body1">{formData[section]?.collectionDate || ''}</Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  };
  
  const renderChildSection = (title, child, index) => {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          <Button 
            size="small" 
            onClick={() => onEdit(3 + index)}
            sx={{ color: '#8EC74F' }}
          >
            Edit
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Lab No</Typography>
            <Typography variant="body1">{child?.labNo || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Name</Typography>
            <Typography variant="body1">{child?.name || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Surname</Typography>
            <Typography variant="body1">{child?.surname || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">ID Number</Typography>
            <Typography variant="body1">{child?.idNumber || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
            <Typography variant="body1">{child?.dateOfBirth || ''}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption" color="text.secondary">Collection Date</Typography>
            <Typography variant="body1">{child?.collectionDate || ''}</Typography>
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
      {renderPersonSection('👩 Mother Information', 'mother', formData.motherNotAvailable)}

      {/* Father Information */}
      {renderPersonSection('👨 Father Information', 'father', formData.fatherNotAvailable)}

      {/* Children Information */}
      {formData.children && formData.children.map((child, index) => {
        const childTitle = formData.numberOfChildren === 1 
          ? '👶 Child Information' 
          : `👶 Child ${index + 1} Information`;
        return <div key={`child-${index}`}>{renderChildSection(childTitle, child, index)}</div>;
      })}

      {/* Contact Information */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Contact Information
          </Typography>
          <Button 
            size="small" 
            onClick={() => onEdit(3 + formData.numberOfChildren)}
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PaternityTestForm({ onSuccess }) {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [currentSection, setCurrentSection] = useState(0);
  const sections = getSections(formData.numberOfChildren);

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

  const handleChildChange = (childIndex, field, value) => {
    setFormData(prevState => ({
      ...prevState,
      children: prevState.children.map((child, index) => 
        index === childIndex 
          ? { ...child, [field]: value }
          : child
      )
    }));
    
    if (errors[`child${childIndex}.${field}`]) {
      setErrors(prevState => {
        const newErrors = { ...prevState };
        delete newErrors[`child${childIndex}.${field}`];
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

  const handleNumberOfChildrenChange = (event) => {
    const newCount = parseInt(event.target.value);
    setFormData(prevState => {
      const newChildren = [];
      
      // Keep existing children or create new ones
      for (let i = 0; i < newCount; i++) {
        if (i < prevState.children.length) {
          newChildren.push(prevState.children[i]);
        } else {
          newChildren.push({
            labNo: '',
            name: '',
            surname: '',
            idDob: '',
            dateOfBirth: '',
            placeOfBirth: 'South Africa',
            nationality: 'South Africa',
            occupation: '',
            address: '',
            phoneNumber: '',
            email: '',
            idNumber: '',
            idType: '',
            maritalStatus: '',
            ethnicity: '',
            collectionDate: new Date().toISOString().split('T')[0],
            additionalNotes: ''
          });
        }
      }
      
      return {
        ...prevState,
        numberOfChildren: newCount,
        children: newChildren
      };
    });
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
        newState.clientType = 'legal';
      } else if (extractedData.formType === 'paternity') {
        newState.clientType = 'peace_of_mind';
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

  const generateLabNumbers = async (numberOfChildren = 1, clientType = 'peace_of_mind') => {
    try {
      // Get the next sequence of lab numbers from backend
      const response = await fetch('/api/get-last-lab-number');
      const data = await response.json();
      
      let baseNumber = 1;
      if (data.success && data.data) {
        // Extract number from format like "25_001" and increment
        const parts = data.data.split('_');
        if (parts.length === 2) {
          baseNumber = parseInt(parts[1], 10) + 1;
        }
      }
      
      // Generate lab numbers: Child(ren) first, then Father, then Mother
      const childrenLabNos = [];
      let currentNum = baseNumber;
      
      // Generate lab numbers for each child (child comes first)
      for (let i = 0; i < numberOfChildren; i++) {
        const childNum = currentNum;
        const fatherNum = currentNum + numberOfChildren; // Father comes after all children
        const motherNum = currentNum + numberOfChildren + 1; // Mother comes after father
        
        const childBase = childNum.toString().padStart(3, '0');
        const father = fatherNum.toString().padStart(3, '0');
        
        childrenLabNos.push(`25_${childBase}(25_${father})M`);
        currentNum++;
      }
      
      // Father lab number (comes after all children)
      const fatherNum = baseNumber + numberOfChildren;
      const father = fatherNum.toString().padStart(3, '0');
      const fatherLabNo = `25_${father}`;
      
      // Mother lab number (comes after father)
      const motherNum = fatherNum + 1;
      const mother = motherNum.toString().padStart(3, '0');
      const motherLabNo = `25_${mother}`;
      
      return {
        childrenLabNos,
        fatherLabNo,
        motherLabNo
      };
    } catch (error) {
      console.error('Error generating lab numbers:', error);
      // Fallback for multiple children
      const fallbackChildren = [];
      for (let i = 0; i < numberOfChildren; i++) {
        fallbackChildren.push(`25_${(i + 1).toString().padStart(3, '0')}(25_${(numberOfChildren + 1).toString().padStart(3, '0')})M`);
      }
      return {
        childrenLabNos: fallbackChildren,
        fatherLabNo: `25_${(numberOfChildren + 1).toString().padStart(3, '0')}`,
        motherLabNo: `25_${(numberOfChildren + 2).toString().padStart(3, '0')}`
      };
    }
  };

  useEffect(() => {
    const initializeLabNumbers = async () => {
      try {
        const clientType = formData.clientType === 'legal' ? 'legal' : 'peace_of_mind';
        const { motherLabNo, fatherLabNo, childrenLabNos } = await generateLabNumbers(formData.numberOfChildren, clientType);
        
        setFormData(prevState => ({
          ...prevState,
          mother: { ...prevState.mother, labNo: motherLabNo },
          father: { ...prevState.father, labNo: fatherLabNo },
          children: prevState.children.map((child, index) => ({
            ...child,
            labNo: childrenLabNos[index] || `25_${(index + 1).toString().padStart(3, '0')}(25_${(formData.numberOfChildren + 1).toString().padStart(3, '0')})M`
          }))
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
  }, [formData.clientType, formData.numberOfChildren]);

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

  const renderChildSection = (title, childIndex, disabled = false) => {
    const child = formData.children[childIndex];
    const isPeaceOfMind = formData.clientType === 'peace_of_mind' || formData.testPurpose === 'peace_of_mind';
    
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
            {title}
          </Typography>
        </Box>

        <PhotoUploadComponent sectionTitle={title} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Lab No"
              name="labNo"
              value={child.labNo || ''}
              onChange={(e) => handleChildChange(childIndex, 'labNo', e.target.value)}
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={child.name || ''}
              onChange={(e) => handleChildChange(childIndex, 'name', e.target.value)}
              disabled={disabled}
              required
              error={!!errors[`child${childIndex}.name`]}
              helperText={errors[`child${childIndex}.name`]}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Surname"
              name="surname"
              value={child.surname || ''}
              onChange={(e) => handleChildChange(childIndex, 'surname', e.target.value)}
              disabled={disabled}
              required
              error={!!errors[`child${childIndex}.surname`]}
              helperText={errors[`child${childIndex}.surname`]}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <DateDropdown
              label={`Date of Birth${isPeaceOfMind ? '' : ' *'}`}
              name="dateOfBirth"
              value={child.dateOfBirth || ''}
              onChange={(value) => handleChildChange(childIndex, 'dateOfBirth', value)}
              disabled={disabled}
              required={!isPeaceOfMind}
              error={!!errors[`child${childIndex}.dateOfBirth`]}
              helperText={errors[`child${childIndex}.dateOfBirth`]}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Place of Birth{isPeaceOfMind ? '' : ' *'}</InputLabel>
              <Select
                name="placeOfBirth"
                value={child.placeOfBirth || ''}
                onChange={(e) => handleChildChange(childIndex, 'placeOfBirth', e.target.value)}
                label="Place of Birth"
              >
                {countries.map((country) => (
                  <MenuItem key={country} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Nationality</InputLabel>
              <Select
                name="nationality"
                value={child.nationality || ''}
                onChange={(e) => handleChildChange(childIndex, 'nationality', e.target.value)}
                label="Nationality"
              >
                {countries.map((country) => (
                  <MenuItem key={country} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={child.address || ''}
              onChange={(e) => handleChildChange(childIndex, 'address', e.target.value)}
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              value={child.phoneNumber || ''}
              onChange={(e) => handleChildChange(childIndex, 'phoneNumber', e.target.value)}
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={child.email || ''}
              onChange={(e) => handleChildChange(childIndex, 'email', e.target.value)}
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={`ID Number${isPeaceOfMind ? '' : ' *'}`}
              name="idNumber"
              value={child.idNumber || ''}
              onChange={(e) => handleChildChange(childIndex, 'idNumber', e.target.value)}
              disabled={disabled}
              required={!isPeaceOfMind}
              error={!!errors[`child${childIndex}.idNumber`]}
              helperText={errors[`child${childIndex}.idNumber`]}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl 
              fullWidth 
              disabled={disabled} 
              required={!isPeaceOfMind}
              error={!!errors[`child${childIndex}.idType`]}
            >
              <InputLabel>ID Type{isPeaceOfMind ? '' : ' *'}</InputLabel>
              <Select
                name="idType"
                value={child.idType || ''}
                onChange={(e) => handleChildChange(childIndex, 'idType', e.target.value)}
                label="ID Type"
              >
                <MenuItem value="">Select ID Type</MenuItem>
                {idTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              {errors[`child${childIndex}.idType`] && (
                <FormHelperText>{errors[`child${childIndex}.idType`]}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Ethnicity</InputLabel>
              <Select
                name="ethnicity"
                value={child.ethnicity || ''}
                onChange={(e) => handleChildChange(childIndex, 'ethnicity', e.target.value)}
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
            <DateDropdown
              label="Collection Date *"
              name="collectionDate"
              value={child.collectionDate || ''}
              onChange={(value) => handleChildChange(childIndex, 'collectionDate', value)}
              disabled={disabled}
              required
              error={!!errors[`child${childIndex}.collectionDate`]}
              helperText={errors[`child${childIndex}.collectionDate`]}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Additional Notes"
              name="additionalNotes"
              multiline
              rows={3}
              value={child.additionalNotes || ''}
              onChange={(e) => handleChildChange(childIndex, 'additionalNotes', e.target.value)}
              disabled={disabled}
            />
          </Grid>
        </Grid>

        {/* Note: No signature required for children as per requirements */}
      </Box>
    );
  };

  const renderSection = (title, section, disabled = false) => {
    const isNotAvailable = formData[`${section}NotAvailable`];
    const isPeaceOfMind = formData.clientType === 'peace_of_mind' || formData.testPurpose === 'peace_of_mind';
    
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ color: '#0D488F', fontWeight: 'bold' }}>
              {title}
            </Typography>
            {/* Show checkbox on top left for mother information in Peace of Mind */}
            {isPeaceOfMind && section === 'mother' && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isNotAvailable}
                    onChange={() => handleSectionToggle(section)}
                    name={`${section}NotAvailable`}
                  />
                }
                label="Mother information"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', color: 'text.secondary' } }}
              />
            )}
          </Box>
          {/* Show top right checkbox for non-Peace of Mind or non-mother sections */}
          {!(isPeaceOfMind && section === 'mother') && (
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
          )}
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
                error={!!errors[`${section}.name`]}
                helperText={errors[`${section}.name`]}
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
                error={!!errors[`${section}.surname`]}
                helperText={errors[`${section}.surname`]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DateDropdown
                label="Date of Birth"
                name="dateOfBirth"
                value={formData[section].dateOfBirth || ''}
                onChange={(value) => handleChange(section, 'dateOfBirth', value)}
                disabled={disabled}
                required
                error={!!errors[`${section}.dateOfBirth`]}
                helperText={errors[`${section}.dateOfBirth`]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={disabled}>
                <InputLabel>Place of Birth</InputLabel>
                <Select
                  name="placeOfBirth"
                  value={formData[section].placeOfBirth || ''}
                  onChange={(e) => handleChange(section, 'placeOfBirth', e.target.value)}
                  label="Place of Birth"
                >
                  {countries.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={disabled}>
                <InputLabel>Nationality</InputLabel>
                <Select
                  name="nationality"
                  value={formData[section].nationality || ''}
                  onChange={(e) => handleChange(section, 'nationality', e.target.value)}
                  label="Nationality"
                >
                  {countries.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                required
                error={!!errors[`${section}.idNumber`]}
                helperText={errors[`${section}.idNumber`]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl 
                fullWidth 
                disabled={disabled} 
                required
                error={!!errors[`${section}.idType`]}
              >
                <InputLabel>ID Type</InputLabel>
                <Select
                  name="idType"
                  value={formData[section].idType || ''}
                  onChange={(e) => handleChange(section, 'idType', e.target.value)}
                  label="ID Type"
                >
                  <MenuItem value="">Select ID Type</MenuItem>
                  {idTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors[`${section}.idType`] && (
                  <FormHelperText>{errors[`${section}.idType`]}</FormHelperText>
                )}
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
              <DateDropdown
                label="Collection Date *"
                name="collectionDate"
                value={formData[section].collectionDate || ''}
                onChange={(value) => handleChange(section, 'collectionDate', value)}
                disabled={disabled}
                required
                error={!!errors[`${section}.collectionDate`]}
                helperText={errors[`${section}.collectionDate`]}
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
          <Box sx={{ mt: 3 }}>
            {(section === 'mother' || section === 'father') && (
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData[section].cannotSign || false}
                      onChange={(e) => handleChange(section, 'cannotSign', e.target.checked)}
                      name={`${section}CannotSign`}
                    />
                  }
                  label={`${title.replace(' INFORMATION', '').replace('👩 ', '').replace('👨 ', '')} cannot sign`}
                  sx={{ mb: 1, '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                <br />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData[section].signedOnInventoryForm || false}
                      onChange={(e) => handleChange(section, 'signedOnInventoryForm', e.target.checked)}
                      name={`${section}SignedOnInventoryForm`}
                    />
                  }
                  label="Signed on inventory form"
                  sx={{ mb: 1, '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
              </Box>
            )}
            
            {(!formData[section]?.cannotSign && !formData[section]?.signedOnInventoryForm || section === 'additionalInfo') && (
              <SignaturePad
                person={title.replace(' INFORMATION', '').replace('👩 ', '').replace('👨 ', '').replace('👶 ', '')}
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
                required={formData.clientType === 'legal'}
                legalBinding={formData.clientType === 'legal'}
                disabled={disabled}
                touchEnabled={true}
                responsive={true}
              />
            )}
          </Box>
        )}
      </Box>
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Determine client type
      let clientType = formData.clientType || 'peace_of_mind';

      // Format data for backend including new fields - support multiple children
      const childrenRows = formData.children.map((child, index) => ({
        ...child,
        refKitNumber: formData.refKitNumber,
        submissionDate: formData.submissionDate,
        emailContact: formData.emailContact,
        addressArea: formData.addressArea,
        phoneContact: formData.phoneContact,
        comments: formData.comments,
        testPurpose: formData.testPurpose,
        sampleType: formData.sampleType,
        authorizedCollector: formData.authorizedCollector,
        childIndex: index + 1
      }));

      const fatherRow = !formData.fatherNotAvailable ? {
        ...formData.father
      } : null;

      const motherRow = !formData.motherNotAvailable ? {
        ...formData.mother
      } : null;

      // Include signature and witness data
      const enhancedData = {
        childrenRows, // Multiple children support
        fatherRow, 
        motherRow,
        clientType,
        signatures: formData.signatures,
        witness: formData.clientType === 'legal' ? formData.witness : null,
        legalDeclarations: formData.legalDeclarations,
        consentType: formData.clientType === 'legal' ? 'legal' : 'paternity',
        numberOfChildren: formData.numberOfChildren
      };


      const response = await fetch(`${API_URL}/api/submit-test`, {
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
          message: `Form submitted successfully! Case: ${data.data.caseNumber}`,
          severity: 'success'
        });
        
        await handleReset();
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error('Submission failed:', data);
        throw new Error(data.error?.message || data.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      let errorMessage = 'Error submitting form';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    // Generate new lab numbers for current number of children
    generateLabNumbers(formData.numberOfChildren).then(numbers => {
      const resetData = {
        ...initialFormState,
        numberOfChildren: formData.numberOfChildren,
        mother: { ...initialFormState.mother, labNo: numbers.motherLabNo },
        father: { ...initialFormState.father, labNo: numbers.fatherLabNo },
        children: Array.from({ length: formData.numberOfChildren }, (_, index) => ({
          ...initialFormState.children[0],
          labNo: numbers.childrenLabNos[index] || `25_${(index + 1).toString().padStart(3, '0')}(25_${(formData.numberOfChildren + 1).toString().padStart(3, '0')})M`
        }))
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
      setErrors({});
    } else {
      setErrors(sectionErrors);
      // Show snackbar with validation errors
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields before proceeding.',
        severity: 'error'
      });
    }
  };

  const handleBack = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
  };

  const validateSection = (sectionIndex) => {
    const errors = {};
    const contactInfoIndex = 3 + formData.numberOfChildren;
    
    // Helper function to check if at least one email is provided
    const validateEmailRequirement = () => {
      const motherEmail = !formData.motherNotAvailable && formData.mother.email.trim();
      const fatherEmail = !formData.fatherNotAvailable && formData.father.email.trim();
      const childrenEmails = formData.children.some(child => child.email && child.email.trim());
      const contactEmail = formData.emailContact && formData.emailContact.trim();
      
      return motherEmail || fatherEmail || childrenEmails || contactEmail;
    };
    
    switch (sectionIndex) {
      case 0: // Test Information
        if (!formData.refKitNumber.trim()) {
          errors.refKitNumber = 'Reference Kit Number is required';
        }
        break;
        
      case 1: // Mother Information
        if (!formData.motherNotAvailable) {
          const isPeaceOfMind = formData.clientType === 'peace_of_mind' || formData.testPurpose === 'peace_of_mind';
          if (!formData.mother.name.trim()) errors['mother.name'] = 'Name is required';
          if (!formData.mother.surname.trim()) errors['mother.surname'] = 'Surname is required';
          if (!formData.mother.collectionDate) errors['mother.collectionDate'] = 'Collection Date is required';
          
          // Only require these fields if NOT Peace of Mind
          if (!isPeaceOfMind) {
            if (!formData.mother.dateOfBirth) errors['mother.dateOfBirth'] = 'Date of Birth is required';
            if (!formData.mother.idNumber.trim()) errors['mother.idNumber'] = 'ID Number is required';
            if (!formData.mother.idType.trim()) errors['mother.idType'] = 'ID Type is required';
          }
        }
        break;
        
      case 2: // Father Information
        if (!formData.fatherNotAvailable) {
          const isPeaceOfMind = formData.clientType === 'peace_of_mind' || formData.testPurpose === 'peace_of_mind';
          if (!formData.father.name.trim()) errors['father.name'] = 'Name is required';
          if (!formData.father.surname.trim()) errors['father.surname'] = 'Surname is required';
          if (!formData.father.collectionDate) errors['father.collectionDate'] = 'Collection Date is required';
          
          // Only require these fields if NOT Peace of Mind
          if (!isPeaceOfMind) {
            if (!formData.father.dateOfBirth) errors['father.dateOfBirth'] = 'Date of Birth is required';
            if (!formData.father.idNumber.trim()) errors['father.idNumber'] = 'ID Number is required';
            if (!formData.father.idType.trim()) errors['father.idType'] = 'ID Type is required';
          }
        }
        break;
        
      default:
        // Handle dynamic child sections
        if (sectionIndex >= 3 && sectionIndex < contactInfoIndex) {
          const childIndex = sectionIndex - 3;
          if (formData.children[childIndex]) {
            const child = formData.children[childIndex];
            const isPeaceOfMind = formData.clientType === 'peace_of_mind' || formData.testPurpose === 'peace_of_mind';
            if (!child.name.trim()) errors[`child${childIndex}.name`] = 'Name is required';
            if (!child.surname.trim()) errors[`child${childIndex}.surname`] = 'Surname is required';
            if (!child.collectionDate) errors[`child${childIndex}.collectionDate`] = 'Collection Date is required';
            
            // Only require these fields if NOT Peace of Mind
            if (!isPeaceOfMind) {
              if (!child.dateOfBirth) errors[`child${childIndex}.dateOfBirth`] = 'Date of Birth is required';
              if (!child.idNumber.trim()) errors[`child${childIndex}.idNumber`] = 'ID Number is required';
              if (!child.idType.trim()) errors[`child${childIndex}.idType`] = 'ID Type is required';
            }
          }
        }
        // Contact Information
        else if (sectionIndex === contactInfoIndex) {
          if (!formData.phoneContact.trim()) errors.phoneContact = 'Phone Contact is required';
          
          // Check if at least one email is provided across all sections
          if (!validateEmailRequirement()) {
            errors.emailContact = 'At least one email address must be provided (mother, father, child, or contact email)';
          }
        }
        break;
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
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={formData.clientType}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    clientType: e.target.value
                  }))}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        value="peace_of_mind"
                        control={<Radio sx={{ color: '#0D488F', '&.Mui-checked': { color: '#0D488F' } }} />}
                        label="Peace of Mind"
                        sx={{ '& .MuiFormControlLabel-label': { fontWeight: 500 } }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        value="legal"
                        control={<Radio sx={{ color: '#0D488F', '&.Mui-checked': { color: '#0D488F' } }} />}
                        label="Legal (requires ID copies)"
                        sx={{ '& .MuiFormControlLabel-label': { fontWeight: 500 } }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        value="urgent"
                        control={<Radio sx={{ color: '#0D488F', '&.Mui-checked': { color: '#0D488F' } }} />}
                        label="Urgent"
                        sx={{ '& .MuiFormControlLabel-label': { fontWeight: 500 } }}
                      />
                    </Grid>
                  </Grid>
                </RadioGroup>
              </FormControl>
            </Box>
            
            {/* ID Upload Section for Legal samples */}
            {formData.clientType === 'legal' && (
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
                  placeholder="BN-"
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
                  value={formData.submissionDate || ''}
                  onChange={handleTopLevelChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Number of Children to Test</InputLabel>
                  <Select
                    name="numberOfChildren"
                    value={formData.numberOfChildren || 1}
                    onChange={handleNumberOfChildrenChange}
                    label="Number of Children to Test"
                  >
                    <MenuItem value={1}>1 Child</MenuItem>
                    <MenuItem value={2}>2 Children</MenuItem>
                    <MenuItem value={3}>3 Children</MenuItem>
                    <MenuItem value={4}>4 Children</MenuItem>
                    <MenuItem value={5}>5 Children</MenuItem>
                  </Select>
                  <FormHelperText>Select how many children need to be tested</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {currentSection === 1 && renderSection('👩 MOTHER INFORMATION', 'mother')}
        {currentSection === 2 && renderSection('👨 FATHER INFORMATION', 'father')}
        {/* Render child sections dynamically */}
        {(() => {
          const childSectionStart = 3;
          const childSectionEnd = childSectionStart + formData.numberOfChildren;
          if (currentSection >= childSectionStart && currentSection < childSectionEnd) {
            const childIndex = currentSection - childSectionStart;
            const childTitle = formData.numberOfChildren === 1 
              ? '👶 CHILD INFORMATION' 
              : `👶 CHILD ${childIndex + 1} INFORMATION`;
            return renderChildSection(childTitle, childIndex);
          }
          return null;
        })()}
        
        {(() => {
          const contactInfoIndex = 3 + formData.numberOfChildren;
          if (currentSection === contactInfoIndex) {
            return (
              // Contact Information
              <Box>
                <Typography variant="h6" sx={{ color: '#0D488F', fontWeight: 'bold', mb: 2 }}>
                  Contact Information
                </Typography>
                <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                  <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 500 }}>
                    ⚠️ Email Requirement: At least one email address must be provided (mother, father, child, or contact email).
                  </Typography>
                </Box>
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
            );
          }
          return null;
        })()}

        {(() => {
          const signaturesIndex = 3 + formData.numberOfChildren + 1;
          if (currentSection === signaturesIndex) {
            return (
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
                    {formData.clientType === 'legal' && (
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
                  {formData.children.map((child, index) => (
                    <Grid item xs={12} md={6} key={`child-${index}`}>
                      <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="subtitle2">
                          {formData.numberOfChildren === 1 ? 'Child Signature' : `Child ${index + 1} Signature`}
                        </Typography>
                        <Typography color="text.secondary" variant="caption">
                          No signature required for children
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          }
          return null;
        })()}

        {(() => {
          const witnessIndex = 3 + formData.numberOfChildren + 2;
          if (currentSection === witnessIndex) {
            return (
              // Witness Information (only for legal testing)
              <Box>
                {formData.clientType === 'legal' ? (
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
            );
          }
          return null;
        })()}
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