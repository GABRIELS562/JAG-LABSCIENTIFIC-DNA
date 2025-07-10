import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  PhotoCamera,
  Close,
  Refresh,
  CheckCircle,
  Error,
  Upload,
  CameraAlt,
  Scanner,
  AutoFixHigh
} from '@mui/icons-material';
import { createWorker } from 'tesseract.js';

const PhotoCapture = ({ open, onClose, onDataExtracted, formType = 'paternity' }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions or upload an image.');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage({
          url: imageUrl,
          blob: blob,
          source: 'camera'
        });
        stopCamera();
      }, 'image/jpeg', 0.9);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage({
        url: imageUrl,
        blob: file,
        source: 'upload'
      });
    }
  };

  // Process image with OCR
  const processImage = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProcessingStage('Initializing OCR...');

    try {
      const worker = await createWorker('eng', 1, {
        logger: m => {
          setProgress(m.progress * 100);
          setProcessingStage(m.status || 'Processing...');
        }
      });

      setProcessingStage('Reading text from image...');
      const { data: { text } } = await worker.recognize(capturedImage.url);
      
      setProcessingStage('Extracting form data...');
      const extractedFormData = extractFormData(text, formType);
      
      setExtractedData(extractedFormData);
      setProcessingStage('Complete!');
      
      await worker.terminate();
    } catch (err) {
      setError('Failed to process image: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract form data based on type
  const extractFormData = (text, type) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const data = {};

    if (type === 'paternity' || type === 'peace_of_mind') {
      // Extract common paternity form fields
      data.type = 'Peace of Mind Sample';
      
      // Look for names (typically capitalized words)
      const namePatterns = [
        /name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        /client[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        /father[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        /mother[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
        /child[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
      ];

      namePatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          data.detectedNames = data.detectedNames || [];
          data.detectedNames.push(...matches.map(m => m.replace(/^[^:]*:?\s*/, '')));
        }
      });

      // Extract dates
      const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;
      const dates = text.match(datePattern);
      if (dates && dates.length > 0) {
        data.dates = dates;
        data.collectionDate = dates[0]; // First date found
      }

      // Extract phone numbers
      const phonePattern = /\b\d{3}[.\-\s]?\d{3}[.\-\s]?\d{4}\b/g;
      const phones = text.match(phonePattern);
      if (phones && phones.length > 0) {
        data.phoneNumbers = phones;
        data.phoneContact = phones[0];
      }

      // Extract addresses (lines with street indicators)
      const addressLines = lines.filter(line => 
        /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard)\b/i.test(line) ||
        /\b\d+\s+[A-Za-z]/i.test(line)
      );
      if (addressLines.length > 0) {
        data.addresses = addressLines;
        data.addressArea = addressLines[0];
      }

      // Extract ID numbers (sequences of digits)
      const idPattern = /\b\d{6,}\b/g;
      const ids = text.match(idPattern);
      if (ids && ids.length > 0) {
        data.idNumbers = ids;
      }

    } else if (type === 'legal') {
      // Extract legal test specific fields
      data.type = 'LT Legal Sample';
      
      // Look for case numbers
      const casePattern = /case[:\s]+([A-Z0-9\-]+)/gi;
      const caseMatches = text.match(casePattern);
      if (caseMatches) {
        data.caseNumber = caseMatches[0].replace(/^case[:\s]+/i, '');
      }

      // Look for legal authority
      const authorityPattern = /court[:\s]+([A-Za-z\s]+)/gi;
      const authorityMatches = text.match(authorityPattern);
      if (authorityMatches) {
        data.legalAuthority = authorityMatches[0].replace(/^court[:\s]+/i, '');
      }
    }

    // Extract email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern);
    if (emails && emails.length > 0) {
      data.emails = emails;
      data.emailContact = emails[0];
    }

    // Add raw text for manual review
    data.rawText = text;
    data.confidence = calculateConfidence(data);

    return data;
  };

  // Calculate confidence score based on extracted data
  const calculateConfidence = (data) => {
    let score = 0;
    let maxScore = 5;

    if (data.detectedNames && data.detectedNames.length > 0) score += 1;
    if (data.dates && data.dates.length > 0) score += 1;
    if (data.phoneNumbers && data.phoneNumbers.length > 0) score += 1;
    if (data.addresses && data.addresses.length > 0) score += 1;
    if (data.emails && data.emails.length > 0) score += 1;

    return Math.round((score / maxScore) * 100);
  };

  // Handle dialog close
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setExtractedData(null);
    setError(null);
    setIsProcessing(false);
    onClose();
  };

  // Apply extracted data to form
  const applyData = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted(extractedData);
      handleClose();
    }
  };

  // Reset for new capture
  const resetCapture = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setError(null);
    startCamera();
  };

  React.useEffect(() => {
    if (open) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          📷 Capture Inventory Form
        </Typography>
        <IconButton onClick={handleClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Camera/Upload Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {capturedImage ? 'Captured Image' : 'Camera View'}
                </Typography>
                
                {!capturedImage ? (
                  <Box>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        maxHeight: '300px',
                        backgroundColor: '#000',
                        borderRadius: '8px'
                      }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        startIcon={<CameraAlt />}
                        onClick={capturePhoto}
                        disabled={!videoRef.current}
                      >
                        Capture
                      </Button>
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<Upload />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload Image
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <img
                      src={capturedImage.url}
                      alt="Captured form"
                      style={{
                        width: '100%',
                        maxHeight: '300px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                    />
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        startIcon={<Scanner />}
                        onClick={processImage}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Processing...' : 'Extract Data'}
                      </Button>
                      
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={resetCapture}
                      >
                        Retake
                      </Button>
                    </Box>
                  </Box>
                )}

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Results Section */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Extracted Data
                </Typography>

                {isProcessing && (
                  <Box>
                    <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {processingStage} ({Math.round(progress)}%)
                    </Typography>
                  </Box>
                )}

                {extractedData && (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label={`${extractedData.confidence}% Confidence`}
                        color={extractedData.confidence > 70 ? 'success' : extractedData.confidence > 40 ? 'warning' : 'error'}
                        icon={extractedData.confidence > 70 ? <CheckCircle /> : <Error />}
                      />
                      <Chip 
                        label={extractedData.type || 'Unknown Type'}
                        sx={{ ml: 1 }}
                      />
                    </Box>

                    <Grid container spacing={2}>
                      {extractedData.detectedNames && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Names Found:</Typography>
                          {extractedData.detectedNames.map((name, index) => (
                            <Chip key={index} label={name} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))}
                        </Grid>
                      )}

                      {extractedData.phoneContact && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Phone:</Typography>
                          <Typography variant="body2">{extractedData.phoneContact}</Typography>
                        </Grid>
                      )}

                      {extractedData.emailContact && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Email:</Typography>
                          <Typography variant="body2">{extractedData.emailContact}</Typography>
                        </Grid>
                      )}

                      {extractedData.addressArea && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Address:</Typography>
                          <Typography variant="body2">{extractedData.addressArea}</Typography>
                        </Grid>
                      )}

                      {extractedData.collectionDate && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2">Date:</Typography>
                          <Typography variant="body2">{extractedData.collectionDate}</Typography>
                        </Grid>
                      )}
                    </Grid>

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                      Review the extracted data and apply to form if accurate.
                    </Typography>
                  </Box>
                )}

                {!capturedImage && !isProcessing && (
                  <Typography variant="body2" color="text.secondary">
                    Capture or upload an image of the inventory form to automatically extract client information.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        
        {extractedData && (
          <Button
            variant="contained"
            startIcon={<AutoFixHigh />}
            onClick={applyData}
            disabled={!extractedData || extractedData.confidence < 30}
          >
            Apply to Form
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PhotoCapture;