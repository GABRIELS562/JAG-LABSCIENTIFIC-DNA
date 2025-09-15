import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  AlertTitle,
  Container,
  Paper
} from '@mui/material';
import { Refresh, BugReport, Home } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you could send this to an error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.props.userId || 'anonymous'
    };

    // In a real application, send to error reporting service
    // For now, just log to localStorage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      errors.push(errorData);
      localStorage.setItem('errorLogs', JSON.stringify(errors.slice(-10))); // Keep last 10 errors
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isMinimalError = this.props.fallback === 'minimal';
      
      if (isMinimalError) {
        return (
          <Alert severity="error" sx={{ m: 2 }}>
            <AlertTitle>Something went wrong</AlertTitle>
            <Box sx={{ mt: 1 }}>
              <Button 
                size="small" 
                onClick={this.handleRetry}
                startIcon={<Refresh />}
              >
                Try Again
              </Button>
            </Box>
          </Alert>
        );
      }

      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ mb: 3 }}>
              <BugReport sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
              <Typography variant="h4" component="h1" gutterBottom>
                Oops! Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We're sorry, but something unexpected happened. The error has been logged 
                and our team will look into it.
              </Typography>
            </Box>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <AlertTitle>Error Details</AlertTitle>
              <Typography variant="body2" component="div">
                <strong>Error ID:</strong> {this.state.errorId}<br />
                <strong>Message:</strong> {this.state.error?.message || 'Unknown error'}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={this.handleRetry}
                startIcon={<Refresh />}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleGoHome}
                startIcon={<Home />}
              >
                Go Home
              </Button>
            </Box>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Development Error Details:
                </Typography>
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    textAlign: 'left', 
                    overflow: 'auto',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace'
                  }}
                >
                  {this.state.error.stack}
                </Typography>
                {this.state.errorInfo && (
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      textAlign: 'left', 
                      overflow: 'auto',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      mt: 2
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for manually reporting errors
export const useErrorHandler = () => {
  const reportError = (error, errorInfo = {}) => {
    const errorData = {
      message: error.message || 'Manual error report',
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Manual error report:', errorData);

    // In production, send to error reporting service
    try {
      const errors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      errors.push(errorData);
      localStorage.setItem('errorLogs', JSON.stringify(errors.slice(-10)));
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  return { reportError };
};

export default ErrorBoundary;