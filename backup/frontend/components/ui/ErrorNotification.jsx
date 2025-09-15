import React, { useState, useEffect, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Collapse,
  Typography,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  WifiOff as OfflineIcon
} from '@mui/icons-material';

const ErrorNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());

  // Global error handler
  const showErrorNotification = useCallback((error, options = {}) => {
    const {
      severity = 'error',
      autoHide = true,
      duration = 6000,
      showDetails = false,
      onRetry = null,
      title = null
    } = options;

    // Determine error type and customize accordingly
    let errorTitle = title;
    let errorMessage = '';
    let errorDetails = null;

    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
      errorTitle = errorTitle || getErrorTitle(error);
      errorDetails = error.details || error.stack;
    } else {
      errorMessage = 'An unexpected error occurred';
    }

    const notification = {
      id: Date.now() + Math.random(),
      severity,
      title: errorTitle,
      message: errorMessage,
      details: errorDetails,
      autoHide,
      duration,
      showDetails,
      onRetry,
      timestamp: new Date()
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep max 5 notifications

    if (autoHide) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, duration);
    }

    return notification.id;
  }, []);

  // Helper function to determine error title based on error type
  const getErrorTitle = (error) => {
    if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
      return 'Connection Error';
    }
    if (error?.name === 'ApiError' || error?.code === 'API_ERROR') {
      return 'Server Error';
    }
    if (error?.name === 'ValidationError' || error?.code === 'VALIDATION_ERROR') {
      return 'Validation Error';
    }
    return 'Error';
  };

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const toggleDetails = useCallback((id) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Expose global error handler
  useEffect(() => {
    window.showErrorNotification = showErrorNotification;

    // Global error handlers
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      showErrorNotification(event.reason || 'An unexpected error occurred', {
        title: 'Unhandled Error',
        severity: 'error'
      });
    };

    const handleError = (event) => {
      console.error('Global error:', event.error);
      showErrorNotification(event.error || 'An unexpected error occurred', {
        title: 'Application Error',
        severity: 'error'
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      delete window.showErrorNotification;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [showErrorNotification]);

  return (
    <Box sx={{ position: 'fixed', top: 80, right: 16, zIndex: 9998, maxWidth: 400 }}>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          sx={{
            position: 'relative',
            mb: 1,
            '& .MuiSnackbarContent-root': {
              padding: 0
            }
          }}
        >
          <Alert
            severity={notification.severity}
            sx={{ width: '100%', maxWidth: 400 }}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {notification.onRetry && (
                  <IconButton
                    size="small"
                    onClick={() => notification.onRetry()}
                    sx={{ color: 'inherit' }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                )}
                {(notification.details || notification.showDetails) && (
                  <IconButton
                    size="small"
                    onClick={() => toggleDetails(notification.id)}
                    sx={{ color: 'inherit' }}
                  >
                    {expandedNotifications.has(notification.id) ?
                      <ExpandLessIcon fontSize="small" /> :
                      <ExpandMoreIcon fontSize="small" />
                    }
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => removeNotification(notification.id)}
                  sx={{ color: 'inherit' }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            {notification.title && (
              <AlertTitle sx={{ mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {notification.severity === 'error' &&
                   notification.title === 'Connection Error' &&
                   <OfflineIcon fontSize="small" />}
                  {notification.title}
                </Box>
              </AlertTitle>
            )}

            <Typography variant="body2" sx={{ mb: 1 }}>
              {notification.message}
            </Typography>

            {notification.onRetry && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={notification.onRetry}
                sx={{
                  mt: 1,
                  borderColor: 'currentColor',
                  color: 'inherit',
                  '&:hover': {
                    borderColor: 'currentColor',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Try Again
              </Button>
            )}

            <Collapse in={expandedNotifications.has(notification.id)} timeout="auto">
              <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" component="pre" sx={{
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace'
                }}>
                  {notification.details || 'No additional details available'}
                </Typography>
              </Box>
            </Collapse>

            {notification.timestamp && (
              <Typography variant="caption" sx={{
                display: 'block',
                mt: 0.5,
                opacity: 0.7,
                fontSize: '0.65rem'
              }}>
                {notification.timestamp.toLocaleTimeString()}
              </Typography>
            )}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

// Hook for programmatic error notifications
export const useErrorNotification = () => {
  const showError = useCallback((error, options = {}) => {
    if (window.showErrorNotification) {
      return window.showErrorNotification(error, { ...options, severity: 'error' });
    }
    console.error('Error notification not available:', error);
    return null;
  }, []);

  const showWarning = useCallback((message, options = {}) => {
    if (window.showErrorNotification) {
      return window.showErrorNotification(message, { ...options, severity: 'warning' });
    }
    console.warn('Warning notification not available:', message);
    return null;
  }, []);

  const showInfo = useCallback((message, options = {}) => {
    if (window.showErrorNotification) {
      return window.showErrorNotification(message, { ...options, severity: 'info' });
    }
    console.info('Info notification not available:', message);
    return null;
  }, []);

  const showSuccess = useCallback((message, options = {}) => {
    if (window.showErrorNotification) {
      return window.showErrorNotification(message, { ...options, severity: 'success' });
    }
    console.log('Success notification not available:', message);
    return null;
  }, []);

  return {
    showError,
    showWarning,
    showInfo,
    showSuccess
  };
};

export default ErrorNotification;