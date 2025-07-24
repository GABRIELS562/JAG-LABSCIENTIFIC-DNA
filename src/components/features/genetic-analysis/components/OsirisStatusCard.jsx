import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Science as ScienceIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';

const OsirisStatusCard = ({ 
  osirisStatus, 
  onCheckStatus, 
  onLaunchOsiris,
  onResetLimits,
  isDarkMode = false 
}) => {
  const { 
    initialized, 
    version, 
    kitConfiguration, 
    workspace, 
    inputDirectory, 
    outputDirectory, 
    inputFiles, 
    outputFiles, 
    error, 
    checking, 
    lastChecked 
  } = osirisStatus;

  const getStatusColor = () => {
    if (error) return 'error';
    if (initialized) return 'success';
    return 'warning';
  };

  const getStatusIcon = () => {
    if (error) return <ErrorIcon />;
    if (initialized) return <CheckCircleIcon />;
    return <ScienceIcon />;
  };

  const getStatusText = () => {
    if (checking) return 'Checking...';
    if (error) return 'Error';
    if (initialized) return 'Connected';
    return 'Disconnected';
  };

  return (
    <Card 
      elevation={2}
      sx={{ 
        backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
        border: `2px solid ${
          error ? '#ef5350' : 
          initialized ? '#4caf50' : 
          '#ff9800'
        }`
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <ScienceIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Osiris STR Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Genetic Analysis Software
              </Typography>
            </Box>
          </Box>
          
          <Chip
            icon={getStatusIcon()}
            label={getStatusText()}
            color={getStatusColor()}
            variant="filled"
          />
        </Box>

        {/* Status Details */}
        {initialized && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Connection Details:
            </Typography>
            <Box ml={2}>
              {version && (
                <Typography variant="body2">
                  <strong>Version:</strong> {version}
                </Typography>
              )}
              {kitConfiguration && (
                <Typography variant="body2">
                  <strong>Kit Configuration:</strong> {kitConfiguration}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Status:</strong> Ready for analysis
              </Typography>
              {workspace && (
                <Typography variant="body2">
                  <strong>Workspace:</strong> {workspace}
                </Typography>
              )}
              {typeof inputFiles !== 'undefined' && (
                <Typography variant="body2">
                  <strong>Input files:</strong> {inputFiles} files ready
                </Typography>
              )}
              {typeof outputFiles !== 'undefined' && (
                <Typography variant="body2">
                  <strong>Output files:</strong> {outputFiles} files available
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Connection Error:</strong> {error}
            </Typography>
            {lastChecked && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Last checked: {new Date(lastChecked).toLocaleTimeString()}
              </Typography>
            )}
          </Alert>
        )}

        {/* Not Connected Message */}
        {!initialized && !error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Osiris is not connected. Please ensure the software is installed and running.
            </Typography>
          </Alert>
        )}

        {/* Action Buttons */}
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onCheckStatus}
            size="small"
            disabled={checking}
          >
            {checking ? 'Checking...' : 'Check Status'}
          </Button>
          
          {!initialized && (
            <Button
              variant="contained"
              startIcon={<LaunchIcon />}
              onClick={onLaunchOsiris}
              size="small"
              color="primary"
              disabled={checking}
            >
              Launch Osiris
            </Button>
          )}
          
          {error && error.includes('Maximum check attempts') && onResetLimits && (
            <Button
              variant="outlined"
              onClick={onResetLimits}
              size="small"
              color="warning"
            >
              Reset & Retry
            </Button>
          )}
          
          {initialized && (
            <Button
              variant="contained"
              startIcon={<ScienceIcon />}
              size="small"
              color="success"
              disabled
            >
              Ready for Analysis
            </Button>
          )}
        </Box>

        {/* Help Text */}
        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          Osiris STR Analysis software is required for genetic analysis. 
          Ensure it's installed and properly configured before starting analysis.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default OsirisStatusCard;