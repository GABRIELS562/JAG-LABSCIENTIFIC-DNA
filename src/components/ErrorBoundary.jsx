import React from 'react';
import { Alert, Box, Button, Typography, Card, CardContent, Divider } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon, Home as HomeIcon, BugReport } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const eventId = Date.now().toString();

    // Log error to error reporting service
    this.setState({
      error,
      errorInfo,
      eventId
    });

    // Log comprehensive error information
    const errorDetails = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      eventId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      props: this.props
    };

    console.error('Error caught by boundary:', errorDetails);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { errorBoundary: errorDetails } });
    }

    // Show global error notification if available
    if (window.showErrorNotification && this.state.retryCount === 0) {
      window.showErrorNotification(error, {
        title: 'Component Error',
        severity: 'error',
        autoHide: false,
        showDetails: true
      });
    }
  }

  handleReset = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      eventId: this.state.eventId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        if (window.showErrorNotification) {
          window.showErrorNotification('Error report copied to clipboard', {
            severity: 'info',
            autoHide: true
          });
        }
      })
      .catch(() => {
        console.log('Error report:', errorReport);
      });
  };

  render() {
    if (this.state.hasError) {
      // Minimal fallback for specific cases
      if (this.props.fallback === 'minimal') {
        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            flexDirection: 'column',
            gap: 2
          }}>
            <ErrorIcon color="error" sx={{ fontSize: 48 }} />
            <Typography variant="body1" color="text.secondary">
              Unable to load this component
            </Typography>
            <Button
              variant="outlined"
              onClick={this.handleReset}
              startIcon={<RefreshIcon />}
              size="small"
            >
              Try Again
            </Button>
          </Box>
        );
      }

      // Custom fallback UI
      if (this.props.fallback && typeof this.props.fallback !== 'string') {
        return this.props.fallback;
      }

      // Enhanced default fallback UI
      return (
        <Box sx={{
          p: 3,
          maxWidth: 800,
          mx: 'auto',
          mt: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '50vh',
          justifyContent: 'center'
        }}>
          <Card sx={{ width: '100%', maxWidth: 600 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ErrorIcon color="error" sx={{ fontSize: 48, mr: 2 }} />
                <Box>
                  <Typography variant="h5" color="error" gutterBottom>
                    Oops! Something went wrong
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {this.state.retryCount > 0 ?
                      `This error occurred again (attempt ${this.state.retryCount + 1})` :
                      'An unexpected error occurred while loading this page'
                    }
                  </Typography>
                </Box>
              </Box>

              {this.state.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Error:</strong> {this.state.error.message || this.state.error.toString()}
                  </Typography>
                  {this.state.eventId && (
                    <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
                      Error ID: {this.state.eventId}
                    </Typography>
                  )}
                </Alert>
              )}

              <Divider sx={{ mb: 3 }} />

              <Box sx={{
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                <Button
                  variant="contained"
                  onClick={this.handleReset}
                  startIcon={<RefreshIcon />}
                  size="large"
                >
                  Try Again
                </Button>

                <Button
                  variant="outlined"
                  onClick={this.handleGoHome}
                  startIcon={<HomeIcon />}
                  size="large"
                >
                  Go Home
                </Button>

                <Button
                  variant="text"
                  onClick={this.handleReportError}
                  startIcon={<BugReport />}
                  size="large"
                >
                  Report Error
                </Button>
              </Box>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <Box sx={{ mt: 3 }}>
                  <details>
                    <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                      <Typography variant="body2" component="span">
                        Developer Details
                      </Typography>
                    </summary>
                    <Box sx={{
                      p: 2,
                      backgroundColor: 'grey.100',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      overflow: 'auto',
                      maxHeight: 300
                    }}>
                      <strong>Component Stack:</strong>\n
                      {this.state.errorInfo.componentStack}

                      {this.state.error?.stack && (
                        <>\n\n<strong>Error Stack:</strong>\n{this.state.error.stack}</>
                      )}
                    </Box>
                  </details>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;