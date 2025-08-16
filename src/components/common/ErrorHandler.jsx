import React, { useState, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as BugReportIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

/**
 * Global Error Handler Component
 * Provides user-friendly error display and reporting
 */
const ErrorHandler = () => {
  const [errors, setErrors] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(false);

  // Add error to the queue
  const addError = useCallback((error) => {
    const errorObject = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      stack: error.stack,
      severity: error.severity || 'error',
      context: error.context || {},
      retry: error.retry || null,
      actions: error.actions || []
    };

    setErrors(prev => [errorObject, ...prev.slice(0, 9)]); // Keep last 10 errors
    return errorObject.id;
  }, []);

  // Remove error from queue
  const removeError = useCallback((errorId) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  }, []);

  // Show error details dialog
  const showErrorDetails = useCallback((error) => {
    setSelectedError(error);
    setDialogOpen(true);
  }, []);

  // Close error details dialog
  const closeErrorDetails = useCallback(() => {
    setDialogOpen(false);
    setSelectedError(null);
    setExpandedDetails(false);
  }, []);

  // Handle retry action
  const handleRetry = useCallback((error) => {
    if (error.retry && typeof error.retry === 'function') {
      error.retry();
      removeError(error.id);
    }
  }, [removeError]);

  // Handle custom actions
  const handleAction = useCallback((action, error) => {
    if (action.handler && typeof action.handler === 'function') {
      action.handler(error);
      if (action.dismissOnAction !== false) {
        removeError(error.id);
      }
    }
  }, [removeError]);

  // Get user-friendly error message
  const getFriendlyMessage = (error) => {
    const friendlyMessages = {
      'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
      'UNAUTHORIZED': 'Your session has expired. Please log in again.',
      'FORBIDDEN': 'You do not have permission to perform this action.',
      'NOT_FOUND': 'The requested resource was not found.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'SERVER_ERROR': 'A server error occurred. Please try again later.',
      'TIMEOUT': 'The request timed out. Please try again.',
      'UNKNOWN_ERROR': 'An unexpected error occurred.'
    };

    return friendlyMessages[error.code] || error.message;
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'error';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString();
  };

  return (
    <>
      {/* Error Snackbars */}
      {errors.map((error, index) => (
        <Snackbar
          key={error.id}
          open={true}
          autoHideDuration={error.severity === 'error' ? null : 6000}
          onClose={() => removeError(error.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          sx={{ bottom: { xs: 90 + (index * 70), sm: 20 + (index * 70) } }}
        >
          <Alert
            severity={getSeverityColor(error.severity)}
            onClose={() => removeError(error.id)}
            action={
              <Box>
                {error.retry && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => handleRetry(error)}
                    startIcon={<RefreshIcon />}
                  >
                    Retry
                  </Button>
                )}
                {error.actions.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    color="inherit"
                    size="small"
                    onClick={() => handleAction(action, error)}
                    startIcon={action.icon}
                  >
                    {action.label}
                  </Button>
                ))}
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => showErrorDetails(error)}
                  startIcon={<BugReportIcon />}
                >
                  Details
                </Button>
              </Box>
            }
          >
            <AlertTitle>{error.code}</AlertTitle>
            {getFriendlyMessage(error)}
          </Alert>
        </Snackbar>
      ))}

      {/* Error Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeErrorDetails}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        {selectedError && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <BugReportIcon sx={{ mr: 1 }} />
                Error Details
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box mb={2}>
                <Typography variant="h6" gutterBottom>
                  {selectedError.code}
                </Typography>
                <Typography variant="body1" paragraph>
                  {getFriendlyMessage(selectedError)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Occurred at: {selectedError.timestamp.toLocaleString()}
                </Typography>
              </Box>

              {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                <Box mb={2}>
                  <Typography variant="h6" gutterBottom>
                    Context
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: 'grey.100',
                      p: 1,
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      maxHeight: 200
                    }}
                  >
                    {JSON.stringify(selectedError.context, null, 2)}
                  </Box>
                </Box>
              )}

              {selectedError.stack && (
                <Box>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="h6">
                      Stack Trace
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setExpandedDetails(!expandedDetails)}
                      sx={{ ml: 1 }}
                    >
                      {expandedDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedDetails}>
                    <Box
                      component="pre"
                      sx={{
                        bgcolor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        maxHeight: 300,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {selectedError.stack}
                    </Box>
                  </Collapse>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              {selectedError.retry && (
                <Button
                  onClick={() => {
                    handleRetry(selectedError);
                    closeErrorDetails();
                  }}
                  startIcon={<RefreshIcon />}
                >
                  Retry
                </Button>
              )}
              <Button onClick={closeErrorDetails}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

// Global error handler instance
let errorHandlerInstance = null;

// Function to register error handler
export const registerErrorHandler = (handler) => {
  errorHandlerInstance = handler;
};

// Function to show error
export const showError = (error) => {
  if (errorHandlerInstance) {
    return errorHandlerInstance.addError(error);
  } else {
    console.error('Error handler not registered:', error);
  }
};

// Function to create enhanced error
export const createError = (message, options = {}) => {
  return {
    message,
    code: options.code || 'UNKNOWN_ERROR',
    severity: options.severity || 'error',
    context: options.context || {},
    retry: options.retry || null,
    actions: options.actions || [],
    stack: options.includeStack ? new Error(message).stack : null
  };
};

// HOC to wrap components with error handling
export const withErrorHandler = (WrappedComponent) => {
  return function ErrorHandledComponent(props) {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState(null);

    const handleError = useCallback((error, errorInfo) => {
      setHasError(true);
      setError(error);
      
      showError(createError(error.message, {
        code: 'COMPONENT_ERROR',
        context: { componentStack: errorInfo.componentStack },
        includeStack: true,
        actions: [
          {
            label: 'Reload Component',
            handler: () => {
              setHasError(false);
              setError(null);
            }
          }
        ]
      }));
    }, []);

    if (hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          p={3}
          textAlign="center"
        >
          <BugReportIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This component encountered an error and couldn't render properly.
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setHasError(false);
              setError(null);
            }}
            startIcon={<RefreshIcon />}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return <WrappedComponent {...props} onError={handleError} />;
  };
};

// Error Handler Provider Component
export const ErrorHandlerProvider = ({ children }) => {
  const errorHandlerRef = React.useRef();

  React.useEffect(() => {
    if (errorHandlerRef.current) {
      registerErrorHandler(errorHandlerRef.current);
    }
  }, []);

  return (
    <>
      {children}
      <ErrorHandler ref={errorHandlerRef} />
    </>
  );
};

export default ErrorHandler;