import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Alert
} from '@mui/material';
import { Clear, Save, Edit } from '@mui/icons-material';

const SignaturePad = ({ 
  person, 
  onSignatureChange, 
  required = false, 
  legalBinding = false,
  value = null,
  disabled = false
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState(value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';

    // Set canvas size
    canvas.width = 400;
    canvas.height = 150;
    
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Reset drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
  }, []);

  useEffect(() => {
    if (value && canvasRef.current) {
      loadSignature(value);
    }
  }, [value]);

  const startDrawing = (e) => {
    if (disabled) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (disabled) return;
    
    setIsDrawing(false);
    setHasSignature(true);
    saveSignature();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas.toDataURL();
    setSignatureData(signatureDataUrl);
    
    if (onSignatureChange) {
      onSignatureChange(signatureDataUrl);
    }
  };

  const clearSignature = () => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear and reset canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Reset drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    setHasSignature(false);
    setSignatureData(null);
    
    if (onSignatureChange) {
      onSignatureChange(null);
    }
  };

  const loadSignature = (dataUrl) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHasSignature(true);
    };
    
    img.src = dataUrl;
  };

  // Touch events for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvasRef.current.dispatchEvent(mouseEvent);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvasRef.current.dispatchEvent(mouseEvent);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvasRef.current.dispatchEvent(mouseEvent);
  };

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#0D488F' }}>
          {person} Signature {required && <span style={{ color: 'red' }}>*</span>}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={clearSignature}
            startIcon={<Clear />}
            disabled={disabled}
          >
            Clear
          </Button>
          {hasSignature && (
            <Button
              size="small"
              onClick={saveSignature}
              startIcon={<Save />}
              color="primary"
              disabled={disabled}
            >
              Save
            </Button>
          )}
        </Box>
      </Box>

      {legalBinding && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This signature is legally binding and will be used for legal proceedings.
        </Alert>
      )}

      <Box sx={{ 
        border: '2px solid #e0e0e0',
        borderRadius: 1,
        p: 1,
        bgcolor: disabled ? '#f5f5f5' : '#ffffff',
        opacity: disabled ? 0.6 : 1
      }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'block',
            cursor: disabled ? 'not-allowed' : 'crosshair',
            touchAction: 'none'
          }}
        />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {disabled 
          ? 'Signature locked'
          : 'Sign above using mouse or touch. Clear to start over.'
        }
      </Typography>

      {required && !hasSignature && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          Signature is required
        </Typography>
      )}
    </Paper>
  );
};

export default SignaturePad;